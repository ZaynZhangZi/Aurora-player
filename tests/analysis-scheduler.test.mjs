import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createAnalysisScheduler} from '../src/utils/analysisScheduler.js'
const drain=async()=>{for(let n=0;n<12;n++)await Promise.resolve()}
test('cached low-confidence analysis cannot trigger a recursive profile-ready warmup',async()=>{
  const schedule=createAnalysisScheduler();let analyzed=0,completed=0
  const analyze=async()=>{analyzed++;return {confidence:{overall:0},beat_positions:[]}}
  const complete=()=>{completed++;assert.equal(schedule('song-source',analyze,complete),false)}
  assert.equal(schedule('song-source',analyze,complete),true)
  assert.equal(schedule('song-source',analyze,complete),false)
  await drain();assert.equal(analyzed,1);assert.equal(completed,1)
  assert.equal(schedule('song-source',analyze,complete),false)
})
test('aborted analysis can retry and completed entries remain bounded',async()=>{
  const schedule=createAnalysisScheduler({max:2});let failures=0,runs=0
  schedule('a',async()=>{throw Object.assign(Error('aborted'),{name:'AbortError'})},()=>assert.fail(),()=>failures++)
  await drain();assert.equal(failures,1)
  const analyze=async()=>{runs++;return {confidence:{overall:0}}}
  assert.equal(schedule('a',analyze,()=>{}),true);await drain()
  schedule('b',analyze,()=>{});schedule('c',analyze,()=>{});await drain()
  assert.equal(schedule('a',analyze,()=>{}),true);await drain();assert.equal(runs,4)
})
