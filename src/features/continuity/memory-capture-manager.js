'use strict'


/*
  Developer notes

  Coordinates portability and user-reviewed capture of continuity/story data.
  Import operations must sanitize and merge explicit Furina data structures; they
  must never infer private story facts from the page or silently overwrite a
  user's current vault without confirmation.
*/
/* Memory capture, review inbox, selection action, and Story Bible portability. */

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})
  const clean = (v, max = 4000) =>
    String(v || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max)
  const makeId = p =>
    `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const hash = text => {
    let h = 2166136261
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return (h >>> 0).toString(36)
  }

  Atelier.MemoryCaptureManager = {
    STORAGE_KEY: 'furina-conversation-memory-capture-v1',
    conversationId: null,
    settings: {inboxEnabled: true, suggestions: [], ignored: [], scanned: []},
    globalAttached: false,

    getDefaults() {
      return {inboxEnabled: true, suggestions: [], ignored: [], scanned: []}
    },
    sanitizeSuggestion(v) {
      if (!v || typeof v !== 'object' || !clean(v.text)) return null
      return {
        id: clean(v.id, 160) || makeId('suggestion'),
        sourceKey: clean(v.sourceKey, 160),
        signature: clean(v.signature, 160),
        title: clean(v.title, 140),
        text: clean(v.text, 1200),
        category: Object.hasOwn(
          Atelier.ContinuityManager?.CATEGORIES || {},
          v.category
        )
          ? v.category
          : 'other',
        keywords: Array.isArray(v.keywords)
          ? v.keywords
              .map(x => clean(x, 80).toLowerCase())
              .filter(Boolean)
              .slice(0, 20)
          : [],
        createdAt: Number(v.createdAt) || Date.now()
      }
    },
    sanitizeSettings(v) {
      const s = v && typeof v === 'object' ? v : {}
      return {
        inboxEnabled: s.inboxEnabled !== false,
        suggestions: (Array.isArray(s.suggestions) ? s.suggestions : [])
          .map(x => this.sanitizeSuggestion(x))
          .filter(Boolean)
          .slice(0, 100),
        ignored: (Array.isArray(s.ignored) ? s.ignored : [])
          .map(x => clean(x, 160))
          .filter(Boolean)
          .slice(-500),
        scanned: (Array.isArray(s.scanned) ? s.scanned : [])
          .map(x => clean(x, 160))
          .filter(Boolean)
          .slice(-1000)
      }
    },
    async loadConversation(id) {
      this.conversationId = id
      if (!id) {
        this.settings = this.getDefaults()
        return
      }
      const all = await Atelier.Storage.getObject(this.STORAGE_KEY, {})
      if (this.conversationId !== id) return
      this.settings = this.sanitizeSettings(all[id])
      this.attachGlobal()
      setTimeout(() => this.scanExistingMessages(), 350)
    },
    async syncConversation() {
      const id = Atelier.getConversationId?.() || null
      if (id === this.conversationId) return false
      await this.loadConversation(id)
      return true
    },
    async save() {
      const id = this.conversationId
      if (!id) return false
      const snap = this.sanitizeSettings(this.settings)
      this.settings = snap
      await Atelier.Storage.updateObject(this.STORAGE_KEY, all => {
        all[id] = snap
        return all
      })
      Atelier.PanelShell?.refreshNavigation?.()
      return true
    },
    async update(v) {
      this.settings = this.sanitizeSettings({...this.settings, ...v})
      return await this.save()
    },

    messageText(message) {
      return clean(
        message?.querySelector?.('.clank-atelier-rendered')?.textContent ||
          message?.querySelector?.('.clank-atelier-message-body')
            ?.textContent ||
          '',
        5000
      )
    },
    messageRole(message) {
      return message?.classList?.contains('clank-atelier-message-user')
        ? 'user'
        : 'assistant'
    },
    messageKey(message, text = this.messageText(message)) {
      return `${this.messageRole(message)}:${hash(text)}`
    },

    infer(text) {
      const sentences = String(text || '').match(/[^.!?\n]+[.!?]?/g) || []
      const rules = [
        {
          re: /\b(promis(?:e|ed)|swore|vowed|will return|won't forget)\b/i,
          category: 'thread',
          title: 'Possible promise'
        },
        {
          re: /\b(reveal(?:ed|s)?|secret|discovered|learned|truth|realized)\b/i,
          category: 'world',
          title: 'Possible revelation'
        },
        {
          re: /\b(wound(?:ed)?|injur(?:y|ed)|bleed(?:ing)?|broken|scar|curse(?:d)?)\b/i,
          category: 'inventory',
          title: 'Possible condition change'
        },
        {
          re: /\b(gave|handed|carries|carrying|lost|stole|destroyed|key|weapon|ring|relic)\b/i,
          category: 'inventory',
          title: 'Possible item change'
        },
        {
          re: /\b(trust(?:ed|s)?|love(?:d|s)?|hate(?:d|s)?|betray(?:ed|al)?|suspicious|forgave|jealous)\b/i,
          category: 'relationship',
          title: 'Possible relationship change'
        },
        {
          re: /\b(died|killed|escaped|arrived|departed|collapsed|opened|sealed)\b/i,
          category: 'timeline',
          title: 'Possible story event'
        }
      ]
      for (const rule of rules) {
        const sentence = sentences.find(s => rule.re.test(s))
        if (sentence) {
          const names = (sentence.match(/\b[A-Z][a-z]{2,}\b/g) || [])
            .slice(0, 6)
            .map(x => x.toLowerCase())
          return {
            ...rule,
            text: clean(sentence, 900),
            keywords: [...new Set(names)]
          }
        }
      }
      return null
    },

    async scanMessage(message) {
      if (
        !this.conversationId ||
        !this.settings.inboxEnabled ||
        this.messageRole(message) !== 'assistant'
      )
        return
      const text = this.messageText(message)
      if (text.length < 35) return
      const key = this.messageKey(message, text)
      if (this.settings.scanned.includes(key)) return
      const scanned = [...this.settings.scanned, key].slice(-1000)
      const inferred = this.infer(text)
      if (!inferred) {
        await this.update({scanned})
        return
      }
      const signature = hash(
        `${inferred.category}:${inferred.text.toLowerCase()}`
      )
      if (
        this.settings.ignored.includes(signature) ||
        this.settings.suggestions.some(s => s.signature === signature)
      ) {
        await this.update({scanned})
        return
      }
      const suggestion = this.sanitizeSuggestion({
        id: makeId('suggestion'),
        sourceKey: key,
        signature,
        title: inferred.title,
        text: inferred.text,
        category: inferred.category,
        keywords: inferred.keywords,
        createdAt: Date.now()
      })
      await this.update({
        scanned,
        suggestions: [suggestion, ...this.settings.suggestions]
      })
    },

    scanExistingMessages() {
      const messages = [...document.querySelectorAll('.clank-atelier-message')]
      messages.forEach(message => this.attachMessage(message))
      messages.slice(-40).forEach(message => this.scanMessage(message))
    },
    attachMessage(message) {
      if (!(message instanceof HTMLElement)) return
      this.attachGlobal()
      const actions = message.querySelector('.clank-atelier-message-actions')
      if (
        actions &&
        !actions.querySelector(':scope .furina-message-remember-button')
      ) {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'furina-message-remember-button'
        b.textContent = '🧠'
        b.title = 'Remember this message'
        b.setAttribute('aria-label', 'Remember this message')
        b.addEventListener('click', e => {
          e.preventDefault()
          e.stopPropagation()
          this.openCapture({
            text: this.messageText(message),
            title:
              this.messageRole(message) === 'assistant'
                ? 'Remembered reply'
                : 'Remembered user message',
            sourceKey: this.messageKey(message)
          })
        })
        actions.append(b)
      }
      this.scanMessage(message)
    },

    attachComposer(textarea) {
      const form = textarea?.closest?.('form')
      if (!form || form.querySelector(':scope > .furina-memory-quick')) return
      form.classList.add('furina-memory-quick-host')
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'furina-memory-quick'
      b.textContent = '🧠'
      b.title = 'Quick Memory'
      b.setAttribute('aria-label', 'Add a Quick Memory')
      b.dataset.furinaOwned = 'true'
      b.addEventListener('click', () =>
        this.openCapture({title: 'Quick Memory', text: ''})
      )
      form.append(b)
    },

    attachGlobal() {
      if (this.globalAttached) return
      this.globalAttached = true
      document.addEventListener('mouseup', event => {
        if (event.button !== 0) return
        setTimeout(() => {
          const selection = window.getSelection?.()
          const text = clean(selection?.toString(), 1600)
          document.querySelector('.furina-remember-selection')?.remove()
          if (text.length < 3 || !selection?.rangeCount) return
          const node = selection.anchorNode
          const element =
            node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement
          const message = element?.closest?.('.clank-atelier-message')
          if (!message) return
          const rect = selection.getRangeAt(0).getBoundingClientRect()
          const action = document.createElement('button')
          action.type = 'button'
          action.className = 'furina-remember-selection'
          action.textContent = 'Remember selection'
          action.style.left = `${Math.max(8, Math.min(window.innerWidth - 150, rect.left + rect.width / 2 - 70))}px`
          action.style.top = `${Math.max(8, rect.top - 39)}px`
          action.addEventListener('mousedown', e => e.preventDefault())
          action.addEventListener('click', () => {
            Atelier.SfxManager?.play?.('insert')
            action.remove()
            this.openCapture({
              title: 'Remembered excerpt',
              text,
              sourceKey: this.messageKey(message)
            })
            selection.removeAllRanges()
          })
          document.body.append(action)
        }, 0)
      })
      document.addEventListener('mousedown', event => {
        if (
          !event.target.closest?.(
            '.furina-remember-selection, .furina-quote-to-composer'
          )
        )
          document.querySelector('.furina-remember-selection')?.remove()
      })
    },

    openCapture(initial = {}, onSaved = null) {
      document.getElementById('furina-memory-capture')?.remove()
      const manager = Atelier.ContinuityManager
      if (!manager) return false
      const overlay = document.createElement('div')
      overlay.id = 'furina-memory-capture'
      overlay.className = 'furina-memory-capture'
      overlay.dataset.furinaOwned = 'true'
      const card = document.createElement('section')
      card.className = 'furina-memory-capture-card'
      const h = document.createElement('div')
      h.className = 'furina-memory-capture-heading'
      h.textContent = 'REMEMBER'
      const title = document.createElement('input')
      title.className = 'furina-input'
      title.value = clean(initial.title, 140)
      title.placeholder = 'Short name'
      const text = document.createElement('textarea')
      text.className = 'furina-textarea'
      text.rows = 7
      text.value = clean(initial.text, 2400)
      text.placeholder = 'Edit this into one clear fact worth remembering.'
      const category = document.createElement('select')
      category.className = 'furina-select'
      Object.entries(manager.CATEGORIES).forEach(([v, n]) => {
        const o = document.createElement('option')
        o.value = v
        o.textContent = n
        o.selected = v === (initial.category || 'other')
        category.append(o)
      })
      const priority = document.createElement('select')
      priority.className = 'furina-select'
      ;[
        ['critical', 'Critical'],
        ['high', 'High'],
        ['normal', 'Normal'],
        ['background', 'Background']
      ].forEach(([v, n]) => {
        const o = document.createElement('option')
        o.value = v
        o.textContent = n
        o.selected = v === (initial.priority || 'normal')
        priority.append(o)
      })
      const scope = document.createElement('select')
      scope.className = 'furina-select'
      ;[
        ['always', 'Always include'],
        ['relevant', 'When relevant'],
        ['present', 'While present'],
        ['manual', 'Manual only']
      ].forEach(([v, n]) => {
        const o = document.createElement('option')
        o.value = v
        o.textContent = n
        o.selected = v === (initial.scope || 'relevant')
        scope.append(o)
      })
      const keywords = document.createElement('input')
      keywords.className = 'furina-input'
      keywords.value = Array.isArray(initial.keywords)
        ? initial.keywords.join(', ')
        : clean(initial.keywords, 600)
      keywords.placeholder = 'Names, places, items, aliases'
      const grid = document.createElement('div')
      grid.className = 'furina-memory-capture-grid'
      for (const [label, control] of [
        ['Category', category],
        ['Priority', priority],
        ['Injection', scope]
      ]) {
        const w = document.createElement('label')
        w.append(label, control)
        grid.append(w)
      }
      const actions = document.createElement('div')
      actions.className = 'furina-memory-capture-actions'
      const cancel = document.createElement('button')
      cancel.type = 'button'
      cancel.textContent = 'Cancel'
      const save = document.createElement('button')
      save.type = 'button'
      save.textContent = 'Save Memory'
      save.className = 'furina-memory-capture-save'
      actions.append(cancel, save)
      cancel.addEventListener('click', () => overlay.remove())
      save.addEventListener('click', async () => {
        const entry = await manager.upsertEntry(
          manager.createEntry({
            title: title.value,
            text: text.value,
            category: category.value,
            priority: priority.value,
            scope: scope.value,
            keywords: keywords.value.split(','),
            sourceKey: initial.sourceKey
          })
        )
        if (!entry) {
          text.focus()
          return
        }
        overlay.remove()
        await onSaved?.(entry)
        Atelier.PanelShell?.refreshNavigation?.()
      })
      card.append(h, title, text, grid, keywords, actions)
      overlay.append(card)
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.remove()
      })
      document.body.append(overlay)
      text.focus()
      return true
    },

    async ignoreSuggestion(id) {
      const item = this.settings.suggestions.find(s => s.id === id)
      if (!item) return false
      return await this.update({
        suggestions: this.settings.suggestions.filter(s => s.id !== id),
        ignored: [...this.settings.ignored, item.signature]
      })
    },
    async removeSuggestion(id) {
      return await this.update({
        suggestions: this.settings.suggestions.filter(s => s.id !== id)
      })
    },

    async buildStoryBible() {
      const id = this.conversationId
      const bookmarks =
        (await Atelier.Storage.getObject('furina-message-bookmarks', {}))[id] ||
        []
      const chapters =
        (await Atelier.Storage.getObject('furina-scene-chapters', {}))[id] || []
      return {
        format: 'furina-story-bible',
        version: 1,
        exportedAt: new Date().toISOString(),
        conversationId: id,
        continuity: Atelier.ContinuityManager?.settings || null,
        director: Atelier.DirectorManager?.settings || null,
        director2: Atelier.Director2Manager?.settings || null,
        sceneState: Atelier.SceneStateManager?.settings || null,
        story: Atelier.SceneIntelligenceManager?.settings || null,
        bookmarks,
        chapters
      }
    },
    download(name, text, type = 'application/json') {
      const blob = new Blob([text], {type})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.hidden = true
      document.body.append(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
    async exportJson() {
      const bible = await this.buildStoryBible()
      this.download(
        `furina-story-bible-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(bible, null, 2)
      )
      return bible
    },
    async exportMarkdown() {
      const b = await this.buildStoryBible()
      const lines = [
        '# Furina Story Bible',
        '',
        `Exported: ${b.exportedAt}`,
        ''
      ]
      const add = (h, v) => {
        if (v) {
          lines.push(`## ${h}`, '', String(v), '')
        }
      }
      const s = b.sceneState || {}
      add(
        'Current Scene',
        [
          s.title,
          s.sceneNumber,
          s.location,
          s.time,
          s.present,
          s.objective,
          s.threat,
          s.conditions,
          s.notes
        ]
          .filter(Boolean)
          .join('\n\n')
      )
      if (b.continuity?.entries?.length) {
        lines.push('## Continuity Vault', '')
        b.continuity.entries.forEach(e =>
          lines.push(
            `### ${e.title || e.category}`,
            '',
            e.archived ? '*Archived*' : '',
            e.text,
            ''
          )
        )
      }
      if (b.story?.recaps?.length) {
        lines.push('## Scene Recaps', '')
        b.story.recaps.forEach(r =>
          lines.push(
            `### ${r.title}`,
            '',
            r.summary,
            '',
            r.openThreads ? `**Open threads:** ${r.openThreads}` : '',
            ''
          )
        )
      }
      if (b.story?.timeline?.length) {
        lines.push('## Timeline', '')
        b.story.timeline.forEach(e =>
          lines.push(
            `- **${e.dateLabel || 'Undated'} — ${e.title}:** ${e.details}`
          )
        )
      }
      this.download(
        `furina-story-bible-${new Date().toISOString().slice(0, 10)}.md`,
        lines.join('\n'),
        'text/markdown'
      )
    },
    mergeById(current, incoming) {
      const keyOf = item =>
        item?.id || item?.key || hash(JSON.stringify(item || {}))
      const map = new Map((current || []).map(x => [keyOf(x), x]))
      for (const item of incoming || []) map.set(keyOf(item), item)
      return [...map.values()]
    },
    async importBible(data, mode = 'merge') {
      if (
        !data ||
        data.format !== 'furina-story-bible' ||
        Number(data.version) !== 1
      )
        throw new Error('Not a supported Furina Story Bible.')
      const replace = mode === 'replace',
        id = this.conversationId
      if (data.continuity && Atelier.ContinuityManager) {
        const v = replace
          ? data.continuity
          : {
              ...Atelier.ContinuityManager.settings,
              ...data.continuity,
              entries: this.mergeById(
                Atelier.ContinuityManager.settings.entries,
                data.continuity.entries
              )
            }
        Atelier.ContinuityManager.settings =
          Atelier.ContinuityManager.sanitizeSettings(v)
        await Atelier.ContinuityManager.save()
      }
      if (data.director && Atelier.DirectorManager) {
        const v = replace
          ? data.director
          : {
              ...Atelier.DirectorManager.settings,
              ...data.director,
              notes: this.mergeById(
                Atelier.DirectorManager.settings.notes,
                data.director.notes
              )
            }
        Atelier.DirectorManager.settings =
          Atelier.DirectorManager.sanitizeSettings(v)
        await Atelier.DirectorManager.save()
      }
      if (data.director2 && Atelier.Director2Manager) {
        const v = replace
          ? data.director2
          : {
              ...Atelier.Director2Manager.settings,
              ...data.director2,
              cues: this.mergeById(
                Atelier.Director2Manager.settings.cues,
                data.director2.cues
              ),
              knowledge: this.mergeById(
                Atelier.Director2Manager.settings.knowledge,
                data.director2.knowledge
              )
            }
        Atelier.Director2Manager.settings =
          Atelier.Director2Manager.sanitizeSettings(v)
        await Atelier.Director2Manager.save()
      }
      if (data.sceneState && Atelier.SceneStateManager)
        await Atelier.SceneStateManager.updateMany(
          replace
            ? data.sceneState
            : {...Atelier.SceneStateManager.settings, ...data.sceneState}
        )
      if (data.story && Atelier.SceneIntelligenceManager) {
        const c = Atelier.SceneIntelligenceManager.settings,
          v = replace
            ? data.story
            : {
                ...c,
                ...data.story,
                recaps: this.mergeById(c.recaps, data.story.recaps),
                timeline: this.mergeById(c.timeline, data.story.timeline),
                snapshots: this.mergeById(c.snapshots, data.story.snapshots)
              }
        Atelier.SceneIntelligenceManager.settings =
          Atelier.SceneIntelligenceManager.sanitizeSettings(v)
        await Atelier.SceneIntelligenceManager.save()
      }
      for (const [key, items] of [
        ['furina-message-bookmarks', data.bookmarks],
        ['furina-scene-chapters', data.chapters]
      ])
        if (Array.isArray(items))
          await Atelier.Storage.updateObject(key, all => {
            all[id] = replace ? items : this.mergeById(all[id] || [], items)
            return all
          })
      Atelier.PanelShell?.rebuild?.()
      return true
    }
  }
})()
