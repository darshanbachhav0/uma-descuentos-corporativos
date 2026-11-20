# Manual de Tesorería

## Cómo se organizan las solicitudes

- **Una solicitud por correo institucional y periodo.** Si un estudiante envía el formulario varias veces con el mismo correo institucional, cada envío se añade a la misma solicitud como una nueva **revisión**. La columna “Envíos” muestra cuántos hay.
- **Ningún envío se descarta.** Si un envío tiene datos inválidos (por ejemplo, un DNI que no tiene 8 dígitos), la solicitud aparece igual con **alertas**.
- **Pendientes** incluye todo lo que aún no se aplica en SIGU, también las **observadas**. Una solicitud observada sigue pendiente hasta que el estudiante corrige y Tesorería la aprueba.

## Revisión

1. Ingrese con el usuario y contraseña entregados.
2. Abra la pestaña **Por revisar** y haga clic en una fila. La ficha de la revisión actual se muestra en la vista previa. Las flechas ← → pasan a la solicitud anterior o siguiente.
3. Si hay alertas, revíselas y pulse **Marcar como revisadas** cuando corresponda.
4. **Aprobar:** registre primero el descuento en SIGU. Elija **Aprobar**, marque la confirmación y pulse **Guardar y notificar**.
5. **Observar:** elija **Observar** y un motivo. Se propone un texto para el estudiante (qué falta y qué debe enviar); edítelo si hace falta y pulse **Guardar y notificar**. El estudiante recibe el correo con un enlace seguro de corrección; también puede volver a enviar el formulario inicial con su correo institucional.
6. Al guardar se abre la siguiente solicitud de la lista.
7. Cuando el estudiante corrige, la solicitud pasa a **Corrección recibida** y vuelve a **Por revisar**.

Si un estudiante envía el formulario después de la aplicación en SIGU, la solicitud conserva **Aplicada en SIGU** y muestra una alerta.

## Exportar

**Exportar Excel** descarga la lista con los filtros actuales, con hojas de solicitudes y documentos. Los enlaces abren la solicitud en el panel.

## Correos

Los correos se envían automáticamente unas tres veces por minuto, según la cuota diaria de la cuenta de envío. **Aceptado por Google** significa que el envío fue aceptado, no que el estudiante lo abrió. En la pestaña **Correos**, un envío **Requiere comprobación** se marca como enviado o se reintenta tras verificarlo con el estudiante; reintentar un correo ya aceptado puede duplicarlo.

En una solicitud observada, **Enviar nuevo enlace de corrección** invalida el anterior y envía uno nuevo.

## Ajustes del administrador

El panel no tiene pantallas de configuración ni de auditoría. El propietario los gestiona en Apps Script (Configuración del proyecto → Propiedades del script):

- `EMAIL_NOTIFICATION_ENABLED` (`true`/`false`): envío de correos.
- `RECEIPT_EMAIL_ENABLED` (`true`/`false`): acuse de recepción por cada envío del formulario (consume cuota).
- `INSTITUTIONAL_EMAIL_DOMAINS`: dominios permitidos separados por comas (por ejemplo `uma.edu.pe`).

La auditoría y los errores siguen registrándose en las hojas **Auditoria** y **Errores** de Google Sheets.

Use **Cerrar sesión** al terminar. El usuario es compartido: todas las acciones se registran bajo ese nombre.
