#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import JSON5 from 'json5';
import moment from "moment-timezone";
import { default as Downloader } from "nodejs-file-downloader";
import os from 'os';
import path from "path";
import { DataSource } from "typeorm";
import { fileURLToPath } from 'url';
import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";
import { Feed } from "./entities";
import { localTime, randomRange, sleep } from "./utils";


const configFile = process.argv[2] || path.join(os.homedir(), 'etc', `sukebei-parser.json`);
const getConfig = async () => {
	if (await existsSync(configFile)) {
		return JSON5.parse(readFileSync(configFile).toString());
	} else {
		return { includeKeywords: [], downloadTo: path.join(os.homedir(), 'torrents') };
	}
};

// const __filename = fileURLToPath(import.meta.url);
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const appName = path.parse(__filename)['name'] || 'App';
const platform = os.platform();

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

	let config = { ...defaultConfig, ...(await getConfig()) };

	AppDataSource.setOptions({ database: config['dbPath'] });
	await AppDataSource.initialize()
		.then(() => {
			logger.info('init db done!');
		})
		.catch((error) => { logger.info({ message: 'init db failed', error: error }); return; });
	let feedsRepository = AppDataSource.getRepository(Feed);
	let items: any[] = await feedsRepository.find(
		{
			where: {
				downloaded: false,
			},
		}
	);
	for (let item of items) {
		let wait = randomRange(5, 2);
		let downloader = new Downloader({
			url: item.link,
			fileName: `${item.hash}.torrent`,
			directory: config.downloadTo,
			maxAttempts: 10,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
			}
		});

		try {
			await downloader.download();
			logger.info(`Download done: ${item.title}`);
			item['downloaded'] = true;
			item['downloadAt'] = localTime();
			await feedsRepository
				.save(item)
				.then()
				.catch(err => logger.info(['update db error', err]));

		} catch (error) {
			console.log(error);
		}
		await sleep(wait);
		continue;
	}

})();
