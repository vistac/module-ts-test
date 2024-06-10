import { Text } from 'ink';
import { getLogFormat, nullishCoalescing, randomRange, timeZone, logger, humanSize } from './utils.js';
import { randomInt } from 'crypto';
import { statfsSync } from 'fs';
const Counter = () => (
	<>
		<Text>Example</Text>
	</>
);
nullishCoalescing(0, "");

logger.format = getLogFormat('comp');
console.log(logger);


(async () => {
	const aa = randomInt(9999999).toString().padStart(9, '0');

	logger.info(aa);
	for (const i of Array(9).keys()) {
		// logger.info(`${i} => ${aa}`);
	}
	const space = statfsSync('//bthome//downloads');
	const total = space.bsize * space.blocks;
	const free = space.bsize * space.bfree;
	console.log(space);
	console.log(`total: ${humanSize(total)}, free: ${humanSize(free)}`);
	const str = 'HUNTC-141.jpg';
	const reg = (new RegExp(/(^[a-zA-Z]{5})-([0-9]+).jpg/, 'i'));
	console.log(reg.test(str));
})();
