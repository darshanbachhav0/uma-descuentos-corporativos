# Arquitectura

```mermaid
flowchart LR
  S[Estudiante] --> W[Sitio estático en Render]
  W --> F[Google Forms]
  F --> T[Disparador de darshanbachhavapp@gmail.com]
  T --> D[Drive privado con revisiones]
  T --> B[Google Sheets]
  R[Tesorería] --> W
  W <-->|Canal restringido por origen y nonce| G[Apps Script HTML Service]
  G --> B
  G --> Q[Cola de correos]
  Q --> O[Disparador del propietario]
  O --> M[MailApp al correo del formulario]
  G --> X[Exportación XLSX por Google Drive]
```

Render publica exclusivamente `web-dist/`: HTML, CSS, JavaScript, configuración pública, logotipo y el PDF vacío. No almacena solicitudes, tokens de Google, claves de subsanación ni copias de documentos de estudiantes. `dist/` es un artefacto separado destinado a Apps Script y nunca es la carpeta de publicación de Render.

El backend de Apps Script se despliega ejecutando **como usuario que accede**. La identidad del revisor proviene de `Session.getActiveUser()`, nunca de un email enviado por JavaScript. La lista de revisores se comprueba en cada función de datos o revisión. Los emails se envían mediante un disparador creado por el propietario; el proceso comprueba además `Session.getEffectiveUser()` antes de llamar a MailApp.

## Canal del sitio estático

`google.script.run` solo existe en páginas HTML Service. El sitio externo carga un pequeño puente de Apps Script en un iframe. El puente se habilita únicamente para los orígenes HTTPS exactos de `FRONTEND_ORIGINS`. El sitio crea un nonce aleatorio de 256 bits, espera una respuesta de un origen Google válido, fija la ventana emisora y cruza mensajes únicamente con esa ventana, origen y nonce. El puente acepta mensajes exclusivamente de la ventana superior y del origen configurado. Solo doce operaciones de negocio están permitidas; no hay evaluación de código ni despacho a nombres arbitrarios.

La cuenta de Google debe estar autenticada y haber autorizado la aplicación. Algunos navegadores bloquean sesiones dentro de iframes. El botón de conexión abre el panel de Google en una pestaña propia para autorizarlo; si el bloqueo de cookies persiste, ese mismo panel proporciona toda la funcionalidad sin el puente. No se pide desactivar protecciones del navegador.

## Persistencia y recuperación

| Tabla | Finalidad |
| --- | --- |
| Solicitudes | Un expediente por tipo/documento/periodo, revisión y versión del registro |
| Documentos | Fuente, copia privada, tipo y revisión de cada archivo |
| Eventos | Formulario/respuesta, expediente asociado y resultado de procesamiento |
| Decisiones | Registro persistente que permite recuperar escrituras parciales |
| Observaciones | Historial de motivos e instrucciones de subsanación |
| Historial_Estados | Estados, autor y fecha |
| Correos | Mensaje preparado, destinatario y resultado de cada intento |
| Auditoria / Errores | Acciones administrativas y errores accionables |
| Configuracion / Dashboard | Metadatos de configuración y resumen operativo |

Google Forms conserva además sus hojas nativas de respuestas. No se eliminan respuestas ni archivos originales al generar copias para el expediente.

Los IDs usan una secuencia persistida bajo `LockService`. El evento se identifica con formulario + respuesta; los documentos con expediente + revisión + tipo + archivo de origen. Los nombres deterministas permiten recuperar la interrupción entre copiar un archivo y registrar sus metadatos. Las decisiones usan un UUID de petición y una versión esperada para impedir decisiones sobre datos desactualizados.

## Estados

`RECIBIDA → EN_REVISION → VALIDADA_PENDIENTE_SIGU → APLICADA_SIGU` representa un flujo posible. Los pasos de revisión intermedios son opcionales. La aprobación siempre exige confirmar el registro real en SIGU.

`OBSERVADA → CORRECCION_RECIBIDA` conserva el expediente y los documentos anteriores. El enlace de subsanación contiene un token HMAC ligado al expediente, a la revisión de observación y al vencimiento. El estudiante vuelve a ingresar correo institucional y documento. No se depende de que editar una respuesta anterior vuelva a ejecutar disparadores.

Los correos tienen estado independiente: `PENDING`, `SENDING`, `SENT`, `UNCERTAIN` o `CANCELLED`. `SENT` significa que MailApp aceptó la llamada; no es un acuse del buzón. No se puede garantizar envío exactamente una vez entre servicios sin una operación transaccional del proveedor. El sistema evita reintentar automáticamente los resultados inciertos y exige resolución del propietario.

El sistema está orientado a volúmenes administrativos moderados. Lee tablas para filtros y reconciliación; no sustituye un motor de base de datos para cargas masivas. Revise cuotas y tiempos de ejecución antes de ampliar el volumen.
