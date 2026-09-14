'use strict'


/*
  Developer notes

  Interfaces workspace builder. It assembles existing section/manager state into one
  workspace view and should avoid owning long-lived feature data itself.
*/
/*
    Interfaces Workspace

    Alternate interfaces are intentionally separated from Furina's everyday
    tools. They can replace how a conversation is presented without becoming
    part of the normal chat-customization workflow.
*/
;(() => {
  const Atelier = window.ClankAtelier
  const {createElement} = Atelier.PanelUI

  function createInterfaceCard({
    badge,
    title,
    description,
    meta,
    className = '',
    onLaunch
  }) {
    const card = createElement(
      'article',
      `furina-interface-card ${className}`.trim()
    )

    const visual = createElement('div', 'furina-interface-card-visual')

    visual.setAttribute('aria-hidden', 'true')

    visual.append(
      createElement('span', 'furina-interface-card-mark', badge),
      createElement('span', 'furina-interface-card-slash', '//')
    )

    const copy = createElement('div', 'furina-interface-card-copy')

    copy.append(
      createElement(
        'div',
        'furina-interface-card-kicker',
        'ALTERNATE INTERFACE'
      ),
      createElement('h3', 'furina-interface-card-title', title),
      createElement('p', 'furina-interface-card-description', description),
      createElement('div', 'furina-interface-card-meta', meta)
    )

    const launch = createElement(
      'button',
      'furina-primary-button furina-interface-launch',
      'Launch'
    )

    launch.type = 'button'

    launch.addEventListener('click', () => {
      onLaunch?.()
    })

    card.append(visual, copy, launch)

    return card
  }

  function createInterfacesWorkspace() {
    const root = createElement('div', 'furina-interfaces-workspace')

    const intro = createElement('div', 'furina-interfaces-intro')

    intro.append(
      createElement('div', 'furina-interfaces-intro-kicker', 'EXPERIMENTAL'),
      createElement(
        'p',
        'furina-interfaces-intro-copy',
        "Interfaces temporarily change how you experience the current Clank conversation. Furina's normal chat remains underneath and returns when the interface closes."
      )
    )

    const gallery = createElement('div', 'furina-interface-gallery')

    gallery.appendChild(
      createInterfaceCard({
        badge: 'P!',
        title: 'Phantom Chat',
        description:
          'A kinetic, comic-inspired alternate chat presentation with animated message staging and a built-in composer.',
        meta: 'Experimental · Current conversation',
        className: 'furina-interface-card-phantom',
        onLaunch: () => {
          /*
                        Alternate interfaces take over the conversation view.

                        Close Furina's normal panel first so the panel does not sit
                        above the interface during its opening animation.
                    */

          Atelier.PanelShell?.close?.()

          window.setTimeout(() => {
            Atelier.PhantomChat?.open?.()
          }, 220)
        }
      })
    )

    gallery.appendChild(
      createInterfaceCard({
        badge: 'VN',
        title: 'Visual Novel',
        description:
          'A story-focused interface that will present the current conversation as narration, speaker beats, portraits, and visual-novel-style dialogue.',
        meta: 'Experimental · Current conversation',
        className: 'furina-interface-card-visual-novel',
        onLaunch: () => {
          Atelier.PanelShell?.close?.()

          window.setTimeout(() => {
            Atelier.VisualNovel?.open?.()
          }, 220)
        }
      })
    )

    const future = createElement('div', 'furina-interface-future')

    future.append(
      createElement('span', 'furina-interface-future-mark', '+'),
      createElement('div', '', 'More interfaces can live here later.')
    )

    root.append(intro, gallery, future)

    return root
  }

  Atelier.InterfacesWorkspace = {
    create: createInterfacesWorkspace
  }
})()
