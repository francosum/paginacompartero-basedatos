# Catalogo de aves

Archivos:

- `Clements_v2025-October-2025.csv`: CSV original descargado desde Cornell Lab, eBird/Clements Checklist v2025.
- `birds_clements_v2025_import.csv`: version normalizada para importar en la tabla `public.birds`.

Notas de datos:

- El archivo importable incluye 11.167 especies.
- La fuente trae nombres, taxonomia, familia y descripcion de distribucion/rango.
- `habitat` queda como columna preparada, pero vacia, porque el CSV Clements no publica habitat por especie.
- `country_text` se usa solo cuando el rango menciona Uruguay; para busquedas por pais la app tambien busca dentro de `range_text`.
