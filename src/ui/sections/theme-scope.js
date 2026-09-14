'use strict'


/*
  Developer notes

  Theme Scope panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Theme Scope Panel Section

    Shows whether the current conversation inherits the global theme or owns a conversation-specific override.
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

  // Theme scope

  function createScopeSection() {
    const section = createSection('Theme Scope')

    const manager = Atelier.ThemeManager

    const card = createElement('div', 'furina-scope-card')

    const text = createElement('div', 'furina-scope-text')

    const title = createElement('div', 'furina-scope-title')

    const description = createElement('div', 'furina-scope-description')

    const button = createElement('button', 'furina-secondary-button')

    button.type = 'button'

    if (manager.scope === 'conversation') {
      title.textContent = 'This Conversation'

      description.textContent = 'Changes only affect this chat thread.'

      button.textContent = 'Use global theme'

      button.addEventListener('click', async () => {
        if (State.pendingThemeImport && State.themeBeforeImportPreview) {
          manager.restorePreviewTheme(State.themeBeforeImportPreview)

          State.pendingThemeImport = null

          State.themeBeforeImportPreview = null
        }

        if (Atelier.SetupManager?.previewBackup) {
          Atelier.SetupManager.revertPreview()

          State.pendingSetupImport = null
        }

        await manager.useGlobalTheme()

        Atelier.PanelShell.rebuild()
      })
    } else {
      title.textContent = 'Global'

      description.textContent = 'This conversation inherits your global theme.'

      button.textContent = 'Customize this conversation'

      button.addEventListener('click', async () => {
        if (State.pendingThemeImport && State.themeBeforeImportPreview) {
          manager.restorePreviewTheme(State.themeBeforeImportPreview)

          State.pendingThemeImport = null

          State.themeBeforeImportPreview = null
        }

        if (Atelier.SetupManager?.previewBackup) {
          Atelier.SetupManager.revertPreview()

          State.pendingSetupImport = null
        }

        await manager.enableConversationTheme()

        Atelier.PanelShell.rebuild()
      })
    }

    text.append(title, description)

    card.appendChild(text)

    section.furinaContent.append(card, button)

    return section
  }

  Sections.createScopeSection = createScopeSection
})()
