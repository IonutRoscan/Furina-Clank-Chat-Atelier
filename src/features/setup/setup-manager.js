'use strict'


/*
  Developer notes

  Builds portable Full Setup packages from existing feature managers and applies
  imported packages through preview/revert/commit steps. Importing should remain
  opt-in per component and must sanitize data using the owning manager instead of
  trusting JSON fields directly.
*/
/*
    Setup Manager

    Coordinates Full Setup import/export across existing feature managers. It previews selected parts first and only writes them to storage when the user explicitly keeps the setup.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  // Setup portability

  Atelier.SetupManager = {
    FORMAT: 'furina-atelier',

    VERSION: 2,

    SUPPORTED_VERSIONS: new Set([1, 2]),

    previewBackup: null,

    previewSelection: {
      theme: false,

      reader: false,

      stickers: false,

      atmosphere: false,

      ambience: false
    },

    clone(value) {
      return JSON.parse(JSON.stringify(value))
    },

    normalizeName(value, fallback = 'Untitled Setup') {
      const name = String(value || '')
        .trim()
        .slice(0, 60)

      return name || fallback
    },

    sanitizeReaderSettings(values) {
      const manager = Atelier.ReaderManager

      if (
        !manager ||
        !values ||
        typeof values !== 'object' ||
        Array.isArray(values)
      ) {
        return {}
      }

      const defaults = manager.getDefaults()

      const clean = {}

      for (const key of Object.keys(defaults)) {
        if (typeof values[key] === 'boolean') {
          clean[key] = values[key]
        }
      }

      return clean
    },

    sanitizeAtmosphereSettings(values) {
      const manager = Atelier.AtmosphereManager

      if (
        !manager ||
        !values ||
        typeof values !== 'object' ||
        Array.isArray(values)
      ) {
        return {}
      }

      return manager.sanitizeSettings(values)
    },

    sanitizeAmbienceSettings(values) {
      const manager = Atelier.AmbienceManager

      if (
        !manager ||
        !values ||
        typeof values !== 'object' ||
        Array.isArray(values)
      ) {
        return {}
      }

      return manager.sanitizeSettings(values)
    },

    sanitizeStickers(values) {
      const manager = Atelier.StickerManager

      if (!manager || !Array.isArray(values)) {
        return []
      }

      const clean = []

      for (const sticker of values.slice(0, manager.MAX_STICKERS || 500)) {
        if (
          !sticker ||
          typeof sticker !== 'object' ||
          typeof sticker.url !== 'string' ||
          sticker.url.length > 2048 ||
          !manager.isSafeImageUrl(sticker.url)
        ) {
          continue
        }

        const x = Number(sticker.x)

        const y = Number(sticker.y)

        const width = Number(sticker.width)

        const opacity = Number(sticker.opacity)

        const rotation = Number(sticker.rotation)

        clean.push({
          url: sticker.url,

          x: Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 50,

          y: Number.isFinite(y) ? Math.max(0, Math.min(100, y)) : 25,

          width: Number.isFinite(width)
            ? Math.max(48, Math.min(640, width))
            : 160,

          opacity: Number.isFinite(opacity)
            ? Math.max(0.1, Math.min(1, opacity))
            : 1,

          rotation: Number.isFinite(rotation)
            ? Math.max(-180, Math.min(180, rotation))
            : 0,

          flipX: Boolean(sticker.flipX),

          flipY: Boolean(sticker.flipY),

          locked: Boolean(sticker.locked),

          positionMode: sticker.positionMode === 'screen' ? 'screen' : 'chat'
        })
      }

      return clean
    },

    createSetupExport(name = '') {
      const themeManager = Atelier.ThemeManager

      const readerManager = Atelier.ReaderManager

      const stickerManager = Atelier.StickerManager

      const atmosphereManager = Atelier.AtmosphereManager

      const ambienceManager = Atelier.AmbienceManager

      return {
        format: this.FORMAT,

        version: this.VERSION,

        type: 'setup',

        name: this.normalizeName(name),

        exportedAt: new Date().toISOString(),

        theme: themeManager?.createThemeSnapshot() || {},

        reader: this.sanitizeReaderSettings(readerManager?.settings),

        stickers: this.sanitizeStickers(stickerManager?.stickers),

        atmosphere: this.sanitizeAtmosphereSettings(
          atmosphereManager?.settings
        ),

        ambience: this.sanitizeAmbienceSettings(ambienceManager?.settings)
      }
    },

    serializeSetupExport(name = '') {
      return JSON.stringify(this.createSetupExport(name), null, 2)
    },

    parseSetupImport(text) {
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

          error: 'The imported file is not a Furina setup.'
        }
      }

      if (parsed.format !== this.FORMAT) {
        return {
          ok: false,

          error: 'This is not a Furina Atelier export.'
        }
      }

      if (!this.SUPPORTED_VERSIONS.has(parsed.version)) {
        return {
          ok: false,

          error: `Unsupported Furina export version: ${String(parsed.version)}.`
        }
      }

      if (parsed.type !== 'setup') {
        return {
          ok: false,

          error: 'This export is not a Full Setup.'
        }
      }

      const theme =
        Atelier.ThemeManager?.sanitizeThemeSettings(parsed.theme) || {}

      const reader = this.sanitizeReaderSettings(parsed.reader)

      const stickers = this.sanitizeStickers(parsed.stickers)

      const atmosphere = this.sanitizeAtmosphereSettings(parsed.atmosphere)

      const ambience = this.sanitizeAmbienceSettings(parsed.ambience)

      const available = {
        theme: Object.keys(theme).length > 0,

        reader: Object.keys(reader).length > 0,

        stickers:
          Array.isArray(parsed.stickers) &&
          (parsed.stickers.length === 0 || stickers.length > 0),

        atmosphere: Object.keys(atmosphere).length > 0,

        ambience: Object.keys(ambience).length > 0
      }

      if (
        !available.theme &&
        !available.reader &&
        !available.stickers &&
        !available.atmosphere &&
        !available.ambience
      ) {
        return {
          ok: false,

          error: 'No usable setup data was found.'
        }
      }

      return {
        ok: true,

        payload: {
          format: this.FORMAT,

          version: this.VERSION,

          type: 'setup',

          name: this.normalizeName(parsed.name, 'Imported Setup'),

          theme,

          reader,

          stickers,

          atmosphere,

          ambience,

          available
        }
      }
    },

    capturePreviewBackup() {
      if (this.previewBackup) {
        return
      }

      this.previewBackup = {
        theme: this.clone(Atelier.ThemeManager.settings),

        reader: this.clone(Atelier.ReaderManager.settings),

        stickers: this.clone(Atelier.StickerManager.stickers),

        atmosphere: this.clone(Atelier.AtmosphereManager?.settings || {}),

        ambience: this.clone(Atelier.AmbienceManager?.settings || {})
      }
    },

    restorePreviewBackup(clear = false) {
      if (!this.previewBackup) {
        return false
      }

      Atelier.ThemeManager.settings = {
        ...this.previewBackup.theme
      }

      Atelier.ThemeManager.apply()

      Atelier.ReaderManager.settings = {
        ...Atelier.ReaderManager.getDefaults(),

        ...this.previewBackup.reader
      }

      Atelier.ReaderManager.apply()

      Atelier.StickerManager.selectedStickerId = null

      Atelier.StickerManager.stickers = this.clone(this.previewBackup.stickers)

      Atelier.StickerManager.render()

      if (Atelier.AtmosphereManager) {
        Atelier.AtmosphereManager.settings =
          Atelier.AtmosphereManager.sanitizeSettings(
            this.previewBackup.atmosphere
          )

        Atelier.AtmosphereManager.render()
      }

      if (Atelier.AmbienceManager) {
        /*
                    Stop anything belonging to the temporary preview first.
                */

        Atelier.AmbienceManager.stopNativeAudio()

        Atelier.AmbienceManager.destroyPlayer()

        Atelier.AmbienceManager.settings =
          Atelier.AmbienceManager.sanitizeSettings(this.previewBackup.ambience)

        Atelier.AmbienceManager.lastError = ''

        Atelier.AmbienceManager.syncAudioSource()

        Atelier.AmbienceManager.renderPlayer()
      }

      if (clear) {
        this.previewBackup = null

        this.previewSelection = {
          theme: false,

          reader: false,

          stickers: false,

          atmosphere: false,

          ambience: false
        }
      }

      return true
    },

    previewSetup(payload, selection) {
      if (
        !payload ||
        payload.format !== this.FORMAT ||
        payload.version !== this.VERSION ||
        payload.type !== 'setup'
      ) {
        return false
      }

      this.capturePreviewBackup()

      /*
                Always start again from the original state. This makes
                toggling preview parts predictable instead of stacking
                one temporary preview on top of another.
            */

      this.restorePreviewBackup(false)

      const nextSelection = {
        theme: Boolean(selection.theme && payload.available.theme),

        reader: Boolean(selection.reader && payload.available.reader),

        stickers: Boolean(selection.stickers && payload.available.stickers),

        atmosphere: Boolean(
          selection.atmosphere && payload.available.atmosphere
        ),

        ambience: Boolean(selection.ambience && payload.available.ambience)
      }

      if (nextSelection.theme) {
        Atelier.ThemeManager.settings = {
          ...window.ClankAtelier.DEFAULT_THEME,

          ...payload.theme,

          preset: 'custom'
        }

        Atelier.ThemeManager.apply()
      }

      if (nextSelection.reader) {
        Atelier.ReaderManager.settings = {
          ...Atelier.ReaderManager.getDefaults(),

          ...payload.reader
        }

        Atelier.ReaderManager.apply()
      }

      if (nextSelection.stickers) {
        Atelier.StickerManager.selectedStickerId = null

        Atelier.StickerManager.stickers = payload.stickers.map(sticker => ({
          ...this.clone(sticker),

          id: Atelier.StickerManager.createId()
        }))

        Atelier.StickerManager.render()
      }

      if (nextSelection.atmosphere && Atelier.AtmosphereManager) {
        Atelier.AtmosphereManager.settings =
          Atelier.AtmosphereManager.sanitizeSettings(payload.atmosphere)

        Atelier.AtmosphereManager.render()
      }

      if (nextSelection.ambience && Atelier.AmbienceManager) {
        /*
                    Previewing music means configuring it, not playing it.
                */

        Atelier.AmbienceManager.stopNativeAudio()

        Atelier.AmbienceManager.destroyPlayer()

        Atelier.AmbienceManager.settings =
          Atelier.AmbienceManager.sanitizeSettings(payload.ambience)

        Atelier.AmbienceManager.lastError = ''

        Atelier.AmbienceManager.syncAudioSource()

        Atelier.AmbienceManager.renderPlayer()
      }

      this.previewSelection = nextSelection

      return true
    },

    async commitPreview() {
      if (!this.previewBackup) {
        return false
      }

      if (this.previewSelection.theme) {
        await Atelier.ThemeManager.save()
      }

      if (this.previewSelection.reader) {
        await Atelier.ReaderManager.save()
      }

      if (this.previewSelection.stickers) {
        await Atelier.StickerManager.save()
      }

      if (this.previewSelection.atmosphere && Atelier.AtmosphereManager) {
        await Atelier.AtmosphereManager.save()
      }

      if (this.previewSelection.ambience && Atelier.AmbienceManager) {
        await Atelier.AmbienceManager.save()
      }

      this.previewBackup = null

      this.previewSelection = {
        theme: false,

        reader: false,

        stickers: false,

        atmosphere: false,

        ambience: false
      }

      return true
    },

    revertPreview() {
      return this.restorePreviewBackup(true)
    }
  }
})()
