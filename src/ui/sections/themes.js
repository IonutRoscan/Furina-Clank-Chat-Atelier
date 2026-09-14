'use strict'


/*
  Developer notes

  Themes panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Theme Presets Panel Section

    Renders built-in and custom visual theme presets without owning theme state itself.
*/
;(() => {
  const Atelier = window.ClankAtelier
  const UI = Atelier.PanelUI
  const State = Atelier.PanelState
  const Sections = Atelier.PanelSections

  const {
    createElement,
    createRangeControl,
    createTextControl,
    createSelectControl,
    createColorControl,
    createSection
  } = UI

  // PRESET SECTION

  function createPresetSection() {
    const section = createSection('Themes')

    const grid = createElement('div', 'furina-preset-grid')

    for (const [id, preset] of Object.entries(Atelier.THEME_PRESETS)) {
      const button = createElement('button', 'furina-preset')

      button.type = 'button'

      button.dataset.preset = id

      const swatch = createElement('span', 'furina-preset-swatch')

      swatch.style.background = preset.accent

      const name = createElement('span', 'furina-preset-name', preset.name)

      button.append(swatch, name)

      button.addEventListener('click', async () => {
        await Atelier.ThemeManager.applyPreset(id)

        Atelier.PanelShell.rebuild()
      })

      grid.appendChild(button)
    }

    section.furinaContent.appendChild(grid)

    // Custom presets

    const customArea = createElement('div', 'furina-custom-preset-area')

    const customTitle = createElement(
      'div',
      'furina-panel-group-label',
      'Custom Presets'
    )

    const saveRow = createElement('div', 'furina-custom-preset-save')

    const presetName = document.createElement('input')

    presetName.type = 'text'

    presetName.maxLength = 60

    presetName.className = 'furina-text-input'

    presetName.placeholder = 'Preset name'

    const saveCurrent = createElement(
      'button',
      'furina-secondary-button',
      'Save current'
    )

    saveCurrent.type = 'button'

    const customStatus = createElement('div', 'furina-portable-status')

    async function saveCurrentPreset() {
      const name = presetName.value.trim()

      if (!name) {
        customStatus.textContent = 'Give the preset a name first.'

        return
      }

      const saved = await Atelier.ThemeManager.saveCurrentAsCustomPreset(name)

      if (!saved) {
        customStatus.textContent = 'Could not save preset.'

        return
      }

      Atelier.PanelShell.rebuild()
    }

    saveCurrent.addEventListener('click', saveCurrentPreset)

    presetName.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        saveCurrentPreset()
      }
    })

    saveRow.append(presetName, saveCurrent)

    customArea.append(customTitle, saveRow, customStatus)

    const customList = createElement('div', 'furina-custom-preset-list')

    if (Atelier.ThemeManager.customPresets.length === 0) {
      customList.appendChild(
        createElement('div', 'furina-portable-empty', 'No custom presets yet.')
      )
    }

    Atelier.ThemeManager.customPresets.forEach(preset => {
      const card = createElement('div', 'furina-custom-preset-card')

      const name = createElement(
        'div',
        'furina-custom-preset-name',
        preset.name
      )

      const actions = createElement('div', 'furina-custom-preset-actions')

      const apply = createElement(
        'button',
        'furina-portable-mini-button',
        'Apply'
      )

      const rename = createElement(
        'button',
        'furina-portable-mini-button',
        'Rename'
      )

      const remove = createElement(
        'button',
        'furina-portable-mini-button furina-portable-delete',
        '×'
      )

      apply.type = 'button'

      rename.type = 'button'

      remove.type = 'button'

      apply.addEventListener('click', async () => {
        await Atelier.ThemeManager.applyCustomPreset(preset.id)

        Atelier.PanelShell.rebuild()
      })

      rename.addEventListener('click', async () => {
        const nextName = Atelier.I18n.prompt(
          'Rename theme preset:',
          preset.name
        )

        if (nextName === null) {
          return
        }

        await Atelier.ThemeManager.renameCustomPreset(preset.id, nextName)

        Atelier.PanelShell.rebuild()
      })

      remove.addEventListener('click', async () => {
        if (
          !Atelier.I18n.confirm(`Delete the custom preset "${preset.name}"?`)
        ) {
          return
        }

        await Atelier.ThemeManager.deleteCustomPreset(preset.id)

        Atelier.PanelShell.rebuild()
      })

      actions.append(apply, rename, remove)

      card.append(name, actions)

      customList.appendChild(card)
    })

    customArea.appendChild(customList)

    section.furinaContent.appendChild(customArea)

    return section
  }

  Sections.createPresetSection = createPresetSection
})()
