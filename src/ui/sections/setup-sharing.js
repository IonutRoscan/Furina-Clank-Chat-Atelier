'use strict'


/*
  Developer notes

  Setup Sharing panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Full Setup Panel Section

    Handles Full Setup portability UI and the temporary component-selection preview state.
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

  // Full setup portability

  function createSetupSection() {
    const manager = Atelier.SetupManager

    const section = createSection('Full Setup', {
      collapsed: !(State.pendingSetupImport || manager?.previewBackup)
    })

    if (!manager) {
      section.furinaContent.appendChild(
        createElement(
          'div',
          'furina-portable-empty',
          'Setup engine unavailable.'
        )
      )

      return section
    }

    const intro = createElement(
      'div',
      'furina-portable-help',
      'Share the theme, Reader settings, stickers, Atmosphere, and Music / Ambience as one conversation setup.'
    )

    // Export setup

    const exportLabel = createElement(
      'div',
      'furina-panel-group-label',
      'Export Full Setup'
    )

    const exportName = document.createElement('input')

    exportName.type = 'text'

    exportName.className = 'furina-text-input'

    exportName.placeholder = 'Setup name'

    const exportActions = createElement('div', 'furina-portable-action-grid')

    const copyExport = createElement(
      'button',
      'furina-secondary-button',
      'Copy JSON'
    )

    const downloadExport = createElement(
      'button',
      'furina-secondary-button',
      'Download JSON'
    )

    copyExport.type = 'button'

    downloadExport.type = 'button'

    const exportStatus = createElement('div', 'furina-portable-status')

    copyExport.addEventListener('click', async () => {
      const json = manager.serializeSetupExport(exportName.value)

      try {
        await navigator.clipboard.writeText(json)

        exportStatus.textContent = 'Full Setup JSON copied.'
      } catch (error) {
        exportStatus.textContent = 'Clipboard access failed.'
      }
    })

    downloadExport.addEventListener('click', () => {
      const exportObject = manager.createSetupExport(exportName.value)

      const json = JSON.stringify(exportObject, null, 2)

      const blob = new Blob([json], {
        type: 'application/json'
      })

      const url = URL.createObjectURL(blob)

      const safeName =
        exportObject.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'furina-setup'

      const link = document.createElement('a')

      link.href = url

      link.download = `${safeName}.furina-setup.json`

      document.body.appendChild(link)

      link.click()

      link.remove()

      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 0)

      exportStatus.textContent = 'Full Setup file created.'
    })

    exportActions.append(copyExport, downloadExport)

    // Import setup

    const importLabel = createElement(
      'div',
      'furina-panel-group-label',
      'Import Full Setup'
    )

    const importBox = document.createElement('textarea')

    importBox.className = 'furina-import-textarea'

    importBox.maxLength = 2000000

    importBox.placeholder = 'Paste Furina Full Setup JSON here…'

    const previewButton = createElement(
      'button',
      'furina-secondary-button',
      'Preview Setup'
    )

    previewButton.type = 'button'

    const importStatus = createElement('div', 'furina-portable-status')

    previewButton.addEventListener('click', () => {
      const result = manager.parseSetupImport(importBox.value)

      if (!result.ok) {
        importStatus.textContent = result.error

        return
      }

      if (State.themeBeforeImportPreview) {
        manager.revertPreview()

        Atelier.ThemeManager.restorePreviewTheme(State.themeBeforeImportPreview)

        State.pendingThemeImport = null

        State.themeBeforeImportPreview = null
      }

      State.pendingSetupImport = result.payload

      State.setupImportSelection = {
        theme: result.payload.available.theme,

        reader: result.payload.available.reader,

        stickers: result.payload.available.stickers,

        atmosphere: result.payload.available.atmosphere,

        ambience: result.payload.available.ambience
      }

      const previewed = manager.previewSetup(
        State.pendingSetupImport,
        State.setupImportSelection
      )

      if (!previewed) {
        State.pendingSetupImport = null

        importStatus.textContent = 'Could not preview this setup.'

        return
      }

      Atelier.PanelShell.rebuild()
    })

    section.furinaContent.append(
      intro,

      exportLabel,
      exportName,
      exportActions,
      exportStatus,

      importLabel,
      importBox,
      previewButton,
      importStatus
    )

    // Live setup preview

    if (State.pendingSetupImport) {
      const preview = createElement(
        'div',
        'furina-import-preview furina-setup-preview'
      )

      const title = createElement(
        'div',
        'furina-import-preview-title',
        State.pendingSetupImport.name
      )

      const meta = createElement(
        'div',
        'furina-import-preview-meta',
        'Live preview • nothing has been saved yet.'
      )

      const parts = createElement('div', 'furina-setup-part-list')

      function createPartToggle(labelText, key) {
        const row = createElement('label', 'furina-setup-part-row')

        const text = createElement('span', '', labelText)

        const checkbox = document.createElement('input')

        checkbox.type = 'checkbox'

        checkbox.className = 'furina-checkbox'

        checkbox.checked = Boolean(State.setupImportSelection[key])

        checkbox.disabled = !State.pendingSetupImport.available[key]

        checkbox.addEventListener('change', () => {
          State.setupImportSelection[key] = checkbox.checked

          manager.previewSetup(
            State.pendingSetupImport,
            State.setupImportSelection
          )
        })

        row.classList.toggle('furina-setup-part-disabled', checkbox.disabled)

        row.append(text, checkbox)

        return row
      }

      parts.append(
        createPartToggle('Visual theme', 'theme'),

        createPartToggle('Reader settings', 'reader'),

        createPartToggle('Sticker arrangement', 'stickers'),

        createPartToggle('Atmosphere', 'atmosphere'),

        createPartToggle('Music / Ambience', 'ambience')
      )

      const target =
        Atelier.ThemeManager.scope === 'conversation'
          ? 'Theme changes will save to this conversation.'
          : 'Theme changes will save to your global theme.'

      const targetText = createElement(
        'div',
        'furina-import-preview-target',
        target
      )

      const actions = createElement('div', 'furina-portable-action-grid')

      const keep = createElement(
        'button',
        'furina-secondary-button furina-import-apply',
        'Keep Setup'
      )

      const revert = createElement(
        'button',
        'furina-secondary-button',
        'Revert'
      )

      keep.type = 'button'

      revert.type = 'button'

      keep.addEventListener('click', async () => {
        const selectedAnything = Object.values(State.setupImportSelection).some(
          Boolean
        )

        if (!selectedAnything) {
          return
        }

        await manager.commitPreview()

        State.pendingSetupImport = null

        Atelier.PanelShell.rebuild()
      })

      revert.addEventListener('click', () => {
        manager.revertPreview()

        State.pendingSetupImport = null

        Atelier.PanelShell.rebuild()
      })

      actions.append(keep, revert)

      preview.append(title, meta, parts, targetText, actions)

      section.furinaContent.appendChild(preview)
    }

    return section
  }

  Sections.createSetupSection = createSetupSection
})()
