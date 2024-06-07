import fs, { lstatSync } from "fs";
import path, { basename } from "path";
import { listFilesRecursive } from "./utils.js";
const time = new Date();

(async () => {
	const srcDir = "//bthome//downloads//completed//public";
	const emuDir = "//bthome//rmisctest//";
	const srcDirStr = path.resolve(srcDir);
	const emuDirStr = path.resolve(emuDir);
	const files = listFilesRecursive(srcDir);
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