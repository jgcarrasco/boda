# Fuente local para las invitaciones

Coloca aquí una copia **con licencia** de Amsterdam Two Slant con este nombre:

```text
tools/fonts/Amsterdam-Two-Slant.ttf
```

También puedes mantenerla en cualquier otra ubicación y ejecutar:

```bash
python3 tools/generate_invitations.py --font /ruta/Amsterdam-Two-Slant.ttf
```

El archivo de fuente está excluido de Git y no se publica como webfont. Solo se
usa localmente para convertir los nombres en píxeles dentro del JPEG del sobre.
Las páginas e imágenes ya generadas sí son completamente estáticas.
