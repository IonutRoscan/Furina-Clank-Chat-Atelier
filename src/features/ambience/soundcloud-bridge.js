'use strict'


/*
  Developer notes

  Page-world helper used only for SoundCloud integration. It exists because page
  media objects are not directly reachable from an extension content script's
  isolated world. Do not expand this into a general page bridge.
*/
/*
    SoundCloud Page-Context Bridge

    This script runs in Clank's page context so Furina can talk to SoundCloud's
    official Widget API. It listens only for Furina's custom DOM events and
    controls widgets registered with Furina-generated IDs.
*/

;(() => {
  if (window.__furinaSoundCloudBridge) {
    return
  }

  window.__furinaSoundCloudBridge = true

  const widgets = new Map()

  let apiReady = false

  let apiPromise = null

  function isValidId(value) {
    return (
      typeof value === 'string' && /^furina-sc-[a-z0-9-]{8,120}$/i.test(value)
    )
  }

  function send(id, type, detail = {}) {
    if (!isValidId(id) || typeof type !== 'string') {
      return
    }

    document.dispatchEvent(
      new CustomEvent('furina-soundcloud-event', {
        detail: {
          id,

          type,

          ...detail
        }
      })
    )
  }

  function ensureApi() {
    if (window.SC && window.SC.Widget) {
      apiReady = true

      return Promise.resolve()
    }

    if (apiPromise) {
      return apiPromise
    }

    apiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')

      script.src = 'https://w.soundcloud.com/player/api.js'

      script.async = true

      script.onload = () => {
        apiReady = Boolean(window.SC && window.SC.Widget)

        if (apiReady) {
          resolve()
        } else {
          reject(new Error('SoundCloud Widget API did not initialize.'))
        }
      }

      script.onerror = () => {
        reject(new Error('Could not load SoundCloud Widget API.'))
      }

      ;(document.head || document.documentElement).appendChild(script)
    }).catch(error => {
      apiReady = false

      apiPromise = null

      throw error
    })

    return apiPromise
  }

  function sendState(id, widget) {
    if (!widget) {
      return
    }

    const state = {
      position: 0,

      duration: 0,

      paused: true,

      volume: 100
    }

    let remaining = 4

    function done() {
      remaining -= 1

      if (remaining > 0) {
        return
      }

      send(id, 'state', state)
    }

    widget.getPosition(value => {
      state.position = Number(value) || 0

      done()
    })

    widget.getDuration(value => {
      state.duration = Number(value) || 0

      done()
    })

    widget.isPaused(value => {
      state.paused = Boolean(value)

      done()
    })

    widget.getVolume(value => {
      state.volume = Number(value) || 0

      done()
    })
  }

  function sendCurrentSound(id, widget) {
    widget.getCurrentSound(sound => {
      if (!sound) {
        return
      }

      let artwork = String(sound.artwork_url || '')

      if (artwork.includes('-large.')) {
        artwork = artwork.replace('-large.', '-t500x500.')
      }

      send(id, 'sound', {
        title: String(sound.title || '').slice(0, 300),

        user: String(sound.user?.username || '').slice(0, 200),

        artwork: artwork.slice(0, 2048)
      })
    })
  }

  async function register(id) {
    if (!isValidId(id)) {
      return
    }

    try {
      await ensureApi()
    } catch (error) {
      send(id, 'error', {
        message: error.message
      })

      return
    }

    const iframe = document.querySelector(
      `iframe[data-furina-sc-id="${CSS.escape(id)}"]`
    )

    if (!iframe) {
      send(id, 'error', {
        message: 'SoundCloud iframe was not found.'
      })

      return
    }

    if (widgets.has(id)) {
      return
    }

    const widget = window.SC.Widget(iframe)

    widgets.set(id, widget)

    const Events = window.SC.Widget.Events

    widget.bind(Events.READY, () => {
      send(id, 'ready')

      sendState(id, widget)

      sendCurrentSound(id, widget)
    })

    widget.bind(Events.PLAY, () => {
      send(id, 'play')

      sendCurrentSound(id, widget)
    })

    widget.bind(Events.PAUSE, () => {
      send(id, 'pause')
    })

    widget.bind(Events.PLAY_PROGRESS, data => {
      send(id, 'progress', {
        position: Number(data?.currentPosition) || 0,

        relative: Number(data?.relativePosition) || 0
      })
    })

    widget.bind(Events.SEEK, data => {
      send(id, 'progress', {
        position: Number(data?.currentPosition) || 0,

        relative: Number(data?.relativePosition) || 0
      })
    })

    widget.bind(Events.FINISH, () => {
      send(id, 'finish')

      sendState(id, widget)
    })

    widget.bind(Events.ERROR, () => {
      send(id, 'error', {
        message: 'SoundCloud reported a playback error.'
      })
    })
  }

  function command(detail) {
    if (
      !detail ||
      typeof detail !== 'object' ||
      !isValidId(detail.id) ||
      typeof detail.command !== 'string'
    ) {
      return
    }

    const {id, command, value} = detail

    const widget = widgets.get(id)

    if (command === 'register') {
      register(id)

      return
    }

    if (command === 'destroy') {
      if (widget && window.SC?.Widget?.Events) {
        const Events = window.SC.Widget.Events

        for (const event of Object.values(Events)) {
          try {
            widget.unbind(event)
          } catch (error) {
            // Ignore unsupported/unbound events.
          }
        }
      }

      widgets.delete(id)

      return
    }

    if (!widget) {
      return
    }

    switch (command) {
      case 'play':
        widget.play()

        break

      case 'pause':
        widget.pause()

        break

      case 'toggle':
        widget.toggle()

        break

      case 'seek':
        widget.seekTo(Math.max(0, Number(value) || 0))

        break

      case 'volume':
        widget.setVolume(Math.max(0, Math.min(100, Number(value) || 0)))

        break

      case 'next':
        widget.next()

        break

      case 'previous':
        widget.prev()

        break

      case 'state':
        sendState(id, widget)

        break

      case 'sound':
        sendCurrentSound(id, widget)

        break
    }
  }

  document.addEventListener('furina-soundcloud-command', event => {
    command(event.detail)
  })
})()
