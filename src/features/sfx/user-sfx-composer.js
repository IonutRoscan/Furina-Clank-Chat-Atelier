'use strict'


/*
  Developer notes

  Provides the small RP SFX drawer near Clank's composer and queues up to a few
  explicit cues for the next observed user send. The queue is ephemeral, does not
  modify the draft and is never sent to Clank. Playback waits until the matching
  new user message actually appears, which avoids sounds on failed sends.
*/
/*
    User-directed RP SFX

    This control deliberately lives outside Clank's React-managed composer DOM.
    Furina positions it next to the real composer using a small body-level
    portal, so a Clank rerender cannot silently delete the SFX picker.

    Choosing a cue never edits the draft and never sends SFX metadata to Clank.
    The queue is armed by the user's normal send action and consumed only after
    Furina observes that user message appear in the standard chat.
*/
;(() => {
  const A = (window.ClankAtelier = window.ClankAtelier || {})

  if (A.UserSfxComposer) {
    A.UserSfxComposer.start?.()
    return
  }

  let active = null
  let domObserver = null
  let ensureTimer = null
  let routeTimer = null
  let lastPath = location.pathname

  const el = (tag, className = '', text = '') => {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text) node.textContent = text
    return node
  }

  function looksLikeSendButton(button) {
    if (!(button instanceof HTMLElement) || button.tagName !== 'BUTTON')
      return false
    if ((button.getAttribute('type') || '').toLowerCase() === 'submit')
      return true

    const label = [
      button.getAttribute('aria-label') || '',
      button.getAttribute('title') || '',
      button.getAttribute('data-testid') || '',
      button.textContent || ''
    ]
      .join(' ')
      .trim()

    return /(^|\s)send(\s|$)/i.test(label) || /send message/i.test(label)
  }

  function isStandardComposer(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement) || !textarea.isConnected)
      return false
    if (
      textarea.closest(
        '#furina-phantom-overlay, #furina-vn-overlay, .furina-panel'
      )
    )
      return false
    return true
  }

  function findComposer() {
    const candidates = [
      document.querySelector('textarea.clank-atelier-composer'),
      A.SELECTORS?.composer
        ? document.querySelector(A.SELECTORS.composer)
        : null,
      document.querySelector('form.clank-atelier-composer-form textarea'),
      document.querySelector('textarea[placeholder="Type something"]'),
      document.querySelector('textarea[data-furina-director-keydown]')
    ]

    return candidates.find(isStandardComposer) || null
  }

  function findAnchor(textarea) {
    const form = textarea.closest('form')
    if (form) return form

    let node = textarea.parentElement
    for (
      let depth = 0;
      node && node !== document.body && depth < 10;
      depth += 1
    ) {
      if (Array.from(node.querySelectorAll('button')).some(looksLikeSendButton))
        return node
      node = node.parentElement
    }
    return textarea.parentElement || textarea
  }

  function findLocalSendButton(textarea, anchor) {
    const localButtons =
      anchor instanceof HTMLElement
        ? Array.from(anchor.querySelectorAll('button'))
        : []
    const local = localButtons.find(looksLikeSendButton)
    if (local) return local

    const textRect = textarea.getBoundingClientRect()
    return (
      Array.from(document.querySelectorAll('button'))
        .filter(looksLikeSendButton)
        .find(button => {
          const rect = button.getBoundingClientRect()
          return (
            Math.abs(rect.bottom - textRect.bottom) < 180 &&
            Math.abs(rect.right - textRect.right) <
              Math.max(320, textRect.width)
          )
        }) || null
    )
  }

  function detach() {
    if (!active) return
    active.controller.abort()
    active.resizeObserver?.disconnect()
    cancelAnimationFrame(active.positionFrame || 0)
    active.host.remove()
    active = null
  }

  function schedulePosition() {
    if (!active || active.positionFrame) return
    active.positionFrame = requestAnimationFrame(() => {
      if (!active) return
      active.positionFrame = 0
      positionActive()
    })
  }

  function positionActive() {
    const state = active
    if (!state) return
    if (
      !state.textarea.isConnected ||
      !state.anchor.isConnected ||
      !state.host.isConnected
    ) {
      scheduleEnsure(20)
      return
    }

    const rect = state.anchor.getBoundingClientRect()
    if (
      rect.width < 40 ||
      rect.height < 20 ||
      rect.bottom < 0 ||
      rect.top > window.innerHeight
    ) {
      state.host.hidden = true
      return
    }

    state.host.hidden = false
    const margin = 10
    const left = Math.max(
      margin,
      Math.min(rect.left + 8, window.innerWidth - 150)
    )
    const bottom = Math.max(margin, window.innerHeight - rect.top + 8)
    const panelWidth = Math.max(
      260,
      Math.min(520, rect.width, window.innerWidth - 24)
    )

    state.host.style.left = `${Math.round(left)}px`
    state.host.style.bottom = `${Math.round(bottom)}px`
    state.host.style.setProperty(
      '--furina-user-sfx-panel-width',
      `${Math.round(panelWidth)}px`
    )
  }

  function refresh() {
    const state = active
    if (!state?.host?.isConnected) return
    const manager = A.RpSfxManager
    if (!manager) {
      state.status.textContent =
        'RP Sounds are still loading. Try again in a moment.'
      state.toggle.disabled = true
      return
    }

    state.toggle.disabled = false
    const queue = manager.userQueue || []
    const enabledNow = manager.settings.enabled === true

    state.host.classList.toggle('is-disabled', !enabledNow)
    state.toggle.classList.toggle('has-queue', queue.length > 0)
    state.count.textContent = queue.length ? String(queue.length) : ''
    state.count.hidden = !queue.length
    state.offNotice.hidden = enabledNow
    state.clear.disabled = !queue.length

    state.selected.replaceChildren()
    if (!queue.length) {
      state.selected.append(
        el(
          'span',
          'furina-user-sfx-empty',
          enabledNow ? 'No cues queued.' : 'Enable RP Sounds to queue cues.'
        )
      )
    } else {
      state.selected.append(
        el('span', 'furina-user-sfx-selected-label', 'Queued:')
      )
      for (const id of queue) {
        const chip = el(
          'button',
          'furina-user-sfx-chip',
          `${manager.categories[id]?.label || id} ×`
        )
        chip.type = 'button'
        chip.addEventListener(
          'click',
          () => {
            manager.toggleUserCue(id)
            refresh()
          },
          {signal: state.controller.signal}
        )
        state.selected.append(chip)
      }
    }

    for (const [id, button] of state.categoryButtons) {
      const chosen = queue.includes(id)
      button.classList.toggle('is-selected', chosen)
      button.setAttribute('aria-pressed', String(chosen))
      button.disabled =
        !enabledNow ||
        (!chosen && queue.length >= (manager.userQueueLimit || 3))
      button.classList.toggle(
        'is-auto-disabled',
        manager.settings.categories[id] === false
      )
    }
    schedulePosition()
  }

  function attachComposer(textarea) {
    if (!isStandardComposer(textarea)) return false

    const manager = A.RpSfxManager
    if (!manager) {
      scheduleEnsure(120)
      return false
    }

    if (active?.textarea === textarea && active.host?.isConnected) {
      active.anchor = findAnchor(textarea)
      refresh()
      schedulePosition()
      return true
    }

    detach()

    const anchor = findAnchor(textarea)
    if (!(anchor instanceof HTMLElement) || !document.body) return false

    const controller = new AbortController()
    const {signal} = controller
    const host = el('div', 'furina-user-sfx-composer furina-user-sfx-portal')
    host.dataset.furinaOwned = 'true'

    const toggle = el('button', 'furina-user-sfx-toggle', '♪ RP SFX')
    toggle.type = 'button'
    toggle.setAttribute('aria-expanded', 'false')

    const count = el('span', 'furina-user-sfx-count')
    toggle.append(count)

    const panel = el('section', 'furina-user-sfx-panel')
    panel.hidden = true
    panel.setAttribute(
      'aria-label',
      'Queue roleplay sound effects for next send'
    )

    const headline = el('div', 'furina-user-sfx-head')
    headline.append(
      el('strong', '', 'Next-send SFX'),
      el(
        'span',
        '',
        `Queue up to ${manager.userQueueLimit || 3}. Nothing is added to your Clank message.`
      )
    )

    const offNotice = el('div', 'furina-user-sfx-off')
    const offText = el(
      'span',
      '',
      'Roleplay Sounds are off for this conversation.'
    )
    const enable = el('button', 'furina-user-sfx-enable', 'Enable')
    enable.type = 'button'
    offNotice.append(offText, enable)

    const selected = el('div', 'furina-user-sfx-selected')
    const grid = el('div', 'furina-user-sfx-grid')
    const categoryButtons = new Map()
    const status = el('div', 'furina-user-sfx-status')
    status.setAttribute('role', 'status')

    for (const id of manager.categoryIds || []) {
      const def = manager.categories[id]
      const button = el('button', 'furina-user-sfx-option', def?.label || id)
      button.type = 'button'
      button.dataset.sfxId = id
      button.title = `Queue ${def?.label || id} for your next sent message`
      button.addEventListener(
        'click',
        () => {
          manager.unlock?.()
          const result = manager.toggleUserCue(id)
          if (!result?.ok && result?.reason === 'limit') {
            status.textContent = `You can queue up to ${manager.userQueueLimit || 3} cues per message.`
          } else if (!result?.ok && result?.reason === 'disabled') {
            status.textContent = 'Enable Roleplay Sounds first.'
          } else {
            status.textContent =
              result?.reason === 'removed'
                ? 'Cue removed.'
                : 'Cue queued for your next send.'
          }
          refresh()
        },
        {signal}
      )
      categoryButtons.set(id, button)
      grid.append(button)
    }

    const actions = el('div', 'furina-user-sfx-actions')
    const clear = el('button', 'furina-user-sfx-clear', 'Clear queue')
    clear.type = 'button'
    const settings = el(
      'button',
      'furina-user-sfx-settings',
      'RP Sound settings'
    )
    settings.type = 'button'
    actions.append(clear, settings)

    panel.append(headline, offNotice, selected, grid, actions, status)
    host.append(toggle, panel)
    document.body.append(host)

    active = {
      textarea,
      anchor,
      controller,
      host,
      toggle,
      count,
      panel,
      offNotice,
      selected,
      categoryButtons,
      status,
      clear,
      positionFrame: 0,
      resizeObserver: null
    }

    const arm = () => {
      if (!manager.userQueue.length) return
      manager.armUserSend(textarea.value)
    }

    const form = textarea.closest('form')
    form?.addEventListener('submit', arm, {capture: true, signal})

    document.addEventListener(
      'click',
      event => {
        if (active?.textarea !== textarea || !textarea.isConnected) return
        const button = event.target?.closest?.('button')
        if (!looksLikeSendButton(button)) return

        const currentAnchor = active.anchor
        if (
          currentAnchor instanceof HTMLElement &&
          currentAnchor.contains(button)
        ) {
          arm()
          return
        }

        const localSend = findLocalSendButton(textarea, currentAnchor)
        if (button === localSend) arm()
      },
      {capture: true, signal}
    )

    textarea.addEventListener(
      'keydown',
      event => {
        if (
          event.key === 'Enter' &&
          !event.shiftKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey &&
          !event.isComposing &&
          !event.repeat
        ) {
          arm()
        }
      },
      {capture: true, signal}
    )

    toggle.addEventListener(
      'click',
      () => {
        panel.hidden = !panel.hidden
        toggle.setAttribute('aria-expanded', String(!panel.hidden))
        if (!panel.hidden) manager.unlock?.()
        refresh()
      },
      {signal}
    )

    enable.addEventListener(
      'click',
      async () => {
        manager.unlock?.()
        const ok = await manager.update({enabled: true})
        status.textContent = ok
          ? 'Roleplay Sounds enabled for this conversation.'
          : 'Could not enable Roleplay Sounds.'
        refresh()
      },
      {signal}
    )

    clear.addEventListener(
      'click',
      () => {
        manager.clearUserQueue()
        status.textContent = 'Queued cues cleared.'
        refresh()
      },
      {signal}
    )

    settings.addEventListener(
      'click',
      () => {
        A.PanelShell?.openFull?.('scene', 'sounds')
      },
      {signal}
    )

    window.addEventListener('furina-rp-sfx-user-queue-changed', refresh, {
      signal
    })
    window.addEventListener('furina-rp-sfx-settings-changed', refresh, {signal})
    window.addEventListener('resize', schedulePosition, {signal})
    document.addEventListener('scroll', schedulePosition, {
      capture: true,
      passive: true,
      signal
    })
    document.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Escape' && !panel.hidden) {
          panel.hidden = true
          toggle.setAttribute('aria-expanded', 'false')
          toggle.focus()
        }
      },
      {signal}
    )

    if (typeof ResizeObserver === 'function') {
      active.resizeObserver = new ResizeObserver(schedulePosition)
      active.resizeObserver.observe(anchor)
      active.resizeObserver.observe(textarea)
    }

    refresh()
    schedulePosition()
    return true
  }

  function scheduleEnsure(delay = 50) {
    clearTimeout(ensureTimer)
    ensureTimer = setTimeout(() => {
      ensureTimer = null
      ensureMounted()
    }, delay)
  }

  function ensureMounted() {
    const textarea = findComposer()
    if (!textarea) {
      if (active && !active.textarea.isConnected) detach()
      return false
    }
    return attachComposer(textarea)
  }

  function start() {
    if (!document.documentElement) return

    ensureMounted()
    scheduleEnsure(120)
    setTimeout(ensureMounted, 500)
    setTimeout(ensureMounted, 1400)

    if (!domObserver) {
      domObserver = new MutationObserver(records => {
        /* Ignore the picker's own UI updates or they would retrigger mounting. */
        const relevant = records.some(record => {
          const target =
            record.target instanceof Element
              ? record.target
              : record.target?.parentElement
          return !target?.closest?.('.furina-user-sfx-composer')
        })
        if (relevant) scheduleEnsure(40)
      })
      domObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      })
    }

    if (!routeTimer) {
      routeTimer = setInterval(() => {
        if (location.pathname !== lastPath) {
          lastPath = location.pathname
          detach()
        }
        ensureMounted()
      }, 1200)
    }
  }

  A.UserSfxComposer = {
    attachComposer,
    detach,
    refresh,
    ensureMounted,
    start
  }

  start()
})()
