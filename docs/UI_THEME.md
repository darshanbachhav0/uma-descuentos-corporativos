# Interfaz

El panel es una herramienta interna de trabajo: fondo blanco, tipografía del sistema, una sola tabla y pocos colores. El rosa UMA (`--brand` en `src/ui/Styles.html`) se usa sólo en el botón principal y en la pestaña activa; los estados usan texto de color (verde aplicada, ámbar observada, rojo error).

El logotipo `src/assets/uma-logo.jpg` (proporcionado por el usuario, sin alterar) aparece pequeño en la barra superior y en la pantalla de ingreso.

## Pantallas

- **Ingreso:** usuario, contraseña e Ingresar (`web/Gate.html`, `web/site.css`).
- **Pestañas:** Pendientes, Por revisar, Observadas, Aplicadas en SIGU, Todas y Correos, cada una con su contador.
- **Lista:** búsqueda y filtros en una línea, tabla con código, estudiante, correo institucional, convenio, envíos, último envío y estado.
- **Solicitud:** datos, alertas, documentos por revisión con vista previa, envíos, historial y, a la derecha, la decisión (Aprobar u Observar con un único texto para el estudiante) y los correos.

No hay pantallas de resumen, auditoría ni configuración; esos datos están en Google Sheets y en las propiedades del script (ver [TREASURY_MANUAL.md](TREASURY_MANUAL.md)).
