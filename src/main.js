import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { createApp } from "vue";

import App from "./App.vue";
import router, { showRouteError } from "./router";
import { installBehaviorTracker } from "./utils/behaviorTracker.js";
import { preloadRouteComponents } from "./utils/appBootstrap.js";

import "./index.css";
import "@applemusic-like-lyrics/core/style.css";
import "./styles/amll-vue.css";

// 🔧 开发环境性能监控
if (import.meta.env.DEV) {
  import("./utils/performanceDebug.js").then(({ startPerformanceMonitoring }) => {
    startPerformanceMonitoring();
  });
}

const app = createApp(App);

app.config.errorHandler = (error, _instance, info) => {
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
installBehaviorTracker(router);
void preloadRouteComponents(router);
app.mount("#app");
