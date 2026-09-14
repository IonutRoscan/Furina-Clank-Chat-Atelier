'use strict'

/*
  Developer notes

  Atelier panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
;(() => {
  const A = window.ClankAtelier
  const {createElement, createSection} = A.PanelUI
  A.PanelSections.createAtelierSection = function () {
    const section = createSection('Atelier Markup')
    section.classList.remove('furina-section-collapsed')
    const content = section.furinaContent
    content.append(
      createElement(
        'p',
        'furina-portable-help',
        'Style roleplay passages, cards and selected words. These preferences apply to all chats.'
      )
    )
    const inputs = {}
    const rows = [
      [
        'composer',
        'Show Atelier composer tools',
        'Add the formatting picker and live preview above your message field.'
      ],
      [
        'rendering',
        'Render Atelier Markup',
        'Display styled passages and widgets in messages. Turn off to read the original tags.'
      ],
      [
        'interactive',
        'Enable interactive RP widgets',
        'Allow Furina choice buttons and dice widgets to work. They never send a message automatically.'
      ]
    ]
    const status = createElement('div', 'furina-portable-status')
    status.setAttribute('role', 'status')
    for (const [key, title, description] of rows) {
      const label = createElement('label', 'furina-atelier-setting')
      const input = document.createElement('input')
      input.type = 'checkbox'
      const copy = createElement('span', '')
      copy.append(
        createElement('strong', '', title),
        createElement('small', '', description)
      )
      label.append(input, copy)
      content.append(label)
      inputs[key] = input
      input.checked = A.AtelierSettings.value[key]
      input.addEventListener('change', async () => {
        input.disabled = true
        try {
          const saved = await A.AtelierSettings.update({[key]: input.checked})
          status.textContent = saved
            ? 'Saved. Applied to your open chats.'
            : 'Could not save. Refresh Clank after reloading the extension, then try again.'
        } catch (_) {
          status.textContent =
            'Could not save this preference. Please try again.'
        }
        input.disabled = false
        section.furinaAtelierSync()
      })
    }
    section.furinaAtelierSync = () => {
      for (const [key, input] of Object.entries(inputs))
        input.checked = A.AtelierSettings.value[key]
    }
    A.AtelierSettings.bindView(section)
    A.AtelierSettings.ready.then(section.furinaAtelierSync)
    content.append(status)
    const help = document.createElement('details')
    help.className = 'furina-atelier-help'
    help.append(createElement('summary', '', 'Tag examples and usage'))
    help.append(
      createElement(
        'p',
        '',
        'Passages and cards belong on their own lines. Inline tags fit inside sentences. SFX markup is visual lettering. Story-triggered audio is configured separately in Scene → RP Sounds.'
      )
    )
    for (const def of A.AtelierMarkup.registry) {
      const attrs = Object.entries(def.attributes)
        .map(([key, value]) => ` ${key}="${value}"`)
        .join('')
      const example =
        `[f:${def.kind}${attrs}]` +
        (def.type === 'leaf' ? '' : `Example text[/f:${def.kind}]`)
      const line = createElement('pre', 'furina-atelier-example', example)
      help.append(line)
    }
    help.append(
      createElement(
        'p',
        '',
        'Spoilers and redactions only hide text visually. Choice and dice widgets only insert into your draft; they never send automatically.'
      )
    )
    content.append(help)
    return section
  }
})()
