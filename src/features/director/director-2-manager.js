'use strict'


/*
  Developer notes

  Owns the advanced Director layer: guard rails, presets, cues and knowledge
  boundaries. It contributes compact context to DirectorManager rather than
  sending independently. Cue state is conversation-scoped and must advance once
  per observed user turn, never once per MutationObserver callback.
*/
/*
    Director Mode 2.0

    Owns one-shot direction, queued cues, guard rails, narrative presets,
    knowledge boundaries, and the compact composer control. Director Manager
    remains the only module that mutates Clank's outgoing textarea.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})
  const clean = (value, max = 2000) =>
    String(value || '')
      .replace(/\[\/?FURINA_[A-Z0-9_]+\]/gi, '')
      .trim()
      .slice(0, max)
  const id = prefix =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  const GUARDS = Object.freeze({
    userDialogue: [
      'Never write dialogue for the user',
      "Do not invent or complete the user's spoken words."
    ],
    userThoughts: [
      "Never decide the user's thoughts",
      'Do not state what the user thinks, feels, wants, or realizes.'
    ],
    userActions: [
      'Protect major user actions',
      "Do not perform consequential actions on the user's behalf."
    ],
    noTimeSkip: [
      'No unapproved time skips',
      "Do not advance time substantially without the user's direction."
    ],
    preserveScene: [
      'Do not end the scene early',
      'Continue the current scene instead of resolving or summarizing it prematurely.'
    ],
    limitedKnowledge: [
      'Respect character knowledge',
      'Characters may only use information they witnessed, learned, or plausibly inferred.'
    ],
    preserveVoice: [
      'Preserve character voice',
      'Keep established personality, speech patterns, motives, and boundaries consistent.'
    ],
    noRepetition: [
      'Avoid repetition',
      'Do not restate the previous reply or loop the same emotional beat.'
    ],
    noUserSummary: [
      'Continue instead of summarizing',
      'Write the next scene beat rather than a recap unless asked.'
    ],
    restrainedCast: [
      'Restrained new characters',
      'Do not introduce new named characters casually or without story need.'
    ]
  })

  const PRESETS = Object.freeze({
    none: {
      name: 'No preset',
      description: 'Use only your notes, cues, and guards.',
      rules: []
    },
    slowBurn: {
      name: 'Slow-Burn Romance',
      description: 'Subtext, uncertainty, and earned intimacy.',
      rules: [
        'Do not rush emotional or physical intimacy.',
        'Let affection emerge through behavior, subtext, and small choices.',
        'Preserve uncertainty and unresolved tension.'
      ]
    },
    horror: {
      name: 'Horror Pursuit',
      description: 'Uncertainty, clues, pressure, and survival continuity.',
      rules: [
        'Maintain uncertainty about the threat and reveal it gradually.',
        'Use environmental clues before direct explanation.',
        'Track injuries, escape routes, and available resources.'
      ]
    },
    academy: {
      name: 'Academy RP',
      description: 'Schedules, social consequences, clubs, and rivalries.',
      rules: [
        'Maintain school schedules, rules, assignments, clubs, and faculty roles.',
        'Preserve social consequences and reputation between scenes.',
        'Let academic and social obligations create believable complications.'
      ]
    },
    highStakes: {
      name: 'Epic / High Stakes',
      description: 'Consequences, momentum, and costly choices.',
      rules: [
        'Keep consequences proportionate and persistent.',
        'Give major choices meaningful costs rather than easy reversals.',
        "Maintain urgency without removing the user's agency."
      ]
    },
    mystery: {
      name: 'Mystery',
      description: 'Fair clues without premature answers.',
      rules: [
        'Preserve the central mystery and avoid premature exposition.',
        'Seed fair, interpretable clues and occasional red herrings.',
        "Keep each character's knowledge limited and consistent."
      ]
    }
  })

  Atelier.Director2Manager = {
    STORAGE_KEY: 'furina-conversation-director-2-v1',
    GUARDS,
    PRESETS,
    conversationId: null,
    _lastPrepared: null,
    _lastConsumed: null,

    settings: {
      nextReply: '',
      activePreset: 'none',
      guards: {},
      cues: [],
      knowledge: []
    },

    getDefaults() {
      return {
        nextReply: '',
        activePreset: 'none',
        guards: Object.fromEntries(
          Object.keys(GUARDS).map(key => [key, false])
        ),
        cues: [],
        knowledge: []
      }
    },

    sanitizeCue(value) {
      if (!value || typeof value !== 'object') return null
      const text = clean(value.text, 1600)
      if (!text) return null
      const trigger = [
        'next',
        'keyword',
        'turns',
        'character',
        'manual'
      ].includes(value.trigger)
        ? value.trigger
        : 'next'
      const status = [
        'waiting',
        'armed',
        'sent',
        'fulfilled',
        'skipped'
      ].includes(value.status)
        ? value.status
        : 'waiting'
      return {
        id: clean(value.id, 160) || id('cue'),
        text,
        trigger,
        triggerValue: clean(value.triggerValue, 120),
        turnsRemaining: Math.min(
          99,
          Math.max(1, Math.round(Number(value.turnsRemaining) || 1))
        ),
        status,
        reusable: Boolean(value.reusable),
        enabled: value.enabled !== false,
        createdAt: Number(value.createdAt) || Date.now()
      }
    },

    sanitizeKnowledge(value) {
      if (!value || typeof value !== 'object') return null
      const truth = clean(value.truth, 1800)
      if (!truth) return null
      return {
        id: clean(value.id, 160) || id('knowledge'),
        title: clean(value.title, 140),
        truth,
        keywords: (Array.isArray(value.keywords)
          ? value.keywords
          : String(value.keywords || '').split(',')
        )
          .map(item => clean(item, 80).toLocaleLowerCase())
          .filter(Boolean)
          .slice(0, 30),
        knows: clean(value.knows, 500),
        suspects: clean(value.suspects, 500),
        unknown: clean(value.unknown, 500),
        enabled: value.enabled !== false
      }
    },

    sanitizeSettings(value) {
      const source = value && typeof value === 'object' ? value : {}
      const guards = {}
      for (const key of Object.keys(GUARDS))
        guards[key] = Boolean(source.guards?.[key])
      return {
        nextReply: clean(source.nextReply, 1800),
        activePreset: Object.hasOwn(PRESETS, source.activePreset)
          ? source.activePreset
          : 'none',
        guards,
        cues: (Array.isArray(source.cues) ? source.cues : [])
          .map(v => this.sanitizeCue(v))
          .filter(Boolean)
          .slice(0, 100),
        knowledge: (Array.isArray(source.knowledge) ? source.knowledge : [])
          .map(v => this.sanitizeKnowledge(v))
          .filter(Boolean)
          .slice(0, 200)
      }
    },

    async loadConversation(conversationId) {
      this.conversationId = conversationId
      this._lastPrepared = null
      if (!conversationId) {
        this.settings = this.getDefaults()
        return
      }
      const stored = await Atelier.Storage.getObject(this.STORAGE_KEY, {})
      if (this.conversationId === conversationId) {
        this.settings = this.sanitizeSettings(stored[conversationId])
      }
    },

    async syncConversation() {
      const conversationId = Atelier.getConversationId?.() || null
      if (conversationId === this.conversationId) return false
      await this.loadConversation(conversationId)
      return true
    },

    async save() {
      const conversationId = this.conversationId
      if (!conversationId) return false
      const snapshot = this.sanitizeSettings(this.settings)
      this.settings = snapshot
      await Atelier.Storage.updateObject(this.STORAGE_KEY, stored => {
        stored[conversationId] = snapshot
        return stored
      })
      this.refreshQuickControls()
      return true
    },

    async update(values) {
      this.settings = this.sanitizeSettings({...this.settings, ...values})
      return await this.save()
    },

    createCue(values = {}) {
      return {
        id: id('cue'),
        text: '',
        trigger: 'next',
        triggerValue: '',
        turnsRemaining: 1,
        status: 'waiting',
        reusable: false,
        enabled: true,
        createdAt: Date.now(),
        ...values
      }
    },

    async upsertCue(value) {
      const cue = this.sanitizeCue(value)
      if (!cue) return false
      const cues = [...this.settings.cues]
      const index = cues.findIndex(item => item.id === cue.id)
      if (index >= 0) cues[index] = cue
      else cues.push(cue)
      return await this.update({cues})
    },

    async removeCue(cueId) {
      return await this.update({
        cues: this.settings.cues.filter(cue => cue.id !== cueId)
      })
    },

    createKnowledge(values = {}) {
      return {
        id: id('knowledge'),
        title: '',
        truth: '',
        keywords: [],
        knows: '',
        suspects: '',
        unknown: '',
        enabled: true,
        ...values
      }
    },

    async upsertKnowledge(value) {
      const item = this.sanitizeKnowledge(value)
      if (!item) return false
      const knowledge = [...this.settings.knowledge]
      const index = knowledge.findIndex(current => current.id === item.id)
      if (index >= 0) knowledge[index] = item
      else knowledge.unshift(item)
      return await this.update({knowledge})
    },

    async removeKnowledge(itemId) {
      return await this.update({
        knowledge: this.settings.knowledge.filter(item => item.id !== itemId)
      })
    },

    lastAssistantText() {
      const messages = document.querySelectorAll(
        '.clank-atelier-message:not(.clank-atelier-message-user)'
      )
      return String(
        messages[messages.length - 1]?.textContent || ''
      ).toLocaleLowerCase()
    },

    cueMatches(cue, userText) {
      if (!cue.enabled || !['waiting', 'armed'].includes(cue.status))
        return false
      const text = String(userText || '').toLocaleLowerCase()
      const value = cue.triggerValue.toLocaleLowerCase()
      if (cue.status === 'armed' || cue.trigger === 'next') return true
      if (cue.trigger === 'keyword')
        return Boolean(value && text.includes(value))
      if (cue.trigger === 'turns') return cue.turnsRemaining <= 1
      if (cue.trigger === 'character')
        return Boolean(value && this.lastAssistantText().includes(value))
      return false
    },

    getPrepared(userText = '') {
      const cue =
        this.settings.cues.find(item => this.cueMatches(item, userText)) || null
      const message = String(userText || '').toLocaleLowerCase()
      const knowledge = this.settings.knowledge.filter(item => {
        if (!item.enabled) return false
        if (!item.keywords.length) return true
        return item.keywords.some(keyword => message.includes(keyword))
      })
      return {cue, knowledge}
    },

    hasActiveContext() {
      const preset = PRESETS[this.settings.activePreset]
      return Boolean(
        this.settings.nextReply ||
        preset?.rules?.length ||
        Object.values(this.settings.guards).some(Boolean) ||
        this.settings.cues.some(
          cue => cue.enabled && ['waiting', 'armed'].includes(cue.status)
        ) ||
        this.settings.knowledge.some(item => item.enabled)
      )
    },

    buildBlock(userText = '') {
      const lines = []
      const preset = PRESETS[this.settings.activePreset]
      const prepared = this.getPrepared(userText)

      if (this.settings.nextReply) {
        lines.push('[NEXT_REPLY]', this.settings.nextReply, '[/NEXT_REPLY]')
      }
      if (prepared.cue) {
        lines.push('[DIRECTOR_CUE]', prepared.cue.text, '[/DIRECTOR_CUE]')
      }
      if (preset?.rules?.length) {
        lines.push(
          '[DIRECTOR_PRESET]',
          `Preset: ${preset.name}`,
          ...preset.rules.map(rule => `- ${rule}`),
          '[/DIRECTOR_PRESET]'
        )
      }

      const activeGuards = Object.entries(this.settings.guards)
        .filter(([, enabled]) => enabled)
        .map(([key]) => GUARDS[key][1])
      if (activeGuards.length) {
        lines.push(
          '[USER_CONTROL_GUARDS]',
          ...activeGuards.map(rule => `- ${rule}`),
          '[/USER_CONTROL_GUARDS]'
        )
      }

      if (prepared.knowledge.length) {
        lines.push('[KNOWLEDGE_BOUNDARIES]')
        for (const item of prepared.knowledge) {
          lines.push(
            `Truth${item.title ? ` — ${item.title}` : ''}: ${item.truth}`
          )
          if (item.knows) lines.push(`Knows: ${item.knows}`)
          if (item.suspects) lines.push(`Suspects: ${item.suspects}`)
          if (item.unknown) lines.push(`Does not know: ${item.unknown}`)
        }
        lines.push('[/KNOWLEDGE_BOUNDARIES]')
      }

      this._lastPrepared = {
        userText: String(userText || ''),
        cueId: prepared.cue?.id || null
      }
      return lines.join('\n\n')
    },

    async consumeAfterInjection(userText = '') {
      this._lastConsumed = {text: String(userText || ''), time: Date.now()}
      const prepared =
        this._lastPrepared?.userText === String(userText || '')
          ? this._lastPrepared
          : {cueId: this.getPrepared(userText).cue?.id || null}
      const cues = this.settings.cues.map(cue => {
        if (!cue.enabled || !['waiting', 'armed'].includes(cue.status))
          return cue
        if (cue.id === prepared.cueId) {
          return {...cue, status: cue.reusable ? 'waiting' : 'sent'}
        }
        if (cue.trigger === 'turns' && cue.status === 'waiting') {
          return {...cue, turnsRemaining: Math.max(1, cue.turnsRemaining - 1)}
        }
        return cue
      })
      this._lastPrepared = null
      await this.update({nextReply: '', cues})
    },

    async consumeWithoutInjection(userText = '') {
      const text = String(userText || '')
      if (
        this._lastConsumed?.text === text &&
        Date.now() - this._lastConsumed.time < 1200
      ) {
        return false
      }
      this._lastConsumed = {text, time: Date.now()}
      const cues = this.settings.cues.map(cue => {
        if (
          cue.enabled &&
          cue.status === 'waiting' &&
          cue.trigger === 'turns'
        ) {
          return {...cue, turnsRemaining: Math.max(1, cue.turnsRemaining - 1)}
        }
        return cue
      })
      await this.update({cues})
      return true
    },

    getDiagnostics(sample = '') {
      const prepared = this.getPrepared(sample)
      const preset = PRESETS[this.settings.activePreset]
      return {
        nextReply: Boolean(this.settings.nextReply),
        cue: prepared.cue,
        waitingCues: this.settings.cues.filter(
          cue => cue.enabled && ['waiting', 'armed'].includes(cue.status)
        ).length,
        guards: Object.values(this.settings.guards).filter(Boolean).length,
        preset: preset?.name || 'No preset',
        knowledge: prepared.knowledge.length,
        continuity: Atelier.ContinuityManager?.select?.(sample) || null
      }
    },

    attachComposer(textarea) {
      const form = textarea?.closest?.('form')
      if (!form || form.querySelector(':scope > .furina-director-quick')) return
      form.classList.add('furina-director-quick-host')
      const wrap = document.createElement('div')
      wrap.className = 'furina-director-quick'
      wrap.dataset.furinaOwned = 'true'
      const toggle = document.createElement('button')
      toggle.type = 'button'
      toggle.className = 'furina-director-quick-toggle'
      toggle.textContent = '🎬'
      toggle.title = 'Quick Director — next-reply direction'
      toggle.setAttribute('aria-label', 'Open Quick Director')
      toggle.setAttribute('aria-expanded', 'false')
      const popover = document.createElement('div')
      popover.className = 'furina-director-quick-popover'
      popover.hidden = true
      wrap.append(toggle, popover)
      form.appendChild(wrap)

      const render = () => {
        popover.replaceChildren()
        const heading = document.createElement('div')
        heading.className = 'furina-director-quick-heading'
        heading.textContent = 'NEXT REPLY'
        const direction = document.createElement('textarea')
        direction.className = 'furina-director-quick-input'
        direction.rows = 3
        direction.value = this.settings.nextReply
        direction.placeholder = 'Direction for the next reply only…'
        const cue = this.settings.cues.find(
          item => item.enabled && ['waiting', 'armed'].includes(item.status)
        )
        const cueLine = document.createElement('div')
        cueLine.className = 'furina-director-quick-cue'
        cueLine.textContent = cue
          ? `Next cue: ${cue.text}`
          : 'No waiting Director cues.'
        const actions = document.createElement('div')
        actions.className = 'furina-director-quick-actions'
        const open = document.createElement('button')
        open.type = 'button'
        open.textContent = 'Open Director'
        const save = document.createElement('button')
        save.type = 'button'
        save.textContent = 'Save'
        save.className = 'furina-director-quick-save'
        save.addEventListener('click', async () => {
          await this.update({nextReply: direction.value})
          popover.hidden = true
          toggle.setAttribute('aria-expanded', 'false')
        })
        open.addEventListener('click', () => {
          Atelier.PanelShell?.open?.()
          Atelier.PanelShell?.navigate?.('director', 'direct')
        })
        actions.append(open, save)
        popover.append(heading, direction, cueLine, actions)
        wrap.classList.toggle(
          'furina-director-quick-active',
          this.hasActiveContext()
        )
      }
      wrap._furinaRender = render
      render()
      toggle.addEventListener('click', () => {
        popover.hidden = !popover.hidden
        toggle.setAttribute('aria-expanded', String(!popover.hidden))
        if (!popover.hidden) {
          render()
          popover.querySelector('textarea')?.focus()
        }
      })
    },

    refreshQuickControls() {
      document
        .querySelectorAll('.furina-director-quick')
        .forEach(element => element._furinaRender?.())
    }
  }
})()
