'use strict'


/*
  Developer notes

  Stickers panel section. This module builds controls and wires user actions to the
  owning feature manager. It should not become a second persistence layer: validation,
  defaults and saved state belong to that manager.
*/
/*
    Sticker Panel Section

    Renders active sticker controls, saved layouts, and reusable sticker packs.
*/
;(() => {
  const Atelier = window.ClankAtelier
  const UI = Atelier.PanelUI
  const State = Atelier.PanelState
  const Sections = Atelier.PanelSections

  const {
    createElement,
    createRangeControl,
    createTextControl,
    createSelectControl,
    createColorControl,
    createSection
  } = UI

  // Stickers

  function createStickerSection() {
    const section = createSection('Stickers', {
      collapsed: true
    })

    const manager = Atelier.StickerManager

    if (!manager) {
      const unavailable = createElement(
        'div',
        'furina-sticker-empty',
        'Sticker engine unavailable.'
      )

      section.furinaContent.appendChild(unavailable)

      return section
    }

    const intro = createElement(
      'div',
      'furina-sticker-help',
      'Add an image or GIF, then drag or resize it directly in the chat while Furina is open.'
    )

    const addRow = createElement('div', 'furina-sticker-add')

    const input = document.createElement('input')

    input.type = 'text'

    input.className = 'furina-text-input'

    input.maxLength = 2048

    input.placeholder = 'https://example.com/sticker.png or .gif'

    const addButton = createElement(
      'button',
      'furina-secondary-button',
      'Add sticker'
    )

    addButton.type = 'button'

    const status = createElement('div', 'furina-sticker-status')

    async function addSticker() {
      const url = input.value.trim()

      if (!url) {
        return
      }

      const sticker = await manager.add(url)

      if (!sticker) {
        status.textContent = 'Enter a valid http or https image URL.'

        return
      }

      input.value = ''

      Atelier.PanelShell.rebuild()
    }

    addButton.addEventListener('click', addSticker)

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        addSticker()
      }
    })

    addRow.append(input, addButton)

    section.furinaContent.append(intro, addRow, status)

    // Sticker library

    const libraryArea = createElement('div', 'furina-library-area')

    const libraryTitle = createElement(
      'div',
      'furina-sticker-group-label',
      'Sticker Library'
    )

    const libraryHelp = createElement(
      'div',
      'furina-library-help',
      'Create your own packs and reuse saved stickers in any conversation.'
    )

    const createPackRow = createElement('div', 'furina-layout-save-row')

    const packName = document.createElement('input')

    packName.type = 'text'

    packName.maxLength = 80

    packName.className = 'furina-text-input'

    packName.placeholder = 'New pack name'

    const createPackButton = createElement(
      'button',
      'furina-secondary-button',
      'Create'
    )

    createPackButton.type = 'button'

    const libraryStatus = createElement('div', 'furina-sticker-status')

    async function createLibraryPack() {
      const name = packName.value.trim()

      if (!name) {
        libraryStatus.textContent = 'Give the pack a name first.'

        return
      }

      const pack = await manager.createPack(name)

      if (!pack) {
        libraryStatus.textContent = 'Could not create pack.'

        return
      }

      packName.value = ''

      Atelier.PanelShell.rebuild()
    }

    createPackButton.addEventListener('click', createLibraryPack)

    packName.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        createLibraryPack()
      }
    })

    createPackRow.append(packName, createPackButton)

    libraryArea.append(libraryTitle, libraryHelp, createPackRow, libraryStatus)

    const packList = createElement('div', 'furina-pack-list')

    if (manager.libraryPacks.length === 0) {
      const emptyLibrary = createElement(
        'div',
        'furina-sticker-empty',
        'No sticker packs yet.'
      )

      packList.appendChild(emptyLibrary)
    }

    manager.libraryPacks.forEach(pack => {
      const packCard = createElement('div', 'furina-pack-card')

      const packHeader = createElement('div', 'furina-pack-header')

      const packInfo = createElement('div', 'furina-pack-info')

      const packTitle = createElement('div', 'furina-pack-name', pack.name)

      const packCount = createElement(
        'div',
        'furina-pack-count',
        `${pack.stickers.length} sticker${
          pack.stickers.length === 1 ? '' : 's'
        }`
      )

      packInfo.append(packTitle, packCount)

      const packActions = createElement('div', 'furina-pack-header-actions')

      const renamePack = createElement(
        'button',
        'furina-library-mini-button',
        'Rename'
      )

      const deletePack = createElement(
        'button',
        'furina-library-mini-button furina-library-delete',
        'Delete'
      )

      renamePack.type = 'button'

      deletePack.type = 'button'

      renamePack.addEventListener('click', async () => {
        const name = Atelier.I18n.prompt('Rename sticker pack:', pack.name)

        if (name === null) {
          return
        }

        await manager.renamePack(pack.id, name)

        Atelier.PanelShell.rebuild()
      })

      deletePack.addEventListener('click', async () => {
        const message = pack.stickers.length
          ? `Delete "${pack.name}" and its ${pack.stickers.length} saved sticker(s)?`
          : `Delete "${pack.name}"?`

        if (!Atelier.I18n.confirm(message)) {
          return
        }

        await manager.deletePack(pack.id)

        Atelier.PanelShell.rebuild()
      })

      packActions.append(renamePack, deletePack)

      packHeader.append(packInfo, packActions)

      const saveSelected = createElement(
        'button',
        'furina-secondary-button furina-save-selected',
        'Save selected sticker'
      )

      saveSelected.type = 'button'

      saveSelected.disabled = !manager.selectedStickerId

      saveSelected.addEventListener('click', async () => {
        const selected = manager.stickers.find(
          sticker => sticker.id === manager.selectedStickerId
        )

        if (!selected) {
          Atelier.I18n.alert('Select a sticker in the conversation first.')

          return
        }

        const name = Atelier.I18n.prompt('Name this saved sticker:', 'Sticker')

        if (name === null) {
          return
        }

        const saved = await manager.saveStickerToPack(
          pack.id,
          selected.id,
          name
        )

        if (!saved) {
          return
        }

        Atelier.PanelShell.rebuild()
      })

      const libraryStickerList = createElement(
        'div',
        'furina-library-sticker-list'
      )

      if (pack.stickers.length === 0) {
        const emptyPack = createElement(
          'div',
          'furina-library-pack-empty',
          'This pack is empty.'
        )

        libraryStickerList.appendChild(emptyPack)
      }

      pack.stickers.forEach(librarySticker => {
        const item = createElement('div', 'furina-library-sticker')

        const preview = document.createElement('img')

        preview.className = 'furina-library-preview'

        preview.src = librarySticker.url

        preview.alt = ''

        preview.referrerPolicy = 'no-referrer'

        const name = createElement(
          'div',
          'furina-library-sticker-name',
          librarySticker.name
        )

        const actions = createElement('div', 'furina-library-sticker-actions')

        const add = createElement('button', 'furina-library-mini-button', 'Add')

        const rename = createElement(
          'button',
          'furina-library-mini-button',
          'Rename'
        )

        const remove = createElement(
          'button',
          'furina-library-mini-button furina-library-delete',
          '×'
        )

        add.type = 'button'

        rename.type = 'button'

        remove.type = 'button'

        add.title = 'Add to this conversation'

        rename.title = 'Rename saved sticker'

        remove.title = 'Delete saved sticker'

        add.addEventListener('click', async () => {
          await manager.addLibrarySticker(pack.id, librarySticker.id)

          Atelier.PanelShell.rebuild()
        })

        rename.addEventListener('click', async () => {
          const nextName = Atelier.I18n.prompt(
            'Rename saved sticker:',
            librarySticker.name
          )

          if (nextName === null) {
            return
          }

          await manager.renameLibrarySticker(
            pack.id,
            librarySticker.id,
            nextName
          )

          Atelier.PanelShell.rebuild()
        })

        remove.addEventListener('click', async () => {
          if (
            !Atelier.I18n.confirm(
              `Delete "${librarySticker.name}" from this pack?`
            )
          ) {
            return
          }

          await manager.deleteLibrarySticker(pack.id, librarySticker.id)

          Atelier.PanelShell.rebuild()
        })

        actions.append(add, rename, remove)

        item.append(preview, name, actions)

        libraryStickerList.appendChild(item)
      })

      packCard.append(packHeader, saveSelected, libraryStickerList)

      packList.appendChild(packCard)
    })

    libraryArea.appendChild(packList)

    section.furinaContent.appendChild(libraryArea)

    // Saved layouts

    const layoutArea = createElement('div', 'furina-layout-area')

    const layoutTitle = createElement(
      'div',
      'furina-sticker-group-label',
      'Saved Layouts'
    )

    const layoutSaveRow = createElement('div', 'furina-layout-save-row')

    const layoutName = document.createElement('input')

    layoutName.type = 'text'

    layoutName.maxLength = 80

    layoutName.className = 'furina-text-input'

    layoutName.placeholder = 'Layout name'

    const saveLayout = createElement(
      'button',
      'furina-secondary-button',
      'Save'
    )

    saveLayout.type = 'button'

    const layoutStatus = createElement('div', 'furina-sticker-status')

    async function saveCurrentLayout() {
      const name = layoutName.value.trim()

      if (!name) {
        layoutStatus.textContent = 'Give the layout a name first.'

        return
      }

      if (manager.stickers.length === 0) {
        layoutStatus.textContent = 'Add at least one sticker first.'

        return
      }

      const layout = await manager.saveCurrentLayout(name)

      if (!layout) {
        layoutStatus.textContent = 'Could not save layout.'

        return
      }

      layoutName.value = ''

      Atelier.PanelShell.rebuild()
    }

    saveLayout.addEventListener('click', saveCurrentLayout)

    layoutName.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        saveCurrentLayout()
      }
    })

    layoutSaveRow.append(layoutName, saveLayout)

    layoutArea.append(layoutTitle, layoutSaveRow, layoutStatus)

    const savedLayouts = createElement('div', 'furina-layout-list')

    if (manager.layouts.length === 0) {
      const emptyLayouts = createElement(
        'div',
        'furina-sticker-empty',
        'No saved layouts yet.'
      )

      savedLayouts.appendChild(emptyLayouts)
    }

    manager.layouts.forEach(layout => {
      const layoutCard = createElement('div', 'furina-layout-card')

      const info = createElement('div', 'furina-layout-info')

      const name = createElement('div', 'furina-layout-name', layout.name)

      const count = createElement(
        'div',
        'furina-layout-count',
        `${layout.stickers?.length || 0} sticker${
          layout.stickers?.length === 1 ? '' : 's'
        }`
      )

      info.append(name, count)

      const actions = createElement('div', 'furina-layout-actions')

      const apply = createElement('button', 'furina-sticker-action', 'Apply')

      const removeLayout = createElement(
        'button',
        'furina-sticker-action furina-layout-delete',
        'Delete'
      )

      apply.type = 'button'

      removeLayout.type = 'button'

      apply.addEventListener('click', async () => {
        const shouldApply =
          manager.stickers.length === 0 ||
          Atelier.I18n.confirm(
            "Replace this conversation's current stickers with this saved layout?"
          )

        if (!shouldApply) {
          return
        }

        await manager.applyLayout(layout.id)

        Atelier.PanelShell.rebuild()
      })

      removeLayout.addEventListener('click', async () => {
        const shouldDelete = Atelier.I18n.confirm(
          `Delete the saved layout "${layout.name}"?`
        )

        if (!shouldDelete) {
          return
        }

        await manager.deleteLayout(layout.id)

        Atelier.PanelShell.rebuild()
      })

      actions.append(apply, removeLayout)

      layoutCard.append(info, actions)

      savedLayouts.appendChild(layoutCard)
    })

    layoutArea.appendChild(savedLayouts)

    const clearStickers = createElement(
      'button',
      'furina-danger-button furina-clear-stickers',
      'Clear current stickers'
    )

    clearStickers.type = 'button'

    clearStickers.disabled = manager.stickers.length === 0

    clearStickers.addEventListener('click', async () => {
      if (manager.stickers.length === 0) {
        return
      }

      const confirmed = Atelier.I18n.confirm(
        'Remove all stickers from this conversation?'
      )

      if (!confirmed) {
        return
      }

      await manager.clearCurrentStickers()

      Atelier.PanelShell.rebuild()
    })

    section.furinaContent.appendChild(clearStickers)

    section.furinaContent.appendChild(layoutArea)

    const list = createElement('div', 'furina-sticker-list')

    if (manager.stickers.length === 0) {
      const empty = createElement(
        'div',
        'furina-sticker-empty',
        'No stickers in this conversation yet.'
      )

      list.appendChild(empty)
    }

    manager.stickers.forEach((sticker, index) => {
      const card = createElement('div', 'furina-sticker-card')

      card.dataset.stickerId = sticker.id

      card.classList.toggle(
        'furina-sticker-card-selected',
        manager.selectedStickerId === sticker.id
      )

      card.addEventListener('click', event => {
        if (event.target.closest('button, input')) {
          return
        }

        manager.select(sticker.id)

        document
          .querySelectorAll('.furina-sticker-card-selected')
          .forEach(element => {
            element.classList.remove('furina-sticker-card-selected')
          })

        card.classList.add('furina-sticker-card-selected')
      })

      const header = createElement('div', 'furina-sticker-card-header')

      const preview = document.createElement('img')

      preview.className = 'furina-sticker-preview'

      preview.src = sticker.url

      preview.alt = ''

      preview.referrerPolicy = 'no-referrer'

      const name = createElement(
        'div',
        'furina-sticker-card-name',
        `Sticker ${index + 1}`
      )

      const remove = createElement('button', 'furina-sticker-delete', '×')

      remove.type = 'button'

      remove.title = 'Delete sticker'

      remove.addEventListener('click', async () => {
        await manager.remove(sticker.id)

        Atelier.PanelShell.rebuild()
      })

      header.append(preview, name, remove)

      const opacityHeader = createElement('div', 'furina-control-header')

      const opacityLabel = createElement(
        'span',
        'furina-control-label',
        'Opacity'
      )

      const opacityValue = createElement(
        'span',
        'furina-control-value',
        `${Math.round(sticker.opacity * 100)}%`
      )

      opacityHeader.append(opacityLabel, opacityValue)

      const opacity = document.createElement('input')

      opacity.type = 'range'

      opacity.className = 'furina-range'

      opacity.min = '0.1'

      opacity.max = '1'

      opacity.step = '0.05'

      opacity.value = String(sticker.opacity)

      opacity.addEventListener('input', () => {
        opacityValue.textContent = `${Math.round(Number(opacity.value) * 100)}%`

        const liveSticker = manager.getStickerElement(sticker.id)

        if (liveSticker) {
          liveSticker.style.opacity = opacity.value
        }
      })

      opacity.addEventListener('change', async () => {
        await manager.update(sticker.id, {
          opacity: Number(opacity.value)
        })
      })

      const rotationHeader = createElement('div', 'furina-control-header')

      const rotationLabel = createElement(
        'span',
        'furina-control-label',
        'Rotation'
      )

      const rotationValue = createElement(
        'span',
        'furina-control-value',
        `${sticker.rotation}°`
      )

      rotationHeader.append(rotationLabel, rotationValue)

      const rotation = document.createElement('input')

      rotation.type = 'range'

      rotation.className = 'furina-range'

      rotation.min = '-180'

      rotation.max = '180'

      rotation.step = '1'

      rotation.value = String(sticker.rotation)

      rotation.addEventListener('input', () => {
        const value = Number(rotation.value)

        rotationValue.textContent = `${value}°`

        const liveSticker = manager.getStickerElement(sticker.id)

        if (liveSticker) {
          liveSticker.style.setProperty(
            '--furina-sticker-rotation',
            `${value}deg`
          )
        }
      })

      rotation.addEventListener('change', async () => {
        await manager.update(sticker.id, {
          rotation: Number(rotation.value)
        })
      })

      const placementLabel = createElement(
        'div',
        'furina-sticker-group-label',
        'Placement'
      )

      const placementActions = createElement('div', 'furina-sticker-actions')

      const chatAttached = createElement(
        'button',
        'furina-sticker-action',
        'Chat-attached'
      )

      const screenFixed = createElement(
        'button',
        'furina-sticker-action',
        'Screen-fixed'
      )

      chatAttached.type = 'button'

      screenFixed.type = 'button'

      chatAttached.classList.toggle(
        'furina-sticker-action-active',
        sticker.positionMode !== 'screen'
      )

      screenFixed.classList.toggle(
        'furina-sticker-action-active',
        sticker.positionMode === 'screen'
      )

      chatAttached.addEventListener('click', async () => {
        await manager.setPositionMode(sticker.id, 'chat')

        Atelier.PanelShell.rebuild()
      })

      screenFixed.addEventListener('click', async () => {
        await manager.setPositionMode(sticker.id, 'screen')

        Atelier.PanelShell.rebuild()
      })

      placementActions.append(chatAttached, screenFixed)

      const transformActions = createElement('div', 'furina-sticker-actions')

      const flipX = createElement('button', 'furina-sticker-action', '↔ Flip')

      const flipY = createElement('button', 'furina-sticker-action', '↕ Flip')

      flipX.type = 'button'

      flipY.type = 'button'

      flipX.classList.toggle('furina-sticker-action-active', sticker.flipX)

      flipY.classList.toggle('furina-sticker-action-active', sticker.flipY)

      flipX.addEventListener('click', async () => {
        await manager.update(sticker.id, {
          flipX: !sticker.flipX
        })

        Atelier.PanelShell.rebuild()
      })

      flipY.addEventListener('click', async () => {
        await manager.update(sticker.id, {
          flipY: !sticker.flipY
        })

        Atelier.PanelShell.rebuild()
      })

      transformActions.append(flipX, flipY)

      const layerActions = createElement('div', 'furina-sticker-actions')

      const backward = createElement(
        'button',
        'furina-sticker-action',
        'Send Back'
      )

      const forward = createElement(
        'button',
        'furina-sticker-action',
        'Bring Front'
      )

      backward.type = 'button'

      forward.type = 'button'

      backward.disabled = index === 0

      forward.disabled = index === manager.stickers.length - 1

      backward.addEventListener('click', async () => {
        await manager.moveBackward(sticker.id)

        Atelier.PanelShell.rebuild()
      })

      forward.addEventListener('click', async () => {
        await manager.moveForward(sticker.id)

        Atelier.PanelShell.rebuild()
      })

      layerActions.append(backward, forward)

      const objectActions = createElement('div', 'furina-sticker-actions')

      const duplicate = createElement(
        'button',
        'furina-sticker-action',
        'Duplicate'
      )

      const lock = createElement(
        'button',
        'furina-sticker-action',
        sticker.locked ? 'Unlock' : 'Lock'
      )

      duplicate.type = 'button'

      lock.type = 'button'

      lock.classList.toggle('furina-sticker-action-active', sticker.locked)

      duplicate.addEventListener('click', async () => {
        await manager.duplicate(sticker.id)

        Atelier.PanelShell.rebuild()
      })

      lock.addEventListener('click', async () => {
        await manager.toggleLock(sticker.id)

        Atelier.PanelShell.rebuild()
      })

      objectActions.append(duplicate, lock)

      card.append(
        header,

        opacityHeader,
        opacity,

        rotationHeader,
        rotation,

        placementLabel,
        placementActions,

        transformActions,
        layerActions,
        objectActions
      )

      list.appendChild(card)
    })

    section.furinaContent.appendChild(list)

    return section
  }

  Sections.createStickerSection = createStickerSection
})()
