"use strict";


/*
  Developer notes

  Maps Full Atelier navigation (workspace + tool) to UI factories. It owns routing
  choices, not feature state. Adding a tool usually means adding one route entry and
  returning an existing section factory rather than duplicating the feature UI.
*/
/*
    Atelier Workspace Router

    The old Furina panel rendered every tool at once. This router keeps only
    one workspace/tool visible, which removes the "endless obelisk" problem
    and lets the shell update a small part of the UI instead of rebuilding
    everything after every change.
*/

(() => {

    const Atelier = window.ClankAtelier;
    const State = Atelier.PanelState;
    const Sections = Atelier.PanelSections;

    const STORAGE_KEY = "furina-panel-navigation";

    const WORKSPACES = {
        home: {
            label: "Home",
            icon: "⌂",
            title: "Home",
            description: "A quick view of the current conversation.",
            tools: []
        },
        look: {
            label: "Look",
            icon: "◈",
            title: "Look",
            description: "Themes, chat presentation, message bubbles, and typography.",
            tools: [
                { id: "themes", label: "Themes" },
                { id: "chat", label: "Chat" },
                { id: "messages", label: "Messages" },
                { id: "type", label: "Type" },
                { id: "effects", label: "Effects" },
                { id: "atelier", label: "Atelier" }
            ]
        },
        scene: {
            label: "Scene",
            icon: "✦",
            title: "Scene",
            description: "Atmosphere, presentation, stickers, music, and reading tools.",
            tools: [
                { id: "atmosphere", label: "Atmosphere" },
                { id: "presentation", label: "Presentation" },
                { id: "sounds", label: "RP Sounds" },
                { id: "stickers", label: "Stickers" },
                { id: "music", label: "Music" },
                { id: "reader", label: "Reader" },
                { id: "decor", label: "Decor" }
            ]
        },
        director: {
            label: "Director",
            icon: "◆",
            title: "Director",
            description: "Roleplay guidance, scene context, and writing tools.",
            tools: [
                {
                    id: "notes",
                    label: "Notes"
                },
                {
                    id: "direct",
                    label: "Direct"
                },
                {
                    id: "cues",
                    label: "Cues"
                },
                {
                    id: "control",
                    label: "Control"
                },
                {
                    id: "scene-state",
                    label: "Scene State"
                },
                {
                    id: "styles",
                    label: "Styles"
                },
                {
                    id: "status",
                    label: "Status"
                }
            ]
        },
        continuity: {
            label: "Memory",
            icon: "◇",
            title: "Continuity",
            description: "A selective memory layer for long-running roleplay.",
            tools: [
                { id: "vault", label: "Vault" },
                { id: "preview", label: "Preview" },
                { id: "inbox", label: "Inbox" },
                { id: "bible", label: "Story Bible" }
            ]
        },
        story: {
            label: "Story",
            icon: "◒",
            title: "Story",
            description: "Scene recaps, chronology, and safe return points.",
            tools: [
                { id: "start", label: "Start" },
                { id: "current", label: "Current" },
                { id: "present", label: "Present" },
                { id: "recaps", label: "Recaps" },
                { id: "timeline", label: "Timeline" },
                { id: "snapshots", label: "Snapshots" }
            ]
        },
        interfaces: {
            label: "Interfaces",
            icon: "◩",
            title: "Interfaces",
            description: "Alternate ways to experience the current conversation.",
            tools: []
        },
        share: {
            label: "Share",
            icon: "↗",
            title: "Share",
            description: "Move themes and conversation setups between Furina installs.",
            tools: [
                { id: "theme", label: "Theme" },
                { id: "setup", label: "Full Setup" },
                { id: "presets", label: "Presets" }
            ]
        },
        tools: {
            label: "Tools",
            icon: "⚙",
            title: "Tools",
            description: "Language, Advanced CSS, diagnostics, and isolated reset controls.",
            tools: [
                { id: "css", label: "Custom CSS" },
                { id: "language", label: "Language" },
                { id: "diagnostics", label: "Diagnostics" },
                { id: "reset", label: "Reset" }
            ]
        }
    };

    function defaultTool(workspace) {
        return WORKSPACES[workspace]?.tools?.[0]?.id || null;
    }

    function isValidTool(workspace, tool) {
        const config = WORKSPACES[workspace];

        if (!config) {
            return false;
        }

        if (!config.tools.length) {
            return tool == null;
        }

        return config.tools.some(item => item.id === tool);
    }

    function sanitizeNavigation(input) {
        const current = State.navigation;
        const workspace = WORKSPACES[input?.workspace]
            ? input.workspace
            : current.workspace;

        const tools = { ...current.tools };

        for (
            const key
            of [
                "look",
                "scene",
                "director",
                "continuity",
                "story",
                "share",
                "tools"
            ]
        ) {
            const candidate = input?.tools?.[key];
            tools[key] = isValidTool(key, candidate)
                ? candidate
                : isValidTool(key, tools[key])
                    ? tools[key]
                    : defaultTool(key);
        }

        let lastNonHome = input?.lastNonHome;
        if (
            !lastNonHome ||
            !WORKSPACES[lastNonHome.workspace] ||
            lastNonHome.workspace === "home"
        ) {
            lastNonHome = current.lastNonHome;
        }

        const lastTool = WORKSPACES[lastNonHome.workspace]?.tools?.length
            ? (
                isValidTool(lastNonHome.workspace, lastNonHome.tool)
                    ? lastNonHome.tool
                    : defaultTool(lastNonHome.workspace)
            )
            : null;

        return {
            workspace,
            tools,
            lastNonHome: {
                workspace: lastNonHome.workspace,
                tool: lastTool
            },
            loaded: true
        };
    }

    async function loadState() {
        if (State.navigation.loaded) {
            return;
        }

        const stored = await Atelier.Storage.get(STORAGE_KEY, null);
        State.navigation = sanitizeNavigation(stored);
    }

    function saveState() {
        const navigation = State.navigation;

        Atelier.Storage.set(STORAGE_KEY, {
            workspace: navigation.workspace,
            tools: { ...navigation.tools },
            lastNonHome: { ...navigation.lastNonHome }
        });
    }

    function getActive() {
        const workspace = State.navigation.workspace;
        const config = WORKSPACES[workspace] || WORKSPACES.home;
        const tool = config.tools.length
            ? State.navigation.tools[workspace] || defaultTool(workspace)
            : null;

        return {
            workspace,
            tool,
            config
        };
    }

    function navigate(workspace, tool = null) {
        if (!WORKSPACES[workspace]) {
            return false;
        }

        const config = WORKSPACES[workspace];
        let nextTool = null;

        if (config.tools.length) {
            nextTool = isValidTool(workspace, tool)
                ? tool
                : isValidTool(workspace, State.navigation.tools[workspace])
                    ? State.navigation.tools[workspace]
                    : defaultTool(workspace);

            State.navigation.tools[workspace] = nextTool;
        }

        State.navigation.workspace = workspace;

        if (workspace !== "home") {
            State.navigation.lastNonHome = {
                workspace,
                tool: nextTool
            };
        }

        saveState();
        return true;
    }

    function viewKey(workspace, tool) {
        return tool ? `${workspace}:${tool}` : workspace;
    }

    function describeView(workspace, tool) {
        const config = WORKSPACES[workspace];

        if (!config) {
            return "";
        }

        if (!tool) {
            return config.label;
        }

        const toolConfig = config.tools.find(item => item.id === tool);
        const translate =
            Atelier.I18n?.t ||
            (value => value);

        return toolConfig
            ? `${translate(config.label)} · ${translate(toolConfig.label)}`
            : translate(config.label);
    }

    function stripAccordion(section, label = "") {
        if (!(section instanceof HTMLElement)) {
            return section;
        }

        section.classList.remove("furina-section-collapsed");
        section.classList.add("furina-workspace-block");

        const header = section.querySelector(":scope > .furina-section-header");
        header?.remove();

        if (label) {
            const heading = Atelier.PanelUI.createElement(
                "div",
                "furina-workspace-block-title",
                label
            );
            section.insertBefore(heading, section.firstChild);
        }

        return section;
    }

    function createStack(items, extraClass = "") {
        const stack = Atelier.PanelUI.createElement(
            "div",
            `furina-workspace-stack ${extraClass}`.trim()
        );

        for (const item of items) {
            if (item) {
                stack.appendChild(item);
            }
        }

        return stack;
    }

    function renderView(workspace, tool) {
        switch (workspace) {
            case "home":
                return Atelier.HomeWorkspace.create();

            case "look":
                switch (tool) {
                    case "atelier":
                        return stripAccordion(Sections.createAtelierSection());
                    case "chat":
                        return stripAccordion(
                            Sections.createChatSection()
                        );

                    case "messages":
                        return createStack([
                            stripAccordion(
                                Sections.createAssistantSection(),
                                "Assistant"
                            ),
                            stripAccordion(
                                Sections.createUserSection(),
                                "You"
                            )
                        ], "furina-workspace-stack-split");

                    case "type":
                        return stripAccordion(
                            Sections.createTypographySection()
                        );

                    case "effects":
                        return stripAccordion(
                            Sections.createCosmeticEffectsSection()
                        );

                    case "themes":
                    default:
                        return createStack([
                            stripAccordion(
                                Sections.createScopeSection(),
                                "Theme Scope"
                            ),
                            stripAccordion(
                                Sections.createPresetSection(),
                                "Theme Library"
                            )
                        ]);
                }

            case "scene":
                switch (tool) {
                    case "presentation":
                        return stripAccordion(
                            Sections.createScenePresentationSection()
                        );

                    case "sounds":
                        return stripAccordion(
                            Sections.createRpSfxSection()
                        );

                    case "stickers":
                        return stripAccordion(
                            Sections.createStickerSection()
                        );

                    case "music":
                        return stripAccordion(
                            Sections.createAmbienceSection()
                        );

                    case "reader":
                        return stripAccordion(
                            Sections.createReaderSection()
                        );

                    case "decor":
                        return stripAccordion(
                            Sections.createCosmeticDecorSection()
                        );

                    case "atmosphere":
                    default:
                        return stripAccordion(
                            Sections.createAtmosphereSection()
                        );
                }

            case "director":
                switch (tool) {

                    case "direct":
                        return stripAccordion(
                            Sections.createDirectorDirectSection()
                        );

                    case "cues":
                        return stripAccordion(
                            Sections.createDirectorCuesSection()
                        );

                    case "control":
                        return stripAccordion(
                            Sections.createDirectorControlSection()
                        );

                    case "scene-state":
                        return stripAccordion(
                            Sections.createSceneStateSection()
                        );

                    case "styles":
                        return stripAccordion(
                            Sections.createResponseStylesSection()
                        );

                    case "status":
                        return stripAccordion(
                            Sections.createDirectorStatusSection()
                        );

                    case "notes":
                    default:
                        return stripAccordion(
                            Sections.createDirectorSection()
                        );
                }

            case "continuity":
                switch (tool) {
                    case "preview":
                        return stripAccordion(Sections.createContinuityPreviewSection());
                    case "inbox":
                        return stripAccordion(Sections.createMemoryInboxSection());
                    case "bible":
                        return stripAccordion(Sections.createStoryBibleSection());
                    case "vault":
                    default:
                        return stripAccordion(Sections.createContinuityVaultSection());
                }

            case "story":
                switch (tool) {
                    case "start":
                        return stripAccordion(Sections.createStartSceneSection());
                    case "present":
                        return stripAccordion(Sections.createScenePresentationSection());
                    case "recaps":
                        return stripAccordion(Sections.createStoryRecapsSection());
                    case "timeline":
                        return stripAccordion(Sections.createStoryTimelineSection());
                    case "snapshots":
                        return stripAccordion(Sections.createStorySnapshotsSection());
                    case "current":
                    default:
                        return createStack([
                            stripAccordion(Sections.createSceneStateSection(), "Current Scene State"),
                            stripAccordion(Sections.createEndSceneSection(), "End Scene")
                        ]);
                }

            case "interfaces":
                return Atelier.InterfacesWorkspace.create();

            case "share":
                switch (tool) {
                    case "setup":
                        return stripAccordion(
                            Sections.createSetupSection()
                        );

                    case "presets":
                        return stripAccordion(
                            Sections.createPresetSection()
                        );

                    case "theme":
                    default:
                        return stripAccordion(
                            Sections.createSharingSection()
                        );
                }

            case "tools":
                switch (tool) {
                    case "language":
                        return stripAccordion(
                            Sections.createLanguageSection()
                        );

                    case "diagnostics":
                        return stripAccordion(
                            Sections.createDiagnosticsSection()
                        );

                    case "reset":
                        return stripAccordion(
                            Sections.createResetSection()
                        );

                    case "css":
                    default:
                        return stripAccordion(
                            Sections.createAdvancedCssSection()
                        );
                }

            default:
                return Atelier.HomeWorkspace.create();
        }
    }

    function getBadge(workspace) {
        switch (workspace) {
            case "look":
                return Atelier.ThemeManager?.scope === "conversation"
                    ? { text: "•", label: "Conversation theme override active" }
                    : null;

            case "scene": {
                const theme =
                    Atelier.ThemeManager?.settings || {};

                const active = Boolean(
                    Atelier.AtmosphereManager?.settings?.enabled ||
                    Atelier.AmbienceManager?.settings?.url ||
                    Atelier.StickerManager?.stickers?.length ||
                    Atelier.ReaderManager?.settings?.enabled ||
                    Atelier.ReaderManager?.focusMode ||
                    theme.particlesEnabled ||
                    theme.ornamentsEnabled ||
                    (theme.hudFrameStyle && theme.hudFrameStyle !== "none") ||
                    theme.separatorStyle !== "none"
                );

                return active
                    ? { text: "•", label: "Scene tools are active" }
                    : null;
            }

            case "director": {
                const manager = Atelier.DirectorManager;

                const structured = manager?.settings?.enabled && Array.isArray(manager.settings.notes)
                    ? manager.settings.notes.filter(note => note?.enabled).length
                    : 0;
                const base = manager?.settings?.enabled && String(manager.settings.note || "").trim() ? 1 : 0;
                const director2 = Atelier.Director2Manager;
                const quick = director2?.settings?.nextReply ? 1 : 0;
                const cues = director2?.settings?.cues?.filter(cue => cue.enabled && ["waiting", "armed"].includes(cue.status)).length || 0;
                const guards = director2 ? Object.values(director2.settings.guards || {}).filter(Boolean).length : 0;
                const total = structured + base + quick + cues + guards;

                if (!total && !manager?.settings?.enabled) {
                    return null;
                }

                return {
                    text: total ? String(total) : "•",
                    label: total
                        ? `${total} active Director reminder${total === 1 ? "" : "s"}`
                        : "Director is enabled"
                };
            }

            case "continuity": {
                const manager = Atelier.ContinuityManager;
                const suggestions = Atelier.MemoryCaptureManager?.settings?.suggestions?.length || 0;
                if (suggestions) {
                    return { text: String(suggestions), label: `${suggestions} memory ${suggestions === 1 ? "suggestion" : "suggestions"} waiting` };
                }
                const total = manager?.settings?.enabled
                    ? manager.settings.entries.filter(entry => entry.enabled && !entry.archived).length
                    : 0;
                return total
                    ? { text: String(total), label: `${total} active continuity ${total === 1 ? "memory" : "memories"}` }
                    : null;
            }

            case "story": {
                const manager = Atelier.SceneIntelligenceManager;
                const total = (manager?.settings?.recaps?.length || 0) + (manager?.settings?.snapshots?.length || 0);
                return total ? { text: String(total), label: `${total} saved story ${total === 1 ? "record" : "records"}` } : null;
            }

            case "tools":
                return Atelier.AdvancedCssManager?.settings?.enabled
                    ? { text: "•", label: "Custom CSS is active" }
                    : null;

            default:
                return null;
        }
    }

    Atelier.WorkspaceRouter = {
        WORKSPACES,
        loadState,
        navigate,
        getActive,
        renderView,
        getBadge,
        viewKey,
        describeView
    };

})();
