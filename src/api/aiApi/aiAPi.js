import apiClient from "@/axios/apiClient.js";
import {OpenAI} from "openai";

export const aiAPi = {
  deepseekAPi() {
    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey:import.meta.env.VITE_DEEPSEEK_API_KEY,
      dangerouslyAllowBrowser: true
    });

    async function main() {
      const completion = await openai.chat.completions.create({
        messages: [{role: "system", content: "你好"}],
        model: "deepseek-chat",
      });
      console.log(completion.choices[0].message.content);
    }
  }
}
