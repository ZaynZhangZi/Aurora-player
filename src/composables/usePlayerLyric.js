import { aiAPi } from "@/api/aiApi/aiAPi.js";

function isChineseOnly(text = "") {
  const meaningful = String(text).replace(/[\s\d\p{P}\p{S}a-zA-Z]/gu, "");
  if (!meaningful) return false;
  return /^[\u3400-\u9fff\u{20000}-\u{2a6df}\u{2a700}-\u{2ebef}]+$/u.test(meaningful);
}

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

function normalizeLrcLineText(text = "") {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function collectLyricRowsForTranslate(payload = {}) {
  const rows = [];
  const lrcText = payload?.lrc?.lyric || payload?.lyric || "";
  const yrcText = payload?.yrc?.lyric || payload?.yrc || "";

  if (lrcText) {
    for (const line of String(lrcText).split(/\r?\n/)) {
      if (!line || !line.trim()) continue;
      const stamps = [
        ...line.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g),
      ];
      if (!stamps.length) continue;

      const text = normalizeLrcLineText(line.replace(/\[[^\]]+\]/g, ""));
      if (!text || /^\w+[:：]/.test(text)) continue;

      for (const stamp of stamps) {
        rows.push({
          timeMs: parseTimestampToMs(stamp[1], stamp[2], stamp[3]),
          text,
        });
      }
    }
  }

  if (!rows.length && yrcText) {
    for (const line of String(yrcText).split(/\r?\n/)) {
      const match = line.match(/^\[(\d+),(\d+)\](.*)$/);
      if (!match) continue;
      const timeMs = Number(match[1]);
      const text = normalizeLrcLineText(
        String(match[3] || "").replace(/\(\d+,\d+,\d+\)/g, ""),
      );
      if (!Number.isFinite(timeMs) || !text || /^\w+[:：]/.test(text)) continue;
      rows.push({ timeMs: Math.max(0, timeMs), text });
    }
  }

  rows.sort((a, b) => a.timeMs - b.timeMs);
  return rows;
}

function toLrcTimestamp(timeMs) {
  const safeMs = Math.max(0, Math.floor(Number(timeMs) || 0));
  const min = Math.floor(safeMs / 60000);
  const sec = Math.floor((safeMs % 60000) / 1000);
  const cent = Math.floor((safeMs % 1000) / 10);
  return `[${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cent).padStart(2, "0")}]`;
}

function extractDeepseekText(payload) {
  const candidate = payload?.data ?? payload;
  if (!candidate) return "";

  if (typeof candidate === "string") return candidate;
  if (typeof candidate?.content === "string") return candidate.content;
  if (typeof candidate?.result === "string") return candidate.result;
  if (typeof candidate?.message === "string") return candidate.message;
  if (typeof candidate?.data === "string") return candidate.data;
  if (typeof candidate?.data?.content === "string") return candidate.data.content;
  if (typeof candidate?.data?.result === "string") return candidate.data.result;
  if (typeof candidate?.choices?.[0]?.message?.content === "string") {
    return candidate.choices[0].message.content;
  }

  return "";
}

function parseTranslatedLines(rawText = "", expectedCount = 0) {
  const text = String(rawText || "").trim();
  if (!text) return [];

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonSource = fencedMatch?.[1] || text;

  try {
    const parsed = JSON.parse(jsonSource);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || "").trim());
    }
  } catch {
    // fallback below
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d+[.)、:\-]\s*/, "").trim())
    .filter(Boolean);

  if (expectedCount && lines.length > expectedCount) {
    return lines.slice(0, expectedCount);
  }
  return lines;
}

function hasLyricText(payload = {}) {
  const yrcText = String(payload?.yrc?.lyric || payload?.yrc || "").trim();
  const lrcText = String(payload?.lrc?.lyric || payload?.lyric || "").trim();
  return Boolean(yrcText || lrcText);
}

