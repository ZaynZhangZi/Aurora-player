import {createDetailPrefetchDirective} from './directives/detailPrefetch.js';
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { createApp } from "vue";

import App from "./MaintenanceGate.vue";
import router, { showRouteError } from "./router";
import { installBehaviorTracker } from "./utils/behaviorTracker.js";
import { preloadRouteComponents } from "./utils/appBootstrap.js";
import { initPwaInstall } from "./composables/usePwaInstall.js";
import { maintenanceDirective } from "./directives/maintenance.js";
import MaintenanceFeature from "./components/maintenance/MaintenanceFeature.vue";

import "./index.css";
import "@applemusic-like-lyrics/core/style.css";
import "@applemusic-like-lyrics/react-full/style.css";

// 🔧 开发环境性能监控
if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_PERF_DEBUG === 'true') {
  import("./utils/performanceDebug.js").then(({ startPerformanceMonitoring }) => {
    startPerformanceMonitoring();
  });
}

initPwaInstall();
const app = createApp(App);
app.directive('maintenance', maintenanceDirective);
app.directive('detail-prefetch', createDetailPrefetchDirective(router));
app.component('MaintenanceFeature', MaintenanceFeature);

app.config.errorHandler = (error, _instance, info) => {
  if (error?.name === 'MaintenanceBlockedError') return;
  if (import.meta.env.DEV) {
    console.error(`[vue] ${info}`, error);
  }
  void showRouteError(error, router.currentRoute.value.fullPath).catch(() => {});
};

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// 3) 依次挂载
app.use(pinia);
app.use(router);
if (typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === "/home")) {
  void import("./composables/useHomeData.js")
    .then(({ prefetchHomeBanner }) => prefetchHomeBanner())
    .catch(() => {});
}
installBehaviorTracker(router);
void preloadRouteComponents(router);
app.mount("#app");
