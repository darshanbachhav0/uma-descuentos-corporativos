# UMA · Sistema de descuentos corporativos

Sistema implementado para Google Forms → Apps Script → Google Sheets/Drive, con sitio estático en **Render**, panel de Tesorería en español y notificaciones enviadas exclusivamente bajo la autorización de **darshanbachhavapp@gmail.com**.

Despliegue activo: [Tesorería](https://uma-descuentos-corporativos.onrender.com/) · [Portal de estudiantes](https://uma-descuentos-corporativos.onrender.com/estudiantes) · [Google Sheets](https://docs.google.com/spreadsheets/d/1MUgKljFRYaYOlv9gHdnnOlZ-kgEIDYAuHDm9O6hpcnQ/edit). Tesorería y los documentos requieren autorización de Google; el sitio público no contiene expedientes. Consulte el [estado verificado](docs/DEPLOYMENT_STATUS.md).

## Empezar

```powershell
npm run build
npm run check
npm test
npm run preview
# Vista del sitio que se publica en Render (sin datos ficticios):
npm run preview:static
```

No se necesitan paquetes npm para compilar o probar. La vista local en `http://127.0.0.1:4173` contiene datos **ficticios**, no envía correos y no sustituye el despliegue de Google.

El archivo **`dist/Code.gs` contiene todo el backend, el panel y el logotipo**, listo para pegar en un único archivo del editor de Apps Script. No es necesario crear archivos HTML manualmente. La alternativa con clasp usa `dist/` y el manifiesto incluido.

1. Lea [las instrucciones de instalación](docs/INSTALLATION.md).
2. Ejecute `initializeProject` desde la cuenta propietaria y autorice Google.
3. Configure el PDF original y las cuatro preguntas nativas de carga (dos por formulario).
4. Ejecute `finalizeSetup`, revise permisos, despliegue el panel **como usuario que accede** y complete las pruebas reales.
5. Abra los formularios y active los correos cuando la configuración esté comprobada.

## Funcionalidad implementada

- Registro por ID estable de pregunta; DNI conserva ceros iniciales; correo institucional obligatorio y personal opcional.
- Convenios Familiar, PNP, San Hilarión, FED-CUT, Liderman, Emphost, El Tumi, Boticas Perú y Otro con sección obligatoria.
- PDF original descargable, llenado y firma manuales; archivos PDF/JPG/PNG.
- Expediente único por documento/tipo/periodo, archivos privados con revisiones, respuestas originales conservadas.
- Panel adaptable, búsqueda, filtros de escuela/convenio/fecha/estado, paginación, estadísticas, vista previa y seguimiento.
- Aprobación únicamente tras confirmación manual de SIGU. No existe una integración inventada con SIGU.
- Observaciones y subsanación con token HMAC, vencimiento, datos de identificación y el mismo expediente.
- Decisiones con control de versión, registro recuperable e identificador idempotente.
- Cola de correos del propietario; destinatario tomado del formulario. Pausa y cuotas; registro de aceptación, fallos y resultados inciertos.
- Exportación real `.xlsx` mediante Google Drive, con enlaces a carpetas y archivos, filtros y fecha de exportación.
- Auditoría, errores, disparadores instalables y reconciliación de eventos fallidos.

## Archivos

| Ubicación | Contenido |
| --- | --- |
| `src/*.gs` | Configuración, validación, persistencia, formularios, archivos, revisión, correos, API y Excel |
| `src/ui/` | Panel HTML, estilos y cliente conectado a `google.script.run` |
| `src/assets/uma-logo.jpg` | Logotipo extraído sin modificar del PDF de referencia |
| `dist/` | Proyecto de Apps Script compilado y manifiesto |
| `web/`, `web-dist/` | Fuentes y salida separada del sitio estático de Render |
| `render.yaml`, `deploy/` | Configuración reproducible de Render y URLs públicas de conexión |
| `preview/` | Demostración local aislada; nunca se publica en Apps Script |
| `tests/` | Pruebas del flujo completo con servicios de Google simulados |
| `reference/` | PDF original y capturas PDF de los formularios suministrados |
| `docs/` | Instalación, arquitectura, seguridad, manuales y pruebas |

## Estado y límites

Las pruebas locales verifican lógica y recuperación con servicios simulados. La autorización OAuth, cargas reales, permisos de Drive, ejecución de disparadores, exportación por Google y entrega al buzón requieren comprobación en la cuenta autorizada. Consulte [TESTING.md](docs/TESTING.md) y [DEPLOYMENT_STATUS.md](docs/DEPLOYMENT_STATUS.md) para el estado observado.

Google no ofrece creación de preguntas de carga mediante Forms API; se configuran en la interfaz. Google Forms exige iniciar sesión para subir archivos. Los disparadores instalables ejecutan con la cuenta que los crea, por eso el propietario instala el de correo. MailApp no tiene garantía de envío exactamente una vez ni acuse de entrega: ante un resultado incierto el sistema detiene el reintento automático y exige comprobación del propietario.

Para Render y la conexión entre ambos despliegues, consulte [RENDER_DEPLOYMENT.md](docs/RENDER_DEPLOYMENT.md). Fuentes oficiales: [Formularios y cargas](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms#FileUploadQuestion), [disparadores](https://developers.google.com/apps-script/guides/triggers/installable), [identidad y despliegue web](https://developers.google.com/apps-script/guides/web), [cuotas](https://developers.google.com/apps-script/guides/services/quotas), [exportación Drive](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export), [sitios estáticos Render](https://render.com/docs/static-sites).
