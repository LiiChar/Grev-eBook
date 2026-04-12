function splitChapter(html: string, size = 20) {
	const div = document.createElement('div');
	div.innerHTML = html;

	const blocks = Array.from(div.children);
	const chunks = [];

	for (let i = 0; i < blocks.length; i += size) {
		chunks.push(blocks.slice(i, i + size));
	}

	return chunks;
}
