'use strict'


/*
  Developer notes

  Rp Sfx panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Scene → RP Sounds

    Controls the conversation-scoped RP sound detector. The detector itself
    lives in RpSfxManager; this file only renders settings and test controls.
*/
;(() => {
  const A = window.ClankAtelier
  const Sections = A.PanelSections
  const {createElement, createSection} = A.PanelUI

  function toggleRow(title, description, checked, onChange) {
    const row = createElement('label', 'furina-toggle-row furina-rp-sfx-toggle')
    const text = createElement('div')
    text.append(
      createElement('div', 'furina-toggle-title', title),
      createElement('div', 'furina-toggle-description', description)
    )
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.className = 'furina-checkbox'
    input.checked = Boolean(checked)
    input.addEventListener('change', () => onChange?.(input.checked))
    row.append(text, input)
    return {row, input}
  }

  function createRange(label, value, min, max, step, formatter, onSave) {
    const root = createElement('div', 'furina-control')
    const header = createElement('div', 'furina-control-header')
    const name = createElement('span', 'furina-control-label', label)
    const display = createElement('span', 'furina-control-value')
    const input = document.createElement('input')
    input.type = 'range'
    input.className = 'furina-range'
    input.min = String(min)
    input.max = String(max)
    input.step = String(step)
    input.value = String(value)
    const sync = () => {
      display.textContent = formatter(Number(input.value))
    }
    sync()
    input.addEventListener('input', sync)
    input.addEventListener('change', () => onSave?.(Number(input.value)))
    header.append(name, display)
    root.append(header, input)
    return {root, input, display, sync}
  }

  function createRpSfxSection() {
    const section = createSection('Roleplay Sounds')
    const manager = A.RpSfxManager

    if (!manager) {
      section.furinaContent.append(
        createElement(
          'div',
          'furina-portable-help',
          'RP sound engine unavailable.'
        )
      )
      return section
    }

    const intro = createElement('div', 'furina-rp-sfx-intro')
    intro.append(
      createElement('div', 'furina-rp-sfx-kicker', 'USER-DIRECTED SFX'),
      createElement(
        'p',
        'furina-portable-help',
        'Furina can react to newly generated assistant text and can also play cues you deliberately queue from the normal composer. Existing history is ignored. Sounds never send messages or change Clank content.'
      ),
      createElement(
        'p',
        'furina-portable-help',
        'Built-in cues are procedural for now. You can replace any category with a direct audio URL and add your own trigger phrases below.'
      )
    )

    const status = createElement(
      'div',
      'furina-portable-status furina-rp-sfx-status'
    )
    status.setAttribute('role', 'status')

    const masterCard = createElement('div', 'furina-rp-sfx-card')
    masterCard.append(
      createElement('div', 'furina-rp-sfx-card-title', 'Detection')
    )

    const master = toggleRow(
      'Enable roleplay sounds',
      'Conversation-scoped and off by default. This master switch controls both automatic assistant cues and user-directed composer cues.',
      manager.settings.enabled,
      async enabled => {
        manager.unlock?.()
        const ok = await manager.update({enabled})
        status.textContent = ok
          ? enabled
            ? 'RP sounds enabled for this conversation.'
            : 'RP sounds disabled.'
          : 'Could not save RP sound setting.'
      }
    )

    const assistantDetection = toggleRow(
      'Automatic assistant detection',
      'When off, Furina will not infer sounds from assistant replies. You can still queue SFX manually from the composer while Roleplay Sounds are enabled.',
      manager.settings.assistantDetection,
      async enabled => {
        const ok = await manager.update({assistantDetection: enabled})
        status.textContent = ok
          ? enabled
            ? 'Automatic assistant detection enabled.'
            : 'Automatic assistant detection disabled; manual cues still work.'
          : 'Could not save automatic detection setting.'
      }
    )

    const volume = createRange(
      'RP SFX volume',
      manager.settings.volume,
      0,
      1,
      0.05,
      value => `${Math.round(value * 100)}%`,
      async value => {
        const ok = await manager.update({volume: value})
        status.textContent = ok
          ? 'RP SFX volume saved.'
          : 'Could not save volume.'
      }
    )

    const sensitivity = createElement('label', 'furina-text-control')
    sensitivity.append(
      createElement('span', 'furina-control-label', 'Detection sensitivity')
    )
    const sensitivitySelect = document.createElement('select')
    sensitivitySelect.className = 'furina-select'
    for (const [label, value] of [
      ['Conservative (recommended)', 'conservative'],
      ['Normal', 'normal']
    ]) {
      const option = document.createElement('option')
      option.value = value
      option.textContent = label
      sensitivitySelect.append(option)
    }
    sensitivitySelect.value = manager.settings.sensitivity
    sensitivitySelect.addEventListener('change', async () => {
      const ok = await manager.update({sensitivity: sensitivitySelect.value})
      status.textContent = ok
        ? `Detection set to ${sensitivitySelect.value}.`
        : 'Could not save detection sensitivity.'
    })
    sensitivity.append(sensitivitySelect)

    const cooldown = createRange(
      'Minimum spacing between cues',
      manager.settings.masterCooldown,
      250,
      1800,
      50,
      value => `${Math.round(value)} ms`,
      async value => {
        const ok = await manager.update({masterCooldown: value})
        status.textContent = ok
          ? 'Cue spacing saved.'
          : 'Could not save cue spacing.'
      }
    )

    masterCard.append(
      master.row,
      assistantDetection.row,
      volume.root,
      sensitivity,
      cooldown.root
    )

    const manualCard = createElement(
      'div',
      'furina-rp-sfx-card furina-rp-sfx-manual-card'
    )
    manualCard.append(
      createElement(
        'div',
        'furina-rp-sfx-card-title',
        'User-directed composer cues'
      ),
      createElement(
        'div',
        'furina-portable-help',
        `Use the ♪ RP SFX button above Clank's normal composer to queue up to ${manager.userQueueLimit || 3} sounds for your next message. Furina waits until that exact user message appears in chat, then plays the queued cues locally and clears the queue.`
      ),
      createElement(
        'div',
        'furina-portable-help',
        'No marker, command, or hidden SFX text is added to the message sent to Clank. Categories disabled for automatic detection can still be chosen manually.'
      )
    )
    const manualStatus = createElement('div', 'furina-rp-sfx-manual-status')
    const manualGrid = createElement('div', 'furina-rp-sfx-manual-grid')
    const manualButtons = new Map()

    for (const id of manager.categoryIds || []) {
      const def = manager.categories[id]
      const button = createElement(
        'button',
        'furina-secondary-button',
        def?.label || id
      )
      button.type = 'button'
      button.setAttribute('aria-pressed', 'false')
      button.addEventListener('click', () => {
        manager.unlock?.()
        const result = manager.toggleUserCue(id)
        if (!result?.ok && result?.reason === 'disabled') {
          status.textContent =
            'Enable Roleplay Sounds before queueing a manual cue.'
        } else if (!result?.ok && result?.reason === 'limit') {
          status.textContent = `You can queue up to ${manager.userQueueLimit || 3} cues per message.`
        } else {
          status.textContent =
            result?.reason === 'removed'
              ? `${def?.label || id} removed from the next send.`
              : `${def?.label || id} queued for the next send.`
        }
        syncManual()
      })
      manualButtons.set(id, button)
      manualGrid.append(button)
    }

    const manualActions = createElement('div', 'furina-rp-sfx-manual-actions')
    const clearManual = createElement(
      'button',
      'furina-secondary-button',
      'Clear queued SFX'
    )
    clearManual.type = 'button'
    clearManual.addEventListener('click', () => {
      manager.clearUserQueue()
      status.textContent = 'Queued next-send SFX cleared.'
      syncManual()
    })
    manualActions.append(clearManual)

    const syncManual = () => {
      const queue = manager.userQueue || []
      const enabledNow = manager.settings.enabled === true
      manualStatus.textContent = queue.length
        ? `Currently queued: ${queue.map(id => manager.categories[id]?.label || id).join(', ')}. These play after your next sent message appears in chat.`
        : enabledNow
          ? 'Nothing is queued for the next send.'
          : 'Roleplay Sounds are off. Enable them above before queueing a cue.'

      clearManual.disabled = !queue.length
      for (const [id, button] of manualButtons) {
        const selected = queue.includes(id)
        button.classList.toggle('is-selected', selected)
        button.setAttribute('aria-pressed', String(selected))
        button.disabled =
          !enabledNow ||
          (!selected && queue.length >= (manager.userQueueLimit || 3))
      }
    }

    const onManualChange = () => {
      if (!manualCard.isConnected) {
        window.removeEventListener(
          'furina-rp-sfx-user-queue-changed',
          onManualChange
        )
        window.removeEventListener(
          'furina-rp-sfx-settings-changed',
          onManualChange
        )
        return
      }
      syncManual()
    }
    window.addEventListener('furina-rp-sfx-user-queue-changed', onManualChange)
    window.addEventListener('furina-rp-sfx-settings-changed', onManualChange)

    syncManual()
    manualCard.append(manualStatus, manualGrid, manualActions)

    const tester = createElement('div', 'furina-rp-sfx-card')
    tester.append(
      createElement('div', 'furina-rp-sfx-card-title', 'Trigger tester')
    )
    tester.append(
      createElement(
        'div',
        'furina-portable-help',
        'Type a sentence to see what Furina would recognize. Testing does not modify the conversation.'
      )
    )
    const testInput = document.createElement('textarea')
    testInput.className = 'furina-textarea furina-rp-sfx-test-input'
    testInput.rows = 3
    testInput.placeholder =
      'Example: A gunshot rang out as thunder cracked overhead.'
    const testActions = createElement('div', 'furina-rp-sfx-actions')
    const analyze = createElement(
      'button',
      'furina-secondary-button',
      'Analyze'
    )
    analyze.type = 'button'
    const previewDetected = createElement(
      'button',
      'furina-secondary-button',
      'Preview first match'
    )
    previewDetected.type = 'button'
    previewDetected.disabled = true
    const testResult = createElement('div', 'furina-rp-sfx-test-result')
    let lastMatches = []
    analyze.addEventListener('click', () => {
      lastMatches = manager.testText(testInput.value)
      previewDetected.disabled = !lastMatches.length
      testResult.textContent = lastMatches.length
        ? `Detected: ${lastMatches.map(item => item.label).join(', ')}`
        : 'No trigger detected with the current sensitivity and custom phrases.'
    })
    previewDetected.addEventListener('click', () => {
      const first = lastMatches[0]
      if (first) manager.preview(first.id)
    })
    testActions.append(analyze, previewDetected)
    tester.append(testInput, testActions, testResult)

    const library = createElement('div', 'furina-rp-sfx-card')
    library.append(
      createElement(
        'div',
        'furina-rp-sfx-card-title',
        'Sound library & custom triggers'
      ),
      createElement(
        'div',
        'furina-portable-help',
        'Each category can be disabled independently for automatic assistant detection. Manual composer cues remain available. Add one custom trigger phrase per line. A custom URL replaces the procedural cue when it can be played; Furina falls back to the built-in cue if it fails.'
      )
    )

    const categoryList = createElement('div', 'furina-rp-sfx-category-list')

    for (const id of manager.categoryIds) {
      const def = manager.categories[id]
      const current = manager.settings
      const details = document.createElement('details')
      details.className = 'furina-rp-sfx-category'
      const summary = document.createElement('summary')
      summary.className = 'furina-rp-sfx-category-summary'
      const titleWrap = createElement('span', 'furina-rp-sfx-category-title')
      titleWrap.append(
        createElement('strong', '', def.label),
        createElement(
          'span',
          'furina-rp-sfx-category-description',
          def.description
        )
      )
      summary.append(titleWrap)

      const body = createElement('div', 'furina-rp-sfx-category-body')
      const enabled = toggleRow(
        `Enable ${def.label}`,
        'Allow automatic assistant detection for this category. You can still queue it manually from the composer.',
        current.categories[id] !== false,
        async value => {
          const ok = await manager.updateCategory(id, {enabled: value})
          status.textContent = ok
            ? `${def.label} ${value ? 'enabled' : 'disabled'}.`
            : `Could not update ${def.label}.`
        }
      )

      const preview = createElement(
        'button',
        'furina-secondary-button',
        `Preview ${def.label}`
      )
      preview.type = 'button'
      preview.addEventListener('click', () => manager.preview(id))

      const urlLabel = createElement('label', 'furina-text-control')
      urlLabel.append(
        createElement(
          'span',
          'furina-control-label',
          'Custom sound URL (optional)'
        )
      )
      const url = document.createElement('input')
      url.type = 'url'
      url.className = 'furina-text-input'
      url.placeholder = 'https://example.com/sound.mp3'
      url.value = current.custom[id]?.url || ''
      urlLabel.append(url)

      const phrasesLabel = createElement('label', 'furina-text-control')
      phrasesLabel.append(
        createElement('span', 'furina-control-label', 'Custom trigger phrases')
      )
      const phrases = document.createElement('textarea')
      phrases.className = 'furina-textarea furina-rp-sfx-phrases'
      phrases.rows = 4
      phrases.placeholder = 'One phrase per line'
      phrases.value = (current.custom[id]?.phrases || []).join('\n')
      phrasesLabel.append(phrases)

      const save = createElement(
        'button',
        'furina-primary-button',
        'Save custom settings'
      )
      save.type = 'button'
      save.addEventListener('click', async () => {
        const ok = await manager.updateCategory(id, {
          url: url.value,
          phrases: phrases.value
        })
        const saved = manager.settings.custom[id]
        url.value = saved.url
        phrases.value = saved.phrases.join('\n')
        status.textContent = ok
          ? `${def.label} custom settings saved.`
          : `Could not save ${def.label} settings.`
      })

      body.append(enabled.row, preview, urlLabel, phrasesLabel, save)
      details.append(summary, body)
      categoryList.append(details)
    }

    library.append(categoryList)

    const resetCard = createElement(
      'div',
      'furina-rp-sfx-card furina-rp-sfx-reset-card'
    )
    resetCard.append(
      createElement(
        'div',
        'furina-rp-sfx-card-title',
        'Reset this conversation'
      ),
      createElement(
        'div',
        'furina-portable-help',
        'Restore RP sounds to the default OFF state and clear custom URLs/triggers for this conversation.'
      )
    )
    const reset = createElement(
      'button',
      'furina-secondary-button',
      'Reset RP sound settings'
    )
    reset.type = 'button'
    reset.addEventListener('click', async () => {
      if (!window.confirm('Reset RP sound settings for this conversation?'))
        return
      const ok = await manager.resetConversation()
      status.textContent = ok
        ? 'RP sound settings reset. Reopen this page to refresh all controls.'
        : 'Could not reset RP sound settings.'
    })
    resetCard.append(reset)

    section.furinaContent.append(
      intro,
      masterCard,
      manualCard,
      tester,
      library,
      resetCard,
      status
    )
    manager.syncConversation?.().then(() => {
      const s = manager.settings
      master.input.checked = s.enabled
      assistantDetection.input.checked = s.assistantDetection
      volume.input.value = String(s.volume)
      volume.sync()
      cooldown.input.value = String(s.masterCooldown)
      cooldown.sync()
      sensitivitySelect.value = s.sensitivity
    })
    return section
  }

  Sections.createRpSfxSection = createRpSfxSection
})()
