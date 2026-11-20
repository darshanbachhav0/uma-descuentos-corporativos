# Manual de Tesorería

## Cómo se organizan las solicitudes

El panel tiene cuatro pestañas:

- **Pendientes:** todo lo que aún no termina: solicitudes nuevas, reenvíos de estudiantes y observadas que esperan la corrección del estudiante. Primero aparecen las que necesitan a Tesorería.
- **Aplicadas en SIGU:** procesos terminados.
- **Todas:** Pendientes + Aplicadas en SIGU.
- **Correos:** los correos enviados a los estudiantes.

- **Una solicitud por correo institucional y periodo.** Si un estudiante envía el formulario varias veces con el mismo correo institucional, cada envío se añade a la misma solicitud como una nueva **revisión**. La columna “Envíos” muestra cuántos hay.
- **Ningún envío se descarta.** Si un envío tiene datos inválidos (por ejemplo, un DNI que no tiene 8 dígitos), la solicitud aparece igual con **alertas**.
- **Pendientes** incluye todo lo que aún no se aplica en SIGU, también las **observadas**. Una solicitud observada sigue pendiente hasta que el estudiante corrige y Tesorería la aprueba.

## Revisión

1. Ingrese con el usuario y contraseña entregados.
2. Abra la pestaña **Pendientes** (aparecen primero las que esperan a Tesorería; use el filtro rápido **Por revisar** si solo quiere esas) y haga clic en una fila. La ficha de la revisión actual se muestra en la vista previa. Las flechas ← → pasan a la solicitud anterior o siguiente.
3. Si hay alertas, revíselas y pulse **Marcar como revisadas** cuando corresponda.
4. **Aprobar:** registre primero el descuento en SIGU. Elija **Aprobar**, marque la confirmación y pulse **Guardar y notificar**.
5. **Observar:** elija **Observar** y un motivo. Se propone un texto para el estudiante (qué falta y qué debe enviar); edítelo si hace falta y pulse **Guardar y notificar**. El estudiante recibe un correo con la observación y el enlace del mismo formulario de solicitud. Al volver a enviarlo con el mismo correo institucional, sus nuevos documentos se agregan a su solicitud como una nueva revisión (no necesita ningún código).
6. Al guardar se abre la siguiente solicitud de la lista.
7. Cuando el estudiante corrige, la solicitud pasa a **Corrección recibida** y vuelve al inicio de **Pendientes** para revisarla de nuevo.

Si un estudiante envía el formulario después de la aplicación en SIGU, la solicitud conserva **Aplicada en SIGU** y muestra una alerta.

## Documentos, filtros y resultado del correo

- **Ver** abre el documento a pantalla completa. Las flechas ← → (o los botones) pasan al documento anterior o siguiente; **Descargar** guarda el archivo y **Esc** cierra el visor.
- Cada pestaña tiene su propia búsqueda y filtros (estado, convenio, escuela, fechas), que se conservan al cambiar de pestaña. **Pendientes** tiene filtros rápidos: Por revisar, Esperando al estudiante y Con alertas. **Correos** se filtra por código o destinatario, tipo, estado y fechas.
- Al pulsar **Confirmar y notificar** el correo se envía en ese momento y aparece un mensaje con el resultado: **Correo enviado**, **El correo aún no se envió** (con el motivo: envío pausado, cuota diaria agotada, etc.; queda en cola y se envía solo) o **No se pudo confirmar el envío** (revíselo en Correos).
- En **Correos**, un correo **En cola** tiene el botón **Enviar ahora**.

## Documentos en Google Drive

Cada solicitud tiene una carpeta `Código · correo institucional` dentro de la carpeta del periodo. Cada envío crea una subcarpeta `Revisión N · AAAA-MM-DD HH.MM` (hora de Lima) con archivos como `Ficha socioeconómica 1 · AAAA-MM-DD HH.MM.pdf`. En el panel, cada revisión muestra la fecha y hora de envío y la más reciente aparece primero.

## Exportar

**Exportar Excel** descarga la lista con los filtros actuales, con hojas de solicitudes y documentos. Los enlaces abren la solicitud en el panel.

## Correos

Los correos se envían automáticamente unas tres veces por minuto, según la cuota diaria de la cuenta de envío. **Aceptado por Google** significa que el envío fue aceptado, no que el estudiante lo abrió. En la pestaña **Correos**, un envío **Requiere comprobación** se marca como enviado o se reintenta tras verificarlo con el estudiante; reintentar un correo ya aceptado puede duplicarlo.

En una solicitud observada, **Reenviar correo de observación** vuelve a enviar la observación con el enlace del formulario.

## Ajustes del administrador

El panel no tiene pantallas de configuración ni de auditoría. El propietario los gestiona en Apps Script (Configuración del proyecto → Propiedades del script):

- `EMAIL_NOTIFICATION_ENABLED` (`true`/`false`): envío de correos.
- `RECEIPT_EMAIL_ENABLED` (`true`/`false`): acuse de recepción por cada envío del formulario (consume cuota).
- `INSTITUTIONAL_EMAIL_DOMAINS`: dominios permitidos separados por comas (por ejemplo `uma.edu.pe`).

La auditoría y los errores siguen registrándose en las hojas **Auditoria** y **Errores** de Google Sheets.

Use **Cerrar sesión** al terminar. El usuario es compartido: todas las acciones se registran bajo ese nombre.

## Reiniciar los datos de prueba (solo el propietario)

Borra todas las solicitudes para empezar de cero. Se ejecuta desde el editor de Apps Script con la cuenta propietaria; no existe en el panel.

1. Abra el proyecto de Apps Script, elija la función `previewReset` y pulse **Ejecutar**. En el registro verá cuántas filas, respuestas de formularios, archivos y carpetas se eliminarían. No cambia nada.
2. Para borrar, cree temporalmente una función `function borrar(){ resetAllData('BORRAR TODO'); }`, ejecútela y luego elimínela.

Se eliminan: todas las filas de Solicitudes, Documentos, Eventos, Decisiones, Observaciones, Historial_Estados, Correos, Auditoria y Errores; todas las respuestas de ambos formularios y las filas de sus hojas “Form Responses”; y se envían a la papelera de Drive las carpetas de solicitudes, los documentos copiados, los archivos subidos por estudiantes y los Excel exportados. La numeración vuelve a empezar en UMA-DC-2027-000001.

Se conservan: formularios y preguntas, estructura de la hoja, configuración, usuario y contraseña, la ficha original en PDF y los disparadores.

Las filas y las respuestas de formularios no se pueden recuperar. Los archivos de Drive se pueden restaurar desde la papelera durante 30 días.

## Ordenar la hoja de cálculo (una sola vez, solo el propietario)

Deja la hoja “UMA — Control de Descuentos Corporativos” solo con **Form Responses 1** (las respuestas del formulario de solicitud).

1. Pegue el `dist/Code.gs` más reciente en Apps Script y guarde.
2. Elija la función `organizeSpreadsheet` y pulse **Ejecutar** (cuando nadie esté usando el panel).
3. El registro muestra qué se movió y qué se borró, y el enlace de la nueva hoja del sistema.

Las tablas del sistema (Solicitudes, Documentos, Eventos, Correos, etc.) se mueven a una hoja privada nueva, **“UMA — Datos del sistema (no editar)”**, dentro de la carpeta del sistema en Drive. El panel la usa automáticamente; no la edite a mano. Se elimina la pestaña de respuestas del antiguo formulario de corrección y las pestañas vacías. Las pestañas con datos que no pertenecen al sistema se conservan. Se puede ejecutar de nuevo sin problema.

