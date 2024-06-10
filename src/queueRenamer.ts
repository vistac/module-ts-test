#!/usr/bin/env node
import child_process from 'child_process';
import dotTorrent from 'dot-torrent';
import fs from "fs";
import meow from 'meow';
import os from 'os';
import path from "path";
import { fileURLToPath } from 'url';
import "winston-daily-rotate-file";
import { getConfig } from './utils.js';

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