# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Añadido

#### 2025-12-22

- **Corrección de validación de campo `int_max_concurrent_meetings`**:
  - **Problema resuelto**: Error 500 en endpoint `/api/v1/residential/units` por validación Pydantic
  - **Causa**: Campo `int_max_concurrent_meetings` marcado como `Optional[int]` pero con `Field(...)` (requerido)
  - **Error Pydantic**: "Input should be a valid integer [type=int_type, input_value=None, input_type=NoneType]"
  - **Solución implementada**:
    - Cambio de `Field(...)` a `Field(None, ...)` en línea 35 de `residential_unit_schema.py`
    - Permite valores `None` desde la base de datos
  - **Archivos modificados**:
    - `backend/app/schemas/residential_unit_schema.py` (línea 35): Field con default None
  - **Beneficios**:
    - ✅ Endpoint funciona correctamente con registros que tienen NULL en el campo
    - ✅ Modelo Pydantic acepta valores opcionales como debe ser
    - ✅ Sin errores 500 al listar unidades residenciales

- **Unificación de componente Zoom para SuperAdministrador**:
  - **Cambio implementado**: SuperAdmin ahora usa el mismo componente de reuniones Zoom que el Administrador
  - **Componente migrado**: De `ZoomMeetingView` a `ZoomMeetingContainer`
  - **Archivos modificados**:
    - `frontend/src/pages/HomeSA.jsx`:
      - Línea 9: Importación cambiada a `ZoomMeetingContainer` del directorio AdDashboard
      - Líneas 52-56: Callback renombrado de `handleBackFromMeeting` a `handleCloseZoomMeeting`
      - Líneas 106-113: Componente actualizado con props `onClose` y `startFullscreen={true}`
  - **Archivos eliminados**:
    - `frontend/src/components/saDashboard/ZoomMeetingView.jsx` (componente obsoleto)
    - `frontend/src/components/saDashboard/VotingModal.jsx` (modal obsoleto)
  - **Beneficios**:
    - ✅ **Funcionalidad unificada**: Ambos roles usan el mismo componente probado
    - ✅ **Sistema de encuestas completo**: Polling cada 5 segundos para encuestas activas
    - ✅ **Botón flotante animado**: Aparece cuando hay encuestas activas
    - ✅ **Modal interactivo**: Votación single/multiple choice integrada
    - ✅ **Mejor UX**: Interfaz de carga mejorada con mensajes dinámicos
    - ✅ **Manejo robusto de errores**: Notificaciones visuales claras
    - ✅ **Web SDK de Zoom**: Todas las características avanzadas disponibles
    - ✅ **Código más limpio**: Sin componentes duplicados

- **Corrección de pantalla negra en componente Zoom**:
  - **Problema resuelto**: Pantalla negra al iniciar reunión de Zoom
  - **Causa identificada**: Conflicto de versiones del SDK de Zoom
    - Error en consola: "El recurso de 'https://source.zoom.us/3.8.10/lib/av/tp.min.js' fue bloqueado debido a una discordancia del tipo MIME ('text/plain')"
    - `ZoomMtg.setZoomJSLib()` intentaba cargar recursos de versión 3.8.10
    - El SDK ya usaba por defecto la versión 4.1.0
    - Conflicto entre versiones impedía inicialización correcta
  - **Solución implementada**:
    - Eliminada línea `ZoomMtg.setZoomJSLib('https://source.zoom.us/3.8.10/lib', '/av')`
    - SDK ahora usa configuración por defecto (versión 4.1.0)
    - Recursos se cargan correctamente sin conflictos MIME
  - **Archivos modificados**:
    - `frontend/src/components/AdDashboard/ZoomMeetingContainer.jsx` (línea 167): Eliminada configuración de versión incompatible
  - **Beneficios**:
    - ✅ **Carga correcta de recursos**: SDK usa versión consistente (4.1.0)
    - ✅ **Sin errores MIME**: Recursos se cargan con tipo de contenido correcto
    - ✅ **Interfaz visible**: Zoom se muestra correctamente sin pantalla negra
    - ✅ **Inicialización exitosa**: SDK se inicializa sin conflictos de versión

- **Mejoras en manejo de errores de Zoom**:
  - **Problema identificado**: Error 3000 de Zoom ("Restricción del explorador o tiempo de espera de unión a la reunión")
  - **Causas comunes**:
    - Problemas de red o firewall
    - Configuración incorrecta del SDK
    - Firma (signature) expirada
    - CORS o políticas de seguridad del navegador
    - Permisos de cámara/micrófono no otorgados
  - **Mejoras implementadas**:
    - **Configuración mejorada del SDK** (líneas 168-176):
      - `disableCORP: true` para evitar problemas de Cross-Origin
      - `audioPanelAlwaysOpen: true` para mejor experiencia de audio
      - `isSupportAV: true` para soporte explícito de audio/video
    - **Detección específica del error 3000** (líneas 269-289):
      - Identifica código de error 3000 específicamente
      - Mensaje personalizado y descriptivo para el usuario
      - Limpieza del DOM de Zoom al fallar
    - **Pantalla de error mejorada** (líneas 485-528):
      - Lista de soluciones sugeridas para error 3000:
        - ✓ Verificar conexión a internet estable
        - ✓ Permitir acceso a cámara y micrófono
        - ✓ Desactivar extensiones que bloqueen Zoom
        - ✓ Usar Chrome (recomendado)
        - ✓ Verificar firewalls
      - Botón "Reintentar" para recargar la página
      - Botón "Volver al Dashboard" para navegación alternativa
  - **Archivos modificados**:
    - `frontend/src/components/AdDashboard/ZoomMeetingContainer.jsx`:
      - Líneas 168-176: Configuración SDK mejorada
      - Líneas 269-289: Manejo específico de error 3000
      - Líneas 485-528: UI de error mejorada con soluciones
  - **Beneficios**:
    - ✅ **Menos errores**: Configuración optimizada reduce incidencia
    - ✅ **Mejor diagnóstico**: Usuario sabe qué hacer cuando ocurre un error
    - ✅ **Recuperación fácil**: Botón de reintentar con un solo click
    - ✅ **UI informativa**: Lista de pasos para solucionar problemas
    - ✅ **Experiencia mejorada**: Usuario no se queda atascado sin opciones

