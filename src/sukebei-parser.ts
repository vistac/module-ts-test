#!/usr/bin/env node
import JSON5 from 'json5';
import moment from "moment-timezone";
import os from 'os';
import path from "path";
import Parser from "rss-parser";
import { DataSource } from "typeorm";
import { fileURLToPath } from 'url';
import { createLogger, format, transports, verbose } from "winston";
import "winston-daily-rotate-file";
import { Feed } from "./entities.js";
import { escapeRegexString, getConfig, timeZone } from "./utils.js";
import meow from "meow";

const __filename = fileURLToPath(import.meta.url);
const appName = path.parse(__filename)['name'] || 'App';

const cli = meow(
	`
	RSS Parser for https://sukebei.nyaa.si/?page=rss

	Usage:
	
	$ sukebei-parser
	--help -h show help
	--config -c input config file
	`, {
	importMeta: import.meta,
	flags: {
		help: {
			shortFlag: 'h'
		},
		config: {
			shortFlag: 'c',
			type: 'string',
			default: path.join(os.homedir(), 'etc', `${appName}.jsonc`),
		},
		dryrun: {
			shortFlag: 'd',
			type: 'boolean'
		},
		items: {
			shortFlag: 'i',
			type: 'boolean'
		},
		policies: {
			shortFlag: 'p',
			type: 'boolean'
		},
		verbose: {
			shortFlag: 'v',
			type: 'boolean'
		}

	}
}
);

const parser = new Parser();
const defaultConfig = {
	rssUrl: 'https://sukebei.nyaa.si/?page=rss',
	logPath: path.join(os.homedir(), 'log', `${appName}-%DATE%.log`),
	logSymlinkPath: path.join(os.homedir(), 'log', `${appName}.log`),
	auditPath: path.join(os.homedir(), 'etc', `${appName}-audit.json`),
	dbPath: path.join(os.homedir(), 'etc', `${appName}.sqlite`),
	includeKeywords: ['fc2'],
	excludeKeywords: ['480p'],
	downloadTo: path.join(os.homedir(), 'torrents')
};

const includeKeywords: string[] = ['fc2'];
const excludeKeywords: string[] = ['720p'];


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


const AppDataSource = new DataSource({
	type: 'sqlite',
	database: `torrents.sqlite`,
	synchronize: true,
	entities: [Feed]
});


(async () => {
	// let config = { ...defaultConfig, ...(await getConfig()) };
	let config = await getConfig(cli.flags['config'] || '', defaultConfig);
	AppDataSource.setOptions({ database: config['dbPath'] });

	await AppDataSource.initialize()
		.then(() => {
			logger.info('init db done!');
		})
		.catch((error) => { logger.info({ message: 'init db failed', error: error }); return; });
	let feedsRepository = AppDataSource.getRepository(Feed);

	fileTransport.options.filename = config['logPath'];
	fileTransport.options.auditFile = config['auditPath'];

	let includeRegExp = new RegExp(
		[
			...new Set(
				[
					...includeKeywords,
					...config['includeKeywords'] || []
				]
			)
		]
			.map(x => escapeRegexString(x))
			.join('|'), 'i');

	let excludeRegExp = new RegExp(
		[
			...new Set(
				[
					...excludeKeywords,
					...config['excludeKeywords'] || []
				]
			)
		]
			.map(x => escapeRegexString(x))
			.join('|'), 'i');

	if (cli.flags['policies'] == true) {
		console.log({
			include: includeRegExp,
			exclude: excludeRegExp
		});
	}
	let items: any[] = ((await parser.parseURL(config['rssUrl'])).items as any);
	items = items
		.map(x => {
			let tmp = x.contentSnippet.split('|').map(x => x.trim());
			let res = {
				link: x.link,
				downloadId: tmp[0] || '',
				title: x.title || '',
				hash: tmp[4 + ((x.title.match(/\|/g) || []).length) || 0],
				found: includeRegExp.test(tmp[1]) && !excludeRegExp.test(tmp[1]),
				include: includeRegExp.test(tmp[1]),
				exclude: excludeRegExp.test(tmp[1])
			};
			return res;
		});

	if (cli.flags['items'] === true) console.log(items);
	for (let item of items) {
		if (excludeRegExp.test(item.title) == true) continue;
		if (includeRegExp.test(item.title) == false) continue;
		if (cli.flags['verbose'] === true) console.log(item);
		delete item.found;
		// logger.info(['insert', item]);
		if (cli.flags['dryrun'] === true) continue;
		await feedsRepository.save(item)
			.then(x => { logger.info(['insert done!', x]); })
			.catch((e) => {
				logger.info([`insert error:`, `${e.code}=>${e.errno}`, `hash: ${item.hash}`, `title: ${item.title}`]);
			});
	}
})();
