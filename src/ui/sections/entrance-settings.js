'use strict'


/*
  Developer notes

  Entrance Settings panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Furina Entrance Settings

    Builds the Home workspace controls for the Grand Premiere
    and the shorter Encore.

    The visual card lives here so HomeWorkspace only needs to
    request and position it.
*/

window.ClankAtelier = window.ClankAtelier || {}
;(() => {
  const Atelier = window.ClankAtelier

  const {createElement} = Atelier.PanelUI

  function translate(text) {
    return Atelier.I18n?.t ? Atelier.I18n.t(text) : text
  }

  function createMiniCrest() {
    const crest = createElement('div', 'furina-entrance-settings-crest')

    crest.setAttribute('aria-hidden', 'true')

    crest.append(
      createElement(
        'span',
        'furina-entrance-settings-ring furina-entrance-settings-ring-outer'
      ),
      createElement(
        'span',
        'furina-entrance-settings-ring furina-entrance-settings-ring-inner'
      ),
      createElement('span', 'furina-entrance-settings-star', '✦')
    )

    return crest
  }

  function createEntranceSettings() {
    const manager = Atelier.EntranceManager

    const settings = manager?.getSettings?.() || {
      premiereRelease: null,
      encoreEnabled: true
    }

    const card = createElement('section', 'furina-entrance-settings-card')

    card.dataset.furinaOwned = 'true'

    // DECORATIVE BACKGROUND

    const decoration = createElement(
      'div',
      'furina-entrance-settings-decoration'
    )

    decoration.setAttribute('aria-hidden', 'true')

    decoration.append(
      createElement(
        'span',
        'furina-entrance-settings-orbit furina-entrance-settings-orbit-one'
      ),
      createElement(
        'span',
        'furina-entrance-settings-orbit furina-entrance-settings-orbit-two'
      ),
      createElement('span', 'furina-entrance-settings-shine')
    )

    // HEADER

    const header = createElement('div', 'furina-entrance-settings-header')

    const headingGroup = createElement(
      'div',
      'furina-entrance-settings-heading-group'
    )

    const kicker = createElement(
      'div',
      'furina-entrance-settings-kicker',
      translate('THE GRAND PREMIERE')
    )

    const title = createElement(
      'h3',
      'furina-entrance-settings-title',
      translate('Entrance Animations')
    )

    const description = createElement(
      'p',
      'furina-entrance-settings-description',
      translate(
        'Furina welcomes new users with a one-time cinematic premiere, followed by a shorter Encore on later visits.'
      )
    )

    headingGroup.append(kicker, title, description)

    const premiereStatus = createElement(
      'span',
      'furina-entrance-settings-status'
    )

    premiereStatus.setAttribute(
      'aria-label',
      translate('Grand Premiere status')
    )

    function updatePremiereStatus() {
      const current = manager?.getSettings?.() || settings

      const hasSeenPremiere = Boolean(current.premiereRelease)

      premiereStatus.textContent = hasSeenPremiere
        ? translate('Premiere seen')
        : translate('Premiere waiting')

      premiereStatus.classList.toggle('is-seen', hasSeenPremiere)

      premiereStatus.classList.toggle('is-waiting', !hasSeenPremiere)
    }

    updatePremiereStatus()

    header.append(createMiniCrest(), headingGroup, premiereStatus)

    // ENCORE TOGGLE

    const togglePanel = createElement(
      'div',
      'furina-entrance-settings-toggle-panel'
    )

    const toggleCopy = createElement(
      'div',
      'furina-entrance-settings-toggle-copy'
    )

    const toggleTitle = createElement(
      'div',
      'furina-entrance-settings-toggle-title',
      translate('Play the Encore')
    )

    const toggleDescription = createElement(
      'div',
      'furina-entrance-settings-toggle-description',
      translate(
        'Show a short welcome-back animation on later visits to the Clank home page.'
      )
    )

    toggleCopy.append(toggleTitle, toggleDescription)

    const toggleLabel = createElement(
      'label',
      'furina-entrance-settings-switch'
    )

    const toggle = document.createElement('input')

    toggle.type = 'checkbox'

    toggle.checked = settings.encoreEnabled !== false

    toggle.disabled = !manager

    toggle.setAttribute(
      'aria-label',
      translate('Play the Furina Encore on later visits')
    )

    const toggleTrack = createElement(
      'span',
      'furina-entrance-settings-switch-track'
    )

    const toggleThumb = createElement(
      'span',
      'furina-entrance-settings-switch-thumb'
    )

    const toggleIcon = createElement(
      'span',
      'furina-entrance-settings-switch-icon',
      '✦'
    )

    toggleIcon.setAttribute('aria-hidden', 'true')

    toggleThumb.appendChild(toggleIcon)

    toggleTrack.appendChild(toggleThumb)

    toggleLabel.append(toggle, toggleTrack)

    togglePanel.append(toggleCopy, toggleLabel)

    // LIVE FEEDBACK

    const feedback = createElement('div', 'furina-entrance-settings-feedback')

    feedback.setAttribute('role', 'status')

    feedback.setAttribute('aria-live', 'polite')

    let feedbackTimer = null

    function showFeedback(message, type = 'normal', duration = 2600) {
      window.clearTimeout(feedbackTimer)

      feedback.textContent = translate(message)

      feedback.classList.toggle('is-success', type === 'success')

      feedback.classList.toggle('is-warning', type === 'warning')

      feedback.classList.add('is-visible')

      feedbackTimer = window.setTimeout(() => {
        feedback.classList.remove('is-visible')
      }, duration)
    }

    toggle.addEventListener('change', async () => {
      if (!manager) {
        return
      }

      const requested = toggle.checked

      toggle.disabled = true

      try {
        const saved = await manager.setEncoreEnabled(requested)

        toggle.checked = saved

        showFeedback(
          saved ? 'The Encore is enabled.' : 'The Encore is disabled.',
          'success'
        )
      } catch (error) {
        console.warn(
          '[Clank Atelier] Could not update entrance setting:',
          error
        )

        toggle.checked = !requested

        showFeedback('The Encore setting could not be saved.', 'warning')
      } finally {
        toggle.disabled = false
      }
    })

    // PREVIEW ACTIONS

    const actions = createElement('div', 'furina-entrance-settings-actions')

    const premiereButton = createElement(
      'button',
      'furina-entrance-preview-button furina-entrance-preview-premiere'
    )

    premiereButton.type = 'button'

    premiereButton.disabled = !manager

    premiereButton.append(
      createElement('span', 'furina-entrance-preview-icon', '✦'),
      createElement('span', 'furina-entrance-preview-copy')
    )

    premiereButton
      .querySelector('.furina-entrance-preview-copy')
      .append(
        createElement('strong', '', translate('Replay Grand Premiere')),
        createElement(
          'small',
          '',
          translate('Preview the complete cinematic introduction.')
        )
      )

    const encoreButton = createElement(
      'button',
      'furina-entrance-preview-button furina-entrance-preview-encore'
    )

    encoreButton.type = 'button'

    encoreButton.disabled = !manager

    encoreButton.append(
      createElement('span', 'furina-entrance-preview-icon', '◌'),
      createElement('span', 'furina-entrance-preview-copy')
    )

    encoreButton
      .querySelector('.furina-entrance-preview-copy')
      .append(
        createElement('strong', '', translate('Preview Encore')),
        createElement(
          'small',
          '',
          translate('See the shorter welcome-back animation.')
        )
      )

    async function previewAnimation(type) {
      if (!manager) {
        showFeedback('The entrance manager is unavailable.', 'warning')

        return
      }

      premiereButton.disabled = true

      encoreButton.disabled = true

      let started = false

      try {
        if (type === 'premiere') {
          started = await manager.playPremiere({
            force: true
          })
        } else {
          started = await manager.playEncore({
            force: true
          })
        }

        if (!started) {
          showFeedback(
            'Another entrance animation is already playing.',
            'warning'
          )
        }
      } catch (error) {
        console.warn('[Clank Atelier] Entrance preview failed:', error)

        showFeedback('The animation preview could not be started.', 'warning')
      }

      window.setTimeout(
        () => {
          premiereButton.disabled = false

          encoreButton.disabled = false

          updatePremiereStatus()
        },
        started ? (type === 'premiere' ? 7600 : 2500) : 500
      )
    }

    premiereButton.addEventListener('click', () => {
      void previewAnimation('premiere')
    })

    encoreButton.addEventListener('click', () => {
      void previewAnimation('encore')
    })

    actions.append(premiereButton, encoreButton)

    // EXPLANATION

    const note = createElement('div', 'furina-entrance-settings-note')

    note.append(
      createElement('span', 'furina-entrance-settings-note-icon', '◇'),
      createElement(
        'span',
        '',
        translate(
          'The Grand Premiere plays automatically only once. Replaying it here does not reset or change that first-run status.'
        )
      )
    )

    if (!manager) {
      showFeedback('The entrance manager is unavailable.', 'warning', 10000)
    }

    card.append(decoration, header, togglePanel, actions, note, feedback)

    return card
  }

  Atelier.EntranceSettingsSection = {
    create: createEntranceSettings
  }
})()
