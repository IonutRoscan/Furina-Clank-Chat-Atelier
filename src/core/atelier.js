'use strict'


/*
  Developer notes

  This is the shared namespace bootstrap. Every content-script module attaches
  its public API to window.ClankAtelier so load order stays explicit and the
  page receives only one Furina global. Keep this file intentionally tiny.
*/
/*
    Furina Core Namespace

    Every Furina module shares one small global object named ClankAtelier.
    Modules attach their public managers and helper functions to this object
    instead of creating many unrelated globals on the page.

    Keeping this file tiny is intentional: it gives later files one reliable
    namespace without deciding which features must load first.
*/

window.ClankAtelier = window.ClankAtelier || {}

window.ClankAtelier.BUILD = '1.3.2'
