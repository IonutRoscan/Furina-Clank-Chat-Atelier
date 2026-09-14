'use strict'


/*
  Developer notes

  Switches between Essentials and Full Atelier without changing the underlying feature
  settings. Essentials is a simpler view over the same managers, not a second copy of
  Furina state.
*/
/*
    Furina Panel Mode

    Furina now has two views over the same feature managers:

    - Essentials: a compact, intent-first interface for everyday use.
    - Full Atelier: the complete workspace already used by Furina 1.3.

    No feature settings are duplicated here. Switching modes changes only
    which controls are shown; ThemeManager, ContinuityManager, Director, etc.
    remain the single source of truth.
*/
;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  Atelier.PanelMode = {
    STORAGE_KEY: 'furina-panel-mode-v1',
    mode: 'essentials',
    loaded: false,

    async load() {
      if (this.loaded) {
        return this.mode
      }

      const stored = await Atelier.Storage.get(this.STORAGE_KEY, null)

      if (stored === 'essentials' || stored === 'full') {
        this.mode = stored
        this.loaded = true
        return this.mode
      }

      /*
                Existing Furina users should not suddenly lose the panel they
                already know after updating. Fresh installs, however, start in
                Essentials so the first experience is approachable.
            */
      const existingState = await Atelier.Storage.getMany(
        [
          'furina-theme-settings',
          'furina-conversation-themes',
          'furina-panel-navigation',
          'furina-conversation-director',
          'furina-conversation-continuity-v1',
          'furina-conversation-scene-state',
          'furina-conversation-stickers'
        ],
        {}
      )

      const looksLikeExistingInstall =
        Object.keys(existingState || {}).length > 0

      this.mode = looksLikeExistingInstall ? 'full' : 'essentials'
      this.loaded = true
      return this.mode
    },

    async set(mode) {
      if (mode !== 'essentials' && mode !== 'full') {
        return false
      }

      this.mode = mode
      await Atelier.Storage.set(this.STORAGE_KEY, mode)
      return true
    },

    isEssentials() {
      return this.mode === 'essentials'
    }
  }
})()
