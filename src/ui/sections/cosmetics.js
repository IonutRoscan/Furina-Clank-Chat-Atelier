'use strict'


/*
  Developer notes

  Cosmetics panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Cosmetic Effects Panel Sections

    These controls are deliberately split between two workspace tabs:

    Look → Effects
        Background motion/grading, bubbles, avatars, and Furina panel styling.

    Scene → Decor
        Particles, separators, corner ornaments, and Screenshot Mode.

    The settings themselves live in ThemeManager so custom themes and exports
    can carry the visual choices with them.
*/
;(() => {
  const Atelier = window.ClankAtelier
  const UI = Atelier.PanelUI
  const Sections = Atelier.PanelSections

  const {
    createElement,
    createRangeControl,
    createTextControl,
    createSelectControl,
    createSection
  } = UI

  function createGroup(titleText, descriptionText = '') {
    const group = createElement('div', 'furina-cosmetic-group')

    const title = createElement('div', 'furina-cosmetic-group-title', titleText)

    group.appendChild(title)

    if (descriptionText) {
      group.appendChild(
        createElement(
          'div',
          'furina-cosmetic-group-description',
          descriptionText
        )
      )
    }

    const body = createElement('div', 'furina-cosmetic-group-body')

    group.appendChild(body)
    group.furinaBody = body

    return group
  }

  function createThemeToggle(titleText, descriptionText, key) {
    const row = createElement(
      'label',
      'furina-toggle-row furina-cosmetic-toggle'
    )

    const text = createElement('div')
    text.append(
      createElement('div', 'furina-toggle-title', titleText),
      createElement('div', 'furina-toggle-description', descriptionText)
    )

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'furina-checkbox'
    checkbox.checked = Boolean(Atelier.ThemeManager.settings[key])

    checkbox.addEventListener('change', async () => {
      await Atelier.ThemeManager.update(key, checkbox.checked)
      Atelier.PanelShell?.refreshNavigation?.()
    })

    row.append(text, checkbox)

    return {
      wrapper: row,
      input: checkbox
    }
  }

  function createActionButton(label, className = 'furina-secondary-button') {
    const button = createElement('button', className, label)

    button.type = 'button'
    return button
  }

  function createGradePresetControl() {
    const wrapper = createElement('div', 'furina-cosmetic-preset-row')

    const field = createElement(
      'label',
      'furina-select-control furina-cosmetic-preset-select'
    )

    field.appendChild(
      createElement('span', 'furina-control-label', 'Scene / filter preset')
    )

    const select = document.createElement('select')
    select.className = 'furina-select'

    const presets = {
      neutral: {
        label: 'Neutral',
        values: {
          backgroundBrightness: 1,
          backgroundContrast: 1,
          backgroundSaturation: 1,
          backgroundSepia: 0,
          backgroundHue: 0,
          chatImageVignette: 0,
          chatImageOverlayColor: '#000000',
          chatImageOverlayOpacity: 0
        }
      },
      dream: {
        label: 'Dream',
        values: {
          backgroundBrightness: 1.08,
          backgroundContrast: 0.92,
          backgroundSaturation: 1.15,
          backgroundSepia: 0.08,
          backgroundHue: 8,
          chatImageVignette: 0.18,
          chatImageOverlayColor: '#7566aa',
          chatImageOverlayOpacity: 0.08
        }
      },
      horror: {
        label: 'Horror',
        values: {
          backgroundBrightness: 0.78,
          backgroundContrast: 1.22,
          backgroundSaturation: 0.72,
          backgroundSepia: 0.08,
          backgroundHue: -8,
          chatImageVignette: 0.62,
          chatImageOverlayColor: '#260609',
          chatImageOverlayOpacity: 0.2
        }
      },
      moonlight: {
        label: 'Moonlight',
        values: {
          backgroundBrightness: 0.82,
          backgroundContrast: 1.08,
          backgroundSaturation: 0.75,
          backgroundSepia: 0,
          backgroundHue: -18,
          chatImageVignette: 0.34,
          chatImageOverlayColor: '#163d72',
          chatImageOverlayOpacity: 0.16
        }
      },
      warm: {
        label: 'Warm Evening',
        values: {
          backgroundBrightness: 0.98,
          backgroundContrast: 1.04,
          backgroundSaturation: 1.18,
          backgroundSepia: 0.18,
          backgroundHue: 8,
          chatImageVignette: 0.2,
          chatImageOverlayColor: '#7a3210',
          chatImageOverlayOpacity: 0.1
        }
      },
      underwater: {
        label: 'Underwater',
        values: {
          backgroundBrightness: 0.9,
          backgroundContrast: 1.05,
          backgroundSaturation: 1.05,
          backgroundSepia: 0,
          backgroundHue: -28,
          chatImageVignette: 0.28,
          chatImageOverlayColor: '#063b4b',
          chatImageOverlayOpacity: 0.16
        }
      },
      cyber: {
        label: 'Cyber',
        values: {
          backgroundBrightness: 1,
          backgroundContrast: 1.22,
          backgroundSaturation: 1.45,
          backgroundSepia: 0,
          backgroundHue: 18,
          chatImageVignette: 0.38,
          chatImageOverlayColor: '#32005a',
          chatImageOverlayOpacity: 0.12
        }
      },
      film: {
        label: 'Old Film',
        values: {
          backgroundBrightness: 0.9,
          backgroundContrast: 1.12,
          backgroundSaturation: 0.55,
          backgroundSepia: 0.42,
          backgroundHue: 0,
          chatImageVignette: 0.5,
          chatImageOverlayColor: '#4a351c',
          chatImageOverlayOpacity: 0.12
        }
      }
    }

    for (const [id, preset] of Object.entries(presets)) {
      const option = document.createElement('option')
      option.value = id
      option.textContent = preset.label
      select.appendChild(option)
    }

    field.appendChild(select)

    const apply = createActionButton('Apply')

    apply.addEventListener('click', async () => {
      const preset = presets[select.value]

      if (!preset) {
        return
      }

      await Atelier.ThemeManager.updateMany(preset.values)

      Atelier.PanelShell?.rebuild?.()
    })

    wrapper.append(field, apply)
    return wrapper
  }

  function createInterfaceSoundsGroup() {
    const group = createGroup(
      'Interface Sounds',
      'Optional Furina UI feedback. Off by default. These sounds are separate from Scene → RP Sounds, which reacts to roleplay events.'
    )
    const manager = Atelier.SfxManager

    const toggle = createElement(
      'label',
      'furina-toggle-row furina-cosmetic-toggle'
    )
    const toggleText = createElement('div')
    toggleText.append(
      createElement('div', 'furina-toggle-title', 'Enable interface sounds'),
      createElement(
        'div',
        'furina-toggle-description',
        'Play subtle sounds for Furina panel navigation and interactive RP actions.'
      )
    )
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'furina-checkbox'
    toggle.append(toggleText, checkbox)

    const volume = createElement('div', 'furina-control')
    const volumeHeader = createElement('div', 'furina-control-header')
    const volumeLabel = createElement(
      'span',
      'furina-control-label',
      'SFX volume'
    )
    const volumeValue = createElement('span', 'furina-control-value')
    const slider = document.createElement('input')
    slider.type = 'range'
    slider.min = '0'
    slider.max = '1'
    slider.step = '0.05'
    volumeHeader.append(volumeLabel, volumeValue)
    volume.append(volumeHeader, slider)

    const setControl = createElement('div', 'furina-control')
    const setHeader = createElement('div', 'furina-control-header')
    setHeader.append(createElement('span', 'furina-control-label', 'Sound set'))
    const select = document.createElement('select')
    select.className = 'furina-select'
    for (const [label, value] of [
      ['Soft', 'soft'],
      ['Digital', 'digital'],
      ['Mechanical', 'mechanical']
    ]) {
      const option = document.createElement('option')
      option.textContent = label
      option.value = value
      select.append(option)
    }
    setControl.append(setHeader, select)

    const test = document.createElement('button')
    test.type = 'button'
    test.className = 'furina-secondary-button'
    test.textContent = 'Test sound'
    const status = createElement('div', 'furina-portable-status')
    status.setAttribute('role', 'status')

    const sync = () => {
      const s = manager?.settings || {enabled: false, volume: 0.32, set: 'soft'}
      checkbox.checked = s.enabled
      slider.value = String(s.volume)
      volumeValue.textContent = `${Math.round(s.volume * 100)}%`
      select.value = s.set
    }
    const save = async patch => {
      const ok = await manager?.update?.(patch)
      status.textContent = ok
        ? 'SFX preference saved.'
        : 'Could not save SFX preference.'
      sync()
    }
    checkbox.addEventListener('change', async () => {
      const enabling = checkbox.checked
      await save({enabled: enabling})
      if (enabling) manager?.test?.()
    })
    slider.addEventListener('input', () => {
      volumeValue.textContent = `${Math.round(Number(slider.value) * 100)}%`
    })
    slider.addEventListener('change', () =>
      save({volume: Number(slider.value)})
    )
    select.addEventListener('change', async () => {
      await save({set: select.value})
      manager?.test?.()
    })
    test.addEventListener('click', () => manager?.test?.())
    window.addEventListener('furina-sfx-settings-changed', sync, {
      signal: group.furinaAbort?.signal
    })
    manager?.ready?.then(sync)
    sync()

    group.furinaBody.append(toggle, volume, setControl, test, status)
    return group
  }

  // LOOK → EFFECTS

  function createCosmeticEffectsSection() {
    const section = createSection('Effects')

    const background = createGroup(
      'Wallpaper Motion & Color',
      'Animate gradients or tune image/video wallpapers without editing the source file.'
    )

    const animatedGradient = createThemeToggle(
      'Animate gradients',
      'Slowly move gradient backgrounds for a lightweight live-wallpaper effect.',
      'animatedGradient'
    )

    const gradientSpeed = createRangeControl({
      label: 'Gradient cycle',
      key: 'gradientAnimationSpeed',
      min: 8,
      max: 90,
      step: 1,
      format: value => `${value}s`
    })

    const parallax = createRangeControl({
      label: 'Wallpaper parallax',
      key: 'parallaxStrength',
      min: 0,
      max: 18,
      step: 1,
      format: value => (value === 0 ? 'Off' : `${value}px`)
    })

    const brightness = createRangeControl({
      label: 'Brightness',
      key: 'backgroundBrightness',
      min: 0.4,
      max: 1.6,
      step: 0.05,
      format: value => `${Math.round(value * 100)}%`
    })

    const contrast = createRangeControl({
      label: 'Contrast',
      key: 'backgroundContrast',
      min: 0.5,
      max: 1.8,
      step: 0.05,
      format: value => `${Math.round(value * 100)}%`
    })

    const saturation = createRangeControl({
      label: 'Saturation',
      key: 'backgroundSaturation',
      min: 0,
      max: 2,
      step: 0.05,
      format: value => `${Math.round(value * 100)}%`
    })

    const sepia = createRangeControl({
      label: 'Sepia',
      key: 'backgroundSepia',
      min: 0,
      max: 1,
      step: 0.05,
      format: value => `${Math.round(value * 100)}%`
    })

    const hue = createRangeControl({
      label: 'Hue shift',
      key: 'backgroundHue',
      min: -180,
      max: 180,
      step: 1,
      format: value => `${value}°`
    })

    background.furinaBody.append(
      createGradePresetControl(),
      animatedGradient.wrapper,
      gradientSpeed.wrapper,
      parallax.wrapper,
      brightness.wrapper,
      contrast.wrapper,
      saturation.wrapper,
      sepia.wrapper,
      hue.wrapper
    )

    const ambient = createGroup(
      'Ambient Edge Glow',
      'Give the chat viewport a soft accent-colored edge light.'
    )

    const edgeGlow = createRangeControl({
      label: 'Glow strength',
      key: 'edgeGlowStrength',
      min: 0,
      max: 1,
      step: 0.05,
      format: value => (value === 0 ? 'Off' : `${Math.round(value * 100)}%`)
    })

    const edgePulse = createThemeToggle(
      'Slow pulse',
      'Let the edge glow breathe gently instead of staying static.',
      'edgeGlowPulse'
    )

    ambient.furinaBody.append(edgeGlow.wrapper, edgePulse.wrapper)

    const messages = createGroup(
      'Messages',
      'Add subtle movement, glass, texture, and speaker accents to chat bubbles.'
    )

    const assistantSkin = createSelectControl({
      label: 'Assistant message skin',
      key: 'assistantMessageSkin',
      options: [
        {label: 'Standard', value: 'standard'},
        {label: 'Minimal', value: 'minimal'},
        {label: 'Glass', value: 'glass'},
        {label: 'Terminal', value: 'terminal'},
        {label: 'Parchment', value: 'parchment'},
        {label: 'Manga', value: 'manga'}
      ]
    })

    const userSkin = createSelectControl({
      label: 'User message skin',
      key: 'userMessageSkin',
      options: [
        {label: 'Standard', value: 'standard'},
        {label: 'Minimal', value: 'minimal'},
        {label: 'Glass', value: 'glass'},
        {label: 'Terminal', value: 'terminal'},
        {label: 'Parchment', value: 'parchment'},
        {label: 'Manga', value: 'manga'}
      ]
    })

    const composerSkin = createSelectControl({
      label: 'Composer skin',
      key: 'composerSkin',
      options: [
        {label: 'Standard', value: 'standard'},
        {label: 'Minimal', value: 'minimal'},
        {label: 'Glass', value: 'glass'},
        {label: 'Terminal', value: 'terminal'}
      ]
    })

    const dialoguePresentation = createThemeToggle(
      'Dialogue presentation',
      'Give Markdown dialogue quotes and italic narration a clearer visual distinction.',
      'dialoguePresentation'
    )

    const speakerNameplates = createThemeToggle(
      'Speaker nameplates',
      'Show a small speaker label above ordinary chat messages. Optional and off by default.',
      'speakerNameplates'
    )

    const typingIndicator = createSelectControl({
      label: 'Typing indicator style',
      key: 'typingIndicatorStyle',
      options: [
        {label: 'Standard', value: 'standard'},
        {label: 'Dots', value: 'dots'},
        {label: 'Pulse', value: 'pulse'},
        {label: 'Terminal', value: 'terminal'}
      ]
    })

    const entrance = createSelectControl({
      label: 'New-message entrance',
      key: 'messageEntranceAnimation',
      options: [
        {label: 'None', value: 'none'},
        {label: 'Soft Fade', value: 'soft'},
        {label: 'Float Up', value: 'float'},
        {label: 'Gentle Scale', value: 'scale'},
        {label: 'Dreamy', value: 'dream'},
        {label: 'Glitch', value: 'glitch'}
      ]
    })

    const glass = createThemeToggle(
      'Glass bubbles',
      'Use translucent frosted message bubbles over the current background.',
      'glassBubbles'
    )

    const glassBlur = createRangeControl({
      label: 'Glass blur',
      key: 'glassBlur',
      min: 0,
      max: 30,
      step: 1,
      format: value => `${value}px`
    })

    const glassHighlight = createRangeControl({
      label: 'Glass highlight',
      key: 'glassHighlight',
      min: 0,
      max: 0.6,
      step: 0.05,
      format: value => `${Math.round(value * 100)}%`
    })

    const texture = createSelectControl({
      label: 'Bubble texture',
      key: 'bubbleTexture',
      options: [
        {label: 'None', value: 'none'},
        {label: 'Fine Grain', value: 'grain'},
        {label: 'Scanlines', value: 'scanlines'},
        {label: 'Soft Paper', value: 'paper'},
        {label: 'Holographic', value: 'holographic'}
      ]
    })

    const accent = createSelectControl({
      label: 'Speaker accent',
      key: 'speakerAccent',
      options: [
        {label: 'None', value: 'none'},
        {label: 'Fine Line', value: 'line'},
        {label: 'Accent Bar', value: 'bar'},
        {label: 'Glow Edge', value: 'glow'}
      ]
    })

    messages.furinaBody.append(
      assistantSkin.wrapper,
      userSkin.wrapper,
      composerSkin.wrapper,
      dialoguePresentation.wrapper,
      speakerNameplates.wrapper,
      typingIndicator.wrapper,
      entrance.wrapper,
      glass.wrapper,
      glassBlur.wrapper,
      glassHighlight.wrapper,
      texture.wrapper,
      accent.wrapper
    )

    const avatars = createGroup(
      'Avatars',
      'Frame character portraits and give them an optional hover response.'
    )

    const frame = createSelectControl({
      label: 'Avatar frame',
      key: 'avatarFrame',
      options: [
        {label: 'None', value: 'none'},
        {label: 'Accent Ring', value: 'ring'},
        {label: 'Double Ring', value: 'double'},
        {label: 'Arcane Glow', value: 'arcane'},
        {label: 'Cyber Cut', value: 'cyber'},
        {label: 'Floral', value: 'floral'}
      ]
    })

    const hover = createSelectControl({
      label: 'Avatar hover',
      key: 'avatarHover',
      options: [
        {label: 'None', value: 'none'},
        {label: 'Glow', value: 'glow'},
        {label: 'Lift', value: 'lift'},
        {label: 'Tilt', value: 'tilt'},
        {label: 'Pulse', value: 'pulse'}
      ]
    })

    avatars.furinaBody.append(frame.wrapper, hover.wrapper)

    const panel = createGroup(
      'Furina Workspace',
      'Let the Atelier panel participate in the current theme instead of always looking identical.'
    )

    const glassPanel = createThemeToggle(
      'Theme glass panel',
      'Use a more translucent, accent-tinted Furina workspace.',
      'panelGlass'
    )

    const panelOpacity = createRangeControl({
      label: 'Panel opacity',
      key: 'panelGlassOpacity',
      min: 0.45,
      max: 1,
      step: 0.05,
      format: value => `${Math.round(value * 100)}%`
    })

    const panelBlur = createRangeControl({
      label: 'Panel blur',
      key: 'panelGlassBlur',
      min: 0,
      max: 36,
      step: 1,
      format: value => `${value}px`
    })

    const cursor = createSelectControl({
      label: 'Panel cursor',
      key: 'panelCursor',
      options: [
        {label: 'Default', value: 'default'},
        {label: 'Tiny Star', value: 'star'},
        {label: 'Ring', value: 'ring'},
        {label: 'Diamond', value: 'diamond'}
      ]
    })

    const sparkle = createThemeToggle(
      'Accent sparkle',
      'Add a tiny animated theme-colored sparkle beside the Furina branding.',
      'accentSparkle'
    )

    panel.furinaBody.append(
      glassPanel.wrapper,
      panelOpacity.wrapper,
      panelBlur.wrapper,
      cursor.wrapper,
      sparkle.wrapper
    )

    const interfaceSounds = createInterfaceSoundsGroup()

    section.furinaContent.append(
      background,
      ambient,
      messages,
      interfaceSounds,
      avatars,
      panel
    )

    return section
  }

  function createHudFrameGroup() {
    const group = createGroup(
      'Chat Frame / HUD Skins',
      'Turn the standard chat into a themed interface with code-drawn rails, corner modules, composer brackets, and message-side ornaments. Existing edge glow and corner ornaments remain independent.'
    )

    const skinGrid = createElement('div', 'furina-hud-skin-grid')

    const skins = [
      {
        id: 'none',
        name: 'None',
        meta: 'Clean chat',
        glyph: '○'
      },
      {
        id: 'arcane',
        name: 'Arcane',
        meta: 'Sigils · circles · glow',
        glyph: '◇'
      },
      {
        id: 'cyber',
        name: 'Cyber',
        meta: 'Angular · segmented · HUD',
        glyph: '⌁'
      },
      {
        id: 'gothic',
        name: 'Gothic',
        meta: 'Pointed · ornate · dramatic',
        glyph: '✢'
      },
      {
        id: 'terminal',
        name: 'Terminal',
        meta: 'Technical · dashed · mono',
        glyph: '>_'
      },
      {
        id: 'luxe',
        name: 'Minimal Luxe',
        meta: 'Fine lines · restrained',
        glyph: '◆'
      }
    ]

    const buttons = []

    const syncButtons = style => {
      for (const button of buttons) {
        const active = button.dataset.hudSkin === style
        button.classList.toggle('furina-hud-skin-card-active', active)
        button.setAttribute('aria-pressed', String(active))
      }
    }

    for (const skin of skins) {
      const button = createElement('button', 'furina-hud-skin-card')
      button.type = 'button'
      button.dataset.hudSkin = skin.id
      button.setAttribute('aria-label', `${skin.name} HUD skin`)

      const preview = createElement(
        'span',
        `furina-hud-skin-preview furina-hud-skin-preview-${skin.id}`
      )
      preview.setAttribute('aria-hidden', 'true')

      preview.append(
        createElement('span', 'furina-hud-skin-preview-corner'),
        createElement('span', 'furina-hud-skin-preview-line'),
        createElement('span', 'furina-hud-skin-preview-glyph', skin.glyph)
      )

      const copy = createElement('span', 'furina-hud-skin-card-copy')
      copy.append(
        createElement('strong', 'furina-hud-skin-card-name', skin.name),
        createElement('small', 'furina-hud-skin-card-meta', skin.meta)
      )

      button.append(preview, copy)

      button.addEventListener('click', async () => {
        const changed = await Atelier.ThemeManager.update(
          'hudFrameStyle',
          skin.id
        )

        if (!changed) {
          return
        }

        syncButtons(skin.id)
        Atelier.PanelShell?.refreshNavigation?.()

        if (skin.id !== 'none') {
          window.setTimeout(
            () => Atelier.CosmeticsManager?.replayHudFrame?.(),
            40
          )
        }
      })

      buttons.push(button)
      skinGrid.appendChild(button)
    }

    syncButtons(Atelier.ThemeManager.settings.hudFrameStyle || 'none')

    const opacity = createRangeControl({
      label: 'Frame presence',
      key: 'hudFrameOpacity',
      min: 0.2,
      max: 1,
      step: 0.05,
      format: value => `${Math.round(value * 100)}%`
    })

    const glow = createRangeControl({
      label: 'HUD glow',
      key: 'hudFrameGlow',
      min: 0,
      max: 1,
      step: 0.05,
      format: value => (value === 0 ? 'Off' : `${Math.round(value * 100)}%`)
    })

    const inset = createRangeControl({
      label: 'Frame inset',
      key: 'hudFrameInset',
      min: 0,
      max: 36,
      step: 1,
      format: value => `${value}px`
    })

    const rails = createThemeToggle(
      'Frame rails',
      'Draw the long top, side, and bottom rails between the corner modules.',
      'hudFrameRails'
    )

    const composer = createThemeToggle(
      'Composer brackets',
      "Attach HUD corner brackets and glow directly to Clank's normal composer.",
      'hudFrameComposer'
    )

    const markers = createThemeToggle(
      'Message ornaments',
      'Attach a tiny style-aware marker beside assistant and user message bubbles.',
      'hudFrameMessageMarkers'
    )

    const glyphs = createThemeToggle(
      'HUD glyphs & label',
      'Show the small center label, rail nodes, and style glyphs.',
      'hudFrameGlyphs'
    )

    const animation = createThemeToggle(
      'Animate HUD reveal',
      'Assemble the frame when a skin activates. Reduced-motion preferences always win.',
      'hudFrameAnimation'
    )

    const replay = createActionButton(
      'Replay HUD Reveal',
      'furina-secondary-button furina-hud-replay-button'
    )

    replay.addEventListener('click', () => {
      Atelier.CosmeticsManager?.replayHudFrame?.()
    })

    const hint = createElement(
      'div',
      'furina-hud-frame-hint',
      'Tip: HUD skins use the current Furina accent automatically, so changing a theme can completely change the same frame.'
    )

    group.furinaBody.append(
      skinGrid,
      opacity.wrapper,
      glow.wrapper,
      inset.wrapper,
      rails.wrapper,
      composer.wrapper,
      markers.wrapper,
      glyphs.wrapper,
      animation.wrapper,
      replay,
      hint
    )

    return group
  }

  // SCENE → DECOR

  function createCosmeticDecorSection() {
    const section = createSection('Decor')

    const hudFrame = createHudFrameGroup()

    const particles = createGroup(
      'Floating Particles',
      'A lightweight decorative layer behind the conversation.'
    )

    const particlesEnabled = createThemeToggle(
      'Enable particles',
      'Float a small number of animated decorative particles through the chat.',
      'particlesEnabled'
    )

    const particleStyle = createSelectControl({
      label: 'Particle style',
      key: 'particleStyle',
      options: [
        {label: 'Sparkles', value: 'sparkles'},
        {label: 'Dust', value: 'dust'},
        {label: 'Petals', value: 'petals'},
        {label: 'Embers', value: 'embers'},
        {label: 'Snow', value: 'snow'},
        {label: 'Hearts', value: 'hearts'},
        {label: 'Stars', value: 'stars'}
      ]
    })

    const density = createRangeControl({
      label: 'Particle density',
      key: 'particleDensity',
      min: 4,
      max: 40,
      step: 1,
      format: value => String(value)
    })

    const speed = createRangeControl({
      label: 'Particle speed',
      key: 'particleSpeed',
      min: 0.35,
      max: 2.5,
      step: 0.05,
      format: value => `${value.toFixed(2)}×`
    })

    particles.furinaBody.append(
      particlesEnabled.wrapper,
      particleStyle.wrapper,
      density.wrapper,
      speed.wrapper
    )

    const separators = createGroup(
      'Message Separators',
      'Place a small decorative marker between conversation turns.'
    )

    const separator = createSelectControl({
      label: 'Separator style',
      key: 'separatorStyle',
      options: [
        {label: 'None', value: 'none'},
        {label: 'Sparkle', value: 'sparkle'},
        {label: 'Diamond', value: 'diamond'},
        {label: 'Dots', value: 'dots'},
        {label: 'Rune', value: 'rune'},
        {label: 'Fine Line', value: 'line'}
      ]
    })

    separators.furinaBody.append(separator.wrapper)

    const ornaments = createGroup(
      'Corner Ornaments',
      'Frame the chat with theme-aware decorations. Custom mode mirrors one transparent image into all four corners.'
    )

    const ornamentsEnabled = createThemeToggle(
      'Enable corner ornaments',
      'Attach decorative, click-through flourishes to the four chat corners.',
      'ornamentsEnabled'
    )

    const ornamentStyle = createSelectControl({
      label: 'Ornament style',
      key: 'ornamentStyle',
      options: [
        {label: 'Celestial', value: 'celestial'},
        {label: 'Gothic', value: 'gothic'},
        {label: 'Arcane', value: 'arcane'},
        {label: 'Floral', value: 'floral'},
        {label: 'Cyber', value: 'cyber'},
        {label: 'Lace', value: 'lace'},
        {label: 'Custom Image', value: 'custom'}
      ]
    })

    const customUrl = createTextControl({
      label: 'Custom ornament image URL',
      key: 'ornamentCustomUrl',
      placeholder: 'https://example.com/corner.png'
    })

    const opacity = createRangeControl({
      label: 'Ornament opacity',
      key: 'ornamentOpacity',
      min: 0.15,
      max: 1,
      step: 0.05,
      format: value => `${Math.round(value * 100)}%`
    })

    const scale = createRangeControl({
      label: 'Ornament scale',
      key: 'ornamentScale',
      min: 0.5,
      max: 2,
      step: 0.05,
      format: value => `${Math.round(value * 100)}%`
    })

    const glow = createRangeControl({
      label: 'Ornament glow',
      key: 'ornamentGlow',
      min: 0,
      max: 1,
      step: 0.05,
      format: value => `${Math.round(value * 100)}%`
    })

    const inset = createRangeControl({
      label: 'Corner inset',
      key: 'ornamentInset',
      min: 0,
      max: 48,
      step: 1,
      format: value => `${value}px`
    })

    // PanelUI's select helper exposes the element as `select` in current
    // builds; tolerate `input` as well to keep this section resilient.
    const ornamentSelect = ornamentStyle.select || ornamentStyle.input

    if (ornamentSelect) {
      ornamentSelect.addEventListener('change', () => {
        customUrl.wrapper.hidden = ornamentSelect.value !== 'custom'
      })

      customUrl.wrapper.hidden = ornamentSelect.value !== 'custom'
    }

    ornaments.furinaBody.append(
      ornamentsEnabled.wrapper,
      ornamentStyle.wrapper,
      customUrl.wrapper,
      opacity.wrapper,
      scale.wrapper,
      glow.wrapper,
      inset.wrapper
    )

    const screenshot = createGroup(
      'Screenshot Mode',
      'Use a quick clean capture, or open the full controls for a countdown and individual composer, sidebar, avatar, action, width, and scene-caption choices. Press Esc to exit.'
    )

    const screenshotButton = createActionButton(
      'Quick Screenshot Mode',
      'furina-primary-button furina-screenshot-mode-button'
    )

    screenshotButton.addEventListener('click', () => {
      Atelier.CosmeticsManager?.setScreenshotMode?.(true)
    })

    const screenshotControlsButton = createActionButton(
      'Open Screenshot Controls',
      'furina-secondary-button furina-screenshot-mode-button'
    )

    screenshotControlsButton.addEventListener('click', () => {
      Atelier.PanelShell?.navigate?.('story', 'present')
    })

    screenshot.furinaBody.append(screenshotButton, screenshotControlsButton)

    section.furinaContent.append(
      hudFrame,
      particles,
      separators,
      ornaments,
      screenshot
    )

    return section
  }

  Sections.createCosmeticEffectsSection = createCosmeticEffectsSection

  Sections.createCosmeticDecorSection = createCosmeticDecorSection
})()
