# Entrega de notificaciones a Gmail

El remitente continúa siendo **contactotesoreriauma@gmail.com**, autorizado mediante MailApp y el disparador del propietario. El destinatario siempre procede del formulario de la solicitud. No hay destinatarios de prueba, copias ocultas, campañas ni envío de mensajes adicionales para crear reputación.

## Cambios en la aplicación

- Se conserva el asunto y el texto de aprobación exigido. Se agrega un pie visible con código de solicitud, fecha de presentación, motivo de la notificación y dirección de contacto. No incluye número de identidad ni enlaces privados a documentos.
- Texto plano y HTML muestran la misma información. El HTML es sencillo, sin imágenes remotas, rastreadores ni contenido oculto; los enlaces HTTPS muestran su destino completo. Los datos introducidos por estudiantes y revisores se escapan.
- Cada ejecución del disparador de correo procesa como máximo tres mensajes pendientes, en lugar de quince. El disparador habitual se ejecuta cada minuto; las cuotas de Google pueden limitarlo adicionalmente. Esta medida preventiva no demuestra que el volumen haya causado el caso reportado.
- El cuerpo efectivo se conserva en Correos antes del intento. Los mensajes pendientes anteriores reciben el nuevo pie una sola vez. Los mensajes SENT no se modifican ni reenvían; los resultados UNCERTAIN siguen requiriendo comprobación manual.

No se añadieron opciones al panel ni se cambió el flujo de revisión. SENT significa que MailApp aceptó el envío; no acredita recepción, lectura ni ubicación en Recibidos.

## Evidencia y límites de la comprobación del 20 de noviembre de 2026

La cuenta Gmail conectada coincide con el propietario. Se encontró una notificación reciente de aprobación dirigida a Gmail y su copia en Enviados contiene una firma DKIM con dominio `gmail.com`. En la búsqueda acotada de avisos de devolución no se encontraron coincidencias. No se copiaron nombres, destinatarios, enlaces personales ni cabeceras completas a este repositorio.

El usuario informó el aviso: “this message is similar to messages that were identified as spam in the past”. Indica una clasificación por semejanza con mensajes previamente identificados como spam; no es, por sí solo, un resultado de fallo SPF/DKIM/DMARC. No demuestra que esta cuenta haya enviado spam previamente.

La firma presente en Enviados no acredita el resultado de validación en el buzón destinatario. No se obtuvieron los Authentication-Results del mensaje recibido. Por eso no están demostrados todos los factores de clasificación, ni puede afirmarse que estos cambios garanticen Recibidos. No se enviaron correos de diagnóstico ni aprobaciones adicionales a estudiantes durante esta reparación.

El dominio emisor es `gmail.com`: sus registros DNS y claves los administra Google. Agregar SPF/DKIM/DMARC en `uma.edu.pe` no autentica esta dirección Gmail. No se debe suplantar una dirección institucional cambiando únicamente From o Reply-To. Si UMA decide usar un remitente institucional, su administrador debe autorizar esa cuenta y configurar la autenticación del dominio; esa migración requiere cambiar expresamente el remitente solicitado y no forma parte de esta actualización.

## Qué hacer con un mensaje legítimo ya clasificado como Spam

1. El estudiante verifica que se trata del resultado de su propia solicitud y que el remitente es **contactotesoreriauma@gmail.com**.
2. En su Gmail abre **Más → Spam**, selecciona ese mensaje y pulsa **No es spam**. Puede agregar esa dirección exacta a Contactos. No se requiere acceso de Tesorería al buzón del estudiante.
3. Si vuelve a ocurrir, obtiene el texto del aviso superior de Spam. En **Más → Mostrar original**, copia solo los resultados SPF, DKIM y DMARC para diagnóstico. No comparte nombres, documentos ni el enlace de subsanación.
4. Tesorería revisa Correos, Auditoría y Enviados, sin restablecer SENT a PENDING ni repetir una aprobación para probar recepción. Si MailApp devuelve un error ambiguo se conserva UNCERTAIN hasta comprobar el resultado.

Para validar el cambio en un buzón controlado debe existir una solicitud real y una decisión autorizada; una observación legítima permite comprobar el flujo sin inventar un registro en SIGU. Comprobar Enviados o superar pruebas locales no sustituye la inspección en el Gmail destinatario.

Fuentes oficiales: [directrices de remitentes de Gmail](https://support.google.com/mail/answer/81126?hl=en), [mensajes autenticados](https://support.google.com/mail/answer/180707?hl=en), [quitar mensajes legítimos de Spam](https://support.google.com/mail/answer/1366858?hl=en), [opciones admitidas por MailApp](https://developers.google.com/apps-script/reference/mail/mail-app).
