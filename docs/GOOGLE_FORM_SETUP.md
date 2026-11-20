# Configuración de Google Forms

Se revisaron los tres PDF de referencia y el PDF original en Descargas. Las 14 escuelas y los nueve convenios se conservan. La referencia permitía una ficha JPG con límites mayores; esta implementación admite PDF/JPG/PNG y aplica un límite coherente de 10 MiB por archivo para controlar almacenamiento y exportación.

El enlace de vista pública de la referencia no es un ID de edición. No se modifica el formulario original: `initializeProject` crea formularios nuevos bajo la cuenta especificada. Para migrar uno existente, use su ID de edición, adapte los títulos exactos siguientes y ejecute `finalizeSetup`. No cambie el destino de respuestas de un formulario de producción sin revisar su uso.

## Formulario de solicitud

Los campos de datos se crean con Apps Script. **Otro convenio** tiene una sección obligatoria que solo se visita al elegir Otro. Las otras opciones van directamente a Documentación.

| Título exacto | Tipo | Obligatorio |
| --- | --- | --- |
| Correo electrónico institucional | Respuesta corta, validación email | Sí |
| Correo electrónico personal | Respuesta corta, validación email | No |
| Tipo de documento | DNI / CE / Pasaporte | Sí |
| Número de documento | Respuesta corta | Sí |
| Apellidos y nombres | Respuesta corta | Sí |
| Escuela profesional | Lista de 14 escuelas | Sí |
| Descuento corporativo | Opciones con navegación | Sí |
| Otro convenio (especifique) | Respuesta corta, sección Otro | Sí en esa sección |
| Ficha socioeconómica completa y firmada | **Carga de archivos: crear manualmente** | Sí |
| Documentos sustentatorios | **Carga de archivos: crear manualmente** | Sí |
| Confirmación de ficha | Casilla de confirmación | Sí |
| Tratamiento de datos | Casilla y aviso que debe revisar UMA | Sí |

En la sección Documentación, añada **Carga de archivos** dos veces. Google puede mostrar un aviso de almacenamiento en Drive. Seleccione tipos **PDF e Imagen**; Google agrupa formatos de imagen, y el backend acepta únicamente JPEG y PNG, además de PDF. Explíquelo al estudiante en el texto de ayuda.

Para la ficha permita hasta **5 archivos**, 10 MB cada uno (permite fotografías separadas). Para sustentos permita hasta **5 archivos**, 10 MB cada uno. Marque ambas preguntas como obligatorias. El backend limita a diez archivos por envío; no acepta Word ni ejecutables aunque alguien logre enviarlos.

La ficha se descarga, llena MANUALMENTE y firma. Ninguna pregunta digital pide los datos económicos, de vivienda o de familia que ya aparecen en el documento. No se rellena ni modifica el PDF desde el sistema.

Después de configurar `TEMPLATE_PDF_FILE_ID`, `finalizeSetup` pone un enlace visible de descarga en la cabecera **Ficha Socioeconómica 2027-I**. Pruebe su apertura como estudiante: la ficha vacía debe tener permiso de lectura independiente de los expedientes.

## Formulario de subsanación

El sistema crea Código de solicitud, Código seguro de subsanación, correo institucional, número de documento, aclaración opcional, confirmación de firma y privacidad. Añada exactamente las mismas dos preguntas de carga de la tabla. Toda subsanación presenta un conjunto completo de ficha y sustentos; las revisiones anteriores se conservan.

El enlace prellena únicamente el código de expediente y el token, para evitar números de identidad y emails en el historial de URL. El estudiante escribe nuevamente su correo institucional y documento. Los campos prellenados de Google Forms **se pueden editar**: la seguridad proviene de la verificación HMAC, vencimiento, identidad y estado en el servidor.

No use la opción «editar respuesta» como mecanismo de corrección: no se depende de que una edición vuelva a disparar la automatización. Desactive «limitar a una respuesta» en ambos formularios, pues impediría futuras subsanaciones.

## Comprobación antes de abrir

- Títulos exactos sin preguntas duplicadas; `finalizeSetup` guarda IDs estables.
- Ambas preguntas son de **Carga de archivos**, no texto para pegar enlaces.
- Obligatorio y límites configurados en la interfaz (la comprobación automática valida existencia/tipo, no todos los ajustes de upload).
- PDF original descargable desde una cuenta estudiante.
- Aviso de privacidad aprobado por UMA.
- Inicio de sesión de Google y espacio de Drive disponibles.
- Formularios y cargas en My Drive de contactotesoreriauma@gmail.com, no en una unidad compartida.
- Nuevo envío real genera un expediente y copias privadas de los documentos.

Después de renombrar o sustituir preguntas, ejecute `finalizeSetup` para regenerar los mapas. No borre preguntas que ya tengan respuestas históricas sin planificar una migración.
