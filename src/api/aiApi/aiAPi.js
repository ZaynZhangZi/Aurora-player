import axios from "axios";
import apiClient from "@/axios/apiClient.js";

const DEEPSEEK_API_KEY = String(import.meta.env.VITE_DEEPSEEKAPI || "").trim();
const DEEPSEEK_BASE_URL = String(import.meta.env.VITE_DEEPSEEK_BASE_URL || "https://api.deepseek.com").trim();
const DEEPSEEK_MODEL = String(import.meta.env.VITE_DEEPSEEK_MODEL || "deepseek-chat").trim();

export const aiAPi = {
	deepseekAPi(payload = {}) {
		if (DEEPSEEK_API_KEY) {
			const prompt = String(payload?.prompt || payload?.content || "").trim();
			const messages = Array.isArray(payload?.messages) && payload.messages.length
				? payload.messages
				: [{role: "user", content: prompt}];

			return axios.post(
				`${DEEPSEEK_BASE_URL.replace(/\/+$/g, "")}/chat/completions`,
				{
					model: payload?.model || DEEPSEEK_MODEL,
					messages,
					temperature: Number.isFinite(Number(payload?.temperature))
						? Number(payload.temperature)
						: 0.2,
				},
				{
					headers: {
						Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
						"Content-Type": "application/json",
					},
					timeout: Number(import.meta.env.VITE_API_TIMEOUT || 10000),
				},
			);
		}

		return apiClient.post("/ai/deepseek", payload);
	},
};
