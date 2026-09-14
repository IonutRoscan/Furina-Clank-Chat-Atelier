'use strict'


/*
  Developer notes

  Theme Sharing panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Theme Sharing Panel Section

    Handles visual-theme import/export preview UI. Validated theme data is still owned by ThemeManager.
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

  // Sharing

  function createSharingSection() {
    const section = createSection('Import / Export', {
      /*
                        Keep the section open after a successful validation
                        so the user can actually see the import preview.
                    */

      collapsed: !State.pendingThemeImport
    })

    const manager = Atelier.ThemeManager

    const intro = createElement(
      'div',
      'furina-portable-help',
      'Share visual themes as versioned Furina JSON. Imports are validated before anything is changed.'
    )

    // Export

    const exportLabel = createElement(
      'div',
      'furina-panel-group-label',
      'Export Theme'
    )

    const exportName = document.createElement('input')

    exportName.type = 'text'

    exportName.maxLength = 60

    exportName.className = 'furina-text-input'

    exportName.placeholder = 'Theme name'

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
      const json = manager.serializeThemeExport(exportName.value)

      try {
        await navigator.clipboard.writeText(json)

        exportStatus.textContent = 'Theme JSON copied.'
      } catch (error) {
        exportStatus.textContent = 'Clipboard access failed.'
      }
    })

    downloadExport.addEventListener('click', () => {
      const exportObject = manager.createThemeExport(exportName.value)

      const json = JSON.stringify(exportObject, null, 2)

      const blob = new Blob([json], {
        type: 'application/json'
      })

      const url = URL.createObjectURL(blob)

      const safeName =
        exportObject.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'furina-theme'

      const link = document.createElement('a')

      link.href = url

      link.download = `${safeName}.furina-theme.json`

      document.body.appendChild(link)

      link.click()

      link.remove()

      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 0)

      exportStatus.textContent = 'Theme file created.'
    })

    exportActions.append(copyExport, downloadExport)

    // Import

    const importLabel = createElement(
      'div',
      'furina-panel-group-label',
      'Import Theme'
    )

    const importBox = document.createElement('textarea')

    importBox.className = 'furina-import-textarea'

    importBox.maxLength = 1000000

    importBox.placeholder = 'Paste Furina theme JSON here…'

    const inspectImport = createElement(
      'button',
      'furina-secondary-button',
      'Preview Import'
    )

    inspectImport.type = 'button'

    const importStatus = createElement('div', 'furina-portable-status')

    inspectImport.addEventListener('click', () => {
      const result = manager.parseThemeImport(importBox.value)

      if (!result.ok) {
        if (State.themeBeforeImportPreview) {
          manager.restorePreviewTheme(State.themeBeforeImportPreview)
        }

        State.pendingThemeImport = null

        State.themeBeforeImportPreview = null

        importStatus.textContent = result.error

        return
      }

      if (Atelier.SetupManager?.previewBackup) {
        Atelier.SetupManager.revertPreview()

        State.pendingSetupImport = null
      }

      /*
                    Capture the exact current theme only once.

                    If the user previews several imports in a row, Cancel
                    should still restore the theme they had before previewing.
                */

      if (!State.themeBeforeImportPreview) {
        State.themeBeforeImportPreview = {
          ...manager.settings
        }
      }

      State.pendingThemeImport = result.payload

      const previewed = manager.previewImportedTheme(State.pendingThemeImport)

      if (!previewed) {
        if (State.themeBeforeImportPreview) {
          manager.restorePreviewTheme(State.themeBeforeImportPreview)
        }

        State.pendingThemeImport = null

        State.themeBeforeImportPreview = null

        importStatus.textContent = 'Could not preview this theme.'

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
      inspectImport,
      importStatus
    )

    // Import preview

    if (State.pendingThemeImport) {
      const preview = createElement('div', 'furina-import-preview')

      const previewTitle = createElement(
        'div',
        'furina-import-preview-title',
        State.pendingThemeImport.name
      )

      const settingCount = Object.keys(State.pendingThemeImport.theme).length

      const previewMeta = createElement(
        'div',
        'furina-import-preview-meta',
        `Furina theme v${State.pendingThemeImport.version} • ${settingCount} validated setting${
          settingCount === 1 ? '' : 's'
        }`
      )

      const target =
        manager.scope === 'conversation'
          ? 'this conversation'
          : 'your global theme'

      const previewTarget = createElement(
        'div',
        'furina-import-preview-target',
        `Previewing on ${target}. Nothing has been saved yet.`
      )

      const previewActions = createElement('div', 'furina-portable-action-grid')

      const applyImport = createElement(
        'button',
        'furina-secondary-button furina-import-apply',
        'Keep Theme'
      )

      const cancelImport = createElement(
        'button',
        'furina-secondary-button',
        'Revert'
      )

      applyImport.type = 'button'

      cancelImport.type = 'button'

      applyImport.addEventListener('click', async () => {
        if (!State.pendingThemeImport) {
          return
        }

        /*
                        The preview is already active in memory.

                        Saving here commits exactly what the user is seeing
                        to the current Theme Scope.
                    */

        await manager.save()

        State.pendingThemeImport = null

        State.themeBeforeImportPreview = null

        Atelier.PanelShell.rebuild()
      })

      cancelImport.addEventListener('click', () => {
        if (State.themeBeforeImportPreview) {
          manager.restorePreviewTheme(State.themeBeforeImportPreview)
        }

        State.pendingThemeImport = null

        State.themeBeforeImportPreview = null

        Atelier.PanelShell.rebuild()
      })

      previewActions.append(applyImport, cancelImport)

      preview.append(previewTitle, previewMeta, previewTarget, previewActions)

      section.furinaContent.appendChild(preview)
    }

    return section
  }

  Sections.createSharingSection = createSharingSection
})()
