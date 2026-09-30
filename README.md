# El día de Thais ♡

Una aventura de cumpleaños en HTML, CSS y JavaScript puro, adaptable a celular y escritorio. Se muestra una sola pantalla a la vez: bienvenida, reto, recuerdo desbloqueado, álbum y regalo. Incluye ocho espacios tipo polaroid para fotos.

## Abrir la página

Abre `index.html` con tu navegador. No necesitas instalar dependencias ni un servidor para jugar. Las tipografías de Google son opcionales: si no hay conexión se usan las fuentes del dispositivo.

Para servirla en local con Node.js: `npm run dev` y abre `http://127.0.0.1:5173/`. Usa la dirección exacta de la consola para evitar que `localhost` abra otro proyecto servido por IPv6. Esta vista se recarga automáticamente cuando guardas cambios en HTML, CSS, JavaScript o fotos y conserva tu avance. Si abres `index.html` directamente, recarga manualmente el navegador. `npm run build` prepara `dist/` para hosting estático.

## Personalizar

Edita **config.js**:

- `name`: nombre de la cumpleañera.
- `gift.message`: mensaje que se revela al terminar.
- `gift.wish`: frase final de cumpleaños que aparece al terminar el túnel.
- `gift.signature`: despedida o firma.
- `photos`: rutas, textos y descripciones de las ocho fotos. Añade `note` a una foto para personalizar las palabras que aparecen al abrir su recuerdo.
- `storageKey`: cambia el identificador para comenzar una nueva edición sin progreso guardado.

Guarda las imágenes en `assets/fotos/`. Ejemplo de una entrada:

```js
{ src: "assets/fotos/playa.jpg", caption: "Nuestro día en la playa", alt: "Thais sonriendo en la playa" }
```

Los tres primeros espacios aparecen en la portada. Los siguientes cuatro se desbloquean, uno por reto, y el quinto aparece al completar el álbum. Cada recuerdo del álbum permite abrir y cerrar sus palabras. Un `src` vacío conserva el espacio para foto. Las imágenes se recortan de forma uniforme con `object-fit: cover`.

## Recorrido

1. Encontrar cinco corazones entre las estrellas.
2. Encontrar cuatro parejas en un juego de memoria.
3. Adivinar «cumpleaños» (acepta tildes y mayúsculas).
4. Ordenar «Hoy merezco cosas bonitas».
5. Ver el álbum completo y abrir la sorpresa: un túnel de treinta segundos con frases y fotos que termina en el inicio.

Al resolver cada reto se desbloquea una tarjeta: hay que tocarla para abrir el recuerdo y después pulsar Continuar. Solo se muestra el reto actual; los títulos de los futuros, el álbum y el regalo permanecen ocultos hasta su turno. La barra superior indica el avance sin revelar las sorpresas.

Hay pistas, reintentos ilimitados y mensajes de ánimo. «Seguir luego» y Escape cierran el reto libremente. Se guardan los retos completados y si el recuerdo está pendiente, abierto o leído: recargar retoma ese mismo punto. Un intento incompleto empieza de nuevo. Volver a la bienvenida conserva el avance. Se mantiene el progreso de la versión anterior. Si el navegador impide el almacenamiento, el recorrido funciona durante la sesión. Abrir un archivo local, usar otro dominio o usar otro navegador puede tener un progreso distinto.

Al volver al inicio puedes continuar, elegir «Repasar retos y respuestas» para recorrer los retos completados con sus soluciones, o «Reiniciar desde cero» para jugar otra vez. El repaso tiene navegación anterior/siguiente y acceso directo a cada reto completado; no cambia el avance ni revela soluciones de etapas pendientes. El reinicio pide confirmación, borra únicamente el avance de esta aventura y vuelve a bloquear retos, recuerdos y regalo.

El bloqueo forma parte del juego; el código está en archivos estáticos y puede inspeccionarse. No se usa como protección de información confidencial.

## Detalles

- Botones utilizables con teclado y pantalla táctil, diálogo nativo, estados anunciados y foco visible.
- Animaciones reducidas cuando el dispositivo lo solicita; sin audio automático.
- Burbujas translúcidas con silueta de corazón de cuatro grupos de tamaños, repartidas por todo el ancho. Explotan al tocarlas o al terminar su tiempo individual, sueltan confeti, desaparecen y reaparecen en otra posición con nuevo tamaño y movimiento. El cursor no las congela; el foco del teclado permite seleccionarlas y se libera al explotar. No interceptan los botones del recorrido.
- Una pequeña compañera camina entre etapas, señala pistas, piensa durante los intentos y celebra los aciertos. Tiene espacio propio tanto en la página como dentro de los retos para no tapar controles. Su ilustración de seis poses está en `assets/mascot-girl.png`, generada con la herramienta integrada de ImageGen. El prompt exacto se conserva en `outputs/mascot-prompt.txt`.
- Confeti, corazones y regalos en cada cambio de pantalla. La sorpresa abre un túnel con las seis fotos dentro de burbujas, frases de cumpleaños y un mensaje final; vuelve al inicio a los treinta segundos. Se puede salir antes o repetirlo desde el cierre.
- El siguiente botón del recorrido emite seis ondas concéntricas con forma de corazón, con transparencia gradual y ritmo de doble latido: empezar, abrir el reto, descubrir el recuerdo, continuar y llegar al regalo. Todos usan la misma silueta de `assets/heart-echo.svg`. Los botones bloqueados y los controles detrás de un reto abierto no emiten ondas. La sorpresa se abre tocando el propio regalo animado, con su etiqueta accesible «Abrir mi sorpresa».
- Las animaciones están activas por defecto y no tienen botón de pausa. Se ignora cualquier pausa guardada por versiones anteriores. Los efectos se pausan cuando la pestaña está en segundo plano y respetan la preferencia de movimiento reducido del dispositivo.
- Sin cuentas, servicios de datos ni carga de fotos desde la página.
- Publicación en Sites configurada como sitio estático. Se conservan las dependencias del scaffold de Sites; el código entregado no las necesita para jugar.
- WebMCP opcional: consultar el progreso y abrir el reto actual; nunca saltar recuerdos ni resolver etapas.

Validación: `npm test` ejecuta pruebas del motor y del HTML con sus scripts reales en JSDOM: navegación, los cuatro retos, recuerdos, recarga, álbum, regalo y efectos. Incluye una regresión que impide volver a ocultar el `body` al cambiar de etapa. JSDOM comprueba el comportamiento, pero no sustituye una revisión visual en un navegador. `npm run build` prepara la versión estática.

Antes de entregar a Thais: revisa las fotos y el mensaje final, y prueba con una ventana privada para empezar desde cero.
