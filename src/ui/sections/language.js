'use strict'


/*
  Developer notes

  Language panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Language Settings

    This section controls only Furina's own interface language. It never
    translates chat content or rewrites saved user data.
*/
;(() => {
  const Atelier = window.ClankAtelier

  const {createElement, createSection} = Atelier.PanelUI

  function createLanguageSection() {
    const section = createSection('Language')

    const content = section.furinaContent

    const intro = createElement(
      'div',
      'furina-portable-help',
      'Choose how Furina labels its interface. This never translates your chats, saved notes, presets, or other personal content.'
    )

    const control = createElement('label', 'furina-select-control')

    control.appendChild(
      createElement('span', 'furina-control-label', 'Language preference')
    )

    const select = document.createElement('select')

    select.className = 'furina-select'

    const options = [
      {
        value: 'auto',
        label: 'Automatic (browser language)'
      },
      ...(Atelier.I18n?.getSupportedLocales?.() || []).map(item => ({
        value: item.code,
        label: item.nativeLabel || item.label || item.code
      }))
    ]

    for (const optionData of options) {
      const option = document.createElement('option')

      option.value = optionData.value

      if (optionData.value === 'auto') {
        option.textContent =
          Atelier.I18n?.t?.(optionData.label) || optionData.label
      } else {
        /*
                    Language names stay in their native form so "Español"
                    remains recognizable even while Furina is in English.
                */
        option.textContent = optionData.label

        option.dataset.furinaNoI18n = 'true'
      }

      select.appendChild(option)
    }

    select.value = Atelier.I18n?.getPreference?.() || 'auto'

    control.appendChild(select)

    const help = createElement(
      'div',
      'furina-portable-help',
      'Automatic language follows your browser when Furina has a matching translation, and falls back to English otherwise.'
    )

    const current = createElement('div', 'furina-portable-status')

    function updateCurrent() {
      const activeLocale = Atelier.I18n?.getLocale?.() || 'en'

      const localeInfo = Atelier.I18n?.getSupportedLocales?.()?.find(
        item => item.code === activeLocale
      )

      current.textContent = `${Atelier.I18n?.t?.('Current Furina language') || 'Current Furina language'}: ${
        localeInfo?.nativeLabel || activeLocale
      }`
    }

    updateCurrent()

    const status = createElement('div', 'furina-portable-status')

    select.addEventListener('change', async () => {
      await Atelier.I18n?.setPreference?.(select.value)

      /*
                    The language-change event rebuilds the panel shell.
                    This status is mostly useful if storage fails but the
                    in-session language still changes.
                */
      status.textContent =
        Atelier.I18n?.t?.('Interface language updated.') ||
        'Interface language updated.'
    })

    const notes = createElement('div', 'furina-conditional-group')

    notes.append(
      createElement('div', 'furina-panel-group-label', 'Translation notes'),
      createElement(
        'div',
        'furina-portable-help',
        'Director markers and internal protocol text stay unchanged in every language. Built-in Director templates can load in the selected interface language.'
      )
    )

    content.append(intro, control, help, current, status, notes)

    return section
  }

  Atelier.PanelSections.createLanguageSection = createLanguageSection
})()
