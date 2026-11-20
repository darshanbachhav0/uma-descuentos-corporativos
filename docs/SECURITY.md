# Seguridad y permisos

- El panel utiliza usuario y contraseña de gestión. No ofrece autenticación Google, registro ni otros métodos de acceso.
- El servicio de Apps Script ejecuta como darshanbachhavapp@gmail.com y admite visitantes anónimos; las operaciones de datos y revisión requieren una sesión propia válida. Una sesión Google del propietario no sustituye esa sesión del panel.
- El navegador deriva una prueba PBKDF2/SHA-256 con sal aleatoria y 600 000 iteraciones. El servidor compara el hash de esa prueba con el verificador privado de Script Properties. No se guardan contraseñas en texto plano, pruebas de contraseña ni credenciales Google en el sitio público o Git.
- Las sesiones usan tokens opacos; el servidor guarda solo su hash en la caché, y el navegador guarda el token en sessionStorage. Vencen en un máximo de seis horas y pueden terminar antes si Google elimina la caché. Cerrar sesión revoca el token. Cambiar la versión de credenciales invalida todas las sesiones anteriores.
- Tras diez intentos incorrectos hay una pausa de quince minutos. Este límite se comparte entre visitantes porque Apps Script no proporciona una dirección IP de cliente fiable al servicio.
- El servidor fija la identidad de gestión a partir de la sesión; las decisiones no aceptan un revisor enviado por JavaScript. Al usar un único usuario compartido, no se distinguen personas individuales en la auditoría. Quien conozca las credenciales puede gestionar los expedientes.
- Solo los parámetros de derivación y el inicio de sesión son públicos. La lista RPC rechaza cualquier nombre de función fuera de las operaciones permitidas. Cada petición valida sesión, origen configurado y argumentos; el contexto de autorización se limpia incluso si ocurre un error.
- El canal del iframe comprueba origen HTTPS exacto, nonce de 256 bits y ventana emisora fijada. No se envían tokens mediante URLs ni registros. Render usa CSP y no publica el código de Apps Script.
- Documentos y exportaciones permanecen privados en Drive. La entrega de archivos al navegador comprueba la sesión y que el documento pertenezca al expediente; solo admite PDF/JPEG/PNG dentro del límite configurado. La vista previa usa URLs blob locales que se revocan al cerrar o cambiar de documento.
- Los enlaces del Excel abren el panel y exigen su usuario/contraseña. Los enlaces directos de Sheets y Drive son de administración y conservan los permisos Google del propietario.
- El PDF vacío original es público para descarga. No publique expedientes, hojas operativas, cuerpos de correo ni archivos completados.
- El contenido estudiantil se escapa en HTML y se neutralizan fórmulas en Sheets/Excel. Se validan formato de correo, tipo/tamaño/cantidad de archivos y propiedad de cargas.
- El disparador de correo verifica la cuenta efectiva propietaria y usa únicamente un destinatario guardado desde el formulario. No hay un destinatario estudiantil fijo.
- Los enlaces de subsanación son personales, vencen y quedan invalidados al cambiar el estado/revisión. Mantenga CORRECTION_SECRET privado.

La autorización OAuth de la cuenta propietaria se realiza para la infraestructura Google. Los estudiantes necesitan una sesión Google para las cargas nativas de Forms. El usuario y contraseña del panel no se utilizan en Google, Render, SIGU ni GitHub.

La instalación inicial usa una compilación temporal de valores fijos para guardar el verificador en Script Properties. No admite credenciales de una petición HTTP, no reemplaza un acceso existente y debe retirarse compilando y desplegando nuevamente el código limpio. El comprobador rechaza ese bootstrap en el artefacto final.
