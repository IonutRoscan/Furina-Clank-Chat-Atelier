'use strict'


/*
  Developer notes

  Scene State panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Scene State Panel Section

    Provides a small editor for temporary facts that describe what is
    true in the current RP scene.
*/
;(() => {
  const Atelier = window.ClankAtelier

  const UI = Atelier.PanelUI

  const Sections = Atelier.PanelSections

  const {createElement, createSection} = UI

  function createField(labelText, value, placeholder = '') {
    const control = createElement('label', 'furina-text-control')

    const label = createElement('span', 'furina-control-label', labelText)

    const input = document.createElement('input')

    input.type = 'text'

    input.className = 'furina-input'

    input.value = value || ''

    input.placeholder = placeholder

    control.append(label, input)

    return {
      control,
      input
    }
  }

  function createSceneStateSection() {
    const section = createSection('Scene State', {
      collapsed: false
    })

    const manager = Atelier.SceneStateManager

    if (!manager) {
      section.furinaContent.appendChild(
        createElement(
          'div',
          'furina-portable-empty',
          'Scene State engine unavailable.'
        )
      )

      return section
    }

    const intro = createElement(
      'div',
      'furina-portable-help',
      'Keep a small snapshot of what is true right now. Scene State belongs only to this conversation and is meant for temporary RP context.'
    )

    const title = createField(
      'Scene Title',
      manager.settings.title,
      'The Cathedral Confrontation'
    )

    const sceneNumber = createField(
      'Scene / Day',
      manager.settings.sceneNumber,
      'Day 4 — Scene 2'
    )

    const location = createField(
      'Location',
      manager.settings.location,
      "Raven's apartment — living room"
    )

    const time = createField('Time', manager.settings.time, '10:47 PM')

    const present = createField(
      'Present',
      manager.settings.present,
      'User, Raven, Emi'
    )

    const absent = createField(
      'Not Present',
      manager.settings.absent,
      'Maya, Emi'
    )

    const weather = createField(
      'Weather / Environment',
      manager.settings.weather,
      'Cold rain; power is flickering'
    )

    const mood = createField(
      'Mood',
      manager.settings.mood,
      'Guarded, intimate, increasingly uneasy'
    )

    const objective = createField(
      'Immediate Objective',
      manager.settings.objective,
      'Convince Raven to inspect the broken seal'
    )

    const threat = createField(
      'Active Threat',
      manager.settings.threat,
      'The White Lady may already be inside'
    )

    const conditions = createField(
      'Conditions / Injuries',
      manager.settings.conditions,
      'User: wounded hand; Raven: exhausted'
    )

    const notesControl = createElement('label', 'furina-text-control')

    const notesLabel = createElement(
      'span',
      'furina-control-label',
      'Scene Notes'
    )

    const notes = document.createElement('textarea')

    notes.className = 'furina-textarea'

    notes.rows = 6

    notes.value = manager.settings.notes || ''

    notes.placeholder =
      'What is happening right now? Include temporary details the AI should not lose track of.'

    notesControl.append(notesLabel, notes)

    const includeRow = createElement('label', 'furina-toggle-row')

    const includeText = createElement('div')

    includeText.append(
      createElement('div', 'furina-toggle-title', 'Include in Director'),

      createElement(
        'div',
        'furina-toggle-description',
        "Add this scene context to Furina's hidden OOC guidance when you send a normal message."
      )
    )

    const include = document.createElement('input')

    include.type = 'checkbox'

    include.className = 'furina-checkbox'

    include.checked = manager.settings.includeInDirector !== false

    includeRow.append(includeText, include)

    const actions = createElement('div', 'furina-inline-actions')

    const save = createElement(
      'button',
      'furina-button furina-button-primary',
      'Save Scene State'
    )

    save.type = 'button'

    const clear = createElement('button', 'furina-button', 'Clear Scene')

    clear.type = 'button'

    const status = createElement('div', 'furina-portable-help')

    save.addEventListener('click', async () => {
      await manager.updateMany({
        title: title.input.value,

        sceneNumber: sceneNumber.input.value,

        location: location.input.value,

        time: time.input.value,

        present: present.input.value,

        absent: absent.input.value,

        weather: weather.input.value,

        mood: mood.input.value,

        objective: objective.input.value,

        threat: threat.input.value,

        conditions: conditions.input.value,

        notes: notes.value,

        includeInDirector: include.checked
      })

      status.textContent = manager.hasContent()
        ? 'Scene State saved for this conversation.'
        : 'Scene State is currently empty.'

      Atelier.PanelShell?.refreshNavigation?.()
    })

    clear.addEventListener('click', async () => {
      const confirmed = window.confirm(
        'Clear the current Scene State for this conversation?'
      )

      if (!confirmed) {
        return
      }

      await manager.clear()

      Atelier.PanelShell?.rebuild?.()
    })

    actions.append(save, clear)

    section.furinaContent.append(
      intro,
      title.control,
      sceneNumber.control,
      location.control,
      time.control,
      present.control,
      absent.control,
      weather.control,
      mood.control,
      objective.control,
      threat.control,
      conditions.control,
      notesControl,
      includeRow,
      actions,
      status
    )

    return section
  }

  Sections.createSceneStateSection = createSceneStateSection
})()
