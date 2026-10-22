# 网站维护模式

## 使用方式

1. 使用管理员账号登录管理后台，进入「系统 → 网站维护」。
2. 编辑维护标题、说明、预计恢复时间、主题色和背景图片；右侧实时预览。
3. 勾选「开启维护模式」，点击保存。在线用户端在下一次检查时显示维护页。
4. 维护完成后取消勾选并保存，用户端会淡出维护页，自动返回原页面，无需刷新。

维护开关默认关闭。预计恢复时间只展示文案，不会按该时间自动关闭维护；应在实际恢复后关闭并保存。
只有 `ROLE_ADMIN` 可以读取和修改管理设置。维护期间管理后台仍然可用。

## 自定义页面

不填自定义 HTML 时，使用默认唱片主题页面。支持自定义标题、说明、预计恢复时间、六位十六进制主题色和 HTTP(S) 背景图片地址。

填写自定义 HTML 后，该内容取代默认维护页面主体。支持 HTML、CSS 和图片，最大 100,000 个字符。
内容在 `sandbox=""` 的 iframe 中展示，不能运行脚本、提交表单或操作父页面。
底部的自动检查提示和「立即检查」按钮始终保留。后台预览不会发布修改，必须保存才生效。

## 检测与恢复

- 用户端启动时立即检查，此后每 10 秒检查一次；重新联网或回到标签页时额外检查。
- 单次请求 4 秒超时；同一时刻最多一个检查请求，手动检查也复用进行中的请求。
- 维护页持续轮询，并同步更新维护文案与页面配置。
- 网络错误、非成功响应或无效 JSON 不会被当作「维护结束」，会保留当前维护状态并重试。
- 首次检查失败且还没有取得维护状态时，允许正常打开网站，避免状态接口故障阻止访问。
- 初次访问已处于维护状态时，不挂载业务页面；已打开的业务页面则保留组件和路由状态。
- 收到 `enabled: false` 后恢复原页面，用淡出动画过渡；系统开启减少动态效果时不播放过渡动画。

此功能控制用户端维护页面的展示，不会阻止业务 API，也不会从接口报错自动推断需要开启维护。

## 服务端部署

需要一起发布用户前台、管理后台和 Java 服务端，旧的已打开用户页面需先加载过新版前台。

数据库使用独立的 `maintenance_config` 单行配置表，维护设置保存后可跨重启保留。
当前 `spring.jpa.hibernate.ddl-auto=update` 会自动创建该表。
关闭自动建表的环境，应在发布前执行：

`backend/backend/AuroraPlayer-Backend/database-migration-maintenance.sql`

接口：

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/v1/system/maintenance` | 无需登录 |
| GET | `/api/v1/admin/maintenance` | 管理员 |
| PUT | `/api/v1/admin/maintenance` | 管理员 |

状态响应禁止缓存。用户端状态检查不附带登录令牌。

## 主服务完全停机时

默认状态地址为 `<内容后端地址>/api/v1/system/maintenance`，与已有内容后端共用配置和代理。
如果需要在 Java 服务或数据库完全停机时继续控制维护状态，可以在前台构建环境中设置：

```dotenv
VITE_MAINTENANCE_STATUS_URL=https://status.example.com/maintenance.json
```

该地址应部署在独立静态服务或 CDN，支持跨域 GET，并关闭缓存。支持直接返回 JSON，或现有的 `{ "code": 200, "data": ... }` 包装格式：

```json
{
  "enabled": true,
  "title": "系统维护中",
  "message": "正在恢复音乐服务，请稍候。",
  "estimatedReturn": "今天 22:00",
  "accentColor": "#a78bfa",
  "backgroundUrl": "",
  "customHtml": ""
}
```

使用独立地址后，应更新该地址的 JSON 来开启或结束维护；后台保存的配置只写入 Java 服务的数据库，不会同步发布到 CDN。
该功能需要浏览器能加载前台静态资源；整个站点的静态托管也停机时，需要由 CDN 或网关提供兜底页面。

## 验证

- 前台：`npm run build`、`npm test`（54 项通过，含 4 项维护轮询测试）。
- 后台：`npm run build`（包含 TypeScript 检查）。
- 服务端：`mvn -Dtest=MaintenanceControllerTest,SecurityConfigAuthTest test`（15 项通过）。
- 浏览器：在用户前台目录运行 `node tests/.maintenance-browser.mjs`。该脚本使用本机 Chrome、独立临时配置和模拟 API，检查真实 10 秒轮询、进入维护、网络错误、恢复、组件保留、自定义页面隔离以及管理后台预览与保存。
- 截图：`docs/screenshots/maintenance/`。
