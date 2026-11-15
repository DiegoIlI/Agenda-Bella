# PROMPT MAESTRO PARA CLAUDE — AGENDA BELLA BEAUTY STUDIO

Te adjunto un archivo ZIP con el **proyecto completo y actual de Agenda Bella** y una imagen en `REFERENCIAS_VISUALES/01_DISENO_OBJETIVO_DOS_IPHONE.jpeg` que define la apariencia visual final. **Tu misión es TERMINAR EL PROYECTO ENTREGÁNDOME CÓDIGO FUNCIONAL Y UN ZIP DE REGRESO**, no solo recomendaciones, bocetos, HTML suelto o un mockup.

## 1. Contexto y meta

Esta app es para el salón de belleza de mi mamá en Mérida, Yucatán, México. Ofrece cortes, tintes, mechas/balayage, peinados, tratamientos capilares, manicura, pedicura, uñas acrílicas y otros servicios configurables. La app se llama **Agenda Bella — Beauty Studio**. El teléfono de atención y WhatsApp del salón es **999 766 6778** (México); el enlace de chat correcto es **https://wa.me/529997666778**. Guárdalo como teléfono comercial editable desde Ajustes, con 10 dígitos en base de datos y +52 en el enlace. NO confundirlo con el teléfono de una clienta y NO usarlo como credencial o token para la API de WhatsApp.

Quiero dos experiencias en el mismo sistema:

**A) Clientas**: mi mamá comparte un enlace público en WhatsApp, Instagram o Facebook. La clienta abre el enlace sin necesitar cuenta ni instalar nada. Ve el catálogo de servicios, selecciona uno, consulta un calendario que muestra únicamente disponibilidad REAL, elige día y hora, escribe su nombre y número móvil mexicano, acepta el aviso de privacidad y confirma. La cita debe registrarse en una base de datos central y devolver un comprobante con fecha, hora, duración, servicio, precio de referencia, estado y enlace privado para consultar/cancelar (con reglas claras). Debe poder abrir el chat directo con el salón por WhatsApp. La confirmación no significa que ya se haya enviado un WhatsApp automático.

**B) Dueña**: inicia sesión con su cuenta protegida; ve agenda diaria y próximas citas, nombres y teléfonos de clientas, servicio, hora, duración y estado; puede contactar por WhatsApp, confirmar/cancelar si el flujo lo requiere, bloquear días, gestionar horarios y configurar servicios, precios, duración, datos del salón y enlaces. Las clientas NO pueden ver nombres ni teléfonos ajenos. Todas las reservas deben sincronizarse entre dispositivos.

## 2. Diseño: IGUAL AL EJEMPLO, NO OTRO REDISEÑO

**Imagen principal obligatoria**: `REFERENCIAS_VISUALES/01_DISENO_OBJETIVO_DOS_IPHONE.jpeg`. Es una referencia de diseño conceptual, NO una captura de la implementación actual. Usa la composición y componentes visuales como objetivo: rosa empolvado, blanco crema, burdeos suave, sombras muy sutiles, bordes redondeados, tipografía serif elegante para marca y titulares y sans-serif clara para controles. Prioridad: aspecto de app nativa de iPhone, legibilidad y sensación premium. Usa el diseño de la imagen; no inventes un tema negro/dorado ni cambies el estilo. No pongas la imagen de referencia como un único fondo estático: implementa TODOS los elementos en React/CSS, interactivos y adaptables.

Pantalla clienta como en el teléfono IZQUIERDO de la referencia:
- Barra de navegación SUPERIOR compacta: menú hamburguesa, marca/logo `Agenda Bella · BEAUTY STUDIO` centrado, icono WhatsApp a la derecha.
- Banner/hero de salón con texto **«Tu belleza merece su momento ♡»**; imagen tratada elegantemente, sin dificultar la lectura.
- Tarjeta principal **«Reserva tu cita»** con descripción breve.
- Lista o selección de servicios con iconos, nombre, duración y opcionalmente precio; selección rosa destacada.
- Calendario elegante con mes, flechas y distinción clara de disponible / ocupado / cerrado, respetando horario y duración del servicio.
- Horarios disponibles como chips, estados accesibles y seleccionables.
- Botón principal grande «Reservar cita»; formulario fluido con nombre y teléfono, confirmación y comprobante.

