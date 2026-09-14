'use strict'


/*
  Developer notes

  Home workspace builder. It assembles existing section/manager state into one
  workspace view and should avoid owning long-lived feature data itself.
*/
/*
    Home Workspace

    Home is a status dashboard, not another settings page. It summarizes the
    current conversation and gives the user short paths back into the tools
    they are most likely to use.
*/
;(() => {
  const Atelier = window.ClankAtelier
  const {createElement} = Atelier.PanelUI

  function themeSummary() {
    const manager = Atelier.ThemeManager

    if (!manager) {
      return {
        value: 'Unavailable',
        meta: 'Theme engine is not ready.'
      }
    }

    const presetId = manager.settings?.preset
    const preset = Atelier.THEME_PRESETS?.[presetId]
    const presetName =
      preset?.name || (presetId === 'custom' ? 'Custom theme' : 'Current theme')

    return {
      value: presetName,
      meta:
        manager.scope === 'conversation'
          ? 'Conversation override'
          : 'Global theme'
    }
  }

  function sceneSummary() {
    const parts = []
    const atmosphere = Atelier.AtmosphereManager
    const ambience = Atelier.AmbienceManager
    const stickers = Atelier.StickerManager

    if (atmosphere?.settings?.enabled) {
      const label = String(atmosphere.settings.effect || 'effect').replace(
        /(^|[_-])(\w)/g,
        (_, prefix, letter) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`
      )
      parts.push(label.trim())
    }

    if (stickers?.stickers?.length) {
      parts.push(
        `${stickers.stickers.length} sticker${
          stickers.stickers.length === 1 ? '' : 's'
        }`
      )
    }

    if (ambience?.settings?.url) {
      parts.push(ambience.isPlaying?.() ? 'Music playing' : 'Music loaded')
    }

    return {
      value: parts.length ? parts.join(' · ') : 'Quiet',
      meta: parts.length
        ? 'Conversation scene tools'
        : 'No atmosphere, stickers, or music active'
    }
  }

  function directorSummary() {
    const manager = Atelier.DirectorManager

    if (!manager) {
      return {
        value: 'Unavailable',
        meta: 'Director engine is not ready.'
      }
    }

    const structured = Array.isArray(manager.settings?.notes)
      ? manager.settings.notes.filter(note => note?.enabled).length
      : 0
    const base = String(manager.settings?.note || '').trim() ? 1 : 0
    const total = structured + base

    return {
      value: manager.settings?.enabled ? 'Enabled' : 'Off',
      meta: total
        ? `${total} active reminder${total === 1 ? '' : 's'}`
        : 'No active notes'
    }
  }

  function readerSummary() {
    const manager = Atelier.ReaderManager

    if (!manager) {
      return {
        value: 'Unavailable',
        meta: 'Reader engine is not ready.'
      }
    }

    return {
      value: manager.focusMode
        ? 'Focus Mode'
        : manager.settings?.enabled
          ? 'Reader Mode'
          : 'Off',
      meta: manager.settings?.enabled
        ? 'Reading preferences are active'
        : 'Normal chat layout'
    }
  }

  function storySummary() {
    const manager = Atelier.SceneIntelligenceManager
    if (!manager) {
      return {value: 'Unavailable', meta: 'Story engine is not ready.'}
    }
    const recaps = manager.settings?.recaps?.length || 0
    const snapshots = manager.settings?.snapshots?.length || 0
    return {
      value: recaps
        ? `${recaps} scene${recaps === 1 ? '' : 's'}`
        : 'Current scene',
      meta: snapshots
        ? `${snapshots} saved snapshot${snapshots === 1 ? '' : 's'}`
        : 'Recaps, timeline, and snapshots'
    }
  }

  function createStatusCard(config) {
    const card = createElement('button', 'furina-home-card')
    card.type = 'button'
    card.addEventListener('click', () => {
      Atelier.PanelShell?.navigate?.(config.workspace, config.tool)
    })

    const top = createElement('div', 'furina-home-card-top')
    const icon = createElement('span', 'furina-home-card-icon', config.icon)
    icon.setAttribute('aria-hidden', 'true')
    const label = createElement('span', 'furina-home-card-label', config.label)
    const arrow = createElement('span', 'furina-home-card-arrow', '→')
    arrow.setAttribute('aria-hidden', 'true')
    top.append(icon, label, arrow)

    const value = createElement('div', 'furina-home-card-value', config.value)
    const meta = createElement('div', 'furina-home-card-meta', config.meta)

    card.append(top, value, meta)
    return card
  }

  function createGuideCard(content) {
    const card = createElement('button', 'furina-home-guide-card')

    card.type = 'button'

    card.setAttribute('aria-haspopup', 'dialog')

    const decoration = createElement(
      'span',
      'furina-home-guide-decoration',
      '✦'
    )

    decoration.setAttribute('aria-hidden', 'true')

    const copy = createElement('div', 'furina-home-guide-card-copy')

    copy.append(
      createElement('div', 'furina-home-kicker', content.cardKicker),
      createElement('div', 'furina-home-guide-title', content.cardTitle),
      createElement('div', 'furina-home-guide-body', content.cardBody)
    )

    const action = createElement(
      'span',
      'furina-home-guide-action',
      content.cardButton
    )

    action.appendChild(
      createElement('span', 'furina-home-guide-action-arrow', '→')
    )

    card.append(decoration, copy, action)

    card.addEventListener('click', () => {
      Atelier.GuideManager?.open?.('start', card)
    })

    return card
  }

  function createGuideWelcome(content) {
    const welcome = createElement('aside', 'furina-home-guide-welcome')

    const glow = createElement('span', 'furina-home-guide-welcome-glow')

    glow.setAttribute('aria-hidden', 'true')

    const icon = createElement('span', 'furina-home-guide-welcome-icon', '?')

    icon.setAttribute('aria-hidden', 'true')

    const copy = createElement('div', 'furina-home-guide-welcome-copy')

    copy.append(
      createElement('div', 'furina-home-kicker', content.welcomeKicker),
      createElement(
        'div',
        'furina-home-guide-welcome-title',
        content.welcomeTitle
      ),
      createElement(
        'div',
        'furina-home-guide-welcome-body',
        content.welcomeBody
      )
    )

    const actions = createElement('div', 'furina-home-guide-welcome-actions')

    const open = createElement(
      'button',
      'furina-primary-button furina-home-guide-welcome-open',
      content.welcomeOpen
    )

    open.type = 'button'

    open.setAttribute('aria-haspopup', 'dialog')

    open.addEventListener('click', () => {
      Atelier.GuideManager?.open?.('start', open)
    })

    const dismiss = createElement(
      'button',
      'furina-secondary-button furina-home-guide-welcome-dismiss',
      content.welcomeDismiss
    )

    dismiss.type = 'button'

    dismiss.addEventListener('click', async () => {
      dismiss.disabled = true

      await Atelier.GuideManager?.dismissWelcome?.()
    })

    actions.append(open, dismiss)

    welcome.append(glow, icon, copy, actions)

    return welcome
  }

  function createHomeWorkspace() {
    const root = createElement('div', 'furina-home')

    const intro = createElement('div', 'furina-home-intro')
    intro.append(
      createElement('div', 'furina-home-kicker', 'CURRENT CHAT'),
      createElement(
        'div',
        'furina-home-heading',
        'Your conversation at a glance'
      ),
      createElement(
        'div',
        'furina-home-copy',
        'Open a card to jump directly into that part of the Atelier.'
      )
    )

    const theme = themeSummary()
    const scene = sceneSummary()
    const director = directorSummary()
    const reader = readerSummary()
    const story = storySummary()

    const guideContent = Atelier.GuideManager?.getLocale?.()?.home || {
      cardKicker: 'GUIDEBOOK',

      cardTitle: 'Learn Director, Memory & Story tools',

      cardBody:
        'Practical explanations and shortcuts for Furina’s roleplay systems.',

      cardButton: 'Open Guidebook',

      welcomeKicker: 'NEW IN FURINA 1.3',

      welcomeTitle: 'New to Furina’s roleplay tools?',

      welcomeBody:
        'The Guidebook explains the new tools through simple examples.',

      welcomeOpen: 'Explore the Guidebook',

      welcomeDismiss: 'Dismiss'
    }

    const grid = createElement('div', 'furina-home-grid')
    grid.append(
      createStatusCard({
        icon: '◈',
        label: 'Look',
        value: theme.value,
        meta: theme.meta,
        workspace: 'look',
        tool: Atelier.PanelState.navigation.tools.look || 'themes'
      }),
      createStatusCard({
        icon: '✦',
        label: 'Scene',
        value: scene.value,
        meta: scene.meta,
        workspace: 'scene',
        tool: Atelier.PanelState.navigation.tools.scene || 'atmosphere'
      }),
      createStatusCard({
        icon: '◆',
        label: 'Director',
        value: director.value,
        meta: director.meta,
        workspace: 'director'
      }),
      createStatusCard({
        icon: '▤',
        label: 'Reader',
        value: reader.value,
        meta: reader.meta,
        workspace: 'scene',
        tool: 'reader'
      }),
      createStatusCard({
        icon: '◒',
        label: 'Story',
        value: story.value,
        meta: story.meta,
        workspace: 'story',
        tool: Atelier.PanelState.navigation.tools.story || 'current'
      })
    )

    const recent = Atelier.PanelState.navigation.lastNonHome
    const recentLabel = Atelier.WorkspaceRouter?.describeView?.(
      recent.workspace,
      recent.tool
    )

    const resume = createElement('div', 'furina-home-resume')
    const resumeText = createElement('div', 'furina-home-resume-text')
    resumeText.append(
      createElement('div', 'furina-home-kicker', 'RESUME'),
      createElement(
        'div',
        'furina-home-resume-title',
        recentLabel || 'Look · Themes'
      )
    )

    const resumeButton = createElement(
      'button',
      'furina-secondary-button furina-home-resume-button',
      'Open last tool'
    )
    resumeButton.type = 'button'
    resumeButton.addEventListener('click', () => {
      Atelier.PanelShell?.navigate?.(
        recent.workspace || 'look',
        recent.tool || 'themes'
      )
    })

    resume.append(resumeText, resumeButton)

    const guideCard = createGuideCard(guideContent)

    root.appendChild(intro)

    if (Atelier.GuideManager?.shouldShowWelcome?.()) {
      root.appendChild(createGuideWelcome(guideContent))
    }

    root.append(grid, guideCard, resume)

    /*
            Entrance controls are created by their own UI module.

            Insert the card immediately before Resume without coupling
            the entrance feature to the rest of Home's dashboard.
        */

    const entranceSettings = Atelier.EntranceSettingsSection?.create?.()

    if (entranceSettings) {
      const resumeCard = root.querySelector('.furina-home-resume')

      if (resumeCard) {
        root.insertBefore(entranceSettings, resumeCard)
      } else {
        root.appendChild(entranceSettings)
      }
    }

    return root
  }

  window.addEventListener('furina-guidebook-discovery-changed', () => {
    const active = Atelier.PanelShell?.getActiveView?.()

    if (active?.workspace === 'home') {
      Atelier.PanelShell?.rebuild?.()
    }
  })

  Atelier.HomeWorkspace = {
    create: createHomeWorkspace
  }
})()
