// UI Manager - Handles all UI updates and form interactions
const { ipcRenderer } = require('electron');

class UIManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentTab = 'wheels';
        this.modalStack = [];
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Settings - OBS integration removed for desktop-only mode

        // Challenge controls
        document.getElementById('progressUpBtn').addEventListener('click', () => {
            if (window.challengeSystem) {
                window.challengeSystem.adjustProgress(1);
            }
        });

        document.getElementById('progressDownBtn').addEventListener('click', () => {
            if (window.challengeSystem) {
                window.challengeSystem.adjustProgress(-1);
            }
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            if (window.challengeSystem) {
                window.challengeSystem.togglePause();
            }
        });

        document.getElementById('failBtn').addEventListener('click', () => {
            if (window.challengeSystem) {
                window.challengeSystem.failChallenge();
            }
        });

        document.getElementById('completeBtn').addEventListener('click', () => {
            if (window.challengeSystem) {
                window.challengeSystem.completeChallenge();
            }
        });

        // Modal handling - with better focus management
        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideModal();
            }
        });

        // Prevent form submission on Enter
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault();
            }
        });

        // Sound settings event listeners
        document.getElementById('spinSoundType').addEventListener('change', (e) => {
            this.handleSoundTypeChange('spin', e.target.value);
        });

        document.getElementById('progressSoundType').addEventListener('change', (e) => {
            this.handleSoundTypeChange('progress', e.target.value);
        });

        document.getElementById('warningSoundType').addEventListener('change', (e) => {
            this.handleSoundTypeChange('warning', e.target.value);
        });

        document.getElementById('testSpinSound').addEventListener('click', () => {
            this.testSound('spin');
        });

        document.getElementById('testProgressSound').addEventListener('click', () => {
            this.testSound('progress');
        });

        document.getElementById('testWarningSound').addEventListener('click', () => {
            this.testSound('warning');
        });

        document.getElementById('spinSoundFile').addEventListener('change', (e) => {
            this.handleCustomSoundUpload('spin', e.target.files[0]);
        });

        document.getElementById('progressSoundFile').addEventListener('change', (e) => {
            this.handleCustomSoundUpload('progress', e.target.files[0]);
        });

        document.getElementById('warningSoundFile').addEventListener('change', (e) => {
            this.handleCustomSoundUpload('warning', e.target.files[0]);
        });

        // Upload button listeners
        document.getElementById('uploadSpinSound').addEventListener('click', () => {
            document.getElementById('spinSoundFile').click();
        });

        document.getElementById('uploadProgressSound').addEventListener('click', () => {
            document.getElementById('progressSoundFile').click();
        });

        document.getElementById('uploadWarningSound').addEventListener('click', () => {
            document.getElementById('warningSoundFile').click();
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        console.log('Switching to tab:', tabName);
        
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
        const sessionAmount = this.dataManager.sessionStats.amount;
        const totalAmount = this.dataManager.totalStats.amount;
        const sessionChallenges = this.dataManager.sessionStats.challenges;
        const totalChallenges = this.dataManager.totalStats.challenges;

        document.getElementById('sessionAmount').textContent = `${sessionAmount.toFixed(2)}€`;
        document.getElementById('totalAmount').textContent = `${totalAmount.toFixed(2)}€`;
        document.getElementById('sessionStats').textContent = `${sessionAmount.toFixed(2)}€`;
        document.getElementById('sessionLost').textContent = sessionChallenges;
        document.getElementById('totalStats').textContent = `${totalAmount.toFixed(2)}€`;
        document.getElementById('totalLost').textContent = totalChallenges;
    }

    renderWheels() {
        const container = document.getElementById('wheelsGrid');
        container.innerHTML = '';

        // Add active wheel selector at top
        const activeWheelSelector = document.createElement('div');
        activeWheelSelector.className = 'active-wheel-selector';
        activeWheelSelector.innerHTML = `
            <div class="active-wheel-header">
                <h3>Aktives Rad</h3>
                <select id="activeWheelSelect" onchange="uiManager.changeActiveWheel(this.value)">
                    ${this.dataManager.wheels.map(wheel => 
                        `<option value="${wheel.id}" ${wheel.id === this.dataManager.activeWheelId ? 'selected' : ''}>
                            ${wheel.name} (${wheel.challenges.length} Challenges)
                        </option>`
                    ).join('')}
                </select>
            </div>
        `;
        container.appendChild(activeWheelSelector);

        this.dataManager.wheels.forEach(wheel => {
            const wheelChallenges = wheel.challenges || [];
            const isActive = wheel.id === this.dataManager.activeWheelId;

            const wheelCard = document.createElement('div');
            wheelCard.className = `wheel-card ${isActive ? 'active-wheel' : ''}`;
            
            // Better challenge preview
            const challengePreview = wheelChallenges.slice(0, 3).map(c => 
                `<span class="challenge-preview">${c.image} ${c.title}</span>`
            ).join('');
            
            const moreText = wheelChallenges.length > 3 ? 
                `<span class="challenge-more">+${wheelChallenges.length - 3} weitere</span>` : '';

            wheelCard.innerHTML = `
                <div class="wheel-header">
                    <div class="wheel-title">
                        ${wheel.name}
                        ${isActive ? '<span class="active-badge">AKTIV</span>' : ''}
                    </div>
                    <div class="wheel-actions">
                        <button class="btn btn-sm btn-secondary" onclick="uiManager.editWheel('${wheel.id}')">Bearbeiten</button>
                        <button class="btn btn-sm btn-danger" onclick="uiManager.deleteWheel('${wheel.id}')">Löschen</button>
                    </div>
                </div>
                <div class="wheel-info">
                    <div class="challenge-count">${wheelChallenges.length} Challenges</div>
                    <div class="challenge-preview-list">
                        ${challengePreview}
                        ${moreText}
                    </div>
                </div>
                <div class="wheel-controls">
                    <button class="btn btn-primary" onclick="challengeSystem.spinWheel('${wheel.id}')">Rad drehen</button>
                    <button class="btn btn-secondary" onclick="uiManager.previewWheel('${wheel.id}')">Vorschau</button>
                    ${!isActive ? `<button class="btn btn-success btn-sm" onclick="uiManager.setActiveWheel('${wheel.id}')">Aktivieren</button>` : ''}
                </div>
            `;
            container.appendChild(wheelCard);
        });
    }

    renderChallenges() {
        const container = document.getElementById('challengesList');
        container.innerHTML = '';

        const activeWheel = this.dataManager.getActiveWheel();
        const challenges = activeWheel ? activeWheel.challenges : [];

        // Add header showing which wheel's challenges we're viewing
        const header = document.createElement('div');
        header.className = 'challenges-header';
        header.innerHTML = `
            <h3>Challenges von: ${activeWheel ? activeWheel.name : 'Kein aktives Rad'}</h3>
            ${activeWheel ? `<p class="challenges-count">${challenges.length} Challenges im aktiven Rad</p>` : ''}
        `;
        container.appendChild(header);

        challenges.forEach(challenge => {
            const challengeItem = document.createElement('div');
            challengeItem.className = 'challenge-item';
            challengeItem.innerHTML = `
                <div class="challenge-image">${challenge.image}</div>
                <div class="challenge-details">
                    <div class="challenge-title">${challenge.title}</div>
                    <div class="challenge-meta">
                        ${this.dataManager.getTypeDisplayName(challenge.type)}
                        ${this.getChallengeTargetText(challenge)}
                        • ${Math.floor(challenge.timeLimit / 60)}:${(challenge.timeLimit % 60).toString().padStart(2, '0')} min
                    </div>
                </div>
                <div class="challenge-actions">
                    <button class="btn btn-sm btn-secondary" onclick="uiManager.editChallenge('${challenge.id}')">Bearbeiten</button>
                    <button class="btn btn-sm btn-danger" onclick="uiManager.deleteChallenge('${challenge.id}')">Löschen</button>
                </div>
            `;
            container.appendChild(challengeItem);
        });

        if (challenges.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <p>Keine Challenges im aktiven Rad vorhanden.</p>
                <button class="btn btn-primary" onclick="uiManager.showChallengeModal()">Erste Challenge hinzufügen</button>
            `;
            container.appendChild(emptyState);
        }
    }

    renderDonations() {
        const container = document.getElementById('historyList');
        container.innerHTML = '';

        const allDonations = this.dataManager.sessions.flatMap(session => 
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
                <button class="history-delete" onclick="uiManager.deleteDonation('${donation.id}')">×</button>
            `;
            container.appendChild(historyItem);
        });
    }

    async renderSettings() {
        document.getElementById('donationAmount').value = this.dataManager.settings.donationAmount;
        document.getElementById('superChance').value = this.dataManager.settings.superChance;
        document.getElementById('animationDuration').value = this.dataManager.settings.animationDuration;

        // Sound settings
        if (this.dataManager.settings.sounds) {
            document.getElementById('spinSoundType').value = this.dataManager.settings.sounds.spinSoundType || 'ambient';
            document.getElementById('progressSoundType').value = this.dataManager.settings.sounds.progressSoundType || 'beep';
            document.getElementById('warningSoundType').value = this.dataManager.settings.sounds.warningSoundType || 'warning';
        }

        const hotkeyContainer = document.getElementById('hotkeyList');
        hotkeyContainer.innerHTML = '';

        const hotkeyLabels = {
            spinWheel: 'Rad drehen',
            progressUp: 'Fortschritt +1',
            progressDown: 'Fortschritt -1',
            challengeFailed: 'Challenge verloren',
            pauseResume: 'Pause/Resume'
        };

        Object.keys(this.dataManager.settings.hotkeys).forEach(action => {
            const hotkeyItem = document.createElement('div');
            hotkeyItem.className = 'hotkey-item';
            hotkeyItem.innerHTML = `
                <div class="hotkey-label">${hotkeyLabels[action]}</div>
                <div class="hotkey-controls">
                    <div class="hotkey-display" id="hotkey-${action}">${this.dataManager.settings.hotkeys[action] || 'Nicht gesetzt'}</div>
                    <div class="hotkey-buttons">
                        <button class="btn btn-sm btn-secondary hotkey-learn-btn" onclick="uiManager.startHotkeyLearning('${action}')">
                            Lernen
                        </button>
                        <button class="btn btn-sm btn-danger hotkey-clear-btn" onclick="uiManager.clearHotkey('${action}')">
                            ✕
                        </button>
                    </div>
                </div>
            `;
            hotkeyContainer.appendChild(hotkeyItem);
        });
    }


    // Challenge Panel Management
    showChallengePanel() {
        document.getElementById('challengePanel').style.display = 'block';
    }

    hideChallengePanel() {
        document.getElementById('challengePanel').style.display = 'none';
    }

    updateChallengePanel(challenge) {
        document.getElementById('activeChallengeTitle').textContent = challenge.title;
        
        const minutes = Math.floor(challenge.timeRemaining / 60);
        const seconds = challenge.timeRemaining % 60;
        const timerDisplay = document.getElementById('timerDisplay');
        
        // Store previous values for bounce detection
        if (!this.previousTime) this.previousTime = challenge.timeRemaining;
        if (!this.previousProgress) this.previousProgress = challenge.progress;
        
        // Check for time milestones and add bounce animation
        const shouldBounceTime = (
            (challenge.timeRemaining === 900) ||  // 15 minutes
            (challenge.timeRemaining === 600) ||  // 10 minutes  
            (challenge.timeRemaining === 300) ||  // 5 minutes
            (challenge.timeRemaining === 180) ||  // 3 minutes
            (challenge.timeRemaining === 120) ||  // 2 minutes
            (challenge.timeRemaining === 60) ||   // 1 minute
            (challenge.timeRemaining === 30) ||   // 30 seconds
            (challenge.timeRemaining === 15) ||   // 15 seconds
            (challenge.timeRemaining === 10) ||   // 10 seconds
            (challenge.timeRemaining <= 5 && challenge.timeRemaining > 0) // Last 5 seconds
        );
        
        if (shouldBounceTime && this.previousTime !== challenge.timeRemaining) {
            timerDisplay.classList.remove('time-bounce-animation');
            setTimeout(() => timerDisplay.classList.add('time-bounce-animation'), 10);
            setTimeout(() => timerDisplay.classList.remove('time-bounce-animation'), 500);
        }
        
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.previousTime = challenge.timeRemaining;

        // Update progress display based on challenge type
        const progressElement = document.getElementById('progressDisplay');
        if (challenge.type === 'survive') {
            progressElement.style.display = 'none'; // Hide progress for survive challenges
        } else if (challenge.type === 'max') {
            progressElement.style.display = 'block';
            const remaining = Math.max(0, challenge.target - challenge.progress);
            progressElement.textContent = `${challenge.progress}/${challenge.target} (${remaining} übrig)`;
            
            // Add bounce animation when progress changes
            if (challenge.progress !== this.previousProgress) {
                progressElement.classList.remove('scale-bounce-animation');
                setTimeout(() => progressElement.classList.add('scale-bounce-animation'), 10);
                setTimeout(() => progressElement.classList.remove('scale-bounce-animation'), 400);
            }
        } else { // collect
            progressElement.style.display = 'block';
            progressElement.textContent = `${challenge.progress} / ${challenge.target}`;
            
            // Add bounce animation when progress changes
            if (challenge.progress !== this.previousProgress) {
                progressElement.classList.remove('scale-bounce-animation');
                setTimeout(() => progressElement.classList.add('scale-bounce-animation'), 10);
                setTimeout(() => progressElement.classList.remove('scale-bounce-animation'), 400);
            }
        }
        
        this.previousProgress = challenge.progress;
    }

    updatePauseButton(isPaused) {
        document.getElementById('pauseBtn').textContent = isPaused ? 'Resume' : 'Pause';
    }

    getChallengeTargetText(challenge) {
        if (challenge.type === 'survive') {
            return ''; // No target display for survive
        } else if (challenge.type === 'max') {
            return `• Max: ${challenge.target}`;
        } else { // collect
            return `• Ziel: ${challenge.target}`;
        }
    }

    // Modal Management with better focus handling
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

        const overlay = document.getElementById('modalOverlay');
        overlay.style.display = 'flex';
        
        // Focus first input
        setTimeout(() => {
            const firstInput = overlay.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
                if (firstInput.type === 'text') {
                    firstInput.select();
                }
            }
        }, 100);
    }

    hideModal() {
        document.getElementById('modalOverlay').style.display = 'none';
        
        // Return focus to the element that opened the modal
        if (this.modalStack.length > 0) {
            const lastFocused = this.modalStack.pop();
            if (lastFocused && lastFocused.focus) {
                lastFocused.focus();
            }
        }
    }

    // Data modification methods that update UI
    async saveSettings() {
        this.dataManager.settings.donationAmount = parseFloat(document.getElementById('donationAmount').value) || 5.00;
        this.dataManager.settings.superChance = parseInt(document.getElementById('superChance').value) || 10;
        this.dataManager.settings.animationDuration = parseFloat(document.getElementById('animationDuration').value) || 3.0;

        // Save sound settings
        if (!this.dataManager.settings.sounds) {
            this.dataManager.settings.sounds = {
                spinSoundType: 'ambient',
                progressSoundType: 'beep',
                warningSoundType: 'warning',
                customSounds: {}
            };
        }

        this.dataManager.settings.sounds.spinSoundType = document.getElementById('spinSoundType').value;
        this.dataManager.settings.sounds.progressSoundType = document.getElementById('progressSoundType').value;
        this.dataManager.settings.sounds.warningSoundType = document.getElementById('warningSoundType').value;

        await this.dataManager.saveData();
        await ipcRenderer.invoke('update-hotkeys', this.dataManager.settings.hotkeys);
        
        alert('Einstellungen gespeichert!');
    }

    updateHotkey(action, key) {
        this.dataManager.settings.hotkeys[action] = key;
        document.getElementById(`hotkey-${action}`).textContent = key || 'Nicht gesetzt';
    }

    startHotkeyLearning(action) {
        const button = event.target;
        const display = document.getElementById(`hotkey-${action}`);
        
        button.textContent = 'Drücken Sie eine Taste...';
        button.disabled = true;
        display.textContent = 'Warten...';
        
        // Remove existing listener if any
        if (this.currentKeyListener) {
            document.removeEventListener('keydown', this.currentKeyListener);
        }
        
        this.currentKeyListener = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Build key combination string
            const keys = [];
            if (e.ctrlKey) keys.push('Ctrl');
            if (e.altKey) keys.push('Alt');
            if (e.shiftKey) keys.push('Shift');
            if (e.metaKey) keys.push('Meta');
            
            // Add the main key (avoid modifier keys themselves)
            if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                let keyName = e.key;
                
                // Convert common keys to more readable format
                if (e.key === ' ') keyName = 'Space';
                else if (e.key.length === 1) keyName = e.key.toUpperCase();
                else if (e.key.startsWith('F') && e.key.length <= 3) keyName = e.key;
                else if (e.key.startsWith('Arrow')) keyName = e.key.replace('Arrow', '');
                
                keys.push(keyName);
            }
            
            const keyCombo = keys.join('+');
            
            // Check if it's a valid combination (not just modifiers)
            if (keys.length > 0 && !['Control', 'Alt', 'Shift', 'Meta'].includes(keys[keys.length - 1])) {
                this.updateHotkey(action, keyCombo);
                button.textContent = 'Taste lernen';
                button.disabled = false;
                
                // Update hotkeys in main process
                ipcRenderer.invoke('update-hotkeys', this.dataManager.settings.hotkeys);
                
                // Remove the event listener
                document.removeEventListener('keydown', this.currentKeyListener);
                this.currentKeyListener = null;
            }
        };
        
        document.addEventListener('keydown', this.currentKeyListener, true);
        
        // Auto-cancel after 10 seconds
        setTimeout(() => {
            if (this.currentKeyListener) {
                document.removeEventListener('keydown', this.currentKeyListener);
                this.currentKeyListener = null;
                button.textContent = 'Taste lernen';
                button.disabled = false;
                display.textContent = this.dataManager.settings.hotkeys[action] || 'Nicht gesetzt';
            }
        }, 10000);
    }
    
    clearHotkey(action) {
        this.updateHotkey(action, '');
        ipcRenderer.invoke('update-hotkeys', this.dataManager.settings.hotkeys);
    }

    // Sound settings methods
    handleSoundTypeChange(soundType, value) {
        if (!this.dataManager.settings.sounds) {
            this.dataManager.settings.sounds = {
                spinSoundType: 'ambient',
                progressSoundType: 'beep',
                warningSoundType: 'warning',
                customSounds: {}
            };
        }

        this.dataManager.settings.sounds[soundType + 'SoundType'] = value;

        // Show file input for custom sounds
        const fileInput = document.getElementById(soundType + 'SoundFile');
        if (value === 'custom') {
            fileInput.style.display = 'inline-block';
            fileInput.click();
        } else {
            fileInput.style.display = 'none';
        }
    }

    async handleCustomSoundUpload(soundType, file) {
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const base64 = this.arrayBufferToBase64(arrayBuffer);
            
            if (!this.dataManager.settings.sounds.customSounds) {
                this.dataManager.settings.sounds.customSounds = {};
            }
            
            this.dataManager.settings.sounds.customSounds[soundType] = {
                data: base64,
                name: file.name,
                type: file.type
            };
            
            console.log(`Custom ${soundType} sound uploaded: ${file.name}`);
            
        } catch (error) {
            console.error('Error uploading sound file:', error);
            alert('Fehler beim Hochladen der Sounddatei.');
        }
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    testSound(soundType) {
        // Create a simple test sound directly in the main window
        this.createTestSound(soundType);
    }

    createTestSound(soundType) {
        // Create audio context if not exists
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error('Audio context not available:', e);
                return;
            }
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        let frequency, duration;
        
        switch(soundType) {
            case 'spin':
                // Spacey ambient sound
                this.createSpaceyTestSound();
                return;
            case 'progress':
                frequency = 600;
                duration = 0.15;
                break;
            case 'warning':
                frequency = 900;
                duration = 0.2;
                break;
            default:
                frequency = 440;
                duration = 0.3;
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    createSpaceyTestSound() {
        if (!this.audioContext) return;
        
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(filterNode);
        filterNode.connect(this.audioContext.destination);
        
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 600;
        
        oscillator1.frequency.value = 220;
        oscillator1.type = 'sine';
        oscillator2.frequency.value = 330;
        oscillator2.type = 'triangle';
        
        const now = this.audioContext.currentTime;
        const duration = 1.0;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.05, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);
        
        oscillator1.start(now);
        oscillator2.start(now);
        oscillator1.stop(now + duration);
        oscillator2.stop(now + duration);
    }

    resetSession() {
        if (confirm('Möchten Sie die aktuelle Session wirklich zurücksetzen?')) {
            this.dataManager.resetSession();
            this.updateUI();
        }
    }

    deleteDonation(donationId) {
        if (confirm('Möchten Sie diesen Spendeneintrag wirklich löschen?')) {
            this.dataManager.deleteDonation(donationId);
            this.updateUI();
        }
    }

    // Wheel Management UI
    editWheel(wheelId) {
        this.showWheelModal(wheelId);
    }

    deleteWheel(wheelId) {
        if (confirm('Möchten Sie dieses Rad wirklich löschen?')) {
            this.dataManager.deleteWheel(wheelId);
            this.renderWheels();
        }
    }

    showWheelModal(wheelId = null) {
        const isEdit = wheelId !== null;
        const wheel = isEdit ? this.dataManager.getWheelById(wheelId) : null;
        const wheelChallenges = wheel ? wheel.challenges : [];

        const content = `
            <div class="form-group">
                <label>Rad Name:</label>
                <input type="text" id="wheelName" value="${wheel ? wheel.name : ''}" placeholder="Mein Challenge Rad">
            </div>
            <div class="form-group">
                <label>Challenges für dieses Rad:</label>
                <div class="wheel-challenges-container">
                    <div class="challenges-list" id="wheelChallengesList">
                        ${wheelChallenges.map(challenge => `
                            <div class="wheel-challenge-item" data-challenge-id="${challenge.id}">
                                <div class="challenge-info">
                                    <span class="challenge-emoji">${challenge.image}</span>
                                    <span class="challenge-title">${challenge.title}</span>
                                    <span class="challenge-meta">
                                        ${this.dataManager.getTypeDisplayName(challenge.type)}
                                        ${this.getChallengeTargetText(challenge)}
                                        • ${Math.floor(challenge.timeLimit / 60)}:${(challenge.timeLimit % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <div class="challenge-actions">
                                    <button type="button" class="btn btn-sm btn-secondary" onclick="uiManager.editWheelChallenge('${wheelId}', '${challenge.id}')">
                                        Bearbeiten
                                    </button>
                                    <button type="button" class="btn btn-sm btn-danger" onclick="uiManager.deleteWheelChallenge('${wheelId}', '${challenge.id}')">
                                        Löschen
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="add-challenge-section">
                        <button type="button" class="btn btn-primary btn-sm" onclick="uiManager.addChallengeToWheel('${wheelId || 'new'}')">
                            + Challenge hinzufügen
                        </button>
                    </div>
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

        if (wheelId) {
            this.dataManager.updateWheel(wheelId, { name });
        } else {
            // For new wheels, create with empty challenges array
            this.dataManager.addWheel({ name, challenges: [] });
        }

        this.hideModal();
        this.renderWheels();
    }

    // Wheel-specific challenge management methods
    addChallengeToWheel(wheelId) {
        if (wheelId === 'new') {
            alert('Bitte speichern Sie das Rad zuerst, bevor Sie Challenges hinzufügen.');
            return;
        }
        
        this.currentWheelId = wheelId;
        this.showChallengeModal();
    }

    editWheelChallenge(wheelId, challengeId) {
        this.currentWheelId = wheelId;
        const challenge = this.dataManager.getChallengeFromWheel(wheelId, challengeId);
        if (challenge) {
            this.showChallengeModal(challengeId);
        }
    }

    deleteWheelChallenge(wheelId, challengeId) {
        const challenge = this.dataManager.getChallengeFromWheel(wheelId, challengeId);
        if (challenge && confirm(`Challenge "${challenge.title}" wirklich löschen?`)) {
            this.dataManager.deleteChallengeFromWheel(wheelId, challengeId);
            
            // Refresh the wheel modal if it's open
            if (document.getElementById('modalOverlay').style.display === 'flex') {
                this.showWheelModal(wheelId);
            }
            
            this.renderWheels();
            this.renderChallenges();
        }
    }

    // Challenge Management UI
    editChallenge(challengeId) {
        this.showChallengeModal(challengeId);
    }

    deleteChallenge(challengeId) {
        if (confirm('Möchten Sie diese Challenge wirklich löschen?')) {
            this.dataManager.deleteChallenge(challengeId);
            this.renderChallenges();
        }
    }

    showChallengeModal(challengeId = null) {
        const isEdit = challengeId !== null;
        
        // Determine which wheel to work with
        let targetWheel;
        if (this.currentWheelId) {
            // Editing from wheel modal
            targetWheel = this.dataManager.getWheelById(this.currentWheelId);
        } else {
            // Editing from challenges tab - use active wheel
            targetWheel = this.dataManager.getActiveWheel();
        }
        
        if (!targetWheel) {
            alert('Kein Rad gefunden. Bitte wählen Sie zuerst ein Rad aus.');
            return;
        }
        
        const challenge = isEdit ? targetWheel.challenges.find(c => c.id === challengeId) : null;

        const content = `
            <div class="form-row">
                <div class="form-group">
                    <label>Challenge Titel: <span style="color: #ef4444;">*</span></label>
                    <input type="text" id="challengeTitle" value="${challenge ? challenge.title : ''}" 
                           placeholder="Sammle 10 Münzen" required>
                </div>
                <div class="form-group">
                    <label>Emoji/Icon: <span style="color: #ef4444;">*</span></label>
                    <div class="emoji-input-group">
                        <input type="text" id="challengeImage" value="${challenge ? challenge.image : '🎯'}" 
                               placeholder="🎯" maxlength="4" required>
                        <button type="button" class="emoji-trigger" id="emojiTriggerBtn">😊</button>
                    </div>
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
                        <option value="max" ${challenge && challenge.type === 'max' ? 'selected' : ''}>
                            Maximum (Maximal X erlaubt)
                        </option>
                    </select>
                </div>
                <div class="form-group" id="targetGroup">
                    <label id="targetLabel">Zielwert:</label>
                    <input type="number" id="challengeTarget" value="${challenge ? challenge.target : 10}" 
                           min="0" placeholder="10">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Zeitlimit (Sekunden): <span style="color: #ef4444;">*</span></label>
                    <input type="number" id="challengeTimeLimit" value="${challenge ? challenge.timeLimit : 180}" 
                           min="30" placeholder="180" required>
                </div>
                <div class="form-group">
                    <label>Super Challenge Chance:</label>
                    <p style="font-size: 12px; color: rgba(255, 255, 255, 0.6); margin: 5px 0;">
                        Jede Challenge hat eine ${this.dataManager.settings.superChance}% Chance eine Super Challenge zu werden (2x Spende)
                    </p>
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
        
        // Setup emoji picker and challenge type handling after modal is shown
        setTimeout(() => {
            const emojiBtn = document.getElementById('emojiTriggerBtn');
            const imageInput = document.getElementById('challengeImage');
            const typeSelect = document.getElementById('challengeType');
            const targetGroup = document.getElementById('targetGroup');
            const targetLabel = document.getElementById('targetLabel');
            const targetInput = document.getElementById('challengeTarget');
            
            if (emojiBtn && imageInput) {
                emojiBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.emojiPicker.show(imageInput);
                });
            }
            
            // Handle challenge type changes
            if (typeSelect && targetGroup && targetLabel && targetInput) {
                const updateTargetField = () => {
                    const type = typeSelect.value;
                    if (type === 'survive') {
                        targetGroup.style.display = 'none';
                        targetInput.value = '0';
                    } else if (type === 'max') {
                        targetGroup.style.display = 'block';
                        targetLabel.textContent = 'Maximum erlaubt:';
                        targetInput.placeholder = '3';
                        if (!targetInput.value || targetInput.value === '0') {
                            targetInput.value = '3';
                        }
                    } else { // collect
                        targetGroup.style.display = 'block';
                        targetLabel.textContent = 'Zielwert:';
                        targetInput.placeholder = '10';
                        if (!targetInput.value || targetInput.value === '0') {
                            targetInput.value = '10';
                        }
                    }
                };
                
                typeSelect.addEventListener('change', updateTargetField);
                updateTargetField(); // Set initial state
            }
        }, 100);
    }

    saveChallenge(challengeId = null) {
        const title = document.getElementById('challengeTitle').value.trim();
        const image = document.getElementById('challengeImage').value.trim();
        const type = document.getElementById('challengeType').value;
        const target = parseInt(document.getElementById('challengeTarget').value) || 0;
        const timeLimit = parseInt(document.getElementById('challengeTimeLimit').value);
        const isSuper = false; // Will be determined randomly during wheel spin

        // Validation with specific error messages
        if (!title) {
            alert('Bitte geben Sie einen Challenge-Titel ein.');
            document.getElementById('challengeTitle').focus();
            return;
        }

        if (!image) {
            alert('Bitte wählen Sie ein Emoji/Icon aus.');
            const imageInput = document.getElementById('challengeImage');
            imageInput.focus();
            // Re-enable the input if it was disabled after an error
            imageInput.disabled = false;
            return;
        }

        if (!timeLimit || timeLimit < 30) {
            alert('Bitte geben Sie ein gültiges Zeitlimit ein (mindestens 30 Sekunden).');
            document.getElementById('challengeTimeLimit').focus();
            return;
        }

        // Determine which wheel to work with
        let targetWheel;
        if (this.currentWheelId) {
            targetWheel = this.dataManager.getWheelById(this.currentWheelId);
        } else {
            targetWheel = this.dataManager.getActiveWheel();
        }
        
        if (!targetWheel) {
            alert('Kein Rad gefunden.');
            return;
        }

        const challengeData = { title, image, type, target, timeLimit, isSuper };

        if (challengeId) {
            this.dataManager.updateWheelChallenge(targetWheel.id, challengeId, challengeData);
        } else {
            this.dataManager.addChallengeToWheel(targetWheel.id, challengeData);
        }

        this.hideModal();
        
        // Reset current wheel context
        this.currentWheelId = null;
        
        // Refresh appropriate views
        this.renderChallenges();
        this.renderWheels();
    }

    previewWheel(wheelId) {
        // TODO: Implement wheel preview functionality
        console.log('Preview wheel:', wheelId);
    }

    // Active wheel management
    changeActiveWheel(wheelId) {
        this.dataManager.setActiveWheel(wheelId);
        this.updateUI();
        console.log('Active wheel changed to:', wheelId);
    }

    setActiveWheel(wheelId) {
        this.dataManager.setActiveWheel(wheelId);
        this.updateUI();
        console.log('Active wheel set to:', wheelId);
    }

    // Updated challenge management for wheel-specific challenges
    editChallenge(challengeId) {
        const activeWheel = this.dataManager.getActiveWheel();
        if (!activeWheel) {
            alert('Kein aktives Rad gefunden.');
            return;
        }
        
        const challenge = activeWheel.challenges.find(c => c.id === challengeId);
        if (challenge) {
            this.showChallengeModal(challengeId);
        }
    }

    deleteChallenge(challengeId) {
        const activeWheel = this.dataManager.getActiveWheel();
        if (!activeWheel) {
            alert('Kein aktives Rad gefunden.');
            return;
        }

        const challenge = activeWheel.challenges.find(c => c.id === challengeId);
        if (challenge && confirm(`Challenge "${challenge.title}" wirklich löschen?`)) {
            this.dataManager.deleteChallengeFromWheel(activeWheel.id, challengeId);
            this.renderChallenges();
        }
    }
}

// CSS for wheel improvements and emoji picker
const additionalCSS = `
.challenge-preview-list {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.challenge-preview {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
}

.challenge-more {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
}

.challenge-count {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
}

.active-wheel-selector {
    margin-bottom: 20px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.active-wheel-header h3 {
    margin: 0 0 10px 0;
    color: #10b981;
}

.active-wheel-header select {
    width: 100%;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: white;
    font-size: 14px;
}

.wheel-card.active-wheel {
    border: 2px solid #10b981;
    background: rgba(16, 185, 129, 0.1);
}

.active-badge {
    background: #10b981;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: bold;
    margin-left: 8px;
}

.challenges-header {
    margin-bottom: 15px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.challenges-header h3 {
    margin: 0 0 5px 0;
    color: #10b981;
}

.challenges-count {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    margin: 0;
}

/* Emoji Picker Styles */
.emoji-picker {
    position: fixed;
    z-index: 10000;
    background: #1f2937;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    width: 300px;
    max-height: 400px;
    overflow: hidden;
}

.emoji-picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background: #374151;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    font-weight: bold;
}

.emoji-picker-close {
    background: none;
    border: none;
    color: #ef4444;
    font-size: 18px;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.emoji-picker-close:hover {
    background: rgba(239, 68, 68, 0.1);
    border-radius: 4px;
}

.emoji-picker-search {
    padding: 10px 15px;
    background: #374151;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.emoji-picker-search input {
    width: 100%;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: white;
    font-size: 14px;
}

.emoji-picker-search input::placeholder {
    color: rgba(255, 255, 255, 0.5);
}

.emoji-picker-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 2px;
    padding: 10px;
    max-height: 250px;
    overflow-y: auto;
}

.emoji-button {
    background: none;
    border: none;
    font-size: 20px;
    padding: 8px;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s;
}

.emoji-button:hover {
    background: rgba(255, 255, 255, 0.1);
}

.emoji-button:active {
    background: rgba(255, 255, 255, 0.2);
}

.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: rgba(255, 255, 255, 0.6);
}

.empty-state p {
    margin-bottom: 15px;
    font-size: 16px;
}

/* Wheel Editing Styles */
.wheel-challenges-container {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.02);
}

.challenges-list {
    max-height: 300px;
    overflow-y: auto;
}

.wheel-challenge-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.wheel-challenge-item:last-child {
    border-bottom: none;
}

.challenge-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
}

.challenge-emoji {
    font-size: 20px;
    min-width: 30px;
}

.challenge-title {
    font-weight: 500;
    color: white;
    min-width: 150px;
}

.challenge-meta {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    gap: 8px;
}

.super-badge {
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #000;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: bold;
}

.challenge-actions {
    display: flex;
    gap: 6px;
}

.add-challenge-section {
    padding: 15px;
    text-align: center;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
}

.wheel-challenges-section {
    margin-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 20px;
}

.wheel-challenges-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 15px;
    max-height: 200px;
    overflow-y: auto;
}

.wheel-challenge-item {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.wheel-challenge-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.wheel-challenge-image {
    font-size: 20px;
}

.wheel-challenge-details {
    flex: 1;
}

.wheel-challenge-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
}

.wheel-challenge-meta {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
}

.wheel-challenge-actions {
    display: flex;
    gap: 6px;
}
`;


// Add the CSS to the document
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}