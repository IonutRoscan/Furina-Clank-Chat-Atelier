'use strict'


/*
  Developer notes

  Owns per-conversation ambience/music settings and the floating player. Playback
  is user-controlled and must respect browser media restrictions. SoundCloud uses
  the dedicated bridge rather than broad page scripting.
*/
/*
    Ambience Manager

    Owns per-conversation music and ambience state. Direct audio uses the browser Audio API. In the Firefox package, SoundCloud and YouTube use their official embedded players directly so no remote player API script is required. Playback still requires an explicit user action.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  // Ambience manager

  Atelier.AmbienceManager = {
    STORAGE_KEY: 'furina-conversation-ambience',

    conversationId: null,

    settings: {
      name: '',

      url: '',

      volume: 0.45,

      loop: true,

      showPlayer: true
    },

    audio: null,

    player: null,

    playerPlayButton: null,

    playerTitle: null,

    playerMeta: null,

    soundCloudFrame: null,

    youtubeFrame: null,

    soundCloudId: null,

    soundCloudReady: false,

    soundCloudPlaying: false,

    soundCloudPosition: 0,

    soundCloudDuration: 0,

    soundCloudTitle: '',

    soundCloudArtist: '',

    soundCloudArtwork: '',

    muted: false,

    playerCollapsed: false,

    playerArtwork: null,

    playerMuteButton: null,

    playerCollapseButton: null,

    playerTransport: null,

    playerDetails: null,

    soundCloudEventBound: false,

    playerProgress: null,

    playerTime: null,

    lastError: '',

    getDefaults() {
      return {
        name: '',

        url: '',

        volume: 0.45,

        loop: true,

        showPlayer: true
      }
    },

    async getStoredSettings() {
      return await Atelier.Storage.getObject(this.STORAGE_KEY, {})
    },

    isSoundCloudUrl(value) {
      try {
        const url = new URL(String(value || ''))

        const host = url.hostname.toLowerCase()

        return host === 'soundcloud.com' || host.endsWith('.soundcloud.com')
      } catch (error) {
        return false
      }
    },

    getYouTubeEmbedData(value) {
      try {
        const url = new URL(String(value || ''))

        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return null
        }

        const host = url.hostname.toLowerCase().replace(/^www\./, '')

        const isShortHost = host === 'youtu.be'

        const isYouTubeHost =
          host === 'youtube.com' ||
          host.endsWith('.youtube.com') ||
          host === 'youtube-nocookie.com' ||
          host.endsWith('.youtube-nocookie.com')

        if (!isShortHost && !isYouTubeHost) {
          return null
        }

        const cleanId = value => {
          const candidate = String(value || '').trim()

          return /^[A-Za-z0-9_-]{6,128}$/.test(candidate) ? candidate : ''
        }

        let videoId = ''

        let playlistId = cleanId(url.searchParams.get('list'))

        const parts = url.pathname.split('/').filter(Boolean)

        if (isShortHost) {
          videoId = cleanId(parts[0])
        } else if (parts[0] === 'watch') {
          videoId = cleanId(url.searchParams.get('v'))
        } else if (['shorts', 'embed', 'live'].includes(parts[0])) {
          if (parts[1] === 'videoseries') {
            videoId = ''
          } else {
            videoId = cleanId(parts[1])
          }
        } else if (parts[0] === 'playlist') {
          videoId = ''
        }

        if (!videoId && !playlistId) {
          return null
        }

        return {
          videoId,

          playlistId
        }
      } catch (error) {
        return null
      }
    },

    isYouTubeUrl(value) {
      return Boolean(this.getYouTubeEmbedData(value))
    },

    getSourceType() {
      const url = String(this.settings.url || '').trim()

      if (!url) {
        return 'none'
      }

      if (this.isSoundCloudUrl(url)) {
        return 'soundcloud'
      }

      if (this.isYouTubeUrl(url)) {
        return 'youtube'
      }

      return 'direct'
    },

    usesEmbeddedSoundCloudPlayer() {
      return Boolean(Atelier.Platform && Atelier.Platform.soundCloudEmbedOnly)
    },

    usesEmbeddedYouTubePlayer() {
      return true
    },

    isSafeAudioUrl(value) {
      if (typeof Atelier.isSafeHttpUrl === 'function') {
        return Atelier.isSafeHttpUrl(value)
      }

      try {
        const url = new URL(value)

        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch (error) {
        return false
      }
    },

    sanitizeSettings(values) {
      const defaults = this.getDefaults()

      if (!values || typeof values !== 'object' || Array.isArray(values)) {
        return defaults
      }

      const volume = Number(values.volume)

      let url = String(values.url || '')
        .trim()
        .slice(0, 2048)

      if (url && !this.isSafeAudioUrl(url)) {
        url = ''
      }

      return {
        name: String(values.name || '')
          .trim()
          .slice(0, 100),

        url,

        volume: Number.isFinite(volume)
          ? Math.max(0, Math.min(1, volume))
          : defaults.volume,

        loop: typeof values.loop === 'boolean' ? values.loop : defaults.loop,

        showPlayer:
          typeof values.showPlayer === 'boolean'
            ? values.showPlayer
            : defaults.showPlayer
      }
    },

    ensureAudio() {
      if (this.audio) {
        return this.audio
      }

      const audio = new Audio()

      audio.preload = 'metadata'

      audio.volume = this.muted ? 0 : this.settings.volume

      audio.loop = this.settings.loop

      audio.addEventListener('play', () => {
        this.lastError = ''

        this.syncPlayerState()
      })

      audio.addEventListener('pause', () => {
        this.syncPlayerState()
      })

      audio.addEventListener('ended', () => {
        this.syncPlayerState()
      })

      audio.addEventListener('loadedmetadata', () => {
        this.syncPlayerState()
      })

      audio.addEventListener('durationchange', () => {
        this.syncPlayerState()
      })

      audio.addEventListener('timeupdate', () => {
        this.syncPlayerState()
      })

      audio.addEventListener('error', () => {
        /*
                            Only report native Audio errors for direct sources.

                            SoundCloud URLs deliberately bypass Audio() entirely.
                        */

        if (this.getSourceType() !== 'direct') {
          return
        }

        this.lastError = 'Could not load this direct audio source.'

        this.syncPlayerState()
      })

      this.audio = audio

      return audio
    },

    stopNativeAudio() {
      if (!this.audio) {
        return
      }

      this.audio.pause()

      this.audio.removeAttribute('src')

      this.audio.dataset.furinaAudioUrl = ''

      this.audio.load()
    },

    syncAudioSource() {
      const sourceType = this.getSourceType()

      /*
                    Embedded providers own their playback surfaces.

                    Never hand SoundCloud or YouTube webpage URLs to Audio().
                */

      if (sourceType === 'soundcloud' || sourceType === 'youtube') {
        this.stopNativeAudio()

        return
      }

      const audio = this.ensureAudio()

      const url =
        sourceType === 'direct' ? String(this.settings.url || '').trim() : ''

      const currentUrl = audio.dataset.furinaAudioUrl || ''

      audio.volume = this.settings.volume

      audio.loop = this.settings.loop

      if (currentUrl === url) {
        return
      }

      audio.pause()

      audio.dataset.furinaAudioUrl = url

      this.lastError = ''

      if (!url) {
        audio.removeAttribute('src')

        audio.load()

        return
      }

      audio.src = url

      audio.load()
    },

    createSoundCloudEmbedUrl() {
      if (this.getSourceType() !== 'soundcloud') {
        return ''
      }

      const source = String(this.settings.url || '').trim()

      const params = new URLSearchParams()

      params.set('url', source)

      params.set('auto_play', 'false')

      params.set('hide_related', 'true')

      params.set('show_comments', 'false')

      params.set('show_user', 'true')

      params.set('show_reposts', 'false')

      params.set('show_teaser', 'false')

      params.set('visual', 'false')

      /*
                    SoundCloud's widget colour parameter does not accept CSS
                    variables, so use Furina's default blue-purple accent here.

                    We can make this dynamically track the current theme later
                    when we add the full widget bridge.
                */

      params.set('color', '9b7cff')

      return 'https://w.soundcloud.com/player/?' + params.toString()
    },

    createYouTubeEmbedUrl() {
      if (this.getSourceType() !== 'youtube') {
        return ''
      }

      const data = this.getYouTubeEmbedData(this.settings.url)

      if (!data) {
        return ''
      }

      const params = new URLSearchParams()

      params.set('autoplay', '0')

      params.set('playsinline', '1')

      params.set('rel', '0')

      if (data.playlistId) {
        params.set('list', data.playlistId)
      }

      const path = data.videoId
        ? '/embed/' + encodeURIComponent(data.videoId)
        : '/embed/videoseries'

      return 'https://www.youtube.com' + path + '?' + params.toString()
    },

    async loadConversation(conversationId) {
      const changed = conversationId !== this.conversationId

      if (changed && this.audio) {
        this.audio.pause()
      }

      this.destroyPlayer()

      this.conversationId = conversationId

      if (!conversationId) {
        this.settings = this.getDefaults()

        this.syncAudioSource()

        return
      }

      const stored = await this.getStoredSettings()

      if (this.conversationId !== conversationId) {
        return
      }

      const saved = stored[conversationId]

      this.settings = this.sanitizeSettings(saved)

      this.syncAudioSource()

      this.renderPlayer()
    },

    async syncConversation() {
      const conversationId =
        typeof Atelier.getConversationId === 'function'
          ? Atelier.getConversationId()
          : null

      if (conversationId === this.conversationId) {
        return false
      }

      await this.loadConversation(conversationId)

      return true
    },

    async save() {
      const conversationId = this.conversationId

      if (!conversationId) {
        return
      }

      const snapshot = this.sanitizeSettings(this.settings)

      await Atelier.Storage.updateObject(this.STORAGE_KEY, stored => {
        stored[conversationId] = snapshot

        return stored
      })
    },

    async setTrack(name, url) {
      const normalizedUrl = String(url || '')
        .trim()
        .slice(0, 2048)

      if (!normalizedUrl || !this.isSafeAudioUrl(normalizedUrl)) {
        return false
      }

      /*
                    Stop and remove any previous playback before changing source.
                */

      this.stopNativeAudio()

      this.destroyPlayer()

      this.settings.name = String(name || '')
        .trim()
        .slice(0, 100)

      this.settings.url = normalizedUrl

      this.lastError = ''

      this.syncAudioSource()

      this.renderPlayer()

      await this.save()

      return true
    },

    async setName(value) {
      this.settings.name = String(value || '')
        .trim()
        .slice(0, 100)

      this.renderPlayer()

      await this.save()
    },

    async setVolume(value) {
      const next = Number(value)

      this.settings.volume = Number.isFinite(next)
        ? Math.max(0, Math.min(1, next))
        : 0.45

      this.applyEffectiveVolume()

      await this.save()
    },

    applyEffectiveVolume() {
      const effectiveVolume = this.muted ? 0 : this.settings.volume

      if (this.audio) {
        this.audio.volume = effectiveVolume
      }

      if (
        this.getSourceType() === 'soundcloud' &&
        this.soundCloudReady &&
        !this.usesEmbeddedSoundCloudPlayer()
      ) {
        this.soundCloudCommand('volume', effectiveVolume * 100)
      }
    },

    toggleMute() {
      this.muted = !this.muted

      this.applyEffectiveVolume()

      this.syncPlayerState()
    },

    async setLoop(value) {
      this.settings.loop = Boolean(value)

      if (this.audio) {
        this.audio.loop = this.settings.loop
      }

      /*
                    SoundCloud doesn't expose a simple loop property through the
                    widget API, so Furina handles FINISH → seek(0) → play().
                */

      await this.save()
    },

    async setShowPlayer(value) {
      this.settings.showPlayer = Boolean(value)

      this.renderPlayer()

      await this.save()
    },

    async clearTrack() {
      this.stopNativeAudio()

      this.destroyPlayer()

      this.settings.name = ''

      this.settings.url = ''

      this.lastError = ''

      await this.save()
    },

    async play() {
      /*
                    Embedded SoundCloud and YouTube players own their playback
                    controls. Furina keeps them mounted and lets the provider
                    handle play, pause, volume, seeking, and playlists.
                */

      if (
        this.getSourceType() === 'soundcloud' ||
        this.getSourceType() === 'youtube'
      ) {
        this.renderPlayer()

        return false
      }

      if (!this.settings.url) {
        this.lastError = 'Add an audio URL first.'

        this.syncPlayerState()

        return false
      }

      const audio = this.ensureAudio()

      this.syncAudioSource()

      try {
        await audio.play()

        this.lastError = ''

        this.syncPlayerState()

        return true
      } catch (error) {
        this.lastError =
          'Playback was blocked or this direct audio URL could not be played.'

        this.syncPlayerState()

        return false
      }
    },

    pause() {
      if (
        this.getSourceType() === 'soundcloud' ||
        this.getSourceType() === 'youtube'
      ) {
        return
      }

      if (!this.audio) {
        return
      }

      this.audio.pause()

      this.syncPlayerState()
    },

    async togglePlayback() {
      if (this.getSourceType() === 'soundcloud') {
        if (this.usesEmbeddedSoundCloudPlayer()) {
          this.lastError =
            'Use the controls inside the SoundCloud player on Firefox.'

          this.renderPlayer()

          return false
        }

        if (!this.soundCloudReady) {
          this.lastError = 'SoundCloud is still loading.'

          this.syncPlayerState()

          return false
        }

        this.soundCloudCommand(this.soundCloudPlaying ? 'pause' : 'play')

        return true
      }

      if (this.getSourceType() === 'youtube') {
        this.lastError = 'Use the controls inside the YouTube player.'

        this.renderPlayer()

        return false
      }

      const audio = this.ensureAudio()

      if (!audio.paused) {
        this.pause()

        return false
      }

      return await this.play()
    },

    isPlaying() {
      if (this.getSourceType() === 'soundcloud') {
        return this.soundCloudPlaying
      }

      if (this.getSourceType() === 'youtube') {
        /*
                        Furina intentionally does not load YouTube's remote
                        JavaScript Player API, so playback state stays inside
                        the official iframe.
                    */

        return false
      }

      return Boolean(this.audio && !this.audio.paused && !this.audio.ended)
    },

    getDisplayName() {
      const name = String(this.settings.name || '').trim()

      if (name) {
        return name
      }

      if (this.getSourceType() === 'soundcloud') {
        return 'SoundCloud Ambience'
      }

      if (this.getSourceType() === 'youtube') {
        return 'YouTube Ambience'
      }

      if (this.settings.url) {
        try {
          const url = new URL(this.settings.url)

          const file = decodeURIComponent(
            url.pathname.split('/').filter(Boolean).pop() || ''
          )

          if (file) {
            return file
          }
        } catch (error) {
          // Fall through.
        }
      }

      return 'Ambience'
    },

    formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) {
        return '0:00'
      }

      const total = Math.floor(seconds)

      const minutes = Math.floor(total / 60)

      const remaining = String(total % 60).padStart(2, '0')

      return minutes + ':' + remaining
    },

    ensureSoundCloudEvents() {
      if (this.soundCloudEventBound) {
        return
      }

      this.soundCloudEventBound = true

      document.addEventListener('furina-soundcloud-event', event => {
        const detail = event.detail

        if (!detail || detail.id !== this.soundCloudId) {
          return
        }

        switch (detail.type) {
          case 'ready':
            this.soundCloudReady = true

            this.lastError = ''

            this.applyEffectiveVolume()

            this.soundCloudCommand('state')

            this.soundCloudCommand('sound')

            break

          case 'play':
            this.soundCloudPlaying = true

            this.lastError = ''

            break

          case 'pause':
            this.soundCloudPlaying = false

            break

          case 'finish':
            this.soundCloudPlaying = false

            this.soundCloudPosition = this.soundCloudDuration

            if (this.settings.loop) {
              this.soundCloudCommand('seek', 0)

              this.soundCloudCommand('play')
            }

            break

          case 'progress':
            this.soundCloudPosition = Math.max(0, Number(detail.position) || 0)

            break

          case 'state':
            this.soundCloudPosition = Number(detail.position) || 0

            this.soundCloudDuration = Number(detail.duration) || 0

            this.soundCloudPlaying = !Boolean(detail.paused)

            break

          case 'sound':
            this.soundCloudTitle = String(detail.title || '').slice(0, 300)

            this.soundCloudArtist = String(detail.user || '').slice(0, 200)

            {
              const artwork = String(detail.artwork || '')
                .trim()
                .slice(0, 2048)

              this.soundCloudArtwork =
                artwork &&
                typeof Atelier.isSafeHttpUrl === 'function' &&
                Atelier.isSafeHttpUrl(artwork)
                  ? artwork
                  : ''
            }

            break

          case 'error':
            this.lastError = String(
              detail.message || 'SoundCloud playback error.'
            )

            this.soundCloudPlaying = false

            break
        }

        this.syncPlayerState()
      })
    },

    soundCloudCommand(command, value = null) {
      if (!this.soundCloudId) {
        return
      }

      document.dispatchEvent(
        new CustomEvent('furina-soundcloud-command', {
          detail: {
            id: this.soundCloudId,

            command,

            value
          }
        })
      )
    },

    async registerSoundCloudFrame() {
      if (!this.soundCloudFrame || !this.soundCloudId) {
        return
      }

      const bridgeReady = await Atelier.ensureSoundCloudBridge?.()

      if (!bridgeReady || !this.soundCloudFrame || !this.soundCloudId) {
        this.lastError = 'SoundCloud controls could not initialize.'

        this.syncPlayerState()

        return
      }

      this.ensureSoundCloudEvents()

      this.soundCloudCommand('register')
    },

    destroyPlayer() {
      if (this.soundCloudId) {
        this.soundCloudCommand('destroy')
      }

      if (this.player) {
        this.player.remove()
      }

      this.player = null

      this.playerPlayButton = null

      this.playerTitle = null

      this.playerMeta = null

      this.playerProgress = null

      this.playerTime = null

      this.playerArtwork = null

      this.playerMuteButton = null

      this.playerCollapseButton = null

      this.playerTransport = null

      this.playerDetails = null

      this.soundCloudFrame = null

      this.youtubeFrame = null

      this.soundCloudId = null

      this.soundCloudReady = false

      this.soundCloudPlaying = false

      this.soundCloudPosition = 0

      this.soundCloudDuration = 0

      this.soundCloudTitle = ''

      this.soundCloudArtist = ''

      this.soundCloudArtwork = ''
    },

    renderEmbeddedSoundCloudPlayer() {
      /*
                    Firefox compatibility mode deliberately uses SoundCloud's
                    official iframe UI directly. This avoids loading remote
                    executable Widget API code into the extension/page context
                    while still giving the user reliable SoundCloud playback.
                */

      const player = document.createElement('div')

      player.className =
        'furina-ambience-player furina-ambience-player-soundcloud-embed'

      player.dataset.furinaOwned = 'true'

      player.dataset.furinaSourceUrl = this.settings.url

      player.dataset.furinaSourceType = 'soundcloud'

      player.classList.toggle(
        'furina-ambience-player-collapsed',
        this.playerCollapsed
      )

      const main = document.createElement('div')

      main.className = 'furina-ambience-main'

      const artwork = document.createElement('div')

      artwork.className = 'furina-ambience-artwork'

      artwork.textContent = '♫'

      const text = document.createElement('div')

      text.className = 'furina-ambience-player-text'

      const title = document.createElement('div')

      title.className = 'furina-ambience-player-title'

      title.textContent = this.getDisplayName()

      const meta = document.createElement('div')

      meta.className = 'furina-ambience-player-meta'

      meta.textContent = 'SoundCloud • embedded Firefox player'

      text.append(title, meta)

      const collapse = document.createElement('button')

      collapse.type = 'button'

      collapse.className =
        'furina-ambience-icon-button furina-ambience-collapse'

      collapse.title = 'Collapse player'

      collapse.addEventListener('click', () => {
        this.playerCollapsed = !this.playerCollapsed

        player.classList.toggle(
          'furina-ambience-player-collapsed',
          this.playerCollapsed
        )

        collapse.textContent = this.playerCollapsed ? '⌃' : '⌄'
      })

      collapse.textContent = this.playerCollapsed ? '⌃' : '⌄'

      main.append(artwork, text, collapse)

      const details = document.createElement('div')

      details.className =
        'furina-ambience-details furina-soundcloud-embed-details'

      const notice = document.createElement('div')

      notice.className = 'furina-soundcloud-firefox-note'

      notice.textContent =
        'Playback, volume, seeking, and playlist controls are handled inside SoundCloud on Firefox.'

      const frame = document.createElement('iframe')

      frame.className = 'furina-soundcloud-frame furina-soundcloud-frame-compat'

      frame.title = this.getDisplayName()

      frame.scrolling = 'no'

      frame.frameBorder = '0'

      frame.allow = 'autoplay'

      frame.loading = 'eager'

      frame.referrerPolicy = 'no-referrer-when-downgrade'

      frame.src = this.createSoundCloudEmbedUrl()

      details.append(notice, frame)

      player.append(main, details)

      document.body.appendChild(player)

      Atelier.I18n?.observeRoot?.(player)

      this.player = player

      this.playerArtwork = artwork

      this.playerTitle = title

      this.playerMeta = meta

      this.playerCollapseButton = collapse

      this.playerDetails = details

      this.soundCloudFrame = frame

      this.soundCloudId = null

      this.soundCloudReady = true

      this.soundCloudPlaying = false
    },

    renderEmbeddedYouTubePlayer() {
      /*
                    YouTube uses its official iframe player on every supported
                    browser. No remote YouTube JavaScript Player API is loaded
                    by Furina, so the provider owns its playback controls.
                */

      const player = document.createElement('div')

      player.className =
        'furina-ambience-player furina-ambience-player-youtube-embed'

      player.dataset.furinaOwned = 'true'

      player.dataset.furinaSourceUrl = this.settings.url

      player.dataset.furinaSourceType = 'youtube'

      player.classList.toggle(
        'furina-ambience-player-collapsed',
        this.playerCollapsed
      )

      const main = document.createElement('div')

      main.className = 'furina-ambience-main'

      const artwork = document.createElement('div')

      artwork.className = 'furina-ambience-artwork'

      artwork.textContent = '▶'

      const text = document.createElement('div')

      text.className = 'furina-ambience-player-text'

      const title = document.createElement('div')

      title.className = 'furina-ambience-player-title'

      title.textContent = this.getDisplayName()

      const meta = document.createElement('div')

      meta.className = 'furina-ambience-player-meta'

      meta.textContent = 'YouTube • embedded player'

      text.append(title, meta)

      const collapse = document.createElement('button')

      collapse.type = 'button'

      collapse.className =
        'furina-ambience-icon-button furina-ambience-collapse'

      collapse.title = 'Collapse player'

      collapse.addEventListener('click', () => {
        this.playerCollapsed = !this.playerCollapsed

        player.classList.toggle(
          'furina-ambience-player-collapsed',
          this.playerCollapsed
        )

        collapse.textContent = this.playerCollapsed ? '⌃' : '⌄'
      })

      collapse.textContent = this.playerCollapsed ? '⌃' : '⌄'

      main.append(artwork, text, collapse)

      const details = document.createElement('div')

      details.className = 'furina-ambience-details furina-youtube-embed-details'

      const notice = document.createElement('div')

      notice.className = 'furina-youtube-embed-note'

      notice.textContent =
        'Playback, volume, seeking, playlists, and fullscreen are handled inside YouTube.'

      const frame = document.createElement('iframe')

      frame.className = 'furina-youtube-frame-compat'

      frame.title = this.getDisplayName()

      frame.frameBorder = '0'

      frame.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'

      frame.allowFullscreen = true

      frame.loading = 'eager'

      frame.referrerPolicy = 'strict-origin-when-cross-origin'

      frame.src = this.createYouTubeEmbedUrl()

      details.append(notice, frame)

      player.append(main, details)

      document.body.appendChild(player)

      Atelier.I18n?.observeRoot?.(player)

      this.player = player

      this.playerArtwork = artwork

      this.playerTitle = title

      this.playerMeta = meta

      this.playerCollapseButton = collapse

      this.playerDetails = details

      this.youtubeFrame = frame
    },

    renderPlayer() {
      const shouldShow = Boolean(
        this.conversationId && this.settings.url && this.settings.showPlayer
      )

      if (!shouldShow) {
        this.destroyPlayer()

        return
      }

      if (
        this.player &&
        this.player.isConnected &&
        this.player.dataset.furinaSourceUrl === this.settings.url
      ) {
        this.syncPlayerState()

        return
      }

      this.destroyPlayer()

      const sourceType = this.getSourceType()

      if (sourceType === 'soundcloud' && this.usesEmbeddedSoundCloudPlayer()) {
        this.renderEmbeddedSoundCloudPlayer()

        return
      }

      if (sourceType === 'youtube' && this.usesEmbeddedYouTubePlayer()) {
        this.renderEmbeddedYouTubePlayer()

        return
      }

      const player = document.createElement('div')

      player.className = 'furina-ambience-player'

      player.dataset.furinaOwned = 'true'

      player.dataset.furinaSourceUrl = this.settings.url

      player.dataset.furinaSourceType = sourceType

      player.classList.toggle(
        'furina-ambience-player-collapsed',
        this.playerCollapsed
      )

      const main = document.createElement('div')

      main.className = 'furina-ambience-main'

      const artwork = document.createElement('div')

      artwork.className = 'furina-ambience-artwork'

      artwork.textContent = '♫'

      const text = document.createElement('div')

      text.className = 'furina-ambience-player-text'

      const title = document.createElement('div')

      title.className = 'furina-ambience-player-title'

      const meta = document.createElement('div')

      meta.className = 'furina-ambience-player-meta'

      text.append(title, meta)

      const collapse = document.createElement('button')

      collapse.type = 'button'

      collapse.className =
        'furina-ambience-icon-button furina-ambience-collapse'

      collapse.title = 'Collapse player'

      collapse.addEventListener('click', () => {
        this.playerCollapsed = !this.playerCollapsed

        player.classList.toggle(
          'furina-ambience-player-collapsed',
          this.playerCollapsed
        )

        this.syncPlayerState()
      })

      main.append(artwork, text, collapse)

      const details = document.createElement('div')

      details.className = 'furina-ambience-details'

      const progressArea = document.createElement('div')

      progressArea.className = 'furina-ambience-progress-area'

      const progress = document.createElement('input')

      progress.type = 'range'

      progress.className = 'furina-ambience-progress'

      progress.min = '0'

      progress.max = '1000'

      progress.step = '1'

      progress.value = '0'

      const time = document.createElement('div')

      time.className = 'furina-ambience-time'

      time.textContent = '0:00 / --:--'

      progress.addEventListener('input', () => {
        const ratio = Number(progress.value) / 1000

        if (sourceType === 'soundcloud') {
          if (!this.soundCloudDuration) {
            return
          }

          const target = ratio * this.soundCloudDuration

          this.soundCloudPosition = target

          this.soundCloudCommand('seek', target)
        } else if (this.audio && Number.isFinite(this.audio.duration)) {
          this.audio.currentTime = ratio * this.audio.duration
        }

        this.syncPlayerState()
      })

      progressArea.append(progress, time)

      const transport = document.createElement('div')

      transport.className = 'furina-ambience-transport'

      const previous = document.createElement('button')

      previous.type = 'button'

      previous.className = 'furina-ambience-icon-button'

      previous.textContent = '‹'

      previous.title = 'Previous SoundCloud track'

      previous.disabled = sourceType !== 'soundcloud'

      previous.addEventListener('click', () => {
        this.soundCloudCommand('previous')
      })

      const play = document.createElement('button')

      play.type = 'button'

      play.className = 'furina-ambience-player-play'

      play.title = 'Play / pause ambience'

      play.addEventListener('click', async () => {
        await this.togglePlayback()
      })

      const next = document.createElement('button')

      next.type = 'button'

      next.className = 'furina-ambience-icon-button'

      next.textContent = '›'

      next.title = 'Next SoundCloud track'

      next.disabled = sourceType !== 'soundcloud'

      next.addEventListener('click', () => {
        this.soundCloudCommand('next')
      })

      const spacer = document.createElement('div')

      spacer.className = 'furina-ambience-transport-spacer'

      const mute = document.createElement('button')

      mute.type = 'button'

      mute.className = 'furina-ambience-icon-button furina-ambience-mute'

      mute.title = 'Mute / unmute'

      mute.addEventListener('click', () => {
        this.toggleMute()
      })

      transport.append(previous, play, next, spacer, mute)

      details.append(progressArea, transport)

      player.append(main, details)

      if (sourceType === 'soundcloud') {
        this.soundCloudId =
          'furina-sc-' + Date.now() + '-' + Math.random().toString(36).slice(2)

        const frame = document.createElement('iframe')

        frame.className =
          'furina-soundcloud-frame furina-soundcloud-frame-hidden'

        frame.title = this.getDisplayName()

        frame.scrolling = 'no'

        frame.frameBorder = '0'

        frame.allow = 'autoplay'

        frame.src = this.createSoundCloudEmbedUrl()

        frame.dataset.furinaScId = this.soundCloudId

        frame.addEventListener('load', () => {
          this.registerSoundCloudFrame()
        })

        player.appendChild(frame)

        this.soundCloudFrame = frame
      }

      document.body.appendChild(player)

      Atelier.I18n?.observeRoot?.(player)

      this.player = player

      this.playerArtwork = artwork

      this.playerPlayButton = play

      this.playerTitle = title

      this.playerMeta = meta

      this.playerProgress = progress

      this.playerTime = time

      this.playerMuteButton = mute

      this.playerCollapseButton = collapse

      this.playerTransport = transport

      this.playerDetails = details

      this.syncPlayerState()
    },

    syncPlayerState() {
      if (!this.player) {
        return
      }

      const sourceType = this.getSourceType()

      if (this.playerTitle) {
        if (sourceType === 'soundcloud' && this.soundCloudTitle) {
          this.playerTitle.textContent = this.soundCloudTitle
        } else {
          this.playerTitle.textContent = this.getDisplayName()
        }
      }

      if (this.playerArtwork) {
        this.playerArtwork.replaceChildren()

        if (sourceType === 'soundcloud' && this.soundCloudArtwork) {
          const image = document.createElement('img')

          image.src = this.soundCloudArtwork

          image.alt = ''

          image.referrerPolicy = 'no-referrer'

          this.playerArtwork.appendChild(image)
        } else {
          this.playerArtwork.textContent = sourceType === 'youtube' ? '▶' : '♫'
        }
      }

      if (this.playerPlayButton) {
        this.playerPlayButton.textContent = this.isPlaying() ? 'Ⅱ' : '▶'

        this.playerPlayButton.setAttribute(
          'aria-label',
          this.isPlaying() ? 'Pause ambience' : 'Play ambience'
        )
      }

      if (this.playerMuteButton) {
        this.playerMuteButton.textContent = this.muted
          ? '🔇'
          : this.settings.volume < 0.35
            ? '🔈'
            : '🔊'

        this.playerMuteButton.title = this.muted ? 'Unmute' : 'Mute'
      }

      if (this.playerCollapseButton) {
        this.playerCollapseButton.textContent = this.playerCollapsed ? '⌃' : '⌄'

        this.playerCollapseButton.title = this.playerCollapsed
          ? 'Expand player'
          : 'Collapse player'
      }

      if (this.lastError) {
        if (this.playerMeta) {
          this.playerMeta.textContent = this.lastError

          this.playerMeta.classList.add('furina-ambience-player-error')
        }

        return
      }

      if (this.playerMeta) {
        this.playerMeta.classList.remove('furina-ambience-player-error')
      }

      let position = 0

      let duration = 0

      if (sourceType === 'soundcloud') {
        if (this.usesEmbeddedSoundCloudPlayer()) {
          if (this.playerMeta) {
            this.playerMeta.textContent = 'SoundCloud • embedded Firefox player'
          }

          return
        }

        position = this.soundCloudPosition

        duration = this.soundCloudDuration

        if (this.playerMeta) {
          const pieces = []

          if (this.soundCloudArtist) {
            pieces.push(this.soundCloudArtist)
          }

          pieces.push(
            this.soundCloudReady
              ? this.isPlaying()
                ? 'Playing'
                : 'Paused'
              : 'Loading SoundCloud…'
          )

          this.playerMeta.textContent = pieces.join(' • ')
        }
      } else if (sourceType === 'youtube') {
        if (this.playerMeta) {
          this.playerMeta.textContent = 'YouTube • embedded player'
        }

        return
      } else {
        const audio = this.audio

        if (audio) {
          position = Number.isFinite(audio.currentTime)
            ? audio.currentTime * 1000
            : 0

          duration = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0
        }

        if (this.playerMeta) {
          this.playerMeta.textContent = this.isPlaying() ? 'Playing' : 'Paused'
        }
      }

      if (this.playerProgress) {
        const ratio =
          duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0

        this.playerProgress.value = String(Math.round(ratio * 1000))

        this.playerProgress.disabled = duration <= 0
      }

      if (this.playerTime) {
        this.playerTime.textContent =
          this.formatTime(position / 1000) +
          ' / ' +
          (duration > 0 ? this.formatTime(duration / 1000) : '--:--')
      }
    }
  }
})()
