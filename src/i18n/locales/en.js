'use strict'

/*
  Developer notes

  En translation dictionary. This file only registers UI strings; feature logic
  belongs in the managers/sections that request those strings. Missing keys safely
  fall back through Furina's i18n layer.
*/
;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})
  Atelier.LocalePacks = Atelier.LocalePacks || {}
  Atelier.LocalePacks.en = {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    messages: {}
  }
})()