#### 2025-12-17

- **Sistema de votación con soporte completo para múltiples selecciones**:
  - **Problema resuelto**: Las encuestas de múltiple selección solo permitían seleccionar una opción
  - **Funcionalidades implementadas**:
    - Soporte completo para encuestas "single choice" (una sola opción)
    - Soporte completo para encuestas "multiple choice" (múltiples opciones)
    - Sistema de toggle inteligente para agregar/quitar opciones
    - Respeto del límite `int_max_selections` configurado en cada encuesta
    - Contador visual de opciones seleccionadas
    - Texto dinámico en instrucciones según tipo de encuesta
    - Botón de votar muestra contador cuando hay múltiples selecciones: "Votar (3)"
  - **Archivos modificados**:
    - `ZoomMeetingContainer.jsx`:
      - Línea 29: Estado cambiado de `selectedOption` a `selectedOptions` (array)
      - Líneas 357-367: Funciones de apertura/cierre de modal actualizadas
      - Líneas 369-392: Nueva función `handleOptionToggle()` para gestión de selecciones
      - Líneas 394-416: Función `handleVote()` actualizada para enviar múltiples votos
      - Líneas 746-807: Renderizado de opciones mejorado con lógica de selección múltiple
      - Líneas 841-881: Botón de votar con validación y contador visual
  - **Beneficios**:
    - ✅ Encuestas single choice funcionan correctamente (una sola opción)
    - ✅ Encuestas multiple choice permiten seleccionar varias opciones
    - ✅ Validación del límite máximo de selecciones
    - ✅ Feedback visual claro con contador de selecciones
    - ✅ Interfaz intuitiva para agregar/quitar opciones

- **Corrección de permisos de votación para administradores y organizadores**:
  - **Problema resuelto**: Solo el organizador de la reunión podía votar, otros administradores recibían error "Usuario no está invitado"
  - **Solución implementada**:
    - Sistema de permisos multinivel en `_get_user_voting_weight()`
    - Verificación 1: ¿Es el organizador de la reunión? → Puede votar
    - Verificación 2: ¿Creó la reunión? → Puede votar
    - Verificación 3: ¿Es admin que creó la unidad residencial? → Puede votar
    - Verificación 4: ¿Está en lista de invitados? → Puede votar con su peso
  - **Archivos modificados**:
    - `pool_service.py` (líneas 360-425):
      - Query extendida para obtener `created_by` de la reunión
      - Verificación de administrador con rol ID 2
      - Check de `ResidentialUnitModel.created_by` para validar admin
  - **Beneficios**:
    - ✅ Organizador puede votar sin estar en invitaciones
    - ✅ Admin creador de reunión puede votar
    - ✅ Admin creador de unidad residencial puede votar
    - ✅ Copropietarios invitados votan con su peso de votación

