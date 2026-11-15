# Agenda Bella v3.1 — Accesos para la estilista y las clientas

## ¿Cómo funciona ahora?

1. La aplicación abre **Reservar cita**, sin pedir cuenta ni contraseña. La clienta introduce nombre completo, celular y consiente la política de privacidad. La reserva queda en la base de datos como en v3.
2. El menú tiene **Mi cuenta (opcional)**. Una clienta puede registrarse con nombre, teléfono, correo y contraseña. Si inicia sesión, la app prellena nombre y teléfono en nuevas reservas. Las reservas anteriores se siguen consultando con el enlace del comprobante; **no hay todavía un historial unificado entre dispositivos**.
3. El menú tiene **Acceso del salón**. La primera estilista puede crear su cuenta desde la app, pero **solo** recibe permisos administrativos cuando introduce un **código temporal de 32 caracteres** generado por el administrador de Supabase. El código se utiliza una sola vez; no se incrusta en React, ni en la IPA, ni en GitHub.
4. Una clienta que crea una cuenta **no** se convierte en estilista ni puede consultar citas ajenas. La comprobación de permisos se realiza del lado de Supabase, mediante la tabla `staff_users` y RLS.

## Instalación (tienes el proyecto Supabase Agenda-Bella configurado)

**Importante: no vuelvas a ejecutar `setup_completo.sql`**. Ya lo ejecutaste en v3 y tienes reservas/tablas existentes. La actualización usa SQL adicional y no borra tus citas.

### Paso A — actualizar GitHub

Sube el **contenido** del ZIP a la raíz de tu repositorio Agenda-Bella en GitHub (reemplaza los archivos de la versión v3). Conserva tus dos secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` tal como están. Al actualizar el código no necesitas cambiarlos.

### Paso B — preparar las tablas y funciones nuevas

En **Supabase → Agenda-Bella → SQL Editor → New query**:

1. Copia el contenido entero de `supabase/v3_1_cuentas.sql` y ejecútalo una vez con **Run**. Es una migración aditiva (no borra reservas).
2. Si NO has autorizado ninguna estilista todavía, ejecuta **por separado** `supabase/generar_codigo_duena.sql`.
3. En **Results** aparecerá `codigo_de_activacion`, un código privado válido por 48 horas. Cópialo y guárdalo privadamente. **No me lo envíes ni lo publiques.** Si vence antes de usarse, ejecuta el generador otra vez: invalidará el código anterior.
4. Si la consulta no devuelve ningún código, probablemente ya existe personal en `staff_users`; en ese caso **no crees un segundo administrador**: la estilista con permisos debe iniciar sesión con el correo y contraseña que tiene. Para nuevos miembros del personal hará falta un flujo explícito de invitaciones autorizado por la dueña.

### Paso C — estilista: crear y activar cuenta en la app

1. Menú (☰) → **Acceso del salón** → **Crear cuenta**.
2. Escribir nombre, correo, contraseña robusta y **código de activación privado** del paso B.
3. Si Supabase exige confirmar correo (recomendado), abrir el email recibido, confirmarlo y volver a la app. En **Acceso del salón → Activar cuenta**, iniciar sesión con el mismo correo/contraseña e introducir el código.
4. Cuando aparezca la agenda, la cuenta está autorizada. En el futuro se accede desde **Entrar**.

> No confundas la contraseña de la estilista con la de la base de datos ni con el código de activación. El código solo sirve para la primera autorización.

### Paso D — clientas (registro totalmente opcional)

- Para reservar sin cuenta: abrir la app → elegir servicio, fecha y hora → escribir nombre completo y celular → confirmar.
- Para crear cuenta: menú → **Mi cuenta (opcional)** → **Crear cuenta**. Confirmar correo cuando corresponda e iniciar sesión.
- Para reservar después con cuenta: la app completa el nombre y teléfono del perfil, pero pueden cambiarse en cada reserva.

### Paso E — generar nueva IPA

En GitHub → **Actions** → **Generar IPA de Agenda Bella para SideStore** → **Run workflow**. Espera la ejecución verde, descarga el artefacto `AgendaBella-IPA-SideStore`, descomprímelo e instala la IPA mediante SideStore.

Las notificaciones push nativas y los mensajes de WhatsApp por Meta siguen requiriendo su configuración por separado; esta actualización no los activa automáticamente.

## Precauciones de seguridad

- Nunca utilices la `service_role` ni `sb_secret_` en el frontend, el código público o como `VITE_...`.
- Nunca pongas el código de activación en el código fuente ni en variables Vite; debe existir solamente como hash en la base de datos y una copia privada entregada a la estilista.
- No habilites una opción de “registrarse como admin” sin validación en el servidor. El formulario que agregamos exige la activación mediante la función protegida `redeem_owner_activation`.
- Es importante comprobar las políticas RLS de Supabase y hacer pruebas con **dos teléfonos distintos** antes de compartir la app con clientas reales.
- Para correos de confirmación comprueba en Supabase Authentication → URL Configuration que `Site URL` apunte al sitio HTTPS publicado y que las URL de redirección permitidas sean correctas. El enlace de confirmación puede abrirse en el navegador; después la persona vuelve a la app a iniciar sesión.

## Estado de pruebas

- Revisión estructural del proyecto: OK.
- Sintaxis JS/JSX (27 archivos): OK mediante TypeScript transpile.
- Pruebas unitarias preexistentes (12): OK.
- Compilación Vite/IPA: **no completada aquí** porque el entorno no pudo descargar las dependencias npm.
- Migración SQL ejecutada en Supabase real: **no verificada**; ejecutarla según Paso B.
- Registro por email, activación de dueña y flujo de cliente desde dispositivos reales: **pendiente de probar**.
