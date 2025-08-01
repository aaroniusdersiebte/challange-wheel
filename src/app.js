// Main Application - Orchestrates all modules
const { ipcRenderer } = require('electron');

// Import modules
const DataManager = require('./data-manager.js');
const UIManager = require('./ui-manager.js');
const ChallengeSystem = require('./challenge-system.js');

class ChallengeWheelApp {
    constructor() {
        console.log('Initializing Challenge Wheel App...');
        
        // Initialize modules
        this.dataManager = new DataManager();
        this.uiManager = new UIManager(this.dataManager);
        this.challengeSystem = new ChallengeSystem(this.dataManager, this.uiManager);
        
        // Make modules globally available for onclick handlers
        window.dataManager = this.dataManager;
        window.uiManager = this.uiManager;
        window.challengeSystem = this.challengeSystem;
        
        this.init();
    }

    async init() {
        try {
            console.log('Loading data...');
            await this.dataManager.loadData();
            
            console.log('Setting up UI...');
            this.uiManager.init();
            
            console.log('Setting up hotkeys...');
            this.setupHotkeys();
            
            console.log('Setting up additional event listeners...');
            this.setupEventListeners();
            
            console.log('App initialization complete!');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            alert('Fehler beim Starten der Anwendung. Bitte DevTools öffnen (Strg+Shift+I) und Console prüfen.');
        }
    }

    setupHotkeys() {
        ipcRenderer.on('hotkey-pressed', (event, action) => {
            this.challengeSystem.handleHotkey(action);
        });
    }

    setupEventListeners() {
        // Wheel management
        document.getElementById('addWheelBtn').addEventListener('click', () => {
            this.uiManager.showWheelModal();
        });

        // Challenge management
        document.getElementById('addChallengeBtn').addEventListener('click', () => {
            this.uiManager.showChallengeModal();
        });

        // Donation controls
        document.getElementById('resetSessionBtn').addEventListener('click', () => {
            this.uiManager.resetSession();
        });

        document.getElementById('exportHistoryBtn').addEventListener('click', () => {
            this.exportHistory();
        });

        // Settings
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.uiManager.saveSettings();
        });

        // Add keyboard shortcuts for better UX
        document.addEventListener('keydown', (e) => {
            // ESC to close modals
            if (e.key === 'Escape') {
                const modal = document.getElementById('modalOverlay');
                if (modal.style.display === 'flex') {
                    this.uiManager.hideModal();
                }
            }
            
            // Tab navigation with Ctrl+Number
            if (e.ctrlKey && !e.shiftKey && !e.altKey) {
                const tabKeys = ['1', '2', '3', '4'];
                const tabNames = ['wheels', 'challenges', 'donations', 'settings'];
                const keyIndex = tabKeys.indexOf(e.key);
                
                if (keyIndex !== -1) {
                    e.preventDefault();
                    this.uiManager.switchTab(tabNames[keyIndex]);
                }
            }
        });

        // Better error handling for forms
        document.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent form submission
        });

        // Auto-save settings on input change (debounced)
        let settingsTimeout;
        document.addEventListener('input', (e) => {
            if (e.target.closest('#settings-tab')) {
                clearTimeout(settingsTimeout);
                settingsTimeout = setTimeout(() => {
                    console.log('Auto-saving settings...');
                    // Only save non-critical settings automatically
                }, 2000);
            }
        });
    }

    exportHistory() {
        try {
            const allDonations = this.dataManager.sessions.flatMap(session => 
                session.donations.map(donation => ({
                    ...donation,
                    sessionDate: session.date
                }))
            ).sort((a, b) => new Date(b.date) - new Date(a.date));

            const csvContent = [
                'Datum,Challenge,Betrag,Session',
                ...allDonations.map(d => 
                    `${new Date(d.date).toLocaleDateString('de-DE')},${d.challengeTitle},${d.amount},${new Date(d.sessionDate).toLocaleDateString('de-DE')}`
                )
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `challenge-wheel-historie-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            console.log('History exported successfully');
        } catch (error) {
            console.error('Error exporting history:', error);
            alert('Fehler beim Exportieren der Historie.');
        }
    }

    // Public API methods for backward compatibility
    getDataManager() {
        return this.dataManager;
    }

    getUIManager() {
        return this.uiManager;
    }

    getChallengeSystem() {
        return this.challengeSystem;
    }

    // Health check method
    isHealthy() {
        return !!(this.dataManager && this.uiManager && this.challengeSystem);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new ChallengeWheelApp();
    });
} else {
    window.app = new ChallengeWheelApp();
}

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // Don't show alerts for every error, just log them
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault(); // Prevent the default browser behavior
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChallengeWheelApp;
}