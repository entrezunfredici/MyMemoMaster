# Captures d'écran Google Play

Google Play demande de 2 à 8 captures téléphone. Format **1080 × 1920 (9:16)** : un rapport supérieur à 2:1 est refusé,
or l'émulateur par défaut (Pixel 6) fait 1080 × 2400 (2,22:1).

## Méthode (émulateur Android)

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb shell wm size 1080x1920                       # écran 9:16
& $adb shell settings put global sysui_demo_allowed 1 # barre d'état neutre (heure, batterie, pas de notifications)
& $adb shell am broadcast -a com.android.systemui.demo -e command enter
& $adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1000
& $adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
& $adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
# … ouvrir l'écran voulu dans l'app, puis :
& $adb shell screencap -p /sdcard/c.png; & $adb pull /sdcard/c.png captures\01-accueil.png
# Fin :
& $adb shell am broadcast -a com.android.systemui.demo -e command exit
& $adb shell wm size reset
```

## Écrans retenus (compte avec données réelles)

1. Accueil · 2. Éditeur de carte mentale · 3. Liste des systèmes Leitner · 4. Session de flashcards ·
5. Liste ou détail d'exercice · 6. Calendrier · 7. Ma progression

À éviter : Profil et Réglages (adresse e-mail visible), écrans vides. Vérifier qu'aucune donnée personnelle n'apparaît.