Pantalla dueña como en el teléfono DERECHO:
- Encabezado compacto y sección **«Mi agenda»**, selector de día con flechas y calendario.
- **«Citas del día»** con tarjetas: hora muy visible, servicio, nombre, teléfono, estado y acciones WhatsApp/editar/cancelar.
- **«Próximas citas»** en tarjetas compactas.
- Menú inferior fijo: **Agenda | Clientes | Servicios | Ajustes**, con iconos y estado activo.
- Vista Clientes con búsqueda e historial útil; Servicios con alta/edición/desactivación; Ajustes con horario, descansos y datos del salón.

Las capturas `02_APP_ACTUAL_RESERVAS.png`, `03_APP_ACTUAL_CALENDARIO.png` y `04_APP_ACTUAL_MENU_LATERAL.png` muestran la v2 instalada. Hay problemas reales que debes corregir: (1) contenido/topbar/menú lateral se superponen con hora, Dynamic Island o barra de estado; (2) en pantalla de iPhone algunas fuentes, márgenes, tarjetas y espaciados son demasiado grandes para asemejarse al diseño objetivo; (3) la app aún muestra 'Modo demostración' por falta de backend configurado. Usa `viewport-fit=cover` y safe areas (`env(safe-area-inset-top/bottom)`) bien resueltas tanto en Safari/PWA como en Capacitor iOS; prueba dispositivos estrechos y pantallas grandes. No agregues doble espacio superior innecesario. Que el logo y menú no se corten.

## 3. Lógica de citas OBLIGATORIA

- La dueña configura sus días laborables, horas, descansos, feriados y vacaciones; días bloqueados no se pueden reservar.
- Cada servicio tiene duración editable (ej. corte 45 min, tinte 120, balayage 180), precio, categoría, descripción, imagen/icono y visibilidad.
- Intervalos de inicio configurables (por defecto 30 min), margen de anticipación y ventana de días reservables.
- Si se reserva balayage de 10:00 a 13:00, el intervalo COMPLETO queda bloqueado frente a cualquier otro servicio. No basta marcar la hora de inicio.
- Respetar capacidad de atención: **una persona a la vez** en la primera versión, salvo que la dueña active posteriormente varios profesionales.
- Validación transaccional en servidor/SQL para evitar doble reserva en carreras concurrentes entre dos teléfonos. Si la hora se ocupó, refrescar y avisar.
- Confirmación instantánea visible y almacenada centralmente; estados confirmada/cancelada. Reprogramación segura si la implementas: liberar horario anterior solo después de reservar el nuevo.
- Enlaces compartibles de reservación y de comprobante, sin exponer datos personales en la URL pública.
- Zona horaria exclusiva del negocio `America/Merida`; mostrar formato español mexicano, fechas/horarios correctos en ambos teléfonos; validar cambios de día y vencimientos.
- Estado vacío correcto; UX para errores, pérdida de conexión y carga; carga rápida.

## 4. WhatsApp y recordatorios: FUNCIONAR DE VERDAD, SIN SIMULAR

**Al confirmar:** mostrar un comprobante y un botón de WhatsApp con enlace `https://wa.me/529997666778` y mensaje opcional prellenado para contactar al salón. Esto abre chat, pero NO es un envío automático: no presentes el botón como si enviara recordatorios.

