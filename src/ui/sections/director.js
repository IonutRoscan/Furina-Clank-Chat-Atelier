'use strict'


/*
  Developer notes

  Director panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Director Panel Section

    Renders the existing persistent Director Notes and continuity-note controls. No one-shot or additional management features are added here.
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

  // Director Notes

  function createDirectorSection() {
    const section = createSection('Director', {
      collapsed: true
    })

    const manager = Atelier.DirectorManager

    if (!manager) {
      section.furinaContent.appendChild(
        createElement(
          'div',
          'furina-portable-empty',
          'Director engine unavailable.'
        )
      )

      return section
    }

    const intro = createElement(
      'div',
      'furina-portable-help',
      'Persistent OOC guidance that Furina adds to every message you send in this conversation.'
    )

    const disclosure = createElement(
      'div',
      'furina-atmosphere-note',
      "Director Notes are added to the actual text sent to Clank, then hidden only from Furina's local rendered copy. The underlying Clank message remains unchanged."
    )

    const enabledRow = createElement('label', 'furina-toggle-row')

    const enabledText = createElement('div')

    enabledText.append(
      createElement('div', 'furina-toggle-title', 'Enable Director Notes'),

      createElement(
        'div',
        'furina-toggle-description',
        'Remind the AI of these instructions on every normal message.'
      )
    )

    const enabled = document.createElement('input')

    enabled.type = 'checkbox'

    enabled.className = 'furina-checkbox'

    enabled.checked = Boolean(manager.settings.enabled)

    enabled.addEventListener('change', async () => {
      await manager.update('enabled', enabled.checked)

      Atelier.PanelShell.rebuild()
    })

    enabledRow.append(enabledText, enabled)

    // Director templates

    const templateLabel = createElement(
      'div',
      'furina-panel-group-label',
      'Quick Template'
    )

    const templateHelp = createElement(
      'div',
      'furina-portable-help',
      'Load an optional starting ruleset, then edit it however you want. Templates never enable Director automatically.'
    )

    const templateSelect = document.createElement('select')

    templateSelect.className = 'furina-select'

    const templateOptions = [
      {
        value: 'immersive',

        label: 'General Immersive RP'
      },

      {
        value: 'agency',

        label: 'User Agency & Consistency'
      },

      {
        value: 'world',

        label: 'Lived-In World'
      }
    ]

    templateOptions.forEach(optionData => {
      const option = document.createElement('option')

      option.value = optionData.value

      option.textContent = optionData.label

      templateSelect.appendChild(option)
    })

    // Action formatting

    const actionFormatLabel = createElement(
      'span',
      'furina-control-label',
      'Narration / action formatting'
    )

    const actionFormat = document.createElement('select')

    actionFormat.className = 'furina-select'
    ;[
      ['asterisk', '*asterisks*'],

      ['underscore', '_underscores_'],

      ['bold', '**bold**'],

      ['plain', 'Plain text'],

      ['brackets', '[square brackets]'],

      ['custom', 'Custom…']
    ].forEach(([value, label]) => {
      const option = document.createElement('option')

      option.value = value

      option.textContent = label

      actionFormat.appendChild(option)
    })

    actionFormat.value = 'asterisk'

    const actionFormatControl = createElement('label', 'furina-select-control')

    actionFormatControl.append(actionFormatLabel, actionFormat)

    // Dialogue formatting

    const dialogueFormatLabel = createElement(
      'span',
      'furina-control-label',
      'Dialogue formatting'
    )

    const dialogueFormat = document.createElement('select')

    dialogueFormat.className = 'furina-select'
    ;[
      ['quotes', '"quotation marks"'],

      ['curly', '“curly quotation marks”'],

      ['plain', 'Plain text'],

      ['guillemets', '«guillemets»'],

      ['custom', 'Custom…']
    ].forEach(([value, label]) => {
      const option = document.createElement('option')

      option.value = value

      option.textContent = label

      dialogueFormat.appendChild(option)
    })

    dialogueFormat.value = 'quotes'

    const dialogueFormatControl = createElement(
      'label',
      'furina-select-control'
    )

    dialogueFormatControl.append(dialogueFormatLabel, dialogueFormat)

    // Custom formatting symbols

    const customFormatArea = createElement('div', 'furina-conditional-group')

    const customActionLabel = createElement(
      'div',
      'furina-panel-group-label',
      'Custom Action Wrapper'
    )

    const customActionRow = createElement('div', 'furina-portable-action-grid')

    const customActionOpen = document.createElement('input')

    customActionOpen.type = 'text'

    customActionOpen.className = 'furina-text-input'

    customActionOpen.maxLength = 32

    customActionOpen.placeholder = 'Opening symbol'

    customActionOpen.value = '('

    const customActionClose = document.createElement('input')

    customActionClose.type = 'text'

    customActionClose.className = 'furina-text-input'

    customActionClose.maxLength = 32

    customActionClose.placeholder = 'Closing symbol'

    customActionClose.value = ')'

    customActionRow.append(customActionOpen, customActionClose)

    const customDialogueLabel = createElement(
      'div',
      'furina-panel-group-label',
      'Custom Dialogue Wrapper'
    )

    const customDialogueRow = createElement(
      'div',
      'furina-portable-action-grid'
    )

    const customDialogueOpen = document.createElement('input')

    customDialogueOpen.type = 'text'

    customDialogueOpen.className = 'furina-text-input'

    customDialogueOpen.maxLength = 32

    customDialogueOpen.placeholder = 'Opening symbol'

    customDialogueOpen.value = '<'

    const customDialogueClose = document.createElement('input')

    customDialogueClose.type = 'text'

    customDialogueClose.className = 'furina-text-input'

    customDialogueClose.maxLength = 32

    customDialogueClose.placeholder = 'Closing symbol'

    customDialogueClose.value = '>'

    customDialogueRow.append(customDialogueOpen, customDialogueClose)

    const customFormatHelp = createElement(
      'div',
      'furina-portable-help',
      'Examples: (action), [action], <<dialogue>>, or any custom opening and closing symbols.'
    )

    customFormatArea.append(
      customActionLabel,
      customActionRow,
      customDialogueLabel,
      customDialogueRow,
      customFormatHelp
    )

    const loadTemplate = createElement(
      'button',
      'furina-secondary-button',
      'Load Template'
    )

    loadTemplate.type = 'button'

    function updateCustomFormatVisibility() {
      const actionCustom = actionFormat.value === 'custom'

      const dialogueCustom = dialogueFormat.value === 'custom'

      customActionLabel.hidden = !actionCustom

      customActionRow.hidden = !actionCustom

      customDialogueLabel.hidden = !dialogueCustom

      customDialogueRow.hidden = !dialogueCustom

      customFormatHelp.hidden = !(actionCustom || dialogueCustom)
    }

    actionFormat.addEventListener('change', updateCustomFormatVisibility)

    dialogueFormat.addEventListener('change', updateCustomFormatVisibility)

    updateCustomFormatVisibility()

    const noteLabel = createElement(
      'div',
      'furina-panel-group-label',
      'Persistent OOC Notes'
    )

    const note = document.createElement('textarea')

    note.className = 'furina-import-textarea furina-director-textarea'

    note.maxLength = 6000

    note.placeholder =
      'Example: Never narrate dialogue, thoughts, decisions, or actions for my character.'

    note.value = manager.settings.note

    function getActionFormattingRule() {
      switch (actionFormat.value) {
        case 'underscore':
          return '- Narration and actions are written inside _underscores_.'

        case 'bold':
          return '- Narration and actions are written inside **double asterisks**.'

        case 'plain':
          return '- Narration and actions are written as plain text without special wrapper symbols.'

        case 'brackets':
          return '- Narration and actions are written inside [square brackets].'

        case 'custom': {
          const open = customActionOpen.value || ''

          const close = customActionClose.value || ''

          if (!open && !close) {
            return '- Narration and actions are written as plain text without special wrapper symbols.'
          }

          return `- Narration and actions are written inside ${open}opening and closing wrappers${close}. Use "${open}" before narration/actions and "${close}" after them.`
        }

        case 'asterisk':
        default:
          return '- Narration and actions are written inside *asterisks*.'
      }
    }

    function getDialogueFormattingRule() {
      switch (dialogueFormat.value) {
        case 'curly':
          return '- Dialogue is always written inside “curly quotation marks”.'

        case 'plain':
          return '- Dialogue is written as plain text without special wrapper symbols.'

        case 'guillemets':
          return '- Dialogue is always written inside «guillemets».'

        case 'custom': {
          const open = customDialogueOpen.value || ''

          const close = customDialogueClose.value || ''

          if (!open && !close) {
            return '- Dialogue is written as plain text without special wrapper symbols.'
          }

          return `- Dialogue is always wrapped with "${open}" before the spoken text and "${close}" after it.`
        }

        case 'quotes':
        default:
          return '- Dialogue is always written inside "quotation marks".'
      }
    }

    function buildImmersiveTemplate() {
      return [
        '### Immersion & World Continuity',
        '- Track time of day, weather, season, and environmental conditions when they affect the scene.',
        '- Keep the world feeling active through small background events, routines, sounds, objects, and ongoing activity.',
        '- Characters and locations continue to exist when off-screen. Minor events and routines may continue without the user being present.',
        '- Characters have physical limits and ongoing states such as fatigue, hunger, soreness, injury, stress, and recovery.',
        '- Personal belongings, habits, routines, relationships, and environmental details should accumulate naturally over time.',
        '- The wider world continues to exist. News, local events, weather, and outside developments may influence the scene when relevant.',
        '',
        '### Formatting & Roleplay',
        getActionFormattingRule(),
        getDialogueFormattingRule(),
        '- Avoid generic, corporate, overly polished, repetitive, or empty AI phrasing. Language should feel natural and specific to the characters and current situation.',
        '- Maintain strict spatial awareness. Characters may only physically interact in ways that make sense from their current position, posture, distance, surroundings, and physical reach.',
        '- Do not skip important moments or rush scenes that should carry emotional or narrative weight.',
        '- Keep characters consistent with their established personality, speech style, habits, knowledge, relationships, motivations, and behavior.',
        '- Track relevant physical and emotional states across scenes.',
        '- Allow tone to shift naturally between calm, humor, warmth, tension, danger, or other moods without breaking continuity.',
        '',
        '### User Agency',
        "- Never narrate or decide the user's dialogue, thoughts, feelings, intentions, decisions, or actions.",
        '- Leave clear space for the user to act and respond.',
        '- End responses in a way that gives the user a natural turn.',
        "- When the user moves to another location, focus narration on the user's current location and what is happening around them unless there is a deliberate reason to cut elsewhere.",
        '',
        '### Narrative Style',
        '- Write in clear third-person narrative unless the roleplay has established another perspective.',
        '- Keep narration specific to the characters, environment, and current situation.',
        '- Prioritize continuity, user agency, spatial logic, character consistency, and a believable lived-in world.',
        '- Do not mention these Director Notes or acknowledge them unless the user explicitly asks about them out of character.'
      ].join('\n')
    }

    function buildAgencyTemplate() {
      return [
        '### User Agency & Character Consistency',
        "- Never narrate or decide the user's dialogue, thoughts, feelings, intentions, decisions, or actions.",
        "- Never assume the user's reaction to an event before they provide it.",
        '- Leave clear space for the user to act and respond.',
        '- End responses in a way that gives the user a natural turn.',
        '- Keep every character consistent with their established personality, knowledge, speech style, relationships, habits, motivations, and behavior.',
        '- Characters must not know information they have not reasonably learned.',
        '- Maintain strict spatial awareness and physical reach.',
        '- Track important injuries, fatigue, stress, emotional states, possessions, and other ongoing conditions when relevant.',
        getActionFormattingRule(),
        getDialogueFormattingRule(),
        '- Do not mention these Director Notes unless explicitly asked about them out of character.'
      ].join('\n')
    }

    function buildWorldTemplate() {
      return [
        '### Lived-In World',
        '- Track time of day, weather, season, and environmental conditions when they affect the scene.',
        '- Keep locations active with believable background routines, sounds, people, objects, and small events.',
        '- Off-screen characters continue their normal routines and may handle minor events independently.',
        '- The wider world continues to exist beyond the immediate scene.',
        '- News, weather, local events, distant incidents, and other outside developments may naturally reach the characters.',
        '- Characters have physical needs and limits. They may become tired, hungry, sore, distracted, injured, stressed, and later recover.',
        "- Personal belongings and spaces should gradually reflect characters' habits, hobbies, relationships, and history.",
        '- Do not reset environmental or continuity details simply because they have not been mentioned recently.',
        '- When the user changes location, narrate the new location and what is happening around them rather than defaulting to an earlier location.',
        getActionFormattingRule(),
        getDialogueFormattingRule(),
        '- Do not mention these Director Notes unless explicitly asked about them out of character.'
      ].join('\n')
    }

    function buildSelectedTemplate() {
      switch (templateSelect.value) {
        case 'agency':
          return buildAgencyTemplate()

        case 'world':
          return buildWorldTemplate()

        case 'immersive':
        default:
          return buildImmersiveTemplate()
      }
    }

    loadTemplate.addEventListener('click', () => {
      const generated = Atelier.I18n?.translateTemplate
        ? Atelier.I18n.translateTemplate(buildSelectedTemplate())
        : buildSelectedTemplate()

      /*
                    Protect someone's existing notes from being
                    accidentally destroyed.
                */

      if (note.value.trim()) {
        const replace = Atelier.I18n.confirm(
          'Replace your current Director Notes with this template?'
        )

        if (!replace) {
          return
        }
      }

      note.value = generated

      note.dispatchEvent(
        new Event('input', {
          bubbles: true
        })
      )
    })

    const count = createElement('div', 'furina-portable-status')

    function updateCount() {
      const length = note.value.length

      count.textContent = `${length.toLocaleString()} / 6,000 characters injected per message`

      if (length >= 1500) {
        count.textContent += ' • Consider keeping persistent notes compact.'
      }
    }

    updateCount()

    note.addEventListener('input', updateCount)

    const save = createElement(
      'button',
      'furina-secondary-button',
      'Save Director Notes'
    )

    save.type = 'button'

    const status = createElement('div', 'furina-portable-status')

    save.addEventListener('click', async () => {
      await manager.update('note', note.value)

      status.textContent = 'Director Notes saved.'

      Atelier.PanelShell?.refreshNavigation?.()
    })

    // Structured continuity notes

    const continuityLabel = createElement(
      'div',
      'furina-panel-group-label',
      'Continuity Notes'
    )

    const continuityHelp = createElement(
      'div',
      'furina-portable-help',
      'Add compact facts that Furina should keep reminding the AI about during this conversation.'
    )

    const noteEditor = createElement('div', 'furina-conditional-group')

    const categorySelect = document.createElement('select')

    categorySelect.className = 'furina-select'
    ;[
      ['RULE', 'Rule'],

      ['CANON', 'Canon'],

      ['CHARACTER', 'Character'],

      ['RELATIONSHIP', 'Relationship'],

      ['KNOWLEDGE', 'Knowledge'],

      ['PLOT', 'Plot'],

      ['STYLE', 'Style'],

      ['OTHER', 'Other']
    ].forEach(([value, label]) => {
      const option = document.createElement('option')

      option.value = value

      option.textContent = label

      categorySelect.appendChild(option)
    })

    categorySelect.value = 'CANON'

    const continuityInput = document.createElement('textarea')

    continuityInput.className =
      'furina-import-textarea furina-director-continuity-input'

    continuityInput.maxLength = 2000

    continuityInput.placeholder = 'Example: Mira is secretly afraid of fire.'

    const addContinuityNote = createElement(
      'button',
      'furina-secondary-button',
      'Add Continuity Note'
    )

    addContinuityNote.type = 'button'

    const continuityStatus = createElement('div', 'furina-portable-status')

    async function addStructuredNote() {
      const text = continuityInput.value.trim()

      if (!text) {
        continuityStatus.textContent = 'Write a note first.'

        return
      }

      const nextNotes = [
        ...(Array.isArray(manager.settings.notes)
          ? manager.settings.notes
          : []),

        {
          id: `director-note-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,

          category: categorySelect.value,

          text,

          enabled: true
        }
      ]

      await manager.update('notes', nextNotes)

      continuityInput.value = ''

      Atelier.PanelShell.rebuild()
    }

    addContinuityNote.addEventListener('click', addStructuredNote)

    continuityInput.addEventListener('keydown', event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()

        addStructuredNote()
      }
    })

    noteEditor.append(
      categorySelect,
      continuityInput,
      addContinuityNote,
      continuityStatus
    )

    const continuityBulkActions = createElement(
      'div',
      'furina-portable-action-grid'
    )

    const enableAllNotes = createElement(
      'button',
      'furina-secondary-button',
      'Enable All'
    )

    const disableAllNotes = createElement(
      'button',
      'furina-secondary-button',
      'Disable All'
    )

    enableAllNotes.type = 'button'

    disableAllNotes.type = 'button'

    enableAllNotes.addEventListener('click', async () => {
      const notes = Array.isArray(manager.settings.notes)
        ? manager.settings.notes
        : []

      if (notes.length === 0) {
        return
      }

      const nextNotes = notes.map(noteItem => ({
        ...noteItem,
        enabled: true
      }))

      await manager.update('notes', nextNotes)

      Atelier.PanelShell.rebuild()
    })

    disableAllNotes.addEventListener('click', async () => {
      const notes = Array.isArray(manager.settings.notes)
        ? manager.settings.notes
        : []

      if (notes.length === 0) {
        return
      }

      const nextNotes = notes.map(noteItem => ({
        ...noteItem,
        enabled: false
      }))

      await manager.update('notes', nextNotes)

      Atelier.PanelShell.rebuild()
    })

    continuityBulkActions.append(enableAllNotes, disableAllNotes)

    const continuityList = createElement('div', 'furina-director-note-list')

    const structuredNotes = Array.isArray(manager.settings.notes)
      ? manager.settings.notes
      : []

    if (structuredNotes.length === 0) {
      continuityList.appendChild(
        createElement(
          'div',
          'furina-portable-empty',
          'No continuity notes yet.'
        )
      )
    }

    structuredNotes.forEach(noteItem => {
      const card = createElement('div', 'furina-director-note-card')

      card.classList.toggle('furina-director-note-disabled', !noteItem.enabled)

      const cardHeader = createElement('div', 'furina-director-note-header')

      const category = createElement(
        'span',
        'furina-director-note-category',
        noteItem.category
      )

      const actions = createElement('div', 'furina-director-note-actions')

      const toggle = createElement(
        'button',
        'furina-library-mini-button',
        noteItem.enabled ? 'Disable' : 'Enable'
      )

      const edit = createElement('button', 'furina-library-mini-button', 'Edit')

      const remove = createElement(
        'button',
        'furina-library-mini-button furina-library-delete',
        '×'
      )

      toggle.type = 'button'

      edit.type = 'button'

      remove.type = 'button'

      toggle.addEventListener('click', async () => {
        const nextNotes = structuredNotes.map(current => {
          if (current.id !== noteItem.id) {
            return current
          }

          return {
            ...current,

            enabled: !current.enabled
          }
        })

        await manager.update('notes', nextNotes)

        Atelier.PanelShell.rebuild()
      })

      edit.addEventListener('click', async () => {
        const nextText = Atelier.I18n.prompt(
          `Edit ${noteItem.category} note:`,
          noteItem.text
        )

        if (nextText === null) {
          return
        }

        const cleaned = nextText.trim()

        if (!cleaned) {
          return
        }

        const nextNotes = structuredNotes.map(current => {
          if (current.id !== noteItem.id) {
            return current
          }

          return {
            ...current,

            text: cleaned
          }
        })

        await manager.update('notes', nextNotes)

        Atelier.PanelShell.rebuild()
      })

      remove.addEventListener('click', async () => {
        const confirmed = Atelier.I18n.confirm(
          `Delete this ${noteItem.category} note?`
        )

        if (!confirmed) {
          return
        }

        const nextNotes = structuredNotes.filter(
          current => current.id !== noteItem.id
        )

        await manager.update('notes', nextNotes)

        Atelier.PanelShell.rebuild()
      })

      actions.append(toggle, edit, remove)

      cardHeader.append(category, actions)

      const text = createElement(
        'div',
        'furina-director-note-text',
        noteItem.text
      )

      card.append(cardHeader, text)

      continuityList.appendChild(card)
    })

    const previewLabel = createElement(
      'div',
      'furina-panel-group-label',
      'Injection Format'
    )

    const preview = createElement('div', 'furina-portable-help')

    preview.style.whiteSpace = 'pre-wrap'

    preview.textContent = [
      'ooc: furina-director:',
      '[FURINA_DIRECTOR_NOTES]',
      'Your saved notes...',
      '[/FURINA_DIRECTOR_NOTES]',
      '',
      'Your actual RP message...'
    ].join('\n')

    section.furinaContent.append(
      intro,
      disclosure,
      enabledRow,

      templateLabel,
      templateHelp,
      templateSelect,
      actionFormatControl,
      dialogueFormatControl,
      customFormatArea,
      loadTemplate,

      noteLabel,
      note,
      count,
      save,
      status,

      continuityLabel,
      continuityHelp,
      noteEditor,
      continuityBulkActions,
      continuityList,

      previewLabel,
      preview
    )

    return section
  }

  Sections.createDirectorSection = createDirectorSection
})()
