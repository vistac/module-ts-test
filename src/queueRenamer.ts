#!/usr/bin/env node
import child_process from 'child_process';
import dotTorrent from 'dot-torrent';
import fs from "fs";
// import getopts from 'getopts';
import JSON5 from 'json5';
import moment from "moment-timezone";
import os from 'os';
import path from "path";
import { fileURLToPath } from 'url';
import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";
// import meow from 'meow';

// const __filename = fileURLToPath(import.meta.url);
const username = 'vistac';
const scanDir = process.argv[2] || '//bthome//torrent//public//download//';
const targetDir = process.argv[3] || '//bthome//torrent//public//queue//';
const configFile = process.argv[2] || path.join(os.homedir(), 'etc', `sukebei-parser.json`);
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const appName = path.parse(__filename)['name'] || 'App';
const platform = os.platform();
// const cli = meow(
// 	`
// 		rename filename to hash
// 		Usage
// 			$ fooo
// 	`
// 	, {
// 		importMeta: import.meta,
// 		flags: {
// 			help: {
// 				shortFlag: 'h'
// 			},
// 			test: {
// 				type: 'boolean',
// 				shortFlag: 't'
// 			}
// 		}
// 	});
// const options = getopts(process.argv.slice(2), {});
// const options = cli.flags;

const getConfig = async () => {
	if (await fs.existsSync(configFile)) {
		return JSON5.parse(fs.readFileSync(configFile).toString());
	} else {
		return { includeKeywords: [], downloadTo: path.join(os.homedir(), 'torrents') };
	}
};

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
	let ret = {
		uid: -1,
		gid: -1
	};
	try {
		let uid = parseInt(child_process.execSync(`id -u ${username}`).toString().replace(/\n/g, ''));
		let gid = parseInt(child_process.execSync(`id -g ${username}`).toString().replace(/\n/g, ''));
		ret['uid'] = isNaN(uid) ? -1 : uid;
		ret['gid'] = isNaN(gid) ? -1 : gid;
	} catch (e) { }
	return ret;
};
(async () => {
	let config = { ...defaultConfig, ...(await getConfig()) };
	let userInfo = getUserUidGid(config['username'] || '');
	let fullScanDir = path.resolve(config['scanDir'] || '');
	let fullTargetDir = path.resolve(config['targetDir'] || '');
	if ((fs.existsSync(fullScanDir) && fs.lstatSync(fullScanDir).isDirectory()) == false) return;
	if ((fs.existsSync(fullTargetDir) && fs.lstatSync(fullTargetDir).isDirectory()) == false) return;
	let files = fs.readdirSync(fullScanDir)
		.map(x => path.join(fullScanDir, x))
		.filter(x => fs.lstatSync(x).isFile());
	for (let file of files) {
		try {
			let infoHash = dotTorrent.parse(fs.readFileSync(file)).infoHash.toUpperCase() || '';
			let output = path.join(fullTargetDir, `${infoHash}.torrent`);
			fs.chownSync(file, userInfo.uid, userInfo.gid);
			console.log(`chown to ${userInfo.uid}.${userInfo.gid} for file ${file}`);
			fs.chmodSync(file, 0o644);
			console.log(`chmod to file ${file}`);
			fs.renameSync(file, output);
			console.log(`move file ${file} from ${file} to ${output} done !`);
		} catch (e) {
			console.log(e);
		}
	}
})();