**Recordatorios automáticos:** la dueña quiere que la clienta reciba uno **el día anterior a su cita** (por ejemplo, reserva para el 4 de diciembre -> recordatorio el 3 de diciembre a una hora diurna configurable, por ejemplo 09:00 hora Mérida). Canales deseados: (a) WhatsApp automático usando **Meta WhatsApp Business Platform / Cloud API** con plantilla Utility aprobada, consentimiento expreso/opt-in, credenciales SOLO en backend, registro de envíos, reintentos seguros y control anti-duplicados; (b) notificación en el teléfono cuando la clienta haya instalado/permitido notificaciones. Contemplar que WhatsApp puede tener tarifas y proceso de alta/plantillas; documentar costos y requisitos. En caso de no configurar Meta, mostrar explícitamente 'WhatsApp automático pendiente de configuración', NO fingir que ya manda mensajes.

**Push web:** para clientas que abren la PWA instalable y dan permiso; en iPhone la web push tiene requisitos distintos a los de una app empaquetada. **Push nativo en IPA SideStore/Capacitor:** no asumir que las notificaciones remotas funcionarán sin APNs, capacidades y firma apropiadas; documentar exactamente qué es posible con SideStore y qué requiere Apple Developer/entitlements. Implementar opción viable y probar envío real; si no es viable sin gastos, dejar ruta alternativa clara sin falsos éxitos. NO pedir permiso de notificaciones sin un gesto explícito de la usuaria. El recordatorio por WhatsApp es la alternativa principal para clientas sin app instalada.

Recordatorios: programados en servidor y no dependen de que la mamá tenga abierta la app, no enviar citas canceladas, registrar resultado por canal; si se reprograma, actualizar programación. Mantener secretos de Meta, Supabase service_role, VAPID privados y cualquier clave APNs fuera del frontend y GitHub.

## 5. Tecnología: APROVECHA EL PROYECTO EXISTENTE

Descomprime el ZIP. La raíz (donde está `package.json`) ya tiene React + Vite, `src/PremiumApp.jsx`, `src/premium.css`, `src/api.js`, `src/assets/salon-ambiente.jpg`, `public/`, `supabase/migrations`, Edge Function `appointment-reminders`, `capacitor.config.json`, `.github/workflows/ios-ipa.yml`, `.env.example` y documentación. No empieces de cero ni rompas funcionalidades existentes. Los ZIP de `HISTORIAL_NO_UTILIZAR_PARA_COMPILAR/` son respaldos viejos; **LA RAÍZ ES LA FUENTE ACTUAL v2.1**.

- Frontend React + Vite, diseño responsive CSS o Tailwind si justificado; mínimo de dependencias razonables.
- Backend Supabase (Auth para administradora, PostgreSQL, RLS, funciones RPC/Edge Functions, Realtime si procede). Prioriza planes gratuitos mientras sean suficientes.
- Una sola fuente de verdad de disponibilidad en el backend, no en `localStorage` para producción.
- El modo demo local debe ser solo una opción de prueba explícita; en producción, sin Supabase configurado, mostrar configuración pendiente y **no permitir reservar citas reales**. Mantén `localStorage` solo como simulador local separado.
- Asegura el panel admin con Supabase Auth + staff_users y políticas RLS; nada de contraseña o PIN solo en frontend.
- Revisa política de exposición por RPC, permisos, SQL constraints y concurrencia. Evita filtrar client_name o teléfono en endpoints públicos.
- Mantén PWA con manifest y service worker y agrega app Android/iOS con Capacitor; asegurar diseño y navegación correcta en la IPA de SideStore.
- Sitio público comercial: desplegar frontend en un hosting que permita uso comercial, por ejemplo Cloudflare Pages; NO depender de GitHub Pages para producción. Código fuente en GitHub `Agenda-Bella`.
- Workflow Actions que compile la app y genere un `.ipa` sin firmar para SideStore cuando resulte posible, con instrucciones precisas; nunca afirmar que se produjo una IPA si no compilaste.
- No comprometer tokens/secretos; entregar `.env.example` y explicación de variables públicas vs. privadas.

## 6. Experiencia en móviles y calidad visual

