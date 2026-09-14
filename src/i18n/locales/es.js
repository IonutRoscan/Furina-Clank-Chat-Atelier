'use strict'

/*
  Developer notes

  Es translation dictionary. This file only registers UI strings; feature logic
  belongs in the managers/sections that request those strings. Missing keys safely
  fall back through Furina's i18n layer.
*/
;(() => {
  const Atelier = (window.ClankAtelier = window.ClankAtelier || {})
  Atelier.LocalePacks = Atelier.LocalePacks || {}
  Atelier.LocalePacks.es = {
    code: 'es',
    label: 'Spanish',
    nativeLabel: 'Español',
    messages: {
      Home: 'Inicio',
      'A quick view of the current conversation.':
        'Una vista rápida de la conversación actual.',
      Look: 'Apariencia',
      'Themes, chat presentation, message bubbles, and typography.':
        'Temas, presentación del chat, burbujas de mensajes y tipografía.',
      Themes: 'Temas',
      Chat: 'Chat',
      Messages: 'Mensajes',
      Type: 'Texto',
      Effects: 'Efectos',
      Scene: 'Escena',
      'Atmosphere, stickers, music, and reading tools.':
        'Atmósfera, stickers, música y herramientas de lectura.',
      Atmosphere: 'Atmósfera',
      Stickers: 'Stickers',
      Music: 'Música',
      Reader: 'Lector',
      Decor: 'Decoración',
      Director: 'Director',
      'Persistent roleplay guidance and continuity notes.':
        'Indicaciones persistentes de roleplay y notas de continuidad.',
      Share: 'Compartir',
      'Move themes and conversation setups between Furina installs.':
        'Mueve temas y configuraciones de conversación entre instalaciones de Furina.',
      Theme: 'Tema',
      'Full Setup': 'Configuración completa',
      Presets: 'Preajustes',
      Tools: 'Herramientas',
      'Advanced CSS, diagnostics, and isolated reset controls.':
        'CSS avanzado, diagnósticos y controles de restablecimiento aislados.',
      'Custom CSS': 'CSS personalizado',
      Diagnostics: 'Diagnósticos',
      Reset: 'Restablecer',
      Assistant: 'Asistente',
      You: 'Tú',
      'Theme Scope': 'Ámbito del tema',
      'Theme Library': 'Biblioteca de temas',
      'Conversation theme override active':
        'Tema específico de conversación activo',
      'Scene tools are active': 'Las herramientas de escena están activas',
      'Director is enabled': 'Director está activado',
      'Custom CSS is active': 'El CSS personalizado está activo',
      Close: 'Cerrar',
      'Close Furina panel': 'Cerrar panel de Furina',
      'Furina workspaces': 'Espacios de trabajo de Furina',
      'Workspace tools': 'Herramientas del espacio',
      'Open Furina': 'Abrir Furina',
      'Open Furina customization panel':
        'Abrir panel de personalización de Furina',
      Unavailable: 'No disponible',
      'Theme engine is not ready.': 'El motor de temas no está listo.',
      'Custom theme': 'Tema personalizado',
      'Current theme': 'Tema actual',
      'Conversation override': 'Tema de conversación',
      'Global theme': 'Tema global',
      'Music playing': 'Música reproduciéndose',
      'Music loaded': 'Música cargada',
      Quiet: 'En calma',
      'Conversation scene tools': 'Herramientas de escena de la conversación',
      'No atmosphere, stickers, or music active':
        'No hay atmósfera, stickers ni música activos',
      'Director engine is not ready.': 'El motor de Director no está listo.',
      Enabled: 'Activado',
      Off: 'Desactivado',
      'No active notes': 'No hay notas activas',
      'Reader engine is not ready.': 'El motor de Lector no está listo.',
      'Focus Mode': 'Modo Enfoque',
      'Reader Mode': 'Modo Lector',
      'Reading preferences are active':
        'Las preferencias de lectura están activas',
      'Normal chat layout': 'Diseño normal del chat',
      'CURRENT CHAT': 'CHAT ACTUAL',
      'Your conversation at a glance': 'Tu conversación de un vistazo',
      'Open a card to jump directly into that part of the Atelier.':
        'Abre una tarjeta para ir directamente a esa parte del Atelier.',
      RESUME: 'CONTINUAR',
      'Look · Themes': 'Apariencia · Temas',
      'Open last tool': 'Abrir última herramienta',
      Apply: 'Aplicar',
      Save: 'Guardar',
      Delete: 'Eliminar',
      Rename: 'Renombrar',
      Add: 'Añadir',
      Edit: 'Editar',
      Enable: 'Activar',
      Disable: 'Desactivar',
      Clear: 'Limpiar',
      Revert: 'Revertir',
      Preview: 'Vista previa',
      'Copy JSON': 'Copiar JSON',
      'Download JSON': 'Descargar JSON',
      Opacity: 'Opacidad',
      Rotation: 'Rotación',
      Placement: 'Colocación',
      Lock: 'Bloquear',
      Unlock: 'Desbloquear',
      Duplicate: 'Duplicar',
      'Bring Front': 'Traer al frente',
      'Send Back': 'Enviar atrás',
      Default: 'Predeterminado',
      None: 'Ninguno',
      Soft: 'Suave',
      Medium: 'Medio',
      Strong: 'Fuerte',
      Brightness: 'Brillo',
      Contrast: 'Contraste',
      Saturation: 'Saturación',
      Sepia: 'Sepia',
      Glow: 'Resplandor',
      Lift: 'Elevar',
      Tilt: 'Inclinar',
      Pulse: 'Pulso',
      Left: 'Izquierda',
      Right: 'Derecha',
      Top: 'Arriba',
      Bottom: 'Abajo',
      Center: 'Centro',
      Cover: 'Cubrir',
      Contain: 'Contener',
      'Original / Auto': 'Original / Automático',
      'This Conversation': 'Esta conversación',
      'Changes only affect this chat thread.':
        'Los cambios solo afectan a este chat.',
      'Use global theme': 'Usar tema global',
      Global: 'Global',
      'This conversation inherits your global theme.':
        'Esta conversación hereda tu tema global.',
      'Customize this conversation': 'Personalizar esta conversación',
      'Custom Presets': 'Preajustes personalizados',
      'Preset name': 'Nombre del preajuste',
      'Save current': 'Guardar actual',
      'Give the preset a name first.': 'Primero dale un nombre al preajuste.',
      'Could not save preset.': 'No se pudo guardar el preajuste.',
      'No custom presets yet.': 'Aún no hay preajustes personalizados.',
      Accent: 'Acento',
      'Background type': 'Tipo de fondo',
      Solid: 'Sólido',
      Gradient: 'Degradado',
      Image: 'Imagen',
      Video: 'Vídeo',
      'Background color': 'Color de fondo',
      'Gradient color': 'Color del degradado',
      'Gradient angle': 'Ángulo del degradado',
      'Image URL': 'URL de imagen',
      'Video URL': 'URL de vídeo',
      'Background fit': 'Ajuste del fondo',
      'Background position': 'Posición del fondo',
      'Top left': 'Arriba izquierda',
      'Top right': 'Arriba derecha',
      'Bottom left': 'Abajo izquierda',
      'Bottom right': 'Abajo derecha',
      'Background darkness': 'Oscurecimiento del fondo',
      'Overlay tint': 'Tinte de superposición',
      'Overlay strength': 'Intensidad de superposición',
      Vignette: 'Viñeta',
      'Background blur': 'Desenfoque del fondo',
      'Chat width': 'Ancho del chat',
      'Avatar size': 'Tamaño del avatar',
      'Message spacing': 'Espaciado de mensajes',
      'Compact mode': 'Modo compacto',
      'Reduce message and control spacing.':
        'Reduce el espacio entre mensajes y controles.',
      'Bubble color': 'Color de burbuja',
      'Text color': 'Color del texto',
      Radius: 'Radio',
      'Horizontal padding': 'Relleno horizontal',
      'Vertical padding': 'Relleno vertical',
      'Border width': 'Ancho del borde',
      'Border color': 'Color del borde',
      Shadow: 'Sombra',
      Typography: 'Tipografía',
      'Message font': 'Fuente de mensajes',
      'System UI': 'Interfaz del sistema',
      'Heading font': 'Fuente de encabezados',
      'Code font': 'Fuente de código',
      'System monospace': 'Monoespaciada del sistema',
      'Message font size': 'Tamaño de fuente de mensajes',
      'Heading scale': 'Escala de encabezados',
      'Code font size': 'Tamaño de fuente de código',
      'Line height': 'Altura de línea',
      'Paragraph spacing': 'Espaciado de párrafos',
      'Atmosphere engine unavailable.': 'Motor de atmósfera no disponible.',
      'Add subtle environmental effects above the chat background.':
        'Añade efectos ambientales sutiles sobre el fondo del chat.',
      'Quick Presets': 'Preajustes rápidos',
      'Enable visual ambience for this conversation.':
        'Activa el ambiente visual para esta conversación.',
      Effect: 'Efecto',
      '✦ Drifting Motes': '✦ Motas flotantes',
      '🌧 Layered Rain': '🌧 Lluvia en capas',
      '☁ Fog': '☁ Niebla',
      '❄ Snow': '❄ Nieve',
      '🔥 Embers': '🔥 Brasas',
      '✨ Magic Sparkles': '✨ Destellos mágicos',
      '📼 Film Grain': '📼 Grano de película',
      '🖥 Scanlines': '🖥 Líneas de escaneo',
      Intensity: 'Intensidad',
      'Motion speed': 'Velocidad de movimiento',
      'Effects are intentionally subtle so text stays readable.':
        'Los efectos son sutiles a propósito para mantener el texto legible.',
      'Turn Atmosphere Off': 'Desactivar atmósfera',
      'Music / Ambience': 'Música / Ambiente',
      'Ambience engine unavailable.': 'Motor de ambiente no disponible.',
      'Give this conversation its own soundtrack or ambient audio. Playback only begins when you press Play.':
        'Dale a esta conversación su propia banda sonora o audio ambiental. La reproducción solo comienza al pulsar Reproducir.',
      'Give this conversation its own soundtrack, ambient audio, or YouTube media. Playback begins only after you press Play in Furina or inside an embedded player.':
        'Dale a esta conversación su propia banda sonora, audio ambiental o contenido de YouTube. La reproducción solo comienza cuando pulses Reproducir en Furina o dentro de un reproductor integrado.',
      'Track name': 'Nombre de la pista',
      'Rainy Café, Character Theme, etc.':
        'Café lluvioso, tema del personaje, etc.',
      'Audio or SoundCloud URL': 'URL de audio o SoundCloud',
      'SoundCloud URL or direct .mp3 / .ogg URL':
        'URL de SoundCloud o URL directa .mp3 / .ogg',
      'Audio, SoundCloud or YouTube URL': 'URL de audio, SoundCloud o YouTube',
      'YouTube, SoundCloud, or direct .mp3 / .ogg URL':
        'URL de YouTube, SoundCloud o URL directa .mp3 / .ogg',
      'Update Track': 'Actualizar pista',
      'Load Track': 'Cargar pista',
      'Enter an http or https audio/SoundCloud URL.':
        'Introduce una URL http o https de audio/SoundCloud.',
      'Enter an http or https audio, SoundCloud, or YouTube URL.':
        'Introduce una URL http o https de audio, SoundCloud o YouTube.',
      'That audio URL is not valid.': 'Esa URL de audio no es válida.',
      "SoundCloud loaded. Use Furina's player controls.":
        'SoundCloud cargado. Usa los controles del reproductor de Furina.',
      'YouTube loaded. Use the embedded YouTube controls.':
        'YouTube cargado. Usa los controles integrados de YouTube.',
      'Track loaded. Press Play when ready.':
        'Pista cargada. Pulsa Reproducir cuando quieras.',
      Pause: 'Pausar',
      Play: 'Reproducir',
      'Playing.': 'Reproduciendo.',
      'Paused.': 'Pausado.',
      Volume: 'Volumen',
      Loop: 'Repetir',
      'Restart the ambience automatically when it ends.':
        'Reinicia el ambiente automáticamente cuando termine.',
      'Floating player': 'Reproductor flotante',
      'Show a compact player while this conversation has ambience.':
        'Muestra un reproductor compacto mientras esta conversación tenga ambiente.',
      'Reader engine unavailable.': 'Motor de Lector no disponible.',
      'Turn this conversation into a cleaner long-form reading view.':
        'Convierte esta conversación en una vista de lectura larga más limpia.',
      'Enable the clean reading view for this conversation.':
        'Activa la vista de lectura limpia para esta conversación.',
      'Hide composer': 'Ocultar cuadro de mensaje',
      'Hide the message box while reading.':
        'Oculta el cuadro de mensaje mientras lees.',
      'Hide avatars': 'Ocultar avatares',
      'Remove character avatars from the transcript.':
        'Elimina los avatares de personajes de la conversación.',
      'Hide message controls': 'Ocultar controles de mensajes',
      'Remove edit, continue, reaction, and branch controls.':
        'Oculta los controles de editar, continuar, reacción y ramas.',
      'Hide sidebar': 'Ocultar barra lateral',
      'Hide Clank navigation while reading.':
        'Oculta la navegación de Clank durante la lectura.',
      'Wide reading column': 'Columna de lectura ancha',
      'Give long replies more horizontal breathing room.':
        'Da más espacio horizontal a las respuestas largas.',
      'Reading spacing': 'Espaciado de lectura',
      'Use calmer spacing between messages and paragraphs.':
        'Usa un espaciado más tranquilo entre mensajes y párrafos.',
      'Enter Focus Mode': 'Entrar en Modo Enfoque',
      'Temporarily hides Clank and Furina UI for a clean reading or screenshot view. Press Escape to exit.':
        'Oculta temporalmente la interfaz de Clank y Furina para una vista limpia de lectura o captura. Pulsa Escape para salir.',
      Advanced: 'Avanzado',
      'Add conversation-specific cosmetic CSS. Furina scopes it to the chat area so it does not normally affect the rest of Clank.':
        'Añade CSS cosmético específico de la conversación. Furina lo limita al área del chat para que normalmente no afecte al resto de Clank.',
      'Advanced CSS engine unavailable.':
        'Motor de CSS avanzado no disponible.',
      'Enable Custom CSS': 'Activar CSS personalizado',
      'Apply the saved CSS to this conversation.':
        'Aplica el CSS guardado a esta conversación.',
      'Live Preview': 'Vista previa en vivo',
      'Preview valid CSS while typing without saving it.':
        'Previsualiza CSS válido mientras escribes sin guardarlo.',
      'Previewing unsaved CSS.': 'Previsualizando CSS sin guardar.',
      'Preview reverted.': 'Vista previa revertida.',
      'Custom CSS enabled.': 'CSS personalizado activado.',
      'Custom CSS disabled.': 'CSS personalizado desactivado.',
      'Preview CSS': 'Previsualizar CSS',
      'Save CSS': 'Guardar CSS',
      'Custom CSS saved and active.': 'CSS personalizado guardado y activo.',
      'Custom CSS saved. Enable it when ready.':
        'CSS personalizado guardado. Actívalo cuando quieras.',
      'Revert Preview': 'Revertir vista previa',
      'Reset Custom CSS': 'Restablecer CSS personalizado',
      'Returned to the saved CSS.': 'Se volvió al CSS guardado.',
      'Clear the saved Custom CSS for this conversation?':
        '¿Borrar el CSS personalizado guardado para esta conversación?',
      'Custom CSS reset.': 'CSS personalizado restablecido.',
      'Create a compact DOM report when Clank changes its chat layout or a Furina selector stops matching. The report is copied locally to your clipboard.':
        'Crea un informe DOM compacto cuando Clank cambie el diseño del chat o un selector de Furina deje de coincidir. El informe se copia localmente al portapapeles.',
      'Copy DOM report': 'Copiar informe DOM',
      'Scanner unavailable.': 'Escáner no disponible.',
      'DOM report copied.': 'Informe DOM copiado.',
      'Clipboard access is unavailable.':
        'El acceso al portapapeles no está disponible.',
      'Reset actions are kept here so destructive controls are separated from everyday customization.':
        'Las acciones de restablecimiento se guardan aquí para separar los controles destructivos de la personalización diaria.',
      'Reset current theme': 'Restablecer tema actual',
      "this conversation's theme override":
        'el tema específico de esta conversación',
      'your global theme': 'tu tema global',
      'Theme reset to defaults.':
        'Tema restablecido a los valores predeterminados.',
      'Import / Export': 'Importar / Exportar',
      'Share visual themes as versioned Furina JSON. Imports are validated before anything is changed.':
        'Comparte temas visuales como JSON versionado de Furina. Las importaciones se validan antes de cambiar nada.',
      'Export Theme': 'Exportar tema',
      'Theme name': 'Nombre del tema',
      'Theme JSON copied.': 'JSON del tema copiado.',
      'Clipboard access failed.': 'Falló el acceso al portapapeles.',
      'Theme file created.': 'Archivo de tema creado.',
      'Import Theme': 'Importar tema',
      'Paste Furina theme JSON here…': 'Pega aquí el JSON del tema de Furina…',
      'Preview Import': 'Previsualizar importación',
      'Could not preview this theme.': 'No se pudo previsualizar este tema.',
      'this conversation': 'esta conversación',
      'Keep Theme': 'Conservar tema',
      'Setup engine unavailable.': 'Motor de configuración no disponible.',
      'Share the theme, Reader settings, stickers, Atmosphere, and Music / Ambience as one conversation setup.':
        'Comparte el tema, ajustes de Lector, stickers, Atmósfera y Música / Ambiente como una sola configuración de conversación.',
      'Export Full Setup': 'Exportar configuración completa',
      'Setup name': 'Nombre de la configuración',
      'Full Setup JSON copied.': 'JSON de configuración completa copiado.',
      'Full Setup file created.': 'Archivo de configuración completa creado.',
      'Import Full Setup': 'Importar configuración completa',
      'Paste Furina Full Setup JSON here…':
        'Pega aquí el JSON de configuración completa de Furina…',
      'Preview Setup': 'Previsualizar configuración',
      'Could not preview this setup.':
        'No se pudo previsualizar esta configuración.',
      'Live preview • nothing has been saved yet.':
        'Vista previa en vivo • todavía no se ha guardado nada.',
      'Visual theme': 'Tema visual',
      'Reader settings': 'Ajustes del Lector',
      'Sticker arrangement': 'Distribución de stickers',
      'Theme changes will save to this conversation.':
        'Los cambios del tema se guardarán en esta conversación.',
      'Theme changes will save to your global theme.':
        'Los cambios del tema se guardarán en tu tema global.',
      'Keep Setup': 'Conservar configuración',
      'Sticker engine unavailable.': 'Motor de stickers no disponible.',
      'Add an image or GIF, then drag or resize it directly in the chat while Furina is open.':
        'Añade una imagen o GIF y luego arrástrala o redimensiónala directamente en el chat mientras Furina esté abierto.',
      'Add sticker': 'Añadir sticker',
      'Enter a valid http or https image URL.':
        'Introduce una URL de imagen http o https válida.',
      'Sticker Library': 'Biblioteca de stickers',
      'Create your own packs and reuse saved stickers in any conversation.':
        'Crea tus propios paquetes y reutiliza stickers guardados en cualquier conversación.',
      'New pack name': 'Nombre del nuevo paquete',
      Create: 'Crear',
      'Give the pack a name first.': 'Primero dale un nombre al paquete.',
      'Could not create pack.': 'No se pudo crear el paquete.',
      'No sticker packs yet.': 'Aún no hay paquetes de stickers.',
      'Save selected sticker': 'Guardar sticker seleccionado',
      'Select a sticker in the conversation first.':
        'Selecciona primero un sticker en la conversación.',
      Sticker: 'Sticker',
      'This pack is empty.': 'Este paquete está vacío.',
      'Add to this conversation': 'Añadir a esta conversación',
      'Rename saved sticker': 'Renombrar sticker guardado',
      'Delete saved sticker': 'Eliminar sticker guardado',
      'Saved Layouts': 'Diseños guardados',
      'Layout name': 'Nombre del diseño',
      'Give the layout a name first.': 'Primero dale un nombre al diseño.',
      'Add at least one sticker first.': 'Añade al menos un sticker primero.',
      'Could not save layout.': 'No se pudo guardar el diseño.',
      'No saved layouts yet.': 'Aún no hay diseños guardados.',
      "Replace this conversation's current stickers with this saved layout?":
        '¿Reemplazar los stickers actuales de esta conversación por este diseño guardado?',
      'Clear current stickers': 'Borrar stickers actuales',
      'Remove all stickers from this conversation?':
        '¿Eliminar todos los stickers de esta conversación?',
      'No stickers in this conversation yet.':
        'Aún no hay stickers en esta conversación.',
      'Delete sticker': 'Eliminar sticker',
      'Chat-attached': 'Anclado al chat',
      'Screen-fixed': 'Fijo en pantalla',
      '↔ Flip': '↔ Voltear',
      '↕ Flip': '↕ Voltear',
      'Scene / filter preset': 'Preajuste de escena / filtro',
      Neutral: 'Neutro',
      Dream: 'Sueño',
      Horror: 'Terror',
      Moonlight: 'Luz de luna',
      'Warm Evening': 'Tarde cálida',
      Underwater: 'Bajo el agua',
      Cyber: 'Cyber',
      'Old Film': 'Película antigua',
      'Wallpaper Motion & Color': 'Movimiento y color del fondo',
      'Animate gradients or tune image/video wallpapers without editing the source file.':
        'Anima degradados o ajusta fondos de imagen/vídeo sin editar el archivo original.',
      'Animate gradients': 'Animar degradados',
      'Slowly move gradient backgrounds for a lightweight live-wallpaper effect.':
        'Mueve lentamente los fondos degradados para un efecto de fondo animado ligero.',
      'Gradient cycle': 'Ciclo del degradado',
      'Wallpaper parallax': 'Paralaje del fondo',
      'Ambient Edge Glow': 'Resplandor ambiental del borde',
      'Give the chat viewport a soft accent-colored edge light.':
        'Da al área del chat un suave resplandor de borde con el color de acento.',
      'Glow strength': 'Intensidad del resplandor',
      'Slow pulse': 'Pulso lento',
      'Let the edge glow breathe gently instead of staying static.':
        'Haz que el resplandor del borde pulse suavemente en vez de permanecer estático.',
      'Add subtle movement, glass, texture, and speaker accents to chat bubbles.':
        'Añade movimiento sutil, cristal, textura y acentos de hablante a las burbujas.',
      'New-message entrance': 'Entrada de nuevos mensajes',
      'Soft Fade': 'Desvanecido suave',
      'Float Up': 'Flotar hacia arriba',
      'Gentle Scale': 'Escala suave',
      Dreamy: 'Soñador',
      Glitch: 'Glitch',
      'Glass bubbles': 'Burbujas de cristal',
      'Use translucent frosted message bubbles over the current background.':
        'Usa burbujas translúcidas con efecto esmerilado sobre el fondo actual.',
      'Glass blur': 'Desenfoque del cristal',
      'Glass highlight': 'Brillo del cristal',
      'Bubble texture': 'Textura de burbuja',
      'Fine Grain': 'Grano fino',
      Scanlines: 'Líneas de escaneo',
      'Soft Paper': 'Papel suave',
      Holographic: 'Holográfico',
      'Speaker accent': 'Acento del hablante',
      'Fine Line': 'Línea fina',
      'Accent Bar': 'Barra de acento',
      'Glow Edge': 'Borde luminoso',
      Avatars: 'Avatares',
      'Frame character portraits and give them an optional hover response.':
        'Enmarca los retratos de personajes y añade una respuesta opcional al pasar el cursor.',
      'Avatar frame': 'Marco del avatar',
      'Accent Ring': 'Anillo de acento',
      'Double Ring': 'Anillo doble',
      'Arcane Glow': 'Resplandor arcano',
      'Cyber Cut': 'Corte cyber',
      Floral: 'Floral',
      'Avatar hover': 'Efecto al pasar sobre avatar',
      'Furina Workspace': 'Espacio de trabajo de Furina',
      'Let the Atelier panel participate in the current theme instead of always looking identical.':
        'Haz que el panel Atelier forme parte del tema actual en vez de verse siempre igual.',
      'Theme glass panel': 'Panel de cristal temático',
      'Use a more translucent, accent-tinted Furina workspace.':
        'Usa un espacio de Furina más translúcido y teñido con el acento.',
      'Panel opacity': 'Opacidad del panel',
      'Panel blur': 'Desenfoque del panel',
      'Panel cursor': 'Cursor del panel',
      'Tiny Star': 'Estrella pequeña',
      Ring: 'Anillo',
      Diamond: 'Diamante',
      'Accent sparkle': 'Destello de acento',
      'Add a tiny animated theme-colored sparkle beside the Furina branding.':
        'Añade un pequeño destello animado del color del tema junto a la marca de Furina.',
      'Floating Particles': 'Partículas flotantes',
      'A lightweight decorative layer behind the conversation.':
        'Una capa decorativa ligera detrás de la conversación.',
      'Enable particles': 'Activar partículas',
      'Float a small number of animated decorative particles through the chat.':
        'Haz flotar una pequeña cantidad de partículas decorativas animadas por el chat.',
      'Particle style': 'Estilo de partículas',
      Sparkles: 'Destellos',
      Dust: 'Polvo',
      Petals: 'Pétalos',
      Embers: 'Brasas',
      Snow: 'Nieve',
      Hearts: 'Corazones',
      Stars: 'Estrellas',
      'Particle density': 'Densidad de partículas',
      'Particle speed': 'Velocidad de partículas',
      'Add a small decorative divider between turns.':
        'Añade un pequeño divisor decorativo entre turnos.',
      'Separator style': 'Estilo del separador',
      Dots: 'Puntos',
      'Stars & diamonds': 'Estrellas y diamantes',
      Vines: 'Enredaderas',
      Runes: 'Runas',
      'Corner Ornaments': 'Ornamentos de esquina',
      'Decorate the chat viewport with four non-interactive corner flourishes.':
        'Decora el área del chat con cuatro adornos de esquina no interactivos.',
      'Enable ornaments': 'Activar ornamentos',
      'Ornament style': 'Estilo de ornamento',
      Celestial: 'Celestial',
      Gothic: 'Gótico',
      Arcane: 'Arcano',
      Lace: 'Encaje',
      'Custom Image': 'Imagen personalizada',
      'Custom ornament image URL': 'URL de imagen de ornamento personalizada',
      'Ornament opacity': 'Opacidad del ornamento',
      'Ornament scale': 'Escala del ornamento',
      'Ornament glow': 'Resplandor del ornamento',
      'Ornament inset': 'Margen del ornamento',
      'Screenshot Mode': 'Modo Captura',
      'Temporarily hide Clank and Furina controls for a cleaner screenshot. Press Escape to exit.':
        'Oculta temporalmente los controles de Clank y Furina para una captura más limpia. Pulsa Escape para salir.',
      'Enter Screenshot Mode': 'Entrar en Modo Captura',
      'Director engine unavailable.': 'Motor de Director no disponible.',
      'Persistent OOC guidance that Furina adds to every message you send in this conversation.':
        'Indicaciones OOC persistentes que Furina añade a cada mensaje que envías en esta conversación.',
      "Director Notes are added to the actual text sent to Clank, then hidden only from Furina's local rendered copy. The underlying Clank message remains unchanged.":
        'Las Notas del Director se añaden al texto real enviado a Clank y después se ocultan solo en la copia renderizada local de Furina. El mensaje subyacente de Clank no se modifica.',
      'Enable Director Notes': 'Activar Notas del Director',
      'Remind the AI of these instructions on every normal message.':
        'Recuerda a la IA estas instrucciones en cada mensaje normal.',
      'Quick Template': 'Plantilla rápida',
      'Load an optional starting ruleset, then edit it however you want. Templates never enable Director automatically.':
        'Carga un conjunto inicial de reglas opcional y edítalo como quieras. Las plantillas nunca activan Director automáticamente.',
      'General Immersive RP': 'RP inmersivo general',
      'User Agency & Consistency': 'Agencia del usuario y consistencia',
      'Lived-In World': 'Mundo vivo',
      'Narration / action formatting': 'Formato de narración / acciones',
      'Plain text': 'Texto sin formato',
      '[square brackets]': '[corchetes]',
      'Custom…': 'Personalizado…',
      'Dialogue formatting': 'Formato de diálogo',
      '“curly quotation marks”': '“comillas curvas”',
      '«guillemets»': '«comillas angulares»',
      'Custom Action Wrapper': 'Envoltorio personalizado de acciones',
      'Opening symbol': 'Símbolo de apertura',
      'Closing symbol': 'Símbolo de cierre',
      'Custom Dialogue Wrapper': 'Envoltorio personalizado de diálogo',
      'Load Template': 'Cargar plantilla',
      'Persistent OOC Notes': 'Notas OOC persistentes',
      'Replace your current Director Notes with this template?':
        '¿Reemplazar tus Notas del Director actuales con esta plantilla?',
      ' • Consider keeping persistent notes compact.':
        ' • Considera mantener compactas las notas persistentes.',
      'Save Director Notes': 'Guardar Notas del Director',
      'Director Notes saved.': 'Notas del Director guardadas.',
      'Continuity Notes': 'Notas de continuidad',
      'Add compact facts that Furina should keep reminding the AI about during this conversation.':
        'Añade datos compactos que Furina deba seguir recordando a la IA durante esta conversación.',
      Rule: 'Regla',
      Canon: 'Canon',
      Character: 'Personaje',
      Relationship: 'Relación',
      Knowledge: 'Conocimiento',
      Plot: 'Trama',
      Style: 'Estilo',
      Other: 'Otro',
      'Add Continuity Note': 'Añadir nota de continuidad',
      'Write a note first.': 'Escribe primero una nota.',
      'Enable All': 'Activar todas',
      'Disable All': 'Desactivar todas',
      'No continuity notes yet.': 'Aún no hay notas de continuidad.',
      'Injection Format': 'Formato de inyección',
      'Your saved notes...': 'Tus notas guardadas...',
      'Your actual RP message...': 'Tu mensaje RP real...',
      'Example: Mira is secretly afraid of fire.':
        'Ejemplo: Mira tiene miedo en secreto al fuego.',
      '### Formatting & Roleplay': '### Formato y roleplay',
      '### User Agency': '### Agencia del usuario',
      '### Narrative Style': '### Estilo narrativo',
      '### User Agency & Character Consistency':
        '### Agencia del usuario y consistencia del personaje',
      '### Lived-In World': '### Mundo vivo',
      '- Narration and actions are written inside _underscores_.':
        '- La narración y las acciones se escriben entre _guiones bajos_.',
      '- Narration and actions are written inside **double asterisks**.':
        '- La narración y las acciones se escriben entre **asteriscos dobles**.',
      '- Narration and actions are written as plain text without special wrapper symbols.':
        '- La narración y las acciones se escriben como texto sin formato, sin símbolos especiales.',
      '- Narration and actions are written inside [square brackets].':
        '- La narración y las acciones se escriben entre [corchetes].',
      '- Narration and actions are written inside *asterisks*.':
        '- La narración y las acciones se escriben entre *asteriscos*.',
      '- Dialogue is always written inside “curly quotation marks”.':
        '- El diálogo siempre se escribe entre “comillas curvas”.',
      '- Dialogue is written as plain text without special wrapper symbols.':
        '- El diálogo se escribe como texto sin formato, sin símbolos especiales.',
      '- Dialogue is always written inside «guillemets».':
        '- El diálogo siempre se escribe entre «comillas angulares».',
      '- Track time of day, weather, season, and environmental conditions when they affect the scene.':
        '- Lleva el seguimiento de la hora del día, el clima, la estación y las condiciones ambientales cuando afecten a la escena.',
      '- Keep the world feeling active through small background events, routines, sounds, objects, and ongoing activity.':
        '- Mantén el mundo activo mediante pequeños eventos de fondo, rutinas, sonidos, objetos y actividad continua.',
      '- Characters and locations continue to exist when off-screen. Minor events and routines may continue without the user being present.':
        '- Los personajes y lugares siguen existiendo fuera de escena. Los eventos menores y las rutinas pueden continuar sin que el usuario esté presente.',
      '- Characters have physical limits and ongoing states such as fatigue, hunger, soreness, injury, stress, and recovery.':
        '- Los personajes tienen límites físicos y estados continuos como fatiga, hambre, dolor, lesiones, estrés y recuperación.',
      '- Personal belongings, habits, routines, relationships, and environmental details should accumulate naturally over time.':
        '- Las pertenencias, hábitos, rutinas, relaciones y detalles ambientales deben acumularse de forma natural con el tiempo.',
      '- The wider world continues to exist. News, local events, weather, and outside developments may influence the scene when relevant.':
        '- El mundo más amplio sigue existiendo. Las noticias, eventos locales, el clima y acontecimientos externos pueden influir en la escena cuando sea relevante.',
      '- Avoid generic, corporate, overly polished, repetitive, or empty AI phrasing. Language should feel natural and specific to the characters and current situation.':
        '- Evita un lenguaje de IA genérico, corporativo, excesivamente pulido, repetitivo o vacío. El lenguaje debe sentirse natural y específico para los personajes y la situación actual.',
      '- Maintain strict spatial awareness. Characters may only physically interact in ways that make sense from their current position, posture, distance, surroundings, and physical reach.':
        '- Mantén una conciencia espacial estricta. Los personajes solo pueden interactuar físicamente de maneras coherentes con su posición, postura, distancia, entorno y alcance actuales.',
      '- Do not skip important moments or rush scenes that should carry emotional or narrative weight.':
        '- No omitas momentos importantes ni apresures escenas que deban tener peso emocional o narrativo.',
      '- Keep characters consistent with their established personality, speech style, habits, knowledge, relationships, motivations, and behavior.':
        '- Mantén a los personajes coherentes con su personalidad, forma de hablar, hábitos, conocimientos, relaciones, motivaciones y comportamiento establecidos.',
      '- Track relevant physical and emotional states across scenes.':
        '- Lleva el seguimiento de los estados físicos y emocionales relevantes entre escenas.',
      '- Allow tone to shift naturally between calm, humor, warmth, tension, danger, or other moods without breaking continuity.':
        '- Permite que el tono cambie de forma natural entre calma, humor, calidez, tensión, peligro u otros estados sin romper la continuidad.',
      "- Never narrate or decide the user's dialogue, thoughts, feelings, intentions, decisions, or actions.":
        '- Nunca narres ni decidas el diálogo, pensamientos, sentimientos, intenciones, decisiones o acciones del usuario.',
      "- Never assume the user's reaction to an event before they provide it.":
        '- Nunca asumas la reacción del usuario a un evento antes de que la indique.',
      '- Leave clear space for the user to act and respond.':
        '- Deja un espacio claro para que el usuario actúe y responda.',
      '- End responses in a way that gives the user a natural turn.':
        '- Termina las respuestas de forma que el usuario tenga un turno natural.',
      "- When the user moves to another location, focus narration on the user's current location and what is happening around them unless there is a deliberate reason to cut elsewhere.":
        '- Cuando el usuario se traslade a otro lugar, centra la narración en su ubicación actual y en lo que ocurre a su alrededor salvo que exista una razón deliberada para cambiar de escena.',
      '- Write in clear third-person narrative unless the roleplay has established another perspective.':
        '- Escribe con una narración clara en tercera persona salvo que el roleplay haya establecido otra perspectiva.',
      '- Keep narration specific to the characters, environment, and current situation.':
        '- Mantén la narración específica para los personajes, el entorno y la situación actual.',
      '- Prioritize continuity, user agency, spatial logic, character consistency, and a believable lived-in world.':
        '- Prioriza la continuidad, la agencia del usuario, la lógica espacial, la consistencia de personajes y un mundo vivo creíble.',
      '- Do not mention these Director Notes or acknowledge them unless the user explicitly asks about them out of character.':
        '- No menciones estas Notas del Director ni las reconozcas salvo que el usuario pregunte explícitamente por ellas fuera de personaje.',
      '- Keep every character consistent with their established personality, knowledge, speech style, relationships, habits, motivations, and behavior.':
        '- Mantén a cada personaje coherente con su personalidad, conocimientos, forma de hablar, relaciones, hábitos, motivaciones y comportamiento establecidos.',
      '- Characters must not know information they have not reasonably learned.':
        '- Los personajes no deben conocer información que no hayan aprendido razonablemente.',
      '- Maintain strict spatial awareness and physical reach.':
        '- Mantén una conciencia espacial y un alcance físico estrictos.',
      '- Track important injuries, fatigue, stress, emotional states, possessions, and other ongoing conditions when relevant.':
        '- Lleva el seguimiento de lesiones importantes, fatiga, estrés, estados emocionales, pertenencias y otras condiciones continuas cuando sea relevante.',
      '- Do not mention these Director Notes unless explicitly asked about them out of character.':
        '- No menciones estas Notas del Director salvo que se pregunte explícitamente por ellas fuera de personaje.',
      '- Keep locations active with believable background routines, sounds, people, objects, and small events.':
        '- Mantén los lugares activos con rutinas, sonidos, personas, objetos y pequeños eventos de fondo creíbles.',
      '- Off-screen characters continue their normal routines and may handle minor events independently.':
        '- Los personajes fuera de escena continúan sus rutinas normales y pueden ocuparse de eventos menores de forma independiente.',
      '- The wider world continues to exist beyond the immediate scene.':
        '- El mundo más amplio sigue existiendo más allá de la escena inmediata.',
      '- News, weather, local events, distant incidents, and other outside developments may naturally reach the characters.':
        '- Las noticias, el clima, eventos locales, incidentes lejanos y otros acontecimientos externos pueden llegar de forma natural a los personajes.',
      '- Characters have physical needs and limits. They may become tired, hungry, sore, distracted, injured, stressed, and later recover.':
        '- Los personajes tienen necesidades y límites físicos. Pueden cansarse, tener hambre, sentir dolor, distraerse, lesionarse, estresarse y recuperarse después.',
      "- Personal belongings and spaces should gradually reflect characters' habits, hobbies, relationships, and history.":
        '- Las pertenencias y espacios personales deben reflejar gradualmente los hábitos, aficiones, relaciones e historia de los personajes.',
      '- Do not reset environmental or continuity details simply because they have not been mentioned recently.':
        '- No restablezcas detalles ambientales o de continuidad solo porque no se hayan mencionado recientemente.',
      '- When the user changes location, narrate the new location and what is happening around them rather than defaulting to an earlier location.':
        '- Cuando el usuario cambie de lugar, narra la nueva ubicación y lo que ocurre a su alrededor en vez de volver por defecto a un lugar anterior.',
      Language: 'Idioma',
      'Choose how Furina labels its interface. This never translates your chats, saved notes, presets, or other personal content.':
        'Elige el idioma de la interfaz de Furina. Esto nunca traduce tus chats, notas guardadas, preajustes ni otro contenido personal.',
      'Language preference': 'Preferencia de idioma',
      'Automatic (browser language)': 'Automático (idioma del navegador)',
      English: 'English',
      Spanish: 'Español',
      'Automatic language follows your browser when Furina has a matching translation, and falls back to English otherwise.':
        'El idioma automático sigue el idioma de tu navegador cuando Furina tiene una traducción disponible y, si no, usa inglés.',
      'Current Furina language': 'Idioma actual de Furina',
      'Interface language updated.': 'Idioma de la interfaz actualizado.',
      'Translation notes': 'Notas sobre traducción',
      'Director markers and internal protocol text stay unchanged in every language. Built-in Director templates can load in the selected interface language.':
        'Los marcadores de Director y el protocolo interno permanecen sin cambios en todos los idiomas. Las plantillas integradas de Director pueden cargarse en el idioma seleccionado.',
      'Untitled Setup': 'Configuración sin título',
      'That is not valid JSON.': 'Eso no es JSON válido.',
      'The imported file is not a Furina setup.':
        'El archivo importado no es una configuración de Furina.',
      'This is not a Furina Atelier export.':
        'Esto no es una exportación de Furina Atelier.',
      'This export is not a Full Setup.':
        'Esta exportación no es una Configuración completa.',
      'No usable setup data was found.':
        'No se encontraron datos de configuración utilizables.',
      'Imported Setup': 'Configuración importada',
      '✦ Exit Focus': '✦ Salir de Enfoque',
      'Exit Focus Mode': 'Salir del Modo Enfoque',
      'Resize sticker': 'Redimensionar sticker',
      'Screenshot Mode · Press Esc to exit':
        'Modo Captura · Pulsa Esc para salir',
      'Rainy Night': 'Noche lluviosa',
      Snowfall: 'Nevada',
      'Ember Room': 'Sala de brasas',
      'Dream Fog': 'Niebla de ensueño',
      'Quiet Motes': 'Motas tranquilas',
      CRT: 'CRT',
      'Could not load this direct audio source.':
        'No se pudo cargar esta fuente de audio directa.',
      'Add an audio URL first.': 'Añade primero una URL de audio.',
      'Playback was blocked or this direct audio URL could not be played.':
        'La reproducción fue bloqueada o esta URL de audio directa no pudo reproducirse.',
      'SoundCloud is still loading.': 'SoundCloud todavía se está cargando.',
      'SoundCloud Ambience': 'Ambiente de SoundCloud',
      Ambience: 'Ambiente',
      'SoundCloud playback error.': 'Error de reproducción de SoundCloud.',
      'SoundCloud controls could not initialize.':
        'No se pudieron inicializar los controles de SoundCloud.',
      'Collapse player': 'Contraer reproductor',
      'Previous SoundCloud track': 'Pista anterior de SoundCloud',
      'Play / pause ambience': 'Reproducir / pausar ambiente',
      'Next SoundCloud track': 'Siguiente pista de SoundCloud',
      'Mute / unmute': 'Silenciar / activar sonido',
      'Pause ambience': 'Pausar ambiente',
      'Play ambience': 'Reproducir ambiente',
      Unmute: 'Activar sonido',
      Mute: 'Silenciar',
      'Expand player': 'Expandir reproductor',
      Playing: 'Reproduciendo',
      Paused: 'Pausado',
      'Loading SoundCloud…': 'Cargando SoundCloud…',
      'SoundCloud Widget API did not initialize.':
        'La API del widget de SoundCloud no se inicializó.',
      'Could not load SoundCloud Widget API.':
        'No se pudo cargar la API del widget de SoundCloud.',
      'SoundCloud iframe was not found.':
        'No se encontró el iframe de SoundCloud.',
      'SoundCloud reported a playback error.':
        'SoundCloud informó de un error de reproducción.',
      Furina: 'Furina',
      Midnight: 'Medianoche',
      Rose: 'Rosa',
      Cathedral: 'Catedral',
      Paper: 'Papel',
      Terminal: 'Terminal',
      'Untitled Theme': 'Tema sin título',
      'The imported file is not a Furina theme object.':
        'El archivo importado no es un objeto de tema de Furina.',
      'This export is not a visual theme.':
        'Esta exportación no es un tema visual.',
      'No valid theme settings were found.':
        'No se encontraron ajustes de tema válidos.',
      'Imported Theme': 'Tema importado',
      'Image preview': 'Vista previa de imagen',
      'Close image preview': 'Cerrar vista previa de imagen',
      'Furina Clank Chat Atelier': 'Furina Clank Chat Atelier',
      'Characters injected per message': 'Caracteres inyectados por mensaje',
      RULE: 'REGLA',
      CANON: 'CANON',
      CHARACTER: 'PERSONAJE',
      RELATIONSHIP: 'RELACIÓN',
      KNOWLEDGE: 'CONOCIMIENTO',
      PLOT: 'TRAMA',
      STYLE: 'ESTILO',
      OTHER: 'OTRO',
      '### Immersion & World Continuity':
        '### Inmersión y continuidad del mundo',
      '- Dialogue is always written inside "quotation marks".':
        '- El diálogo siempre se escribe entre "comillas".',
      '"quotation marks"': '"comillas"',
      'Advanced feature: invalid or aggressive CSS can make the chat look broken. Furina blocks several unsafe/global at-rules, but this editor is still intended for users comfortable with CSS.':
        'Función avanzada: un CSS no válido o agresivo puede romper visualmente el chat. Furina bloquea varias reglas globales o inseguras, pero este editor sigue estando pensado para usuarios cómodos con CSS.',
      'Attach decorative, click-through flourishes to the four chat corners.':
        'Añade adornos decorativos que no bloquean clics en las cuatro esquinas del chat.',
      'Corner inset': 'Margen de esquina',
      'Enable corner ornaments': 'Activar ornamentos de esquina',
      'Example: Never narrate dialogue, thoughts, decisions, or actions for my character.':
        'Ejemplo: Nunca narres el diálogo, pensamientos, decisiones o acciones de mi personaje.',
      'Examples: (action), [action], <<dialogue>>, or any custom opening and closing symbols.':
        'Ejemplos: (acción), [acción], <<diálogo>> o cualquier símbolo personalizado de apertura y cierre.',
      'Frame the chat with theme-aware decorations. Custom mode mirrors one transparent image into all four corners.':
        'Enmarca el chat con decoraciones adaptadas al tema. El modo personalizado refleja una imagen transparente en las cuatro esquinas.',
      'Hue shift': 'Cambio de tono',
      'Message Separators': 'Separadores de mensajes',
      'Name this saved sticker:': 'Nombre para este sticker guardado:',
      'Place a small decorative marker between conversation turns.':
        'Coloca un pequeño marcador decorativo entre turnos de conversación.',
      'Rename saved sticker:': 'Renombrar sticker guardado:',
      'Rename sticker pack:': 'Renombrar paquete de stickers:',
      'Rename theme preset:': 'Renombrar preajuste de tema:',
      Rune: 'Runa',
      Sparkle: 'Destello',
      'Temporarily hide Furina, the composer, sidebar, scrollbars, and message actions for a clean capture. Press Esc to exit.':
        'Oculta temporalmente Furina, el cuadro de mensaje, la barra lateral, las barras de desplazamiento y las acciones de mensajes para una captura limpia. Pulsa Esc para salir.',
      '*asterisks*': '*asteriscos*',
      _underscores_: '_guiones bajos_',
      '**bold**': '**negrita**',
      'Language, Advanced CSS, diagnostics, and isolated reset controls.':
        'Idioma, CSS avanzado, diagnósticos y controles de restablecimiento aislados.',
      '@import is not allowed.': '@import no está permitido.',
      '@namespace is not allowed.': '@namespace no está permitido.',
      '@charset is not allowed.': '@charset no está permitido.',
      '@font-face is not allowed in scoped CSS.':
        '@font-face no está permitido en CSS con ámbito.',
      '@page is not allowed.': '@page no está permitido.',
      '@property is not allowed in v0.1.':
        '@property no está permitido en v0.1.',
      '@keyframes is not available in v0.1.':
        '@keyframes no está disponible en v0.1.',
      'Invalid style markup.': 'Marcado de estilo no válido.',
      'CSS has an unmatched closing brace.':
        'El CSS tiene una llave de cierre sin pareja.',
      'CSS has an unterminated string.':
        'El CSS contiene una cadena sin cerrar.',
      'CSS has an unterminated comment.':
        'El CSS contiene un comentario sin cerrar.',
      'CSS has an unmatched opening brace.':
        'El CSS tiene una llave de apertura sin pareja.',
      'Firefox compatibility: SoundCloud uses its official embedded player. When a SoundCloud URL is loaded, use the controls inside that player for playback, volume, seeking, playlists, and track changes.':
        'Compatibilidad con Firefox: SoundCloud usa su reproductor oficial integrado. Cuando cargues una URL de SoundCloud, usa los controles del propio reproductor para reproducir, ajustar el volumen, desplazarte por la pista, gestionar listas y cambiar de pista.',
      'Firefox compatibility: SoundCloud and YouTube use their official embedded players. When either is loaded, use the controls inside that player for playback, volume, seeking, playlists, and track changes.':
        'Compatibilidad con Firefox: SoundCloud y YouTube usan sus reproductores oficiales integrados. Cuando cargues cualquiera de los dos, usa los controles del propio reproductor para reproducir, ajustar el volumen, desplazarte, gestionar listas y cambiar de pista.',
      'SoundCloud loaded. Use the embedded SoundCloud controls.':
        'SoundCloud cargado. Usa los controles integrados de SoundCloud.',
      'Playback, volume, seeking, and playlist controls are handled inside SoundCloud on Firefox.':
        'En Firefox, la reproducción, el volumen, la búsqueda y los controles de listas se gestionan dentro de SoundCloud.',
      'SoundCloud • embedded Firefox player':
        'SoundCloud • reproductor integrado para Firefox',
      'Use the controls inside the SoundCloud player on Firefox.':
        'Usa los controles dentro del reproductor de SoundCloud en Firefox.',
      'Use SoundCloud player': 'Usar reproductor de SoundCloud',
      'Furina loop is unavailable for SoundCloud on Firefox.':
        'La repetición de Furina no está disponible para SoundCloud en Firefox.',
      'Use YouTube player': 'Usar reproductor de YouTube',
      'Furina loop is unavailable for YouTube embeds.':
        'La repetición de Furina no está disponible para los reproductores integrados de YouTube.',
      'YouTube Ambience': 'Ambiente de YouTube',
      'YouTube • embedded player': 'YouTube • reproductor integrado',
      'Use the controls inside the YouTube player.':
        'Usa los controles dentro del reproductor de YouTube.',
      'Playback, volume, seeking, playlists, and fullscreen are handled inside YouTube.':
        'La reproducción, el volumen, la búsqueda, las listas y la pantalla completa se gestionan dentro de YouTube.'
    }
  }
})()
