'use strict'


/*
  Developer notes

  Applies Furina rendering to one already-classified chat message. Rendering can
  happen repeatedly during streaming, regeneration and route restoration, so it
  must be idempotent: rerunning it should update the same message rather than
  duplicate wrappers, controls or hidden Director metadata.
*/
/*
    Message Renderer

    Coordinates native/editing state with Furina's rendered copy. The native Clank message remains in the DOM; Furina only hides it locally while its replacement view is active.
*/

window.ClankAtelier = window.ClankAtelier || {}

// MESSAGE EDITING CHECK

window.ClankAtelier.isMessageBeingEdited = function (message) {
  if (!(message instanceof HTMLElement)) {
    return false
  }

  return Boolean(
    message.querySelector(
      ['textarea', 'input', '[contenteditable="true"]'].join(',')
    )
  )
}

// RESTORE CLANK'S NATIVE MESSAGE

window.ClankAtelier.showNativeMessage = function (message) {
  if (!(message instanceof HTMLElement)) {
    return
  }

  const body = message.querySelector('.clank-atelier-message-body')

  if (!body) {
    return
  }

  body.classList.remove('clank-atelier-render-active')

  body.querySelectorAll('.clank-atelier-native-hidden').forEach(element => {
    element.classList.remove('clank-atelier-native-hidden')
  })

  const rendered = body.querySelector(':scope > .clank-atelier-rendered')

  if (rendered) {
    rendered.style.display = 'none'
  }
}

// ACTIVATE FURINA RENDER

window.ClankAtelier.showRenderedMessage = function (message, rendered) {
  if (!(message instanceof HTMLElement) || !(rendered instanceof HTMLElement)) {
    return
  }

  const body = message.querySelector('.clank-atelier-message-body')

  if (!body) {
    return
  }

  rendered.style.display = ''

  body.classList.add('clank-atelier-render-active')

  Array.from(body.children).forEach(child => {
    if (
      child === rendered ||
      child.classList.contains('furina-hud-message-marker')
    ) {
      return
    }

    /*
                        Never hide an editor Clank inserted.
                    */

    if (
      child.matches?.('textarea, input') ||
      child.querySelector?.('textarea, input, [contenteditable="true"]')
    ) {
      return
    }

    child.classList.add('clank-atelier-native-hidden')
  })
}

// RENDER MESSAGE

window.ClankAtelier.renderMessage = function (message) {
  if (!(message instanceof HTMLElement)) {
    return
  }

  const body = message.querySelector('.clank-atelier-message-body')

  if (!body) {
    return
  }

  // EDIT MODE

  /*
            If Clank replaces the message with an editor,
            immediately get Furina out of the way.
        */

  if (window.ClankAtelier.isMessageBeingEdited(message)) {
    window.ClankAtelier.showNativeMessage(message)

    message.dataset.clankAtelierEditing = 'true'

    return
  }

  // EDIT MODE JUST FINISHED

  if (message.dataset.clankAtelierEditing === 'true') {
    delete message.dataset.clankAtelierEditing

    /*
                Force one fresh reconstruction after
                Clank finishes editing.
            */

    delete message.dataset.clankAtelierSource
  }

  // GET CURRENT SOURCE

  const source = window.ClankAtelier.getMessageSource(message)

  /*
            Keep the full native source intact.

            For USER messages only, Furina may remove its own
            Director blocks from the local rendered copy.

            Clank's underlying native message is never modified.
        */

  const displaySource = message.classList.contains('clank-atelier-message-user')
    ? window.ClankAtelier.stripDirectorBlocks(source)
    : source

  /*
            During certain Clank transitions the body can
            temporarily become empty.

            Do not destroy the last good render.
        */

  if (!source.trim()) {
    return
  }

  /*
            RP sounds observe the native source before Furina rebuilds its
            rendered copy. User messages only confirm a deliberately queued
            next-send cue; historical assistant messages and unchanged
            streaming rerenders remain silent.
        */
  window.ClankAtelier.RpSfxManager?.observeMessage?.(message, source)

  // FIND RENDER TARGET

  let rendered = body.querySelector(':scope > .clank-atelier-rendered')

  // SOURCE DID NOT CHANGE

  if (rendered && message.dataset.clankAtelierSource === source) {
    window.ClankAtelier.showRenderedMessage(message, rendered)

    window.ClankAtelier.PresentationManager?.decorateMessage?.(message)

    return
  }

  // CREATE RENDER TARGET

  if (!rendered) {
    rendered = document.createElement('div')

    rendered.className = 'clank-atelier-rendered'

    rendered.dataset.clankAtelierOwned = 'true'

    rendered.addEventListener('click', event => {
      const trigger = event.target.closest(
        '.clank-atelier-image-link[data-clank-atelier-image]'
      )

      if (!trigger || !rendered.contains(trigger)) {
        return
      }

      const url = trigger.dataset.clankAtelierImage

      const image = trigger.querySelector('.clank-atelier-image')

      if (!url) {
        return
      }

      window.ClankAtelier.ImageLightbox?.show(url, image?.alt || '')
    })

    body.appendChild(rendered)
  }

  // GENERATE HTML

  const html = window.ClankAtelier.AtelierMarkup
    ? window.ClankAtelier.AtelierMarkup.render(displaySource)
    : window.ClankAtelier.renderMarkdown(displaySource)

  // UPDATE ONLY IF NECESSARY

  if (rendered.innerHTML !== html) {
    const interaction = window.ClankAtelier.AtelierMarkup?.capture(rendered)
    rendered.innerHTML = html
    if (interaction)
      window.ClankAtelier.AtelierMarkup.restore(rendered, interaction)
  }

  window.ClankAtelier.AtelierMarkup?.bind(rendered)

  // CACHE

  message.dataset.clankAtelierSource = source

  message.dataset.clankAtelierRendered = 'true'

  // DISPLAY

  window.ClankAtelier.showRenderedMessage(message, rendered)

  window.ClankAtelier.PresentationManager?.decorateMessage?.(message)
}
