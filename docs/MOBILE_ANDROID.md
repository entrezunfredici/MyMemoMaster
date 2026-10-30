# Application mobile Android — build, test et publication

L'application Android est le **front Vue embarqué tel quel dans une WebView** (Capacitor 8). Elle n'embarque ni API, ni base de
données : elle appelle l'API de prod (`https://api.my-memo-master.com/api/v1`) et a donc besoin du réseau.

- Identifiant : `com.vocklor.mymemomaster` — nom affiché : `MyMemoMaster`
- Origine vue par l'API : `https://localhost` (WebView Capacitor, `androidScheme: https`)
- Code : `my_memo_master_front/` (+ projet natif généré dans `my_memo_master_front/android/`)

## Prérequis poste

| Outil | Version | Note |
|-------|---------|------|
| Node.js | 22 | comme le reste du projet |
| JDK | **21** | `JAVA_HOME` doit pointer dessus (le `java` du PATH peut être plus ancien) |
| SDK Android | plateforme **36**, build-tools **36.0.0** | `sdkmanager "platforms;android-36" "build-tools;36.0.0"` |

## Prérequis serveur (bloquant pour la prod)

L'API de prod doit autoriser l'origine `https://localhost` dans `CORS_ORIGIN`. La valeur est déjà dans le dépôt
(`helm/values-prod.yaml`, `k8s/*/configmap.yml`, `docker-compose.yml`, `.env.example`) **mais doit être déployée**.
Vérification (doit renvoyer `access-control-allow-origin: https://localhost`) :

```bash
curl -s -i -X OPTIONS https://api.my-memo-master.com/api/v1/users/login \
  -H "Origin: https://localhost" -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
```

Au 2026-10-14, la prod répondait pour `https://app.my-memo-master.com` mais **pas** pour `https://localhost`.

## Scripts (dans `my_memo_master_front/`)

| Commande | Effet |
|----------|-------|
| `npm run build:mobile:prod` | build Vue en mode `mobile` (`.env.mobile` → API de prod) puis `cap sync android` |
| `npm run build:mobile` | build avec **vos** variables d'environnement (`VITE_API_URL`…), pour les tests locaux |
| `npm run android:assets` | régénère icônes, splash et visuels Play Store depuis `public/logo/*.svg` |
| `npm run mobile:open` | ouvre le projet dans Android Studio |

## Produire la version de production

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"   # adapter au chemin local
cd my_memo_master_front
npm run build:mobile:prod
cd android
.\gradlew.bat bundleRelease      # → app\build\outputs\bundle\release\app-release.aab
```

### Signature (une seule fois)

1. Générer la clé, **hors du dépôt**, et la sauvegarder (la perdre empêche toute mise à jour de l'app) :
   `keytool -genkeypair -v -keystore mymemomaster-release.jks -alias mymemomaster -keyalg RSA -keysize 2048 -validity 10000`
2. Copier `android/keystore.properties.example` en `android/keystore.properties` et renseigner chemin + mots de passe
   (fichier ignoré par git, comme `*.jks` et `*.keystore`).
3. `bundleRelease` signe alors automatiquement. Sans ce fichier, l'`.aab` est **non signé** (refusé par Google Play).
   Contrôle : `jarsigner -verify app\build\outputs\bundle\release\app-release.aab` → `jar verified.`

Avec Google Play App Signing (recommandé, proposé à la création de l'app), cette clé est la *clé d'envoi*.

### Numéro de version

À **chaque** envoi sur le Play Store, incrémenter dans `android/app/build.gradle` :
`versionCode` (entier strictement croissant) et `versionName` (texte affiché, ex. `1.0.1`).

## Tester sur un appareil

- **Téléphone physique** : activer le débogage USB, puis
  `adb install -r app\build\outputs\apk\debug\app-debug.apk` après `gradlew.bat assembleDebug`
  (build `build:mobile:prod`, donc contre la prod).
- **Émulateur contre l'API Docker locale** : Traefik route l'API par nom d'hôte (`Host(localhost)`), donc `10.0.2.2` renvoie
  404 sans CORS. Procédure : `adb reverse tcp:8081 tcp:80`, build avec
  `VITE_API_URL=http://localhost:8081/api/v1`, et, **pour ce test seulement**, `server.cleartext: true` +
  `android.allowMixedContent: true` dans `capacitor.config.json` (à ne pas committer ; `adb reverse` est perdu au
  redémarrage de l'émulateur). Voir `.agents/DECISIONS.md` (2026-10-13).

## Visuels

`npm run android:assets` produit, à partir du logo : icônes de lanceur (carrée, ronde, couche adaptative), écrans de
démarrage (fond `#1E3BA1`) et, dans `docs/mobile/store/`, l'icône Play 512 × 512 et le graphique 1024 × 500.
Les captures d'écran de la fiche sont dans `docs/mobile/store/captures/`. Détails de la fiche : `docs/mobile/FICHE_STORE.md`.

## CI

Les branches `android_*` passent par la CI en mode « front uniquement » (tests Vitest avec couverture, lint, audit
des dépendances, build, audit de contraste RGAA). Elles ne déclenchent **aucun déploiement** (`cd.yml` est limité à
`main`, `staging`, `dev`). Le build Android lui-même (Gradle) n'est pas exécuté en CI.

## Points de vigilance

- Le jeton de session est dans le `localStorage` de la WebView (pas de stockage sécurisé natif) ; `allowBackup` est donc
  désactivé dans le manifeste pour qu'il ne soit pas restauré sur un autre appareil.
- Pas de mode hors-ligne : sans réseau, l'app affiche « Impossible de joindre le serveur ».
- Le service worker de la PWA est inutile dans la WebView (aucun effet).
