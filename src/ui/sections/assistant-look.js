'use strict'


/*
  Developer notes

  Assistant Look panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Assistant Appearance Panel Section

    Renders assistant bubble presentation controls.
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

  // ASSISTANT SECTION

  function createAssistantSection() {
    const section = createSection('Assistant', {
      collapsed: true
    })

    const bubbleColor = createColorControl(
      'Bubble color',
      'assistantBackground'
    )

    const textColor = createColorControl('Text color', 'assistantText')

    const radius = createRangeControl({
      label: 'Radius',

      key: 'assistantRadius',

      min: 0,

      max: 32,

      step: 1,

      format: value => `${value}px`
    })

    const paddingX = createRangeControl({
      label: 'Horizontal padding',

      key: 'assistantPaddingX',

      min: 4,

      max: 32,

      step: 1,

      format: value => `${value}px`
    })

    const paddingY = createRangeControl({
      label: 'Vertical padding',

      key: 'assistantPaddingY',

      min: 2,

      max: 24,

      step: 1,

      format: value => `${value}px`
    })

    const opacity = createRangeControl({
      label: 'Opacity',

      key: 'assistantOpacity',

      min: 0.1,

      max: 1,

      step: 0.05,

      format: value => `${Math.round(value * 100)}%`
    })

    const borderWidth = createRangeControl({
      label: 'Border width',

      key: 'assistantBorderWidth',

      min: 0,

      max: 8,

      step: 1,

      format: value => `${value}px`
    })

    const borderColor = createColorControl(
      'Border color',
      'assistantBorderColor'
    )

    const shadow = createRangeControl({
      label: 'Shadow',

      key: 'assistantShadow',

      min: 0,

      max: 1,

      step: 0.05,

      format: value => `${Math.round(value * 100)}%`
    })

    section.furinaContent.append(
      bubbleColor.wrapper,
      textColor.wrapper,
      radius.wrapper,
      paddingX.wrapper,
      paddingY.wrapper,
      opacity.wrapper,
      borderWidth.wrapper,
      borderColor.wrapper,
      shadow.wrapper
    )

    return section
  }

  Sections.createAssistantSection = createAssistantSection
})()
