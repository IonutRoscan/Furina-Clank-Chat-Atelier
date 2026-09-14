'use strict'


/*
  Developer notes

  Tracks which messages are genuinely new so entrance animations do not replay
  across old history after route changes or rerenders. Reduced-motion preferences
  take precedence over cosmetic animation settings.
*/
/*
    Furina Entrance Manager

    Owns Furina's release premiere and later welcome-back animations.

    The Grand Premiere plays once for each declared release ID.
    The shorter Encore will be added in the next step.

    This manager does not modify Clank's chat, Phantom Chat,
    Visual Novel Mode, or profile layouts.
*/

window.ClankAtelier = window.ClankAtelier || {}

;(() => {
  const Atelier = window.ClankAtelier

  const STORAGE_KEY = 'furina-entrance-settings-v1'

  const RELEASE_ID = '1.3.0'

  const ROOT_ID = 'furina-entrance-root'

  const DEFAULT_SETTINGS = {
    premiereRelease: null,
    encoreEnabled: true
  }

  let settings = {
    ...DEFAULT_SETTINGS
  }

  let loadPromise = null
  let initialized = false
  let playedThisDocument = false
  let activeEntrance = null
  let routeObserver = null
  let routeCheckTimer = null
  let lastPath = window.location.pathname

  // ROUTE DETECTION

  function normalizePath(pathname) {
    const normalized = String(pathname || '/').replace(/\/+$/, '')

    return normalized || '/'
  }

  function isClankHomePage() {
    const path = normalizePath(window.location.pathname)

    return path === '/' || path === '/home'
  }

  function isReducedMotion() {
    return Boolean(
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    )
  }

  // STORAGE

  function sanitizeSettings(value) {
    const source =
      value && typeof value === 'object' && !Array.isArray(value) ? value : {}

    return {
      premiereRelease:
        typeof source.premiereRelease === 'string'
          ? source.premiereRelease
          : null,

      encoreEnabled: source.encoreEnabled !== false
    }
  }

  async function loadSettings() {
    if (loadPromise) {
      return loadPromise
    }

    loadPromise = (async () => {
      const stored = await Atelier.Storage.getObject(
        STORAGE_KEY,
        DEFAULT_SETTINGS
      )

      settings = sanitizeSettings(stored)

      return settings
    })()

    return loadPromise
  }

  async function markPremiereSeen() {
    settings = {
      ...settings,
      premiereRelease: RELEASE_ID
    }

    await Atelier.Storage.updateObject(STORAGE_KEY, current => ({
      ...DEFAULT_SETTINGS,
      ...sanitizeSettings(current),
      premiereRelease: RELEASE_ID
    }))
  }

  // ELEMENT HELPERS

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

  function translate(text) {
    return Atelier.I18n?.t?.(text) || text
  }

  function createParticles() {
    const field = createElement('div', 'furina-entrance-particles')

    field.setAttribute('aria-hidden', 'true')

    const particles = [
      [8, 76, 0.2, 1.05],
      [14, 32, 1.1, 0.72],
      [19, 61, 2.3, 0.92],
      [25, 18, 0.7, 0.55],
      [31, 83, 1.8, 1.18],
      [38, 43, 2.9, 0.64],
      [44, 70, 0.4, 0.86],
      [50, 24, 2.1, 1.24],
      [56, 87, 1.4, 0.58],
      [62, 54, 3.2, 1.02],
      [68, 15, 0.9, 0.78],
      [74, 74, 2.5, 1.12],
      [80, 39, 1.6, 0.66],
      [86, 65, 3.4, 0.94],
      [91, 21, 0.5, 1.2],
      [95, 82, 2.7, 0.74]
    ]

    particles.forEach(([x, y, delay, scale]) => {
      const particle = createElement('span', 'furina-entrance-particle')

      particle.style.setProperty('--furina-particle-x', `${x}%`)

      particle.style.setProperty('--furina-particle-y', `${y}%`)

      particle.style.setProperty('--furina-particle-delay', `${delay}s`)

      particle.style.setProperty('--furina-particle-scale', String(scale))

      field.appendChild(particle)
    })

    return field
  }

  function createCrest() {
    const crest = createElement('div', 'furina-entrance-crest')

    crest.setAttribute('aria-hidden', 'true')

    const ringOuter = createElement(
      'span',
      'furina-entrance-ring furina-entrance-ring-outer'
    )

    const ringMiddle = createElement(
      'span',
      'furina-entrance-ring furina-entrance-ring-middle'
    )

    const ringInner = createElement(
      'span',
      'furina-entrance-ring furina-entrance-ring-inner'
    )

    const star = createElement('span', 'furina-entrance-star', '✦')

    crest.append(ringOuter, ringMiddle, ringInner, star)

    return crest
  }

  function createPremiere() {
    const root = createElement(
      'section',
      'furina-entrance furina-entrance-premiere'
    )

    root.id = ROOT_ID

    root.dataset.furinaOwned = 'true'

    root.setAttribute('role', 'dialog')

    root.setAttribute('aria-modal', 'true')

    root.setAttribute('aria-labelledby', 'furina-entrance-title')

    if (isReducedMotion()) {
      root.classList.add('furina-entrance-reduced')
    }

    const atmosphere = createElement('div', 'furina-entrance-atmosphere')

    atmosphere.setAttribute('aria-hidden', 'true')

    atmosphere.append(
      createElement('span', 'furina-entrance-beam furina-entrance-beam-left'),
      createElement('span', 'furina-entrance-beam furina-entrance-beam-right'),
      createElement('span', 'furina-entrance-horizon')
    )

    const curtainLeft = createElement(
      'div',
      'furina-entrance-curtain furina-entrance-curtain-left'
    )

    const curtainRight = createElement(
      'div',
      'furina-entrance-curtain furina-entrance-curtain-right'
    )

    curtainLeft.setAttribute('aria-hidden', 'true')

    curtainRight.setAttribute('aria-hidden', 'true')

    const stage = createElement('div', 'furina-entrance-stage')

    const kicker = createElement(
      'div',
      'furina-entrance-kicker',
      translate('A NEW ACT BEGINS')
    )

    const title = createElement(
      'h1',
      'furina-entrance-title',
      translate('FURINA')
    )

    title.id = 'furina-entrance-title'

    const subtitle = createElement(
      'div',
      'furina-entrance-subtitle',
      translate('CLANK CHAT ATELIER')
    )

    const version = createElement(
      'div',
      'furina-entrance-version',
      translate('VERSION 1.3')
    )

    const divider = createElement('div', 'furina-entrance-divider')

    divider.setAttribute('aria-hidden', 'true')

    const motto = createElement(
      'div',
      'furina-entrance-motto',
      translate('Let every story remember.')
    )

    stage.append(
      createCrest(),
      kicker,
      title,
      subtitle,
      version,
      divider,
      motto
    )

    const skip = createElement(
      'button',
      'furina-entrance-skip',
      translate('Skip intro')
    )

    skip.type = 'button'

    skip.setAttribute('aria-label', translate('Skip Furina introduction'))

    const progress = createElement('div', 'furina-entrance-progress')

    progress.setAttribute('aria-hidden', 'true')

    progress.appendChild(createElement('span', 'furina-entrance-progress-fill'))

    root.append(
      atmosphere,
      createParticles(),
      curtainLeft,
      curtainRight,
      stage,
      skip,
      progress
    )

    return {
      root,
      skip
    }
  }

  function createEncore() {
    const root = createElement(
      'section',
      'furina-entrance furina-entrance-encore'
    )

    root.id = ROOT_ID

    root.dataset.furinaOwned = 'true'

    root.setAttribute('role', 'status')

    root.setAttribute('aria-live', 'polite')

    root.setAttribute('aria-label', translate('Furina welcomes you back'))

    if (isReducedMotion()) {
      root.classList.add('furina-entrance-reduced')
    }

    const veil = createElement('div', 'furina-encore-veil')

    veil.setAttribute('aria-hidden', 'true')

    const rippleField = createElement('div', 'furina-encore-ripples')

    rippleField.setAttribute('aria-hidden', 'true')

    rippleField.append(
      createElement('span', 'furina-encore-ripple furina-encore-ripple-one'),
      createElement('span', 'furina-encore-ripple furina-encore-ripple-two'),
      createElement('span', 'furina-encore-ripple furina-encore-ripple-three')
    )

    const card = createElement('div', 'furina-encore-card')

    const glint = createElement('span', 'furina-encore-glint')

    glint.setAttribute('aria-hidden', 'true')

    const copy = createElement('div', 'furina-encore-copy')

    copy.append(
      createElement('div', 'furina-encore-kicker', translate('THE ENCORE')),
      createElement('div', 'furina-encore-title', translate('FURINA')),
      createElement('div', 'furina-encore-message', translate('Welcome back.'))
    )

    card.append(glint, createCrest(), copy)

    root.append(veil, rippleField, card)

    return {
      root,
      skip: null
    }
  }

  // PLAYBACK

  function closeEntrance({immediate = false} = {}) {
    if (!activeEntrance) {
      return
    }

    const entrance = activeEntrance

    activeEntrance = null

    window.clearTimeout(entrance.finishTimer)

    entrance.skip?.removeEventListener('click', entrance.onSkip)

    document.removeEventListener('keydown', entrance.onKeyDown, true)

    const removeEntrance = () => {
      entrance.root.remove()

      document.documentElement.classList.remove('furina-entrance-active')

      document.body?.classList.remove('furina-entrance-active')

      document.dispatchEvent(new CustomEvent('furina-entrance-closed'))
    }

    if (immediate) {
      removeEntrance()
      return
    }

    entrance.root.classList.add('furina-entrance-leaving')

    window.setTimeout(removeEntrance, isReducedMotion() ? 120 : 650)
  }

  async function playPremiere({force = false} = {}) {
    await loadSettings()

    if (activeEntrance || document.getElementById(ROOT_ID)) {
      return false
    }

    if (
      !force &&
      (playedThisDocument ||
        !isClankHomePage() ||
        settings.premiereRelease === RELEASE_ID)
    ) {
      return false
    }

    playedThisDocument = true

    /*
            Mark it before playback begins. If the user refreshes,
            closes the tab, or presses Skip, the premiere still
            remains a one-time introduction.
        */

    if (!force) {
      await markPremiereSeen()
    }

    const {root, skip} = createPremiere()

    const onSkip = () => {
      closeEntrance()
    }

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeEntrance()
      }
    }

    skip.addEventListener('click', onSkip)

    document.addEventListener('keydown', onKeyDown, true)

    document.documentElement.classList.add('furina-entrance-active')

    document.body.classList.add('furina-entrance-active')

    document.body.appendChild(root)

    const finishTimer = window.setTimeout(
      () => {
        closeEntrance()
      },
      isReducedMotion() ? 2400 : 7200
    )

    activeEntrance = {
      root,
      skip,
      finishTimer,
      onSkip,
      onKeyDown
    }

    window.setTimeout(() => {
      root.classList.add('furina-entrance-playing')

      skip.focus({
        preventScroll: true
      })
    }, 50)

    document.dispatchEvent(
      new CustomEvent('furina-entrance-opened', {
        detail: {
          type: 'premiere',
          forced: force
        }
      })
    )

    return true
  }

  async function playEncore({force = false} = {}) {
    await loadSettings()

    if (activeEntrance || document.getElementById(ROOT_ID)) {
      return false
    }

    if (
      !force &&
      (playedThisDocument ||
        !isClankHomePage() ||
        settings.premiereRelease !== RELEASE_ID ||
        !settings.encoreEnabled)
    ) {
      return false
    }

    playedThisDocument = true

    const {root, skip} = createEncore()

    const onSkip = null

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        closeEntrance()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)

    document.body.appendChild(root)

    const finishTimer = window.setTimeout(
      () => {
        closeEntrance()
      },
      isReducedMotion() ? 1250 : 2300
    )

    activeEntrance = {
      root,
      skip,
      finishTimer,
      onSkip,
      onKeyDown
    }

    window.setTimeout(() => {
      root.classList.add('furina-entrance-playing')
    }, 30)

    document.dispatchEvent(
      new CustomEvent('furina-entrance-opened', {
        detail: {
          type: 'encore',
          forced: force
        }
      })
    )

    return true
  }

  async function playAutomaticEntrance() {
    await loadSettings()

    if (playedThisDocument || !isClankHomePage()) {
      return false
    }

    if (settings.premiereRelease !== RELEASE_ID) {
      return await playPremiere()
    }

    return await playEncore()
  }

  // AUTOMATIC HOME-PAGE CHECK

  function scheduleRouteCheck() {
    window.clearTimeout(routeCheckTimer)

    routeCheckTimer = window.setTimeout(() => {
      const currentPath = window.location.pathname

      if (currentPath === lastPath) {
        return
      }

      lastPath = currentPath

      if (isClankHomePage() && !playedThisDocument) {
        void playAutomaticEntrance()
      }
    }, 120)
  }

  function observeRoutes() {
    if (routeObserver || !document.documentElement) {
      return
    }

    routeObserver = new MutationObserver(scheduleRouteCheck)

    routeObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    })

    window.addEventListener('popstate', scheduleRouteCheck)
  }

  async function initialize() {
    if (initialized) {
      return
    }

    initialized = true

    if (window.top !== window || !Atelier.Storage) {
      return
    }

    if (typeof Atelier.I18n?.init === 'function') {
      await Atelier.I18n.init()
    }

    await loadSettings()

    observeRoutes()

    if (isClankHomePage()) {
      await playAutomaticEntrance()
    }
  }

  // PUBLIC MANAGER

  Atelier.EntranceManager = {
    init: initialize,

    playPremiere,

    playEncore,

    playAutomaticEntrance,

    close: closeEntrance,

    isHomePage: isClankHomePage,

    getSettings() {
      return {
        ...settings
      }
    },

    async setEncoreEnabled(enabled) {
      const nextEnabled = Boolean(enabled)

      settings = {
        ...settings,
        encoreEnabled: nextEnabled
      }

      loadPromise = Promise.resolve(settings)

      await Atelier.Storage.updateObject(STORAGE_KEY, current => ({
        ...DEFAULT_SETTINGS,
        ...sanitizeSettings(current),
        encoreEnabled: nextEnabled
      }))

      document.dispatchEvent(
        new CustomEvent('furina-entrance-settings-changed', {
          detail: {
            settings: {
              ...settings
            }
          }
        })
      )

      return nextEnabled
    },

    hasPlayedThisDocument() {
      return playedThisDocument
    },

    async resetPremiere() {
      settings = {
        ...settings,
        premiereRelease: null
      }

      loadPromise = Promise.resolve(settings)

      playedThisDocument = false

      await Atelier.Storage.updateObject(STORAGE_KEY, current => ({
        ...DEFAULT_SETTINGS,
        ...sanitizeSettings(current),
        premiereRelease: null
      }))

      return true
    }
  }

  // BOOT

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        void initialize()
      },
      {
        once: true
      }
    )
  } else {
    void initialize()
  }
})()
