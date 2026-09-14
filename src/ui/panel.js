'use strict'


/*
  Developer notes

  Creates the Furina launcher, panel shell and high-level mode switching. Desktop and
  mobile launchers share the same open/close behavior; mobile positioning follows the
  real Clank composer so Furina does not cover the native Send button.
*/
/*
    Atelier Workspace Shell

    This is Furina's persistent application-style panel. The shell itself is
    created once. Navigation swaps only the active workspace content, so a
    small change in Stickers no longer rebuilds every unrelated panel tool.
*/

window.ClankAtelier = window.ClankAtelier || {}

;(() => {
  const Atelier = window.ClankAtelier
  const State = Atelier.PanelState
  const FullRouter = Atelier.WorkspaceRouter
  const FullNavigation = Atelier.PanelNavigation
  const {createElement} = Atelier.PanelUI

  let panel = null
  let launcher = null
  let primaryNav = null
  let modeSwitch = null
  let workspaceTitle = null
  let workspaceDescription = null
  let secondaryNav = null
  let workspaceScroll = null
  let workspaceContent = null
  let renderedViewKey = null
  let initialized = false

  const mobileLauncherMedia = window.matchMedia(
    '(max-width: 760px), (pointer: coarse) and (max-width: 1100px)'
  )

  let mobileLauncherFrame = 0
  let mobileComposerAnchor = null
  let mobileComposerResizeObserver = null

  function isChatRoute() {
    return window.location.pathname.startsWith('/chat/')
  }

  function getRouter() {
    return Atelier.PanelMode?.isEssentials?.()
      ? Atelier.EssentialsRouter
      : FullRouter
  }

  function getNavigation() {
    return Atelier.PanelMode?.isEssentials?.()
      ? Atelier.EssentialsNavigation
      : FullNavigation
  }

  function syncModeSwitch() {
    if (!panel || !modeSwitch) {
      return
    }

    const mode = Atelier.PanelMode?.mode || 'full'
    panel.dataset.panelMode = mode

    modeSwitch.querySelectorAll('[data-furina-panel-mode]').forEach(button => {
      const active = button.dataset.furinaPanelMode === mode
      button.classList.toggle('furina-mode-switch-active', active)
      button.setAttribute('aria-pressed', String(active))
    })
  }

  function cancelPortablePreviews() {
    if (State.themeBeforeImportPreview && Atelier.ThemeManager) {
      Atelier.ThemeManager.restorePreviewTheme(State.themeBeforeImportPreview)
    }

    State.pendingThemeImport = null
    State.themeBeforeImportPreview = null

    if (Atelier.SetupManager?.previewBackup) {
      Atelier.SetupManager.revertPreview()
    }

    State.pendingSetupImport = null
  }

  function saveCurrentScroll() {
    if (!workspaceScroll || !renderedViewKey) {
      return
    }

    State.ui.viewScroll[renderedViewKey] = workspaceScroll.scrollTop
  }

  function restoreViewScroll(key) {
    if (!workspaceScroll) {
      return
    }

    const value = Number(State.ui.viewScroll[key]) || 0

    requestAnimationFrame(() => {
      if (workspaceScroll) {
        workspaceScroll.scrollTop = value
      }
    })
  }

  function isPanelOpen() {
    return Boolean(panel && panel.classList.contains('furina-panel-open'))
  }

  function syncStickerEditing() {
    if (!Atelier.StickerManager) {
      return
    }

    const router = getRouter()
    const active = router.getActive()
    const shouldEdit = Boolean(
      isPanelOpen() &&
      !Atelier.PanelMode?.isEssentials?.() &&
      active.workspace === 'scene' &&
      active.tool === 'stickers'
    )

    Atelier.StickerManager.setEditing(shouldEdit)
  }

  function refreshNavigation() {
    if (!panel) {
      return
    }

    const navigation = getNavigation()
    navigation?.renderPrimary?.(primaryNav)
    navigation?.renderSecondary?.(secondaryNav)
    syncModeSwitch()
  }

  function renderActiveView({preserveScroll = true} = {}) {
    if (!panel || !workspaceContent) {
      return
    }

    if (preserveScroll) {
      saveCurrentScroll()
    }

    const router = getRouter()
    const active = router.getActive()
    const key = router.viewKey(active.workspace, active.tool)

    workspaceTitle.textContent = Atelier.I18n?.t
      ? Atelier.I18n.t(active.config.title)
      : active.config.title

    workspaceDescription.textContent = Atelier.I18n?.t
      ? Atelier.I18n.t(active.config.description)
      : active.config.description

    refreshNavigation()

    workspaceContent.replaceChildren(
      router.renderView(active.workspace, active.tool)
    )

    workspaceContent.dataset.workspace = active.workspace
    workspaceContent.dataset.tool = active.tool || ''

    renderedViewKey = key
    restoreViewScroll(key)
    syncStickerEditing()
  }

  function navigate(workspace, tool = null) {
    saveCurrentScroll()

    const router = getRouter()

    if (!router.navigate(workspace, tool)) {
      /*
                Existing Furina modules already know destinations such as
                Director · Direct or Scene · Stickers. If one of those asks
                the shell to navigate while Essentials is active, treat it as
                an intentional jump into Full Atelier instead of silently
                failing because the simplified router has different names.
            */
      if (
        Atelier.PanelMode?.isEssentials?.() &&
        FullRouter.WORKSPACES?.[workspace]
      ) {
        setPanelMode('full', {workspace, tool})
      }
      return
    }

    renderActiveView({preserveScroll: false})
    Atelier.SfxManager?.play?.('navigate')
  }

  function refreshLanguage() {
    /*
            Locale changes do not need to destroy the panel. The i18n layer
            can translate known UI text in either direction, so rebuilding
            only the active workspace keeps navigation, open state, and
            scroll behavior stable.
        */
    renderActiveView({
      preserveScroll: true
    })

    Atelier.I18n?.translateTree?.(panel)

    Atelier.I18n?.translateTree?.(launcher)
  }

  async function setPanelMode(mode, destination = null) {
    saveCurrentScroll()

    const changed = await Atelier.PanelMode?.set?.(mode)
    if (changed === false) {
      return false
    }

    const router = getRouter()

    if (destination?.workspace) {
      router.navigate(destination.workspace, destination.tool || null)
    }

    renderedViewKey = null
    renderActiveView({preserveScroll: false})
    return true
  }

  Atelier.PanelShell = {
    rebuild: () => renderActiveView(),
    refreshNavigation,
    navigate,
    open: () => openPanel(),
    close: () => closePanel(),
    getActiveView: () => getRouter().getActive(),
    getMode: () => Atelier.PanelMode?.mode || 'full',
    setMode: mode => setPanelMode(mode),
    openFull: (workspace = 'home', tool = null) =>
      setPanelMode('full', {workspace, tool}),
    openEssentials: (workspace = 'home') =>
      setPanelMode('essentials', {workspace}),
    refreshLanguage
  }

  function createPanelShell() {
    if (panel && document.body.contains(panel)) {
      return
    }

    panel = createElement('aside', 'furina-panel furina-atelier-workspace')
    panel.id = 'furina-panel'
    panel.setAttribute(
      'aria-label',
      Atelier.I18n?.t?.('Furina Clank Chat Atelier') ||
        'Furina Clank Chat Atelier'
    )
    panel.dataset.furinaOwned = 'true'

    const header = createElement('header', 'furina-panel-header')
    const branding = createElement('div', 'furina-branding')
    branding.append(
      createElement('div', 'furina-panel-title', 'Furina'),
      createElement('div', 'furina-panel-subtitle', 'Clank Chat Atelier')
    )

    const headerActions = createElement('div', 'furina-panel-header-actions')

    const guideButton = createElement(
      'button',
      'furina-guidebook-header-button',
      '?'
    )

    guideButton.type = 'button'

    guideButton.title = 'Open Furina Guidebook'

    guideButton.setAttribute('aria-label', 'Open Furina Guidebook')

    guideButton.setAttribute('aria-haspopup', 'dialog')

    guideButton.addEventListener('click', () => {
      Atelier.GuideManager?.open?.('start', guideButton)
    })

    const close = createElement('button', 'furina-close-button', '×')

    close.type = 'button'

    close.title = Atelier.I18n?.t?.('Close') || 'Close'

    close.setAttribute(
      'aria-label',
      Atelier.I18n?.t?.('Close Furina panel') || 'Close Furina panel'
    )

    close.addEventListener('click', closePanel)

    headerActions.append(guideButton, close)

    header.append(branding, headerActions)

    modeSwitch = createElement('div', 'furina-mode-switch')
    modeSwitch.setAttribute('role', 'group')
    modeSwitch.setAttribute('aria-label', 'Furina panel mode')

    const essentialsModeButton = createElement(
      'button',
      'furina-mode-switch-button',
      'Essentials'
    )
    essentialsModeButton.type = 'button'
    essentialsModeButton.dataset.furinaPanelMode = 'essentials'
    essentialsModeButton.addEventListener('click', () => {
      setPanelMode('essentials')
    })

    const fullModeButton = createElement(
      'button',
      'furina-mode-switch-button',
      'Full Atelier'
    )
    fullModeButton.type = 'button'
    fullModeButton.dataset.furinaPanelMode = 'full'
    fullModeButton.addEventListener('click', () => {
      setPanelMode('full')
    })

    modeSwitch.append(essentialsModeButton, fullModeButton)

    const app = createElement('div', 'furina-workspace-app')

    primaryNav = createElement('nav', 'furina-primary-nav')
    primaryNav.setAttribute(
      'aria-label',
      Atelier.I18n?.t?.('Furina workspaces') || 'Furina workspaces'
    )

    const workspace = createElement('main', 'furina-workspace-main')
    const workspaceHeader = createElement('div', 'furina-workspace-header')
    const headingArea = createElement('div', 'furina-workspace-heading-area')
    workspaceTitle = createElement('h2', 'furina-workspace-title')
    workspaceDescription = createElement('div', 'furina-workspace-description')
    headingArea.append(workspaceTitle, workspaceDescription)

    secondaryNav = createElement('nav', 'furina-secondary-nav')
    secondaryNav.setAttribute(
      'aria-label',
      Atelier.I18n?.t?.('Workspace tools') || 'Workspace tools'
    )
    workspaceHeader.append(headingArea, secondaryNav)

    workspaceScroll = createElement('div', 'furina-workspace-scroll')
    workspaceContent = createElement('div', 'furina-workspace-content')
    workspaceScroll.appendChild(workspaceContent)

    workspace.append(workspaceHeader, workspaceScroll)
    app.append(primaryNav, workspace)
    panel.append(header, modeSwitch, app)
    document.body.appendChild(panel)

    Atelier.I18n?.observeRoot?.(panel)

    renderActiveView({preserveScroll: false})
  }

  function deactivateUI() {
    Atelier.StickerManager?.setEditing(false)

    if (panel) {
      panel.classList.remove('furina-panel-open')
      panel.style.display = 'none'
    }

    if (launcher) {
      launcher.style.display = 'none'
      launcher.setAttribute('aria-expanded', 'false')
    }
  }

  function activateUI() {
    if (launcher) {
      launcher.style.display = ''
      scheduleMobileLauncherPosition()
    }

    if (panel) {
      panel.style.display = ''
    }
  }

  function openPanel() {
    if (!isChatRoute()) {
      deactivateUI()
      return
    }

    createPanelShell()
    activateUI()
    refreshNavigation()

    requestAnimationFrame(() => {
      panel?.classList.add('furina-panel-open')
      launcher?.setAttribute('aria-expanded', 'true')
      syncStickerEditing()
      Atelier.SfxManager?.play?.('panel-open')
    })
  }

  function closePanel() {
    if (!panel) {
      return
    }

    saveCurrentScroll()
    panel.classList.remove('furina-panel-open')
    launcher?.setAttribute('aria-expanded', 'false')
    Atelier.StickerManager?.setEditing(false)
    Atelier.SfxManager?.play?.('panel-close')
  }

  function togglePanel() {
    if (!isChatRoute()) {
      deactivateUI()
      return
    }

    if (isPanelOpen()) {
      closePanel()
    } else {
      openPanel()
    }
  }

  function isMobileLauncherMode() {
    return mobileLauncherMedia.matches
  }

  function getMobileComposerAnchor() {
    const selector =
      Atelier.SELECTORS?.composer || 'textarea[placeholder="Type something"]'
    const composer = document.querySelector(selector)

    if (!(composer instanceof HTMLElement)) {
      return null
    }

    const form = composer.closest('form')

    if (form instanceof HTMLElement) {
      return form
    }

    let candidate = composer.parentElement

    while (candidate && candidate !== document.body) {
      const hasButton = Boolean(candidate.querySelector('button'))
      const rect = candidate.getBoundingClientRect()

      if (hasButton && rect.width >= composer.getBoundingClientRect().width) {
        return candidate
      }

      candidate = candidate.parentElement
    }

    return composer.parentElement || composer
  }

  function observeMobileComposerAnchor(anchor) {
    if (anchor === mobileComposerAnchor) {
      return
    }

    mobileComposerResizeObserver?.disconnect()
    mobileComposerResizeObserver = null
    mobileComposerAnchor = anchor

    if (!(anchor instanceof HTMLElement) || !('ResizeObserver' in window)) {
      return
    }

    mobileComposerResizeObserver = new ResizeObserver(() => {
      scheduleMobileLauncherPosition()
    })
    mobileComposerResizeObserver.observe(anchor)
  }

  function updateMobileLauncherPosition() {
    if (!launcher) {
      return
    }

    if (!isMobileLauncherMode()) {
      launcher.style.removeProperty('--furina-mobile-launcher-top')
      launcher.removeAttribute('data-furina-mobile-anchor')
      observeMobileComposerAnchor(null)
      return
    }

    const anchor = getMobileComposerAnchor()
    observeMobileComposerAnchor(anchor)

    if (!(anchor instanceof HTMLElement)) {
      launcher.style.removeProperty('--furina-mobile-launcher-top')
      launcher.dataset.furinaMobileAnchor = 'fallback'
      return
    }

    const rect = anchor.getBoundingClientRect()
    const visualViewport = window.visualViewport
    const viewportTop = Number(visualViewport?.offsetTop) || 0
    const viewportHeight = Number(visualViewport?.height) || window.innerHeight
    const viewportBottom = viewportTop + viewportHeight
    const launcherHeight = launcher.offsetHeight || 48
    const gap = 9
    const minimumTop = viewportTop + 8
    const maximumTop = Math.max(
      minimumTop,
      viewportBottom - launcherHeight - 8
    )
    const desiredTop = rect.top - launcherHeight - gap
    const clampedTop = Math.min(
      Math.max(desiredTop, minimumTop),
      maximumTop
    )

    launcher.style.setProperty(
      '--furina-mobile-launcher-top',
      `${Math.round(clampedTop)}px`
    )
    launcher.dataset.furinaMobileAnchor = 'composer'
  }

  function scheduleMobileLauncherPosition() {
    if (mobileLauncherFrame) {
      return
    }

    mobileLauncherFrame = requestAnimationFrame(() => {
      mobileLauncherFrame = 0
      updateMobileLauncherPosition()
    })
  }

  function createLauncher() {
    const existing = document.getElementById('furina-launcher')

    if (existing) {
      launcher = existing
      scheduleMobileLauncherPosition()
      return
    }

    launcher = createElement('button', 'furina-launcher')
    launcher.id = 'furina-launcher'
    launcher.type = 'button'
    launcher.title = Atelier.I18n?.t?.('Open Furina') || 'Open Furina'
    launcher.setAttribute(
      'aria-label',
      Atelier.I18n?.t?.('Open Furina customization panel') ||
        'Open Furina customization panel'
    )
    launcher.setAttribute('aria-controls', 'furina-panel')
    launcher.setAttribute('aria-expanded', 'false')
    launcher.dataset.furinaOwned = 'true'

    const icon = createElement('span', 'furina-launcher-icon', '✦')
    icon.setAttribute('aria-hidden', 'true')
    const label = createElement('span', 'furina-launcher-label', 'Furina')
    launcher.append(icon, label)
    launcher.addEventListener('click', togglePanel)
    document.body.appendChild(launcher)

    Atelier.I18n?.observeRoot?.(launcher)
    scheduleMobileLauncherPosition()
  }

  async function initializeManagers() {
    await Atelier.ThemeManager.init()

    const conversationId =
      typeof Atelier.getConversationId === 'function'
        ? Atelier.getConversationId()
        : null

    if (typeof Atelier.ReaderManager?.loadConversation === 'function') {
      await Atelier.ReaderManager.loadConversation(conversationId)
    }

    if (typeof Atelier.SceneStateManager?.loadConversation === 'function') {
      await Atelier.SceneStateManager.loadConversation(conversationId)
    }

    if (
      typeof Atelier.ScenePresentationManager?.loadConversation === 'function'
    ) {
      await Atelier.ScenePresentationManager.loadConversation(conversationId)
    }

    if (typeof Atelier.DirectorManager?.loadConversation === 'function') {
      await Atelier.DirectorManager.loadConversation(conversationId)
    }

    if (typeof Atelier.ContinuityManager?.loadConversation === 'function') {
      await Atelier.ContinuityManager.loadConversation(conversationId)
    }

    if (typeof Atelier.MemoryCaptureManager?.loadConversation === 'function') {
      await Atelier.MemoryCaptureManager.loadConversation(conversationId)
    }

    if (typeof Atelier.Director2Manager?.loadConversation === 'function') {
      await Atelier.Director2Manager.loadConversation(conversationId)
    }

    if (
      typeof Atelier.SceneIntelligenceManager?.loadConversation === 'function'
    ) {
      await Atelier.SceneIntelligenceManager.loadConversation(conversationId)
    }

    if (typeof Atelier.AdvancedCssManager?.loadConversation === 'function') {
      await Atelier.AdvancedCssManager.loadConversation(conversationId)
    }

    /*
            Essentials exposes these conversation-scoped tools directly, so
            make their saved state available even if Clank's lifecycle observer
            has not yet reached its own sync pass.
        */
    if (typeof Atelier.StickerManager?.loadConversation === 'function') {
      await Atelier.StickerManager.loadConversation(conversationId)
    }

    if (typeof Atelier.AtmosphereManager?.loadConversation === 'function') {
      await Atelier.AtmosphereManager.loadConversation(conversationId)
    }

    if (typeof Atelier.AmbienceManager?.loadConversation === 'function') {
      await Atelier.AmbienceManager.loadConversation(conversationId)
    }

    if (typeof Atelier.RpSfxManager?.loadConversation === 'function') {
      await Atelier.RpSfxManager.loadConversation(conversationId)
    }

    if (typeof Atelier.StickerManager?.loadLayouts === 'function') {
      await Atelier.StickerManager.loadLayouts()
    }

    if (typeof Atelier.StickerManager?.loadLibrary === 'function') {
      await Atelier.StickerManager.loadLibrary()
    }
  }

  async function initialize() {
    if (initialized || !isChatRoute()) {
      return
    }

    if (
      !Atelier.Storage ||
      !Atelier.ThemeManager ||
      !FullRouter ||
      !Atelier.EssentialsRouter ||
      !Atelier.PanelMode
    ) {
      console.error('[Clank Atelier] UI dependencies missing.')
      return
    }

    initialized = true

    if (typeof Atelier.I18n?.init === 'function') {
      await Atelier.I18n.init()
    }

    await Atelier.PanelMode.load()
    await initializeManagers()
    await FullRouter.loadState()
    await Atelier.EssentialsRouter.loadState()

    createLauncher()
    createPanelShell()
  }

  function tryInitialize() {
    if (!isChatRoute()) {
      deactivateUI()
      return
    }

    const chat = document.querySelector('#chat-scroll-container')

    if (!chat) {
      deactivateUI()
      return
    }

    if (!initialized) {
      initialize()
      return
    }

    /*
            Normal Clank DOM mutations only need to make sure Furina is
            still available.

            Do NOT rebuild the navigation here. This function is called
            from the page-wide MutationObserver, and rebuilding the nav
            replaces its buttons while the user may be clicking them.

            That can cancel the browser's click event between pointerdown
            and pointerup.
        */

    activateUI()
  }

  let lastPath = window.location.pathname
  let routeSyncInFlight = false

  async function syncConversationForPanel() {
    if (!initialized || routeSyncInFlight) {
      return
    }

    routeSyncInFlight = true

    try {
      if (typeof Atelier.ThemeManager?.syncConversation === 'function') {
        await Atelier.ThemeManager.syncConversation()
      }

      if (typeof Atelier.ReaderManager?.syncConversation === 'function') {
        await Atelier.ReaderManager.syncConversation()
      }

      if (typeof Atelier.SceneStateManager?.syncConversation === 'function') {
        await Atelier.SceneStateManager.syncConversation()
      }

      if (
        typeof Atelier.ScenePresentationManager?.syncConversation === 'function'
      ) {
        await Atelier.ScenePresentationManager.syncConversation()
      }

      if (typeof Atelier.DirectorManager?.syncConversation === 'function') {
        await Atelier.DirectorManager.syncConversation()
      }

      if (typeof Atelier.ContinuityManager?.syncConversation === 'function') {
        await Atelier.ContinuityManager.syncConversation()
      }

      if (
        typeof Atelier.MemoryCaptureManager?.syncConversation === 'function'
      ) {
        await Atelier.MemoryCaptureManager.syncConversation()
      }

      if (typeof Atelier.Director2Manager?.syncConversation === 'function') {
        await Atelier.Director2Manager.syncConversation()
      }

      if (
        typeof Atelier.SceneIntelligenceManager?.syncConversation === 'function'
      ) {
        await Atelier.SceneIntelligenceManager.syncConversation()
      }

      const chatShell = document.querySelector('.clank-atelier-chat-shell')

      if (typeof Atelier.StickerManager?.syncConversation === 'function') {
        await Atelier.StickerManager.syncConversation(chatShell)
      }

      if (typeof Atelier.AtmosphereManager?.syncConversation === 'function') {
        await Atelier.AtmosphereManager.syncConversation(chatShell)
      }

      if (typeof Atelier.AmbienceManager?.syncConversation === 'function') {
        await Atelier.AmbienceManager.syncConversation()
      }

      if (typeof Atelier.RpSfxManager?.syncConversation === 'function') {
        await Atelier.RpSfxManager.syncConversation()
      }

      if (panel) {
        renderActiveView()
      }
    } finally {
      routeSyncInFlight = false
    }
  }

  async function checkRoute() {
    const currentPath = window.location.pathname

    if (currentPath === lastPath) {
      return
    }

    cancelPortablePreviews()
    lastPath = currentPath

    if (initialized) {
      await syncConversationForPanel()
    }

    tryInitialize()
  }

  let uiSyncScheduled = false

  function scheduleUiSync() {
    if (uiSyncScheduled) {
      return
    }

    uiSyncScheduled = true
    requestAnimationFrame(() => {
      uiSyncScheduled = false
      checkRoute()
      tryInitialize()
    })
  }

  function isFurinaUiNode(node) {
    let element = node

    if (element?.nodeType === Node.TEXT_NODE) {
      element = element.parentElement
    }

    if (!(element instanceof HTMLElement)) {
      return false
    }

    const selector = [
      '#furina-panel',
      '#furina-launcher',
      '.furina-ambience-player',
      '.furina-atmosphere-layer',
      '.furina-sticker-layer',
      '.clank-atelier-lightbox',
      '.clank-atelier-rendered',
      '[data-furina-owned="true"]',
      '[data-clank-atelier-owned="true"]'
    ].join(',')

    return Boolean(element.matches?.(selector) || element.closest?.(selector))
  }

  const observer = new MutationObserver(records => {
    const needsSync = records.some(record => {
      if (isFurinaUiNode(record.target)) {
        return false
      }

      const changedNodes = [...record.addedNodes, ...record.removedNodes]

      return (
        changedNodes.length === 0 ||
        changedNodes.some(node => !isFurinaUiNode(node))
      )
    })

    if (needsSync) {
      scheduleUiSync()
    }
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  })

  window.addEventListener('popstate', async () => {
    cancelPortablePreviews()
    lastPath = window.location.pathname
    await syncConversationForPanel()
    tryInitialize()
  })

  document.addEventListener('furina-route-changed', () => {
    scheduleUiSync()
  })

  document.addEventListener('furina-language-changed', () => {
    if (!initialized) {
      return
    }

    refreshLanguage()
  })

  mobileLauncherMedia.addEventListener?.('change', () => {
    scheduleMobileLauncherPosition()
  })

  window.addEventListener('resize', scheduleMobileLauncherPosition, {
    passive: true
  })
  window.addEventListener('orientationchange', scheduleMobileLauncherPosition, {
    passive: true
  })
  window.addEventListener('scroll', scheduleMobileLauncherPosition, {
    passive: true,
    capture: true
  })
  window.visualViewport?.addEventListener(
    'resize',
    scheduleMobileLauncherPosition,
    {passive: true}
  )
  window.visualViewport?.addEventListener(
    'scroll',
    scheduleMobileLauncherPosition,
    {passive: true}
  )

  tryInitialize()
})()
