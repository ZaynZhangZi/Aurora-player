function parseTimestampToMs(min, sec, frac = "") {
	const minute = Number(min);
	const second = Number(sec);
	if (!Number.isFinite(minute) || !Number.isFinite(second)) return 0;

	const fractionText = String(frac || "").trim();
	let milli = 0;
	if (fractionText) {
		if (fractionText.length >= 3) milli = Number(fractionText.slice(0, 3));
		else if (fractionText.length === 2) milli = Number(fractionText) * 10;
		else milli = Number(fractionText) * 100;
	}

	const baseMs = minute * 60 * 1000 + second * 1000;
	return Math.max(0, baseMs + (Number.isFinite(milli) ? milli : 0));
}

function normalizeLyricText(raw = "") {
	if (!raw) return "";
	return String(raw).replace(/\\n/g, "\n").replace(/\r\n?/g, "\n");
}

function parseLrc(raw = "") {
	if (!raw) return [];
	const rows = normalizeLyricText(raw).split("\n");
	const result = [];

	for (const row of rows) {
		if (!row || !row.trim()) continue;

		const stamps = [
			...row.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g),
		];
		if (!stamps.length) continue;

		const text = row.replace(/\[[^\]]+\]/g, "").trim();
		for (const item of stamps) {
			result.push({
				time: parseTimestampToMs(item[1], item[2], item[3]),
				text,
			});
		}
	}

	return result
		.sort((a, b) => a.time - b.time)
		.filter((item, index, arr) => {
			if (index === 0) return true;
			const prev = arr[index - 1];
			return prev.time !== item.time || prev.text !== item.text;
		});
}

function parseYrc(raw = "") {
	if (!raw) return [];
	const rows = normalizeLyricText(raw).split("\n");
	const result = [];

	for (const row of rows) {
		if (!row || !row.trim()) continue;
		const lineMatch = row.match(/^\[(\d+),(\d+)\](.*)$/);
		if (!lineMatch) continue;

		const lineStart = Number(lineMatch[1]);
		const lineDuration = Number(lineMatch[2]);
		const body = lineMatch[3] || "";
		if (!Number.isFinite(lineStart)) continue;

		const words = [];
		for (const wordMatch of body.matchAll(/\((\d+),(\d+),\d+\)([^()]*)/g)) {
			const rawStart = Number(wordMatch[1]);
			const duration = Number(wordMatch[2]);
			const wordText = String(wordMatch[3] || "");

			if (!Number.isFinite(rawStart) || !Number.isFinite(duration)) continue;
			if (!wordText.trim()) continue;

			const startTime = rawStart >= lineStart ? rawStart : lineStart + rawStart;
			const endTime = Math.max(startTime + 1, startTime + duration);

			words.push({
				startTime,
				endTime,
				word: wordText,
				romanWord: "",
				obscene: false,
			});
		}

		const plainText = body.replace(/\(\d+,\d+,\d+\)/g, "").trim();
		const fallbackDuration = Number.isFinite(lineDuration)
			? Math.max(600, lineDuration)
			: 1400;

		if (!words.length) {
			words.push({
				startTime: lineStart,
				endTime: lineStart + fallbackDuration,
				word: plainText || " ",
				romanWord: "",
				obscene: false,
			});
		}

		const wordStart = words[0]?.startTime ?? lineStart;
		const wordEnd =
			words[words.length - 1]?.endTime ?? lineStart + fallbackDuration;

		result.push({
			startTime: Math.min(lineStart, wordStart),
			endTime: Math.max(lineStart + fallbackDuration, wordEnd),
			words,
			translatedLyric: "",
			romanLyric: "",
			isBG: false,
			isDuet: false,
		});
	}

	return result.sort((a, b) => a.startTime - b.startTime);
}

function findTranslatedLyric(translatedList, time) {
	if (!translatedList.length) return "";
	const exact = translatedList.find((item) => item.time === time);
	if (exact) return exact.text;

	let nearest = null;
	let nearestGap = Infinity;
	for (const item of translatedList) {
		const gap = Math.abs(item.time - time);
		if (gap < nearestGap) {
			nearestGap = gap;
			nearest = item;
		}
	}
	return nearestGap <= 400 ? nearest?.text || "" : "";
}

function toAmllFromLrc(main = "", translated = "") {
	const lines = parseLrc(main);
	if (!lines.length) return [];

	const translatedList = parseLrc(translated);

	return lines.map((line, index) => {
		const next = lines[index + 1];
		const nextStart = next?.time;
		const safeEnd =
			Number.isFinite(nextStart) && nextStart > line.time
				? (() => {
						const span = nextStart - line.time;
						if (span <= 6500) return nextStart;
						return Math.max(line.time + 2200, nextStart - 4300);
					})()
				: line.time + 2600;
		const text = line.text || " ";

		return {
			words: [
				{
					startTime: line.time,
					endTime: safeEnd,
					word: text,
					romanWord: "",
					obscene: false,
				},
			],
			translatedLyric: findTranslatedLyric(translatedList, line.time),
			romanLyric: "",
			startTime: line.time,
			endTime: safeEnd,
			isBG: false,
			isDuet: false,
		};
	});
}

export function normalizeLyricPayloadToAmll(payload = {}) {
	const yrcText = payload?.yrc?.lyric || payload?.yrc || "";
	const lrcText = payload?.lrc?.lyric || payload?.lyric || "";
	const translated = payload?.tlyric?.lyric || "";

	const parsedYrc = parseYrc(yrcText);
	if (parsedYrc.length) return parsedYrc;

	return toAmllFromLrc(lrcText, translated);
}
