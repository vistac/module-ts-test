import React from "react";
import { render, Text } from 'ink';
import meow from 'meow';
import { fileURLToPath } from "url";
import { basename } from "path";
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

// const __filename = fileURLToPath(import.meta.url);
console.log(cli.flags);

render(<Counter />);