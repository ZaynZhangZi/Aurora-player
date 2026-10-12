// The linked screenshots use Common; upstream v0.7.17 now defaults to Latent.
export const FOLIA_BACKGROUND_STORAGE_KEY = 'aurora-folia-background-v1'
export const FOLIA_BACKGROUND_OPTIONS = Object.freeze([
  {id: 'reference', label: '几何背景 · 参考图'},
  {id: 'latent', label: '封面网格 · Folia 默认'},
  {id: 'cover', label: '封面流体'},
])

export function normalizeFoliaBackground(value) {
  return FOLIA_BACKGROUND_OPTIONS.some(option => option.id === value) ? value : 'reference'
}

export function foliaBackgroundConfig(mode, preference) {
  const background = normalizeFoliaBackground(preference)
  if (background === 'latent') return {mode: 'latent'}
  return {mode: 'common', common: {
    useCoverColorBg: background === 'cover',
    opacity: 0.75,
    disableGeometricBackground: mode === 'pendolo',
    // Tilt's linked preview has a flat night surface, without the Common vignette.
    disableVignette: background === 'reference' && mode === 'tilt',
  }}
}
