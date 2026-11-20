# Estado de despliegue observado

Registro actualizado: 20 de noviembre de 2026 (America/Lima).

## Acceso

- [Panel de Tesorería](https://uma-descuentos-corporativos.onrender.com/)
- La ruta `/estudiantes` redirige al formulario inicial; no hay un portal estudiantil adicional.
- [Formulario inicial publicado](https://docs.google.com/forms/d/e/1FAIpQLSctyzIVBLHoGM49EmwZ_DWoCzena7yeQijPKxjr5uCj75d7mw/viewform)
- [Registro de Google Sheets](https://docs.google.com/spreadsheets/d/1MUgKljFRYaYOlv9gHdnnOlZ-kgEIDYAuHDm9O6hpcnQ/edit)
- [Carpeta privada del sistema](https://drive.google.com/drive/folders/1DrFiMDuw2u1NZI0UeLsd5B7qmbEsQ8N6)
- [Configuración del propietario](https://script.google.com/macros/s/AKfycbzcfr3022ozNaD3MuMWis-DFek-jBHomxis8IKwQ94bFs_CGzFnr1pxLlR5C5ac860CBA/exec?mode=setup)

## Configuración completada y comprobada

- Cuenta propietaria y remitente autorizado: **darshanbachhavapp@gmail.com**. El destinatario se obtiene de cada solicitud; no hay destinatario estudiantil fijo.
- Render: **Bachhav Darshan's Workspace**, servicio `srv-dbvpg7l9fdbs73bju90g`, repositorio privado `darshanbachhav0/uma-descuentos-corporativos`. El despliegue inicial se observó en estado `live`; las actualizaciones de main se despliegan automáticamente.
- Apps Script: proyecto `1TiZZM47BuA-iPRfS09rcD22BoFUNIUqTeu3lwS9VhbR1OT9rnTWJBVIa`, versión **8**, servicio ejecutando como propietario con acceso anónimo y autenticación propia por usuario/contraseña. El origen exacto de Render está autorizado.
- Inicialización real de Google Sheets, carpetas privadas y ambos formularios completada. Copia privada de la ficha original creada desde el PDF publicado, cuyo hash coincide con el documento de referencia.
- Cuatro preguntas nativas de carga creadas en la interfaz de Google Forms: ficha firmada y documentos sustentatorios en cada formulario. Son obligatorias, admiten PDF/imagen y hasta cinco archivos de 10 MB por pregunta; el backend restringe a PDF/JPG/PNG y diez archivos en total.
- Formulario inicial y formulario de subsanación publicados y aceptando respuestas. El formulario inicial conserva los datos personales, 14 escuelas, nueve convenios y la especificación obligatoria de Otro. La ficha se descarga y completa manualmente.
- Cuatro disparadores instalables del propietario comprobados: `onApplicationSubmit`, `onCorrectionSubmit`, `reconcileSubmissions` (10 minutos) y `processEmailQueue` (1 minuto).
- Diagnóstico autenticado: `ready: true`, sin incidencias de configuración. Notificaciones activadas. El acceso de gestión está configurado con el usuario compartido solicitado; cada operación exige una sesión propia. Los recursos Google directos siguen privados.
- Panel de Render conectado al backend real de Google y autenticado como propietario; muestra cero solicitudes, sin datos ficticios.
- Exportación `.xlsx` real ejecutada para el registro vacío. Auditoría comprobada: `EXCEL_EXPORTED`, cero solicitudes; sin errores registrados. Los enlaces con expedientes poblados están cubiertos por las pruebas locales y requieren comprobación con datos reales.
- Cabeceras de seguridad y rutas de `render.yaml` aplicadas por API. La verificación HTTP comprueba páginas, assets, enlaces públicos, hash del PDF y respuesta 404 de archivos privados.
- **42 pruebas locales aprobadas**, además de compilación y comprobación de sintaxis/contratos. Los despliegues de Render ejecutan estas mismas comprobaciones y pruebas.
- Interfaz renovada con el logotipo proporcionado por el usuario, rosa UMA, navegación oscura y pantallas adaptables de Tesorería, revisión y acceso. Los estudiantes reciben únicamente el enlace de Forms. Se comprobaron los controles y las vistas de escritorio y móvil; detalles en [UI_THEME.md](UI_THEME.md).

Los identificadores de recursos públicos del despliegue están en `deploy/resources.json`; la configuración pública compilada está en `deploy/public-config.json`. Ninguno contiene credenciales.

## Validación pendiente con una solicitud real

No se han presentado expedientes ficticios ni enviado correos de aprobación durante la configuración. Falta comprobar un envío real autorizado de estudiante de principio a fin: carga, carpeta privada, revisión, subsanación, enlaces del Excel con documentos y recepción efectiva del correo. La aprobación debe realizarse únicamente después de que Tesorería confirme el registro verdadero en SIGU.

Las pruebas locales cubren idempotencia, recuperación de fallos, permisos, correos personalizados y estados inciertos mediante servicios simulados. No demuestran entrega al buzón ni sustituyen esa primera validación real. MailApp registra aceptación por Google, no un acuse de entrega del destinatario.
