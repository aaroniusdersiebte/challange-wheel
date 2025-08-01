// Desktop Overlay - Handles wheel animation and challenge display over the entire screen
const { ipcRenderer } = require('electron');

class DesktopOverlay {
    constructor() {
        this.isAnimating = false;
        this.isShowingResult = false;
        this.currentChallenge = null;
        this.winnerTimeout = null;
        this.hideTimeout = null;
        this.resultTimeout = null;
        this.resultHideTimeout = null;
        this.audioContext = null;
        this.audioInitialized = false;
        this.clickInterval = null;
        this.clickTimeout = null;
        this.setupAudio();
        this.setupEventListeners();
        console.log('Desktop Overlay initialized');
    }

    setupAudio() {
        console.log('Setting up audio system...');
        this.audioInitialized = false;
        this.audioContext = null;
        
        // Create simple HTML5 audio for testing
        this.testAudio = new Audio();
        this.testAudio.volume = 0.3;
        
        // Try to create Web Audio context as fallback
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Web Audio context created');
        } catch (e) {
            console.log('Web Audio API not available:', e);
        }
    }

    async playSound(type) {
        console.log('Attempting to play sound:', type);
        
        // Simple approach using data URL generated beeps
        try {
            let frequency, duration, type2;
            
            switch(type) {
                case 'spin':
                    // Start clicking sound during wheel spin
                    // Duration will be set when we call this method
                    this.startClickingSound(this.currentAnimationDuration || 3000);
                    return; // Don't play individual sound, just start clicking
                case 'click':
                    frequency = 800;
                    duration = 0.05;
                    break;
                case 'select':
                    frequency = 1200;
                    duration = 0.3;
                    break;
                case 'win':
                    // Pleasant ascending chime
                    frequency = 523; // C5
                    duration = 0.2;
                    type2 = 'win-chord';
                    break;
                case 'lose':
                    // Gentle descending tone
                    frequency = 440; // A4
                    duration = 0.4;
                    type2 = 'lose-chord';
                    break;
                default:
                    frequency = 440;
                    duration = 0.3;
            }
            
            // Create a simple beep using Web Audio API if available
            if (this.audioContext) {
                try {
                    if (this.audioContext.state === 'suspended') {
                        await this.audioContext.resume();
                    }
                    
                    if (type2 === 'win-chord') {
                        // Play ascending chord for win (reduced volume)
                        this.playChord([523, 659, 784], 0.06, 0.6); // C5, E5, G5 - reduced volume from 0.15 to 0.06
                        return;
                    } else if (type2 === 'lose-chord') {
                        // Play descending tone for lose
                        this.playDescendingTone(440, 220, 0.8);
                        return;
                    }
                    
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.frequency.value = frequency;
                    oscillator.type = type === 'click' ? 'square' : 'sine';
                    
                    const volume = type === 'click' ? 0.03 : 0.1;
                    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
                    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
                    
                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + duration);
                    
                    console.log('Sound played successfully:', type);
                    return;
                } catch (e) {
                    console.error('Web Audio failed:', e);
                }
            }
            
            // Fallback: System beep (might not work in all browsers)
            console.log('Fallback: Attempting system beep');
            console.log('\u0007'); // ASCII bell character
            
        } catch (e) {
            console.error('Error playing sound:', type, e);
        }
    }

    startClickingSound(duration = 3000) {
        this.stopClickingSound(); // Stop any existing clicking
        
        // Start clicking with progressive slowing
        let clickCount = 0;
        const maxClicks = Math.floor(duration / 50); // Adaptive max clicks based on duration
        const startInterval = 40; // Start fast
        const endInterval = 150; // End slow
        
        const scheduleNextClick = () => {
            if (clickCount >= maxClicks) {
                return;
            }
            
            // Calculate current interval based on progress (logarithmic easing)
            const progress = clickCount / maxClicks;
            const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
            const currentInterval = startInterval + (endInterval - startInterval) * easeOut;
            
            this.clickTimeout = setTimeout(() => {
                this.playSound('click');
                clickCount++;
                scheduleNextClick();
            }, currentInterval);
        };
        
        scheduleNextClick();
        console.log('Started progressive clicking sound');
    }
    
    stopClickingSound() {
        if (this.clickInterval) {
            clearInterval(this.clickInterval);
            this.clickInterval = null;
        }
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
        }
        console.log('Stopped clicking sound');
    }
    
    playChord(frequencies, volume = 0.1, duration = 0.5) {
        if (!this.audioContext) return;
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.value = freq;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + duration);
            }, index * 150); // Stagger each note by 150ms
        });
    }
    
    playDescendingTone(startFreq, endFreq, duration) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + duration);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.08, this.audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    clearAllTimeouts() {
        console.log('Clearing all timeouts');
        if (this.winnerTimeout) {
            clearTimeout(this.winnerTimeout);
            this.winnerTimeout = null;
        }
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        if (this.resultTimeout) {
            clearTimeout(this.resultTimeout);
            this.resultTimeout = null;
        }
        if (this.resultHideTimeout) {
            clearTimeout(this.resultHideTimeout);
            this.resultHideTimeout = null;
        }
        
        // Stop clicking sounds
        this.stopClickingSound();
        
        // Remove any existing result overlays
        const existingResults = document.querySelectorAll('.result-overlay');
        existingResults.forEach(overlay => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        });
    }

    setupEventListeners() {
        // Listen for IPC messages from main window
        ipcRenderer.on('start-animation', (event, data) => {
            console.log('Starting wheel animation with data:', data);
            this.startWheelAnimation(data);
        });

        ipcRenderer.on('update-display', (event, data) => {
            console.log('Updating display with data:', data);
            this.updateDisplay(data);
        });

        // Handle window focus to stay on top
        window.addEventListener('blur', () => {
            window.focus();
        });
        
        // Auto-initialize audio when wheel starts spinning
        const initAudio = async () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                try {
                    await this.audioContext.resume();
                    console.log('Audio context resumed successfully');
                    this.audioInitialized = true;
                } catch (e) {
                    console.error('Failed to resume audio context:', e);
                }
            } else if (this.audioContext) {
                this.audioInitialized = true;
                console.log('Audio context ready');
            }
        };
        
        // Initialize audio when animation starts
        document.addEventListener('DOMContentLoaded', initAudio);
        setTimeout(initAudio, 1000); // Also try after 1 second
    }

    startWheelAnimation(data) {
        if (this.isAnimating || this.isShowingResult) {
            console.log('Animation already in progress or showing result, ignoring new wheel spin');
            return;
        }
        
        const { challenges, selectedChallenge, settings } = data;
        
        console.log('Starting new wheel animation');
        this.isAnimating = true;
        this.isShowingResult = false;
        this.clearAllTimeouts();
        this.showWheelArea();
        this.runCaseAnimation(challenges, selectedChallenge, settings);
    }

    showWheelArea() {
        const wheelArea = document.getElementById('wheelAnimationArea');
        const winnerDisplay = document.getElementById('winnerDisplay');
        const caseContainer = document.getElementById('caseContainer');
        const challengePanel = document.getElementById('challengePanelOverlay');
        
        // Hide any existing displays
        challengePanel.style.display = 'none';
        
        wheelArea.style.display = 'flex';
        winnerDisplay.style.display = 'none';
        winnerDisplay.style.animation = ''; // Reset animation
        caseContainer.style.display = 'block';
        
        console.log('Wheel area shown, displays reset');
    }

    runCaseAnimation(challenges, selectedChallenge, settings) {
        const container = document.getElementById('caseItemList');
        const animationDuration = (settings.animationDuration || 3.0) * 1000;
        this.currentAnimationDuration = animationDuration; // Store for clicking sound
        
        // Create duplicated challenges for seamless scrolling
        const duplicatedChallenges = [];
        for (let i = 0; i < 25; i++) {
            duplicatedChallenges.push(...challenges);
        }
        
        // Clear container and reset position
        container.innerHTML = '';
        container.style.transform = 'translateX(0px)';
        container.style.transition = 'none';
        
        // Populate with challenge items
        duplicatedChallenges.forEach((challenge, index) => {
            const item = document.createElement('div');
            item.className = 'case-item';
            item.innerHTML = `
                <div class="case-item-icon">${challenge.image}</div>
                <div class="case-item-title">${challenge.title}</div>
                <div class="case-item-type">${this.getTypeDisplayName(challenge.type)}</div>
                ${challenge.isSuper ? '<div class="case-item-super">SUPER</div>' : ''}
            `;
            container.appendChild(item);
        });
        
        // Start animation after container is populated
        requestAnimationFrame(() => {
            const totalWidth = container.scrollWidth;
            const itemWidth = 170; // 150px + 20px gap
            const centerOffset = window.innerWidth / 2;
            
            // Calculate final position to center selected item
            const selectedIndex = Math.floor(duplicatedChallenges.length * 0.6) + Math.floor(Math.random() * 3);
            const finalPosition = -(selectedIndex * itemWidth - centerOffset);
            
            // Play spin sound
            this.playSound('spin');
            
            this.animateWheelSmooth(container, finalPosition, animationDuration, () => {
                // Stop clicking sound and play selection sound when wheel stops
                this.stopClickingSound();
                this.playSound('select');
                this.showWinnerDisplay(selectedChallenge);
            });
        });
    }

    animateWheelSmooth(container, finalPosition, totalDuration, onComplete) {
        const startTime = performance.now();
        const startPosition = 0;
        const distance = finalPosition - startPosition;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);
            
            // Single smooth deceleration curve - no multiple phases
            // Custom cubic-bezier similar to CSS ease-out but more gradual
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            
            const currentPosition = startPosition + (distance * easeOutCubic);
            container.style.transform = `translateX(${currentPosition}px)`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                container.style.transform = `translateX(${finalPosition}px)`;
                onComplete();
            }
        };
        
        requestAnimationFrame(animate);
    }

    showWinnerDisplay(challenge) {
        // Hide case container and show winner
        document.getElementById('caseContainer').style.display = 'none';
        const winnerDisplay = document.getElementById('winnerDisplay');
        winnerDisplay.style.display = 'block';
        
        // Update winner display
        document.getElementById('winnerIcon').textContent = challenge.image;
        document.getElementById('winnerTitle').textContent = challenge.title;
        document.getElementById('winnerDetails').innerHTML = `
            ${this.getTypeDisplayName(challenge.type)}
            ${this.getChallengeTargetText(challenge)}
            • ${Math.floor(challenge.timeLimit / 60)}:${(challenge.timeLimit % 60).toString().padStart(2, '0')} min
            ${challenge.isSuper ? '<span class="super-badge">SUPER CHALLENGE</span>' : ''}
        `;
        
        // Hide wheel area and show challenge panel after consistent 5 seconds
        this.winnerTimeout = setTimeout(() => {
            winnerDisplay.style.animation = 'fadeOutScale 0.8s ease-out forwards';
            this.hideTimeout = setTimeout(() => {
                this.hideWheelArea();
                this.showChallengePanel(challenge);
            }, 800);
        }, 5000);
    }

    hideWheelArea() {
        document.getElementById('wheelAnimationArea').style.display = 'none';
        this.isAnimating = false;
        console.log('Wheel area hidden, animation state reset');
    }

    showChallengePanel(challenge) {
        this.currentChallenge = challenge;
        const panel = document.getElementById('challengePanelOverlay');
        
        // Update challenge info
        document.getElementById('challengeEmoji').textContent = challenge.image;
        document.getElementById('activeChallengeTitle').textContent = challenge.title;
        document.getElementById('challengeType').textContent = this.getTypeDisplayName(challenge.type);
        document.getElementById('challengeTimeLimit').textContent = 
            `Zeitlimit: ${Math.floor(challenge.timeLimit / 60)}:${(challenge.timeLimit % 60).toString().padStart(2, '0')} min`;
        
        // Show super indicator if needed
        const superIndicator = document.getElementById('superIndicator');
        if (challenge.isSuper) {
            superIndicator.style.display = 'block';
        } else {
            superIndicator.style.display = 'none';
        }
        
        // Setup progress bar visibility based on challenge type
        const progressBarContainer = document.getElementById('progressBarContainer');
        if (challenge.type === 'survive') {
            progressBarContainer.style.display = 'none';
        } else {
            progressBarContainer.style.display = 'block';
        }
        
        // Initialize display
        this.updateChallengeDisplay({
            timeRemaining: challenge.timeLimit,
            progress: 0,
            target: challenge.target,
            type: challenge.type
        });
        
        panel.style.display = 'block';
    }

    hideChallengePanel() {
        document.getElementById('challengePanelOverlay').style.display = 'none';
        this.currentChallenge = null;
    }

    updateDisplay(data) {
        if (data.action === 'update-challenge') {
            this.updateChallengeDisplay(data.challenge);
        } else if (data.action === 'hide-challenge') {
            this.hideChallengePanel();
        } else if (data.action === 'show-result') {
            this.showResult(data);
        }
    }

    updateChallengeDisplay(challenge) {
        const minutes = Math.floor(challenge.timeRemaining / 60);
        const seconds = challenge.timeRemaining % 60;
        const timerDisplay = document.getElementById('timerDisplay');
        
        // Store previous time for bounce detection
        if (!this.previousTime) this.previousTime = challenge.timeRemaining;
        
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
        
        // Add pulsing effect when time is running low
        if (challenge.timeRemaining <= 30) {
            timerDisplay.style.color = '#ef4444';
            timerDisplay.style.animation = 'pulse 1s infinite';
        } else if (challenge.timeRemaining <= 60) {
            timerDisplay.style.color = '#f59e0b';
            timerDisplay.style.animation = 'none';
        } else {
            timerDisplay.style.color = '#ffffff';
            timerDisplay.style.animation = 'none';
        }
        
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.previousTime = challenge.timeRemaining;

        // Update progress display based on challenge type
        const progressDisplay = document.getElementById('progressDisplay');
        const progressBar = document.getElementById('progressBar');
        
        // Store previous progress for bounce detection
        if (!this.previousProgress) this.previousProgress = challenge.progress;
        
        if (challenge.type === 'survive') {
            // Hide progress completely for survive challenges
            progressDisplay.parentElement.style.display = 'none';
        } else if (challenge.type === 'max') {
            progressDisplay.parentElement.style.display = 'block';
            const remaining = Math.max(0, challenge.target - challenge.progress);
            progressDisplay.textContent = `${challenge.progress}/${challenge.target}`;
            
            // Add bounce animation when progress changes
            if (challenge.progress !== this.previousProgress) {
                progressDisplay.classList.remove('scale-bounce-animation');
                setTimeout(() => progressDisplay.classList.add('scale-bounce-animation'), 10);
                setTimeout(() => progressDisplay.classList.remove('scale-bounce-animation'), 400);
            }
            
            // Update progress bar with more aggressive red color progression
            const percentage = (challenge.progress / challenge.target) * 100;
            progressBar.style.width = `${Math.min(percentage, 100)}%`;
            
            // More aggressive color progression for max challenges
            if (percentage >= 85) {
                progressBar.style.background = 'linear-gradient(90deg, #dc2626, #ef4444)'; // Dark red
            } else if (percentage >= 70) {
                progressBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)'; // Red
            } else if (percentage >= 50) {
                progressBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)'; // Yellow
            } else {
                progressBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)'; // Green
            }
        } else { // collect
            progressDisplay.parentElement.style.display = 'block';
            progressDisplay.textContent = `${challenge.progress}/${challenge.target}`;
            
            // Add bounce animation when progress changes
            if (challenge.progress !== this.previousProgress) {
                progressDisplay.classList.remove('scale-bounce-animation');
                setTimeout(() => progressDisplay.classList.add('scale-bounce-animation'), 10);
                setTimeout(() => progressDisplay.classList.remove('scale-bounce-animation'), 400);
            }
            
            // Standard progress bar for collect challenges
            const percentage = (challenge.progress / challenge.target) * 100;
            progressBar.style.width = `${Math.min(percentage, 100)}%`;
            
            // Standard color logic for collect challenges
            if (percentage >= 80) {
                progressBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
            } else if (percentage >= 50) {
                progressBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
            } else {
                progressBar.style.background = 'linear-gradient(90deg, #c7592e, #e67e40)';
            }
        }
        
        this.previousProgress = challenge.progress;
    }

    async showResult(data) {
        if (this.isShowingResult) {
            console.log('Already showing result, ignoring new result');
            return;
        }
        
        const { result, challenge, donation, sessionStats, totalStats } = data;
        
        console.log('Showing result:', result);
        this.isShowingResult = true;
        
        // Clear any existing result timeouts
        if (this.resultTimeout) clearTimeout(this.resultTimeout);
        if (this.resultHideTimeout) clearTimeout(this.resultHideTimeout);
        
        // Create result overlay (no background)
        const resultOverlay = document.createElement('div');
        resultOverlay.className = 'result-overlay'; // Add class for easier cleanup
        resultOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 20000;
            animation: fadeInScale 0.6s ease-out;
        `;
        
        const resultContent = document.createElement('div');
        resultContent.style.cssText = `
            text-align: center;
            padding: 80px 60px;
            background: rgba(30, 41, 59, 0.98);
            backdrop-filter: blur(25px);
            border-radius: 30px;
            border: 4px solid ${result === 'success' ? '#10b981' : '#ef4444'};
            max-width: 700px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7), 0 0 100px ${result === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
            position: relative;
            overflow: hidden;
        `;
        
        if (result === 'success') {
            // Play win sound
            this.playSound('win');
            
            resultContent.innerHTML = `
                <div style="font-size: 100px; margin-bottom: 30px; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));">✅</div>
                <div style="font-size: 42px; font-weight: bold; color: #10b981; margin-bottom: 20px; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);">
                    Challenge Geschafft!
                </div>
                <div style="font-size: 20px; color: rgba(255, 255, 255, 0.9);">
                    ${challenge.image} ${challenge.title}
                </div>
            `;
        } else {
            // Play lose sound
            this.playSound('lose');
            
            // Get current stats from main process
            const currentSessionAmount = sessionStats ? sessionStats.amount : 0;
            const currentTotalAmount = totalStats ? totalStats.amount : 0;
            const newSessionAmount = currentSessionAmount + donation;
            const newTotalAmount = currentTotalAmount + donation;
            
            resultContent.innerHTML = `
                <div style="font-size: 100px; margin-bottom: 30px; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));">❌</div>
                <div style="font-size: 42px; font-weight: bold; color: #ef4444; margin-bottom: 20px; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);">
                    Challenge Verloren!
                </div>
                <div style="font-size: 20px; color: rgba(255, 255, 255, 0.9); margin-bottom: 30px;">
                    ${challenge.image} ${challenge.title}
                </div>
                ${challenge.isSuper ? `
                    <div style="background: linear-gradient(45deg, #ffd700, #ffed4e); color: #000; padding: 8px 16px; border-radius: 20px; font-size: 16px; font-weight: bold; margin-bottom: 20px; display: inline-block;">
                        🌟 SUPER CHALLENGE - 2x Spende! 🌟
                    </div>
                ` : ''}
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px;">
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 25px; border-radius: 20px; border: 2px solid rgba(255, 255, 255, 0.1);">
                        <div style="font-size: 14px; color: rgba(255, 255, 255, 0.7); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Session</div>
                        <div style="font-size: 36px; font-weight: bold; color: #ffd700; margin-bottom: 10px;" id="sessionAmountDisplay">
                            ${currentSessionAmount.toFixed(2)}€
                        </div>
                        <div style="font-size: 18px; color: #4ade80; font-weight: 600;" id="sessionIncrease">
                            +${donation.toFixed(2)}€
                        </div>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 25px; border-radius: 20px; border: 2px solid rgba(255, 255, 255, 0.1);">
                        <div style="font-size: 14px; color: rgba(255, 255, 255, 0.7); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Gesamt</div>
                        <div style="font-size: 36px; font-weight: bold; color: #ffd700; margin-bottom: 10px;" id="totalAmountDisplay">
                            ${currentTotalAmount.toFixed(2)}€
                        </div>
                        <div style="font-size: 18px; color: #4ade80; font-weight: 600;" id="totalIncrease">
                            +${donation.toFixed(2)}€
                        </div>
                    </div>
                </div>
            `;
            
            // Add count-up animation after element is in DOM
            setTimeout(() => {
                this.animateCountUp('sessionAmountDisplay', currentSessionAmount, newSessionAmount, 1500);
                this.animateCountUp('totalAmountDisplay', currentTotalAmount, newTotalAmount, 1500);
            }, 800);
        }
        
        resultOverlay.appendChild(resultContent);
        document.body.appendChild(resultOverlay);
        
        // Clear existing result timeouts
        if (this.resultTimeout) clearTimeout(this.resultTimeout);
        if (this.resultHideTimeout) clearTimeout(this.resultHideTimeout);
        
        // Display for 7 seconds, then fade out over 1 second
        this.resultTimeout = setTimeout(() => {
            resultOverlay.style.animation = 'fadeOutScale 1s ease-out forwards';
            this.resultHideTimeout = setTimeout(() => {
                if (document.body.contains(resultOverlay)) {
                    document.body.removeChild(resultOverlay);
                }
                this.hideChallengePanel();
                this.isShowingResult = false;
                console.log('Result display completed, state reset');
            }, 1000);
        }, 7000);
    }
    
    animateCountUp(elementId, startValue, endValue, duration) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const startTime = performance.now();
        const difference = endValue - startValue;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (difference * easeOutCubic);
            
            element.textContent = `${currentValue.toFixed(2)}€`;
            element.style.animation = 'countUp 0.3s ease-out';
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Final value with a slight bounce effect
                element.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                    element.style.transition = 'transform 0.3s ease';
                }, 200);
            }
        };
        
        requestAnimationFrame(animate);
    }

    getTypeDisplayName(type) {
        const types = {
            collect: 'Sammeln',
            survive: 'Überleben',
            max: 'Maximum'
        };
        return types[type] || type;
    }

    getChallengeTargetText(challenge) {
        if (challenge.type === 'survive') {
            return ''; // No target display for survive
        } else if (challenge.type === 'max') {
            return ` • Max: ${challenge.target}`;
        } else { // collect
            return ` • Ziel: ${challenge.target}`;
        }
    }
}

// Initialize overlay when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.desktopOverlay = new DesktopOverlay();
    });
} else {
    window.desktopOverlay = new DesktopOverlay();
}

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Overlay error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Overlay unhandled promise rejection:', e.reason);
    e.preventDefault();
});