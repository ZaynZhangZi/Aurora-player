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

	return Math.max(0, minute * 60 * 1000 + second * 1000 + milli);
}

function normalizeLyricText(raw = "") {
	if (!raw) return "";
	return String(raw).replace(/\n/g, "\n").replace(/\r\n?/g, "\n");
}

function normalizeInterludeText(text = "") {
	return String(text).replace(/[\s\u3000·•・….\-–—_~～♪♫]+/gu, "");
}

function hasMeaningfulText(text = "") {
	return normalizeInterludeText(text).length > 0;
}

const MAX_YRC_WORDS_PER_LINE = 48;
const MAX_YRC_TOTAL_WORDS = 1800;
const DEFAULT_LRC_LINE_DURATION_MS = 2600;
const AMLL_INTERLUDE_MIN_DURATION_MS = 4000;
const AMLL_INTERLUDE_END_PADDING_MS = 250;

function createLineLevelWord(startTime, duration, text = "") {
	const safeStart = Number.isFinite(startTime) ? Math.max(0, startTime) : 0;
	const safeDuration = Number.isFinite(duration) ? Math.max(600, duration) : 1400;
	return {
		startTime: safeStart,
		endTime: safeStart + safeDuration,
		word: String(text || "").trim(),
		romanWord: "",
		obscene: false,
	};
}

function parseLrcRows(raw = "") {
	if (!raw) return [];
	const rows = normalizeLyricText(raw).split("\n");
	const result = [];

	for (const row of rows) {
		if (!row || !row.trim()) continue;
		const stamps = [
			...row.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g),
		];
		if (!stamps.length) continue;

		const hasTextBetweenStamps = stamps.slice(0, -1).some((stamp, index) => {
			const nextStamp = stamps[index + 1];
			return row
				.slice(stamp.index + stamp[0].length, nextStamp.index)
				.trim().length > 0;
		});
		const lastStamp = stamps[stamps.length - 1];
		const hasTrailingEndStamp =
			stamps.length > 1 &&
			row.slice(lastStamp.index + lastStamp[0].length).trim().length === 0;

		if (hasTextBetweenStamps && hasTrailingEndStamp) {
			// Enhanced LRC uses the first timestamp as the line start, subsequent
			// timestamps as word boundaries, and a trailing empty timestamp as the
			// exact line end.
			const words = [];
			for (let index = 0; index < stamps.length - 1; index += 1) {
				const stamp = stamps[index];
				const nextStamp = stamps[index + 1];
				const word = row.slice(stamp.index + stamp[0].length, nextStamp.index);
				if (!hasMeaningfulText(word)) continue;

				const startTime = parseTimestampToMs(stamp[1], stamp[2], stamp[3]);
				const nextTime = parseTimestampToMs(
					nextStamp[1],
					nextStamp[2],
					nextStamp[3],
				);
				words.push({
					startTime,
					endTime: Math.max(startTime + 1, nextTime),
					word,
					romanWord: "",
					obscene: false,
				});
			}

			if (words.length) {
				result.push({
					time: parseTimestampToMs(stamps[0][1], stamps[0][2], stamps[0][3]),
					endTime: parseTimestampToMs(lastStamp[1], lastStamp[2], lastStamp[3]),
					text: words.map((word) => word.word).join("").trim(),
					words,
				});
			}
			continue;
		}

		if (hasTextBetweenStamps) {
			// Some providers flatten a complete LRC document into one physical line.
			// Square-bracket timestamps still denote separate lyric lines, so retain
			// each timestamp/text pair instead of collapsing everything into one line.
			for (let index = 0; index < stamps.length; index += 1) {
				const stamp = stamps[index];
				const nextStamp = stamps[index + 1];
				const text = row
					.slice(stamp.index + stamp[0].length, nextStamp?.index ?? row.length)
					.replace(/\[[^\]]+\]/g, "")
					.trim();
				result.push({
					time: parseTimestampToMs(stamp[1], stamp[2], stamp[3]),
					text,
				});
			}
			continue;
		}

		const text = row
			.slice(lastStamp.index + lastStamp[0].length)
			.replace(/\[[^\]]+\]/g, "")
			.trim();
		for (const stamp of stamps) {
			result.push({
				time: parseTimestampToMs(stamp[1], stamp[2], stamp[3]),
				text,
			});
		}
	}

	return result.sort((a, b) => a.time - b.time);
}

