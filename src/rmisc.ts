#!/usr/bin/env node
import fs, { lstatSync } from 'fs';
import meow from 'meow';
import os from 'os';
import path, { basename } from "path";
import { fileURLToPath } from 'url';
import "winston-daily-rotate-file";
import { RenameRules } from './rules.js';
import { challengeWord, doNothing, filenameIncrement, genEscapedRegExp, getConfig, getLogFormat, listFilesRecursive, logger, normalize } from "./utils.js";
export type Action = 'none' | 'delete' | 'move';

const __filename = fileURLToPath(import.meta.url);
const appName = path.parse(__filename)['name'] || 'App';


const defaultConfig = {
	scanDir: "//bthome//rmisctest",
	renameByDirnameKeywords: ['XC'],
	deleteKeywords: [
		"(.url|.htm|.html|.mht|.nfo)$"
	],
	renamePolicies: [
		['fc2-ppv-(.*)-microsoft.com.mp4', 'FC2-PPV-$1.mp4', 'ruleMS'],
	]
};
const options = meow(
	`
	remove misc files, rename file to proper filename.

	Usage:

	$ sukebei-downloader
	--config -c config file.
	--dryrun -d dry run.
	--left -l show left.
	--help -h show help.
	--max -m max process count.
	--showConfig -s show config.
	--showDeleteKeys show delete keywords.
	--trace -t trace action.
	--verbose -v verbose.
	`, {
	importMeta: import.meta,
	allowUnknownFlags: false,
	flags: {
		config: {
			shortFlag: 'c',
			type: 'string',
			default: path.join(os.homedir(), 'etc', `${appName}.jsonc`),
		},
		dryrun: {
			shortFlag: 'd',
			type: 'boolean',
			// default: true
		},
		help: {
			shortFlag: 'h'
		},
		left: {
			shortFlag: 'l',
			type: 'boolean',
		},
		max: {
			shortFlag: 'm',
			type: 'number',
			default: 9999999
		},
		showConfig: {
			shortFlag: 's',
			type: 'boolean',
		},
		showDeleteKeys: {
			type: 'boolean'
		},
		trace: {
			shortFlag: 't',
			type: 'boolean'
		},
		verbose: {
			shortFlag: 'v',
			type: 'boolean',
		}
	}

}).flags;
logger.format = getLogFormat('rmisc');

const meetsDeleteKeywords = (filename: string, challenge: RegExp) => {
	const result = challenge.test(filename);
	return result;
};
const meetsFitRenameKeywords = (filename: string, challenge: string[]) => { };
const meetsFitKeepKeywords = (filename: string, challenge: string[]) => { };


const dryrun = options['dryrun'];
const nullRegexp = new RegExp(/\`/);
const regexps: { [key: string]: RegExp; } = {};

(async () => {
	const config = await getConfig(options['config'] || '', defaultConfig);
	const scanDir = path.resolve(config['scanDir']);
	if (fs.existsSync(scanDir) == false) return;
	regexps.deleteKeywords = genEscapedRegExp([...config['deleteKeywords'] || []]) ?? nullRegexp;
	regexps.renameByDirname = genEscapedRegExp([...config['renameByDirnameKeywords']]) ?? nullRegexp;
	const renamePolicies: any[] = normalize(
		[
			...defaultConfig['renamePolicies'],
			...config['renamePolicies'] || [],
		]
	)
		.filter(x => {
			if (x.length < 3) return false;
			if (x.filter(y => y !== null).length < 3) return false;
			if (x.filter(y => y.trim() !== '').length < 3) return false;
			return true;
		});

	const files = listFilesRecursive(scanDir);
	const dirs: string[] = [];
	const left: string[] = [];
	for (const [index, file] of Object.entries(files)) {
		const i: number = parseInt(index);
		if (i > options['max'] - 1) break;

		const stat = lstatSync(file);
		if (stat.isDirectory()) {
			dirs.push(file);
			continue;
		}

		if (stat.isFile() === false) continue;

		const info = path.parse(file);
		const parentDirName = basename(info.dir);
		let dest = file;
		let destBase = info.base;
		let action: Action = 'none';
		// let deleteFile: boolean = false;
		let renameFile: boolean = false;
		const renameByDirName: boolean = false;

		const meetsRenamePolicies: any[] =
			renamePolicies
				.filter(x => {
					if ((new RegExp(x[0])).test(info.base) == false) return false;
					return true;
				});
		const meetsAllDeletePolicies = false;
		const meetsDeleteKeywords = challengeWord(info.base, regexps.deleteKeywords);
		const meetsRenameByDirnameKeywords = challengeWord(parentDirName, regexps.renameByDirname);

		action = (
			meetsRenamePolicies.length > 0
			|| meetsRenameByDirnameKeywords
		) ? 'move' : action;
		action = challengeWord(info.base, regexps.deleteKeywords) ? 'delete' : action;

		if (meetsRenameByDirnameKeywords) {
			destBase = `${parentDirName}${info.ext}`;
		}

		if (meetsRenamePolicies.length > 0) renameFile = true;

		for (const policy of renamePolicies) {
			if ((new RegExp(policy[0])).test(destBase)) {
				destBase = RenameRules.renameByRule(destBase, policy);
				break;
			}
		}

		if (file == path.resolve(path.join(scanDir, destBase))) {
			continue;
		}

		dest = filenameIncrement(path.join(scanDir, destBase));

		const msg = {
			seq: i,
			meetsRenamePolicies: meetsRenamePolicies,
			deleteByKeyword: meetsDeleteKeywords,
			dir: info.dir,
			base: info.base,
			dest: dest,
			destBase: destBase,
			ext: info.ext,
			parentDirName: parentDirName,
			action: action,
		};
		if (options['trace'] == true) console.log(msg);

		//compare delete keywords
		switch (action) {
			case "delete": {
				logger.info(`delete file: ${file}`);
				// if (options['verbose']) console.log('delete file...', file);
				if (dryrun == false) {
					fs.rmSync(file);
				}
				continue;
			}
			case 'move': {
				logger.info(`move file \n  from ==> ${file} \n  to ==> ${dest}`);
				// if (options['verbose']) console.log(`move file... \n  from: ${file}\n  to:${dest}`);
				if (dryrun === false) {
					fs.renameSync(file, dest);
				}
				continue;
			}
			case 'none': {
				left.push(info.base);
				break;
			}
			default: {
				break;
			}
		}
		logger.info('');
	}
	if (dryrun == false) {
		dirs.reverse()
			.map(x => {
				if (fs.readdirSync(x).length == 0) {
					logger.info(`delete empty dir => `, x);
					fs.rmdirSync(x);
				}
			});
	}

	if (options['left'] == true) console.dir({ left: left, size: left.length, scanDir: scanDir, dryrun: dryrun }, { maxArrayLength: null });
	if (options['showConfig']) console.log(config);
})();