'use strict'


/*
  Developer notes

  Typography panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Typography Panel Section

    Renders font, scale, line-height, and paragraph-spacing controls.
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

  // TYPOGRAPHY SECTION

  function createTypographySection() {
    const section = createSection('Typography', {
      collapsed: true
    })

    const messageFont = createSelectControl({
      label: 'Message font',

      key: 'messageFontFamily',

      options: [
        {
          label: 'System UI',

          value:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        },

        {
          label: 'Arial',

          value: 'Arial, Helvetica, sans-serif'
        },

        {
          label: 'Trebuchet',

          value: '"Trebuchet MS", Verdana, sans-serif'
        },

        {
          label: 'Georgia',

          value: 'Georgia, "Times New Roman", serif'
        },

        {
          label: 'Palatino',

          value: '"Palatino Linotype", Palatino, "Book Antiqua", serif'
        },

        {
          label: 'Courier',

          value: '"Courier New", Courier, monospace'
        }
      ]
    })

    const headingFont = createSelectControl({
      label: 'Heading font',

      key: 'headingFontFamily',

      options: [
        {
          label: 'System UI',

          value:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        },

        {
          label: 'Arial',

          value: 'Arial, Helvetica, sans-serif'
        },

        {
          label: 'Trebuchet',

          value: '"Trebuchet MS", Verdana, sans-serif'
        },

        {
          label: 'Georgia',

          value: 'Georgia, "Times New Roman", serif'
        },

        {
          label: 'Palatino',

          value: '"Palatino Linotype", Palatino, "Book Antiqua", serif'
        },

        {
          label: 'Impact',

          value: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif'
        },

        {
          label: 'Courier',

          value: '"Courier New", Courier, monospace'
        }
      ]
    })

    const codeFont = createSelectControl({
      label: 'Code font',

      key: 'codeFontFamily',

      options: [
        {
          label: 'System monospace',

          value:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
        },

        {
          label: 'Consolas',

          value: 'Consolas, "Liberation Mono", monospace'
        },

        {
          label: 'Courier New',

          value: '"Courier New", Courier, monospace'
        },

        {
          label: 'Lucida Console',

          value: '"Lucida Console", Monaco, monospace'
        }
      ]
    })

    const fontSize = createRangeControl({
      label: 'Message font size',

      key: 'fontSize',

      min: 12,

      max: 24,

      step: 1,

      format: value => `${value}px`
    })

    const headingScale = createRangeControl({
      label: 'Heading scale',

      key: 'headingScale',

      min: 0.7,

      max: 1.6,

      step: 0.05,

      format: value => `${Math.round(value * 100)}%`
    })

    const codeFontSize = createRangeControl({
      label: 'Code font size',

      key: 'codeFontSize',

      min: 10,

      max: 20,

      step: 1,

      format: value => `${value}px`
    })

    const lineHeight = createRangeControl({
      label: 'Line height',

      key: 'lineHeight',

      min: 1.2,

      max: 2,

      step: 0.05,

      format: value => value.toFixed(2)
    })

    const paragraph = createRangeControl({
      label: 'Paragraph spacing',

      key: 'paragraphSpacing',

      min: 0,

      max: 28,

      step: 1,

      format: value => `${value}px`
    })

    section.furinaContent.append(
      messageFont.wrapper,
      headingFont.wrapper,
      codeFont.wrapper,
      fontSize.wrapper,
      headingScale.wrapper,
      codeFontSize.wrapper,
      lineHeight.wrapper,
      paragraph.wrapper
    )

    return section
  }

  Sections.createTypographySection = createTypographySection
})()
