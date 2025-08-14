// Data Manager - Handles all data persistence and calculations
const { ipcRenderer } = require('electron');

class DataManager {
    constructor() {
        this.wheels = [];
        this.challenges = []; // Legacy global challenges - to be migrated
        this.sessions = [];
        this.settings = {};
        this.sessionStats = { amount: 0, challenges: 0 };
        this.totalStats = { amount: 0, challenges: 0 };
        this.activeWheelId = null;
    }

    async loadData() {
        try {
            this.wheels = await ipcRenderer.invoke('get-store-data', 'wheels') || [];
            this.challenges = await ipcRenderer.invoke('get-store-data', 'challenges') || [];
            this.sessions = await ipcRenderer.invoke('get-store-data', 'sessions') || [];
            this.settings = await ipcRenderer.invoke('get-store-data', 'settings') || this.getDefaultSettings();
            this.activeWheelId = await ipcRenderer.invoke('get-store-data', 'activeWheelId') || null;
            
            this.calculateStats();
            this.initializeDefaultData();
            this.migrateToWheelSpecificChallenges();
            console.log('Data loaded successfully');
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    getDefaultSettings() {
        return {
            donationAmount: 5.00,
            superChance: 10,
            animationDuration: 3.0,
            sounds: {
                spinSoundType: 'ambient',
                progressSoundType: 'beep',
                warningSoundType: 'warning',
                customSounds: {}
            },
            hotkeys: {
                spinWheel: 'F1',
                progressUp: 'F2',
                progressDown: 'F3',
                challengeFailed: 'F4',
                pauseResume: 'F5'
            }
        };
    }

    initializeDefaultData() {
        if (this.wheels.length === 0) {
            const defaultChallenges = [
                {
                    id: '1',
                    title: 'Sammle 10 Münzen',
                    type: 'collect',
                    target: 10,
                    timeLimit: 180,
                    image: '🪙',
                    isSuper: false
                },
                {
                    id: '2',
                    title: 'Überlebe 5 Minuten',
                    type: 'survive',
                    target: 0,
                    timeLimit: 300,
                    image: '⏰',
                    isSuper: false
                },
                {
                    id: '3',
                    title: 'Maximum 3 Tode',
                    type: 'max',
                    target: 3,
                    timeLimit: 600,
                    image: '☠️',
                    isSuper: false
                }
            ];
            
            this.wheels = [
                {
                    id: '1',
                    name: 'Standard Challenges',
                    challenges: defaultChallenges,
                    isActive: true
                }
            ];
            this.activeWheelId = '1';
            this.saveData();
        }
        
        // Ensure we have an active wheel
        if (!this.activeWheelId || !this.getWheelById(this.activeWheelId)) {
            const firstWheel = this.wheels[0];
            if (firstWheel) {
                this.setActiveWheel(firstWheel.id);
            }
        }
    }

    calculateStats() {
        const currentSessionId = this.getCurrentSessionId();
        const currentSession = this.sessions.find(s => s.id === currentSessionId);
        
        if (currentSession) {
            this.sessionStats = {
                amount: currentSession.donations.reduce((sum, d) => sum + d.amount, 0),
                challenges: currentSession.donations.length
            };
        }

        this.totalStats = {
            amount: this.sessions.reduce((sum, s) => sum + s.donations.reduce((sum2, d) => sum2 + d.amount, 0), 0),
            challenges: this.sessions.reduce((sum, s) => sum + s.donations.length, 0)
        };
    }

    getCurrentSessionId() {
        const today = new Date().toDateString();
        let session = this.sessions.find(s => new Date(s.date).toDateString() === today);
        
        if (!session) {
            session = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                donations: []
            };
            this.sessions.push(session);
            this.saveData();
        }
        
        return session.id;
    }

    async saveData() {
        try {
            await ipcRenderer.invoke('set-store-data', 'wheels', this.wheels);
            await ipcRenderer.invoke('set-store-data', 'challenges', this.challenges);
            await ipcRenderer.invoke('set-store-data', 'sessions', this.sessions);
            await ipcRenderer.invoke('set-store-data', 'settings', this.settings);
            await ipcRenderer.invoke('set-store-data', 'activeWheelId', this.activeWheelId);
            console.log('Data saved successfully');
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    addDonation(challengeTitle, amount) {
        const sessionId = this.getCurrentSessionId();
        const session = this.sessions.find(s => s.id === sessionId);
        
        const donation = {
            id: Date.now().toString(),
            challengeTitle,
            amount,
            date: new Date().toISOString()
        };

        session.donations.push(donation);
        this.saveData();
        this.calculateStats();
        console.log('Donation added:', donation);
    }

    deleteDonation(donationId) {
        this.sessions.forEach(session => {
            session.donations = session.donations.filter(d => d.id !== donationId);
        });
        this.saveData();
        this.calculateStats();
        console.log('Donation deleted:', donationId);
    }

    resetSession() {
        const sessionId = this.getCurrentSessionId();
        const session = this.sessions.find(s => s.id === sessionId);
        session.donations = [];
        this.saveData();
        this.calculateStats();
        console.log('Session reset');
    }

    getTypeDisplayName(type) {
        const types = {
            collect: 'Sammeln',
            survive: 'Überleben',
            max: 'Maximum'
        };
        return types[type] || type;
    }

    // Wheel Management
    addWheel(wheel) {
        wheel.id = Date.now().toString();
        wheel.challenges = wheel.challenges || [];
        const isFirstWheel = this.wheels.length === 0;
        this.wheels.push(wheel);
        
        // Set as active if it's the first wheel
        if (isFirstWheel) {
            this.activeWheelId = wheel.id;
        }
        
        this.saveData();
        console.log('Wheel added:', wheel);
    }

    updateWheel(wheelId, updates) {
        const wheel = this.wheels.find(w => w.id === wheelId);
        if (wheel) {
            Object.assign(wheel, updates);
            this.saveData();
            console.log('Wheel updated:', wheelId);
        }
    }

    deleteWheel(wheelId) {
        this.wheels = this.wheels.filter(w => w.id !== wheelId);
        
        // If we deleted the active wheel, set a new one
        if (this.activeWheelId === wheelId) {
            const firstWheel = this.wheels[0];
            this.activeWheelId = firstWheel ? firstWheel.id : null;
        }
        
        this.saveData();
        console.log('Wheel deleted:', wheelId);
    }

    // Legacy Challenge Management (deprecated - use wheel-specific methods)
    addChallenge(challenge) {
        // Redirect to active wheel
        const activeWheel = this.getActiveWheel();
        if (activeWheel) {
            return this.addChallengeToWheel(activeWheel.id, challenge);
        }
        return null;
    }

    updateChallenge(challengeId, updates) {
        // Try to find and update in active wheel
        const activeWheel = this.getActiveWheel();
        if (activeWheel) {
            return this.updateWheelChallenge(activeWheel.id, challengeId, updates);
        }
        return false;
    }

    deleteChallenge(challengeId) {
        // Try to delete from active wheel
        const activeWheel = this.getActiveWheel();
        if (activeWheel) {
            return this.deleteChallengeFromWheel(activeWheel.id, challengeId);
        }
        return false;
    }

    getChallengeById(id) {
        // Search in all wheels for backwards compatibility
        for (const wheel of this.wheels) {
            const challenge = wheel.challenges.find(c => c.id === id);
            if (challenge) return challenge;
        }
        return null;
    }

    getWheelById(id) {
        return this.wheels.find(w => w.id === id);
    }

    getActiveWheel() {
        return this.wheels.find(w => w.id === this.activeWheelId) || this.wheels[0];
    }

    setActiveWheel(wheelId) {
        this.activeWheelId = wheelId;
        this.saveData();
        console.log('Active wheel set to:', wheelId);
    }

    // Migration function to convert old global challenges to wheel-specific
    migrateToWheelSpecificChallenges() {
        // Check if we need to migrate
        if (this.challenges.length > 0 && this.wheels.length > 0) {
            this.wheels.forEach(wheel => {
                // If wheel has challenge IDs instead of challenge objects, migrate
                if (wheel.challenges.length > 0 && typeof wheel.challenges[0] === 'string') {
                    const challengeObjects = wheel.challenges.map(id => 
                        this.challenges.find(c => c.id === id)
                    ).filter(Boolean);
                    
                    wheel.challenges = challengeObjects;
                }
            });
            
            // Clear old global challenges after migration
            this.challenges = [];
            this.saveData();
            console.log('Migrated to wheel-specific challenges');
        }
    }

    // Wheel-specific challenge management
    addChallengeToWheel(wheelId, challenge) {
        const wheel = this.getWheelById(wheelId);
        if (wheel) {
            challenge.id = Date.now().toString();
            wheel.challenges.push(challenge);
            this.saveData();
            console.log('Challenge added to wheel:', wheelId, challenge);
            return challenge.id;
        }
        return null;
    }

    updateWheelChallenge(wheelId, challengeId, updates) {
        const wheel = this.getWheelById(wheelId);
        if (wheel) {
            const challenge = wheel.challenges.find(c => c.id === challengeId);
            if (challenge) {
                Object.assign(challenge, updates);
                this.saveData();
                console.log('Challenge updated in wheel:', wheelId, challengeId);
                return true;
            }
        }
        return false;
    }

    deleteChallengeFromWheel(wheelId, challengeId) {
        const wheel = this.getWheelById(wheelId);
        if (wheel) {
            wheel.challenges = wheel.challenges.filter(c => c.id !== challengeId);
            this.saveData();
            console.log('Challenge deleted from wheel:', wheelId, challengeId);
            return true;
        }
        return false;
    }

    getChallengeFromWheel(wheelId, challengeId) {
        const wheel = this.getWheelById(wheelId);
        if (wheel) {
            return wheel.challenges.find(c => c.id === challengeId);
        }
        return null;
    }

    getActiveChallenges() {
        const activeWheel = this.getActiveWheel();
        return activeWheel ? activeWheel.challenges : [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}