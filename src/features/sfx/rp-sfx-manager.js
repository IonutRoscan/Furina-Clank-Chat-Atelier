'use strict'


/*
  Developer notes

  Conversation-scoped roleplay sound engine. It watches newly streamed assistant
  text, matches conservative phrase families and fires each cue with cooldown and
  deduplication guards. Existing history is seeded silently so opening an old
  conversation never replays every event it contains.

  Manual user cues share the same sound categories but are explicit: user message
  text is not keyword-scanned by default. Custom URLs are optional overrides and
  should fall back to the built-in procedural cue when playback fails.
*/
/*
    Furina RP SFX Manager

    Watches only standard-chat assistant messages and reacts to newly streamed
    text. Existing conversation history is silently seeded so opening an old
    chat never causes a burst of sound effects.

    Built-in sounds are procedural Web Audio cues. Users can optionally replace
    any category with a direct audio URL and can add conversation-specific
    trigger phrases without changing Furina's code.
*/
;(() => {
  const A = (window.ClankAtelier = window.ClankAtelier || {})
  if (A.RpSfxManager) return

  const STORAGE_KEY = 'furina-conversation-rp-sfx-v1'
  const MAX_CUSTOM_PHRASES = 24
  const MAX_PHRASE_LENGTH = 90
  const HISTORY_GUARD_MS = 900
  const USER_QUEUE_LIMIT = 3
  const USER_SEND_TIMEOUT_MS = 10000

  const CATEGORY_DEFS = Object.freeze({
    door: {
      label: 'Door',
      description: 'Doors and gates opening, shutting, slamming, or creaking.',
      cooldown: 2600,
      strict: [
        /\b(?:door|gate)s?\s+(?:slammed|slams|shut|closed|creaked|creaks|opened|opens)\b/i,
        /\b(?:slammed|shut|closed|opened)\s+(?:the|a|an|his|her|their|its)?\s*(?:door|gate)\b/i
      ],
      loose: [/\b(?:door|gate)\s+creak(?:ed|s|ing)?\b/i]
    },
    knock: {
      label: 'Knock',
      description: 'Knocking, rapping, or pounding at a door/window.',
      cooldown: 2200,
      strict: [
        /\b(?:knock(?:ed|ing|s)?|rap(?:ped|ping|s)?|pound(?:ed|ing|s)?)\s+(?:on|at)\s+(?:the\s+)?(?:door|window|wood)\b/i,
        /\b(?:a|another|three|two|several)\s+(?:sharp\s+|soft\s+|heavy\s+)?knocks?\b/i
      ],
      loose: [/\bknock(?:ed|ing|s)?\b/i]
    },
    footsteps: {
      label: 'Footsteps',
      description: 'Approaching steps, boots, heels, or heavy movement.',
      cooldown: 3200,
      strict: [
        /\bfootsteps?\s+(?:approach(?:ed|es|ing)?|echo(?:ed|es|ing)?|thud(?:ded|s|ding)?|crept|came|grew)\b/i,
        /\b(?:boots?|heels?|shoes?)\s+(?:thud(?:ded|s|ding)?|click(?:ed|s|ing)?|clack(?:ed|s|ing)?|scrap(?:ed|es|ing)?)\b/i
      ],
      loose: [/\bfootsteps?\b/i]
    },
    thunder: {
      label: 'Thunder',
      description: 'Thunder cracks, booms, and storm rumbles.',
      cooldown: 4300,
      strict: [
        /\bthunder\s+(?:crack(?:ed|s)?|boom(?:ed|s)?|roll(?:ed|s)?|rumbl(?:ed|es|ing))\b/i,
        /\b(?:crack|boom|rumble)\s+of\s+thunder\b/i
      ],
      loose: [/\bthunder(?:ous)?\b/i]
    },
    rain: {
      label: 'Rain',
      description: 'Rain beginning, pouring, hammering, or drumming nearby.',
      cooldown: 6000,
      strict: [
        /\brain\s+(?:began|starts?|started|poured|pours|hammered|hammers|drummed|drums|lashed|lashes)\b/i,
        /\b(?:downpour|rainfall)\s+(?:began|started|intensified|pounded)\b/i
      ],
      loose: [/\b(?:heavy\s+rain|downpour|rainstorm)\b/i]
    },
    glass: {
      label: 'Glass',
      description: 'Breaking glass, windows, mirrors, and bottles.',
      cooldown: 3000,
      strict: [
        /\b(?:glass|window|mirror|bottle)\s+(?:shattered|shatters|broke|breaks|cracked|cracks)\b/i,
        /\b(?:shattered|broke|breaks?)\s+(?:the\s+)?(?:glass|window|mirror|bottle)\b/i
      ],
      loose: [/\b(?:shatter(?:ed|s|ing)|glass\s+breaking)\b/i]
    },
    gunshot: {
      label: 'Gunshot',
      description: 'Explicit gunfire, gunshots, pistols, or rifles firing.',
      cooldown: 2600,
      strict: [
        /\b(?:gunshot|gunfire|shot)\s+(?:rang|rings|cracked|cracks|echoed|echoes)\s+out\b/i,
        /\b(?:pistol|gun|rifle|revolver|shotgun)\s+(?:fired|fires|barked|barks)\b/i,
        /\b(?:fired|fires)\s+(?:the\s+|a\s+)?(?:pistol|gun|rifle|revolver|shotgun)\b/i
      ],
      loose: [/\b(?:gunshot|gunfire)\b/i]
    },
    explosion: {
      label: 'Explosion',
      description: 'Explosions, detonations, and violent blasts.',
      cooldown: 4300,
      strict: [
        /\b(?:explosion|detonation|blast)\s+(?:erupted|erupts|boomed|booms|detonated|ripped|rocked)\b/i,
        /\b(?:bomb|grenade|device|car|building)\s+(?:exploded|detonated|blew\s+up)\b/i
      ],
      loose: [/\b(?:explosion|detonation|exploded)\b/i]
    },
    metal: {
      label: 'Metal / blades',
      description: 'Sword clashes, steel ringing, and metallic impacts.',
      cooldown: 2500,
      strict: [
        /\b(?:swords?|blades?|steel)\s+(?:clashed|clash|rang|rings|collided|met)\b/i,
        /\b(?:metallic\s+)?(?:clang|clank)\s+(?:rang|echoed|sounded)\b/i
      ],
      loose: [/\b(?:sword\s+clash|metallic\s+clang|steel\s+rang)\b/i]
    },
    heartbeat: {
      label: 'Heartbeat',
      description: 'A pounding heart, audible heartbeat, or hammering pulse.',
      cooldown: 4800,
      strict: [
        /\b(?:heart|heartbeat)\s+(?:pounded|pounds|hammered|hammers|thudded|thuds|raced|races)\b/i,
        /\bpulse\s+(?:hammered|hammers|pounded|pounds|throbbed|throbs)\b/i
      ],
      loose: [/\bheartbeat\b/i]
    },
    phone: {
      label: 'Phone',
      description: 'Phones ringing, buzzing, or a ringtone starting.',
      cooldown: 4300,
      strict: [
        /\b(?:phone|telephone|cellphone|mobile)\s+(?:rang|rings|buzzed|buzzes|vibrated|vibrates)\b/i,
        /\bringtone\s+(?:started|began|rang|played|plays)\b/i
      ],
      loose: [/\b(?:phone\s+ringing|ringtone)\b/i]
    },
    fire: {
      label: 'Fire',
      description: 'Fire crackling, roaring, or flames suddenly catching.',
      cooldown: 5200,
      strict: [
        /\b(?:fire|flames?)\s+(?:crackled|crackles|roared|roars|hissed|hisses|caught|ignited)\b/i,
        /\b(?:wood|embers?)\s+(?:crackled|crackles|popped|pops)\b/i
      ],
      loose: [/\b(?:fire\s+crackling|flames?\s+roared)\b/i]
    },
    electric: {
      label: 'Electricity',
      description: 'Electrical crackles, sparks, static, and power surges.',
      cooldown: 3600,
      strict: [
        /\b(?:electricity|static|current)\s+(?:crackled|crackles|buzzed|buzzes|hummed|hums)\b/i,
        /\b(?:sparks?|wires?)\s+(?:crackled|crackles|snapped|snaps|buzzed|buzzes)\b/i
      ],
      loose: [/\b(?:electrical\s+crackle|static\s+burst|power\s+surge)\b/i]
    }
  })

  const categoryIds = Object.freeze(Object.keys(CATEGORY_DEFS))

  const makeCategoryMap = value =>
    Object.fromEntries(categoryIds.map(id => [id, value]))
  const makeCustomMap = () =>
    Object.fromEntries(categoryIds.map(id => [id, {phrases: [], url: ''}]))

  const defaults = Object.freeze({
    enabled: false,
    assistantDetection: true,
    volume: 0.34,
    sensitivity: 'conservative',
    masterCooldown: 650,
    categories: makeCategoryMap(true),
    custom: makeCustomMap()
  })

  let conversationId = null
  let settings = cloneDefaults()
  let audioContext = null
  let noiseBuffer = null
  let routeArmedAt = 0
  let lastGlobalPlay = 0
  let playQueue = Promise.resolve()
  const lastCategoryPlay = new Map()
  const messageStates = new WeakMap()
  const historicalMessages = new WeakSet()
  const knownUserMessages = new WeakSet()
  const remoteAudio = new Map()
  let queuedUserCues = []
  let pendingUserSend = null
  let pendingUserSendTimer = null

  function cloneDefaults() {
    return {
      enabled: defaults.enabled,
      assistantDetection: defaults.assistantDetection,
      volume: defaults.volume,
      sensitivity: defaults.sensitivity,
      masterCooldown: defaults.masterCooldown,
      categories: {...defaults.categories},
      custom: Object.fromEntries(
        categoryIds.map(id => [id, {phrases: [], url: ''}])
      )
    }
  }

  const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, Number(value) || 0))

  function sanitizeUrl(value) {
    const text = String(value || '')
      .trim()
      .slice(0, 1000)
    if (!text) return ''
    try {
      const url = new URL(text)
      return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
    } catch (_) {
      return ''
    }
  }

  function sanitizePhrases(input) {
    const values = Array.isArray(input)
      ? input
      : String(input || '').split(/\r?\n/)
    const seen = new Set()
    const result = []
    for (const raw of values) {
      const phrase = String(raw || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_PHRASE_LENGTH)
      const key = phrase.toLocaleLowerCase()
      if (phrase.length < 3 || seen.has(key)) continue
      seen.add(key)
      result.push(phrase)
      if (result.length >= MAX_CUSTOM_PHRASES) break
    }
    return result
  }

  function sanitizeSettings(raw) {
    const out = cloneDefaults()
    out.enabled = raw?.enabled === true
    out.assistantDetection = raw?.assistantDetection !== false
    out.volume = clamp(raw?.volume ?? defaults.volume, 0, 1)
    out.sensitivity = ['conservative', 'normal'].includes(raw?.sensitivity)
      ? raw.sensitivity
      : defaults.sensitivity
    out.masterCooldown = clamp(
      raw?.masterCooldown ?? defaults.masterCooldown,
      250,
      1800
    )

    for (const id of categoryIds) {
      out.categories[id] = raw?.categories?.[id] !== false
      out.custom[id] = {
        phrases: sanitizePhrases(raw?.custom?.[id]?.phrases),
        url: sanitizeUrl(raw?.custom?.[id]?.url)
      }
    }
    return out
  }

  function getAudioContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    if (!audioContext || audioContext.state === 'closed')
      audioContext = new Ctx()
    if (audioContext.state === 'suspended')
      audioContext.resume().catch(() => {})
    return audioContext
  }

  function getNoiseBuffer(ctx) {
    if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate)
      return noiseBuffer
    const length = Math.max(1, Math.floor(ctx.sampleRate * 1.5))
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    noiseBuffer = buffer
    return buffer
  }

  function connectGain(ctx, at, duration, peak, destination = ctx.destination) {
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peak),
      at + Math.min(0.015, duration * 0.15)
    )
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    gain.connect(destination)
    return gain
  }

  function tone(
    ctx,
    at,
    frequency,
    duration,
    gain,
    type = 'sine',
    endFrequency = null
  ) {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(Math.max(25, frequency), at)
    if (endFrequency) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(25, endFrequency),
        at + duration
      )
    }
    osc.connect(connectGain(ctx, at, duration, gain))
    osc.start(at)
    osc.stop(at + duration + 0.025)
  }

  function noise(
    ctx,
    at,
    duration,
    gain,
    {type = 'bandpass', frequency = 900, q = 0.8} = {}
  ) {
    const source = ctx.createBufferSource()
    source.buffer = getNoiseBuffer(ctx)
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(Math.max(30, frequency), at)
    filter.Q.setValueAtTime(q, at)
    source.connect(filter).connect(connectGain(ctx, at, duration, gain))
    source.start(at, Math.random() * 0.25)
    source.stop(at + duration + 0.025)
  }

  function proceduralCue(id, volume = settings.volume) {
    const ctx = getAudioContext()
    if (!ctx || volume <= 0) return false
    const v = clamp(volume, 0, 1)
    const at = ctx.currentTime + 0.008

    switch (id) {
      case 'door':
        noise(ctx, at, 0.16, 0.24 * v, {
          type: 'lowpass',
          frequency: 650,
          q: 0.4
        })
        tone(ctx, at + 0.03, 115, 0.18, 0.3 * v, 'triangle', 72)
        break
      case 'knock':
        for (const offset of [0, 0.16, 0.31]) {
          noise(ctx, at + offset, 0.055, 0.21 * v, {
            type: 'bandpass',
            frequency: 520,
            q: 1.1
          })
          tone(ctx, at + offset, 145, 0.07, 0.18 * v, 'triangle', 95)
        }
        break
      case 'footsteps':
        for (const offset of [0, 0.24, 0.49]) {
          tone(ctx, at + offset, 82, 0.12, 0.26 * v, 'sine', 58)
          noise(ctx, at + offset, 0.08, 0.1 * v, {
            type: 'lowpass',
            frequency: 380,
            q: 0.5
          })
        }
        break
      case 'thunder':
        noise(ctx, at, 0.85, 0.32 * v, {
          type: 'lowpass',
          frequency: 320,
          q: 0.55
        })
        tone(ctx, at + 0.02, 72, 0.72, 0.28 * v, 'sine', 38)
        noise(ctx, at + 0.2, 0.52, 0.15 * v, {
          type: 'bandpass',
          frequency: 720,
          q: 0.35
        })
        break
      case 'rain':
        noise(ctx, at, 0.9, 0.16 * v, {
          type: 'highpass',
          frequency: 2400,
          q: 0.3
        })
        noise(ctx, at + 0.05, 0.8, 0.08 * v, {
          type: 'bandpass',
          frequency: 4300,
          q: 0.6
        })
        break
      case 'glass':
        noise(ctx, at, 0.18, 0.18 * v, {
          type: 'highpass',
          frequency: 3200,
          q: 0.3
        })
        ;[2300, 3100, 4100, 5250].forEach((f, i) =>
          tone(
            ctx,
            at + i * 0.025,
            f,
            0.2 + i * 0.025,
            0.055 * v,
            'sine',
            f * 0.62
          )
        )
        break
      case 'gunshot':
        noise(ctx, at, 0.09, 0.48 * v, {
          type: 'highpass',
          frequency: 850,
          q: 0.2
        })
        tone(ctx, at, 92, 0.21, 0.38 * v, 'triangle', 42)
        noise(ctx, at + 0.08, 0.22, 0.12 * v, {
          type: 'lowpass',
          frequency: 700,
          q: 0.45
        })
        break
      case 'explosion':
        noise(ctx, at, 0.62, 0.38 * v, {
          type: 'lowpass',
          frequency: 520,
          q: 0.35
        })
        tone(ctx, at, 68, 0.55, 0.36 * v, 'sine', 30)
        noise(ctx, at + 0.12, 0.45, 0.13 * v, {
          type: 'bandpass',
          frequency: 1150,
          q: 0.4
        })
        break
      case 'metal':
        noise(ctx, at, 0.09, 0.11 * v, {
          type: 'highpass',
          frequency: 2800,
          q: 0.3
        })
        ;[720, 1320, 2110].forEach((f, i) =>
          tone(
            ctx,
            at + i * 0.008,
            f,
            0.42 - i * 0.05,
            (0.14 - i * 0.025) * v,
            'sine',
            f * 0.92
          )
        )
        break
      case 'heartbeat':
        for (const [offset, peak] of [
          [0, 0.29],
          [0.18, 0.2]
        ]) {
          tone(ctx, at + offset, 64, 0.14, peak * v, 'sine', 42)
          noise(ctx, at + offset, 0.06, 0.07 * v, {
            type: 'lowpass',
            frequency: 260,
            q: 0.5
          })
        }
        break
      case 'phone':
        for (const offset of [0, 0.19, 0.52, 0.71]) {
          tone(ctx, at + offset, 880, 0.12, 0.1 * v, 'sine', 980)
          tone(ctx, at + offset, 1180, 0.12, 0.055 * v, 'sine', 1080)
        }
        break
      case 'fire':
        noise(ctx, at, 0.82, 0.1 * v, {
          type: 'bandpass',
          frequency: 1300,
          q: 0.55
        })
        ;[0, 0.13, 0.27, 0.41, 0.62].forEach((offset, i) => {
          noise(ctx, at + offset, 0.035, (0.12 - i * 0.01) * v, {
            type: 'highpass',
            frequency: 2600 + i * 240,
            q: 0.4
          })
        })
        break
      case 'electric':
        tone(ctx, at, 118, 0.48, 0.08 * v, 'sawtooth', 132)
        tone(ctx, at, 236, 0.48, 0.045 * v, 'square', 264)
        ;[0, 0.11, 0.29, 0.38].forEach(offset =>
          noise(ctx, at + offset, 0.045, 0.13 * v, {
            type: 'highpass',
            frequency: 3400,
            q: 0.45
          })
        )
        break
      default:
        return false
    }
    return true
  }

  async function playRemote(id, url, volume) {
    if (!url) return false
    try {
      let audio = remoteAudio.get(id)
      if (!audio || audio.dataset?.furinaSource !== url) {
        audio = new Audio(url)
        audio.preload = 'auto'
        audio.dataset.furinaSource = url
        remoteAudio.set(id, audio)
      }
      audio.pause()
      audio.currentTime = 0
      audio.volume = clamp(volume, 0, 1)
      await audio.play()
      return true
    } catch (_) {
      return false
    }
  }

  function eventDetail(
    id,
    source = 'built-in',
    matched = '',
    origin = 'assistant-auto'
  ) {
    return {
      id,
      label: CATEGORY_DEFS[id]?.label || id,
      source,
      matched,
      origin,
      conversationId
    }
  }

  async function playNow(
    id,
    {
      force = false,
      directed = false,
      volume = settings.volume,
      matched = '',
      origin = 'assistant-auto'
    } = {}
  ) {
    if (!CATEGORY_DEFS[id]) return false
    if (!force && !settings.enabled) return false
    if (!force && !directed && settings.categories[id] === false) return false

    const now = performance.now()
    const categoryCooldown = CATEGORY_DEFS[id].cooldown || 2500
    if (
      !force &&
      !directed &&
      now - (lastCategoryPlay.get(id) || 0) < categoryCooldown
    )
      return false

    const wait = force
      ? 0
      : Math.max(0, settings.masterCooldown - (now - lastGlobalPlay))
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))

    let source = 'built-in'
    const url = settings.custom[id]?.url || ''
    let played = false
    if (url) {
      played = await playRemote(id, url, volume)
      source = played ? 'custom-url' : 'built-in'
    }
    if (!played) played = proceduralCue(id, volume)
    if (!played) return false

    const stamp = performance.now()
    lastGlobalPlay = stamp
    lastCategoryPlay.set(id, stamp)
    window.dispatchEvent(
      new CustomEvent('furina-rp-sfx-fired', {
        detail: eventDetail(id, source, matched, origin)
      })
    )
    return true
  }

  function enqueue(id, options = {}) {
    const operation = playQueue
      .catch(() => false)
      .then(() => playNow(id, options))
    playQueue = operation
    return operation
  }

  function normalizeSource(text) {
    return String(text || '')
      .replace(/\[FURINA_[\s\S]*?\]/gi, ' ')
      .replace(/[`*_>#~|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function normalizeUserSource(text) {
    let value = String(text || '')
    try {
      if (typeof A.stripDirectorBlocks === 'function')
        value = A.stripDirectorBlocks(value)
    } catch (_) {}
    return value.replace(/\s+/g, ' ').trim()
  }

  function dispatchUserQueueChanged() {
    window.dispatchEvent(
      new CustomEvent('furina-rp-sfx-user-queue-changed', {
        detail: {
          queue: queuedUserCues.slice(),
          pending: Boolean(pendingUserSend),
          enabled: settings.enabled
        }
      })
    )
  }

  function clearPendingUserSend({keepQueue = true} = {}) {
    if (pendingUserSendTimer) {
      clearTimeout(pendingUserSendTimer)
      pendingUserSendTimer = null
    }
    pendingUserSend = null
    if (!keepQueue) queuedUserCues = []
    dispatchUserQueueChanged()
  }

  function setUserQueue(next) {
    const clean = []
    for (const raw of Array.isArray(next) ? next : []) {
      const id = String(raw || '')
      if (!CATEGORY_DEFS[id] || clean.includes(id)) continue
      clean.push(id)
      if (clean.length >= USER_QUEUE_LIMIT) break
    }
    queuedUserCues = clean
    dispatchUserQueueChanged()
    return queuedUserCues.slice()
  }

  function toggleUserCue(id) {
    if (!CATEGORY_DEFS[id])
      return {ok: false, reason: 'unknown', queue: queuedUserCues.slice()}
    if (!settings.enabled)
      return {ok: false, reason: 'disabled', queue: queuedUserCues.slice()}
    const next = queuedUserCues.slice()
    const index = next.indexOf(id)
    if (index !== -1) next.splice(index, 1)
    else {
      if (next.length >= USER_QUEUE_LIMIT)
        return {ok: false, reason: 'limit', queue: next}
      next.push(id)
    }
    return {
      ok: true,
      reason: index !== -1 ? 'removed' : 'added',
      queue: setUserQueue(next)
    }
  }

  function clearUserQueue() {
    queuedUserCues = []
    clearPendingUserSend({keepQueue: true})
    return true
  }

  function armUserSend(rawDraft) {
    if (!settings.enabled || !queuedUserCues.length) return false
    const expected = normalizeUserSource(rawDraft)
    if (!expected) return false

    const now = performance.now()
    if (
      pendingUserSend &&
      pendingUserSend.expected === expected &&
      now - pendingUserSend.armedAt < 1200
    ) {
      return true
    }

    if (pendingUserSendTimer) clearTimeout(pendingUserSendTimer)
    pendingUserSend = {
      expected,
      cues: queuedUserCues.slice(),
      armedAt: now,
      conversationId
    }
    pendingUserSendTimer = setTimeout(() => {
      pendingUserSend = null
      pendingUserSendTimer = null
      dispatchUserQueueChanged()
    }, USER_SEND_TIMEOUT_MS)
    dispatchUserQueueChanged()
    return true
  }

  function observeUserMessage(message, rawSource) {
    if (
      !(message instanceof HTMLElement) ||
      !message.classList.contains('clank-atelier-message-user')
    )
      return
    if (knownUserMessages.has(message)) return
    knownUserMessages.add(message)
    if (!pendingUserSend || pendingUserSend.conversationId !== conversationId)
      return
    if (performance.now() - pendingUserSend.armedAt > USER_SEND_TIMEOUT_MS) {
      clearPendingUserSend({keepQueue: true})
      return
    }

    const actual = normalizeUserSource(rawSource)
    if (!actual || actual !== pendingUserSend.expected) return

    const cues = pendingUserSend.cues.slice()
    clearPendingUserSend({keepQueue: false})
    for (const id of cues) {
      enqueue(id, {
        directed: true,
        matched: 'Queued by user',
        origin: 'user-directed'
      })
    }
  }

  function findMatch(id, text) {
    if (!text || settings.categories[id] === false) return null
    const def = CATEGORY_DEFS[id]
    const custom = settings.custom[id]?.phrases || []
    const lower = text.toLocaleLowerCase()

    for (const phrase of custom) {
      const needle = phrase.toLocaleLowerCase()
      const index = lower.indexOf(needle)
      if (index !== -1) return {index, matched: phrase, custom: true}
    }

    const patterns =
      settings.sensitivity === 'normal'
        ? [...def.strict, ...(def.loose || [])]
        : def.strict

    let earliest = null
    for (const regex of patterns) {
      regex.lastIndex = 0
      const match = regex.exec(text)
      if (match && (!earliest || match.index < earliest.index)) {
        earliest = {index: match.index, matched: match[0], custom: false}
      }
    }
    return earliest
  }

  function analyze(text, fired = new Set()) {
    const matches = []
    for (const id of categoryIds) {
      if (fired.has(id)) continue
      const match = findMatch(id, text)
      if (match) matches.push({id, ...match})
    }
    matches.sort((a, b) => a.index - b.index)
    return matches
  }

  function getAssistantSelector() {
    return A.SELECTORS?.assistantMessage || '.clank-atelier-message-assistant'
  }

  function getUserSelector() {
    return A.SELECTORS?.userMessage || '.clank-atelier-message-user'
  }

  function seedExistingMessages() {
    const chat = document.querySelector(
      A.SELECTORS?.chatScroller || '#chat-scroll-container'
    )
    if (!chat) return
    const selector = getAssistantSelector()
    chat.querySelectorAll(selector).forEach(message => {
      historicalMessages.add(message)
      let source = ''
      try {
        source =
          typeof A.getMessageSource === 'function'
            ? A.getMessageSource(message)
            : message.textContent || ''
      } catch (_) {
        source = message.textContent || ''
      }
      messageStates.set(message, {
        text: normalizeSource(source),
        fired: new Set(),
        generation: 0
      })
    })
    chat
      .querySelectorAll(getUserSelector())
      .forEach(message => knownUserMessages.add(message))
  }

  function commonPrefixLength(a, b) {
    const limit = Math.min(a.length, b.length)
    let i = 0
    while (i < limit && a.charCodeAt(i) === b.charCodeAt(i)) i++
    return i
  }

  function observeMessage(message, rawSource) {
    if (!(message instanceof HTMLElement)) return
    if (message.classList.contains('clank-atelier-message-user')) {
      observeUserMessage(message, rawSource)
      return
    }
    if (!message.classList.contains('clank-atelier-message-assistant')) return
    const next = normalizeSource(rawSource)
    if (!next) return

    let state = messageStates.get(message)
    if (!state) {
      state = {text: '', fired: new Set(), generation: 0}
      messageStates.set(message, state)
    }

    /*
            A seeded history row gets one silent renderer observation even if
            its native DOM-to-Markdown form differs from the text used while
            seeding. This is the guard that prevents old chats from "playing"
            themselves when Furina first processes them.
        */
    if (historicalMessages.has(message)) {
      historicalMessages.delete(message)
      state.text = next
      return
    }

    if (!state.text && performance.now() - routeArmedAt < HISTORY_GUARD_MS) {
      state.text = next
      return
    }

    const prev = state.text || ''
    if (next === prev) return

    const common = commonPrefixLength(prev, next)
    const looksLikeRegeneration =
      prev.length > 45 &&
      next.length < prev.length * 0.58 &&
      common < Math.min(90, prev.length * 0.3)
    if (looksLikeRegeneration) {
      state.fired = new Set()
      state.generation += 1
    }

    let scanStart = looksLikeRegeneration ? 0 : Math.max(0, common - 100)
    if (!prev) scanStart = 0
    const segment = next.slice(scanStart)
    state.text = next

    if (!settings.enabled || !settings.assistantDetection) return
    const matches = analyze(segment, state.fired).slice(0, 2)
    for (const match of matches) {
      state.fired.add(match.id)
      enqueue(match.id, {matched: match.matched})
    }
  }

  async function saveCurrent(nextSettings) {
    if (!conversationId) return false
    const snapshot = sanitizeSettings(nextSettings)
    const ok = await A.Storage.updateObject(STORAGE_KEY, all => {
      all[conversationId] = snapshot
      return all
    })
    if (!ok) return false
    settings = snapshot
    window.dispatchEvent(
      new CustomEvent('furina-rp-sfx-settings-changed', {
        detail: manager.settings
      })
    )
    A.PanelShell?.refreshNavigation?.()
    return true
  }

  async function update(patch) {
    const next = sanitizeSettings({
      ...settings,
      ...patch,
      categories: patch?.categories
        ? {...settings.categories, ...patch.categories}
        : settings.categories,
      custom: patch?.custom
        ? {...settings.custom, ...patch.custom}
        : settings.custom
    })
    const ok = await saveCurrent(next)
    if (ok && next.enabled === false && queuedUserCues.length) clearUserQueue()
    return ok
  }

  async function updateCategory(id, patch) {
    if (!CATEGORY_DEFS[id]) return false
    const next = sanitizeSettings({
      ...settings,
      categories: {
        ...settings.categories,
        ...(Object.prototype.hasOwnProperty.call(patch || {}, 'enabled')
          ? {[id]: patch.enabled !== false}
          : {})
      },
      custom: {
        ...settings.custom,
        [id]: {
          ...settings.custom[id],
          ...(Object.prototype.hasOwnProperty.call(patch || {}, 'phrases')
            ? {phrases: sanitizePhrases(patch.phrases)}
            : {}),
          ...(Object.prototype.hasOwnProperty.call(patch || {}, 'url')
            ? {url: sanitizeUrl(patch.url)}
            : {})
        }
      }
    })
    return saveCurrent(next)
  }

  async function loadConversation(id) {
    conversationId = id || null
    settings = cloneDefaults()
    queuedUserCues = []
    clearPendingUserSend({keepQueue: true})
    routeArmedAt = performance.now()
    lastGlobalPlay = 0
    lastCategoryPlay.clear()
    if (!conversationId) return
    const all = await A.Storage.getObject(STORAGE_KEY, {})
    if (!conversationId || id !== conversationId) return
    settings = sanitizeSettings(all[conversationId])
    seedExistingMessages()
    setTimeout(seedExistingMessages, 250)
    window.dispatchEvent(
      new CustomEvent('furina-rp-sfx-settings-changed', {
        detail: manager.settings
      })
    )
  }

  async function syncConversation() {
    const id = A.getConversationId?.() || null
    if (id === conversationId) return false
    await loadConversation(id)
    return true
  }

  async function resetConversation() {
    if (!conversationId) return false
    const ok = await A.Storage.updateObject(STORAGE_KEY, all => {
      delete all[conversationId]
      return all
    })
    if (!ok) return false
    settings = cloneDefaults()
    queuedUserCues = []
    clearPendingUserSend({keepQueue: true})
    window.dispatchEvent(
      new CustomEvent('furina-rp-sfx-settings-changed', {
        detail: manager.settings
      })
    )
    return true
  }

  function testText(text) {
    return analyze(normalizeSource(text), new Set()).map(match => ({
      ...match,
      label: CATEGORY_DEFS[match.id].label
    }))
  }

  const manager = (A.RpSfxManager = {
    STORAGE_KEY,
    categories: CATEGORY_DEFS,
    categoryIds,
    defaults: cloneDefaults(),
    get conversationId() {
      return conversationId
    },
    get settings() {
      return sanitizeSettings(settings)
    },
    loadConversation,
    syncConversation,
    update,
    updateCategory,
    resetConversation,
    observeMessage,
    testText,
    get userQueue() {
      return queuedUserCues.slice()
    },
    get userQueueLimit() {
      return USER_QUEUE_LIMIT
    },
    toggleUserCue,
    setUserQueue,
    clearUserQueue,
    armUserSend,
    preview(id) {
      return enqueue(id, {
        force: true,
        volume: settings.volume,
        matched: 'Preview',
        origin: 'preview'
      })
    },
    unlock() {
      getAudioContext()
    },
    seedExistingMessages
  })
})()
