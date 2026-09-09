# El día de Thais ♡

Una landing de cumpleaños en HTML, CSS y JavaScript puro, adaptable a celular y escritorio. Cuatro retos desbloquean una pista para encontrar un regalo. Incluye ocho espacios tipo polaroid para fotos.

## Abrir la página

Abre `index.html` con tu navegador. No necesitas instalar dependencias ni un servidor para jugar. Las tipografías de Google son opcionales: si no hay conexión se usan las fuentes del dispositivo.

Para servirla en local con Node.js: `npm run dev` y abre la dirección que aparece en la consola. `npm run build` prepara `dist/` para hosting estático. `npm test` verifica la lógica de los retos.

## Personalizar

Edita **config.js**:

- `name`: nombre de la cumpleañera.
- `gift.message`: mensaje que se revela al terminar.
- `gift.clue`: pista para encontrar el regalo. **La pista de ejemplo apunta a una almohada; cámbiala por el escondite real antes de compartir.**
- `gift.extraClue`: ayuda adicional, visible solo al pedirla; usa una cadena vacía para omitirla.
- `gift.signature`: despedida o firma.
- `photos`: rutas, textos y descripciones de las ocho fotos.
- `storageKey`: cambia el identificador para comenzar una nueva edición sin progreso guardado.

Guarda las imágenes en `assets/fotos/`. Ejemplo de una entrada:

```js
{ src: "assets/fotos/playa.jpg", caption: "Nuestro día en la playa", alt: "Thais sonriendo en la playa" }
```

Los tres primeros espacios aparecen en la portada; los otros cinco forman el collage. Un `src` vacío conserva el espacio para foto. Las imágenes se recortan de forma uniforme con `object-fit: cover`.

## Recorrido

1. Encontrar cinco corazones entre las estrellas.
2. Encontrar cuatro parejas en un juego de memoria.
3. Adivinar «cumpleaños» (acepta tildes y mayúsculas).
4. Ordenar «Hoy merezco cosas bonitas».
5. Abrir la sorpresa, leer la pista y celebrar con confeti.

Las etapas futuras permanecen bloqueadas. Hay pistas, reintentos ilimitados y mensajes de ánimo. «Seguir luego» y Escape cierran el reto libremente. Se guardan los retos completados en este navegador; un intento incompleto empieza de nuevo. Si el navegador impide el almacenamiento, el recorrido funciona durante la sesión. Abrir un archivo local, usar otro dominio o usar otro navegador puede tener un progreso distinto.

El bloqueo forma parte del juego; el código y la pista están en archivos estáticos y pueden inspeccionarse. No se usa como protección de información confidencial.

## Detalles

- Botones utilizables con teclado y pantalla táctil, diálogo nativo, estados anunciados y foco visible.
- Animaciones reducidas cuando el dispositivo lo solicita; sin audio automático.
- Sin cuentas, servicios de datos ni carga de fotos desde la página.
- Publicación en Sites configurada como sitio estático. Se conservan las dependencias del scaffold de Sites; el código entregado no las necesita para jugar.
- WebMCP opcional: consultar el progreso y abrir retos ya desbloqueados; nunca saltar ni resolver etapas.

Validación realizada: seis pruebas automáticas de la lógica, comprobación de sintaxis y compilación estática. No hubo un navegador conectado para verificar visualmente la página ni un contexto WebMCP disponible para comprobar su registro.

Antes de entregar a Thais: añade fotos, confirma el escondite y prueba con una ventana privada para empezar desde cero.
