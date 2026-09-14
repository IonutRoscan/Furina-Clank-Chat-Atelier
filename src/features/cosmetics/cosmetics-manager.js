'use strict'


/*
  Developer notes

  Owns purely visual chat decoration such as particles, parallax, corner accents,
  HUD/frame skins and message ornaments. Decorations should live in Furina-owned
  nodes or CSS layers rather than hijacking Clank/message pseudo-elements, because
  Clank can rebuild message DOM while streaming.
*/
/*
    Cosmetics Manager

    ThemeManager stores the cosmetic choices. This manager handles the few
    effects that need real DOM elements or pointer/keyboard behavior:

    - floating particle layers
    - corner ornament layers
    - chat HUD / frame layers
    - background parallax
    - one-shot message entrance animation classes
    - temporary Screenshot Mode

    Most other cosmetic effects are pure CSS driven by the data attributes
    and CSS variables ThemeManager applies to <html>.
*/

;(() => {
  const Atelier = window.ClankAtelier

  if (!Atelier) {
    return
  }

  const Manager = {
    shell: null,
    particleLayer: null,
    ornamentLayer: null,
    hudLayer: null,
    hudRevealTimer: null,
    parallaxShell: null,
    parallaxMoveHandler: null,
    parallaxLeaveHandler: null,
    parallaxFrame: null,
    pendingParallax: null,
    screenshotMode: false,
    initialized: false,

    get settings() {
      return Atelier.ThemeManager?.settings || {}
    },

    init() {
      if (this.initialized) {
        return
      }

      this.initialized = true

      window.addEventListener('clank-atelier-theme-changed', () => {
        this.sync()
      })

      window.addEventListener('keydown', event => {
        if (event.key === 'Escape' && this.screenshotMode) {
          this.setScreenshotMode(false)
        }
      })
    },

    sync(shell = document.querySelector('.clank-atelier-chat-shell')) {
      this.shell = shell || null

      if (!this.shell) {
        this.removeParticles()
        this.removeOrnaments()
        this.removeHudFrame()
        this.removeHudMessageMarkers()
        this.detachParallax()
        return
      }

      this.syncParticles()
      this.syncOrnaments()
      this.syncHudFrame()
      this.syncHudMessageMarkers()
      this.syncParallax()
    },

    leaveChat() {
      this.removeParticles()
      this.removeOrnaments()
      this.removeHudFrame()
      this.removeHudMessageMarkers()
      this.detachParallax()
      this.shell = null
      this.setScreenshotMode(false, false)
    },

    // MESSAGE ENTRANCE

    decorateMessage(message, animate = true) {
      if (!(message instanceof HTMLElement)) {
        return
      }

      this.syncHudMessageMarker(message)

      if (!animate) {
        return
      }

      const animation = this.settings.messageEntranceAnimation || 'none'

      if (
        animation === 'none' ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      ) {
        return
      }

      if (message.dataset.furinaEntrancePlayed === 'true') {
        return
      }

      message.dataset.furinaEntrancePlayed = 'true'
      message.classList.add('furina-message-enter')

      const clear = () => {
        message.classList.remove('furina-message-enter')
        message.removeEventListener('animationend', clear)
      }

      message.addEventListener('animationend', clear)

      window.setTimeout(clear, animation === 'dream' ? 1200 : 850)
    },

    // PARTICLES

    particleGlyph(style) {
      return (
        {
          sparkles: '✦',
          dust: '·',
          petals: '❀',
          embers: '•',
          snow: '❄',
          hearts: '♥',
          stars: '★'
        }[style] || '✦'
      )
    },

    seeded(index, salt = 0) {
      const value = Math.sin((index + 1) * 9283.17 + salt * 71.31) * 43758.5453

      return value - Math.floor(value)
    },

    syncParticles() {
      const settings = this.settings
      const enabled = Boolean(settings.particlesEnabled)

      if (!enabled || !this.shell) {
        this.removeParticles()
        return
      }

      const density = Math.max(
        4,
        Math.min(40, Number(settings.particleDensity) || 18)
      )

      const speed = Math.max(
        0.35,
        Math.min(2.5, Number(settings.particleSpeed) || 1)
      )

      const style = settings.particleStyle || 'sparkles'
      const signature = `${style}|${density}|${speed}`

      if (
        this.particleLayer?.isConnected &&
        this.particleLayer.dataset.signature === signature
      ) {
        return
      }

      this.removeParticles()

      const layer = document.createElement('div')
      layer.className = 'furina-cosmetic-particles'
      layer.dataset.furinaOwned = 'true'
      layer.dataset.particleStyle = style
      layer.dataset.signature = signature
      layer.setAttribute('aria-hidden', 'true')

      const glyph = this.particleGlyph(style)

      for (let index = 0; index < density; index += 1) {
        const particle = document.createElement('span')
        particle.className = 'furina-cosmetic-particle'
        particle.textContent = glyph

        const x = this.seeded(index, 1) * 100
        const size = 0.55 + this.seeded(index, 2) * 1.05
        const delay = -this.seeded(index, 3) * 18
        const duration = (13 + this.seeded(index, 4) * 16) / speed
        const drift = -32 + this.seeded(index, 5) * 64
        const opacity = 0.2 + this.seeded(index, 6) * 0.55

        particle.style.setProperty('--furina-particle-x', `${x}%`)
        particle.style.setProperty('--furina-particle-size', `${size}rem`)
        particle.style.setProperty('--furina-particle-delay', `${delay}s`)
        particle.style.setProperty('--furina-particle-duration', `${duration}s`)
        particle.style.setProperty('--furina-particle-drift', `${drift}px`)
        particle.style.setProperty('--furina-particle-opacity', String(opacity))

        layer.appendChild(particle)
      }

      this.shell.appendChild(layer)
      this.particleLayer = layer
    },

    removeParticles() {
      if (this.particleLayer) {
        this.particleLayer.remove()
        this.particleLayer = null
      }

      document
        .querySelectorAll('.furina-cosmetic-particles')
        .forEach(layer => layer.remove())
    },

    // CORNER ORNAMENTS

    syncOrnaments() {
      const settings = this.settings
      const enabled = Boolean(settings.ornamentsEnabled)

      if (!enabled || !this.shell) {
        this.removeOrnaments()
        return
      }

      const style = settings.ornamentStyle || 'celestial'
      const customUrl =
        typeof settings.ornamentCustomUrl === 'string'
          ? settings.ornamentCustomUrl.trim()
          : ''

      const signature = `${style}|${customUrl}`

      if (
        !this.ornamentLayer?.isConnected ||
        this.ornamentLayer.dataset.signature !== signature
      ) {
        this.removeOrnaments()

        const layer = document.createElement('div')
        layer.className = 'furina-corner-ornaments'
        layer.dataset.furinaOwned = 'true'
        layer.dataset.ornamentStyle = style
        layer.dataset.signature = signature
        layer.setAttribute('aria-hidden', 'true')

        for (const corner of [
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right'
        ]) {
          const ornament = document.createElement('span')
          ornament.className = `furina-corner-ornament furina-corner-${corner}`
          ornament.dataset.corner = corner
          layer.appendChild(ornament)
        }

        this.shell.appendChild(layer)
        this.ornamentLayer = layer
      }

      const canUseCustom = style === 'custom' && /^https?:\/\//i.test(customUrl)

      this.ornamentLayer.classList.toggle(
        'furina-corner-ornaments-custom',
        canUseCustom
      )

      this.ornamentLayer.style.setProperty(
        '--furina-ornament-image',
        canUseCustom ? `url(${JSON.stringify(customUrl)})` : 'none'
      )
    },

    removeOrnaments() {
      if (this.ornamentLayer) {
        this.ornamentLayer.remove()
        this.ornamentLayer = null
      }

      document
        .querySelectorAll('.furina-corner-ornaments')
        .forEach(layer => layer.remove())
    },

    // CHAT HUD / FRAME SKINS

    hudLabel(style) {
      return (
        {
          arcane: 'ARCANE MATRIX',
          cyber: 'CYBER FRAME',
          gothic: 'GOTHIC VEIL',
          terminal: 'FURINA // HUD',
          luxe: 'ATELIER'
        }[style] || 'FURINA'
      )
    },

    hudGlyph(style) {
      return (
        {
          arcane: '◇',
          cyber: '⌁',
          gothic: '✢',
          terminal: '>_',
          luxe: '◆'
        }[style] || '✦'
      )
    },

    createHudCorner(position, glyph) {
      const corner = document.createElement('span')
      corner.className = `furina-hud-corner furina-hud-${position}`
      corner.dataset.corner = position

      const core = document.createElement('span')
      core.className = 'furina-hud-corner-core'

      const mark = document.createElement('span')
      mark.className = 'furina-hud-corner-glyph'
      mark.textContent = glyph

      corner.append(core, mark)
      return corner
    },

    createHudRail(position) {
      const rail = document.createElement('span')
      rail.className = `furina-hud-rail furina-hud-rail-${position}`
      rail.dataset.rail = position

      const line = document.createElement('span')
      line.className = 'furina-hud-rail-line'

      const node = document.createElement('span')
      node.className = 'furina-hud-rail-node'

      rail.append(line, node)
      return rail
    },

    syncHudFrame() {
      const settings = this.settings
      const style = settings.hudFrameStyle || 'none'

      if (style === 'none' || !this.shell) {
        this.removeHudFrame()
        return
      }

      const signature = style

      if (
        !this.hudLayer?.isConnected ||
        this.hudLayer.dataset.signature !== signature
      ) {
        this.removeHudFrame()

        const layer = document.createElement('div')
        layer.className = 'furina-hud-frame'
        layer.dataset.furinaOwned = 'true'
        layer.dataset.hudStyle = style
        layer.dataset.signature = signature
        layer.setAttribute('aria-hidden', 'true')

        const glyph = this.hudGlyph(style)

        for (const corner of [
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right'
        ]) {
          layer.appendChild(this.createHudCorner(corner, glyph))
        }

        for (const side of ['top', 'right', 'bottom', 'left']) {
          layer.appendChild(this.createHudRail(side))
        }

        const topBadge = document.createElement('span')
        topBadge.className = 'furina-hud-badge furina-hud-badge-top'
        topBadge.textContent = this.hudLabel(style)

        const leftSigil = document.createElement('span')
        leftSigil.className = 'furina-hud-sigil furina-hud-sigil-left'
        leftSigil.textContent = glyph

        const rightSigil = document.createElement('span')
        rightSigil.className = 'furina-hud-sigil furina-hud-sigil-right'
        rightSigil.textContent = glyph

        layer.append(topBadge, leftSigil, rightSigil)

        this.shell.appendChild(layer)
        this.hudLayer = layer
        this.replayHudFrame()
      }
    },

    replayHudFrame() {
      const layer = this.hudLayer
      if (!layer?.isConnected) {
        return false
      }

      if (
        !this.settings.hudFrameAnimation ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      ) {
        layer.classList.remove('furina-hud-frame-reveal')
        return false
      }

      if (this.hudRevealTimer) {
        clearTimeout(this.hudRevealTimer)
        this.hudRevealTimer = null
      }

      layer.classList.remove('furina-hud-frame-reveal')
      void layer.offsetWidth
      layer.classList.add('furina-hud-frame-reveal')

      this.hudRevealTimer = window.setTimeout(() => {
        layer.classList.remove('furina-hud-frame-reveal')
        this.hudRevealTimer = null
      }, 1150)

      return true
    },

    removeHudFrame() {
      if (this.hudRevealTimer) {
        clearTimeout(this.hudRevealTimer)
        this.hudRevealTimer = null
      }

      if (this.hudLayer) {
        this.hudLayer.remove()
        this.hudLayer = null
      }

      document
        .querySelectorAll('.furina-hud-frame')
        .forEach(layer => layer.remove())
    },

    // HUD MESSAGE ORNAMENTS

    hudMessageMarkersEnabled() {
      return (
        Boolean(this.settings.hudFrameMessageMarkers) &&
        (this.settings.hudFrameStyle || 'none') !== 'none'
      )
    },

    syncHudMessageMarker(message) {
      if (!(message instanceof HTMLElement)) {
        return
      }

      const existing = message.querySelector(
        ':scope .furina-hud-message-marker'
      )

      if (!this.hudMessageMarkersEnabled()) {
        existing?.remove()
        return
      }

      const assistant = message.classList.contains(
        'clank-atelier-message-assistant'
      )
      const user = message.classList.contains('clank-atelier-message-user')

      if (!assistant && !user) {
        existing?.remove()
        return
      }

      const anchor = assistant
        ? message.querySelector('.clank-atelier-message-body')
        : message.querySelector('.clank-atelier-user-bubble')

      if (!(anchor instanceof HTMLElement)) {
        existing?.remove()
        return
      }

      if (existing?.parentElement === anchor) {
        return
      }

      existing?.remove()

      const marker = document.createElement('span')
      marker.className = `furina-hud-message-marker furina-hud-message-marker-${
        assistant ? 'assistant' : 'user'
      }`
      marker.dataset.furinaOwned = 'true'
      marker.setAttribute('aria-hidden', 'true')

      anchor.appendChild(marker)
    },

    syncHudMessageMarkers() {
      if (!this.hudMessageMarkersEnabled()) {
        this.removeHudMessageMarkers()
        return
      }

      document
        .querySelectorAll('.clank-atelier-message')
        .forEach(message => this.syncHudMessageMarker(message))
    },

    removeHudMessageMarkers() {
      document
        .querySelectorAll('.furina-hud-message-marker')
        .forEach(marker => marker.remove())
    },

    // PARALLAX

    syncParallax() {
      const strength = Number(this.settings.parallaxStrength) || 0
      const reducedMotion = Boolean(
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      )

      if (!this.shell || strength <= 0 || reducedMotion) {
        this.detachParallax()
        return
      }

      if (this.parallaxShell === this.shell) {
        return
      }

      this.detachParallax()
      this.parallaxShell = this.shell

      this.parallaxMoveHandler = event => {
        if (!this.parallaxShell) {
          return
        }

        const rect = this.parallaxShell.getBoundingClientRect()

        if (!rect.width || !rect.height) {
          return
        }

        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2

        this.pendingParallax = {x, y}

        if (this.parallaxFrame) {
          return
        }

        this.parallaxFrame = requestAnimationFrame(() => {
          this.parallaxFrame = null

          const currentStrength = Number(this.settings.parallaxStrength) || 0
          const point = this.pendingParallax || {x: 0, y: 0}

          document.documentElement.style.setProperty(
            '--furina-parallax-x',
            `${(-point.x * currentStrength).toFixed(2)}px`
          )

          document.documentElement.style.setProperty(
            '--furina-parallax-y',
            `${(-point.y * currentStrength).toFixed(2)}px`
          )
        })
      }

      this.parallaxLeaveHandler = () => {
        document.documentElement.style.setProperty('--furina-parallax-x', '0px')
        document.documentElement.style.setProperty('--furina-parallax-y', '0px')
      }

      this.parallaxShell.addEventListener(
        'pointermove',
        this.parallaxMoveHandler,
        {passive: true}
      )

      this.parallaxShell.addEventListener(
        'pointerleave',
        this.parallaxLeaveHandler,
        {passive: true}
      )
    },

    detachParallax() {
      if (this.parallaxShell) {
        if (this.parallaxMoveHandler) {
          this.parallaxShell.removeEventListener(
            'pointermove',
            this.parallaxMoveHandler
          )
        }

        if (this.parallaxLeaveHandler) {
          this.parallaxShell.removeEventListener(
            'pointerleave',
            this.parallaxLeaveHandler
          )
        }
      }

      if (this.parallaxFrame) {
        cancelAnimationFrame(this.parallaxFrame)
        this.parallaxFrame = null
      }

      this.parallaxShell = null
      this.parallaxMoveHandler = null
      this.parallaxLeaveHandler = null
      this.pendingParallax = null

      document.documentElement.style.setProperty('--furina-parallax-x', '0px')
      document.documentElement.style.setProperty('--furina-parallax-y', '0px')
    },

    // SCREENSHOT MODE

    setScreenshotMode(enabled, showNotice = true) {
      this.screenshotMode = Boolean(enabled)

      document.documentElement.classList.toggle(
        'furina-screenshot-mode',
        this.screenshotMode
      )

      if (!this.screenshotMode) {
        document
          .querySelectorAll('.furina-screenshot-notice')
          .forEach(notice => notice.remove())
        return
      }

      Atelier.PanelShell?.close?.()

      if (!showNotice) {
        return
      }

      const notice = document.createElement('div')
      notice.className = 'furina-screenshot-notice'
      notice.dataset.furinaOwned = 'true'
      notice.textContent = 'Screenshot Mode · Press Esc to exit'
      document.body.appendChild(notice)

      Atelier.I18n?.observeRoot?.(notice)

      requestAnimationFrame(() => {
        notice.classList.add('furina-screenshot-notice-visible')
      })

      window.setTimeout(() => {
        notice.classList.remove('furina-screenshot-notice-visible')
        window.setTimeout(() => notice.remove(), 240)
      }, 1800)
    },

    toggleScreenshotMode() {
      this.setScreenshotMode(!this.screenshotMode)
      return this.screenshotMode
    }
  }

  Atelier.CosmeticsManager = Manager
  Manager.init()
})()
