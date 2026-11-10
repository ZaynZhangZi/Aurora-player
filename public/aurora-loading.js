// This screen is available before the application bundle is ready.
class AuroraLoadingScreen extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return
    this.attachShadow({mode: 'open'})
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: block;
          font-family: system-ui, "Microsoft YaHei", sans-serif;
          color: #282832;
        }
        * { box-sizing: border-box; }
        .screen {
          display: grid;
          grid-template-rows: 1fr auto 1fr;
          justify-items: center;
          height: 100%;
          overflow: auto;
          padding: max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom));
          background:
            radial-gradient(ellipse at 35% 25%, #e8e6f2 0%, transparent 54%),
            radial-gradient(ellipse at 76% 76%, #e6ede4 0%, transparent 50%),
            #f7f7f3;
          transition: opacity 240ms ease;
        }
        .screen.leaving { opacity: 0; pointer-events: none; }
        .content { grid-row: 2; width: min(100%, 360px); text-align: center; }
        .emblem {
          position: relative;
          display: grid;
          place-items: center;
          width: 112px;
          height: 112px;
          margin: 0 auto 28px;
          border: 1px solid #fff;
          border-radius: 50%;
          background: linear-gradient(145deg, #ffffffbc, #ffffff24);
          box-shadow: 0 12px 36px #3e385314;
        }
        .orbit { position: absolute; inset: 9px; border: 1px solid #62557925; border-radius: 50%; }
        .orbit::after {
          position: absolute;
          top: 6px;
          right: 13px;
          width: 7px;
          height: 7px;
          border: 1px solid #fff;
          border-radius: 50%;
          background: #8b7a9d;
          content: "";
        }
        .brand-mark {
          display: grid;
          place-items: center;
          width: 56px;
          height: 56px;
          border-radius: 19px;
          background: linear-gradient(145deg, #776886, #4c485e);
          color: #fff;
          font: 500 32px/1 Georgia, serif;
          box-shadow: 0 6px 16px #453b602a;
        }
        .brand { margin: 0 0 10px; color: #5d586b; font-size: 10px; font-weight: 700; letter-spacing: .27em; }
        h1 { margin: 0; font-size: clamp(26px, 6vw, 36px); font-weight: 600; letter-spacing: .04em; }
        .status { margin: 12px 0 24px; color: #5b5b68; font-size: 13px; line-height: 1.6; }
        .track { position: relative; width: min(196px, 100%); height: 3px; margin: auto; overflow: hidden; border-radius: 8px; background: #dcdbe3; }
        .fill { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(90deg, #6d597d, #708979); transform: scaleX(0); transform-origin: left; transition: transform 220ms ease; }
        .hint { margin: 16px 0 0; color: #6d6c78; font-size: 12px; line-height: 1.7; }
        .track:not([aria-valuenow])::after {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, #746383, transparent);
          animation: drift 1.6s ease-in-out infinite;
          content: "";
        }
        .recovery { grid-row: 3; align-self: end; padding-top: 18px; text-align: center; }
        .retry { padding: 7px 12px; border: 1px solid #c5bfce; border-radius: 12px; color: #50455e; background: #ffffffb3; font: inherit; font-size: 12px; cursor: pointer; }
        .retry:focus-visible { outline: 2px solid #625579; outline-offset: 4px; }
        @keyframes drift { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        @media (max-height: 420px) {
          .emblem { width: 82px; height: 82px; margin-bottom: 18px; }
          .brand-mark { width: 44px; height: 44px; border-radius: 15px; font-size: 25px; }
          .status { margin-bottom: 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::after { transition: none !important; animation: none !important; }
        }
      </style>
      <section class="screen" aria-label="正在加载 Aurora Player">
        <div class="content">
          <div class="emblem" aria-hidden="true"><span class="orbit"></span><span class="brand-mark">A</span></div>
          <p class="brand">AURORA PLAYER</p>
          <h1>音乐空间</h1>
          <p class="status" role="status">正在准备页面</p>
          <div class="track" role="progressbar" aria-label="加载进度" aria-valuemin="0" aria-valuemax="100"><div class="fill"></div></div>
          <p class="hint">首次加载时间可能较长，请稍候。</p>
        </div>
        <div class="recovery"><button class="retry" type="button" hidden>重新加载页面</button></div>
      </section>`

    this.screen = this.shadowRoot.querySelector('.screen')
    this.track = this.shadowRoot.querySelector('.track')
    this.fill = this.shadowRoot.querySelector('.fill')
    this.status = this.shadowRoot.querySelector('.status')
    this.retry = this.shadowRoot.querySelector('.retry')
    this.progress = 0
    this.retry.addEventListener('click', () => window.location.reload())
    this.slowTimer = setTimeout(() => {
      this.status.textContent = '加载时间比平时长'
      this.retry.hidden = false
    }, 12000)
  }

  setProgress(value, label) {
    if (this.completion || !this.screen) return
    this.progress = Math.max(this.progress, Math.min(100, Number(value) || 0))
    this.track.setAttribute('aria-valuenow', String(Math.round(this.progress)))
    this.fill.style.transform = `scaleX(${this.progress / 100})`
    if (label && this.status.textContent !== label) this.status.textContent = label
  }

  finish({immediate = false} = {}) {
    if (this.completion) {
      if (immediate) this.remove()
      return this.completion
    }
    this.setProgress(100, '已就绪')
    clearTimeout(this.slowTimer)
    this.screen.classList.add('leaving')
    this.retry.disabled = true
    this.completion = new Promise(resolve => { this.resolveCompletion = resolve })
    if (immediate || matchMedia('(prefers-reduced-motion: reduce)').matches) this.remove()
    else this.leaveTimer = setTimeout(() => this.remove(), 240)
    return this.completion
  }

  disconnectedCallback() {
    clearTimeout(this.slowTimer)
    clearTimeout(this.leaveTimer)
    this.resolveCompletion?.()
  }
}

if (!customElements.get('aurora-loading-screen')) customElements.define('aurora-loading-screen', AuroraLoadingScreen)
