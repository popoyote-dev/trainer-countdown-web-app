# Trainer Countdown Web App

Aplicación web para crear ciclos de entrenamiento con temporizadores, repeticiones y sonidos de finalización. La app guarda la configuración del usuario en el navegador y permite gestionar varias etapas de trabajo con una interfaz simple y funcional.

## Requisitos

- Navegador moderno con soporte de JavaScript.
- Python 3 para servir los archivos estáticos localmente.
- Node.js para ejecutar la suite de pruebas (opcional).

## Ejecutar localmente

Desde la raíz del proyecto:

```bash
cd /Users/gmoguel/src/trainer-countdown-web-app
python3 -m http.server 4173
```

Luego abre esta URL en el navegador:

```text
http://localhost:4173
```

Para ejecutar las pruebas del proyecto:

```bash
npm test
```

## Funcionalidades incluidas

- Instalable como aplicación web progresiva (PWA) y disponible sin conexión tras la primera visita.
- Crear, duplicar y eliminar ciclos de entrenamiento.
- Configurar varios temporizadores con nombre y duración.
- Repetición de ciclos según el número indicado.
- Inicio, pausa, reanudación y reinicio del contador.
- Persistencia local con `localStorage`.
- Exportación e importación de la configuración en JSON.
- Reproducción de audio utilizando sonidos locales del proyecto.

## Estructura del proyecto

```text
trainer-countdown-web-app/
├── index.html
├── package.json
├── README.md
├── static/
│   ├── app/
│   │   ├── audio.js
│   │   ├── cycleManager.js
│   │   ├── main.js
│   │   ├── storage.js
│   │   ├── timer.js
│   │   └── tests/
│   │       └── cycleManager.test.js
│   ├── css/
│   │   └── styles.css
│   ├── img/
│   └── sounds/
│       └── assets/
│           └── original_audio/
└── .gitignore
```

## Archivos clave

- `index.html`: estructura principal de la interfaz.
- `static/app/main.js`: lógica principal de la UI y flujo de la aplicación.
- `static/app/cycleManager.js`: gestión de ciclos y validación de datos.
- `static/app/storage.js`: manejo de persistencia en navegador.
- `static/app/timer.js`: lógica del temporizador.
- `static/app/audio.js`: reproducción de sonidos.
- `static/css/styles.css`: estilos visuales.
- `static/app/tests/cycleManager.test.js`: pruebas del módulo de ciclos.

## Notas

La organización actual del proyecto usa `static/` como contenedor principal de la lógica, estilos e recursos multimedia, mientras que la entrada principal de la app sigue estando en la raíz con `index.html`.

La instalación y el modo sin conexión requieren servir la aplicación desde `http://localhost` o HTTPS; no están disponibles al abrir `index.html` mediante `file://`.
