import dotTorrent from 'dot-torrent';
import fs from 'fs';
import { render, Text } from 'ink';
import meow from 'meow';
import { fileURLToPath } from 'url';
const cli = meow(
	`
		Usage
			$ fooo
	`
	, {
		importMeta: import.meta,
		flags: {
			help: {
				shortFlag: 'h'
			},
			ranbow: {
				type: 'boolean',
				shortFlag: 'r',
			},
			dryrun: {
				type: 'boolean',
				shortFlag: 'd',
			},
			showleft: {
				type: 'boolean',
				shortFlag: 'l',
			}
		}

	});

const Counter = () => (
	<>
		<Text>Example</Text>
	</>
);

const __filename = fileURLToPath(import.meta.url);
console.log(cli.flags);
const infoHash = dotTorrent.parse(fs.readFileSync('aa.torrent')).infoHash;
console.log(infoHash);
render(<Counter />);