Prioriza fidelidad a imagen de los dos teléfonos: dimensiones reales de iPhone, textos legibles, lista de servicios y calendario compactos, barra inferior admin siempre alcanzable, teclados no tapan controles, botones con área táctil suficiente, animaciones suaves y discretas, iconos consistentes. Compatible con iPhone en Safari y con el contenedor Capacitor, Android Chrome, PC. Evita overlays en barra de estado; revisar el menú lateral abierto y la cabecera al hacer scroll. Estados loading/skeleton, vacío y errores sin estorbar. Diseño de alto nivel, no una página enorme que parece escritorio en móvil.

## 7. Qué debes ENTREGARME, no solo explicarme

1. **ZIP final completo y funcional** con raíz del proyecto, sin `node_modules` ni secretos, listo para reemplazar archivos de GitHub.
2. Código corregido y probado; corregir errores reales, no ocultarlos. Generar `package-lock.json` y usar `npm ci` en CI cuando aplique.
3. Migraciones SQL nuevas/seguras para una base existente y guía para instalar desde cero. Nunca borrar reservas existentes; respaldos antes de cambios.
4. Scripts/funciones de recordatorios con dependencias, configuración de plantilla Meta, CRON de Supabase y notificaciones; entrega claro qué funciona realmente y qué requiere credenciales/aprobación.
5. Guía paso a paso **PASO_A_PASO_GITHUB_SUPABASE_IPHONE.md**: cómo subir, conectar BD, configurar la cuenta de la dueña, hosting web comercial, obtener enlace público, generar IPA en Actions y usar SideStore.
6. Capturas reales de las vistas renderizadas o un preview HTML funcional si puedes; NO sustituir por una imagen generada.
7. Lista de QA con pruebas y resultados: `npm ci`, `npm run build`, `npm run check`, pruebas de reserva/conflicto/cancelación, flujo admin/clienta, Safari móvil y safe areas, PWA, IPA (si disponible), ensayo de recordatorio. Si una prueba no pudo hacerse, dilo claramente.
8. Documentación final en español mexicano, sin tecnicismos innecesarios al explicarme cómo instalar.

## 8. Pruebas de aceptación obligatorias

- Dos teléfonos con enlace web abierto: clienta A reserva 4 de diciembre 10:00 para servicio de 180 minutos; en teléfono B ese período ya no está disponible; la cita aparece en agenda admin. Ningún cliente ve los datos de otra persona.
- La dueña modifica el precio de un servicio y el nuevo dato aparece al recargar en la vista pública.
- La dueña bloquea el 5 de diciembre y nadie puede elegirlo.
- La dueña cancela una cita y esa disponibilidad vuelve a mostrarse cuando corresponda; no debe enviarse recordatorio de la cita cancelada.
- La clienta da consentimiento de WhatsApp y recibe recordatorio el día anterior cuando Meta está configurado; si falta configuración, queda registrado como pendiente/no enviado, nunca como enviado. Sin consentimiento, no mandar WhatsApp.
- Las notificaciones requieren opt-in y se reciben SOLO después de configurar el canal correcto; explicar limitación IPA/SideStore.
- En iPhone, ninguna pantalla ni menú tapa la hora, isla dinámica, indicador de inicio o barra inferior.
- El resultado visual se parece notablemente a `01_DISENO_OBJETIVO_DOS_IPHONE.jpeg`: no solo colores parecidos, sino estructura de bloques, escala, botones, header, tarjetas y tabs.

**Modo de trabajo:** Primero audita el proyecto recibido y lista brevemente lo que ya funciona y los riesgos que detectes. Después MODIFICA LOS ARCHIVOS y entrega el ZIP final. Si una integración externa requiere mis credenciales o aprobación de Meta/Apple, déjala implementada y documenta el paso exacto, sin inventar credenciales ni fingir que enviará mensajes. No me entregues solo un plan o un prompt: quiero la implementación completa y un ZIP descargable.
