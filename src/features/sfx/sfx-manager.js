'use strict'

/*
  Developer notes

  Global interface-sound engine for Furina controls. It is separate from roleplay
  SFX so users can mute UI feedback while keeping story sounds, or vice versa.
  Audio starts only after user interaction to remain compatible with browser
  autoplay rules.
*/
/*
    Furina Interface SFX Manager

    Global, opt-in interface audio. Sounds are synthesized with Web Audio so
    Furina ships no third-party audio files and can be tested immediately.
    Roleplay-triggered audio lives in the separate RpSfxManager so UI sounds stay independent.
*/
;(() => {
  const A = (window.ClankAtelier = window.ClankAtelier || {})
  if (A.SfxManager) return

  const KEY = 'furina-sfx-settings-v1'
  const defaults = Object.freeze({enabled: false, volume: 0.32, set: 'soft'})
  let settings = {...defaults}
  let context = null
  let lastPlay = new Map()
  let queue = Promise.resolve()

  const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0))
  const sanitize = raw => ({
    enabled: raw?.enabled === true,
    volume: clamp(raw?.volume ?? defaults.volume, 0, 1),
    set: ['soft', 'digital', 'mechanical'].includes(raw?.set)
      ? raw.set
      : defaults.set
  })

  function getContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    if (!context || context.state === 'closed') context = new Ctx()
    if (context.state === 'suspended') context.resume().catch(() => {})
    return context
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
    const amp = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(Math.max(30, frequency), at)
    if (endFrequency)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(30, endFrequency),
        at + duration
      )
    amp.gain.setValueAtTime(0.0001, at)
    amp.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, gain),
      at + Math.min(0.012, duration / 4)
    )
    amp.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    osc.connect(amp).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + duration + 0.02)
  }

  function pattern(name, set) {
    const soft = {
      'panel-open': [
        [420, 0.06, 0.07, 'sine', 560],
        [620, 0.075, 0.045, 'sine', 760]
      ],
      'panel-close': [[520, 0.07, 0.05, 'sine', 390]],
      navigate: [[540, 0.045, 0.045, 'sine', 610]],
      choice: [[620, 0.055, 0.06, 'sine', 760]],
      dice: [
        [260, 0.045, 0.055, 'triangle', 330],
        [390, 0.045, 0.05, 'triangle', 500],
        [610, 0.06, 0.045, 'triangle', 760]
      ],
      insert: [[520, 0.045, 0.05, 'sine', 660]],
      success: [
        [520, 0.05, 0.05, 'sine', 650],
        [780, 0.07, 0.045, 'sine', 920]
      ],
      test: [
        [440, 0.07, 0.06, 'sine', 560],
        [660, 0.09, 0.05, 'sine', 820]
      ]
    }
    const digital = {
      'panel-open': [
        [740, 0.045, 0.055, 'square', 900],
        [980, 0.04, 0.03, 'square', 1100]
      ],
      'panel-close': [[820, 0.055, 0.04, 'square', 580]],
      navigate: [[920, 0.032, 0.035, 'square', 1040]],
      choice: [[760, 0.04, 0.045, 'square', 980]],
      dice: [
        [330, 0.035, 0.05, 'square', 460],
        [520, 0.035, 0.045, 'square', 690],
        [880, 0.045, 0.04, 'square', 1080]
      ],
      insert: [[640, 0.035, 0.04, 'square', 820]],
      success: [
        [700, 0.04, 0.04, 'square', 900],
        [1050, 0.055, 0.035, 'square', 1240]
      ],
      test: [
        [620, 0.04, 0.05, 'square', 780],
        [980, 0.05, 0.035, 'square', 1180]
      ]
    }
    const mechanical = {
      'panel-open': [
        [180, 0.035, 0.07, 'triangle', 240],
        [310, 0.045, 0.045, 'square', 360]
      ],
      'panel-close': [[260, 0.045, 0.05, 'triangle', 150]],
      navigate: [[240, 0.028, 0.05, 'square', 290]],
      choice: [[320, 0.035, 0.055, 'triangle', 420]],
      dice: [
        [150, 0.03, 0.07, 'square', 180],
        [210, 0.03, 0.06, 'square', 260],
        [300, 0.04, 0.05, 'triangle', 390]
      ],
      insert: [[280, 0.035, 0.05, 'triangle', 370]],
      success: [
        [260, 0.04, 0.05, 'triangle', 340],
        [460, 0.055, 0.04, 'triangle', 560]
      ],
      test: [
        [220, 0.04, 0.06, 'triangle', 300],
        [420, 0.06, 0.045, 'triangle', 520]
      ]
    }
    const bank =
      set === 'digital' ? digital : set === 'mechanical' ? mechanical : soft
    return bank[name] || bank.navigate
  }

  function play(name, options = {}) {
    if (!settings.enabled && !options.force) return false
    const nowMs = performance.now()
    const cooldown = Number(options.cooldown ?? 55)
    if (!options.force && nowMs - (lastPlay.get(name) || 0) < cooldown)
      return false
    lastPlay.set(name, nowMs)
    const ctx = getContext()
    if (!ctx) return false
    const master = clamp(options.volume ?? settings.volume, 0, 1)
    if (master <= 0) return false
    const start = ctx.currentTime + 0.005
    let offset = 0
    for (const [freq, dur, level, type, end] of pattern(name, settings.set)) {
      tone(ctx, start + offset, freq, dur, level * master, type, end)
      offset += Math.max(0.018, dur * 0.48)
    }
    return true
  }

  async function update(patch) {
    const operation = queue.then(async () => {
      await manager.ready
      const next = sanitize({...settings, ...patch})
      const ok = await A.Storage.set(KEY, next)
      if (!ok) return false
      settings = next
      window.dispatchEvent(
        new CustomEvent('furina-sfx-settings-changed', {detail: {...settings}})
      )
      return true
    })
    queue = operation.catch(() => false)
    return operation
  }

  const manager = (A.SfxManager = {
    get settings() {
      return {...settings}
    },
    defaults: {...defaults},
    ready: A.Storage.get(KEY, defaults)
      .then(raw => {
        settings = sanitize(raw)
      })
      .catch(() => {
        settings = {...defaults}
      }),
    update,
    play,
    test() {
      return play('test', {force: true, cooldown: 0})
    }
  })

  globalThis.chrome?.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local' || !changes[KEY]) return
    settings = sanitize(changes[KEY].newValue)
    window.dispatchEvent(
      new CustomEvent('furina-sfx-settings-changed', {detail: {...settings}})
    )
  })
})()
