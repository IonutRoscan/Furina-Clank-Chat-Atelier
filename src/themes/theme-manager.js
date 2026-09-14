'use strict'


/*
  Developer notes

  Owns visual theme state, presets, conversation overrides and the CSS variables
  applied to standard chat. Theme values are sanitized before use so imported
  themes cannot silently turn into arbitrary page-wide CSS. Cosmetics that are
  independent systems should read theme variables instead of duplicating color
  state.
*/
/*
    Theme Manager

    Owns global and per-conversation visual theme settings, built-in/custom presets, validation, persistence, and theme portability.
*/

window.ClankAtelier = window.ClankAtelier || {}

// DEFAULT SETTINGS

window.ClankAtelier.DEFAULT_THEME = {
  preset: 'default',

  accent: '#9b7cff',

  chatBackground: '#151515',

  chatBackgroundMode: 'solid',

  chatGradientColor: '#241b35',

  chatGradientAngle: 135,

  chatImageUrl: '',

  chatVideoUrl: '',

  chatImageFit: 'cover',

  chatImagePosition: 'center',

  chatImageDarkness: 0.35,

  chatImageOverlayColor: '#000000',

  chatImageOverlayOpacity: 0,

  chatImageVignette: 0,

  chatImageBlur: 0,

  assistantBackground: '#1b1b1f',

  assistantText: '#ffffff',

  userBackground: '#29202d',

  userText: '#ffffff',

  assistantRadius: 14,

  userRadius: 14,

  assistantPaddingX: 13,

  assistantPaddingY: 11,

  userPaddingX: 13,

  userPaddingY: 11,

  assistantOpacity: 1,

  userOpacity: 1,

  assistantBorderWidth: 0,

  assistantBorderColor: '#9b7cff',

  userBorderWidth: 0,

  userBorderColor: '#9b7cff',

  assistantShadow: 0,

  userShadow: 0,

  messageSpacing: 10,

  messageFontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

  headingFontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

  codeFontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',

  fontSize: 16,

  headingScale: 1,

  codeFontSize: 14,

  lineHeight: 1.55,

  paragraphSpacing: 10,

  messageWidth: 672,

  avatarSize: 56,

  compact: false,

  // COSMETIC EFFECTS

  messageEntranceAnimation: 'none',

  assistantMessageSkin: 'standard',

  userMessageSkin: 'standard',

  composerSkin: 'standard',

  dialoguePresentation: false,

  speakerNameplates: false,

  typingIndicatorStyle: 'standard',

  edgeGlowStrength: 0,

  edgeGlowPulse: false,

  animatedGradient: false,

  gradientAnimationSpeed: 30,

  glassBubbles: false,

  glassBlur: 14,

  glassHighlight: 0.18,

  bubbleTexture: 'none',

  avatarFrame: 'none',

  avatarHover: 'none',

  speakerAccent: 'none',

  separatorStyle: 'none',

  backgroundBrightness: 1,

  backgroundContrast: 1,

  backgroundSaturation: 1,

  backgroundSepia: 0,

  backgroundHue: 0,

  parallaxStrength: 0,

  panelCursor: 'default',

  panelGlass: false,

  panelGlassOpacity: 0.9,

  panelGlassBlur: 20,

  accentSparkle: false,

  particlesEnabled: false,

  particleStyle: 'sparkles',

  particleDensity: 18,

  particleSpeed: 1,

  ornamentsEnabled: false,

  ornamentStyle: 'celestial',

  ornamentCustomUrl: '',

  ornamentOpacity: 0.8,

  ornamentScale: 1,

  ornamentGlow: 0.35,

  ornamentInset: 12,

  // CHAT HUD / FRAME SKINS

  hudFrameStyle: 'none',

  hudFrameOpacity: 0.9,

  hudFrameGlow: 0.45,

  hudFrameInset: 10,

  hudFrameRails: true,

  hudFrameComposer: true,

  hudFrameMessageMarkers: true,

  hudFrameGlyphs: true,

  hudFrameAnimation: true
}

// PRESETS

window.ClankAtelier.THEME_PRESETS = {
  default: {
    name: 'Default',

    accent: '#9b7cff',

    chatBackground: '#151515',

    assistantBackground: '#1b1b1f',

    assistantText: '#ffffff',

    userBackground: '#29202d',

    userText: '#ffffff'
  },

  furina: {
    name: 'Furina',

    accent: '#61b8ff',

    chatBackground: '#101923',

    assistantBackground: '#162738',

    assistantText: '#edf8ff',

    userBackground: '#193c57',

    userText: '#ffffff'
  },

  midnight: {
    name: 'Midnight',

    accent: '#8474ff',

    chatBackground: '#0d0d12',

    assistantBackground: '#15151e',

    assistantText: '#ececf4',

    userBackground: '#232038',

    userText: '#ffffff'
  },

  rose: {
    name: 'Rose',

    accent: '#ff6f9f',

    chatBackground: '#171014',

    assistantBackground: '#21171d',

    assistantText: '#fff3f7',

    userBackground: '#432331',

    userText: '#fff7fa'
  },

  cathedral: {
    name: 'Cathedral',

    accent: '#b63755',

    chatBackground: '#0e0a0c',

    assistantBackground: '#171013',

    assistantText: '#eee4e7',

    userBackground: '#39141f',

    userText: '#fff3f5'
  },

  paper: {
    name: 'Paper',

    accent: '#ad7c42',

    chatBackground: '#e7dcc8',

    assistantBackground: '#f3ead9',

    assistantText: '#2b241c',

    userBackground: '#d5c09c',

    userText: '#211b15'
  },

  terminal: {
    name: 'Terminal',

    accent: '#50ff9b',

    chatBackground: '#070b08',

    assistantBackground: '#0c120e',

    assistantText: '#aaffc8',

    userBackground: '#102419',

    userText: '#c4ffda'
  }
}

