'use strict'


/*
  Developer notes

  Defines temporary panel state and reusable control builders. Persistent feature
  settings belong to their feature managers, not here. Panel state should always
  include safe synchronous defaults because rendering can begin before async
  storage restoration completes.
*/
/*
    Panel Context

    Shared state and small UI helpers used by the Atelier Workspace.

    Feature managers own the actual saved settings. This file only owns
    temporary panel state such as import previews, the active workspace, and
    reusable form-control builders.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  const State = (Atelier.PanelState = {
    pendingThemeImport: null,
    themeBeforeImportPreview: null,
    pendingSetupImport: null,
    setupImportSelection: {
      theme: true,
      reader: true,
      stickers: true,
      atmosphere: true,
      ambience: true
    },
    ui: {
      viewScroll: {}
    },
    continuityEditingId: null,
    director2EditingCueId: null,
    director2EditingKnowledgeId: null,
    storyEditingRecapId: null,
    storyEditingEventId: null,
    pendingStoryBibleImport: null,
    essentialsNavigation: {
      workspace: 'home',
      loaded: false
    },
    navigation: {
      workspace: 'home',
      tools: {
        look: 'themes',
        scene: 'atmosphere',
        continuity: 'vault',
        story: 'start',
        share: 'theme',
        tools: 'css'
      },
      lastNonHome: {
        workspace: 'look',
        tool: 'themes'
      },
      loaded: false
    }
  })

  let sectionIdCounter = 0

  // HELPERS

  function createElement(tag, className = '', text = '') {
    const element = document.createElement(tag)

    if (className) {
      element.className = className
    }

    if (text) {
      element.textContent = text
    }

    return element
  }

  // RANGE CONTROL

  function createRangeControl(config) {
    const wrapper = createElement('div', 'furina-control')

    const header = createElement('div', 'furina-control-header')

    const label = createElement(
      'span',
      'furina-control-label',
      Atelier.I18n?.t?.(config.label) || config.label
    )

    const value = createElement('span', 'furina-control-value')

    header.append(label, value)

    const input = document.createElement('input')

    input.type = 'range'

    input.className = 'furina-range'

    input.min = String(config.min)

    input.max = String(config.max)

    input.step = String(config.step)

    input.value = String(Atelier.ThemeManager.settings[config.key])

    function updateValue() {
      const current = Number(input.value)

      value.textContent = config.format
        ? config.format(current)
        : String(current)
    }

    updateValue()

    input.addEventListener('input', () => {
      const newValue = Number(input.value)

      updateValue()

      Atelier.ThemeManager.update(config.key, newValue)
    })

    wrapper.append(header, input)

    return {
      wrapper,
      input
    }
  }

  // TEXT CONTROL

  function createTextControl(config) {
    const wrapper = createElement('label', 'furina-text-control')

    const label = createElement(
      'span',
      'furina-control-label',
      Atelier.I18n?.t?.(config.label) || config.label
    )

    const input = document.createElement('input')

    input.type = 'text'

    input.className = 'furina-text-input'

    input.placeholder =
      Atelier.I18n?.t?.(config.placeholder || '') || config.placeholder || ''

    input.value = Atelier.ThemeManager.settings[config.key] || ''

    function saveValue() {
      Atelier.ThemeManager.update(config.key, input.value.trim())
    }

    input.addEventListener('change', saveValue)

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        input.blur()
      }
    })

    wrapper.append(label, input)

    return {
      wrapper,
      input
    }
  }

  // SELECT CONTROL

  function createSelectControl(config) {
    const wrapper = createElement('label', 'furina-select-control')

    const label = createElement(
      'span',
      'furina-control-label',
      Atelier.I18n?.t?.(config.label) || config.label
    )

    const select = document.createElement('select')

    select.className = 'furina-select'

    for (const optionConfig of config.options) {
      const option = document.createElement('option')

      option.value = optionConfig.value

      option.textContent =
        Atelier.I18n?.t?.(optionConfig.label) || optionConfig.label

      select.appendChild(option)
    }

    select.value = Atelier.ThemeManager.settings[config.key]

    select.addEventListener('change', () => {
      Atelier.ThemeManager.update(config.key, select.value)
    })

    wrapper.append(label, select)

    return {
      wrapper,
      select
    }
  }

  // COLOR CONTROL

  function createColorControl(labelText, key) {
    const wrapper = createElement('label', 'furina-color-control')

    const label = createElement(
      'span',
      'furina-control-label',
      Atelier.I18n?.t?.(labelText) || labelText
    )

    const right = createElement('div', 'furina-color-right')

    const textInput = document.createElement('input')

    textInput.type = 'text'

    textInput.className = 'furina-color-text'

    textInput.value = Atelier.ThemeManager.settings[key]

    const picker = document.createElement('input')

    picker.type = 'color'

    picker.className = 'furina-color-picker'

    picker.value = Atelier.ThemeManager.settings[key]

    picker.addEventListener('input', () => {
      textInput.value = picker.value

      Atelier.ThemeManager.update(key, picker.value)
    })

    textInput.addEventListener('change', () => {
      const value = textInput.value.trim()

      if (/^#[0-9a-fA-F]{6}$/.test(value)) {
        picker.value = value

        Atelier.ThemeManager.update(key, value)
      } else {
        textInput.value = Atelier.ThemeManager.settings[key]
      }
    })

    right.append(textInput, picker)

    wrapper.append(label, right)

    return {
      wrapper,
      picker,
      textInput
    }
  }

  // SECTION

  function createSection(title, options = {}) {
    const section = createElement('section', 'furina-section')

    section.dataset.furinaSection = title

    const header = createElement('button', 'furina-section-header')

    header.type = 'button'

    const contentId = `furina-section-content-${++sectionIdCounter}`

    header.setAttribute('aria-controls', contentId)

    const heading = createElement(
      'span',
      'furina-section-title',
      Atelier.I18n?.t?.(title) || title
    )

    const arrow = createElement('span', 'furina-section-arrow', '⌄')

    header.append(heading, arrow)

    const content = createElement('div', 'furina-section-content')

    content.id = contentId

    arrow.setAttribute('aria-hidden', 'true')

    /*
            Sections are closed by default.

            A specific section may opt into being open by passing:
            {
                collapsed: false
            }
        */

    if (options.collapsed !== false) {
      section.classList.add('furina-section-collapsed')
    }

    function syncExpandedState() {
      header.setAttribute(
        'aria-expanded',
        String(!section.classList.contains('furina-section-collapsed'))
      )
    }

    syncExpandedState()

    header.addEventListener('click', () => {
      section.classList.toggle('furina-section-collapsed')

      syncExpandedState()
    })

    section.append(header, content)

    section.furinaContent = content

    return section
  }

  Atelier.PanelUI = {
    createElement,
    createRangeControl,
    createTextControl,
    createSelectControl,
    createColorControl,
    createSection
  }

  Atelier.PanelSections = Atelier.PanelSections || {}
})()
