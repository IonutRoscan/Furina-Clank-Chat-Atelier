'use strict'


/*
  Developer notes

  Owns long-lived continuity entries and selects a compact subset relevant to the
  current outgoing message. Selection is a local heuristic, not model memory.
  Keep matching deterministic and budget-aware so continuity helps context rather
  than flooding every turn with the entire vault.
*/
/*
    Furina Continuity Engine

    Stores structured, per-conversation RP facts and selects only the entries
    useful to the current outgoing message. Director Manager remains the sole
    owner of composer injection; it asks this manager for a bounded block.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  const CATEGORIES = Object.freeze({
    character: 'Character',
    relationship: 'Relationship',
    world: 'World',
    inventory: 'Inventory & Condition',
    thread: 'Open Thread',
    timeline: 'Timeline',
    other: 'Other'
  })

  const PRIORITY_WEIGHT = Object.freeze({
    critical: 400,
    high: 300,
    normal: 200,
    background: 100
  })

  const BUDGETS = Object.freeze({
    compact: 1200,
    balanced: 2400,
    detailed: 4200
  })

  const clean = (value, limit = 2000) =>
    String(value || '')
      .replace(/\[\/?FURINA_[A-Z0-9_]+\]/gi, '')
      .replace(/\u0000/g, '')
      .trim()
      .slice(0, limit)

  const uniqueTerms = values =>
    Array.from(
      new Set(
        (Array.isArray(values) ? values : String(values || '').split(','))
          .map(value => clean(value, 80).toLocaleLowerCase())
          .filter(value => value.length >= 2)
      )
    ).slice(0, 30)

  function newId() {
    return `continuity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  Atelier.ContinuityManager = {
    STORAGE_KEY: 'furina-conversation-continuity-v1',
    CATEGORIES,
    BUDGETS,
    conversationId: null,

    settings: {
      enabled: true,
      budgetMode: 'balanced',
      customBudget: 2400,
      entries: []
    },

    getDefaults() {
      return {
        enabled: true,
        budgetMode: 'balanced',
        customBudget: 2400,
        entries: []
      }
    },

    sanitizeEntry(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null
      }

      const text = clean(value.text, 2400)
      if (!text) {
        return null
      }

      const category = Object.hasOwn(CATEGORIES, value.category)
        ? value.category
        : 'other'
      const priority = Object.hasOwn(PRIORITY_WEIGHT, value.priority)
        ? value.priority
        : 'normal'
      const scope = ['always', 'relevant', 'present', 'manual'].includes(
        value.scope
      )
        ? value.scope
        : 'relevant'

      return {
        id: clean(value.id, 160) || newId(),
        title: clean(value.title, 140),
        category,
        text,
        keywords: uniqueTerms(value.keywords),
        scope,
        priority,
        enabled: value.enabled !== false,
        archived: Boolean(value.archived),
        sourceKey: clean(value.sourceKey, 180),
        createdAt: Number(value.createdAt) || Date.now(),
        updatedAt: Number(value.updatedAt) || Date.now()
      }
    },

    sanitizeSettings(value) {
      const source =
        value && typeof value === 'object' && !Array.isArray(value) ? value : {}
      const budgetMode = ['compact', 'balanced', 'detailed', 'custom'].includes(
        source.budgetMode
      )
        ? source.budgetMode
        : 'balanced'

      return {
        enabled: source.enabled !== false,
        budgetMode,
        customBudget: Math.min(
          8000,
          Math.max(500, Math.round(Number(source.customBudget) || 2400))
        ),
        entries: (Array.isArray(source.entries) ? source.entries : [])
          .map(item => this.sanitizeEntry(item))
          .filter(Boolean)
          .slice(0, 500)
      }
    },

    async loadConversation(conversationId) {
      this.conversationId = conversationId
      if (!conversationId) {
        this.settings = this.getDefaults()
        return
      }

      const stored = await Atelier.Storage.getObject(this.STORAGE_KEY, {})
      if (this.conversationId !== conversationId) {
        return
      }
      this.settings = this.sanitizeSettings(stored[conversationId])
    },

    async syncConversation() {
      const id =
        typeof Atelier.getConversationId === 'function'
          ? Atelier.getConversationId()
          : null
      if (id === this.conversationId) {
        return false
      }
      await this.loadConversation(id)
      return true
    },

    async save() {
      const id = this.conversationId
      if (!id) {
        return false
      }
      const snapshot = this.sanitizeSettings(this.settings)
      this.settings = snapshot
      await Atelier.Storage.updateObject(this.STORAGE_KEY, stored => {
        stored[id] = snapshot
        return stored
      })
      return true
    },

    async updateSettings(values) {
      this.settings = this.sanitizeSettings({...this.settings, ...values})
      return await this.save()
    },

    async upsertEntry(value) {
      const entry = this.sanitizeEntry({...value, updatedAt: Date.now()})
      if (!entry) {
        return false
      }
      const entries = [...this.settings.entries]
      const index = entries.findIndex(item => item.id === entry.id)
      if (index >= 0) {
        entry.createdAt = entries[index].createdAt
        entries[index] = entry
      } else {
        entries.unshift(entry)
      }
      this.settings.entries = entries
      await this.save()
      return entry
    },

    async removeEntry(id) {
      this.settings.entries = this.settings.entries.filter(
        item => item.id !== id
      )
      return await this.save()
    },

    getBudget() {
      return this.settings.budgetMode === 'custom'
        ? this.settings.customBudget
        : BUDGETS[this.settings.budgetMode] || BUDGETS.balanced
    },

    getPresentText() {
      return String(
        Atelier.SceneStateManager?.settings?.present || ''
      ).toLocaleLowerCase()
    },

    getTerms(entry) {
      return uniqueTerms([entry.title, ...entry.keywords])
    },

    scoreEntry(entry, messageText = '') {
      if (!entry.enabled || entry.archived || entry.scope === 'manual') {
        return null
      }

      const message = String(messageText || '').toLocaleLowerCase()
      const present = this.getPresentText()
      const terms = this.getTerms(entry)
      const messageMatches = terms.filter(term => message.includes(term))
      const presentMatches = terms.filter(term => present.includes(term))
      let eligible = false
      let reason = ''

      if (entry.scope === 'always') {
        eligible = true
        reason = 'Always'
      } else if (entry.scope === 'present' && presentMatches.length) {
        eligible = true
        reason = `Present: ${presentMatches[0]}`
      } else if (entry.scope === 'relevant' && messageMatches.length) {
        eligible = true
        reason = `Matched: ${messageMatches[0]}`
      }

      if (!eligible) {
        return null
      }

      return {
        entry,
        reason,
        score:
          PRIORITY_WEIGHT[entry.priority] +
          (entry.scope === 'always' ? 60 : 0) +
          messageMatches.length * 12 +
          presentMatches.length * 8
      }
    },

    formatEntry(entry) {
      const label = CATEGORIES[entry.category] || CATEGORIES.other
      const title = entry.title ? ` — ${entry.title}` : ''
      return `[${label.toUpperCase()}${title}] ${entry.text}`
    },

    select(messageText = '') {
      if (!this.settings.enabled) {
        return {
          selected: [],
          omitted: [],
          characters: 0,
          budget: this.getBudget()
        }
      }

      const budget = this.getBudget()
      const candidates = this.settings.entries
        .map(entry => this.scoreEntry(entry, messageText))
        .filter(Boolean)
        .sort(
          (a, b) => b.score - a.score || b.entry.updatedAt - a.entry.updatedAt
        )
      const selected = []
      const omitted = []
      let characters = 0

      for (const candidate of candidates) {
        const formatted = this.formatEntry(candidate.entry)
        const cost = formatted.length + (selected.length ? 1 : 0)
        if (characters + cost <= budget) {
          selected.push({...candidate, formatted, characters: cost})
          characters += cost
        } else {
          omitted.push({...candidate, formatted, characters: cost})
        }
      }

      return {selected, omitted, characters, budget}
    },

    hasInjectableEntries() {
      return Boolean(
        this.settings.enabled &&
        this.settings.entries.some(
          entry => entry.enabled && !entry.archived && entry.scope !== 'manual'
        )
      )
    },

    buildBlock(messageText = '') {
      const selection = this.select(messageText)
      if (!selection.selected.length) {
        return ''
      }
      return [
        '[RELEVANT_CONTINUITY]',
        ...selection.selected.map(item => item.formatted),
        '[/RELEVANT_CONTINUITY]'
      ].join('\n')
    },

    createEntry(values = {}) {
      return {
        id: newId(),
        title: '',
        category: 'character',
        text: '',
        keywords: [],
        scope: 'relevant',
        priority: 'normal',
        enabled: true,
        archived: false,
        sourceKey: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...values
      }
    }
  }
})()
