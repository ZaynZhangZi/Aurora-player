import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {canonicalD} from 'morphicons/dom'
import {icons,iconData} from '../src/components/icons/iconRegistry.ts'

test('every registered UI icon produces a real path and filled states preserve stable identity',()=>{
  for(const [name,icon] of Object.entries(icons)){
    const path=canonicalD(icon)
    assert.ok(path.length>4,name)
    assert.doesNotMatch(path,/NaN|Infinity|undefined/,name)
  }
  for(const name of ['play','pause','heart']){
    assert.equal(iconData(name,true),iconData(name,true))
    assert.notEqual(iconData(name),iconData(name,true))
    assert.ok(iconData(name,true).every(([,attributes])=>attributes.fill==='currentColor'))
  }
})

test('website operation icons use Morphicons while exported lyric artwork remains SVG',async()=>{
  const root=new URL('../src/',import.meta.url)
  async function walk(folder){
    for(const entry of await readdir(folder,{withFileTypes:true})){
      if(entry.name==='vendor')continue
      const file=new URL(entry.name+(entry.isDirectory()?'/':''),folder)
      if(entry.isDirectory())await walk(file)
      else if(/\.(vue|tsx)$/.test(entry.name)){
        const source=await readFile(file,'utf8')
        assert.doesNotMatch(source,/@heroicons\/|from ['"]lucide-react['"]/,file.pathname)
        if(entry.name!=='LyricSharePreview.vue')assert.doesNotMatch(source,/<svg\b/,file.pathname)
      }
    }
  }
  await walk(root)
  for(const path of ['../src/components/icons/AppIcon.vue','../src/components/icons/ReactIcon.tsx']){
    const source=await readFile(new URL(path,import.meta.url),'utf8')
    assert.match(source,/reduced(?:-motion|Motion)=["']user["']/)
  }
})
