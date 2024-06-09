import { Text } from 'ink';
import { nullishCoalescing, randomRange, timeZone } from './utils.js';
import { createLogger, format, transports } from 'winston';
import moment from 'moment';
import "winston-daily-rotate-file";
import { randomInt } from 'crypto';

const Counter = () => (
	<>
		<Text>Example</Text>
	</>
);
nullishCoalescing(0, "");

const consoleTransport = new transports.Console({});
const fileTransport = new transports.DailyRotateFile({
	level: 'info',
	filename: '//tmp/test-%DATE%.log',
	auditFile: '//tmp//test.log.json',
	symlinkName: 'test.log',
	createSymlink: true,
	zippedArchive: true,
	maxSize: '10m',
	maxFiles: '7d'
});
const logger = createLogger({
	transports: [
		fileTransport,
		consoleTransport,
	],
	format: format.combine(
		format.label({ label: 'Test' }),
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
const myFormat = format.combine(format.label({ label: 'abc' }));
console.log(myFormat.options);
logger.info('123');

(async () => {
	for (const i of Array(9).keys()) {
		const aa = randomInt(9999999).toString().padStart(9, '0');
		// logger.info(`${i} => ${aa}`);
	}
})();
