#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import JSON5 from 'json5';
import moment from "moment-timezone";
import {
	DownloaderHelper,
	DownloaderHelperOptions,
} from 'node-downloader-helper';
import os from 'os';
import path from "path";
import { DataSource } from "typeorm";
import { fileURLToPath } from 'url';
import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";
import { Feed } from "./entities.js";
import { getConfig, localTime, randomRange, sleep, timeZone } from "./utils.js";
import meow from "meow";
import { url } from "inspector";
import { error } from "console";

const __filename = fileURLToPath(import.meta.url);
const appName = path.parse(__filename)['name'] || 'App';

const options = meow(
	`
	download torrents from https://sukebei.nyaa.si/?page=rss

	Usage:

	$ sukebei-downloader
	--dryrun -d dry run.
	--help -h show help.
	`, {
	importMeta: import.meta,
	flags: {
		config: {
			shortFlag: 'c',
			type: 'string',
			default: path.join(os.homedir(), 'etc', `sukebei-parser.jsonc`),
		},
		help: {
			shortFlag: 'h'
		},
		dryrun: {
			shortFlag: 'd',
			type: 'boolean'
		},
	}

}).flags;

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

const AppDataSource = new DataSource({
	type: 'sqlite',
	database: `torrents.sqlite`,
	// synchronize true will re-build the db with every build. definitely not recommended to use in production
	synchronize: false,
	// entityPrefix: 'rss_',
	// entities: [path.join(__dirname, '**', '*.entity.ts')]
	entities: [Feed]
});

(async () => {
	const config = await getConfig(options['config'] || '', defaultConfig);
	AppDataSource.setOptions({ database: config['dbPath'] });

	await AppDataSource.initialize()
		.then(() => {
			logger.info('init db done!');
		})
		.catch((error) => { logger.info({ message: 'init db failed', error: error }); return; });
	const feedsRepository = AppDataSource.getRepository(Feed);
	const items: any[] = await feedsRepository.find(
		{
			where: {
				downloaded: false,
			},
			// take: 1,
		}
	);
	const downloadOption: DownloaderHelperOptions = {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
		},
		retry: { maxRetries: 3, delay: 3000 },
		fileName: filename => filename,
		resumeOnIncomplete: true,
		resumeOnIncompleteMaxRetry: 3,
		override: false,
	};

	const url =
		'https://file-examples.com/wp-content/storage/2017/04/file_example_MP4_480_1_5MG.mp4';

	const downloader = new DownloaderHelper('http://www.google.com/123.html', config['downloadTo'], downloadOption)
		.on('end', downloadInfo => { })
		.on('progress', stats => { })
		.on('error', error => { });

	for (const item of items) {
		const wait = randomRange(5, 2);
		downloader.updateOptions({ fileName: `${item['hash']}.torrent` }, item['link']);
		console.log(`start download: ${item['link']}`);
		const httpStatus: number = await downloader
			.start()
			.then(x => {
				console.log('download done!');
				return 0;
			})
			.catch(err => {
				console.log(err);
				return err.status;
			});
		if (httpStatus !== 0) continue;
		item['downloaded'] = true;
		item['downloadAt'] = localTime();
		await feedsRepository
			.save(item)
			.then(x => `Download done: ${item.title}`)
			.catch(err => logger.info(['update db error', err]));
		await sleep(wait);
	}

})();
