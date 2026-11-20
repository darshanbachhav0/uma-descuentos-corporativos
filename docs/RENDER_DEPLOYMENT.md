# Sitio estático en Render

El servicio usa `runtime: static`, publica **web-dist** y ejecuta:

```text
npm run build && npm run check && npm test
```

El archivo `render.yaml` define rutas para `/tesoreria` y `/estudiantes`, además de cabeceras de seguridad. No requiere servidor, base de datos ni secretos de Google en Render. Las operaciones de Google siguen ejecutándose en Apps Script.

## Conexión pública

`deploy/public-config.json` contiene exclusivamente URLs y metadatos públicos:

- `appsScriptUrl`: despliegue real `https://script.google.com/macros/s/.../exec`.
- `applicationFormUrl`: enlace publicado del formulario inicial real.
- `supportEmail` y `period`: información visible, sin credenciales.

También puede proporcionar `UMA_APPS_SCRIPT_URL` y `UMA_APPLICATION_FORM_URL` en el entorno de compilación de Render. Estas variables son públicas: nunca introduzca un token, clave o contraseña en ellas. Tras cambiarlas, vuelva a compilar y desplegar el sitio.

En Google, configure `FRONTEND_ORIGINS` con el origen exacto del sitio Render, por ejemplo el `https://...onrender.com` que Render haya asignado. No use comodines. La pantalla de configuración del propietario en `/exec?mode=setup` puede guardar ese origen, el enlace de descarga del PDF original y una copia privada de la plantilla vacía.

## Flujo de despliegue

1. Confirme el usuario, el workspace de Render y el repositorio remoto.
2. Compile, compruebe y ejecute las pruebas locales.
3. Valide `render.yaml` con `render blueprints validate render.yaml`.
4. Confirme que los archivos están en la rama remota main.
5. Cree un servicio **Static Site** con ese repositorio y `web-dist` como carpeta de publicación, o aplique el Blueprint.
6. Espere a que el despliegue esté **live**. Un disparador aceptado no es suficiente.
7. Verifique por HTTP la página de Tesorería, Estudiantes, archivos JS/CSS, configuración y PDF. Compruebe que `Code.gs`, credenciales y documentos de estudiantes no se publican.
8. Complete la prueba autenticada contra Google y un envío real de Forms antes de declarar listo el flujo completo.

Cuando se crea un servicio directamente por CLI, el Blueprint queda como configuración reproducible, pero no se aplica automáticamente. Añada las cabeceras/rutas de `render.yaml` al servicio o aplique el Blueprint de forma controlada. El HTML y los enlaces también funcionan con sus rutas de archivo explícitas (`/index.html` y `/estudiantes.html`).

La cuenta de Render y la de envío previstas son darshanbachhavapp@gmail.com. La autorización de Render no concede acceso a Google: cada proveedor tiene su consentimiento independiente.