function extractLyricPayloadFromSearchResult(raw = null) {
  if (!raw) return null;

  if (typeof raw === "string") {
    const text = raw.trim();
    return text ? { lrc: { lyric: text } } : null;
  }

  const candidate = raw?.data?.data ?? raw?.data ?? raw;
  if (Array.isArray(candidate)) {
    for (const item of candidate) {
      const picked = extractLyricPayloadFromSearchResult(item);
      if (picked) return picked;
    }
    return null;
  }

  if (typeof candidate !== "object") return null;
  if (hasLyricText(candidate)) return candidate;

  const lyricContentText = String(candidate?.lyricContent ?? "").trim();
  if (lyricContentText && lyricContentText.toLowerCase() !== "null") {
    return { lrc: { lyric: lyricContentText } };
  }

  const nested = [candidate?.lyric, candidate?.result, candidate?.payload];
  for (const item of nested) {
    const picked = extractLyricPayloadFromSearchResult(item);
    if (picked) return picked;
  }

  return null;
}

export function usePlayerLyric() {
  const lyricTranslationCache = new Map();

  async function attachAiTranslationIfNeeded(payload = {}, songId, lyricTranslateEnabled) {
    if (!lyricTranslateEnabled) return payload;

    const rows = collectLyricRowsForTranslate(payload);
    if (!rows.length) return payload;

    const sourceText = rows.map((row) => row.text).join("\n");
    if (!sourceText || isChineseOnly(sourceText)) return payload;

    const existingTlyric = String(payload?.tlyric?.lyric || "").trim();
    const existingMap = new Map();
    if (existingTlyric) {
      for (const line of existingTlyric.split(/\r?\n/)) {
        const match = line.match(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\](.*)/);
        if (match) {
          const t = parseTimestampToMs(match[1], match[2], match[3]);
          const text = String(match[4] || "").trim();
          if (text) existingMap.set(t, text);
        }
      }
    }

    const missingRows = rows.filter((row) => {
      if (existingMap.has(row.timeMs)) return false;
      for (const [t] of existingMap) {
        if (Math.abs(t - row.timeMs) <= 900) return false;
      }
      return true;
    });

    if (!missingRows.length) return payload;

    const cacheKey = String(songId || payload?.songId || "");
    if (cacheKey && lyricTranslationCache.has(cacheKey)) {
      return {
        ...payload,
        tlyric: {
          ...(payload?.tlyric || {}),
          lyric: lyricTranslationCache.get(cacheKey) || "",
        },
      };
    }

    const linesToTranslate = missingRows.slice(0, 120).map((row) => row.text);
    const prompt = [
      "请把下面歌词逐行翻译成简体中文。",
      "要求：",
      "1. 保持行数一致，不要合并或拆分。",
      "2. 只输出 JSON 数组字符串，不要输出其他解释。",
      "3. 空行请输出空字符串。",
      "原歌词：",
      JSON.stringify(linesToTranslate),
    ].join("\n");

    try {
      const response = await aiAPi.deepseekAPi({ prompt });
      const translatedText = extractDeepseekText(response?.data);
      const translatedLines = parseTranslatedLines(translatedText, linesToTranslate.length);
      if (!translatedLines.length) return payload;

      const aiMap = new Map();
      missingRows.forEach((row, index) => {
        if (index < translatedLines.length) {
          const text = String(translatedLines[index] || "").trim();
          if (text) aiMap.set(row.timeMs, text);
        }
      });

      const mergedLines = rows.map((row) => {
        const existing =
          existingMap.get(row.timeMs) ||
          [...existingMap.entries()].find(([t]) => Math.abs(t - row.timeMs) <= 900)?.[1];
        const ai = aiMap.get(row.timeMs);
        return `${toLrcTimestamp(row.timeMs)}${existing || ai || ""}`;
      });

      const mergedLrc = mergedLines.join("\n");
      if (!mergedLrc.trim()) return payload;
      if (cacheKey) lyricTranslationCache.set(cacheKey, mergedLrc);

      return {
        ...payload,
        tlyric: {
          ...(payload?.tlyric || {}),
          lyric: mergedLrc,
        },
      };
    } catch {
      return payload;
    }
  }

  return {
    collectLyricRowsForTranslate,
    hasLyricText,
    extractLyricPayloadFromSearchResult,
    attachAiTranslationIfNeeded,
  };
}
