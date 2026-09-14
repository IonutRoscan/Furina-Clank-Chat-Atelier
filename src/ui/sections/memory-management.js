'use strict'

/*
  Developer notes

  Memory Management panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
;(() => {
  const Atelier = window.ClankAtelier,
    Sections = Atelier.PanelSections,
    {createElement, createSection} = Atelier.PanelUI
  const button = (t, c = 'furina-button') => {
    const e = createElement('button', c, t)
    e.type = 'button'
    return e
  }
  function createMemoryInboxSection() {
    const shell = createSection('Memory Inbox', {collapsed: false}),
      root = shell.furinaContent,
      manager = Atelier.MemoryCaptureManager
    const row = createElement('label', 'furina-toggle-row'),
      copy = createElement('div')
    copy.append(
      createElement(
        'div',
        'furina-toggle-title',
        'Suggest possible continuity'
      ),
      createElement(
        'div',
        'furina-toggle-description',
        'Use local phrase matching to flag promises, revelations, injuries, item changes, relationships, and major events. Nothing is saved automatically.'
      )
    )
    const toggle = document.createElement('input')
    toggle.type = 'checkbox'
    toggle.className = 'furina-checkbox'
    toggle.checked = manager.settings.inboxEnabled
    toggle.addEventListener('change', async () => {
      await manager.update({inboxEnabled: toggle.checked})
    })
    row.append(copy, toggle)
    root.append(row)
    const hero = createElement('div', 'furina-memory-inbox-hero')
    hero.append(
      createElement(
        'div',
        'furina-memory-inbox-count',
        String(manager.settings.suggestions.length)
      ),
      createElement(
        'div',
        'furina-memory-inbox-copy',
        manager.settings.suggestions.length === 1
          ? 'suggestion waiting for review'
          : 'suggestions waiting for review'
      )
    )
    root.append(hero)
    const list = createElement('div', 'furina-memory-inbox-list')
    if (!manager.settings.suggestions.length)
      list.append(
        createElement(
          'div',
          'furina-portable-empty',
          'No suggestions waiting. Furina will only flag new assistant messages that resemble meaningful continuity changes.'
        )
      )
    manager.settings.suggestions.forEach(item => {
      const card = createElement('article', 'furina-memory-suggestion')
      const meta = createElement(
        'div',
        'furina-memory-suggestion-meta',
        `${Atelier.ContinuityManager.CATEGORIES[item.category] || 'Other'} · Local suggestion`
      )
      const title = createElement(
        'div',
        'furina-memory-suggestion-title',
        item.title
      )
      const text = createElement(
        'p',
        'furina-memory-suggestion-text',
        item.text
      )
      const actions = createElement('div', 'furina-inline-actions'),
        review = button('Review & Save', 'furina-button furina-button-primary'),
        ignore = button('Ignore')
      review.addEventListener('click', () =>
        manager.openCapture(item, async () => {
          await manager.removeSuggestion(item.id)
          Atelier.PanelShell?.rebuild?.()
        })
      )
      ignore.addEventListener('click', async () => {
        await manager.ignoreSuggestion(item.id)
        Atelier.PanelShell?.rebuild?.()
      })
      actions.append(review, ignore)
      card.append(meta, title, text, actions)
      list.append(card)
    })
    root.append(list)
    return shell
  }

  function summary(data) {
    return {
      memories: data?.continuity?.entries?.length || 0,
      notes: data?.director?.notes?.length || 0,
      cues: data?.director2?.cues?.length || 0,
      knowledge: data?.director2?.knowledge?.length || 0,
      recaps: data?.story?.recaps?.length || 0,
      timeline: data?.story?.timeline?.length || 0,
      snapshots: data?.story?.snapshots?.length || 0,
      bookmarks: data?.bookmarks?.length || 0,
      chapters: data?.chapters?.length || 0
    }
  }
  function createStoryBibleSection() {
    const shell = createSection('Story Bible', {collapsed: false}),
      root = shell.furinaContent,
      manager = Atelier.MemoryCaptureManager
    root.append(
      createElement(
        'div',
        'furina-portable-help',
        "Export private roleplay data separately from visual themes. JSON restores Furina data; Markdown creates a readable story reference. Clank's own messages and backend memory are not changed."
      )
    )
    const exportCard = createElement('div', 'furina-memory-bible-card')
    exportCard.append(
      createElement('div', 'furina-workspace-block-title', 'Export')
    )
    const exportActions = createElement('div', 'furina-inline-actions'),
      json = button(
        'Export Restorable JSON',
        'furina-button furina-button-primary'
      ),
      markdown = button('Export Readable Markdown')
    json.addEventListener('click', () => manager.exportJson())
    markdown.addEventListener('click', () => manager.exportMarkdown())
    exportActions.append(json, markdown)
    exportCard.append(exportActions)
    root.append(exportCard)
    const importCard = createElement('div', 'furina-memory-bible-card')
    importCard.append(
      createElement('div', 'furina-workspace-block-title', 'Import')
    )
    const choose = button('Choose Story Bible JSON')
    const file = document.createElement('input')
    file.type = 'file'
    file.accept = 'application/json,.json'
    file.hidden = true
    const status = createElement('div', 'furina-portable-help')
    choose.addEventListener('click', () => file.click())
    file.addEventListener('change', async () => {
      const selected = file.files?.[0]
      if (!selected) return
      if (selected.size > 10 * 1024 * 1024) {
        status.textContent = 'That file is larger than the 10 MB import limit.'
        return
      }
      try {
        const data = JSON.parse(await selected.text())
        if (data.format !== 'furina-story-bible' || Number(data.version) !== 1)
          throw new Error()
        Atelier.PanelState.pendingStoryBibleImport = data
        Atelier.PanelShell?.rebuild?.()
      } catch {
        status.textContent =
          'This is not a supported Furina Story Bible JSON file.'
      }
    })
    importCard.append(choose, file, status)
    root.append(importCard)
    const pending = Atelier.PanelState.pendingStoryBibleImport
    if (pending) {
      const info = summary(pending),
        preview = createElement('div', 'furina-memory-bible-preview')
      preview.append(
        createElement(
          'div',
          'furina-memory-bible-preview-title',
          'Ready to import'
        ),
        createElement(
          'div',
          'furina-memory-bible-preview-meta',
          `Exported ${pending.exportedAt ? new Date(pending.exportedAt).toLocaleString() : 'at an unknown time'}`
        )
      )
      const grid = createElement('div', 'furina-memory-bible-grid')
      Object.entries(info).forEach(([name, value]) => {
        const cell = createElement('div', 'furina-memory-bible-stat')
        cell.append(
          createElement('strong', '', String(value)),
          createElement('span', '', name)
        )
        grid.append(cell)
      })
      const warning = createElement(
        'div',
        'furina-portable-help',
        "Merge keeps current data and adds/updates matching records. Replace overwrites this conversation's Furina story data. Neither option changes Clank messages."
      )
      const actions = createElement('div', 'furina-inline-actions'),
        merge = button(
          'Merge With Current',
          'furina-button furina-button-primary'
        ),
        replace = button(
          'Replace Current Data',
          'furina-button furina-button-danger'
        ),
        cancel = button('Cancel')
      merge.addEventListener('click', async () => {
        await manager.importBible(pending, 'merge')
        Atelier.PanelState.pendingStoryBibleImport = null
        Atelier.PanelShell?.rebuild?.()
      })
      replace.addEventListener('click', async () => {
        if (
          confirm(
            "Replace this conversation's Furina story data with the imported Story Bible?"
          )
        ) {
          await manager.importBible(pending, 'replace')
          Atelier.PanelState.pendingStoryBibleImport = null
          Atelier.PanelShell?.rebuild?.()
        }
      })
      cancel.addEventListener('click', () => {
        Atelier.PanelState.pendingStoryBibleImport = null
        Atelier.PanelShell?.rebuild?.()
      })
      actions.append(merge, replace, cancel)
      preview.append(grid, warning, actions)
      root.append(preview)
    }
    return shell
  }
  Sections.createMemoryInboxSection = createMemoryInboxSection
  Sections.createStoryBibleSection = createStoryBibleSection
})()
