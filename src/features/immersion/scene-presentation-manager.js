'use strict'


/*
  Developer notes

  Owns one-shot scene presentation effects: title cards, transitions, persistent
  scene captions and screenshot presentation state. These are local visual tools
  and must never alter message text. Transition cleanup timers need to stay in
  sync with CSS animation durations so overlays cannot become stuck.
*/
/*
    Scene Presentation Manager

    Adds normal-chat scene cards, manual transitions, a compact scene caption,
    reusable atmosphere bundles, and screenshot controls. It deliberately does
    not query or modify Phantom Chat or Visual Novel Mode DOM.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  const clean = (value, length = 200) =>
    String(value || '')
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, length)

  const clone = value => JSON.parse(JSON.stringify(value))

  Atelier.ScenePresentationManager = {
    STORAGE_KEY: 'furina-conversation-scene-presentation',
    conversationId: null,
    caption: null,
    overlay: null,
    screenshotBackup: null,
    countdownTimer: null,

    BUILTIN_PRESETS: [
      {
        id: 'midnight-storm',
        name: 'Midnight Storm',
        builtin: true,
        atmosphere: {enabled: true, effect: 'rain', intensity: 0.5, speed: 1.2},
        theme: {
          backgroundBrightness: 0.72,
          backgroundContrast: 1.08,
          backgroundSaturation: 0.82,
          backgroundSepia: 0,
          backgroundHue: -10
        },
        scene: {weather: 'Heavy rain', mood: 'Tense and nocturnal'}
      },
      {
        id: 'haunted-interior',
        name: 'Haunted Interior',
        builtin: true,
        atmosphere: {
          enabled: true,
          effect: 'fog',
          intensity: 0.42,
          speed: 0.55
        },
        theme: {
          backgroundBrightness: 0.62,
          backgroundContrast: 1.16,
          backgroundSaturation: 0.55,
          backgroundSepia: 0.12,
          backgroundHue: -12
        },
        scene: {weather: 'Still air', mood: 'Unsettling and watchful'}
      },
      {
        id: 'warm-evening',
        name: 'Warm Evening',
        builtin: true,
        atmosphere: {
          enabled: true,
          effect: 'motes',
          intensity: 0.28,
          speed: 0.6
        },
        theme: {
          backgroundBrightness: 0.94,
          backgroundContrast: 1.02,
          backgroundSaturation: 1.08,
          backgroundSepia: 0.16,
          backgroundHue: 4
        },
        scene: {weather: 'Clear evening', mood: 'Warm and intimate'}
      },
      {
        id: 'snowbound-silence',
        name: 'Snowbound Silence',
        builtin: true,
        atmosphere: {
          enabled: true,
          effect: 'snow',
          intensity: 0.46,
          speed: 0.65
        },
        theme: {
          backgroundBrightness: 0.86,
          backgroundContrast: 0.96,
          backgroundSaturation: 0.72,
          backgroundSepia: 0,
          backgroundHue: -4
        },
        scene: {weather: 'Falling snow', mood: 'Quiet and isolated'}
      },
      {
        id: 'battle-aftermath',
        name: 'Battle Aftermath',
        builtin: true,
        atmosphere: {
          enabled: true,
          effect: 'embers',
          intensity: 0.45,
          speed: 0.8
        },
        theme: {
          backgroundBrightness: 0.68,
          backgroundContrast: 1.22,
          backgroundSaturation: 0.78,
          backgroundSepia: 0.2,
          backgroundHue: -5
        },
        scene: {weather: 'Smoke and ash', mood: 'Exhausted and dangerous'}
      },
      {
        id: 'arcane-night',
        name: 'Arcane Night',
        builtin: true,
        atmosphere: {
          enabled: true,
          effect: 'sparkles',
          intensity: 0.44,
          speed: 0.72
        },
        theme: {
          backgroundBrightness: 0.78,
          backgroundContrast: 1.06,
          backgroundSaturation: 1.18,
          backgroundSepia: 0,
          backgroundHue: 9
        },
        scene: {weather: 'Clear night', mood: 'Mysterious and luminous'}
      },
      {
        id: 'clean-stage',
        name: 'Clean Stage',
        builtin: true,
        atmosphere: {
          enabled: false,
          effect: 'motes',
          intensity: 0.35,
          speed: 1
        },
        theme: {
          backgroundBrightness: 1,
          backgroundContrast: 1,
          backgroundSaturation: 1,
          backgroundSepia: 0,
          backgroundHue: 0
        },
        scene: {weather: '', mood: ''}
      }
    ],

    getDefaults() {
      return {
        captionEnabled: false,
        captionStyle: 'minimal',
        cardStyle: 'cinematic',
        cardDuration: 3200,
        defaultTransition: 'fade-black',
        customPresets: [],
        screenshot: {
          hideComposer: true,
          hideAvatars: false,
          hideActions: true,
          hideSidebar: false,
          wideLayout: true,
          cleanSpacing: true,
          showCaption: true,
          countdown: 3
        }
      }
    },

    sanitizeSettings(values) {
      const defaults = this.getDefaults()
      const source =
        values && typeof values === 'object' && !Array.isArray(values)
          ? values
          : {}
      const cardStyles = new Set(['minimal', 'cinematic', 'theatrical', 'soft'])
      const transitions = new Set([
        'fade-black',
        'theme-color',
        'white-flash',
        'red-impact',
        'soft-dissolve',
        'brief-blur',
        'time-passes'
      ])
      const duration = Number(source.cardDuration)
      const screenshot =
        source.screenshot && typeof source.screenshot === 'object'
          ? source.screenshot
          : {}
      const customPresets = Array.isArray(source.customPresets)
        ? source.customPresets
            .slice(0, 30)
            .map(item => this.sanitizePreset(item))
            .filter(Boolean)
        : []

      return {
        captionEnabled: Boolean(source.captionEnabled),
        captionStyle: cardStyles.has(source.captionStyle)
          ? source.captionStyle
          : defaults.captionStyle,
        cardStyle: cardStyles.has(source.cardStyle)
          ? source.cardStyle
          : defaults.cardStyle,
        cardDuration: Number.isFinite(duration)
          ? Math.max(1200, Math.min(8000, duration))
          : defaults.cardDuration,
        defaultTransition: transitions.has(source.defaultTransition)
          ? source.defaultTransition
          : defaults.defaultTransition,
        customPresets,
        screenshot: {
          hideComposer: screenshot.hideComposer !== false,
          hideAvatars: Boolean(screenshot.hideAvatars),
          hideActions: screenshot.hideActions !== false,
          hideSidebar: Boolean(screenshot.hideSidebar),
          wideLayout: screenshot.wideLayout !== false,
          cleanSpacing: screenshot.cleanSpacing !== false,
          showCaption: screenshot.showCaption !== false,
          countdown: [0, 3, 5, 10].includes(Number(screenshot.countdown))
            ? Number(screenshot.countdown)
            : defaults.screenshot.countdown
        }
      }
    },

    sanitizePreset(value) {
      if (!value || typeof value !== 'object') return null
      const name = clean(value.name, 80)
      if (!name) return null
      const atmosphere = Atelier.AtmosphereManager?.sanitizeSettings
        ? Atelier.AtmosphereManager.sanitizeSettings(value.atmosphere)
        : clone(value.atmosphere || {})
      const ambience = Atelier.AmbienceManager?.sanitizeSettings
        ? Atelier.AmbienceManager.sanitizeSettings(value.ambience)
        : clone(value.ambience || {})
      const themeSource = value.theme || {}
      const theme = {}
      for (const key of [
        'backgroundBrightness',
        'backgroundContrast',
        'backgroundSaturation',
        'backgroundSepia',
        'backgroundHue'
      ]) {
        const number = Number(themeSource[key])
        if (Number.isFinite(number)) theme[key] = number
      }
      return {
        id:
          clean(value.id, 100) ||
          `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        builtin: Boolean(value.builtin),
        atmosphere,
        ambience,
        theme,
        scene: {
          mood: clean(value.scene?.mood, 300),
          weather: clean(value.scene?.weather, 300)
        }
      }
    },

    async loadConversation(conversationId) {
      this.conversationId = conversationId
      if (!conversationId) {
        this.settings = this.getDefaults()
      } else {
        const stored = await Atelier.Storage.getObject(this.STORAGE_KEY, {})
        if (this.conversationId !== conversationId) return
        this.settings = this.sanitizeSettings(stored[conversationId])
      }
      this.refreshCaption()
    },

    async syncConversation() {
      const id =
        typeof Atelier.getConversationId === 'function'
          ? Atelier.getConversationId()
          : null
      if (id === this.conversationId) {
        this.refreshCaption()
        return false
      }
      await this.loadConversation(id)
      return true
    },

    async save() {
      if (!this.conversationId) return
      const snapshot = this.sanitizeSettings(this.settings)
      this.settings = snapshot
      await Atelier.Storage.updateObject(this.STORAGE_KEY, stored => {
        stored[this.conversationId] = snapshot
        return stored
      })
    },

    async update(values) {
      this.settings = this.sanitizeSettings({...this.settings, ...values})
      this.refreshCaption()
      await this.save()
    },

    isAlternateInterfaceOpen() {
      return (
        document.body.classList.contains('furina-phantom-open') ||
        Boolean(Atelier.VisualNovelManager?.isActive)
      )
    },

    getSceneCaptionText() {
      const scene = Atelier.SceneStateManager?.settings || {}
      const primary = clean(scene.title || scene.location, 160)
      const secondary = [
        clean(scene.sceneNumber, 60),
        clean(scene.location, 120),
        clean(scene.time, 100)
      ]
        .filter(Boolean)
        .filter(
          (value, index, list) =>
            list.indexOf(value) === index && value !== primary
        )
        .join(' · ')
      return {primary, secondary}
    },

    refreshCaption() {
      if (!this.settings?.captionEnabled || this.isAlternateInterfaceOpen()) {
        this.caption?.remove()
        this.caption = null
        return
      }
      const text = this.getSceneCaptionText()
      if (!text.primary && !text.secondary) {
        this.caption?.remove()
        this.caption = null
        return
      }
      if (!this.caption?.isConnected) {
        this.caption = document.createElement('aside')
        this.caption.className = 'furina-scene-caption'
        this.caption.dataset.furinaOwned = 'true'
        this.caption.setAttribute('aria-label', 'Current scene')
        document.body.append(this.caption)
      }
      this.caption.className = `furina-scene-caption furina-scene-caption-${this.settings.captionStyle}`
      this.caption.replaceChildren()
      if (text.primary) {
        const strong = document.createElement('strong')
        strong.textContent = text.primary
        this.caption.append(strong)
      }
      if (text.secondary) {
        const span = document.createElement('span')
        span.textContent = text.secondary
        this.caption.append(span)
      }
    },

    clearOverlay() {
      clearTimeout(this.overlayTimer)
      this.overlay?.remove()
      this.overlay = null
    },

    showTitleCard({
      kind = 'scene',
      title = '',
      subtitle = '',
      style,
      duration
    } = {}) {
      if (this.isAlternateInterfaceOpen()) return false
      const safeTitle = clean(title, 200)
      if (!safeTitle) return false
      this.clearOverlay()
      const overlay = document.createElement('div')
      overlay.className = `furina-scene-card furina-scene-card-${style || this.settings.cardStyle}`
      overlay.dataset.furinaOwned = 'true'
      const content = document.createElement('div')
      content.className = 'furina-scene-card-content'
      const eyebrow = document.createElement('div')
      eyebrow.className = 'furina-scene-card-kind'
      eyebrow.textContent = clean(kind, 40).replace(/-/g, ' ')
      const heading = document.createElement('div')
      heading.className = 'furina-scene-card-title'
      heading.textContent = safeTitle
      content.append(eyebrow, heading)
      if (clean(subtitle, 300)) {
        const sub = document.createElement('div')
        sub.className = 'furina-scene-card-subtitle'
        sub.textContent = clean(subtitle, 300)
        content.append(sub)
      }
      overlay.append(content)
      document.body.append(overlay)
      this.overlay = overlay
      requestAnimationFrame(() =>
        overlay.classList.add('furina-scene-card-visible')
      )
      const wait = Number(duration) || this.settings.cardDuration
      this.overlayTimer = setTimeout(() => {
        overlay.classList.remove('furina-scene-card-visible')
        setTimeout(() => this.clearOverlay(), 420)
      }, wait)
      return true
    },

    playTransition(type = this.settings.defaultTransition, label = '') {
      if (this.isAlternateInterfaceOpen()) return false
      document.querySelector('.furina-scene-transition')?.remove()
      const transition = document.createElement('div')
      transition.className = `furina-scene-transition furina-transition-${clean(type, 40)}`
      transition.dataset.furinaOwned = 'true'
      if (label) {
        const text = document.createElement('span')
        text.textContent = clean(label, 120)
        transition.append(text)
      }
      document.body.append(transition)
      requestAnimationFrame(() =>
        transition.classList.add('furina-scene-transition-run')
      )
      const durations = {
        'fade-black': 1320,
        'theme-color': 1180,
        'white-flash': 760,
        'red-impact': 920,
        'soft-dissolve': 1560,
        'brief-blur': 1040,
        'time-passes': 2280
      }
      setTimeout(
        () => transition.remove(),
        durations[clean(type, 40)] || 1320
      )
      return true
    },

    getPresets() {
      return [
        ...this.BUILTIN_PRESETS.map(clone),
        ...this.settings.customPresets.map(clone)
      ]
    },

    async capturePreset(name) {
      const preset = this.sanitizePreset({
        name,
        atmosphere: clone(Atelier.AtmosphereManager?.settings || {}),
        ambience: clone(Atelier.AmbienceManager?.settings || {}),
        theme: clone(Atelier.ThemeManager?.settings || {}),
        scene: {
          mood: Atelier.SceneStateManager?.settings?.mood || '',
          weather: Atelier.SceneStateManager?.settings?.weather || ''
        }
      })
      if (!preset) return false
      this.settings.customPresets.push(preset)
      await this.save()
      return preset
    },

    async removePreset(id) {
      const before = this.settings.customPresets.length
      this.settings.customPresets = this.settings.customPresets.filter(
        item => item.id !== id
      )
      if (this.settings.customPresets.length === before) return false
      await this.save()
      return true
    },

    async applyPreset(id, {includeScene = true} = {}) {
      const preset = this.getPresets().find(item => item.id === id)
      if (!preset) return false
      const atmosphere = Atelier.AtmosphereManager
      if (atmosphere) {
        atmosphere.settings = atmosphere.sanitizeSettings(preset.atmosphere)
        atmosphere.render()
        await atmosphere.save()
      }
      if (Atelier.ThemeManager && Object.keys(preset.theme || {}).length) {
        await Atelier.ThemeManager.updateMany(preset.theme)
      }
      const ambience = Atelier.AmbienceManager
      if (!preset.builtin && ambience && preset.ambience) {
        ambience.settings = ambience.sanitizeSettings(preset.ambience)
        ambience.syncAudioSource()
        ambience.renderPlayer()
        await ambience.save()
      }
      if (includeScene && Atelier.SceneStateManager) {
        await Atelier.SceneStateManager.updateMany(preset.scene || {})
      }
      this.refreshCaption()
      return true
    },

    async startScreenshot(options = this.settings.screenshot) {
      if (this.isAlternateInterfaceOpen()) return false
      const safe = this.sanitizeSettings({
        ...this.settings,
        screenshot: options
      }).screenshot
      await this.update({screenshot: safe})
      const begin = () => {
        this.screenshotBackup = {
          captionDisplay: this.caption?.style.display || ''
        }
        document.documentElement.classList.add('furina-presentation-screenshot')
        document.documentElement.classList.toggle(
          'furina-ps-hide-composer',
          safe.hideComposer
        )
        document.documentElement.classList.toggle(
          'furina-ps-hide-actions',
          safe.hideActions
        )
        document.documentElement.classList.toggle(
          'furina-ps-hide-sidebar',
          safe.hideSidebar
        )
        document.documentElement.classList.toggle(
          'furina-ps-hide-avatars',
          safe.hideAvatars
        )
        document.documentElement.classList.toggle(
          'furina-ps-wide',
          safe.wideLayout
        )
        document.documentElement.classList.toggle(
          'furina-ps-clean',
          safe.cleanSpacing
        )
        document.documentElement.classList.toggle(
          'furina-screenshot-show-caption',
          safe.showCaption
        )
        if (this.caption)
          this.caption.style.display = safe.showCaption ? '' : 'none'
      }
      if (!safe.countdown) {
        begin()
        return true
      }
      let remaining = safe.countdown
      const countdown = document.createElement('div')
      countdown.className = 'furina-screenshot-countdown'
      countdown.dataset.furinaOwned = 'true'
      countdown.textContent = String(remaining)
      document.body.append(countdown)
      clearInterval(this.countdownTimer)
      this.countdownTimer = setInterval(() => {
        remaining -= 1
        if (remaining <= 0) {
          clearInterval(this.countdownTimer)
          this.countdownTimer = null
          countdown.remove()
          begin()
        } else countdown.textContent = String(remaining)
      }, 1000)
      return true
    },

    exitScreenshot() {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
      document.querySelector('.furina-screenshot-countdown')?.remove()
      if (this.caption && this.screenshotBackup)
        this.caption.style.display = this.screenshotBackup.captionDisplay
      this.screenshotBackup = null
      document.documentElement.classList.remove(
        'furina-presentation-screenshot',
        'furina-ps-hide-composer',
        'furina-ps-hide-actions',
        'furina-ps-hide-sidebar',
        'furina-ps-hide-avatars',
        'furina-ps-wide',
        'furina-ps-clean',
        'furina-screenshot-show-caption'
      )
    }
  }

  Atelier.ScenePresentationManager.settings =
    Atelier.ScenePresentationManager.getDefaults()

  document.addEventListener(
    'keydown',
    event => {
      if (
        event.key === 'Escape' &&
        (Atelier.ScenePresentationManager.screenshotBackup ||
          Atelier.ScenePresentationManager.countdownTimer)
      ) {
        Atelier.ScenePresentationManager.exitScreenshot()
      }
    },
    true
  )
})()
