import { Text } from 'ink';
import { getLogFormat, nullishCoalescing, randomRange, timeZone, logger } from './utils.js';
import { randomInt } from 'crypto';

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
})();
