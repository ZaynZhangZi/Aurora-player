import * as ort from 'onnxruntime-web/wasm'
import wasmUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url'
import {demucsSpec,demucsInverse,DEMUCS_CHUNK} from '../audio/demucsDsp.js'
ort.env.wasm.numThreads=1
ort.env.wasm.wasmPaths={wasm:wasmUrl}
ort.env.logLevel='error'
self.onmessage=async({data})=>{
  let session
  try{
    const {model,channels}=data,length=channels[0].length
    if(channels.length!==2||length<4410||length>44100*300)throw new Error('支持0.1秒至5分钟的音频，采样率须为44.1kHz')
    self.postMessage({stage:'loading',percent:null})
    session=await ort.InferenceSession.create(model,{executionProviders:['wasm'],graphOptimizationLevel:'basic',enableCpuMemArena:false})
    if(session.inputNames.length!==2||session.outputNames.length!==2)throw new Error('分离模型格式不匹配')
    const chunk=DEMUCS_CHUNK,overlap=Math.floor(chunk*.25),step=chunk-overlap
    const count=Math.max(1,Math.ceil((length-overlap)/step))
    const outputs=Array.from({length:4},()=>[new Float32Array(length),new Float32Array(length)])
    const weights=new Float32Array(length)
    for(let index=0;index<count;index++){
      const offset=index*step,input=new Float32Array(2*chunk)
      for(let c=0;c<2;c++)input.set(channels[c].subarray(offset,Math.min(offset+chunk,length)),c*chunk)
      const waveform=[input.subarray(0,chunk),input.subarray(chunk)]
      const spec=demucsSpec(waveform)
      const inputTensor=new ort.Tensor('float32',input,[1,2,chunk])
      const specTensor=new ort.Tensor('float32',spec.data,[1,4,2048,spec.frames])
      let result
      try{
        result=await session.run({[session.inputNames[0]]:inputTensor,[session.inputNames[1]]:specTensor})
        const frequency=result[session.outputNames[0]],time=result[session.outputNames[1]]
        if(frequency.dims.join(',')!=='1,4,4,2048,'+spec.frames||time.dims.join(',')!=='1,4,2,'+chunk)throw new Error('分离模型输出尺寸无效')
        const stems=demucsInverse(frequency.data,time.data,chunk,spec.frames)
        const valid=Math.min(chunk,length-offset)
        for(let i=0;i<valid;i++){
          let weight=Math.min(1,i/overlap,(chunk-i)/overlap)
          if(index===0&&i<overlap||index===count-1&&i>=chunk-overlap)weight=1
          weights[offset+i]+=weight
          for(let s=0;s<4;s++)for(let c=0;c<2;c++)outputs[s][c][offset+i]+=stems[s][c][i]*weight
        }
      }finally{
        inputTensor.dispose();specTensor.dispose()
        if(result)for(const tensor of Object.values(result))tensor.dispose()
      }
      self.postMessage({stage:'separating',completed:index+1,total:count,percent:Math.round((index+1)/count*100)})
    }
    for(const stem of outputs)for(const channel of stem)for(let i=0;i<length;i++)channel[i]/=Math.max(1e-9,weights[i])
    const buffers=outputs.flat().map(c=>c.buffer)
    self.postMessage({stage:'done',channels:outputs,order:['drums','bass','other','vocals'],sampleRate:44100},buffers)
  }catch(error){self.postMessage({stage:'error',message:error?.message||'本机无法完成音源分离'})}
  finally{await session?.release?.().catch(()=>{})}
}