- **Rediseño completo de SweetAlert2 con tema púrpura moderno**:
  - **Estilos globales mejorados**:
    - Modales con bordes redondeados de 20px
    - Sombras suaves y elegantes
    - Fuente Inter para consistencia
    - Padding generoso (2rem)
  - **Botones con gradientes y efectos**:
    - Confirmar: Gradiente púrpura (#9333ea → #7e22ce)
    - Cancelar: Gris elegante (#e5e7eb)
    - Negar: Gradiente rojo (#ef4444 → #dc2626)
    - Efecto lift (translateY) al hacer hover
    - Sombras con color del botón para profundidad
  - **Iconos personalizados**:
    - Éxito: Púrpura (#9333ea) en lugar de verde
    - Error: Rojo (#ef4444)
    - Advertencia: Naranja (#f59e0b)
    - Info: Azul (#3b82f6)
    - Pregunta: Púrpura (#9333ea)
  - **Toasts con diseño moderno**:
    - Bordes laterales de 4px según tipo
    - Fondo blanco con sombras flotantes
    - Bordes redondeados de 16px
  - **Efectos visuales**:
    - Backdrop blur de 6px
    - Animaciones suaves (0.2-0.3s)
    - Focus states con anillos de color
  - **Archivos modificados**:
    - `swal-custom.css`: Reescrito completamente con 309 líneas de estilos organizados
  - **Beneficios**:
    - ✅ Diseño consistente con tema púrpura de la aplicación
    - ✅ Experiencia visual premium con animaciones suaves
    - ✅ Mejor accesibilidad con focus states
    - ✅ Modales y toasts más atractivos y profesionales

- **Corrección de SweetAlert en reuniones de Zoom**:
  - **Problema resuelto**: Los SweetAlert de error no se mostraban en la reunión de Zoom
  - **Causa**: El z-index del SDK de Zoom bloqueaba los modales
  - **Solución implementada**:
    - Z-index muy alto (99999) para contenedor y popup
    - Clase CSS `swal2-zoom-override` específica para Zoom
    - Cierre automático del modal de votación antes de mostrar error
    - Configuración de backdrop y permisos de cierre mejorados
  - **Archivos modificados**:
    - `ZoomMeetingContainer.jsx` (líneas 409-442): Error handler mejorado con z-index
    - `swal-custom.css` (líneas 226-233): Estilos override para Zoom
  - **Beneficios**:
    - ✅ Errores de votación visibles sobre interfaz de Zoom
    - ✅ Diseño mejorado con bordes redondeados y colores púrpura
    - ✅ Experiencia de usuario consistente

- **Menú desplegable para cerrar sesión mejorado**:
  - **Problema resuelto**: Al hacer clic en cerrar sesión, el usuario era deslogueado cuando solo quería volver al inicio
  - **Solución implementada**:
    - Menú desplegable con dos opciones al hacer hover
    - "Volver al Inicio": Regresa al dashboard sin cerrar sesión
    - "Cerrar Sesión": Cierra sesión completamente
  - **Archivos modificados**:
    - `AdDashboard.jsx` (líneas 388-412): Botón convertido en menú con dos opciones
  - **Beneficios**:
    - ✅ Navegación más intuitiva al dashboard
    - ✅ Previene cierres de sesión accidentales
    - ✅ Mejor experiencia de usuario

- **Corrección de redirección al salir de reunión**:
  - **Problema resuelto**: Al cerrar la reunión de Zoom, se redirigía a una página en blanco (`about:blank`)
  - **Solución implementada**:
    - Cambiado `leaveUrl` de `'about:blank'` a `window.location.origin + '/admin'`
    - Redirección automática al dashboard del administrador
  - **Archivos modificados**:
    - `ZoomMeetingContainer.jsx` (línea 169): URL de salida actualizada
  - **Beneficios**:
    - ✅ Regreso automático al dashboard al salir de reunión
    - ✅ Sin páginas en blanco confusas
    - ✅ Flujo de navegación mejorado

- **Ajuste de posición del botón flotante de encuestas**:
  - **Problema resuelto**: El botón flotante de encuestas tapaba el menú desplegable de cerrar sesión
  - **Solución implementada**:
    - Posición cambiada de `bottom-24` (96px) a `bottom-40` (160px)
    - Mayor espacio para el menú desplegable
  - **Archivos modificados**:
    - `ZoomMeetingContainer.jsx` (línea 397): Clase de posición actualizada
  - **Beneficios**:
    - ✅ Menú de cerrar sesión completamente visible
    - ✅ Sin superposición de elementos

#### 2025-12-16

- **CORRECCIÓN CRÍTICA: Navegación al salir de reunión sin cerrar sesión**:
  - **Problema identificado**:
    - Al salir de una reunión de Zoom, el usuario era deslogueado de la sesión
    - Esto ocurría cuando el endpoint `/meetings/{id}/end` retornaba 401 antes de completar la navegación
    - El interceptor de axios redirigía a `/login` automáticamente ante errores 401

  - **Solución implementada**:
    - Reorganizado el flujo en `handleMeetingEnd()` para ejecutar `onClose()` PRIMERO
    - El registro de hora de finalización ahora ocurre en segundo plano DESPUÉS de la navegación
    - Esto previene que errores de API (incluyendo 401) afecten el retorno al dashboard

  - **Archivos modificados**:
    - `ZoomMeetingContainer.jsx` (líneas 271-295): Reordenamiento de operaciones
      - ANTES: try { API call } catch { error } finally { onClose() }
      - AHORA: onClose() primero, luego try { API call } catch { silent error }

  - **Beneficios**:
    - ✅ **Usuario regresa al dashboard inmediatamente** al salir de la reunión
    - ✅ **Sesión se mantiene activa** sin importar el resultado del registro de finalización
    - ✅ **Experiencia fluida** sin interrupciones inesperadas
    - ✅ **Registro de finalización en segundo plano** no crítico para UX

- **Sistema completo de votación en tiempo real durante reuniones**:
  - **Problema resuelto**:
    - El modal de encuesta mostraba un mensaje placeholder sin funcionalidad real
    - No se cargaban las encuestas activas de la reunión
    - Los usuarios no podían votar durante la reunión

  - **Solución implementada**:
    - Integración completa con React Query para obtener encuestas en tiempo real
    - Query que se actualiza cada 5 segundos para detectar encuestas activas
    - Detección automática de encuesta activa (estado "Activa")
    - Botón flotante que solo aparece cuando hay encuesta activa
    - Modal funcional con interfaz completa de votación

  - **Funcionalidades del modal de encuesta**:
    - **Información de encuesta**:
      - Título y descripción
      - Badges con tipo (opción única/múltiple/texto/numérica)
      - Indicadores de configuración (anónima, permite abstención)
    - **Interfaz de votación**:
      - Lista de opciones con diseño interactivo
      - Selección visual con check mark (CheckCircle icon)
      - Estados hover y selección con colores diferenciados
      - Soporte para encuestas single y multiple choice
    - **Gestión de votos**:
      - Validación de opción seleccionada antes de votar
      - Loading state durante envío del voto
      - Actualización automática después de votar
      - Mensaje de confirmación al usuario
      - Manejo de errores con mensajes claros

  - **Archivos modificados**:
    - `ZoomMeetingContainer.jsx`:
      - Línea 4: Agregado import `CheckCircle` de lucide-react
      - Líneas 5-7: Imports de `useQuery` y `PollService`
      - Líneas 25-28: Estados para votación (`selectedOption`, `isSubmittingVote`)
      - Líneas 31-47: Query para obtener encuestas con refetch cada 5 segundos
      - Líneas 320-337: Handler `handleVote()` para enviar votos
      - Líneas 470-570: Modal completamente rediseñado con funcionalidad real

  - **Beneficios**:
    - ✅ **Votación en tiempo real** sin salir de la reunión de Zoom
    - ✅ **Actualización automática** cada 5 segundos para detectar nuevas encuestas
    - ✅ **Botón inteligente** que solo aparece cuando hay encuesta activa
    - ✅ **Interfaz intuitiva** con feedback visual claro
    - ✅ **Experiencia fluida** con loading states y mensajes de confirmación
    - ✅ **Manejo robusto de errores** para mejor UX

- **MIGRACIÓN A ZOOM SDK WEB (Pantalla Completa Real)**:
  - **Problema identificado**:
    - El SDK Embedded (`@zoom/meetingsdk/embedded`) tiene limitaciones de tamaño
    - La ventana de Zoom aparecía diminuta y no se podía expandir al tamaño completo
    - El SDK Embedded está diseñado para integraciones parciales, no pantalla completa

  - **Solución implementada**:
    - Migración completa de SDK Embedded a **SDK Web** (`@zoom/meetingsdk`)
    - El SDK Web permite pantalla completa nativa sin restricciones de tamaño
    - Utiliza el contenedor `#zmmtg-root` que Zoom renderiza en toda la pantalla
    - Precarga de recursos con `ZoomMtg.preLoadWasm()` y `ZoomMtg.prepareWebSDK()`

  - **Archivos modificados**:
    - `ZoomMeetingContainer.jsx` (reconstrucción completa):
      - Implementación con `ZoomMtg.init()` y `ZoomMtg.join()`
      - Precarga controlada de recursos
      - Detección inteligente de carga completa (líneas 147-172)
      - Pantalla de carga con z-index 10000 para estar siempre visible (línea 281)
      - Mensajes dinámicos de estado durante la carga (líneas 280-326)
      - Listeners de eventos de Zoom mejorados (líneas 120-143)
      - Registro automático de hora de finalización con logs detallados (líneas 225-247)
      - Botón flotante para ver encuestas activas (activado por defecto para pruebas, línea 22)
    - `index.html` (líneas 8-24): Agregado contenedor `#zmmtg-root` con estilos de pantalla completa
    - `override-zoom.css` (nuevo): CSS para proteger estilos de la aplicación de los estilos globales de Zoom
    - `main.jsx` (línea 4): Importación del CSS de protección después de Tailwind

  - **Diferencias técnicas**:
    - ❌ SDK Embedded: `ZoomMtgEmbedded.createClient()` - ventana limitada en tamaño
    - ✅ SDK Web: `ZoomMtg.init()` + `ZoomMtg.join()` - pantalla completa real
    - El SDK Web renderiza su propia UI completa sin restricciones de contenedor
    - Compatible con el ejemplo oficial de Zoom para aplicaciones web

  - **Beneficios**:
    - ✅ **Pantalla completa real**: Zoom ocupa 100% de la ventana del navegador
    - ✅ **Sin limitaciones de tamaño**: No hay ventanas diminutas o restricciones
    - ✅ **UI nativa de Zoom completa**: Todos los controles y funcionalidades disponibles
    - ✅ **Mejor experiencia**: Igual que usar Zoom en su aplicación web oficial
    - ✅ **Más estable**: SDK Web es el más usado y mejor mantenido por Zoom
    - ✅ **Pantalla de carga profesional**: Gradiente animado, icono de Zoom, mensajes de estado dinámicos
    - ✅ **Detección inteligente**: La pantalla de carga se oculta solo cuando Zoom está completamente renderizado
    - ✅ **Sin pantalla negra**: El usuario ve una interfaz atractiva durante toda la carga
    - ✅ **Botón nativo de Zoom**: Usa el botón de salir del propio SDK de Zoom
    - ✅ **Registro automático de finalización**: Al salir de la reunión se registra automáticamente `dat_actual_end_time`
    - ✅ **Botón flotante de encuestas**: Acceso rápido a encuestas activas sin salir de la reunión

- **CORRECCIÓN CRÍTICA: Zoom Embebido para Administradores (Unificación con SuperAdmin)**:
  - **Problema identificado**:
    - Los administradores eran redirigidos a la aplicación externa de Zoom en lugar de usar el SDK Embebido
    - Mapeo incorrecto de campos de Zoom en `UsersPage.jsx`
    - Experiencia inconsistente entre SuperAdmin (SDK Embebido) y Admin (app externa)

  - **Solución implementada**:
    - Administradores ahora usan el **mismo componente `ZoomMeetingContainer`** que SuperAdmin
    - **Experiencia unificada**: Zoom embebido en la página con pantalla de carga y controles nativos
    - Eliminada la redirección a aplicación externa (`window.open`)
    - Mapeo de campos corregido en `UsersPage.jsx`

  - **Campos corregidos**:
    - ❌ ANTES: `str_meeting_url` (no existe), `str_zoom_meeting_id` (tipo incorrecto)
    - ✅ AHORA: `str_zoom_join_url`, `int_zoom_meeting_id`, `str_zoom_password`

  - **Archivos modificados**:
    - `AdDashboard.jsx` (líneas 16, 34, 252-291, 370-381): Handler y renderizado fullscreen
    - `UsersPage.jsx` (líneas 54-56): Mapeo de campos de Zoom corregido
    - `ZoomMeetingContainer.jsx` (líneas 58-85, 219-273): Configuración de tamaño máximo del viewport (100vw x 100vh) para SDK de Zoom

  - **Beneficios**:
    - ✅ **Pantalla completa automática**: Zoom ocupa toda la ventana del navegador (100vw x 100vh)
    - ✅ **Experiencia consistente** entre SuperAdmin y Admin (mismo componente)
    - ✅ **Controles nativos de Zoom** completamente visibles y funcionales
    - ✅ **Botón de cerrar** siempre accesible en esquina superior derecha con z-index alto
    - ✅ **Pantalla de carga profesional** con spinner animado y nombre de reunión
    - ✅ **Registro automático** de hora de inicio (`dat_actual_start_time`)
    - ✅ **Sin instalación** de app de Zoom necesaria - todo en el navegador

- **Validación de datos de Zoom antes de acceder a reuniones**:
  - Agregada validación para verificar que la reunión tenga `int_zoom_meeting_id` o `str_zoom_join_url` antes de intentar acceder
  - Mensaje de error claro cuando no hay URL de Zoom disponible
  - Botón "Acceder a la Reunión" deshabilitado visualmente si no hay datos de Zoom
  - Texto del botón cambia a "Sin URL de Zoom" cuando no está disponible
  - Previene errores al intentar unirse a reuniones sin configuración de Zoom
  - Implementado en `LivePage.jsx` (líneas 167-206) y `LiveMeetingCard.jsx` (líneas 144-164)

- **Corrección de visibilidad de controles de Zoom**:
  - Ajustados los z-index de controles personalizados para no ocultar controles nativos de Zoom
  - Altura del contenedor ajustada a `calc(100vh - 200px)` con altura mínima de 600px
  - Controles personalizados ahora usan transparencia (`/80`) y backdrop-blur
  - Controles personalizados solo se muestran cuando corresponde (no en loading, posicionamiento mejorado)
  - Contenedor del SDK de Zoom configurado con `zIndex: 1` para correcta visualización
  - Aplicado a `ZoomMeetingContainer.jsx` (Administrador) y `ZoomEmbed.jsx` (Copropietario)

- **Migración completa a Zoom SDK Embedded (sin componentes)**:
  - Todos los roles (SuperAdmin, Administrador, Copropietario) ahora usan Zoom SDK Embedded
  - Eliminado el uso de componentes de Zoom en favor del SDK más moderno
  - `ZoomMeetingView.jsx` del SuperAdmin actualizado para usar SDK Embedded
  - Experiencia de usuario mejorada con controles nativos del SDK
  - Mejor rendimiento y estabilidad en las reuniones

- **Sistema de roles de Zoom configurado correctamente**:
  - **SuperAdministrador**: role: 1 (anfitrión) - Permisos completos de host
  - **Administrador**: role: 1 (anfitrión) - Permisos completos de host
  - **Copropietario**: role: 0 (participante) - Permisos limitados
  - Configuración implementada en:
    - `ZoomMeetingView.jsx` (SuperAdmin, línea 173)
    - `ZoomMeetingContainer.jsx` (Administrador, línea 169)
    - `ZoomEmbed.jsx` (Copropietario, línea 161)

- **Sistema de acceso a reuniones con Zoom SDK Embedded para Administradores**:
  - Nuevo componente `ZoomMeetingContainer.jsx` para administradores usando SDK Embedded de Zoom
  - Botón "Acceder a la Reunión" agregado a `LiveMeetingCard.jsx` para permitir a administradores unirse a reuniones en vivo
  - Integración completa en `LivePage.jsx` con navegación entre lista de reuniones, creación de encuestas y vista de Zoom
  - Los administradores se unen como anfitriones (role: 1) con permisos completos
  - Interfaz con controles de pantalla completa, minimizar y cerrar reunión
  - Vista colapsada de la reunión cuando se muestra el contenedor de Zoom
  - Registro automático de hora de inicio al acceder a la reunión

- **Registro automático de hora de inicio al ingresar a reunión**:
  - Cuando un copropietario hace clic en "Unirse a la Reunión", ahora se registra automáticamente la hora de inicio (`dat_actual_start_time`) en la base de datos
  - Cuando un administrador hace clic en "Acceder a la Reunión", también se registra la hora de inicio automáticamente
  - Llamada al endpoint `/meetings/{meeting_id}/start` antes de cargar el contenedor de Zoom
  - Estado de carga "Ingresando..." mostrado durante el proceso de registro
  - Implementado en `MeetingCard.jsx` (copropietarios, líneas 60-86) y `LivePage.jsx` (administradores, líneas 166-184)
  - Si falla el registro, la reunión se carga de todas formas para no interrumpir la experiencia del usuario

#### 2025-12-15

- **Mejoras en el sistema de creación de reuniones**:
  - **Ancho del modal optimizado**: Modal de creación de reuniones reducido a 70% del ancho de pantalla (max-w-3xl) para mejor experiencia de usuario
  - Diseño más compacto y fácil de usar en el formulario de creación

- **Asignación automática de líder de reunión mejorada**:
  - Backend ahora utiliza join con `RolModel` para buscar administradores correctamente
  - Corrección del error `UserModel has no attribute 'str_role'`
  - Filtrado por `RolModel.str_name == 'Administrador'` en lugar de campo inexistente
  - Validación mejorada para asegurar existencia de administrador activo
  - Imports actualizados en `meeting_service.py` para incluir `RolModel`

- **Sistema de gestión de encuestas con control temporal mejorado**:
  - **Ventana de creación de encuestas clarificada**:
    - Administradores pueden crear encuestas desde 1 hora antes de `dat_schedule_date`
    - Continúan creando encuestas durante toda la reunión (hasta que se cierre manualmente)
    - Validación basada únicamente en `dat_actual_end_time` (cuando admin cierra la reunión)
    - `dat_actual_start_time` usado solo para registro, NO para validación
  - **Logging detallado en pool_service.py**:
    - Información de zona horaria y tiempo actual
    - Diferencia temporal calculada en horas
    - Estado de la reunión (finalizada/accesible)
    - Decisiones de acceso registradas
  - **Manejo de zona horaria**:
    - Comparaciones timezone-aware para evitar errores
    - Conversión UTC para cálculos de tiempo consistentes
  - **Filtro de reuniones en vivo optimizado** (`PollService.js`):
    - Eliminado filtro restrictivo de "1 hora después"
    - Ahora permite acceso desde 1 hora antes hasta que la reunión termine
    - Lógica simplificada: `timeDifference <= ONE_HOUR_MS`

- **Corrección en visualización de asistentes**:
  - Campo `int_total_invitated` mostrado correctamente en vista de gestión de copropietarios
  - Actualizado `UsersPage.jsx` línea 51 para usar el campo correcto de la base de datos

- **Sistema completo de gestión de encuestas para reuniones en vivo**:
  - Nuevo componente `LiveMeetingCard` para mostrar tarjetas de reuniones activas con:
    - Estados visuales diferenciados (En Curso, Accesible, Esperando Inicio, Programada)
    - Información detallada de invitados y confirmados
    - Indicador de quórum alcanzado
  - Componente `CreatePollView` para creación completa de encuestas con:
    - Soporte para 4 tipos de encuestas: selección única, selección múltiple, texto libre y numérica
    - Configuración de opciones dinámicas (agregar/eliminar opciones)
    - Configuración de quórum, anonimato y abstención
    - Duración personalizable en minutos
    - Guardar como borrador o iniciar inmediatamente
  - Actualización completa de `LivePage`:
    - Carga automática de reuniones en vivo con validaciones estrictas
    - Sistema de filtrado por estado de reunión
    - Integración con React Query para gestión de estado
    - Navegación fluida entre listado de reuniones y creación de encuestas
  - Servicio `PollService` mejorado con:
    - Método `getLiveMeetings` con validaciones de acceso:
      - Acceso 1 hora antes de la reunión programada
      - Verificación de invitados registrados (mínimo 1)
      - Validación de estado (no finalizada, no terminada)
      - Control temporal estricto
    - Métodos completos para crear, iniciar y finalizar encuestas
    - Obtener estadísticas y resultados
    - Votación autenticada y pública
    - Helpers para creación rápida de encuestas por tipo

- **Mejoras en el sistema de reuniones**:
  - **Asignación automática de líder**: El `int_meeting_leader_id` se asigna automáticamente al administrador de la unidad residencial
    - Eliminado campo del formulario `MeetingModal`
    - Backend busca y asigna el administrador activo de la unidad
    - Logging con información del líder asignado
    - Validación: error si no existe administrador activo
  - **Registro automático de asistentes**: Al crear una reunión, `int_total_invitated` se establece automáticamente con el total de copropietarios activos de la unidad residencial
  - **Conteo en tiempo de creación**: `MeetingService.create_meeting` cuenta los copropietarios antes de crear la reunión
  - **Actualización por email**: `EmailService.send_meeting_invitation` también actualiza el contador si es necesario
  - **Ventana de acceso clara**: Los administradores pueden acceder a reuniones:
    - 1 hora ANTES de la hora programada
    - Hasta 1 hora DESPUÉS de la hora programada
    - Durante todo el tiempo que la reunión esté en curso
  - **Control manual de acceso**:
    - Botón "Cerrar Acceso" en cada tarjeta de reunión
    - Confirmación con advertencia antes de cerrar
    - Al cerrar, la reunión se marca como finalizada (`dat_actual_end_time`)
    - La reunión deja de aparecer en la lista de reuniones en vivo
  - Logging mejorado con información detallada de copropietarios
  - Estadísticas de envío incluyen `total_invitados` en la respuesta

#### 2025-12-11
- **Dashboard de Administrador completamente renovado**:
  - Nuevo componente `DashboardLayout` unificado para layouts consistentes
  - Componentes `Header` y `Sidebar` reutilizables y modulares
  - Sistema de navegación por pestañas mejorado con iconos de lucide-react
  - Integración del nombre de unidad residencial en el título del sidebar
  - Carga automática de información de unidad residencial del administrador logueado

- **Gestión completa de copropietarios desde dashboard de administrador**:
  - Integración de `ResidentModal` del superadmin (formulario profesional completo)
  - Integración de `ExcelUploadModal` para carga masiva de copropietarios
  - Reemplazo de `UsersTable` por `ResidentsList` con diseño profesional
  - Lista de copropietarios filtrada automáticamente por unidad residencial del admin
  - Funcionalidades completas:
    - ✅ Crear copropietario individual con validación completa
    - ✅ Editar copropietario existente (modo edición con datos prellenados)
    - ✅ Eliminar copropietario con confirmación
    - ✅ Reenviar credenciales individual (genera nueva contraseña temporal)
    - ✅ Envío masivo de credenciales (selección múltiple con checkboxes)
    - ✅ Carga masiva desde Excel con plantilla descargable
  - Notificaciones con SweetAlert2 para todas las operaciones
  - Invalidación automática de cache con React Query

- **Sistema de reuniones virtuales mejorado**:
  - Nuevo componente `MeetingsSection` con diseño moderno y amigable
  - Sistema de pestañas para filtrar reuniones:
    - 🔵 **Próximas**: Reuniones futuras o en curso (ordenadas de más cercana a lejana)
    - 🕒 **Historial**: Reuniones pasadas (ordenadas de más reciente a antigua)
  - Control de acceso estricto:
    - Botón habilitado solo 1 hora antes de reuniones programadas
    - Validación temporal con `canAccessMeeting()`
    - Mensaje con hora exacta de disponibilidad
  - Contador de tiempo dinámico:
    - "En X días" para reuniones lejanas
    - "En Xh Ym" para reuniones del mismo día
    - "En X minutos" para reuniones próximas
    - "Ahora" para reuniones inmediatas
  - Estados visuales diferenciados:
    - 🟢 En Curso: Verde esmeralda con botón "Unirse"
    - 🔵 Programada: Azul con botón condicional
    - ⚪ Finalizada: Gris (solo en historial)
    - 🔴 Cancelada: Rojo (solo en historial)
  - Integración de `MeetingModal` para crear reuniones de Zoom
  - Header con degradado purple→indigo y estadísticas dinámicas
  - Grid responsive con información clara (fecha, hora, asistentes)
  - Estados vacíos diferenciados por pestaña

- **Vista de gestión integrada (2 columnas)**:
  - Layout en grid responsive:
    - Desktop: 2 columnas (copropietarios | reuniones)
    - Mobile/Tablet: 1 columna apilada
  - Copropietarios (columna izquierda):
    - Tabla profesional con selección múltiple
    - Menú de acciones por residente (⋮)
    - Botones: "Cargar Excel" y "Agregar Copropietario"
  - Reuniones (columna derecha):
    - Cards modernas con bordes y fondos según estado
    - Pestañas para próximas/historial
    - Botón "Nueva Reunión" en header

- **Optimizaciones de rendimiento**:
  - Uso de `useMemo` para filtrado de reuniones (evita recálculos innecesarios)
  - React Query para cache y gestión de estados
  - Invalidación selectiva de queries
  - Ordenamiento inteligente de datos

#### 2025-12-09
- **Gestión avanzada de copropietarios desde panel de administrador**:
  - Endpoints completos para CRUD de copropietarios (`admin_coowners.py`)
  - Modal mejorado con validación completa de campos
  - Servicio de copropietario para administradores (`coownerService.js`)
  - Integración con sistema de notificaciones por correo

- **Sistema de notificaciones por correo mejorado**:
  - Servicio dedicado de notificaciones (`email_notification_service.py`)
  - Registro de notificaciones en tabla `tbl_email_notifications`
  - Plantillas HTML de correo profesionales:
    - `admin_invitation.html`: Invitación para nuevos administradores
    - `coowner_disabled.html`: Notificación de deshabilitación
    - `coowner_update.html`: Notificación de actualización de datos
    - `welcome_coproprietario.html`: Bienvenida para copropietarios
  - Botón para enviar credenciales manualmente desde interfaz

- **Mejoras en gestión de unidades residenciales**:
  - Funcionalidad completa de edición de copropietarios
  - Opción para editar sin cambiar contraseña
  - Visualización y edición de coeficiente de participación
  - Servicio mejorado de residentes (`ResidentService.js`)
  - Validación de eliminación (no permite eliminar administradores activos)

#### 2025-12-04
- **Reuniones con duración indefinida**:
  - Soporte para crear reuniones sin duración específica usando valor 0
  - Campo `int_estimated_duration`: 0 = duración indefinida, >0 = duración en minutos
  - Campo `int_meeting_leader_id` agregado al formulario de creación de reuniones
  - Opción "Permitir delegados" marcada por defecto en nuevas reuniones
  - Reuniones con duración 0 se crean en Zoom con 60 minutos por defecto (valor técnico)
  - Enlaces de Zoom se generan siempre al crear la reunión (con o sin duración)
  - Valor por defecto de `int_estimated_duration` es 0 (duración indefinida)

- **Control de acceso a reuniones programadas**:
  - Filtro automático que muestra solo reuniones del día actual y futuras
  - Reuniones pasadas ya no aparecen en la lista
  - Botón de acceso habilitado solo 1 hora antes de la reunión para administradores
  - Indicador visual de tiempo restante para habilitar acceso
  - Estados diferenciados por color: verde (en curso), azul (programada habilitada), gris (programada deshabilitada)

- **Migraciones de base de datos**:
  - Script SQL para actualizar tabla `tbl_meetings` (`001_update_meeting_nullable_fields.sql`)
  - Script SQL para cambiar `int_estimated_duration` a NOT NULL DEFAULT 0 (`002_update_estimated_duration_zero_default.sql`)
  - Script Python para aplicar migraciones automáticamente (`apply_migration.py`)
  - Documentación de migraciones en `backend/migrations/README.md`

### Cambiado

#### 2025-12-09
- **Arquitectura de notificaciones**:
  - Envío de correos movido del registro automático al panel de super admin
  - Modelo `email_notification_model.py` actualizado para soportar múltiples tipos
  - Schema `email_notification_schema.py` con campos adicionales de seguimiento

- **Componente UnidadResidencialDetalles**:
  - Refactorización completa con más de 1400 líneas mejoradas
  - Integración con múltiples servicios (ResidentService, ResidentialUnitService, coownerService)
  - Mejoras en manejo de estado y validación de formularios
  - UI mejorada con indicadores de carga y mensajes de error descriptivos

- **Servicios de API en frontend**:
  - `ResidentService.js`: Nuevo servicio para gestión de residentes (61 líneas)
  - `ResidentialUnitService.js`: Ampliado con 179 líneas de funcionalidad
  - `coownerService.js`: Nuevo servicio para operaciones de copropietarios (96 líneas)
  - `axiosconfig.js`: Configuración mejorada de interceptores

- **Configuración de navegación**:
  - Sidebare actualizados con nuevas rutas y permisos
  - `SidebarAD.jsx`: Navegación mejorada para administradores
  - `SidebarCO.jsx`: Panel simplificado para copropietarios

#### 2025-12-04
- **Modal de nuevas reuniones**:
  - Eliminado campo de fecha y hora de finalización
  - Solo solicita fecha y hora de inicio
  - Mensaje informativo sobre duración indefinida

- **Lista de reuniones programadas**:
  - Filtrado automático: solo muestra reuniones del día actual y futuras
  - Reuniones pasadas ya no se muestran en la interfaz
  - Botón de acceso con control temporal (1 hora antes de inicio)
  - Mensajes informativos sobre disponibilidad de acceso
  - Diferenciación visual entre estados: "En Curso", "Activa" y "Programada"

- **Modelo de base de datos**:
  - `int_estimated_duration`: Usa 0 para duración indefinida (NOT NULL DEFAULT 0)
  - `int_zoom_meeting_id`: Ahora acepta NULL
  - `str_zoom_join_url`: Ahora acepta NULL
  - `str_zoom_start_url`: Ahora acepta NULL
  - `bln_allow_delegates`: Valor por defecto TRUE
  - `int_total_invitated`: Valor por defecto 0
  - `int_total_confirmed`: Valor por defecto 0
  - `str_status`: Valor por defecto 'Programada'

- **Schemas de API**:
  - `MeetingCreateRequest`: Campo `int_estimated_duration` con default 0 (0 = indefinida, 15-480 = con límite)
  - `MeetingCreateRequest`: Agregado campo `int_meeting_leader_id` obligatorio
  - `MeetingCreateRequest`: Cambio de valor por defecto de `bln_allow_delegates` a TRUE
  - `MeetingResponse`: Campo `int_estimated_duration` siempre tiene valor entero (0 o mayor)

- **Servicio de reuniones**:
  - Lógica actualizada para manejar duración 0 (indefinida)
  - Reuniones con duración 0 usan 60 minutos en Zoom (valor técnico)
  - Enlaces de Zoom se generan siempre al crear la reunión
  - Soporte para `meeting_leader_id` separado del `organizer_id`
  - Mejoras en logging para diferenciar reuniones con/sin duración
  - Tipo de parámetro `estimated_duration` cambiado de `Optional[int]` a `int`

### Añadido

#### 2025-11-26
- **Notificaciones por correo electrónico**: Implementación del sistema de notificaciones por correo desde el super admin
  - Ajuste para enviar correos desde super admin en lugar de al registrar usuario
  - Envío manual de credenciales de acceso mediante botón
  - Registro de notificaciones en tabla de notificaciones
  - Plantillas de correo para administrador y copropietario
  - Correo de bienvenida automático al cargar copropietarios desde Excel

- **Gestión de administradores**:
  - Creación de administrador desde la opción de asamblea
  - Envío de correo con credenciales al crear administrador
  - Endpoints para funcionalidades administrador-copropietarios
  - Servicio de copropietario para admin

#### 2025-11-24
- **Gestión de copropietarios**:
  - Carga masiva de copropietarios desde archivo Excel
  - Configuración correcta de carga hasta 3 tablas necesarias
  - Modal unificado para crear y editar copropietarios
  - Funcionalidad de edición de copropietarios cargados desde Excel
  - Funcionalidad de eliminación de copropietarios cargados desde Excel

#### 2025-11-20
- **Interfaces de usuario**:
  - Vista de Administrador en React
  - Vista de Copropietario en React

#### 2025-11-17
- **Super Admin**: Endpoints para gestión de unidades residenciales y creación de copropietarios mediante archivo Excel

#### 2025-11-16
- **Servicios de encuestas**: Ajustes en funcionalidad de encuestas y configuración del backend para acceso desde frontend localhost:5173

#### 2025-11-11
- **Vistas adicionales**:
  - Vista de configuración
  - Vista de informes
  - Vista de reuniones activas implementadas

#### 2025-11-09
- **Encuestas**: Implementación de endpoint para crear las preguntas de las reuniones

#### 2025-10-19
- **Invitaciones a reuniones**: Endpoint para carga masiva de invitaciones a reuniones mediante archivo Excel

#### 2025-10-13
- **Funcionalidad de administrador**: Endpoint y servicio de invitación a reuniones

### Corregido

#### 2025-12-15

- **Corrección crítica en asignación de líder de reunión**:
  - Fix del error `type object 'UserModel' has no attribute 'str_role'` en `meeting_service.py`
  - Solución: Implementado join con `RolModel` y filtrado por `RolModel.str_name`
  - Estructura de base de datos correcta: `UserModel.int_id_rol` → FK a `RolModel.id`
  - Query actualizada (líneas 86-113 de `meeting_service.py`):
    ```python
    admin_query = select(UserModel).join(
        UserResidentialUnitModel,
        UserModel.id == UserResidentialUnitModel.int_user_id
    ).join(
        RolModel,
        UserModel.int_id_rol == RolModel.id
    ).where(
        UserResidentialUnitModel.int_residential_unit_id == residential_unit_id,
        RolModel.str_name == 'Administrador',
        UserModel.bln_allow_entry == True
    )
    ```

- **Corrección en filtro de reuniones en vivo para creación de encuestas**:
  - Problema: No aparecían reuniones disponibles para crear encuestas
  - Causa: Filtro temporal demasiado restrictivo en `PollService.js`
  - Solución: Cambio de lógica de validación temporal
    - Antes (incorrecto): `timeDifference <= ONE_HOUR_MS && timeDifference >= -ONE_HOUR_MS`
    - Ahora (correcto): `timeDifference <= ONE_HOUR_MS`
  - Permite mostrar reuniones que están a menos de 1 hora de distancia O ya iniciadas

- **Corrección en validación de creación de encuestas**:
  - Clarificación del uso correcto de campos temporales de reunión:
    - `dat_schedule_date`: Hora programada de la reunión
    - `dat_actual_start_time`: Registro de cuando el admin inició la reunión (solo logging)
    - `dat_actual_end_time`: Cuando el admin cerró el acceso (usado para validación)
  - Lógica de validación simplificada y correcta:
    1. Si `dat_actual_end_time` existe → reunión finalizada, no permitir encuestas
    2. Si faltan más de 1 hora para `dat_schedule_date` → no permitir encuestas
    3. De lo contrario → permitir encuestas
  - Removed uso incorrecto de `dat_actual_start_time` para validaciones

- **Corrección en visualización de asistentes en reuniones**:
  - Campo incorrecto: `attendees_count` (no existente)
  - Campo correcto: `int_total_invitated` (de la base de datos)
  - Archivo actualizado: `frontend/src/components/AdDashboard/UsersPage.jsx:51`

#### 2025-12-09
- **Generación de reuniones**:
  - Corrección en creación de reuniones desde panel de administrador
  - Ajuste en validación de campos requeridos
  - Mejora en manejo de errores al crear reunión en Zoom

- **Asignación de administrador**:
  - Corrección en lógica de asignación de administrador a unidad residencial
  - Validación mejorada de permisos antes de asignar
  - Fix en actualización de rol de usuario al convertirse en administrador

- **Servicio de unidades residenciales** (`residential_unit_service.py`):
  - Corrección en endpoint de eliminación de copropietarios
  - Validación que previene eliminar administradores activos
  - Fix en procesamiento de archivo Excel (`process_residents_excel_file`)
  - Corrección en actualización de copropietarios sin cambiar contraseña

- **Autenticación y autorización**:
  - Ajustes en `auth_endpoint.py` para manejo correcto de roles
  - Corrección en `auth.py` para validación de tokens
  - Fix en redirección según rol de usuario después del login

#### 2025-11-26
- **Login y administrador**: Corrección en asignación de administrador y ajustes en login para entrar a vistas diferentes según rol

#### 2025-11-24
- **Unidades residenciales**:
  - Ajustes en carga de usuarios del sistema para administración
  - Corrección en carga de residentes
  - Corrección para cargar todos los usuarios encontrados de esa unidad
  - Ajuste para mostrar coeficiente en modal de edición
  - Permitir editar sin cambiar la contraseña
  - Creación de función `process_residents_excel_file` para correcto funcionamiento del sistema
  - Ajuste para evitar eliminación de copropietario que sea administrador de la sesión

- **Login**: Corrección en login cambiando inicio de sesión por nombre de usuario

- **Autenticación**: Corrección en lógica de auth

#### 2025-11-14
- **Seguridad y encriptación**:
  - Corrección en encriptado de datos
  - Ajustes visuales para unidades residenciales
  - Corrección en login para nueva estructura de hash
  - Corrección en encriptación y verificación de contraseñas
  - Logout aplicado

- **Base de datos**: Corrección en conector SQL compatible con Windows

#### 2025-11-11
- **Frontend**:
  - Ajustes visuales
  - Agrupación de vistas relevantes de la unidad residencial

- **Gestión de errores**: Ajuste en clases de excepciones para mejorar gestión de errores en servicio de creación de encuestas

#### 2025-10-19
- **Administrador**: Ajuste de respuestas y endpoints para carga masiva

### Eliminado

#### 2025-12-09
- **Archivos de documentación obsoletos del backend**:
  - `CAMBIOS_SISTEMA_ENCUESTAS.md` (280 líneas)
  - `CONFIGURAR_EMAIL.md` (292 líneas)
  - `EJEMPLO_USO_ENCUESTAS.md` (498 líneas)
  - `GUIA_POSTMAN_ENCUESTAS.md` (432 líneas)
  - `SISTEMA_EMAIL_README.md` (330 líneas)
  - `Postman_Collection_Encuestas.json` (483 líneas)

- **Scripts SQL obsoletos**:
  - `MIGRATION_POLL_FIX.sql` (38 líneas)
  - `agregar_campo_password.sql` (12 líneas)
  - `crear_multiples_usuarios_prueba.sql` (93 líneas)
  - `crear_usuario_prueba_email.sql` (98 líneas)

#### 2025-12-04
- Archivo de ejemplo `EJEMPLO_USO_POLLSERVICE.md` del frontend (532 líneas)

---

## Convenciones de commits

Este proyecto utiliza los siguientes prefijos en los commits:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de errores
- `merge`: Fusión de ramas
- `docs`: Cambios en documentación

## Autores

- Jose David N
- Santiago-RV
- Darwin352
