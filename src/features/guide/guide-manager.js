'use strict'


/*
  Developer notes

  Opens/closes the in-extension guide and connects guide links to real Furina
  workspaces. The guide is documentation UI only; it should not become another
  source of feature state.
*/
/*
    Furina Guidebook Manager

    Owns Guidebook state, navigation, keyboard handling, and focus restoration.
    The manager contains no guide text and creates no visual layout itself.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  Atelier.GuideManager = {
    DISCOVERY_STORAGE_KEY: 'furina-guidebook-discovery-v1',

    DISCOVERY_EVENT: 'furina-guidebook-discovery-changed',

    discoveryState: {
      loaded: false,

      welcomeDismissed: false
    },

    discoveryLoadPromise: null,

    isOpen: false,

    currentPageId: 'start',

    opener: null,

    initialized: false,

    emitDiscoveryChange() {
      window.dispatchEvent(
        new CustomEvent(this.DISCOVERY_EVENT, {
          detail: {
            ...this.discoveryState
          }
        })
      )
    },

    async loadDiscoveryState() {
      if (this.discoveryState.loaded) {
        return this.discoveryState
      }

      if (this.discoveryLoadPromise) {
        return await this.discoveryLoadPromise
      }

      this.discoveryLoadPromise = (async () => {
        const stored = await Atelier.Storage.getObject(
          this.DISCOVERY_STORAGE_KEY,
          {}
        )

        this.discoveryState = {
          loaded: true,

          welcomeDismissed: Boolean(stored.welcomeDismissed)
        }

        this.emitDiscoveryChange()

        return this.discoveryState
      })()

      try {
        return await this.discoveryLoadPromise
      } finally {
        this.discoveryLoadPromise = null
      }
    },

    shouldShowWelcome() {
      return Boolean(
        this.discoveryState.loaded && !this.discoveryState.welcomeDismissed
      )
    },

    async dismissWelcome() {
      await this.loadDiscoveryState()

      if (this.discoveryState.welcomeDismissed) {
        return true
      }

      this.discoveryState = {
        ...this.discoveryState,

        welcomeDismissed: true
      }

      this.emitDiscoveryChange()

      return await Atelier.Storage.set(this.DISCOVERY_STORAGE_KEY, {
        welcomeDismissed: true
      })
    },

    async resetWelcome() {
      this.discoveryState = {
        loaded: true,

        welcomeDismissed: false
      }

      const saved = await Atelier.Storage.set(this.DISCOVERY_STORAGE_KEY, {
        welcomeDismissed: false
      })

      this.emitDiscoveryChange()

      return saved
    },

    getLocale() {
      const locale =
        Atelier.I18n?.getLocale?.() ||
        Atelier.GuideContent?.fallbackLocale ||
        'en'

      return (
        Atelier.GuideContent?.locales?.[locale] ||
        Atelier.GuideContent?.locales?.[Atelier.GuideContent.fallbackLocale] ||
        null
      )
    },

    getPages() {
      return this.getLocale()?.pages || []
    },

    getPage(pageId = this.currentPageId) {
      const pages = this.getPages()

      return pages.find(page => page.id === pageId) || pages[0] || null
    },

    getCurrentIndex() {
      return this.getPages().findIndex(page => page.id === this.currentPageId)
    },

    setPage(pageId) {
      const page = this.getPage(pageId)

      if (!page) {
        return false
      }

      this.currentPageId = page.id

      Atelier.GuideModal?.render?.(this)

      return true
    },

    move(direction) {
      const pages = this.getPages()

      const index = this.getCurrentIndex()

      const nextIndex = index + Number(direction)

      if (nextIndex < 0 || nextIndex >= pages.length) {
        return false
      }

      return this.setPage(pages[nextIndex].id)
    },

    open(pageId = this.currentPageId, opener = document.activeElement) {
      const root = Atelier.GuideModal?.ensure?.(this)

      if (!root) {
        console.warn('[Clank Atelier] Guidebook interface is unavailable.')

        return false
      }

      if (opener instanceof HTMLElement) {
        this.opener = opener
      }

      this.setPage(pageId)

      this.isOpen = true

      /*
                Opening the Guidebook means the user has discovered it,
                regardless of whether they used the welcome notice,
                permanent Home card, or header button.
            */

      void this.dismissWelcome()

      document.documentElement.classList.add('furina-guidebook-open')

      root.setAttribute('aria-hidden', 'false')

      requestAnimationFrame(() => {
        root.classList.add('furina-guidebook-visible')

        root.querySelector('.furina-guidebook-close')?.focus?.()
      })

      return true
    },

    close() {
      const root = Atelier.GuideModal?.getRoot?.()

      if (!this.isOpen && !root) {
        return
      }

      this.isOpen = false

      document.documentElement.classList.remove('furina-guidebook-open')

      if (root) {
        root.classList.remove('furina-guidebook-visible')

        root.setAttribute('aria-hidden', 'true')
      }

      const previousOpener = this.opener

      this.opener = null

      window.setTimeout(() => {
        if (previousOpener?.isConnected) {
          previousOpener.focus?.()
        }
      }, 180)
    },

    openTool(workspace, tool = null) {
      if (!workspace) {
        return false
      }

      /*
                Do not return focus to the Guidebook button while moving
                into another Furina workspace.
            */

      this.opener = null

      this.close()

      window.setTimeout(() => {
        Atelier.PanelShell?.open?.()

        Atelier.PanelShell?.navigate?.(workspace, tool)
      }, 190)

      return true
    },

    handleTab(event) {
      const root = Atelier.GuideModal?.getRoot?.()

      if (!root) {
        return
      }

      const focusable = [
        ...root.querySelectorAll(
          [
            'button:not([disabled])',
            '[href]',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            "[tabindex]:not([tabindex='-1'])"
          ].join(',')
        )
      ].filter(element => element.offsetParent !== null)

      if (!focusable.length) {
        return
      }

      const first = focusable[0]

      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },

    handleKeydown(event) {
      if (!this.isOpen) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()

        this.close()

        return
      }

      if (event.key === 'Tab') {
        this.handleTab(event)
      }
    },

    init() {
      if (this.initialized) {
        return
      }

      this.initialized = true

      void this.loadDiscoveryState()

      document.addEventListener(
        'keydown',
        event => this.handleKeydown(event),
        true
      )
    }
  }

  Atelier.GuideManager.init()
})()
