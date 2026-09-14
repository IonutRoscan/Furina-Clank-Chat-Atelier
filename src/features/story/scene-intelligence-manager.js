'use strict'


/*
  Developer notes

  Stores user-reviewed scene recaps, timeline events and restorable snapshots.
  Furina does not invent summaries from nowhere: this manager preserves text the
  user reviewed or entered, then presents it through Previously On, timeline and
  Story Bible tools. Snapshot restore changes Furina state only, not Clank history.
*/
/*
    Scene Intelligence

    Builds a private, per-conversation story record from user-reviewed scene
    recaps, timeline events, and snapshots. It never invents a recap from chat
    text and never modifies Clank's backend conversation history.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})
  const clean = (value, max = 4000) =>
    String(value || '')
      .replace(/\[\/?FURINA_[A-Z0-9_]+\]/gi, '')
      .trim()
      .slice(0, max)
  const makeId = prefix =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  Atelier.SceneIntelligenceManager = {
    STORAGE_KEY: 'furina-conversation-scene-intelligence-v1',
    CHAPTER_STORAGE_KEY: 'furina-scene-chapters',
    conversationId: null,
    currentChapter: null,
    shownThisSession: new Set(),
    settings: {showOnOpen: false, recaps: [], timeline: [], snapshots: []},

    getDefaults() {
      return {showOnOpen: false, recaps: [], timeline: [], snapshots: []}
    },

    sanitizeRecap(value) {
      if (!value || typeof value !== 'object') return null
      const summary = clean(value.summary, 6000)
      if (!summary) return null
      return {
        id: clean(value.id, 160) || makeId('recap'),
        title: clean(value.title, 200) || 'Untitled Scene',
        summary,
        developments: clean(value.developments, 3000),
        openThreads: clean(value.openThreads, 3000),
        endingState: clean(value.endingState, 3000),
        nextHook: clean(value.nextHook, 2000),
        chapterId: clean(value.chapterId, 160),
        chapterTitle: clean(value.chapterTitle, 200),
        sceneState: this.sanitizeSceneSnapshot(value.sceneState),
        createdAt: Number(value.createdAt) || Date.now(),
        updatedAt: Number(value.updatedAt) || Date.now()
      }
    },

    sanitizeTimeline(value) {
      if (!value || typeof value !== 'object') return null
      const title = clean(value.title, 240)
      if (!title) return null
      return {
        id: clean(value.id, 160) || makeId('event'),
        title,
        dateLabel: clean(value.dateLabel, 160),
        details: clean(value.details, 4000),
        participants: clean(value.participants, 800),
        consequence: clean(value.consequence, 2000),
        status: ['completed', 'ongoing', 'planned'].includes(value.status)
          ? value.status
          : 'completed',
        chapterId: clean(value.chapterId, 160),
        chapterTitle: clean(value.chapterTitle, 200),
        createdAt: Number(value.createdAt) || Date.now()
      }
    },

    sanitizeSceneSnapshot(value) {
      const source = value && typeof value === 'object' ? value : {}
      const result = {}
      for (const key of [
        'title',
        'sceneNumber',
        'location',
        'time',
        'present',
        'absent',
        'weather',
        'mood',
        'objective',
        'threat',
        'conditions',
        'notes'
      ]) {
        result[key] = clean(source[key], key === 'notes' ? 3000 : 1200)
      }
      result.includeInDirector = source.includeInDirector !== false
      return result
    },

    sanitizeSnapshot(value) {
      if (!value || typeof value !== 'object') return null
      return {
        id: clean(value.id, 160) || makeId('snapshot'),
        title: clean(value.title, 200) || 'Scene Snapshot',
        branchNote: clean(value.branchNote, 3000),
        sceneState: this.sanitizeSceneSnapshot(value.sceneState),
        chapterId: clean(value.chapterId, 160),
        chapterTitle: clean(value.chapterTitle, 200),
        directorPreset: clean(value.directorPreset, 80),
        activeGuards: Array.isArray(value.activeGuards)
          ? value.activeGuards
              .map(v => clean(v, 80))
              .filter(Boolean)
              .slice(0, 30)
          : [],
        continuity: Array.isArray(value.continuity)
          ? value.continuity
              .map(item => ({
                id: clean(item?.id, 160),
                title: clean(item?.title, 140),
                category: clean(item?.category, 60),
                text: clean(item?.text, 2400)
              }))
              .filter(item => item.id || item.title)
              .slice(0, 200)
          : [],
        createdAt: Number(value.createdAt) || Date.now()
      }
    },

    sanitizeSettings(value) {
      const source = value && typeof value === 'object' ? value : {}
      return {
        showOnOpen: Boolean(source.showOnOpen),
        recaps: (Array.isArray(source.recaps) ? source.recaps : [])
          .map(v => this.sanitizeRecap(v))
          .filter(Boolean)
          .slice(0, 300),
        timeline: (Array.isArray(source.timeline) ? source.timeline : [])
          .map(v => this.sanitizeTimeline(v))
          .filter(Boolean)
          .slice(0, 800),
        snapshots: (Array.isArray(source.snapshots) ? source.snapshots : [])
          .map(v => this.sanitizeSnapshot(v))
          .filter(Boolean)
          .slice(0, 200)
      }
    },

    async loadConversation(conversationId) {
      this.conversationId = conversationId
      this.currentChapter = null
      if (!conversationId) {
        this.settings = this.getDefaults()
        return
      }
      const stored = await Atelier.Storage.getObject(this.STORAGE_KEY, {})
      if (this.conversationId !== conversationId) return
      this.settings = this.sanitizeSettings(stored[conversationId])
      this.currentChapter = await this.getCurrentChapter()
      if (
        this.settings.showOnOpen &&
        !this.shownThisSession.has(conversationId) &&
        this.getLatestRecap()
      ) {
        this.shownThisSession.add(conversationId)
        window.setTimeout(() => this.showPreviouslyOn(), 500)
      }
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
      const snapshot = this.sanitizeSettings(this.settings)
      this.settings = snapshot
      await Atelier.Storage.updateObject(this.STORAGE_KEY, stored => {
        stored[id] = snapshot
        return stored
      })
      return true
    },

    async update(values) {
      this.settings = this.sanitizeSettings({...this.settings, ...values})
      return await this.save()
    },

    async getChapters() {
      if (!this.conversationId) return []
      const stored = await Atelier.Storage.getObject(
        this.CHAPTER_STORAGE_KEY,
        {}
      )
      const chapters = stored[this.conversationId]
      return Array.isArray(chapters) ? chapters : []
    },

    async getCurrentChapter() {
      const chapters = await this.getChapters()
      return (
        [...chapters].sort(
          (a, b) => Number(b.createdAt) - Number(a.createdAt)
        )[0] || null
      )
    },

    getLatestRecap() {
      return (
        [...this.settings.recaps].sort(
          (a, b) => b.createdAt - a.createdAt
        )[0] || null
      )
    },

    async saveRecap(value) {
      const chapter =
        value.chapterId !== undefined ? null : await this.getCurrentChapter()
      const recap = this.sanitizeRecap({
        ...value,
        chapterId: value.chapterId ?? chapter?.id ?? '',
        chapterTitle: value.chapterTitle ?? chapter?.title ?? '',
        sceneState: value.sceneState || Atelier.SceneStateManager?.settings,
        updatedAt: Date.now()
      })
      if (!recap) return false
      const recaps = [...this.settings.recaps]
      const index = recaps.findIndex(item => item.id === recap.id)
      if (index >= 0) {
        recap.createdAt = recaps[index].createdAt
        recaps[index] = recap
      } else recaps.unshift(recap)
      await this.update({recaps})
      return recap
    },

    async removeRecap(id) {
      return await this.update({
        recaps: this.settings.recaps.filter(item => item.id !== id)
      })
    },

    async saveTimeline(value) {
      const chapter =
        value.chapterId !== undefined ? null : await this.getCurrentChapter()
      const event = this.sanitizeTimeline({
        ...value,
        chapterId: value.chapterId ?? chapter?.id ?? '',
        chapterTitle: value.chapterTitle ?? chapter?.title ?? ''
      })
      if (!event) return false
      const timeline = [...this.settings.timeline]
      const index = timeline.findIndex(item => item.id === event.id)
      if (index >= 0) timeline[index] = event
      else timeline.push(event)
      timeline.sort((a, b) => a.createdAt - b.createdAt)
      await this.update({timeline})
      return event
    },

    async removeTimeline(id) {
      return await this.update({
        timeline: this.settings.timeline.filter(item => item.id !== id)
      })
    },

    async captureSnapshot(title, branchNote = '') {
      const chapter = await this.getCurrentChapter()
      const director2 = Atelier.Director2Manager?.settings || {}
      const snapshot = this.sanitizeSnapshot({
        id: makeId('snapshot'),
        title,
        branchNote,
        sceneState: Atelier.SceneStateManager?.settings,
        chapterId: chapter?.id || '',
        chapterTitle: chapter?.title || '',
        directorPreset: director2.activePreset || 'none',
        activeGuards: Object.entries(director2.guards || {})
          .filter(([, enabled]) => enabled)
          .map(([key]) => key),
        continuity: (Atelier.ContinuityManager?.settings?.entries || [])
          .filter(item => item.enabled)
          .map(item => ({
            id: item.id,
            title: item.title,
            category: item.category,
            text: item.text
          })),
        createdAt: Date.now()
      })
      const snapshots = [snapshot, ...this.settings.snapshots]
      await this.update({snapshots})
      return snapshot
    },

    async removeSnapshot(id) {
      return await this.update({
        snapshots: this.settings.snapshots.filter(item => item.id !== id)
      })
    },

    async restoreSnapshot(id) {
      const snapshot = this.settings.snapshots.find(item => item.id === id)
      if (!snapshot || !Atelier.SceneStateManager) return false
      await Atelier.SceneStateManager.updateMany(snapshot.sceneState)
      return true
    },

    buildBranchPackage(snapshot) {
      if (!snapshot) return ''
      const s = snapshot.sceneState
      const lines = [`FURINA SCENE SNAPSHOT — ${snapshot.title}`]
      if (snapshot.chapterTitle) lines.push(`Chapter: ${snapshot.chapterTitle}`)
      for (const [label, key] of [
        ['Scene', 'title'],
        ['Scene/Day', 'sceneNumber'],
        ['Location', 'location'],
        ['Time', 'time'],
        ['Present', 'present'],
        ['Not present', 'absent'],
        ['Mood', 'mood'],
        ['Objective', 'objective'],
        ['Threat', 'threat'],
        ['Conditions', 'conditions'],
        ['Notes', 'notes']
      ]) {
        if (s[key]) lines.push(`${label}: ${s[key]}`)
      }
      if (snapshot.branchNote)
        lines.push(`Alternate direction: ${snapshot.branchNote}`)
      if (snapshot.directorPreset && snapshot.directorPreset !== 'none')
        lines.push(`Director preset: ${snapshot.directorPreset}`)
      if (snapshot.activeGuards.length)
        lines.push(`Active guards: ${snapshot.activeGuards.join(', ')}`)
      if (snapshot.continuity.length) {
        lines.push('Relevant continuity:')
        snapshot.continuity.forEach(item =>
          lines.push(
            `- ${item.title || item.category}: ${item.text || 'Stored in Furina Vault'}`
          )
        )
      }
      return lines.join('\n')
    },

    async endScene(value, {clearScene = false, createSnapshot = true} = {}) {
      const recap = await this.saveRecap(value)
      if (!recap) return false
      await this.saveTimeline({
        title: recap.title,
        dateLabel: recap.sceneState.sceneNumber || recap.sceneState.time,
        details: recap.summary,
        participants: recap.sceneState.present,
        consequence: recap.developments || recap.endingState,
        status: 'completed',
        chapterId: recap.chapterId,
        chapterTitle: recap.chapterTitle,
        createdAt: recap.createdAt
      })
      if (createSnapshot)
        await this.captureSnapshot(`${recap.title} — Ending`, recap.nextHook)
      if (clearScene) await Atelier.SceneStateManager?.clear?.()
      return recap
    },

    showPreviouslyOn(recap = this.getLatestRecap()) {
      if (!recap || !document.body) return false
      if (
        document.body.classList.contains('furina-phantom-open') ||
        document.querySelector('.furina-vn-root')
      )
        return false
      document.getElementById('furina-previously-on')?.remove()
      const overlay = document.createElement('div')
      overlay.id = 'furina-previously-on'
      overlay.className = 'furina-previously-on'
      overlay.dataset.furinaOwned = 'true'
      const card = document.createElement('section')
      card.className = 'furina-previously-on-card'
      const kicker = document.createElement('div')
      kicker.className = 'furina-previously-on-kicker'
      kicker.textContent = 'PREVIOUSLY ON…'
      const title = document.createElement('h2')
      title.textContent = recap.title
      const chapter = document.createElement('div')
      chapter.className = 'furina-previously-on-chapter'
      chapter.textContent =
        recap.chapterTitle || recap.sceneState.sceneNumber || 'Current story'
      const summary = document.createElement('p')
      summary.textContent = recap.summary
      const facts = document.createElement('div')
      facts.className = 'furina-previously-on-facts'
      for (const [name, value] of [
        ['Location', recap.sceneState.location],
        ['Present', recap.sceneState.present],
        ['Unresolved', recap.openThreads],
        ['Next', recap.nextHook]
      ]) {
        if (!value) continue
        const row = document.createElement('div')
        const label = document.createElement('strong')
        label.textContent = name
        const text = document.createElement('span')
        text.textContent = value
        row.append(label, text)
        facts.append(row)
      }
      const close = document.createElement('button')
      close.type = 'button'
      close.textContent = 'Continue Story'
      close.addEventListener('click', () => overlay.remove())
      card.append(kicker, title, chapter, summary, facts, close)
      overlay.append(card)
      overlay.addEventListener('click', event => {
        if (event.target === overlay) overlay.remove()
      })
      document.body.append(overlay)
      close.focus()
      return true
    }
  }
})()
