'use strict'

/*
  Developer notes

  Stores the small group of settings that control Atelier markup/composer tools.
  Keep defaults backward-compatible so updating Furina does not suddenly change
  the appearance or behavior of existing conversations.
*/
/* Shared global settings for Essentials, Full Atelier and the composer. */
;(() => {
  const A = window.ClankAtelier
  const KEY = 'furina-atelier-settings-v1'
  const defaults = {composer: false, rendering: true, interactive: true}
  let value = {...defaults}
  let queue = Promise.resolve()
  const views = new Set()
  const sanitize = raw =>
    Object.fromEntries(
      Object.entries(defaults).map(([key, fallback]) => [
        key,
        typeof raw?.[key] === 'boolean' ? raw[key] : fallback
      ])
    )
  const emit = (rerender = false) => {
    window.dispatchEvent(
      new CustomEvent('furina-atelier-settings-changed', {detail: {...value}})
    )
    A.AtelierComposer?.syncSettings?.()
    for (const ref of views) {
      const view = ref.deref()
      if (view) view.furinaAtelierSync?.()
      else views.delete(ref)
    }
    if (!rerender) return
    for (const message of document.querySelectorAll('.clank-atelier-message')) {
      delete message.dataset.clankAtelierSource
      A.renderMessage?.(message)
    }
  }
  const manager = (A.AtelierSettings = {
    get value() {
      return {...value}
    },
    ready: null,
    bindView(view) {
      views.add(new WeakRef(view))
    },
    update(patch) {
      const operation = queue.then(async () => {
        await manager.ready
        const next = sanitize({...value, ...patch})
        if (!(await A.Storage.set(KEY, next))) return false
        const rerender = value.rendering !== next.rendering
        value = next
        emit(rerender)
        return true
      })
      queue = operation.catch(() => false)
      return operation
    }
  })
  manager.ready = A.Storage.get(KEY, defaults)
    .then(raw => {
      value = sanitize(raw)
      emit(true)
    })
    .catch(() => {
      value = {...defaults}
      emit(true)
    })
  // Keep open Clank tabs in agreement when a setting changes elsewhere.
  const changed = globalThis.chrome?.storage?.onChanged
  changed?.addListener((changes, area) => {
    if (area !== 'local' || !changes[KEY]) return
    const next = sanitize(changes[KEY].newValue)
    if (JSON.stringify(next) === JSON.stringify(value)) return
    const rerender = value.rendering !== next.rendering
    value = next
    emit(rerender)
  })
})()
