'use strict'


/*
  Developer notes

  Renders the Full Atelier navigation rail/strip and status badges. Navigation is
  deliberately separate from workspace content so changing a control does not rebuild
  unrelated pages or lose scroll/open state.
*/
/*
    Atelier Navigation

    Builds the small primary workspace rail and the optional secondary tool
    tabs. The shell owns where these elements are mounted; this module only
    knows how navigation should look and how clicks change workspace state.
*/

;(() => {
  const Atelier = window.ClankAtelier
  const Router = Atelier.WorkspaceRouter
  const {createElement} = Atelier.PanelUI

  const translate = value => Atelier.I18n?.t?.(value) || value

  function createPrimaryButton(id, config) {
    const active = Router.getActive().workspace === id
    const button = createElement('button', 'furina-primary-nav-button')
    button.type = 'button'
    button.dataset.workspace = id
    button.classList.toggle('furina-primary-nav-button-active', active)
    button.setAttribute('aria-current', active ? 'page' : 'false')
    button.setAttribute('aria-label', translate(config.label))

    const icon = createElement('span', 'furina-primary-nav-icon', config.icon)
    icon.setAttribute('aria-hidden', 'true')

    const label = createElement(
      'span',
      'furina-primary-nav-label',
      translate(config.label)
    )

    const badgeData = Router.getBadge(id)
    const badge = createElement(
      'span',
      'furina-primary-nav-badge',
      badgeData?.text || ''
    )

    if (badgeData) {
      badge.title = translate(badgeData.label)
      badge.setAttribute('aria-label', translate(badgeData.label))
    } else {
      badge.hidden = true
      badge.setAttribute('aria-hidden', 'true')
    }

    button.append(icon, label, badge)
    button.addEventListener('click', () => {
      Atelier.PanelShell?.navigate?.(id)
    })

    return button
  }

  function renderPrimary(host) {
    if (!host) {
      return
    }

    host.replaceChildren()

    for (const [id, config] of Object.entries(Router.WORKSPACES)) {
      host.appendChild(createPrimaryButton(id, config))
    }
  }

  function renderSecondary(host) {
    if (!host) {
      return
    }

    host.replaceChildren()

    const active = Router.getActive()
    const tools = active.config.tools || []

    host.hidden = tools.length === 0

    if (!tools.length) {
      return
    }

    for (const tool of tools) {
      const selected = tool.id === active.tool
      const button = createElement(
        'button',
        'furina-secondary-nav-button',
        translate(tool.label)
      )
      button.type = 'button'
      button.dataset.tool = tool.id
      button.classList.toggle('furina-secondary-nav-button-active', selected)
      button.setAttribute('aria-selected', String(selected))

      button.addEventListener('click', () => {
        Atelier.PanelShell?.navigate?.(active.workspace, tool.id)
      })

      host.appendChild(button)
    }
  }

  Atelier.PanelNavigation = {
    renderPrimary,
    renderSecondary
  }
})()
