import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('../public/worklets/song-recognition-recorder.js', import.meta.url), 'utf8')

function createRecorder() {
  let Recorder
  const messages = []
  class FakeProcessor {
    constructor() {
      this.port = {postMessage: message => messages.push(message), onmessage: null}
    }
  }
  vm.runInNewContext(source, {
    AudioWorkletProcessor: FakeProcessor,
    Float32Array,
    Math,
    sampleRate: 8000,
    registerProcessor: (name, constructor) => {
      assert.equal(name, 'aurora-song-recognition-recorder')
      Recorder = constructor
    },
  })
  return {recorder: new Recorder(), messages}
}

function feedSeconds(recorder, count, startSecond = 0) {
  for (let frame = startSecond * 8000; frame < (startSecond + count) * 8000; frame += 128) {
    const input = new Float32Array(Math.min(128, (startSecond + count) * 8000 - frame))
    input.fill(Math.floor(frame / 8000) / 12)
    recorder.process([[input]])
  }
}

test('starts matching after three seconds while recording continues', () => {
  const {recorder, messages} = createRecorder()
  recorder.port.onmessage({data: {type: 'start', windowSeconds: 3, stepSeconds: 2, maxSeconds: 12}})
  feedSeconds(recorder, 4)
  assert.equal(messages.filter(message => message.type === 'window').length, 1)
  assert.equal(messages.some(message => message.type === 'complete'), false)

  feedSeconds(recorder, 8, 4)
  const windows = messages.filter(message => message.type === 'window')
  assert.equal(windows.length, 5)
  assert.ok(windows.every(message => message.samples.length === 24000 && message.sampleRate === 8000))
  assert.equal(messages.at(-1).type, 'complete')
  assert.ok(messages.filter(message => message.type === 'progress').length < 60)
})

test('stopping the recorder prevents later windows', () => {
  const {recorder, messages} = createRecorder()
  recorder.port.onmessage({data: {type: 'start', windowSeconds: 3, stepSeconds: 2, maxSeconds: 12}})
  feedSeconds(recorder, 4)
  recorder.port.onmessage({data: {type: 'stop'}})
  feedSeconds(recorder, 8, 4)
  assert.equal(messages.filter(message => message.type === 'window').length, 1)
  assert.equal(messages.some(message => message.type === 'complete'), false)
})
