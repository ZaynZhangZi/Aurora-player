import {createApp} from 'vue'
import {createPinia} from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'


import './index.css'
import '@applemusic-like-lyrics/core/style.css'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 3) 依次挂载
app.use(pinia)
app.use(router)
app.mount('#app')
