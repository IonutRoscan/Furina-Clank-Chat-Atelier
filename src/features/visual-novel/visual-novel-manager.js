'use strict'


/*
  Developer notes

  Visual Novel Manager is part of Furina's optional Visual Novel interface. VN mode is isolated from
  standard-chat presentation so changes here should not be required for ordinary chat
  features. Preserve that boundary when extending the layout.
*/
;(() => {
  if (window.top !== window) {
    return
  }

  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  const SELECTORS = Atelier.SELECTORS || {}

  if (Atelier.VisualNovel?.initialized) {
    return
  }

  const VisualNovel = {
    initialized: true,

    version: '0.8.5',

    root: null,

    isActive: false,

    beats: [],

    currentBeatIndex: -1,

    OPENED_STORAGE_KEY: 'furina-vn-opened-conversations',

    SCENE_CASTS_STORAGE_KEY: 'furina-vn-scene-casts-v1',

    TYPEWRITER_DELAY: 12,

    typewriterTimer: null,

    isTyping: false,

    currentRenderedText: '',

    conversationObserver: null,

    conversationObserverTimer: null,

    liveTimer: null,

    lastMessageFingerprint: '',

    awaitingAssistant: false,

    awaitingAssistantStarted: false,

    awaitingAssistantSourceIndex: -1,

    assistantSettleTimer: null,

    sending: false,

    autoMode: false,

    autoTimer: null,

    backlogOpen: false,

    composerOpen: false,

    AUTO_ADVANCE_DELAY: 1350,

    ADV_PAGE_CHAR_LIMIT: 900,

    speakerPortraits: new Map(),

    basePortraits: new Map(),

    timelineCache: new Map(),

    historyHydrating: false,

    observerRoot: null,

    openedPath: null,

    sceneDetailsTimer: null,

    activeSceneCastKey: '',

    activeSceneCastSignature: '',

    sceneAgentPortraitCache: new Map(),

    sceneAgentPortraitMissAt: new Map(),

    routeTimer: null,

    elements: {
      stage: null,
      portraitWrap: null,
      portraitImage: null,
      stageBackground: null,
      nameplate: null,
      dialogueBox: null,
      media: null,
      dialogueText: null,
      beatCounter: null,
      continueIndicator: null,
      replyIndicator: null,
      composer: null,
      input: null,
      send: null,
      status: null,
      previous: null,
      auto: null,
      latest: null,
      next: null,
      log: null,
      reply: null,
      viewer: null,
      viewerImage: null,
      viewerCaption: null,
      backlog: null,
      backlogList: null,
      backlogClose: null,
      close: null
    },

    getConversationRoot() {
      return document.querySelector('#chat-scroll-container')
    },

    getMessageIdentity(element, role = null) {
      if (!(element instanceof HTMLElement)) {
        return ''
      }

      const resolvedRole = role || this.getMessageRole(element) || 'unknown'

      const attributeCandidates = [
        'data-message-id',
        'data-message-uuid',
        'data-id',
        'data-uuid',
        'data-key'
      ]

      for (const attribute of attributeCandidates) {
        const value = String(element.getAttribute(attribute) || '').trim()

        if (value) {
          return `attr:${resolvedRole}:${attribute}:${value}`
        }
      }

      /*
                Clank can temporarily keep more than one rendered copy of
                the same chat turn in the DOM while its UI updates.

                Furina's VN timeline must treat those copies as one source
                message. The fallback identity therefore uses the normalized
                message body plus its ordered image sources.
            */

      const body = element.querySelector('.clank-atelier-message-body')

      const text = String(body?.innerText || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      const imageSources = Array.from(body?.querySelectorAll('img') || [])
        .map(image => image.currentSrc || image.src || '')
        .filter(Boolean)
        .join('|')

      if (!text && !imageSources) {
        return ''
      }

      return `content:${resolvedRole}:${text}::${imageSources}`
    },

    getMessageBody(element) {
      if (!(element instanceof HTMLElement)) {
        return null
      }

      return (
        element.querySelector('.clank-atelier-message-body') ||
        (SELECTORS.messageBody
          ? element.querySelector(SELECTORS.messageBody)
          : null) ||
        element.querySelector('div.block.break-words.min-w-0') ||
        element.querySelector('div.break-words')
      )
    },

    getConversationMessageElements() {
      const root = this.getConversationRoot()

      if (!root) {
        return []
      }

      /*
                Follow Phantom's proven source model: only inspect direct
                children of the real Clank chat scroller.

                querySelectorAll() across the whole subtree can see nested,
                responsive, accessibility, or Furina-rendered copies and was
                one of the major causes of inflated VN timelines.
            */

      return [...root.children]
        .filter(element => {
          if (!(element instanceof HTMLElement)) {
            return false
          }

          if (
            element.classList.contains('clank-atelier-message') ||
            element.classList.contains('clank-atelier-message-user') ||
            element.classList.contains('clank-atelier-message-assistant')
          ) {
            return true
          }

          return Boolean(this.getMessageBody(element))
        })
        .filter(element => {
          const body = this.getMessageBody(element)

          const text = body?.innerText?.trim?.() || ''

          return Boolean(text) || Boolean(body?.querySelector('img'))
        })
    },

    getMessageRole(element) {
      if (element?.classList?.contains('clank-atelier-message-user')) {
        return 'user'
      }

      if (element?.classList?.contains('clank-atelier-message-assistant')) {
        return 'assistant'
      }

      if (element?.classList?.contains('flex-row-reverse')) {
        return 'user'
      }

      return this.getMessageBody(element) ? 'assistant' : null
    },

    getLatestAssistantElement() {
      const messages = this.getConversationMessageElements()

      for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (this.getMessageRole(messages[index]) === 'assistant') {
          return messages[index]
        }
      }

      return null
    },

    getClankImageAssetBase(imageUrl) {
      try {
        const url = new URL(imageUrl, window.location.href)

        if (url.hostname !== 'img.clank.world') {
          return null
        }

        const parts = url.pathname.split('/').filter(Boolean)

        if (parts.length < 3) {
          return null
        }

        const transform = parts[parts.length - 1]

        if (
          !transform.includes('w=') &&
          !transform.includes('h=') &&
          !transform.includes('fit=')
        ) {
          return null
        }

        parts.pop()

        return `${url.origin}/${parts.join('/')}`
      } catch (_) {
        return null
      }
    },

    getBestClankImageUrl(imageUrl, size = 1024) {
      const value = String(imageUrl || '').trim()

      if (!value) {
        return ''
      }

      try {
        const url = new URL(value, window.location.href)

        if (url.hostname !== 'img.clank.world') {
          return value
        }

        const parts = url.pathname.split('/').filter(Boolean)

        if (parts.length < 3) {
          return value
        }

        const lastPart = parts[parts.length - 1]

        if (/^(public|original|raw)$/i.test(lastPart)) {
          parts.pop()

          return `${url.origin}/${parts.join('/')}/w=${size},q=100,f=webp`
        }

        const assetBase = this.getClankImageAssetBase(value)

        if (assetBase) {
          return `${assetBase}/w=${size},q=100,f=webp`
        }

        return value
      } catch (_) {
        return value
      }
    },

    getCurrentCharacterPortrait() {
      const root = this.getConversationRoot()

      if (!root) {
        return ''
      }

      const children = Array.from(root.children)

      const firstMessageIndex = children.findIndex(child =>
        child.classList?.contains('clank-atelier-message')
      )

      const introChildren =
        firstMessageIndex >= 0 ? children.slice(0, firstMessageIndex) : children

      const candidates = []

      introChildren.forEach(element => {
        element.querySelectorAll('img').forEach(image => {
          const rect = image.getBoundingClientRect()

          const source = image.currentSrc || image.src || ''

          if (!source) {
            return
          }

          if (
            /placeholder/i.test(source) ||
            /^uploaded image/i.test(image.alt || '')
          ) {
            return
          }

          if (rect.width < 80 || rect.height < 80) {
            return
          }

          candidates.push({
            image,
            area: rect.width * rect.height
          })
        })
      })

      candidates.sort((left, right) => right.area - left.area)

      const image = candidates[0]?.image || null

      if (!(image instanceof HTMLImageElement)) {
        return ''
      }

      const source = image.currentSrc || image.src || ''

      const base = this.getClankImageAssetBase(source)

      return base ? `${base}/w=1536,q=100,f=webp` : source
    },

    getCachedBasePortrait() {
      const conversationId = this.getConversationId()

      const fresh = this.getCurrentCharacterPortrait()

      if (fresh) {
        this.basePortraits.set(conversationId, fresh)

        return fresh
      }

      return this.basePortraits.get(conversationId) || ''
    },

    getCurrentCharacterName() {
      const assistant = this.getLatestAssistantElement()

      const avatar = assistant?.querySelector('.clank-atelier-avatar') || null

      if (avatar instanceof HTMLImageElement) {
        for (const candidate of [
          avatar.alt,
          avatar.title,
          avatar.getAttribute('aria-label')
        ]) {
          const value = String(candidate || '').trim()

          if (
            value &&
            value.length <= 80 &&
            !/^(avatar|profile|profile picture|image|character|assistant|user)$/i.test(
              value
            )
          ) {
            return value
          }
        }
      }

      const title = String(document.title || '')
        .replace(/\s*[|•-]\s*Clank.*$/i, '')
        .replace(/\s*-\s*Chat\s*$/i, '')
        .trim()

      if (title && !/^clank$/i.test(title)) {
        return title
      }

      return 'Character'
    },

    normalizeSpeakerKey(value) {
      return String(value || '')
        .trim()
        .toLowerCase()
    },

    getSpeakerAliases(value) {
      const name = String(value || '')
        .replace(/\s+/g, ' ')
        .trim()

      if (!name) {
        return []
      }

      const aliases = new Set([this.normalizeSpeakerKey(name)])

      const parts = name.split(' ').filter(Boolean)

      /*
                Clank's scene agents currently expose full names such as:
                    Tessa Morgan
                    Naomi Fujita

                The VN response style naturally emits:
                    Tessa
                    Naomi

                Add first-name aliases so those speaker beats resolve to the
                correct scene-agent portrait.
            */

      if (parts.length > 1) {
        aliases.add(this.normalizeSpeakerKey(parts[0]))
      }

      return [...aliases]
    },

    getSceneCastStore() {
      try {
        return JSON.parse(
          localStorage.getItem(this.SCENE_CASTS_STORAGE_KEY) || '{}'
        )
      } catch (_) {
        return {}
      }
    },

    saveSceneCastStore(value) {
      try {
        localStorage.setItem(
          this.SCENE_CASTS_STORAGE_KEY,
          JSON.stringify(value || {})
        )

        return true
      } catch (error) {
        console.warn('[Furina Visual Novel] Could not save scene casts.', error)

        return false
      }
    },

    buildSceneArtworkKey(imageUrl) {
      const value = String(imageUrl || '').trim()

      if (!value) {
        return ''
      }

      try {
        const url = new URL(value, window.location.href)

        if (url.hostname === 'img.clank.world') {
          const parts = url.pathname.split('/').filter(Boolean)

          if (parts.length >= 3) {
            const last = parts[parts.length - 1]

            if (
              /^(public|original|raw)$/i.test(last) ||
              last.includes('w=') ||
              last.includes('h=') ||
              last.includes('fit=') ||
              last.includes('q=') ||
              last.includes('f=')
            ) {
              parts.pop()
            }

            return `${url.origin}/${parts.join('/')}`
          }
        }

        url.hash = ''
        url.search = ''

        return `${url.origin}${url.pathname}`
      } catch (_) {
        return value
      }
    },

    getCurrentSceneCard() {
      const chat = this.getConversationRoot()

      if (!chat) {
        return null
      }

      return (
        Array.from(chat.children).find(child => {
          if (!(child instanceof HTMLElement)) {
            return false
          }

          const classes = String(child.className || '')

          return (
            classes.includes('flex-col') &&
            classes.includes('items-center') &&
            Boolean(child.querySelector('img'))
          )
        }) || null
      )
    },

    getCurrentSceneCastKey() {
      /*
                This is the exact identity source used by the old working
                VN prototype: the scene/group card directly inside Clank's
                chat scroller.

                Using the generic base portrait here can point at a different
                image and makes a correctly captured cast look "missing".
            */

      const sceneCard = this.getCurrentSceneCard()

      const sceneImage = sceneCard?.querySelector('img')

      const sceneSource = sceneImage?.currentSrc || sceneImage?.src || ''

      const sceneKey = this.buildSceneArtworkKey(sceneSource)

      if (sceneKey) {
        return sceneKey
      }

      const fallbackArtwork =
        this.getCachedBasePortrait() || this.getCurrentCharacterPortrait()

      return this.buildSceneArtworkKey(fallbackArtwork)
    },

    getSceneAgentPortraitMap() {
      const sceneCard = this.getCurrentSceneCard()

      if (!sceneCard) {
        return {}
      }

      const sceneKey = this.getCurrentSceneCastKey() || this.getConversationId()

      const cached = this.sceneAgentPortraitCache.get(sceneKey)

      if (cached && Object.keys(cached).length) {
        return {
          ...cached
        }
      }

      const lastMiss = this.sceneAgentPortraitMissAt.get(sceneKey) || 0

      if (Date.now() - lastMiss < 3000) {
        return {}
      }

      const portraitMap = {}

      const addAgent = agent => {
        const name = String(agent?.name || agent?.agent_name || '').trim()

        const image = String(agent?.image || agent?.agent_image || '').trim()

        if (!name || !image) {
          return
        }

        const resolvedImage = this.getBestClankImageUrl(image, 1024)

        this.getSpeakerAliases(name).forEach(alias => {
          if (alias) {
            portraitMap[alias] = resolvedImage
          }
        })
      }

      const scanProps = (value, path, depth = 0, seen = new WeakSet()) => {
        if (!value || typeof value !== 'object' || depth > 7) {
          return false
        }

        if (value instanceof Node) {
          return false
        }

        if (seen.has(value)) {
          return false
        }

        seen.add(value)

        if (Array.isArray(value)) {
          const looksLikeAgents =
            value.length > 0 &&
            value.some(
              item =>
                item &&
                typeof item === 'object' &&
                !Array.isArray(item) &&
                (item.name || item.agent_name) &&
                (item.image || item.agent_image)
            )

          if (looksLikeAgents) {
            value.forEach(addAgent)

            if (Object.keys(portraitMap).length) {
              console.info(
                `[Furina Visual Novel] Scene agents found at ${path}:`,
                Object.keys(portraitMap)
              )

              return true
            }
          }

          for (let index = 0; index < Math.min(value.length, 40); index += 1) {
            if (scanProps(value[index], `${path}[${index}]`, depth + 1, seen)) {
              return true
            }
          }

          return false
        }

        let entries

        try {
          entries = Object.entries(value)
        } catch (_) {
          return false
        }

        /*
                        Current Clank (verified by recon):
                            ancestor[1]
                            .pendingProps
                            .children[3][0]
                            .props
                            .agents

                        Also exposed at:
                            ancestor[4]
                            .pendingProps
                            .children
                            .props
                            .agents

                        Walk bounded React props so small layout changes in the
                        children array do not break portrait discovery again.
                    */

        for (const [key, child] of entries.slice(0, 100)) {
          if (
            ['return', 'sibling', 'child', 'stateNode', '_owner'].includes(key)
          ) {
            continue
          }

          if (key === 'agents' && Array.isArray(child)) {
            child.forEach(addAgent)

            if (Object.keys(portraitMap).length) {
              console.info(
                `[Furina Visual Novel] Scene agents found at ${path}.${key}:`,
                Object.keys(portraitMap)
              )

              return true
            }
          }

          if (scanProps(child, `${path}.${key}`, depth + 1, seen)) {
            return true
          }
        }

        return false
      }

      let element = sceneCard

      for (let level = 0; level < 10 && element; level += 1) {
        const ownKeys = Object.getOwnPropertyNames(element)

        const fiberKeys = ownKeys.filter(key => key.startsWith('__reactFiber$'))

        for (const fiberKey of fiberKeys) {
          let fiber

          try {
            fiber = element[fiberKey]
          } catch (_) {
            continue
          }

          if (
            scanProps(fiber?.pendingProps, `ancestor[${level}].pendingProps`) ||
            scanProps(fiber?.memoizedProps, `ancestor[${level}].memoizedProps`)
          ) {
            this.sceneAgentPortraitCache.set(sceneKey, {
              ...portraitMap
            })

            return portraitMap
          }
        }

        const propsKeys = ownKeys.filter(key => key.startsWith('__reactProps$'))

        for (const propsKey of propsKeys) {
          let props

          try {
            props = element[propsKey]
          } catch (_) {
            continue
          }

          if (scanProps(props, `ancestor[${level}].__reactProps`)) {
            this.sceneAgentPortraitCache.set(sceneKey, {
              ...portraitMap
            })

            return portraitMap
          }
        }

        element = element.parentElement
      }

      this.sceneAgentPortraitMissAt.set(sceneKey, Date.now())

      return {}
    },

    getSceneCastRecord(key = this.getCurrentSceneCastKey()) {
      if (!key) {
        return null
      }

      return this.getSceneCastStore()[key] || null
    },

    upsertSceneCastRecord(record) {
      const key = String(record?.key || '').trim()

      if (!key) {
        return false
      }

      const store = this.getSceneCastStore()

      store[key] = record

      return this.saveSceneCastStore(store)
    },

    getCastSignatureFromRecord(record) {
      if (!record) {
        return ''
      }

      return JSON.stringify({
        key: record.key || '',
        members: record.members || record.cast || {}
      })
    },

    applyCapturedSceneCastForCurrentConversation() {
      const key = this.getCurrentSceneCastKey()

      const record = this.getSceneCastRecord(key)

      const automatic = this.getSceneAgentPortraitMap()

      const capturedMembers = record?.members || record?.cast || {}

      /*
                Old VN priority:
                    captured Scene Cast
                    → React scene agents
                    → shared scene/base artwork

                Build one speaker map with React first, then let an explicit
                Capture Cast record override it.
            */

      const resolved = new Map()

      Object.entries(automatic).forEach(([speaker, image]) => {
        if (speaker && image) {
          resolved.set(this.normalizeSpeakerKey(speaker), image)
        }
      })

      Object.values(capturedMembers).forEach(member => {
        const name = String(member?.name || '').trim()

        const image = String(member?.image || '').trim()

        if (!name || !image) {
          return
        }

        this.getSpeakerAliases(name).forEach(alias => {
          resolved.set(alias, image)
        })
      })

      const signature = JSON.stringify({
        key,
        captured: capturedMembers,
        automatic: Object.fromEntries(resolved)
      })

      const portraitMapMatches =
        this.speakerPortraits.size === resolved.size &&
        [...resolved.entries()].every(
          ([speaker, image]) => this.speakerPortraits.get(speaker) === image
        )

      if (
        key === this.activeSceneCastKey &&
        signature === this.activeSceneCastSignature &&
        portraitMapMatches
      ) {
        return
      }

      this.activeSceneCastKey = key

      this.activeSceneCastSignature = signature

      this.speakerPortraits.clear()

      resolved.forEach((image, speaker) => {
        this.speakerPortraits.set(speaker, image)
      })

      if (resolved.size) {
        console.info('[Furina Visual Novel] Speaker portraits ready:', [
          ...resolved.keys()
        ])
      }

      if (this.isActive) {
        this.refreshStageIdentity(this.getCurrentBeat())
      }
    },

    getLargestImageFromContainer(
      container,
      {minimumWidth = 120, minimumHeight = 120, ignoreUploadedAlt = false} = {}
    ) {
      if (!(container instanceof HTMLElement)) {
        return null
      }

      const candidates = [...container.querySelectorAll('img')]
        .map(image => {
          const rect = image.getBoundingClientRect()

          const width = Math.max(
            rect.width || 0,
            Number(image.getAttribute('width')) || 0,
            image.naturalWidth || 0
          )

          const height = Math.max(
            rect.height || 0,
            Number(image.getAttribute('height')) || 0,
            image.naturalHeight || 0
          )

          return {
            image,
            width,
            height,
            area: width * height
          }
        })
        .filter(candidate => {
          const image = candidate.image

          const alt = String(image.alt || '').trim()

          const source = image.currentSrc || image.src || ''

          if (
            !source ||
            candidate.width < minimumWidth ||
            candidate.height < minimumHeight
          ) {
            return false
          }

          if (/placeholder/i.test(source)) {
            return false
          }

          if (ignoreUploadedAlt && /^uploaded image/i.test(alt)) {
            return false
          }

          return true
        })
        .sort((left, right) => right.area - left.area)

      return candidates[0]?.image || null
    },

    getSceneDetailsModalCandidates() {
      const buttons = [...document.querySelectorAll('button')].filter(button =>
        /^(copy link|share)$/i.test(String(button.textContent || '').trim())
      )

      const modals = []

      const seen = new Set()

      buttons.forEach(button => {
        const modal =
          button.closest("[role='dialog']") ||
          button.closest("[data-state='open']") ||
          button.closest('.fixed')

        if (!(modal instanceof HTMLElement) || seen.has(modal)) {
          return
        }

        const text = String(modal.innerText || '')

        if (!/scene details/i.test(text)) {
          return
        }

        seen.add(modal)

        modals.push(modal)
      })

      return modals
    },

    getSceneDetailsToolbar(modal) {
      if (!(modal instanceof HTMLElement)) {
        return null
      }

      const shareButton = [...modal.querySelectorAll('button')].find(button =>
        /^share$/i.test(String(button.textContent || '').trim())
      )

      if (!shareButton) {
        return null
      }

      return shareButton.parentElement || shareButton.closest('div')
    },

    getSceneDetailsTitle(modal) {
      if (!(modal instanceof HTMLElement)) {
        return ''
      }

      const candidates = [
        ...modal.querySelectorAll("h1, h2, h3, [data-slot='title']")
      ]
        .map(element => String(element.textContent || '').trim())
        .filter(Boolean)

      return candidates.find(text => !/scene details/i.test(text)) || ''
    },

    getSceneDetailsArtworkUrl(modal) {
      const image = this.getLargestImageFromContainer(modal, {
        minimumWidth: 160,
        minimumHeight: 160,
        ignoreUploadedAlt: false
      })

      if (!(image instanceof HTMLImageElement)) {
        return ''
      }

      const source = image.currentSrc || image.src || ''

      const base = this.getClankImageAssetBase(source)

      return base ? `${base}/w=1536,q=100,f=webp` : source
    },

    findCharactersInvolvedSection(modal) {
      if (!(modal instanceof HTMLElement)) {
        return null
      }

      const headings = [
        ...modal.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p')
      ]

      for (const heading of headings) {
        const text = String(heading.textContent || '').trim()

        if (!/^characters involved$/i.test(text)) {
          continue
        }

        let current = heading.parentElement

        while (current && current !== modal) {
          const images = current.querySelectorAll('img')

          if (images.length >= 2) {
            return current
          }

          current = current.parentElement
        }
      }

      return null
    },

    extractCastMembersFromContainer(container) {
      if (!(container instanceof HTMLElement)) {
        return {}
      }

      const members = {}

      ;[...container.querySelectorAll('img')].forEach(image => {
        const source = image.currentSrc || image.src || ''

        const alt = String(
          image.alt || image.title || image.getAttribute('aria-label') || ''
        ).trim()

        const rect = image.getBoundingClientRect()

        if (
          !source ||
          !alt ||
          alt.length > 80 ||
          rect.width < 24 ||
          rect.height < 24 ||
          rect.width > 180 ||
          rect.height > 180 ||
          /^uploaded image/i.test(alt) ||
          /^(avatar|profile|profile picture|image|scene details)$/i.test(alt)
        ) {
          return
        }

        const key = this.normalizeSpeakerKey(alt)

        if (!key || members[key]) {
          return
        }

        const base = this.getClankImageAssetBase(source)

        members[key] = {
          name: alt,
          image: base ? `${base}/w=1024,q=100,f=webp` : source
        }
      })

      return members
    },

    extractSceneCastFromModal(modal) {
      if (!(modal instanceof HTMLElement)) {
        return null
      }

      const artwork = this.getSceneDetailsArtworkUrl(modal)

      const key = this.buildSceneArtworkKey(artwork)

      if (!key) {
        return null
      }

      let members = {}

      const charactersSection = this.findCharactersInvolvedSection(modal)

      if (charactersSection) {
        members = this.extractCastMembersFromContainer(charactersSection)
      }

      /*
                Reliable fallback for simpler scenes:
                capture the current lead character avatar from the
                right-hand Initial message card or the "See character
                profile" area when a dedicated cast section is absent.
            */

      if (!Object.keys(members).length) {
        const leadArea =
          [...modal.querySelectorAll('button, a, div')].find(element =>
            /see character profile/i.test(String(element.textContent || ''))
          )?.parentElement || modal

        members = this.extractCastMembersFromContainer(leadArea)
      }

      if (!Object.keys(members).length) {
        return null
      }

      return {
        key,
        title: this.getSceneDetailsTitle(modal),
        artwork,
        members,
        capturedAt: Date.now()
      }
    },

    updateSceneCastButtonState(button, record) {
      if (!(button instanceof HTMLButtonElement)) {
        return
      }

      const count = Object.keys(record?.members || {}).length

      if (count) {
        button.textContent = `Cast ✓ ${count}`

        button.dataset.state = 'captured'
      } else {
        button.textContent = 'Capture Cast'

        button.dataset.state = 'idle'
      }
    },

    captureSceneCastFromModal(modal, button = null) {
      const record = this.extractSceneCastFromModal(modal)

      if (!record) {
        console.warn(
          '[Furina Visual Novel] No character portraits were found in this Scene details panel.'
        )

        if (button instanceof HTMLButtonElement) {
          button.textContent = 'No Cast'

          button.dataset.state = 'error'

          window.setTimeout(() => {
            this.updateSceneCastButtonState(button, null)
          }, 1600)
        }

        return false
      }

      const saved = this.upsertSceneCastRecord(record)

      if (!saved) {
        return false
      }

      if (button instanceof HTMLButtonElement) {
        this.updateSceneCastButtonState(button, record)
      }

      this.applyCapturedSceneCastForCurrentConversation()

      console.info('[Furina Visual Novel] Captured scene cast', {
        key: record.key,
        title: record.title,
        members: record.members
      })

      return true
    },

    ensureSceneDetailsCaptureButton() {
      const modals = this.getSceneDetailsModalCandidates()

      modals.forEach(modal => {
        const toolbar = this.getSceneDetailsToolbar(modal)

        if (!(toolbar instanceof HTMLElement)) {
          return
        }

        let button = toolbar.querySelector('.furina-vn-capture-cast-button')

        const existingRecord = this.getSceneCastRecord(
          this.buildSceneArtworkKey(this.getSceneDetailsArtworkUrl(modal))
        )

        if (button instanceof HTMLButtonElement) {
          this.updateSceneCastButtonState(button, existingRecord)
          return
        }

        button = document.createElement('button')

        button.className = 'furina-vn-capture-cast-button'
        button.type = 'button'
        button.dataset.state = 'idle'
        button.addEventListener('click', event => {
          event.preventDefault()
          event.stopPropagation()

          this.captureSceneCastFromModal(modal, button)
        })

        this.updateSceneCastButtonState(button, existingRecord)

        toolbar.appendChild(button)
      })
    },

    startSceneDetailsSupport() {
      if (this.sceneDetailsTimer) {
        return
      }

      this.ensureSceneDetailsCaptureButton()

      this.sceneDetailsTimer = window.setInterval(() => {
        this.ensureSceneDetailsCaptureButton()
      }, 800)
    },

    stopSceneDetailsSupport() {
      if (this.sceneDetailsTimer) {
        clearInterval(this.sceneDetailsTimer)

        this.sceneDetailsTimer = null
      }
    },

    setSpeakerPortrait(speaker, imageUrl) {
      const key = this.normalizeSpeakerKey(speaker)

      const value = String(imageUrl || '').trim()

      if (!key) {
        return false
      }

      const aliases = this.getSpeakerAliases(speaker)

      if (!value) {
        aliases.forEach(alias => {
          this.speakerPortraits.delete(alias)
        })
      } else {
        aliases.forEach(alias => {
          this.speakerPortraits.set(alias, value)
        })
      }

      if (this.isActive) {
        this.refreshStageIdentity(this.getCurrentBeat())
      }

      return true
    },

    setSpeakerPortraits(entries) {
      if (!entries) {
        return
      }

      const pairs =
        entries instanceof Map
          ? [...entries.entries()]
          : Array.isArray(entries)
            ? entries
            : Object.entries(entries)

      pairs.forEach(entry => {
        if (!Array.isArray(entry) || entry.length < 2) {
          return
        }

        this.setSpeakerPortrait(entry[0], entry[1])
      })
    },

    clearSpeakerPortraits() {
      this.speakerPortraits.clear()

      if (this.isActive) {
        this.refreshStageIdentity(this.getCurrentBeat())
      }
    },

    getSpeakerPortrait(beat) {
      if (beat?.type !== 'speaker' || !beat.speaker) {
        return ''
      }

      const key = this.normalizeSpeakerKey(beat.speaker)

      return this.speakerPortraits.get(key) || ''
    },

    isVisibleMessageNode(element) {
      if (!(element instanceof HTMLElement)) {
        return false
      }

      if (
        element.hidden ||
        element.getAttribute('aria-hidden') === 'true' ||
        element.closest("[hidden], [aria-hidden='true']")
      ) {
        return false
      }

      const style = window.getComputedStyle(element)

      return style.display !== 'none' && style.visibility !== 'hidden'
    },

    extractMessageStructure(element) {
      const body = this.getMessageBody(element)

      if (!body) {
        return {
          blocks: [],

          flow: []
        }
      }

      const semanticSelector = [
        'p',
        'blockquote',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'hr'
      ].join(',')

      /*
                Use leaf semantic nodes instead of every semantic ancestor.

                Clank can render structures such as blockquote > p. Reading
                both would duplicate the same text in the VN.
            */

      const semanticNodes = Array.from(body.querySelectorAll(semanticSelector))
        .filter(node => this.isVisibleMessageNode(node))
        .filter(node => !node.querySelector(semanticSelector))

      const imageNodes = Array.from(body.querySelectorAll('img')).filter(
        image => this.isVisibleMessageNode(image)
      )

      const orderedNodes = [...semanticNodes, ...imageNodes].sort(
        (left, right) => {
          if (left === right) {
            return 0
          }

          const position = left.compareDocumentPosition(right)

          if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
            return -1
          }

          if (position & Node.DOCUMENT_POSITION_PRECEDING) {
            return 1
          }

          return 0
        }
      )

      const blocks = []

      const flow = []

      const seenImages = new Set()

      orderedNodes.forEach(node => {
        if (node instanceof HTMLImageElement) {
          const source = node.currentSrc || node.src || ''

          if (!source) {
            return
          }

          const base = this.getClankImageAssetBase(source)

          const dedupeKey = base || source

          if (seenImages.has(dedupeKey)) {
            return
          }

          seenImages.add(dedupeKey)

          const rect = node.getBoundingClientRect()

          const width = Number(
            node.naturalWidth || node.getAttribute('width') || rect.width || 0
          )

          const height = Number(
            node.naturalHeight ||
              node.getAttribute('height') ||
              rect.height ||
              0
          )

          flow.push({
            type: 'image',

            src: base ? `${base}/w=1600,q=100,f=webp` : source,

            alt: String(node.alt || '').trim(),

            width,

            height
          })

          return
        }

        const tag = node.tagName.toLowerCase()

        const sourceBlockIndex = blocks.length

        if (tag === 'hr') {
          const block = {
            tag,
            text: ''
          }

          blocks.push(block)

          flow.push({
            type: 'break',

            tag,

            text: '',

            sourceBlockIndex
          })

          return
        }

        const text = node.innerText?.trim?.() || ''

        if (!text) {
          return
        }

        const block = {
          tag,
          text
        }

        blocks.push(block)

        flow.push({
          type: /^h[1-6]$/.test(tag) ? 'heading' : 'text',

          tag,

          text,

          sourceBlockIndex
        })
      })

      /*
                Plain messages may not have paragraph wrappers. In that case
                use only the normalized message body, never the whole row, so
                Furina controls are not pulled into the VN.
            */

      if (!blocks.length && !flow.some(item => item.type === 'image')) {
        const fallback = body.innerText?.trim?.() || ''

        if (fallback) {
          const fallbackParts = fallback
            .split(/\n\s*\n/)
            .map(text => text.trim())
            .filter(Boolean)

          fallbackParts.forEach(text => {
            const sourceBlockIndex = blocks.length

            blocks.push({
              tag: 'p',

              text
            })

            flow.push({
              type: 'text',

              tag: 'p',

              text,

              sourceBlockIndex
            })
          })
        }
      }

      return {
        blocks,
        flow
      }
    },

    extractBlocksFromMessage(element) {
      return this.extractMessageStructure(element).blocks
    },

    extractWholeMessageText(element) {
      const structure = this.extractMessageStructure(element)

      return structure.flow
        .filter(item => item.type === 'text' || item.type === 'heading')
        .map(item => item.text)
        .filter(Boolean)
        .join('\n\n')
        .trim()
    },

    buildAssistantBeatsWithImages({
      structure,
      sourceMessageIndex,
      fallbackSpeaker
    }) {
      const parser = Atelier.VisualNovelParser

      if (!parser?.parseBlock) {
        return (
          parser?.parseBlocks?.({
            blocks: structure.blocks,

            sourceMessageIndex,

            fallbackSpeaker
          }) || []
        )
      }

      const pages = []

      const pendingFlow = []

      structure.flow.forEach(item => {
        if (item.type === 'image') {
          const current = pages[pages.length - 1]

          if (current) {
            current.flow.push(item)
          } else {
            pendingFlow.push(item)
          }

          return
        }

        const sourceBlockIndex = item.sourceBlockIndex

        const block = structure.blocks[sourceBlockIndex]

        if (!block) {
          return
        }

        const beat = parser.parseBlock({
          block,
          sourceMessageIndex,
          sourceBlockIndex,
          fallbackSpeaker
        })

        if (!beat) {
          return
        }

        const displayItem = {
          ...item,

          text: beat.type === 'speaker' ? beat.content : item.text
        }

        const previous = pages[pages.length - 1]

        if (previous && parser.canMergeBeats?.(previous, beat)) {
          parser.mergeBeatInto?.(previous, beat)

          previous.flow.push(...pendingFlow, displayItem)

          pendingFlow.length = 0

          return
        }

        beat.flow = [...pendingFlow, displayItem]

        pendingFlow.length = 0

        pages.push(beat)
      })

      if (pendingFlow.length) {
        const previous = pages[pages.length - 1]

        if (previous) {
          previous.flow.push(...pendingFlow)
        } else {
          pages.push({
            id: `${sourceMessageIndex}-media`,

            type: 'narration',

            speaker: null,

            content: '',

            flow: [...pendingFlow],

            sourceMessageIndex,

            sourceBlockIndex: 0,

            sourceBlockIndices: [0]
          })
        }
      }

      return pages
    },

    splitTextIntoAdvPages(value, limit = this.ADV_PAGE_CHAR_LIMIT) {
      const text = String(value || '')
        .replace(/\r\n/g, '\n')
        .trim()

      if (!text) {
        return []
      }

      if (text.length <= limit) {
        return [text]
      }

      const paragraphs = text
        .split(/\n\s*\n/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean)

      const units = []

      paragraphs.forEach(paragraph => {
        if (paragraph.length <= limit) {
          units.push(paragraph)

          return
        }

        const words = paragraph.split(/\s+/)

        let chunk = ''

        words.forEach(word => {
          const candidate = chunk ? `${chunk} ${word}` : word

          if (candidate.length > limit && chunk) {
            units.push(chunk)

            chunk = word
          } else {
            chunk = candidate
          }
        })

        if (chunk) {
          units.push(chunk)
        }
      })

      const pages = []

      let current = ''

      units.forEach(unit => {
        const candidate = current ? `${current}\n\n${unit}` : unit

        if (candidate.length > limit && current) {
          pages.push(current)

          current = unit
        } else {
          current = candidate
        }
      })

      if (current) {
        pages.push(current)
      }

      return pages
    },

    paginateFlowBeatForAdv(beat) {
      const flow = Array.isArray(beat?.flow) ? beat.flow : []

      if (!flow.some(item => item.type === 'image')) {
        return null
      }

      const pages = []

      let stageImage = null

      let stageImagePending = false

      let textItems = []

      let pageIndex = 0

      const createPage = (content, image = stageImage) => {
        const page = {
          ...beat,

          id: `${beat.id}-adv-${pageIndex}`,

          content: content || '',

          flow: [],

          stageImage: image
            ? {
                ...image
              }
            : null,

          advPageIndex: pageIndex
        }

        pageIndex += 1

        pages.push(page)
      }

      const flushText = () => {
        const combined = textItems
          .filter(item => item.type === 'text' || item.type === 'heading')
          .map(item => item.text)
          .filter(Boolean)
          .join('\n\n')
          .trim()

        textItems = []

        if (!combined) {
          return false
        }

        const pageLimit =
          beat.type === 'opening' ? 1250 : this.ADV_PAGE_CHAR_LIMIT

        const chunks = this.splitTextIntoAdvPages(combined, pageLimit)

        chunks.forEach(chunk => {
          createPage(chunk)
        })

        stageImagePending = false

        return true
      }

      flow.forEach(item => {
        if (item.type === 'image') {
          flushText()

          if (stageImage && stageImagePending) {
            createPage('', stageImage)
          }

          stageImage = item

          stageImagePending = true

          return
        }

        if (item.type === 'break') {
          flushText()

          if (stageImage && stageImagePending) {
            createPage('', stageImage)

            stageImagePending = false
          }

          return
        }

        textItems.push(item)
      })

      flushText()

      if (stageImage && stageImagePending) {
        createPage('', stageImage)
      }

      return pages.length ? pages : [beat]
    },

    paginateBeatForAdv(beat) {
      if (!beat) {
        return []
      }

      const imagePages = this.paginateFlowBeatForAdv(beat)

      if (imagePages) {
        return imagePages
      }

      if (
        beat.type === 'user' ||
        beat.type === 'scene-heading' ||
        beat.type === 'scene-break'
      ) {
        return [
          {
            ...beat,
            flow: []
          }
        ]
      }

      const chunks = this.splitTextIntoAdvPages(beat.content)

      if (chunks.length <= 1) {
        return [
          {
            ...beat,
            flow: []
          }
        ]
      }

      return chunks.map((chunk, index) => ({
        ...beat,

        id: `${beat.id}-adv-${index}`,

        content: chunk,

        flow: [],

        advPageIndex: index
      }))
    },

    prepareAdvPages(beats) {
      return beats.flatMap(beat => this.paginateBeatForAdv(beat))
    },

    getInheritedStageImage(beat) {
      if (!beat) {
        return null
      }

      const direct = beat.stageImage

      if (direct?.src) {
        return direct
      }

      const currentIndex = this.currentBeatIndex

      for (let index = currentIndex - 1; index >= 0; index -= 1) {
        const previous = this.beats[index]

        if (
          !previous ||
          previous.sourceMessageIndex !== beat.sourceMessageIndex
        ) {
          break
        }

        if (previous.stageImage?.src) {
          return previous.stageImage
        }
      }

      return null
    },

    resolveStageArtwork(beat) {
      const cg = this.getInheritedStageImage(beat)

      const speakerPortrait = this.getSpeakerPortrait(beat)

      const basePortrait = this.getCachedBasePortrait()

      if (cg?.src) {
        return {
          src: cg.src,

          kind: 'cg',

          alt: cg.alt || ''
        }
      }

      if (speakerPortrait) {
        return {
          src: speakerPortrait,

          kind: 'speaker',

          alt: beat?.speaker || ''
        }
      }

      return {
        src: basePortrait || '',

        kind: basePortrait ? 'base' : 'none',

        alt: ''
      }
    },

    getFlowItemSignature(item) {
      if (!item) {
        return ''
      }

      if (item.type === 'image') {
        const base = this.getClankImageAssetBase(item.src || '')

        return `image:${base || item.src || ''}`
      }

      return `${item.type || 'text'}:${String(item.text || '')
        .replace(/\s+/g, ' ')
        .trim()}`
    },

    collapseRepeatedOpeningFlow(flow) {
      if (!Array.isArray(flow) || flow.length < 6) {
        return flow
      }

      const signatures = flow.map(item => this.getFlowItemSignature(item))

      const hasImage = flow.some(item => item.type === 'image')

      for (let period = Math.floor(flow.length / 2); period >= 3; period -= 1) {
        if (flow.length % period !== 0) {
          continue
        }

        const repetitions = flow.length / period

        if (repetitions < 2) {
          continue
        }

        let matches = true

        for (let index = period; index < signatures.length; index += 1) {
          if (signatures[index] !== signatures[index % period]) {
            matches = false
            break
          }
        }

        if (!matches) {
          continue
        }

        const firstCycle = flow.slice(0, period)

        const textLength = firstCycle
          .filter(item => item.type === 'text' || item.type === 'heading')
          .reduce((total, item) => total + String(item.text || '').length, 0)

        if (hasImage || textLength >= 180) {
          console.info(
            '[Furina Visual Novel] Collapsed repeated opening render.',
            {
              originalItems: flow.length,
              keptItems: firstCycle.length,
              repetitions
            }
          )

          return firstCycle
        }
      }

      return flow
    },

    isConversationAtStart() {
      const root = this.getConversationRoot()

      if (!root) {
        return false
      }

      return root.scrollTop <= 8
    },

    getBeatTimelineSignature(beat) {
      if (!beat) {
        return ''
      }

      const stageImage = beat.stageImage?.src || ''

      return [
        beat.type || '',
        beat.speaker || '',
        beat.content || '',
        stageImage,
        Number.isInteger(beat.advPageIndex) ? beat.advPageIndex : ''
      ].join('::')
    },

    mergeTimelineBeats(existing, incoming, {prepend = false} = {}) {
      const first = prepend ? incoming : existing

      const second = prepend ? existing : incoming

      const merged = []

      const seen = new Set()

      ;[...first, ...second].forEach(beat => {
        const signature = this.getBeatTimelineSignature(beat)

        if (signature && seen.has(signature)) {
          return
        }

        if (signature) {
          seen.add(signature)
        }

        merged.push(beat)
      })

      /*
                The creator greeting is always the beginning of the VN.
                If it was discovered later while hydrating older history,
                move its pages in front of the rest of the cached timeline.
            */

      const openings = merged.filter(beat => beat.type === 'opening')

      const others = merged.filter(beat => beat.type !== 'opening')

      return [...openings, ...others]
    },

    getCachedTimeline() {
      return this.timelineCache.get(this.getConversationId()) || []
    },

    setCachedTimeline(beats) {
      this.timelineCache.set(
        this.getConversationId(),
        Array.isArray(beats) ? beats : []
      )
    },

    async hydrateConversationHistory() {
      const root = this.getConversationRoot()

      if (!root || this.historyHydrating) {
        return
      }

      const originalScrollTop = root.scrollTop

      this.historyHydrating = true

      try {
        let previousScrollHeight = -1

        let stablePasses = 0

        for (let attempt = 0; attempt < 10; attempt += 1) {
          root.scrollTop = 0

          await new Promise(resolve => {
            window.setTimeout(resolve, 110)
          })

          this.getCachedBasePortrait()

          this.rebuildBeats({
            preservePosition: true,
            quiet: true,
            cacheDirection: 'prepend'
          })

          const currentScrollHeight = root.scrollHeight

          if (
            root.scrollTop <= 8 &&
            currentScrollHeight === previousScrollHeight
          ) {
            stablePasses += 1
          } else {
            stablePasses = 0
          }

          previousScrollHeight = currentScrollHeight

          if (stablePasses >= 2) {
            break
          }
        }
      } finally {
        root.scrollTop = originalScrollTop

        this.historyHydrating = false
      }
    },

    isLikelyCreatorOpening({
      structure,
      sourceMessageIndex,
      assistantMessageIndex
    }) {
      if (assistantMessageIndex !== 0 || sourceMessageIndex !== 0) {
        return false
      }

      /*
                A creator greeting is the first assistant source row.

                The old implementation additionally required scrollTop === 0.
                That was too fragile: Clank can restore the scroller a few
                pixels away from the top, and the same giant creator greeting
                would then be parsed as a normal assistant response.

                A normal assistant response becomes one VN beat per semantic
                paragraph/speaker line. On a very large greeting that can look
                like 100+ "pages" even though nothing is actually duplicated.
            */

      if (this.isConversationAtStart()) {
        return true
      }

      const flow = Array.isArray(structure?.flow) ? structure.flow : []

      const text = flow
        .filter(item => item.type === 'text' || item.type === 'heading')
        .map(item => item.text || '')
        .join('\n')

      const imageCount = flow.filter(item => item.type === 'image').length

      const hasCreatorTurnCue =
        /(?:^|\n)\s*(?:#+\s*)?YOUR TURN\s*(?:\n|$)/i.test(text)

      const hasSceneMetadata =
        /(?:^|\n)\s*Location\s*:/i.test(text) &&
        /(?:^|\n)\s*(?:Date|Time)\s*:/i.test(text)

      const isLargeIllustratedGreeting = imageCount >= 2 && text.length >= 1800

      return (
        hasCreatorTurnCue ||
        (hasSceneMetadata && text.length >= 900) ||
        isLargeIllustratedGreeting
      )
    },

    buildBeats() {
      const parser = Atelier.VisualNovelParser

      if (!parser) {
        return []
      }

      const messages = this.getConversationMessageElements()

      this.applyCapturedSceneCastForCurrentConversation()

      const hasMultipleSceneSpeakers =
        new Set(this.speakerPortraits.values()).size > 1

      const fallbackSpeaker = hasMultipleSceneSpeakers
        ? null
        : this.getCurrentCharacterName()

      if (messages.length) {
        const sourceSummary = messages.map((element, index) => {
          const structure = this.extractMessageStructure(element)

          return {
            index,
            role: this.getMessageRole(element),
            textCharacters: structure.flow
              .filter(item => item.type === 'text' || item.type === 'heading')
              .reduce(
                (total, item) => total + String(item.text || '').length,
                0
              ),
            images: structure.flow.filter(item => item.type === 'image').length,
            flowItems: structure.flow.length
          }
        })

        const signature = JSON.stringify(sourceSummary)

        if (this._lastSourceSummarySignature !== signature) {
          this._lastSourceSummarySignature = signature

          console.info('[Furina Visual Novel] Source rows', sourceSummary)
        }
      }

      const nextBeats = []

      let assistantMessageIndex = 0

      messages.forEach((element, sourceMessageIndex) => {
        const role = this.getMessageRole(element)

        const structure = this.extractMessageStructure(element)

        if (role === 'user') {
          const content = structure.flow
            .filter(item => item.type === 'text' || item.type === 'heading')
            .map(item => item.text)
            .filter(Boolean)
            .join('\n\n')
            .trim()

          if (content || structure.flow.length) {
            nextBeats.push({
              id: `user-${sourceMessageIndex}`,

              type: 'user',

              speaker: 'YOU',

              content,

              flow: structure.flow,

              sourceMessageIndex,

              sourceBlockIndex: 0,

              sourceBlockIndices: structure.blocks.map((_, index) => index)
            })
          }

          return
        }

        if (role !== 'assistant') {
          return
        }

        /*
                        Keep the creator greeting as one source beat here.
                        The ADV pagination pass below will turn its ordered
                        text/images into scene-sized pages without losing the
                        original DOM order.
                    */

        if (
          this.isLikelyCreatorOpening({
            structure,
            sourceMessageIndex,
            assistantMessageIndex
          })
        ) {
          const openingFlow = this.collapseRepeatedOpeningFlow(structure.flow)

          const openingText = openingFlow
            .filter(item => item.type === 'text' || item.type === 'heading')
            .map(item => item.text)
            .filter(Boolean)
            .join('\n\n')
            .trim()

          if (openingText || openingFlow.length) {
            nextBeats.push({
              id: `opening-${sourceMessageIndex}`,

              type: 'opening',

              speaker: null,

              content: openingText,

              flow: openingFlow,

              sourceMessageIndex,

              sourceBlockIndex: 0,

              sourceBlockIndices: structure.blocks.map((_, index) => index)
            })
          }

          assistantMessageIndex += 1

          return
        }

        const hasImages = structure.flow.some(item => item.type === 'image')

        if (hasImages) {
          nextBeats.push(
            ...this.buildAssistantBeatsWithImages({
              structure,
              sourceMessageIndex,
              fallbackSpeaker
            })
          )
        } else {
          nextBeats.push(
            ...parser.parseBlocks({
              blocks: structure.blocks,

              sourceMessageIndex,

              fallbackSpeaker
            })
          )
        }

        assistantMessageIndex += 1
      })

      /*
                Last-resort source lock.

                The DOM-level filter above should remove duplicate rendered
                rows. This pass additionally protects the timeline if Clank
                exposes the same normalized source turn through two wrappers
                that do not share a stable DOM identity.
            */

      const lockedBeats = []

      const seenSourceBeats = new Set()

      nextBeats.forEach(beat => {
        const flowSignature = Array.isArray(beat.flow)
          ? beat.flow
              .map(item => {
                if (item.type === 'image') {
                  return `image:${item.src || ''}`
                }

                return `${item.type}:${item.text || ''}`
              })
              .join('||')
          : ''

        const signature = [
          beat.type,
          beat.speaker || '',
          beat.content || '',
          flowSignature
        ].join('::')

        if (seenSourceBeats.has(signature)) {
          return
        }

        seenSourceBeats.add(signature)

        lockedBeats.push(beat)
      })

      return this.prepareAdvPages(lockedBeats)
    },

    rebuildBeats({
      startAtBeginning = false,
      preservePosition = false,
      followLatest = false,
      quiet = false,
      cacheDirection = 'append'
    } = {}) {
      const oldBeats = this.beats

      const oldIndex = this.currentBeatIndex

      const oldBeat = oldBeats[oldIndex] || null

      const wasAtLatest = oldBeats.length > 0 && oldIndex >= oldBeats.length - 1

      let nextBeats = []

      try {
        nextBeats = this.buildBeats()
      } catch (error) {
        console.error(
          '[Furina Visual Novel] Could not rebuild conversation beats.',
          error
        )

        this.beats = []

        this.currentBeatIndex = -1

        if (this.elements.dialogueText) {
          this.elements.dialogueText.textContent =
            'Visual Novel could not read this conversation. Check the console for the Furina error.'
        }

        this.setComposerStatus?.('READ ERROR', 'error')

        return
      }

      /*
                The currently mounted Clank message list is authoritative.

                Do not accumulate separate virtualized snapshots into a
                permanent VN cache. That strategy can turn one conversation
                into hundreds of duplicate ADV pages as Clank re-renders.
            */

      this.setCachedTimeline(nextBeats)

      this.beats = nextBeats

      if (!nextBeats.length) {
        this.currentBeatIndex = -1

        this.renderCurrentBeat({
          animate: false,
          typewriter: false
        })

        return
      }

      if (startAtBeginning) {
        this.currentBeatIndex = 0
      } else if (followLatest || (preservePosition && wasAtLatest)) {
        this.currentBeatIndex = nextBeats.length - 1
      } else if (preservePosition && oldBeat) {
        const preservedIndex = nextBeats.findIndex(
          beat => beat.id === oldBeat.id
        )

        this.currentBeatIndex =
          preservedIndex >= 0
            ? preservedIndex
            : Math.min(oldIndex, nextBeats.length - 1)
      } else {
        this.currentBeatIndex = nextBeats.length - 1
      }

      const currentBeat = this.getCurrentBeat()

      const sameBeat = Boolean(
        oldBeat && currentBeat && oldBeat.id === currentBeat.id
      )

      const contentChanged = sameBeat && oldBeat.content !== currentBeat.content

      this.renderCurrentBeat({
        animate: !quiet && !contentChanged,

        typewriter: !quiet && !contentChanged
      })
    },

    getCurrentBeat() {
      if (this.currentBeatIndex < 0) {
        return null
      }

      return this.beats[this.currentBeatIndex] || null
    },

    goPrevious() {
      if (this.isTyping) {
        this.completeTypewriter()
        return
      }

      if (this.currentBeatIndex <= 0) {
        return
      }

      this.currentBeatIndex -= 1

      this.renderCurrentBeat()
    },

    goNext() {
      if (this.isTyping) {
        this.completeTypewriter()
        return
      }

      if (this.currentBeatIndex >= this.beats.length - 1) {
        return
      }

      this.currentBeatIndex += 1

      this.renderCurrentBeat()
    },

    goLatest() {
      if (!this.beats.length) {
        return
      }

      this.stopTypewriter()

      this.currentBeatIndex = this.beats.length - 1

      this.renderCurrentBeat()
    },

    stopTypewriter() {
      if (this.typewriterTimer) {
        clearInterval(this.typewriterTimer)
      }

      this.typewriterTimer = null

      this.isTyping = false

      this.root?.classList.remove('furina-vn-is-typing')
    },

    completeTypewriter() {
      const beat = this.getCurrentBeat()

      if (!beat || !this.elements.dialogueText) {
        return
      }

      this.stopTypewriter()

      this.currentRenderedText = beat.content

      this.elements.dialogueText.textContent = beat.content

      this.root?.classList.remove('furina-vn-is-typing')

      this.updateContinueIndicator()

      this.scheduleAutoAdvance()
    },

    renderTypewriter(text) {
      this.stopTypewriter()

      const target = this.elements.dialogueText

      if (!target) {
        return
      }

      const value = String(text || '')

      if (!value) {
        target.textContent = ''
        return
      }

      let index = 0

      this.currentRenderedText = value

      this.isTyping = true

      this.root?.classList.add('furina-vn-is-typing')

      target.textContent = ''

      this.updateContinueIndicator()

      this.typewriterTimer = window.setInterval(() => {
        index += 2

        target.textContent = value.slice(0, index)

        if (index >= value.length) {
          this.completeTypewriter()
        }
      }, this.TYPEWRITER_DELAY)
    },

    updateContinueIndicator() {
      const indicator = this.elements.continueIndicator

      if (!indicator) {
        return
      }

      const hasNext = this.currentBeatIndex < this.beats.length - 1

      indicator.hidden = !(this.isTyping || hasNext)

      indicator.textContent = this.isTyping ? '…' : '▼'
    },

    clearAutoTimer() {
      if (this.autoTimer) {
        clearTimeout(this.autoTimer)
      }

      this.autoTimer = null
    },

    scheduleAutoAdvance() {
      this.clearAutoTimer()

      if (
        !this.autoMode ||
        this.isTyping ||
        !this.isActive ||
        this.currentBeatIndex >= this.beats.length - 1
      ) {
        return
      }

      this.autoTimer = window.setTimeout(() => {
        this.autoTimer = null

        if (this.autoMode && this.isActive) {
          this.goNext()
        }
      }, this.AUTO_ADVANCE_DELAY)
    },

    setAutoMode(enabled) {
      this.autoMode = Boolean(enabled)

      const button = this.elements.auto

      if (button) {
        button.classList.toggle('is-active', this.autoMode)

        button.setAttribute('aria-pressed', String(this.autoMode))

        button.textContent = this.autoMode ? 'AUTO ON' : 'AUTO'
      }

      if (this.autoMode) {
        if (!this.isTyping) {
          this.scheduleAutoAdvance()
        }
      } else {
        this.clearAutoTimer()
      }
    },

    toggleAutoMode() {
      this.setAutoMode(!this.autoMode)
    },

    openImageViewer(imageData) {
      const viewer = this.elements.viewer

      const image = this.elements.viewerImage

      const caption = this.elements.viewerCaption

      if (!viewer || !(image instanceof HTMLImageElement) || !imageData?.src) {
        return
      }

      image.src = imageData.src

      image.alt = imageData.alt || ''

      if (caption) {
        caption.textContent = imageData.alt || ''

        caption.hidden = !imageData.alt
      }

      viewer.hidden = false

      this.root?.classList.add('furina-vn-viewer-open')
    },

    closeImageViewer() {
      const viewer = this.elements.viewer

      const image = this.elements.viewerImage

      if (viewer) {
        viewer.hidden = true
      }

      if (image instanceof HTMLImageElement) {
        image.removeAttribute('src')
      }

      this.root?.classList.remove('furina-vn-viewer-open')
    },

    getBeatFlowImages(beat) {
      const flow = Array.isArray(beat?.flow) ? beat.flow : []

      const images = flow.filter(item => item.type === 'image')

      if (beat?.stageImage?.src) {
        images.unshift(beat.stageImage)
      }

      return images
    },

    shouldPromoteBeatImageToStage(beat) {
      if (!beat || beat.type === 'opening') {
        return false
      }

      return this.getBeatFlowImages(beat).length === 1
    },

    getBeatStageImage(beat) {
      if (!this.shouldPromoteBeatImageToStage(beat)) {
        return null
      }

      return this.getBeatFlowImages(beat)[0] || null
    },

    setComposerOpen(open, {focus = true} = {}) {
      this.composerOpen = Boolean(open)

      this.root?.classList.toggle('furina-vn-composer-open', this.composerOpen)

      const reply = this.elements.reply

      if (reply) {
        reply.classList.toggle('is-active', this.composerOpen)

        reply.textContent = this.composerOpen ? 'HIDE' : 'REPLY'
      }

      if (this.composerOpen) {
        this.setBacklogOpen(false)

        this.syncDraftFromClank()

        this.resizeComposer()

        if (focus && this.elements.input instanceof HTMLTextAreaElement) {
          window.setTimeout(() => {
            this.elements.input?.focus?.()
          }, 40)
        }
      }
    },

    toggleComposer(force) {
      const next = typeof force === 'boolean' ? force : !this.composerOpen

      if (next && this.currentBeatIndex < this.beats.length - 1) {
        this.goLatest()
      }

      this.setComposerOpen(next)
    },

    formatBacklogSpeaker(beat) {
      if (!beat) {
        return 'SCENE'
      }

      if (beat.type === 'speaker') {
        return beat.speaker || 'CHARACTER'
      }

      if (beat.type === 'user') {
        return 'YOU'
      }

      if (beat.type === 'opening') {
        return 'OPENING'
      }

      if (beat.type === 'scene-heading') {
        return 'SCENE'
      }

      if (beat.type === 'scene-break') {
        return 'BREAK'
      }

      return 'NARRATION'
    },

    buildBacklogEntries() {
      const list = this.elements.backlogList

      if (!list) {
        return
      }

      list.replaceChildren()

      if (!this.beats.length) {
        const empty = document.createElement('div')

        empty.className = 'furina-vn-backlog-empty'

        empty.textContent = 'No VN pages yet.'

        list.appendChild(empty)

        return
      }

      this.beats.forEach((beat, index) => {
        const button = document.createElement('button')

        button.type = 'button'

        button.className = 'furina-vn-backlog-entry'

        if (index === this.currentBeatIndex) {
          button.classList.add('is-current')
        }

        const meta = document.createElement('div')

        meta.className = 'furina-vn-backlog-entry-meta'

        const label = document.createElement('span')

        label.className = 'furina-vn-backlog-entry-speaker'

        label.textContent = this.formatBacklogSpeaker(beat)

        const counter = document.createElement('span')

        counter.className = 'furina-vn-backlog-entry-index'

        counter.textContent = `${index + 1}/${this.beats.length}`

        meta.append(label, counter)

        const body = document.createElement('div')

        body.className = 'furina-vn-backlog-entry-body'

        const content = String(beat.content || '').trim()

        body.textContent =
          content ||
          (beat.stageImage?.src
            ? '[CG]'
            : this.getBeatFlowImages(beat).length
              ? '[Image]'
              : '[...]')

        button.append(meta, body)

        button.addEventListener('click', () => {
          this.currentBeatIndex = index

          this.setBacklogOpen(false)

          this.renderCurrentBeat()
        })

        list.appendChild(button)
      })
    },

    setBacklogOpen(open) {
      this.backlogOpen = Boolean(open)

      this.root?.classList.toggle('furina-vn-backlog-open', this.backlogOpen)

      const backlog = this.elements.backlog

      const log = this.elements.log

      if (backlog) {
        backlog.hidden = !this.backlogOpen
      }

      if (log) {
        log.classList.toggle('is-active', this.backlogOpen)
      }

      if (this.backlogOpen) {
        this.setComposerOpen(false, {
          focus: false
        })
        this.buildBacklogEntries()
      }
    },

    toggleBacklog(force) {
      const next = typeof force === 'boolean' ? force : !this.backlogOpen

      this.setBacklogOpen(next)
    },

    renderBeatFlow(beat) {
      const media = this.elements.media

      if (!media) {
        return false
      }

      media.replaceChildren()

      const flow = Array.isArray(beat?.flow) ? beat.flow : []

      if (!flow.length) {
        media.hidden = true

        return false
      }

      const promoteToStage = this.shouldPromoteBeatImageToStage(beat)

      let skippedPromotedImage = false

      flow.forEach((item, index) => {
        if (item.type === 'image') {
          if (promoteToStage && !skippedPromotedImage) {
            skippedPromotedImage = true
            return
          }

          const button = document.createElement('button')

          button.className = 'furina-vn-flow-image'

          button.type = 'button'

          button.setAttribute(
            'aria-label',
            item.alt
              ? `Open image: ${item.alt}`
              : `Open message image ${index + 1}`
          )

          if (item.width > 0 && item.height > 0) {
            button.style.setProperty(
              '--furina-vn-image-ratio',
              `${item.width} / ${item.height}`
            )
          }

          const image = document.createElement('img')

          image.src = item.src

          image.alt = item.alt || ''

          image.loading = 'eager'

          image.decoding = 'async'

          image.draggable = false

          button.appendChild(image)

          button.addEventListener('click', event => {
            event.preventDefault()
            event.stopPropagation()

            this.openImageViewer(item)
          })

          media.appendChild(button)

          return
        }

        if (item.type === 'break') {
          const divider = document.createElement('div')

          divider.className = 'furina-vn-flow-break'

          divider.setAttribute('aria-hidden', 'true')

          media.appendChild(divider)

          return
        }

        if (item.type === 'heading') {
          const heading = document.createElement('div')

          heading.className = 'furina-vn-flow-heading'

          heading.textContent = item.text

          media.appendChild(heading)

          return
        }

        if (item.type === 'text') {
          const paragraph = document.createElement('div')

          paragraph.className = 'furina-vn-flow-text'

          paragraph.textContent = item.text

          media.appendChild(paragraph)
        }
      })

      if (!media.children.length) {
        media.hidden = true
        return false
      }

      media.hidden = false

      return true
    },

    renderCurrentBeat({animate = true, typewriter = true} = {}) {
      const beat = this.getCurrentBeat()

      const text = this.elements.dialogueText

      const media = this.elements.media

      const dialogueBox = this.elements.dialogueBox

      if (!text) {
        return
      }

      this.clearAutoTimer()

      this.stopTypewriter()

      this.closeImageViewer()

      if (media) {
        media.replaceChildren()

        media.hidden = true
      }

      if (!beat) {
        if (this.elements.nameplate) {
          this.elements.nameplate.hidden = false

          this.elements.nameplate.textContent = 'VISUAL NOVEL'
        }

        text.textContent = 'No Visual Novel beats were detected yet.'

        if (this.elements.beatCounter) {
          this.elements.beatCounter.textContent = '0 / 0'
        }

        this.updateNavigation()
        this.buildBacklogEntries()

        this.updateContinueIndicator()

        return
      }

      this.root?.classList.remove(
        'furina-vn-state-user',
        'furina-vn-state-speaker',
        'furina-vn-state-narration',
        'furina-vn-state-opening',
        'furina-vn-state-scene-heading',
        'furina-vn-state-scene-break'
      )

      this.root?.classList.add(`furina-vn-state-${beat.type}`)

      const isCgOnly = Boolean(
        this.getInheritedStageImage(beat)?.src &&
        !String(beat.content || '').trim()
      )

      this.root?.classList.toggle('furina-vn-state-cg-only', isCgOnly)

      const nameplate = this.elements.nameplate

      if (nameplate) {
        nameplate.hidden =
          isCgOnly || beat.type === 'narration' || beat.type === 'scene-break'

        if (beat.type === 'user') {
          nameplate.textContent = 'YOU'
        } else if (beat.type === 'speaker') {
          nameplate.textContent = beat.speaker || 'Character'
        } else if (beat.type === 'opening') {
          nameplate.textContent = 'OPENING'
        } else if (beat.type === 'scene-heading') {
          nameplate.textContent = 'SCENE'
        } else {
          nameplate.textContent = 'NARRATION'
        }
      }

      if (this.elements.beatCounter) {
        this.elements.beatCounter.textContent = `${this.currentBeatIndex + 1} / ${this.beats.length}`
      }

      this.refreshStageIdentity(beat)

      const renderedFlow = this.renderBeatFlow(beat)

      this.updateNavigation()
      this.buildBacklogEntries()

      if (this.currentBeatIndex < this.beats.length - 1 && this.composerOpen) {
        this.setComposerOpen(false, {
          focus: false
        })
      }

      if (isCgOnly) {
        this.currentRenderedText = ''

        text.textContent = ''

        this.updateContinueIndicator()

        this.scheduleAutoAdvance()
      } else if (renderedFlow) {
        this.currentRenderedText = ''

        text.textContent = ''

        this.updateContinueIndicator()

        this.scheduleAutoAdvance()
      } else if (
        typewriter &&
        beat.type !== 'user' &&
        beat.type !== 'opening' &&
        beat.type !== 'scene-break'
      ) {
        this.renderTypewriter(beat.content)
      } else {
        this.currentRenderedText = beat.content

        text.textContent = beat.content

        this.updateContinueIndicator()

        this.scheduleAutoAdvance()
      }

      if (dialogueBox) {
        dialogueBox.scrollTop = 0
      }

      if (animate) {
        this.playBeatTransition()
      }
    },

    refreshStageIdentity(beat) {
      const artwork = this.resolveStageArtwork(beat)

      const stageArt = artwork.src

      const image = this.elements.portraitImage

      const background = this.elements.stageBackground

      this.root?.classList.toggle('furina-vn-has-cg', artwork.kind === 'cg')

      this.root?.classList.toggle(
        'furina-vn-has-speaker-portrait',
        artwork.kind === 'speaker'
      )

      if (image instanceof HTMLImageElement) {
        if (stageArt) {
          if (image.src !== stageArt) {
            image.src = stageArt
          }

          image.alt = artwork.alt || ''

          image.hidden = false

          this.root?.classList.add('furina-vn-has-portrait')
        } else {
          image.removeAttribute('src')

          image.alt = ''

          image.hidden = true

          this.root?.classList.remove('furina-vn-has-portrait')
        }
      }

      if (background instanceof HTMLElement) {
        background.style.backgroundImage = stageArt ? `url("${stageArt}")` : ''
      }
    },

    playBeatTransition() {
      const dialogueBox = this.elements.dialogueBox

      const portrait = this.elements.portraitWrap

      for (const element of [dialogueBox, portrait]) {
        element?.classList.remove('furina-vn-beat-enter')
      }

      void this.root?.offsetWidth

      for (const element of [dialogueBox, portrait]) {
        element?.classList.add('furina-vn-beat-enter')
      }

      window.setTimeout(() => {
        for (const element of [dialogueBox, portrait]) {
          element?.classList.remove('furina-vn-beat-enter')
        }
      }, 420)
    },

    updateNavigation() {
      const hasBeats = this.beats.length > 0

      const canPrevious = hasBeats && this.currentBeatIndex > 0

      const canNext = hasBeats && this.currentBeatIndex < this.beats.length - 1

      if (this.elements.previous) {
        this.elements.previous.disabled = !canPrevious
      }

      if (this.elements.next) {
        this.elements.next.disabled = !canNext
      }

      if (this.elements.latest) {
        this.elements.latest.disabled = !hasBeats || !canNext
      }
    },

    debugBeats() {
      console.table(
        this.beats.map((beat, index) => ({
          index,
          type: beat.type,

          speaker: beat.speaker,

          content: beat.content,

          sourceMessageIndex: beat.sourceMessageIndex
        }))
      )

      return this.beats
    },

    getConversationId() {
      const match = location.pathname.match(/^\/chat\/([^/?#]+)/)

      return match?.[1] || location.pathname
    },

    async hasOpenedConversation() {
      const conversationId = this.getConversationId()

      return new Promise(resolve => {
        chrome.storage.local.get(this.OPENED_STORAGE_KEY, result => {
          const opened = result[this.OPENED_STORAGE_KEY] || {}

          resolve(Boolean(opened[conversationId]))
        })
      })
    },

    async markConversationOpened() {
      const conversationId = this.getConversationId()

      return new Promise(resolve => {
        chrome.storage.local.get(this.OPENED_STORAGE_KEY, result => {
          const opened = {
            ...(result[this.OPENED_STORAGE_KEY] || {})
          }

          opened[conversationId] = true

          chrome.storage.local.set(
            {
              [this.OPENED_STORAGE_KEY]: opened
            },
            resolve
          )
        })
      })
    },

    getClankComposer() {
      const candidates = [
        document.querySelector('.clank-atelier-composer'),

        SELECTORS.composer ? document.querySelector(SELECTORS.composer) : null,

        document.querySelector('.clank-atelier-chat-shell form textarea'),

        document
          .querySelector('#chat-scroll-container')
          ?.parentElement?.querySelector('form textarea')
      ]

      return (
        candidates.find(element => {
          return (
            element instanceof HTMLTextAreaElement &&
            !element.closest('.furina-vn-root')
          )
        }) || null
      )
    },

    setNativeTextareaValue(textarea, value) {
      if (!(textarea instanceof HTMLTextAreaElement)) {
        return false
      }

      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )

      if (descriptor && typeof descriptor.set === 'function') {
        descriptor.set.call(textarea, value)
      } else {
        textarea.value = value
      }

      textarea.dispatchEvent(
        new Event('input', {
          bubbles: true
        })
      )

      return true
    },

    syncDraftFromClank() {
      const clankComposer = this.getClankComposer()

      const input = this.elements.input

      if (!(input instanceof HTMLTextAreaElement)) {
        return
      }

      if (!input.value && clankComposer?.value) {
        input.value = clankComposer.value
      }

      this.resizeComposer()
    },

    resizeComposer() {
      const input = this.elements.input

      if (!(input instanceof HTMLTextAreaElement)) {
        return
      }

      input.style.height = 'auto'

      input.style.height = `${Math.min(input.scrollHeight, 170)}px`
    },

    setComposerStatus(message, stateName = '') {
      const status = this.elements.status

      if (!status) {
        return
      }

      status.textContent = message

      status.dataset.state = stateName
    },

    setReplyIndicator(active) {
      const indicator = this.elements.replyIndicator

      if (!indicator) {
        return
      }

      indicator.setAttribute('aria-hidden', active ? 'false' : 'true')

      this.root?.classList.toggle('furina-vn-awaiting', active)
    },

    goToSourceMessageStart(sourceMessageIndex) {
      if (!Number.isInteger(sourceMessageIndex)) {
        return false
      }

      const targetIndex = this.beats.findIndex(
        beat => beat.sourceMessageIndex === sourceMessageIndex
      )

      if (targetIndex < 0) {
        return false
      }

      this.stopTypewriter()

      this.currentBeatIndex = targetIndex

      this.renderCurrentBeat()

      return true
    },

    finishAwaitingAssistant() {
      if (!this.awaitingAssistant) {
        return
      }

      clearTimeout(this.assistantSettleTimer)

      this.assistantSettleTimer = null

      const sourceIndex = this.awaitingAssistantSourceIndex

      /*
                Rebuild one final time after the stream has gone quiet, then
                open the response at its first VN beat.

                Do not use goLatest(): one Clank response can become several
                VN pages, and jumping to the final page makes the reader walk
                backward through the response they just received.
            */

      this.rebuildBeats({
        preservePosition: true,
        quiet: true
      })

      this.awaitingAssistant = false

      this.awaitingAssistantStarted = false

      this.awaitingAssistantSourceIndex = -1

      this.setReplyIndicator(false)

      this.setComposerStatus('READY', 'ready')

      this.goToSourceMessageStart(sourceIndex)
    },

    scheduleAssistantSettle(sourceMessageIndex) {
      this.awaitingAssistantSourceIndex = sourceMessageIndex

      clearTimeout(this.assistantSettleTimer)

      /*
                Clank streams assistant text in small DOM updates. Treat the
                response as complete after the latest assistant row has stayed
                unchanged for a short quiet window, similar to Phantom's
                streaming-settle behavior.
            */

      this.assistantSettleTimer = window.setTimeout(() => {
        this.finishAwaitingAssistant()
      }, 1200)
    },

    async sendCurrentInput() {
      if (this.sending) {
        return false
      }

      const input = this.elements.input

      if (!(input instanceof HTMLTextAreaElement)) {
        return false
      }

      const text = input.value

      if (!text.trim()) {
        this.setComposerStatus('WRITE SOMETHING', 'warning')

        return false
      }

      const clankComposer = this.getClankComposer()

      if (!clankComposer) {
        this.setComposerStatus('COMPOSER NOT FOUND', 'error')

        console.warn('[Furina Visual Novel] Clank composer was not found.')

        return false
      }

      const form = clankComposer.closest('form')

      if (!form) {
        this.setComposerStatus('SEND FORM NOT FOUND', 'error')

        console.warn('[Furina Visual Novel] Clank composer form was not found.')

        return false
      }

      this.sending = true

      this.root?.classList.add('furina-vn-is-sending')

      this.setComposerStatus('SENDING…', 'busy')

      try {
        this.setNativeTextareaValue(clankComposer, text)

        await new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve)
          })
        })

        const sendButton = form.querySelector(
          [
            'button[type="submit"]',
            'button[aria-label="Send"]',
            'button[aria-label="Send message"]'
          ].join(',')
        )

        if (sendButton instanceof HTMLButtonElement) {
          if (sendButton.disabled) {
            this.setComposerStatus('CLANK IS BUSY', 'warning')

            return false
          }

          sendButton.click()
        } else if (typeof form.requestSubmit === 'function') {
          form.requestSubmit()
        } else {
          this.setComposerStatus('SEND UNAVAILABLE', 'error')

          return false
        }

        input.value = ''

        this.resizeComposer()

        this.setComposerOpen(false, {
          focus: false
        })

        this.awaitingAssistant = true

        this.awaitingAssistantStarted = false

        this.awaitingAssistantSourceIndex = -1

        clearTimeout(this.assistantSettleTimer)

        this.assistantSettleTimer = null

        this.setReplyIndicator(true)

        this.setComposerStatus('AWAITING RESPONSE', 'waiting')

        const refreshSoon = () => {
          if (!this.isActive) {
            return
          }

          this.lastMessageFingerprint = ''

          this.refreshFromLiveChat()
        }

        window.setTimeout(refreshSoon, 80)

        window.setTimeout(refreshSoon, 220)

        return true
      } catch (error) {
        console.error('[Furina Visual Novel] Send failed:', error)

        this.setComposerStatus('SEND FAILED', 'error')

        return false
      } finally {
        this.sending = false

        this.root?.classList.remove('furina-vn-is-sending')
      }
    },

    buildLiveFingerprint(elements = this.getConversationMessageElements()) {
      const tail = elements.slice(-6)

      return [
        `count:${elements.length}`,

        ...tail.map(element => {
          const role = this.getMessageRole(element) || 'unknown'

          const body = this.getMessageBody(element)

          const text = body?.innerText || ''

          const images = body
            ? [...body.querySelectorAll('img')]
                .map(image => image.currentSrc || image.src || '')
                .join('|')
            : ''

          return [role, text.length, text.slice(-400), images].join('::')
        })
      ].join('||')
    },

    refreshFromLiveChat() {
      if (!this.isActive) {
        return
      }

      /*
                Keep the reader on the page they were already viewing while
                Clank streams a new response in the background.
            */

      this.applyCapturedSceneCastForCurrentConversation()

      this.rebuildBeats({
        preservePosition: true,
        followLatest: false,
        quiet: true
      })

      const messages = this.getConversationMessageElements()

      const latestSource = messages.at(-1)

      const latestRole = latestSource ? this.getMessageRole(latestSource) : null

      if (!this.awaitingAssistant || latestRole !== 'assistant') {
        return
      }

      const sourceMessageIndex = messages.length - 1

      this.awaitingAssistantStarted = true

      this.setReplyIndicator(true)

      /*
                Every streaming text mutation resets this timer. Once the
                response remains unchanged for the quiet window, Furina opens
                the first page of that response instead of its final page.
            */

      this.scheduleAssistantSettle(sourceMessageIndex)
    },

    startConversationObserver() {
      this.stopConversationObserver()

      /*
                Phantom proved the reliable solution here: poll the real
                Clank conversation instead of trusting any one React DOM
                node or mutation sequence to survive while a reply streams.
            */

      const initialElements = this.getConversationMessageElements()

      this.lastMessageFingerprint = this.buildLiveFingerprint(initialElements)

      this.liveTimer = window.setInterval(() => {
        if (!this.isActive) {
          return
        }

        const elements = this.getConversationMessageElements()

        const fingerprint = this.buildLiveFingerprint(elements)

        if (fingerprint === this.lastMessageFingerprint) {
          return
        }

        this.lastMessageFingerprint = fingerprint

        this.refreshFromLiveChat()
      }, 200)
    },

    stopConversationObserver() {
      this.conversationObserver?.disconnect?.()

      this.conversationObserver = null

      this.observerRoot = null

      clearTimeout(this.conversationObserverTimer)

      this.conversationObserverTimer = null

      if (this.liveTimer) {
        clearInterval(this.liveTimer)
      }

      this.liveTimer = null

      this.lastMessageFingerprint = ''

      clearTimeout(this.assistantSettleTimer)

      this.assistantSettleTimer = null
    },

    handleGlobalKeydown(event) {
      if (!this.isActive) {
        return
      }

      const target = event.target

      const isTypingTarget =
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLInputElement ||
        target?.isContentEditable

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()

        if (this.elements.viewer && !this.elements.viewer.hidden) {
          this.closeImageViewer()
          return
        }

        if (this.backlogOpen) {
          this.setBacklogOpen(false)
          return
        }

        if (this.composerOpen) {
          this.setComposerOpen(false, {
            focus: false
          })
          return
        }

        this.close()
        return
      }

      if (
        !isTypingTarget &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        if (event.key === 'l' || event.key === 'L') {
          event.preventDefault()
          this.toggleBacklog()
          return
        }

        if (event.key === 'r' || event.key === 'R') {
          event.preventDefault()
          this.toggleComposer()
          return
        }

        if (event.key === 'a' || event.key === 'A') {
          event.preventDefault()
          this.toggleAutoMode()
          return
        }
      }

      if (isTypingTarget) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        this.goPrevious()
        return
      }

      if (
        event.key === 'ArrowRight' ||
        event.key === ' ' ||
        event.key === 'Enter'
      ) {
        event.preventDefault()
        this.goNext()
      }
    },

    startRouteWatch() {
      this.stopRouteWatch()

      this.openedPath = window.location.pathname

      this.routeTimer = window.setInterval(() => {
        if (!this.isActive) {
          return
        }

        if (window.location.pathname !== this.openedPath) {
          this.close()
        }
      }, 500)
    },

    stopRouteWatch() {
      if (this.routeTimer) {
        clearInterval(this.routeTimer)
      }

      this.routeTimer = null

      this.openedPath = null
    },

    async open() {
      if (this.isActive) {
        return
      }

      const hasOpenedBefore = await this.hasOpenedConversation()

      this.isActive = true

      this.build()

      this.startRouteWatch()

      this.syncDraftFromClank()

      /*
                Build once from the same direct Clank message rows Phantom
                trusts, then keep that source live with the polling heartbeat.
            */

      this.rebuildBeats({
        startAtBeginning: !hasOpenedBefore,

        followLatest: hasOpenedBefore,

        quiet: false
      })

      this.startConversationObserver()

      this.startSceneDetailsSupport()

      if (!hasOpenedBefore) {
        await this.markConversationOpened()
      }
    },

    close() {
      if (!this.isActive && !this.root) {
        return
      }

      this.stopTypewriter()
      this.stopConversationObserver()
      this.stopRouteWatch()
      this.stopSceneDetailsSupport()
      this.setAutoMode(false)
      this.closeImageViewer()
      this.backlogOpen = false
      this.composerOpen = false
      this.awaitingAssistant = false
      this.awaitingAssistantStarted = false
      this.awaitingAssistantSourceIndex = -1

      clearTimeout(this.assistantSettleTimer)

      this.assistantSettleTimer = null

      this.sending = false

      this.speakerPortraits.clear()

      this.activeSceneCastKey = ''

      this.activeSceneCastSignature = ''

      this.root?.remove?.()

      this.root = null
      this.isActive = false

      this.elements = {
        stage: null,
        portraitWrap: null,
        portraitImage: null,
        stageBackground: null,
        nameplate: null,
        dialogueBox: null,
        media: null,
        dialogueText: null,
        beatCounter: null,
        continueIndicator: null,
        replyIndicator: null,
        composer: null,
        input: null,
        send: null,
        status: null,
        previous: null,
        auto: null,
        latest: null,
        next: null,
        log: null,
        reply: null,
        viewer: null,
        viewerImage: null,
        viewerCaption: null,
        backlog: null,
        backlogList: null,
        backlogClose: null,
        close: null
      }
    },

    build() {
      this.root?.remove?.()

      const root = document.createElement('div')

      root.className = 'furina-vn-root'

      root.dataset.furinaOwned = 'true'

      const backdrop = document.createElement('div')

      backdrop.className = 'furina-vn-backdrop'

      const shell = document.createElement('div')

      shell.className = 'furina-vn-shell'

      const closeButton = document.createElement('button')

      closeButton.className = 'furina-vn-control-button furina-vn-control-exit'
      closeButton.type = 'button'
      closeButton.textContent = 'EXIT'
      closeButton.setAttribute('aria-label', 'Close Visual Novel')
      closeButton.addEventListener('click', () => {
        this.close()
      })

      const stage = document.createElement('div')

      stage.className = 'furina-vn-stage'

      const stageBackground = document.createElement('div')

      stageBackground.className = 'furina-vn-stage-background'
      stageBackground.setAttribute('aria-hidden', 'true')

      const stageShade = document.createElement('div')

      stageShade.className = 'furina-vn-stage-shade'
      stageShade.setAttribute('aria-hidden', 'true')

      const portrait = document.createElement('div')

      portrait.className = 'furina-vn-portrait-wrap'

      const portraitImage = document.createElement('img')

      portraitImage.className = 'furina-vn-portrait'
      portraitImage.alt = ''
      portraitImage.hidden = true

      const portraitFallback = document.createElement('div')

      portraitFallback.className = 'furina-vn-portrait-fallback'
      portraitFallback.textContent = 'VISUAL NOVEL'

      portrait.append(portraitImage, portraitFallback)

      const dialogueArea = document.createElement('div')

      dialogueArea.className = 'furina-vn-dialogue-area'

      const replyIndicator = document.createElement('div')

      replyIndicator.className = 'furina-vn-reply-indicator'

      replyIndicator.setAttribute('role', 'status')

      replyIndicator.setAttribute('aria-live', 'polite')

      replyIndicator.setAttribute('aria-hidden', 'true')

      replyIndicator.innerHTML = `
                <span class="furina-vn-reply-indicator-label">
                    CHARACTER IS REPLYING
                </span>

                <span
                    class="furina-vn-reply-indicator-dots"
                    aria-hidden="true"
                >
                    <i></i>
                    <i></i>
                    <i></i>
                </span>
            `

      const nameplate = document.createElement('div')

      nameplate.className = 'furina-vn-nameplate'
      nameplate.textContent = 'VISUAL NOVEL'

      const dialogueBox = document.createElement('div')

      dialogueBox.className = 'furina-vn-dialogue-box'

      const media = document.createElement('div')

      media.className = 'furina-vn-message-media'
      media.hidden = true

      const text = document.createElement('div')

      text.className = 'furina-vn-dialogue-text'
      text.textContent = 'Reading the current conversation…'

      const dialogueHud = document.createElement('div')

      dialogueHud.className = 'furina-vn-dialogue-hud'

      const beatCounter = document.createElement('span')

      beatCounter.className = 'furina-vn-beat-counter'
      beatCounter.textContent = '0 / 0'

      const continueIndicator = document.createElement('span')

      continueIndicator.className = 'furina-vn-continue'
      continueIndicator.textContent = '▼'
      continueIndicator.hidden = true
      continueIndicator.setAttribute('aria-hidden', 'true')

      dialogueHud.append(beatCounter, continueIndicator)

      dialogueBox.append(media, text, dialogueHud)

      dialogueArea.append(nameplate, dialogueBox)

      stage.append(
        stageBackground,
        stageShade,
        portrait,
        replyIndicator,
        dialogueArea
      )

      stage.addEventListener('click', event => {
        if (
          event.target.closest(
            [
              'button',
              'textarea',
              'input',
              'a',
              '.furina-vn-message-media'
            ].join(',')
          )
        ) {
          return
        }

        const scrollableBox = event.target.closest('.furina-vn-dialogue-box')

        if (
          scrollableBox &&
          scrollableBox.scrollHeight > scrollableBox.clientHeight + 2
        ) {
          return
        }

        this.goNext()
      })

      stage.addEventListener(
        'wheel',
        event => {
          if (
            this.backlogOpen ||
            this.composerOpen ||
            !this.elements.viewer?.hidden
          ) {
            return
          }

          const box = this.elements.dialogueBox

          if (box && box.scrollHeight > box.clientHeight + 2) {
            return
          }

          if (Math.abs(event.deltaY) < 18) {
            return
          }

          event.preventDefault()

          if (event.deltaY < 0) {
            this.goPrevious()
          } else {
            this.goNext()
          }
        },
        {
          passive: false
        }
      )

      const controls = document.createElement('div')

      controls.className = 'furina-vn-controls'

      const previous = document.createElement('button')
      previous.className = 'furina-vn-control-button'
      previous.type = 'button'
      previous.disabled = true
      previous.textContent = 'BACK'
      previous.addEventListener('click', () => {
        this.goPrevious()
      })

      const auto = document.createElement('button')
      auto.className = 'furina-vn-control-button furina-vn-control-auto'
      auto.type = 'button'
      auto.textContent = 'AUTO'
      auto.setAttribute('aria-pressed', 'false')
      auto.addEventListener('click', () => {
        this.toggleAutoMode()
      })

      const log = document.createElement('button')
      log.className = 'furina-vn-control-button furina-vn-control-log'
      log.type = 'button'
      log.textContent = 'LOG'
      log.addEventListener('click', () => {
        this.toggleBacklog()
      })

      const reply = document.createElement('button')
      reply.className = 'furina-vn-control-button furina-vn-control-reply'
      reply.type = 'button'
      reply.textContent = 'REPLY'
      reply.addEventListener('click', () => {
        this.toggleComposer()
      })

      const latest = document.createElement('button')
      latest.className = 'furina-vn-control-button furina-vn-control-latest'
      latest.type = 'button'
      latest.disabled = true
      latest.textContent = 'LATEST'
      latest.addEventListener('click', () => {
        this.goLatest()
      })

      controls.append(previous, auto, log, reply, latest, closeButton)

      const composer = document.createElement('div')

      composer.className = 'furina-vn-composer'

      const composerTop = document.createElement('div')

      composerTop.className = 'furina-vn-composer-top'

      const composerLabel = document.createElement('span')
      composerLabel.className = 'furina-vn-composer-label'
      composerLabel.textContent = 'YOUR RESPONSE'

      const status = document.createElement('span')
      status.className = 'furina-vn-composer-status'
      status.dataset.state = 'ready'
      status.textContent = 'READY'

      composerTop.append(composerLabel, status)

      const composerRow = document.createElement('div')

      composerRow.className = 'furina-vn-composer-row'

      const input = document.createElement('textarea')
      input.className = 'furina-vn-input'
      input.rows = 1
      input.placeholder = 'Write your next line…'
      input.setAttribute('aria-label', 'Write a Visual Novel reply')
      input.spellcheck = true

      const send = document.createElement('button')
      send.className = 'furina-vn-send'
      send.type = 'button'
      send.textContent = 'SEND'

      composerRow.append(input, send)

      const hint = document.createElement('div')

      hint.className = 'furina-vn-composer-hint'
      hint.textContent =
        'ENTER TO SEND · SHIFT + ENTER FOR NEW LINE · ESC TO HIDE'

      composer.append(composerTop, composerRow, hint)

      input.addEventListener('input', () => {
        this.resizeComposer()
        const clankComposer = this.getClankComposer()
        if (clankComposer) {
          this.setNativeTextareaValue(clankComposer, input.value)
        }
      })

      input.addEventListener('focus', () => {
        if (this.autoMode) {
          this.setAutoMode(false)
        }
      })

      input.addEventListener('keydown', event => {
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
        event.preventDefault()
        event.stopPropagation()
        this.sendCurrentInput()
      })

      send.addEventListener('click', () => {
        this.sendCurrentInput()
      })

      const backlog = document.createElement('div')

      backlog.className = 'furina-vn-backlog'
      backlog.hidden = true

      const backlogScrim = document.createElement('button')
      backlogScrim.className = 'furina-vn-backlog-scrim'
      backlogScrim.type = 'button'
      backlogScrim.setAttribute('aria-label', 'Close backlog')
      backlogScrim.addEventListener('click', () => {
        this.setBacklogOpen(false)
      })

      const backlogPanel = document.createElement('div')

      backlogPanel.className = 'furina-vn-backlog-panel'

      const backlogHeader = document.createElement('div')
      backlogHeader.className = 'furina-vn-backlog-header'

      const backlogTitle = document.createElement('div')
      backlogTitle.className = 'furina-vn-backlog-title'
      backlogTitle.textContent = 'Backlog'

      const backlogClose = document.createElement('button')
      backlogClose.className = 'furina-vn-backlog-close'
      backlogClose.type = 'button'
      backlogClose.textContent = 'Close'
      backlogClose.addEventListener('click', () => {
        this.setBacklogOpen(false)
      })

      backlogHeader.append(backlogTitle, backlogClose)

      const backlogList = document.createElement('div')
      backlogList.className = 'furina-vn-backlog-list'

      backlogPanel.append(backlogHeader, backlogList)

      backlog.append(backlogScrim, backlogPanel)

      const viewer = document.createElement('div')

      viewer.className = 'furina-vn-image-viewer'
      viewer.hidden = true
      viewer.setAttribute('role', 'dialog')
      viewer.setAttribute('aria-modal', 'true')
      viewer.setAttribute('aria-label', 'Message image viewer')

      const viewerBackdrop = document.createElement('button')
      viewerBackdrop.className = 'furina-vn-image-viewer-backdrop'
      viewerBackdrop.type = 'button'
      viewerBackdrop.setAttribute('aria-label', 'Close image viewer')

      const viewerFrame = document.createElement('div')
      viewerFrame.className = 'furina-vn-image-viewer-frame'

      const viewerImage = document.createElement('img')
      viewerImage.className = 'furina-vn-image-viewer-image'
      viewerImage.alt = ''

      const viewerCaption = document.createElement('div')
      viewerCaption.className = 'furina-vn-image-viewer-caption'
      viewerCaption.hidden = true

      const viewerClose = document.createElement('button')
      viewerClose.className = 'furina-vn-image-viewer-close'
      viewerClose.type = 'button'
      viewerClose.textContent = '×'
      viewerClose.setAttribute('aria-label', 'Close image viewer')

      viewerFrame.append(viewerImage, viewerCaption, viewerClose)

      viewer.append(viewerBackdrop, viewerFrame)

      viewerBackdrop.addEventListener('click', () => {
        this.closeImageViewer()
      })
      viewerClose.addEventListener('click', () => {
        this.closeImageViewer()
      })

      shell.append(stage, controls, composer)

      root.append(backdrop, shell, backlog, viewer)

      document.body.appendChild(root)

      this.root = root

      this.elements = {
        stage,
        portraitWrap: portrait,
        portraitImage,
        stageBackground,
        nameplate,
        dialogueBox,
        media,
        dialogueText: text,
        beatCounter,
        continueIndicator,
        replyIndicator,
        composer,
        input,
        send,
        status,
        previous,
        auto,
        latest,
        next: null,
        log,
        reply,
        viewer,
        viewerImage,
        viewerCaption,
        backlog,
        backlogList,
        backlogClose,
        close: closeButton
      }

      this.refreshStageIdentity()
      this.resizeComposer()
      this.setComposerOpen(false, {
        focus: false
      })
      this.setBacklogOpen(false)
    },

    destroy() {
      this.close()
    },

    isOpen() {
      return this.isActive
    }
  }

  window.addEventListener(
    'keydown',
    event => {
      VisualNovel.handleGlobalKeydown(event)
    },
    true
  )

  Atelier.VisualNovel = VisualNovel
})()
