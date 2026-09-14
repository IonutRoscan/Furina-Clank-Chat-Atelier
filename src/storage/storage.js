'use strict'


/*
  Developer notes

  Thin wrapper around chrome.storage.local. Managers use this layer so storage
  reads, object updates and fallback behavior are consistent across features.
  Conversation-scoped managers should sanitize values again after reading;
  browser storage is persistent user input and may contain data from old builds.
*/
/*
    Storage Adapter

    Wraps chrome.storage.local with safe fallbacks and serialized
    object updates so overlapping feature saves do not accidentally
    overwrite one another.

    If an unpacked extension is reloaded while a Clank tab remains
    open, Chrome/Brave permanently invalidates that tab's old
    extension context. Once detected, Furina stops issuing storage
    requests from that obsolete context instead of flooding the
    extension error log.
*/

window.ClankAtelier = window.ClankAtelier || {}

// STORAGE

window.ClankAtelier.Storage = {
  _writeQueues: new Map(),

  _contextInvalidated: false,

  // CONTEXT SAFETY

  isContextInvalidated(error = null) {
    if (this._contextInvalidated) {
      return true
    }

    if (!error) {
      return false
    }

    const message = String(error?.message || error || '').toLowerCase()

    return (
      message.includes('extension context invalidated') ||
      message.includes('context invalidated')
    )
  },

  _handleFailure(operation, error) {
    if (this.isContextInvalidated(error)) {
      /*
                This content-script instance can never recover. A page
                refresh will inject a fresh instance, so repeated calls
                from the old page should quietly use their fallbacks.
            */

      this._contextInvalidated = true

      return
    }

    console.warn(`[Clank Atelier] Storage ${operation} failed:`, error)
  },

  // READS

  async get(key, fallback = null) {
    if (this._contextInvalidated) {
      return fallback
    }

    try {
      const result = await chrome.storage.local.get(key)

      if (!result || result[key] === undefined) {
        return fallback
      }

      return result[key]
    } catch (error) {
      this._handleFailure('read', error)

      return fallback
    }
  },

  async getMany(keys, fallback = {}) {
    if (this._contextInvalidated) {
      return fallback
    }

    try {
      const result = await chrome.storage.local.get(keys)

      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        return fallback
      }

      return result
    } catch (error) {
      this._handleFailure('read', error)

      return fallback
    }
  },

  async getObject(key, fallback = {}) {
    const value = await this.get(key, fallback)

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return fallback
    }

    return value
  },

  async getArray(key, fallback = []) {
    const value = await this.get(key, fallback)

    return Array.isArray(value) ? value : fallback
  },

  // SERIALIZED OBJECT UPDATE

  async updateObject(key, updater) {
    if (this._contextInvalidated || typeof updater !== 'function') {
      return false
    }

    const previous = this._writeQueues.get(key) || Promise.resolve()

    const operation = previous
      .catch(() => undefined)
      .then(async () => {
        if (this._contextInvalidated) {
          return false
        }

        const performUpdate = async () => {
          const current = await this.getObject(key, {})

          if (this._contextInvalidated) {
            return false
          }

          const result = updater(current)

          const nextValue =
            result && typeof result === 'object' && !Array.isArray(result)
              ? result
              : current

          return await this.set(key, nextValue)
        }

        /*
                            Web Locks coordinate read-modify-write
                            sequences across multiple Clank tabs.
                        */

        if (
          typeof navigator !== 'undefined' &&
          navigator.locks &&
          typeof navigator.locks.request === 'function'
        ) {
          return await navigator.locks.request(
            `furina-storage:${key}`,
            {
              mode: 'exclusive'
            },
            performUpdate
          )
        }

        return await performUpdate()
      })

    this._writeQueues.set(key, operation)

    try {
      return await operation
    } finally {
      if (this._writeQueues.get(key) === operation) {
        this._writeQueues.delete(key)
      }
    }
  },

  // WRITES

  async set(key, value) {
    if (this._contextInvalidated) {
      return false
    }

    try {
      await chrome.storage.local.set({
        [key]: value
      })

      return true
    } catch (error) {
      this._handleFailure('write', error)

      return false
    }
  },

  async setMany(values) {
    if (
      this._contextInvalidated ||
      !values ||
      typeof values !== 'object' ||
      Array.isArray(values)
    ) {
      return false
    }

    try {
      await chrome.storage.local.set(values)

      return true
    } catch (error) {
      this._handleFailure('write', error)

      return false
    }
  },

  async remove(keys) {
    if (this._contextInvalidated) {
      return false
    }

    try {
      await chrome.storage.local.remove(keys)

      return true
    } catch (error) {
      this._handleFailure('remove', error)

      return false
    }
  }
}
