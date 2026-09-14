'use strict'


/*
  Developer notes

  Scene Intelligence panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/* Scene Intelligence workspace sections. */
;(() => {
  const Atelier = window.ClankAtelier
  const Sections = Atelier.PanelSections
  const {createElement, createSection} = Atelier.PanelUI
  const rerender = () => {
    Atelier.PanelShell?.rebuild?.()
    Atelier.PanelShell?.refreshNavigation?.()
  }
  function section(title) {
    return createSection(title, {collapsed: false})
  }
  function button(text, className = 'furina-button') {
    const e = createElement('button', className, text)
    e.type = 'button'
    return e
  }
  function input(value = '', placeholder = '') {
    const e = document.createElement('input')
    e.type = 'text'
    e.className = 'furina-input'
    e.value = value
    e.placeholder = placeholder
    return e
  }
  function textarea(value = '', placeholder = '', rows = 5) {
    const e = document.createElement('textarea')
    e.className = 'furina-textarea'
    e.value = value
    e.placeholder = placeholder
    e.rows = rows
    return e
  }
  function select(options, value) {
    const e = document.createElement('select')
    e.className = 'furina-select'
    options.forEach(([v, n]) => {
      const o = document.createElement('option')
      o.value = v
      o.textContent = n
      o.selected = v === value
      e.append(o)
    })
    return e
  }
  function field(name, control) {
    const wrap = createElement('label', 'furina-text-control')
    wrap.append(createElement('span', 'furina-control-label', name), control)
    return wrap
  }
  function toggle(title, description, checked) {
    const row = createElement('label', 'furina-toggle-row')
    const copy = createElement('div')
    copy.append(
      createElement('div', 'furina-toggle-title', title),
      createElement('div', 'furina-toggle-description', description)
    )
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.className = 'furina-checkbox'
    box.checked = checked
    row.append(copy, box)
    return {row, box}
  }

  function createEndSceneSection() {
    const shell = section('End Scene')
    const root = shell.furinaContent
    const manager = Atelier.SceneIntelligenceManager
    const state = Atelier.SceneStateManager?.settings || {}
    const hero = createElement('div', 'furina-story-hero')
    const copy = createElement('div')
    copy.append(
      createElement(
        'div',
        'furina-story-hero-title',
        'Close the scene without losing it'
      ),
      createElement(
        'div',
        'furina-story-hero-copy',
        'Review a compact recap. Saving also creates a timeline event and can preserve a restorable ending snapshot.'
      )
    )
    const chapter = createElement(
      'span',
      'furina-story-chapter-pill',
      manager.currentChapter?.title
        ? `Chapter: ${manager.currentChapter.title}`
        : 'No chapter marker'
    )
    hero.append(copy, chapter)
    const title = input(
      state.title || manager.currentChapter?.title || '',
      'Scene title'
    )
    const summary = textarea(
      '',
      'What happened in this scene? Keep the lasting events concise.',
      6
    )
    const developments = textarea(
      '',
      'Relationship changes, discoveries, promises, injuries, item changes…',
      4
    )
    const threads = textarea('', 'What remains unresolved?', 4)
    const ending = textarea(
      state.notes || '',
      'Where everyone and everything stands at the final moment.',
      4
    )
    const next = textarea(
      '',
      'Optional hook or intended direction for the next scene.',
      3
    )
    const options = createElement('div', 'furina-story-options')
    const snapshot = toggle(
      'Create ending snapshot',
      'Keep a restorable branch point with the current Scene State.',
      true
    )
    const clear = toggle(
      'Clear Scene State afterward',
      'Start the next scene with an empty temporary state.',
      false
    )
    options.append(snapshot.row, clear.row)
    const actions = createElement('div', 'furina-inline-actions')
    const save = button(
      'End Scene & Save',
      'furina-button furina-button-primary'
    )
    actions.append(save)
    const status = createElement('div', 'furina-portable-help')
    save.addEventListener('click', async () => {
      if (!summary.value.trim()) {
        status.textContent = 'Add a short summary before ending the scene.'
        summary.focus()
        return
      }
      const recap = await manager.endScene(
        {
          title: title.value,
          summary: summary.value,
          developments: developments.value,
          openThreads: threads.value,
          endingState: ending.value,
          nextHook: next.value
        },
        {clearScene: clear.box.checked, createSnapshot: snapshot.box.checked}
      )
      if (!recap) {
        status.textContent = 'The recap could not be saved.'
        return
      }
      Atelier.PanelShell?.navigate?.('story', 'recaps')
    })
    root.append(
      hero,
      field('Scene title', title),
      field('Recap', summary),
      field('Important developments', developments),
      field('Open threads', threads),
      field('Ending state', ending),
      field('Next-scene hook', next),
      options,
      actions,
      status
    )
    return shell
  }

  function recapEditor(recap) {
    const manager = Atelier.SceneIntelligenceManager
    const editor = createElement('div', 'furina-story-editor')
    const title = input(recap.title, 'Scene title'),
      summary = textarea(recap.summary, 'Scene recap', 6),
      developments = textarea(recap.developments, 'Developments', 3),
      threads = textarea(recap.openThreads, 'Open threads', 3),
      ending = textarea(recap.endingState, 'Ending state', 3),
      next = textarea(recap.nextHook, 'Next hook', 3)
    const actions = createElement('div', 'furina-inline-actions'),
      save = button('Save Recap', 'furina-button furina-button-primary'),
      cancel = button('Cancel')
    actions.append(save, cancel)
    save.addEventListener('click', async () => {
      const ok = await manager.saveRecap({
        ...recap,
        title: title.value,
        summary: summary.value,
        developments: developments.value,
        openThreads: threads.value,
        endingState: ending.value,
        nextHook: next.value
      })
      if (!ok) {
        summary.focus()
        return
      }
      Atelier.PanelState.storyEditingRecapId = null
      rerender()
    })
    cancel.addEventListener('click', () => {
      Atelier.PanelState.storyEditingRecapId = null
      rerender()
    })
    editor.append(
      createElement('div', 'furina-workspace-block-title', 'Edit Scene Recap'),
      field('Title', title),
      field('Recap', summary),
      field('Developments', developments),
      field('Open threads', threads),
      field('Ending state', ending),
      field('Next hook', next),
      actions
    )
    return editor
  }

  function createRecapsSection() {
    const shell = section('Scene Recaps & Previously On')
    const root = shell.furinaContent
    const manager = Atelier.SceneIntelligenceManager
    const auto = toggle(
      'Show “Previously On…” when reopening',
      'Display the latest recap once per browsing session when this conversation opens.',
      manager.settings.showOnOpen
    )
    auto.box.addEventListener('change', async () => {
      await manager.update({showOnOpen: auto.box.checked})
    })
    const preview = button('Preview Latest Recap')
    preview.disabled = !manager.getLatestRecap()
    preview.addEventListener('click', () => manager.showPreviouslyOn())
    root.append(auto.row, preview)
    const editing = Atelier.PanelState.storyEditingRecapId
    if (editing) {
      const recap = manager.settings.recaps.find(item => item.id === editing)
      if (recap) root.append(recapEditor(recap))
    }
    const list = createElement('div', 'furina-story-list')
    if (!manager.settings.recaps.length)
      list.append(
        createElement(
          'div',
          'furina-portable-empty',
          'No completed scene recaps yet. Use Story · Current to end the first scene.'
        )
      )
    manager.settings.recaps.forEach(recap => {
      const card = createElement('article', 'furina-story-card')
      const header = createElement('div', 'furina-story-card-header')
      const identity = createElement('div')
      identity.append(
        createElement('div', 'furina-story-card-title', recap.title),
        createElement(
          'div',
          'furina-story-card-meta',
          recap.chapterTitle ||
            recap.sceneState.sceneNumber ||
            new Date(recap.createdAt).toLocaleDateString()
        )
      )
      header.append(
        identity,
        createElement(
          'span',
          'furina-story-card-date',
          new Date(recap.createdAt).toLocaleDateString()
        )
      )
      const summary = createElement(
        'p',
        'furina-story-card-copy',
        recap.summary
      )
      const details = createElement('div', 'furina-story-details')
      if (recap.openThreads)
        details.append(createElement('div', '', 'Open: ' + recap.openThreads))
      if (recap.nextHook)
        details.append(createElement('div', '', 'Next: ' + recap.nextHook))
      const actions = createElement('div', 'furina-inline-actions'),
        show = button('Previously On'),
        edit = button('Edit'),
        remove = button('Delete', 'furina-button furina-button-danger')
      show.addEventListener('click', () => manager.showPreviouslyOn(recap))
      edit.addEventListener('click', () => {
        Atelier.PanelState.storyEditingRecapId = recap.id
        rerender()
      })
      remove.addEventListener('click', async () => {
        if (confirm(`Delete “${recap.title}”?`)) {
          await manager.removeRecap(recap.id)
          rerender()
        }
      })
      actions.append(show, edit, remove)
      card.append(header, summary, details, actions)
      list.append(card)
    })
    root.append(list)
    return shell
  }

  function timelineEditor(event) {
    const manager = Atelier.SceneIntelligenceManager,
      editor = createElement('div', 'furina-story-editor')
    const title = input(event.title, 'The seal breaks'),
      date = input(event.dateLabel, 'Day 4 — midnight'),
      details = textarea(event.details, 'What happened?', 4),
      participants = input(event.participants, 'User, Raven'),
      consequence = textarea(
        event.consequence,
        'What changed because of it?',
        3
      ),
      status = select(
        [
          ['completed', 'Completed'],
          ['ongoing', 'Ongoing'],
          ['planned', 'Planned']
        ],
        event.status
      )
    const grid = createElement('div', 'furina-story-form-grid')
    grid.append(
      field('Date / story time', date),
      field('Participants', participants),
      field('Status', status)
    )
    const actions = createElement('div', 'furina-inline-actions'),
      save = button('Save Event', 'furina-button furina-button-primary'),
      cancel = button('Cancel')
    actions.append(save, cancel)
    save.addEventListener('click', async () => {
      const ok = await manager.saveTimeline({
        ...event,
        title: title.value,
        dateLabel: date.value,
        details: details.value,
        participants: participants.value,
        consequence: consequence.value,
        status: status.value
      })
      if (!ok) {
        title.focus()
        return
      }
      Atelier.PanelState.storyEditingEventId = null
      rerender()
    })
    cancel.addEventListener('click', () => {
      Atelier.PanelState.storyEditingEventId = null
      rerender()
    })
    editor.append(
      createElement(
        'div',
        'furina-workspace-block-title',
        event.title ? 'Edit Timeline Event' : 'New Timeline Event'
      ),
      field('Event', title),
      grid,
      field('Details', details),
      field('Consequence', consequence),
      actions
    )
    return editor
  }

  function createTimelineSection() {
    const shell = section('Story Timeline')
    const root = shell.furinaContent,
      manager = Atelier.SceneIntelligenceManager
    const hero = createElement('div', 'furina-story-hero'),
      copy = createElement('div')
    copy.append(
      createElement(
        'div',
        'furina-story-hero-title',
        'What happened, and when'
      ),
      createElement(
        'div',
        'furina-story-hero-copy',
        'Ending a scene adds an event automatically. Add or edit milestones whenever the story needs clearer chronology.'
      )
    )
    const add = button('+ Add Event', 'furina-button furina-button-primary')
    add.addEventListener('click', () => {
      Atelier.PanelState.storyEditingEventId = 'new'
      rerender()
    })
    hero.append(copy, add)
    root.append(hero)
    const editing = Atelier.PanelState.storyEditingEventId
    if (editing) {
      const event =
        editing === 'new'
          ? {
              id: '',
              title: '',
              dateLabel: '',
              details: '',
              participants: '',
              consequence: '',
              status: 'completed',
              createdAt: Date.now()
            }
          : manager.settings.timeline.find(item => item.id === editing)
      if (event) root.append(timelineEditor(event))
    }
    const list = createElement('div', 'furina-story-timeline')
    if (!manager.settings.timeline.length)
      list.append(
        createElement('div', 'furina-portable-empty', 'No timeline events yet.')
      )
    manager.settings.timeline.forEach(event => {
      const row = createElement('article', 'furina-story-timeline-event')
      const rail = createElement('div', 'furina-story-timeline-rail')
      rail.append(createElement('span', 'furina-story-timeline-dot'))
      const body = createElement('div', 'furina-story-timeline-body')
      body.append(
        createElement(
          'div',
          'furina-story-card-meta',
          [event.dateLabel, event.chapterTitle, event.status]
            .filter(Boolean)
            .join(' · ')
        ),
        createElement('div', 'furina-story-card-title', event.title),
        createElement('p', 'furina-story-card-copy', event.details)
      )
      if (event.consequence)
        body.append(
          createElement(
            'div',
            'furina-story-consequence',
            'Consequence: ' + event.consequence
          )
        )
      const actions = createElement('div', 'furina-inline-actions'),
        edit = button('Edit'),
        remove = button('Delete', 'furina-button furina-button-danger')
      edit.addEventListener('click', () => {
        Atelier.PanelState.storyEditingEventId = event.id
        rerender()
      })
      remove.addEventListener('click', async () => {
        await manager.removeTimeline(event.id)
        rerender()
      })
      actions.append(edit, remove)
      body.append(actions)
      row.append(rail, body)
      list.append(row)
    })
    root.append(list)
    return shell
  }

  function createSnapshotsSection() {
    const shell = section('Scene Snapshots & Alternate Takes')
    const root = shell.furinaContent,
      manager = Atelier.SceneIntelligenceManager
    root.append(
      createElement(
        'div',
        'furina-portable-help',
        "Capture Furina's current Scene State and connected setup. This does not branch Clank's backend chat; it creates a portable return point and alternate-scene package."
      )
    )
    const title = input(
        Atelier.SceneStateManager?.settings?.title || '',
        'Snapshot name'
      ),
      note = textarea(
        '',
        'Optional alternate direction: What should happen differently from this point?',
        3
      ),
      actions = createElement('div', 'furina-inline-actions'),
      capture = button(
        'Capture Current Scene',
        'furina-button furina-button-primary'
      )
    actions.append(capture)
    capture.addEventListener('click', async () => {
      await manager.captureSnapshot(title.value || 'Scene Snapshot', note.value)
      rerender()
    })
    root.append(
      field('Snapshot name', title),
      field('Alternate-take note', note),
      actions
    )
    const status = createElement('div', 'furina-portable-help')
    const list = createElement('div', 'furina-story-list')
    if (!manager.settings.snapshots.length)
      list.append(
        createElement('div', 'furina-portable-empty', 'No snapshots yet.')
      )
    manager.settings.snapshots.forEach(snapshot => {
      const card = createElement('article', 'furina-story-card')
      const header = createElement('div', 'furina-story-card-header')
      header.append(
        createElement('div', 'furina-story-card-title', snapshot.title),
        createElement(
          'span',
          'furina-story-card-date',
          new Date(snapshot.createdAt).toLocaleDateString()
        )
      )
      const meta = createElement(
        'div',
        'furina-story-card-meta',
        snapshot.chapterTitle ||
          snapshot.sceneState.location ||
          'Current conversation'
      )
      const copy = createElement(
        'p',
        'furina-story-card-copy',
        snapshot.branchNote ||
          snapshot.sceneState.notes ||
          'Scene State captured.'
      )
      const badges = createElement('div', 'furina-story-snapshot-badges')
      badges.append(
        createElement('span', '', `${snapshot.continuity.length} memories`),
        createElement('span', '', `${snapshot.activeGuards.length} guards`),
        createElement(
          'span',
          '',
          `Preset: ${snapshot.directorPreset || 'none'}`
        )
      )
      const row = createElement('div', 'furina-inline-actions'),
        restore = button('Restore Scene State'),
        copyButton = button('Copy Package'),
        remove = button('Delete', 'furina-button furina-button-danger')
      restore.addEventListener('click', async () => {
        if (confirm('Replace the current Scene State with this snapshot?')) {
          await manager.restoreSnapshot(snapshot.id)
          status.textContent = 'Scene State restored.'
        }
      })
      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(
            manager.buildBranchPackage(snapshot)
          )
          status.textContent = 'Alternate-scene package copied.'
        } catch {
          status.textContent = 'Clipboard access was unavailable.'
        }
      })
      remove.addEventListener('click', async () => {
        await manager.removeSnapshot(snapshot.id)
        rerender()
      })
      row.append(restore, copyButton, remove)
      card.append(header, meta, copy, badges, row)
      list.append(card)
    })
    root.append(status, list)
    return shell
  }

  Sections.createEndSceneSection = createEndSceneSection
  Sections.createStoryRecapsSection = createRecapsSection
  Sections.createStoryTimelineSection = createTimelineSection
  Sections.createStorySnapshotsSection = createSnapshotsSection
})()
