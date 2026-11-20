# Seguridad y permisos

- No se incluyen contraseñas, tokens de Google/Render, archivos de autorización ni secretos en Git o `web-dist/`.
- El PDF vacío es público para descarga; todos los documentos completados permanecen restringidos en Drive.
- El origen estático es público, pero cada acceso a registros requiere una cuenta de Tesorería autenticada y autorizada en Google.
- El servidor determina la identidad; no acepta emails de revisor suministrados por el cliente.
- La cola solo envía a un email guardado desde el formulario del estudiante. La cuenta efectiva de envío debe ser darshanbachhavapp@gmail.com.
- Los enlaces de subsanación son personales, caducan y dejan de admitir nuevos envíos al cambiar de estado. No comparta enlaces ni publique la hoja Correos, que contiene el cuerpo del mensaje y su token.
- El contenido del estudiante se escapa al mostrar HTML y se neutralizan prefijos de fórmulas en Sheets/Excel. Los nombres originales de archivos no se usan para rutas.
- Se comprueban tipos MIME, tamaño, número de archivos y propiedad de las cargas de Forms. MIME no equivale a un análisis antivirus; el personal debe abrir archivos en herramientas de Google de confianza.
- El puente externo permite únicamente orígenes exactos, una lista fija de operaciones y una sesión de mensajes con nonce y ventana emisora fijada. La aplicación completa de Google conserva la protección de encuadre predeterminada; solo el puente admite el iframe.

## Modelo de confianza de revisores

La versión inicial puede operar con el propietario como único revisor. Los revisores adicionales necesitan permisos de editor sobre Sheets/Forms y permisos adecuados sobre Drive porque el script ejecuta con su identidad. Esa concesión les da acceso directo a dichos recursos, además del panel. La protección de hojas es de advertencia para mantener las escrituras de Apps Script posibles con esa misma identidad. Por ello, añada solo personal autorizado y de confianza. Los controles de rol del panel no pueden impedir que un editor modifique directamente una hoja que Google le permite editar.

No dé acceso de editor a estudiantes. No comparta el proyecto de Apps Script con revisores que no deban acceder a sus propiedades. Mantenga `CORRECTION_SECRET` en Script Properties. Rotarlo invalida todos los enlaces de subsanación existentes y exige renovarlos.

## Preparación institucional

UMA debe aprobar el aviso de privacidad, el plazo de conservación, los dominios válidos, los requisitos de cada convenio y la lista de personal autorizado. El código no inventa porcentajes ni criterios de elegibilidad. No se realiza una decisión automatizada sobre la situación socioeconómica; la revisión corresponde a Tesorería.

Las direcciones escritas en Forms se validan por formato y, si se configura, por dominio. Esto no acredita por sí solo la titularidad de ese buzón. Forms exige una sesión Google para las cargas, pero esa sesión puede ser distinta del correo institucional escrito. El token de subsanación funciona como prueba de posesión del enlace enviado al buzón registrado, junto con los datos solicitados. Para una verificación institucional estricta adicional, utilice políticas de identidad de Workspace y revise el flujo antes de producción.

Revise periódicamente los permisos de carpetas, formularios y exportaciones, y la lista de revisores. Las exportaciones contienen información personal y deben conservarse con acceso restringido. No se programan borrados automáticos de expedientes ni se afirma una certificación legal de cumplimiento.
