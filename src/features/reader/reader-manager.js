'use strict'


/*
  Developer notes

  Owns Reader and Focus presentation state. These modes hide/reflow local Clank UI
  for reading or capture but do not remove messages, change the conversation or
  affect backend data. Exit controls should always remain reachable.
*/
/*
    Reader Manager

    Owns per-conversation Reader Mode settings and temporary Focus Mode. It changes local page classes only; it does not modify Clank messages or backend data.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  // Reader manager

  Atelier.ReaderManager = {
    STORAGE_KEY: 'furina-conversation-reader',

    conversationId: null,

    settings: {
      enabled: false,

      hideComposer: true,

      hideAvatars: false,

      hideActions: true,

      hideSidebar: false,

      wideLayout: true,

      cleanSpacing: true
    },

    focusMode: false,

    getDefaults() {
      return {
        enabled: false,

        hideComposer: true,

        hideAvatars: false,

        hideActions: true,

        hideSidebar: false,

        wideLayout: true,

        cleanSpacing: true
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

      const clean = {
        ...defaults
      }

      for (const key of Object.keys(defaults)) {
        if (typeof values[key] === 'boolean') {
          clean[key] = values[key]
        }
      }

      return clean
    },

    async loadConversation(conversationId) {
      this.conversationId = conversationId

      if (!conversationId) {
        this.settings = this.getDefaults()

        this.apply()

        return
      }

      const stored = await this.getStoredSettings()

      if (this.conversationId !== conversationId) {
        return
      }

      const saved = stored[conversationId]

      this.settings = this.sanitizeSettings(saved)

      this.apply()
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

    apply() {
      const root = document.documentElement

      root.classList.toggle(
        'furina-reader-active',
        Boolean(this.settings.enabled)
      )

      root.classList.toggle(
        'furina-reader-hide-composer',
        Boolean(this.settings.enabled && this.settings.hideComposer)
      )

      root.classList.toggle(
        'furina-reader-hide-avatars',
        Boolean(this.settings.enabled && this.settings.hideAvatars)
      )

      root.classList.toggle(
        'furina-reader-hide-actions',
        Boolean(this.settings.enabled && this.settings.hideActions)
      )

      root.classList.toggle(
        'furina-reader-hide-sidebar',
        Boolean(this.settings.enabled && this.settings.hideSidebar)
      )

      root.classList.toggle(
        'furina-reader-wide',
        Boolean(this.settings.enabled && this.settings.wideLayout)
      )

      root.classList.toggle(
        'furina-reader-clean-spacing',
        Boolean(this.settings.enabled && this.settings.cleanSpacing)
      )

      document.documentElement.classList.toggle(
        'furina-focus-mode',
        Boolean(this.focusMode)
      )
    },

    async update(key, value) {
      if (!Object.prototype.hasOwnProperty.call(this.settings, key)) {
        return
      }

      this.settings[key] = Boolean(value)

      this.apply()

      await this.save()
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

    enterFocusMode() {
      this.focusMode = true

      this.apply()

      if (typeof Atelier.syncFocusExitButton === 'function') {
        Atelier.syncFocusExitButton()
      }
    },

    exitFocusMode() {
      this.focusMode = false

      this.apply()

      if (typeof Atelier.syncFocusExitButton === 'function') {
        Atelier.syncFocusExitButton()
      }
    },

    toggleFocusMode() {
      if (this.focusMode) {
        this.exitFocusMode()
      } else {
        this.enterFocusMode()
      }
    },

    async reset() {
      this.settings = this.getDefaults()

      this.apply()

      await this.save()
    }
  }

  // Focus mode exit control

  Atelier.syncFocusExitButton = function () {
    let button = document.getElementById('furina-focus-exit')

    const active = Boolean(
      Atelier.ReaderManager && Atelier.ReaderManager.focusMode
    )

    if (!active) {
      if (button) {
        button.remove()
      }

      return
    }

    if (button) {
      return
    }

    button = document.createElement('button')

    button.id = 'furina-focus-exit'

    button.type = 'button'

    button.className = 'furina-focus-exit'

    button.textContent = '✦ Exit Focus'

    button.title = 'Exit Focus Mode'

    button.addEventListener('click', () => {
      Atelier.ReaderManager?.exitFocusMode()
    })

    document.body.appendChild(button)

    Atelier.I18n?.observeRoot?.(button)
  }
})()
