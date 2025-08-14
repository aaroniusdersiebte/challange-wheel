# Challenge Wheel OBS 🎯

Ein Challenge-Wheel Tool für OBS-Streaming mit integriertem Spendentracking und schöner Dark-UI, das zufällige Challenges auswählt und visuell ansprechend in OBS darstellt.

![Challenge Wheel OBS](assets/screenshot.png)

## 🎮 Features

### Core Features
- **Multiple Challenge-Räder**: Erstellung und Verwaltung verschiedener Challenge-Räder
- **Challenge-Typen**:
  - "Schaffe X Sachen in Zeit Y" (z.B. sammle 5 Münzen in 3min)
  - "Überstehe Zeit X" (z.B. überlebe 2 Minuten)  
  - "Schaffe Aufgabe in Zeit X" (z.B. erreiche Level 10 in 5min)
- **Super Challenges**: Prozentuale Chance auf doppelte Spendenhöhe mit visueller Hervorhebung

### OBS Integration
- **Browser Source kompatibel**: Einfache Integration in OBS
- **Dark Apple Design**: Dunkle, glasmorphistische UI-Elemente
- **CS:GO-style Animation**: Rad mit rotem Auswahlstrich, einstellbare Animationsdauer
- **Responsive Display**: Challenge-Info Panel links oder rechts positionierbar
- **Live Challenge-View**: Timer, Fortschrittsanzeige, Zielkriterium während aktiver Challenge

### Spendentracking
- **Session-basiert**: Aktueller Session-Betrag prominent angezeigt
- **Gesamtübersicht**: Aufklappbare Historie mit Datum/Zeit/Challenge/Betrag
- **Verwaltung**: Falsche Einträge löschbar
- **Visualisierung**: Session-Gesamt vs. Allzeit-Gesamt

### Steuerung & Hotkeys
- **Konfigurierbare Hotkeys**:
  - Challenge-Rad triggern (Standard: F1)
  - Fortschritt +1/-1 (Standard: F2/F3)
  - Challenge als verloren markieren (Standard: F4)
  - Pause/Resume Timer (Standard: F5)
- **In-App Steuerung**: Click-to-interact während Challenge

## 🚀 Installation

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm oder yarn
- Windows (empfohlen, aber auch auf anderen Plattformen lauffähig)

### Setup
1. **Repository klonen oder Code herunterladen**
   ```bash
   git clone <repository-url>
   cd challenge-wheel-obs
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Application starten**
   ```bash
   # Produktionsstart
   npm start
   
   # Entwicklungsmodus (mit DevTools)
   npm run dev
   ```

4. **Build für Distribution** (optional)
   ```bash
   # Windows Build
   npm run build:win
   
   # Alle Plattformen
   npm run build
   ```

## 🎯 OBS Setup

### Browser Source einrichten
1. **Neue Browser Source** in OBS hinzufügen
2. **URL eingeben**: `file:///PFAD_ZUR_APP/src/obs-overlay.html`
   - Den exakten Pfad findest du in der App unter **Einstellungen → OBS Integration**
3. **Empfohlene Einstellungen**:
   - Breite: 800px
   - Höhe: 600px
   - FPS: 30
   - Hardware-Beschleunigung: Ein

### Browser Source URL kopieren
- In der App: **Einstellungen → OBS Integration → URL kopieren**
- Füge die URL direkt in OBS ein

## 🎮 Nutzung

### 1. Challenges erstellen
- **Challenges Tab** → **Neue Challenge erstellen**
- **Titel**, **Emoji/Icon**, **Typ** und **Zeitlimit** festlegen
- **Super Challenge** aktivieren für doppelte Spendenhöhe

### 2. Räder konfigurieren  
- **Räder Tab** → **Neues Rad erstellen**
- **Challenges auswählen** die im Rad erscheinen sollen
- **Mehrere Räder** für verschiedene Situationen erstellen

### 3. Streaming
- **Rad drehen** (Hotkey F1 oder Button in App)
- **Challenge wird angezeigt** in OBS mit Timer und Fortschritt
- **Fortschritt verfolgen** mit +1/-1 Hotkeys (F2/F3)
- **Challenge beenden** mit Erfolg/Verlust (F4 für verloren)

### 4. Spendentracking
- **Automatische Verfolgung** verlorener Challenges
- **Session-Statistiken** für aktuellen Stream
- **Historie einsehen** in Spenden-Tab
- **Falsche Einträge** manuell löschen

## ⚙️ Einstellungen

### OBS Integration
- **Browser Source URL**: Automatisch generiert
- **Fenstergröße**: Anpassbar für verschiedene Layouts
- **Info-Panel Position**: Links oder rechts vom Rad

