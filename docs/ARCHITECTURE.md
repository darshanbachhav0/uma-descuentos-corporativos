# Arquitectura

```mermaid
flowchart LR
  S[Estudiante] --> F[Google Forms]
  R[Tesorería] --> W[Render: usuario y contraseña]
  F --> T[Disparador de darshanbachhavapp@gmail.com]
  T --> D[Drive privado con revisiones]
  T --> B[Google Sheets]
  W <-->|HTTPS sin cookies Google| A[API Node en Render]
  A <-->|JSON autenticado por sesión| G[Apps Script doPost]
  G --> B
  G --> Q[Cola de correos]
  Q --> O[Disparador del propietario]
  O --> M[MailApp al correo del formulario]
  G --> X[Exportación XLSX por Google Drive]
```

Render publica exclusivamente `web-dist/`: HTML, CSS, JavaScript, configuración pública, logotipo y el PDF vacío. No almacena solicitudes, tokens de Google, claves de subsanación ni copias de documentos de estudiantes. `dist/` es un artefacto separado destinado a Apps Script y nunca es la carpeta de publicación de Render.

El backend de Apps Script ejecuta **como propietario** y permite acceso anónimo al servicio web. El panel exige su propia autenticación: el servidor verifica la prueba PBKDF2, crea una sesión opaca y comprueba esa sesión en cada llamada. La identidad de gestión procede del registro de sesión del servidor, no de un nombre o email suministrado con la decisión. Los emails se envían mediante un disparador creado por el propietario; el proceso comprueba además `Session.getEffectiveUser()` antes de llamar a MailApp.

## Canal del sitio estático

El navegador usa fetch HTTPS con credentials: omit hacia una API Node de Render. No carga iframes de Google ni depende de la cuenta o cookies Google del visitante. La API comprueba el origen exacto, método permitido, tamaño y sesión, y envía JSON a doPost de Apps Script mediante una conexión de servidor sin cookies. Apps Script vuelve a validar la sesión antes de leer o modificar datos.

El token opaco se conserva en sessionStorage y se envía en Authorization, nunca en URLs. El servidor de enlace no guarda registros, archivos ni credenciales Google; las sesiones y datos operativos siguen en Google. Respuestas privadas usan no-store. No se reintentan automáticamente decisiones o envíos ante un fallo de red.

La entrada tiene un plazo total de 90 segundos y siempre vuelve a habilitar el botón tras un fallo. El inicio del sitio despierta el servicio API gratuito; tras inactividad Render puede tardar en iniciarlo y la interfaz muestra ese estado en vez de permanecer indefinidamente en Validando acceso.

Las vistas previas, descargas de documentos y exportaciones XLSX se entregan por la misma sesión autenticada. Los archivos se conservan privados en Drive. Los enlaces del Excel abren el expediente o documento en el panel. Los estudiantes reciben directamente Google Forms; `/estudiantes` redirige a ese formulario.

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

Los correos tienen estado independiente: `PENDING`, `SENDING`, `SENT`, `UNCERTAIN` o `CANCELLED`. `SENT` significa que MailApp aceptó la llamada; no es un acuse del buzón. No se puede garantizar envío exactamente una vez entre servicios sin una operación transaccional del proveedor. El sistema evita reintentar automáticamente los resultados inciertos y exige una resolución documentada desde gestión.

El sistema está orientado a volúmenes administrativos moderados. Lee tablas para filtros y reconciliación; no sustituye un motor de base de datos para cargas masivas. Revise cuotas y tiempos de ejecución antes de ampliar el volumen.
