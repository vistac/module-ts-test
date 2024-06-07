import fs, { lstatSync } from "fs";
import path, { basename } from "path";
import { listFilesRecursive } from "./utils.js";
const time = new Date();

(async () => {
	let srcDir = "//bthome//downloads//completed//public";
	let emuDir = "//bthome//rmisctest//";
	let srcDirStr = path.resolve(srcDir);
	let emuDirStr = path.resolve(emuDir);
	let files = listFilesRecursive(srcDir);
	for (let file of files) {
		let info = path.parse(file);
		let stat = lstatSync(file);
		let fileBase = basename(file);
		let targetDir = path.join(emuDir, info.dir.replace(srcDirStr, ''));
		let targetFile = path.join(targetDir, info.base);
		let msg = {
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
				let fd = fs.openSync(targetFile, 'a');
				fs.closeSync(fd);
			} catch (e) {
				console.log(e);
			}
		}
	}
})();