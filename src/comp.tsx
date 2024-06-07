import dotTorrent from 'dot-torrent';
import fs from 'fs';
import { render, Text } from 'ink';
import meow from 'meow';
import { fileURLToPath } from 'url';
import { doNothing } from './utils.js';
import type { ExtendedAnyFlags } from 'meow-helper';
const testFlags: ExtendedAnyFlags = {
	help: { alias: 'h', type: 'boolean', desc: 'help' },
	name: { alias: 'n', type: 'string', desc: 'Name' },
	cwd: { alias: 'c', type: 'string', desc: 'Working path.' },
	context: { type: 'string', desc: 'Context.' },
};
const cli = meow(
	`
		Usage
			$ foo
	`,
	{
		importMeta: import.meta,
		allowUnknownFlags: false,
		flags: {
			help: {
				shortFlag: 'h',
			},
			rainbow: {
				type: 'boolean',
				shortFlag: 'r',
			},
			dryrun: {
				type: 'boolean',
				shortFlag: 'd',
			},
			showLeft: {
				type: 'boolean',
				shortFlag: 'l',
			},
		},
	}
);

const Counter = () => (
	<>
		<Text>Example</Text>
	</>
);
import {
	DownloaderHelper,
	DownloaderHelperOptions,
} from 'node-downloader-helper';
import Parser from 'rss-parser';
(async () => {
	const url =
		'https://file-examples.com/wp-content/storage/2017/04/file_example_MP4_480_1_5MG.mp4';
	const __filename = fileURLToPath(import.meta.url);
	console.log(cli.flags);
	// const infoHash = dotTorrent.parse(fs.readFileSync('aa.torrent')).infoHash;
	// console.log(infoHash);
	const downloadOption: DownloaderHelperOptions = {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
		},
		retry: true,
		resumeOnIncompleteMaxRetry: 20,
		fileName: 'aaa.mp4',
		override: false,
	};
	const downloader = new DownloaderHelper(url, './', downloadOption);

	// downloader.updateOptions({}, 'http://www.google.com');
	// await downloader.start().catch(e => console.log('err', e));
	// downloader.updateOptions({}, 'http://abba.ddnsking.com/aa.jpg');
	// await downloader.start().catch(e => console.log('err', e));
	// console.log(downloader.getOptions());

	render(<Counter />);
	// const parser = new Parser();
	// let items: any = await parser.parseURL('https://xxxclub.to/feed/1080p.FullHD.xml');
	// console.log(items);
})();
