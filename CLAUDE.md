# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is **Challenge Wheel OBS**, a comprehensive Electron desktop application for Windows that provides a challenge wheel tool for OBS streaming with integrated donation tracking. The application features a dark glassmorphism UI design and provides seamless OBS integration through browser sources.

## Development Commands

- `npm install` - Install dependencies
- `npm start` - Start the application in production mode
- `npm run dev` - Start in development mode with DevTools enabled
- `npm run build` - Build the application for distribution
- `npm run build:win` - Build specifically for Windows
- `npm run dist` - Create distribution packages

## Project Structure

```
src/
├── main.js              # Main Electron process (window management, IPC, hotkeys)
├── index.html           # Main application UI
├── app.js               # Main application orchestrator (initializes all modules)
├── data-manager.js      # Data persistence and management (electron-store)
├── ui-manager.js        # UI rendering and modal management
├── challenge-system.js  # Challenge logic, wheel spinning, and timers
├── emoji-picker.js      # Emoji selection component for challenges
├── styles.css           # Main application styles (dark glassmorphism theme)
├── desktop-overlay.html # Desktop overlay window for challenge display
└── desktop-overlay.js   # Desktop overlay logic and animations

assets/                  # Static assets and icons
```

## Key Features

- **Challenge Wheel System**: Multiple configurable wheels with CS:GO-style spin animations
- **Challenge Types**: Collect (gather X items), Survive (endure X time), Achieve (reach goal in X time)
- **Super Challenges**: Configurable percentage chance for double donation multiplier
- **OBS Integration**: Transparent overlay window with glassmorphism design for streaming
- **Donation Tracking**: Session-based and lifetime statistics with detailed history
- **Global Hotkeys**: Configurable hotkeys that work when app is not in focus
- **Data Persistence**: JSON-based storage using electron-store

## Technical Architecture

The application follows a modular architecture with clear separation of concerns:

- **Main Process** (`main.js`): Handles window management, global shortcuts, IPC communication, and Express server for web interface
- **Application Orchestrator** (`app.js`): Initializes and coordinates all modules, handles global events and hotkeys
- **Data Management** (`data-manager.js`): Manages electron-store operations, data persistence, and validation
- **UI Management** (`ui-manager.js`): Handles DOM manipulation, modal management, form validation, and tab switching
- **Challenge System** (`challenge-system.js`): Manages wheel spinning logic, challenge timers, donation tracking, and overlay communication
- **Emoji Picker** (`emoji-picker.js`): Provides emoji selection functionality for challenge customization
- **Desktop Overlay** (`desktop-overlay.js`): Separate transparent window for desktop challenge display with animations

## Key Libraries

- `electron`: Desktop application framework (v28.0.0)
- `electron-store`: Persistent JSON-based data storage (v8.1.0)  
- `electron-builder`: Application building and distribution (v24.6.4)
- `express`: Web server for browser-based overlay interface (v4.18.2)

## Data Structure

The application stores data in the following JSON structure:
- `wheels`: Array of challenge wheels with associated challenge IDs
- `challenges`: Array of challenge definitions with type, target, time limit, and super status
- `sessions`: Array of daily sessions containing donation records
- `settings`: Application configuration including hotkeys, OBS settings, and donation amounts

## Development Notes

- **Modular Architecture**: The application is split into focused modules for maintainability and testing
- **Dual-Window System**: Main application window and separate desktop overlay window
- **IPC Communication**: Main process handles global shortcuts and communicates with renderer via IPC
- **Real-time Updates**: Challenge timers and states are synchronized across windows in real-time
- **Express Integration**: Local web server serves overlay interface for OBS Browser Sources
- **Data Validation**: All user inputs are validated before storage using data-manager module
- **Event-Driven**: Uses custom event system for loose coupling between modules
- **CSS Animations**: Smooth wheel spinning and overlay transitions using CSS transforms
- **Responsive Design**: Adaptive UI supports different screen resolutions and overlay configurations
- **Error Handling**: Comprehensive error handling with user-friendly feedback