import apiClient from "@/axios/apiClient.js";

export const aiAPi = {
	deepseekAPi(payload = {}) {
		return apiClient.post("/ai/deepseek", payload);
	},
};
