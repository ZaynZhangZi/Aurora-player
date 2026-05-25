export function formatMs(ms) {
  const sec = Math.floor((ms || 0) / 1000);
  const min = Math.floor(sec / 60);
  const remain = String(sec % 60).padStart(2, "0");
  return `${min}:${remain}`;
}

export function getExt(url = "") {
  const clean = String(url).split("?")[0].split("#")[0].toLowerCase();
  const index = clean.lastIndexOf(".");
  return index >= 0 ? clean.slice(index + 1) : "";
}

export function isVideoUrl(url = "") {
  return ["mp4", "webm", "m4v", "mov", "ogg", "ogv"].includes(getExt(url));
}
