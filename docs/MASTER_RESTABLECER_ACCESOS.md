# SnackOffice — Restablecimiento de acceso por MASTER

Esta versión agrega una Edge Function llamada `master-reset-password`.

## Qué hace

- Solo una sesión cuyo `profiles.rol = MASTER` puede usarla.
- MASTER puede consultar las cuentas ADMIN y VENTAS.
- MASTER puede establecer una nueva contraseña para ADMIN o VENTAS.
- MASTER no puede cambiar su propia contraseña mediante esta función; usa **Mi cuenta → Cambiar contraseña**.
- La clave secreta de Supabase nunca se incluye en el frontend.

## Despliegue en Supabase

1. Supabase → **Edge Functions**.
2. Crear una nueva función llamada `master-reset-password`.
3. Copiar el contenido de `supabase/functions/master-reset-password/index.ts` en el editor.
4. Desplegar la función.
5. Verificar que la función tenga acceso a las variables secretas administradas por Supabase. **No pegues ninguna secret/service key en `login.js` ni en GitHub.**

La función está configurada para validar el JWT y vuelve a comprobar en servidor que el usuario sea MASTER.

## Prueba

1. Iniciar sesión como MASTER.
2. Abrir **Mi cuenta**.
3. Debe aparecer **Administrar accesos**.
4. Deben aparecer ADMIN y VENTAS.
5. Restablecer una contraseña de prueba.
6. Cerrar sesión y comprobar que el usuario objetivo puede entrar con la nueva contraseña.

No hagas commit hasta completar esta prueba.
