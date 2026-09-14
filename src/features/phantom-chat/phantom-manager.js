'use strict'


/*
  Developer notes

  Phantom Manager owns Furina's optional Phantom chat layout. Phantom is intentionally isolated
  from the standard-chat renderer; new standard-chat features should not depend on this
  module or require changes here.
*/
;(() => {
  if (window.top !== window) {
    return
  }

  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  if (Atelier.PhantomChat?.initialized) {
    return
  }

  const SELECTORS = Atelier.SELECTORS || {}

  // TEMPORARY SHOWCASE FLAGS
  const SHOWCASE_MODE = false

  const SHOWCASE_SFX = false

  const state = {
    initialized: true,
    open: false,
    launcher: null,
    overlay: null,
    history: null,
    renderTimer: null,
    liveTimer: null,
    lastMessageFingerprint: '',
    hasHydratedMessages: false,
    hydratedPath: null,

    identityName: 'CHARACTER',
    identityPortrait: '',
    identitySignature: '',

    awaitingAssistant: false,
    actionBurstTimer: null,

    showcaseIntroTimer: null,
    audioContext: null,
    sfxMuted: !SHOWCASE_SFX,
    lastSettleSfxAt: 0,

    composerSending: false,
    composerStatusTimer: null,
    introTimer: null,
    routeTimer: null,
    lastPath: window.location.pathname
  }

  // ROUTE / CHAT HELPERS
  function isChatRoute() {
    return window.location.pathname.startsWith('/chat/')
  }

  function getChatScroller() {
    return document.querySelector(
      SELECTORS.chatScroller || '#chat-scroll-container'
    )
  }

  function getMessageRole(message) {
    if (message.classList.contains('clank-atelier-message-user')) {
      return 'user'
    }

    if (message.classList.contains('clank-atelier-message-assistant')) {
      return 'assistant'
    }

    if (message.classList.contains('flex-row-reverse')) {
      return 'user'
    }

    return 'assistant'
  }

  function getMessageBody(message) {
    return (
      message.querySelector('.clank-atelier-message-body') ||
      message.querySelector(
        SELECTORS.messageBody || 'div.block.break-words.min-w-0'
      ) ||
      message.querySelector('div.break-words')
    )
  }

  function cloneMessageBody(source) {
    if (!(source instanceof HTMLElement)) {
      return null
    }

    const clone = source.cloneNode(true)

    /*
            Clank may keep additional copies of rendered content in the DOM
            for accessibility or responsive layouts.

            Those copies are normally hidden by Clank's CSS classes.

            Phantom later removes those classes, so we must remove anything
            that is hidden in the ORIGINAL Clank message before stripping
            presentation classes from the clone.
        */

    const sourceElements = [source, ...source.querySelectorAll('*')]

    const cloneElements = [clone, ...clone.querySelectorAll('*')]

    sourceElements.forEach((sourceElement, index) => {
      if (index === 0 || !(sourceElement instanceof HTMLElement)) {
        return
      }

      const cloneElement = cloneElements[index]

      if (!(cloneElement instanceof HTMLElement)) {
        return
      }

      const computedStyle = window.getComputedStyle(sourceElement)

      const isHidden =
        sourceElement.hidden ||
        sourceElement.getAttribute('aria-hidden') === 'true' ||
        sourceElement.classList.contains('sr-only') ||
        computedStyle.display === 'none' ||
        computedStyle.visibility === 'hidden'

      if (isHidden) {
        cloneElement.remove()
      }
    })

    /*
            Remove interactive controls so the mirrored message cannot
            create duplicate live actions.
        */

    clone
      .querySelectorAll(
        [
          'script',
          'style',
          'button',
          'input',
          'textarea',
          'select',
          'form',
          'iframe',
          'object',
          'embed',
          "[data-furina-owned='true']"
        ].join(',')
      )
      .forEach(element => element.remove())

    /*
            Keep the semantic content, but discard Clank's identity and
            presentation attributes.
        */

    clone.removeAttribute('id')

    clone.removeAttribute('class')

    clone.removeAttribute('style')

    clone.querySelectorAll('*').forEach(element => {
      element.removeAttribute('id')

      element.removeAttribute('class')

      element.removeAttribute('style')

      element.removeAttribute('contenteditable')

      element.removeAttribute('tabindex')

      ;[...element.attributes].forEach(attribute => {
        if (attribute.name.toLowerCase().startsWith('on')) {
          element.removeAttribute(attribute.name)
        }
      })

      if (element instanceof HTMLAnchorElement) {
        try {
          const url = new URL(element.href, window.location.href)

          if (!['http:', 'https:'].includes(url.protocol)) {
            element.removeAttribute('href')
          } else {
            element.target = '_blank'

            element.rel = 'noopener noreferrer'
          }
        } catch (_) {
          element.removeAttribute('href')
        }
      }

      if (element instanceof HTMLImageElement) {
        try {
          const url = new URL(element.src, window.location.href)

          if (!['http:', 'https:'].includes(url.protocol)) {
            element.remove()
          }
        } catch (_) {
          element.remove()
        }
      }
    })

    return clone
  }

  function getMessages() {
    const chat = getChatScroller()

    if (!chat) {
      return []
    }

    return [...chat.children]
      .filter(element => {
        if (!(element instanceof HTMLElement)) {
          return false
        }

        if (element.classList.contains('clank-atelier-message')) {
          return true
        }

        return Boolean(getMessageBody(element))
      })
      .map((element, index) => {
        const body = getMessageBody(element)

        const text = body?.innerText?.trim() || ''

        return {
          index,

          role: getMessageRole(element),

          text,

          body,

          element
        }
      })
      .filter(message => {
        if (message.text) {
          return true
        }

        return Boolean(message.body?.querySelector('img'))
      })
  }

  function getConversationLabel() {
    const title = String(document.title || '')
      .replace(/\s*[|•-]\s*Clank.*$/i, '')
      .trim()

    if (title && !/^clank$/i.test(title)) {
      return title
    }

    return 'CURRENT CONVERSATION'
  }

  // PHANTOM IDENTITY
  function getClankImageAssetBase(imageUrl) {
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
  }

  function getLatestAssistantMessage(messages = getMessages()) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === 'assistant') {
        return messages[index]
      }
    }

    return null
  }

  function getCharacterPortrait(message = null) {
    let avatar =
      message?.element?.querySelector('.clank-atelier-avatar') || null

    if (!avatar) {
      const avatars = document.querySelectorAll(
        '.clank-atelier-message-assistant .clank-atelier-avatar'
      )

      avatar = avatars[avatars.length - 1] || null
    }

    if (!(avatar instanceof HTMLImageElement)) {
      return ''
    }

    const source = avatar.currentSrc || avatar.src || ''

    const base = getClankImageAssetBase(source)

    return base ? `${base}/w=1024,q=100,f=webp` : source
  }

  function getCharacterName(message = null) {
    let avatar =
      message?.element?.querySelector('.clank-atelier-avatar') || null

    if (!avatar) {
      const avatars = document.querySelectorAll(
        '.clank-atelier-message-assistant .clank-atelier-avatar'
      )

      avatar = avatars[avatars.length - 1] || null
    }

    if (avatar) {
      for (const candidate of [
        avatar.alt,
        avatar.title,
        avatar.getAttribute('aria-label')
      ]) {
        const value = String(candidate || '').trim()

        if (
          value &&
          value.length <= 80 &&
          !/^(avatar|profile|profile picture|image|character|assistant)$/i.test(
            value
          )
        ) {
          return value
        }
      }
    }

    const row = message?.element

    if (row instanceof HTMLElement) {
      const candidates = row.querySelectorAll(
        [
          '[data-character-name]',
          '[data-speaker-name]',
          '[aria-label]',
          'strong',
          'span'
        ].join(',')
      )

      for (const candidate of candidates) {
        if (
          candidate.closest('.clank-atelier-message-body') ||
          candidate.closest('.clank-atelier-rendered') ||
          candidate.closest('.clank-atelier-message-actions')
        ) {
          continue
        }

        const value = String(
          candidate.getAttribute('data-character-name') ||
            candidate.getAttribute('data-speaker-name') ||
            candidate.getAttribute('aria-label') ||
            candidate.textContent ||
            ''
        ).trim()

        if (
          value &&
          value.length <= 80 &&
          !/^(avatar|profile|image|character|assistant|like|report|previous|next|continue|copy|delete|edit)$/i.test(
            value
          )
        ) {
          return value
        }
      }
    }

    const label = getConversationLabel()

    return label === 'CURRENT CONVERSATION' ? 'CHARACTER' : label
  }

  function getAssistantDisplayName() {
    return state.identityName || 'CHARACTER'
  }

  function refreshIdentity(messages = getMessages()) {
    if (!state.overlay) {
      return
    }

    const assistant = getLatestAssistantMessage(messages)

    const name = getCharacterName(assistant)

    const portrait = getCharacterPortrait(assistant)

    const signature = `${name}::${portrait}`

    if (signature === state.identitySignature) {
      return
    }

    state.identityName = name || 'CHARACTER'

    state.identityPortrait = portrait || ''

    state.identitySignature = signature

    const identity = state.overlay.querySelector('.furina-phantom-identity')

    if (!identity) {
      return
    }

    const word = identity.querySelector('.furina-phantom-identity-word')

    const stamp = identity.querySelector('.furina-phantom-identity-stamp-name')

    const rail = state.overlay.querySelector('.furina-phantom-rail-subject')

    const image = identity.querySelector('.furina-phantom-portrait')

    if (word) {
      word.textContent = state.identityName
    }

    if (stamp) {
      stamp.textContent = state.identityName
    }

    if (rail) {
      rail.textContent = state.identityName
    }

    state.overlay
      .querySelectorAll(
        '.furina-phantom-message-assistant .furina-phantom-message-role'
      )
      .forEach(element => {
        element.textContent = state.identityName
      })

    if (image instanceof HTMLImageElement && state.identityPortrait) {
      image.src = state.identityPortrait

      identity.classList.add('has-portrait')
    } else {
      image?.removeAttribute('src')

      identity.classList.remove('has-portrait')
    }
  }

  function playIdentityImpact(role) {
    const identity = state.overlay?.querySelector('.furina-phantom-identity')

    if (!identity) {
      return
    }

    const className =
      role === 'assistant' ? 'is-character-impact' : 'is-user-impact'

    identity.classList.remove(className)

    void identity.offsetWidth

    identity.classList.add(className)

    window.setTimeout(() => {
      identity.classList.remove(className)
    }, 620)
  }

  function markAssistantActivity(article) {
    if (!(article instanceof HTMLElement)) {
      return
    }

    article.classList.add('is-streaming')

    state.awaitingAssistant = false

    state.overlay?.classList.remove('is-awaiting-assistant')

    updateSceneHud()

    const identity = state.overlay?.querySelector('.furina-phantom-identity')

    identity?.classList.add('is-speaking')

    clearTimeout(article._phantomSettleTimer)

    article._phantomSettleTimer = window.setTimeout(() => {
      article.classList.remove('is-streaming')

      article.classList.add('is-settled')

      identity?.classList.remove('is-speaking')

      identity?.classList.add('is-settling')

      if (SHOWCASE_MODE && Date.now() - state.lastSettleSfxAt > 900) {
        state.lastSettleSfxAt = Date.now()

        playShowcaseSfx('settle')
      }

      updateSceneHud()

      window.setTimeout(() => {
        article.classList.remove('is-settled')

        identity?.classList.remove('is-settling')
      }, 420)
    }, 700)
  }

  function playActionBurst(label, type = 'assistant') {
    const burst = state.overlay?.querySelector('.furina-phantom-action-burst')

    if (!burst) {
      return
    }

    clearTimeout(state.actionBurstTimer)

    const text = burst.querySelector('.furina-phantom-action-burst-text')

    if (text) {
      text.textContent = label
    }

    burst.dataset.type = type

    burst.classList.remove('is-active')

    void burst.offsetWidth

    burst.classList.add('is-active')

    state.actionBurstTimer = window.setTimeout(() => {
      burst.classList.remove('is-active')

      state.actionBurstTimer = null
    }, 760)
  }

  function updateSceneHud(messages = getMessages()) {
    if (!state.overlay) {
      return
    }

    const turn = messages.filter(message => message.role === 'user').length

    const turnValue = state.overlay.querySelector(
      '.furina-phantom-scene-turn-value'
    )

    if (turnValue) {
      turnValue.textContent = String(turn).padStart(2, '0')
    }

    const status = state.overlay.querySelector('.furina-phantom-scene-status')

    if (!status) {
      return
    }

    const streaming = Boolean(
      state.history?.querySelector(
        '.furina-phantom-message-assistant.is-streaming'
      )
    )

    let label = 'YOUR MOVE'

    let statusState = 'ready'

    if (streaming) {
      label = 'INCOMING'

      statusState = 'incoming'
    } else if (state.awaitingAssistant) {
      label = 'AWAITING RESPONSE'

      statusState = 'waiting'
    }

    status.textContent = label

    status.dataset.state = statusState
  }

  function createElement(tag, className = '', text = '') {
    const element = document.createElement(tag)

    if (className) {
      element.className = className
    }

    if (text) {
      element.textContent = text
    }

    return element
  }

  // TEMPORARY SHOWCASE / PROCEDURAL SFX
  function getShowcaseAudioContext() {
    if (!SHOWCASE_MODE || !SHOWCASE_SFX || state.sfxMuted) {
      return null
    }

    if (state.audioContext && state.audioContext.state !== 'closed') {
      return state.audioContext
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext

    if (!AudioContextClass) {
      return null
    }

    try {
      state.audioContext = new AudioContextClass()
    } catch (_) {
      state.audioContext = null
    }

    return state.audioContext
  }

  function resumeShowcaseAudio() {
    const context = getShowcaseAudioContext()

    if (!context) {
      return
    }

    if (context.state === 'suspended') {
      context.resume().catch(() => {})
    }
  }

  function playShowcaseTone(
    context,
    {
      frequency = 220,
      endFrequency = frequency,
      duration = 0.16,
      gain = 0.02,
      type = 'triangle',
      delay = 0
    } = {}
  ) {
    const start = context.currentTime + delay

    const oscillator = context.createOscillator()

    const level = context.createGain()

    oscillator.type = type

    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start)

    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFrequency),
      start + duration
    )

    level.gain.setValueAtTime(0.0001, start)

    level.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, gain),
      start + 0.012
    )

    level.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    oscillator.connect(level)

    level.connect(context.destination)

    oscillator.start(start)

    oscillator.stop(start + duration + 0.03)
  }

  function playShowcaseNoise(
    context,
    {
      duration = 0.14,
      gain = 0.018,
      frequency = 1200,
      endFrequency = 260,
      delay = 0
    } = {}
  ) {
    const sampleRate = context.sampleRate

    const length = Math.max(1, Math.floor(sampleRate * duration))

    const buffer = context.createBuffer(1, length, sampleRate)

    const data = buffer.getChannelData(0)

    for (let index = 0; index < data.length; index += 1) {
      const envelope = 1 - index / data.length

      data[index] = (Math.random() * 2 - 1) * envelope
    }

    const source = context.createBufferSource()

    const filter = context.createBiquadFilter()

    const level = context.createGain()

    const start = context.currentTime + delay

    source.buffer = buffer

    filter.type = 'bandpass'

    filter.Q.value = 0.8

    filter.frequency.setValueAtTime(Math.max(40, frequency), start)

    filter.frequency.exponentialRampToValueAtTime(
      Math.max(40, endFrequency),
      start + duration
    )

    level.gain.setValueAtTime(0.0001, start)

    level.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, gain),
      start + 0.008
    )

    level.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    source.connect(filter)

    filter.connect(level)

    level.connect(context.destination)

    source.start(start)
  }

  function playShowcaseSfx(type) {
    if (!SHOWCASE_MODE || !SHOWCASE_SFX || state.sfxMuted) {
      return
    }

    const context = getShowcaseAudioContext()

    if (!context) {
      return
    }

    const play = () => {
      switch (type) {
        case 'open':
          playShowcaseNoise(context, {
            duration: 0.28,
            gain: 0.023,
            frequency: 2200,
            endFrequency: 180
          })

          playShowcaseTone(context, {
            frequency: 105,
            endFrequency: 46,
            duration: 0.3,
            gain: 0.03,
            type: 'sawtooth',
            delay: 0.025
          })

          playShowcaseTone(context, {
            frequency: 640,
            endFrequency: 270,
            duration: 0.17,
            gain: 0.009,
            delay: 0.06
          })

          break

        case 'send':
          playShowcaseNoise(context, {
            duration: 0.09,
            gain: 0.017,
            frequency: 1800,
            endFrequency: 420
          })

          playShowcaseTone(context, {
            frequency: 135,
            endFrequency: 58,
            duration: 0.19,
            gain: 0.032,
            type: 'square'
          })

          break

        case 'incoming':
          playShowcaseNoise(context, {
            duration: 0.2,
            gain: 0.021,
            frequency: 2500,
            endFrequency: 310
          })

          playShowcaseTone(context, {
            frequency: 235,
            endFrequency: 112,
            duration: 0.31,
            gain: 0.03,
            type: 'sawtooth'
          })

          playShowcaseTone(context, {
            frequency: 760,
            endFrequency: 350,
            duration: 0.22,
            gain: 0.012,
            delay: 0.045
          })

          break

        case 'settle':
          playShowcaseNoise(context, {
            duration: 0.045,
            gain: 0.007,
            frequency: 1200,
            endFrequency: 500
          })

          playShowcaseTone(context, {
            frequency: 150,
            endFrequency: 96,
            duration: 0.095,
            gain: 0.013,
            type: 'triangle'
          })

          break

        case 'menu':
          playShowcaseTone(context, {
            frequency: 430,
            endFrequency: 690,
            duration: 0.09,
            gain: 0.01,
            type: 'triangle'
          })

          break
      }
    }

    if (context.state === 'suspended') {
      context
        .resume()
        .then(play)
        .catch(() => {})

      return
    }

    play()
  }

  function updateShowcaseSfxButton() {
    const button = state.overlay?.querySelector('.furina-phantom-sfx-toggle')

    if (!button) {
      return
    }

    button.textContent = state.sfxMuted ? '♪ OFF' : '♪ SFX'

    button.setAttribute('aria-pressed', String(!state.sfxMuted))
  }

  function toggleShowcaseSfx() {
    if (!SHOWCASE_MODE || !SHOWCASE_SFX) {
      return
    }

    state.sfxMuted = !state.sfxMuted

    updateShowcaseSfxButton()

    if (!state.sfxMuted) {
      resumeShowcaseAudio()

      playShowcaseSfx('menu')
    }
  }

  function playShowcaseIntro() {
    if (!SHOWCASE_MODE || !state.overlay) {
      return
    }

    const intro = state.overlay.querySelector('.furina-phantom-showcase-intro')

    if (!intro) {
      return
    }

    clearTimeout(state.showcaseIntroTimer)

    intro.classList.remove('is-active')

    void intro.offsetWidth

    intro.classList.add('is-active')

    state.showcaseIntroTimer = window.setTimeout(() => {
      intro.classList.remove('is-active')

      state.showcaseIntroTimer = null
    }, 1280)
  }

  function updateShowcaseParallax(event) {
    if (!SHOWCASE_MODE || !state.overlay || !state.open) {
      return
    }

    const width = Math.max(1, window.innerWidth)

    const height = Math.max(1, window.innerHeight)

    const x = event.clientX / width - 0.5

    const y = event.clientY / height - 0.5

    state.overlay.style.setProperty('--phantom-showcase-bg-x', `${x * -10}px`)

    state.overlay.style.setProperty('--phantom-showcase-bg-y', `${y * -6}px`)

    state.overlay.style.setProperty('--phantom-showcase-id-x', `${x * 12}px`)

    state.overlay.style.setProperty('--phantom-showcase-id-y', `${y * 7}px`)
  }

  function resetShowcaseParallax() {
    if (!state.overlay) {
      return
    }

    state.overlay.style.setProperty('--phantom-showcase-bg-x', '0px')

    state.overlay.style.setProperty('--phantom-showcase-bg-y', '0px')

    state.overlay.style.setProperty('--phantom-showcase-id-x', '0px')

    state.overlay.style.setProperty('--phantom-showcase-id-y', '0px')
  }

  // CLANK COMPOSER BRIDGE
  function getClankComposer() {
    const candidates = [
      document.querySelector('.clank-atelier-composer'),

      SELECTORS.composer ? document.querySelector(SELECTORS.composer) : null,

      document.querySelector('.clank-atelier-chat-shell form textarea')
    ]

    return (
      candidates.find(element => {
        return (
          element instanceof HTMLTextAreaElement &&
          !element.closest('#furina-phantom-overlay')
        )
      }) || null
    )
  }

  function setNativeTextareaValue(textarea, value) {
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
  }

  function resizePhantomComposer(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return
    }

    textarea.style.height = 'auto'

    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
  }

  function setComposerStatus(message, stateName = '') {
    const status = state.overlay?.querySelector(
      '.furina-phantom-composer-status'
    )

    if (!status) {
      return
    }

    clearTimeout(state.composerStatusTimer)

    status.textContent = message

    status.dataset.state = stateName

    state.composerStatusTimer = window.setTimeout(() => {
      if (!status.isConnected) {
        return
      }

      status.textContent = 'READY'

      status.dataset.state = 'ready'
    }, 1800)
  }

  async function sendFromPhantom() {
    if (state.composerSending) {
      return false
    }

    const phantomComposer = state.overlay?.querySelector(
      '.furina-phantom-composer'
    )

    if (!(phantomComposer instanceof HTMLTextAreaElement)) {
      return false
    }

    const text = phantomComposer.value

    if (!text.trim()) {
      setComposerStatus('WRITE SOMETHING', 'warning')

      return false
    }

    const clankComposer = getClankComposer()

    if (!clankComposer) {
      console.warn('[Furina Phantom] Clank composer was not found.')

      setComposerStatus('COMPOSER NOT FOUND', 'error')

      return false
    }

    const form = clankComposer.closest('form')

    if (!form) {
      console.warn('[Furina Phantom] Clank composer form was not found.')

      setComposerStatus('SEND FORM NOT FOUND', 'error')

      return false
    }

    state.composerSending = true

    state.overlay?.classList.add('is-sending')

    setComposerStatus('LINKING TO CLANK...', 'busy')

    try {
      setNativeTextareaValue(clankComposer, text)

      /*
                Give Clank / React two paint opportunities to accept
                the synthetic textarea update before pressing its real
                Send button.

                Phantom does not reproduce Clank's network request.
            */

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
          setComposerStatus('CLANK IS BUSY', 'warning')

          return false
        }

        sendButton.click()
      } else if (typeof form.requestSubmit === 'function') {
        form.requestSubmit()
      } else {
        console.warn('[Furina Phantom] No usable Clank send control was found.')

        setComposerStatus('SEND UNAVAILABLE', 'error')

        return false
      }

      phantomComposer.value = ''

      resizePhantomComposer(phantomComposer)

      // Pick up the submitted message before the live watch catches it.

      scheduleRender()

      window.setTimeout(scheduleRender, 180)

      state.awaitingAssistant = true

      state.overlay?.classList.add('is-awaiting-assistant')

      playActionBurst('YOUR MOVE!', 'user')

      playShowcaseSfx('send')

      updateSceneHud()

      setComposerStatus('SENT!', 'success')

      return true
    } catch (error) {
      console.error('[Furina Phantom] Send failed:', error)

      setComposerStatus('SEND FAILED', 'error')

      return false
    } finally {
      state.composerSending = false

      state.overlay?.classList.remove('is-sending')
    }
  }

  // LAUNCHER
  function createLauncher() {
    const existing = document.getElementById('furina-phantom-launcher')

    if (existing) {
      state.launcher = existing

      return
    }

    const launcher = createElement('button', 'furina-phantom-launcher')

    launcher.id = 'furina-phantom-launcher'

    launcher.type = 'button'

    launcher.dataset.furinaOwned = 'true'

    if (SHOWCASE_MODE) {
      launcher.classList.add('is-showcase')
    }

    launcher.setAttribute(
      'aria-label',
      'Launch Phantom Chat experimental interface'
    )

    launcher.setAttribute('aria-controls', 'furina-phantom-overlay')

    launcher.setAttribute('aria-expanded', 'false')

    const mark = createElement('span', 'furina-phantom-launcher-mark', 'P!')

    mark.setAttribute('aria-hidden', 'true')

    const copy = createElement('span', 'furina-phantom-launcher-copy')

    copy.append(
      createElement('strong', '', SHOWCASE_MODE ? 'ENTER PHANTOM' : 'PHANTOM'),

      createElement(
        'small',
        '',
        SHOWCASE_MODE ? 'SHOWCASE CUT' : 'EXPERIMENTAL'
      )
    )

    launcher.append(mark, copy)

    launcher.addEventListener('click', open)

    document.body.appendChild(launcher)

    state.launcher = launcher
  }

  // OVERLAY
  function createOverlay() {
    if (state.overlay?.isConnected) {
      return
    }

    const overlay = createElement('section', 'furina-phantom-overlay')

    overlay.id = 'furina-phantom-overlay'

    overlay.dataset.furinaOwned = 'true'

    if (SHOWCASE_MODE) {
      overlay.classList.add('is-showcase')

      resetShowcaseParallax()
    }

    overlay.setAttribute('aria-hidden', 'true')

    overlay.setAttribute('aria-label', 'Phantom Chat experimental interface')

    // TOP BAR

    const topbar = createElement('header', 'furina-phantom-topbar')

    const brand = createElement('div', 'furina-phantom-brand')

    brand.append(
      createElement('span', 'furina-phantom-brand-mark', 'P!'),

      createElement('strong', '', 'PHANTOM CHAT'),

      createElement(
        'small',
        '',
        SHOWCASE_MODE
          ? 'FURINA // SHOWCASE CUT'
          : 'FURINA EXPERIMENTAL INTERFACE'
      )
    )

    const exit = createElement('button', 'furina-phantom-exit', 'EXIT ×')

    exit.type = 'button'

    exit.addEventListener('click', close)

    const topbarActions = createElement('div', 'furina-phantom-topbar-actions')

    if (SHOWCASE_MODE && SHOWCASE_SFX) {
      const sfxToggle = createElement('button', 'furina-phantom-sfx-toggle')

      sfxToggle.type = 'button'

      sfxToggle.addEventListener('click', toggleShowcaseSfx)

      topbarActions.appendChild(sfxToggle)
    }

    topbarActions.appendChild(exit)

    topbar.append(brand, topbarActions)

    // SCENE BAR

    const sceneBar = createElement('div', 'furina-phantom-scene-bar')

    sceneBar.innerHTML = `
            <div class="furina-phantom-scene-copy">
                <span class="furina-phantom-scene-kicker">
                    CURRENT SCENE
                </span>

                <strong class="furina-phantom-scene-title">
                </strong>
            </div>

            <div class="furina-phantom-scene-turn">
                <span>TURN</span>
                <strong class="furina-phantom-scene-turn-value">
                    00
                </strong>
            </div>

            <span
                class="furina-phantom-scene-status"
                data-state="ready"
            >
                YOUR MOVE
            </span>
        `

    // KINETIC BACKDROP

    const motionLayer = createElement('div', 'furina-phantom-motion-layer')

    motionLayer.setAttribute('aria-hidden', 'true')

    motionLayer.innerHTML = `
            <div class="furina-phantom-motion-halftone"></div>
            <div class="furina-phantom-motion-stripe furina-phantom-motion-stripe-a"></div>
            <div class="furina-phantom-motion-stripe furina-phantom-motion-stripe-b"></div>
            <div class="furina-phantom-motion-stripe furina-phantom-motion-stripe-c"></div>
            <div class="furina-phantom-motion-speedlines"></div>
        `

    const actionBurst = createElement('div', 'furina-phantom-action-burst')

    actionBurst.setAttribute('aria-hidden', 'true')

    actionBurst.innerHTML = `
            <span class="furina-phantom-action-burst-slash"></span>
            <strong class="furina-phantom-action-burst-text">
                INCOMING!
            </strong>
        `

    const showcaseIntro = createElement('div', 'furina-phantom-showcase-intro')

    showcaseIntro.setAttribute('aria-hidden', 'true')

    showcaseIntro.innerHTML = `
            <span class="furina-phantom-showcase-intro-slash"></span>

            <div class="furina-phantom-showcase-intro-copy">
                <small>FURINA // CALLING CARD INTERFACE</small>
                <strong>PHANTOM CHAT</strong>
                <i>TAKE YOUR TURN.</i>
            </div>
        `

    // IDENTITY LAYER

    const identityLayer = createElement('div', 'furina-phantom-identity')

    identityLayer.setAttribute('aria-hidden', 'true')

    identityLayer.innerHTML = `
            <div class="
                furina-phantom-identity-shard
                furina-phantom-identity-shard-a
            "></div>

            <div class="
                furina-phantom-identity-shard
                furina-phantom-identity-shard-b
            "></div>

            <div class="furina-phantom-identity-word">
                CHARACTER
            </div>

            <div class="furina-phantom-portrait-wrap">
                <img
                    class="furina-phantom-portrait"
                    alt=""
                >
            </div>

            <div class="furina-phantom-identity-stamp">
                <span>
                    CURRENT SUBJECT
                </span>

                <strong class="furina-phantom-identity-stamp-name">
                    CHARACTER
                </strong>
            </div>
        `

    // MAIN AREA

    const main = createElement('main', 'furina-phantom-main')

    const history = createElement('div', 'furina-phantom-history')

    history.setAttribute('role', 'log')

    const rail = createElement('aside', 'furina-phantom-rail')

    rail.innerHTML = `
            <div class="furina-phantom-rail-card">
                <span>
                    MODE
                </span>

                <strong>
                    INTERACTIVE
                </strong>

                <small>
                    Prototype v0.8
                </small>
            </div>

            <div class="furina-phantom-rail-card furina-phantom-rail-card-subject">
                <span>
                    SUBJECT
                </span>

                <strong class="furina-phantom-rail-subject">
                    CHARACTER
                </strong>

                <small>
                    Live character identity
                </small>
            </div>

            <div class="
                furina-phantom-rail-card
                furina-phantom-rail-card-accent
            ">
                <span>
                    FURINA
                </span>

                <strong>
                    CONNECTED
                </strong>

                <small>
                    Normal chat remains underneath.
                </small>
            </div>
        `

    main.append(history, rail)

    // FOOTER

    const footer = createElement('footer', 'furina-phantom-footer')

    footer.innerHTML = `
        <div
            class="furina-phantom-footer-slash"
            aria-hidden="true"
        >
            //
        </div>

        <div
            class="furina-phantom-composer-panel"
        >

            <div
                class="furina-phantom-composer-head"
            >

                <span
                    class="furina-phantom-composer-label"
                >
                    YOUR MOVE
                </span>

                <span
                    class="furina-phantom-composer-status"
                    data-state="ready"
                >
                    READY
                </span>

            </div>


            <div
                class="furina-phantom-composer-shell"
            >

                <textarea
                    class="furina-phantom-composer"
                    rows="1"
                    placeholder="Write your reply..."
                    aria-label="Write a Phantom Chat reply"
                    spellcheck="true"
                ></textarea>


                <button
                    type="button"
                    class="furina-phantom-send"
                >
                    <span>
                        SEND
                    </span>

                    <strong
                        aria-hidden="true"
                    >
                        ▶
                    </strong>
                </button>

            </div>


            <small
                class="furina-phantom-composer-hint"
            >
                ENTER TO SEND
                ·
                SHIFT + ENTER FOR NEW LINE
                ·
                CLANK NATIVE BRIDGE
            </small>

        </div>
    `

    const phantomComposer = footer.querySelector('.furina-phantom-composer')

    const phantomSend = footer.querySelector('.furina-phantom-send')

    phantomComposer?.addEventListener('input', () => {
      resizePhantomComposer(phantomComposer)
    })

    phantomComposer?.addEventListener('focus', () => {
      state.overlay?.classList.add('is-composer-focused')
    })

    phantomComposer?.addEventListener('blur', () => {
      state.overlay?.classList.remove('is-composer-focused')
    })

    phantomComposer?.addEventListener('keydown', event => {
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

      sendFromPhantom()
    })

    phantomSend?.addEventListener('click', sendFromPhantom)

    overlay.append(
      motionLayer,
      identityLayer,
      topbar,
      sceneBar,
      main,
      footer,
      actionBurst,
      showcaseIntro
    )

    overlay.addEventListener('pointermove', updateShowcaseParallax)

    overlay.addEventListener('pointerleave', resetShowcaseParallax)

    document.body.appendChild(overlay)

    state.overlay = overlay

    state.history = history

    updateShowcaseSfxButton()
  }

  // MESSAGE RENDERER
  function renderEmptyState() {
    if (!state.history) {
      return
    }

    const empty = createElement('div', 'furina-phantom-empty')

    empty.append(
      createElement('span', 'furina-phantom-empty-mark', '!?'),

      createElement('strong', '', 'NO CHAT MESSAGES FOUND'),

      createElement(
        'p',
        '',
        'Phantom Chat could not read the current Clank conversation yet.'
      )
    )

    state.history.replaceChildren(empty)
  }

  function hashMessageValue(value) {
    let hash = 2166136261

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index)

      hash = Math.imul(hash, 16777619)
    }

    return (hash >>> 0).toString(36)
  }

  function getMessageRenderSignature(message) {
    const images = message.body
      ? [...message.body.querySelectorAll('img')]
          .map(image => image.currentSrc || image.src || '')
          .join('|')
      : ''

    return [
      message.role,

      hashMessageValue(message.text || ''),

      hashMessageValue(images)
    ].join(':')
  }

  function renderMessageContent(content, message) {
    if (!(content instanceof HTMLElement)) {
      return
    }

    const richContent = cloneMessageBody(message.body)

    if (richContent) {
      content.replaceChildren(...Array.from(richContent.childNodes))

      return
    }

    const fragment = document.createDocumentFragment()

    message.text
      .split(/\n{2,}/)
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(part => {
        fragment.appendChild(createElement('p', '', part))
      })

    content.replaceChildren(fragment)
  }

  function createMessageArticle(message, index, animate = false) {
    const article = createElement(
      'article',

      ['furina-phantom-message', `furina-phantom-message-${message.role}`].join(
        ' '
      )
    )

    article.dataset.messageIndex = String(index)

    // MESSAGE LABEL

    const meta = createElement('div', 'furina-phantom-message-meta')

    meta.append(
      createElement(
        'span',
        'furina-phantom-message-role',

        message.role === 'user' ? 'YOU' : getAssistantDisplayName()
      ),

      createElement(
        'span',
        'furina-phantom-message-index',

        `#${String(index + 1).padStart(2, '0')}`
      )
    )

    // MESSAGE BODY

    const content = createElement('div', 'furina-phantom-message-content')

    renderMessageContent(content, message)

    article.append(meta, content)

    article.dataset.renderSignature = getMessageRenderSignature(message)

    if (animate) {
      article.classList.add('is-new')

      playIdentityImpact(message.role)

      if (message.role === 'assistant') {
        state.awaitingAssistant = false

        state.overlay?.classList.remove('is-awaiting-assistant')

        playActionBurst('INCOMING!', 'assistant')

        playShowcaseSfx('incoming')

        markAssistantActivity(article)
      }

      article.addEventListener(
        'animationend',
        () => {
          article.classList.remove('is-new')
        },
        {
          once: true
        }
      )
    }

    return article
  }

  function updateMessageArticle(article, message, index) {
    if (!(article instanceof HTMLElement)) {
      return
    }

    article.classList.toggle(
      'furina-phantom-message-user',
      message.role === 'user'
    )

    article.classList.toggle(
      'furina-phantom-message-assistant',
      message.role === 'assistant'
    )

    article.dataset.messageIndex = String(index)

    const role = article.querySelector('.furina-phantom-message-role')

    if (role) {
      role.textContent =
        message.role === 'user' ? 'YOU' : getAssistantDisplayName()
    }

    const number = article.querySelector('.furina-phantom-message-index')

    if (number) {
      number.textContent = `#${String(index + 1).padStart(2, '0')}`
    }

    const signature = getMessageRenderSignature(message)

    if (article.dataset.renderSignature === signature) {
      return
    }

    const content = article.querySelector('.furina-phantom-message-content')

    renderMessageContent(content, message)

    article.dataset.renderSignature = signature

    if (message.role === 'assistant') {
      markAssistantActivity(article)
    }
  }

  function updateExchangeStage(messages, currentMessageStart) {
    if (!state.history) {
      return
    }

    const articles = [
      ...state.history.querySelectorAll(':scope > .furina-phantom-message')
    ]

    let latestUserIndex = -1

    let latestAssistantIndex = -1

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (latestUserIndex < 0 && messages[index]?.role === 'user') {
        latestUserIndex = index
      }

      if (latestAssistantIndex < 0 && messages[index]?.role === 'assistant') {
        latestAssistantIndex = index
      }

      if (latestUserIndex >= 0 && latestAssistantIndex >= 0) {
        break
      }
    }

    articles.forEach(article => {
      const index = Number(article.dataset.messageIndex)

      const isCurrent = index >= currentMessageStart

      article.classList.toggle('is-archive', !isCurrent)

      article.classList.toggle('is-latest-user', index === latestUserIndex)

      article.classList.toggle(
        'is-latest-assistant',
        index === latestAssistantIndex
      )
    })

    /*
            Keep one persistent divider in the history.

            It moves only when the current-exchange boundary moves,
            so streaming text updates do not recreate or reanimate it.
        */

    let divider = state.history.querySelector(
      ':scope > .furina-phantom-exchange-divider'
    )

    if (currentMessageStart <= 0 || currentMessageStart >= messages.length) {
      divider?.remove()

      return
    }

    if (!divider) {
      divider = createElement('div', 'furina-phantom-exchange-divider')

      divider.setAttribute('aria-hidden', 'true')

      divider.innerHTML = `
                <span>
                    CURRENT
                </span>

                <strong>
                    EXCHANGE
                </strong>

                <i>
                    //
                </i>
            `

      state.history.appendChild(divider)
    }

    const target = state.history.querySelector(
      `:scope > .furina-phantom-message[data-message-index="${currentMessageStart}"]`
    )

    if (!target) {
      return
    }

    const boundary = String(currentMessageStart)

    if (divider.dataset.beforeIndex !== boundary) {
      divider.dataset.beforeIndex = boundary

      divider.classList.remove('is-shifting')

      target.before(divider)

      void divider.offsetWidth

      divider.classList.add('is-shifting')

      window.setTimeout(() => {
        divider.classList.remove('is-shifting')
      }, 460)
    } else if (divider.nextElementSibling !== target) {
      target.before(divider)
    }
  }

  function renderMessages({forceBottom = false} = {}) {
    if (!state.open || !state.history) {
      return
    }

    const currentPath = window.location.pathname

    /*
            A route change means these persistent cards belong to the
            previous conversation.

            Clear them once and perform a quiet initial hydration for
            the newly opened chat.
        */

    if (state.hydratedPath !== currentPath) {
      state.history.replaceChildren()

      state.hydratedPath = currentPath

      state.hasHydratedMessages = false
    }

    const messages = getMessages()

    state.lastMessageFingerprint = buildMessageFingerprint(messages)

    refreshIdentity(messages)

    const previousScrollTop = state.history.scrollTop

    const distanceFromBottom =
      state.history.scrollHeight -
      state.history.scrollTop -
      state.history.clientHeight

    const shouldFollowBottom = forceBottom || distanceFromBottom < 140

    if (!messages.length) {
      renderEmptyState()

      state.hasHydratedMessages = true

      return
    }

    /*
            Remove the empty-state panel if messages have appeared.
        */

    state.history.querySelector('.furina-phantom-empty')?.remove()

    // REMOVE CARDS THAT NO LONGER EXIST
    const existingArticles = [
      ...state.history.querySelectorAll(':scope > .furina-phantom-message')
    ]

    existingArticles.forEach(article => {
      const index = Number(article.dataset.messageIndex)

      if (!Number.isInteger(index) || index >= messages.length) {
        article.remove()
      }
    })

    // CREATE OR UPDATE CARDS
    messages.forEach((message, index) => {
      let article = state.history.querySelector(
        `:scope > .furina-phantom-message[data-message-index="${index}"]`
      )

      if (!article) {
        article = createMessageArticle(
          message,
          index,

          /*
                                Existing history should quietly appear
                                the first time Phantom hydrates.

                                Only genuinely NEW messages that arrive
                                afterward receive the dramatic entrance.
                            */

          state.hasHydratedMessages
        )

        state.history.appendChild(article)

        return
      }

      /*
                    Streaming text updates the existing message card
                    rather than replacing the card itself.

                    This is what prevents the entrance animation from
                    restarting every 200ms.
                */

      updateMessageArticle(article, message, index)
    })

    // LATEST EXCHANGE EMPHASIS
    const currentMessageStart = Math.max(0, messages.length - 2)

    const articles = [
      ...state.history.querySelectorAll(':scope > .furina-phantom-message')
    ]

    articles.forEach(article => {
      const index = Number(article.dataset.messageIndex)

      article.classList.toggle(
        'furina-phantom-message-current',

        index >= currentMessageStart
      )
    })

    updateExchangeStage(messages, currentMessageStart)

    // SCENE LABEL
    const title = state.overlay?.querySelector('.furina-phantom-scene-title')

    if (title) {
      title.textContent = getConversationLabel()
    }

    updateSceneHud(messages)

    state.hasHydratedMessages = true

    // SCROLL POSITION
    if (shouldFollowBottom) {
      state.history.scrollTop = state.history.scrollHeight
    } else {
      state.history.scrollTop = previousScrollTop
    }
  }

  function scheduleRender() {
    clearTimeout(state.renderTimer)

    state.renderTimer = window.setTimeout(() => {
      state.renderTimer = null

      if (!state.open) {
        return
      }

      renderMessages()
    }, 60)
  }

  // LIVE CHAT WATCH
  function buildMessageFingerprint(messages) {
    /*
            We do not need to serialize the entire conversation every
            200ms.

            Clank normally changes the newest few messages during a
            send/generation cycle, so use:

            - total message count
            - role
            - text length
            - tail of the message text
            - image sources

            This is enough to detect new user messages and streaming
            assistant responses without doing expensive full-history
            comparisons.
        */

    const tail = messages.slice(-6)

    return [
      `count:${messages.length}`,

      ...tail.map(message => {
        const images = message.body
          ? [...message.body.querySelectorAll('img')]
              .map(image => image.currentSrc || image.src || '')
              .join('|')
          : ''

        const text = message.text || ''

        return [message.role, text.length, text.slice(-400), images].join('::')
      })
    ].join('||')
  }

  function ensureLiveWatch() {
    if (!state.open) {
      return
    }

    if (state.liveTimer) {
      return
    }

    startLiveWatch()
  }

  function startLiveWatch() {
    stopLiveWatch()

    /*
            Phantom's authoritative live-update mechanism.

            We intentionally poll instead of depending on a specific
            Clank/React DOM node surviving between renders.

            Reopening Phantom already proves getMessages() can always
            read the latest conversation state. This heartbeat simply
            asks that same question while Phantom remains open.
        */

    const initialMessages = getMessages()

    state.lastMessageFingerprint = buildMessageFingerprint(initialMessages)

    state.liveTimer = window.setInterval(() => {
      if (!state.open) {
        return
      }

      const messages = getMessages()

      const fingerprint = buildMessageFingerprint(messages)

      if (fingerprint === state.lastMessageFingerprint) {
        return
      }

      state.lastMessageFingerprint = fingerprint

      renderMessages({
        forceBottom: false
      })
    }, 200)
  }

  function stopLiveWatch() {
    if (state.liveTimer) {
      clearInterval(state.liveTimer)
    }

    state.liveTimer = null

    state.lastMessageFingerprint = ''

    clearTimeout(state.renderTimer)

    state.renderTimer = null
  }

  // PHANTOM MOTION
  function playOpenAnimation() {
    if (!state.overlay) {
      return
    }

    clearTimeout(state.introTimer)

    /*
            Removing and re-adding the class lets the entrance sequence
            play every time Phantom is launched.

            This animation belongs only to Phantom's shell. Message
            animations will use a separate system later so streaming
            replies do not repeatedly restart their entrance effects.
        */

    state.overlay.classList.remove('is-entering')

    /*
            Force the browser to acknowledge the removed class before
            adding it again.

            This is intentional and only happens when Phantom opens.
        */

    void state.overlay.offsetWidth

    state.overlay.classList.add('is-entering')

    state.introTimer = window.setTimeout(() => {
      state.overlay?.classList.remove('is-entering')

      state.introTimer = null
    }, 850)
  }

  // OPEN / CLOSE
  function open() {
    if (!isChatRoute()) {
      return
    }

    createOverlay()

    state.open = true

    state.awaitingAssistant = false

    document.body.classList.add('furina-phantom-open')

    state.overlay.classList.add('is-open')

    state.overlay.style.pointerEvents = 'auto'

    state.overlay.setAttribute('aria-hidden', 'false')

    playOpenAnimation()

    if (SHOWCASE_MODE) {
      resumeShowcaseAudio()

      playShowcaseIntro()

      window.setTimeout(() => {
        playShowcaseSfx('open')
      }, 70)
    }

    state.launcher?.setAttribute('aria-expanded', 'true')

    renderMessages({
      forceBottom: true
    })

    startLiveWatch()

    const phantomComposer = state.overlay?.querySelector(
      '.furina-phantom-composer'
    )

    const clankComposer = getClankComposer()

    if (phantomComposer instanceof HTMLTextAreaElement) {
      /*
                If the user started writing in normal Clank before opening
                Phantom, carry that unfinished draft into the alternate UI.

                Do not overwrite an existing Phantom draft.
            */

      if (!phantomComposer.value && clankComposer?.value) {
        phantomComposer.value = clankComposer.value
      }

      resizePhantomComposer(phantomComposer)

      phantomComposer.focus()
    } else {
      state.overlay?.querySelector('.furina-phantom-exit')?.focus()
    }
  }

  function close() {
    if (!state.open) {
      return
    }

    state.open = false

    stopLiveWatch()

    clearTimeout(state.introTimer)

    clearTimeout(state.composerStatusTimer)

    clearTimeout(state.actionBurstTimer)

    clearTimeout(state.showcaseIntroTimer)

    state.composerStatusTimer = null

    state.actionBurstTimer = null

    state.showcaseIntroTimer = null

    state.awaitingAssistant = false

    state.composerSending = false

    state.introTimer = null

    state.overlay?.classList.remove(
      'is-entering',
      'is-composer-focused',
      'is-sending',
      'is-awaiting-assistant'
    )

    state.overlay
      ?.querySelector('.furina-phantom-showcase-intro')
      ?.classList.remove('is-active')

    resetShowcaseParallax()

    state.overlay
      ?.querySelector('.furina-phantom-identity')
      ?.classList.remove(
        'is-speaking',
        'is-settling',
        'is-character-impact',
        'is-user-impact'
      )

    document.body.classList.remove('furina-phantom-open')

    state.overlay?.classList.remove('is-open')

    state.overlay?.setAttribute('aria-hidden', 'true')

    if (state.overlay) {
      state.overlay.style.pointerEvents = 'none'
    }

    state.launcher?.setAttribute('aria-expanded', 'false')

    state.launcher?.focus()
  }

  // SPA ROUTE SAFETY
  function syncRoute() {
    const currentPath = window.location.pathname

    /*
            Even when the URL has not changed, Clank may have replaced
            the actual chat DOM.

            Use the existing lightweight route heartbeat to repair the
            live polling watch if necessary.
        */

    if (currentPath === state.lastPath) {
      if (state.open) {
        ensureLiveWatch()
      }

      return
    }

    state.lastPath = currentPath

    if (!isChatRoute()) {
      close()

      if (state.launcher) {
        state.launcher.hidden = true
      }

      return
    }

    if (state.launcher) {
      state.launcher.hidden = false
    }

    if (state.open) {
      window.setTimeout(() => {
        renderMessages({
          forceBottom: true
        })

        startLiveWatch()
      }, 120)
    }
  }

  // CLEANUP
  function destroy() {
    close()

    if (state.routeTimer) {
      clearInterval(state.routeTimer)

      state.routeTimer = null
    }

    state.launcher?.remove()

    state.overlay?.remove()

    state.launcher = null

    state.overlay = null

    state.history = null

    state.hasHydratedMessages = false

    state.hydratedPath = null

    state.identityName = 'CHARACTER'

    state.identityPortrait = ''

    state.identitySignature = ''

    state.awaitingAssistant = false

    if (state.audioContext && state.audioContext.state !== 'closed') {
      state.audioContext.close().catch(() => {})
    }

    state.audioContext = null
  }

  // ESCAPE KEY
  window.addEventListener(
    'keydown',

    event => {
      if (event.key === 'Escape' && state.open) {
        event.preventDefault()

        event.stopPropagation()

        close()
      }
    },

    true
  )

  // INITIALIZATION

  state.routeTimer = window.setInterval(syncRoute, 500)

  Atelier.PhantomChat = {
    initialized: true,

    version: '0.8.0',

    open,

    close,

    refresh: () =>
      renderMessages({
        forceBottom: false
      }),

    refreshIdentity: () => refreshIdentity(getMessages()),

    showLauncher: () => {
      createLauncher()

      if (state.launcher) {
        state.launcher.hidden = false
      }
    },

    hideLauncher: () => {
      if (state.launcher) {
        state.launcher.hidden = true
      }
    },

    destroy,

    isOpen: () => state.open
  }
})()
