'use strict'


/*
  Developer notes

  Owns per-conversation sticker instances, transforms, locking/layering, the user
  sticker library and saved layouts. Sticker DOM is Furina-owned; persistence stores
  sanitized metadata rather than serializing live DOM nodes.
*/
/*
    Sticker Manager

    Owns conversation stickers, reusable sticker packs, and saved layouts. This module also handles drag/resize interactions while the Furina panel is in editing mode.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  // Sticker manager

  Atelier.StickerManager = {
    STORAGE_KEY: 'furina-conversation-stickers',

    LAYOUT_STORAGE_KEY: 'furina-sticker-layouts',

    LIBRARY_STORAGE_KEY: 'furina-sticker-library',

    conversationId: null,

    stickers: [],

    layouts: [],

    layoutsLoaded: false,

    libraryPacks: [],

    libraryLoaded: false,

    layer: null,

    fixedLayer: null,

    editing: false,

    selectedStickerId: null,

    MAX_STICKERS: 500,

    MAX_LAYOUTS: 100,

    MAX_PACKS: 100,

    MAX_PACK_STICKERS: 500,

    normalizeLabel(value, maxLength = 80) {
      return String(value || '')
        .trim()
        .slice(0, maxLength)
    },

    clampNumber(value, minimum, maximum, fallback) {
      const number = Number(value)

      if (!Number.isFinite(number)) {
        return fallback
      }

      return Math.max(minimum, Math.min(maximum, number))
    },

    sanitizeSticker(value, options = {}) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null
      }

      const url = String(value.url || '')
        .trim()
        .slice(0, 2048)

      if (!this.isSafeImageUrl(url)) {
        return null
      }

      const clean = {
        url,

        x: this.clampNumber(value.x, 0, 100, 50),

        y: this.clampNumber(value.y, 0, 100, 25),

        width: this.clampNumber(value.width, 48, 640, 160),

        opacity: this.clampNumber(value.opacity, 0.1, 1, 1),

        rotation: this.clampNumber(value.rotation, -180, 180, 0),

        flipX: Boolean(value.flipX),

        flipY: Boolean(value.flipY),

        locked: Boolean(value.locked),

        positionMode: value.positionMode === 'screen' ? 'screen' : 'chat'
      }

      if (options.withId !== false) {
        const rawId = this.normalizeLabel(value.id, 160)

        clean.id = rawId || this.createId()
      }

      return clean
    },

    sanitizeLibrarySticker(value) {
      const base = this.sanitizeSticker({
        ...value,
        x: 50,
        y: 25,
        locked: false
      })

      if (!base) {
        return null
      }

      return {
        id: base.id,

        name: this.normalizeLabel(value.name, 80) || 'Sticker',

        url: base.url,

        width: base.width,

        opacity: base.opacity,

        rotation: base.rotation,

        flipX: base.flipX,

        flipY: base.flipY,

        positionMode: base.positionMode
      }
    },

    sanitizePack(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null
      }

      const name = this.normalizeLabel(value.name, 80)

      if (!name) {
        return null
      }

      const stickers = Array.isArray(value.stickers)
        ? value.stickers
            .map(sticker => this.sanitizeLibrarySticker(sticker))
            .filter(Boolean)
            .slice(0, this.MAX_PACK_STICKERS)
        : []

      return {
        id: this.normalizeLabel(value.id, 160) || this.createId(),

        name,

        stickers
      }
    },

    sanitizeLayout(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null
      }

      const name = this.normalizeLabel(value.name, 80)

      if (!name) {
        return null
      }

      const stickers = Array.isArray(value.stickers)
        ? value.stickers
            .map(sticker =>
              this.sanitizeSticker(sticker, {
                withId: false
              })
            )
            .filter(Boolean)
            .slice(0, this.MAX_STICKERS)
        : []

      return {
        id: this.normalizeLabel(value.id, 160) || this.createId(),

        name,

        createdAt: Number.isFinite(value.createdAt)
          ? value.createdAt
          : Date.now(),

        stickers
      }
    },

    // Sticker library

    async loadLibrary() {
      if (this.libraryLoaded) {
        return
      }

      const stored = await Atelier.Storage.getArray(
        this.LIBRARY_STORAGE_KEY,
        []
      )

      this.libraryPacks = stored
        .map(pack => this.sanitizePack(pack))
        .filter(Boolean)
        .slice(0, this.MAX_PACKS)

      this.libraryLoaded = true
    },

    async saveLibrary() {
      this.libraryPacks = this.libraryPacks
        .map(pack => this.sanitizePack(pack))
        .filter(Boolean)
        .slice(0, this.MAX_PACKS)

      await Atelier.Storage.set(this.LIBRARY_STORAGE_KEY, this.libraryPacks)
    },

    async createPack(name) {
      const normalizedName = this.normalizeLabel(name, 80)

      if (!normalizedName || this.libraryPacks.length >= this.MAX_PACKS) {
        return null
      }

      const pack = {
        id: this.createId(),

        name: normalizedName,

        stickers: []
      }

      this.libraryPacks.push(pack)

      await this.saveLibrary()

      return pack
    },

    async renamePack(packId, name) {
      const normalizedName = this.normalizeLabel(name, 80)

      if (!normalizedName) {
        return false
      }

      const pack = this.libraryPacks.find(item => item.id === packId)

      if (!pack) {
        return false
      }

      pack.name = normalizedName

      await this.saveLibrary()

      return true
    },

    async deletePack(packId) {
      const next = this.libraryPacks.filter(pack => pack.id !== packId)

      if (next.length === this.libraryPacks.length) {
        return false
      }

      this.libraryPacks = next

      await this.saveLibrary()

      return true
    },

    async saveStickerToPack(packId, stickerId, name) {
      const pack = this.libraryPacks.find(item => item.id === packId)

      const sticker = this.stickers.find(item => item.id === stickerId)

      const normalizedName = this.normalizeLabel(name, 80)

      if (
        !pack ||
        !sticker ||
        !normalizedName ||
        pack.stickers.length >= this.MAX_PACK_STICKERS
      ) {
        return null
      }

      const savedSticker = {
        id: this.createId(),

        name: normalizedName,

        url: sticker.url,

        width: sticker.width,

        opacity: sticker.opacity,

        rotation: sticker.rotation,

        flipX: sticker.flipX,

        flipY: sticker.flipY,

        positionMode: sticker.positionMode === 'screen' ? 'screen' : 'chat'
      }

      pack.stickers.push(savedSticker)

      await this.saveLibrary()

      return savedSticker
    },

    async addLibrarySticker(packId, libraryStickerId) {
      if (!this.conversationId) {
        return null
      }

      const pack = this.libraryPacks.find(item => item.id === packId)

      if (!pack) {
        return null
      }

      const source = pack.stickers.find(
        sticker => sticker.id === libraryStickerId
      )

      if (!source || !this.isSafeImageUrl(source.url)) {
        return null
      }

      const sticker = {
        id: this.createId(),

        url: source.url,

        x: 50,

        y: 25,

        width: Number.isFinite(source.width) ? source.width : 160,

        opacity: Number.isFinite(source.opacity) ? source.opacity : 1,

        rotation: Number.isFinite(source.rotation) ? source.rotation : 0,

        flipX: Boolean(source.flipX),

        flipY: Boolean(source.flipY),

        locked: false,

        positionMode: source.positionMode === 'screen' ? 'screen' : 'chat'
      }

      this.stickers.push(sticker)

      this.selectedStickerId = sticker.id

      await this.save()

      this.render()

      return sticker
    },

    async renameLibrarySticker(packId, libraryStickerId, name) {
      const normalizedName = String(name || '').trim()

      if (!normalizedName) {
        return false
      }

      const pack = this.libraryPacks.find(item => item.id === packId)

      if (!pack) {
        return false
      }

      const sticker = pack.stickers.find(item => item.id === libraryStickerId)

      if (!sticker) {
        return false
      }

      sticker.name = normalizedName

      await this.saveLibrary()

      return true
    },

    async deleteLibrarySticker(packId, libraryStickerId) {
      const pack = this.libraryPacks.find(item => item.id === packId)

      if (!pack) {
        return false
      }

      const next = pack.stickers.filter(
        sticker => sticker.id !== libraryStickerId
      )

      if (next.length === pack.stickers.length) {
        return false
      }

      pack.stickers = next

      await this.saveLibrary()

      return true
    },

    // Saved sticker layouts

    async loadLayouts() {
      if (this.layoutsLoaded) {
        return
      }

      const stored = await Atelier.Storage.getArray(this.LAYOUT_STORAGE_KEY, [])

      this.layouts = stored
        .map(layout => this.sanitizeLayout(layout))
        .filter(Boolean)
        .slice(0, this.MAX_LAYOUTS)

      this.layoutsLoaded = true
    },

    async saveLayouts() {
      this.layouts = this.layouts
        .map(layout => this.sanitizeLayout(layout))
        .filter(Boolean)
        .slice(0, this.MAX_LAYOUTS)

      await Atelier.Storage.set(this.LAYOUT_STORAGE_KEY, this.layouts)
    },

    async saveCurrentLayout(name) {
      const normalizedName = this.normalizeLabel(name, 80)

      if (
        !normalizedName ||
        this.stickers.length === 0 ||
        this.layouts.length >= this.MAX_LAYOUTS
      ) {
        return null
      }

      const layout = {
        id: this.createId(),

        name: normalizedName,

        createdAt: Date.now(),

        stickers: this.stickers.map(sticker => {
          const {id, ...savedSticker} = sticker

          return {
            ...savedSticker
          }
        })
      }

      this.layouts.push(layout)

      await this.saveLayouts()

      return layout
    },

    async applyLayout(layoutId) {
      if (!this.conversationId) {
        return false
      }

      const layout = this.layouts.find(item => item.id === layoutId)

      if (!layout || !Array.isArray(layout.stickers)) {
        return false
      }

      this.selectedStickerId = null

      this.stickers = layout.stickers
        .map(sticker => {
          const clean = this.sanitizeSticker(sticker, {
            withId: false
          })

          if (!clean) {
            return null
          }

          return {
            ...clean,
            id: this.createId()
          }
        })
        .filter(Boolean)
        .slice(0, this.MAX_STICKERS)

      await this.save()

      this.render()

      return true
    },

    async deleteLayout(layoutId) {
      const next = this.layouts.filter(layout => layout.id !== layoutId)

      if (next.length === this.layouts.length) {
        return
      }

      this.layouts = next

      await this.saveLayouts()
    },

    async clearCurrentStickers() {
      if (!this.conversationId) {
        return
      }

      this.stickers = []

      this.selectedStickerId = null

      await this.save()

      this.render()
    },

    // Read the complete conversation → stickers map.
    async getStoredStickers() {
      return await Atelier.Storage.getObject(this.STORAGE_KEY, {})
    },

    async loadConversation(conversationId) {
      this.conversationId = conversationId

      this.selectedStickerId = null

      if (!conversationId) {
        this.stickers = []

        this.render()

        return
      }

      const stored = await this.getStoredStickers()

      if (this.conversationId !== conversationId) {
        return
      }

      const stickers = stored[conversationId]

      this.stickers = Array.isArray(stickers)
        ? stickers
            .map(sticker => this.sanitizeSticker(sticker))
            .filter(Boolean)
            .slice(0, this.MAX_STICKERS)
        : []

      this.render()
    },

    async save() {
      const conversationId = this.conversationId

      if (!conversationId) {
        return
      }

      /*
                Keep the existing sticker objects alive.

                The sticker elements in the chat have drag/resize handlers that
                reference these objects directly. Replacing them during save would
                leave the visible sticker connected to an outdated object.
            */
      const snapshot = []

      const retained = []

      this.stickers.slice(0, this.MAX_STICKERS).forEach(sticker => {
        const clean = this.sanitizeSticker(sticker)

        if (!clean) {
          return
        }

        /*
                            Apply sanitized values back onto the SAME object rather
                            than replacing the object itself.
                        */
        Object.assign(sticker, clean)

        retained.push(sticker)

        snapshot.push({
          ...clean
        })
      })

      /*
                Preserve the array as well, so anything currently referencing the
                sticker collection does not suddenly receive a different object.
            */
      this.stickers.splice(0, this.stickers.length, ...retained)

      await Atelier.Storage.updateObject(this.STORAGE_KEY, stored => {
        stored[conversationId] = snapshot.map(sticker => ({
          ...sticker
        }))

        return stored
      })
    },

    isSafeImageUrl(value) {
      if (typeof Atelier.isSafeHttpUrl === 'function') {
        return Atelier.isSafeHttpUrl(value)
      }

      try {
        const url = new URL(value)

        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch (error) {
        return false
      }
    },

    createId() {
      if (
        typeof globalThis.crypto !== 'undefined' &&
        typeof globalThis.crypto.randomUUID === 'function'
      ) {
        return globalThis.crypto.randomUUID()
      }

      return 'sticker-' + Date.now() + '-' + Math.random().toString(36).slice(2)
    },

    async add(url) {
      const normalized = String(url || '')
        .trim()
        .slice(0, 2048)

      if (
        !this.conversationId ||
        this.stickers.length >= this.MAX_STICKERS ||
        !this.isSafeImageUrl(normalized)
      ) {
        return null
      }

      const sticker = {
        id: this.createId(),

        url: normalized,

        x: 50,

        y: 25,

        width: 160,

        opacity: 1,

        rotation: 0,

        flipX: false,

        flipY: false,

        locked: false,

        positionMode: 'chat'
      }

      this.stickers.push(sticker)

      await this.save()

      this.render()

      return sticker
    },

    async remove(stickerId) {
      const next = this.stickers.filter(sticker => sticker.id !== stickerId)

      if (next.length === this.stickers.length) {
        return
      }

      this.stickers = next

      await this.save()

      this.render()
    },

    async update(stickerId, values, render = true) {
      const sticker = this.stickers.find(item => item.id === stickerId)

      if (!sticker) {
        return
      }

      const clean = this.sanitizeSticker({
        ...sticker,

        ...(values && typeof values === 'object' && !Array.isArray(values)
          ? values
          : {}),

        id: sticker.id
      })

      if (!clean) {
        return false
      }

      Object.assign(sticker, clean)

      await this.save()

      if (render) {
        this.render()
      }

      return true
    },

    getLayers() {
      return [this.layer, this.fixedLayer].filter(
        layer => layer instanceof HTMLElement
      )
    },

    getStickerElement(stickerId) {
      for (const layer of this.getLayers()) {
        const element = Array.from(
          layer.querySelectorAll('.furina-sticker')
        ).find(candidate => candidate.dataset.stickerId === String(stickerId))

        if (element) {
          return element
        }
      }

      return null
    },

    getLayerForMode(mode) {
      return mode === 'screen' ? this.fixedLayer : this.layer
    },

    select(stickerId) {
      this.selectedStickerId = stickerId

      for (const layer of this.getLayers()) {
        layer.querySelectorAll('.furina-sticker').forEach(element => {
          element.classList.toggle(
            'furina-sticker-selected',
            element.dataset.stickerId === stickerId
          )
        })
      }

      document.querySelectorAll('.furina-save-selected').forEach(button => {
        button.disabled = !stickerId
      })

      /*
                Keep the panel card visually synchronized when a sticker
                is selected directly on the canvas.
            */

      document.querySelectorAll('.furina-sticker-card').forEach(card => {
        card.classList.toggle(
          'furina-sticker-card-selected',
          card.dataset.stickerId === stickerId
        )
      })
    },

    async setPositionMode(stickerId, mode) {
      if (mode !== 'chat' && mode !== 'screen') {
        return
      }

      const sticker = this.stickers.find(item => item.id === stickerId)

      if (!sticker || sticker.positionMode === mode) {
        return
      }

      const element = this.getStickerElement(stickerId)

      const targetLayer = this.getLayerForMode(mode)

      /*
                Convert the sticker's current pixel position into the
                coordinate system of its new layer. This prevents a large
                visual jump when switching between placement modes.
            */

      if (element && targetLayer) {
        const elementRect = element.getBoundingClientRect()

        const targetRect = targetLayer.getBoundingClientRect()

        const maxLeft = Math.max(0, targetRect.width - elementRect.width)

        const maxTop = Math.max(0, targetRect.height - elementRect.height)

        const left = Math.min(
          maxLeft,
          Math.max(0, elementRect.left - targetRect.left)
        )

        const top = Math.min(
          maxTop,
          Math.max(0, elementRect.top - targetRect.top)
        )

        sticker.x = targetRect.width ? (left / targetRect.width) * 100 : 0

        sticker.y = targetRect.height ? (top / targetRect.height) * 100 : 0
      }

      sticker.positionMode = mode

      await this.save()

      this.render()
    },

    async duplicate(stickerId) {
      if (this.stickers.length >= this.MAX_STICKERS) {
        return null
      }

      const source = this.stickers.find(sticker => sticker.id === stickerId)

      if (!source) {
        return
      }

      const duplicate = {
        ...source,

        id: this.createId(),

        x: Math.min(90, source.x + 3),

        y: Math.min(90, source.y + 3)
      }

      this.stickers.push(duplicate)

      this.selectedStickerId = duplicate.id

      await this.save()

      this.render()
    },

    async moveForward(stickerId) {
      const index = this.stickers.findIndex(sticker => sticker.id === stickerId)

      if (index < 0 || index >= this.stickers.length - 1) {
        return
      }

      const next = index + 1

      ;[this.stickers[index], this.stickers[next]] = [
        this.stickers[next],
        this.stickers[index]
      ]

      await this.save()

      this.render()
    },

    async moveBackward(stickerId) {
      const index = this.stickers.findIndex(sticker => sticker.id === stickerId)

      if (index <= 0) {
        return
      }

      const previous = index - 1

      ;[this.stickers[index], this.stickers[previous]] = [
        this.stickers[previous],
        this.stickers[index]
      ]

      await this.save()

      this.render()
    },

    async toggleLock(stickerId) {
      const sticker = this.stickers.find(item => item.id === stickerId)

      if (!sticker) {
        return
      }

      sticker.locked = !sticker.locked

      await this.save()

      this.render()
    },

    // The layer lives inside Clank's chat shell rather than inside
    // individual messages, keeping stickers independent of rendering.
    attach(shell) {
      if (!(shell instanceof HTMLElement)) {
        return
      }

      let changed = false

      // Chat-attached sticker layer.
      if (!this.layer || this.layer.parentElement !== shell) {
        if (this.layer) {
          this.layer.remove()
        }

        const layer = document.createElement('div')

        layer.className = 'furina-sticker-layer'

        layer.dataset.furinaOwned = 'true'

        shell.appendChild(layer)

        this.layer = layer

        changed = true
      }

      // Screen-fixed sticker layer.
      if (!this.fixedLayer || !this.fixedLayer.isConnected) {
        const fixedLayer = document.createElement('div')

        fixedLayer.className = [
          'furina-sticker-layer',
          'furina-sticker-fixed-layer'
        ].join(' ')

        fixedLayer.dataset.furinaOwned = 'true'

        document.body.appendChild(fixedLayer)

        this.fixedLayer = fixedLayer

        changed = true
      }

      this.applyEditingState()

      /*
                Only rebuild sticker DOM if one of the actual layers had
                to be recreated. Rendering on every page mutation would
                reintroduce the observer loop we fixed earlier.
            */

      if (changed) {
        this.render()
      }
    },

    applyEditingState() {
      for (const layer of this.getLayers()) {
        layer.classList.toggle('furina-sticker-layer-editing', this.editing)
      }
    },

    setEditing(editing) {
      this.editing = Boolean(editing)

      this.applyEditingState()
    },

    async syncConversation(shell) {
      const conversationId =
        typeof Atelier.getConversationId === 'function'
          ? Atelier.getConversationId()
          : null

      const changed = conversationId !== this.conversationId

      this.conversationId = conversationId

      /*
                attach() already renders when Furina needs to create
                a sticker layer for a newly-built chat shell.

                Do not render again on every page mutation. Clank's
                page observer runs frequently, and doing so here would
                create a render → mutation → render loop.
            */

      this.attach(shell)

      if (changed) {
        await this.loadConversation(conversationId)
      }
    },

    createStickerElement(sticker) {
      const item = document.createElement('div')

      item.className = 'furina-sticker'

      item.dataset.stickerId = sticker.id

      item.tabIndex = 0

      item.addEventListener('pointerdown', () => {
        this.select(sticker.id)
      })

      item.style.left = `${sticker.x}%`

      item.style.top = `${sticker.y}%`

      item.style.width = `${sticker.width}px`

      item.style.opacity = String(sticker.opacity)

      item.style.setProperty(
        '--furina-sticker-rotation',
        `${sticker.rotation}deg`
      )

      item.style.setProperty(
        '--furina-sticker-flip-x',
        sticker.flipX ? '-1' : '1'
      )

      item.style.setProperty(
        '--furina-sticker-flip-y',
        sticker.flipY ? '-1' : '1'
      )

      item.classList.toggle('furina-sticker-locked', sticker.locked)

      item.classList.toggle(
        'furina-sticker-selected',
        sticker.id === this.selectedStickerId
      )

      const image = document.createElement('img')

      image.className = 'furina-sticker-image'

      image.src = sticker.url

      image.alt = ''

      image.draggable = false

      image.referrerPolicy = 'no-referrer'

      const resize = document.createElement('button')

      resize.type = 'button'

      resize.className = 'furina-sticker-resize'

      resize.title = 'Resize sticker'

      resize.setAttribute('aria-label', 'Resize sticker')

      item.append(image, resize)

      this.bindDrag(item, sticker)

      this.bindResize(item, resize, sticker)

      return item
    },

    bindDrag(element, sticker) {
      element.addEventListener('pointerdown', event => {
        if (
          !this.editing ||
          sticker.locked ||
          event.target.closest('.furina-sticker-resize')
        ) {
          return
        }

        event.preventDefault()

        const layer = element.parentElement

        if (!(layer instanceof HTMLElement)) {
          return
        }

        const layerRect = layer.getBoundingClientRect()

        const elementRect = element.getBoundingClientRect()

        const pointerOffsetX = event.clientX - elementRect.left

        const pointerOffsetY = event.clientY - elementRect.top

        element.setPointerCapture(event.pointerId)

        const move = moveEvent => {
          const maxX = Math.max(0, layerRect.width - element.offsetWidth)

          const maxY = Math.max(0, layerRect.height - element.offsetHeight)

          const left = Math.min(
            maxX,
            Math.max(0, moveEvent.clientX - layerRect.left - pointerOffsetX)
          )

          const top = Math.min(
            maxY,
            Math.max(0, moveEvent.clientY - layerRect.top - pointerOffsetY)
          )

          const x = layerRect.width ? (left / layerRect.width) * 100 : 0

          const y = layerRect.height ? (top / layerRect.height) * 100 : 0

          sticker.x = x

          sticker.y = y

          element.style.left = `${x}%`

          element.style.top = `${y}%`
        }

        const end = async endEvent => {
          element.removeEventListener('pointermove', move)

          element.removeEventListener('pointerup', end)

          element.removeEventListener('pointercancel', end)

          try {
            element.releasePointerCapture(endEvent.pointerId)
          } catch (error) {
            // Pointer capture may already be released.
          }

          await this.save()
        }

        element.addEventListener('pointermove', move)

        element.addEventListener('pointerup', end)

        element.addEventListener('pointercancel', end)
      })
    },

    bindResize(element, handle, sticker) {
      handle.addEventListener('pointerdown', event => {
        if (!this.editing || sticker.locked) {
          return
        }

        event.preventDefault()

        event.stopPropagation()

        const startX = event.clientX

        const startWidth = element.getBoundingClientRect().width

        handle.setPointerCapture(event.pointerId)

        const move = moveEvent => {
          const width = Math.max(
            48,
            Math.min(640, startWidth + (moveEvent.clientX - startX))
          )

          sticker.width = Math.round(width)

          element.style.width = `${sticker.width}px`
        }

        const end = async endEvent => {
          handle.removeEventListener('pointermove', move)

          handle.removeEventListener('pointerup', end)

          handle.removeEventListener('pointercancel', end)

          try {
            handle.releasePointerCapture(endEvent.pointerId)
          } catch (error) {
            // Pointer capture may already be released.
          }

          await this.save()
        }

        handle.addEventListener('pointermove', move)

        handle.addEventListener('pointerup', end)

        handle.addEventListener('pointercancel', end)
      })
    },

    render() {
      const layers = this.getLayers()

      if (layers.length === 0) {
        return
      }

      for (const layer of layers) {
        layer.replaceChildren()
      }

      for (const sticker of this.stickers) {
        if (!sticker || !this.isSafeImageUrl(sticker.url)) {
          continue
        }

        const targetLayer = this.getLayerForMode(sticker.positionMode)

        if (!targetLayer) {
          continue
        }

        targetLayer.appendChild(this.createStickerElement(sticker))
      }

      this.applyEditingState()
    }
  }
})()
