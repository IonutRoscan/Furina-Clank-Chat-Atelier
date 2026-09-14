'use strict'


/*
  Developer notes

  Provides the image lightbox used by rendered chat media. It is intentionally
  self-contained so opening an image does not alter Clank's message DOM or saved
  chat state.
*/
/*
    Image Lightbox

    Provides the local image preview overlay used by rendered Markdown images. It accepts only HTTP(S) image URLs already validated by Furina.
*/

window.ClankAtelier = window.ClankAtelier || {}

// IMAGE LIGHTBOX

window.ClankAtelier.ImageLightbox = {
  overlay: null,

  image: null,

  closeButton: null,

  keyHandler: null,

  lastFocusedElement: null,

  ensure() {
    if (this.overlay && document.body.contains(this.overlay)) {
      return
    }

    const overlay = document.createElement('div')

    overlay.className = 'clank-atelier-lightbox'

    overlay.setAttribute('role', 'dialog')

    overlay.setAttribute('aria-modal', 'true')

    overlay.setAttribute('aria-label', 'Image preview')

    overlay.dataset.clankAtelierOwned = 'true'

    const frame = document.createElement('div')

    frame.className = 'clank-atelier-lightbox-frame'

    const image = document.createElement('img')

    image.className = 'clank-atelier-lightbox-image'

    image.alt = ''

    image.referrerPolicy = 'no-referrer'

    const close = document.createElement('button')

    close.type = 'button'

    close.className = 'clank-atelier-lightbox-close'

    close.textContent = '×'

    close.setAttribute('aria-label', 'Close image preview')

    close.title = 'Close image preview'

    close.addEventListener('click', () => {
      this.hide()
    })

    overlay.addEventListener('click', event => {
      if (event.target === overlay) {
        this.hide()
      }
    })

    frame.append(image, close)

    overlay.appendChild(frame)

    document.body.appendChild(overlay)

    window.ClankAtelier.I18n?.observeRoot?.(overlay)

    this.overlay = overlay

    this.image = image

    this.closeButton = close

    this.keyHandler = event => {
      if (event.key === 'Escape') {
        this.hide()
      }
    }

    document.addEventListener('keydown', this.keyHandler)
  },

  show(url, alt = '') {
    if (!window.ClankAtelier.isSafeHttpUrl(url)) {
      return
    }

    this.lastFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    this.ensure()

    this.image.src = url

    this.image.alt = alt || ''

    this.overlay.classList.add('clank-atelier-lightbox-open')

    document.documentElement.classList.add('clank-atelier-lightbox-active')

    requestAnimationFrame(() => {
      this.closeButton?.focus()
    })
  },

  hide() {
    if (!this.overlay) {
      return
    }

    this.overlay.classList.remove('clank-atelier-lightbox-open')

    document.documentElement.classList.remove('clank-atelier-lightbox-active')

    if (this.image) {
      this.image.removeAttribute('src')
    }

    const previous = this.lastFocusedElement

    this.lastFocusedElement = null

    if (previous && previous.isConnected) {
      requestAnimationFrame(() => {
        previous.focus({
          preventScroll: true
        })
      })
    }
  }
}
