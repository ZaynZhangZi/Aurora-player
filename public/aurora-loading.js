// This small, dependency-free screen runs before the application bundle arrives.
class AuroraLoadingScreen extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return
    this.attachShadow({mode: 'open'})
    this.shadowRoot.innerHTML = `
      <style>
        :host { position:fixed; inset:0; z-index:9999; display:block; color:#25252a; font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif; }
        * { box-sizing:border-box; }
        button { font:inherit; -webkit-tap-highlight-color:transparent; }
        .screen { width:100%; height:100%; min-height:100%; overflow:auto; display:flex; flex-direction:column; align-items:center; color:#25252a; background:radial-gradient(ellipse at 50% 40%,#fff 0%,#faf6f5 44%,#f5f5f7 78%); transition:opacity 220ms ease; }
        .screen.leaving { opacity:0; pointer-events:none; }
        .brand { display:flex; align-items:center; gap:10px; margin-top:max(32px,env(safe-area-inset-top)); font-size:12px; font-weight:750; letter-spacing:.23em; }
        .brand-mark { display:grid; place-items:center; width:28px; height:28px; border-radius:9px; color:#fff; background:linear-gradient(140deg,#f16f85,#ed9b78); font-size:17px; letter-spacing:0; }
        .content { width:min(100% - 40px,440px); margin:auto; padding:36px 0 28px; text-align:center; }
        .art { position:relative; width:170px; height:170px; margin:0 auto 30px; display:grid; place-items:center; }
        .halo { position:absolute; inset:-20px; border-radius:50%; background:radial-gradient(circle,#f3c3bc66,transparent 68%); animation:breathe 4s ease-in-out infinite; }
        .record { position:relative; width:146px; height:146px; display:grid; place-items:center; border-radius:50%; border:1px solid #fff; background:repeating-radial-gradient(circle at center,#f1e7e3 0 1px,#faf5f2 2px 7px); box-shadow:0 18px 40px #735b4912,inset 0 0 20px #fff; }
        .orbit { position:absolute; inset:10px; border-radius:50%; border:1px solid #d8c6c23d; animation:spin 14s linear infinite; }
        .orbit::after { content:""; position:absolute; width:7px; height:7px; top:13px; left:14px; background:#e9989d; border-radius:50%; box-shadow:0 0 0 5px #e9989d18; }
        .record-center { width:66px; height:66px; border-radius:50%; background:linear-gradient(145deg,#fa979e,#e8a381); box-shadow:0 7px 18px #c67a7226; display:flex; align-items:center; justify-content:center; gap:4px; }
        .wave { display:block; width:4px; height:22px; border-radius:4px; background:#fff; transform-origin:center; animation:wave 1.1s ease-in-out infinite; }
        .wave:nth-child(2),.wave:nth-child(4) { height:32px; animation-delay:-.3s; }
        .wave:nth-child(3) { height:40px; animation-delay:-.6s; }
        h1 { margin:0; font-size:clamp(25px,5vw,32px); line-height:1.35; letter-spacing:-.04em; font-weight:650; }
        .intro { margin:12px 0 26px; color:#766f70; font-size:13px; line-height:1.8; }
        .progress { width:230px; max-width:100%; margin:0 auto; }
        .track { height:3px; position:relative; border-radius:3px; overflow:hidden; background:#e9e3e1; }
        .fill { position:absolute; inset:0; transform:scaleX(0); transform-origin:left; border-radius:3px; background:linear-gradient(90deg,#e99099,#e5ac8d); transition:transform 240ms ease; }
        .track:not(.determinate)::after { content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent,#e99099,transparent); animation:travel 1.4s ease-in-out infinite; }
        .progress-copy { display:flex; justify-content:space-between; align-items:center; gap:12px; min-height:32px; color:#7b7173; font-size:11px; line-height:1.5; }
        .percentage { font-variant-numeric:tabular-nums; }
        .playground { visibility:hidden; opacity:0; margin:28px auto 0; padding:20px 20px 16px; max-width:360px; border:1px solid #fff; border-radius:24px; background:#ffffff94; box-shadow:0 12px 32px #6e4e3c05; transition:opacity 350ms ease; }
        .playground.visible { visibility:visible; opacity:1; }
        .playground-title { margin:0 0 16px; font-size:12px; color:#756b6d; font-weight:500; }
        .pads { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
        .pad { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; min-height:73px; padding:10px 0; border:1px solid #fff; border-radius:17px; background:var(--tint); color:var(--ink); cursor:pointer; touch-action:manipulation; transition:background 150ms ease; }
        .pad:hover { background:var(--hover); }
        .pad:active { transform:scale(.94); }
        .pad-note { font-size:17px; font-weight:600; }
        .pad-key { font-size:9px; letter-spacing:.08em; opacity:.6; }
        button:focus-visible { outline:2px solid #ca7484; outline-offset:4px; }
        .playground-footer { display:flex; align-items:center; justify-content:space-between; margin-top:15px; min-height:28px; gap:12px; }
        .rhythm-copy { margin:0; font-size:10px; color:#827477; text-align:left; font-variant-numeric:tabular-nums; }
        .sound { display:flex; align-items:center; gap:5px; padding:6px 0 6px 8px; border:0; color:#78696c; background:transparent; font-size:10px; cursor:pointer; white-space:nowrap; }
        .sound-dot { width:5px; height:5px; border-radius:50%; background:#c8bdbb; }
        .sound[aria-pressed="true"] .sound-dot { background:#d38694; }
        .footnote { margin:0 20px max(22px,env(safe-area-inset-bottom)); min-height:24px; font-size:10px; color:#817678; text-align:center; line-height:1.8; }
        .retry { padding:4px 8px; margin-left:6px; border:0; border-radius:6px; color:#a35d70; background:#f4e8eb; cursor:pointer; font-size:10px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes wave { 0%,100% { transform:scaleY(.5); opacity:.65; } 50% { transform:scaleY(1); opacity:1; } }
        @keyframes breathe { 50% { transform:scale(1.1); opacity:.6; } }
        @keyframes travel { from { transform:translateX(-100%); } to { transform:translateX(100%); } }
        .paused * { animation-play-state:paused !important; }
        @media(max-height:700px) { .brand { margin-top:20px; } .content { padding:22px 0 16px; } .art { width:126px; height:126px; margin-bottom:22px; } .record { width:120px; height:120px; } .record-center { width:56px; height:56px; } .intro { margin-bottom:18px; } .playground { margin-top:18px; padding:16px; } .footnote { margin-bottom:12px; } }
        @media(max-height:640px) { .brand { margin-top:12px; } .content { padding:12px 0 8px; } .art { width:92px; height:92px; margin-bottom:16px; } .record { width:92px; height:92px; } .record-center { width:44px; height:44px; } h1 { font-size:24px; } .intro { margin:8px 0 12px; font-size:12px; } .playground { margin-top:12px; padding:12px; } .playground-title { margin-bottom:10px; } .pad { min-height:60px; } .playground-footer { margin-top:8px; } .footnote { margin-bottom:8px; } }
        @media(prefers-reduced-motion:reduce) { *,*::before,*::after { animation:none !important; transition:none !important; } .pad:active { transform:none; } }
      </style>
      <section class="screen" aria-label="正在加载 Aurora Player">
        <div class="brand"><span class="brand-mark" aria-hidden="true">A</span>AURORA</div>
        <main class="content">
          <div class="art" aria-hidden="true"><div class="halo"></div><div class="record"><div class="orbit"></div><div class="record-center"><i class="wave"></i><i class="wave"></i><i class="wave"></i><i class="wave"></i><i class="wave"></i></div></div></div>
          <h1>让音乐，慢慢亮起来。</h1>
          <p class="intro">第一次见面，正在为你准备音乐空间。</p>
          <div class="progress">
            <div class="track" role="progressbar" aria-label="应用加载进度" aria-valuemin="0" aria-valuemax="100"><div class="fill"></div></div>
            <div class="progress-copy"><span class="status" role="status" aria-live="polite">正在连接音乐空间</span><span class="percentage" aria-hidden="true"></span></div>
          </div>
          <div class="playground" inert aria-label="等待时弹奏音符">
            <p class="playground-title">等一小会儿，先随手弹几下。</p>
            <div class="pads">
              <button class="pad" type="button" data-note="0" aria-label="弹奏 Do，快捷键 A" style="--tint:#f9e8e9;--hover:#f5d8dc;--ink:#9e5363"><span class="pad-note">Do</span><span class="pad-key" aria-hidden="true">A</span></button>
              <button class="pad" type="button" data-note="1" aria-label="弹奏 Re，快捷键 S" style="--tint:#f9ede0;--hover:#f4e0c8;--ink:#8d653f"><span class="pad-note">Re</span><span class="pad-key" aria-hidden="true">S</span></button>
              <button class="pad" type="button" data-note="2" aria-label="弹奏 Mi，快捷键 D" style="--tint:#e9efea;--hover:#d8e6dc;--ink:#50765b"><span class="pad-note">Mi</span><span class="pad-key" aria-hidden="true">D</span></button>
              <button class="pad" type="button" data-note="3" aria-label="弹奏 Sol，快捷键 F" style="--tint:#eceaf6;--hover:#dfdaef;--ink:#73628f"><span class="pad-note">Sol</span><span class="pad-key" aria-hidden="true">F</span></button>
            </div>
            <div class="playground-footer"><p class="rhythm-copy">轻点音符，拼一段自己的节奏</p><button class="sound" type="button" aria-pressed="false"><span class="sound-dot" aria-hidden="true"></span><span class="sound-label">开启声音</span></button></div>
          </div>
        </main>
        <p class="footnote"><span class="wait-hint">音乐准备好，就会自动出发。</span><button class="retry" type="button" hidden>重新加载</button></p>
      </section>`

    this.screen = this.shadowRoot.querySelector('.screen')
    this.playground = this.shadowRoot.querySelector('.playground')
    this.progressValue = 0
    this.taps = 0
    this.soundEnabled = false
    this.finishing = false
    this.motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
    this.events = new AbortController()
    const options = {signal: this.events.signal}
    this.shadowRoot.addEventListener('focusin', () => { this.interactionFocused = true }, options)
    this.shadowRoot.addEventListener('click', event => {
      const pad = event.target.closest('[data-note]')
      if (pad) this.tap(Number(pad.dataset.note))
      if (event.target.closest('.sound')) void this.toggleSound()
      if (event.target.closest('.retry')) window.location.reload()
    }, options)
    window.addEventListener('keydown', event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || this.playground.inert) return
      if (event.composedPath().some(node => node.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName))) return
      const index = ['a', 's', 'd', 'f'].indexOf(event.key.toLowerCase())
      if (index < 0) return
      event.preventDefault()
      this.interactionFocused = true
      this.tap(index)
    }, options)
    document.addEventListener('visibilitychange', () => {
      this.screen.classList.toggle('paused', document.hidden)
      if (document.hidden) void this.audio?.suspend().catch(() => {})
    }, options)
    try {
      if (localStorage.getItem('aurora-welcomed') === '1') {
        this.shadowRoot.querySelector('.intro').textContent = '熟悉的旋律，马上回来。'
      }
    } catch { /* The experience also works without storage. */ }
    this.screen.classList.toggle('paused', document.hidden)
    this.showTimer = setTimeout(() => {
      if (this.finishing) return
      this.playground.inert = false
      this.playground.classList.add('visible')
    }, 1600)
    this.slowTimer = setTimeout(() => {
      if (this.finishing) return
      this.shadowRoot.querySelector('.wait-hint').textContent = '加载比平时久一点，你可以继续弹奏。'
      this.shadowRoot.querySelector('.retry').hidden = false
    }, 12000)
  }

  setProgress(value, label) {
    if (this.finishing || !this.screen) return
    this.progressValue = Math.max(this.progressValue, Math.min(100, Number(value) || 0))
    const track = this.shadowRoot.querySelector('.track')
    track.classList.add('determinate')
    track.setAttribute('aria-valuenow', String(Math.round(this.progressValue)))
    this.shadowRoot.querySelector('.fill').style.transform = `scaleX(${this.progressValue / 100})`
    this.shadowRoot.querySelector('.percentage').textContent = `${Math.round(this.progressValue)}%`
    if (label) this.shadowRoot.querySelector('.status').textContent = label
  }

  tap(index) {
    if (this.finishing || this.playground.inert || document.hidden) return
    const pad = this.shadowRoot.querySelector(`[data-note="${index}"]`)
    if (!pad) return
    this.taps += 1
    this.shadowRoot.querySelector('.rhythm-copy').textContent = `你的节奏，已落下 ${this.taps} 个音符`
    if (!this.motionPreference.matches) {
      pad.getAnimations().forEach(animation => animation.cancel())
      pad.animate([{transform: 'scale(.91)'}, {transform: 'scale(1.045)'}, {transform: 'scale(1)'}], {duration: 300, easing: 'ease-out'})
      const record = this.shadowRoot.querySelector('.record')
      record.getAnimations().forEach(animation => animation.cancel())
      record.animate([{transform: 'scale(.97)'}, {transform: 'scale(1.025)'}, {transform: 'scale(1)'}], {duration: 350})
    }
    if (this.soundEnabled) void this.playNote(index)
  }

  async toggleSound() {
    if (this.finishing) return
    this.soundEnabled = !this.soundEnabled
    const enabled = this.soundEnabled
    this.shadowRoot.querySelector('.sound').setAttribute('aria-pressed', String(enabled))
    this.shadowRoot.querySelector('.sound-label').textContent = enabled ? '关闭声音' : '开启声音'
    if (enabled) await this.playNote(0)
    else void this.audio?.suspend().catch(() => {})
  }

  async playNote(index) {
    const Context = window.AudioContext || window.webkitAudioContext
    if (!Context || document.hidden || this.finishing || !this.soundEnabled) return
    try {
      this.audio ||= new Context()
      await this.audio.resume()
      if (this.finishing || !this.soundEnabled || document.hidden) return
      const oscillator = this.audio.createOscillator()
      const gain = this.audio.createGain()
      const now = this.audio.currentTime
      oscillator.type = 'sine'
      oscillator.frequency.value = [261.63, 293.66, 329.63, 392][index]
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(.075, now + .012)
      gain.gain.exponentialRampToValueAtTime(.001, now + .4)
      oscillator.connect(gain)
      gain.connect(this.audio.destination)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
      oscillator.start(now)
      oscillator.stop(now + .42)
    } catch {
      this.soundEnabled = false
      this.shadowRoot.querySelector('.sound').setAttribute('aria-pressed', 'false')
      this.shadowRoot.querySelector('.sound-label').textContent = '声音暂不可用'
    }
  }

  finish({immediate = false} = {}) {
    if (this.completion) return this.completion
    this.setProgress(100, '音乐空间已就绪')
    this.finishing = true
    clearTimeout(this.showTimer)
    clearTimeout(this.slowTimer)
    this.events?.abort()
    this.playground.inert = true
    this.screen?.classList.add('leaving')
    this.completion = new Promise(resolve => {
      this.resolveCompletion = resolve
      this.leaveTimer = setTimeout(() => this.remove(), immediate || this.motionPreference?.matches ? 0 : 220)
    })
    return this.completion
  }

  disconnectedCallback() {
    this.finishing = true
    clearTimeout(this.showTimer)
    clearTimeout(this.slowTimer)
    clearTimeout(this.leaveTimer)
    this.events?.abort()
    this.shadowRoot?.getAnimations().forEach(animation => animation.cancel())
    void this.audio?.close().catch(() => {})
    this.resolveCompletion?.()
  }
}

if (!customElements.get('aurora-loading-screen')) customElements.define('aurora-loading-screen', AuroraLoadingScreen)
