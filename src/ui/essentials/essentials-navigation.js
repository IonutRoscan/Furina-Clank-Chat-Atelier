'use strict'

/*
  Developer notes

  Renders the compact Essentials navigation bar and asks EssentialsRouter to change the
  active workspace. It should remain presentation-only; saved navigation lives in the
  router.
*/
;(() => {
  const Atelier = window.ClankAtelier
  const Router = Atelier.EssentialsRouter
  const {createElement} = Atelier.PanelUI

  const translate = value => Atelier.I18n?.t?.(value) || value

  function renderPrimary(host) {
    if (!host) return
    host.replaceChildren()

    for (const [id, config] of Object.entries(Router.WORKSPACES)) {
      const active = Router.getActive().workspace === id
      const button = createElement(
        'button',
        'furina-primary-nav-button furina-essentials-nav-button'
      )
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
        badge.title = badgeData.label
      } else {
        badge.hidden = true
      }

      button.append(icon, label, badge)
      button.addEventListener('click', () => Atelier.PanelShell?.navigate?.(id))
      host.appendChild(button)
    }
  }

  function renderSecondary(host) {
    if (!host) return
    host.replaceChildren()
    host.hidden = true
  }

  Atelier.EssentialsNavigation = {
    renderPrimary,
    renderSecondary
  }
})()