### Spenden
- **Betrag pro verlorener Challenge**: Frei konfigurierbar
- **Super Challenge Wahrscheinlichkeit**: 0-100% einstellbar

### Hotkeys
- **Vollständig anpassbar**: Alle Funktionen mit eigenen Hotkeys
- **Global verfügbar**: Funktionieren auch wenn App nicht im Fokus

### Animation
- **Rad-Animation Dauer**: 1-10 Sekunden einstellbar
- **Challenge-Info Position**: Flexibel positionierbar

## 📁 Datenstruktur

Die App speichert alle Daten lokal in JSON-Dateien:

```json
{
  "wheels": [
    {
      "id": "1",
      "name": "Standard Challenges", 
      "challenges": ["1", "2", "3"],
      "active": true
    }
  ],
  "challenges": [
    {
      "id": "1",
      "title": "Sammle 10 Münzen",
      "type": "collect",
      "target": 10,
      "timeLimit": 180,
      "image": "🪙",
      "isSuper": false
    }
  ],
  "sessions": [
    {
      "id": "session1",
      "date": "2024-01-01",
      "donations": [
        {
          "id": "donation1",
          "challengeTitle": "Sammle 10 Münzen",
          "amount": 5.00,
          "date": "2024-01-01T10:00:00.000Z"
        }
      ]
    }
  ],
  "settings": {
    "donationAmount": 5.00,
    "superChance": 10,
    "animationDuration": 3.0,
    "hotkeys": { ... }
  }
}
```

## 🔧 Entwicklung

### Projekt-Struktur
```
src/
├── main.js              # Electron Hauptprozess
├── index.html           # Hauptanwendung UI
├── app.js               # Frontend Anwendungslogik
├── styles.css           # Hauptanwendung Styles
├── obs-overlay.html     # OBS Browser Source
├── obs-overlay.js       # OBS Overlay Logik
└── obs-styles.css       # OBS Overlay Styles

assets/                  # Statische Assets
package.json            # Dependencies und Scripts
```

### Dependencies
- **electron**: Desktop App Framework
- **electron-store**: Persistente Datenspeicherung
- **electron-builder**: Build und Distribution

### Development Scripts
```bash
# Development mit DevTools
npm run dev

# Production Build
npm run build

# Windows spezifischer Build  
npm run build:win

# Distribution Package
npm run dist
```

## 🎨 Customization

### Styling anpassen
- **Hauptapp**: `src/styles.css` bearbeiten
- **OBS Overlay**: `src/obs-styles.css` bearbeiten
- **Dark Theme**: CSS Custom Properties für einfache Anpassungen

### Neue Challenge-Typen
1. **Challenge-Typ** in `getDefaultSettings()` hinzufügen
2. **UI-Elemente** in Modals erweitern
3. **Logik** in `startChallenge()` implementieren

### Icons und Assets
- **Challenge Icons**: Emoji oder Unicode-Zeichen
- **App Icon**: `assets/icon.png` ersetzen
- **Screenshots**: `assets/` Ordner

## 🐛 Troubleshooting

### Häufige Probleme

**OBS zeigt keine Inhalte an**
- Browser Source URL korrekt eingegeben?
- Pfad existiert und ist erreichbar?
- Hardware-Beschleunigung in OBS aktiviert?

**Hotkeys funktionieren nicht**
- App als Administrator ausführen
- Andere Programme verwenden dieselben Hotkeys?
- Hotkey-Einstellungen überprüfen

**Challenge Timer läuft nicht**
- JavaScript-Fehler in Browser-Konsole?
- OBS Browser Source aktualisieren
- App neu starten

**Daten gehen verloren**
- Schreibrechte im App-Ordner?
- Antivirus blockiert Dateizugriffe?
- Backup der JSON-Dateien erstellen

### Logs und Debugging
- **Entwicklungsmodus**: `npm run dev` für DevTools
- **Electron Logs**: Console-Output in Terminal
- **OBS Browser Logs**: Browser Source → Eigenschaften → Interagieren

## 📄 Lizenz

MIT License - Siehe LICENSE Datei für Details.

## 🤝 Contributing

Beiträge sind willkommen! Bitte:
1. Fork das Repository
2. Feature Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen

## 📞 Support

Bei Problemen oder Fragen:
- **Issues**: GitHub Issues erstellen
- **Diskussionen**: GitHub Discussions
- **Dokumentation**: README und Code-Kommentare

---

**Viel Spaß beim Streamen mit Challenge Wheel OBS! 🎮✨**