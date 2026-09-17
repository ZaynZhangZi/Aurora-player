import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const neteaseApiProxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:3000";
	const adminApiProxyTarget = env.VITE_ADMIN_API_PROXY_TARGET || "http://localhost:8080";
	const enableVueDevTools = mode === "development" && env.VITE_ENABLE_VUE_DEVTOOLS === "true";

	return {
		plugins: [vue(), tailwindcss(), ...(enableVueDevTools ? [vueDevTools()] : [])],
		build: {
			esbuild: mode === "production" ? { drop: ["console", "debugger"] } : {},
			// 性能优化：代码分割
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (id.includes('node_modules')) {
							if (/[\\/](gsap|motion)[\\/]/.test(id)) return 'vendor-animation';
							if (/[\\/](three|pixi\.js|@pixi)[\\/]/.test(id)) return 'vendor-3d';
							if (/[\\/](ant-design-vue|@headlessui)[\\/]/.test(id)) return 'vendor-ui';
							if (/[\\/](axios|chroma-js|colorthief)[\\/]/.test(id)) return 'vendor-utils';
						}
					},
				},
			},
			// 增加代码分割大小限制
			chunkSizeWarningLimit: 1000,
		},
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
			},
		},
		// 开发服务器优化
		optimizeDeps: {
			include: ['vue', 'vue-router', 'pinia'],
			exclude: ['vite-plugin-vue-devtools'],
		},
		server: {
			port: 5173,
			host: true,
			proxy: {
				"/api": {
					target: neteaseApiProxyTarget,
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api/, ""),
				},
				"/backend-api": {
					target: adminApiProxyTarget,
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/backend-api/, ""),
				},
			},
		},
	};
});
