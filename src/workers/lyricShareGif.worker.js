import {createLyricShareGifEncoder} from '../utils/lyricShareGifEncoder.js'

let encoder = null
self.onmessage = ({data}) => {
  try {
    if (data.type === 'init' && !encoder) {
      encoder = createLyricShareGifEncoder({...data.config, samples: new Uint8Array(data.samples)})
      self.postMessage({type: 'ready'})
    } else if (data.type === 'frame' && encoder) {
      const completed = encoder.addFrame(new Uint8Array(data.rgba), data.delay)
      self.postMessage({type: 'frame', completed})
    } else if (data.type === 'finish' && encoder) {
      const bytes = encoder.finish()
      self.postMessage({type: 'done', bytes: bytes.buffer}, [bytes.buffer])
      encoder = null
    } else throw new Error('GIF 生成状态无效。')
  } catch (error) {
    encoder = null
    self.postMessage({type: 'error', error: String(error?.message || 'GIF 生成失败，请重试。')})
  }
}
