'use strict'


/*
  Developer notes

  Chat Look panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Chat Appearance Panel Section

    Renders controls for chat background, width, avatars, spacing, and compact mode.
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

  // CHARACTER IMAGE DETECTION

  function getClankImageAssetBase(imageUrl) {
    if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
      return null
    }

    try {
      const url = new URL(imageUrl, window.location.href)

      if (url.hostname !== 'img.clank.world') {
        return null
      }

      const parts = url.pathname.split('/').filter(Boolean)

      if (parts.length < 3) {
        return null
      }

      const transform = parts[parts.length - 1]

      if (
        !transform.includes('w=') &&
        !transform.includes('h=') &&
        !transform.includes('fit=')
      ) {
        return null
      }

      parts.pop()

      return `${url.origin}/${parts.join('/')}`
    } catch (error) {
      return null
    }
  }

  function getCurrentCharacterImageCandidates() {
    const avatars = Array.from(
      document.querySelectorAll(
        '.clank-atelier-message-assistant .clank-atelier-avatar'
      )
    )

    const avatar = avatars[avatars.length - 1]

    if (!avatar) {
      return {
        avatar: null,
        candidates: []
      }
    }

    const candidates = []

    function addCandidate(label, url) {
      if (typeof url !== 'string' || !url.trim()) {
        return
      }

      const cleanUrl = url.trim()

      if (candidates.some(candidate => candidate.url === cleanUrl)) {
        return
      }

      candidates.push({
        label,
        url: cleanUrl
      })
    }

    addCandidate('currentSrc', avatar.currentSrc)

    addCandidate('src', avatar.src)

    const assetBase = getClankImageAssetBase(avatar.currentSrc || avatar.src)

    if (assetBase) {
      /*
                Width-only Clank image URLs preserve the character
                artwork's original aspect ratio instead of using the
                square avatar crop.

                Try a large version first for desktop backgrounds,
                with 1024 as a fallback.
            */

      addCandidate('Clank portrait 1920', `${assetBase}/w=1920,q=100,f=webp`)

      addCandidate('Clank portrait 1024', `${assetBase}/w=1024,q=100,f=webp`)
    }

    return {
      avatar,
      candidates
    }
  }

  function probeImageCandidate(candidate) {
    return new Promise(resolve => {
      const image = new Image()

      image.onload = () => {
        resolve({
          ...candidate,
          ok: true,
          width: image.naturalWidth,
          height: image.naturalHeight
        })
      }

      image.onerror = () => {
        resolve({
          ...candidate,
          ok: false,
          width: 0,
          height: 0
        })
      }

      image.src = candidate.url
    })
  }

  // CHAT SECTION

  function createChatSection() {
    const section = createSection('Chat')

    const accent = createColorControl('Accent', 'accent')

    const backgroundMode = createSelectControl({
      label: 'Background type',

      key: 'chatBackgroundMode',

      options: [
        {
          label: 'Solid',

          value: 'solid'
        },

        {
          label: 'Gradient',

          value: 'gradient'
        },

        {
          label: 'Image',

          value: 'image'
        },

        {
          label: 'Video',

          value: 'video'
        }
      ]
    })

    const background = createColorControl('Background color', 'chatBackground')

    // GRADIENT CONTROLS

    const gradientControls = createElement('div', 'furina-conditional-group')

    const gradientColor = createColorControl(
      'Gradient color',
      'chatGradientColor'
    )

    const gradientAngle = createRangeControl({
      label: 'Gradient angle',

      key: 'chatGradientAngle',

      min: 0,

      max: 360,

      step: 5,

      format: value => `${value}°`
    })

    gradientControls.append(gradientColor.wrapper, gradientAngle.wrapper)

    // IMAGE CONTROLS

    const imageControls = createElement('div', 'furina-conditional-group')

    const imageUrl = createTextControl({
      label: 'Image URL',

      key: 'chatImageUrl',

      placeholder: 'https://example.com/background.jpg'
    })

    const characterImageTools = createElement('div', 'furina-action-stack')

    const useCharacterImageButton = createElement(
      'button',
      'furina-secondary-button',
      'Use character image'
    )

    useCharacterImageButton.type = 'button'

    const characterImageStatus = createElement(
      'div',
      'furina-toggle-description',
      "Use the current RP character's profile image as this conversation's background."
    )

    useCharacterImageButton.addEventListener('click', async () => {
      useCharacterImageButton.disabled = true

      characterImageStatus.textContent = 'Finding the current character image…'

      const conversationId = Atelier.getConversationId?.()

      if (!conversationId) {
        characterImageStatus.textContent = 'Open a Clank conversation first.'

        useCharacterImageButton.disabled = false

        return
      }

      const result = getCurrentCharacterImageCandidates()

      if (!result.avatar || result.candidates.length === 0) {
        characterImageStatus.textContent =
          'No character image was found in this conversation yet.'

        useCharacterImageButton.disabled = false

        return
      }

      const tested = await Promise.all(
        result.candidates.map(probeImageCandidate)
      )

      const working = tested
        .filter(candidate => candidate.ok)
        .sort((a, b) => b.width * b.height - a.width * a.height)

      if (working.length === 0) {
        characterImageStatus.textContent =
          'The character image was found, but Furina could not load a usable version.'

        useCharacterImageButton.disabled = false

        return
      }

      const best = working[0]

      /*
                        A character background belongs to this RP.

                        If the user is currently using the global theme,
                        create a conversation override first so this
                        character's portrait does not become the
                        background of every Clank conversation.
                    */

      if (Atelier.ThemeManager.scope !== 'conversation') {
        await Atelier.ThemeManager.enableConversationTheme()
      }

      await Atelier.ThemeManager.updateMany({
        chatBackgroundMode: 'image',

        chatImageUrl: best.url
      })

      /*
                        ThemeManager changed the actual theme state.

                        Update the controls already visible in the panel
                        too, without rebuilding the whole workspace.
                    */

      backgroundMode.select.value = 'image'

      imageUrl.input.value = best.url

      updateBackgroundControls()

      const shape =
        best.height > best.width
          ? 'portrait'
          : best.width > best.height
            ? 'landscape'
            : 'square'

      characterImageStatus.textContent = `Using ${best.width} × ${best.height} ${shape} character image for this conversation.`

      console.log('[Furina] Character background applied:', best)

      useCharacterImageButton.disabled = false
    })

    characterImageTools.append(useCharacterImageButton, characterImageStatus)

    const videoUrl = createTextControl({
      label: 'Video URL',

      key: 'chatVideoUrl',

      placeholder: 'https://example.com/background.mp4'
    })

    const imageFit = createSelectControl({
      label: 'Background fit',

      key: 'chatImageFit',

      options: [
        {
          label: 'Cover',

          value: 'cover'
        },

        {
          label: 'Contain',

          value: 'contain'
        },

        {
          label: 'Original / Auto',

          value: 'auto'
        }
      ]
    })

    const imagePosition = createSelectControl({
      label: 'Background position',

      key: 'chatImagePosition',

      options: [
        {
          label: 'Center',

          value: 'center'
        },

        {
          label: 'Top',

          value: 'center top'
        },

        {
          label: 'Bottom',

          value: 'center bottom'
        },

        {
          label: 'Left',

          value: 'left center'
        },

        {
          label: 'Right',

          value: 'right center'
        },

        {
          label: 'Top left',

          value: 'left top'
        },

        {
          label: 'Top right',

          value: 'right top'
        },

        {
          label: 'Bottom left',

          value: 'left bottom'
        },

        {
          label: 'Bottom right',

          value: 'right bottom'
        }
      ]
    })

    const imageDarkness = createRangeControl({
      label: 'Background darkness',

      key: 'chatImageDarkness',

      min: 0,

      max: 0.9,

      step: 0.05,

      format: value => `${Math.round(value * 100)}%`
    })

    const overlayColor = createColorControl(
      'Overlay tint',
      'chatImageOverlayColor'
    )

    const overlayOpacity = createRangeControl({
      label: 'Overlay strength',

      key: 'chatImageOverlayOpacity',

      min: 0,

      max: 0.9,

      step: 0.05,

      format: value => `${Math.round(value * 100)}%`
    })

    const vignette = createRangeControl({
      label: 'Vignette',

      key: 'chatImageVignette',

      min: 0,

      max: 1,

      step: 0.05,

      format: value => `${Math.round(value * 100)}%`
    })

    const imageBlur = createRangeControl({
      label: 'Background blur',

      key: 'chatImageBlur',

      min: 0,

      max: 20,

      step: 1,

      format: value => `${value}px`
    })

    imageControls.append(
      imageUrl.wrapper,
      characterImageTools,
      videoUrl.wrapper,
      imageFit.wrapper,
      imagePosition.wrapper,
      imageDarkness.wrapper,
      overlayColor.wrapper,
      overlayOpacity.wrapper,
      vignette.wrapper,
      imageBlur.wrapper
    )

    // CHAT LAYOUT

    const width = createRangeControl({
      label: 'Chat width',

      key: 'messageWidth',

      min: 520,

      max: 1000,

      step: 10,

      format: value => `${value}px`
    })

    const avatar = createRangeControl({
      label: 'Avatar size',

      key: 'avatarSize',

      min: 28,

      max: 84,

      step: 2,

      format: value => `${value}px`
    })

    const messageSpacing = createRangeControl({
      label: 'Message spacing',

      key: 'messageSpacing',

      min: 0,

      max: 32,

      step: 1,

      format: value => `${value}px`
    })

    section.furinaContent.append(
      accent.wrapper,
      backgroundMode.wrapper,
      background.wrapper,
      gradientControls,
      imageControls,
      width.wrapper,
      avatar.wrapper,
      messageSpacing.wrapper
    )

    // BACKGROUND CONTROL VISIBILITY

    function updateBackgroundControls() {
      const mode = backgroundMode.select.value

      gradientControls.hidden = mode !== 'gradient'

      imageUrl.wrapper.hidden = mode !== 'image'

      characterImageTools.hidden = mode !== 'image'

      videoUrl.wrapper.hidden = mode !== 'image'

      videoUrl.wrapper.hidden = mode !== 'video'
    }

    backgroundMode.select.addEventListener('change', updateBackgroundControls)

    updateBackgroundControls()

    // COMPACT MODE

    const toggle = createElement('label', 'furina-toggle-row')

    const toggleText = createElement('div')

    const toggleTitle = createElement(
      'div',
      'furina-toggle-title',
      'Compact mode'
    )

    const toggleDescription = createElement(
      'div',
      'furina-toggle-description',
      'Reduce message and control spacing.'
    )

    toggleText.append(toggleTitle, toggleDescription)

    const checkbox = document.createElement('input')

    checkbox.type = 'checkbox'

    checkbox.className = 'furina-checkbox'

    checkbox.checked = Boolean(Atelier.ThemeManager.settings.compact)

    checkbox.addEventListener('change', () => {
      Atelier.ThemeManager.update('compact', checkbox.checked)
    })

    toggle.append(toggleText, checkbox)

    section.furinaContent.appendChild(toggle)

    return section
  }

  Sections.createChatSection = createChatSection
})()
