# Europa · Países y capitales / Països i capitals

Juego con los 50 países de `countries.rtf`, disponible en español y catalán.

## Jugar en tu ordenador

Abre `dist/index.html` en un navegador moderno. Todos los archivos necesarios están incluidos; no se requiere conexión para jugar. La preferencia de idioma se guarda en el navegador cuando permite almacenamiento local. Algunos navegadores limitan ese almacenamiento al abrir archivos directamente.

## Prácticas

- Países: selecciona el territorio en el mapa, sin etiquetas. Usa + y − para ampliar, arrastra para desplazar y pulsa ⌖ para restablecer la vista. Los puntos amplían el área de selección de los países pequeños.
- Capitales, opciones: elige entre cuatro respuestas.
- Capitales, escritura: escribe el nombre de la capital. 

Cada práctica contiene una ronda de 50 preguntas sin repeticiones. Tras responder, el juego muestra brevemente el resultado y pasa automáticamente a la siguiente pregunta (1,5 segundos si es correcta; 3,5 segundos si hay errores). Puedes cambiar de práctica en cualquier momento sin perder el progreso mientras mantengas abierta la página. «Nueva ronda» reinicia únicamente la práctica activa. Recargar la página reinicia las rondas, pero conserva el idioma.

## Puntuación

En el mapa hay dos intentos: 100 % por acertar al primero, 50 % al segundo y 0 % tras dos errores o al omitir. Después de cada error se muestra el país seleccionado. Los países resueltos correctamente permanecen grises y los fallados, rojos, hasta reiniciar la ronda. En las opciones, cada respuesta vale 100 % si es correcta y 0 % si es incorrecta u omitida. En escritura se ignoran mayúsculas y espacios de más. Cada error de acento cuesta 0,25 y cada inserción, omisión, sustitución de letra o intercambio de dos letras contiguas cuesta 1. Se calcula la menor distancia de edición ponderada y se divide por la longitud de la respuesta más larga. La puntuación es 100 × (1 − distancia / longitud), limitada a 0–100 %. La puntuación de la ronda es la media de las preguntas respondidas; al finalizar incluye las 50.

Ejemplo: «PARÍS» = 100 %, «Paris» = 95 %, «Pariz» = 75 %.

## Datos y código

`dist/data.js`: países, traducciones, capitales y geometría del mapa.
`dist/app.js`: preguntas, idiomas, puntuación e interacción.
`dist/style.css`: apariencia adaptable a móvil y ordenador.

Fronteras simplificadas de Natural Earth (dominio público): https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/
Nombres consultados en IGN, Enciclopèdia Catalana, FundéuRAE y ésAdir. Las respuestas se evalúan con la grafía mostrada en el idioma seleccionado.
D3 7.9.0 incluido localmente; licencia ISC en `dist/D3-LICENSE.txt`.
