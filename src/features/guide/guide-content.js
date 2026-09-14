'use strict'


/*
  Developer notes

  Static guidebook content consumed by GuideManager. Keep examples synchronized
  with real panel routes and feature names so the guide never advertises controls
  that do not exist in the extension.
*/
/*
    Furina Guidebook Content

    Guide text is intentionally separated from behavior and presentation.

    Future languages can provide matching page structures inside
    GuideContent.locales without rebuilding the Guidebook interface.
*/

;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})

  Atelier.GuideContent = {
    version: 1,

    fallbackLocale: 'en',

    locales: {
      en: {
        title: 'Furina Guidebook',

        subtitle: 'Director, Memory & Story Tools',

        closeLabel: 'Close Guidebook',

        previousLabel: 'Previous',

        nextLabel: 'Next',

        doneLabel: 'Close Guidebook',

        pageLabel: 'Page',

        actionsLabel: 'Open a Furina tool',

        home: {
          cardKicker: 'GUIDEBOOK',

          cardTitle: 'Learn Director, Memory & Story tools',

          cardBody:
            'Practical explanations, examples, and shortcuts for Furina’s roleplay systems.',

          cardButton: 'Open Guidebook',

          welcomeKicker: 'NEW IN FURINA 1.3',

          welcomeTitle: 'New to Director, Memory, or Story tools?',

          welcomeBody:
            'The new Guidebook explains what each tool does, when to use it, and how they can work together—without requiring technical knowledge.',

          welcomeOpen: 'Explore the Guidebook',

          welcomeDismiss: 'Dismiss'
        },

        pages: [
          // START HERE

          {
            id: 'start',

            navLabel: 'Start Here',

            icon: '✦',

            eyebrow: 'WELCOME TO FURINA 1.3',

            title: 'Your roleplay tools, made understandable',

            summary:
              'Furina can help direct replies, preserve important continuity, and organize long-running stories. You do not need to use everything at once.',

            actions: [
              {
                icon: '◆',

                label: 'Open Director Notes',

                description: 'Create lasting roleplay instructions',

                workspace: 'director',

                tool: 'notes'
              },

              {
                icon: '◇',

                label: 'Open Continuity Vault',

                description: 'Save an important story fact',

                workspace: 'continuity',

                tool: 'vault'
              },

              {
                icon: '▶',

                label: 'Start a Scene',

                description: 'Establish the current situation',

                workspace: 'story',

                tool: 'start'
              }
            ],

            sections: [
              {
                type: 'cards',

                items: [
                  {
                    icon: '◆',

                    title: 'Director',

                    body: 'Tell Clank how you want the roleplay handled—either persistently, for the next reply, or later in the story.'
                  },

                  {
                    icon: '◇',

                    title: 'Memory',

                    body: 'Save important facts and let Furina include the most relevant reminders when you send a message.'
                  },

                  {
                    icon: '◒',

                    title: 'Story',

                    body: 'Track the current scene, create recaps, preserve timelines, and save return points for alternate takes.'
                  }
                ]
              },

              {
                type: 'heading',

                title: 'A simple way to begin',

                body: 'You can start with only three steps. The more advanced tools can wait until you actually need them.'
              },

              {
                type: 'steps',

                items: [
                  {
                    number: '01',

                    title: 'Describe the current scene',

                    body: 'Add the location, time, present characters, and anything immediately important in Scene State.'
                  },

                  {
                    number: '02',

                    title: 'Save facts worth remembering',

                    body: 'Use Quick Memory or the Remember action when a promise, secret, injury, relationship change, or important discovery should persist.'
                  },

                  {
                    number: '03',

                    title: 'Direct only when needed',

                    body: 'Use Director Notes for lasting rules and Next Reply when you want to influence one response without creating a permanent instruction.'
                  }
                ]
              },

              {
                type: 'note',

                tone: 'important',

                icon: 'i',

                title: 'What Furina can—and cannot—do',

                body: 'Furina does not replace Clank’s actual memory or increase its context window. It provides carefully organized reminders alongside your messages. Clank can still misunderstand or ignore an instruction, but good, relevant reminders can make long roleplays considerably more consistent.'
              },

              {
                type: 'tip',

                icon: '✧',

                title: 'You are always in control',

                body: 'Every Director, Memory, and Story feature is optional. Start small, preview what Furina is doing, and add more structure only when it improves your roleplay.'
              }
            ]
          },

          // DIRECTOR MODE

          {
            id: 'director',

            navLabel: 'Director Mode',

            icon: '◆',

            eyebrow: 'SHAPE THE NEXT SCENE',

            title: 'Guide the roleplay without writing it yourself',

            summary:
              'Director tools tell Clank how the story should be handled. Some directions remain active, while others are used only once or wait for a future moment.',

            actions: [
              {
                icon: '◆',

                label: 'Director Notes',

                description: 'Manage persistent instructions',

                workspace: 'director',

                tool: 'notes'
              },

              {
                icon: '→',

                label: 'Next Reply',

                description: 'Direct one upcoming response',

                workspace: 'director',

                tool: 'direct'
              },

              {
                icon: '⌛',

                label: 'Cue Queue',

                description: 'Prepare future story beats',

                workspace: 'director',

                tool: 'cues'
              },

              {
                icon: '◈',

                label: 'Controls & Knowledge',

                description: 'Protect agency and manage secrets',

                workspace: 'director',

                tool: 'control'
              },

              {
                icon: '◎',

                label: 'Director Status',

                description: 'Preview the exact prepared context',

                workspace: 'director',

                tool: 'status'
              }
            ],

            sections: [
              {
                type: 'cards',

                items: [
                  {
                    icon: '◆',

                    title: 'Director Notes',

                    body: 'Persistent rules and preferences for the conversation. Use them for instructions that should remain relevant across many replies.'
                  },

                  {
                    icon: '→',

                    title: 'Next Reply',

                    body: 'A temporary instruction for one response. Furina clears it after it is included with your next message.'
                  },

                  {
                    icon: '⌛',

                    title: 'Cue Queue',

                    body: 'Prepare future story beats that activate on the next reply, after several turns, when a keyword appears, after a character speaks, or when manually armed.'
                  },

                  {
                    icon: '◇',

                    title: 'Director Presets',

                    body: 'Activate a reusable direction package for styles such as slow-burn romance, horror pursuit, academy roleplay, mystery, or high-stakes stories.'
                  },

                  {
                    icon: '◈',

                    title: 'Control Guards',

                    body: 'Protect user agency, prevent unwanted time skips, preserve character knowledge, reduce repetition, and stop scenes from ending too early.'
                  },

                  {
                    icon: '?',

                    title: 'Knowledge Boundaries',

                    body: 'Record a truth, who knows it, who merely suspects it, and who must remain unaware.'
                  }
                ]
              },

              {
                type: 'heading',

                title: 'Choosing the correct Director tool',

                body: 'The easiest question is: how long should this instruction remain active?'
              },

              {
                type: 'steps',

                items: [
                  {
                    number: '01',

                    title: 'Use Notes for lasting behavior',

                    body: 'Example: “Never narrate my character’s thoughts, feelings, dialogue, or major decisions.”'
                  },

                  {
                    number: '02',

                    title: 'Use Next Reply for one moment',

                    body: 'Example: “Have Raven notice the blood on my sleeve, but do not reveal what she concludes.”'
                  },

                  {
                    number: '03',

                    title: 'Use a Cue for something later',

                    body: 'Example: “After three turns, interrupt the conversation with distant church bells.”'
                  },

                  {
                    number: '04',

                    title: 'Use Knowledge for secrets',

                    body: 'Example: the user broke the seal, Raven suspects it, and Maya knows nothing about it.'
                  },

                  {
                    number: '05',

                    title: 'Check Status when uncertain',

                    body: 'Director Status shows the preset, guards, matching knowledge, selected cue, continuity matches, and the exact Furina context prepared for a sample message.'
                  }
                ]
              },

              {
                type: 'note',

                tone: 'important',

                icon: '!',

                title: 'Avoid conflicting instructions',

                body: 'Do not ask Clank to reveal a secret in one note while another note says to preserve it. Short, clear, compatible directions are usually more reliable than a large collection of competing rules.'
              },

              {
                type: 'tip',

                icon: '✧',

                title: 'Quick Director',

                body: 'Use the clapperboard button beside the message composer when you only need a next-reply direction. The full Director workspace is better for notes, cues, presets, guards, and knowledge boundaries.'
              }
            ]
          },

          // CONTINUITY

          {
            id: 'memory',

            navLabel: 'Continuity',

            icon: '◇',

            eyebrow: 'REMEMBER WHAT MATTERS',

            title: 'Build a useful memory without flooding the story',

            summary:
              'The Continuity Vault stores important facts for the current conversation. Furina then selects a small, relevant group of memories for each outgoing message.',

            actions: [
              {
                icon: '◇',

                label: 'Continuity Vault',

                description: 'Create and manage saved memories',

                workspace: 'continuity',

                tool: 'vault'
              },

              {
                icon: '◎',

                label: 'Injection Preview',

                description: 'Test which memories will be selected',

                workspace: 'continuity',

                tool: 'preview'
              },

              {
                icon: '▣',

                label: 'Memory Inbox',

                description: 'Review suggested continuity events',

                workspace: 'continuity',

                tool: 'inbox'
              }
            ],

            sections: [
              {
                type: 'cards',

                items: [
                  {
                    icon: 'C',

                    title: 'Character',

                    body: 'Appearance, personality, goals, fears, injuries, habits, aliases, and lasting personal information.'
                  },

                  {
                    icon: 'R',

                    title: 'Relationship',

                    body: 'Trust, affection, suspicion, resentment, promises, boundaries, shared history, and important changes.'
                  },

                  {
                    icon: 'W',

                    title: 'World',

                    body: 'Locations, factions, history, customs, supernatural rules, laws, and facts that should remain consistent.'
                  },

                  {
                    icon: 'I',

                    title: 'Inventory & Condition',

                    body: 'Who possesses an important object, current clothing, weapons, injuries, curses, transformations, or destroyed items.'
                  },

                  {
                    icon: 'T',

                    title: 'Open Thread',

                    body: 'Unfinished mysteries, promises, future meetings, threats, unanswered questions, and unresolved goals.'
                  },

                  {
                    icon: '◷',

                    title: 'Timeline',

                    body: 'Important chronological facts, previous events, scene order, elapsed time, and lasting consequences.'
                  }
                ]
              },

              {
                type: 'heading',

                title: 'How Furina chooses memories',

                body: 'Every memory can have a scope, priority, title, and set of keywords. Together, these decide whether the memory is relevant to the current message.'
              },

              {
                type: 'steps',

                items: [
                  {
                    number: '01',

                    title: 'Write one clear fact',

                    body: 'A focused memory is easier to match and easier for Clank to understand than an entire copied conversation.'
                  },

                  {
                    number: '02',

                    title: 'Give it a recognizable title',

                    body: 'Use titles such as “Raven,” “Silver Key,” “Cathedral Seal,” or “Raven and the User.”'
                  },

                  {
                    number: '03',

                    title: 'Add keywords and aliases',

                    body: 'For Raven, useful terms might include “Raven,” “Rae,” and “black-haired woman.” Only add words that genuinely identify the memory.'
                  },

                  {
                    number: '04',

                    title: 'Choose its scope',

                    body: 'Always includes it every time. Relevant waits for matching words. Present activates when the matching character appears in Scene State. Manual stores it without automatic injection.'
                  },

                  {
                    number: '05',

                    title: 'Choose a sensible priority',

                    body: 'Critical and High memories are selected before Normal and Background entries when the context budget becomes full.'
                  }
                ]
              },

              {
                type: 'note',

                tone: 'important',

                icon: 'i',

                title: 'Use Always sparingly',

                body: 'Always is best for a few essential facts that affect nearly every response. If everything is marked Always or Critical, Furina has less room to select memories that are actually relevant to the current moment.'
              },

              {
                type: 'tip',

                icon: '✧',

                title: 'Check the Injection Preview',

                body: 'Write a sample message in the Preview tool to see which memories match, why they matched, how much budget they use, and which memories were omitted.'
              },

              {
                type: 'tip',

                icon: '↙',

                title: 'Compact, Balanced, or Detailed',

                body: 'Compact uses a small memory allowance, Balanced suits most conversations, and Detailed allows more continuity. A custom budget is available for users who want finer control.'
              }
            ]
          },

          // CAPTURE

          {
            id: 'capture',

            navLabel: 'Saving Memories',

            icon: '▣',

            eyebrow: 'CAPTURE WITHOUT INTERRUPTING',

            title: 'Save important details while you roleplay',

            summary:
              'Furina provides several ways to create memories. Choose the fastest method for the information you want to preserve, then review it before saving.',

            actions: [
              {
                icon: '◇',

                label: 'Add a Memory',

                description: 'Open the Continuity Vault editor',

                workspace: 'continuity',

                tool: 'vault'
              },

              {
                icon: '◎',

                label: 'Review Memory Inbox',

                description: 'Accept, edit, or dismiss suggestions',

                workspace: 'continuity',

                tool: 'inbox'
              },

              {
                icon: '↗',

                label: 'Story Bible',

                description: 'Export or restore roleplay data',

                workspace: 'continuity',

                tool: 'bible'
              }
            ],

            sections: [
              {
                type: 'cards',

                items: [
                  {
                    icon: '▤',

                    title: 'Remember a Message',

                    body: 'Use the Remember action beneath a message when most of that response contains information worth preserving.'
                  },

                  {
                    icon: '⌁',

                    title: 'Remember a Selection',

                    body: 'Highlight a specific passage and choose Remember Selection when only part of a long message matters.'
                  },

                  {
                    icon: '+',

                    title: 'Quick Memory',

                    body: 'Use the memory button beside the composer to write a fact immediately without searching through previous messages.'
                  },

                  {
                    icon: '◎',

                    title: 'Memory Inbox',

                    body: 'Review possible continuity events Furina noticed. Save useful suggestions, edit imperfect ones, or dismiss irrelevant suggestions.'
                  },

                  {
                    icon: '↗',

                    title: 'Story Bible',

                    body: 'Export the conversation’s Furina data as restorable JSON or readable Markdown for backup, reference, or portability.'
                  }
                ]
              },

              {
                type: 'heading',

                title: 'Turn a long reply into a useful memory',

                body: 'A captured message is only a starting point. Remove decorative prose and keep the lasting information.'
              },

              {
                type: 'steps',

                items: [
                  {
                    number: '01',

                    title: 'Find the lasting event',

                    body: 'Example: Raven gives the silver key to the user and asks them to keep it hidden from Maya.'
                  },

                  {
                    number: '02',

                    title: 'Reduce it to one clear statement',

                    body: 'Write: “The user currently carries Raven’s silver key. Raven asked the user to conceal it from Maya.”'
                  },

                  {
                    number: '03',

                    title: 'Choose the category',

                    body: 'Inventory & Condition is appropriate because possession of the key is important. A second Knowledge entry may be useful if the secret matters.'
                  },

                  {
                    number: '04',

                    title: 'Add useful matching terms',

                    body: 'Keywords might be “Raven,” “Maya,” “silver key,” and “key.”'
                  },

                  {
                    number: '05',

                    title: 'Save and preview',

                    body: 'Try a sample message about Raven or the key in Injection Preview and confirm that the memory is selected.'
                  }
                ]
              },

              {
                type: 'note',

                tone: 'important',

                icon: '!',

                title: 'Review Inbox suggestions',

                body: 'Memory suggestions are helpers, not guaranteed facts. Read and edit them before saving—especially when a message contains speculation, metaphor, a lie, or something a character only imagined.'
              },

              {
                type: 'tip',

                icon: '✧',

                title: 'Selections are often best',

                body: 'When a response is long, saving one highlighted sentence usually creates cleaner continuity than remembering the entire message.'
              }
            ]
          },

          // STORY TOOLS

          {
            id: 'story',

            navLabel: 'Story Tools',

            icon: '◒',

            eyebrow: 'KEEP THE STORY ORGANIZED',

            title: 'Move between scenes without losing your place',

            summary:
              'Story tools preserve the current situation, important developments, chronological events, and useful return points. They help both the user and Furina understand where the story stands.',

            actions: [
              {
                icon: '▶',

                label: 'Start Scene',

                description: 'Set the stage for a new scene',

                workspace: 'story',

                tool: 'start'
              },

              {
                icon: '◎',

                label: 'Current Scene',

                description: 'Update Scene State or end the scene',

                workspace: 'story',

                tool: 'current'
              },

              {
                icon: '≡',

                label: 'Scene Recaps',

                description: 'Review or display Previously On',

                workspace: 'story',

                tool: 'recaps'
              },

              {
                icon: '◷',

                label: 'Timeline',

                description: 'Manage chronological story events',

                workspace: 'story',

                tool: 'timeline'
              },

              {
                icon: '◇',

                label: 'Snapshots',

                description: 'Capture or restore a scene setup',

                workspace: 'story',

                tool: 'snapshots'
              }
            ],

            sections: [
              {
                type: 'cards',

                items: [
                  {
                    icon: '▶',

                    title: 'Start Scene',

                    body: 'Set the title, scene number, location, time, cast, weather, mood, objective, threat, conditions, presentation, and immediate notes.'
                  },

                  {
                    icon: '◎',

                    title: 'Scene State',

                    body: 'Maintain the temporary facts describing what is happening right now. Scene State can be included with Director context.'
                  },

                  {
                    icon: '■',

                    title: 'End Scene',

                    body: 'Write a compact recap, important developments, unresolved threads, the ending state, and an optional next-scene hook.'
                  },

                  {
                    icon: '≡',

                    title: 'Recaps',

                    body: 'Keep editable summaries of completed scenes and use them for the cinematic Previously On presentation.'
                  },

                  {
                    icon: '◷',

                    title: 'Timeline',

                    body: 'Track major events, story dates, participants, consequences, and whether an event is completed, ongoing, or planned.'
                  },

                  {
                    icon: '◇',

                    title: 'Snapshots',

                    body: 'Capture Scene State, active guards, Director preset, chapter association, and continuity as a local return point.'
                  }
                ]
              },

              {
                type: 'heading',

                title: 'A complete scene cycle',

                body: 'This workflow provides structure without requiring constant management during the roleplay.'
              },

              {
                type: 'steps',

                items: [
                  {
                    number: '01',

                    title: 'Start the scene',

                    body: 'Enter the location, time, present cast, immediate objective, and anything physically important.'
                  },

                  {
                    number: '02',

                    title: 'Roleplay normally',

                    body: 'You do not need to keep the Furina panel open. Save only the developments that should matter later.'
                  },

                  {
                    number: '03',

                    title: 'Update Scene State when it changes',

                    body: 'Change the location, cast, injuries, conditions, threat, or objective if the situation meaningfully changes.'
                  },

                  {
                    number: '04',

                    title: 'End and recap the scene',

                    body: 'Record what happened, what changed, what remains unresolved, and where everyone stands at the final moment.'
                  },

                  {
                    number: '05',

                    title: 'Begin the next scene',

                    body: 'Use the previous recap and open threads to establish the next location, time, cast, and objective.'
                  }
                ]
              },

              {
                type: 'note',

                tone: 'important',

                icon: 'i',

                title: 'Snapshots are not Clank chat branches',

                body: 'Restoring a snapshot restores Furina’s saved Scene State. It does not delete later Clank messages or move the backend conversation backward. Alternate-take packages are intended to help begin another continuation.'
              },

              {
                type: 'tip',

                icon: '✧',

                title: 'Use Previously On after a break',

                body: 'A recap can be displayed when reopening the conversation, making it easier to continue after several days without rereading the entire chat.'
              },

              {
                type: 'tip',

                icon: '↗',

                title: 'Export a Story Bible occasionally',

                body: 'A Story Bible can preserve Continuity entries, Director information, Scene State, recaps, timeline events, snapshots, bookmarks, and chapters outside the active browser storage.'
              }
            ]
          },

          // PRACTICAL WORKFLOWS

          {
            id: 'workflows',

            navLabel: 'Workflows',

            icon: '✧',

            eyebrow: 'PRACTICAL RECIPES',

            title: 'Choose only what helps your kind of story',

            summary:
              'Different roleplays need different amounts of structure. These examples show which tools are most useful without requiring every feature.',

            actions: [
              {
                icon: '◈',

                label: 'Control Guards',

                description: 'Protect the user’s roleplay agency',

                workspace: 'director',

                tool: 'control'
              },

              {
                icon: '◎',

                label: 'Scene State',

                description: 'Describe what is happening now',

                workspace: 'director',

                tool: 'scene-state'
              },

              {
                icon: '◇',

                label: 'Continuity Vault',

                description: 'Save the most important facts',

                workspace: 'continuity',

                tool: 'vault'
              },

              {
                icon: '▤',

                label: 'Injection Preview',

                description: 'Check what Furina will include',

                workspace: 'continuity',

                tool: 'preview'
              }
            ],

            sections: [
              {
                type: 'cards',

                items: [
                  {
                    icon: '♡',

                    title: 'Long Romance',

                    body: 'Track relationship changes, promises, boundaries, shared history, and unresolved tension. Use a slow-burn preset and recap major emotional scenes.'
                  },

                  {
                    icon: '?',

                    title: 'Mystery or Horror',

                    body: 'Store clues as World facts or Open Threads, protect secrets with Knowledge Boundaries, and prepare later revelations in the Cue Queue.'
                  },

                  {
                    icon: '♟',

                    title: 'Group Roleplay',

                    body: 'Keep the present cast updated, give character memories clear names, and record who knows or suspects each important secret.'
                  },

                  {
                    icon: '⚔',

                    title: 'Adventure or Combat',

                    body: 'Track injuries, weapons, possessions, objectives, locations, threats, and lasting consequences. Avoid resetting the scene after each reply.'
                  },

                  {
                    icon: '◷',

                    title: 'Returning After a Break',

                    body: 'Open Previously On, review Scene State and unresolved threads, then check the Injection Preview before continuing.'
                  },

                  {
                    icon: '·',

                    title: 'Minimal Setup',

                    body: 'Use one Director guard, a few essential memories, and Scene State. Ignore the advanced tools until the story becomes more complicated.'
                  }
                ]
              },

              {
                type: 'heading',

                title: 'The two-minute setup',

                body: 'If the complete system feels overwhelming, begin with this small workflow.'
              },

              {
                type: 'steps',

                items: [
                  {
                    number: '01',

                    title: 'Protect your character',

                    body: 'Enable the Control guards that prevent Clank from writing your dialogue, thoughts, or major actions.'
                  },

                  {
                    number: '02',

                    title: 'Fill the current Scene State',

                    body: 'Add the location, time, present characters, immediate objective, and any injuries or important objects.'
                  },

                  {
                    number: '03',

                    title: 'Save three essential memories',

                    body: 'Choose the most important character fact, relationship fact, and unresolved plot thread.'
                  },

                  {
                    number: '04',

                    title: 'Use Balanced context',

                    body: 'Balanced is a sensible starting budget for most conversations. Change it only if the preview feels too empty or too crowded.'
                  },

                  {
                    number: '05',

                    title: 'Continue normally',

                    body: 'You are ready. Return to Furina only when something important changes or a new fact deserves to be remembered.'
                  }
                ]
              },

              {
                type: 'note',

                tone: 'important',

                icon: 'i',

                title: 'More tools do not automatically mean better roleplay',

                body: 'A few accurate memories and clear directions are usually more useful than hundreds of notes. Furina should support the story, not turn it into constant bookkeeping.'
              },

              {
                type: 'tip',

                icon: '✧',

                title: 'When something goes wrong',

                body: 'Check Director Status and Injection Preview. They show what Furina is preparing and often reveal an unrelated memory, conflicting instruction, missing keyword, or overly small context budget.'
              }
            ]
          }
        ]
      }
    }
  }

  /*
        Guidebook translations reuse the exact English page structure.
        Locale packs translate only human-facing strings, so navigation IDs,
        tool routes, icons, and section types remain stable in every language.
        Missing phrases intentionally fall back to English instead of hiding
        a page or breaking a shortcut.
    */

  function localizeGuideValue(value, messages) {
    if (typeof value === 'string') {
      return messages[value] || value
    }

    if (Array.isArray(value)) {
      return value.map(item => localizeGuideValue(item, messages))
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          localizeGuideValue(item, messages)
        ])
      )
    }

    return value
  }

  const englishGuide = Atelier.GuideContent.locales.en

  for (const [code, localePack] of Object.entries(Atelier.LocalePacks || {})) {
    if (code === 'en') {
      continue
    }

    Atelier.GuideContent.locales[code] = localizeGuideValue(
      englishGuide,
      localePack.messages || {}
    )
  }
})()
