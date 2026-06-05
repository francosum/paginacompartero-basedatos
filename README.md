# Compartero

Compartero es una plataforma web real para observadores de aves. La app usa React, TypeScript,
Vite y Supabase para autenticacion, base de datos, Storage y seguridad con Row Level Security.

No incluye datos ficticios. Si Supabase no esta configurado, la interfaz muestra estados como
`Configura Supabase para activar esta funcion` o `No hay datos disponibles todavia`.

## Requisitos

- Node.js 18 o superior
- Un proyecto de Supabase
- Buckets publicos de Storage creados por la migracion: `sighting-photos` y `avatars`

## Instalacion local

```bash
npm install
npm run dev
```

La app queda disponible en `http://127.0.0.1:5173`.

## Variables de entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Completa:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
```

Usa solamente la anon public key en el frontend. No pongas service role keys en Vite.

## Configurar Supabase

1. Abre Supabase SQL Editor.
2. Ejecuta `supabase/migrations.sql`.
3. En Authentication, habilita Email/Password.
4. Ajusta si quieres confirmacion por correo.
5. Verifica que existan los buckets `sighting-photos` y `avatars`.

La migracion crea:

- `profiles`
- `bird_species`
- `sightings`
- `likes`
- `comments`
- `saved_sightings`
- vistas reales para perfiles y rankings
- politicas RLS para que cada usuario edite solo lo suyo
- politicas de Storage por carpeta de usuario

## Cargar especies reales

La app no trae seed de especies. Un usuario autenticado puede registrar una especie desde
`Especies`, pero debe completar:

- nombre comun
- nombre cientifico
- familia
- estado de conservacion
- fuente
- URL de fuente

Ejemplos de fuentes validas: IUCN, IOC World Bird List, eBird/Clements, GBIF u organismos
oficiales. No agregues descripciones sin fuente.

## Flujo funcional

- Registro, login, logout y recuperacion con Supabase Auth
- Perfil publico con avatar, pais, bio, fecha y conteos reales
- Registro de especies verificadas
- Publicacion de avistamientos con foto real en Supabase Storage
- Feed real con likes, comentarios, guardados y compartir
- Busqueda y filtros de especies
- Mapa Leaflet con marcadores solo para avistamientos con coordenadas
- Rankings basados solo en datos reales
- Modo oscuro y responsive para celular, tablet y escritorio

## Build

```bash
npm run build
```

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. Configura las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Build command: `npm run build`.
4. Output directory: `dist`.

## Deploy en Netlify

1. Crea un nuevo sitio desde Git.
2. Build command: `npm run build`.
3. Publish directory: `dist`.
4. Agrega las mismas variables de entorno.

## Seguridad

- RLS esta habilitado en todas las tablas.
- Los perfiles son publicos para lectura, pero cada usuario solo edita el suyo.
- Los avistamientos solo los crea, edita o borra su autor.
- Likes, comentarios y guardados se vinculan al usuario autenticado.
- Los guardados son privados.
- Las fotos y avatares se suben a una carpeta con el `auth.uid()` del usuario.
- Los comentarios se sanitizan en frontend y se validan en base.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```
