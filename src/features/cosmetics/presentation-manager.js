'use strict'

/*
  Developer notes

  Applies standard-chat presentation options such as message/composer skins,
  dialogue emphasis, speaker labels and typing-indicator styles. Everything in
  this manager is optional and must degrade back to native Clank presentation when
  disabled.
*/
/* Standard-chat presentation helpers. Phantom and VN are intentionally untouched. */
;(() => {
  const A = window.ClankAtelier
  if (!A || A.PresentationManager) return
  let quoteButton = null

  function speakerName(message) {
    const user = message.classList.contains('clank-atelier-message-user')
    if (user) return 'You'
    const avatar = message.querySelector(
      '.clank-atelier-avatar, img:not(.clank-atelier-image)'
    )
    const alt = avatar?.getAttribute?.('alt')?.trim()
    if (alt && alt.length <= 80 && !/^(avatar|image|character)$/i.test(alt))
      return alt
    return 'Assistant'
  }

  function decorateMessage(message) {
    if (!(message instanceof HTMLElement)) return
    const enabled = A.ThemeManager?.settings?.speakerNameplates === true
    let plate = message.querySelector(':scope > .furina-speaker-nameplate')
    if (!enabled) {
      plate?.remove()
      return
    }
    if (!plate) {
      plate = document.createElement('div')
      plate.className = 'furina-speaker-nameplate'
      plate.dataset.furinaOwned = 'true'
      message.prepend(plate)
    }
    plate.textContent = speakerName(message)
  }

  function decorateAll() {
    document.querySelectorAll('.clank-atelier-message').forEach(decorateMessage)
  }

  function removeQuoteButton() {
    quoteButton?.remove()
    quoteButton = null
  }
  function showQuoteButton(selection) {
    removeQuoteButton()
    if (!selection || selection.isCollapsed) return
    const text = selection.toString().trim()
    if (!text || text.length > 5000) return
    const anchor = selection.anchorNode?.parentElement?.closest?.(
      '.clank-atelier-message'
    )
    const focus = selection.focusNode?.parentElement?.closest?.(
      '.clank-atelier-message'
    )
    if (!anchor || anchor !== focus) return
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (!rect.width && !rect.height) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'furina-quote-to-composer'
    button.textContent = '❝ Quote'
    button.dataset.furinaOwned = 'true'
    // Remember Selection uses the same selection rectangle. Keep Quote beside it instead of underneath it.
    const remember = document.querySelector('.furina-remember-selection')
    const center = rect.left + rect.width / 2
    const quoteWidth = 78
    const rememberWidth = remember?.getBoundingClientRect?.().width || 0
    const desired = remember
      ? center - rememberWidth / 2 - quoteWidth - 8
      : center - quoteWidth / 2
    button.style.left = `${Math.min(innerWidth - quoteWidth - 8, Math.max(8, desired))}px`
    button.style.top = `${Math.max(8, rect.top - 39)}px`
    button.addEventListener('pointerdown', event => event.preventDefault())
    button.addEventListener('mousedown', event => event.preventDefault())
    button.addEventListener('click', () => {
      const inserted = A.AtelierComposer?.insertText?.(text, {quote: true})
      if (inserted) A.SfxManager?.play?.('insert')
      removeQuoteButton()
      selection.removeAllRanges()
    })
    document.body.append(button)
    quoteButton = button
  }

  document.addEventListener('selectionchange', () => {
    clearTimeout(A.PresentationManager?._selectionTimer)
    A.PresentationManager._selectionTimer = setTimeout(
      () => showQuoteButton(document.getSelection()),
      120
    )
  })
  document.addEventListener(
    'pointerdown',
    event => {
      if (quoteButton && !quoteButton.contains(event.target))
        removeQuoteButton()
    },
    true
  )
  window.addEventListener('clank-atelier-theme-changed', decorateAll)

  A.PresentationManager = {
    decorateMessage,
    decorateAll,
    removeQuoteButton,
    _selectionTimer: null
  }
})()
