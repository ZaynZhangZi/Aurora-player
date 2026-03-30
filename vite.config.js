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

	return {
		plugins: [vue(), tailwindcss(), ...(mode === "development" ? [vueDevTools()] : [])],
		build: {
			esbuild: mode === "production" ? { drop: ["console", "debugger"] } : {},
		},
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
			},
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
