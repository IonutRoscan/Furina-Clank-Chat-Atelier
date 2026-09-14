'use strict'


/*
  Developer notes

  Centralizes the DOM selectors Furina uses against Clank. When Clank changes
  markup, prefer fixing a selector here before scattering new Tailwind/class
  assumptions through feature code. Selectors should stay narrow enough that
  unrelated page UI cannot be mistaken for chat messages or the composer.
*/
/*
    Clank DOM Selectors

    Centralizes the current Clank selectors Furina depends on. Keeping these in one file makes site-DOM changes easier to diagnose and update.
*/

window.ClankAtelier = window.ClankAtelier || {}

window.ClankAtelier.SELECTORS = {
  // CHAT

  chatScroller: '#chat-scroll-container',

  // MESSAGE WRAPPERS

  assistantMessage:
    '#chat-scroll-container > div.flex.w-full.gap-3.flex-row.items-start',

  userMessage:
    '#chat-scroll-container > div.flex.w-full.gap-3.flex-row-reverse.items-center',

  // MESSAGE CONTENT

  messageBody: 'div.block.break-words.min-w-0',

  messageParagraph: 'p.break-words',

  // COMPOSER

  composer: 'textarea[placeholder="Type something"]',

  composerForm: 'textarea[placeholder="Type something"]',

  // MESSAGE ACTIONS

  editButton: 'button[aria-label="Edit message"]',

  reportButton: 'button[aria-label="Report bad response"]',

  likeButton: 'button[aria-label="Like"]',

  copyButton: 'button[aria-label="copy"]',

  deleteButton: 'button[aria-label="Delete message"]',

  continueButton: 'button[aria-label="Continue"]',

  regenerateButton: 'button[aria-label="Regenerate"]',

  regenerateDirectionButton: 'button[aria-label="Regenerate with direction"]',

  // CHAT CONTROLS

  scrollBottomButton: 'button[aria-label="Scroll to bottom"]',

  bestButton: 'button[aria-label="Best"]'
}
