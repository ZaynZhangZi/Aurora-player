# 界面图标规范

网站操作图标统一使用 **Morphicons 2.0.2 + Lucide 1.48.0**。Morphicons 提供 SVG 变形动画，Lucide 提供统一的 24 × 24 线性图形。Lucide 只导入图形数据，不导入整套图标或独立播放器。

- Vue 页面使用 `src/components/icons/AppIcon.vue`，通过 `name` 指定图形。
- React 播放器控制使用 `src/components/icons/ReactIcon.tsx`。
- 图形集中在 `iconRegistry.ts`，默认线宽 1.75，颜色继承文字颜色。
- 状态切换修改同一个组件的 `name` 或 `filled`，保持同一个 SVG 节点，例如播放/暂停、收藏与主题切换。
- 图标默认隐藏于辅助技术；有意义的名称放在所属按钮的 `aria-label`，独立图标可传 `label`。
- 全部组件使用 `reducedMotion="user"`，遵循系统减少动态效果设置。
- 列表和页面中的图标不会自动循环变形；只有状态改变才过渡。加载图标的旋转也遵循减少动画设置。

管理端保存独立组件和依赖，不通过跨仓库源码引用。导出的歌词海报、二维码、品牌图形及第三方视觉效果属于绘图内容，保留其绘制和导出逻辑。Folia 的三个操作图标导入改动记录在其 README；原有渲染器其余代码继续接受上游指纹校验。

许可证随构建提供：`public/licenses/morphicons-MIT.txt`、`public/licenses/lucide-ISC.txt`。

参考：[Morphicons 官方文档](https://www.morphicons.com/docs)、[Lucide](https://lucide.dev)。
