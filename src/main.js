import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { createApp } from "vue";

import App from "./App.vue";
import router from "./router";
import { prewarmAutomixEngine } from "./utils/automixEngine.js";
import { installBehaviorTracker } from "./utils/behaviorTracker.js";

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

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// 3) 依次挂载
app.use(pinia);
app.use(router);
installBehaviorTracker(router);
app.mount("#app");


prewarmAutomixEngine({ idle: true });
