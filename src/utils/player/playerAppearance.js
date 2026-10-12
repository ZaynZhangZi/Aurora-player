export const PLAYER_APPEARANCE_STORAGE_KEY = 'aurora-player-appearance-v1'

export const PLAYER_APPEARANCE_OPTIONS = Object.freeze([
  {id: 'amll', label: '原版', detail: '封面与滚动歌词', preview: 'cover'},
  {id: 'manuscript', label: '浮名', detail: '歌词留痕 · 文字漫游', preview: 'article'},
  {id: 'stage', label: '流光', detail: '大字歌词 · 逐字辉光', preview: 'glow'},
  {id: 'cadenza', label: '心象', detail: '散落字阵 · 自由律动', preview: 'scatter'},
  {id: 'parata', label: '云阶', detail: '阶梯排版 · 拾级而上', preview: 'stairs'},
  {id: 'cappella', label: '群唱', detail: '对话气泡 · 歌词合唱', preview: 'chat'},
  {id: 'tilt', label: '倾诉', detail: '错落排版 · 轻盈倾斜', preview: 'tilt'},
  {id: 'diorama', label: '镜台', detail: '立体光点 · 空间舞台', preview: 'mirror'},
  {id: 'pendolo', label: '时计', detail: '齿轮表盘 · 时光轮转', preview: 'clock'},
])

export function normalizePlayerAppearance(value) {
  return PLAYER_APPEARANCE_OPTIONS.some(option => option.id === value) ? value : 'amll'
}
