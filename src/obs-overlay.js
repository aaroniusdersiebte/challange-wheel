const { ipcRenderer } = require('electron');

class OBSOverlay {
    constructor() {
        console.log('=== OBS OVERLAY INITIALIZED ===');
        console.log('Environment check:');
        console.log('- ipcRenderer available:', typeof ipcRenderer !== 'undefined');
        console.log('- Window size:', window.innerWidth, 'x', window.innerHeight);
        console.log('- Screen size:', screen.width, 'x', screen.height);
        
        this.currentAction = null;
        this.caseItems = [];
        this.activeChallenge = null;
        this.settings = {};
        this.animationDuration = 3000;
        this.itemWidth = 120; // 110px item + 10px gap
        this.totalItems = 50; // For smooth scrolling effect
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.debugMode = true; // Enable extensive logging
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.hideAllElements();
        this.checkDesktopMode();
    }
    
    checkDesktopMode() {
        const connectionStatus = document.getElementById('connectionStatus');
        const desktopInfo = document.getElementById('desktopInfo');
        
        if (typeof ipcRenderer === 'undefined') {
            // Desktop mode without IPC
            connectionStatus.textContent = 'Desktop Modus - IPC nicht verfügbar';
            connectionStatus.className = 'connection-status disconnected';
            desktopInfo.style.display = 'block';
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                desktopInfo.style.display = 'none';
            }, 10000);
        } else {
            try {
                // Test IPC connection
                connectionStatus.textContent = 'IPC Verbindung aktiv';
                connectionStatus.className = 'connection-status connected';
                desktopInfo.style.display = 'block';
                
                // Hide faster if IPC works
                setTimeout(() => {
                    desktopInfo.style.display = 'none';
                }, 3000);
            } catch (e) {
                connectionStatus.textContent = 'IPC Fehler - Fallback Modus';
                connectionStatus.className = 'connection-status disconnected';
                desktopInfo.style.display = 'block';
            }
        }
    }

    setupEventListeners() {
        // Check if IPC is available (desktop mode compatibility)
        if (typeof ipcRenderer !== 'undefined') {
            try {
                ipcRenderer.on('update-display', (event, data) => {
                    console.log('Received update-display:', data.action);
                    this.handleUpdate(data);
                });

                ipcRenderer.on('hotkey-pressed', (event, action) => {
                    console.log('Received hotkey:', action);
                    this.handleHotkey(action);
                });
                
                console.log('IPC event listeners set up successfully');
            } catch (e) {
                console.log('IPC setup failed:', e);
                this.setupFallbackEventListeners();
            }
        } else {
            console.log('IPC not available, setting up fallback listeners');
            this.setupFallbackEventListeners();
        }
    }
    
    setupFallbackEventListeners() {
        // For desktop mode without IPC: Set up window event listeners
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type) {
                console.log('Received window message:', event.data);
                this.handleUpdate(event.data);
            }
        });
        
        // Global keyboard shortcuts for testing
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey) {
                switch (e.key) {
                    case 'S':
                        e.preventDefault();
                        console.log('=== MANUAL SPIN TRIGGERED ===');
                        this.handleUpdate({
                            action: 'spin',
                            challenges: this.getDummyChallenges()
                        });
                        break;
                    case 'R':
                        e.preventDefault();
                        console.log('=== MANUAL RESULT TRIGGERED ===');
                        this.handleUpdate({
                            action: 'show-result',
                            result: 'failure',
                            challenge: { title: 'Test Challenge', isSuper: false },
                            donation: 5.00
                        });
                        break;
                    case 'C':
                        e.preventDefault();
                        console.log('=== OPENING CONSOLE ===');
                        if (typeof require !== 'undefined') {
                            require('electron').remote.getCurrentWindow().openDevTools();
                        }
                        break;
                }
            }
        });
    }
    
    getDummyChallenges() {
        return [
            { title: 'Headshot Challenge', type: 'achieve', target: 5, timeLimit: 300, image: '🎯', isSuper: false },
            { title: 'Survival Challenge', type: 'survive', target: 0, timeLimit: 180, image: '💀', isSuper: false },
            { title: 'Super Speed Run', type: 'achieve', target: 1, timeLimit: 120, image: '⚡', isSuper: true },
            { title: 'Collect Coins', type: 'collect', target: 10, timeLimit: 240, image: '🪙', isSuper: false },
            { title: 'Mega Challenge', type: 'achieve', target: 3, timeLimit: 600, image: '🔥', isSuper: true }
        ];
    }

    hideAllElements() {
        // Hide all elements with fade-out animations
        const caseContainer = document.getElementById('caseContainer');
        const infoPanel = document.getElementById('infoPanel');
        const activeChallenge = document.getElementById('activeChallenge');
        const resultDisplay = document.getElementById('resultDisplay');
        const spinOverlay = document.getElementById('spinOverlay');
        
        if (caseContainer.classList.contains('active')) {
            caseContainer.classList.add('fade-out');
            setTimeout(() => {
                caseContainer.classList.remove('active', 'fade-out');
            }, 300);
        }
        
        if (infoPanel.classList.contains('active')) {
            infoPanel.classList.add('fade-out');
            setTimeout(() => {
                infoPanel.classList.remove('active', 'fade-out');
            }, 300);
        }
        
        if (activeChallenge.style.display === 'block') {
            activeChallenge.classList.add('fade-out');
            setTimeout(() => {
                activeChallenge.style.display = 'none';
                activeChallenge.classList.remove('fade-out');
            }, 300);
        }
        
        if (resultDisplay.style.display === 'flex') {
            resultDisplay.classList.add('fade-out');
            setTimeout(() => {
                resultDisplay.style.display = 'none';
                resultDisplay.classList.remove('fade-out');
            }, 300);
        }
        
        if (spinOverlay.style.display === 'flex') {
            spinOverlay.style.display = 'none';
        }
    }

    handleUpdate(data) {
        this.settings = data.settings || {};
        this.animationDuration = (this.settings.animationDuration || 3) * 1000;

        switch (data.action) {
            case 'spin':
                this.showCaseOpening(data.challenges);
                break;
            case 'start-challenge':
                this.startChallenge(data.challenge);
                break;
            case 'update-challenge':
                this.updateChallenge(data.challenge);
                break;
            case 'show-result':
                this.showResult(data.result, data.challenge, data.donation);
                break;
        }
    }

    handleHotkey(action) {
        // Handle hotkeys if needed for OBS overlay
        console.log('Hotkey pressed in OBS:', action);
    }

    showCaseOpening(challenges) {
        // Force hide any existing result displays immediately
        const resultDisplay = document.getElementById('resultDisplay');
        resultDisplay.style.display = 'none';
        resultDisplay.classList.remove('fade-out');
        
        this.hideAllElements();
        
        // Activate background blur
        this.setBackgroundBlur('active');
        
        // Show spin overlay with loading animation
        const spinOverlay = document.getElementById('spinOverlay');
        spinOverlay.style.display = 'flex';
        spinOverlay.classList.add('fade-in');
        
        // Setup case reel
        this.setupCaseReel(challenges);
        
        // Wait for elements to be properly hidden, then show case
        setTimeout(() => {
            const caseContainer = document.getElementById('caseContainer');
            caseContainer.classList.add('active');
            caseContainer.classList.add('fade-in');
            this.setupInfoPanel();
            
            // Start case opening animation after UI is ready
            setTimeout(() => {
                this.openCase(challenges);
            }, 800);
        }, 400);
    }

    setupCaseReel(challenges) {
        const reel = document.getElementById('caseReel');
        reel.innerHTML = '';
        
        // Create many loops for infinite scrolling effect
        const loopCount = 15;
        const items = [];
        
        // Create multiple loops of all challenges
        for (let loop = 0; loop < loopCount; loop++) {
            challenges.forEach((challenge, challengeIndex) => {
                const item = document.createElement('div');
                item.className = 'case-item';
                if (challenge.isSuper) {
                    item.classList.add('case-item-super');
                }
                
                item.innerHTML = `
                    <div class="case-item-border"></div>
                    <div class="case-item-content">
                        <div class="case-item-image">${challenge.image}</div>
                        <div class="case-item-title">${challenge.title}</div>
                        <div class="case-item-type">${this.getTypeDisplayName(challenge.type)}</div>
                    </div>
                    <div class="case-item-glow"></div>
                `;
                
                reel.appendChild(item);
                items.push({...challenge, element: item, originalIndex: challengeIndex});
            });
        }
        
        this.caseItems = items;
        this.totalItems = items.length;
        
        // Reset position and transition
        reel.style.transform = 'translateX(0px)';
        reel.style.transition = 'none';
        
        console.log(`Created ${this.totalItems} case items from ${challenges.length} challenges`);
    }

    setupInfoPanel() {
        const infoPanel = document.getElementById('infoPanel');
        infoPanel.className = 'info-panel';
        
        if (this.settings.infoPosition === 'left') {
            infoPanel.classList.add('left');
        }
        
        infoPanel.classList.add('active');
    }

    openCase(challenges) {
        console.log('=== CASE OPENING STARTED ===');
        
        // 1. Hide spin overlay
        const spinOverlay = document.getElementById('spinOverlay');
        spinOverlay.style.display = 'none';
        
        // 2. Play opening sound
        this.playSound('case-opening');
        
        // 3. Select random challenge
        const selectedIndex = Math.floor(Math.random() * challenges.length);
        const selectedChallenge = challenges[selectedIndex];
        this.selectedChallenge = selectedChallenge;
        
        console.log(`Selected challenge: ${selectedChallenge.title} (index: ${selectedIndex})`);
        
        // 4. Calculate animation
        const middleLoopStart = Math.floor(this.caseItems.length / 3);
        const middleLoopEnd = Math.floor((this.caseItems.length * 2) / 3);
        
        let targetItemIndex = middleLoopStart;
        for (let i = middleLoopStart; i < middleLoopEnd; i++) {
            if (this.caseItems[i].originalIndex === selectedIndex) {
                targetItemIndex = i;
                break;
            }
        }
        
        const extraLoops = 5;
        const loopDistance = this.itemWidth * challenges.length * extraLoops;
        const targetDistance = this.itemWidth * targetItemIndex;
        const totalDistance = loopDistance + targetDistance;
        
        // 5. Start animation
        const animationDuration = 7000; // Feste 7 Sekunden
        const reel = document.getElementById('caseReel');
        
        console.log(`Animation duration: ${animationDuration}ms`);
        
        reel.style.transition = `transform ${animationDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
        reel.style.transform = `translateX(-${totalDistance}px)`;
        
        // 6. Show info during animation
        setTimeout(() => {
            console.log('Showing challenge info...');
            this.showChallengeInfo(selectedChallenge);
        }, animationDuration * 0.6);
        
        // 7. Highlight selection near end
        setTimeout(() => {
            console.log('Highlighting selected item...');
            this.highlightSelectedItem(targetItemIndex);
            this.playSound('case-selected');
        }, animationDuration - 1000);
        
        // 8. NACH Animation: Case ausblenden und Winner zeigen
        setTimeout(() => {
            console.log('=== ANIMATION COMPLETE - HIDING CASE ===');
            this.hideCaseElements();
            
            // 9. Winner Display zeigen
            setTimeout(() => {
                console.log('=== SHOWING WINNER DISPLAY ===');
                this.showWinnerDisplay(selectedChallenge);
            }, 1000); // 1 Sekunde warten für Fade-Out
        }, animationDuration + 500); // Animation + kleiner Puffer
    }

    showChallengeInfo(challenge) {
        document.getElementById('challengeImage').textContent = challenge.image;
        document.getElementById('challengeTitle').textContent = challenge.title;
        document.getElementById('challengeType').textContent = this.getTypeDisplayName(challenge.type);
        
        if (challenge.target > 0) {
            document.getElementById('challengeTarget').textContent = `Ziel: ${challenge.target}`;
        } else {
            document.getElementById('challengeTarget').textContent = 'Ziel: Überleben';
        }
        
        const minutes = Math.floor(challenge.timeLimit / 60);
        const seconds = challenge.timeLimit % 60;
        document.getElementById('challengeTime').textContent = 
            `Zeit: ${minutes}:${seconds.toString().padStart(2, '0')} min`;
        
        const superIndicator = document.getElementById('superIndicator');
        if (challenge.isSuper) {
            superIndicator.style.display = 'block';
        } else {
            superIndicator.style.display = 'none';
        }
    }

    hideCaseElements() {
        const caseContainer = document.getElementById('caseContainer');
        const infoPanel = document.getElementById('infoPanel');
        
        // Add fade-out animation
        caseContainer.classList.add('fade-out');
        infoPanel.classList.add('fade-out');
        
        setTimeout(() => {
            caseContainer.classList.remove('active', 'fade-out', 'fade-in');
            infoPanel.classList.remove('active', 'fade-out');
            
            // Keep light blur if challenge is active, otherwise remove
            if (!this.activeChallenge || document.getElementById('activeChallenge').style.display === 'none') {
                this.setBackgroundBlur('none');
            }
        }, 300);
    }
    
    highlightSelectedItem(itemIndex) {
        const items = document.querySelectorAll('.case-item');
        if (items[itemIndex]) {
            items[itemIndex].classList.add('case-item-selected');
            
            // Add pulse effect
            setTimeout(() => {
                items[itemIndex].classList.add('case-item-pulse');
            }, 100);
        }
    }

    startChallenge(challenge) {
        this.hideAllElements();
        this.activeChallenge = challenge;
        
        // Light background blur for active challenge
        this.setBackgroundBlur('active');
        
        document.getElementById('activeChallengeTitle').textContent = challenge.title;
        document.getElementById('challengeStatus').textContent = 'AKTIV';
        document.getElementById('challengeStatus').className = 'challenge-status';
        
        const challengeDisplay = document.getElementById('activeChallenge');
        challengeDisplay.style.display = 'block';
        
        // Reset position to top-left if not already positioned
        if (!challengeDisplay.style.left || !challengeDisplay.style.top) {
            challengeDisplay.style.left = '30px';
            challengeDisplay.style.top = '30px';
        }
        
        this.updateChallenge(challenge);
    }

    updateChallenge(challenge) {
        if (!challenge) return;
        
        this.activeChallenge = challenge;
        
        // Update timer
        const minutes = Math.floor(challenge.timeRemaining / 60);
        const seconds = challenge.timeRemaining % 60;
        document.getElementById('timerText').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update timer ring
        const totalTime = challenge.timeLimit;
        const timeElapsed = totalTime - challenge.timeRemaining;
        const progress = (timeElapsed / totalTime) * 283; // 283 is the circumference
        document.getElementById('timerProgress').style.strokeDashoffset = progress;
        
        // Update progress bar
        if (challenge.target > 0) {
            const progressPercent = (challenge.progress / challenge.target) * 100;
            document.getElementById('progressFill').style.width = `${Math.min(progressPercent, 100)}%`;
            document.getElementById('progressText').textContent = `${challenge.progress} / ${challenge.target}`;
        } else {
            // For survive challenges, show time remaining as progress
            const timePercent = (challenge.timeRemaining / challenge.timeLimit) * 100;
            document.getElementById('progressFill').style.width = `${timePercent}%`;
            document.getElementById('progressText').textContent = `${minutes}:${seconds.toString().padStart(2, '0')} verbleibend`;
        }
        
        // Update status
        const statusElement = document.getElementById('challengeStatus');
        if (challenge.isPaused) {
            statusElement.textContent = 'PAUSIERT';
            statusElement.className = 'challenge-status paused';
        } else {
            statusElement.textContent = 'AKTIV';
            statusElement.className = 'challenge-status';
        }
    }

    showResult(result, challenge, donationAmount = null, sessionData = null) {
        console.log('=== SHOWING RESULT ===');
        console.log('Result:', result);
        console.log('Donation Amount:', donationAmount);
        console.log('Session Data:', sessionData);
        
        this.hideAllElements();
        
        // Intense background blur for result display
        this.setBackgroundBlur('intense');
        
        const resultDisplay = document.getElementById('resultDisplay');
        const resultIcon = document.getElementById('resultIcon');
        const resultIconGlow = document.getElementById('resultIconGlow');
        const resultTitle = document.getElementById('resultTitle');
        const resultSubtitle = document.getElementById('resultSubtitle');
        const donationInfo = document.getElementById('donationInfo');
        const donationAmountEl = document.getElementById('donationAmount');
        const donationMultiplier = document.getElementById('donationMultiplier');
        
        resultDisplay.className = 'result-display';
        
        if (result === 'success') {
            resultDisplay.classList.add('result-success');
            resultIcon.textContent = '🎉';
            resultIconGlow.className = 'result-icon-glow success-glow';
            resultTitle.textContent = 'GESCHAFFT!';
            resultSubtitle.textContent = 'Challenge erfolgreich abgeschlossen!';
            donationInfo.style.display = 'none';
            
            this.createSuccessParticles();
        } else {
            resultDisplay.classList.add('result-failure');
            resultIcon.textContent = '💔';
            resultIconGlow.className = 'result-icon-glow failure-glow';
            resultTitle.textContent = 'NICHT GESCHAFFT!';
            resultSubtitle.textContent = 'Challenge leider verloren...';
            
            if (donationAmount) {
                donationAmountEl.textContent = `+${donationAmount.toFixed(2)}€`;
                donationInfo.style.display = 'block';
                
                // Show multiplier if it's a super challenge
                if (challenge && challenge.isSuper) {
                    donationMultiplier.style.display = 'block';
                } else {
                    donationMultiplier.style.display = 'none';
                }
                
                // Request real session data from main process
                if (typeof ipcRenderer !== 'undefined') {
                    try {
                        ipcRenderer.send('get-donation-stats');
                        
                        // Listen for real data
                        ipcRenderer.once('donation-stats-response', (event, realSessionData) => {
                            console.log('Received real session data:', realSessionData);
                            this.animateDonationCounters(realSessionData, donationAmount);
                        });
                        
                        // Fallback if no response within 2 seconds
                        setTimeout(() => {
                            if (!sessionData) {
                                console.log('Using fallback session data');
                                const fallbackData = {
                                    previousSessionTotal: 0.00,
                                    currentSessionTotal: donationAmount,
                                    previousLifetimeTotal: 0.00,
                                    currentLifetimeTotal: donationAmount
                                };
                                this.animateDonationCounters(fallbackData, donationAmount);
                            }
                        }, 2000);
                        
                    } catch (e) {
                        console.log('IPC failed for donation stats:', e);
                        this.useFallbackDonationData(donationAmount);
                    }
                } else {
                    this.useFallbackDonationData(donationAmount);
                }
            } else {
                donationInfo.style.display = 'none';
            }
        }
        
        resultDisplay.style.display = 'flex';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            this.hideResult();
        }, 10000);
    }
    
    useFallbackDonationData(donationAmount) {
        console.log('Using fallback donation data');
        const fallbackData = {
            previousSessionTotal: 0.00,
            currentSessionTotal: donationAmount,
            previousLifetimeTotal: 0.00,
            currentLifetimeTotal: donationAmount
        };
        
        setTimeout(() => {
            this.animateDonationCounters(fallbackData, donationAmount);
        }, 1000);
    }
    
    hideResult() {
        const resultDisplay = document.getElementById('resultDisplay');
        resultDisplay.style.display = 'none';
        
        // Remove background blur
        this.setBackgroundBlur('none');
        
        // Clear particles
        const particlesContainer = document.getElementById('resultParticles');
        particlesContainer.innerHTML = '';
    }
    
    setupDragAndDrop() {
        const challengeDisplay = document.getElementById('activeChallenge');
        
        challengeDisplay.addEventListener('mousedown', (e) => {
            if (e.target.closest('.challenge-status')) {
                return; // Don't drag when clicking status
            }
            
            this.isDragging = true;
            challengeDisplay.classList.add('dragging');
            
            const rect = challengeDisplay.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            
            // KOMPLETT OHNE BEGRENZUNG - erlaubt Bewegung überall
            challengeDisplay.style.left = x + 'px';
            challengeDisplay.style.top = y + 'px';
            
            console.log(`Dragging to: ${x}, ${y}`);
            
            e.preventDefault();
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                challengeDisplay.classList.remove('dragging');
                
                // Save position to settings (optional)
                this.saveChallengePosition();
            }
        });
        
        // Prevent text selection while dragging
        challengeDisplay.addEventListener('selectstart', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        });
    }
    
    saveChallengePosition() {
        const challengeDisplay = document.getElementById('activeChallenge');
        const position = {
            left: challengeDisplay.style.left,
            top: challengeDisplay.style.top
        };
        
        // Send position to main process for saving
        if (typeof ipcRenderer !== 'undefined') {
            ipcRenderer.send('save-challenge-position', position);
        }
    }
    
    restoreChallengePosition(position) {
        const challengeDisplay = document.getElementById('activeChallenge');
        if (position && position.left && position.top) {
            challengeDisplay.style.left = position.left;
            challengeDisplay.style.top = position.top;
        }
    }
    
    setBackgroundBlur(level) {
        const blur = document.getElementById('backgroundBlur');
        
        // Remove all blur classes
        blur.classList.remove('active', 'intense');
        
        // Add appropriate blur class
        if (level === 'active') {
            blur.classList.add('active');
        } else if (level === 'intense') {
            blur.classList.add('intense');
        }
        // 'none' means no class is added, blur is removed
    }
    
    showWinnerDisplay(challenge) {
        console.log('Showing winner display for:', challenge.title);
        
        // Show winner info for 4 seconds
        const winnerDisplay = document.createElement('div');
        winnerDisplay.className = 'winner-display';
        winnerDisplay.innerHTML = `
            <div class="winner-content">
                <div class="winner-icon">${challenge.image}</div>
                <div class="winner-title">Ausgewählt!</div>
                <div class="winner-challenge">${challenge.title}</div>
                <div class="winner-type">${this.getTypeDisplayName(challenge.type)}</div>
                ${challenge.isSuper ? '<div class="winner-super">SUPER CHALLENGE!</div>' : ''}
            </div>
        `;
        
        document.querySelector('.obs-container').appendChild(winnerDisplay);
        
        // Remove after 4 seconds and start challenge directly
        setTimeout(() => {
            console.log('Winner display timeout - starting challenge');
            winnerDisplay.classList.add('fade-out');
            
            setTimeout(() => {
                winnerDisplay.remove();
                console.log('Winner display removed - attempting to start challenge');
                
                // Try multiple methods to start the challenge
                this.startSelectedChallenge(challenge);
            }, 300);
        }, 4000);
    }
    
    startSelectedChallenge(challenge) {
        console.log('Starting selected challenge:', challenge.title);
        
        // Method 1: Try IPC if available
        if (typeof ipcRenderer !== 'undefined') {
            try {
                ipcRenderer.send('start-selected-challenge', challenge);
                console.log('Challenge start sent via IPC');
                return;
            } catch (e) {
                console.log('IPC challenge start failed:', e);
            }
        }
        
        // Method 2: Direct challenge start (fallback for desktop mode)
        try {
            this.startChallenge(challenge);
            console.log('Challenge started directly');
        } catch (e) {
            console.log('Direct challenge start failed:', e);
        }
    }
    
    playSound(soundType) {
        // For desktop mode: Try multiple methods to play sound
        console.log(`Playing sound: ${soundType}`);
        
        // Method 1: Try IPC if available
        if (typeof ipcRenderer !== 'undefined') {
            try {
                ipcRenderer.send('play-sound', soundType);
                return;
            } catch (e) {
                console.log('IPC sound failed, trying alternative methods');
            }
        }
        
        // Method 2: HTML5 Audio with data URLs (fallback)
        try {
            const audio = new Audio();
            
            // Simple beep sounds for different events
            if (soundType === 'case-opening') {
                // Rising tone for case opening
                this.playTone([440, 554, 659], 200);
            } else if (soundType === 'case-selected') {
                // Success chime
                this.playTone([523, 659, 784], 150);
            }
        } catch (e) {
            console.log('HTML5 Audio fallback failed:', e);
        }
    }
    
    playTone(frequencies, duration) {
        // Generate simple tones using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            frequencies.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (duration / 1000));
                
                oscillator.start(audioContext.currentTime + (index * duration / 1000 / 2));
                oscillator.stop(audioContext.currentTime + ((index + 1) * duration / 1000));
            });
        } catch (e) {
            console.log('Web Audio API failed:', e);
        }
    }
    
    animateDonationCounters(sessionData, newDonation) {
        const sessionAmountEl = document.getElementById('sessionAmount');
        const lifetimeAmountEl = document.getElementById('lifetimeAmount');
        
        const oldSessionTotal = sessionData.previousSessionTotal || 0;
        const newSessionTotal = sessionData.currentSessionTotal || (oldSessionTotal + newDonation);
        const oldLifetimeTotal = sessionData.previousLifetimeTotal || 0;
        const newLifetimeTotal = sessionData.currentLifetimeTotal || (oldLifetimeTotal + newDonation);
        
        // Start with old values
        sessionAmountEl.textContent = `${oldSessionTotal.toFixed(2)}€`;
        lifetimeAmountEl.textContent = `${oldLifetimeTotal.toFixed(2)}€`;
        
        // Animate to new values
        setTimeout(() => {
            this.animateCounterUp(sessionAmountEl, oldSessionTotal, newSessionTotal, 2000);
            this.animateCounterUp(lifetimeAmountEl, oldLifetimeTotal, newLifetimeTotal, 2500);
        }, 500);
    }
    
    animateCounterUp(element, startValue, endValue, duration) {
        const startTime = Date.now();
        const difference = endValue - startValue;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = startValue + (difference * easeOutQuart);
            
            element.textContent = `${currentValue.toFixed(2)}€`;
            
            // Add pulse effect during animation
            if (progress < 1) {
                element.style.transform = `scale(${1 + Math.sin(progress * Math.PI * 6) * 0.05})`;
                requestAnimationFrame(animate);
            } else {
                element.style.transform = 'scale(1)';
                // Flash effect at the end
                element.classList.add('counter-flash');
                setTimeout(() => {
                    element.classList.remove('counter-flash');
                }, 600);
            }
        };
        
        animate();
    }
    

    createSuccessParticles() {
        const particlesContainer = document.getElementById('resultParticles');
        particlesContainer.innerHTML = '';
        
        // Create 20 particles
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Random position
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 50 + 50 + '%'; // Start from bottom half
            
            // Random delay
            particle.style.animationDelay = Math.random() * 2 + 's';
            
            // Random color
            const colors = ['#ffd700', '#ffed4e', '#10b981', '#667eea'];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            particlesContainer.appendChild(particle);
        }
    }

    getTypeDisplayName(type) {
        const types = {
            collect: 'Sammeln',
            survive: 'Überleben',
            achieve: 'Erreichen'
        };
        return types[type] || type;
    }
}

// Initialize OBS overlay
const obsOverlay = new OBSOverlay();