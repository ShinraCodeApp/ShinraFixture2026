# Play Store Build — ShinraFixture 2026

## Prerequisitos

- Cuenta en [expo.dev](https://expo.dev) con usuario `shinracode`
- EAS CLI instalado: `npm install -g eas-cli`
- Login: `eas login` → ingresar credenciales de `shinracode`

---

## 1. Keystore de producción (solo la primera vez)

EAS genera y almacena el keystore automáticamente en sus servidores. Para generarlo:

```bash
cd apps/mobile
eas credentials
```

Seleccionar:
- Platform: Android
- Profile: production
- → "Set up a new keystore" (EAS lo genera y guarda)

**Importante**: Guardar una copia del keystore con:
```bash
eas credentials --platform android
# Elegir "Download keystore"
```

Guardarlo en un lugar seguro (ej: Google Drive privado). Si se pierde el keystore, no se puede actualizar la app en Play Store.

---

## 2. Build de producción (AAB para Play Store)

```bash
cd apps/mobile
eas build --platform android --profile production
```

Esto genera un `.aab` (Android App Bundle) listo para Play Store.

- El build tarda ~10-15 minutos en los servidores de EAS.
- Al terminar, EAS da un link para descargar el `.aab`.

---

## 3. Build de preview (APK para testing)

```bash
cd apps/mobile
eas build --platform android --profile preview
```

Genera un APK que puede instalarse directamente en cualquier Android.

---

## 4. Subir a Play Store (manual)

1. Ir a [Google Play Console](https://play.google.com/console)
2. Crear nueva app → nombre: "ShinraFixture 2026"
3. Completar el listing:
   - **Descripción corta** (80 chars): "Seguí el Mundial 2026 con predicciones, stats y análisis con IA"
   - **Descripción larga**: Ver `docs/play-store-description.txt`
   - **Icono**: 512x512 PNG — usar `assets/branding/SCFixture1.png` (redimensionar)
   - **Feature graphic**: 1024x500 PNG — crear banner del Mundial
   - **Screenshots**: mínimo 2, máximo 8 por tipo de dispositivo
4. En "Versiones" → "Producción" → subir el `.aab`
5. En "Configuración de la app" → "Política de privacidad" → `https://shinracode.github.io/ShinraFixture2026/privacy`

---

## 5. Actualizaciones OTA (sin nuevo build)

Para cambios que no requieren binario nuevo (JS/assets solamente):

```bash
cd apps/mobile
eas update --channel production --message "Fix: descripción del cambio"
```

Los usuarios reciben la actualización automáticamente al abrir la app.

---

## 6. Incrementar versión

Antes de un nuevo build con cambios importantes:

En `app.json`:
```json
"version": "1.0.3",       // ← incrementar para usuarios
"versionCode": 5,          // ← incrementar siempre (Play Store requiere número único)
```

---

## Checklist antes de subir

- [ ] `versionCode` incrementado en `app.json`
- [ ] Build exitoso con `eas build --profile production`
- [ ] Privacy policy hosteada en GitHub Pages
- [ ] Screenshots preparados (mínimo 2 teléfonos Android)
- [ ] Feature graphic 1024x500
- [ ] Icono 512x512 PNG
- [ ] Descripción revisada
