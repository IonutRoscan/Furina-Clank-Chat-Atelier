'use strict'


/*
  Developer notes

  Director 2 panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/* Director 2.0 workspace sections. */
;(() => {
  const Atelier = window.ClankAtelier
  const Sections = Atelier.PanelSections
  const {createElement, createSection} = Atelier.PanelUI
  const rerender = () => {
    Atelier.PanelShell?.rebuild?.()
    Atelier.PanelShell?.refreshNavigation?.()
  }

  function button(text, className = 'furina-button') {
    const item = createElement('button', className, text)
    item.type = 'button'
    return item
  }
  function input(value = '', placeholder = '') {
    const item = document.createElement('input')
    item.type = 'text'
    item.className = 'furina-input'
    item.value = value
    item.placeholder = placeholder
    return item
  }
  function textarea(value = '', placeholder = '', rows = 5) {
    const item = document.createElement('textarea')
    item.className = 'furina-textarea'
    item.value = value
    item.placeholder = placeholder
    item.rows = rows
    return item
  }
  function select(options, value) {
    const item = document.createElement('select')
    item.className = 'furina-select'
    for (const [key, name] of options) {
      const option = document.createElement('option')
      option.value = key
      option.textContent = name
      option.selected = key === value
      item.append(option)
    }
    return item
  }
  function field(name, item) {
    const wrap = createElement('label', 'furina-text-control')
    wrap.append(createElement('span', 'furina-control-label', name), item)
    return wrap
  }
  function section(title) {
    return createSection(title, {collapsed: false})
  }

  function createDirectorDirectSection() {
    const shell = section('Direct the Next Reply')
    const root = shell.furinaContent
    const manager = Atelier.Director2Manager
    root.append(
      createElement(
        'div',
        'furina-portable-help',
        'Give Clank one temporary direction. Furina clears it immediately after the next injected send.'
      )
    )

    const next = textarea(
      manager.settings.nextReply,
      'Let Maya interrupt before Raven answers. Slow the pacing and preserve the mystery.',
      5
    )
    const chips = createElement('div', 'furina-director2-chips')
    const suggestions = [
      'Slow down and focus on the silence.',
      'Raise the tension without resolving it.',
      'Let the character lead this beat.',
      'Focus on dialogue and subtext.',
      'Introduce a believable complication.',
      'End on a natural hook.',
      'Do not time skip.',
      'Keep this reply concise.'
    ]
    suggestions.forEach(text => {
      const chip = button(text, 'furina-director2-chip')
      chip.addEventListener('click', () => {
        next.value = text
        next.focus()
      })
      chips.append(chip)
    })
    const save = button('Arm Next Reply', 'furina-button furina-button-primary')
    const clear = button('Clear')
    const actions = createElement('div', 'furina-inline-actions')
    actions.append(save, clear)
    save.addEventListener('click', async () => {
      await manager.update({nextReply: next.value})
      rerender()
    })
    clear.addEventListener('click', async () => {
      await manager.update({nextReply: ''})
      rerender()
    })

    const presetTitle = createElement(
      'div',
      'furina-workspace-block-title',
      'Director Preset'
    )
    const presetGrid = createElement('div', 'furina-director2-preset-grid')
    for (const [presetId, preset] of Object.entries(manager.PRESETS)) {
      const active = manager.settings.activePreset === presetId
      const card = button(
        '',
        `furina-director2-preset${active ? ' furina-director2-preset-active' : ''}`
      )
      card.append(
        createElement('div', 'furina-director2-preset-title', preset.name),
        createElement('div', 'furina-director2-preset-copy', preset.description)
      )
      card.addEventListener('click', async () => {
        await manager.update({activePreset: presetId})
        rerender()
      })
      presetGrid.append(card)
    }

    root.append(
      field('Next-reply direction', next),
      chips,
      actions,
      presetTitle,
      presetGrid
    )
    return shell
  }

  function cueEditor(cue) {
    const manager = Atelier.Director2Manager
    const editor = createElement('div', 'furina-director2-editor')
    const text = textarea(
      cue.text,
      "Have Raven notice the blood on the user's sleeve.",
      5
    )
    const trigger = select(
      [
        ['next', 'Next available reply'],
        ['keyword', 'When user message contains keyword'],
        ['turns', 'After a number of turns'],
        ['character', 'After character appears in latest reply'],
        ['manual', 'Manual release only']
      ],
      cue.trigger
    )
    const value = input(cue.triggerValue, 'Keyword or character name')
    const turns = document.createElement('input')
    turns.type = 'number'
    turns.className = 'furina-input'
    turns.min = '1'
    turns.max = '99'
    turns.value = String(cue.turnsRemaining)
    const condition = field('Keyword / character', value)
    const turnsField = field('Turns', turns)
    function syncFields() {
      condition.hidden = !['keyword', 'character'].includes(trigger.value)
      turnsField.hidden = trigger.value !== 'turns'
    }
    trigger.addEventListener('change', syncFields)
    syncFields()

    const reusableRow = createElement('label', 'furina-toggle-row')
    const reusableCopy = createElement('div')
    reusableCopy.append(
      createElement('div', 'furina-toggle-title', 'Reusable cue'),
      createElement(
        'div',
        'furina-toggle-description',
        'Return to Waiting after it is injected instead of marking it Sent.'
      )
    )
    const reusable = document.createElement('input')
    reusable.type = 'checkbox'
    reusable.className = 'furina-checkbox'
    reusable.checked = cue.reusable
    reusableRow.append(reusableCopy, reusable)

    const grid = createElement('div', 'furina-director2-form-grid')
    grid.append(field('Trigger', trigger), condition, turnsField)
    const actions = createElement('div', 'furina-inline-actions')
    const save = button('Save Cue', 'furina-button furina-button-primary')
    const cancel = button('Cancel')
    actions.append(save, cancel)
    save.addEventListener('click', async () => {
      const ok = await manager.upsertCue({
        ...cue,
        text: text.value,
        trigger: trigger.value,
        triggerValue: value.value,
        turnsRemaining: Number(turns.value),
        reusable: reusable.checked
      })
      if (!ok) {
        text.focus()
        return
      }
      Atelier.PanelState.director2EditingCueId = null
      rerender()
    })
    cancel.addEventListener('click', () => {
      Atelier.PanelState.director2EditingCueId = null
      rerender()
    })
    editor.append(
      createElement(
        'div',
        'furina-workspace-block-title',
        cue.text ? 'Edit Cue' : 'New Cue'
      ),
      field('Direction', text),
      grid,
      reusableRow,
      actions
    )
    return editor
  }

  function createDirectorCuesSection() {
    const shell = section('Director Cue Queue')
    const root = shell.furinaContent
    const manager = Atelier.Director2Manager
    const hero = createElement('div', 'furina-director2-hero')
    const copy = createElement('div')
    copy.append(
      createElement(
        'div',
        'furina-director2-hero-title',
        'Stage future story beats'
      ),
      createElement(
        'div',
        'furina-director2-hero-copy',
        'Cues wait quietly until their trigger is ready. At most one cue is injected per reply.'
      )
    )
    const add = button('+ Add Cue', 'furina-button furina-button-primary')
    add.addEventListener('click', () => {
      Atelier.PanelState.director2EditingCueId = 'new'
      rerender()
    })
    hero.append(copy, add)
    root.append(hero)

    const editing = Atelier.PanelState.director2EditingCueId
    if (editing) {
      const cue =
        editing === 'new'
          ? manager.createCue()
          : manager.settings.cues.find(item => item.id === editing)
      if (cue) root.append(cueEditor(cue))
    }

    const list = createElement('div', 'furina-director2-list')
    if (!manager.settings.cues.length)
      list.append(
        createElement(
          'div',
          'furina-portable-empty',
          'No queued direction yet.'
        )
      )
    manager.settings.cues.forEach((cue, index) => {
      const card = createElement(
        'article',
        `furina-director2-card furina-director2-cue-${cue.status}`
      )
      const header = createElement('div', 'furina-director2-card-header')
      header.append(
        createElement('span', 'furina-director2-order', String(index + 1)),
        createElement('div', 'furina-director2-card-title', cue.text),
        createElement('span', 'furina-director2-status', cue.status)
      )
      let triggerText = cue.trigger
      if (cue.trigger === 'keyword')
        triggerText = `Keyword: ${cue.triggerValue}`
      if (cue.trigger === 'character')
        triggerText = `After: ${cue.triggerValue}`
      if (cue.trigger === 'turns')
        triggerText = `${cue.turnsRemaining} turn${cue.turnsRemaining === 1 ? '' : 's'} remaining`
      const meta = createElement(
        'div',
        'furina-director2-card-meta',
        `${triggerText}${cue.reusable ? ' · Reusable' : ''}`
      )
      const actions = createElement('div', 'furina-inline-actions')
      const arm = button(cue.status === 'armed' ? 'Disarm' : 'Release Next')
      const edit = button('Edit')
      const fulfilled = button('Fulfilled')
      const remove = button('Delete', 'furina-button furina-button-danger')
      arm.addEventListener('click', async () => {
        await manager.upsertCue({
          ...cue,
          status: cue.status === 'armed' ? 'waiting' : 'armed'
        })
        rerender()
      })
      edit.addEventListener('click', () => {
        Atelier.PanelState.director2EditingCueId = cue.id
        rerender()
      })
      fulfilled.addEventListener('click', async () => {
        await manager.upsertCue({...cue, status: 'fulfilled'})
        rerender()
      })
      remove.addEventListener('click', async () => {
        await manager.removeCue(cue.id)
        rerender()
      })
      actions.append(arm, edit, fulfilled, remove)
      card.append(header, meta, actions)
      list.append(card)
    })
    root.append(list)
    return shell
  }

  function knowledgeEditor(item) {
    const manager = Atelier.Director2Manager
    const editor = createElement('div', 'furina-director2-editor')
    const title = input(item.title, 'The broken cathedral seal')
    const truth = textarea(
      item.truth,
      'The user broke the seal and released the White Lady.',
      4
    )
    const keywords = input(
      item.keywords.join(', '),
      'seal, cathedral, White Lady'
    )
    const knows = input(item.knows, 'User')
    const suspects = input(item.suspects, 'Raven')
    const unknown = input(item.unknown, 'Maya, Emi')
    const grid = createElement('div', 'furina-director2-form-grid')
    grid.append(
      field('Knows', knows),
      field('Suspects', suspects),
      field('Does not know', unknown)
    )
    const actions = createElement('div', 'furina-inline-actions')
    const save = button('Save Boundary', 'furina-button furina-button-primary')
    const cancel = button('Cancel')
    actions.append(save, cancel)
    save.addEventListener('click', async () => {
      const ok = await manager.upsertKnowledge({
        ...item,
        title: title.value,
        truth: truth.value,
        keywords: keywords.value.split(','),
        knows: knows.value,
        suspects: suspects.value,
        unknown: unknown.value
      })
      if (!ok) {
        truth.focus()
        return
      }
      Atelier.PanelState.director2EditingKnowledgeId = null
      rerender()
    })
    cancel.addEventListener('click', () => {
      Atelier.PanelState.director2EditingKnowledgeId = null
      rerender()
    })
    editor.append(
      createElement(
        'div',
        'furina-workspace-block-title',
        item.truth ? 'Edit Knowledge Boundary' : 'New Knowledge Boundary'
      ),
      field('Name', title),
      field('Director-only truth', truth),
      field('Keywords', keywords),
      grid,
      actions
    )
    return editor
  }

  function createDirectorControlSection() {
    const shell = section('Control & Knowledge')
    const root = shell.furinaContent
    const manager = Atelier.Director2Manager
    root.append(
      createElement(
        'div',
        'furina-portable-help',
        'Turn common roleplay protections into clear switches. Everything is off by default, preserving existing conversations.'
      )
    )
    const guardList = createElement('div', 'furina-director2-guard-list')
    for (const [key, [title, description]] of Object.entries(manager.GUARDS)) {
      const row = createElement('label', 'furina-toggle-row')
      const copy = createElement('div')
      copy.append(
        createElement('div', 'furina-toggle-title', title),
        createElement('div', 'furina-toggle-description', description)
      )
      const toggle = document.createElement('input')
      toggle.type = 'checkbox'
      toggle.className = 'furina-checkbox'
      toggle.checked = manager.settings.guards[key]
      toggle.addEventListener('change', async () => {
        await manager.update({
          guards: {...manager.settings.guards, [key]: toggle.checked}
        })
        Atelier.PanelShell?.refreshNavigation?.()
      })
      row.append(copy, toggle)
      guardList.append(row)
    }
    root.append(
      guardList,
      createElement(
        'div',
        'furina-workspace-block-title',
        'Character Knowledge Boundaries'
      )
    )
    const add = button('+ Add Boundary', 'furina-button furina-button-primary')
    add.addEventListener('click', () => {
      Atelier.PanelState.director2EditingKnowledgeId = 'new'
      rerender()
    })
    root.append(add)
    const editing = Atelier.PanelState.director2EditingKnowledgeId
    if (editing) {
      const item =
        editing === 'new'
          ? manager.createKnowledge()
          : manager.settings.knowledge.find(value => value.id === editing)
      if (item) root.append(knowledgeEditor(item))
    }
    const list = createElement('div', 'furina-director2-list')
    if (!manager.settings.knowledge.length)
      list.append(
        createElement(
          'div',
          'furina-portable-empty',
          'No knowledge boundaries yet.'
        )
      )
    manager.settings.knowledge.forEach(item => {
      const card = createElement(
        'article',
        `furina-director2-card${item.enabled ? '' : ' furina-director2-card-disabled'}`
      )
      const header = createElement('div', 'furina-director2-card-header')
      header.append(
        createElement(
          'div',
          'furina-director2-card-title',
          item.title || 'Untitled truth'
        )
      )
      const enabled = document.createElement('input')
      enabled.type = 'checkbox'
      enabled.className = 'furina-checkbox'
      enabled.checked = item.enabled
      enabled.addEventListener('change', async () => {
        await manager.upsertKnowledge({...item, enabled: enabled.checked})
        rerender()
      })
      header.append(enabled)
      const truth = createElement('div', 'furina-director2-truth', item.truth)
      const map = createElement('div', 'furina-director2-knowledge-map')
      if (item.knows)
        map.append(createElement('div', '', `Knows: ${item.knows}`))
      if (item.suspects)
        map.append(createElement('div', '', `Suspects: ${item.suspects}`))
      if (item.unknown)
        map.append(createElement('div', '', `Does not know: ${item.unknown}`))
      const actions = createElement('div', 'furina-inline-actions')
      const edit = button('Edit')
      const remove = button('Delete', 'furina-button furina-button-danger')
      edit.addEventListener('click', () => {
        Atelier.PanelState.director2EditingKnowledgeId = item.id
        rerender()
      })
      remove.addEventListener('click', async () => {
        await manager.removeKnowledge(item.id)
        rerender()
      })
      actions.append(edit, remove)
      card.append(header, truth, map, actions)
      list.append(card)
    })
    root.append(list)
    return shell
  }

  function createDirectorStatusSection() {
    const shell = section('Director Diagnostics')
    const root = shell.furinaContent
    const manager = Atelier.Director2Manager
    const sample = textarea('', 'Type a sample outgoing message…', 4)
    const grid = createElement('div', 'furina-director2-diagnostic-grid')
    const preview = createElement(
      'pre',
      'furina-response-style-preview furina-director2-preview'
    )
    function draw() {
      const data = manager.getDiagnostics(sample.value)
      grid.replaceChildren()
      const rows = [
        ['Next reply', data.nextReply ? 'Armed' : 'Empty'],
        ['Selected cue', data.cue?.text || 'None'],
        ['Waiting cues', String(data.waitingCues)],
        ['Active guards', String(data.guards)],
        ['Preset', data.preset],
        ['Knowledge matches', String(data.knowledge)],
        ['Continuity matches', String(data.continuity?.selected?.length || 0)],
        [
          'Continuity budget',
          data.continuity
            ? `${data.continuity.characters} / ${data.continuity.budget}`
            : 'Unavailable'
        ]
      ]
      rows.forEach(([name, value]) => {
        const card = createElement('div', 'furina-director2-diagnostic')
        card.append(
          createElement('div', 'furina-director2-diagnostic-label', name),
          createElement('div', 'furina-director2-diagnostic-value', value)
        )
        grid.append(card)
      })
      preview.textContent =
        Atelier.DirectorManager?.buildDirectorBlock?.(sample.value) ||
        'No Furina context would be injected.'
    }
    sample.addEventListener('input', draw)
    draw()
    root.append(
      field('Sample message', sample),
      grid,
      createElement('div', 'furina-workspace-block-title', 'Exact Injection'),
      preview
    )
    return shell
  }

  Sections.createDirectorDirectSection = createDirectorDirectSection
  Sections.createDirectorCuesSection = createDirectorCuesSection
  Sections.createDirectorControlSection = createDirectorControlSection
  Sections.createDirectorStatusSection = createDirectorStatusSection
})()
