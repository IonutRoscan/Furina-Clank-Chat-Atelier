'use strict'


/*
  Developer notes

  Scene Presentation panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/* Pillar E: normal-chat scene start and presentation controls. */
;(() => {
  const Atelier = window.ClankAtelier
  const Sections = Atelier.PanelSections
  const {createElement, createSection} = Atelier.PanelUI
  const rerender = () => Atelier.PanelShell?.rebuild?.()
  const section = title => createSection(title, {collapsed: false})
  const button = (text, className = 'furina-button') => {
    const e = createElement('button', className, text)
    e.type = 'button'
    return e
  }
  const input = (value = '', placeholder = '') => {
    const e = document.createElement('input')
    e.type = 'text'
    e.className = 'furina-input'
    e.value = value
    e.placeholder = placeholder
    return e
  }
  const textarea = (value = '', placeholder = '', rows = 3) => {
    const e = document.createElement('textarea')
    e.className = 'furina-textarea'
    e.value = value
    e.placeholder = placeholder
    e.rows = rows
    return e
  }
  const select = (options, value) => {
    const e = document.createElement('select')
    e.className = 'furina-select'
    options.forEach(([v, label]) => {
      const o = document.createElement('option')
      o.value = v
      o.textContent = label
      o.selected = v === value
      e.append(o)
    })
    return e
  }
  const field = (label, control, help = '') => {
    const wrap = createElement('label', 'furina-text-control')
    wrap.append(createElement('span', 'furina-control-label', label), control)
    if (help) wrap.append(createElement('span', 'furina-portable-help', help))
    return wrap
  }
  const toggle = (title, description, checked) => {
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

  function createStartSceneSection() {
    const shell = section('Start Scene')
    const root = shell.furinaContent
    const state = Atelier.SceneStateManager?.settings || {}
    const presentation = Atelier.ScenePresentationManager
    const hero = createElement('div', 'furina-presentation-hero')
    hero.append(
      createElement(
        'div',
        'furina-story-hero-title',
        'Set the stage in one pass'
      ),
      createElement(
        'div',
        'furina-story-hero-copy',
        'Fill only what matters. Starting saves Scene State, optionally applies an atmosphere preset, then plays a transition and title card in the normal chat.'
      )
    )

    const title = input(state.title, 'The Cathedral After Midnight')
    const number = input(state.sceneNumber, 'Chapter 4 · Scene 2')
    const location = input(state.location, 'Ruined cathedral')
    const time = input(state.time, 'After midnight')
    const present = input(state.present, 'User, Raven')
    const absent = input(state.absent, 'Maya')
    const weather = input(state.weather, 'Heavy rain')
    const mood = input(state.mood, 'Tense, restrained')
    const objective = textarea(
      state.objective,
      'What is everyone trying to accomplish?',
      3
    )
    const threat = textarea(state.threat, 'Immediate danger or pressure', 2)
    const conditions = textarea(
      state.conditions,
      'Injuries, possessions, temporary states…',
      2
    )
    const notes = textarea(
      state.notes,
      'Anything Clank should remember for this scene',
      3
    )
    const presets = presentation.getPresets()
    const preset = select(
      [
        ['', 'Do not change atmosphere'],
        ...presets.map(item => [item.id, item.name])
      ],
      ''
    )
    const transition = select(
      [
        ['fade-black', 'Fade to black'],
        ['theme-color', 'Theme-color sweep'],
        ['white-flash', 'White flash'],
        ['red-impact', 'Red impact'],
        ['soft-dissolve', 'Soft dissolve'],
        ['brief-blur', 'Brief blur'],
        ['time-passes', 'Time passes']
      ],
      presentation.settings.defaultTransition
    )
    const card = toggle(
      'Show scene title card',
      'Displays the scene title, location, and time after the transition.',
      true
    )
    const caption = toggle(
      'Keep a scene caption above the composer',
      'A small normal-chat reminder using the saved title, location, and time.',
      presentation.settings.captionEnabled
    )

    const grid = createElement('div', 'furina-story-form-grid')
    grid.append(
      field('Scene title', title),
      field('Chapter / scene', number),
      field('Location', location),
      field('Time', time),
      field('Present characters', present),
      field('Absent characters', absent),
      field('Weather', weather),
      field('Mood', mood)
    )
    const presentationGrid = createElement('div', 'furina-story-form-grid')
    presentationGrid.append(
      field('Atmosphere preset', preset),
      field('Entrance transition', transition)
    )
    const options = createElement('div', 'furina-story-options')
    options.append(card.row, caption.row)
    const start = button(
      'Start Scene',
      'furina-button furina-button-primary furina-start-scene-button'
    )
    const status = createElement('div', 'furina-portable-help')
    start.addEventListener('click', async () => {
      if (!title.value.trim() && !location.value.trim()) {
        status.textContent = 'Add a scene title or location first.'
        title.focus()
        return
      }
      await Atelier.SceneStateManager.updateMany({
        title: title.value,
        sceneNumber: number.value,
        location: location.value,
        time: time.value,
        present: present.value,
        absent: absent.value,
        weather: weather.value,
        mood: mood.value,
        objective: objective.value,
        threat: threat.value,
        conditions: conditions.value,
        notes: notes.value
      })
      await presentation.update({
        captionEnabled: caption.box.checked,
        defaultTransition: transition.value
      })
      if (preset.value)
        await presentation.applyPreset(preset.value, {includeScene: false})
      presentation.refreshCaption()
      presentation.playTransition(
        transition.value,
        transition.value === 'time-passes' ? time.value : ''
      )
      if (card.box.checked)
        setTimeout(
          () =>
            presentation.showTitleCard({
              kind: number.value || 'Scene',
              title: title.value || location.value,
              subtitle: [location.value, time.value].filter(Boolean).join(' · ')
            }),
          transition.value === 'time-passes' ? 850 : 400
        )
      status.textContent =
        'Scene started. Scene State and presentation choices were saved.'
    })

    root.append(
      hero,
      grid,
      field('Current objective', objective),
      field('Immediate threat', threat),
      field('Conditions', conditions),
      field('Director notes for this scene', notes),
      createElement('div', 'furina-workspace-block-title', 'Presentation'),
      presentationGrid,
      options,
      start,
      status
    )
    return shell
  }

  function createTitleCardControls(root, manager) {
    const block = createElement('div', 'furina-presentation-block')
    block.append(
      createElement(
        'div',
        'furina-workspace-block-title',
        'Title Cards & Transitions'
      ),
      createElement(
        'div',
        'furina-portable-help',
        'Manual previews only. These effects never inspect the roleplay text.'
      )
    )
    const state = Atelier.SceneStateManager?.settings || {}
    const kind = select(
      [
        ['scene', 'Scene'],
        ['chapter', 'Chapter'],
        ['location', 'Location'],
        ['time', 'Time'],
        ['interlude', 'Interlude']
      ],
      'scene'
    )
    const title = input(state.title || state.location, 'Scene title')
    const subtitle = input(
      [state.location, state.time].filter(Boolean).join(' · '),
      'Optional subtitle'
    )
    const style = select(
      [
        ['cinematic', 'Cinematic'],
        ['minimal', 'Minimal'],
        ['theatrical', 'Theatrical'],
        ['soft', 'Soft']
      ],
      manager.settings.cardStyle
    )
    const transition = select(
      [
        ['fade-black', 'Fade to black'],
        ['theme-color', 'Theme-color sweep'],
        ['white-flash', 'White flash'],
        ['red-impact', 'Red impact'],
        ['soft-dissolve', 'Soft dissolve'],
        ['brief-blur', 'Brief blur'],
        ['time-passes', 'Time passes']
      ],
      manager.settings.defaultTransition
    )
    const grid = createElement('div', 'furina-story-form-grid')
    grid.append(
      field('Card type', kind),
      field('Style', style),
      field('Title', title),
      field('Subtitle', subtitle),
      field('Transition', transition)
    )
    const actions = createElement('div', 'furina-inline-actions')
    const show = button(
      'Show Title Card',
      'furina-button furina-button-primary'
    )
    const play = button('Play Transition')
    show.addEventListener('click', async () => {
      await manager.update({cardStyle: style.value})
      manager.showTitleCard({
        kind: kind.value,
        title: title.value,
        subtitle: subtitle.value,
        style: style.value
      })
    })
    play.addEventListener('click', async () => {
      await manager.update({defaultTransition: transition.value})
      manager.playTransition(
        transition.value,
        transition.value === 'time-passes'
          ? subtitle.value || 'Time passes'
          : ''
      )
    })
    actions.append(show, play)
    block.append(grid, actions)
    root.append(block)
  }

  function createAtmosphereControls(root, manager) {
    const block = createElement('div', 'furina-presentation-block')
    block.append(
      createElement(
        'div',
        'furina-workspace-block-title',
        'Scene Atmosphere Presets'
      ),
      createElement(
        'div',
        'furina-portable-help',
        "A preset can bundle Furina's atmosphere effect, background color filters, current ambience track, and optional mood/weather labels. Built-ins never replace your music."
      )
    )
    const list = createElement('div', 'furina-presentation-preset-grid')
    manager.getPresets().forEach(preset => {
      const card = createElement('article', 'furina-presentation-preset-card')
      const effect = preset.atmosphere?.enabled
        ? preset.atmosphere.effect
        : 'clean'
      card.append(
        createElement(
          'span',
          `furina-presentation-preset-icon furina-preset-${effect}`,
          preset.atmosphere?.enabled ? '✦' : '◇'
        ),
        createElement('strong', '', preset.name),
        createElement(
          'span',
          '',
          [preset.scene?.mood, preset.scene?.weather]
            .filter(Boolean)
            .join(' · ') || 'Saved visual and audio state'
        )
      )
      const actions = createElement('div', 'furina-inline-actions')
      const apply = button('Apply')
      apply.addEventListener('click', async () => {
        await manager.applyPreset(preset.id)
        rerender()
      })
      actions.append(apply)
      if (!preset.builtin) {
        const remove = button('Delete', 'furina-button furina-button-danger')
        remove.addEventListener('click', async () => {
          if (confirm(`Delete “${preset.name}”?`)) {
            await manager.removePreset(preset.id)
            rerender()
          }
        })
        actions.append(remove)
      }
      card.append(actions)
      list.append(card)
    })
    const saveRow = createElement('div', 'furina-presentation-save-row')
    const name = input('', 'My candlelit library')
    const save = button(
      'Save Current Setup',
      'furina-button furina-button-primary'
    )
    const status = createElement('div', 'furina-portable-help')
    save.addEventListener('click', async () => {
      const saved = await manager.capturePreset(name.value)
      if (!saved) {
        status.textContent = 'Give the preset a name first.'
        name.focus()
        return
      }
      rerender()
    })
    saveRow.append(name, save)
    block.append(
      list,
      createElement(
        'div',
        'furina-control-label',
        'Create a custom preset from the current setup'
      ),
      saveRow,
      status
    )
    root.append(block)
  }

  function createCaptionControls(root, manager) {
    const block = createElement('div', 'furina-presentation-block')
    block.append(
      createElement('div', 'furina-workspace-block-title', 'Scene Caption')
    )
    const enabled = toggle(
      'Show above the composer',
      'Uses the current Scene State title, chapter/scene, location, and time. Hidden automatically in alternate interfaces.',
      manager.settings.captionEnabled
    )
    const style = select(
      [
        ['minimal', 'Minimal'],
        ['cinematic', 'Cinematic'],
        ['theatrical', 'Theatrical'],
        ['soft', 'Soft']
      ],
      manager.settings.captionStyle
    )
    enabled.box.addEventListener('change', async () => {
      await manager.update({captionEnabled: enabled.box.checked})
    })
    style.addEventListener('change', async () => {
      await manager.update({captionStyle: style.value})
    })
    block.append(enabled.row, field('Caption style', style))
    root.append(block)
  }

  function createScreenshotControls(root, manager) {
    const block = createElement('div', 'furina-presentation-block')
    block.append(
      createElement('div', 'furina-workspace-block-title', 'Screenshot Mode'),
      createElement(
        'div',
        'furina-portable-help',
        'Temporarily applies clean Reader settings, then restores them when you press Escape. The countdown gives you time to close the Furina panel.'
      )
    )
    const values = manager.settings.screenshot
    const composer = toggle(
      'Hide composer',
      'Remove the message box from the frame.',
      values.hideComposer
    )
    const actions = toggle(
      'Hide message actions',
      'Remove action buttons beneath messages.',
      values.hideActions
    )
    const sidebar = toggle(
      'Hide Clank sidebar',
      'Use more horizontal room for the conversation.',
      values.hideSidebar
    )
    const avatars = toggle(
      'Hide avatars',
      'Keep only names and message content.',
      values.hideAvatars
    )
    const wide = toggle(
      'Wide reading layout',
      'Expand the conversation for screenshots.',
      values.wideLayout
    )
    const caption = toggle(
      'Keep scene caption',
      "Include Furina's small scene label when enabled.",
      values.showCaption
    )
    const countdown = select(
      [
        ['0', 'No countdown'],
        ['3', '3 seconds'],
        ['5', '5 seconds'],
        ['10', '10 seconds']
      ],
      String(values.countdown)
    )
    const options = createElement('div', 'furina-story-options')
    options.append(
      composer.row,
      actions.row,
      sidebar.row,
      avatars.row,
      wide.row,
      caption.row
    )
    const start = button(
      'Start Screenshot Mode',
      'furina-button furina-button-primary'
    )
    start.addEventListener('click', () => {
      manager.startScreenshot({
        ...values,
        hideComposer: composer.box.checked,
        hideActions: actions.box.checked,
        hideSidebar: sidebar.box.checked,
        hideAvatars: avatars.box.checked,
        wideLayout: wide.box.checked,
        showCaption: caption.box.checked,
        countdown: Number(countdown.value)
      })
      Atelier.PanelShell?.close?.()
    })
    block.append(options, field('Countdown', countdown), start)
    root.append(block)
  }

  function createScenePresentationSection() {
    const shell = section('Scene Presentation')
    const root = shell.furinaContent
    const manager = Atelier.ScenePresentationManager
    const hero = createElement('div', 'furina-presentation-hero')
    hero.append(
      createElement(
        'div',
        'furina-story-hero-title',
        'A small stage for the normal chat'
      ),
      createElement(
        'div',
        'furina-story-hero-copy',
        'Everything here is manual and presentation-only. Phantom Chat and Visual Novel Mode keep their existing layouts.'
      )
    )
    root.append(hero)
    createTitleCardControls(root, manager)
    createAtmosphereControls(root, manager)
    createCaptionControls(root, manager)
    createScreenshotControls(root, manager)
    return shell
  }

  Sections.createStartSceneSection = createStartSceneSection
  Sections.createScenePresentationSection = createScenePresentationSection
})()
