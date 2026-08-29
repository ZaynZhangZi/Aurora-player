export const PLAYBACK_NOTICE_EVENT = "aurora:playback-notice";

const NOTICE_KINDS = new Set([
	"vip",
	"trial",
	"purchase",
	"copyright",
	"unavailable",
	"network",
	"account",
]);

let lastNoticeKey = "";
let lastNoticeAt = 0;

export function dismissPlaybackNotice() {
	lastNoticeKey = "";
	lastNoticeAt = 0;
	if (typeof window === "undefined") return;

	window.dispatchEvent(new CustomEvent(PLAYBACK_NOTICE_EVENT, {
		detail: {action: "dismiss"},
	}));
}

export function showPlaybackNotice({
	kind = "unavailable",
	eyebrow = "PLAYBACK",
	title = "暂时无法播放",
	message = "",
	duration = 5200,
	dedupeKey = "",
} = {}) {
	if (typeof window === "undefined") return;

	const now = Date.now();
	const normalizedKind = NOTICE_KINDS.has(kind) ? kind : "unavailable";
	const normalizedKey = String(dedupeKey || `${normalizedKind}:${title}:${message}`);

	if (normalizedKey === lastNoticeKey && now - lastNoticeAt < 1400) return;
	lastNoticeKey = normalizedKey;
	lastNoticeAt = now;

	window.dispatchEvent(new CustomEvent(PLAYBACK_NOTICE_EVENT, {
		detail: {
			id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
			kind: normalizedKind,
			eyebrow: String(eyebrow || "PLAYBACK"),
			title: String(title || "暂时无法播放"),
			message: String(message || ""),
			duration: Math.min(10000, Math.max(2600, Number(duration) || 5200)),
		},
	}));
}
