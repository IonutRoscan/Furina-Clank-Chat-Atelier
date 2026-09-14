'use strict'


/*
  Developer notes

  Routes the compact Essentials interface. Its navigation state is intentionally small
  and has synchronous defaults so a fresh install cannot crash while the saved workspace
  is still loading from chrome.storage.
*/
/*
    Essentials Router

    Essentials deliberately uses broad goals rather than exposing Furina's
    internal subsystem names. The advanced router remains completely intact.
*/
;(() => {
  const Atelier = window.ClankAtelier
  const State = Atelier.PanelState

  const STORAGE_KEY = 'furina-essentials-navigation-v1'

  const WORKSPACES = {
    home: {
      label: 'Home',
      icon: '⌂',
      title: 'Essentials',
      description: 'The fun parts of Furina, without the control room.',
      tools: []
    },
    customize: {
      label: 'Customize',
      icon: '◈',
      title: 'Make it yours',
      description:
        'Themes, backgrounds, and the visual controls most people actually need.',
      tools: []
    },
    roleplay: {
      label: 'Roleplay',
      icon: '◆',
      title: 'Help the story',
      description:
        'Remember important facts, guide the next reply, and keep the current scene grounded.',
      tools: []
    },
    immersion: {
      label: 'Immersion',
      icon: '✦',
      title: 'Set the mood',
      description: 'Atmosphere, music, stickers, and reading tools.',
      tools: []
    },
    more: {
      label: 'More',
      icon: '＋',
      title: 'More Furina',
      description:
        'Alternate interfaces, sharing, response styles, the Guidebook, and the full Atelier.',
      tools: []
    }
  }

  function sanitize(input, loaded = true) {
    const workspace = WORKSPACES[input?.workspace] ? input.workspace : 'home'

    return {
      workspace,
      loaded
    }
  }

  /*
    Essentials can render before its async storage read finishes, especially on
    a fresh install or immediately after an extension reload. Keeping this
    helper synchronous means every caller gets a valid navigation object even
    during that short loading window. It also recovers gracefully if old or
    malformed storage left the property missing.
  */
  function getNavigationState() {
    if (!State.essentialsNavigation) {
      State.essentialsNavigation = sanitize(null, false)
    }

    return State.essentialsNavigation
  }

  async function loadState() {
    const current = getNavigationState()

    if (current.loaded) {
      return
    }

    const stored = await Atelier.Storage.get(STORAGE_KEY, null)
    State.essentialsNavigation = sanitize(stored, true)
  }

  function saveState() {
    const current = getNavigationState()

    Atelier.Storage.set(STORAGE_KEY, {
      workspace: current.workspace
    })
  }

  function getActive() {
    const current = getNavigationState()
    const workspace = WORKSPACES[current.workspace]
      ? current.workspace
      : 'home'

    return {
      workspace,
      tool: null,
      config: WORKSPACES[workspace]
    }
  }

  function navigate(workspace) {
    if (!WORKSPACES[workspace]) {
      return false
    }

    getNavigationState().workspace = workspace
    saveState()
    return true
  }

  function viewKey(workspace) {
    return `essentials:${workspace}`
  }

  function renderView(workspace) {
    const factory = Atelier.EssentialsWorkspaces

    switch (workspace) {
      case 'customize':
        return factory.createCustomize()
      case 'roleplay':
        return factory.createRoleplay()
      case 'immersion':
        return factory.createImmersion()
      case 'more':
        return factory.createMore()
      case 'home':
      default:
        return factory.createHome()
    }
  }

  function getBadge(workspace) {
    if (workspace === 'roleplay') {
      const continuity = Atelier.ContinuityManager?.settings?.entries || []
      const count = continuity.filter(
        item => item.enabled && !item.archived
      ).length
      return count
        ? {text: String(Math.min(count, 99)), label: `${count} active memories`}
        : null
    }

    if (workspace === 'immersion') {
      const active = Boolean(
        Atelier.AtmosphereManager?.settings?.enabled ||
        Atelier.AmbienceManager?.settings?.url ||
        Atelier.StickerManager?.stickers?.length
      )
      return active ? {text: '•', label: 'Immersion tools are active'} : null
    }

    return null
  }

  Atelier.EssentialsRouter = {
    WORKSPACES,
    loadState,
    getActive,
    navigate,
    viewKey,
    renderView,
    getBadge,
    describeView: workspace => WORKSPACES[workspace]?.label || 'Essentials'
  }
})()
