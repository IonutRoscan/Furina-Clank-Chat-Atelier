'use strict'


/*
  Developer notes

  Ambience panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Ambience Panel Section

    Renders direct-audio, SoundCloud, and YouTube ambience controls.
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

  // Music / ambience

  function createAmbienceSection() {
    const section = createSection('Music / Ambience', {collapsed: true})

    const manager = Atelier.AmbienceManager

    if (!manager) {
      section.furinaContent.appendChild(
        createElement(
          'div',
          'furina-portable-empty',
          'Ambience engine unavailable.'
        )
      )
      return section
    }

    const usesEmbeddedSoundCloud = Boolean(
      manager.usesEmbeddedSoundCloudPlayer?.()
    )

    const sourceType = manager.getSourceType()

    const soundCloudCompatibilityActive =
      usesEmbeddedSoundCloud && sourceType === 'soundcloud'

    const youtubeCompatibilityActive = sourceType === 'youtube'

    const embeddedCompatibilityActive =
      soundCloudCompatibilityActive || youtubeCompatibilityActive

    const intro = createElement(
      'div',
      'furina-ambience-help',
      'Give this conversation its own soundtrack, ambient audio, or YouTube media. Playback begins only after you press Play in Furina or inside an embedded player.'
    )

    const firefoxEmbeddedMediaNote = usesEmbeddedSoundCloud
      ? createElement(
          'div',
          'furina-ambience-help furina-ambience-firefox-note',
          'Firefox compatibility: SoundCloud and YouTube use their official embedded players. When either is loaded, use the controls inside that player for playback, volume, seeking, playlists, and track changes.'
        )
      : null

    const nameControl = createElement('label', 'furina-text-control')
    const nameLabel = createElement(
      'span',
      'furina-control-label',
      'Track name'
    )
    const nameInput = document.createElement('input')
    nameInput.type = 'text'
    nameInput.className = 'furina-text-input'
    nameInput.placeholder = 'Rainy Café, Character Theme, etc.'
    nameInput.value = manager.settings.name
    nameInput.addEventListener('change', async () => {
      await manager.setName(nameInput.value)
    })
    nameInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') nameInput.blur()
    })
    nameControl.append(nameLabel, nameInput)

    const urlControl = createElement(
      'label',
      'furina-text-control furina-ambience-url-control'
    )
    const urlLabel = createElement(
      'span',
      'furina-control-label',
      'Audio, SoundCloud or YouTube URL'
    )
    const urlInput = document.createElement('input')
    urlInput.type = 'text'
    urlInput.className = 'furina-text-input'
    urlInput.placeholder = 'YouTube, SoundCloud, or direct .mp3 / .ogg URL'
    urlInput.value = manager.settings.url
    urlControl.append(urlLabel, urlInput)

    const status = createElement('div', 'furina-ambience-status')
    const load = createElement(
      'button',
      'furina-secondary-button',
      manager.settings.url ? 'Update Track' : 'Load Track'
    )
    load.type = 'button'

    async function loadTrack() {
      const url = urlInput.value.trim()
      const name = nameInput.value.trim()
      if (!url) {
        status.textContent =
          'Enter an http or https audio, SoundCloud, or YouTube URL.'
        return
      }
      const loaded = await manager.setTrack(name, url)
      if (!loaded) {
        status.textContent = 'That audio URL is not valid.'
        return
      }
      const loadedSourceType = manager.getSourceType()

      status.textContent =
        loadedSourceType === 'youtube'
          ? 'YouTube loaded. Use the embedded YouTube controls.'
          : loadedSourceType === 'soundcloud'
            ? usesEmbeddedSoundCloud
              ? 'SoundCloud loaded. Use the embedded SoundCloud controls.'
              : "SoundCloud loaded. Use Furina's player controls."
            : 'Track loaded. Press Play when ready.'
      load.textContent = 'Update Track'
      Atelier.PanelShell.rebuild()
    }

    load.addEventListener('click', loadTrack)
    urlInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') loadTrack()
    })

    const playback = createElement('div', 'furina-ambience-playback')
    const play = createElement(
      'button',
      'furina-secondary-button',
      manager.isPlaying() ? 'Pause' : 'Play'
    )
    const clear = createElement(
      'button',
      'furina-secondary-button furina-ambience-clear',
      'Clear'
    )
    play.type = 'button'
    clear.type = 'button'

    if (soundCloudCompatibilityActive) {
      play.textContent = 'Use SoundCloud player'
    } else if (youtubeCompatibilityActive) {
      play.textContent = 'Use YouTube player'
    }
    play.disabled = !manager.settings.url || embeddedCompatibilityActive
    clear.disabled = !manager.settings.url

    play.addEventListener('click', async () => {
      await manager.togglePlayback()
      play.textContent = manager.isPlaying() ? 'Pause' : 'Play'
      status.textContent =
        manager.lastError || (manager.isPlaying() ? 'Playing.' : 'Paused.')
    })

    clear.addEventListener('click', async () => {
      await manager.clearTrack()
      Atelier.PanelShell.rebuild()
    })
    playback.append(play, clear)

    const volume = createElement('div', 'furina-control')
    const volumeHeader = createElement('div', 'furina-control-header')
    const volumeLabel = createElement('span', 'furina-control-label', 'Volume')
    const volumeValue = createElement(
      'span',
      'furina-control-value',
      `${Math.round(manager.settings.volume * 100)}%`
    )
    const volumeInput = document.createElement('input')
    volumeInput.type = 'range'
    volumeInput.className = 'furina-range'
    volumeInput.min = '0'
    volumeInput.max = '1'
    volumeInput.step = '0.05'
    volumeInput.value = String(manager.settings.volume)
    volumeInput.disabled = embeddedCompatibilityActive
    volumeInput.addEventListener('input', async () => {
      const next = Number(volumeInput.value)
      volumeValue.textContent = `${Math.round(next * 100)}%`
      await manager.setVolume(next)
    })
    volumeHeader.append(volumeLabel, volumeValue)
    volume.append(volumeHeader, volumeInput)

    function createAmbienceToggle(
      titleText,
      descriptionText,
      checked,
      onChange
    ) {
      const row = createElement(
        'label',
        'furina-toggle-row furina-ambience-toggle'
      )
      const text = createElement('div')
      text.append(
        createElement('div', 'furina-toggle-title', titleText),
        createElement('div', 'furina-toggle-description', descriptionText)
      )
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.className = 'furina-checkbox'
      checkbox.checked = Boolean(checked)
      checkbox.addEventListener('change', async () => {
        await onChange(checkbox.checked)
      })
      row.append(text, checkbox)
      return row
    }

    const loop = createAmbienceToggle(
      'Loop',
      'Restart the ambience automatically when it ends.',
      manager.settings.loop,
      value => manager.setLoop(value)
    )

    if (embeddedCompatibilityActive) {
      const loopCheckbox = loop.querySelector('input')

      if (loopCheckbox) {
        loopCheckbox.checked = false

        loopCheckbox.disabled = true
      }

      const loopDescription = loop.querySelector('.furina-toggle-description')

      if (loopDescription) {
        loopDescription.textContent = youtubeCompatibilityActive
          ? 'Furina loop is unavailable for YouTube embeds.'
          : 'Furina loop is unavailable for SoundCloud on Firefox.'
      }
    }

    const showPlayer = createAmbienceToggle(
      'Floating player',
      'Show a compact player while this conversation has ambience.',
      manager.settings.showPlayer,
      value => manager.setShowPlayer(value)
    )

    section.furinaContent.append(intro)

    if (firefoxEmbeddedMediaNote) {
      section.furinaContent.append(firefoxEmbeddedMediaNote)
    }

    section.furinaContent.append(
      nameControl,
      urlControl,
      load,
      status,
      playback,
      volume,
      loop,
      showPlayer
    )

    return section
  }

  Sections.createAmbienceSection = createAmbienceSection
})()
