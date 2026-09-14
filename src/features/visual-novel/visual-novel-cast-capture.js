'use strict'


/*
  Developer notes

  Visual Novel Cast Capture is part of Furina's optional Visual Novel interface. VN mode is isolated from
  standard-chat presentation so changes here should not be required for ordinary chat
  features. Preserve that boundary when extending the layout.
*/
;(() => {
  if (window.top !== window) {
    return
  }

  if (window.__FurinaVNCastCaptureInitialized) {
    return
  }

  window.__FurinaVNCastCaptureInitialized = true

  const STORAGE_KEY = 'furina-vn-scene-casts-v1'

  const BUTTON_CLASS = 'furina-vn-capture-cast-button'

  const POLL_MS = 1400

  let timer = null

  function normalize(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function speakerKey(value) {
    return normalize(value).toLowerCase()
  }

  function readStore() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')

      return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {}
    } catch (_) {
      return {}
    }
  }

  function writeStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))

      return true
    } catch (error) {
      console.warn('[Furina VN Cast] Could not save Scene Cast.', error)

      return false
    }
  }

  function imageIdentity(imageUrl) {
    const value = String(imageUrl || '').trim()

    if (!value) {
      return ''
    }

    try {
      const url = new URL(value, window.location.href)

      if (url.hostname !== 'img.clank.world') {
        return value
      }

      const parts = url.pathname.split('/').filter(Boolean)

      const last = parts[parts.length - 1] || ''

      if (
        /^(public|original|raw)$/i.test(last) ||
        last.includes('w=') ||
        last.includes('h=') ||
        last.includes('fit=') ||
        last.includes('q=') ||
        last.includes('f=')
      ) {
        parts.pop()
      }

      return `${url.origin}/${parts.join('/')}`
    } catch (_) {
      return value
    }
  }

  function bestImage(imageUrl, size = 1024) {
    const value = String(imageUrl || '').trim()

    if (!value) {
      return ''
    }

    try {
      const url = new URL(value, window.location.href)

      if (url.hostname !== 'img.clank.world') {
        return value
      }

      const identity = imageIdentity(value)

      return identity ? `${identity}/w=${size},q=100,f=webp` : value
    } catch (_) {
      return value
    }
  }

  function getToolbar() {
    const buttons = [...document.querySelectorAll('button')]

    const copyButton = buttons.find(
      button => normalize(button.textContent) === 'Copy link'
    )

    const shareButton = buttons.find(
      button => normalize(button.textContent) === 'Share'
    )

    if (!copyButton || !shareButton) {
      return null
    }

    const toolbar = copyButton.parentElement

    if (!toolbar || shareButton.parentElement !== toolbar) {
      return null
    }

    return {
      toolbar,
      copyButton,
      shareButton
    }
  }

  function getModal(toolbar) {
    let current = toolbar

    for (let level = 0; level < 12 && current; level += 1) {
      if (normalize(current.textContent).includes('Scene details')) {
        return current
      }

      current = current.parentElement
    }

    return null
  }

  function findCharactersSection(modal) {
    const heading = [...modal.querySelectorAll('*')].find(
      element => normalize(element.textContent) === 'Characters involved'
    )

    if (!heading) {
      return null
    }

    let section = heading.parentElement

    while (section && section !== modal) {
      if (
        normalize(section.textContent).includes('Characters involved') &&
        section.querySelectorAll('img').length >= 1
      ) {
        return section
      }

      section = section.parentElement
    }

    return null
  }

  function sceneArtworkImage(modal, castSection = null) {
    const candidates = [...modal.querySelectorAll('img')]
      .filter(image => !castSection?.contains(image))
      .map(image => {
        const rect = image.getBoundingClientRect()

        return {
          image,
          area: rect.width * rect.height
        }
      })
      .sort((left, right) => right.area - left.area)

    return candidates[0]?.image || null
  }

  function castFromCharactersSection(section) {
    const cast = {}

    if (!section) {
      return cast
    }

    ;[...section.querySelectorAll('img')].forEach(image => {
      const name = normalize(image.alt)

      const source = image.currentSrc || image.src || ''

      if (!name || !source) {
        return
      }

      cast[speakerKey(name)] = {
        name,
        image: bestImage(source, 1024)
      }
    })

    return cast
  }

  function collectAgents(agents, target) {
    if (!Array.isArray(agents)) {
      return false
    }

    agents.forEach(agent => {
      const name = normalize(agent?.name)

      const image = String(agent?.image || '').trim()

      if (!name || !image) {
        return
      }

      target[speakerKey(name)] = {
        name,
        image: bestImage(image, 1024)
      }
    })

    return Object.keys(target).length > 0
  }

  function castFromReactAgents(modal, toolbar) {
    const cast = {}

    /*
            Only runs on click.

            This mirrors the exact old successful React paths instead of
            recursively walking arbitrary React internals.
        */

    const starts = [toolbar, modal, sceneArtworkImage(modal)].filter(Boolean)

    for (const start of starts) {
      let element = start

      for (let level = 0; level < 10 && element; level += 1) {
        const ownKeys = Object.getOwnPropertyNames(element)

        for (const key of ownKeys.filter(item =>
          item.startsWith('__reactFiber$')
        )) {
          let fiber

          try {
            fiber = element[key]
          } catch (_) {
            continue
          }

          if (
            collectAgents(fiber?.pendingProps?.children?.props?.agents, cast) ||
            collectAgents(
              fiber?.memoizedProps?.children?.props?.agents,
              cast
            ) ||
            collectAgents(fiber?.pendingProps?.agents, cast) ||
            collectAgents(fiber?.memoizedProps?.agents, cast)
          ) {
            return cast
          }
        }

        for (const key of ownKeys.filter(item =>
          item.startsWith('__reactProps$')
        )) {
          let props

          try {
            props = element[key]
          } catch (_) {
            continue
          }

          if (
            collectAgents(props?.children?.props?.agents, cast) ||
            collectAgents(props?.agents, cast)
          ) {
            return cast
          }
        }

        element = element.parentElement
      }
    }

    return cast
  }

  function sceneTitle(modal) {
    return (
      [...modal.querySelectorAll('h1, h2, h3, h4')]
        .map(heading => normalize(heading.textContent))
        .find(
          text =>
            text && text !== 'Scene details' && text !== 'Characters involved'
        ) || ''
    )
  }

  function existingRecord(modal) {
    const section = findCharactersSection(modal)

    const artwork = sceneArtworkImage(modal, section)

    const key = imageIdentity(artwork?.currentSrc || artwork?.src || '')

    if (!key) {
      return null
    }

    return readStore()[key] || null
  }

  function updateButton(button, record) {
    const cast = record?.cast || record?.members || {}

    const count = Object.keys(cast).length

    button.textContent = count ? `Cast ✓ ${count}` : 'Capture Cast'

    button.dataset.state = count ? 'captured' : 'idle'
  }

  function temporary(button, text) {
    button.textContent = text

    button.dataset.state = 'error'

    window.setTimeout(() => {
      const info = getToolbar()

      const modal = info ? getModal(info.toolbar) : null

      updateButton(button, modal ? existingRecord(modal) : null)
    }, 1700)
  }

  function capture(modal, toolbar, button) {
    const section = findCharactersSection(modal)

    let cast = castFromCharactersSection(section)

    let method = 'Characters involved'

    if (!Object.keys(cast).length) {
      cast = castFromReactAgents(modal, toolbar)

      method = 'React agents'
    }

    if (!Object.keys(cast).length) {
      console.warn(
        '[Furina VN Cast] No cast found in the old Characters involved path or the old React agents paths.'
      )

      temporary(button, 'Use Chat Auto')

      return
    }

    const artwork = sceneArtworkImage(modal, section)

    const sceneKey = imageIdentity(artwork?.currentSrc || artwork?.src || '')

    if (!sceneKey) {
      temporary(button, 'No Scene Art')

      return
    }

    const store = readStore()

    store[sceneKey] = {
      title: sceneTitle(modal),
      cast,
      members: cast,
      capturedAt: Date.now(),
      method
    }

    if (!writeStore(store)) {
      temporary(button, 'Save Failed')

      return
    }

    updateButton(button, store[sceneKey])

    console.info(
      `[Furina VN Cast] Captured via ${method}:`,
      Object.values(cast).map(member => member.name)
    )
  }

  function ensureButton() {
    if (document.visibilityState === 'hidden') {
      return
    }

    const info = getToolbar()

    if (!info) {
      return
    }

    const modal = getModal(info.toolbar)

    if (!modal) {
      return
    }

    let button = info.toolbar.querySelector(`.${BUTTON_CLASS}`)

    if (button instanceof HTMLButtonElement) {
      updateButton(button, existingRecord(modal))

      return
    }

    button = document.createElement('button')

    button.type = 'button'

    button.className = `${info.shareButton.className} ${BUTTON_CLASS}`

    button.textContent = 'Capture Cast'

    button.dataset.state = 'idle'

    button.addEventListener('click', event => {
      event.preventDefault()

      event.stopPropagation()

      capture(modal, info.toolbar, button)
    })

    info.shareButton.insertAdjacentElement('afterend', button)

    updateButton(button, existingRecord(modal))
  }

  function start() {
    ensureButton()

    timer = window.setInterval(ensureButton, POLL_MS)
  }

  window.addEventListener(
    'pagehide',
    () => {
      if (timer) {
        window.clearInterval(timer)
      }
    },
    {
      once: true
    }
  )

  start()

  console.info(
    '[Furina VN Cast] Old capture paths + chat auto fallback loaded.'
  )
})()
