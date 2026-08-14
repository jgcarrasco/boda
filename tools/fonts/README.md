# Fuentes locales para las invitaciones

Dos fuentes, ambas **excluidas de Git** y nunca publicadas como webfont. Solo se
usan localmente para convertir texto en píxeles. Las páginas e imágenes ya
generadas sí son completamente estáticas.

## 1. Brittany Signature (nombres de los sobres)

Copia **con licencia** (uso personal, Creatype Studio) con este nombre:

```text
tools/fonts/Brittany-Signature.ttf
```

También puedes mantenerla en cualquier otra ubicación y ejecutar:

```bash
python3 tools/generate_invitations.py --font /ruta/Brittany-Signature.ttf
```

## 2. Dancing Script (frases del sobre de testigos)

Copia con este nombre (licencia **OFL**, libre incluso para uso comercial):

```text
tools/fonts/Dancing-Script.ttf
```

También puedes mantenerla en cualquier otra ubicación y ejecutar:

```bash
python3 tools/generate_invitations.py --witness-font /ruta/Dancing-Script.ttf
```
