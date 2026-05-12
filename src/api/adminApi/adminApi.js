import requestLocal, {
  BACKEND_ACCESS_TOKEN_KEY,
  BACKEND_REFRESH_TOKEN_KEY,
  getPageRecords,
  unwrapBackendResponse,
} from "@/axios/myBackend.js";

function pageParams({page = 0, size = 20, ...rest} = {}) {
  return {page, size, ...rest};
}

function saveTokens(data) {
  if (data?.accessToken) localStorage.setItem(BACKEND_ACCESS_TOKEN_KEY, data.accessToken);
  if (data?.refreshToken) localStorage.setItem(BACKEND_REFRESH_TOKEN_KEY, data.refreshToken);
}

function clearTokens() {
  localStorage.removeItem(BACKEND_ACCESS_TOKEN_KEY);
  localStorage.removeItem(BACKEND_REFRESH_TOKEN_KEY);
}

async function unwrap(request) {
  return unwrapBackendResponse(await request);
}

async function page(request) {
  const raw = await unwrap(request);
  return {
    raw,
    records: getPageRecords(raw),
    total: raw?.totalElements ?? raw?.total ?? 0,
    page: raw?.page ?? 0,
    size: raw?.size ?? 20,
    totalPages: raw?.totalPages ?? 0,
  };
}

export const adminApi = {
  hasToken() {
    return Boolean(localStorage.getItem(BACKEND_ACCESS_TOKEN_KEY));
  },

  async login({username, password}) {
    const data = await unwrap(requestLocal.post("/api/v1/auth/login", {username, password}));
    saveTokens(data);
    return data;
  },

  async register({username, password}) {
    const data = await unwrap(requestLocal.post("/api/v1/auth/register", {username, password}));
    saveTokens(data);
    return data;
  },

  async logout() {
    try {
      await requestLocal.post("/api/v1/auth/logout");
    } finally {
      clearTokens();
    }
  },

  me() {
    return unwrap(requestLocal.get("/api/v1/auth/me"));
  },

  dashboard() {
    return unwrap(requestLocal.get("/api/v1/dashboard/stats"));
  },

  users(params = {}) {
    return page(requestLocal.get("/api/v1/admin/netease-users", {params: pageParams(params)}));
  },

  userDetail(id) {
    return unwrap(requestLocal.get(`/api/v1/admin/netease-users/${id}`));
  },

  userLoginLogs(id, params = {}) {
    return page(requestLocal.get(`/api/v1/admin/netease-users/${id}/login-logs`, {params: pageParams(params)}));
  },

  userLoginStatus(id) {
    return unwrap(requestLocal.get(`/api/v1/admin/netease-users/${id}/login-status`));
  },

  banUser(id, reason) {
    return unwrap(requestLocal.put(`/api/v1/admin/netease-users/${id}/ban`, {reason}));
  },

  unbanUser(id) {
    return unwrap(requestLocal.put(`/api/v1/admin/netease-users/${id}/unban`));
  },

  disableUser(id) {
    return unwrap(requestLocal.put(`/api/v1/admin/netease-users/${id}/disable`));
  },

  enableUser(id) {
    return unwrap(requestLocal.put(`/api/v1/admin/netease-users/${id}/enable`));
  },

  activityScore(neteaseUserId) {
    return unwrap(requestLocal.get(`/api/v1/admin/netease-users/${neteaseUserId}/analysis/activity-score`));
  },

  anomaly(neteaseUserId) {
    return unwrap(requestLocal.get(`/api/v1/admin/netease-users/${neteaseUserId}/anomaly-detection`));
  },

  report(neteaseUserId) {
    return unwrap(requestLocal.get(`/api/v1/admin/netease-users/${neteaseUserId}/report`));
  },

  behaviorTrace(neteaseUserId, params = {}) {
    return page(requestLocal.get(`/api/v1/admin/netease-users/${neteaseUserId}/behavior-trace`, {params: pageParams(params)}));
  },

  recommendations(neteaseUserId, params = {}) {
    return page(requestLocal.get(`/api/v1/admin/netease-users/${neteaseUserId}/recommendations`, {params: pageParams(params)}));
  },

  remarks(neteaseUserId) {
    return unwrap(requestLocal.get(`/api/v1/admin/netease-users/${neteaseUserId}/remarks`));
  },

  addRemark(neteaseUserId, remark) {
    return unwrap(requestLocal.post(`/api/v1/admin/netease-users/${neteaseUserId}/remarks`, {remark}));
  },

  tags(neteaseUserId) {
    return unwrap(requestLocal.get(`/api/v1/admin/netease-users/${neteaseUserId}/interest-tags`));
  },

  addTag(neteaseUserId, {tagName, tagWeight = 1, source = "MANUAL"}) {
    return unwrap(requestLocal.post(`/api/v1/admin/netease-users/${neteaseUserId}/interest-tags`, {
      tagName,
      tagWeight,
      source,
    }));
  },

  blacklist(params = {}) {
    return page(requestLocal.get("/api/v1/admin/blacklist", {params: pageParams(params)}));
  },

  userBlacklist(neteaseUserId) {
    return unwrap(requestLocal.get(`/api/v1/admin/blacklist/user/${neteaseUserId}`));
  },

  addBlacklist(neteaseUserId, reason) {
    return unwrap(requestLocal.post(`/api/v1/admin/blacklist/user/${neteaseUserId}`, {reason}));
  },

  removeBlacklist(neteaseUserId) {
    return unwrap(requestLocal.delete(`/api/v1/admin/blacklist/user/${neteaseUserId}`));
  },

  playRecords(neteaseUserId, params = {}) {
    return page(requestLocal.get(`/api/v1/admin/netease-users/${neteaseUserId}/music/play-records`, {params: pageParams(params)}));
  },

  likedSongs(neteaseUserId, params = {}) {
    return page(requestLocal.get(`/api/v1/admin/netease-users/${neteaseUserId}/music/liked-songs`, {params: pageParams(params)}));
  },

  playlists(neteaseUserId, params = {}) {
    return page(requestLocal.get(`/api/v1/admin/netease-users/${neteaseUserId}/music/playlists`, {params: pageParams(params)}));
  },

  visits(params = {}) {
    return page(requestLocal.get("/api/v1/visit-records", {params: pageParams(params)}));
  },

  totalVisits() {
    return unwrap(requestLocal.get("/api/v1/visit-records/stats/total"));
  },

  visitsByRegion() {
    return unwrap(requestLocal.get("/api/v1/visit-records/stats/by-region"));
  },

  visitsByDevice() {
    return unwrap(requestLocal.get("/api/v1/visit-records/stats/by-device"));
  },

  visitsByBrowser() {
    return unwrap(requestLocal.get("/api/v1/visit-records/stats/by-browser"));
  },
}
