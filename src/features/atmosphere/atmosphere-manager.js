'use strict'


/*
  Developer notes

  Manages local atmosphere overlays and presets for one conversation. Effects are
  visual-only and must clean up their DOM when disabled or when the active chat
  changes. Keep animation work lightweight because effects can run for long RP
  sessions.
*/
/*
    Atmosphere Manager

    Creates optional visual effects above the chat background. Settings are conversation-scoped and the effect layer is rebuilt only from Furina-owned DOM.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  // Atmosphere manager

  Atelier.AtmosphereManager = {
    STORAGE_KEY: 'furina-conversation-atmosphere',

    conversationId: null,

    shell: null,

    layer: null,

    settings: {
      enabled: false,
      effect: 'motes',
      intensity: 0.35,
      speed: 1
    },

    EFFECTS: new Set([
      'motes',
      'rain',
      'fog',
      'grain',
      'scanlines',
      'snow',
      'embers',
      'sparkles'
    ]),

    PRESETS: {
      rainyNight: {
        name: 'Rainy Night',

        effect: 'rain',

        intensity: 0.48,

        speed: 1.25
      },

      snowfall: {
        name: 'Snowfall',

        effect: 'snow',

        intensity: 0.48,

        speed: 0.75
      },

      emberRoom: {
        name: 'Ember Room',

        effect: 'embers',

        intensity: 0.42,

        speed: 0.85
      },

      arcaneGlow: {
        name: 'Arcane Glow',

        effect: 'sparkles',

        intensity: 0.5,

        speed: 0.8
      },

      dreamFog: {
        name: 'Dream Fog',

        effect: 'fog',

        intensity: 0.4,

        speed: 0.55
      },

      subtleMotes: {
        name: 'Quiet Motes',

        effect: 'motes',

        intensity: 0.32,

        speed: 0.65
      },

      crt: {
        name: 'CRT',

        effect: 'scanlines',

        intensity: 0.38,

        speed: 1
      },

      oldFilm: {
        name: 'Old Film',

        effect: 'grain',

        intensity: 0.3,

        speed: 1
      }
    },

    getDefaults() {
      return {
        enabled: false,
        effect: 'motes',
        intensity: 0.35,
        speed: 1
      }
    },

    async getStoredSettings() {
      return await Atelier.Storage.getObject(this.STORAGE_KEY, {})
    },

    sanitizeSettings(values) {
      const defaults = this.getDefaults()

      if (!values || typeof values !== 'object' || Array.isArray(values)) {
        return defaults
      }

      const intensity = Number(values.intensity)
      const speed = Number(values.speed)

      return {
        enabled: Boolean(values.enabled),
        effect: this.EFFECTS.has(values.effect)
          ? values.effect
          : defaults.effect,
        intensity: Number.isFinite(intensity)
          ? Math.max(0.05, Math.min(1, intensity))
          : defaults.intensity,
        speed: Number.isFinite(speed)
          ? Math.max(0.25, Math.min(2.5, speed))
          : defaults.speed
      }
    },

    async loadConversation(conversationId) {
      this.conversationId = conversationId

      if (!conversationId) {
        this.settings = this.getDefaults()
        this.render()
        return
      }

      const stored = await this.getStoredSettings()

      if (this.conversationId !== conversationId) {
        return
      }

      this.settings = this.sanitizeSettings(stored[conversationId])
      this.render()
    },

    async save() {
      const conversationId = this.conversationId

      if (!conversationId) {
        return
      }

      const snapshot = this.sanitizeSettings(this.settings)

      await Atelier.Storage.updateObject(this.STORAGE_KEY, stored => {
        stored[conversationId] = snapshot
        return stored
      })
    },

    async update(key, value) {
      if (!Object.prototype.hasOwnProperty.call(this.settings, key)) {
        return
      }

      if (key === 'enabled') {
        this.settings.enabled = Boolean(value)
      } else if (key === 'effect') {
        if (!this.EFFECTS.has(value)) {
          return
        }
        this.settings.effect = value
      } else if (key === 'intensity') {
        const number = Number(value)
        this.settings.intensity = Number.isFinite(number)
          ? Math.max(0.05, Math.min(1, number))
          : 0.35
      } else if (key === 'speed') {
        const number = Number(value)
        this.settings.speed = Number.isFinite(number)
          ? Math.max(0.25, Math.min(2.5, number))
          : 1
      }

      this.render()
      await this.save()
    },

    attach(shell) {
      if (!(shell instanceof HTMLElement)) {
        return
      }

      if (this.shell === shell && this.layer && this.layer.isConnected) {
        return
      }

      this.destroyLayer()
      this.shell = shell

      const layer = document.createElement('div')
      layer.className = 'furina-atmosphere-layer'
      layer.dataset.furinaOwned = 'true'
      shell.appendChild(layer)
      this.layer = layer
      this.render()
    },

    destroyLayer() {
      if (this.layer) {
        this.layer.remove()
      }

      this.layer = null
      this.shell = null
    },

    createMotes() {
      if (!this.layer) {
        return
      }

      for (let index = 0; index < 16; index += 1) {
        const mote = document.createElement('span')
        mote.className = 'furina-atmosphere-mote'

        const size = 2 + Math.random() * 5
        const left = Math.random() * 100
        const delay = Math.random() * -18
        const drift = Math.random() * 90 - 45
        const duration =
          (14 + Math.random() * 18) / Math.max(0.25, this.settings.speed)

        mote.style.setProperty('--furina-mote-size', `${size}px`)
        mote.style.setProperty('--furina-mote-left', `${left}%`)
        mote.style.setProperty('--furina-mote-delay', `${delay}s`)
        mote.style.setProperty('--furina-mote-drift', `${drift}px`)
        mote.style.setProperty('--furina-mote-duration', `${duration}s`)

        this.layer.appendChild(mote)
      }
    },

    createRain() {
      if (!this.layer) {
        return
      }

      /*
                Individual rain drops give us natural variation without
                needing canvas or WebGL.

                A moderate count is enough because the CSS background
                underneath supplies the distant rain.
            */

      const count = 52

      for (let index = 0; index < count; index += 1) {
        const drop = document.createElement('span')

        drop.className = 'furina-atmosphere-rain-drop'

        const depth = Math.random()

        const left = Math.random() * 116 - 8

        const height = 18 + depth * 46

        const width = 0.6 + depth * 1.15

        const opacity = 0.18 + depth * 0.62

        const speed = Math.max(0.25, this.settings.speed)

        /*
                    Foreground drops move faster.
                */

        const duration = (0.62 + (1 - depth) * 0.9) / speed

        const delay = Math.random() * -4

        const drift = 34 + depth * 56

        drop.style.setProperty('--furina-rain-left', `${left}%`)

        drop.style.setProperty('--furina-rain-height', `${height}px`)

        drop.style.setProperty('--furina-rain-width', `${width}px`)

        drop.style.setProperty('--furina-rain-opacity', String(opacity))

        drop.style.setProperty('--furina-rain-drop-duration', `${duration}s`)

        drop.style.setProperty('--furina-rain-drop-delay', `${delay}s`)

        drop.style.setProperty('--furina-rain-drift', `${drift}px`)

        this.layer.appendChild(drop)
      }
    },

    createSnow() {
      if (!this.layer) {
        return
      }

      const count = 34

      for (let index = 0; index < count; index += 1) {
        const flake = document.createElement('span')

        flake.className = 'furina-atmosphere-snowflake'

        const size = 2 + Math.random() * 6

        const left = Math.random() * 100

        const drift = Math.random() * 120 - 60

        const speed = Math.max(0.25, this.settings.speed)

        const duration = (8 + Math.random() * 12) / speed

        const delay = Math.random() * -16

        flake.style.setProperty('--furina-snow-size', `${size}px`)

        flake.style.setProperty('--furina-snow-left', `${left}%`)

        flake.style.setProperty('--furina-snow-drift', `${drift}px`)

        flake.style.setProperty('--furina-snow-duration', `${duration}s`)

        flake.style.setProperty('--furina-snow-delay', `${delay}s`)

        this.layer.appendChild(flake)
      }
    },

    createEmbers() {
      if (!this.layer) {
        return
      }

      const count = 24

      for (let index = 0; index < count; index += 1) {
        const ember = document.createElement('span')

        ember.className = 'furina-atmosphere-ember'

        const size = 1.5 + Math.random() * 4

        const left = Math.random() * 100

        const drift = Math.random() * 130 - 65

        const speed = Math.max(0.25, this.settings.speed)

        const duration = (5 + Math.random() * 8) / speed

        const delay = Math.random() * -10

        ember.style.setProperty('--furina-ember-size', `${size}px`)

        ember.style.setProperty('--furina-ember-left', `${left}%`)

        ember.style.setProperty('--furina-ember-drift', `${drift}px`)

        ember.style.setProperty('--furina-ember-duration', `${duration}s`)

        ember.style.setProperty('--furina-ember-delay', `${delay}s`)

        this.layer.appendChild(ember)
      }
    },

    createSparkles() {
      if (!this.layer) {
        return
      }

      const count = 22

      for (let index = 0; index < count; index += 1) {
        const sparkle = document.createElement('span')

        sparkle.className = 'furina-atmosphere-sparkle'

        const size = 3 + Math.random() * 8

        sparkle.style.setProperty('--furina-sparkle-size', `${size}px`)

        sparkle.style.setProperty(
          '--furina-sparkle-left',
          `${Math.random() * 100}%`
        )

        sparkle.style.setProperty(
          '--furina-sparkle-top',
          `${Math.random() * 100}%`
        )

        sparkle.style.setProperty(
          '--furina-sparkle-delay',
          `${Math.random() * -7}s`
        )

        sparkle.style.setProperty(
          '--furina-sparkle-duration',
          `${(2.4 + Math.random() * 4) / Math.max(0.25, this.settings.speed)}s`
        )

        this.layer.appendChild(sparkle)
      }
    },

    render() {
      if (!this.layer) {
        return
      }

      this.layer.replaceChildren()
      this.layer.className = 'furina-atmosphere-layer'
      this.layer.dataset.effect = this.settings.effect
      this.layer.classList.toggle(
        'furina-atmosphere-enabled',
        Boolean(this.settings.enabled)
      )

      this.layer.style.setProperty(
        '--furina-atmosphere-intensity',
        String(this.settings.intensity)
      )

      const speed = Math.max(0.25, this.settings.speed)
      this.layer.style.setProperty('--furina-rain-duration', `${1.15 / speed}s`)
      this.layer.style.setProperty('--furina-fog-duration', `${22 / speed}s`)
      this.layer.style.setProperty(
        '--furina-grain-duration',
        `${0.22 / speed}s`
      )
      this.layer.style.setProperty('--furina-scan-duration', `${7 / speed}s`)

      if (!this.settings.enabled) {
        return
      }

      switch (this.settings.effect) {
        case 'motes':
          this.createMotes()

          break

        case 'rain':
          this.createRain()

          break

        case 'snow':
          this.createSnow()

          break

        case 'embers':
          this.createEmbers()

          break

        case 'sparkles':
          this.createSparkles()

          break
      }
    },

    async syncConversation(shell) {
      const conversationId =
        typeof Atelier.getConversationId === 'function'
          ? Atelier.getConversationId()
          : null

      const changed = conversationId !== this.conversationId

      this.attach(shell)

      if (changed) {
        await this.loadConversation(conversationId)
      }
    },

    async applyPreset(presetId) {
      const preset = this.PRESETS[presetId]

      if (!preset) {
        return false
      }

      this.settings = {
        ...this.settings,

        enabled: true,

        effect: preset.effect,

        intensity: preset.intensity,

        speed: preset.speed
      }

      this.render()

      await this.save()

      return true
    },

    async reset() {
      this.settings = this.getDefaults()
      this.render()
      await this.save()
    }
  }
})()
