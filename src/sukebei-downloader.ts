#!/usr/bin/env node
import meow from "meow";
import {
	DownloaderHelper,
} from 'node-downloader-helper';
import os from 'os';
import path from "path";
import { DataSource } from "typeorm";
import { fileURLToPath } from 'url';
import "winston-daily-rotate-file";
import { Feed } from "./entities.js";
import { downloadOption, getConfig, getLogFormat, localTime, logger, randomRange, sleep } from "./utils.js";

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
		take: {
			shortFlag: 't',
			type: 'number',
			default: 9999
		}
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
logger.format = getLogFormat('Sukebei-Downloader');

const AppDataSource = new DataSource({
	type: 'sqlite',
	database: `torrents.sqlite`,
	synchronize: false,
	entities: [Feed]
});

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
		take: options['take'],
	}
);

const url =
	'https://file-examples.com/wp-content/storage/2017/04/file_example_MP4_480_1_5MG.mp4';

const downloader = new DownloaderHelper('http://www.google.com/123.html', config['downloadTo'], downloadOption)
	.on('end', downloadInfo => { })
	.on('progress', stats => { })
	.on('error', error => { });

logger.info('start download process....');
for (const item of items) {
	const wait = randomRange(5, 2);
	downloader.updateOptions({ fileName: `${item['hash']}.torrent` }, item['link']);
	logger.info(`download: ${item['link']}`);
	logger.info(`title: ${item['title']}`);
	const httpStatus: number = await downloader
		.start()
		.then(x => {
			logger.info(`download success.`);
			return 0;
		})
		.catch(err => {
			logger.info(`download failed, code : ${err.status}`);
			return err.status;
		});
	if (httpStatus === 0) {
		item['downloaded'] = true;
		item['downloadAt'] = localTime();
		await feedsRepository
			.save(item)
			.then(x => `Download done: ${item.title}`)
			.catch(err => logger.info(['update db error', err]));
	}
	logger.info('');
	await sleep(wait);
}
logger.info(`end process...`);