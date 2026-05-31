# 🎧 EchoFan

Juego de adivinar canciones por fragmentos progresivos (1s → 2s → 4s → 8s → 16s → 30s), al estilo *Heardle*, pero pudiendo elegir de dónde salen las canciones: un artista, una mezcla de artistas, un género por idioma o los top charts del momento.

Hecho con React + TypeScript + Vite. Sin backend ni claves: usa la API pública de iTunes.

---

## 🚀 Cómo arrancarlo

### Opción rápida (Windows)
Doble clic en **`start.bat`**. La primera vez instala dependencias solo; después abre el navegador en `http://localhost:5173`.

### Opción manual
```bash
npm install
npm run dev
```

Requiere [Node.js](https://nodejs.org) 18+.

---

## 🎮 Modos y opciones

**Tipos de reto (fuente de canciones)**
- 🎤 **Artista** — canciones de un solo artista o grupo.
- 🎭 **Mezcla de artistas** — combina 2-3 artistas en un mismo pool (intercalados).
- 🎸 **Género + idioma** — lo más sonado de un género (Pop, Rock, Hip-Hop, Metal…) por idioma.
- 🔥 **Top charts** — los hits del momento por idioma.

**Modos de juego**
- **Por rondas** (5 / 10 / 20).
- **Supervivencia** — vidas (1 / 3 / 5); fallar cuesta una vida. Bonus por racha (multiplicador x1 → x5).
- **Multijugador local** — pasar y jugar por turnos, con clasificación final.
- 📅 **Reto diario** — una canción fija por día, igual para todos, con resultado compartible.

**Extras**
- Dificultad (fácil/medio/difícil) que cambia el tamaño del pool y el sesgo a hits o rarezas.
- Variante **"adivina el artista"** en pools con varios artistas.
- Autocompletado que busca por título y por artista.
- Récords guardados por reto + dificultad + modo (localStorage).
- Confeti y efectos de sonido sintetizados.

---

## 🛠️ Stack

- **React 19** + **TypeScript**
- **Vite** (dev server y build)
- **Framer Motion** (animaciones)
- **lucide-react** (iconos)
- **canvas-confetti**
- **Web Audio API** (sonidos sintetizados)
- **API de iTunes** (búsqueda, lookup y feeds RSS de top songs)

---

## 📁 Estructura

```
src/
├─ api/
│  └─ itunes.ts        # Llamadas a la API de iTunes (artistas, tracks, RSS por género/charts)
├─ game/
│  ├─ source.ts        # Abstracción "fuente de canciones" (artista/mezcla/género/charts)
│  ├─ difficulty.ts    # Pools y pesos por dificultad
│  ├─ mode.ts          # Config de modo de juego
│  ├─ normalize.ts     # Normalización de títulos + comparación (Levenshtein)
│  ├─ storage.ts       # Récords en localStorage
│  ├─ daily.ts         # Semilla y resultado del reto diario
│  ├─ sounds.ts        # Efectos de sonido (Web Audio)
│  └─ confetti.ts      # Confeti
├─ components/
│  ├─ Landing.tsx      # Pantalla de inicio
│  ├─ SourcePicker.tsx # Selección del tipo de reto
│  ├─ ArtistSearch.tsx # Buscador de artistas
│  ├─ Game.tsx         # Motor del juego (franjas, rondas, supervivencia)
│  ├─ DailyGame.tsx    # Reto diario
│  ├─ Multiplayer.tsx  # Multijugador local
│  └─ GuessInput.tsx   # Input con autocompletado
└─ App.tsx             # Enrutado de vistas y ajustes
```

---

## ⚠️ Sobre la API de iTunes

- Sin clave ni login; CORS abierto, se llama desde el navegador.
- Solo ofrece **previews de 30 s** (no canciones completas).
- **No filtra por idioma**: se aproxima usando la tienda de cada país, así que un "rock español" tira a local pero puede colar algún hit internacional.
- Límite no documentado (~20 peticiones/min por IP); el juego hace pocas por sesión.
- Pensado como proyecto personal/educativo. Para uso comercial habría que revisar los términos de Apple o migrar a MusicKit.

---

## 📦 Scripts

```bash
npm run dev       # servidor de desarrollo
npm run build     # build de producción (carpeta dist/)
npm run preview   # sirve la build de producción
npm run lint      # eslint
```
