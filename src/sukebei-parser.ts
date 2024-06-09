#!/usr/bin/env node
import meow from "meow";
import moment from "moment-timezone";
import os from 'os';
import path from "path";
import Parser from "rss-parser";
import { DataSource } from "typeorm";
import { fileURLToPath } from 'url';
import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";
import { Feed } from "./entities.js";
import { escapeRegexString, getConfig, getLogFormat, logger, timeZone } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const appName = path.parse(__filename)['name'] || 'App';

const cli = meow(
	`
	RSS Parser for https://sukebei.nyaa.si/?page=rss

	Usage:
	
	$ sukebei-parser
	--dryrun -d dry run.
	--config -c input config file.
	--help -h show help.
	--policies -p show filter policies.
	--rss -r show origin rss feeds.
	--showItems -i show items from rss after filter.
	--verbose -v verbose.

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
			default: path.join(os.homedir(), 'etc', `${appName}.jsonc`),
		},
		dryrun: {
			shortFlag: 'd',
			type: 'boolean'
		},
		showItems: {
			shortFlag: 'i',
			type: 'boolean'
		},
		policies: {
			shortFlag: 'p',
			type: 'boolean'
		},
		rss: {
			shortFlag: 'r',
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

logger.format = getLogFormat('Sukebei-Parser');

const AppDataSource = new DataSource({
	type: 'sqlite',
	database: `torrents.sqlite`,
	synchronize: true,
	entities: [Feed]
});

const config = await getConfig(cli.flags['config'] || '', defaultConfig);
AppDataSource.setOptions({ database: config['dbPath'] });

logger.info('start parser');
await AppDataSource.initialize()
	.then(() => {
		logger.info('init db done!');
	})
	.catch((error) => { logger.info({ message: 'init db failed', error: error }); return; });
const feedsRepository = AppDataSource.getRepository(Feed);

const includeRegExp = new RegExp(
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

const excludeRegExp = new RegExp(
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

const rss: any[] = ((await parser.parseURL(config['rssUrl'])).items as any);
const items = rss
	.map(x => {
		const tmp = x.contentSnippet.split('|').map(x => x.trim());
		const res = {
			link: x.link,
			downloadId: tmp[0] ?? '',
			title: x.title ?? '',
			hash: tmp[4 + ((x.title.match(/\|/g) || []).length) || 0],
			found: includeRegExp.test(tmp[1]) && !excludeRegExp.test(tmp[1]),
			include: includeRegExp.test(tmp[1]),
			exclude: excludeRegExp.test(tmp[1])
		};
		return res;
	});

console.log(items);
for (const item of items) {
	if (excludeRegExp.test(item.title) == true) continue;
	if (includeRegExp.test(item.title) == false) continue;
	if (cli.flags['verbose'] === true) logger.info(`insert ${item['title']}`);
	delete item.found;
	if (cli.flags['dryrun'] === true) continue;
	await feedsRepository.save(item)
		.then(x => { logger.info(`insert done ==> ${x['title']}`); })
		.catch((e) => {
			logger.info([`insert error:`, `${e.code}=>${e.errno}`, `hash: ${item.hash}`, `title: ${item.title}`]);
		});
}
if (cli.flags['rss'] === true) console.log('rss', rss);
if (cli.flags['showItems'] === true) console.log('items', items);

logger.info('end parser');
logger.info('');