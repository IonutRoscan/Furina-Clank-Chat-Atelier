'use strict'


/*
  Developer notes

  Continuity panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/* Continuity Vault and injection-preview workspace sections. */
;(() => {
  const Atelier = window.ClankAtelier
  const Sections = Atelier.PanelSections
  const {createElement, createSection} = Atelier.PanelUI

  const label = value =>
    String(value || '').replace(
      /(^|[-_])(\w)/g,
      (_, space, letter) => `${space ? ' ' : ''}${letter.toUpperCase()}`
    )

  function field(title, element) {
    const wrapper = createElement('label', 'furina-text-control')
    wrapper.append(
      createElement('span', 'furina-control-label', title),
      element
    )
    return wrapper
  }

  function input(value = '', placeholder = '') {
    const element = document.createElement('input')
    element.type = 'text'
    element.className = 'furina-input'
    element.value = value
    element.placeholder = placeholder
    return element
  }

  function select(options, value) {
    const element = document.createElement('select')
    element.className = 'furina-select'
    for (const [optionValue, optionLabel] of options) {
      const option = document.createElement('option')
      option.value = optionValue
      option.textContent = optionLabel
      option.selected = optionValue === value
      element.appendChild(option)
    }
    return element
  }

  function button(text, className = 'furina-button') {
    const element = createElement('button', className, text)
    element.type = 'button'
    return element
  }

  function rerender() {
    Atelier.PanelShell?.rebuild?.()
    Atelier.PanelShell?.refreshNavigation?.()
  }

  function createEntryEditor(entry) {
    const manager = Atelier.ContinuityManager
    const editor = createElement('div', 'furina-continuity-editor')
    const titleInput = input(entry.title, 'Raven, Silver Key, Cathedral Seal…')
    const text = document.createElement('textarea')
    text.className = 'furina-textarea'
    text.rows = 6
    text.value = entry.text
    text.placeholder =
      'Write one concise fact Furina should help Clank remember.'
    const category = select(Object.entries(manager.CATEGORIES), entry.category)
    const priority = select(
      [
        ['critical', 'Critical'],
        ['high', 'High'],
        ['normal', 'Normal'],
        ['background', 'Background']
      ],
      entry.priority
    )
    const scope = select(
      [
        ['always', 'Always include'],
        ['relevant', 'When relevant'],
        ['present', 'While present'],
        ['manual', 'Manual only']
      ],
      entry.scope
    )
    const keywords = input(
      entry.keywords.join(', '),
      'Raven, cathedral, broken seal'
    )

    const grid = createElement('div', 'furina-continuity-form-grid')
    grid.append(
      field('Name', titleInput),
      field('Category', category),
      field('Priority', priority),
      field('Injection', scope)
    )

    const help = createElement('div', 'furina-portable-help')
    help.textContent =
      'Keywords decide when a Relevant entry is included. For While Present, they are matched against Scene State’s Present field.'

    const actions = createElement('div', 'furina-inline-actions')
    const save = button('Save Memory', 'furina-button furina-button-primary')
    const cancel = button('Cancel')
    actions.append(save, cancel)

    save.addEventListener('click', async () => {
      const saved = await manager.upsertEntry({
        ...entry,
        title: titleInput.value,
        text: text.value,
        category: category.value,
        priority: priority.value,
        scope: scope.value,
        keywords: keywords.value.split(',')
      })
      if (!saved) {
        text.focus()
        return
      }
      Atelier.PanelState.continuityEditingId = null
      rerender()
    })
    cancel.addEventListener('click', () => {
      Atelier.PanelState.continuityEditingId = null
      rerender()
    })

    editor.append(
      createElement(
        'div',
        'furina-workspace-block-title',
        entry.text ? 'Edit Memory' : 'New Memory'
      ),
      grid,
      field('Memory', text),
      field('Keywords & aliases', keywords),
      help,
      actions
    )
    return editor
  }

  function createEntryCard(entry) {
    const manager = Atelier.ContinuityManager
    const card = createElement(
      'article',
      `furina-continuity-card${entry.enabled ? '' : ' furina-continuity-card-disabled'}${entry.archived ? ' furina-continuity-card-archived' : ''}`
    )
    const header = createElement('div', 'furina-continuity-card-header')
    const identity = createElement('div')
    identity.append(
      createElement(
        'div',
        'furina-continuity-card-title',
        entry.title || 'Untitled memory'
      ),
      createElement(
        'div',
        'furina-continuity-card-meta',
        `${manager.CATEGORIES[entry.category]} · ${label(entry.priority)} · ${label(entry.scope)}`
      )
    )
    const toggle = document.createElement('input')
    toggle.type = 'checkbox'
    toggle.className = 'furina-checkbox'
    toggle.checked = entry.enabled
    toggle.title = entry.enabled ? 'Disable memory' : 'Enable memory'
    toggle.addEventListener('change', async () => {
      await manager.upsertEntry({...entry, enabled: toggle.checked})
      rerender()
    })
    header.append(identity, toggle)

    const body = createElement('p', 'furina-continuity-card-text', entry.text)
    const tags = createElement('div', 'furina-continuity-tags')
    for (const keyword of entry.keywords.slice(0, 8)) {
      tags.append(createElement('span', 'furina-continuity-tag', keyword))
    }

    const actions = createElement(
      'div',
      'furina-inline-actions furina-continuity-card-actions'
    )
    const edit = button('Edit')
    const archive = button(entry.archived ? 'Restore' : 'Archive')
    const remove = button('Delete', 'furina-button furina-button-danger')
    edit.addEventListener('click', () => {
      Atelier.PanelState.continuityEditingId = entry.id
      rerender()
    })
    archive.addEventListener('click', async () => {
      await manager.upsertEntry({...entry, archived: !entry.archived})
      rerender()
    })
    remove.addEventListener('click', async () => {
      if (!window.confirm(`Delete “${entry.title || 'this memory'}”?`)) return
      await manager.removeEntry(entry.id)
      rerender()
    })
    actions.append(edit, archive, remove)
    card.append(header, body)
    if (entry.keywords.length) card.append(tags)
    card.append(actions)
    return card
  }

  function createContinuityVaultSection() {
    const section = createSection('Continuity Vault', {collapsed: false})
    const root = section.furinaContent
    const manager = Atelier.ContinuityManager
    if (!manager) {
      root.append(
        createElement(
          'div',
          'furina-portable-empty',
          'Continuity engine unavailable.'
        )
      )
      return section
    }

    const header = createElement('div', 'furina-continuity-hero')
    const copy = createElement('div')
    copy.append(
      createElement(
        'div',
        'furina-continuity-hero-title',
        'Help Clank remember what matters'
      ),
      createElement(
        'div',
        'furina-continuity-hero-copy',
        'Save durable story facts. Furina selects a small, relevant set whenever you send a message.'
      )
    )
    const add = button('+ Add Memory', 'furina-button furina-button-primary')
    add.addEventListener('click', () => {
      Atelier.PanelState.continuityEditingId = 'new'
      rerender()
    })
    header.append(copy, add)

    const enabledRow = createElement('label', 'furina-toggle-row')
    const enabledCopy = createElement('div')
    enabledCopy.append(
      createElement('div', 'furina-toggle-title', 'Continuity injection'),
      createElement(
        'div',
        'furina-toggle-description',
        'Allow selected Vault memories to join Director guidance.'
      )
    )
    const enabled = document.createElement('input')
    enabled.type = 'checkbox'
    enabled.className = 'furina-checkbox'
    enabled.checked = manager.settings.enabled
    enabled.addEventListener('change', async () => {
      await manager.updateSettings({enabled: enabled.checked})
      rerender()
    })
    enabledRow.append(enabledCopy, enabled)

    root.append(header, enabledRow)

    const editingId = Atelier.PanelState.continuityEditingId
    if (editingId) {
      const entry =
        editingId === 'new'
          ? manager.createEntry()
          : manager.settings.entries.find(item => item.id === editingId)
      if (entry) root.append(createEntryEditor(entry))
    }

    const controls = createElement('div', 'furina-continuity-list-controls')
    const search = input('', 'Search memories…')
    const category = select(
      [['all', 'All categories'], ...Object.entries(manager.CATEGORIES)],
      'all'
    )
    const statusFilter = select(
      [
        ['active', 'Active memories'],
        ['archived', 'Archived'],
        ['all', 'All memories']
      ],
      'active'
    )
    controls.append(search, category, statusFilter)
    const list = createElement('div', 'furina-continuity-list')

    function drawList() {
      const query = search.value.trim().toLocaleLowerCase()
      const entries = manager.settings.entries.filter(entry => {
        const matchesCategory =
          category.value === 'all' || entry.category === category.value
        const matchesStatus =
          statusFilter.value === 'all' ||
          (statusFilter.value === 'archived' ? entry.archived : !entry.archived)
        const haystack =
          `${entry.title} ${entry.text} ${entry.keywords.join(' ')}`.toLocaleLowerCase()
        return (
          matchesCategory &&
          matchesStatus &&
          (!query || haystack.includes(query))
        )
      })
      list.replaceChildren()
      if (!entries.length) {
        list.append(
          createElement(
            'div',
            'furina-portable-empty',
            manager.settings.entries.length
              ? 'No memories match this filter.'
              : 'Your Vault is empty. Add the first fact you never want the story to forget.'
          )
        )
        return
      }
      entries.forEach(entry => list.append(createEntryCard(entry)))
    }
    search.addEventListener('input', drawList)
    category.addEventListener('change', drawList)
    statusFilter.addEventListener('change', drawList)
    drawList()
    root.append(controls, list)
    return section
  }

  function createContinuityPreviewSection() {
    const section = createSection('Context Budget & Preview', {
      collapsed: false
    })
    const root = section.furinaContent
    const manager = Atelier.ContinuityManager

    const intro = createElement(
      'div',
      'furina-portable-help',
      'Type a sample message to see exactly which memories Furina would select. Nothing is sent from this screen.'
    )
    const sample = document.createElement('textarea')
    sample.className = 'furina-textarea'
    sample.rows = 4
    sample.placeholder =
      'I take Raven back to the cathedral and show her the broken seal.'

    const mode = select(
      [
        ['compact', 'Compact — 1,200 characters'],
        ['balanced', 'Balanced — 2,400 characters'],
        ['detailed', 'Detailed — 4,200 characters'],
        ['custom', 'Custom limit']
      ],
      manager.settings.budgetMode
    )
    const custom = document.createElement('input')
    custom.type = 'number'
    custom.className = 'furina-input'
    custom.min = '500'
    custom.max = '8000'
    custom.step = '100'
    custom.value = String(manager.settings.customBudget)
    custom.hidden = mode.value !== 'custom'

    const customField = field('Custom characters', custom)
    customField.hidden = mode.value !== 'custom'
    const budgetRow = createElement('div', 'furina-continuity-budget-controls')
    budgetRow.append(field('Context detail', mode), customField)

    const meter = createElement('div', 'furina-continuity-meter')
    const bar = createElement('div', 'furina-continuity-meter-bar')
    meter.append(bar)
    const summary = createElement('div', 'furina-continuity-preview-summary')
    const preview = createElement(
      'pre',
      'furina-response-style-preview furina-continuity-preview'
    )
    const reasons = createElement('div', 'furina-continuity-reasons')

    function drawPreview() {
      const selection = manager.select(sample.value)
      const continuityBlock = manager.buildBlock(sample.value)
      const fullBlock =
        Atelier.DirectorManager?.buildDirectorBlock?.(sample.value) ||
        continuityBlock
      const directorCharacters = Math.max(
        0,
        fullBlock.length - continuityBlock.length
      )
      const ratio = Math.min(1, selection.characters / selection.budget)
      bar.style.width = `${Math.round(ratio * 100)}%`
      bar.dataset.weight =
        ratio > 0.85 ? 'heavy' : ratio > 0.55 ? 'medium' : 'light'
      summary.textContent = `${selection.characters.toLocaleString()} / ${selection.budget.toLocaleString()} memory characters · ${fullBlock.length.toLocaleString()} total Furina context · ${selection.selected.length} selected${selection.omitted.length ? ` · ${selection.omitted.length} omitted by budget` : ''}${directorCharacters ? ` · ${directorCharacters.toLocaleString()} Director/Scene wrapper` : ''}`
      preview.textContent =
        fullBlock ||
        'No context would be injected for this sample message. Always entries appear even when the message is empty.'
      reasons.replaceChildren()
      selection.selected.forEach(item =>
        reasons.append(
          createElement(
            'div',
            'furina-continuity-reason',
            `${item.entry.title || 'Untitled'} — ${item.reason}`
          )
        )
      )
    }

    async function saveBudget() {
      customField.hidden = mode.value !== 'custom'
      await manager.updateSettings({
        budgetMode: mode.value,
        customBudget: Number(custom.value)
      })
      drawPreview()
      Atelier.PanelShell?.refreshNavigation?.()
    }
    mode.addEventListener('change', saveBudget)
    custom.addEventListener('change', saveBudget)
    sample.addEventListener('input', drawPreview)
    drawPreview()

    root.append(
      intro,
      field('Sample outgoing message', sample),
      budgetRow,
      meter,
      summary,
      preview,
      reasons
    )
    return section
  }

  Sections.createContinuityVaultSection = createContinuityVaultSection
  Sections.createContinuityPreviewSection = createContinuityPreviewSection
})()
