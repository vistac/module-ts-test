import { render, Text } from 'ink';
import { fileURLToPath } from 'url';

const Counter = () => (
	<>
		<Text>Example</Text>
	</>
);
(async () => {
	const url =
		'https://file-examples.com/wp-content/storage/2017/04/file_example_MP4_480_1_5MG.mp4';
	const __filename = fileURLToPath(import.meta.url);

	render(<Counter />);
})();
