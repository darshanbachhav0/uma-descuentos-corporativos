# Verificación

Ejecute después de cada cambio:

```powershell
npm run build
npm run check
npm test
```

La compilación genera el backend y el sitio estático por separado. La comprobación valida JavaScript, manifiesto y la exclusión de fuentes privadas/datos ficticios de `web-dist`. Las pruebas ejecutan las funciones reales del dominio en un entorno simulado de servicios Google, además del transporte del sitio estático.

## Pruebas locales incluidas

Se cubren creación de expedientes, ceros iniciales en identidad, formato de correo, dominios, DNI, Otro convenio, neutralización de fórmulas, copias privadas, eventos duplicados, documentos repetidos, recuperación tras errores de Drive/Sheets, confirmación SIGU y versión esperada, mensajes personalizados, cola del propietario, pausas y cuotas, resultados de correo inciertos, observaciones, revisiones de subsanación, tokens inválidos/vencidos/ajenos, recuperación de decisiones, accesos no autorizados, eventos falsificados, escape HTML, filtros y estadísticas.

También se comprueban orígenes exactos, rechazo de funciones arbitrarias en el puente, sesiones propias de gestión, expiración, revocación, límite de intentos, entrega privada de documentos, nonce y ventana emisora del canal, URLs de despliegue y conservación byte a byte del PDF original publicado. Estas pruebas no acreditan permisos reales, envío al buzón ni comportamiento de cookies del navegador.

## Prueba real de Google y Render

| Paso | Resultado que debe observarse |
| --- | --- |
| Abrir sitio Render por HTTPS | Carga el formulario Usuario/Contraseña. Estudiantes redirige a Google Forms; no hay datos ficticios |
| Descargar PDF vacío | Mismo PDF original, completo, legible, sin respuestas |
| Abrir el panel sin sesión | No se entregan registros ni archivos; no hay botón Google |
| Contraseña incorrecta | Rechazo sin datos |
| Usuario y contraseña correctos | Panel operativo, identidad de gestión correcta |
| Cerrar sesión | Token revocado; no se pueden repetir llamadas de datos |
| Inicializar recursos | Se generan libro, carpetas privadas y dos formularios cerrados |
| Configurar cargas | Dos preguntas nativas por formulario; PDF/imagen, límites y obligatoriedad |
| Verificar enlace del PDF como estudiante | Descarga pública solo de la ficha vacía |
| Envío inicial real | Un código único, un registro, enlaces y archivos de revisión 1; estado RECIBIDA |
| Repetir mismo documento/periodo | No crea otro expediente; conserva la respuesta original |
| Marcar validada sin SIGU | No se envía aprobación |
| Aprobar sin casilla SIGU | Rechazo de la operación |
| Aprobar tras registro real | APLICADA_SIGU, autor/fecha y un mensaje al correo escrito en Forms |
| Observar | Motivo/instrucciones obligatorios y correo con enlace personal |
| Subsanar con token alterado | Rechazo; expediente original sin cambios |
| Subsanar correctamente | Mismo código, revisión 2 y documentos anteriores conservados |
| Repetir decisión por doble clic/reintento | Un registro de decisión y un mensaje lógico |
| Agotar cuota/pausar envío | Decisiones conservadas y notificación en cola |
| Simular error ambiguo de envío | Estado UNCERTAIN; no hay reintento automático |
| Descargar Excel | Excel abre el archivo real; ceros, estado, observación y enlaces correctos |
| Probar en móvil | Acceso, tablas desplazables, formularios, diálogos y vista de documentos utilizables |

Use un expediente ficticio y un buzón real bajo su control, escrito en Forms. No se introduce un destinatario fijo de prueba en el código. Nunca registre una aprobación que afirme un descuento real en SIGU para un estudiante de producción si Tesorería no lo confirmó.

`MailApp.sendEmail` no devuelve un acuse de entrega. Compruebe recepción/spam en el buzón de prueba. No marque estas pruebas reales como aprobadas basándose solo en mocks, HTTP 200 del sitio estático o éxito de compilación.
