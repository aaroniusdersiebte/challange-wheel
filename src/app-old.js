const { ipcRenderer } = require('electron');

class ChallengeWheelApp {
    constructor() {
        this.currentTab = 'wheels';
        this.wheels = [];
        this.challenges = [];
        this.sessions = [];
        this.settings = {};
        this.activeChallenge = null;
        this.challengeTimer = null;
        this.sessionStats = { amount: 0, challenges: 0 };
        this.totalStats = { amount: 0, challenges: 0 };
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.updateUI();
        this.setupHotkeys();
    }

    async loadData() {
        try {
            this.wheels = await ipcRenderer.invoke('get-store-data', 'wheels') || [];
            this.challenges = await ipcRenderer.invoke('get-store-data', 'challenges') || [];
            this.sessions = await ipcRenderer.invoke('get-store-data', 'sessions') || [];
            this.settings = await ipcRenderer.invoke('get-store-data', 'settings') || this.getDefaultSettings();
            
            this.calculateStats();
            this.initializeDefaultData();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    getDefaultSettings() {
        return {
            donationAmount: 5.00,
            superChance: 10,
            animationDuration: 3.0,
            infoPosition: 'right',
            obsWidth: 800,
            obsHeight: 600,
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
        if (this.challenges.length === 0) {
            this.challenges = [
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
                    title: 'Erreiche Level 5',
                    type: 'achieve',
                    target: 5,
                    timeLimit: 600,
                    image: '🎯',
                    isSuper: true
                }
            ];
            this.saveData();
        }

        if (this.wheels.length === 0) {
            this.wheels = [
                {
                    id: '1',
                    name: 'Standard Challenges',
                    challenges: this.challenges.map(c => c.id),
                    active: true
                }
            ];
            this.saveData();
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
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Wheel management
        document.getElementById('addWheelBtn').addEventListener('click', () => {
            this.showWheelModal();
        });

        // Challenge management
        document.getElementById('addChallengeBtn').addEventListener('click', () => {
            this.showChallengeModal();
        });

        // Donation controls
        document.getElementById('resetSessionBtn').addEventListener('click', () => {
            this.resetSession();
        });

        // Settings
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('showObsBtn').addEventListener('click', () => {
            ipcRenderer.invoke('show-obs-window');
        });

        document.getElementById('hideObsBtn').addEventListener('click', () => {
            ipcRenderer.invoke('hide-obs-window');
        });

        // Challenge controls
        document.getElementById('progressUpBtn').addEventListener('click', () => {
            this.adjustProgress(1);
        });

        document.getElementById('progressDownBtn').addEventListener('click', () => {
            this.adjustProgress(-1);
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('failBtn').addEventListener('click', () => {
            this.failChallenge();
        });

        document.getElementById('completeBtn').addEventListener('click', () => {
            this.completeChallenge();
        });

        // Modal close
        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideModal();
            }
        });
    }

    setupHotkeys() {
        ipcRenderer.on('hotkey-pressed', (event, action) => {
            switch (action) {
                case 'spinWheel':
                    this.spinRandomWheel();
                    break;
                case 'progressUp':
                    this.adjustProgress(1);
                    break;
                case 'progressDown':
                    this.adjustProgress(-1);
                    break;
                case 'challengeFailed':
                    this.failChallenge();
                    break;
                case 'pauseResume':
                    this.togglePause();
                    break;
            }
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        this.updateTabContent();
    }

    updateTabContent() {
        switch (this.currentTab) {
            case 'wheels':
                this.renderWheels();
                break;
            case 'challenges':
                this.renderChallenges();
                break;
            case 'donations':
                this.renderDonations();
                break;
            case 'settings':
                this.renderSettings();
                break;
        }
    }

    updateUI() {
        this.updateStats();
        this.updateTabContent();
    }

    updateStats() {
        document.getElementById('sessionAmount').textContent = `${this.sessionStats.amount.toFixed(2)}€`;
        document.getElementById('totalAmount').textContent = `${this.totalStats.amount.toFixed(2)}€`;
        document.getElementById('sessionStats').textContent = `${this.sessionStats.amount.toFixed(2)}€`;
        document.getElementById('sessionLost').textContent = this.sessionStats.challenges;
        document.getElementById('totalStats').textContent = `${this.totalStats.amount.toFixed(2)}€`;
        document.getElementById('totalLost').textContent = this.totalStats.challenges;
    }

    renderWheels() {
        const container = document.getElementById('wheelsGrid');
        container.innerHTML = '';

        this.wheels.forEach(wheel => {
            const wheelChallenges = wheel.challenges.map(id => 
                this.challenges.find(c => c.id === id)
            ).filter(Boolean);

            const wheelCard = document.createElement('div');
            wheelCard.className = 'wheel-card';
            wheelCard.innerHTML = `
                <div class="wheel-header">
                    <div class="wheel-title">${wheel.name}</div>
                    <div class="wheel-actions">
                        <button class="btn btn-sm btn-secondary" onclick="app.editWheel('${wheel.id}')">Bearbeiten</button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteWheel('${wheel.id}')">Löschen</button>
                    </div>
                </div>
                <div class="wheel-info">
                    ${wheelChallenges.length} Challenges
                </div>
                <div class="wheel-controls">
                    <button class="btn btn-primary" onclick="app.spinWheel('${wheel.id}')">Rad drehen</button>
                    <button class="btn btn-secondary" onclick="app.previewWheel('${wheel.id}')">Vorschau</button>
                </div>
            `;
            container.appendChild(wheelCard);
        });
    }

    renderChallenges() {
        const container = document.getElementById('challengesList');
        container.innerHTML = '';

        this.challenges.forEach(challenge => {
            const challengeItem = document.createElement('div');
            challengeItem.className = 'challenge-item';
            challengeItem.innerHTML = `
                <div class="challenge-image">${challenge.image}</div>
                <div class="challenge-details">
                    <div class="challenge-title">${challenge.title}</div>
                    <div class="challenge-meta">
                        ${this.getTypeDisplayName(challenge.type)}
                        ${challenge.target > 0 ? `• Ziel: ${challenge.target}` : ''}
                        • ${Math.floor(challenge.timeLimit / 60)}:${(challenge.timeLimit % 60).toString().padStart(2, '0')} min
                        ${challenge.isSuper ? '<span class="challenge-type super-challenge">SUPER</span>' : ''}
                    </div>
                </div>
                <div class="challenge-actions">
                    <button class="btn btn-sm btn-secondary" onclick="app.editChallenge('${challenge.id}')">Bearbeiten</button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteChallenge('${challenge.id}')">Löschen</button>
                </div>
            `;
            container.appendChild(challengeItem);
        });
    }

    renderDonations() {
        const container = document.getElementById('historyList');
        container.innerHTML = '';

        const allDonations = this.sessions.flatMap(session => 
            session.donations.map(donation => ({
                ...donation,
                sessionDate: session.date
            }))
        ).sort((a, b) => new Date(b.date) - new Date(a.date));

        allDonations.forEach(donation => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-details">
                    <div class="history-challenge">${donation.challengeTitle}</div>
                    <div class="history-time">${new Date(donation.date).toLocaleString('de-DE')}</div>
                </div>
                <div class="history-amount">+${donation.amount.toFixed(2)}€</div>
                <button class="history-delete" onclick="app.deleteDonation('${donation.id}')">×</button>
            `;
            container.appendChild(historyItem);
        });
    }

    renderSettings() {
        document.getElementById('donationAmount').value = this.settings.donationAmount;
        document.getElementById('superChance').value = this.settings.superChance;
        document.getElementById('animationDuration').value = this.settings.animationDuration;
        document.getElementById('infoPosition').value = this.settings.infoPosition;
        document.getElementById('obsWidth').value = this.settings.obsWidth;
        document.getElementById('obsHeight').value = this.settings.obsHeight;

        const hotkeyContainer = document.getElementById('hotkeyList');
        hotkeyContainer.innerHTML = '';

        const hotkeyLabels = {
            spinWheel: 'Rad drehen',
            progressUp: 'Fortschritt +1',
            progressDown: 'Fortschritt -1',
            challengeFailed: 'Challenge verloren',
            pauseResume: 'Pause/Resume'
        };

        Object.keys(this.settings.hotkeys).forEach(action => {
            const hotkeyItem = document.createElement('div');
            hotkeyItem.className = 'hotkey-item';
            hotkeyItem.innerHTML = `
                <div class="hotkey-label">${hotkeyLabels[action]}</div>
                <input type="text" class="hotkey-input" value="${this.settings.hotkeys[action]}" 
                       onchange="app.updateHotkey('${action}', this.value)">
            `;
            hotkeyContainer.appendChild(hotkeyItem);
        });

        const port = 3000;
        document.getElementById('obsUrl').value = `http://localhost:${port}/obs-overlay.html`;
    }

    getTypeDisplayName(type) {
        const types = {
            collect: 'Sammeln',
            survive: 'Überleben',
            achieve: 'Erreichen'
        };
        return types[type] || type;
    }

    async spinWheel(wheelId) {
        const wheel = this.wheels.find(w => w.id === wheelId);
        if (!wheel) return;

        const wheelChallenges = wheel.challenges.map(id => 
            this.challenges.find(c => c.id === id)
        ).filter(Boolean);

        if (wheelChallenges.length === 0) {
            alert('Dieses Rad hat keine Challenges!');
            return;
        }

        // Show OBS window and start spinning animation
        await ipcRenderer.invoke('show-obs-window');
        await ipcRenderer.invoke('update-obs-window', {
            action: 'spin',
            challenges: wheelChallenges,
            settings: this.settings
        });

        // Simulate spin delay
        setTimeout(() => {
            const selectedChallenge = this.selectRandomChallenge(wheelChallenges);
            this.startChallenge(selectedChallenge);
        }, this.settings.animationDuration * 1000);
    }

    spinRandomWheel() {
        const activeWheel = this.wheels.find(w => w.active) || this.wheels[0];
        if (activeWheel) {
            this.spinWheel(activeWheel.id);
        }
    }

    selectRandomChallenge(challenges) {
        // Check for super challenge
        const superChance = Math.random() * 100;
        let availableChallenges = challenges;

        if (superChance < this.settings.superChance) {
            const superChallenges = challenges.filter(c => c.isSuper);
            if (superChallenges.length > 0) {
                availableChallenges = superChallenges;
            }
        }

        return availableChallenges[Math.floor(Math.random() * availableChallenges.length)];
    }

    async startChallenge(challenge) {
        this.activeChallenge = {
            ...challenge,
            startTime: Date.now(),
            progress: 0,
            isPaused: false,
            timeRemaining: challenge.timeLimit
        };

        // Update OBS to show challenge
        await ipcRenderer.invoke('update-obs-window', {
            action: 'start-challenge',
            challenge: this.activeChallenge,
            settings: this.settings
        });

        // Show challenge panel
        document.getElementById('challengePanel').style.display = 'block';
        this.updateChallengePanel();
        this.startTimer();
    }

    startTimer() {
        if (this.challengeTimer) {
            clearInterval(this.challengeTimer);
        }

        this.challengeTimer = setInterval(() => {
            if (!this.activeChallenge || this.activeChallenge.isPaused) return;

            this.activeChallenge.timeRemaining--;
            this.updateChallengePanel();

            if (this.activeChallenge.timeRemaining <= 0) {
                this.failChallenge();
            }
        }, 1000);
    }

    updateChallengePanel() {
        if (!this.activeChallenge) return;

        document.getElementById('activeChallengeTitle').textContent = this.activeChallenge.title;
        
        const minutes = Math.floor(this.activeChallenge.timeRemaining / 60);
        const seconds = this.activeChallenge.timeRemaining % 60;
        document.getElementById('timerDisplay').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (this.activeChallenge.target > 0) {
            document.getElementById('progressDisplay').textContent = 
                `${this.activeChallenge.progress} / ${this.activeChallenge.target}`;
        } else {
            document.getElementById('progressDisplay').textContent = 
                `${Math.floor(this.activeChallenge.timeRemaining / 60)} min verbleibend`;
        }

        // Update OBS
        ipcRenderer.invoke('update-obs-window', {
            action: 'update-challenge',
            challenge: this.activeChallenge
        });
    }

    adjustProgress(amount) {
        if (!this.activeChallenge) return;

        this.activeChallenge.progress = Math.max(0, this.activeChallenge.progress + amount);
        this.updateChallengePanel();

        // Check if challenge is completed
        if (this.activeChallenge.target > 0 && this.activeChallenge.progress >= this.activeChallenge.target) {
            this.completeChallenge();
        }
    }

    togglePause() {
        if (!this.activeChallenge) return;

        this.activeChallenge.isPaused = !this.activeChallenge.isPaused;
        document.getElementById('pauseBtn').textContent = 
            this.activeChallenge.isPaused ? 'Resume' : 'Pause';
    }

    async completeChallenge() {
        if (!this.activeChallenge) return;

        clearInterval(this.challengeTimer);
        
        // Show success result
        await ipcRenderer.invoke('update-obs-window', {
            action: 'show-result',
            result: 'success',
            challenge: this.activeChallenge
        });

        this.endChallenge();
    }

    async failChallenge() {
        if (!this.activeChallenge) return;

        clearInterval(this.challengeTimer);
        
        // Add donation
        const donationAmount = this.activeChallenge.isSuper ? 
            this.settings.donationAmount * 2 : this.settings.donationAmount;
        
        this.addDonation(this.activeChallenge.title, donationAmount);

        // Show failure result
        await ipcRenderer.invoke('update-obs-window', {
            action: 'show-result',
            result: 'failure',
            challenge: this.activeChallenge,
            donation: donationAmount
        });

        this.endChallenge();
    }

    endChallenge() {
        this.activeChallenge = null;
        document.getElementById('challengePanel').style.display = 'none';
        
        // Hide OBS after delay
        setTimeout(() => {
            ipcRenderer.invoke('hide-obs-window');
        }, 5000);
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
        this.updateStats();
    }

    resetSession() {
        if (confirm('Möchten Sie die aktuelle Session wirklich zurücksetzen?')) {
            const sessionId = this.getCurrentSessionId();
            const session = this.sessions.find(s => s.id === sessionId);
            session.donations = [];
            this.saveData();
            this.calculateStats();
            this.updateUI();
        }
    }

    async saveSettings() {
        this.settings.donationAmount = parseFloat(document.getElementById('donationAmount').value) || 5.00;
        this.settings.superChance = parseInt(document.getElementById('superChance').value) || 10;
        this.settings.animationDuration = parseFloat(document.getElementById('animationDuration').value) || 3.0;
        this.settings.infoPosition = document.getElementById('infoPosition').value || 'right';
        this.settings.obsWidth = parseInt(document.getElementById('obsWidth').value) || 800;
        this.settings.obsHeight = parseInt(document.getElementById('obsHeight').value) || 600;

        await this.saveData();
        await ipcRenderer.invoke('update-hotkeys', this.settings.hotkeys);
        
        alert('Einstellungen gespeichert!');
    }

    updateHotkey(action, key) {
        this.settings.hotkeys[action] = key;
    }

    showModal(title, content, actions = []) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalContent').innerHTML = content;
        
        const actionsContainer = document.getElementById('modalActions');
        actionsContainer.innerHTML = '';
        actions.forEach(action => {
            const button = document.createElement('button');
            button.className = `btn ${action.class || 'btn-secondary'}`;
            button.textContent = action.text;
            button.onclick = action.onclick;
            actionsContainer.appendChild(button);
        });

        document.getElementById('modalOverlay').style.display = 'flex';
    }

    hideModal() {
        document.getElementById('modalOverlay').style.display = 'none';
    }

    showWheelModal(wheelId = null) {
        const isEdit = wheelId !== null;
        const wheel = isEdit ? this.wheels.find(w => w.id === wheelId) : null;

        const content = `
            <div class="form-group">
                <label>Rad Name:</label>
                <input type="text" id="wheelName" value="${wheel ? wheel.name : ''}" placeholder="Mein Challenge Rad">
            </div>
            <div class="form-group">
                <label>Challenges auswählen:</label>
                <div class="challenge-selection">
                    ${this.challenges.map(challenge => `
                        <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <input type="checkbox" value="${challenge.id}" 
                                ${wheel && wheel.challenges.includes(challenge.id) ? 'checked' : ''}>
                            <span>${challenge.image} ${challenge.title}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;

        const actions = [
            {
                text: 'Abbrechen',
                class: 'btn-secondary',
                onclick: () => this.hideModal()
            },
            {
                text: isEdit ? 'Speichern' : 'Erstellen',
                class: 'btn-primary',
                onclick: () => this.saveWheel(wheelId)
            }
        ];

        this.showModal(isEdit ? 'Rad bearbeiten' : 'Neues Rad erstellen', content, actions);
    }

    saveWheel(wheelId = null) {
        const name = document.getElementById('wheelName').value.trim();
        if (!name) {
            alert('Bitte geben Sie einen Namen für das Rad ein.');
            return;
        }

        const selectedChallenges = Array.from(document.querySelectorAll('.challenge-selection input:checked'))
            .map(input => input.value);

        if (selectedChallenges.length === 0) {
            alert('Bitte wählen Sie mindestens eine Challenge aus.');
            return;
        }

        if (wheelId) {
            const wheel = this.wheels.find(w => w.id === wheelId);
            wheel.name = name;
            wheel.challenges = selectedChallenges;
        } else {
            const newWheel = {
                id: Date.now().toString(),
                name,
                challenges: selectedChallenges,
                active: this.wheels.length === 0
            };
            this.wheels.push(newWheel);
        }

        this.saveData();
        this.hideModal();
        this.renderWheels();
    }

    editWheel(wheelId) {
        this.showWheelModal(wheelId);
    }

    deleteWheel(wheelId) {
        if (confirm('Möchten Sie dieses Rad wirklich löschen?')) {
            this.wheels = this.wheels.filter(w => w.id !== wheelId);
            this.saveData();
            this.renderWheels();
        }
    }

    showChallengeModal(challengeId = null) {
        const isEdit = challengeId !== null;
        const challenge = isEdit ? this.challenges.find(c => c.id === challengeId) : null;

        const content = `
            <div class="form-row">
                <div class="form-group">
                    <label>Challenge Titel:</label>
                    <input type="text" id="challengeTitle" value="${challenge ? challenge.title : ''}" 
                           placeholder="Sammle 10 Münzen">
                </div>
                <div class="form-group">
                    <label>Emoji/Icon:</label>
                    <input type="text" id="challengeImage" value="${challenge ? challenge.image : ''}" 
                           placeholder="🪙" maxlength="2">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Challenge Typ:</label>
                    <select id="challengeType">
                        <option value="collect" ${challenge && challenge.type === 'collect' ? 'selected' : ''}>
                            Sammeln (X Gegenstände sammeln)
                        </option>
                        <option value="survive" ${challenge && challenge.type === 'survive' ? 'selected' : ''}>
                            Überleben (Zeit überstehen)
                        </option>
                        <option value="achieve" ${challenge && challenge.type === 'achieve' ? 'selected' : ''}>
                            Erreichen (Ziel erreichen)
                        </option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Zielwert:</label>
                    <input type="number" id="challengeTarget" value="${challenge ? challenge.target : 10}" 
                           min="0" placeholder="10">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Zeitlimit (Sekunden):</label>
                    <input type="number" id="challengeTimeLimit" value="${challenge ? challenge.timeLimit : 180}" 
                           min="30" placeholder="180">
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="challengeSuper" 
                               ${challenge && challenge.isSuper ? 'checked' : ''}>
                        Super Challenge (2x Spende)
                    </label>
                </div>
            </div>
        `;

        const actions = [
            {
                text: 'Abbrechen',
                class: 'btn-secondary',
                onclick: () => this.hideModal()
            },
            {
                text: isEdit ? 'Speichern' : 'Erstellen',
                class: 'btn-primary',
                onclick: () => this.saveChallenge(challengeId)
            }
        ];

        this.showModal(isEdit ? 'Challenge bearbeiten' : 'Neue Challenge erstellen', content, actions);
    }

    saveChallenge(challengeId = null) {
        const title = document.getElementById('challengeTitle').value.trim();
        const image = document.getElementById('challengeImage').value.trim();
        const type = document.getElementById('challengeType').value;
        const target = parseInt(document.getElementById('challengeTarget').value) || 0;
        const timeLimit = parseInt(document.getElementById('challengeTimeLimit').value) || 180;
        const isSuper = document.getElementById('challengeSuper').checked;

        if (!title || !image) {
            alert('Bitte füllen Sie alle Pflichtfelder aus.');
            return;
        }

        if (challengeId) {
            const challenge = this.challenges.find(c => c.id === challengeId);
            Object.assign(challenge, { title, image, type, target, timeLimit, isSuper });
        } else {
            const newChallenge = {
                id: Date.now().toString(),
                title,
                image,
                type,
                target,
                timeLimit,
                isSuper
            };
            this.challenges.push(newChallenge);
        }

        this.saveData();
        this.hideModal();
        this.renderChallenges();
    }

    editChallenge(challengeId) {
        this.showChallengeModal(challengeId);
    }

    deleteChallenge(challengeId) {
        if (confirm('Möchten Sie diese Challenge wirklich löschen?')) {
            this.challenges = this.challenges.filter(c => c.id !== challengeId);
            
            // Remove from wheels
            this.wheels.forEach(wheel => {
                wheel.challenges = wheel.challenges.filter(id => id !== challengeId);
            });

            this.saveData();
            this.renderChallenges();
        }
    }

    deleteDonation(donationId) {
        if (confirm('Möchten Sie diesen Spendeneintrag wirklich löschen?')) {
            this.sessions.forEach(session => {
                session.donations = session.donations.filter(d => d.id !== donationId);
            });
            this.saveData();
            this.calculateStats();
            this.updateUI();
        }
    }
}

// Initialize app
const app = new ChallengeWheelApp();

// Make app globally available for onclick handlers
window.app = app;