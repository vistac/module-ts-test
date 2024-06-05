import os from 'os';
export const platform = os.platform();
export const testImport = () => {
	console.log('test');
};