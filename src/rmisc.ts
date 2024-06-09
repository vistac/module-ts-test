#!/usr/bin/env node
import fs, { existsSync, lstatSync, readFileSync } from 'fs';
import JSON5 from 'json5';
import os from 'os';
import path, { basename } from "path";
import "winston-daily-rotate-file";
import { challengeWord, filenameIncrement, genEscapedRegExp, getConfig, listFilesRecursive, normalize } from "./utils.js";
import meow from 'meow';
import { fileURLToPath } from 'url';
export type Action = 'none' | 'delete' | 'move';
const __filename = fileURLToPath(import.meta.url);
const appName = path.parse(__filename)['name'] || 'App';


const defaultConfig = {
	scanDir: "//rmisc",
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
	`, {
	importMeta: import.meta,
	flags: {
		config: {
			shortFlag: 'c',
			type: 'string',
			default: path.join(os.homedir(), 'etc', `${appName}.jsonc`),
		},
		dryrun: {
			shortFlag: 'd',
			type: 'boolean',
			default: true
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
		take: {
			shortFlag: 't',
			type: 'number',
			default: 9999
		}
	}

}).flags;

const meetsDeleteKeywords = (filename: string, challenge: RegExp) => {
	const result = challenge.test(filename);
	return result;
};
const meetsFitRenameKeywords = (filename: string, challenge: string[]) => { };
const meetsFitKeepKeywords = (filename: string, challenge: string[]) => { };

const renameByRule = (srcString: string, policy: string[]) => {
	let result = srcString;
	if (eval(`typeof ${policy[2]} === 'function'`)) {
		result = eval(`${policy[2]}('${srcString}', '${policy[0]}', '${policy[1]}')`);
	}
	return result;
};

const ruleJavch = (srcString: string, pattern: string, replacement: string): string => {
	return srcString.replace(new RegExp(pattern, 'i'), (...args) => `${args[1].toUpperCase()}-${args[2]}-C.mp4`);
};

const ruleUpper = (srcString: string, pattern: string, replacement: string): string => {
	return srcString.replace(new RegExp(pattern, 'i'), (...args) => `${args[1].toUpperCase()}-${args[2]}.mp4`);
};

const ruleRemove = (srcString: string, pattern: string, replacement: string): string => {
	return srcString.replace(new RegExp(pattern, 'i'), (...args) => `${args[1].toUpperCase()}.mp4`);
};

const ruleNormal = (srcString: string, pattern: string, replacement: string): string => {
	return srcString.replace(new RegExp(pattern, 'i'), replacement);
};

const regexps = {
	regexpDeleteKeywords: new RegExp(/\`/),
	regexpRenameByDirname: new RegExp(/\'/)
};

(async () => {
	const config = await getConfig(options['config'] || '', defaultConfig);
	console.log(config);
	//   return;
	//   const dryrun = options['dryrun'];
	//   const config = { ...defaultConfig, ...(await getConfig()) };
	//   const max = options['max'];

	//   const scanDir = path.resolve(config['scanDir']);
	//   if (fs.existsSync(scanDir) == false) return;

	//   regexps.regexpDeleteKeywords = genEscapedRegExp([...config['deleteKeywords'] || []]);
	//   regexps.regexpRenameByDirname = genEscapedRegExp([...config['renameByDirnameKeywords']]);

	//   const renamePolicies: any[] = normalize(
	//     [
	//       ...defaultConfig['renamePolicies'],
	//       ...config['renamePolicies'] || [],
	//     ]
	//   )
	//     .filter(x => {
	//       if (x.length < 3) return false;
	//       if (x.filter(y => y !== null).length < 3) return false;
	//       if (x.filter(y => y.trim() !== '').length < 3) return false;
	//       return true;
	//     });

	//   const files = listFilesRecursive(scanDir);
	//   let dirs: string[] = [];
	//   let left: any[] = [];
	//   let i = 0;
	//   for (const file of files) {
	//     if (i >= max) break;
	//     i++;

	//     const stat = lstatSync(file);
	//     if (stat.isDirectory()) {
	//       dirs = [...dirs, file];
	//       continue;
	//     }
	//     if (stat.isFile() === false) continue;

	//     const info = path.parse(file);
	//     const parentDirName = basename(info.dir);
	//     let dest = file;
	//     let destBase = info.base;
	//     let action: Action = 'none';

	//     let deleteFile: boolean = false;
	//     let renameFile: boolean = false;
	//     const renameByDirName: boolean = false;


	//     const meetsRenamePolicies: any[] =
	//       renamePolicies
	//         .filter(x => {
	//           if ((new RegExp(x[0])).test(info.base) == false) return false;
	//           return true;
	//         });
	//     let meetsAllDeletePolicies = false;
	//     const meetsDeleteKeywords = challengeWord(info.base, regexps.regexpDeleteKeywords);
	//     const meetsRenameByDirnameKeywords = challengeWord(parentDirName, regexps.regexpRenameByDirname);

	//     action = (
	//       meetsRenamePolicies.length > 0
	//       || challengeWord(parentDirName, regexps.regexpRenameByDirname)
	//     ) ? 'move' : action;

	//     action = challengeWord(info.base, regexps.regexpDeleteKeywords) ? 'delete' : action;

	//     if (meetsRenameByDirnameKeywords) {
	//       destBase = `${parentDirName}${info.ext}`;
	//     }

	//     if (meetsRenamePolicies.length > 0) renameFile = true;

	//     renamePolicies
	//       .map(x => {
	//         destBase = renameByRule(destBase, x);
	//       });

	//     if (file == path.resolve(path.join(scanDir, destBase))) {
	//       continue;
	//     }

	//     dest = filenameIncrement(path.join(scanDir, destBase));

	//     if (meetsDeleteKeywords == true) {
	//       meetsAllDeletePolicies = true;
	//     }

	//     if (dryrun == false && (meetsAllDeletePolicies == true)) {
	//       deleteFile = true;
	//     }

	//     let msg = {
	//       meetsRenamePolicies: meetsRenamePolicies,
	//       seq: i,
	//       dryrun: dryrun,
	//       deleteByKeyword: meetsDeleteKeywords,
	//       dir: info.dir,
	//       base: info.base,
	//       dest: dest,
	//       destBase: destBase,
	//       ext: info.ext,
	//       parentDirName: parentDirName,
	//       action: action
	//     };
	//     // if (meetsRenameByDirnameKeywords) console.log(msg);
	//     if (options['show-delete-keys'] == true) msg = { ...{ deleteRegexp: regexps.regexpDeleteKeywords }, ...msg, };
	//     if (options['verbose'] == true) console.log(msg);

	//     //compare delete keywords
	//     if (options['dryrun'] == false) {
	//       switch (action) {
	//         case "delete": {
	//           // console.log(`delete ${file}`);
	//           fs.rmSync(file);
	//           break;
	//         }
	//         case 'move': {
	//           // console.log(`move : ${file} to ${dest}`);
	//           fs.renameSync(file, dest);
	//           break;
	//         }
	//         case 'none': {
	//           break;
	//         }
	//         default: {
	//           break;
	//         }
	//       }

	//     }
	//     if (action == 'none')
	//       left = [...left, info.base];

	//   }
	//   if (options['dryrun'] == false) {
	//     dirs.reverse()
	//       .map(x => {
	//         if (fs.readdirSync(x).length == 0) {
	//           console.log(`delete empty dir => `, x);
	//           fs.rmdirSync(x);
	//         }
	//       });
	//   }

	//   if (options['left'] == true) console.dir({ left: left, size: left.length, scanDir: scanDir, dryrun: dryrun }, { maxArrayLength: null });
	//   if (options['showConfig']) console.log(config);
})();