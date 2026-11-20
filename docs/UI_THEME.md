# Identidad visual UMA

Rediseño de interfaz: 20 de noviembre de 2026.

El logotipo es el archivo `umalogo1 (1).jpg` proporcionado por el usuario, copiado sin alterar a `src/assets/uma-logo.jpg` (814 × 378). Se mantiene su proporción y su fondo original. El PDF socioeconómico se conserva sin cambios.

La interfaz usa rosa UMA `#e91953`, carbón `#20242d`, blanco y grises neutros. El color principal se define en `src/ui/Styles.html` mediante `--brand`; las variantes públicas están en `web/site.css`. Los correos y encabezados de Excel comparten el rosa UMA. Los estados conservan colores semánticos y etiquetas de texto.

## Pantallas

- Tesorería: navegación oscura, logo sobre fondo claro, resumen del proceso, indicadores, distribución por convenio, filtros y tabla de expedientes.
- Revisión: datos y documentación a la izquierda; decisión, confirmación SIGU y observaciones a la derecha. En móvil, ambas secciones se apilan.
- Acceso: tarjeta de conexión con Google y presentación del proceso, con acceso al portal estudiantil.
- Estudiantes: solicitud, descarga visible de la ficha, instrucciones de llenado manual, pasos y preguntas frecuentes.

Los iconos SVG se incorporan durante la compilación mediante `scripts/icons.mjs`; no se descargan fuentes de iconos ni bibliotecas externas. La tipografía usa la fuente del sistema. Las imágenes del logo se incorporan al backend y se publican como asset en Render.

## Comprobación de interfaz

Se revisaron visualmente los diseños de escritorio y móvil, la apertura del expediente y los campos de observación, el menú móvil, su cierre sin navegación accidental, los filtros avanzados y las preguntas frecuentes. A 375 px, la tabla se desplaza dentro de su contenedor sin ensanchar la página. El menú cerrado queda fuera de la navegación accesible; los controles indican su estado expandido, y Escape o el fondo permiten cerrarlo.

Las pruebas de revisión con expedientes se realizaron en la demostración local aislada. No se guardaron decisiones de prueba ni se enviaron correos de estudiantes en producción como parte del rediseño.
