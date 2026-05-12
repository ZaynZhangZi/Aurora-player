import requestLocal from "@/axios/myBackend.js";
import { useCounterStore } from "@/stores/userStores.js";

function getDeviceType() {
  const ua = navigator.userAgent || "";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

function getBrowserInfo() {
  const ua = navigator.userAgent || "";
  const rules = [
    ["Edge", /Edg\/([\d.]+)/],
    ["Chrome", /Chrome\/([\d.]+)/],
    ["Firefox", /Firefox\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, pattern] of rules) {
    const match = ua.match(pattern);
    if (match) return `${name} ${String(match[1] || "").split(".")[0]}`;
  }
  return "Unknown";
}

function getSystemInfo() {
  const ua = navigator.userAgent || "";
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  if (/Windows/i.test(platform) || /Windows NT/i.test(ua)) return "Windows";
  if (/macOS|MacIntel|MacPPC|Mac68K/i.test(platform) || /Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(platform) || /Linux/i.test(ua)) return "Linux";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  return String(platform || "Unknown");
}

function getRouteLocation(route) {
  return String(route?.fullPath || route?.path || window.location.pathname || "unknown");
}

function getUserId(store) {
  if (store.userId) return store.userId;
  try {
    return localStorage.getItem("usermasgId") || JSON.parse(localStorage.getItem("usermasg") || "{}")?.data?.profile?.userId || null;
  } catch {
    return null;
  }
}

function getDeviceMemory() {
  const parts = [];
  if (navigator.deviceMemory) parts.push(`${navigator.deviceMemory} GB memory`);
  if (window.screen?.width && window.screen?.height) parts.push(`${window.screen.width}x${window.screen.height}`);
  if (navigator.language) parts.push(navigator.language);
  return parts.join(" / ");
}

function buildVisitPayload(route) {
  const store = useCounterStore();
  return {
    location: getRouteLocation(route),
    region: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    systemInfo: getSystemInfo(),
    browserInfo: getBrowserInfo(),
    deviceType: getDeviceType(),
    processorInfo: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} cores` : "",
    deviceMemory: getDeviceMemory(),
    neteaseUserId: getUserId(store),
  };
}

export const visitApi = {
  async report(route) {
    if (typeof window === "undefined" || typeof navigator === "undefined") return null;
    const res = await requestLocal.post("/api/v1/visit-records", buildVisitPayload(route));
    return res;
  },
}
