'use strict'


/*
  Developer notes

  Guide Modal is a Furina module. Keep its public API small, sanitize persistent/user data at
  the module boundary and clean up any DOM/listeners it owns when the relevant route or
  conversation changes.
*/
/*
    Furina Guidebook Modal

    Builds and renders the Guidebook interface using Furina-owned DOM.
    Guide text is supplied by GuideContent, while behavior belongs to
    GuideManager.
*/
;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  let root = null

  let navigation = null

  let article = null

  let pageIndicator = null

  let previousButton = null

  let nextButton = null

  function element(tag, className = '', text = '') {
    const node = document.createElement(tag)

    if (className) {
      node.className = className
    }

    if (text) {
      node.textContent = text
    }

    return node
  }

  function renderCards(section) {
    const grid = element('div', 'furina-guidebook-card-grid')

    section.items?.forEach(item => {
      const card = element('article', 'furina-guidebook-feature-card')

      const icon = element('span', 'furina-guidebook-feature-icon', item.icon)

      icon.setAttribute('aria-hidden', 'true')

      const copy = element('div', 'furina-guidebook-feature-copy')

      copy.append(element('h3', '', item.title), element('p', '', item.body))

      card.append(icon, copy)

      grid.appendChild(card)
    })

    return grid
  }

  function renderHeading(section) {
    const block = element('section', 'furina-guidebook-section')

    block.append(
      element('h2', '', section.title),
      element('p', '', section.body)
    )

    return block
  }

  function renderSteps(section) {
    const list = element('div', 'furina-guidebook-steps')

    section.items?.forEach(item => {
      const step = element('article', 'furina-guidebook-step')

      const number = element(
        'span',
        'furina-guidebook-step-number',
        item.number
      )

      const copy = element('div', 'furina-guidebook-step-copy')

      copy.append(element('h3', '', item.title), element('p', '', item.body))

      step.append(number, copy)

      list.appendChild(step)
    })

    return list
  }

  function renderCallout(section) {
    const callout = element(
      'aside',
      [
        'furina-guidebook-callout',
        `furina-guidebook-callout-${section.tone || section.type}`
      ].join(' ')
    )

    const icon = element('span', 'furina-guidebook-callout-icon', section.icon)

    icon.setAttribute('aria-hidden', 'true')

    const copy = element('div', 'furina-guidebook-callout-copy')

    copy.append(
      element('h3', '', section.title),
      element('p', '', section.body)
    )

    callout.append(icon, copy)

    return callout
  }

  function renderSection(section) {
    switch (section.type) {
      case 'cards':
        return renderCards(section)

      case 'steps':
        return renderSteps(section)

      case 'note':
      case 'tip':
        return renderCallout(section)

      case 'heading':
      default:
        return renderHeading(section)
    }
  }

  function renderActions(page, manager) {
    const locale = manager.getLocale()

    const panel = element('section', 'furina-guidebook-action-panel')

    panel.appendChild(
      element(
        'div',
        'furina-guidebook-action-heading',
        locale?.actionsLabel || 'Open a Furina tool'
      )
    )

    const grid = element('div', 'furina-guidebook-action-grid')

    page.actions?.forEach(action => {
      const button = element('button', 'furina-guidebook-action-button')

      button.type = 'button'

      const icon = element(
        'span',
        'furina-guidebook-action-icon',
        action.icon || '→'
      )

      icon.setAttribute('aria-hidden', 'true')

      const copy = element('span', 'furina-guidebook-action-copy')

      copy.append(
        element('strong', '', action.label),
        element('small', '', action.description || 'Open this tool')
      )

      const arrow = element('span', 'furina-guidebook-action-arrow', '→')

      arrow.setAttribute('aria-hidden', 'true')

      button.append(icon, copy, arrow)

      button.addEventListener('click', () => {
        manager.openTool(action.workspace, action.tool || null)
      })

      grid.appendChild(button)
    })

    panel.appendChild(grid)

    return panel
  }

  function renderNavigation(manager) {
    navigation.replaceChildren()

    manager.getPages().forEach(page => {
      const button = element('button', 'furina-guidebook-nav-button')

      button.type = 'button'

      button.dataset.pageId = page.id

      button.classList.toggle(
        'furina-guidebook-nav-active',
        page.id === manager.currentPageId
      )

      button.setAttribute(
        'aria-current',
        page.id === manager.currentPageId ? 'page' : 'false'
      )

      const icon = element('span', 'furina-guidebook-nav-icon', page.icon)

      icon.setAttribute('aria-hidden', 'true')

      button.append(
        icon,
        element('span', 'furina-guidebook-nav-label', page.navLabel)
      )

      button.addEventListener('click', () => {
        manager.setPage(page.id)
      })

      navigation.appendChild(button)
    })
  }

  function render(manager) {
    if (!root || !article) {
      return
    }

    const locale = manager.getLocale()

    const page = manager.getPage()

    const pages = manager.getPages()

    const index = manager.getCurrentIndex()

    if (!locale || !page) {
      return
    }

    renderNavigation(manager)

    const hero = element('header', 'furina-guidebook-page-hero')

    hero.append(
      element('div', 'furina-guidebook-page-eyebrow', page.eyebrow),
      element('h1', 'furina-guidebook-page-title', page.title),
      element('p', 'furina-guidebook-page-summary', page.summary)
    )

    const body = element('div', 'furina-guidebook-page-body')

    page.sections?.forEach(section => {
      body.appendChild(renderSection(section))
    })

    if (Array.isArray(page.actions) && page.actions.length) {
      body.appendChild(renderActions(page, manager))
    }

    article.replaceChildren(hero, body)

    article.scrollTop = 0

    pageIndicator.textContent = `${locale.pageLabel} ${index + 1} / ${pages.length}`

    previousButton.textContent = locale.previousLabel

    previousButton.disabled = index <= 0

    const isFinalPage = index === pages.length - 1

    nextButton.textContent = isFinalPage ? locale.doneLabel : locale.nextLabel

    nextButton.dataset.final = String(isFinalPage)
  }

  function build(manager) {
    root = element('div', 'furina-guidebook')

    root.id = 'furina-guidebook'

    root.dataset.furinaOwned = 'true'

    root.setAttribute('aria-hidden', 'true')

    const backdrop = element('div', 'furina-guidebook-backdrop')

    const orbOne = element(
      'span',
      'furina-guidebook-orb furina-guidebook-orb-one'
    )

    const orbTwo = element(
      'span',
      'furina-guidebook-orb furina-guidebook-orb-two'
    )

    orbOne.setAttribute('aria-hidden', 'true')

    orbTwo.setAttribute('aria-hidden', 'true')

    const dialog = element('section', 'furina-guidebook-dialog')

    dialog.setAttribute('role', 'dialog')

    dialog.setAttribute('aria-modal', 'true')

    dialog.setAttribute('aria-labelledby', 'furina-guidebook-title')

    const header = element('header', 'furina-guidebook-header')

    const brand = element('div', 'furina-guidebook-brand')

    const brandMark = element('span', 'furina-guidebook-brand-mark', '✦')

    brandMark.setAttribute('aria-hidden', 'true')

    const brandCopy = element('div', 'furina-guidebook-brand-copy')

    const locale = manager.getLocale()

    const title = element(
      'div',
      'furina-guidebook-title',
      locale?.title || 'Furina Guidebook'
    )

    title.id = 'furina-guidebook-title'

    brandCopy.append(
      title,
      element(
        'div',
        'furina-guidebook-subtitle',
        locale?.subtitle || 'Director, Memory & Story Tools'
      )
    )

    brand.append(brandMark, brandCopy)

    const close = element('button', 'furina-guidebook-close', '×')

    close.type = 'button'

    close.title = locale?.closeLabel || 'Close Guidebook'

    close.setAttribute('aria-label', locale?.closeLabel || 'Close Guidebook')

    close.addEventListener('click', () => manager.close())

    header.append(brand, close)

    const layout = element('div', 'furina-guidebook-layout')

    const sidebar = element('aside', 'furina-guidebook-sidebar')

    navigation = element('nav', 'furina-guidebook-navigation')

    navigation.setAttribute('aria-label', 'Guidebook pages')

    sidebar.appendChild(navigation)

    article = element('article', 'furina-guidebook-article')

    article.setAttribute('tabindex', '-1')

    layout.append(sidebar, article)

    const footer = element('footer', 'furina-guidebook-footer')

    pageIndicator = element('div', 'furina-guidebook-page-indicator')

    const controls = element('div', 'furina-guidebook-footer-controls')

    previousButton = element('button', 'furina-guidebook-footer-button')

    previousButton.type = 'button'

    previousButton.addEventListener('click', () => manager.move(-1))

    nextButton = element(
      'button',
      'furina-guidebook-footer-button furina-guidebook-footer-primary'
    )

    nextButton.type = 'button'

    nextButton.addEventListener('click', () => {
      if (nextButton.dataset.final === 'true') {
        manager.close()
      } else {
        manager.move(1)
      }
    })

    controls.append(previousButton, nextButton)

    footer.append(pageIndicator, controls)

    dialog.append(header, layout, footer)

    root.append(backdrop, orbOne, orbTwo, dialog)

    root.addEventListener('mousedown', event => {
      if (event.target === root || event.target === backdrop) {
        manager.close()
      }
    })

    document.body.appendChild(root)

    Atelier.I18n?.observeRoot?.(root)

    render(manager)

    return root
  }

  Atelier.GuideModal = {
    ensure(manager) {
      if (root?.isConnected) {
        return root
      }

      return build(manager)
    },

    render,

    getRoot() {
      return root
    }
  }
})()
