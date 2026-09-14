'use strict'


/*
  Developer notes

  Stores a compact, conversation-scoped snapshot of what is currently true in
  the roleplay: location, time, cast, objective, threat and conditions. Scene
  State can be saved without being injected; the include/inject setting controls
  whether DirectorManager adds it to outgoing context.
*/
/*
    Scene State Manager

    Owns short-term, per-conversation RP context such as the current
    location, time, present characters, and immediate scene details.

    Scene State does not send messages itself. Director Manager reads
    it when Furina prepares the normal outgoing Clank message.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  Atelier.SceneStateManager = {
    STORAGE_KEY: 'furina-conversation-scene-state',

    conversationId: null,

    settings: {
      title: '',

      sceneNumber: '',

      location: '',

      time: '',

      present: '',

      absent: '',

      weather: '',

      mood: '',

      objective: '',

      threat: '',

      conditions: '',

      notes: '',

      includeInDirector: true
    },

    getDefaults() {
      return {
        title: '',

        sceneNumber: '',

        location: '',

        time: '',

        present: '',

        absent: '',

        weather: '',

        mood: '',

        objective: '',

        threat: '',

        conditions: '',

        notes: '',

        includeInDirector: true
      }
    },

    sanitizeSettings(values) {
      const source =
        values && typeof values === 'object' && !Array.isArray(values)
          ? values
          : {}

      const cleanText = (value, maxLength) =>
        String(value || '')
          .replace(/\[\/?FURINA_[A-Z0-9_]+\]/gi, '')
          .trim()
          .slice(0, maxLength)

      return {
        title: cleanText(source.title, 200),

        sceneNumber: cleanText(source.sceneNumber, 80),

        location: cleanText(source.location, 300),

        time: cleanText(source.time, 200),

        present: cleanText(source.present, 600),

        absent: cleanText(source.absent, 600),

        weather: cleanText(source.weather, 300),

        mood: cleanText(source.mood, 300),

        objective: cleanText(source.objective, 800),

        threat: cleanText(source.threat, 800),

        conditions: cleanText(source.conditions, 1200),

        notes: cleanText(source.notes, 3000),

        includeInDirector: source.includeInDirector !== false
      }
    },

    async getStoredSettings() {
      return await Atelier.Storage.getObject(this.STORAGE_KEY, {})
    },

    async loadConversation(conversationId) {
      this.conversationId = conversationId

      if (!conversationId) {
        this.settings = this.getDefaults()

        return
      }

      const stored = await this.getStoredSettings()

      if (this.conversationId !== conversationId) {
        return
      }

      this.settings = this.sanitizeSettings(stored[conversationId])
    },

    async syncConversation() {
      const conversationId =
        typeof Atelier.getConversationId === 'function'
          ? Atelier.getConversationId()
          : null

      if (conversationId === this.conversationId) {
        return false
      }

      await this.loadConversation(conversationId)

      return true
    },

    async save() {
      const conversationId = this.conversationId

      if (!conversationId) {
        return
      }

      const snapshot = this.sanitizeSettings(this.settings)

      this.settings = snapshot

      await Atelier.Storage.updateObject(this.STORAGE_KEY, stored => {
        stored[conversationId] = snapshot

        return stored
      })
    },

    async updateMany(values) {
      this.settings = this.sanitizeSettings({
        ...this.settings,
        ...values
      })

      await this.save()

      return true
    },

    hasContent() {
      return Boolean(
        this.settings.title ||
        this.settings.sceneNumber ||
        this.settings.location ||
        this.settings.time ||
        this.settings.present ||
        this.settings.absent ||
        this.settings.weather ||
        this.settings.mood ||
        this.settings.objective ||
        this.settings.threat ||
        this.settings.conditions ||
        this.settings.notes
      )
    },

    shouldInject() {
      return Boolean(this.settings.includeInDirector && this.hasContent())
    },

    buildBlock() {
      if (!this.shouldInject()) {
        return ''
      }

      const lines = ['[SCENE_STATE]']

      if (this.settings.title) {
        lines.push(`Scene: ${this.settings.title}`)
      }

      if (this.settings.sceneNumber) {
        lines.push(`Scene number: ${this.settings.sceneNumber}`)
      }

      if (this.settings.location) {
        lines.push(`Location: ${this.settings.location}`)
      }

      if (this.settings.time) {
        lines.push(`Time: ${this.settings.time}`)
      }

      if (this.settings.present) {
        lines.push(`Present: ${this.settings.present}`)
      }

      if (this.settings.absent) {
        lines.push(`Not present: ${this.settings.absent}`)
      }

      if (this.settings.weather) {
        lines.push(`Weather: ${this.settings.weather}`)
      }

      if (this.settings.mood) {
        lines.push(`Mood: ${this.settings.mood}`)
      }

      if (this.settings.objective) {
        lines.push(`Immediate objective: ${this.settings.objective}`)
      }

      if (this.settings.threat) {
        lines.push(`Active threat: ${this.settings.threat}`)
      }

      if (this.settings.conditions) {
        lines.push(`Current conditions: ${this.settings.conditions}`)
      }

      if (this.settings.notes) {
        lines.push('Scene notes:', this.settings.notes)
      }

      lines.push('[/SCENE_STATE]')

      return lines.join('\n')
    },

    async clear() {
      this.settings = this.getDefaults()

      await this.save()
    }
  }
})()
