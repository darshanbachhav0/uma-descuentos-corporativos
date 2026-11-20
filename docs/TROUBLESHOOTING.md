# Solución de problemas

| Síntoma | Comprobación y acción |
| --- | --- |
| Sitio Render carga, pero Google está pendiente | Configure `appsScriptUrl` con la URL `/exec` real; vuelva a desplegar Render |
| Conexión integrada no responde | Compruebe apiUrl, el servicio API de Render y su /healthz. No usa iframe ni cookies Google. Tras inactividad el servicio gratuito puede tardar en iniciar; el botón se recupera al alcanzar el plazo |
| Origen no autorizado | `FRONTEND_ORIGINS` debe contener el origen exacto de Render, sin barra final ni ruta |
| Identidad vacía o acceso denegado | Ingrese nuevamente con usuario y contraseña; compruebe MANAGEMENT_AUTH_ENABLED y las propiedades privadas de acceso |
| clasp bloquea push/deploy | Habilite Apps Script API en la configuración de usuario de la cuenta propietaria |
| Carga no reconocida | Compruebe tipo nativo FILE_UPLOAD, título exacto y ejecute finalizeSetup tras modificar preguntas |
| PDF vacío no descarga | Compruebe el PDF publicado en Render o el permiso de lectura independiente del archivo vacío en Drive |
| No aparece una respuesta | Revise Eventos/Errores y los disparadores del propietario; la reconciliación reintenta envíos pendientes |
| Archivos no se procesan | Revise propiedad, permisos, PDF/JPEG/PNG, tamaño y máximo de diez archivos |
| Otro convenio bloquea envío | Especifique el convenio en su sección obligatoria |
| No llega correo | Revise pausa, cuota, cola, disparador del propietario y spam; no cambie manualmente SENT a PENDING |
| UNCERTAIN | Verificación manual del propietario antes de confirmar o reenviar |
| Descuento no aparece en SIGU | El sistema no escribe en SIGU; Tesorería debe registrar el beneficio y confirmar ese paso |
| Excel devuelve error | Revise permiso sobre la carpeta de exportaciones y límite de exportación de Google; pruebe menos filas |
| Enlace Drive denegado | Los enlaces directos de Drive son para el propietario. Gestión usa Vista previa/Descargar dentro del panel; no publique expedientes |
| Panel muestra una versión anterior | Guarde/suba el código y actualice la versión del despliegue de Google y la de Render |

Use Auditoría y Errores para comprobar la etapa que falló. No publique esos registros ni datos de estudiantes al pedir soporte.

Los errores de procesamiento se reintentan con espera creciente, hasta un intervalo de un día. Para un reintento inmediato después de corregir la causa, el propietario puede ejecutar `retryFailedEvent(claveDelEvento)` desde el proyecto autorizado. La clave figura en Eventos; la operación queda auditada. Un expediente con un evento pendiente no admite aprobación hasta que se complete su recuperación.
