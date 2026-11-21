# Cambio de cuenta propietaria: contactotesoreriauma@gmail.com

Desde esta versión, la cuenta propietaria y remitente es **contactotesoreriauma@gmail.com**. Esa cuenta ejecuta Apps Script, envía los correos a los estudiantes y guarda en **su** Google Drive la hoja, los formularios y los documentos.

Google envía los correos desde la cuenta que ejecuta el script, por eso el cambio consiste en instalar el sistema en la nueva cuenta. El sistema actual (darshanbachhavapp@gmail.com) sigue funcionando hasta el paso 9.

> **Importante:** no pegue el nuevo `dist/Code.gs` en el proyecto de Apps Script actual. Ese proyecto pertenece a la cuenta anterior, y con el código nuevo rechazaría todas las operaciones (solo admite a la cuenta propietaria). Péguelo únicamente en el proyecto nuevo del paso 2.

Use una ventana InPrivate con **solo** la cuenta contactotesoreriauma@gmail.com iniciada. Con dos cuentas abiertas, Google puede usar la que no corresponde.

## 1. Preparar desde la cuenta anterior

Con darshanbachhavapp@gmail.com:

1. **Compartir los formularios.** Abra el formulario de solicitud y el de subsanación. En **Compartir / Colaboradores**, agregue a contactotesoreriauma@gmail.com como **Editor**. Así la nueva cuenta puede copiarlos con todas sus preguntas.
2. **Anotar las propiedades del script.** En el proyecto de Apps Script actual, vaya a **Configuración del proyecto → Propiedades del script** y anote estos valores:
   - `MANAGEMENT_USERNAME`
   - `MANAGEMENT_SALT`
   - `MANAGEMENT_ITERATIONS`
   - `MANAGEMENT_VERIFIER`
   - `MANAGEMENT_AUTH_ENABLED`
   - `MANAGEMENT_CREDENTIAL_VERSION`
   - `INSTITUTIONAL_EMAIL_DOMAINS`
   - `RECEIPT_EMAIL_ENABLED`

   Los valores `MANAGEMENT_*` mantienen el mismo usuario y contraseña del panel. Son datos privados: no los envíe por chat ni correo.

## 2. Crear el proyecto en la nueva cuenta

Con contactotesoreriauma@gmail.com:

1. **Copiar los formularios.** Abra cada formulario compartido y use **⋮ → Hacer una copia**. Anote el **ID de edición** de cada copia, es decir, la parte de la URL entre `/forms/d/` y `/edit`.
2. **Crear el proyecto.** En [script.google.com](https://script.google.com), cree un proyecto llamado **UMA — Descuentos Corporativos**.
3. **Pegar el manifiesto.** En **Configuración del proyecto**:
   1. Marque **Mostrar el archivo de manifiesto "appsscript.json"**.
   2. Reemplace el contenido de `appsscript.json` por el de `dist/appsscript.json`.
4. **Pegar el código.** Reemplace todo el contenido de `Code.gs` por `dist/Code.gs` y guarde.
5. **Agregar las propiedades del script.** En **Propiedades del script**, agregue:
   - todos los valores anotados en el paso 1.2
   - `GOOGLE_FORM_ID`, con el ID de la copia del formulario de solicitud
   - `CORRECTION_FORM_ID`, con el ID de la copia del formulario de subsanación

## 3. Crear los recursos

En el editor, ejecute `initializeProject` y autorice los permisos con contactotesoreriauma@gmail.com.

La función crea en el Drive de la nueva cuenta:
- la hoja **UMA — Control de Descuentos Corporativos**
- la carpeta privada **UMA_DESCUENTOS_CORPORATIVOS** (los Excel exportados se descargan directamente; no se guardan en Drive)

Además, conecta las copias de los formularios.

## 4. Publicar el servicio

1. Vaya a **Implementar → Nueva implementación → Aplicación web**.
2. Configure **Ejecutar como:** Yo (contactotesoreriauma@gmail.com).
3. Configure **Quién tiene acceso:** Cualquier usuario.
4. Copie la URL que termina en `/exec`.

## 5. Configurar el sitio y la ficha PDF

1. Abra `URL/exec?mode=setup` con la nueva cuenta.
2. En **Origen**, escriba `https://uma-descuentos-corporativos.onrender.com`.
3. Adjunte el PDF original de la ficha socioeconómica, `reference/FORMATO 1_FICHA DE EVALUACION SOCIOECONOMICA_2027-I.pdf`, y guarde.
4. En la misma pantalla, pulse estos dos botones:
   1. **Finalizar e instalar disparadores**
   2. **Verificar configuración**: debe indicar que está listo.

## 6. Ordenar la hoja y el acceso

En el editor, ejecute estas funciones en orden:

1. `organizeSpreadsheet`: deja la hoja con la pestaña **Respuestas de estudiantes**.
2. `shareDocumentsWithSheetUsers`: déjelo para después de compartir la hoja con quienes deban ver los documentos.

## 7. Actualizar el sitio en Render

Envíe a Desarrollo estos dos datos:
- la nueva URL `/exec`
- el enlace público del nuevo formulario de solicitud (**Enviar → enlace**, termina en `/viewform`)

Desarrollo actualiza `deploy/public-config.json` en un PR. Sin PR, también se pueden configurar en Render estas variables de entorno, y luego volver a desplegar ambos servicios:

| Servicio | Variable | Valor |
| --- | --- | --- |
| `uma-descuentos-corporativos` | `UMA_APPS_SCRIPT_URL` | la nueva URL `/exec` |
| `uma-descuentos-corporativos` | `UMA_APPLICATION_FORM_URL` | el nuevo enlace `/viewform` |
| `uma-descuentos-corporativos-api` | `UMA_APPS_SCRIPT_URL` | la nueva URL `/exec` |

## 8. Probar y abrir

1. **Activar los correos.** En **Propiedades del script**, ponga `EMAIL_NOTIFICATION_ENABLED` en `true`.
2. **Abrir los formularios.** En `?mode=setup`, pulse **Abrir formularios**.
3. **Hacer una prueba completa:**
   1. Envíe el formulario con un correo propio.
   2. Ingrese al panel con el mismo usuario y contraseña de siempre.
   3. Observe la solicitud.
   4. Confirme que el correo llega **desde contactotesoreriauma@gmail.com**.
   5. Confirme que los documentos están en el Drive de la nueva cuenta.

## 9. Retirar la cuenta anterior

Con darshanbachhavapp@gmail.com:

1. **Detener los disparadores.** En el proyecto anterior, vaya a **Activadores** y elimine los cuatro disparadores. Así deja de procesar formularios y de enviar correos.
2. **Cerrar los formularios anteriores.** En **Respuestas**, desactive **Aceptar respuestas**, para que nadie use el enlace antiguo.
3. **Conservar los datos de prueba.** Las solicitudes y documentos de prueba anteriores quedan en el Drive de la cuenta anterior, sin cambios. No se trasladan.

## Qué cambia y qué no

| | Antes | Después |
| --- | --- | --- |
| Remitente de los correos y respuesta a | darshanbachhavapp@gmail.com | contactotesoreriauma@gmail.com |
| Hoja, formularios y documentos | Drive de darshanbachhavapp | Drive de contactotesoreriauma |
| Enlace del formulario para estudiantes | anterior | nuevo (el sitio `/estudiantes` redirige al nuevo tras el paso 7) |
| Usuario y contraseña del panel | — | los mismos |
| Dirección del panel | — | la misma: uma-descuentos-corporativos.onrender.com |
