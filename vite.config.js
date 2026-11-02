import { fileURLToPath, URL } from "node:url";
import process from "node:process";
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
							if (/[\\/]gsap[\\/]/.test(id)) return 'vendor-gsap';
							if (/[\\/]motion[\\/]/.test(id)) return 'vendor-motion';
							// Each renderer loads only its own graphics engine.
							if (/[\\/]three[\\/]/.test(id)) return 'vendor-three';
							if (/[\\/]pixi\.js[\\/]/.test(id)) return 'vendor-pixi';
							if (/[\\/]@pixi[\\/]/.test(id)) return 'vendor-pixi-legacy';
							if (/[\\/](ant-design-vue|@headlessui)[\\/]/.test(id)) return 'vendor-ui';
							if (/[\\/]chroma-js[\\/]/.test(id)) return 'vendor-color';
							if (/[\\/](axios|colorthief)[\\/]/.test(id)) return 'vendor-utils';
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
			entries: ['index.html'],
			include: ['vue', 'vue-router', 'pinia', 'react', 'react-dom/client', 'framer-motion',
				'lucide-react', 'react-i18next', 'i18next', '@react-three/fiber', 'three',
				'@chenglou/pretext', '@chenglou/pretext/rich-inline', '@applemusic-like-lyrics/ttml', '@xmldom/xmldom', '@paper-design/shaders-react',
				'onnxruntime-web/wasm', 'fft.js'],
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
