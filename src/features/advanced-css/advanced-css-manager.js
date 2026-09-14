'use strict'


/*
  Developer notes

  Stores and applies user-authored CSS inside Furina's intended chat scope. Preview,
  save, revert and reset are deliberately separate so experimentation is recoverable.
  Avoid broadening selectors or permissions here; custom CSS is powerful enough as a
  local presentation escape hatch.
*/
/*
    Advanced CSS Manager

    Stores optional conversation-scoped CSS, validates it, and places it inside a native @scope rule so ordinary custom styling stays inside Furina's chat shell.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  // Advanced CSS manager

  Atelier.AdvancedCssManager = {
    STORAGE_KEY: 'furina-conversation-advanced-css',

    STYLE_ID: 'furina-advanced-css-style',

    conversationId: null,

    settings: {
      enabled: false,

      css: ''
    },

    preview: null,

    getDefaults() {
      return {
        enabled: false,

        css: ''
      }
    },

    getConversationId() {
      if (typeof Atelier.getConversationId === 'function') {
        return Atelier.getConversationId()
      }

      const match = window.location.pathname.match(/^\/chat\/([^/?#]+)/)

      if (!match) {
        return null
      }

      try {
        return decodeURIComponent(match[1])
      } catch (error) {
        return match[1]
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

      const validation = this.validateCss(values.css)

      const css = validation.ok ? validation.css : ''

      return {
        enabled: Boolean(values.enabled && css.trim()),

        css
      }
    },

    validateCss(value) {
      const css = String(value || '').slice(0, 30000)

      /*
                Advanced CSS v0.1 deliberately blocks at-rules that
                can create global resources or escape the intended
                chat-only cosmetic scope.

                We can loosen this later if there is a real need.
            */

      const blockedPatterns = [
        {
          pattern: /@import\b/i,

          message: '@import is not allowed.'
        },

        {
          pattern: /@namespace\b/i,

          message: '@namespace is not allowed.'
        },

        {
          pattern: /@charset\b/i,

          message: '@charset is not allowed.'
        },

        {
          pattern: /@font-face\b/i,

          message: '@font-face is not allowed in scoped CSS.'
        },

        {
          pattern: /@page\b/i,

          message: '@page is not allowed.'
        },

        {
          pattern: /@property\b/i,

          message: '@property is not allowed in v0.1.'
        },

        {
          pattern: /@keyframes\b/i,

          message: '@keyframes is not available in v0.1.'
        },

        {
          pattern: /<\/style/i,

          message: 'Invalid style markup.'
        }
      ]

      for (const rule of blockedPatterns) {
        if (rule.pattern.test(css)) {
          return {
            ok: false,

            error: rule.message,

            css: ''
          }
        }
      }

      /*
                Basic brace validation.

                This is not pretending to be a complete CSS parser.
                It simply catches the most common accidental typo
                before the user saves or previews it.
            */

      let depth = 0

      let quote = ''

      let inComment = false

      for (let index = 0; index < css.length; index += 1) {
        const character = css[index]

        const next = css[index + 1] || ''

        if (inComment) {
          if (character === '*' && next === '/') {
            inComment = false

            index += 1
          }

          continue
        }

        if (quote) {
          if (character === '\\') {
            index += 1

            continue
          }

          if (character === quote) {
            quote = ''
          }

          continue
        }

        if (character === '/' && next === '*') {
          inComment = true

          index += 1

          continue
        }

        if (character === '"' || character === "'") {
          quote = character

          continue
        }

        if (character === '\\') {
          index += 1

          continue
        }

        if (character === '{') {
          depth += 1

          continue
        }

        if (character === '}') {
          depth -= 1

          if (depth < 0) {
            return {
              ok: false,

              error: 'CSS has an unmatched closing brace.',

              css: ''
            }
          }
        }
      }

      if (quote) {
        return {
          ok: false,

          error: 'CSS has an unterminated string.',

          css: ''
        }
      }

      if (inComment) {
        return {
          ok: false,

          error: 'CSS has an unterminated comment.',

          css: ''
        }
      }

      if (depth !== 0) {
        return {
          ok: false,

          error: 'CSS has an unmatched opening brace.',

          css: ''
        }
      }

      return {
        ok: true,

        error: '',

        css
      }
    },

    ensureStyleElement() {
      let style = document.getElementById(this.STYLE_ID)

      if (style) {
        return style
      }

      style = document.createElement('style')

      style.id = this.STYLE_ID

      style.dataset.furinaOwned = 'true'

      ;(document.head || document.documentElement).appendChild(style)

      return style
    },

    removeStyleElement() {
      document.getElementById(this.STYLE_ID)?.remove()
    },

    getEffectiveCss() {
      if (this.preview !== null) {
        return this.preview
      }

      if (!this.settings.enabled) {
        return ''
      }

      return this.settings.css
    },

    apply() {
      const css = this.getEffectiveCss()

      if (!css.trim()) {
        this.removeStyleElement()

        return
      }

      const style = this.ensureStyleElement()

      /*
                CSS @scope keeps Advanced CSS inside Furina's
                discovered chat shell.

                Even broad selectors such as:

                    p { ... }

                remain scoped to the current chat area.
            */

      style.textContent = [
        '@scope (.clank-atelier-chat-shell) {',
        css,
        '}'
      ].join('\n')
    },

    async loadConversation(conversationId) {
      this.conversationId = conversationId

      this.preview = null

      if (!conversationId) {
        this.settings = this.getDefaults()

        this.apply()

        return
      }

      const stored = await this.getStoredSettings()

      if (this.conversationId !== conversationId) {
        return
      }

      this.settings = this.sanitizeSettings(stored[conversationId])

      this.apply()
    },

    async save() {
      const conversationId = this.conversationId

      if (!conversationId) {
        return false
      }

      const snapshot = this.sanitizeSettings(this.settings)

      return await Atelier.Storage.updateObject(this.STORAGE_KEY, stored => {
        stored[conversationId] = snapshot

        return stored
      })
    },

    async setEnabled(value) {
      this.settings.enabled = Boolean(value)

      /*
                Committing a setting change ends any temporary preview.
            */

      this.preview = null

      this.apply()

      await this.save()
    },

    async setCss(value) {
      const result = this.validateCss(value)

      if (!result.ok) {
        return result
      }

      this.settings.css = result.css

      this.preview = null

      this.apply()

      await this.save()

      return {
        ok: true,

        error: '',

        css: result.css
      }
    },

    previewCss(value) {
      const result = this.validateCss(value)

      if (!result.ok) {
        return result
      }

      this.preview = result.css

      this.apply()

      return {
        ok: true,

        error: '',

        css: result.css
      }
    },

    revertPreview() {
      this.preview = null

      this.apply()
    },

    async syncConversation() {
      const conversationId = this.getConversationId()

      if (conversationId === this.conversationId) {
        return false
      }

      await this.loadConversation(conversationId)

      return true
    },

    async reset() {
      this.settings = this.getDefaults()

      this.preview = null

      this.apply()

      await this.save()
    }
  }
})()
