'use strict'


/*
  Developer notes

  Advanced panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Tools Workspace Sections

    The old panel grouped Custom CSS, diagnostics, and reset controls inside
    one long "Advanced" accordion. The Atelier Workspace gives each of those
    jobs its own page, so this module exposes three small section builders.
*/
;(() => {
  const Atelier = window.ClankAtelier
  const UI = Atelier.PanelUI
  const Sections = Atelier.PanelSections

  const {createElement, createSection} = UI

  function createAdvancedCssSection() {
    const section = createSection('Custom CSS', {collapsed: false})
    const cssManager = Atelier.AdvancedCssManager

    section.furinaContent.append(
      createElement(
        'div',
        'furina-portable-help',
        'Add conversation-specific cosmetic CSS. Furina scopes it to the chat area so it does not normally affect the rest of Clank.'
      ),
      createElement(
        'div',
        'furina-atmosphere-note',
        'Advanced feature: invalid or aggressive CSS can make the chat look broken. Furina blocks several unsafe/global at-rules, but this editor is still intended for users comfortable with CSS.'
      )
    )

    if (!cssManager) {
      section.furinaContent.appendChild(
        createElement(
          'div',
          'furina-portable-empty',
          'Advanced CSS engine unavailable.'
        )
      )
      return section
    }

    const cssEnabledRow = createElement('label', 'furina-toggle-row')
    const cssEnabledText = createElement('div')
    cssEnabledText.append(
      createElement('div', 'furina-toggle-title', 'Enable Custom CSS'),
      createElement(
        'div',
        'furina-toggle-description',
        'Apply the saved CSS to this conversation.'
      )
    )

    const cssEnabled = document.createElement('input')
    cssEnabled.type = 'checkbox'
    cssEnabled.className = 'furina-checkbox'
    cssEnabled.checked = Boolean(cssManager.settings.enabled)
    cssEnabledRow.append(cssEnabledText, cssEnabled)

    const livePreviewRow = createElement('label', 'furina-toggle-row')
    const livePreviewText = createElement('div')
    livePreviewText.append(
      createElement('div', 'furina-toggle-title', 'Live Preview'),
      createElement(
        'div',
        'furina-toggle-description',
        'Preview valid CSS while typing without saving it.'
      )
    )

    const livePreview = document.createElement('input')
    livePreview.type = 'checkbox'
    livePreview.className = 'furina-checkbox'
    livePreview.checked = false
    livePreviewRow.append(livePreviewText, livePreview)

    const cssEditor = document.createElement('textarea')
    cssEditor.className = 'furina-import-textarea furina-css-editor'
    cssEditor.placeholder = [
      '.clank-atelier-message-assistant {',
      '    letter-spacing: 0.02em;',
      '}',
      '',
      '.clank-atelier-message-user {',
      '    font-style: italic;',
      '}'
    ].join('\n')
    cssEditor.value = cssManager.settings.css
    cssEditor.spellcheck = false

    const cssCount = createElement('div', 'furina-portable-status')
    const cssStatus = createElement('div', 'furina-portable-status')

    function updateCssCount() {
      cssCount.textContent = `${cssEditor.value.length.toLocaleString()} / 30,000 characters`
    }

    function showPreviewResult(result) {
      if (!result.ok) {
        cssStatus.textContent = result.error
        return false
      }

      cssStatus.textContent = 'Previewing unsaved CSS.'
      return true
    }

    updateCssCount()

    cssEditor.addEventListener('input', () => {
      updateCssCount()

      if (!livePreview.checked) {
        return
      }

      showPreviewResult(cssManager.previewCss(cssEditor.value))
    })

    livePreview.addEventListener('change', () => {
      if (livePreview.checked) {
        const valid = showPreviewResult(cssManager.previewCss(cssEditor.value))

        if (!valid) {
          livePreview.checked = false
        }
        return
      }

      cssManager.revertPreview()
      cssStatus.textContent = 'Preview reverted.'
    })

    cssEnabled.addEventListener('change', async () => {
      await cssManager.setEnabled(cssEnabled.checked)
      cssStatus.textContent = cssEnabled.checked
        ? 'Custom CSS enabled.'
        : 'Custom CSS disabled.'

      Atelier.PanelShell?.refreshNavigation?.()
    })

    const primaryActions = createElement('div', 'furina-portable-action-grid')
    const previewCss = createElement(
      'button',
      'furina-secondary-button',
      'Preview CSS'
    )
    const saveCss = createElement(
      'button',
      'furina-secondary-button',
      'Save CSS'
    )
    previewCss.type = 'button'
    saveCss.type = 'button'

    previewCss.addEventListener('click', () => {
      showPreviewResult(cssManager.previewCss(cssEditor.value))
    })

    saveCss.addEventListener('click', async () => {
      const result = await cssManager.setCss(cssEditor.value)

      if (!result.ok) {
        cssStatus.textContent = result.error
        return
      }

      livePreview.checked = false
      cssStatus.textContent = cssManager.settings.enabled
        ? 'Custom CSS saved and active.'
        : 'Custom CSS saved. Enable it when ready.'
    })

    primaryActions.append(previewCss, saveCss)

    const secondaryActions = createElement('div', 'furina-portable-action-grid')
    const revertCss = createElement(
      'button',
      'furina-secondary-button',
      'Revert Preview'
    )
    const resetCss = createElement(
      'button',
      'furina-danger-button',
      'Reset Custom CSS'
    )
    revertCss.type = 'button'
    resetCss.type = 'button'

    revertCss.addEventListener('click', () => {
      cssManager.revertPreview()
      cssEditor.value = cssManager.settings.css
      livePreview.checked = false
      updateCssCount()
      cssStatus.textContent = 'Returned to the saved CSS.'
    })

    resetCss.addEventListener('click', async () => {
      if (
        !Atelier.I18n.confirm(
          'Clear the saved Custom CSS for this conversation?'
        )
      ) {
        return
      }

      await cssManager.reset()
      cssEditor.value = ''
      livePreview.checked = false
      cssEnabled.checked = false
      updateCssCount()
      cssStatus.textContent = 'Custom CSS reset.'
      Atelier.PanelShell?.refreshNavigation?.()
    })

    secondaryActions.append(revertCss, resetCss)

    section.furinaContent.append(
      cssEnabledRow,
      livePreviewRow,
      cssEditor,
      cssCount,
      primaryActions,
      secondaryActions,
      cssStatus
    )

    return section
  }

  function createDiagnosticsSection() {
    const section = createSection('Diagnostics', {collapsed: false})

    section.furinaContent.appendChild(
      createElement(
        'div',
        'furina-portable-help',
        'Create a compact DOM report when Clank changes its chat layout or a Furina selector stops matching. The report is copied locally to your clipboard.'
      )
    )

    const copyScan = createElement(
      'button',
      'furina-secondary-button',
      'Copy DOM report'
    )
    copyScan.type = 'button'

    const status = createElement('div', 'furina-portable-status')

    copyScan.addEventListener('click', async () => {
      if (!Atelier.scanPage || !Atelier.formatReport) {
        status.textContent = 'Scanner unavailable.'
        return
      }

      const text = Atelier.formatReport(Atelier.scanPage())

      try {
        await navigator.clipboard.writeText(text)
        status.textContent = 'DOM report copied.'
      } catch (error) {
        status.textContent = 'Clipboard access is unavailable.'
      }
    })

    section.furinaContent.append(copyScan, status)
    return section
  }

  function createResetSection() {
    const section = createSection('Reset', {collapsed: false})

    section.furinaContent.appendChild(
      createElement(
        'div',
        'furina-atmosphere-note furina-reset-warning',
        'Reset actions are kept here so destructive controls are separated from everyday customization.'
      )
    )

    const resetTheme = createElement(
      'button',
      'furina-danger-button',
      'Reset current theme'
    )
    resetTheme.type = 'button'

    const status = createElement('div', 'furina-portable-status')

    resetTheme.addEventListener('click', async () => {
      const target =
        Atelier.ThemeManager.scope === 'conversation'
          ? "this conversation's theme override"
          : 'your global theme'

      if (!Atelier.I18n.confirm(`Reset ${target} to Furina defaults?`)) {
        return
      }

      await Atelier.ThemeManager.reset()
      status.textContent = 'Theme reset to defaults.'
      Atelier.PanelShell?.rebuild?.()
    })

    section.furinaContent.append(resetTheme, status)
    return section
  }

  /*
        Compatibility helper for older internal callers. The new workspace
        router uses the three focused builders above.
    */
  function createAdvancedSection() {
    const section = createSection('Advanced', {collapsed: false})
    const css = createAdvancedCssSection()
    const diagnostics = createDiagnosticsSection()
    const reset = createResetSection()

    for (const item of [css, diagnostics, reset]) {
      const header = item.querySelector?.(':scope > .furina-section-header')
      header?.remove()
      section.furinaContent.appendChild(item)
    }

    return section
  }

  Sections.createAdvancedCssSection = createAdvancedCssSection
  Sections.createDiagnosticsSection = createDiagnosticsSection
  Sections.createResetSection = createResetSection
  Sections.createAdvancedSection = createAdvancedSection
})()
