'use strict'


/*
  Developer notes

  Visual Novel Parser is part of Furina's optional Visual Novel interface. VN mode is isolated from
  standard-chat presentation so changes here should not be required for ordinary chat
  features. Preserve that boundary when extending the layout.
*/
;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  if (Atelier.VisualNovelParser) {
    return
  }

  function cleanText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  function normalizeBlock(block) {
    if (typeof block === 'string') {
      return {
        tag: 'p',

        text: cleanText(block)
      }
    }

    return {
      tag: String(block?.tag || 'p').toLowerCase(),

      text: cleanText(block?.text || '')
    }
  }

  function isLikelyQuotedDialogue(text) {
    const value = cleanText(text)

    if (!value) {
      return false
    }

    return /^["“][\s\S]+["”]$/.test(value) || /^['‘][\s\S]+['’]$/.test(value)
  }

  function parseProtocolMarker(text) {
    const value = cleanText(text)

    let match = value.match(/^\[\[VN:SPEAKER:([^\]\n]{1,80})\]\]\s*([\s\S]*)$/i)

    if (match) {
      const speaker = cleanText(match[1])

      const content = cleanText(match[2])

      if (speaker && content) {
        return {
          type: 'speaker',
          speaker,
          content
        }
      }
    }

    match = value.match(/^\[\[VN:NARRATION\]\]\s*([\s\S]+)$/i)

    if (match) {
      return {
        type: 'narration',
        speaker: null,
        content: cleanText(match[1])
      }
    }

    match = value.match(/^\[\[VN:SCENE:([^\]\n]{1,160})\]\]\s*$/i)

    if (match) {
      return {
        type: 'scene-heading',
        speaker: null,
        content: cleanText(match[1])
      }
    }

    if (/^\[\[VN:BREAK\]\]$/i.test(value)) {
      return {
        type: 'scene-break',
        speaker: null,
        content: 'Scene break'
      }
    }

    return null
  }

  function parseSpeakerPrefix(text) {
    const value = cleanText(text)

    const match = value.match(/^([^:\n]{1,80}):\s*([\s\S]+)$/)

    if (!match) {
      return null
    }

    const speaker = cleanText(match[1])

    const content = cleanText(match[2])

    if (!speaker || !content || speaker.length > 40) {
      return null
    }

    /*
            These are common narration / scene labels rather than
            character names. Keeping them out of speaker parsing avoids
            fake VN nameplates such as "Location" or "Note".
        */

    if (
      /^(note|notes|location|time|date|scene|setting|status|chapter|specific spot)$/i.test(
        speaker
      )
    ) {
      return null
    }

    return {
      speaker,
      content
    }
  }

  function createBeat({
    type,
    speaker = null,
    content,
    sourceMessageIndex,
    sourceBlockIndex
  }) {
    return {
      id: `${sourceMessageIndex}-${sourceBlockIndex}-${type}`,

      type,

      speaker,

      content: cleanText(content),

      sourceMessageIndex,

      sourceBlockIndex,

      sourceBlockIndices: [sourceBlockIndex]
    }
  }

  function parseBlock({
    block,
    sourceMessageIndex,
    sourceBlockIndex,
    fallbackSpeaker = null
  }) {
    const normalized = normalizeBlock(block)

    const tag = normalized.tag

    const text = normalized.text

    const protocol = parseProtocolMarker(text)

    if (protocol) {
      return createBeat({
        type: protocol.type,

        speaker: protocol.speaker || null,

        content: protocol.content,

        sourceMessageIndex,

        sourceBlockIndex
      })
    }

    if (tag === 'hr') {
      return createBeat({
        type: 'scene-break',

        content: 'Scene break',

        sourceMessageIndex,

        sourceBlockIndex
      })
    }

    if (!text) {
      return null
    }

    if (/^h[1-6]$/.test(tag)) {
      return createBeat({
        type: 'scene-heading',

        content: text,

        sourceMessageIndex,

        sourceBlockIndex
      })
    }

    const speakerBlock = parseSpeakerPrefix(text)

    if (speakerBlock) {
      return createBeat({
        type: 'speaker',

        speaker: speakerBlock.speaker,

        content: speakerBlock.content,

        sourceMessageIndex,

        sourceBlockIndex
      })
    }

    if (fallbackSpeaker && isLikelyQuotedDialogue(text)) {
      return createBeat({
        type: 'speaker',

        speaker: fallbackSpeaker,

        content: text,

        sourceMessageIndex,

        sourceBlockIndex
      })
    }

    return createBeat({
      type: 'narration',

      content: text,

      sourceMessageIndex,

      sourceBlockIndex
    })
  }

  function canMergeBeats(previous, beat) {
    if (!previous || !beat) {
      return false
    }

    const sameNarration =
      previous.type === 'narration' && beat.type === 'narration'

    const sameSpeaker =
      previous.type === 'speaker' &&
      beat.type === 'speaker' &&
      previous.speaker === beat.speaker

    return sameNarration || sameSpeaker
  }

  function mergeBeatInto(previous, beat) {
    previous.content = [previous.content, beat.content]
      .filter(Boolean)
      .join('\n\n')

    previous.sourceBlockIndices = [
      ...(previous.sourceBlockIndices || [previous.sourceBlockIndex]),
      ...(beat.sourceBlockIndices || [beat.sourceBlockIndex])
    ]

    return previous
  }

  function parseBlocks({blocks, sourceMessageIndex, fallbackSpeaker = null}) {
    const parsed = []

    blocks.forEach((block, sourceBlockIndex) => {
      const beat = parseBlock({
        block,
        sourceMessageIndex,
        sourceBlockIndex,
        fallbackSpeaker
      })

      if (!beat) {
        return
      }

      const previous = parsed[parsed.length - 1]

      if (canMergeBeats(previous, beat)) {
        mergeBeatInto(previous, beat)

        return
      }

      parsed.push(beat)
    })

    return parsed
  }

  Atelier.VisualNovelParser = {
    cleanText,

    parseProtocolMarker,

    parseSpeakerPrefix,

    parseBlock,

    canMergeBeats,

    mergeBeatInto,

    parseBlocks
  }
})()
