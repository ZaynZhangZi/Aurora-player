import * as gifenc from 'gifenc'
import {SHARE_GIF_FRAME_COUNT, SHARE_GIF_MAX_BYTES, SHARE_GIF_MAX_PIXELS} from './lyricShareGifMotion.js'

// gifenc ships ESM for bundlers and a CommonJS namespace for Node-based verification.
const {GIFEncoder, quantize, applyPalette} = gifenc.GIFEncoder ? gifenc : gifenc.default

export function createLyricShareGifEncoder({width, height, frameCount = SHARE_GIF_FRAME_COUNT, samples}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 960 || height > 2400 || width * height > SHARE_GIF_MAX_PIXELS) throw new Error('GIF 尺寸超出限制，请降低清晰度。')
  if (!Number.isInteger(frameCount) || frameCount < 1 || frameCount > SHARE_GIF_FRAME_COUNT) throw new Error('GIF 帧数超出限制。')
  if (!(samples instanceof Uint8Array) || !samples.length || samples.length % 4 || samples.length > 1024 * 1024) throw new Error('GIF 调色板数据无效。')
  // One palette for the entire loop prevents color shimmer between frames.
  const palette = quantize(samples, 255, {format: 'rgb565'})
  if (!palette.some(color => color.every(channel => channel === 255))) palette.push([255, 255, 255])
  const gif = GIFEncoder()
  let count = 0
  let finished = false
  return {
    addFrame(rgba, delay) {
      if (finished || count >= frameCount) throw new Error('GIF 帧序列已结束。')
      if (!(rgba instanceof Uint8Array) || rgba.length !== width * height * 4 || !Number.isFinite(delay) || delay < 20 || delay > 1000) throw new Error('GIF 帧数据无效。')
      const indexed = applyPalette(rgba, palette, 'rgb565')
      gif.writeFrame(indexed, width, height, {palette: count === 0 ? palette : undefined, delay, repeat: 0, dispose: 1})
      count++
      if (gif.bytesView().length > SHARE_GIF_MAX_BYTES) throw new Error('GIF 文件太大，请降低清晰度或减少歌词。')
      return count
    },
    finish() {
      if (finished || count !== frameCount) throw new Error('GIF 帧序列不完整。')
      finished = true
      gif.finish()
      return gif.bytes()
    },
  }
}
