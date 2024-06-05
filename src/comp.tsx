import React from "react";
import { render, Text } from 'ink';
import meow from 'meow';
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
				default: false
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

console.log(cli.flags);

render(<Counter />);