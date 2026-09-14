'use strict'


/*
  Developer notes

  User Look panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    User Appearance Panel Section

    Renders user bubble presentation controls.
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

  // USER SECTION

  function createUserSection() {
    const section = createSection('You', {
      collapsed: true
    })

    const bubbleColor = createColorControl('Bubble color', 'userBackground')

    const textColor = createColorControl('Text color', 'userText')

    const radius = createRangeControl({
      label: 'Radius',

      key: 'userRadius',

      min: 0,

      max: 32,

      step: 1,

      format: value => `${value}px`
    })

    const paddingX = createRangeControl({
      label: 'Horizontal padding',

      key: 'userPaddingX',

      min: 4,

      max: 32,

      step: 1,

      format: value => `${value}px`
    })

    const paddingY = createRangeControl({
      label: 'Vertical padding',

      key: 'userPaddingY',

      min: 2,

      max: 24,

      step: 1,

      format: value => `${value}px`
    })

    const opacity = createRangeControl({
      label: 'Opacity',

      key: 'userOpacity',

      min: 0.1,

      max: 1,

      step: 0.05,

      format: value => `${Math.round(value * 100)}%`
    })

    const borderWidth = createRangeControl({
      label: 'Border width',

      key: 'userBorderWidth',

      min: 0,

      max: 8,

      step: 1,

      format: value => `${value}px`
    })

    const borderColor = createColorControl('Border color', 'userBorderColor')

    const shadow = createRangeControl({
      label: 'Shadow',

      key: 'userShadow',

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

  Sections.createUserSection = createUserSection
})()
