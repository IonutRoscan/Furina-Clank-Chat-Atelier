'use strict'


/*
  Developer notes

  Atmosphere panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Atmosphere Panel Section

    Renders the existing visual-atmosphere controls and presets.
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

  // Atmosphere

  function createAtmosphereSection() {
    const section = createSection('Atmosphere', {collapsed: true})
    const manager = Atelier.AtmosphereManager

    if (!manager) {
      section.furinaContent.appendChild(
        createElement(
          'div',
          'furina-portable-empty',
          'Atmosphere engine unavailable.'
        )
      )
      return section
    }

    const intro = createElement(
      'div',
      'furina-atmosphere-help',
      'Add subtle environmental effects above the chat background.'
    )

    const presetLabel = createElement(
      'div',
      'furina-panel-group-label',
      'Quick Presets'
    )

    const presetGrid = createElement('div', 'furina-preset-grid')

    const presetIcons = {
      rainyNight: '🌧',

      snowfall: '❄',

      emberRoom: '🔥',

      arcaneGlow: '✨',

      dreamFog: '☁',

      subtleMotes: '✦',

      crt: '📺',

      oldFilm: '🎞'
    }

    for (const [id, preset] of Object.entries(manager.PRESETS)) {
      const button = createElement('button', 'furina-preset')

      button.type = 'button'

      const icon = createElement(
        'span',
        'furina-preset-swatch',
        presetIcons[id] || '✦'
      )

      /*
                Theme preset swatches normally contain a color.

                Atmosphere uses the same compact card layout, but the
                swatch becomes a small centered icon instead.
            */

      icon.style.background = 'rgba(255,255,255,0.06)'

      icon.style.display = 'inline-flex'

      icon.style.alignItems = 'center'

      icon.style.justifyContent = 'center'

      icon.style.width = '22px'

      icon.style.height = '22px'

      icon.style.fontSize = '11px'

      const name = createElement('span', 'furina-preset-name', preset.name)

      button.append(icon, name)

      button.addEventListener('click', async () => {
        await manager.applyPreset(id)

        Atelier.PanelShell.rebuild()
      })

      presetGrid.appendChild(button)
    }

    const enabledRow = createElement('label', 'furina-toggle-row')
    const enabledText = createElement('div')
    enabledText.append(
      createElement('div', 'furina-toggle-title', 'Atmosphere'),
      createElement(
        'div',
        'furina-toggle-description',
        'Enable visual ambience for this conversation.'
      )
    )
    const enabled = document.createElement('input')
    enabled.type = 'checkbox'
    enabled.className = 'furina-checkbox'
    enabled.checked = manager.settings.enabled
    enabled.addEventListener('change', async () => {
      await manager.update('enabled', enabled.checked)
      Atelier.PanelShell.rebuild()
    })
    enabledRow.append(enabledText, enabled)

    const options = createElement('div', 'furina-atmosphere-options')
    if (!manager.settings.enabled) {
      options.classList.add('furina-atmosphere-options-disabled')
    }

    const effectControl = createElement('label', 'furina-select-control')
    const effectLabel = createElement('span', 'furina-control-label', 'Effect')
    const effect = document.createElement('select')
    effect.className = 'furina-select'
    for (const [value, label] of [
      ['motes', '✦ Drifting Motes'],

      ['rain', '🌧 Layered Rain'],

      ['fog', '☁ Fog'],

      ['snow', '❄ Snow'],

      ['embers', '🔥 Embers'],

      ['sparkles', '✨ Magic Sparkles'],

      ['grain', '📼 Film Grain'],

      ['scanlines', '🖥 Scanlines']
    ]) {
      const option = document.createElement('option')
      option.value = value
      option.textContent = label
      effect.appendChild(option)
    }
    effect.value = manager.settings.effect
    effect.addEventListener('change', async () => {
      await manager.update('effect', effect.value)
    })
    effectControl.append(effectLabel, effect)

    function makeRange(labelText, key, min, max, step, format) {
      const wrapper = createElement('div', 'furina-control')
      const header = createElement('div', 'furina-control-header')
      const label = createElement('span', 'furina-control-label', labelText)
      const value = createElement(
        'span',
        'furina-control-value',
        format(manager.settings[key])
      )
      const input = document.createElement('input')
      input.type = 'range'
      input.className = 'furina-range'
      input.min = String(min)
      input.max = String(max)
      input.step = String(step)
      input.value = String(manager.settings[key])
      input.addEventListener('input', () => {
        const next = Number(input.value)
        value.textContent = format(next)
        manager.update(key, next)
      })
      header.append(label, value)
      wrapper.append(header, input)
      return wrapper
    }

    const intensity = makeRange(
      'Intensity',
      'intensity',
      0.05,
      1,
      0.05,
      value => `${Math.round(value * 100)}%`
    )

    const speed = makeRange(
      'Motion speed',
      'speed',
      0.25,
      2.5,
      0.25,
      value => `${value.toFixed(2)}×`
    )

    const note = createElement(
      'div',
      'furina-atmosphere-note',
      'Effects are intentionally subtle so text stays readable.'
    )

    const reset = createElement(
      'button',
      'furina-secondary-button',
      'Turn Atmosphere Off'
    )

    reset.type = 'button'

    reset.addEventListener('click', async () => {
      await manager.reset()

      Atelier.PanelShell.rebuild()
    })
    options.append(effectControl, intensity, speed, note, reset)
    section.furinaContent.append(
      intro,
      presetLabel,
      presetGrid,
      enabledRow,
      options
    )
    return section
  }

  Sections.createAtmosphereSection = createAtmosphereSection
})()
