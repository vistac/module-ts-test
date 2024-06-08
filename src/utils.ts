import fs, { existsSync, lstatSync, readFileSync, readdirSync } from 'fs';
import moment from "moment-timezone";
import os from 'os';
import path from "path";

export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
export const platform = os.platform();

export const doNothing = () => null;
export const sleep = async (sec: number) => new Promise((r) => setTimeout(r, sec * 1000));
export const regexpEscape = (origString = '') => {
	return origString.replace(/[\^$\\.*+?()[\]{}|]/g, '\\$&');
};
export const escapeRegexString = (s: string) => s.replace(/./g, a => "[]".includes(a) ? "\\" + a : a);
export const randomRange = (max: number, min: number = 0) => { return Math.floor(Math.random() * (max - min) + min); };
export const delayRandomInRange = (max: number, min: number = 0) => {
	let waitSeconds = randomRange(max, min);
	return new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
};

export const localTime = () => moment().tz(moment.tz.guess()).format();
export const humanSize = (bytes: number, standard: string | number = 0) => {
	//0 or iec for 1024 base
	//1 or si for 1000 base
	const [power, unitName] = (standard == 0 || standard == 'iec') ? [1024, 'iB'] : [1000, 'B'];
	if (bytes == 0) { return `0.00 ${unitName}`; }
	const b = Math, c = b.log, d = power;
	const e = Math.log(bytes) / Math.log(power) | 0;
	return (e == 0 ? `${bytes} bytes` : `${(bytes / Math.pow(power, e)).toFixed(2)} ${'kMGTPEZY'[e - 1]}${unitName}`);
};
export const ansiLen = (str) => {
	return str.replace(new RegExp(/[^\\x00-\\xff]/, 'g'), "xx").length;
};

export const filenameIncrement = (filename: string) => {
	let info = path.parse(filename);
	let start = 1;
	while (fs.existsSync(filename)) {
		filename = path.join(info.dir, `${info.name}(${start})${info.ext}`);
		start++;
	}
	return filename;
};

export const arrayEqual = (a, b) => {
	if (a.length !== b.length) { return false; }
	for (let i = 0; i < a.length; ++i) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	return true;
};

export const contains = (array, item) => {
	for (let i = 0; i < array.length; ++i) {
		if (arrayEqual(array[i], item)) {
			return true;
		}
	}
	return false;
};

export const normalize = (array: any[]): any[] => {
	let result: any[] = [];
	for (let i = 0; i < array.length; ++i) {
		if (!contains(result, array[i])) {
			result.push(array[i]);
		}
	}
	return result as any[];
};

export const challengeWord = (word: string, challenge: RegExp) => {
	let msg = ({
		word: word,
		challenge: challenge,
		result: challenge.test(word),
	});
	return challenge.test(word);
};

export const genEscapedRegExp = (words: string[]) => {
	return new RegExp(words
		.map(x => escapeRegexString(x))
		.join('|')
		, 'i');
};

export const genRegExp = (words: string[]) => {
	return new RegExp(words
		.join('|')
		, 'i');
};
export const listFilesRecursive = (dirName: string): string[] => {
	let result: any[] = [];
	let files: any[] = readdirSync(dirName)
		.map(x => path.resolve(path.join(dirName, x)));

	// if (files.length == 0) {
	// 	console.log(`${dirName} is empty, delete it !`);
	// 	fs.rmdirSync(dirName);
	// }

	for (let file of files) {
		let stat = lstatSync(file);
		if (stat.isDirectory()) {
			result = [...result, file, ...listFilesRecursive(file)];
		} else if (stat.isFile()) {
			result = [...result, file];
		} else {

		}
	}
	return result;
};

// 用??取代||
// || 會把 0 和 ""視為false
// ??會把 0 和 ""視為true
export const nullishCoalescing = (num?: number, str?: string) => {
	num = num ?? 1;
	str = str ?? "default str";
	console.log(`number: ${num}, string: ${str}`);
};

import JSON5 from 'json5';
export const getConfig = async (filename: string, defaultConfig: any = {}) => {
	if (await existsSync(filename)) {
		return { ...defaultConfig, ...JSON5.parse(readFileSync(filename).toString()) };
	} else {
		return defaultConfig;
	}
};