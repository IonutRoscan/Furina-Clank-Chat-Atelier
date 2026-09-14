'use strict'


/*
  Developer notes

  Content-world side of the SoundCloud bridge. It injects the page-world helper
  when needed and relays only the small set of media events Furina understands.
  Keep the message surface narrow because this crosses an execution-world boundary.
*/
/*
    SoundCloud Page Bridge Loader

    The SoundCloud Widget API must run in Clank's page context. This helper injects Furina's small page bridge only when a SoundCloud track is actually used. It never starts playback by itself.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  // SOUNDCLOUD PAGE BRIDGE

  let soundCloudBridgeReady = false

  let soundCloudBridgePromise = null

  function ensureSoundCloudBridge() {
    if (soundCloudBridgeReady) {
      return Promise.resolve(true)
    }

    if (soundCloudBridgePromise) {
      return soundCloudBridgePromise
    }

    if (
      typeof chrome === 'undefined' ||
      !chrome.runtime ||
      typeof chrome.runtime.getURL !== 'function'
    ) {
      console.warn('[Clank Atelier] SoundCloud bridge unavailable.')

      return Promise.resolve(false)
    }

    soundCloudBridgePromise = new Promise(resolve => {
      const existing = document.getElementById('furina-soundcloud-bridge')

      if (existing) {
        existing.addEventListener(
          'load',
          () => {
            soundCloudBridgeReady = true

            soundCloudBridgePromise = null

            existing.remove()

            resolve(true)
          },
          {
            once: true
          }
        )

        existing.addEventListener(
          'error',
          () => {
            soundCloudBridgePromise = null

            existing.remove()

            resolve(false)
          },
          {
            once: true
          }
        )

        return
      }

      const script = document.createElement('script')

      script.id = 'furina-soundcloud-bridge'

      script.src = chrome.runtime.getURL(
        'src/features/ambience/soundcloud-bridge.js'
      )

      script.dataset.furinaOwned = 'true'

      script.addEventListener(
        'load',
        () => {
          soundCloudBridgeReady = true

          soundCloudBridgePromise = null

          script.remove()

          resolve(true)
        },
        {
          once: true
        }
      )

      script.addEventListener(
        'error',
        () => {
          soundCloudBridgePromise = null

          script.remove()

          resolve(false)
        },
        {
          once: true
        }
      )

      ;(document.head || document.documentElement).appendChild(script)
    })

    return soundCloudBridgePromise
  }

  Atelier.ensureSoundCloudBridge = ensureSoundCloudBridge
})()
