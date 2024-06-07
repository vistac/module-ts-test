import fs, { lstatSync } from "fs";
import os from 'os';
import path, { basename } from "path";
import { listFilesRecursive } from "./utils.js";
import meow from "meow";
const time = new Date();
const options = meow(
	`
	build emulation folder	

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
		source: {
			shortFlag: 's',
			type: 'string',
			default: '//bthome//downloads//completed//public'
		},
		dest: {
			shortFlag: 'd',
			type: 'string',
			default: '//bthome//rmisctest//'
		}
	}

}).flags;

(async () => {
	// const srcDir = "//bthome//downloads//completed//public";
	const emuDir = "//bthome//rmisctest//";
	const srcDirStr = path.resolve(options['source']);
	// const emuDirStr = path.resolve(options['dest']);
	const files = listFilesRecursive(srcDirStr);
	for (const file of files) {
		const info = path.parse(file);
		const stat = lstatSync(file);
		const fileBase = basename(file);
		const targetDir = path.join(emuDir, info.dir.replace(srcDirStr, ''));
		const targetFile = path.join(targetDir, info.base);
		const msg = {
			file: file,
			base: fileBase,
			targetDir: targetDir,
			targetFile: targetFile
		};

		try {
			fs.mkdirSync(targetDir, { recursive: true });
		} catch (e) {
			console.log(e);
		}
		if (stat.isFile()) {
			try {
				const fd = fs.openSync(targetFile, 'a');
				fs.closeSync(fd);
			} catch (e) {
				console.log(e);
			}
		}
	}
})();