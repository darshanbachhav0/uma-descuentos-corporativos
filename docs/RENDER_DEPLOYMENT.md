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
7. Verifique por HTTP la página de Tesorería, redirección de Estudiantes, archivos JS/CSS, configuración y PDF. Compruebe que `Code.gs`, credenciales y documentos de estudiantes no se publican.
8. Complete la prueba autenticada con usuario y contraseña y un envío real de Forms antes de declarar listo el flujo completo.

Cuando se crea un servicio directamente por CLI, el Blueprint queda como configuración reproducible, pero no se aplica automáticamente. En este despliegue las cabeceras y rutas ya se aplicaron mediante `scripts/configure-render.py`, que usa en memoria la autorización existente del CLI, verifica el workspace y el servicio y no imprime credenciales. Requiere PyYAML solo en el equipo de despliegue. Los enlaces también funcionan con sus rutas de archivo explícitas (`/index.html` y `/estudiantes.html`).

Ejecute `node scripts/verify-deployment.mjs` para verificar las páginas públicas, cabeceras, assets, hash del PDF original y respuesta 404 de archivos privados. Esa comprobación es independiente de las pruebas autenticadas de Google.

La cuenta de Render y la de envío previstas son darshanbachhavapp@gmail.com. La autorización de Render no concede acceso a Google: cada proveedor tiene su consentimiento independiente.

El servicio de Apps Script se ejecuta como propietario (`USER_DEPLOYING`) con acceso web `ANYONE_ANONYMOUS`. El sitio presenta exclusivamente usuario/contraseña, y la API rechaza toda operación de datos sin su sesión de gestión. Las credenciales de Google permanecen en Google. Si cambia una cabecera revisada de render.yaml, aplique `python scripts/configure-render.py --update-existing`; las demás reglas existentes se conservan.
