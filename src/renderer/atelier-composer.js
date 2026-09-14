'use strict'


/*
  Developer notes

  Adds optional formatting helpers around Clank's native composer. Helpers must
  preserve the user's current draft, dispatch the same input events Clank expects
  and never send a message on the user's behalf. Insert/quote actions should only
  change composer text after an explicit click.
*/
/* Owns the Atelier composer controls. It edits drafts through the native
   textarea setter; Clank and Director still own the normal send action. */
;(() => {
  const A = window.ClankAtelier
  if (!A || A.AtelierComposer) return
  const styles = A.AtelierMarkup.registry
  let tracked = null
  let active = null

  function buildEdit(text, start, end, kind, attributes = {}) {
    const def = styles.find(item => item.kind === kind)
    if (!def) return null
    start = Math.max(0, Math.min(text.length, start))
    end = Math.max(start, Math.min(text.length, end))
    const values = {...def.attributes, ...attributes}
    let attrText = ''
    for (const key of Object.keys(def.attributes)) {
      const value = String(values[key])
      if (value.length > 240 || /["\r\n\[\]]/.test(value)) return null
      if (
        kind === 'meter' &&
        key === 'value' &&
        (!/^\d+(?:\.\d+)?$/.test(value) || Number(value) > 100)
      )
        return null
      if (
        kind === 'dice' &&
        key === 'sides' &&
        !['4', '6', '8', '10', '12', '20', '100'].includes(value)
      )
        return null
      if (value) attrText += ` ${key}="${value}"`
    }
    const before = text.slice(0, start)
    const selected = def.type === 'leaf' ? '' : text.slice(start, end)
    const after = text.slice(def.type === 'leaf' ? start : end)
    const inline = def.type === 'inline'
    const leading =
      !inline && before
        ? '\n'.repeat(Math.max(0, 2 - before.match(/\n*$/)[0].length))
        : ''
    const trailing =
      !inline && after
        ? '\n'.repeat(Math.max(0, 2 - after.match(/^\n*/)[0].length))
        : ''
    const open = `[f:${kind}${attrText}]` + (def.type === 'block' ? '\n' : '')
    const close =
      def.type === 'leaf'
        ? ''
        : (inline || selected.endsWith('\n') ? '' : '\n') + `[/f:${kind}]`
    const value = before + leading + open + selected + close + trailing + after
    const cursor = before.length + leading.length + open.length
    return {value, start: cursor, end: cursor + selected.length}
  }

  function detach(clearTarget = true) {
    if (clearTarget) tracked = null
    if (!active) return
    if (active.host.contains(document.activeElement))
      active.textarea.focus({preventScroll: true})
    active.controller.abort()
    clearTimeout(active.timer)
    active.host.remove()
    active = null
  }

  function attachComposer(textarea) {
    tracked = textarea
    if (A.AtelierSettings?.value.composer === false) {
      detach(false)
      return
    }
    const form = textarea?.closest('form')
    if (!(textarea instanceof HTMLTextAreaElement) || !form) return
    if (
      active?.textarea === textarea &&
      active.host.parentElement === form &&
      active.host.isConnected &&
      active.route === location.pathname
    )
      return
    detach(false)

    const controller = new AbortController()
    const state = {
      textarea,
      controller,
      route: location.pathname,
      timer: null,
      undo: null
    }
    const on = (node, event, fn) =>
      node.addEventListener(event, fn, {signal: controller.signal})
    const el = (tag, className, text) => {
      const node = document.createElement(tag)
      node.className = className
      if (text) node.textContent = text
      if (tag === 'button') node.type = 'button'
      return node
    }

    const host = el('div', 'furina-composer-atelier')
    host.dataset.furinaOwned = 'true'
    const toggle = el('button', 'furina-atelier-toggle', '✦ Atelier')
    toggle.setAttribute('aria-expanded', 'false')
    const panel = el('section', 'furina-atelier-tools')
    panel.id = 'furina-atelier-composer-tools'
    panel.setAttribute('aria-label', 'Atelier passage tools')
    toggle.setAttribute('aria-controls', panel.id)
    panel.hidden = true
    const hint = el(
      'p',
      'furina-atelier-hint',
      'Wrap selected text, or insert a passage at the cursor.'
    )
    const choices = el('div', 'furina-atelier-picker')
    const picker = el('select', 'furina-atelier-select')
    picker.setAttribute('aria-label', 'Formatting style')
    for (const group of [...new Set(styles.map(item => item.group))]) {
      const optgroup = el('optgroup', '')
      optgroup.label = group
      for (const item of styles.filter(item => item.group === group)) {
        const option = el('option', '', item.label)
        option.value = item.kind
        optgroup.append(option)
      }
      picker.append(optgroup)
    }
    picker.value = styles[0].kind
    const fields = el('div', 'furina-atelier-fields')
    const insert = el('button', 'furina-atelier-insert', 'Insert Whisper')
    choices.append(picker, fields, insert)
    const previewTitle = el(
      'div',
      'furina-atelier-preview-title',
      'DRAFT PREVIEW'
    )
    const preview = el('div', 'furina-atelier-preview clank-atelier-rendered')
    preview.setAttribute('role', 'region')
    preview.setAttribute('aria-label', 'Formatted draft preview')
    preview.tabIndex = 0
    const footer = el('div', 'furina-atelier-footer')
    const status = el('span', 'furina-atelier-status')
    status.setAttribute('role', 'status')
    const undo = el('button', 'furina-atelier-undo', 'Undo insert')
    undo.disabled = true
    footer.append(status, undo)
    panel.append(hint, choices, previewTitle, preview, footer)
    host.append(toggle, panel)
    state.host = host
    active = state
    form.prepend(host)

    const remember = () => {
      state.selection = {
        value: textarea.value,
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      }
    }
    const isCurrent = () => {
      if (active !== state) return false
      if (!textarea.isConnected || location.pathname !== state.route) {
        detach()
        return false
      }
      return true
    }
    const refresh = (state.refresh = () => {
      clearTimeout(state.timer)
      if (!isCurrent()) return
      undo.disabled = !state.undo || textarea.value !== state.undo.after
      if (panel.hidden) return
      previewTitle.textContent =
        A.AtelierSettings?.value.rendering === false
          ? 'DRAFT PREVIEW · MARKUP OFF'
          : 'DRAFT PREVIEW'
      const source = A.stripDirectorBlocks
        ? A.stripDirectorBlocks(textarea.value)
        : textarea.value
      if (!source.trim()) {
        preview.textContent = 'Your formatted draft will appear here.'
      } else {
        const html = A.AtelierMarkup.render(source)
        if (preview.innerHTML !== html) {
          const interaction = A.AtelierMarkup.capture(preview)
          preview.innerHTML = html
          A.AtelierMarkup.restore(preview, interaction)
        }
      }
    })
    const show = open => {
      panel.hidden = !open
      toggle.setAttribute('aria-expanded', String(open))
      if (open) refresh()
    }
    const write = edit => {
      if (!isCurrent()) return false
      if (textarea.disabled || textarea.readOnly) {
        status.textContent = 'The composer is currently unavailable.'
        return false
      }
      if (textarea.maxLength >= 0 && edit.value.length > textarea.maxLength) {
        status.textContent =
          "This insertion would exceed the composer's character limit."
        return false
      }
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set
      if (!setter) {
        status.textContent = 'Could not update this composer.'
        return false
      }
      setter.call(textarea, edit.value)
      textarea.dispatchEvent(new Event('input', {bubbles: true}))
      textarea.focus({preventScroll: true})
      textarea.setSelectionRange(edit.start, edit.end)
      remember()
      refresh()
      return true
    }

    let fieldInputs = {}
    const showFields = () => {
      fields.replaceChildren()
      fieldInputs = {}
      const def = styles.find(item => item.kind === picker.value)
      insert.textContent = `Insert ${def.label}`
      hint.textContent =
        def.type === 'inline'
          ? 'Format selected words inside a sentence, or insert at the cursor.'
          : def.type === 'leaf'
            ? 'Insert a card at the cursor. Selected text is preserved after it.'
            : 'Wrap selected text, or insert a passage at the cursor.'
      for (const [key, value] of Object.entries(def.attributes)) {
        const label = el('label', 'furina-atelier-field')
        label.append(
          el(
            'span',
            '',
            key === 'value'
              ? 'Value (0–100)'
              : key[0].toUpperCase() + key.slice(1)
          )
        )
        const input = el('input', 'furina-atelier-field-input')
        input.type = 'text'
        input.value = value
        input.maxLength = 240
        if (key === 'value') input.inputMode = 'decimal'
        label.append(input)
        fields.append(label)
        fieldInputs[key] = input
      }
    }
    on(picker, 'change', showFields)
    on(insert, 'click', () => {
      if (!isCurrent()) return
      if (state.selection.value !== textarea.value) remember()
      const selection = {...state.selection}
      const attributes = Object.fromEntries(
        Object.entries(fieldInputs).map(([key, input]) => [key, input.value])
      )
      const edit = buildEdit(
        textarea.value,
        selection.start,
        selection.end,
        picker.value,
        attributes
      )
      if (!edit) {
        status.textContent =
          'Use single-line fields without double quotes or square brackets; meters need a value from 0 to 100.'
        return
      }
      if (write(edit)) {
        state.undo = {...selection, after: edit.value}
        status.textContent = 'Inserted. Continue writing in the composer.'
        refresh()
      }
    })
    // Enter inside a metadata field must not submit Clank's outer form.
    on(host, 'keydown', event => {
      if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
        event.preventDefault()
        event.stopPropagation()
        insert.click()
      }
    })
    showFields()
    A.AtelierMarkup.bind(preview)
    on(undo, 'click', () => {
      if (!isCurrent() || !state.undo || textarea.value !== state.undo.after)
        return
      if (write(state.undo)) {
        state.undo = null
        status.textContent = 'Insertion undone.'
        refresh()
      }
    })
    on(toggle, 'pointerdown', () => {
      if (document.activeElement === textarea) remember()
    })
    on(toggle, 'click', () => show(panel.hidden))
    for (const event of ['select', 'keyup', 'pointerup'])
      on(textarea, event, remember)
    on(textarea, 'input', () => {
      remember()
      undo.disabled = !state.undo || textarea.value !== state.undo.after
      status.textContent = ''
      clearTimeout(state.timer)
      state.timer = setTimeout(refresh, 100)
    })
    on(document, 'keydown', event => {
      if (
        event.key === 'Escape' &&
        !panel.hidden &&
        (host.contains(event.target) || event.target === textarea)
      ) {
        show(false)
        if (host.contains(event.target)) toggle.focus()
      }
    })
    on(preview, 'click', event => {
      const trigger = event.target.closest?.('[data-clank-atelier-image]')
      if (trigger)
        A.ImageLightbox?.show(
          trigger.dataset.clankAtelierImage,
          trigger.querySelector('img')?.alt || ''
        )
    })
    remember()
  }

  function insertText(text, options = {}) {
    const textarea = tracked
    if (
      !(textarea instanceof HTMLTextAreaElement) ||
      !textarea.isConnected ||
      textarea.disabled ||
      textarea.readOnly
    )
      return false
    const raw = String(text || '')
    if (!raw) return false
    const insert = options.quote
      ? raw
          .split(/\r?\n/)
          .map(line => `> ${line}`)
          .join('\n')
      : raw
    const start = textarea.selectionStart ?? textarea.value.length
    const end = textarea.selectionEnd ?? start
    const before = textarea.value.slice(0, start)
    const after = textarea.value.slice(end)
    const leading = before && !/\s$/.test(before) ? '\n' : ''
    const trailing = after && !/^\s/.test(after) ? '\n' : ''
    const next = before + leading + insert + trailing + after
    if (textarea.maxLength >= 0 && next.length > textarea.maxLength)
      return false
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value'
    )?.set
    if (!setter) return false
    setter.call(textarea, next)
    textarea.dispatchEvent(new Event('input', {bubbles: true}))
    const cursor = before.length + leading.length + insert.length
    textarea.focus({preventScroll: true})
    textarea.setSelectionRange(cursor, cursor)
    active?.refresh?.()
    return true
  }

  A.AtelierComposer = {
    attachComposer,
    detach,
    buildEdit,
    insertText,
    syncSettings() {
      if (tracked?.isConnected) attachComposer(tracked)
      active?.refresh?.()
    }
  }
})()
