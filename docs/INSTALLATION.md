# Instalación en Google

## 1. Preparación local

Abra Microsoft Edge con **contactotesoreriauma@gmail.com**. Verifique la cuenta en Google Apps Script; el perfil de Microsoft Edge no determina qué cuenta de Google está activa.

```powershell
npm run build
npm run check
npm test
```

La carpeta original estaba vacía y no tenía repositorio Git. Las fuentes se han creado directamente en ella, sin modificar otros proyectos.

## 2. Cargar Apps Script

En [Google Apps Script](https://script.google.com/home), cree un proyecto llamado **UMA — Descuentos Corporativos**. Sustituya el contenido completo de `Code.gs` por `dist/Code.gs` y guarde. El archivo compilado incorpora los HTML y el logotipo.

Puede usar la ruta local de fuente `http://127.0.0.1:4173/Code.gs` mientras `npm run preview` está activo: seleccionar todo/copiar en esa página, seleccionar todo/pegar dentro del editor `Code.gs` y guardar.

Alternativa CLI opcional:

```powershell
npm install --global @google/clasp
clasp login
# Seleccione contactotesoreriauma@gmail.com en Edge y autorice los permisos.
# Habilite Google Apps Script API en https://script.google.com/home/usersettings si clasp lo solicita.
Copy-Item .clasp.json.example .clasp.json
# Ponga el ID real del proyecto en .clasp.json; rootDir debe ser dist.
clasp push
```

No comparta tokens ni incluya `.clasp.json`, credenciales o datos de estudiantes en Git. Para pegar manualmente, configure la zona horaria del proyecto en **America/Lima**. Con clasp se usa el manifiesto incluido.

## 3. Autorizar y crear los recursos

En el selector de funciones elija `initializeProject` y pulse **Run / Ejecutar**. Google solicitará acceso a Forms, Sheets, Drive, envío de correo, identidad, disparadores y llamadas externas para exportar Excel. **El titular de la cuenta debe revisar y completar el consentimiento OAuth.** Si aparece una advertencia de aplicación sin verificar, revise que es su proyecto; no autorice proyectos desconocidos.

La función crea de forma repetible:

- Libro **UMA — Control de Descuentos Corporativos**, tablas y formato.
- Carpeta privada **UMA_DESCUENTOS_CORPORATIVOS** y subcarpeta Exportaciones.
- Formulario inicial y formulario de subsanación, inicialmente cerrados.
- Campos de texto/selección, sección condicional Otro, aviso de privacidad y confirmación de firma.
- Clave secreta de subsanación en Script Properties.

Las URL se muestran en el registro de ejecución. Volver a ejecutar conserva los IDs existentes. No crea automáticamente las preguntas de carga que Google exige configurar en la interfaz.

## 4. PDF y preguntas de carga

Suba a Drive **el PDF original de `reference/FORMATO 1_FICHA DE EVALUACION SOCIOECONOMICA_2027-I.pdf`**. Ubíquelo en una carpeta independiente de todos los expedientes. Configure solo ese archivo vacío como accesible para lectura/descarga por los estudiantes; nunca haga pública la carpeta de solicitudes.

En **Project Settings → Script Properties** añada `TEMPLATE_PDF_FILE_ID` con el ID del archivo. Siga [GOOGLE_FORM_SETUP.md](GOOGLE_FORM_SETUP.md) para añadir las dos preguntas de carga a cada formulario. Mantenga los formularios cerrados mientras configura.

Revise con UMA el aviso de privacidad, los plazos de conservación y el dominio institucional. `INSTITUTIONAL_EMAIL_DOMAINS` vacío comprueba formato, pero no restringe dominios. Use la lista exacta autorizada por UMA, por ejemplo los dominios realmente usados por sus alumnos, sin asumir que un ejemplo es su política.

## 5. Finalizar y disparadores

Ejecute `finalizeSetup` como propietario. Actualiza los IDs de las preguntas y el enlace de descarga, verifica la estructura e instala:

| Función | Disparador | Propietario |
| --- | --- | --- |
| `onApplicationSubmit` | Al enviar formulario inicial | contactotesoreriauma@gmail.com |
| `onCorrectionSubmit` | Al enviar formulario de subsanación | contactotesoreriauma@gmail.com |
| `processEmailQueue` | Cada minuto aproximadamente | contactotesoreriauma@gmail.com |
| `reconcileSubmissions` | Cada 10 minutos aproximadamente | contactotesoreriauma@gmail.com |

No use disparadores de edición de celdas para enviar correos. No instale duplicados desde otras cuentas. Los intervalos de Google no son tiempos de entrega garantizados.

## 6. Acceso de Tesorería

El panel de Render usa un único usuario y contraseña de gestión. Los revisores no necesitan autorizar Google ni recibir acceso directo a Drive/Sheets. El backend trabaja con la cuenta propietaria. No comparta los recursos de Google con estudiantes.

La contraseña no se incluye en el JavaScript público ni se compara en el navegador. El navegador deriva una prueba con PBKDF2/SHA-256 (600 000 iteraciones); el servidor comprueba su hash almacenado en Script Properties. Las sesiones duran como máximo seis horas, pueden terminar antes si Google vacía su caché y se revocan al cerrar sesión o cambiar las credenciales. Las acciones se atribuyen al usuario compartido, no a personas individuales.

En este despliegue el acceso ya está configurado. Para una instalación nueva, después de `npm run build`, `scripts/prepare-auth-bootstrap.mjs` recibe un objeto JSON con `username` y `password` por entrada estándar. No pase contraseñas como argumentos, no las guarde en Git y no imprima ese JSON. El script introduce únicamente el verificador derivado y la sal en una compilación temporal. Despliegue esa compilación como propietario, visite una vez `/exec` para inicializar las propiedades y vuelva a ejecutar `npm run build`, subir y desplegar una versión limpia. La inicialización es de valores fijos y no acepta credenciales de peticiones HTTP; no reemplaza un acceso ya configurado. `npm run check` rechaza cualquier compilación que conserve ese bootstrap temporal.

## 7. Desplegar el servicio

1. **Deploy → New deployment → Web app**.
2. **Execute as: Me**, desde **contactotesoreriauma@gmail.com** (`USER_DEPLOYING`).
3. **Who has access: Anyone** (`ANYONE_ANONYMOUS`). Esto permite abrir el servicio sin sesión Google; cada operación de gestión sigue exigiendo la sesión propia del panel.
4. Configure en Render la URL `/exec` y en `FRONTEND_ORIGINS` el origen HTTPS exacto de Render.
5. Abra Render: deben aparecer solamente Usuario, Contraseña e Ingresar. No deben aparecer botones de Google, registro ni recuperación.
6. Sin sesión válida, las solicitudes, decisiones, documentos y exportaciones deben ser rechazados. Una sesión Google del propietario tampoco sustituye el usuario y contraseña del panel.

La autorización OAuth del propietario sigue siendo necesaria una vez para operar Forms/Sheets/Drive/MailApp. No se pide ese consentimiento a los usuarios del panel. Los correos continúan enviándose por el disparador del propietario. La administración directa de los recursos Google conserva su autenticación de Google habitual.

## 8. Prueba real y puesta en marcha

Ejecute la lista de [TESTING.md](TESTING.md). Para pruebas, use su correo real y un expediente ficticio; el destinatario siempre debe introducirse en el formulario. No hay destinatario de prueba fijo en el código.

`EMAIL_NOTIFICATION_ENABLED` comienza en `false`. Active el envío desde Configuración solo después de validar el contenido y la cola. Una decisión previa puede quedar en cola y se enviará al activar la opción: revise la hoja Correos antes de hacerlo.

Ejecute `publishForms` cuando permisos, preguntas y textos estén listos. Para formularios con el nuevo modelo de publicación, la función usa las operaciones admitidas `supportsAdvancedResponderPermissions`/`setPublished` y después abre respuestas. Verifique el acceso del estudiante desde otra sesión de Google.

Tras modificar código local: compilar, probar, pegar/subir `dist/Code.gs`, guardar y **Deploy → Manage deployments → Edit → New version → Deploy**. Los disparadores usan el código guardado del proyecto; el panel usa la versión desplegada. Manténgalos sincronizados.

## Propiedades

| Propiedad | Valor inicial / propósito |
| --- | --- |
| `SPREADSHEET_ID` | Generado por inicialización |
| `ROOT_DRIVE_FOLDER_ID`, `EXPORT_FOLDER_ID` | Generados; deben seguir restringidos |
| `GOOGLE_FORM_ID`, `CORRECTION_FORM_ID` | IDs de edición, no IDs públicos `1FAIpQL…` |
| `TEMPLATE_PDF_FILE_ID` | Manual, archivo vacío original |
| `MANAGEMENT_USERNAME`, `MANAGEMENT_SALT`, `MANAGEMENT_ITERATIONS`, `MANAGEMENT_VERIFIER` | Credenciales derivadas privadas del panel |
| `MANAGEMENT_AUTH_ENABLED`, `MANAGEMENT_CREDENTIAL_VERSION` | Acceso activo e invalidación de sesiones |
| `AUTHORIZED_REVIEWERS` | Compatibilidad de instalaciones anteriores; no sustituye la autenticación propia activa |
| `ACADEMIC_PERIOD` | `2027-I` |
| `INSTITUTIONAL_EMAIL_DOMAINS` | Vacío; configurar dominios reales |
| `EMAIL_NOTIFICATION_ENABLED` | `false`; activar después de probar |
| `MAX_FILE_BYTES` | 10 MiB por archivo; coincidir con Forms |
| `MAX_FILES` | 10 archivos por envío |
| `CORRECTION_DAYS` | 14 días |
| `QUESTION_MAP`, `CORRECTION_QUESTION_MAP` | Generados a partir de títulos exactos |
| `CORRECTION_SECRET`, `SEQUENCE_*`, `TRIGGER_*`, `CURSOR_*` | Estado interno; no editar ni publicar |

La cuenta de envío se fija deliberadamente en `UMA.owner` y se comprueba en tiempo de ejecución; un texto `from` no puede suplantar una cuenta de Google.
