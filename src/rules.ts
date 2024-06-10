export class RenameRules {
	static renameByRule = (srcString: string, policy: string[]) => {
		let result = srcString;
		if (eval(`typeof RenameRules.${policy[2]} === 'function'`)) {
			result = eval(`RenameRules.${policy[2]}('${srcString}', '${policy[0]}', '${policy[1]}')`);
		}
		return result;
	};

	static ruleJavch = (srcString: string, pattern: string, replacement: string): string => {
		return srcString.replace(new RegExp(pattern, 'i'), (...args) => `${args[1].toUpperCase()}-${args[2]}-C.mp4`);
	};

	static ruleUpper = (srcString: string, pattern: string, replacement: string): string => {
		return srcString.replace(new RegExp(pattern, 'i'), (...args) => `${args[1].toUpperCase()}-${args[2]}.mp4`);
	};

	static ruleRemove = (srcString: string, pattern: string, replacement: string): string => {
		return srcString.replace(new RegExp(pattern, 'i'), (...args) => `${args[1].toUpperCase()}.mp4`);
	};

	static ruleNormal = (srcString: string, pattern: string, replacement: string): string => {
		return srcString.replace(new RegExp(pattern, 'i'), replacement);
	};
}