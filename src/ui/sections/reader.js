'use strict'


/*
  Developer notes

  Reader panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Reader Panel Section

    Renders Reader Mode and Focus Mode controls.
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

  // Reader mode

  function createReaderSection() {
    const section = createSection('Reader Mode')

    const manager = Atelier.ReaderManager

    if (!manager) {
      const unavailable = createElement(
        'div',
        'furina-sticker-empty',
        'Reader engine unavailable.'
      )

      section.furinaContent.appendChild(unavailable)

      return section
    }

    const intro = createElement(
      'div',
      'furina-reader-help',
      'Turn this conversation into a cleaner long-form reading view.'
    )

    function createReaderToggle(titleText, descriptionText, key) {
      const row = createElement(
        'label',
        'furina-toggle-row furina-reader-toggle'
      )

      const text = createElement('div')

      const title = createElement('div', 'furina-toggle-title', titleText)

      const description = createElement(
        'div',
        'furina-toggle-description',
        descriptionText
      )

      const checkbox = document.createElement('input')

      checkbox.type = 'checkbox'

      checkbox.className = 'furina-checkbox'

      checkbox.checked = Boolean(manager.settings[key])

      checkbox.addEventListener('change', async () => {
        await manager.update(key, checkbox.checked)

        if (key === 'enabled') {
          Atelier.PanelShell.rebuild()
        }
      })

      text.append(title, description)

      row.append(text, checkbox)

      return row
    }

    const enabled = createReaderToggle(
      'Reader Mode',
      'Enable the clean reading view for this conversation.',
      'enabled'
    )

    const options = createElement('div', 'furina-reader-options')

    const hideComposer = createReaderToggle(
      'Hide composer',
      'Hide the message box while reading.',
      'hideComposer'
    )

    const hideAvatars = createReaderToggle(
      'Hide avatars',
      'Remove character avatars from the transcript.',
      'hideAvatars'
    )

    const hideActions = createReaderToggle(
      'Hide message controls',
      'Remove edit, continue, reaction, and branch controls.',
      'hideActions'
    )

    const hideSidebar = createReaderToggle(
      'Hide sidebar',
      'Hide Clank navigation while reading.',
      'hideSidebar'
    )

    const wideLayout = createReaderToggle(
      'Wide reading column',
      'Give long replies more horizontal breathing room.',
      'wideLayout'
    )

    const cleanSpacing = createReaderToggle(
      'Reading spacing',
      'Use calmer spacing between messages and paragraphs.',
      'cleanSpacing'
    )

    options.append(
      hideComposer,
      hideAvatars,
      hideActions,
      hideSidebar,
      wideLayout,
      cleanSpacing
    )

    if (!manager.settings.enabled) {
      options.classList.add('furina-reader-options-disabled')
    }

    const focusArea = createElement('div', 'furina-reader-focus-area')

    const focusButton = createElement(
      'button',
      'furina-secondary-button furina-reader-focus-button',
      'Enter Focus Mode'
    )

    focusButton.type = 'button'

    focusButton.addEventListener('click', () => {
      manager.enterFocusMode()
    })

    const focusHelp = createElement(
      'div',
      'furina-reader-focus-help',
      'Temporarily hides Clank and Furina UI for a clean reading or screenshot view. Press Escape to exit.'
    )

    focusArea.append(focusButton, focusHelp)

    section.furinaContent.append(intro, enabled, options, focusArea)

    return section
  }

  Sections.createReaderSection = createReaderSection
})()
