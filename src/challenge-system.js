// Challenge System - Handles challenge logic and timer
const { ipcRenderer } = require('electron');

class ChallengeSystem {
    constructor(dataManager, uiManager) {
        this.dataManager = dataManager;
        this.uiManager = uiManager;
        this.activeChallenge = null;
        this.challengeTimer = null;
        this.isWheelSpinning = false;
        this.isShowingResults = false;
    }

    async spinWheel(wheelId) {
        // Comprehensive state check
        if (this.activeChallenge) {
            console.log('Cannot spin wheel: Challenge already active');
            alert('Eine Challenge ist bereits aktiv! Beende sie zuerst.');
            return;
        }
        
        if (this.isWheelSpinning) {
            console.log('Cannot spin wheel: Wheel is already spinning');
            return;
        }
        
        if (this.isShowingResults) {
            console.log('Cannot spin wheel: Results are being shown');
            return;
        }
        
        const wheel = this.dataManager.getWheelById(wheelId);
        if (!wheel) {
            console.error('Wheel not found:', wheelId);
            return;
        }

        const wheelChallenges = wheel.challenges || [];

        if (wheelChallenges.length === 0) {
            alert('Dieses Rad hat keine Challenges!');
            return;
        }

        // Set spinning state
        this.isWheelSpinning = true;
        console.log('Spinning wheel:', wheel.name, 'with', wheelChallenges.length, 'challenges');

        // Select challenge and send to overlay
        const selectedChallenge = this.selectRandomChallenge(wheelChallenges);
        
        try {
            // Show overlay with animation
            await ipcRenderer.invoke('show-overlay', {
                challenges: wheelChallenges,
                selectedChallenge: selectedChallenge,
                settings: this.dataManager.settings
            });
            
            // Start challenge after consistent animation time (wheel + winner display)
            const totalAnimationTime = (this.dataManager.settings.animationDuration + 5.8) * 1000; // animation + 5s winner + 0.8s fadeout
            setTimeout(() => {
                this.isWheelSpinning = false; // Reset spinning state
                this.startChallenge(selectedChallenge);
            }, totalAnimationTime);
        } catch (error) {
            console.error('Error showing overlay:', error);
            this.isWheelSpinning = false; // Reset on error
        }
    }

    spinRandomWheel() {
        const activeWheel = this.dataManager.getActiveWheel();
        if (activeWheel) {
            this.spinWheel(activeWheel.id);
        }
    }

    selectRandomChallenge(challenges) {
        // Select random challenge
        const selected = challenges[Math.floor(Math.random() * challenges.length)];
        
        // Determine if this becomes a super challenge
        const superChance = Math.random() * 100;
        const isSuper = superChance < this.dataManager.settings.superChance;
        
        // Create a copy with super status
        const finalChallenge = { ...selected, isSuper };
        
        console.log('Challenge selected:', finalChallenge.title, isSuper ? '(SUPER!)' : '');
        return finalChallenge;
    }

    async startChallenge(challenge) {
        this.activeChallenge = {
            ...challenge,
            startTime: Date.now(),
            progress: 0,
            isPaused: false,
            timeRemaining: challenge.timeLimit
        };

        console.log('Starting challenge:', this.activeChallenge.title);

        // Show challenge panel
        this.uiManager.showChallengePanel();
        this.updateChallengeDisplay();
        this.startTimer();
    }

    startTimer() {
        if (this.challengeTimer) {
            clearInterval(this.challengeTimer);
        }

        this.challengeTimer = setInterval(() => {
            if (!this.activeChallenge || this.activeChallenge.isPaused) return;

            this.activeChallenge.timeRemaining--;
            this.updateChallengeDisplay();

            if (this.activeChallenge.timeRemaining <= 0) {
                console.log('Challenge timed out');
                this.failChallenge();
            }
        }, 1000);
    }

    updateChallengeDisplay() {
        if (!this.activeChallenge) return;

        this.uiManager.updateChallengePanel(this.activeChallenge);
        
        // Update overlay display
        ipcRenderer.invoke('update-overlay', {
            action: 'update-challenge',
            challenge: this.activeChallenge
        });
    }

    adjustProgress(amount) {
        if (!this.activeChallenge) return;

        this.activeChallenge.progress = Math.max(0, this.activeChallenge.progress + amount);
        console.log('Progress adjusted:', this.activeChallenge.progress, '/', this.activeChallenge.target, `(${this.activeChallenge.type})`);
        this.updateChallengeDisplay();

        // Check completion/failure based on challenge type
        if (this.activeChallenge.target > 0) {
            if (this.activeChallenge.type === 'max') {
                // For max challenges, fail if we exceed the limit
                if (this.activeChallenge.progress > this.activeChallenge.target) {
                    console.log('Max challenge failed - exceeded limit');
                    this.failChallenge();
                }
            } else if (this.activeChallenge.type === 'collect') {
                // For collect challenges, complete when reaching target
                if (this.activeChallenge.progress >= this.activeChallenge.target) {
                    console.log('Collect challenge completed by progress');
                    this.completeChallenge();
                }
            }
        }
    }

    togglePause() {
        if (!this.activeChallenge) return;

        this.activeChallenge.isPaused = !this.activeChallenge.isPaused;
        console.log('Challenge paused:', this.activeChallenge.isPaused);
        this.uiManager.updatePauseButton(this.activeChallenge.isPaused);
    }

    async completeChallenge() {
        if (!this.activeChallenge) return;

        console.log('Challenge completed successfully');
        clearInterval(this.challengeTimer);
        
        this.isShowingResults = true;
        
        // Show success result on overlay
        await ipcRenderer.invoke('update-overlay', {
            action: 'show-result',
            result: 'success',
            challenge: this.activeChallenge
        });
        
        this.endChallenge();
    }

    async failChallenge() {
        if (!this.activeChallenge) return;

        console.log('Challenge failed');
        clearInterval(this.challengeTimer);
        
        this.isShowingResults = true;
        
        // Get current stats BEFORE adding donation
        const currentSessionStats = { ...this.dataManager.sessionStats };
        const currentTotalStats = { ...this.dataManager.totalStats };
        
        // Add donation
        const donationAmount = this.activeChallenge.isSuper ? 
            this.dataManager.settings.donationAmount * 2 : this.dataManager.settings.donationAmount;
        
        this.dataManager.addDonation(this.activeChallenge.title, donationAmount);

        // Show failure result on overlay with stats BEFORE donation was added
        await ipcRenderer.invoke('update-overlay', {
            action: 'show-result',
            result: 'failure',
            challenge: this.activeChallenge,
            donation: donationAmount,
            sessionStats: currentSessionStats,
            totalStats: currentTotalStats
        });

        // Update UI stats
        this.uiManager.updateStats();

        this.endChallenge();
    }

    endChallenge() {
        console.log('Challenge ended');
        this.activeChallenge = null;
        this.uiManager.hideChallengePanel();
        
        // Hide overlay after result display duration and reset states
        setTimeout(() => {
            ipcRenderer.invoke('hide-overlay');
            // Reset results state after overlay is hidden
            setTimeout(() => {
                this.isShowingResults = false;
                console.log('Results state reset - ready for next spin');
            }, 1000);
        }, 10000);
    }


    // Hotkey handlers
    handleHotkey(action) {
        console.log('Hotkey pressed:', action);
        
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
    }

    isActive() {
        return this.activeChallenge !== null;
    }

    getCurrentChallenge() {
        return this.activeChallenge;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChallengeSystem;
}