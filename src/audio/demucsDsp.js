import FFT from 'fft.js'
export const DEMUCS_CHUNK=343980
export const DEMUCS_HOP=1024
const N=4096,BINS=2048,PAD=1536,CENTER=2048
const fft=new FFT(N),window=Float64Array.from({length:N},(_,i)=>(1-Math.cos(2*Math.PI*i/N))/2)
function reflect(index,length){
  if(length<2)return 0
  const period=2*(length-1),value=((index%period)+period)%period
  return value<length?value:period-value
}
// Matches HTDemucs standalone_spec: reflect 3/2-hop padding, centered normalized STFT, then trim two frames.
export function demucsSpec(channels){
  const length=channels[0].length,frames=Math.ceil(length/DEMUCS_HOP)
  const data=new Float32Array(4*BINS*frames),input=new Float64Array(N),spectrum=new Float64Array(N*2)
  for(let c=0;c<2;c++){
    const samples=channels[c]||channels[0]
    for(let frame=0;frame<frames;frame++){
      const start=frame*DEMUCS_HOP-PAD
      for(let i=0;i<N;i++)input[i]=samples[reflect(start+i,length)]*window[i]
      fft.realTransform(spectrum,input)
      for(let bin=0;bin<BINS;bin++){
        data[((c*2)*BINS+bin)*frames+frame]=spectrum[bin*2]/64
        data[((c*2+1)*BINS+bin)*frames+frame]=spectrum[bin*2+1]/64
      }
    }
  }
  return {data,frames}
}
// Reconstruct the frequency branch and add the time branch. Dropping either branch is incorrect.
export function demucsInverse(spec,time,length,frames,stems=4){
  const totalFrames=frames+4,canvas=N+(totalFrames-1)*DEMUCS_HOP
  const envelope=new Float64Array(canvas)
  for(let frame=0;frame<totalFrames;frame++)for(let i=0;i<N;i++)envelope[frame*DEMUCS_HOP+i]+=window[i]*window[i]
  const result=[],complex=new Float64Array(N*2),inverse=new Float64Array(N*2)
  for(let s=0;s<stems;s++){
    const channels=[]
    for(let c=0;c<2;c++){
      const overlap=new Float64Array(canvas)
      for(let frame=0;frame<frames;frame++){
        complex.fill(0)
        for(let bin=0;bin<BINS;bin++){
          complex[bin*2]=spec[(((s*4+c*2)*BINS+bin)*frames)+frame]
          complex[bin*2+1]=spec[(((s*4+c*2+1)*BINS+bin)*frames)+frame]
        }
        fft.completeSpectrum(complex);fft.inverseTransform(inverse,complex)
        const start=(frame+2)*DEMUCS_HOP
        for(let i=0;i<N;i++)overlap[start+i]+=inverse[i*2]*window[i]*64
      }
      const samples=new Float32Array(length),base=(s*2+c)*length
      for(let i=0;i<length;i++){
        const index=i+CENTER+PAD
        samples[i]=overlap[index]/Math.max(1e-12,envelope[index])+(time?.[base+i]||0)
        if(!Number.isFinite(samples[i]))throw new Error('音源分离结果包含无效样本')
      }
      channels.push(samples)
    }
    result.push(channels)
  }
  return result
}
