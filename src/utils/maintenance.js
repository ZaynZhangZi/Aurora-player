export const MAINTENANCE_POLL_INTERVAL = 10_000;
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

export function createMaintenancePoller({ fetchStatus, onStatus, onError = () => {}, onSettled = () => {},
  schedule = setInterval, cancel = clearInterval, timeout = setTimeout, clearTimeoutFn = clearTimeout }) {
  let stopped = false;
  let inFlight = null;
  let controller;
  async function run() {
    controller = new AbortController();
    const requestController = controller;
    const timer = timeout(() => requestController.abort(), 4000);
    try {
      const status = parseMaintenanceStatus(await fetchStatus(requestController.signal));
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
    if (!inFlight) inFlight = run().finally(() => { inFlight = null; });
    return inFlight;
  }
  const interval = schedule(() => { void check(); }, MAINTENANCE_POLL_INTERVAL);
  void check();
  return {
    check,
    stop() { stopped = true; cancel(interval); controller?.abort(); },
  };
}
