# Manual de Tesorería

## Cómo se organizan las solicitudes

- **Una solicitud por correo institucional y periodo.** Si un estudiante envía el formulario varias veces con el mismo correo institucional, cada envío se añade a la misma solicitud como una nueva **revisión** (con sus documentos). La tabla muestra “N envíos”.
- **Ningún envío se descarta.** Si un envío tiene datos inválidos (por ejemplo, un DNI que no tiene 8 dígitos o un convenio “Otro” sin especificar), la solicitud aparece igual con **alertas** para que Tesorería decida.
- **Pendientes** incluye todo lo que aún no se aplica en SIGU, también las **observadas**. Una solicitud observada sigue pendiente hasta que el estudiante corrige y Tesorería la aprueba.

## Revisión diaria

1. Abra la URL de Render e ingrese con el usuario y contraseña entregados. No hay acceso con Google.
2. Entre a **Por revisar** (o **Pendientes** y el filtro “Por revisar”). Busque por nombre, DNI, correo o código.
3. Haga clic en la fila. La ficha de la revisión actual se abre automáticamente en la vista previa; los documentos están agrupados por revisión. Las flechas ← → (o los botones del encabezado) pasan a la solicitud anterior o siguiente.
4. Si hay **alertas**, revíselas. Puede pulsar **Marcar como revisadas** (queda en la auditoría) o resolverlas con su decisión.
5. **Aprobar:** registre primero el descuento en SIGU. Elija **Aprobar**, marque la confirmación, añada una referencia opcional y pulse **Aprobar y notificar**. Confirme el destinatario.
6. **Observar:** elija **Observar** y un motivo. El sistema propone el texto de la observación y de cómo corregir; edítelo si hace falta y pulse **Enviar observación**. El estudiante recibe un correo con un enlace seguro de corrección; también puede volver a enviar el formulario inicial con su correo institucional.
7. Con **Abrir la siguiente solicitud después de guardar** activado (predeterminado), al confirmar se abre la siguiente de la lista.
8. Cuando el estudiante corrige, la solicitud pasa a **Corrección recibida** y vuelve a **Por revisar**.

**Marcar etapa sin notificar** (En revisión / Validada · pendiente SIGU) es opcional y no envía correos.

Si un estudiante envía el formulario después de la aplicación en SIGU, la solicitud conserva el estado **Aplicada en SIGU** y muestra una alerta con el nuevo envío para que lo revise.

## Exportar

**Exportar Excel** descarga los resultados de la vista y filtros actuales, con hojas de solicitudes y documentos (incluye número de envíos, último envío y alertas). Los enlaces del Excel abren la solicitud o el documento en el panel con el mismo usuario y contraseña. El archivo no se guarda en Drive.

## Correos

Los correos quedan en cola y el disparador del propietario los envía aproximadamente cada minuto (hasta tres por minuto), sujeto a la cuota diaria de la cuenta de envío. **Aceptado por Google** significa que el envío fue aceptado, no que el estudiante lo abrió.

En **Configuración** puede activar el **acuse de recepción**: un correo por cada envío del formulario que además indica al estudiante los problemas detectados. Aumenta el número de correos diarios; actívelo sólo si la cuota lo permite.

Un envío **Requiere comprobación** se resuelve en **Correos**: verifique con el destinatario si llegó y confirme o reintente dejando una explicación. Reintentar un correo ya aceptado puede duplicarlo.

**Enviar un nuevo enlace de corrección** (en una solicitud observada) invalida el enlace anterior y envía uno nuevo.

## Buenas prácticas

Si la solicitud cambió mientras la revisaba, el panel le pedirá actualizar antes de decidir. Los errores al copiar documentos bloquean la decisión hasta que el sistema los reintenta con éxito. No cambie estados ni destinatarios directamente en Sheets.

Use **Cerrar sesión** al terminar. El usuario es compartido: todas las acciones se registran bajo ese nombre. Vea [QUICK_START.md](QUICK_START.md) para enlaces.
