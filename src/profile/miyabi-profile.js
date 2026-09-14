/*
  Developer notes

  Miyabi Profile powers the separate Profile Atelier/Miyabi customization layer. Profile code
  must remain route-scoped so it never alters Clank chat pages or Furina conversation
  state.
*/
// Furina: Clank Chat Atelier
// Profile Atelier — Miyabi Engine 2.0

;(() => {
  'use strict'

  /*
        Miyabi is now Furina's Profile Atelier subsystem.

        This script intentionally runs across ClankWorld because Clank is a
        single-page application. That allows Profile Atelier to notice when
        the user navigates to or away from their connected profile without
        requiring a full page refresh.

        Actual activation is still restricted later in this file to the exact
        profile URL saved by the user.
    */

  if (
    window.location.hostname !== 'www.clank.world' &&
    window.location.hostname !== 'clank.world'
  ) {
    return
  }

  /*
        Furina's chat modules use window.ClankAtelier as their shared runtime
        namespace.

        Profile Atelier uses the same namespace even though the normal chat
        engine may not be loaded on profile pages.
    */

  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  /*
        Protect against accidental double initialization.

        Clank uses client-side navigation, and future Furina lifecycle changes
        may cause this module to be evaluated from more than one path. Miyabi
        creates several fixed-position DOM elements, observers, and event
        listeners, so initializing it twice would create duplicate interfaces
        and duplicate navigation watchers.
    */

  if (Atelier.ProfileAtelier?.initialized) {
    return
  }

  const ProfileAtelier = {
    initialized: true,

    // Keep the Miyabi identity as the profile engine/sub-brand.
    engine: 'miyabi',
    engineVersion: '2.0',

    /*
            Version for Furina's integration layer.

            This is separate from Miyabi's saved settings format, which we are
            deliberately NOT changing during the initial merge.
        */
    integrationVersion: 2
  }

  Atelier.ProfileAtelier = ProfileAtelier

  // MIYABI STATE

  const DEFAULT_STATE = {
    theme: 'default',
    customBg: '',
    customAccent: '#a855f7',

    glassMode: false,
    particlesEnabled: false,
    tiltEnabled: false,
    cardAnimEnabled: false,
    compactMode: false,

    cardRadius: 12,
    gridMinWidth: 220,
    sidebarWidth: 300,

    // PHASE 2

    ambientLightEnabled: true,
    holographicEnabled: true,
    cursorTrailEnabled: false,
    headerParallaxEnabled: true,
    scrollRevealEnabled: true,
    themeParticles: true,

    effectsIntensity: 70,

    // PHASE 4 -- ATMOSPHERE

    atmosphereEnabled: true,
    atmosphereGlowEnabled: true,
    atmosphereParticlesEnabled: true,
    atmosphereIntensity: 'medium',
    atmosphereMood: 'ethereal'
  }

  const MIYABI_STORAGE_KEY = 'miyabiState'

  const state = {
    ...DEFAULT_STATE
  }

  const STORAGE_KEYS = [
    'miyabiState',

    'customBg',
    'customAccent',

    'glassMode',
    'particlesEnabled',
    'tiltEnabled',
    'cardAnimEnabled',
    'compactMode',

    'cardRadius',
    'gridMinWidth',
    'sidebarWidth',

    // Phase 2
    'ambientLightEnabled',
    'holographicEnabled',
    'cursorTrailEnabled',
    'headerParallaxEnabled',
    'scrollRevealEnabled',
    'themeParticles',
    'effectsIntensity',

    // Phase 4
    'atmosphereEnabled',
    'atmosphereGlowEnabled',
    'atmosphereParticlesEnabled',
    'atmosphereIntensity',
    'atmosphereMood'
  ]

  const THEME_PRESETS = {
    default: {
      bg: '#0c0c0c',
      text: '#ffffff',
      accent: '#a855f7',
      cardBg: '#1a1a1a',
      cardBorder: '#333333',
      font: 'sans-serif',
      radius: '12px'
    },

    cutecore: {
      bg: '#ffe6f2',
      text: '#593a4a',
      accent: '#ff80bf',
      cardBg: '#fff0f7',
      cardBorder: '#ffb3d9',
      font: '"Comic Sans MS", cursive, sans-serif',
      radius: '40px'
    },

    lain: {
      bg: '#050505',
      text: '#33ff33',
      accent: '#ffffff',
      cardBg: '#0a1a0a',
      cardBorder: '#114411',
      font: '"Courier New", monospace',
      radius: '0px'
    },

    vaporwave: {
      bg: '#1a0b2e',
      text: '#f0e6ff',
      accent: '#ff71ce',
      cardBg: '#2a1750',
      cardBorder: '#7b2ff7',
      font: '"Courier New", monospace',
      radius: '2px'
    }
  }

  // DOM / LIFECYCLE

  const onboarding = document.createElement('div')

  onboarding.id = 'miyabi-onboarding'

  onboarding.innerHTML = `
        <div class="miyabi-onboarding-backdrop"></div>

        <div class="miyabi-onboarding-card">

            <div class="miyabi-onboarding-symbol">
                ✦
            </div>

            <div class="miyabi-onboarding-kicker">
                MIYABI
            </div>

            <h1 class="miyabi-onboarding-title">
                Your profile, your world.
            </h1>

            <p class="miyabi-onboarding-description">
                Connect Miyabi to your personal
                ClankWorld profile.
                Miyabi will only activate on
                that exact profile.
            </p>

            <div
                id="miyabi-detected-profile"
                class="miyabi-detected-profile"
                hidden
            >

                <span class="miyabi-detected-label">
                    CURRENT PROFILE DETECTED
                </span>

                <strong
                    id="miyabi-detected-name"
                ></strong>

                <span
                    id="miyabi-detected-url"
                ></span>

                <button
                    id="miyabi-use-current-profile"
                    class="miyabi-onboarding-primary"
                    type="button"
                >
                    Use This Profile
                </button>

                <div class="miyabi-onboarding-divider">
                    <span>or</span>
                </div>

            </div>

            <label
                class="miyabi-onboarding-label"
                for="miyabi-profile-url"
            >
                ClankWorld Profile URL
            </label>

            <input
                id="miyabi-profile-url"
                class="miyabi-onboarding-input"
                type="url"
                placeholder="https://www.clank.world/@YourName"
                autocomplete="off"
                spellcheck="false"
            />

            <div
                id="miyabi-onboarding-error"
                class="miyabi-onboarding-error"
                aria-live="polite"
            ></div>

            <button
                id="miyabi-connect-profile"
                class="miyabi-onboarding-primary"
                type="button"
            >
                Connect Profile
            </button>

            <button
                id="miyabi-cancel-profile-change"
                class="miyabi-onboarding-secondary"
                type="button"
                hidden
            >
                Cancel
            </button>

            <p class="miyabi-onboarding-note">
                Your connected profile is stored
                locally in this browser.
            </p>

        </div>
    `

  document.body.appendChild(onboarding)

  const loadingScreen = document.createElement('div')

  loadingScreen.id = 'miyabi-loading-screen'

  loadingScreen.innerHTML = `
        <div class="miyabi-loading-orb"></div>

        <div class="miyabi-loading-title">
            ✨ Initializing Miyabi...
        </div>

        <div class="miyabi-loading-subtitle">
            Building your profile experience
        </div>
    `

  document.body.appendChild(loadingScreen)

  const overlay = document.createElement('div')

  overlay.id = 'miyabi-overlay'

  overlay.className = 'miyabi-layout'

  document.body.appendChild(overlay)

  const toggleBtn = document.createElement('button')

  toggleBtn.id = 'miyabi-toggle-button'

  toggleBtn.type = 'button'

  toggleBtn.innerHTML = `
        <span class="miyabi-toggle-spark">
            ✦
        </span>

        <span>
            Miyabi
        </span>
    `

  document.body.appendChild(toggleBtn)

  const settingsPanel = document.createElement('aside')

  settingsPanel.id = 'miyabi-settings-panel'

  document.body.appendChild(settingsPanel)

  // EFFECT REFERENCES

  let particleCanvas = null
  let particleCtx = null
  let particleAnimId = null
  let particles = []
  let particleResizeHandler = null

  let currentTheme = 'default'
  let profileOpen = false

  // Phase 2
  let phase2StyleTag = null

  let cursorLight = null
  let cursorMoveHandler = null

  let cursorTrailCanvas = null
  let cursorTrailCtx = null
  let cursorTrailAnimId = null
  let cursorTrailPoints = []
  let trailMoveHandler = null
  let trailResizeHandler = null

  let headerMoveHandler = null

  let revealObserver = null

  // Phase 4 -- Atmosphere
  let atmosphereLayer = null

  // GENERAL HELPERS

  function clampNumber(value, min, max, fallback) {
    const number = Number(value)

    if (!Number.isFinite(number)) {
      return fallback
    }

    return Math.min(max, Math.max(min, number))
  }

  function isValidHex(value) {
    return (
      typeof value === 'string' &&
      /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
    )
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function sanitizeText(value) {
    if (!value) {
      return ''
    }

    const clean = String(value)
      .replace(/<[^>]*>?/gm, '')
      .trim()

    return escapeHTML(clean)
  }

  function safeUrl(value) {
    if (!value) {
      return ''
    }

    try {
      const url = new URL(value, window.location.href)

      if (['http:', 'https:'].includes(url.protocol)) {
        return url.href
      }
    } catch (_) {}

    return ''
  }

  function hexToRgbString(hex) {
    if (!isValidHex(hex)) {
      return '168, 85, 247'
    }

    let value = hex.slice(1)

    if (value.length === 3) {
      value = value
        .split('')
        .map(char => char + char)
        .join('')
    }

    const number = parseInt(value, 16)

    const r = (number >> 16) & 255

    const g = (number >> 8) & 255

    const b = number & 255

    return `${r}, ${g}, ${b}`
  }

  function hexToRgba(hex, alpha) {
    if (!isValidHex(hex)) {
      return `
                rgba(
                    168,
                    85,
                    247,
                    ${alpha}
                )
            `
    }

    let value = hex.replace('#', '')

    if (value.length === 3) {
      value = value
        .split('')
        .map(char => char + char)
        .join('')
    }

    const number = parseInt(value, 16)

    const r = (number >> 16) & 255

    const g = (number >> 8) & 255

    const b = number & 255

    return `
            rgba(
                ${r},
                ${g},
                ${b},
                ${alpha}
            )
        `
  }

  // PROFILE BINDING

  const MIYABI_PROFILE_KEY = 'miyabiProfileUrl'

  function normalizeClankProfileUrl(value) {
    if (typeof value !== 'string' || !value.trim()) {
      return ''
    }

    try {
      const url = new URL(value.trim(), window.location.origin)

      if (
        url.hostname !== 'www.clank.world' &&
        url.hostname !== 'clank.world'
      ) {
        return ''
      }

      const match = url.pathname.match(/^\/@([^/]+)\/?$/)

      if (!match || !match[1]) {
        return ''
      }

      const username = match[1]

      return 'https://www.clank.world/@' + username
    } catch (_) {
      return ''
    }
  }

  function getCurrentProfileUrl() {
    return normalizeClankProfileUrl(window.location.href)
  }

  function isClankProfileUrl(value) {
    return Boolean(normalizeClankProfileUrl(value))
  }

  // SAFE EXTENSION STORAGE

  function isInvalidatedStorageError(error) {
    const message = String(error?.message || error || '').toLowerCase()

    return (
      message.includes('extension context invalidated') ||
      message.includes('context invalidated')
    )
  }

  async function safeStorageGet(keys, fallback = {}) {
    if (Atelier.Storage?.getMany) {
      return await Atelier.Storage.getMany(keys, fallback)
    }

    try {
      const result = await chrome.storage.local.get(keys)

      return result && typeof result === 'object' ? result : fallback
    } catch (error) {
      if (!isInvalidatedStorageError(error)) {
        console.warn('[Clank Atelier] Profile storage read failed:', error)
      }

      return fallback
    }
  }

  async function safeStorageSet(values) {
    if (Atelier.Storage?.setMany) {
      return await Atelier.Storage.setMany(values)
    }

    try {
      await chrome.storage.local.set(values)

      return true
    } catch (error) {
      if (!isInvalidatedStorageError(error)) {
        console.warn('[Clank Atelier] Profile storage write failed:', error)
      }

      return false
    }
  }

  async function safeStorageRemove(keys) {
    if (Atelier.Storage?.remove) {
      return await Atelier.Storage.remove(keys)
    }

    try {
      await chrome.storage.local.remove(keys)

      return true
    } catch (error) {
      if (!isInvalidatedStorageError(error)) {
        console.warn('[Clank Atelier] Profile storage remove failed:', error)
      }

      return false
    }
  }

  async function loadProfileBinding() {
    const result = await safeStorageGet(MIYABI_PROFILE_KEY, {})

    return normalizeClankProfileUrl(result[MIYABI_PROFILE_KEY])
  }

  async function saveProfileBinding(value) {
    const normalized = normalizeClankProfileUrl(value)

    if (!normalized) {
      return false
    }

    return await safeStorageSet({
      [MIYABI_PROFILE_KEY]: normalized
    })
  }

  async function removeProfileBinding() {
    return await safeStorageRemove(MIYABI_PROFILE_KEY)
  }

  function isBoundProfile(savedProfileUrl) {
    const current = getCurrentProfileUrl()

    const saved = normalizeClankProfileUrl(savedProfileUrl)

    return Boolean(current && saved && current === saved)
  }

  function looksLikeProfilePage() {
    if (!getCurrentProfileUrl()) {
      return false
    }

    const hasBanner = Boolean(
      document.querySelector('img.w-full.object-cover.h-\\[30vw\\]')
    )

    const hasProfileArea = Boolean(
      document.querySelector('div.hidden.md\\:block')
    )

    return hasBanner || hasProfileArea
  }

  // STORAGE

  function normalizeState(raw = {}) {
    const merged = {
      ...DEFAULT_STATE,
      ...(raw.miyabiState || raw)
    }

    merged.theme = THEME_PRESETS[merged.theme] ? merged.theme : 'default'

    merged.customAccent = isValidHex(merged.customAccent)
      ? merged.customAccent
      : DEFAULT_STATE.customAccent

    merged.cardRadius = clampNumber(
      merged.cardRadius,
      0,
      48,
      DEFAULT_STATE.cardRadius
    )

    merged.gridMinWidth = clampNumber(
      merged.gridMinWidth,
      160,
      360,
      DEFAULT_STATE.gridMinWidth
    )

    merged.sidebarWidth = clampNumber(
      merged.sidebarWidth,
      220,
      420,
      DEFAULT_STATE.sidebarWidth
    )

    merged.effectsIntensity = clampNumber(
      merged.effectsIntensity,
      0,
      100,
      DEFAULT_STATE.effectsIntensity
    )

    merged.customBg =
      typeof merged.customBg === 'string' ? merged.customBg.trim() : ''

    merged.atmosphereIntensity = ['low', 'medium', 'high'].includes(
      merged.atmosphereIntensity
    )
      ? merged.atmosphereIntensity
      : DEFAULT_STATE.atmosphereIntensity

    merged.atmosphereMood = ['ethereal', 'cyber', 'dream', 'void'].includes(
      merged.atmosphereMood
    )
      ? merged.atmosphereMood
      : DEFAULT_STATE.atmosphereMood

    return merged
  }

  async function loadState() {
    const result = await safeStorageGet(STORAGE_KEYS, {})

    const legacy = {
      customBg: result.customBg,

      customAccent: result.customAccent,

      glassMode: result.glassMode,

      particlesEnabled: result.particlesEnabled,

      tiltEnabled: result.tiltEnabled,

      cardAnimEnabled: result.cardAnimEnabled,

      compactMode: result.compactMode,

      cardRadius: result.cardRadius,

      gridMinWidth: result.gridMinWidth,

      sidebarWidth: result.sidebarWidth,

      theme: result.theme,

      ambientLightEnabled: result.ambientLightEnabled,

      holographicEnabled: result.holographicEnabled,

      cursorTrailEnabled: result.cursorTrailEnabled,

      headerParallaxEnabled: result.headerParallaxEnabled,

      scrollRevealEnabled: result.scrollRevealEnabled,

      themeParticles: result.themeParticles,

      effectsIntensity: result.effectsIntensity,

      // Phase 4
      atmosphereEnabled: result.atmosphereEnabled,

      atmosphereGlowEnabled: result.atmosphereGlowEnabled,

      atmosphereParticlesEnabled: result.atmosphereParticlesEnabled,

      atmosphereIntensity: result.atmosphereIntensity,

      atmosphereMood: result.atmosphereMood
    }

    const loaded = result.miyabiState
      ? normalizeState(result.miyabiState)
      : normalizeState(legacy)

    Object.assign(state, loaded)

    return {
      ...state
    }
  }

  function saveState() {
    return safeStorageSet({
      miyabiState: {
        ...state
      },

      // Legacy compatibility
      customBg: state.customBg,

      customAccent: state.customAccent,

      glassMode: state.glassMode,

      particlesEnabled: state.particlesEnabled,

      tiltEnabled: state.tiltEnabled,

      cardAnimEnabled: state.cardAnimEnabled,

      compactMode: state.compactMode,

      cardRadius: state.cardRadius,

      gridMinWidth: state.gridMinWidth,

      sidebarWidth: state.sidebarWidth,

      theme: state.theme,

      // Phase 2
      ambientLightEnabled: state.ambientLightEnabled,

      holographicEnabled: state.holographicEnabled,

      cursorTrailEnabled: state.cursorTrailEnabled,

      headerParallaxEnabled: state.headerParallaxEnabled,

      scrollRevealEnabled: state.scrollRevealEnabled,

      themeParticles: state.themeParticles,

      effectsIntensity: state.effectsIntensity,

      // Phase 4
      atmosphereEnabled: state.atmosphereEnabled,

      atmosphereGlowEnabled: state.atmosphereGlowEnabled,

      atmosphereParticlesEnabled: state.atmosphereParticlesEnabled,

      atmosphereIntensity: state.atmosphereIntensity,

      atmosphereMood: state.atmosphereMood
    })
  }

  function resetState() {
    Object.assign(state, DEFAULT_STATE)

    return saveState()
  }

  // THEME ENGINE

  function applyMiyabiTheme(themeName, options = {}) {
    const root = document.documentElement

    const preset = THEME_PRESETS[themeName] || THEME_PRESETS.default

    currentTheme = THEME_PRESETS[themeName] ? themeName : 'default'

    state.theme = currentTheme

    root.style.setProperty('--m-bg', preset.bg)

    root.style.setProperty('--m-text', preset.text)

    root.style.setProperty('--m-accent', state.customAccent || preset.accent)

    root.style.setProperty('--m-card-bg', preset.cardBg)

    root.style.setProperty('--m-card-border', preset.cardBorder)

    root.style.setProperty('--m-font', preset.font)

    root.style.setProperty('--m-radius', `${state.cardRadius}px`)

    root.style.setProperty('--m-grid-min', `${state.gridMinWidth}px`)

    root.style.setProperty('--m-sidebar-width', `${state.sidebarWidth}px`)

    root.style.setProperty('--m-intensity', `${state.effectsIntensity / 100}`)

    root.style.setProperty(
      '--m-accent-rgb',
      hexToRgbString(state.customAccent || preset.accent)
    )

    overlay.classList.toggle('glass-active', Boolean(state.glassMode))

    overlay.classList.toggle('compact-mode', Boolean(state.compactMode))

    overlay.dataset.theme = currentTheme

    if (state.customBg) {
      const background = safeUrl(state.customBg)

      if (background) {
        overlay.style.backgroundImage = `url("${background}")`

        overlay.classList.add('has-custom-background')
      }
    } else {
      overlay.style.backgroundImage = 'none'

      overlay.classList.remove('has-custom-background')
    }

    updateThemeButtons()
    updateSettingsInputs()

    if (!options.skipSave) {
      saveState()
    }
  }

  function updateThemeButtons() {
    overlay.querySelectorAll('[data-miyabi-theme]').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.miyabiTheme === currentTheme
      )
    })
  }

  // SETTINGS UI

  function toggleMarkup(id, title, description) {
    return `
            <label
                class="settings-toggle"
                for="${id}"
            >

                <span class="settings-toggle-copy">

                    <strong>
                        ${title}
                    </strong>

                    <small>
                        ${description}
                    </small>

                </span>

                <input
                    type="checkbox"
                    id="${id}"
                >

                <span
                    class="settings-switch"
                    aria-hidden="true"
                >
                    <span></span>
                </span>

            </label>
        `
  }

  function themeButton(name, icon, label) {
    const descriptions = {
      default: 'Clean • Elegant • Balanced',
      cutecore: 'Soft • Dreamy • Playful',
      lain: 'Digital • Cold • Cybernetic',
      vaporwave: 'Neon • Surreal • Electric'
    }

    const description = descriptions[name] || 'Custom Miyabi atmosphere'

    return `
            <button
                type="button"
                class="settings-theme"
                data-miyabi-theme="${name}"
                aria-label="Use ${label} theme"
            >

                <span
                    class="settings-theme-preview settings-theme-preview-${name}"
                    aria-hidden="true"
                >

                    <span class="theme-preview-orb"></span>

                    <span class="theme-preview-symbol">
                        ${icon}
                    </span>

                    <span class="theme-preview-shine"></span>

                </span>


                <span class="settings-theme-content">

                    <strong class="settings-theme-name">
                        ${label}
                    </strong>

                    <small class="settings-theme-description">
                        ${description}
                    </small>

                </span>


                <span
                    class="settings-theme-check"
                    aria-hidden="true"
                >
                    ✓
                </span>

            </button>
        `
  }

  function renderSettingsPanel() {
    settingsPanel.innerHTML = `

            <div class="settings-shell">

                <div class="settings-header">

                    <div>

                        <div class="settings-kicker">
                            MIYABI ENGINE
                        </div>

                        <div class="settings-title">
                            Customize Profile
                        </div>

                    </div>

                    <button
                        class="settings-close"
                        id="miyabi-close-settings"
                        type="button"
                        aria-label="Close settings"
                    >
                        ✕
                    </button>

                </div>


                <div class="settings-scroll">

                    <!-- APPEARANCE -->

                    <section class="settings-section">

                        <div class="settings-section-title">
                            Appearance
                        </div>

                        <div class="settings-group">

                            <label
                                for="miyabi-bg-input"
                            >
                                Background Image URL
                            </label>

                            <input
                                type="url"
                                class="settings-input"
                                id="miyabi-bg-input"
                                placeholder="https://..."
                            >

                        </div>


                        <div class="settings-group">

                            <label
                                for="miyabi-accent-input"
                            >
                                Accent Color
                            </label>

                            <div class="settings-color-row">

                                <input
                                    type="color"
                                    id="miyabi-accent-picker"
                                    class="settings-color-picker"
                                >

                                <input
                                    type="text"
                                    class="settings-input"
                                    id="miyabi-accent-input"
                                    placeholder="#a855f7"
                                    maxlength="7"
                                >

                            </div>

                        </div>


                        <div class="settings-group">

                            <label
                                for="miyabi-radius-input"
                            >
                                Card Roundness

                                <span
                                    id="miyabi-radius-value"
                                    class="settings-value"
                                ></span>
                            </label>

                            <input
                                type="range"
                                id="miyabi-radius-input"
                                min="0"
                                max="48"
                                step="1"
                            >

                        </div>


                        <div class="settings-group">

                            <label
                                for="miyabi-grid-input"
                            >
                                Card Size

                                <span
                                    id="miyabi-grid-value"
                                    class="settings-value"
                                ></span>
                            </label>

                            <input
                                type="range"
                                id="miyabi-grid-input"
                                min="160"
                                max="360"
                                step="10"
                            >

                        </div>


                        <div class="settings-group">

                            <label
                                for="miyabi-sidebar-input"
                            >
                                Sidebar Width

                                <span
                                    id="miyabi-sidebar-value"
                                    class="settings-value"
                                ></span>
                            </label>

                            <input
                                type="range"
                                id="miyabi-sidebar-input"
                                min="220"
                                max="420"
                                step="10"
                            >

                        </div>

                    </section>


                    <!-- PHASE 1 EFFECTS -->

                    <section class="settings-section">

                        <div class="settings-section-title">
                            Effects
                        </div>

                        ${toggleMarkup(
                          'miyabi-glass-input',
                          'Frosted Glass',
                          'Blurred translucent cards'
                        )}

                        ${toggleMarkup(
                          'miyabi-particles-input',
                          'Ambient Particles',
                          'Floating accent-colored particles'
                        )}

                        ${toggleMarkup(
                          'miyabi-tilt-input',
                          '3D Tilt Cards',
                          'Cards follow your cursor'
                        )}

                        ${toggleMarkup(
                          'miyabi-cardanim-input',
                          'Card Entrance',
                          'Staggered card reveal'
                        )}

                        ${toggleMarkup(
                          'miyabi-compact-input',
                          'Compact Layout',
                          'Tighter spacing and denser cards'
                        )}

                    </section>


                    <!-- PHASE 2 -->

                    <section class="settings-section">

                        <div class="settings-section-title">
                            Phase 2 Effects
                        </div>

                        ${toggleMarkup(
                          'miyabi-ambient-input',
                          'Ambient Cursor Light',
                          'A soft light follows your cursor'
                        )}

                        ${toggleMarkup(
                          'miyabi-holo-input',
                          'Holographic Cards',
                          'Dynamic shine, glow and depth'
                        )}

                        ${toggleMarkup(
                          'miyabi-trail-input',
                          'Cursor Trail',
                          'A subtle fading light trail'
                        )}

                        ${toggleMarkup(
                          'miyabi-parallax-input',
                          'Header Parallax',
                          'Banner and avatar respond to your cursor'
                        )}

                        ${toggleMarkup(
                          'miyabi-reveal-input',
                          'Scroll Reveal',
                          'Cards animate as they enter the viewport'
                        )}

                        ${toggleMarkup(
                          'miyabi-theme-particles-input',
                          'Theme Particles',
                          'Particle shapes adapt to the active theme'
                        )}


                        <div class="settings-group">

                            <label
                                for="miyabi-intensity-input"
                            >
                                Effects Intensity

                                <span
                                    id="miyabi-intensity-value"
                                    class="settings-value"
                                ></span>

                            </label>

                            <input
                                type="range"
                                id="miyabi-intensity-input"
                                min="0"
                                max="100"
                                step="5"
                            >

                        </div>

                    </section>


                    <!-- PHASE 4 -- ATMOSPHERE -->

                    <section class="settings-section">

                        <div class="settings-section-title">
                            ✦ Atmosphere
                        </div>

                        ${toggleMarkup(
                          'miyabi-atmosphere-input',
                          'Atmosphere',
                          'Environmental visual effects'
                        )}

                        ${toggleMarkup(
                          'miyabi-atmosphere-glow-input',
                          'Ambient Glow',
                          'Soft moving light'
                        )}

                        ${toggleMarkup(
                          'miyabi-atmosphere-particles-input',
                          'Particles',
                          'Floating environmental particles'
                        )}

                        <div class="settings-group">

                            <label>
                                Atmosphere Intensity
                            </label>

                            <div
                                class="settings-segmented"
                                id="miyabi-atmosphere-intensity-group"
                            >

                                <button
                                    type="button"
                                    class="settings-segmented-btn"
                                    data-atmo-intensity="low"
                                >
                                    Low
                                </button>

                                <button
                                    type="button"
                                    class="settings-segmented-btn"
                                    data-atmo-intensity="medium"
                                >
                                    Medium
                                </button>

                                <button
                                    type="button"
                                    class="settings-segmented-btn"
                                    data-atmo-intensity="high"
                                >
                                    High
                                </button>

                            </div>

                        </div>

                        <div class="settings-group">

                            <label>
                                Atmosphere Mood
                            </label>

                            <div
                                class="atmosphere-mood-grid"
                                id="miyabi-atmosphere-mood-group"
                            >

                                <button
                                    type="button"
                                    class="atmosphere-mood-btn"
                                    data-atmo-mood="ethereal"
                                >
                                    <span class="atmosphere-mood-icon">✦</span>
                                    Ethereal
                                </button>

                                <button
                                    type="button"
                                    class="atmosphere-mood-btn"
                                    data-atmo-mood="cyber"
                                >
                                    <span class="atmosphere-mood-icon">◈</span>
                                    Cyber
                                </button>

                                <button
                                    type="button"
                                    class="atmosphere-mood-btn"
                                    data-atmo-mood="dream"
                                >
                                    <span class="atmosphere-mood-icon">✧</span>
                                    Dream
                                </button>

                                <button
                                    type="button"
                                    class="atmosphere-mood-btn"
                                    data-atmo-mood="void"
                                >
                                    <span class="atmosphere-mood-icon">◉</span>
                                    Void
                                </button>

                            </div>

                        </div>

                    </section>


                    <!-- THEMES -->

                    <section class="settings-section">

                        <div class="settings-section-title">
                            Themes
                        </div>

                        <div class="settings-theme-grid">

                            ${themeButton('default', '✦', 'Default')}

                            ${themeButton('cutecore', '🌸', 'Cutecore')}

                            ${themeButton('lain', '💻', 'Terminal')}

                            ${themeButton('vaporwave', '🌆', 'Vaporwave')}

                        </div>

                    </section>


                    <!-- TOOLS -->

                    <section class="settings-section settings-tools">

                        <div class="settings-section-title">
                            Profile Data
                        </div>

                        <button
                            class="settings-action"
                            id="miyabi-export-settings"
                            type="button"
                        >
                            ↗ Export Settings
                        </button>

                        <button
                            class="settings-action"
                            id="miyabi-import-settings"
                            type="button"
                        >
                            ↙ Import Settings
                        </button>

                        <button
                            class="settings-action danger"
                            id="miyabi-reset-settings"
                            type="button"
                        >
                            ↺ Reset Miyabi
                        </button>

                        <input
                            type="file"
                            id="miyabi-import-file"
                            accept="application/json"
                            hidden
                        >

                    </section>

                    <!-- CONNECTED PROFILE -->

                    <section class="settings-section">

                        <div class="settings-section-title">
                            Connected Profile
                        </div>

                        <div class="miyabi-connected-profile">

                            <div class="miyabi-connected-profile-info">

                                <div
                                    id="miyabi-connected-profile-name"
                                    class="miyabi-connected-profile-name"
                                >
                                    Not connected
                                </div>

                                <div
                                    id="miyabi-connected-profile-url"
                                    class="miyabi-connected-profile-url"
                                >
                                    —
                                </div>

                            </div>

                            <button
                                class="settings-action"
                                id="miyabi-change-profile"
                                type="button"
                            >
                                Change Profile
                            </button>

                            <button
                                class="settings-action danger"
                                id="miyabi-disconnect-profile"
                                type="button"
                            >
                                Disconnect Profile
                            </button>

                        </div>

                    </section>
                </div>



                <div class="settings-footer">

                    <button
                        class="theme-btn settings-save"
                        id="miyabi-save-settings"
                        type="button"
                    >
                        Save Custom Settings
                    </button>

                    <div
                        class="settings-status"
                        id="miyabi-settings-status"
                    >
                        Changes are saved locally.
                    </div>

                </div>

            </div>
        `

    wireSettingsEvents()
    updateSettingsInputs()
  }

  async function updateConnectedProfileUI() {
    if (!settingsPanel.isConnected) {
      return
    }

    const savedProfileUrl = await loadProfileBinding()

    const nameElement = document.getElementById('miyabi-connected-profile-name')

    const urlElement = document.getElementById('miyabi-connected-profile-url')

    if (!nameElement || !urlElement) {
      return
    }

    if (!savedProfileUrl) {
      nameElement.textContent = 'Not connected'

      urlElement.textContent = '—'

      return
    }

    let username = ''

    try {
      username = new URL(savedProfileUrl).pathname.slice(2)
    } catch (_) {
      username = ''
    }

    nameElement.textContent = username ? `@${username}` : 'Connected'

    urlElement.textContent = savedProfileUrl
  }

  function updateSettingsInputs() {
    if (!settingsPanel.isConnected) {
      return
    }

    updateConnectedProfileUI()

    const setValue = (id, value) => {
      const element = document.getElementById(id)

      if (!element) {
        return
      }

      if (element.tagName === 'INPUT') {
        element.value = value
      } else {
        element.textContent = value
      }
    }

    setValue('miyabi-bg-input', state.customBg)

    setValue('miyabi-accent-input', state.customAccent)

    setValue(
      'miyabi-accent-picker',
      isValidHex(state.customAccent)
        ? state.customAccent
        : DEFAULT_STATE.customAccent
    )

    setValue('miyabi-radius-input', state.cardRadius)

    setValue('miyabi-grid-input', state.gridMinWidth)

    setValue('miyabi-sidebar-input', state.sidebarWidth)

    setValue('miyabi-intensity-input', state.effectsIntensity)

    setValue('miyabi-radius-value', `${state.cardRadius}px`)

    setValue('miyabi-grid-value', `${state.gridMinWidth}px`)

    setValue('miyabi-sidebar-value', `${state.sidebarWidth}px`)

    setValue('miyabi-intensity-value', `${state.effectsIntensity}%`)

    const checks = {
      'miyabi-glass-input': state.glassMode,

      'miyabi-particles-input': state.particlesEnabled,

      'miyabi-tilt-input': state.tiltEnabled,

      'miyabi-cardanim-input': state.cardAnimEnabled,

      'miyabi-compact-input': state.compactMode,

      // Phase 2

      'miyabi-ambient-input': state.ambientLightEnabled,

      'miyabi-holo-input': state.holographicEnabled,

      'miyabi-trail-input': state.cursorTrailEnabled,

      'miyabi-parallax-input': state.headerParallaxEnabled,

      'miyabi-reveal-input': state.scrollRevealEnabled,

      'miyabi-theme-particles-input': state.themeParticles,

      // Phase 4

      'miyabi-atmosphere-input': state.atmosphereEnabled,

      'miyabi-atmosphere-glow-input': state.atmosphereGlowEnabled,

      'miyabi-atmosphere-particles-input': state.atmosphereParticlesEnabled
    }

    Object.entries(checks).forEach(([id, value]) => {
      const element = document.getElementById(id)

      if (element) {
        element.checked = Boolean(value)
      }
    })

    updateThemeButtons()

    updateAtmosphereControlButtons()
  }

  function wireSettingsEvents() {
    document
      .getElementById('miyabi-close-settings')
      ?.addEventListener('click', closeSettings)

    // RANGES

    const liveRange = (id, stateKey, valueId, suffix) => {
      const input = document.getElementById(id)

      const value = document.getElementById(valueId)

      if (!input) {
        return
      }

      input.addEventListener('input', () => {
        state[stateKey] = Number(input.value)

        if (value) {
          value.textContent = `${state[stateKey]}${suffix}`
        }

        applyMiyabiTheme(currentTheme, {
          skipSave: true
        })
      })
    }

    liveRange('miyabi-radius-input', 'cardRadius', 'miyabi-radius-value', 'px')

    liveRange('miyabi-grid-input', 'gridMinWidth', 'miyabi-grid-value', 'px')

    liveRange(
      'miyabi-sidebar-input',
      'sidebarWidth',
      'miyabi-sidebar-value',
      'px'
    )

    // INTENSITY

    const intensityInput = document.getElementById('miyabi-intensity-input')

    const intensityValue = document.getElementById('miyabi-intensity-value')

    intensityInput?.addEventListener('input', () => {
      state.effectsIntensity = clampNumber(intensityInput.value, 0, 100, 70)

      if (intensityValue) {
        intensityValue.textContent = `${state.effectsIntensity}%`
      }

      applyMiyabiTheme(currentTheme, {
        skipSave: true
      })

      refreshEffects()
    })

    // ACCENT

    const accentInput = document.getElementById('miyabi-accent-input')

    const accentPicker = document.getElementById('miyabi-accent-picker')

    accentInput?.addEventListener('input', () => {
      const value = accentInput.value.trim()

      if (isValidHex(value)) {
        state.customAccent = value

        if (accentPicker) {
          accentPicker.value = value
        }

        applyMiyabiTheme(currentTheme, {
          skipSave: true
        })
      }
    })

    accentPicker?.addEventListener('input', () => {
      state.customAccent = accentPicker.value

      if (accentInput) {
        accentInput.value = accentPicker.value
      }

      applyMiyabiTheme(currentTheme, {
        skipSave: true
      })
    })

    // SAVE

    document
      .getElementById('miyabi-save-settings')
      ?.addEventListener('click', async () => {
        const bg =
          document.getElementById('miyabi-bg-input')?.value.trim() || ''

        const accent =
          document.getElementById('miyabi-accent-input')?.value.trim() ||
          state.customAccent

        if (bg && !safeUrl(bg)) {
          setSettingsStatus('That background URL is not valid.', true)

          return
        }

        if (!isValidHex(accent)) {
          setSettingsStatus('Accent must be a valid hex color.', true)

          return
        }

        state.customBg = bg

        state.customAccent = accent

        state.glassMode = Boolean(
          document.getElementById('miyabi-glass-input')?.checked
        )

        state.particlesEnabled = Boolean(
          document.getElementById('miyabi-particles-input')?.checked
        )

        state.tiltEnabled = Boolean(
          document.getElementById('miyabi-tilt-input')?.checked
        )

        state.cardAnimEnabled = Boolean(
          document.getElementById('miyabi-cardanim-input')?.checked
        )

        state.compactMode = Boolean(
          document.getElementById('miyabi-compact-input')?.checked
        )

        // Phase 2

        state.ambientLightEnabled = Boolean(
          document.getElementById('miyabi-ambient-input')?.checked
        )

        state.holographicEnabled = Boolean(
          document.getElementById('miyabi-holo-input')?.checked
        )

        state.cursorTrailEnabled = Boolean(
          document.getElementById('miyabi-trail-input')?.checked
        )

        state.headerParallaxEnabled = Boolean(
          document.getElementById('miyabi-parallax-input')?.checked
        )

        state.scrollRevealEnabled = Boolean(
          document.getElementById('miyabi-reveal-input')?.checked
        )

        state.themeParticles = Boolean(
          document.getElementById('miyabi-theme-particles-input')?.checked
        )

        state.effectsIntensity = clampNumber(
          document.getElementById('miyabi-intensity-input')?.value,
          0,
          100,
          70
        )

        // Phase 4

        state.atmosphereEnabled = Boolean(
          document.getElementById('miyabi-atmosphere-input')?.checked
        )

        state.atmosphereGlowEnabled = Boolean(
          document.getElementById('miyabi-atmosphere-glow-input')?.checked
        )

        state.atmosphereParticlesEnabled = Boolean(
          document.getElementById('miyabi-atmosphere-particles-input')?.checked
        )

        applyMiyabiTheme(currentTheme, {
          skipSave: true
        })

        refreshEffects()

        await saveState()

        setSettingsStatus('Saved ✓')
      })

    // THEMES

    settingsPanel.querySelectorAll('[data-miyabi-theme]').forEach(button => {
      button.addEventListener('click', async () => {
        applyMiyabiTheme(button.dataset.miyabiTheme, {
          skipSave: true
        })

        await saveState()

        refreshEffects()

        setSettingsStatus(`Theme changed to ${button.dataset.miyabiTheme}.`)
      })
    })

    // ATMOSPHERE -- INTENSITY / MOOD
    // (applied instantly, same pattern as the theme buttons above,
    // rather than deferred to the Save button)

    settingsPanel.querySelectorAll('[data-atmo-intensity]').forEach(button => {
      button.addEventListener('click', () => {
        setAtmosphereIntensity(button.dataset.atmoIntensity)

        setSettingsStatus(
          `Atmosphere intensity set to ${button.dataset.atmoIntensity}.`
        )
      })
    })

    settingsPanel.querySelectorAll('[data-atmo-mood]').forEach(button => {
      button.addEventListener('click', () => {
        setAtmosphereMood(button.dataset.atmoMood)

        setSettingsStatus(`Atmosphere mood set to ${button.dataset.atmoMood}.`)
      })
    })

    // CONNECTED PROFILE

    document
      .getElementById('miyabi-change-profile')
      ?.addEventListener('click', () => {
        closeSettings()

        showOnboarding()
      })

    document
      .getElementById('miyabi-disconnect-profile')
      ?.addEventListener('click', async () => {
        const confirmed = window.confirm(
          'Disconnect this ClankWorld profile from Miyabi?\n\nYour themes and customization settings will be kept.'
        )

        if (!confirmed) {
          return
        }

        await removeProfileBinding()

        closeSettings()

        if (profileOpen) {
          closeProfile()
        }

        toggleBtn.hidden = true

        showOnboarding()
      })

    // EXPORT / IMPORT

    document
      .getElementById('miyabi-export-settings')
      ?.addEventListener('click', exportSettings)

    document
      .getElementById('miyabi-import-settings')
      ?.addEventListener('click', () =>
        document.getElementById('miyabi-import-file')?.click()
      )

    document
      .getElementById('miyabi-import-file')
      ?.addEventListener('change', importSettings)

    // RESET

    document
      .getElementById('miyabi-reset-settings')
      ?.addEventListener('click', async () => {
        if (!window.confirm('Reset all Miyabi customization settings?')) {
          return
        }

        await resetState()

        applyMiyabiTheme('default', {
          skipSave: true
        })

        refreshEffects()

        updateSettingsInputs()

        setSettingsStatus('Miyabi has been reset.')
      })
  }

  function setSettingsStatus(message, isError = false) {
    const status = document.getElementById('miyabi-settings-status')

    if (!status) {
      return
    }

    status.textContent = message

    status.classList.toggle('error', isError)

    clearTimeout(status._miyabiTimer)

    status._miyabiTimer = setTimeout(() => {
      status.textContent = 'Changes are saved locally.'

      status.classList.remove('error')
    }, 2500)
  }

  function openSettings() {
    settingsPanel.classList.add('open')

    settingsPanel.setAttribute('aria-hidden', 'false')
  }

  function closeSettings() {
    settingsPanel.classList.remove('open')

    settingsPanel.setAttribute('aria-hidden', 'true')
  }

  // EXPORT / IMPORT

  function exportSettings() {
    const payload = {
      miyabi: '2.0-phase2',

      exportedAt: new Date().toISOString(),

      settings: {
        ...state
      }
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)

    const anchor = document.createElement('a')

    anchor.href = url

    anchor.download = 'miyabi-phase2-settings.json'

    document.body.appendChild(anchor)

    anchor.click()

    anchor.remove()

    URL.revokeObjectURL(url)

    setSettingsStatus('Settings exported ✓')
  }

  async function importSettings(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const text = await file.text()

      const parsed = JSON.parse(text)

      const imported = normalizeState(parsed.settings || parsed)

      Object.assign(state, imported)

      await saveState()

      applyMiyabiTheme(state.theme, {
        skipSave: true
      })

      updateSettingsInputs()

      refreshEffects()

      setSettingsStatus('Settings imported ✓')
    } catch (error) {
      console.error('Miyabi import failed:', error)

      setSettingsStatus('Could not import that file.', true)
    } finally {
      event.target.value = ''
    }
  }

  // PHASE 4 -- ATMOSPHERE HELPERS
  // (Shared by the particle engine below and by initAtmosphere()
  // further down. Kept here, ahead of first use, since Phase 1's
  // particle engine now consults these too.)

  function getAtmosphereMoodMeta(mood) {
    const moods = {
      ethereal: {
        shape: 'circle',
        speed: 1,
        density: 1
      },

      cyber: {
        shape: 'square',
        speed: 1.3,
        density: 0.8
      },

      dream: {
        shape: 'diamond',
        speed: 0.85,
        density: 1.3
      },

      void: {
        shape: 'circle',
        speed: 0.6,
        density: 0.22
      }
    }

    return moods[mood] || moods.ethereal
  }

  function getAtmosphereIntensityMeta(intensity) {
    const levels = {
      low: {
        glowOpacity: 0.24,
        particleFactor: 0.55,
        particleOpacity: 0.75
      },

      medium: {
        glowOpacity: 0.48,
        particleFactor: 1,
        particleOpacity: 1
      },

      high: {
        glowOpacity: 0.78,
        particleFactor: 1.7,
        particleOpacity: 1.3
      }
    }

    return levels[intensity] || levels.medium
  }

  function particlesShouldRun() {
    return (
      Boolean(state.particlesEnabled) ||
      Boolean(state.atmosphereEnabled && state.atmosphereParticlesEnabled)
    )
  }

  // PHASE 1 PARTICLES

  function spawnParticle() {
    return {
      x: Math.random() * window.innerWidth,

      y: Math.random() * window.innerHeight,

      r: Math.random() * 2 + 0.6,

      speedY: Math.random() * 0.35 + 0.08,

      drift: (Math.random() - 0.5) * 0.25,

      opacity: Math.random() * 0.5 + 0.2
    }
  }

  function resizeParticleCanvas() {
    if (!particleCanvas) {
      return
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    particleCanvas.width = Math.floor(window.innerWidth * dpr)

    particleCanvas.height = Math.floor(window.innerHeight * dpr)

    particleCtx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function animateParticles() {
    if (!particleCtx || !particleCanvas || !particlesShouldRun()) {
      return
    }

    particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight)

    const accent =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--m-accent')
        .trim() || '#a855f7'

    particles.forEach(particle => {
      particle.y -= particle.speedY

      particle.x += particle.drift

      if (particle.y < -10) {
        particle.y = window.innerHeight + 10

        particle.x = Math.random() * window.innerWidth
      }

      if (particle.x < -10) {
        particle.x = window.innerWidth + 10
      }

      if (particle.x > window.innerWidth + 10) {
        particle.x = -10
      }

      particleCtx.beginPath()

      // Atmosphere mood shape takes priority when atmosphere
      // particles are driving this engine; otherwise fall back
      // to the original per-theme shape logic.

      const atmosphereDriving =
        state.atmosphereEnabled && state.atmosphereParticlesEnabled

      const moodShape = atmosphereDriving
        ? getAtmosphereMoodMeta(state.atmosphereMood).shape
        : null

      if (
        moodShape === 'diamond' ||
        (!moodShape && state.themeParticles && currentTheme === 'cutecore')
      ) {
        // Diamond / sparkle

        particleCtx.moveTo(particle.x, particle.y - particle.r * 1.5)

        particleCtx.lineTo(particle.x + particle.r * 1.2, particle.y)

        particleCtx.lineTo(particle.x, particle.y + particle.r * 1.5)

        particleCtx.lineTo(particle.x - particle.r * 1.2, particle.y)

        particleCtx.closePath()
      } else if (
        moodShape === 'square' ||
        (!moodShape && state.themeParticles && currentTheme === 'lain')
      ) {
        // Digital square

        particleCtx.rect(
          particle.x - particle.r,
          particle.y - particle.r,
          particle.r * 2,
          particle.r * 2
        )
      } else {
        particleCtx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
      }

      const atmosphereOpacityFactor = atmosphereDriving
        ? getAtmosphereIntensityMeta(state.atmosphereIntensity).particleOpacity
        : 1

      particleCtx.fillStyle = hexToRgba(
        accent,
        particle.opacity *
          (0.65 + state.effectsIntensity / 300) *
          atmosphereOpacityFactor
      )

      particleCtx.fill()
    })

    particleAnimId = requestAnimationFrame(animateParticles)
  }

  function initParticles() {
    if (particleCanvas?.isConnected) {
      return
    }

    particleCanvas = document.createElement('canvas')

    particleCanvas.id = 'miyabi-particle-canvas'

    overlay.prepend(particleCanvas)

    particleCtx = particleCanvas.getContext('2d')

    const atmosphereDriving =
      state.atmosphereEnabled && state.atmosphereParticlesEnabled

    const baseCount = 55

    const particleCount = atmosphereDriving
      ? Math.max(
          6,
          Math.round(
            baseCount *
              getAtmosphereMoodMeta(state.atmosphereMood).density *
              getAtmosphereIntensityMeta(state.atmosphereIntensity)
                .particleFactor
          )
        )
      : baseCount

    particles = Array.from(
      {
        length: particleCount
      },
      spawnParticle
    )

    particleResizeHandler = resizeParticleCanvas

    window.addEventListener('resize', particleResizeHandler, {
      passive: true
    })

    resizeParticleCanvas()

    animateParticles()
  }

  function destroyParticles() {
    if (particleAnimId) {
      cancelAnimationFrame(particleAnimId)
    }

    particleAnimId = null

    if (particleResizeHandler) {
      window.removeEventListener('resize', particleResizeHandler)
    }

    particleResizeHandler = null

    particleCanvas?.remove()

    particleCanvas = null

    particleCtx = null

    particles = []
  }

  // PHASE 1 CARD TILT

  function attachTiltEffect(card) {
    if (card._miyabiTiltHandlers) {
      return
    }

    const maxTilt = 10

    const onMove = event => {
      const rect = card.getBoundingClientRect()

      if (!rect.width || !rect.height) {
        return
      }

      const px = (event.clientX - rect.left) / rect.width - 0.5

      const py = (event.clientY - rect.top) / rect.height - 0.5

      card.style.setProperty('--m-card-mx', `${(px + 0.5) * 100}%`)

      card.style.setProperty('--m-card-my', `${(py + 0.5) * 100}%`)

      card.style.transform = `
                        perspective(900px)
                        rotateX(${-py * maxTilt * 2}deg)
                        rotateY(${px * maxTilt * 2}deg)
                        translateY(-6px)
                        scale(1.03)
                    `
    }

    const onLeave = () => {
      card.style.transform = ''

      card.style.removeProperty('--m-card-mx')

      card.style.removeProperty('--m-card-my')
    }

    card.addEventListener('mousemove', onMove)

    card.addEventListener('mouseleave', onLeave)

    card._miyabiTiltHandlers = {
      onMove,
      onLeave
    }
  }

  function removeTiltEffect(card) {
    if (card._miyabiTiltHandlers) {
      card.removeEventListener('mousemove', card._miyabiTiltHandlers.onMove)

      card.removeEventListener('mouseleave', card._miyabiTiltHandlers.onLeave)

      delete card._miyabiTiltHandlers
    }

    card.style.transform = ''

    card.style.removeProperty('--m-card-mx')

    card.style.removeProperty('--m-card-my')
  }

  function applyCardEffects() {
    const cards = overlay.querySelectorAll('.miyabi-card')

    cards.forEach((card, index) => {
      removeTiltEffect(card)

      card.classList.toggle('tilt-enabled', state.tiltEnabled)

      card.classList.toggle('miyabi-card-enter', state.cardAnimEnabled)

      card.style.animationDelay = state.cardAnimEnabled
        ? `${Math.min(index * 40, 640)}ms`
        : ''

      if (state.tiltEnabled) {
        attachTiltEffect(card)
      }
    })
  }

  // PHASE 2 CSS

  function installPhase2Styles() {
    if (phase2StyleTag?.isConnected) {
      return
    }

    phase2StyleTag = document.createElement('style')

    phase2StyleTag.id = 'miyabi-phase2-styles'

    phase2StyleTag.textContent = `

            /* =====================================================
               MIYABI PHASE 2
               ===================================================== */

            #miyabi-overlay {

                --m2-mx: 50vw;
                --m2-my: 50vh;

                --m2-glow-alpha: .18;
                --m2-speed: 1;
            }


            /* =====================================================
               AMBIENT CURSOR LIGHT
               ===================================================== */

            #miyabi-overlay::before {

                background:

                    radial-gradient(
                        520px circle
                        at var(--m2-mx)
                           var(--m2-my),

                        rgba(
                            var(--m-accent-rgb),
                            calc(
                                .16 *
                                var(--m-intensity)
                            )
                        ),

                        transparent 65%
                    ),

                    radial-gradient(
                        circle at 15% 10%,
                        color-mix(
                            in srgb,
                            var(--m-accent)
                                13%,
                            transparent
                        ),
                        transparent 35%
                    ),

                    radial-gradient(
                        circle at 85% 80%,
                        color-mix(
                            in srgb,
                            var(--m-accent)
                                9%,
                            transparent
                        ),
                        transparent 40%
                    );

                transition:
                    background
                    .12s
                    linear;
            }


            #miyabi-overlay.m2-no-light::before {

                background:

                    radial-gradient(
                        circle at 15% 10%,
                        color-mix(
                            in srgb,
                            var(--m-accent)
                                13%,
                            transparent
                        ),
                        transparent 35%
                    ),

                    radial-gradient(
                        circle at 85% 80%,
                        color-mix(
                            in srgb,
                            var(--m-accent)
                                9%,
                            transparent
                        ),
                        transparent 40%
                    );
            }


            #miyabi-cursor-light {

                position: fixed;

                width: 380px;
                height: 380px;

                left: 0;
                top: 0;

                z-index: -1;

                pointer-events: none;

                border-radius: 50%;

                background:

                    radial-gradient(
                        circle,

                        rgba(
                            var(--m-accent-rgb),
                            .12
                        ),

                        rgba(
                            var(--m-accent-rgb),
                            .045
                        )
                        30%,

                        transparent
                        68%
                    );

                transform:
                    translate(
                        -50%,
                        -50%
                    );

                opacity:
                    calc(
                        .9 *
                        var(--m-intensity)
                    );

                filter:
                    blur(8px);

                mix-blend-mode:
                    screen;

                will-change:
                    transform;
            }


            /* =====================================================
               HOLOGRAPHIC CARDS
               ===================================================== */

            .miyabi-card {

                overflow: hidden;
            }


            .miyabi-card::before {

                content: "";

                position: absolute;

                inset: 0;

                pointer-events: none;

                z-index: 5;

                border-radius:
                    inherit;

                background:

                    radial-gradient(
                        260px circle
                        at
                            var(--m-card-mx, 50%)
                            var(--m-card-my, 50%),

                        rgba(
                            var(--m-accent-rgb),
                            calc(
                                .18 *
                                var(--m-intensity)
                            )
                        ),

                        transparent
                        62%
                    );

                opacity: 0;

                transition:
                    opacity
                    .25s
                    ease;

                mix-blend-mode:
                    screen;
            }


            .miyabi-card:hover::before {

                opacity:
                    var(--m-intensity);
            }


            .miyabi-card.holographic-enabled
            .miyabi-card-media::after {

                content: "";

                position: absolute;

                inset: -80%;

                pointer-events: none;

                opacity: 0;

                background:

                    conic-gradient(
                        from 120deg
                        at
                            var(--m-card-mx, 50%)
                            var(--m-card-my, 50%),

                        transparent 0deg,

                        rgba(
                            255,
                            0,
                            170,
                            .13
                        ),

                        rgba(
                            0,
                            220,
                            255,
                            .12
                        ),

                        rgba(
                            255,
                            255,
                            255,
                            .08
                        ),

                        transparent
                        85deg
                    );

                transform:
                    rotate(12deg);

                transition:
                    opacity
                    .25s
                    ease;

                mix-blend-mode:
                    screen;
            }


            .miyabi-card.holographic-enabled:hover
            .miyabi-card-media::after {

                opacity:
                    calc(
                        .85 *
                        var(--m-intensity)
                    );
            }


            .miyabi-card.holographic-enabled
            .miyabi-card-shine {

                width:
                    70%;

                left:
                    -75%;

                background:

                    linear-gradient(
                        90deg,

                        transparent,

                        rgba(
                            255,
                            255,
                            255,
                            .34
                        ),

                        rgba(
                            255,
                            255,
                            255,
                            .08
                        ),

                        transparent
                    );

                filter:
                    blur(.5px);
            }


            .miyabi-card.holographic-enabled:hover
            .miyabi-card-shine {

                animation-duration:
                    .8s;
            }


            .miyabi-card.holographic-enabled:hover {

                box-shadow:

                    0 22px 50px
                    rgba(
                        0,
                        0,
                        0,
                        .34
                    ),

                    0 0 34px
                    rgba(
                        var(--m-accent-rgb),
                        calc(
                            .2 *
                            var(--m-intensity)
                        )
                    );
            }


            .miyabi-card.holographic-enabled
            .miyabi-tag {

                transition:
                    .2s
                    ease;
            }


            .miyabi-card.holographic-enabled:hover
            .miyabi-tag {

                border-color:
                    rgba(
                        var(--m-accent-rgb),
                        .55
                    );

                box-shadow:
                    0 0 10px
                    rgba(
                        var(--m-accent-rgb),
                        .12
                    );
            }


            /* =====================================================
               HEADER PARALLAX
               ===================================================== */

            .miyabi-header {

                overflow:
                    visible;

                perspective:
                    900px;
            }


            .miyabi-banner {

                transform:
                    scale(1.015);

                transition:
                    transform
                    .12s
                    ease-out,

                    filter
                    .4s
                    ease;

                will-change:
                    transform;
            }


            .miyabi-header.m2-parallax
            .miyabi-banner {

                filter:

                    saturate(
                        calc(
                            1 +
                            .12 *
                            var(--m-intensity)
                        )
                    )

                    contrast(
                        calc(
                            1 +
                            .04 *
                            var(--m-intensity)
                        )
                    );
            }


            .miyabi-banner-overlay {

                z-index:
                    2;
            }


            .miyabi-profile-row {

                z-index:
                    4;
            }


            .miyabi-avatar {

                transition:

                    transform
                    .12s
                    ease-out,

                    box-shadow
                    .3s
                    ease,

                    border-radius
                    .25s
                    ease;

                will-change:
                    transform;
            }


            .miyabi-username {

                position:
                    relative;
            }


            .miyabi-username::after {

                content: "";

                position:
                    absolute;

                left:
                    0;

                bottom:
                    -8px;

                width:
                    min(
                        180px,
                        45%
                    );

                height:
                    2px;

                border-radius:
                    99px;

                background:

                    linear-gradient(
                        90deg,
                        var(--m-accent),
                        transparent
                    );

                opacity:
                    calc(
                        .7 *
                        var(--m-intensity)
                    );
            }


            /* =====================================================
               CURSOR TRAIL
               ===================================================== */

            #miyabi-cursor-trail-canvas {

                position:
                    fixed;

                inset:
                    0;

                width:
                    100%;

                height:
                    100%;

                z-index:
                    -1;

                pointer-events:
                    none;
            }


            /* =====================================================
               SCROLL REVEAL
               ===================================================== */

            .miyabi-card.m2-reveal {

                opacity:
                    0;

                transform:
                    translateY(22px)
                    scale(.985);
            }


            .miyabi-card.m2-reveal.m2-visible {

                opacity:
                    1;

                transform:
                    translateY(0)
                    scale(1);

                transition:

                    opacity
                    .65s
                    cubic-bezier(
                        .16,
                        1,
                        .3,
                        1
                    ),

                    transform
                    .65s
                    cubic-bezier(
                        .16,
                        1,
                        .3,
                        1
                    );
            }


            .miyabi-card.m2-reveal
            .tilt-enabled {

                transition:

                    opacity
                    .65s
                    cubic-bezier(
                        .16,
                        1,
                        .3,
                        1
                    ),

                    transform
                    .08s
                    ease-out,

                    box-shadow
                    .22s,

                    border-color
                    .22s;
            }


            /* =====================================================
               GLASS 2.0
               ===================================================== */

            #miyabi-overlay.glass-active
            .miyabi-card,

            #miyabi-overlay.glass-active
            .miyabi-recents-panel {

                background:

                    linear-gradient(
                        135deg,
                        rgba(
                            255,
                            255,
                            255,
                            .075
                        ),
                        rgba(
                            255,
                            255,
                            255,
                            .025
                        )
                    );

                box-shadow:

                    inset 0 1px 0
                    rgba(
                        255,
                        255,
                        255,
                        .09
                    ),

                    inset 0 0 30px
                    rgba(
                        255,
                        255,
                        255,
                        .018
                    ),

                    0 18px 45px
                    rgba(
                        0,
                        0,
                        0,
                        .25
                    );
            }


            /* =====================================================
               THEME-SPECIFIC LIGHTING
               ===================================================== */

            [data-theme="cutecore"]
            #miyabi-cursor-light {

                background:

                    radial-gradient(
                        circle,

                        rgba(
                            255,
                            128,
                            191,
                            .17
                        ),

                        rgba(
                            255,
                            220,
                            240,
                            .08
                        )
                        30%,

                        transparent
                        68%
                    );
            }


            [data-theme="lain"]
            #miyabi-cursor-light {

                background:

                    radial-gradient(
                        circle,

                        rgba(
                            80,
                            255,
                            80,
                            .11
                        ),

                        transparent
                        68%
                    );
            }


            [data-theme="vaporwave"]
            #miyabi-cursor-light {

                background:

                    radial-gradient(
                        circle,

                        rgba(
                            255,
                            113,
                            206,
                            .16
                        ),

                        rgba(
                            100,
                            220,
                            255,
                            .08
                        )
                        35%,

                        transparent
                        70%
                    );
            }


            /* =====================================================
               REDUCED MOTION
               ===================================================== */

            @media (
                prefers-reduced-motion: reduce
            ) {

                #miyabi-cursor-light,
                #miyabi-cursor-trail-canvas {

                    display:
                        none !important;
                }

                .miyabi-card.m2-reveal {

                    opacity:
                        1 !important;

                    transform:
                        none !important;
                }
            }
            
            /* ============================================================
            MIYABI PHASE 3 -- THEME GALLERY
            Scoped to the Settings-panel grid ONLY. The toolbar switcher
            uses the same themeButton() markup but stays a compact pill
            via the ".theme-switcher .settings-theme" rules below --
            without this scoping, these card rules were leaking onto the
            toolbar buttons and stacking them into a column of cards.
            ============================================================ */

            #miyabi-settings-panel .settings-theme-grid .settings-theme {
                position: relative;
                display: flex;
                flex-direction: column;
                min-width: 0;
                padding: 0;
                overflow: hidden;
                border: 1px solid var(--m-card-border);
                border-radius: 14px;
                background:
                    linear-gradient(145deg, rgba(255,255,255,0.035), rgba(255,255,255,0.008)),
                    var(--m-card-bg);
                color: var(--m-text);
                cursor: pointer;
                text-align: left;
                font-family: var(--m-font);
                box-shadow: 0 5px 16px rgba(0,0,0,0.16);
                transition:
                    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                    border-color 0.22s ease,
                    box-shadow 0.22s ease,
                    background 0.22s ease;
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme:hover {
                transform: translateY(-4px);
                border-color: var(--m-accent);
                background:
                    linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015)),
                    var(--m-card-bg);
                box-shadow:
                    0 12px 30px rgba(0,0,0,0.28),
                    0 0 22px rgba(var(--m-accent-rgb), 0.18);
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme:active {
                transform: translateY(-1px) scale(0.985);
                box-shadow: 0 5px 12px rgba(0,0,0,0.25);
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme:focus-visible {
                outline: 2px solid var(--m-accent);
                outline-offset: 3px;
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme-preview {
                position: relative;
                display: block;
                height: 82px;
                width: 100%;
                overflow: hidden;
                border-bottom: 1px solid var(--m-card-border);
            }

            #miyabi-settings-panel .settings-theme-grid .theme-preview-shine {
                position: absolute;
                inset: 0;
                pointer-events: none;
                background:
                    linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.16) 45%, transparent 65%);
                transform: translateX(-130%);
                transition: transform 0.65s ease;
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme:hover .theme-preview-shine {
                transform: translateX(130%);
            }

            #miyabi-settings-panel .settings-theme-grid .theme-preview-symbol {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2;
                font-size: 30px;
                font-weight: 800;
                text-shadow: 0 0 18px currentColor;
                transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme:hover .theme-preview-symbol {
                transform: scale(1.16) rotate(-4deg);
            }

            #miyabi-settings-panel .settings-theme-grid .theme-preview-orb {
                position: absolute;
                width: 42px;
                height: 42px;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                border-radius: 50%;
                opacity: 0.55;
                filter: blur(1px);
                animation: miyabiThemeOrbFloat 3s ease-in-out infinite;
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme-preview-default {
                background:
                    radial-gradient(circle at 50% 45%, rgba(168,85,247,0.24), transparent 50%),
                    linear-gradient(135deg, #090909, #1d1525);
            }
            #miyabi-settings-panel .settings-theme-grid .settings-theme-preview-default .theme-preview-orb {
                background: #a855f7;
                box-shadow: 0 0 28px rgba(168,85,247,0.75);
            }
            #miyabi-settings-panel .settings-theme-grid .settings-theme-preview-default .theme-preview-symbol {
                color: #ffffff;
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme-preview-cutecore {
                background:
                    radial-gradient(circle at 50% 45%, rgba(255,128,191,0.38), transparent 52%),
                    linear-gradient(135deg, #3a1b2c, #5b2945);
            }
            #miyabi-settings-panel .settings-theme-grid .settings-theme-preview-cutecore .theme-preview-orb {
                background: #ff80bf;
                box-shadow: 0 0 30px rgba(255,128,191,0.85);
            }
            #miyabi-settings-panel .settings-theme-grid .settings-theme-preview-cutecore .theme-preview-symbol {
                color: #ffe4f1;
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme-preview-lain {
                background:
                    repeating-linear-gradient(0deg, rgba(51,255,51,0.035) 0px, rgba(51,255,51,0.035) 1px, transparent 1px, transparent 4px),
                    linear-gradient(135deg, #020402, #091609);
            }
            #miyabi-settings-panel .settings-theme-grid .settings-theme-preview-lain .theme-preview-orb {
                width: 100%;
                height: 1px;
                border-radius: 0;
                background: #33ff33;
                box-shadow: 0 0 15px rgba(51,255,51,0.85);
                opacity: 0.75;
            }
            #miyabi-settings-panel .settings-theme-grid .settings-theme-preview-lain .theme-preview-symbol {
                color: #33ff33;
                font-family: "Courier New", monospace;
                text-shadow: 0 0 12px rgba(51,255,51,0.85);
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme-preview-vaporwave {
                background: linear-gradient(180deg, #281047 0%, #54256f 52%, #160c29 100%);
            }
            #miyabi-settings-panel .settings-theme-grid .settings-theme-preview-vaporwave .theme-preview-orb {
                width: 52px;
                height: 52px;
                background:
                    repeating-linear-gradient(0deg, #ffb7e8 0px, #ffb7e8 4px, #ff71ce 4px, #ff71ce 7px);
                box-shadow: 0 0 25px rgba(255,113,206,0.75);
            }
            #miyabi-settings-panel .settings-theme-grid .settings-theme-preview-vaporwave .theme-preview-symbol {
                color: #ffffff;
                text-shadow: 0 0 16px rgba(255,113,206,0.9);
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 12px 13px 14px;
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme-name {
                display: block;
                color: var(--m-text);
                font-size: 0.88rem;
                font-weight: 800;
                line-height: 1.2;
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme-description {
                display: block;
                color: var(--m-text);
                opacity: 0.55;
                font-size: 0.68rem;
                line-height: 1.35;
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme.active {
                border-color: var(--m-accent);
                box-shadow:
                    0 0 0 1px var(--m-accent),
                    0 10px 28px rgba(0,0,0,0.28),
                    0 0 24px rgba(var(--m-accent-rgb), 0.22);
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme-check {
                position: absolute;
                top: 9px;
                right: 9px;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 23px;
                height: 23px;
                border-radius: 50%;
                background: var(--m-accent);
                color: var(--m-bg);
                font-size: 0.7rem;
                font-weight: 900;
                box-shadow: 0 0 14px rgba(var(--m-accent-rgb), 0.65);
                opacity: 0;
                transform: scale(0.5);
                transition:
                    opacity 0.2s ease,
                    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }

            #miyabi-settings-panel .settings-theme-grid .settings-theme.active .settings-theme-check {
                opacity: 1;
                transform: scale(1);
            }

            @keyframes miyabiThemeOrbFloat {
                0%, 100% { transform: translate(-50%, -50%) scale(1); }
                50% { transform: translate(-50%, -55%) scale(1.08); }
            }

            /* ============================================================
            RESPONSIVE THEME GRID (settings panel only)
            ============================================================ */

            #miyabi-settings-panel .settings-theme-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }

            @media (max-width: 520px) {
                #miyabi-settings-panel .settings-theme-grid {
                    grid-template-columns: 1fr;
                }
            }

            /* ============================================================
            TOOLBAR THEME SWITCHER -- compact pills, not gallery cards.
            Same themeButton() markup as the settings grid, collapsed down:
            preview shrinks to a small dot, description/checkmark hidden,
            everything sits inline in a row again.
            ============================================================ */

            #miyabi-overlay .theme-switcher .settings-theme {
                display: inline-flex;
                flex-direction: row;
                align-items: center;
                gap: 6px;
                width: auto;
                min-width: 82px;
                padding: 8px 10px;
                border-radius: 8px;
            }

            #miyabi-overlay .theme-switcher .settings-theme-preview {
                position: relative;
                display: block;
                width: 20px;
                height: 20px;
                flex: 0 0 20px;
                border-radius: 50%;
                border-bottom: none;
                overflow: hidden;
            }

            #miyabi-overlay .theme-switcher .theme-preview-symbol {
                font-size: 13px;
                text-shadow: none;
            }

            #miyabi-overlay .theme-switcher .theme-preview-orb {
                display: none;
            }

            #miyabi-overlay .theme-switcher .settings-theme-content {
                padding: 0;
                gap: 0;
            }

            #miyabi-overlay .theme-switcher .settings-theme-description {
                display: none;
            }

            #miyabi-overlay .theme-switcher .settings-theme-check {
                display: none;
            }


            /* ============================================================
            MIYABI PHASE 4 -- ATMOSPHERE LAYER
            #miyabi-atmosphere is a unique id (not shared with anything
            else), so these rules can't leak the way the old theme-
            gallery ones did -- no extra scoping needed here.
            ============================================================ */

            #miyabi-atmosphere {
                position: absolute;
                inset: 0;
                overflow: hidden;
                pointer-events: none;
                z-index: -1;
                opacity: var(--m-atmo-glow-opacity, .48);
                transition: opacity .5s ease;
            }

            #miyabi-overlay:not(.atmosphere-glow-active) #miyabi-atmosphere {
                opacity: 0;
            }

            #miyabi-overlay .miyabi-atmo-glow {
                position: absolute;
                width: 60vmax;
                height: 60vmax;
                border-radius: 50%;
                filter: blur(70px);
                will-change: transform;
            }

            .miyabi-atmo-glow-a {
                top: -18%;
                left: -12%;
                background:
                    radial-gradient(
                        circle,
                        color-mix(in srgb, var(--m-accent) 55%, transparent),
                        transparent 70%
                    );
                animation: miyabiAtmoDriftA 32s ease-in-out infinite;
            }

            .miyabi-atmo-glow-b {
                bottom: -22%;
                right: -14%;
                width: 50vmax;
                height: 50vmax;
                background:
                    radial-gradient(
                        circle,
                        color-mix(in srgb, var(--m-accent) 38%, transparent),
                        transparent 72%
                    );
                animation: miyabiAtmoDriftB 40s ease-in-out infinite;
            }

            /* Cursor reactivity reuses --m2-mx / --m2-my -- the SAME
            custom properties the Ambient Cursor Light handler already
            writes on every mousemove -- so no second listener exists
            just for this. Falls back to viewport-center (no shift) if
            Ambient Light has never run. */

            @keyframes miyabiAtmoDriftA {

                0%, 100% {
                    transform:
                        translate(
                            calc((var(--m2-mx, 50vw) - 50vw) * 0.015),
                            calc((var(--m2-my, 50vh) - 50vh) * 0.015)
                        )
                        scale(1);
                }

                50% {
                    transform:
                        translate(
                            calc((var(--m2-mx, 50vw) - 50vw) * 0.015 + 4%),
                            calc((var(--m2-my, 50vh) - 50vh) * 0.015 - 3%)
                        )
                        scale(1.08);
                }
            }

            @keyframes miyabiAtmoDriftB {

                0%, 100% {
                    transform:
                        translate(
                            calc((var(--m2-mx, 50vw) - 50vw) * -0.012),
                            calc((var(--m2-my, 50vh) - 50vh) * -0.012)
                        )
                        scale(1);
                }

                50% {
                    transform:
                        translate(
                            calc((var(--m2-mx, 50vw) - 50vw) * -0.012 - 5%),
                            calc((var(--m2-my, 50vh) - 50vh) * -0.012 + 4%)
                        )
                        scale(0.94);
                }
            }

            .miyabi-atmo-scanlines {
                position: absolute;
                inset: 0;
                opacity: 0;
                background:
                    repeating-linear-gradient(
                        0deg,
                        rgba(255,255,255,.025) 0px,
                        rgba(255,255,255,.025) 1px,
                        transparent 1px,
                        transparent 3px
                    );
                transition: opacity .5s ease;
            }

            /* ------------------------------------------------------------
            MOOD VARIATIONS
            Layered on top of whatever the active theme's accent color
            already is -- moods tweak color mix, blur and opacity, they
            never replace the Default/Cutecore/Terminal/Vaporwave themes.
            ------------------------------------------------------------ */

            #miyabi-overlay[data-atmosphere-mood="cyber"] .miyabi-atmo-scanlines {
                opacity: .5;
            }

            #miyabi-overlay[data-atmosphere-mood="cyber"] .miyabi-atmo-glow {
                filter: blur(52px);
                opacity: .85;
            }

            #miyabi-overlay[data-atmosphere-mood="dream"] .miyabi-atmo-glow-a {
                background:
                    radial-gradient(
                        circle,
                        color-mix(in srgb, #ff9fd6 50%, var(--m-accent)),
                        transparent 70%
                    );
            }

            #miyabi-overlay[data-atmosphere-mood="dream"] .miyabi-atmo-glow-b {
                background:
                    radial-gradient(
                        circle,
                        color-mix(in srgb, #b18bff 45%, var(--m-accent)),
                        transparent 72%
                    );
            }

            #miyabi-overlay[data-atmosphere-mood="void"] .miyabi-atmo-glow {
                opacity: .35;
                filter: blur(95px);
            }

            #miyabi-overlay[data-atmosphere-mood="void"] .miyabi-atmo-scanlines {
                opacity: 0 !important;
            }

            @media (prefers-reduced-motion: reduce) {

                #miyabi-overlay .miyabi-atmo-glow {
                    animation: none !important;
                }
            }


            /* ============================================================
            PHASE 4 -- SETTINGS PANEL CONTROLS
            Settings-only controls are explicitly scoped to #miyabi-settings-panel.
            This keeps generic control class names from leaking into Clank or
            Furina's chat UI.
            ============================================================ */

            #miyabi-settings-panel .settings-segmented {
                display: flex;
                gap: 6px;
                margin-top: 4px;
            }

            #miyabi-settings-panel .settings-segmented-btn {
                flex: 1;
                padding: 8px 6px;
                border: 1px solid var(--m-card-border);
                border-radius: 7px;
                background: var(--m-card-bg);
                color: var(--m-text);
                cursor: pointer;
                font: 800 .72rem var(--m-font);
                opacity: .65;
                transition: .18s ease;
            }

            #miyabi-settings-panel .settings-segmented-btn:hover {
                opacity: .9;
                border-color: var(--m-accent);
            }

            #miyabi-settings-panel .settings-segmented-btn.active {
                opacity: 1;
                border-color: var(--m-accent);
                color: var(--m-accent);
                box-shadow: 0 0 14px color-mix(in srgb, var(--m-accent) 20%, transparent);
            }

            #miyabi-settings-panel .atmosphere-mood-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
                margin-top: 4px;
            }

            #miyabi-settings-panel .atmosphere-mood-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 9px 11px;
                border: 1px solid var(--m-card-border);
                border-radius: 8px;
                background: var(--m-card-bg);
                color: var(--m-text);
                cursor: pointer;
                font: 800 .74rem var(--m-font);
                opacity: .7;
                transition: .18s ease;
            }

            #miyabi-settings-panel .atmosphere-mood-btn:hover {
                opacity: .95;
                border-color: var(--m-accent);
            }

            #miyabi-settings-panel .atmosphere-mood-btn.active {
                opacity: 1;
                border-color: var(--m-accent);
                color: var(--m-accent);
                box-shadow: 0 0 14px color-mix(in srgb, var(--m-accent) 20%, transparent);
            }

            #miyabi-settings-panel .atmosphere-mood-icon {
                font-size: .95rem;
            }
        `

    document.head.appendChild(phase2StyleTag)
  }

  // PHASE 2 - AMBIENT LIGHT

  function initAmbientLight() {
    destroyAmbientLight()

    if (!state.ambientLightEnabled) {
      return
    }

    cursorLight = document.createElement('div')

    cursorLight.id = 'miyabi-cursor-light'

    overlay.prepend(cursorLight)

    cursorMoveHandler = event => {
      if (!profileOpen) {
        return
      }

      const x = event.clientX

      const y = event.clientY

      overlay.style.setProperty('--m2-mx', `${x}px`)

      overlay.style.setProperty('--m2-my', `${y}px`)

      if (cursorLight) {
        cursorLight.style.transform = `
                            translate(
                                ${x}px,
                                ${y}px
                            )
                            translate(
                                -50%,
                                -50%
                            )
                        `
      }
    }

    window.addEventListener('mousemove', cursorMoveHandler, {
      passive: true
    })
  }

  function destroyAmbientLight() {
    if (cursorMoveHandler) {
      window.removeEventListener('mousemove', cursorMoveHandler)
    }

    cursorMoveHandler = null

    cursorLight?.remove()

    cursorLight = null
  }

  // PHASE 2 - CURSOR TRAIL

  function initCursorTrail() {
    destroyCursorTrail()

    if (!state.cursorTrailEnabled) {
      return
    }

    cursorTrailCanvas = document.createElement('canvas')

    cursorTrailCanvas.id = 'miyabi-cursor-trail-canvas'

    overlay.prepend(cursorTrailCanvas)

    cursorTrailCtx = cursorTrailCanvas.getContext('2d')

    cursorTrailPoints = []

    trailResizeHandler = () => {
      if (!cursorTrailCanvas || !cursorTrailCtx) {
        return
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      cursorTrailCanvas.width = Math.floor(window.innerWidth * dpr)

      cursorTrailCanvas.height = Math.floor(window.innerHeight * dpr)

      cursorTrailCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    trailMoveHandler = event => {
      cursorTrailPoints.push({
        x: event.clientX,

        y: event.clientY,

        life: 1
      })

      if (cursorTrailPoints.length > 24) {
        cursorTrailPoints.shift()
      }
    }

    window.addEventListener('resize', trailResizeHandler, {
      passive: true
    })

    window.addEventListener('mousemove', trailMoveHandler, {
      passive: true
    })

    trailResizeHandler()

    const draw = () => {
      if (!cursorTrailCtx || !cursorTrailCanvas || !state.cursorTrailEnabled) {
        return
      }

      cursorTrailCtx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      const accent =
        getComputedStyle(document.documentElement)
          .getPropertyValue('--m-accent')
          .trim() || '#a855f7'

      cursorTrailPoints.forEach(point => {
        point.life -= 0.045
      })

      cursorTrailPoints = cursorTrailPoints.filter(point => point.life > 0)

      cursorTrailPoints.forEach((point, index) => {
        const radius = 2 + index / 10

        cursorTrailCtx.beginPath()

        cursorTrailCtx.arc(point.x, point.y, radius, 0, Math.PI * 2)

        cursorTrailCtx.fillStyle = hexToRgba(
          accent,
          point.life * 0.24 * (state.effectsIntensity / 100)
        )

        cursorTrailCtx.fill()
      })

      cursorTrailAnimId = requestAnimationFrame(draw)
    }

    draw()
  }

  function destroyCursorTrail() {
    if (cursorTrailAnimId) {
      cancelAnimationFrame(cursorTrailAnimId)
    }

    cursorTrailAnimId = null

    if (trailResizeHandler) {
      window.removeEventListener('resize', trailResizeHandler)
    }

    trailResizeHandler = null

    if (trailMoveHandler) {
      window.removeEventListener('mousemove', trailMoveHandler)
    }

    trailMoveHandler = null

    cursorTrailCanvas?.remove()

    cursorTrailCanvas = null

    cursorTrailCtx = null

    cursorTrailPoints = []
  }

  // PHASE 2 - HEADER PARALLAX

  function initHeaderParallax() {
    destroyHeaderParallax()

    const header = overlay.querySelector('.miyabi-header')

    const banner = overlay.querySelector('.miyabi-banner')

    const avatar = overlay.querySelector('.miyabi-avatar')

    if (!header || !state.headerParallaxEnabled) {
      return
    }

    header.classList.add('m2-parallax')

    headerMoveHandler = event => {
      const rect = header.getBoundingClientRect()

      if (!rect.width || !rect.height) {
        return
      }

      const x = (event.clientX - rect.left) / rect.width - 0.5

      const y = (event.clientY - rect.top) / rect.height - 0.5

      if (banner) {
        banner.style.transform = `
                            scale(1.025)
                            translate(
                                ${x * -8}px,
                                ${y * -6}px
                            )
                        `
      }

      if (avatar) {
        avatar.style.transform = `
                            translate(
                                ${x * 8}px,
                                ${y * 6}px
                            )
                            rotateX(
                                ${y * -2}deg
                            )
                            rotateY(
                                ${x * 3}deg
                            )
                        `
      }
    }

    header.addEventListener('mousemove', headerMoveHandler, {
      passive: true
    })
  }

  function destroyHeaderParallax() {
    const header = overlay.querySelector('.miyabi-header')

    if (header && headerMoveHandler) {
      header.removeEventListener('mousemove', headerMoveHandler)
    }

    headerMoveHandler = null

    const banner = overlay.querySelector('.miyabi-banner')

    const avatar = overlay.querySelector('.miyabi-avatar')

    if (banner) {
      banner.style.removeProperty('transform')
    }

    if (avatar) {
      avatar.style.removeProperty('transform')
    }
  }

  // PHASE 2 - SCROLL REVEAL

  function applyScrollReveal() {
    if (revealObserver) {
      revealObserver.disconnect()
    }

    revealObserver = null

    const cards = [...overlay.querySelectorAll('.miyabi-card')]

    if (!state.scrollRevealEnabled) {
      cards.forEach(card => {
        card.classList.remove('m2-reveal', 'm2-visible')

        card.style.removeProperty('transition-delay')
      })

      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('m2-visible')

            revealObserver?.unobserve(entry.target)
          }
        })
      },
      {
        root: overlay,

        threshold: 0.08
      }
    )

    cards.forEach((card, index) => {
      card.classList.add('m2-reveal')

      card.style.transitionDelay = `${Math.min(index * 35, 500)}ms`

      revealObserver.observe(card)
    })
  }

  // PHASE 2 - CARD STATE

  function applyPhase2CardState() {
    overlay.querySelectorAll('.miyabi-card').forEach(card => {
      card.classList.toggle('holographic-enabled', state.holographicEnabled)
    })
  }

  // PHASE 4 -- ATMOSPHERE LAYER
  //
  // Sits behind .miyabi-container (negative z-index, same trick as
  // the particle canvas / cursor light above) and reacts to:
  //   - the active theme, via var(--m-accent) and #miyabi-overlay's
  //     existing data-theme attribute -- no separate color system.
  //   - the atmosphere mood, via a data-atmosphere-mood attribute.
  //   - atmosphere intensity, via the --m-atmo-glow-opacity var.
  //   - the cursor, by re-reading the SAME --m2-mx / --m2-my custom
  //     properties the ambient-light cursor handler already writes,
  //     so this does not register a second mousemove listener.

  function initAtmosphere() {
    destroyAtmosphere()

    overlay.classList.toggle(
      'atmosphere-active',
      Boolean(state.atmosphereEnabled)
    )

    overlay.classList.toggle(
      'atmosphere-glow-active',
      Boolean(state.atmosphereEnabled && state.atmosphereGlowEnabled)
    )

    overlay.dataset.atmosphereMood = state.atmosphereMood

    const intensityMeta = getAtmosphereIntensityMeta(state.atmosphereIntensity)

    document.documentElement.style.setProperty(
      '--m-atmo-glow-opacity',
      intensityMeta.glowOpacity
    )

    if (!state.atmosphereEnabled || !state.atmosphereGlowEnabled) {
      return
    }

    atmosphereLayer = document.createElement('div')

    atmosphereLayer.id = 'miyabi-atmosphere'

    const glowA = document.createElement('div')

    glowA.className = 'miyabi-atmo-glow miyabi-atmo-glow-a'

    const glowB = document.createElement('div')

    glowB.className = 'miyabi-atmo-glow miyabi-atmo-glow-b'

    const scanlines = document.createElement('div')

    scanlines.className = 'miyabi-atmo-scanlines'

    atmosphereLayer.append(glowA, glowB, scanlines)

    // Prepended LAST (after particles / ambient light / cursor
    // trail have already run this refresh cycle) so it lands as
    // the first child -- painted first, furthest back of all the
    // negative-z-index effect layers.
    overlay.prepend(atmosphereLayer)
  }

  function destroyAtmosphere() {
    atmosphereLayer?.remove()

    atmosphereLayer = null
  }

  function setAtmosphereIntensity(level) {
    if (!['low', 'medium', 'high'].includes(level)) {
      return
    }

    state.atmosphereIntensity = level

    updateAtmosphereControlButtons()

    refreshEffects()

    saveState()
  }

  function setAtmosphereMood(mood) {
    if (!['ethereal', 'cyber', 'dream', 'void'].includes(mood)) {
      return
    }

    state.atmosphereMood = mood

    updateAtmosphereControlButtons()

    refreshEffects()

    saveState()
  }

  function updateAtmosphereControlButtons() {
    settingsPanel.querySelectorAll('[data-atmo-intensity]').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.atmoIntensity === state.atmosphereIntensity
      )
    })

    settingsPanel.querySelectorAll('[data-atmo-mood]').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.atmoMood === state.atmosphereMood
      )
    })
  }

  // EFFECTS REFRESH

  function refreshPhase2Effects() {
    installPhase2Styles()

    overlay.classList.toggle('m2-no-light', !state.ambientLightEnabled)

    initAmbientLight()

    initCursorTrail()

    initHeaderParallax()

    applyPhase2CardState()

    applyScrollReveal()
  }

  function refreshEffects() {
    overlay.classList.toggle('glass-active', state.glassMode)

    overlay.classList.toggle('compact-mode', state.compactMode)

    applyCardEffects()

    // Always rebuilt so particle count/shape stay in sync with
    // whatever mood/intensity was just chosen -- initParticles()
    // no-ops if a canvas is already connected, so it must be torn
    // down first rather than conditionally skipped.
    destroyParticles()

    if (particlesShouldRun()) {
      initParticles()
    }

    refreshPhase2Effects()

    initAtmosphere()
  }

  // ONBOARDING

  function hideOnboarding() {
    onboarding.classList.remove('visible')
  }

  function showOnboarding() {
    const currentProfile = getCurrentProfileUrl()

    const detectedBox = onboarding.querySelector('#miyabi-detected-profile')

    const detectedName = onboarding.querySelector('#miyabi-detected-name')

    const detectedUrl = onboarding.querySelector('#miyabi-detected-url')

    const input = onboarding.querySelector('#miyabi-profile-url')

    const error = onboarding.querySelector('#miyabi-onboarding-error')

    const cancelButton = onboarding.querySelector(
      '#miyabi-cancel-profile-change'
    )

    error.textContent = ''

    loadProfileBinding().then(savedProfileUrl => {
      cancelButton.hidden = !savedProfileUrl
    })

    if (currentProfile) {
      const username = new URL(currentProfile).pathname.slice(2)

      detectedName.textContent = `@${username}`

      detectedUrl.textContent = currentProfile

      detectedBox.hidden = false

      input.value = currentProfile
    } else {
      detectedBox.hidden = true

      input.value = ''
    }

    onboarding.classList.add('visible')
  }

  async function connectProfile(value) {
    const normalized = normalizeClankProfileUrl(value)

    const error = onboarding.querySelector('#miyabi-onboarding-error')

    if (!normalized) {
      error.textContent = 'Enter a valid ClankWorld profile URL.'

      return
    }

    const saved = await saveProfileBinding(normalized)

    if (!saved) {
      error.textContent = 'Miyabi could not save this profile.'

      return
    }

    hideOnboarding()

    await refreshMiyabiAvailability()
  }

  onboarding
    .querySelector('#miyabi-connect-profile')
    .addEventListener('click', () => {
      const input = onboarding.querySelector('#miyabi-profile-url')

      connectProfile(input.value)
    })

  onboarding
    .querySelector('#miyabi-use-current-profile')
    .addEventListener('click', () => {
      const currentProfile = getCurrentProfileUrl()

      if (currentProfile) {
        connectProfile(currentProfile)
      }
    })

  onboarding
    .querySelector('#miyabi-profile-url')
    .addEventListener('keydown', event => {
      if (event.key !== 'Enter') {
        return
      }

      connectProfile(event.currentTarget.value)
    })

  onboarding
    .querySelector('#miyabi-cancel-profile-change')
    .addEventListener('click', async () => {
      const savedProfileUrl = await loadProfileBinding()

      if (!savedProfileUrl) {
        return
      }

      hideOnboarding()

      await refreshMiyabiAvailability()
    })

  // SCRAPER

  function findProfileUsername() {
    const currentProfileUrl = getCurrentProfileUrl()

    if (currentProfileUrl) {
      const profileLink = [
        ...document.querySelectorAll('a[href^="https://www.clank.world/@"]')
      ].find(link => {
        const normalized = normalizeClankProfileUrl(link.href)

        return (
          normalized === currentProfileUrl &&
          link.matches('.text-xl.md\\:text-2xl.font-bold.text-primary')
        )
      })

      if (profileLink) {
        const username = sanitizeText(profileLink.innerText)

        if (username) {
          return username
        }
      }
    }

    // URL fallback.
    if (currentProfileUrl) {
      try {
        return decodeURIComponent(new URL(currentProfileUrl).pathname.slice(2))
      } catch (_) {}
    }

    return 'Username Not Found'
  }

  function findProfileBio() {
    const username = findProfileUsername()

    const profilePanels = [
      ...document.querySelectorAll('div.flex.flex-col.gap-4.relative.z-10')
    ]

    for (const panel of profilePanels) {
      const text = sanitizeText(panel.innerText)

      if (!text || !text.includes(username)) {
        continue
      }

      const candidates = [...panel.querySelectorAll('div, p, span')]
        .map(element => ({
          element,
          text: sanitizeText(element.innerText)
        }))
        .filter(item => {
          if (!item.text) {
            return false
          }

          if (item.text.length < 3 || item.text.length > 240) {
            return false
          }

          if (item.text === username || item.text === `@${username}`) {
            return false
          }

          if (
            /followers?|following|messages?|joined|followed by|edit/i.test(
              item.text
            )
          ) {
            return false
          }

          return true
        })

      const bioCandidate = candidates.sort(
        (a, b) => b.text.length - a.text.length
      )[0]

      if (bioCandidate) {
        return bioCandidate.text
      }
    }

    return ''
  }

  function findProfileStatText(pattern) {
    const candidates = [...document.querySelectorAll('span, div')]

    for (const element of candidates) {
      const text = sanitizeText(element.innerText)

      if (!text || text.length > 80) {
        continue
      }

      if (pattern.test(text)) {
        return text
      }
    }

    return ''
  }

  function findFollowerCount() {
    const text = findProfileStatText(/^\d[\d.,]*\s+Followers$/i)

    return text.replace(/\s+Followers$/i, '').trim()
  }

  function findProfileTabCount(label) {
    const links = [...document.querySelectorAll('a[href]')]

    const profileUrl = getCurrentProfileUrl()

    for (const link of links) {
      const text = sanitizeText(link.innerText)

      if (!text || !text.toLowerCase().startsWith(label.toLowerCase())) {
        continue
      }

      if (!link.href.startsWith(profileUrl)) {
        continue
      }

      const match = text.match(/(\d[\d.,]*)\s*$/)

      if (match) {
        return match[1]
      }
    }

    return ''
  }

  function findSceneCount() {
    return findProfileTabCount('Scenes')
  }

  function findCommunityCount() {
    return findProfileTabCount('Community')
  }

  function findFollowingCount() {
    const text = findProfileStatText(/^\d[\d.,]*\s+Following$/i)

    return text.replace(/\s+Following$/i, '').trim()
  }

  function findMessageCount() {
    const text = findProfileStatText(/^[\d.,]+[KMB]?\s+Messages$/i)

    return text.replace(/\s+Messages$/i, '').trim()
  }

  function findJoinDate() {
    const text = findProfileStatText(/^Joined\s+/i)

    return text.replace(/^Joined\s+/i, '').trim()
  }

  function findProfileHandle() {
    const username = findProfileUsername()

    const handleNode = [
      ...document.querySelectorAll('div.text-secondary.text-sm.font-medium')
    ].find(element => {
      return sanitizeText(element.innerText) === `@${username}`
    })

    return handleNode ? sanitizeText(handleNode.innerText) : `@${username}`
  }

  function findProfileBanner() {
    const candidates = [
      ...document.querySelectorAll('img.w-full.object-cover')
    ].filter(image => {
      return (
        image.classList.contains('h-[30vw]') ||
        image.classList.contains('max-h-[240px]')
      )
    })

    const bannerNode = candidates.sort((a, b) => {
      return b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight
    })[0]

    if (!bannerNode) {
      return ''
    }

    return safeUrl(bannerNode.src)
  }

  function findProfileAvatar() {
    const username = findProfileUsername().replace(/^@/, '').trim()

    if (!username) {
      return ''
    }

    // Clank can render multiple copies of the same avatar
    // for different responsive layouts.
    //
    // Do not take the first match: it may be a tiny hidden
    // navigation/mobile thumbnail.

    const candidates = [...document.querySelectorAll('img')]
      .filter(image => {
        return image.alt?.trim().toLowerCase() === username.toLowerCase()
      })
      .map(image => {
        const source = safeUrl(image.currentSrc) || safeUrl(image.src)

        if (!source) {
          return null
        }

        // Actual rendered dimensions.
        // Hidden responsive copies will usually be 0x0.

        const rect = image.getBoundingClientRect()

        const renderedArea = Math.max(0, rect.width) * Math.max(0, rect.height)

        // Actual downloaded image dimensions.

        const naturalArea =
          (image.naturalWidth || 0) * (image.naturalHeight || 0)

        // Clank's image CDN includes its requested
        // dimensions directly inside the URL.

        const sizeMatch = source.match(/w=(\d+),h=(\d+)/i)

        const requestedWidth = sizeMatch ? Number(sizeMatch[1]) : 0

        const requestedHeight = sizeMatch ? Number(sizeMatch[2]) : 0

        const requestedArea = requestedWidth * requestedHeight

        // The main profile avatar has historically used
        // these full-size image classes on Clank.
        // Give that structure a small preference.

        const looksLikeMainAvatar =
          image.classList.contains('w-full') &&
          image.classList.contains('h-full') &&
          image.classList.contains('object-cover')

        const score =
          renderedArea * 100 +
          naturalArea * 10 +
          requestedArea +
          (looksLikeMainAvatar ? 100000 : 0)

        return {
          source,
          score
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)

    if (!candidates.length) {
      return ''
    }

    return candidates[0].source
  }

  // Characters

  function extractCharacterData(card, index) {
    const titleNode = card.querySelector('p.line-clamp-2.italic')

    const descNode = card.querySelector('p.text-pretty.line-clamp-6')

    const imgNode = card.querySelector('img.object-cover.w-full')

    const tagContainer = card.querySelector('div.flex.gap-1\\.5.px-2\\.5')

    const tags = []

    tagContainer?.querySelectorAll('span, div').forEach(tagNode => {
      const tag = sanitizeText(tagNode.innerText)

      if (tag) {
        tags.push(tag)
      }
    })

    const linkNode = card.closest('a') || card.querySelector('a')

    return {
      title: titleNode
        ? sanitizeText(titleNode.innerText)
        : `Unknown Character ${index + 1}`,

      desc: descNode
        ? sanitizeText(descNode.innerText)
        : 'No description found.',

      imgSrc: imgNode ? safeUrl(imgNode.src) : '',

      tags: [...new Set(tags)],

      link: linkNode ? safeUrl(linkNode.href) || '#' : '#'
    }
  }

  function findProfileCharacters() {
    const characters = []

    const currentUsername = findProfileUsername()
      .replace(/^@/, '')
      .trim()
      .toLowerCase()

    document
      .querySelectorAll(
        'div.cursor-pointer.group.rounded-xl.border:has(a[href*="/@c/"])'
      )
      .forEach((card, index) => {
        const linkNode =
          card.closest('a') || card.querySelector('a[href*="/@c/"]')

        const href = linkNode?.href || ''

        if (!href.includes('/@c/')) {
          return
        }

        const cardText = sanitizeText(card.innerText)

        const creatorMatch = cardText.match(/\bby\s+([^\n]+)\s*$/i)

        const creator = creatorMatch?.[1]?.trim().toLowerCase() || ''

        if (!creator || creator !== currentUsername) {
          return
        }

        characters.push(extractCharacterData(card, index))
      })

    return characters
  }

  // Recent chats

  function extractRecentChatData(chatNode) {
    const imgNode = chatNode.querySelector('img.size-\\[40px\\].rounded-full')

    const titleNode = chatNode.querySelector(
      'span.bg-clip-text.text-transparent'
    )

    const descNode = chatNode.querySelector('div.w-full.overflow-hidden')

    const linkNode = chatNode.closest('a')

    const title = titleNode ? sanitizeText(titleNode.innerText) : 'Unknown Chat'

    const avatarSrc = imgNode ? safeUrl(imgNode.src) : ''

    if (title === 'Unknown Chat' && !avatarSrc) {
      return null
    }

    return {
      title: title || 'Unnamed Chat',

      preview: descNode
        ? sanitizeText(descNode.innerText)
        : 'No preview available',

      avatarSrc,

      link: linkNode ? safeUrl(linkNode.href) || '#' : '#'
    }
  }

  function findRecentChats() {
    const recents = []

    document.querySelectorAll('div.flex.px-1\\.5').forEach(chatNode => {
      const chat = extractRecentChatData(chatNode)

      if (chat) {
        recents.push(chat)
      }
    })

    return recents
  }

  // Complete profile snapshot

  function scrapeProfileData() {
    return {
      profileUrl: getCurrentProfileUrl(),

      username: findProfileUsername(),

      handle: findProfileHandle(),

      bio: findProfileBio(),

      followers: findFollowerCount(),

      following: findFollowingCount(),

      messages: findMessageCount(),

      joinDate: findJoinDate(),

      scenes: findSceneCount(),

      community: findCommunityCount(),

      bannerSrc: findProfileBanner(),

      avatarSrc: findProfileAvatar(),

      characters: findProfileCharacters(),

      recents: findRecentChats()
    }
  }

  // RENDERER

  function buildProfile(data) {
    const container = document.createElement('div')

    container.className = 'miyabi-container'

    const showcaseVideoUrl =
      'https://motionbgs.com/media/8925/girl-behind-curtains-3.960x540.mp4'

    const characterMarkup = data.characters.length
      ? data.characters
          .map(
            char => `

                <a
                    href="${char.link}"
                    class="miyabi-card"
                    style="
                        text-decoration:none;
                        color:inherit;
                    "
                >

                    <div
                        class="miyabi-card-media"
                    >

                        ${
                          char.imgSrc
                            ? `
                                    <img
                                        src="${char.imgSrc}"
                                        alt=""
                                        loading="lazy"
                                    />
                                `
                            : `
                                    <div
                                        class="miyabi-card-placeholder"
                                    >
                                        No Image
                                    </div>
                                `
                        }

                        <div
                            class="miyabi-card-shine"
                        ></div>

                    </div>


                    <div
                        class="miyabi-card-body"
                    >

                        <div
                            class="miyabi-title"
                        >
                            ${char.title}
                        </div>

                        <div
                            class="miyabi-desc"
                        >
                            ${char.desc}
                        </div>

                        ${
                          char.tags.length
                            ? `
                                    <div
                                        class="miyabi-tag-container"
                                    >

                                        ${char.tags
                                          .map(
                                            tag =>
                                              `
                                                    <span
                                                        class="miyabi-tag"
                                                    >
                                                        ${tag}
                                                    </span>
                                                    `
                                          )
                                          .join('')}

                                    </div>
                                `
                            : ''
                        }

                    </div>

                </a>

            `
          )
          .join('')
      : `

                    <div
                        class="miyabi-empty-state"
                    >

                        <div>
                            ✦
                        </div>

                        <strong>
                            No characters found
                        </strong>

                        <span>
                            Miyabi could not find any
                            character cards on this page.
                        </span>

                    </div>
                `

    const recentMarkup = data.recents.length
      ? data.recents
          .slice(0, 10)
          .map(
            chat => `

                <a
                    href="${chat.link}"
                    class="recent-chat-item"
                >

                    ${
                      chat.avatarSrc
                        ? `
                                <img
                                    src="${chat.avatarSrc}"
                                    class="recent-avatar"
                                    alt=""
                                    loading="lazy"
                                />
                            `
                        : `
                                <div
                                    class="
                                        recent-avatar
                                        recent-avatar-placeholder
                                    "
                                ></div>
                            `
                    }

                    <div
                        class="recent-text-group"
                    >

                        <span
                            class="recent-title"
                        >
                            ${chat.title}
                        </span>

                        <span
                            class="recent-preview"
                        >
                            ${chat.preview}
                        </span>

                    </div>

                </a>

            `
          )
          .join('')
      : `

                    <div
                        class="miyabi-empty-mini"
                    >
                        No recent chats found.
                    </div>
                `

    container.innerHTML = `

            <!-- ==================================================
                 LIVE BACKGROUND
            =================================================== -->

            <div
                class="miyabi-live-background"
                aria-hidden="true"
            >

                <video
                    class="miyabi-live-background-video"
                    autoplay
                    muted
                    loop
                    playsinline
                    preload="auto"
                >
                    <source
                        src="${showcaseVideoUrl}"
                        type="video/mp4"
                    >
                </video>

                <div
                    class="miyabi-live-background-shade"
                ></div>

                <div
                    class="miyabi-live-background-vignette"
                ></div>

            </div>


            <!-- ==================================================
                 NAVIGATION
            =================================================== -->

            <nav
                class="miyabi-navbar"
            >

                <a
                    href="https://www.clank.world/"
                    class="miyabi-brand"
                    aria-label="Clank home"
                >

                    <img
                        src="https://www.clank.world/assets/hd-logo.png"
                        class="miyabi-logo"
                        alt="Clank"
                    />

                    <span
                        class="miyabi-brand-divider"
                    >
                        /
                    </span>

                    <span
                        class="miyabi-brand-name"
                    >
                        MIYABI
                    </span>

                </a>


                <div
                    class="miyabi-nav-group"
                >

                    <a
                        href="https://www.clank.world/"
                        class="clank-link"
                    >
                        Home
                    </a>

                    <a
                        href="https://www.clank.world/your-characters"
                        class="clank-link"
                    >
                        Your Characters
                    </a>

                    <a
                        href="https://www.clank.world/studio"
                        class="clank-link"
                    >
                        Studio
                    </a>

                    <a
                        href="https://www.clank.world/pass"
                        class="clank-link"
                    >
                        Clank Pass
                    </a>

                    <a
                        href="https://www.clank.world/settings"
                        class="clank-link"
                    >
                        Settings
                    </a>

                    <a
                        href="https://docs.clank.world/"
                        class="clank-link"
                        target="_blank"
                        rel="noopener"
                    >
                        Docs
                    </a>

                    <a
                        href="https://www.clank.world/create"
                        class="theme-btn create-btn"
                    >
                        Create Character
                    </a>

                    <button
                        id="miyabi-nav-settings"
                        class="theme-btn nav-settings-btn"
                        type="button"
                    >
                        ⚙ Customize
                    </button>

                </div>

            </nav>


            <!-- ==================================================
                 TOOLBAR
            =================================================== -->

            <div
                class="miyabi-toolbar"
            >

                <div>

                    <div
                        class="toolbar-kicker"
                    >
                        PROFILE EXPERIENCE
                    </div>

                    <div
                        class="toolbar-title"
                    >
                        Miyabi
                    </div>

                </div>


                <div
                    class="miyabi-style-menu"
                >

                    <button
                        id="miyabi-style-toggle"
                        class="miyabi-style-toggle"
                        type="button"
                        aria-expanded="false"
                        aria-controls="miyabi-style-popover"
                    >
                        <span
                            class="miyabi-style-toggle-icon"
                            aria-hidden="true"
                        >
                            ✦
                        </span>

                        <span>
                            Style
                        </span>

                        <span
                            class="miyabi-style-toggle-chevron"
                            aria-hidden="true"
                        >
                            ▾
                        </span>
                    </button>


                    <div
                        id="miyabi-style-popover"
                        class="miyabi-style-popover"
                    >

                        <div
                            class="miyabi-style-popover-kicker"
                        >
                            PROFILE STYLE
                        </div>


                        <div
                            class="theme-switcher"
                        >

                            ${themeButton('default', '✦', 'Default')}

                            ${themeButton('cutecore', '🌸', 'Cutecore')}

                            ${themeButton('lain', '💻', 'Terminal')}

                            ${themeButton('vaporwave', '🌆', 'Vaporwave')}

                        </div>


                        <div
                            class="miyabi-style-popover-footer"
                        >

                            <button
                                id="miyabi-toolbar-settings"
                                class="theme-btn miyabi-style-settings"
                                type="button"
                            >
                                ⚙ Open Settings
                            </button>

                        </div>

                    </div>

                </div>
                </div>


            <!-- ==================================================
                 PROFILE HERO
            =================================================== -->

            <header
                class="miyabi-header"
            >
                <div
                    class="miyabi-banner-frame"
                >

                ${
                  data.bannerSrc
                    ? `
                            <img
                                src="${data.bannerSrc}"
                                class="miyabi-banner"
                                alt=""
                            />
                        `
                    : `
                            <div
                                class="
                                    miyabi-banner
                                    miyabi-banner-empty
                                "
                            >
                                <span>
                                    No Banner Found
                                </span>
                            </div>
                        `
                }

                <div
                    class="miyabi-banner-overlay"
                ></div>

                </div>


                <div
                    class="miyabi-profile-row"
                >

                    ${
                      data.avatarSrc
                        ? `
                                <img
                                    src="${data.avatarSrc}"
                                    class="miyabi-avatar"
                                    alt=""
                                />
                            `
                        : `
                                <div
                                    class="
                                        miyabi-avatar
                                        miyabi-avatar-empty
                                    "
                                ></div>
                            `
                    }


                    <div
                        class="miyabi-profile-copy"
                    >

                        <div
                            class="miyabi-profile-kicker"
                        >
                            CLANK PROFILE
                        </div>


                        <div
                            class="miyabi-identity-heading"
                        >

                            <div
                                class="miyabi-name-group"
                            >

                                <h1
                                    class="miyabi-username"
                                >
                                    ${data.username}
                                </h1>

                                <div
                                    class="miyabi-handle"
                                >
                                    ${data.handle}
                                </div>

                            </div>


                            <div
                                class="miyabi-identity-mark"
                                aria-hidden="true"
                            >
                                ✦
                            </div>

                        </div>


                        ${
                          data.bio
                            ? `
                                    <p
                                        class="miyabi-bio"
                                    >
                                        ${data.bio}
                                    </p>
                                `
                            : `
                                    <p
                                        class="
                                            miyabi-bio
                                            miyabi-muted
                                        "
                                    >
                                        No biography found.
                                    </p>
                                `
                        }


                        <div
                            class="miyabi-profile-stats"
                        >

                            <div
                                class="miyabi-profile-stat"
                            >
                                <strong>
                                    ${data.followers || '—'}
                                </strong>

                                <span>
                                    Followers
                                </span>
                            </div>


                            <div
                                class="miyabi-profile-stat"
                            >
                                <strong>
                                    ${data.following || '—'}
                                </strong>

                                <span>
                                    Following
                                </span>
                            </div>


                            <div
                                class="miyabi-profile-stat"
                            >
                                <strong>
                                    ${data.messages || '—'}
                                </strong>

                                <span>
                                    Messages
                                </span>
                            </div>


                            <div
                                class="
                                    miyabi-profile-stat
                                    miyabi-profile-stat-wide
                                "
                            >
                                <strong>
                                    ${data.joinDate || '—'}
                                </strong>

                                <span>
                                    Joined
                                </span>
                            </div>

                        </div>


                        <div
                            class="miyabi-profile-destinations"
                        >

                            <a
                                href="${data.profileUrl || '#'}"
                                class="miyabi-profile-destination"
                            >

                                <span
                                    class="miyabi-destination-icon"
                                    aria-hidden="true"
                                >
                                    ◇
                                </span>

                                <span
                                    class="miyabi-destination-copy"
                                >
                                    <small>
                                        SCENES
                                    </small>

                                    <strong>
                                        ${data.scenes || '0'}
                                    </strong>
                                </span>

                            </a>


                            <a
                                href="${
                                  data.profileUrl
                                    ? `${data.profileUrl}?tab=posts`
                                    : '#'
                                }"
                                class="miyabi-profile-destination"
                            >

                                <span
                                    class="miyabi-destination-icon"
                                    aria-hidden="true"
                                >
                                    ✦
                                </span>

                                <span
                                    class="miyabi-destination-copy"
                                >
                                    <small>
                                        COMMUNITY
                                    </small>

                                    <strong>
                                        ${data.community || '0'}
                                    </strong>
                                </span>

                            </a>

                        </div>

                    </div>
                </div>

            </header>


            <!-- ==================================================
                 MAIN CONTENT
            =================================================== -->

            <main
                class="miyabi-main-content"
            >

                <aside
                    class="miyabi-recents-panel"
                >

                    <div
                        class="miyabi-panel-heading"
                    >

                        <div>

                            <span
                                class="panel-kicker"
                            >
                                ACTIVITY
                            </span>

                            <span
                                class="miyabi-recent-header"
                            >
                                Recent Chats
                            </span>

                        </div>

                        <span
                            class="panel-count"
                        >
                            ${Math.min(data.recents.length, 10)}
                        </span>

                    </div>

                    <div
                        class="recent-list"
                    >
                        ${recentMarkup}
                    </div>

                </aside>


                <section
                    class="miyabi-grid-container"
                >

                    <div
                        class="miyabi-grid-heading"
                    >

                        <div>

                            <span
                                class="panel-kicker"
                            >
                                COLLECTION
                            </span>

                            <h2>
                                Characters
                            </h2>

                        </div>

                        <span
                            class="character-count"
                        >
                            ${data.characters.length}

                            ${
                              data.characters.length === 1
                                ? 'character'
                                : 'characters'
                            }
                        </span>

                    </div>


                    <div
                        class="miyabi-character-grid"
                    >
                        ${characterMarkup}
                    </div>

                </section>

            </main>


            <!-- ==================================================
                 FOOTER
            =================================================== -->

            <footer
                class="miyabi-footer"
            >

                <span>
                    MIYABI PROFILE ENGINE
                </span>

                <span
                    class="footer-dot"
                >
                    ◆
                </span>

                <span>
                    Built over Clank.world
                </span>

            </footer>
        `

    overlay.replaceChildren(container)

    bindRenderedEvents()

    applyCardEffects()

    applyPhase2CardState()

    updateThemeButtons()
  }

  function bindRenderedEvents() {
    const styleToggle = overlay.querySelector('#miyabi-style-toggle')

    const stylePopover = overlay.querySelector('#miyabi-style-popover')

    const renderedContainer = overlay.querySelector('.miyabi-container')

    const closeStyleMenu = () => {
      if (!styleToggle || !stylePopover) {
        return
      }

      stylePopover.classList.remove('open')

      styleToggle.classList.remove('active')

      styleToggle.setAttribute('aria-expanded', 'false')
    }

    styleToggle?.addEventListener('click', event => {
      event.stopPropagation()

      if (!stylePopover) {
        return
      }

      const shouldOpen = !stylePopover.classList.contains('open')

      closeStyleMenu()

      if (shouldOpen) {
        stylePopover.classList.add('open')

        styleToggle.classList.add('active')

        styleToggle.setAttribute('aria-expanded', 'true')
      }
    })

    stylePopover?.addEventListener('click', event => {
      event.stopPropagation()
    })

    renderedContainer?.addEventListener('click', event => {
      if (!stylePopover || !styleToggle) {
        return
      }

      if (
        stylePopover.contains(event.target) ||
        styleToggle.contains(event.target)
      ) {
        return
      }

      closeStyleMenu()
    })

    overlay.querySelectorAll('[data-miyabi-theme]').forEach(button => {
      button.addEventListener('click', async () => {
        applyMiyabiTheme(button.dataset.miyabiTheme, {
          skipSave: true
        })

        await saveState()

        refreshEffects()

        closeStyleMenu()
      })
    })

    document
      .getElementById('miyabi-nav-settings')
      ?.addEventListener('click', openSettings)

    document
      .getElementById('miyabi-toolbar-settings')
      ?.addEventListener('click', () => {
        closeStyleMenu()

        openSettings()
      })
  }

  function scrapeAndBuild() {
    destroyParticles()

    destroyAmbientLight()

    destroyCursorTrail()

    destroyHeaderParallax()

    destroyAtmosphere()

    revealObserver?.disconnect()

    revealObserver = null

    const data = scrapeProfileData()

    buildProfile(data)

    applyMiyabiTheme(state.theme, {
      skipSave: true
    })

    refreshEffects()
  }

  // ACTIVATION / AVAILABILITY

  let miyabiAvailabilityCheckId = 0

  async function refreshMiyabiAvailability() {
    const checkId = ++miyabiAvailabilityCheckId

    const urlAtStart = window.location.href

    const savedProfileUrl = await loadProfileBinding()

    if (
      checkId !== miyabiAvailabilityCheckId ||
      window.location.href !== urlAtStart
    ) {
      return
    }

    if (!savedProfileUrl) {
      if (profileOpen) {
        closeProfile()
      }

      toggleBtn.hidden = true

      hideOnboarding()

      if (getCurrentProfileUrl()) {
        showOnboarding()
      }

      return
    }

    hideOnboarding()

    const allowed = isBoundProfile(savedProfileUrl)

    if (!allowed) {
      if (settingsPanel.classList.contains('open')) {
        closeSettings()
      }

      if (profileOpen) {
        closeProfile()
      }

      toggleBtn.hidden = true

      return
    }

    // We are on the bound profile URL.
    // Give Clank a moment to finish rendering
    // before checking profile DOM markers.
    let profileReady = looksLikeProfilePage()

    if (!profileReady) {
      await new Promise(resolve => setTimeout(resolve, 500))

      if (
        checkId !== miyabiAvailabilityCheckId ||
        window.location.href !== urlAtStart
      ) {
        return
      }

      profileReady = looksLikeProfilePage()
    }

    if (!profileReady) {
      toggleBtn.hidden = true

      return
    }

    toggleBtn.hidden = false
  }

  // OPEN / CLOSE

  async function openProfile() {
    if (profileOpen) {
      return
    }

    const savedProfileUrl = await loadProfileBinding()

    if (!isBoundProfile(savedProfileUrl) || !looksLikeProfilePage()) {
      return
    }

    profileOpen = true

    loadingScreen.classList.add('visible')

    document.body.classList.add('miyabi-open')

    // Trigger Clank lazy loading
    window.scrollTo(0, document.body.scrollHeight)

    await new Promise(resolve => setTimeout(resolve, 900))

    await loadState()

    installPhase2Styles()

    scrapeAndBuild()

    updateSettingsInputs()

    overlay.classList.add('visible')

    toggleBtn.classList.add('is-open')

    loadingScreen.classList.remove('visible')
  }

  function closeProfile() {
    profileOpen = false

    overlay.classList.remove('visible')

    closeSettings()

    destroyParticles()

    destroyAmbientLight()

    destroyCursorTrail()

    destroyHeaderParallax()

    destroyAtmosphere()

    revealObserver?.disconnect()

    revealObserver = null

    overlay.querySelectorAll('.miyabi-card').forEach(removeTiltEffect)

    toggleBtn.classList.remove('is-open')

    loadingScreen.classList.remove('visible')

    document.body.classList.remove('miyabi-open')
  }

  toggleBtn.addEventListener('click', () => {
    if (profileOpen) {
      closeProfile()
    } else {
      openProfile()
    }
  })

  // INITIALIZATION

  /*
        Small public API for Furina.

        Miyabi still owns all of its internal implementation. Furina only gets
        a few high-level controls that we can use later if Profile Atelier is
        integrated into a shared Furina launcher or navigation system.

        Keeping this API small prevents Furina's chat code from becoming
        dependent on Miyabi internals.
    */

  Object.assign(ProfileAtelier, {
    refresh: refreshMiyabiAvailability,

    open: openProfile,

    close: closeProfile,

    isOpen: () => profileOpen,

    getCurrentProfileUrl: getCurrentProfileUrl
  })

  installPhase2Styles()

  renderSettingsPanel()

  settingsPanel.setAttribute('aria-hidden', 'true')

  toggleBtn.hidden = true

  loadState().then(() => {
    applyMiyabiTheme(state.theme, {
      skipSave: true
    })
  })

  refreshMiyabiAvailability()

  let miyabiLastUrl = window.location.href

  function handleMiyabiUrlChange() {
    if (window.location.href === miyabiLastUrl) {
      return
    }

    miyabiLastUrl = window.location.href

    // Invalidate any older asynchronous
    // availability check immediately.
    miyabiAvailabilityCheckId++

    // Hide Miyabi until the new URL has
    // been verified as the connected profile.
    toggleBtn.hidden = true

    if (settingsPanel.classList.contains('open')) {
      closeSettings()
    }

    if (profileOpen) {
      closeProfile()
    }

    hideOnboarding()

    refreshMiyabiAvailability()
  }

  window.addEventListener('popstate', handleMiyabiUrlChange)

  const miyabiNavigationObserver = new MutationObserver(() => {
    handleMiyabiUrlChange()
  })

  miyabiNavigationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  })
})()
