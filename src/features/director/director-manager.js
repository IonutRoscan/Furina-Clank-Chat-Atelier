'use strict'


/*
  Developer notes

  Director Notes are conversation-scoped user instructions. This manager builds
  Furina's marked OOC block and temporarily places it into Clank's real composer
  immediately before a genuine user send. Clank still performs its own normal
  request; Furina never recreates or bypasses the backend call.

  Marker stripping is visual only. The full OOC-prefixed block must reach Clank,
  while Furina hides only its own unique markers from the local transcript.
*/
/*
    Director Manager

    Owns per-conversation Director Notes. It does not send messages itself: immediately before Clank's normal send action, it places Furina's marked OOC reminder into the real composer so Clank performs the request normally.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  const SELECTORS = Atelier.SELECTORS || {}

  // DIRECTOR NOTES

  Atelier.DirectorManager = {
    STORAGE_KEY: 'furina-conversation-director',

    MARKER_START: '[FURINA_DIRECTOR_NOTES]',

    MARKER_END: '[/FURINA_DIRECTOR_NOTES]',

    conversationId: null,

    settings: {
      enabled: false,

      note: '',

      notes: []
    },

    getDefaults() {
      return {
        enabled: false,

        note: '',

        notes: []
      }
    },

    sanitizeSettings(values) {
      const source =
        values && typeof values === 'object' && !Array.isArray(values)
          ? values
          : {}

      const allowedCategories = new Set([
        'RULE',
        'CANON',
        'CHARACTER',
        'RELATIONSHIP',
        'KNOWLEDGE',
        'PLOT',
        'STYLE',
        'OTHER'
      ])

      const rawNotes = Array.isArray(source.notes) ? source.notes : []

      const notes = rawNotes
        .map(item => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return null
          }

          const text = String(item.text || '')
            .replace(/\[\/?FURINA_(?:DIRECTOR_NOTES|NEXT_REPLY)\]/gi, '')
            .trim()
            .slice(0, 2000)

          if (!text) {
            return null
          }

          const rawCategory = String(item.category || 'OTHER').toUpperCase()

          const category = allowedCategories.has(rawCategory)
            ? rawCategory
            : 'OTHER'

          return {
            id: String(
              item.id ||
                `director-note-${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2, 9)}`
            ).slice(0, 160),

            category,

            text,

            enabled: item.enabled !== false
          }
        })
        .filter(Boolean)
        .slice(0, 100)

      return {
        enabled: Boolean(source.enabled),

        note: String(source.note || '')
          .replace(/\[\/?FURINA_(?:DIRECTOR_NOTES|NEXT_REPLY)\]/gi, '')
          .slice(0, 6000),

        notes
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
      }

      if (key === 'note') {
        this.settings.note = this.sanitizeSettings({
          ...this.settings,
          note: value
        }).note
      }

      if (key === 'notes') {
        this.settings.notes = this.sanitizeSettings({
          ...this.settings,
          notes: value
        }).notes
      }

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

    hasActiveNotes() {
      const hasBaseRules = Boolean(this.settings.note.trim())

      const hasStructuredNotes =
        Array.isArray(this.settings.notes) &&
        this.settings.notes.some(note => note.enabled && note.text.trim())

      return Boolean(
        this.settings.enabled && (hasBaseRules || hasStructuredNotes)
      )
    },

    hasActiveContext() {
      const hasDirectorNotes = this.hasActiveNotes()

      const hasSceneState = Boolean(Atelier.SceneStateManager?.shouldInject?.())

      const hasContinuity = Boolean(
        Atelier.ContinuityManager?.hasInjectableEntries?.()
      )

      const hasDirector2 = Boolean(
        Atelier.Director2Manager?.hasActiveContext?.()
      )

      return Boolean(
        hasDirectorNotes || hasSceneState || hasContinuity || hasDirector2
      )
    },

    alreadyInjected(value) {
      return String(value || '').includes(this.MARKER_START)
    },

    buildDirectorBlock(userText = '') {
      const baseRules = this.settings.note.trim()

      const structuredNotes = Array.isArray(this.settings.notes)
        ? this.settings.notes.filter(note => note.enabled && note.text.trim())
        : []

      const sceneStateBlock = Atelier.SceneStateManager?.buildBlock?.() || ''

      const continuityBlock =
        Atelier.ContinuityManager?.buildBlock?.(userText) || ''

      const director2Block =
        Atelier.Director2Manager?.buildBlock?.(userText) || ''

      if (
        !baseRules &&
        structuredNotes.length === 0 &&
        !sceneStateBlock &&
        !continuityBlock &&
        !director2Block
      ) {
        return ''
      }

      const lines = ['ooc: furina-director:', this.MARKER_START]

      if (this.settings.enabled && baseRules) {
        lines.push('[BASE_RULES]', baseRules, '[/BASE_RULES]')
      }

      if (this.settings.enabled && structuredNotes.length > 0) {
        if (this.settings.enabled && baseRules) {
          lines.push('')
        }

        lines.push('[CONTINUITY]')

        structuredNotes.forEach(note => {
          lines.push(`[${note.category}] ${note.text}`)
        })

        lines.push('[/CONTINUITY]')
      }

      if (sceneStateBlock) {
        if (
          (this.settings.enabled && baseRules) ||
          (this.settings.enabled && structuredNotes.length > 0)
        ) {
          lines.push('')
        }

        lines.push(sceneStateBlock)
      }

      if (continuityBlock) {
        if (lines.length > 2) {
          lines.push('')
        }

        lines.push(continuityBlock)
      }

      if (director2Block) {
        if (lines.length > 2) {
          lines.push('')
        }

        lines.push(director2Block)
      }

      lines.push(this.MARKER_END)

      return lines.join('\n')
    },

    buildOutgoingMessage(userText) {
      const original = String(userText || '')

      if (!original.trim()) {
        return original
      }

      if (!this.hasActiveContext()) {
        return original
      }

      if (this.alreadyInjected(original)) {
        return original
      }

      const directorBlock = this.buildDirectorBlock(original)

      if (!directorBlock) {
        return original
      }

      return directorBlock + '\n\n' + original
    },

    setComposerValue(textarea, value) {
      if (!(textarea instanceof HTMLTextAreaElement)) {
        return false
      }

      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )

      if (!descriptor || typeof descriptor.set !== 'function') {
        return false
      }

      descriptor.set.call(textarea, value)

      textarea.dispatchEvent(
        new Event('input', {
          bubbles: true
        })
      )

      return true
    },

    injectComposer(textarea) {
      if (!this.hasActiveContext()) {
        return false
      }

      const current = textarea.value

      if (!current.trim()) {
        return false
      }

      if (this.alreadyInjected(current)) {
        return true
      }

      const outgoing = this.buildOutgoingMessage(current)

      if (outgoing === current) {
        Atelier.Director2Manager?.consumeWithoutInjection?.(current)

        return false
      }

      const injected = this.setComposerValue(textarea, outgoing)

      if (injected) {
        Atelier.Director2Manager?.consumeAfterInjection?.(current)
      }

      return injected
    },

    attachComposer(textarea) {
      if (!(textarea instanceof HTMLTextAreaElement)) {
        return
      }

      const form = textarea.closest('form')

      if (!form) {
        return
      }

      /*
                FORM / MOUSE SEND

                We proved during reconnaissance that modifying the
                React textarea during the submit capture path causes
                Clank to send the modified value normally.
            */

      if (form.dataset.furinaDirectorSubmit !== 'true') {
        form.dataset.furinaDirectorSubmit = 'true'

        form.addEventListener(
          'submit',
          () => {
            if (!this.hasActiveContext()) {
              return
            }

            const liveTextarea =
              form.querySelector(SELECTORS.composer) ||
              form.querySelector('textarea')

            if (liveTextarea instanceof HTMLTextAreaElement) {
              this.injectComposer(liveTextarea)
            }
          },
          true
        )
      }

      /*
                ENTER SEND

                Clank handles Enter directly and preventing/modifying
                that keydown disrupted its normal send path during
                reconnaissance.

                Therefore Furina owns plain Enter only while Director
                Notes are active:

                Enter
                    -> prevent Clank keyboard handler
                    -> inject OOC text
                    -> click Clank's real Send button

                This makes Enter use the same proven form path as a
                normal mouse click.
            */

      if (textarea.dataset.furinaDirectorKeydown !== 'true') {
        textarea.dataset.furinaDirectorKeydown = 'true'

        textarea.addEventListener(
          'keydown',
          event => {
            if (!this.hasActiveContext()) {
              return
            }

            if (
              event.key !== 'Enter' ||
              event.shiftKey ||
              event.ctrlKey ||
              event.altKey ||
              event.metaKey ||
              event.isComposing ||
              event.repeat
            ) {
              return
            }

            const original = textarea.value

            if (!original.trim()) {
              return
            }

            event.preventDefault()

            event.stopPropagation()

            event.stopImmediatePropagation()

            this.injectComposer(textarea)

            /*
                            Give React one event-loop turn to accept the
                            synthetic input update before clicking Send.
                        */

            setTimeout(() => {
              const currentForm = textarea.closest('form')

              const sendButton = currentForm?.querySelector(
                'button[type="submit"]'
              )

              if (
                sendButton instanceof HTMLButtonElement &&
                !sendButton.disabled
              ) {
                sendButton.click()

                return
              }

              console.warn(
                '[Clank Atelier] Director Notes could not find an enabled Send button.'
              )
            }, 0)
          },
          true
        )
      }
    },

    async reset() {
      this.settings = this.getDefaults()

      await this.save()
    }
  }
})()
