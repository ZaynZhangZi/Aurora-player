/**
 * 资源预加载管理器
 * 在开屏动画期间预加载关键资源
 */

export class ResourcePreloader {
  constructor() {
    this.resources = []
    this.loaded = 0
    this.total = 0
    this.onProgressCallbacks = []
  }

  /**
   * 添加资源到预加载队列
   */
  addResource(url, type = 'auto') {
    this.resources.push({ url, type })
    this.total++
    return this
  }

  /**
   * 批量添加资源
   */
  addResources(urls, type = 'auto') {
    urls.forEach((url) => this.addResource(url, type))
    return this
  }

  /**
   * 监听加载进度
   */
  onProgress(callback) {
    this.onProgressCallbacks.push(callback)
    return this
  }

  /**
   * 触发进度回调
   */
  _notifyProgress() {
    const progress = Math.round((this.loaded / this.total) * 100)
    this.onProgressCallbacks.forEach((callback) => {
      callback(progress, this.loaded, this.total)
    })
  }

  /**
   * 预加载图片
   */
  _preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ url, type: 'image', success: true })
      img.onerror = () => reject({ url, type: 'image', success: false })
      img.src = url
    })
  }

  /**
   * 预加载字体
   */
  _preloadFont(url) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'font'
      link.type = 'font/woff2'
      link.crossOrigin = 'anonymous'
      link.href = url
      link.onload = () => resolve({ url, type: 'font', success: true })
      link.onerror = () => reject({ url, type: 'font', success: false })
      document.head.appendChild(link)
    })
  }

  /**
   * 预加载样式
   */
  _preloadStyle(url) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = url
      link.onload = () => resolve({ url, type: 'style', success: true })
      link.onerror = () => reject({ url, type: 'style', success: false })
      document.head.appendChild(link)
    })
  }

  /**
   * 预加载脚本
   */
  _preloadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = url
      script.onload = () => resolve({ url, type: 'script', success: true })
      script.onerror = () => reject({ url, type: 'script', success: false })
      document.head.appendChild(script)
    })
  }

  /**
   * 预加载 JSON
   */
  _preloadJson(url) {
    return fetch(url)
      .then((response) => response.json())
      .then((data) => ({ url, type: 'json', success: true, data }))
      .catch(() => ({ url, type: 'json', success: false }))
  }

  /**
   * 自动检测资源类型
   */
  _detectType(url) {
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image'
    if (url.match(/\.(woff|woff2|ttf|otf)$/i)) return 'font'
    if (url.match(/\.css$/i)) return 'style'
    if (url.match(/\.js$/i)) return 'script'
    if (url.match(/\.json$/i)) return 'json'
    return 'fetch'
  }

  /**
   * 预加载单个资源
   */
  _preloadResource(resource) {
    const type = resource.type === 'auto' ? this._detectType(resource.url) : resource.type

    const loaderMap = {
      image: this._preloadImage.bind(this),
      font: this._preloadFont.bind(this),
      style: this._preloadStyle.bind(this),
      script: this._preloadScript.bind(this),
      json: this._preloadJson.bind(this),
      fetch: (url) => fetch(url).then((res) => res.blob()),
    }

    const loader = loaderMap[type] || loaderMap.fetch

    return loader(resource.url)
      .then((result) => {
        this.loaded++
        this._notifyProgress()
        return result
      })
      .catch((error) => {
        this.loaded++
        this._notifyProgress()
        console.warn(`[ResourcePreloader] Failed to load: ${resource.url}`, error)
        return { url: resource.url, type, success: false }
      })
  }

  /**
   * 开始预加载
   */
  async load() {
    if (this.total === 0) {
      return []
    }

    const results = await Promise.all(
      this.resources.map((resource) => this._preloadResource(resource))
    )

    return results
  }
}

/**
 * 创建预加载器并配置关键资源
 */
export function createAppPreloader() {
  const preloader = new ResourcePreloader()

  // 预加载关键 API 请求（根据你的项目调整）
  // preloader.addResource('/api/user/account', 'json')

  // 预加载常用图标/图片
  // preloader.addResource('/logo.png', 'image')

  return preloader
}

/**
 * 预连接到关键域名
 */
export function preconnectDomains(domains) {
  domains.forEach((domain) => {
    // DNS 预解析
    const dnsPrefetch = document.createElement('link')
    dnsPrefetch.rel = 'dns-prefetch'
    dnsPrefetch.href = domain
    document.head.appendChild(dnsPrefetch)

    // 预连接
    const preconnect = document.createElement('link')
    preconnect.rel = 'preconnect'
    preconnect.href = domain
    preconnect.crossOrigin = 'anonymous'
    document.head.appendChild(preconnect)
  })
}

/**
 * 初始化关键资源预加载
 */
export function initResourcePreloading() {
  // 预连接到 CDN
  preconnectDomains([
    'https://p1.music.126.net',
    'https://p2.music.126.net',
    'https://p3.music.126.net',
    'https://p4.music.126.net',
  ])

  // 预加载字体（如果使用自定义字体）
  const fonts = document.querySelectorAll('link[rel="preload"][as="font"]')
  if (fonts.length === 0) {
    // 可以在这里添加字体预加载
  }
}
