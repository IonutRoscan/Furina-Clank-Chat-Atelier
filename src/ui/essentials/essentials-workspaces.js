'use strict'


/*
  Developer notes

  Builds the simplified Essentials pages by composing controls from the same feature
  managers used by Full Atelier. Keep Essentials focused on common actions and route
  advanced configuration back to Full Atelier rather than duplicating every control.
*/
/*
    Essentials Workspaces

    These views intentionally expose user goals instead of every internal
    option. Every action writes to Furina's existing managers, so opening Full
    Atelier immediately shows the exact same state.
*/
;(() => {
  const Atelier = window.ClankAtelier
  const {createElement} = Atelier.PanelUI

  const t = value => Atelier.I18n?.t?.(value) || value

  function button(label, className = 'furina-secondary-button') {
    const element = createElement('button', className, t(label))
    element.type = 'button'
    return element
  }

  function card(title, description = '', className = '') {
    const root = createElement(
      'section',
      `furina-essential-card ${className}`.trim()
    )
    const head = createElement('div', 'furina-essential-card-head')
    const copy = createElement('div', 'furina-essential-card-copy')
    copy.append(createElement('h3', 'furina-essential-card-title', t(title)))
    if (description) {
      copy.append(
        createElement('p', 'furina-essential-card-description', t(description))
      )
    }
    head.append(copy)
    root.append(head)
    root.furinaContent = createElement('div', 'furina-essential-card-content')
    root.append(root.furinaContent)
    return root
  }

  function field(labelText, input, help = '') {
    const label = createElement('label', 'furina-essential-field')
    label.append(
      createElement('span', 'furina-control-label', t(labelText)),
      input
    )
    if (help) {
      label.append(createElement('span', 'furina-essential-help', t(help)))
    }
    return label
  }

  function input(value = '', placeholder = '') {
    const element = document.createElement('input')
    element.type = 'text'
    element.className = 'furina-text-input'
    element.value = value || ''
    element.placeholder = t(placeholder)
    return element
  }

  function textarea(value = '', placeholder = '', rows = 3) {
    const element = document.createElement('textarea')
    element.className = 'furina-textarea furina-essential-textarea'
    element.value = value || ''
    element.placeholder = t(placeholder)
    element.rows = rows
    return element
  }

  function select(options, value) {
    const element = document.createElement('select')
    element.className = 'furina-select'
    for (const [id, label] of options) {
      const option = document.createElement('option')
      option.value = id
      option.textContent = t(label)
      element.appendChild(option)
    }
    element.value = value
    return element
  }

  function color(value) {
    const element = document.createElement('input')
    element.type = 'color'
    element.className = 'furina-color-input furina-essential-color'
    element.value = value || '#000000'
    return element
  }

  function range(value, min, max, step, format, onInput) {
    const wrap = createElement('div', 'furina-control furina-essential-range')
    const head = createElement('div', 'furina-control-header')
    const name = createElement('span', 'furina-control-label')
    const amount = createElement(
      'span',
      'furina-control-value',
      format(Number(value))
    )
    const slider = document.createElement('input')
    slider.type = 'range'
    slider.className = 'furina-range'
    slider.min = String(min)
    slider.max = String(max)
    slider.step = String(step)
    slider.value = String(value)
    slider.addEventListener('input', () => {
      amount.textContent = format(Number(slider.value))
      onInput?.(Number(slider.value))
    })
    head.append(name, amount)
    wrap.append(head, slider)
    wrap.furinaLabel = name
    wrap.furinaInput = slider
    return wrap
  }

  function actionRow(...items) {
    const row = createElement('div', 'furina-essential-actions')
    items.filter(Boolean).forEach(item => row.appendChild(item))
    return row
  }

  function statusLine(text = '') {
    return createElement('div', 'furina-essential-status', text)
  }

  function jumpFull(workspace, tool) {
    Atelier.PanelShell?.openFull?.(workspace, tool)
  }

  function refresh() {
    Atelier.PanelShell?.rebuild?.()
  }

  function sectionHeading(kicker, title, body) {
    const intro = createElement('div', 'furina-essential-intro')
    intro.append(
      createElement('div', 'furina-home-kicker', t(kicker)),
      createElement('div', 'furina-essential-heading', t(title)),
      createElement('p', 'furina-essential-intro-copy', t(body))
    )
    return intro
  }

  function simpleToggle(title, description, checked, onChange) {
    const row = createElement(
      'label',
      'furina-toggle-row furina-essential-toggle'
    )
    const copy = createElement('div')
    copy.append(
      createElement('div', 'furina-toggle-title', t(title)),
      createElement('div', 'furina-toggle-description', t(description))
    )
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'furina-checkbox'
    checkbox.checked = Boolean(checked)
    checkbox.addEventListener('change', () => onChange?.(checkbox.checked))
    row.append(copy, checkbox)
    return row
  }

  // Character background helpers

  function getClankImageAssetBase(imageUrl) {
    if (typeof imageUrl !== 'string' || !imageUrl.trim()) return null
    try {
      const url = new URL(imageUrl, window.location.href)
      if (url.hostname !== 'img.clank.world') return null
      const parts = url.pathname.split('/').filter(Boolean)
      if (parts.length < 3) return null
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
    } catch {
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
    if (!avatar) return []
    const candidates = []
    const add = url => {
      const clean = String(url || '').trim()
      if (clean && !candidates.includes(clean)) candidates.push(clean)
    }
    add(avatar.currentSrc)
    add(avatar.src)
    const base = getClankImageAssetBase(avatar.currentSrc || avatar.src)
    if (base) {
      add(`${base}/w=1920,q=100,f=webp`)
      add(`${base}/w=1024,q=100,f=webp`)
    }
    return candidates
  }

  function probeImage(url) {
    return new Promise(resolve => {
      const image = new Image()
      image.onload = () =>
        resolve({url, ok: true, area: image.naturalWidth * image.naturalHeight})
      image.onerror = () => resolve({url, ok: false, area: 0})
      image.src = url
    })
  }

  async function applyCurrentCharacterBackground(status) {
    const manager = Atelier.ThemeManager
    const candidates = getCurrentCharacterImageCandidates()
    if (!candidates.length) {
      status.textContent =
        'No character image has appeared in this conversation yet.'
      return false
    }

    status.textContent = 'Finding the best character image…'
    const tested = await Promise.all(candidates.map(probeImage))
    const best = tested
      .filter(item => item.ok)
      .sort((a, b) => b.area - a.area)[0]
    if (!best) {
      status.textContent =
        'Furina found the avatar, but could not load a usable background image.'
      return false
    }

    if (manager.scope !== 'conversation') {
      await manager.enableConversationTheme()
    }
    await manager.updateMany({
      chatBackgroundMode: 'image',
      chatImageUrl: best.url
    })
    status.textContent = 'Current character image applied to this conversation.'
    return true
  }

  // HOME

  function createHome() {
    const root = createElement('div', 'furina-essentials-home')
    root.append(
      sectionHeading(
        'ESSENTIALS MODE',
        'Have fun first. Tune everything later.',
        "Essentials keeps Furina's most useful controls close. Nothing here is a separate system — Full Atelier always shows the same settings underneath."
      )
    )

    const quick = createElement('div', 'furina-essential-home-grid')
    const items = [
      [
        '◈',
        'Make it yours',
        'Themes, backgrounds, live wallpapers.',
        'customize'
      ],
      [
        '◆',
        'Help the story',
        'Remember facts, guide replies, set the scene.',
        'roleplay'
      ],
      [
        '✦',
        'Set the mood',
        'Atmosphere, music, stickers, reading.',
        'immersion'
      ],
      ['＋', 'More Furina', 'Visual Novel, Phantom, styles, sharing.', 'more']
    ]

    for (const [icon, title, description, workspace] of items) {
      const item = createElement('button', 'furina-essential-home-card')
      item.type = 'button'
      item.append(
        createElement('span', 'furina-essential-home-icon', icon),
        createElement('span', 'furina-essential-home-title', title),
        createElement('span', 'furina-essential-home-description', description),
        createElement('span', 'furina-essential-home-arrow', '→')
      )
      item.addEventListener('click', () =>
        Atelier.PanelShell?.navigate?.(workspace)
      )
      quick.appendChild(item)
    }
    root.append(quick)

    const status = card(
      'Current chat',
      "A tiny dashboard for what's active right now."
    )
    const rows = createElement('div', 'furina-essential-status-list')
    const theme = Atelier.ThemeManager
    const atmosphere = Atelier.AtmosphereManager
    const music = Atelier.AmbienceManager
    const memories = Atelier.ContinuityManager?.settings?.entries || []
    const director = Atelier.DirectorManager
    const scene = Atelier.SceneStateManager

    const preset = Atelier.THEME_PRESETS?.[theme?.settings?.preset]
    const themeName =
      preset?.name ||
      (theme?.settings?.preset === 'custom' ? 'Custom theme' : 'Current theme')
    const activeMemories = memories.filter(
      item => item.enabled && !item.archived
    ).length
    const sceneName =
      scene?.settings?.title || scene?.settings?.location || 'No scene named'

    const summaryRows = [
      [
        'Theme',
        themeName,
        theme?.scope === 'conversation' ? 'This chat' : 'All chats'
      ],
      [
        'Mood',
        atmosphere?.settings?.enabled
          ? (atmosphere.PRESETS &&
              Object.values(atmosphere.PRESETS).find(
                p => p.effect === atmosphere.settings.effect
              )?.name) ||
            atmosphere.settings.effect
          : 'Quiet',
        atmosphere?.settings?.enabled ? 'Active' : 'Off'
      ],
      [
        'Music',
        music?.settings?.url ? music.settings.name || 'Track loaded' : 'None',
        music?.isPlaying?.()
          ? 'Playing'
          : music?.settings?.url
            ? 'Ready'
            : 'Off'
      ],
      [
        'Memory',
        `${activeMemories} saved`,
        Atelier.ContinuityManager?.settings?.enabled === false
          ? 'Disabled'
          : 'Available'
      ],
      [
        'Director',
        director?.settings?.enabled ? 'Enabled' : 'Off',
        Atelier.Director2Manager?.settings?.nextReply ? 'Next reply ready' : ''
      ],
      ['Scene', sceneName, scene?.hasContent?.() ? 'Tracked' : 'Not set']
    ]

    for (const [label, value, meta] of summaryRows) {
      const row = createElement('div', 'furina-essential-status-row')
      row.append(
        createElement('span', 'furina-essential-status-label', label),
        createElement('span', 'furina-essential-status-value', value),
        createElement('span', 'furina-essential-status-meta', meta)
      )
      rows.appendChild(row)
    }
    status.furinaContent.append(rows)
    root.append(status)

    const guide = card(
      'Not sure what something does?',
      "The 1.3 Guidebook explains Director, Memory, and Story tools without requiring you to learn Furina's internals."
    )
    const openGuide = button('Open Guidebook', 'furina-primary-button')
    openGuide.addEventListener('click', () =>
      Atelier.GuideManager?.open?.('start', openGuide)
    )
    const full = button('Open Full Atelier')
    full.addEventListener('click', () => Atelier.PanelShell?.openFull?.('home'))
    guide.furinaContent.append(actionRow(openGuide, full))
    root.append(guide)

    return root
  }

  // CUSTOMIZE

  function createCustomize() {
    const root = createElement('div', 'furina-essentials-customize')
    const manager = Atelier.ThemeManager

    root.append(
      sectionHeading(
        'CUSTOMIZE',
        'Give this chat a look in a few clicks.',
        'Use the quick controls here, then open Full Atelier only when you want every last slider.'
      )
    )

    const scopeCard = card(
      'Where should changes apply?',
      'Keep one look everywhere, or make this conversation its own little universe.'
    )
    const scopeRow = createElement(
      'div',
      'furina-essential-choice-grid furina-essential-choice-grid-2'
    )
    const all = button('All chats', 'furina-essential-choice')
    const thisChat = button('This chat only', 'furina-essential-choice')
    all.classList.toggle(
      'furina-essential-choice-active',
      manager.scope !== 'conversation'
    )
    thisChat.classList.toggle(
      'furina-essential-choice-active',
      manager.scope === 'conversation'
    )
    all.addEventListener('click', async () => {
      await manager.useGlobalTheme()
      refresh()
    })
    thisChat.addEventListener('click', async () => {
      await manager.enableConversationTheme()
      refresh()
    })
    scopeRow.append(all, thisChat)
    scopeCard.furinaContent.append(scopeRow)
    root.append(scopeCard)

    const themes = card(
      'Pick a theme',
      'Built-in themes are the fastest way to change the whole chat.'
    )
    const themeGrid = createElement('div', 'furina-essential-theme-grid')
    for (const [id, preset] of Object.entries(Atelier.THEME_PRESETS || {})) {
      const pick = createElement('button', 'furina-essential-theme')
      pick.type = 'button'
      pick.classList.toggle(
        'furina-essential-theme-active',
        manager.settings.preset === id
      )
      const swatch = createElement('span', 'furina-essential-theme-swatch')
      swatch.style.background = `linear-gradient(135deg, ${preset.accent || '#9b7cff'}, ${preset.chatBackground || '#151515'})`
      pick.append(
        swatch,
        createElement('span', 'furina-essential-theme-name', preset.name || id)
      )
      pick.addEventListener('click', async () => {
        await manager.applyPreset(id)
        refresh()
      })
      themeGrid.appendChild(pick)
    }
    themes.furinaContent.append(themeGrid)
    const moreThemes = button('Custom presets & detailed theme controls →')
    moreThemes.addEventListener('click', () => jumpFull('look', 'themes'))
    themes.furinaContent.append(moreThemes)
    root.append(themes)

    const background = card(
      'Background',
      "Solid, gradient, image, live wallpaper, or the current character's artwork."
    )
    const mode = manager.settings.chatBackgroundMode
    const modeGrid = createElement('div', 'furina-essential-background-grid')
    const modes = [
      ['solid', '■', 'Solid'],
      ['gradient', '◒', 'Gradient'],
      ['image', '▧', 'Image'],
      ['video', '▶', 'Live'],
      ['character', '★', 'Character']
    ]
    const dynamic = createElement('div', 'furina-essential-background-controls')
    const status = statusLine()

    const renderDynamic = () => {
      dynamic.replaceChildren()
      const current = manager.settings.chatBackgroundMode

      if (current === 'solid') {
        const bg = color(manager.settings.chatBackground)
        bg.addEventListener('input', () =>
          manager.update('chatBackground', bg.value)
        )
        dynamic.append(field('Background color', bg))
      }

      if (current === 'gradient') {
        const colors = createElement('div', 'furina-essential-inline-fields')
        const first = color(manager.settings.chatBackground)
        const second = color(manager.settings.chatGradientColor)
        first.addEventListener('input', () =>
          manager.update('chatBackground', first.value)
        )
        second.addEventListener('input', () =>
          manager.update('chatGradientColor', second.value)
        )
        colors.append(field('Color 1', first), field('Color 2', second))
        const angle = range(
          manager.settings.chatGradientAngle,
          0,
          360,
          5,
          v => `${v}°`,
          v => manager.update('chatGradientAngle', v)
        )
        angle.furinaLabel.textContent = 'Angle'
        dynamic.append(colors, angle)
      }

      if (current === 'image') {
        const url = input(
          manager.settings.chatImageUrl,
          'https://example.com/background.jpg'
        )
        const save = button('Apply image', 'furina-primary-button')
        save.addEventListener('click', async () => {
          if (!url.value.trim()) {
            status.textContent = 'Paste an image URL first.'
            return
          }
          await manager.updateMany({
            chatBackgroundMode: 'image',
            chatImageUrl: url.value.trim()
          })
          status.textContent = 'Image background applied.'
        })
        dynamic.append(field('Image URL', url), save)
      }

      if (current === 'video') {
        const url = input(
          manager.settings.chatVideoUrl,
          'https://example.com/live-wallpaper.mp4'
        )
        const save = button('Apply live wallpaper', 'furina-primary-button')
        save.addEventListener('click', async () => {
          if (!url.value.trim()) {
            status.textContent = 'Paste a direct video URL first.'
            return
          }
          await manager.updateMany({
            chatBackgroundMode: 'video',
            chatVideoUrl: url.value.trim()
          })
          status.textContent = 'Live wallpaper applied.'
        })
        dynamic.append(
          field(
            'Video URL',
            url,
            'Direct browser-playable video URLs work best.'
          ),
          save
        )
      }

      if (current === 'image' || current === 'video') {
        const fit = select(
          [
            ['cover', 'Cover'],
            ['contain', 'Contain'],
            ['auto', 'Original / Auto']
          ],
          manager.settings.chatImageFit
        )
        fit.addEventListener('change', () =>
          manager.update('chatImageFit', fit.value)
        )
        const darkness = range(
          manager.settings.chatImageDarkness,
          0,
          0.9,
          0.05,
          v => `${Math.round(v * 100)}%`,
          v => manager.update('chatImageDarkness', v)
        )
        darkness.furinaLabel.textContent = 'Darkness'
        const blur = range(
          manager.settings.chatImageBlur,
          0,
          20,
          1,
          v => `${v}px`,
          v => manager.update('chatImageBlur', v)
        )
        blur.furinaLabel.textContent = 'Blur'
        const parallax = range(
          manager.settings.parallaxStrength,
          0,
          30,
          1,
          v => `${v}px`,
          v => manager.update('parallaxStrength', v)
        )
        parallax.furinaLabel.textContent = 'Parallax'
        dynamic.append(field('Fit', fit), darkness, blur, parallax)
      }
    }

    for (const [id, icon, label] of modes) {
      const pick = createElement('button', 'furina-essential-background-choice')
      pick.type = 'button'
      const active = id !== 'character' && mode === id
      pick.classList.toggle('furina-essential-background-choice-active', active)
      pick.append(
        createElement('span', 'furina-essential-background-icon', icon),
        createElement('span', 'furina-essential-background-label', label)
      )
      pick.addEventListener('click', async () => {
        status.textContent = ''
        if (id === 'character') {
          pick.disabled = true
          const ok = await applyCurrentCharacterBackground(status)
          pick.disabled = false
          if (ok) {
            modeGrid
              .querySelectorAll('.furina-essential-background-choice')
              .forEach(item =>
                item.classList.remove(
                  'furina-essential-background-choice-active'
                )
              )
            pick.classList.add('furina-essential-background-choice-active')
            renderDynamic()
          }
          return
        }
        await manager.update('chatBackgroundMode', id)
        refresh()
      })
      modeGrid.appendChild(pick)
    }

    background.furinaContent.append(modeGrid, dynamic, status)
    renderDynamic()
    const advancedBackground = button('All background & layout controls →')
    advancedBackground.addEventListener('click', () => jumpFull('look', 'chat'))
    background.furinaContent.append(advancedBackground)
    root.append(background)

    const comfort = card(
      'Quick comfort',
      'A few everyday layout controls without opening the full typography lab.'
    )
    const width = range(
      manager.settings.messageWidth,
      520,
      1000,
      10,
      v => `${v}px`,
      v => manager.update('messageWidth', v)
    )
    width.furinaLabel.textContent = 'Chat width'
    const avatar = range(
      manager.settings.avatarSize,
      28,
      84,
      2,
      v => `${v}px`,
      v => manager.update('avatarSize', v)
    )
    avatar.furinaLabel.textContent = 'Avatar size'
    const compact = simpleToggle(
      'Compact mode',
      'Reduce message and control spacing.',
      manager.settings.compact,
      value => manager.update('compact', value)
    )
    const fullLook = button('Message bubbles, typography & effects →')
    fullLook.addEventListener('click', () => jumpFull('look', 'messages'))
    comfort.furinaContent.append(width, avatar, compact, fullLook)
    root.append(comfort)

    return root
  }

  // ROLEPLAY

  function createRoleplay() {
    const root = createElement('div', 'furina-essentials-roleplay')
    root.append(
      sectionHeading(
        'ROLEPLAY',
        'Keep the story on the rails — gently.',
        "These are the everyday versions of Furina's Continuity, Director, and Scene State systems."
      )
    )

    const memoryManager = Atelier.ContinuityManager
    const memory = card(
      'Remember something',
      "Save a fact you don't want the story to casually lose."
    )
    const title = input('', "Optional short label, e.g. Aya's injury")
    const text = textarea(
      '',
      'Aya injured her left arm during the forest scene.',
      3
    )
    const priority = select(
      [
        ['normal', 'Normal'],
        ['high', 'Important'],
        ['critical', 'Critical']
      ],
      'normal'
    )
    const memoryStatus = statusLine()
    const saveMemory = button('Remember', 'furina-primary-button')
    saveMemory.addEventListener('click', async () => {
      if (!text.value.trim()) {
        memoryStatus.textContent =
          'Write something for Furina to remember first.'
        text.focus()
        return
      }
      const saved = await memoryManager?.upsertEntry?.({
        title: title.value.trim(),
        text: text.value.trim(),
        category: 'other',
        priority: priority.value,
        scope: 'always',
        keywords: [],
        enabled: true,
        archived: false
      })
      if (!saved) {
        memoryStatus.textContent =
          'That memory could not be saved in this conversation.'
        return
      }
      title.value = ''
      text.value = ''
      memoryStatus.textContent = 'Saved to the Continuity Vault.'
      Atelier.PanelShell?.refreshNavigation?.()
    })
    const manageMemory = button('Manage memories →')
    manageMemory.addEventListener('click', () =>
      jumpFull('continuity', 'vault')
    )
    memory.furinaContent.append(
      field('Label', title),
      field('What happened?', text),
      field('Importance', priority),
      actionRow(saveMemory, manageMemory),
      memoryStatus
    )
    root.append(memory)

    const director2 = Atelier.Director2Manager
    const guide = card(
      'Guide the next reply',
      'A temporary direction that clears after the next successful send.'
    )
    const direction = textarea(
      director2?.settings?.nextReply || '',
      "Keep the confrontation tense. Don't reveal the culprit yet.",
      3
    )
    const directionStatus = statusLine()
    const saveDirection = button(
      'Save next-reply direction',
      'furina-primary-button'
    )
    saveDirection.addEventListener('click', async () => {
      await director2?.update?.({nextReply: direction.value})
      directionStatus.textContent = direction.value.trim()
        ? 'Next-reply direction is ready.'
        : 'Next-reply direction cleared.'
    })
    const fullDirector = button('Open Director →')
    fullDirector.addEventListener('click', () => jumpFull('director', 'direct'))
    guide.furinaContent.append(
      field('Direction', direction),
      actionRow(saveDirection, fullDirector),
      directionStatus
    )
    root.append(guide)

    const guards = card(
      'Common guard rails',
      'Quick protections for the most common RP annoyances.'
    )
    const guardKeys = [
      'userDialogue',
      'userThoughts',
      'noTimeSkip',
      'limitedKnowledge'
    ]
    for (const key of guardKeys) {
      const config = director2?.GUARDS?.[key]
      if (!config) continue
      guards.furinaContent.append(
        simpleToggle(
          config[0],
          config[1],
          director2.settings.guards?.[key],
          async checked => {
            await director2.update({
              guards: {
                ...director2.settings.guards,
                [key]: checked
              }
            })
          }
        )
      )
    }
    const allControl = button('All guards, cues & knowledge boundaries →')
    allControl.addEventListener('click', () => jumpFull('director', 'control'))
    guards.furinaContent.append(allControl)
    root.append(guards)

    const sceneManager = Atelier.SceneStateManager
    const scene = card(
      'Current scene',
      'Give the AI a compact snapshot of where the story is right now.'
    )
    const sceneTitle = input(sceneManager?.settings?.title, 'Scene title')
    const location = input(sceneManager?.settings?.location, 'Location')
    const present = input(sceneManager?.settings?.present, 'Aya, Mira, Ren')
    const objective = input(
      sceneManager?.settings?.objective,
      'What is everyone trying to do?'
    )
    const mood = input(sceneManager?.settings?.mood, 'Tense, cozy, awkward…')
    const sceneStatus = statusLine()
    const saveScene = button('Save scene', 'furina-primary-button')
    saveScene.addEventListener('click', async () => {
      await sceneManager?.updateMany?.({
        title: sceneTitle.value,
        location: location.value,
        present: present.value,
        objective: objective.value,
        mood: mood.value,
        includeInDirector: true
      })
      sceneStatus.textContent = 'Current Scene State saved.'
    })
    const advancedScene = button('Full Scene State & story tools →')
    advancedScene.addEventListener('click', () => jumpFull('story', 'start'))
    scene.furinaContent.append(
      field('Scene', sceneTitle),
      field('Location', location),
      field('Present characters', present),
      field('Objective', objective),
      field('Mood', mood),
      actionRow(saveScene, advancedScene),
      sceneStatus
    )
    root.append(scene)

    return root
  }

  // IMMERSION

  function createImmersion() {
    const root = createElement('div', 'furina-essentials-immersion')
    root.append(
      sectionHeading(
        'IMMERSION',
        'Set the mood without building a cockpit.',
        'Pick an atmosphere, add music or a sticker, and get back to the roleplay.'
      )
    )

    const atmosphere = Atelier.AtmosphereManager
    const mood = card(
      'Atmosphere',
      'One-click visual ambience for this conversation.'
    )
    const moodGrid = createElement('div', 'furina-essential-atmosphere-grid')
    const icons = {
      rainyNight: '🌧',
      snowfall: '❄',
      emberRoom: '🔥',
      arcaneGlow: '✨',
      dreamFog: '☁',
      subtleMotes: '✦',
      crt: '📺',
      oldFilm: '🎞'
    }
    for (const [id, preset] of Object.entries(atmosphere?.PRESETS || {})) {
      const pick = button(
        `${icons[id] || '✦'} ${preset.name}`,
        'furina-essential-chip'
      )
      pick.addEventListener('click', async () => {
        await atmosphere.applyPreset(id)
        refresh()
      })
      moodGrid.appendChild(pick)
    }
    const off = button(
      'Off',
      'furina-essential-chip furina-essential-chip-muted'
    )
    off.addEventListener('click', async () => {
      await atmosphere.reset()
      refresh()
    })
    moodGrid.appendChild(off)
    const fullAtmosphere = button('Fine-tune atmosphere →')
    fullAtmosphere.addEventListener('click', () =>
      jumpFull('scene', 'atmosphere')
    )
    mood.furinaContent.append(moodGrid, fullAtmosphere)
    root.append(mood)

    const ambience = Atelier.AmbienceManager
    const music = card(
      'Music / ambience',
      'Direct audio, SoundCloud, and YouTube are supported by the same Furina music engine.'
    )
    if (!ambience) {
      music.furinaContent.append(statusLine('Music engine unavailable.'))
    } else {
      const name = input(ambience.settings.name, 'Track name (optional)')
      const url = input(
        ambience.settings.url,
        'YouTube, SoundCloud, or direct audio URL'
      )
      const musicStatus = statusLine()
      const load = button(
        ambience.settings.url ? 'Update track' : 'Load track',
        'furina-primary-button'
      )
      const sourceType = ambience.getSourceType?.()
      const play = button(ambience.isPlaying?.() ? 'Pause' : 'Play')
      const clear = button('Clear')

      const embedded =
        sourceType === 'youtube' ||
        (sourceType === 'soundcloud' &&
          ambience.usesEmbeddedSoundCloudPlayer?.())
      play.disabled = !ambience.settings.url || embedded
      if (sourceType === 'youtube') play.textContent = 'Use YouTube player'
      if (sourceType === 'soundcloud' && embedded)
        play.textContent = 'Use SoundCloud player'

      load.addEventListener('click', async () => {
        if (!url.value.trim()) {
          musicStatus.textContent = 'Paste a music URL first.'
          return
        }
        const ok = await ambience.setTrack(name.value, url.value)
        if (!ok) {
          musicStatus.textContent = 'That URL could not be loaded as ambience.'
          return
        }
        musicStatus.textContent = 'Track loaded.'
        refresh()
      })
      play.addEventListener('click', async () => {
        await ambience.togglePlayback()
        play.textContent = ambience.isPlaying?.() ? 'Pause' : 'Play'
        musicStatus.textContent =
          ambience.lastError ||
          (ambience.isPlaying?.() ? 'Playing.' : 'Paused.')
      })
      clear.addEventListener('click', async () => {
        await ambience.clearTrack()
        refresh()
      })

      const volume = range(
        ambience.settings.volume,
        0,
        1,
        0.05,
        v => `${Math.round(v * 100)}%`,
        v => ambience.setVolume(v)
      )
      volume.furinaLabel.textContent = 'Volume'
      const loop = simpleToggle(
        'Loop',
        'Restart the track when it ends when the source supports it.',
        ambience.settings.loop,
        value => ambience.setLoop(value)
      )
      const fullMusic = button('Full music controls →')
      fullMusic.addEventListener('click', () => jumpFull('scene', 'music'))

      music.furinaContent.append(
        field('Track name', name),
        field('URL', url),
        actionRow(load, play, clear),
        musicStatus,
        volume,
        loop,
        fullMusic
      )
    }
    root.append(music)

    const stickers = card(
      'Add a sticker',
      'Paste a direct image or GIF URL. Arrange, resize, rotate, and organize it later in Full Atelier.'
    )
    const stickerUrl = input('', 'https://example.com/sticker.gif')
    const stickerStatus = statusLine()
    const addSticker = button('Add sticker', 'furina-primary-button')
    addSticker.addEventListener('click', async () => {
      const result = await Atelier.StickerManager?.add?.(stickerUrl.value)
      if (!result) {
        stickerStatus.textContent = "Furina couldn't add that image URL."
        return
      }
      stickerUrl.value = ''
      stickerStatus.textContent =
        'Sticker added. Open the full Sticker tool to arrange it.'
      Atelier.PanelShell?.refreshNavigation?.()
    })
    const arrange = button('Arrange stickers →')
    arrange.addEventListener('click', () => jumpFull('scene', 'stickers'))
    stickers.furinaContent.append(
      field('Sticker URL', stickerUrl),
      actionRow(addSticker, arrange),
      stickerStatus
    )
    root.append(stickers)

    const reader = Atelier.ReaderManager
    const reading = card(
      'Reading',
      'Clean up the chat when you just want to read.'
    )
    const readerToggle = simpleToggle(
      'Reader Mode',
      'Use your saved Reader preferences for this conversation.',
      reader?.settings?.enabled,
      async checked => {
        await reader?.update?.('enabled', checked)
        refresh()
      }
    )
    const focus = button(
      reader?.focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode',
      'furina-primary-button'
    )
    focus.addEventListener('click', () => {
      reader?.toggleFocusMode?.()
      refresh()
    })
    const fullReader = button('Reader options →')
    fullReader.addEventListener('click', () => jumpFull('scene', 'reader'))
    reading.furinaContent.append(readerToggle, actionRow(focus, fullReader))
    root.append(reading)

    return root
  }

  // MORE

  function createMore() {
    const root = createElement('div', 'furina-essentials-more')
    root.append(
      sectionHeading(
        'MORE',
        'The doors to the weird rooms.',
        'These tools are still easy to launch, but they deserve more space than the everyday controls.'
      )
    )

    root.append(Atelier.PanelSections.createAtelierSection())

    const interfaces = card(
      'Alternate interfaces',
      'Temporarily experience the current conversation in a completely different presentation.'
    )
    const gallery = createElement('div', 'furina-essential-interface-grid')

    const vn = createElement('button', 'furina-essential-interface')
    vn.type = 'button'
    vn.append(
      createElement('span', 'furina-essential-interface-mark', 'VN'),
      createElement('span', 'furina-essential-interface-title', 'Visual Novel'),
      createElement(
        'span',
        'furina-essential-interface-copy',
        'Portraits, dialogue, backlog, speaker beats.'
      ),
      createElement('span', 'furina-essential-interface-action', 'Launch →')
    )
    vn.addEventListener('click', () => {
      Atelier.PanelShell?.close?.()
      window.setTimeout(() => Atelier.VisualNovel?.open?.(), 220)
    })

    const phantom = createElement('button', 'furina-essential-interface')
    phantom.type = 'button'
    phantom.append(
      createElement('span', 'furina-essential-interface-mark', 'P!'),
      createElement('span', 'furina-essential-interface-title', 'Phantom Chat'),
      createElement(
        'span',
        'furina-essential-interface-copy',
        'Kinetic comic-inspired message staging.'
      ),
      createElement('span', 'furina-essential-interface-action', 'Launch →')
    )
    phantom.addEventListener('click', () => {
      Atelier.PanelShell?.close?.()
      window.setTimeout(() => Atelier.PhantomChat?.open?.(), 220)
    })
    gallery.append(vn, phantom)
    interfaces.furinaContent.append(gallery)
    root.append(interfaces)

    const shortcuts = card(
      'Useful shortcuts',
      'Jump straight to the bigger tools when you need them.'
    )
    const grid = createElement('div', 'furina-essential-shortcut-grid')
    const links = [
      ['✎', 'Response Styles', 'Copy a roleplay style', 'director', 'styles'],
      ['↗', 'Share Setup', 'Import / export Furina', 'share', 'setup'],
      ['◇', 'Story Bible', 'Portable RP data', 'continuity', 'bible'],
      ['◒', 'Story Tools', 'Recaps and timeline', 'story', 'recaps'],
      ['🌐', 'Language', 'Change Furina language', 'tools', 'language'],
      ['{ }', 'Custom CSS', 'Advanced visual overrides', 'tools', 'css']
    ]
    for (const [icon, title, description, workspace, tool] of links) {
      const item = createElement('button', 'furina-essential-shortcut')
      item.type = 'button'
      item.append(
        createElement('span', 'furina-essential-shortcut-icon', icon),
        createElement('span', 'furina-essential-shortcut-title', title),
        createElement('span', 'furina-essential-shortcut-copy', description)
      )
      item.addEventListener('click', () => jumpFull(workspace, tool))
      grid.appendChild(item)
    }
    shortcuts.furinaContent.append(grid)
    root.append(shortcuts)

    const help = card(
      'Need the manual?',
      'The Guidebook explains the complicated 1.3 systems. Full Atelier exposes every setting and management tool.'
    )
    const guide = button('Open Guidebook', 'furina-primary-button')
    guide.addEventListener('click', () =>
      Atelier.GuideManager?.open?.('start', guide)
    )
    const full = button('Open Full Atelier')
    full.addEventListener('click', () => Atelier.PanelShell?.openFull?.('home'))
    help.furinaContent.append(actionRow(guide, full))
    root.append(help)

    return root
  }

  Atelier.EssentialsWorkspaces = {
    createHome,
    createCustomize,
    createRoleplay,
    createImmersion,
    createMore
  }
})()
