import { Text } from 'ink';
import { nullishCoalescing } from './utils.js';

const Counter = () => (
	<>
		<Text>Example</Text>
	</>
);
const aa = async () => { console.log(`12`); return 'aa'; };
const bb = await aa();
console.log(bb);
nullishCoalescing(0, "");
console.log(`%cMy name is %cAdam`, 'color:green', 'color: blue');
// (async () => {
// 	const url =
// 		'https://file-examples.com/wp-content/storage/2017/04/file_example_MP4_480_1_5MG.mp4';
// 	const __filename = fileURLToPath(import.meta.url);

// 	render(<Counter />);
// })();