// Conversation scope

window.ClankAtelier.getConversationId = function () {
  const match = window.location.pathname.match(/^\/chat\/([^/?#]+)/)

  if (!match) {
    return null
  }

  try {
    return decodeURIComponent(match[1])
  } catch (error) {
    return match[1]
  }
}

// THEME MANAGER

window.ClankAtelier.ThemeManager = {
  STORAGE_KEY: 'furina-theme-settings',

  CONVERSATION_STORAGE_KEY: 'furina-conversation-themes',

  CUSTOM_PRESET_STORAGE_KEY: 'furina-custom-theme-presets',

  EXPORT_FORMAT: 'furina-atelier',

  EXPORT_VERSION: 1,

  settings: {
    ...window.ClankAtelier.DEFAULT_THEME
  },

  globalSettings: {
    ...window.ClankAtelier.DEFAULT_THEME
  },

  scope: 'global',

  conversationId: null,

  customPresets: [],

  customPresetsLoaded: false,

  /*
        Furina's scene layer is now fixed to the viewport.

        It no longer needs to measure Clank's sidebar or main-content
        width to decide how far the background should extend.
    */

  // Conversation themes

  async getConversationThemes() {
    return await window.ClankAtelier.Storage.getObject(
      this.CONVERSATION_STORAGE_KEY,
      {}
    )
  },

  async getConversationTheme(conversationId) {
    if (!conversationId) {
      return null
    }

    const themes = await this.getConversationThemes()

    return themes[conversationId] || null
  },

  async saveConversationTheme(conversationId, settings) {
    if (!conversationId) {
      return
    }

    const snapshot = this.sanitizeStoredTheme(settings)

    await window.ClankAtelier.Storage.updateObject(
      this.CONVERSATION_STORAGE_KEY,
      themes => {
        themes[conversationId] = snapshot

        return themes
      }
    )
  },

  async deleteConversationTheme(conversationId) {
    if (!conversationId) {
      return
    }

    await window.ClankAtelier.Storage.updateObject(
      this.CONVERSATION_STORAGE_KEY,
      themes => {
        if (Object.prototype.hasOwnProperty.call(themes, conversationId)) {
          delete themes[conversationId]
        }

        return themes
      }
    )
  },

  async loadConversationScope() {
    const conversationId = window.ClankAtelier.getConversationId()

    this.conversationId = conversationId

    if (!conversationId) {
      this.scope = 'global'

      this.settings = {
        ...this.globalSettings
      }

      this.apply()

      return
    }

    const conversationTheme = await this.getConversationTheme(conversationId)

    if (conversationId !== window.ClankAtelier.getConversationId()) {
      return
    }

    if (conversationTheme) {
      this.scope = 'conversation'

      this.settings = this.sanitizeStoredTheme(conversationTheme)
    } else {
      this.scope = 'global'

      this.settings = {
        ...this.globalSettings
      }
    }

    this.apply()
  },

  async enableConversationTheme() {
    const conversationId = window.ClankAtelier.getConversationId()

    if (!conversationId) {
      return
    }

    this.conversationId = conversationId

    /*
            Start the conversation override from the theme the user
            is currently seeing. This makes enabling the override
            visually seamless.
        */

    this.settings = {
      ...this.settings
    }

    this.scope = 'conversation'

    await this.saveConversationTheme(conversationId, this.settings)

    this.apply()
  },

  async useGlobalTheme() {
    const conversationId = window.ClankAtelier.getConversationId()

    if (conversationId) {
      await this.deleteConversationTheme(conversationId)
    }

    this.conversationId = conversationId

    this.scope = 'global'

    this.settings = {
      ...this.globalSettings
    }

    this.apply()
  },

  async syncConversation() {
    const conversationId = window.ClankAtelier.getConversationId()

    if (conversationId === this.conversationId) {
      return false
    }

    await this.loadConversationScope()

    return true
  },

  // Theme portability

  createPortableId(prefix = 'item') {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return prefix + '-' + crypto.randomUUID()
    }

    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2)
  },

  normalizePortableName(value, fallback = '') {
    const name = String(value || '')
      .trim()
      .slice(0, 60)

    return name || fallback
  },

  sanitizeThemeSettings(values) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      return {}
    }

    const clean = {}

    const colors = new Set([
      'accent',
      'chatBackground',
      'chatGradientColor',
      'chatImageOverlayColor',
      'assistantBackground',
      'assistantText',
      'userBackground',
      'userText',
      'assistantBorderColor',
      'userBorderColor'
    ])

    const numberRanges = {
      chatGradientAngle: [0, 360],

      chatImageDarkness: [0, 0.9],

      chatImageOverlayOpacity: [0, 0.9],

      chatImageVignette: [0, 1],

      chatImageBlur: [0, 20],

      edgeGlowStrength: [0, 1],

      gradientAnimationSpeed: [8, 90],

      glassBlur: [0, 30],

      glassHighlight: [0, 0.6],

      backgroundBrightness: [0.4, 1.6],

      backgroundContrast: [0.5, 1.8],

      backgroundSaturation: [0, 2],

      backgroundSepia: [0, 1],

      backgroundHue: [-180, 180],

      parallaxStrength: [0, 18],

      panelGlassOpacity: [0.45, 1],

      panelGlassBlur: [0, 36],

      particleDensity: [4, 40],

      particleSpeed: [0.35, 2.5],

      ornamentOpacity: [0.15, 1],

      ornamentScale: [0.5, 2],

      ornamentGlow: [0, 1],

      ornamentInset: [0, 48],

      hudFrameOpacity: [0.2, 1],

      hudFrameGlow: [0, 1],

      hudFrameInset: [0, 36],

      assistantRadius: [0, 32],

      userRadius: [0, 32],

      assistantPaddingX: [4, 32],

      assistantPaddingY: [2, 24],

      userPaddingX: [4, 32],

      userPaddingY: [2, 24],

      assistantOpacity: [0.1, 1],

      userOpacity: [0.1, 1],

      assistantBorderWidth: [0, 8],

      userBorderWidth: [0, 8],

      assistantShadow: [0, 1],

      userShadow: [0, 1],

      messageSpacing: [0, 32],

      fontSize: [12, 24],

      headingScale: [0.7, 1.6],

      codeFontSize: [10, 20],

      lineHeight: [1.2, 2],

      paragraphSpacing: [0, 28],

      messageWidth: [520, 1000],

      avatarSize: [28, 84]
    }

    const enums = {
      chatBackgroundMode: new Set(['solid', 'gradient', 'image', 'video']),

      chatImageFit: new Set(['cover', 'contain', 'auto']),

      chatImagePosition: new Set([
        'center',
        'center top',
        'center bottom',
        'left center',
        'right center',
        'left top',
        'right top',
        'left bottom',
        'right bottom'
      ]),

      messageEntranceAnimation: new Set([
        'none',
        'soft',
        'float',
        'scale',
        'dream',
        'glitch'
      ]),

      assistantMessageSkin: new Set([
        'standard',
        'minimal',
        'glass',
        'terminal',
        'parchment',
        'manga'
      ]),

      userMessageSkin: new Set([
        'standard',
        'minimal',
        'glass',
        'terminal',
        'parchment',
        'manga'
      ]),

      composerSkin: new Set(['standard', 'minimal', 'glass', 'terminal']),

      typingIndicatorStyle: new Set(['standard', 'dots', 'pulse', 'terminal']),

      bubbleTexture: new Set([
        'none',
        'grain',
        'scanlines',
        'paper',
        'holographic'
      ]),

      avatarFrame: new Set([
        'none',
        'ring',
        'double',
        'arcane',
        'cyber',
        'floral'
      ]),

      avatarHover: new Set(['none', 'glow', 'lift', 'tilt', 'pulse']),

      speakerAccent: new Set(['none', 'line', 'bar', 'glow']),

      separatorStyle: new Set([
        'none',
        'sparkle',
        'diamond',
        'dots',
        'rune',
        'line'
      ]),

      panelCursor: new Set(['default', 'star', 'ring', 'diamond']),

      particleStyle: new Set([
        'sparkles',
        'dust',
        'petals',
        'embers',
        'snow',
        'hearts',
        'stars'
      ]),

      ornamentStyle: new Set([
        'celestial',
        'gothic',
        'arcane',
        'floral',
        'cyber',
        'lace',
        'custom'
      ]),

      hudFrameStyle: new Set([
        'none',
        'arcane',
        'cyber',
        'gothic',
        'terminal',
        'luxe'
      ])
    }

    const fontKeys = new Set([
      'messageFontFamily',
      'headingFontFamily',
      'codeFontFamily'
    ])

    const booleanKeys = new Set([
      'compact',
      'edgeGlowPulse',
      'animatedGradient',
      'glassBubbles',
      'panelGlass',
      'accentSparkle',
      'particlesEnabled',
      'ornamentsEnabled',
      'dialoguePresentation',
      'speakerNameplates',
      'hudFrameRails',
      'hudFrameComposer',
      'hudFrameMessageMarkers',
      'hudFrameGlyphs',
      'hudFrameAnimation'
    ])

    for (const key of Object.keys(window.ClankAtelier.DEFAULT_THEME)) {
      if (key === 'preset') {
        continue
      }

      if (!Object.prototype.hasOwnProperty.call(values, key)) {
        continue
      }

      const value = values[key]

      if (colors.has(key)) {
        if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
          clean[key] = value
        }

        continue
      }

      if (Object.prototype.hasOwnProperty.call(numberRanges, key)) {
        const range = numberRanges[key]

        if (
          typeof value === 'number' &&
          Number.isFinite(value) &&
          value >= range[0] &&
          value <= range[1]
        ) {
          clean[key] = value
        }

        continue
      }

      if (Object.prototype.hasOwnProperty.call(enums, key)) {
        if (typeof value === 'string' && enums[key].has(value)) {
          clean[key] = value
        }

        continue
      }

      if (fontKeys.has(key)) {
        if (
          typeof value === 'string' &&
          value.length > 0 &&
          value.length <= 300
        ) {
          clean[key] = value
        }

        continue
      }

      if (
        key === 'chatImageUrl' ||
        key === 'chatVideoUrl' ||
        key === 'ornamentCustomUrl'
      ) {
        if (value === '') {
          clean[key] = ''

          continue
        }

        if (typeof value === 'string' && value.length <= 2048) {
          try {
            const url = new URL(value)

            if (url.protocol === 'http:' || url.protocol === 'https:') {
              clean[key] = value
            }
          } catch (error) {
            // Ignore invalid imported URLs.
          }
        }

        continue
      }

      if (booleanKeys.has(key)) {
        if (typeof value === 'boolean') {
          clean[key] = value
        }
      }
    }

    return clean
  },

  sanitizeStoredTheme(values) {
    const source =
      values && typeof values === 'object' && !Array.isArray(values)
        ? values
        : {}

    const clean = this.sanitizeThemeSettings(source)

    const preset =
      typeof source.preset === 'string' && source.preset.length <= 40
        ? source.preset
        : window.ClankAtelier.DEFAULT_THEME.preset

    return {
      ...window.ClankAtelier.DEFAULT_THEME,

      ...clean,

      preset
    }
  },

  createThemeSnapshot() {
    return this.sanitizeThemeSettings(this.settings)
  },

  // Custom presets

  async loadCustomPresets() {
    if (this.customPresetsLoaded) {
      return
    }

    const stored = await window.ClankAtelier.Storage.getArray(
      this.CUSTOM_PRESET_STORAGE_KEY,
      []
    )

    if (!Array.isArray(stored)) {
      this.customPresets = []

      this.customPresetsLoaded = true

      return
    }

    this.customPresets = stored
      .map(preset => {
        if (!preset || typeof preset !== 'object') {
          return null
        }

        const name = this.normalizePortableName(preset.name)

        const theme = this.sanitizeThemeSettings(preset.theme)

        if (!preset.id || !name || Object.keys(theme).length === 0) {
          return null
        }

        return {
          id: String(preset.id).slice(0, 160),

          name,

          createdAt: Number.isFinite(preset.createdAt)
            ? preset.createdAt
            : Date.now(),

          theme
        }
      })
      .filter(Boolean)

    this.customPresetsLoaded = true
  },

  async saveCustomPresets() {
    await window.ClankAtelier.Storage.set(
      this.CUSTOM_PRESET_STORAGE_KEY,
      this.customPresets
    )
  },

  async saveCurrentAsCustomPreset(name) {
    const normalizedName = this.normalizePortableName(name)

    if (!normalizedName) {
      return null
    }

    const preset = {
      id: this.createPortableId('theme'),

      name: normalizedName,

      createdAt: Date.now(),

      theme: this.createThemeSnapshot()
    }

    this.customPresets.push(preset)

    await this.saveCustomPresets()

    return preset
  },

  async renameCustomPreset(presetId, name) {
    const normalizedName = this.normalizePortableName(name)

    if (!normalizedName) {
      return false
    }

    const preset = this.customPresets.find(item => item.id === presetId)

    if (!preset) {
      return false
    }

    preset.name = normalizedName

    await this.saveCustomPresets()

    return true
  },

  async deleteCustomPreset(presetId) {
    const next = this.customPresets.filter(preset => preset.id !== presetId)

    if (next.length === this.customPresets.length) {
      return false
    }

    this.customPresets = next

    await this.saveCustomPresets()

    return true
  },

  async applyCustomPreset(presetId) {
    const preset = this.customPresets.find(item => item.id === presetId)

    if (!preset) {
      return false
    }

    this.settings = {
      ...window.ClankAtelier.DEFAULT_THEME,

      ...this.sanitizeThemeSettings(preset.theme),

      preset: 'custom'
    }

    this.apply()

    await this.save()

    return true
  },

  // Theme import / export

  previewImportedTheme(payload) {
    if (
      !payload ||
      payload.format !== this.EXPORT_FORMAT ||
      payload.version !== this.EXPORT_VERSION ||
      payload.type !== 'theme'
    ) {
      return false
    }

    const theme = this.sanitizeThemeSettings(payload.theme)

    if (Object.keys(theme).length === 0) {
      return false
    }

    /*
            Preview only changes the in-memory theme and page styling.

            Nothing is written to storage until the user explicitly
            confirms the imported theme.
        */

    this.settings = {
      ...window.ClankAtelier.DEFAULT_THEME,

      ...theme,

      preset: 'custom'
    }

    this.apply()

    return true
  },

  restorePreviewTheme(settings) {
    if (!settings || typeof settings !== 'object') {
      return false
    }

    this.settings = {
      ...settings
    }

    this.apply()

    return true
  },

  createThemeExport(name = '') {
    return {
      format: this.EXPORT_FORMAT,

      version: this.EXPORT_VERSION,

      type: 'theme',

      name: this.normalizePortableName(name, 'Untitled Theme'),

      exportedAt: new Date().toISOString(),

      theme: this.createThemeSnapshot()
    }
  },

  serializeThemeExport(name = '') {
    return JSON.stringify(this.createThemeExport(name), null, 2)
  },

  parseThemeImport(text) {
    let parsed

    try {
      parsed = JSON.parse(String(text || ''))
    } catch (error) {
      return {
        ok: false,

        error: 'That is not valid JSON.'
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        ok: false,

        error: 'The imported file is not a Furina theme object.'
      }
    }

    if (parsed.format !== this.EXPORT_FORMAT) {
      return {
        ok: false,

        error: 'This is not a Furina Atelier export.'
      }
    }

    if (parsed.version !== this.EXPORT_VERSION) {
      return {
        ok: false,

        error: `Unsupported Furina export version: ${String(parsed.version)}.`
      }
    }

    if (parsed.type !== 'theme') {
      return {
        ok: false,

        error: 'This export is not a visual theme.'
      }
    }

    const theme = this.sanitizeThemeSettings(parsed.theme)

    if (Object.keys(theme).length === 0) {
      return {
        ok: false,

        error: 'No valid theme settings were found.'
      }
    }

    return {
      ok: true,

      payload: {
        format: this.EXPORT_FORMAT,

        version: this.EXPORT_VERSION,

        type: 'theme',

        name: this.normalizePortableName(parsed.name, 'Imported Theme'),

        theme
      }
    }
  },

  async applyImportedTheme(payload) {
    if (
      !payload ||
      payload.format !== this.EXPORT_FORMAT ||
      payload.version !== this.EXPORT_VERSION ||
      payload.type !== 'theme'
    ) {
      return false
    }

    const theme = this.sanitizeThemeSettings(payload.theme)

    if (Object.keys(theme).length === 0) {
      return false
    }

    this.settings = {
      ...window.ClankAtelier.DEFAULT_THEME,

      ...theme,

      preset: 'custom'
    }

    this.apply()

    await this.save()

    return true
  },

  // INITIALIZE

  async init() {
    const saved = await window.ClankAtelier.Storage.getObject(
      this.STORAGE_KEY,
      {}
    )

    this.globalSettings = this.sanitizeStoredTheme(saved)

    this.settings = {
      ...this.globalSettings
    }

    await this.loadCustomPresets()

    await this.loadConversationScope()
  },

  // APPLY CSS VARIABLES

  apply() {
    const root = document.documentElement

    const settings = this.settings

    root.classList.add('clank-atelier-enabled')

    root.style.setProperty('--furina-accent', settings.accent)

    root.style.setProperty('--furina-chat-bg', settings.chatBackground)

    root.style.setProperty(
      '--furina-chat-gradient-color',
      settings.chatGradientColor
    )

    root.style.setProperty(
      '--furina-chat-gradient-angle',
      `${settings.chatGradientAngle}deg`
    )

    let chatImage = 'none'

    if (
      typeof settings.chatImageUrl === 'string' &&
      /^https?:\/\//i.test(settings.chatImageUrl.trim())
    ) {
      chatImage = `url(${JSON.stringify(settings.chatImageUrl.trim())})`
    }

    root.style.setProperty('--furina-chat-image', chatImage)

    root.style.setProperty('--furina-chat-image-fit', settings.chatImageFit)

    root.style.setProperty(
      '--furina-chat-image-position',
      settings.chatImagePosition
    )

    root.style.setProperty(
      '--furina-chat-image-darkness',
      String(settings.chatImageDarkness)
    )

    root.style.setProperty(
      '--furina-chat-overlay-color',
      settings.chatImageOverlayColor
    )

    root.style.setProperty(
      '--furina-chat-overlay-opacity',
      String(settings.chatImageOverlayOpacity)
    )

    root.style.setProperty(
      '--furina-chat-vignette',
      String(settings.chatImageVignette)
    )

    root.style.setProperty(
      '--furina-chat-image-blur',
      `${settings.chatImageBlur}px`
    )

    root.dataset.furinaBackgroundMode = settings.chatBackgroundMode

    /*
        Video backgrounds need a real <video> element rather than a CSS
        background image. Keep exactly one video attached to the current
        chat shell and reuse it when settings change.
    */
    this.syncVideoBackground()

    root.style.setProperty(
      '--furina-assistant-bg',
      settings.assistantBackground
    )

    root.style.setProperty('--furina-assistant-text', settings.assistantText)

    root.style.setProperty('--furina-user-bg', settings.userBackground)

    root.style.setProperty('--furina-user-text', settings.userText)

    root.style.setProperty(
      '--furina-assistant-radius',
      `${settings.assistantRadius}px`
    )

    root.style.setProperty('--furina-user-radius', `${settings.userRadius}px`)

    root.style.setProperty('--furina-line-height', String(settings.lineHeight))

    root.style.setProperty('--furina-message-font', settings.messageFontFamily)

    root.style.setProperty('--furina-heading-font', settings.headingFontFamily)

    root.style.setProperty('--furina-code-font', settings.codeFontFamily)

    root.style.setProperty('--furina-font-size', `${settings.fontSize}px`)

    root.style.setProperty(
      '--furina-heading-scale',
      String(settings.headingScale)
    )

    root.style.setProperty(
      '--furina-code-font-size',
      `${settings.codeFontSize}px`
    )

    root.style.setProperty(
      '--furina-paragraph-spacing',
      `${settings.paragraphSpacing}px`
    )

    root.style.setProperty(
      '--furina-message-width',
      `${settings.messageWidth}px`
    )

    root.style.setProperty('--furina-avatar-size', `${settings.avatarSize}px`)

    root.style.setProperty(
      '--furina-message-spacing',
      `${settings.messageSpacing}px`
    )

    root.style.setProperty(
      '--furina-assistant-padding-x',
      `${settings.assistantPaddingX}px`
    )

    root.style.setProperty(
      '--furina-assistant-padding-y',
      `${settings.assistantPaddingY}px`
    )

    root.style.setProperty(
      '--furina-user-padding-x',
      `${settings.userPaddingX}px`
    )

    root.style.setProperty(
      '--furina-user-padding-y',
      `${settings.userPaddingY}px`
    )

    root.style.setProperty(
      '--furina-assistant-opacity',
      String(settings.assistantOpacity)
    )

    root.style.setProperty(
      '--furina-user-opacity',
      String(settings.userOpacity)
    )

    root.style.setProperty(
      '--furina-assistant-glass-pct',
      `${Math.round(settings.assistantOpacity * 66)}%`
    )

    root.style.setProperty(
      '--furina-user-glass-pct',
      `${Math.round(settings.userOpacity * 66)}%`
    )

    root.style.setProperty(
      '--furina-assistant-border-width',
      `${settings.assistantBorderWidth}px`
    )

    root.style.setProperty(
      '--furina-assistant-border-color',
      settings.assistantBorderColor
    )

    root.style.setProperty(
      '--furina-user-border-width',
      `${settings.userBorderWidth}px`
    )

    root.style.setProperty(
      '--furina-user-border-color',
      settings.userBorderColor
    )

    /*
        Shadow sliders are 0 → 1.

        Convert them into practical shadow opacity values.
        Maximum shadow opacity is 0.45.
    */

    root.style.setProperty(
      '--furina-assistant-shadow-alpha',
      String(settings.assistantShadow * 0.45)
    )

    root.style.setProperty(
      '--furina-user-shadow-alpha',
      String(settings.userShadow * 0.45)
    )

    // COSMETIC THEME STATE

    root.dataset.furinaMessageEntrance = settings.messageEntranceAnimation

    root.dataset.furinaAssistantSkin = settings.assistantMessageSkin
    root.dataset.furinaUserSkin = settings.userMessageSkin
    root.dataset.furinaComposerSkin = settings.composerSkin
    root.dataset.furinaDialoguePresentation = String(
      Boolean(settings.dialoguePresentation)
    )
    root.dataset.furinaSpeakerNameplates = String(
      Boolean(settings.speakerNameplates)
    )
    root.dataset.furinaTypingIndicator = settings.typingIndicatorStyle

    root.dataset.furinaEdgeGlowPulse = String(Boolean(settings.edgeGlowPulse))

    root.dataset.furinaAnimatedGradient = String(
      Boolean(settings.animatedGradient)
    )

    root.dataset.furinaGlassBubbles = String(Boolean(settings.glassBubbles))

    root.dataset.furinaBubbleTexture = settings.bubbleTexture

    root.dataset.furinaAvatarFrame = settings.avatarFrame

    root.dataset.furinaAvatarHover = settings.avatarHover

    root.dataset.furinaSpeakerAccent = settings.speakerAccent

    root.dataset.furinaSeparator = settings.separatorStyle

    root.dataset.furinaPanelCursor = settings.panelCursor

    root.dataset.furinaPanelGlass = String(Boolean(settings.panelGlass))

    root.dataset.furinaAccentSparkle = String(Boolean(settings.accentSparkle))

    root.dataset.furinaHudStyle = settings.hudFrameStyle
    root.dataset.furinaHudRails = String(Boolean(settings.hudFrameRails))
    root.dataset.furinaHudComposer = String(Boolean(settings.hudFrameComposer))
    root.dataset.furinaHudMessageMarkers = String(
      Boolean(settings.hudFrameMessageMarkers)
    )
    root.dataset.furinaHudGlyphs = String(Boolean(settings.hudFrameGlyphs))
    root.dataset.furinaHudAnimation = String(
      Boolean(settings.hudFrameAnimation)
    )

    root.style.setProperty(
      '--furina-edge-glow-strength',
      String(settings.edgeGlowStrength)
    )

    root.style.setProperty(
      '--furina-gradient-animation-speed',
      `${settings.gradientAnimationSpeed}s`
    )

    root.style.setProperty('--furina-glass-blur', `${settings.glassBlur}px`)

    root.style.setProperty(
      '--furina-glass-highlight',
      String(settings.glassHighlight)
    )

    root.style.setProperty(
      '--furina-background-brightness',
      String(settings.backgroundBrightness)
    )

    root.style.setProperty(
      '--furina-background-contrast',
      String(settings.backgroundContrast)
    )

    root.style.setProperty(
      '--furina-background-saturation',
      String(settings.backgroundSaturation)
    )

    root.style.setProperty(
      '--furina-background-sepia',
      String(settings.backgroundSepia)
    )

    root.style.setProperty(
      '--furina-background-hue',
      `${settings.backgroundHue}deg`
    )

    root.style.setProperty(
      '--furina-parallax-strength',
      `${settings.parallaxStrength}px`
    )

    root.style.setProperty(
      '--furina-panel-glass-opacity',
      String(settings.panelGlassOpacity)
    )

    root.style.setProperty(
      '--furina-panel-glass-opacity-pct',
      `${Math.round(settings.panelGlassOpacity * 100)}%`
    )

    root.style.setProperty(
      '--furina-panel-glass-blur',
      `${settings.panelGlassBlur}px`
    )

    root.style.setProperty(
      '--furina-ornament-opacity',
      String(settings.ornamentOpacity)
    )

    root.style.setProperty(
      '--furina-ornament-scale',
      String(settings.ornamentScale)
    )

    root.style.setProperty(
      '--furina-ornament-glow',
      String(settings.ornamentGlow)
    )

    root.style.setProperty(
      '--furina-ornament-glow-pct',
      `${Math.round(settings.ornamentGlow * 100)}%`
    )

    root.style.setProperty(
      '--furina-ornament-inset',
      `${settings.ornamentInset}px`
    )

    root.style.setProperty(
      '--furina-hud-opacity',
      String(settings.hudFrameOpacity)
    )

    root.style.setProperty(
      '--furina-hud-opacity-pct',
      `${Math.round(settings.hudFrameOpacity * 100)}%`
    )

    root.style.setProperty('--furina-hud-glow', String(settings.hudFrameGlow))

    root.style.setProperty(
      '--furina-hud-glow-pct',
      `${Math.round(settings.hudFrameGlow * 100)}%`
    )

    root.style.setProperty(
      '--furina-hud-glow-size',
      `${Math.round(4 + settings.hudFrameGlow * 24)}px`
    )

    root.style.setProperty('--furina-hud-inset', `${settings.hudFrameInset}px`)

    root.classList.toggle('clank-atelier-compact', Boolean(settings.compact))

    window.dispatchEvent(
      new CustomEvent('clank-atelier-theme-changed', {
        detail: {
          ...settings
        }
      })
    )
  },

  ensureSceneLayer(
    shell = document.querySelector('.clank-atelier-chat-shell')
  ) {
    document.querySelectorAll('.furina-scene-layer').forEach(layer => {
      if (!shell || layer.parentElement !== shell) {
        layer.querySelectorAll('video').forEach(video => video.pause())

        layer.remove()
      }
    })

    if (!(shell instanceof HTMLElement)) {
      return null
    }

    let layer = shell.querySelector(':scope > .furina-scene-layer')

    if (!layer) {
      layer = document.createElement('div')

      layer.className = 'furina-scene-layer'

      layer.dataset.furinaOwned = 'true'

      layer.setAttribute('aria-hidden', 'true')

      shell.prepend(layer)
    }

    return layer
  },

  // VIDEO BACKGROUND

  syncVideoBackground(
    shell = document.querySelector('.clank-atelier-chat-shell')
  ) {
    const sceneLayer = this.ensureSceneLayer(shell)

    /*
            There should never be more than one Furina video background.
            Remove stale copies if Clank rebuilt the surrounding layout.
        */
    document.querySelectorAll('.furina-video-background').forEach(video => {
      if (!sceneLayer || video.parentElement !== sceneLayer) {
        video.pause()
        video.remove()
      }
    })

    if (!sceneLayer) {
      return false
    }

    const rawUrl =
      typeof this.settings.chatVideoUrl === 'string'
        ? this.settings.chatVideoUrl.trim()
        : ''

    const shouldShow =
      this.settings.chatBackgroundMode === 'video' &&
      /^https?:\/\//i.test(rawUrl)

    let video = sceneLayer.querySelector(':scope > .furina-video-background')

    if (!shouldShow) {
      if (video) {
        video.pause()
        video.remove()
      }

      return false
    }

    if (!video) {
      video = document.createElement('video')

      video.className = 'furina-video-background'

      video.autoplay = true

      video.muted = true

      video.loop = true

      video.setAttribute('loop', '')

      video.playsInline = true

      video.preload = 'auto'

      video.tabIndex = -1

      video.setAttribute('aria-hidden', 'true')

      video.setAttribute('disablepictureinpicture', '')

      /*
                Native <video loop> can produce a tiny visible hitch when the
                decoder reaches the real end of some MP4 files.

                For live wallpapers, jump back to the beginning a few frames
                before the true media boundary instead.

                Native looping stays enabled as a fallback.
            */
      const seamlessLoopMargin = 0.0

      const seamlessLoopTick = () => {
        if (!video.isConnected) {
          video.furinaSeamlessLoopFrame = null

          return
        }

        const duration = video.duration

        if (
          this.settings.chatBackgroundMode === 'video' &&
          Number.isFinite(duration) &&
          duration > seamlessLoopMargin &&
          !video.seeking &&
          video.currentTime >= duration - seamlessLoopMargin
        ) {
          try {
            video.currentTime = 0
          } catch {
            /*
                                Seeking can fail briefly while media metadata is
                                changing. Native looping remains the fallback.
                            */
          }
        }

        video.furinaSeamlessLoopFrame =
          window.requestAnimationFrame(seamlessLoopTick)
      }

      video.furinaSeamlessLoopFrame =
        window.requestAnimationFrame(seamlessLoopTick)

      /*
                Native HTML video looping normally handles this by itself.

                Some remote videos or browser state changes can occasionally leave
                a wallpaper paused near the end, though. This lightweight watchdog
                makes sure a Furina background keeps behaving like a live wallpaper.
            */
      video.furinaLoopWatchdog = window.setInterval(() => {
        /*
                            Once this video has been removed, the watchdog has
                            finished its job and can clean itself up.
                        */
        if (!video.isConnected) {
          window.clearInterval(video.furinaLoopWatchdog)

          video.furinaLoopWatchdog = null

          return
        }

        if (this.settings.chatBackgroundMode !== 'video') {
          return
        }

        /*
                            If something unexpectedly paused the wallpaper while
                            this tab is active, start it again.
                        */
        if (video.paused && document.visibilityState === 'visible') {
          const resume = video.play()

          if (resume && typeof resume.catch === 'function') {
            resume.catch(() => {
              // A failed background resume is harmless.
            })
          }
        }
      }, 500)

      sceneLayer.prepend(video)
    }

    /*
            Only reload the media if the URL actually changed.
            Sliders such as blur or darkness should not restart the video.
        */
    if (video.dataset.furinaSrc !== rawUrl) {
      video.dataset.furinaSrc = rawUrl

      video.src = rawUrl

      video.load()
    }

    /*
            Only request playback when the video is actually paused.

            Clank mutates its DOM frequently, which can cause this sync method
            to run many times during a normal conversation. Repeated play()
            calls on an already-playing background are unnecessary.
        */

    if (video.paused) {
      const playPromise = video.play()

      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Muted autoplay failure is harmless.
        })
      }
    }

    return true
  },

  resumeVideoBackground() {
    if (this.settings.chatBackgroundMode !== 'video') {
      return
    }

    const video = document.querySelector('.furina-video-background')

    if (!(video instanceof HTMLVideoElement)) {
      return
    }

    if (!video.paused) {
      return
    }

    const playPromise = video.play()

    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Background playback can safely wait for the next retry.
      })
    }
  },

  clearVideoBackground() {
    document.querySelectorAll('.furina-video-background').forEach(video => {
      video.pause()
      video.remove()
    })

    document
      .querySelectorAll('.furina-scene-layer')
      .forEach(layer => layer.remove())
  },

  // UPDATE ONE SETTING

  async update(key, value) {
    if (key === 'preset') {
      if (typeof value !== 'string' || value.length > 40) {
        return false
      }

      this.settings.preset = value
    } else {
      const clean = this.sanitizeThemeSettings({
        [key]: value
      })

      if (!Object.prototype.hasOwnProperty.call(clean, key)) {
        return false
      }

      this.settings[key] = clean[key]

      this.settings.preset = 'custom'
    }

    this.apply()

    await this.save()

    return true
  },

  // UPDATE MANY SETTINGS

  async updateMany(values) {
    const clean = this.sanitizeThemeSettings(values)

    if (Object.keys(clean).length === 0) {
      return false
    }

    this.settings = {
      ...this.settings,

      ...clean,

      preset: 'custom'
    }

    this.apply()

    await this.save()

    return true
  },

  // PRESET

  async applyPreset(presetId) {
    const preset = window.ClankAtelier.THEME_PRESETS[presetId]

    if (!preset) {
      return
    }

    /*
            A stock preset should always produce the same result.
            Start from defaults so previous custom borders, shadows,
            typography, backgrounds, or layout values do not leak in.
        */
    this.settings = {
      ...window.ClankAtelier.DEFAULT_THEME,

      ...preset,

      preset: presetId
    }

    delete this.settings.name

    this.apply()

    await this.save()
  },

  // RESET

  async reset() {
    this.settings = {
      ...window.ClankAtelier.DEFAULT_THEME
    }

    this.apply()

    await this.save()
  },

  // SAVE ──────────────────────────────────────W

  async save() {
    this.settings = this.sanitizeStoredTheme(this.settings)

    if (this.scope === 'conversation' && this.conversationId) {
      await this.saveConversationTheme(this.conversationId, this.settings)

      return
    }

    this.globalSettings = {
      ...this.settings
    }

    await window.ClankAtelier.Storage.set(this.STORAGE_KEY, this.globalSettings)
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') {
    return
  }

  window.ClankAtelier?.ThemeManager?.resumeVideoBackground?.()
})

window.addEventListener('focus', () => {
  window.ClankAtelier?.ThemeManager?.resumeVideoBackground?.()
})
