# ytmusic-review — Web App de Revisión Móvil

App web para revisar y resolver las canciones pendientes del proceso ytmusic-sync,
directamente desde el celular con una interfaz estilo Tinder.

## Dependencias principales

| Paquete                | Versión   | Propósito                              |
|------------------------|-----------|----------------------------------------|
| next                   | 15.x      | Framework React (App Router)           |
| react / react-dom      | 19.x      | UI                                     |
| @supabase/supabase-js  | latest    | Leer/escribir pendientes y decisiones  |
| framer-motion          | latest    | Animaciones de swipe de las tarjetas   |
| tailwindcss            | 4.x       | Estilos utility-first                  |
| typescript             | 5.x       | Tipado estático                        |

## Variables de entorno (.env.local)

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key-de-supabase
SPOTIFY_CLIENT_ID=tu-client-id
SPOTIFY_CLIENT_SECRET=tu-client-secret
```

## Comandos

```bash
npm run dev     # Servidor de desarrollo local
npm run build   # Build de producción
npm start       # Servidor de producción
```

## Deploy en Vercel

1. Push a GitHub
2. Importar en vercel.com
3. Agregar las variables de entorno en Vercel Dashboard
4. Deploy automático en cada push
