# MyMusicDemo

一个基于 Vue 3 + Vite 的音乐 Web 应用，包含首页推荐、歌单详情、歌手/专辑页、全局播放器、扫码登录、消息中心、智能搜索、更新日志面板，以及类 Apple Music 风格歌词播放体验。

## 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [开发命令](#开发命令)
- [接口与代理说明](#接口与代理说明)
- [跨设备调试](#跨设备调试)
- [构建与部署](#构建与部署)
- [常见问题](#常见问题)
- [致谢](#致谢)

## 项目简介

MyMusicDemo 是一个前端音乐项目，目标是提供完整的“发现 -> 搜索 -> 播放 -> 详情页浏览”链路体验。项目使用组件化方式实现，并在播放与歌词展示上做了较多体验优化。

当前重点模块：

- 首页：Banner、推荐歌单、热门榜单、MV、播客、高品质歌单、热门歌手
- 搜索：智能识别歌手/歌曲/歌单意图，分组分页
- 播放：全局底部播放器、播放进度、播放模式、音量、队列切换
- 详情页：歌单详情、歌手详情、专辑详情
- 用户侧：扫码登录、消息中心、个人页
- 运营侧：更新日志（`/api/release-notes`）

## 功能特性

- `首页聚合`：多源推荐模块同屏展示，支持 MV 弹层播放
- `智能搜索`：输入关键词后并行检索歌手/歌曲/歌单，并做意图识别
- `全局播放器`：跨路由保持播放状态，移动端自适应布局
- `动态封面`：支持动态封面接口降级回退到静态封面
- `歌词组件`：集成 Apple Music 风格歌词组件（Vue 绑定）
- `登录与状态持久化`：Pinia + persistedstate
- `跨路由过渡`：支持 View Transition 能力的浏览器可启用共享元素过渡

## 技术栈

- `框架`：Vue 3
- `构建`：Vite（rolldown-vite）
- `路由`：Vue Router 4
- `状态管理`：Pinia + pinia-plugin-persistedstate
- `UI/样式`：Tailwind CSS 4、Headless UI、Heroicons、Ant Design Vue
- `动画`：GSAP + Motion
- `请求`：Axios
- `图形/媒体`：Three.js、Pixi.js、Chroma.js、ColorThief

## 项目结构

```text
.
├─ src/
│  ├─ api/                    # 业务接口封装
│  ├─ axios/                  # axios 实例与拦截器
│  ├─ components/             # 通用组件（播放器、搜索、弹层等）
│  ├─ stores/                 # Pinia 状态
│  ├─ utils/                  # 工具函数（播放、歌词适配、过渡等）
│  ├─ view/                   # 页面（home/artist/album/playlist/profile）
│  ├─ router/                 # 路由配置
│  ├─ App.vue
│  └─ main.js
├─ vite.config.js
├─ package.json
└─ README.md
```

## 快速开始

### 1) 环境要求

- Node.js：`^20.19.0 || >=22.12.0`
- npm：建议 `>= 10`

### 2) 安装依赖

```bash
npm install
```

### 3) 启动开发环境

```bash
npm run dev
```

默认访问：

- 本机：`http://localhost:5173`
- 局域网：`http://<你的IP>:5173`

## 开发命令

```bash
# 本地开发
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview

# 代码检查
npm run lint
```

## 接口与代理说明

项目包含两类请求来源：

1. `apiClient`（`baseURL: /api`）
   - 在开发环境由 Vite 代理到 `http://114.66.61.151:3000`
   - 见 `vite.config.js` 的 `server.proxy`

2. `requestLocal`（独立后端）
   - 直接请求 `http://114.66.61.151:8080/`
   - 用于如 `banner`、`release-notes` 等自有接口

当前已接入示例：

- `GET /api/banner`
- `GET /api/release-notes`

## 跨设备调试

已在 `vite.config.js` 配置：

- `host: "0.0.0.0"`
- `port: 5173`

如果同一局域网设备无法访问，请检查：

- macOS 防火墙是否拦截 Node
- 两台设备是否同网段
- 路由器是否开启 AP 隔离/客户端隔离

## 构建与部署

```bash
npm run build
```

输出目录为 `dist/`，可部署到任意静态资源服务器（Nginx、Vercel、Netlify 等）。

> 注意：生产环境请根据实际后端地址调整代理/请求基地址策略（开发代理仅在 dev 有效）。

## 常见问题

### Q1：歌词组件样式错乱或不显示？

确认已引入以下样式：

- `@applemusic-like-lyrics/core/style.css`
- `src/styles/amll-vue.css`

### Q2：搜索翻页会不会刷新整个面板？

当前实现为分组局部加载（歌手/歌曲/歌单互不影响）。

### Q3：为什么构建时有 chunk 体积警告？

项目包含多媒体与图形依赖（如 Three/Pixi），体积较大是预期现象。后续可通过按路由分包和手动分 chunk 优化。

## 致谢

- 感谢 JetBrains **WebStorm**，提供了稳定高效的开发体验。
- 感谢 **amll-dev/applemusic-like-lyrics** 项目提供的歌词播放器能力：
  - GitHub: <https://github.com/amll-dev/applemusic-like-lyrics>
  - 描述：A lyric player component library aims to look similar to iPad version of Apple Music. Also with DOM, React and Vue bindings.

---

如果这个项目对你有帮助，欢迎点个 Star。也欢迎提交 Issue 或 PR 一起改进。