function inferLrcLineEndTime(current, next) {
	const estimatedEndTime = current.time + DEFAULT_LRC_LINE_DURATION_MS;
	if (!next || next.time <= current.time) return estimatedEndTime;

	const minimumGapForAmll =
		AMLL_INTERLUDE_MIN_DURATION_MS + AMLL_INTERLUDE_END_PADDING_MS;
	if (next.time - estimatedEndTime >= minimumGapForAmll) {
		return estimatedEndTime;
	}

	return next.time;
}

function resolveLyricByTime(map, targetTime) {
	if (!(map instanceof Map) || !map.size) return "";
	if (map.has(targetTime)) return map.get(targetTime) || "";

	let bestText = "";
	let bestDelta = Number.POSITIVE_INFINITY;
	for (const [time, text] of map.entries()) {
		const delta = Math.abs(Number(time) - Number(targetTime));
		if (delta < bestDelta) {
			bestDelta = delta;
			bestText = text;
		}
	}

	return bestDelta <= 900 ? bestText : "";
}

function parseYrc(raw = "", translatedByStart = new Map(), romanByStart = new Map()) {
	if (!raw) return [];
	const rows = normalizeLyricText(raw).split("\n");
	const result = [];
	let totalWordCount = 0;

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

		if (words.length > MAX_YRC_WORDS_PER_LINE && hasMeaningfulText(plainText)) {
			words.splice(0, words.length, createLineLevelWord(lineStart, fallbackDuration, plainText));
		}

		if (!words.length && hasMeaningfulText(plainText)) {
			words.push(createLineLevelWord(lineStart, fallbackDuration, plainText));
		}
		if (!words.length) continue;
		totalWordCount += words.length;

		const wordStart = words[0]?.startTime ?? lineStart;
		const wordEnd =
			words[words.length - 1]?.endTime ?? lineStart + fallbackDuration;

		result.push({
			startTime: Math.min(lineStart, wordStart),
			endTime: Math.max(lineStart + fallbackDuration, wordEnd),
			words,
			translatedLyric: resolveLyricByTime(translatedByStart, lineStart),
			romanLyric: resolveLyricByTime(romanByStart, lineStart),
			isBG: false,
			isDuet: false,
		});
	}

	const sortedResult = result.sort((a, b) => a.startTime - b.startTime);
	if (totalWordCount > MAX_YRC_TOTAL_WORDS) {
		return sortedResult.map((line) => {
			const plainText = line.words.map((word) => word.word).join("").trim();
			if (!hasMeaningfulText(plainText)) return line;
			return {
				...line,
				words: [
					createLineLevelWord(
						line.startTime,
						Math.max(600, line.endTime - line.startTime),
						plainText,
					),
				],
			};
		});
	}

	return sortedResult;
}

function mapByStartTime(raw = "") {
	const map = new Map();
	for (const row of parseLrcRows(raw)) {
		if (hasMeaningfulText(row.text)) map.set(row.time, row.text);
	}
	return map;
}

function toAmllFromLrc(main = "", translated = "", roman = "") {
	const rows = parseLrcRows(main).filter((row) => hasMeaningfulText(row.text));
	if (!rows.length) return [];

	const translatedByStart = mapByStartTime(translated);
	const romanByStart = mapByStartTime(roman);

	const lines = [];
	for (let i = 0; i < rows.length; i += 1) {
		const current = rows[i];
		const next = rows[i + 1];
		const hasExactTiming =
			current.words?.length > 0 && Number.isFinite(current.endTime);
		const endTime = hasExactTiming
			? Math.max(current.time + 1, current.endTime)
			: inferLrcLineEndTime(current, next);
		const words = hasExactTiming
			? current.words
			: [
					{
						startTime: current.time,
						endTime,
						word: current.text,
						romanWord: "",
						obscene: false,
					},
				];

		lines.push({
			words,
			translatedLyric: translatedByStart.get(current.time) || "",
			romanLyric: romanByStart.get(current.time) || "",
			startTime: current.time,
			endTime,
			isBG: false,
			isDuet: false,
		});
	}

	return lines;
}

export function normalizeLyricPayloadToAmll(payload = {}) {
	const yrcText = payload?.yrc?.lyric || payload?.yrc || "";
	const translated = payload?.tlyric?.lyric || "";
	const roman = payload?.romalrc?.lyric || "";
	const translatedByStart = mapByStartTime(translated);
	const romanByStart = mapByStartTime(roman);
	const yrcLines = parseYrc(yrcText, translatedByStart, romanByStart);
	if (yrcLines.length) return yrcLines;

	const lrcText = payload?.lrc?.lyric || payload?.lyric || "";
	return toAmllFromLrc(lrcText, translated, roman);
}
