export const MAINTENANCE_POLL_INTERVAL = 10_000;
export const nextMaintenanceCheckAt = timestamp => (Math.floor(timestamp / MAINTENANCE_POLL_INTERVAL) + 1) * MAINTENANCE_POLL_INTERVAL;
const beijingClock = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const formatBeijingTime = timestamp => beijingClock.format(timestamp);
export const DEFAULT_MAINTENANCE = Object.freeze({
  enabled: false,
  title: '让好音乐，稍等片刻',
  message: '我们正在维护和优化服务，感谢你的耐心等待。恢复后会自动回到当前页面。',
  estimatedReturn: '',
  accentColor: '#a78bfa',
  backgroundUrl: '',
  customHtml: '',
  targets: Object.freeze({}),
});

// Invalid responses must never turn an active maintenance screen off.
export function parseMaintenanceStatus(body) {
  if (!body || typeof body !== 'object') throw new Error('维护状态响应无效');
  if ('code' in body && body.code !== 200) throw new Error('维护状态请求失败');
  const data = 'code' in body ? body.data : body;
  if (!data || typeof data.enabled !== 'boolean') throw new Error('维护状态缺少 enabled');
  const text = (key, max) => typeof data[key] === 'string' ? data[key].slice(0, max) : DEFAULT_MAINTENANCE[key];
  const targets = {};
  if (data.targets != null) {
    if (typeof data.targets !== 'object' || Array.isArray(data.targets)) throw new Error('维护开关配置无效');
    const entries = Object.entries(data.targets);
    if (entries.length > 100) throw new Error('维护开关数量超限');
    for (const [key, value] of entries) {
      if (!/^(page|feature)\.[a-zA-Z][a-zA-Z0-9]*$/.test(key) || !value || typeof value.available !== 'boolean'
        || (value.useGlobalPage !== undefined && typeof value.useGlobalPage !== 'boolean')) throw new Error('维护开关配置无效');
      const page = parseMaintenanceStatus({ ...value, enabled: false, targets: undefined });
      const { targets: ignored, ...content } = page;
      void ignored;
      targets[key] = { ...content, available: value.available, useGlobalPage: value.useGlobalPage !== false };
    }
  }
  return {
    enabled: data.enabled,
    title: text('title', 120) || DEFAULT_MAINTENANCE.title,
    message: text('message', 2000) || DEFAULT_MAINTENANCE.message,
    estimatedReturn: text('estimatedReturn', 120),
    accentColor: /^#[0-9a-f]{6}$/i.test(data.accentColor) ? data.accentColor : DEFAULT_MAINTENANCE.accentColor,
    backgroundUrl: /^https?:\/\/\S+$/i.test(data.backgroundUrl) ? text('backgroundUrl', 2048) : '',
    customHtml: text('customHtml', 100000),
    targets,
  };
}

export function createMaintenancePoller({ fetchStatus, onStatus, onError = () => {}, onSettled = () => {}, onTiming = () => {},
  now = Date.now, schedule = setTimeout, cancel = clearTimeout, timeout = setTimeout, clearTimeoutFn = clearTimeout }) {
  let stopped = false;
  let suspended = false;
  let inFlight = null;
  let controller;
  let clockOffset = 0;
  let clockSynced = false;
  let scheduled;
  function plan() {
    if (stopped || suspended) { cancel(scheduled); return; }
    cancel(scheduled);
    const current = now() + clockOffset;
    const nextCheckAt = nextMaintenanceCheckAt(current);
    onTiming({ nextCheckAt, clockOffset, clockSynced });
    scheduled = schedule(() => {
      // Recompute from wall time after a delayed/background timer. Never replay
      // missed slots or shift the cadence by the time spent fetching a response.
      void check();
    }, Math.max(1, Math.ceil(nextCheckAt - current)));
  }
  async function run() {
    controller = new AbortController();
    const requestController = controller;
    const startedAt = now();
    const timer = timeout(() => requestController.abort(), 4000);
    try {
      const status = parseMaintenanceStatus(await fetchStatus(requestController.signal, serverTime => {
        if (stopped || requestController.signal.aborted || serverTime == null || String(serverTime).trim() === '') return;
        const timestamp = Number(serverTime);
        if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > 8.64e15) return;
        const receivedAt = now();
        clockOffset = timestamp + Math.min(4000, Math.max(0, receivedAt - startedAt)) / 2 - receivedAt;
        clockSynced = true;
        plan();
      }));
      if (!stopped) onStatus(status);
    } catch (error) {
      if (!stopped) onError(error);
    } finally {
      clearTimeoutFn(timer);
      if (!stopped) onSettled();
    }
  }
  function check() {
    if (stopped) return Promise.resolve();
    plan();
    if (!inFlight) inFlight = run().finally(() => { inFlight = null; });
    return inFlight;
  }
  void check();
  return {
    check,
    setSuspended(value) {
      if (stopped || suspended === Boolean(value)) return;
      suspended = Boolean(value);
      cancel(scheduled);
      if (!suspended) void check();
    },
    stop() { stopped = true; cancel(scheduled); controller?.abort(); },
  };
}
