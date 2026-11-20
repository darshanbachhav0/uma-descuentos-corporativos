# Interfaz

El panel usa los colores UMA: rosa `#e91953` (franja superior, pestaña activa, botón principal) y carbón `#20242d`, sobre fondo gris claro con tarjetas blancas. Los estados se muestran como etiquetas suaves (verde aplicada, ámbar observada, rosa corrección recibida, azul en proceso). Hay animaciones de carga: barra superior, filas esqueleto en las tablas, indicador en botones, en la vista previa de documentos y en el ingreso. En pantallas pequeñas las filas se muestran como tarjetas y la solicitud ocupa toda la pantalla.

El logotipo `src/assets/uma-logo.jpg` (proporcionado por el usuario, sin alterar) aparece pequeño en la barra superior y en la pantalla de ingreso.

## Pantallas

- **Ingreso:** usuario, contraseña e Ingresar (`web/Gate.html`, `web/site.css`).
- **Pestañas:** Pendientes, Por revisar, Observadas, Aplicadas en SIGU, Todas y Correos, cada una con su contador.
- **Lista:** búsqueda y filtros en una línea, tabla con código, estudiante, correo institucional, convenio, envíos, último envío y estado.
- **Solicitud:** datos, alertas, documentos por revisión con vista previa, envíos, historial y, a la derecha, la decisión (Aprobar u Observar con un único texto para el estudiante) y los correos.

No hay pantallas de resumen, auditoría ni configuración; esos datos están en Google Sheets y en las propiedades del script (ver [TREASURY_MANUAL.md](TREASURY_MANUAL.md)).
