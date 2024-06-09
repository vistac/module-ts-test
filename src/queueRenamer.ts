#!/usr/bin/env node
import child_process from 'child_process';
import dotTorrent from 'dot-torrent';
import fs from "fs";
import meow from 'meow';
import moment from "moment-timezone";
import os from 'os';
import path from "path";
import { fileURLToPath } from 'url';
import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";
import { getConfig, timeZone } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const appName = path.parse(__filename)['name'] || 'App';

const cli = meow(
	`
Name
	queueRenamer - rename file to {info hash}.torrent

SYNOPSIS
	queueRenamer [OPTIONS]
	
DESCRIPTION
	--dryrun,-d 
		dry run.
	--config,-c 
		input config file.
	--help,-h 
		show help.
	--verbose,-v 
		verbose.

	`, {
	importMeta: import.meta,
	allowUnknownFlags: false,
	flags: {
		help: {
			shortFlag: 'h'
		},
		config: {
			shortFlag: 'c',
			type: 'string',
			default: path.join(os.homedir(), 'etc', `sukebei-parser.jsonc`),
		},
		dryrun: {
			shortFlag: 'd',
			type: 'boolean'
		},
		verbose: {
			shortFlag: 'v',
			type: 'boolean'
		}
	}
}
);

const defaultConfig = {
	rssUrl: 'https://sukebei.nyaa.si/?page=rss',
	downloadTo: '.',
	logPath: path.join(os.homedir(), 'log', `${appName}-%DATE%.log`),
	logSymlinkPath: path.join(os.homedir(), 'log', `${appName}.log`),
	auditPath: path.join(os.homedir(), 'etc', `${appName}-audit.json`),
	dbPath: path.join(os.homedir(), 'etc', `sukebei-parser.sqlite`)
};

const fileTransport = new transports.DailyRotateFile({
	level: 'info',
	filename: defaultConfig.logPath,
	auditFile: defaultConfig.auditPath,
	symlinkName: defaultConfig.logSymlinkPath,
	createSymlink: true,
	zippedArchive: true,
	maxSize: '50m',
	maxFiles: '7d'
});

const consoleTransport = new transports.Console({});
const logger = createLogger({
	transports: [
		fileTransport,
		consoleTransport,
	],
	format: format.combine(
		format.label({ label: appName }),
		format.colorize(),
		format.prettyPrint(),
		format.printf((info) => {
			if (typeof (info.message) === 'string') {
				return `[${moment().tz(timeZone).format()}] [${info.label}] ${info.level} ${info.message}`;
			} else {
				return `[${moment().tz(timeZone).format()}] [${info.label}] ${info.level}\n${JSON.stringify(info.message, null, 2)}`;
			}
		})
	)
});

const getUserUidGid = (username: string) => {
	const ret = {
		uid: -1,
		gid: -1
	};
	try {
		const uid = parseInt(child_process.execSync(`id -u ${username}`).toString().replace(/\n/g, ''));
		const gid = parseInt(child_process.execSync(`id -g ${username}`).toString().replace(/\n/g, ''));
		ret['uid'] = isNaN(uid) ? -1 : uid;
		ret['gid'] = isNaN(gid) ? -1 : gid;
	} catch (e) { }
	return ret;
};
const config = await getConfig(cli.flags['config'] || '', defaultConfig);
const userInfo = getUserUidGid(config['username'] || '');
const fullScanDir = path.resolve(config['scanDir'] || '');
const fullTargetDir = path.resolve(config['targetDir'] || '');
if ((fs.existsSync(fullScanDir) && fs.lstatSync(fullScanDir).isDirectory()) == false) process.exit();
if ((fs.existsSync(fullTargetDir) && fs.lstatSync(fullTargetDir).isDirectory()) == false) process.exit();
const files = fs.readdirSync(fullScanDir)
	.map(x => path.join(fullScanDir, x))
	.filter(x => fs.lstatSync(x).isFile());
for (const file of files) {
	try {
		const infoHash = dotTorrent.parse(fs.readFileSync(file)).infoHash.toUpperCase() || '';
		const output = path.join(fullTargetDir, `${infoHash}.torrent`);
		fs.chownSync(file, userInfo.uid, userInfo.gid);
		console.log(`chown to ${userInfo.uid}.${userInfo.gid} for file \n\t${file}`);
		fs.chmodSync(file, 0o644);
		console.log(`chmod to file \n\t${file}`);
		fs.renameSync(file, output);
		console.log(`move file \n\t${file} \n\tfrom ${file} \n\tto ${output} done !`);
	} catch (e) {
		console.log(e);
	}
}
