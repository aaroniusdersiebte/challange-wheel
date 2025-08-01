// Emoji Picker Functionality
class EmojiPicker {
    constructor() {
        this.emojis = [
            // Gaming
            '🎮', '🕹️', '🎯', '🏆', '🏅', '⭐', '💎', '👑', '🎪', '🎨',
            
            // Items & Objects
            '🪙', '💰', '💳', '🔑', '🗝️', '🔓', '🔒', '⚡', '🔥', '💥',
            '💊', '🧪', '⚗️', '🔮', '💜', '❤️', '💙', '💚', '💛', '🧡',
            
            // Weapons & Tools
            '⚔️', '🛡️', '🏹', '🔨', '⛏️', '🪓', '🗡️', '🔧', '🔩', '⚙️',
            
            // Nature & Elements
            '🌟', '✨', '💫', '🌙', '☀️', '⚡', '🔥', '💧', '🌊', '❄️',
            '🌿', '🍀', '🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '🦋', '🐝',
            
            // Food & Drinks
            '🍎', '🍊', '🍌', '🍇', '🍓', '🥕', '🌽', '🍞', '🧀', '🍖',
            '🍕', '🍔', '🌭', '🥤', '☕', '🍺', '🍷', '🥛', '🧃', '🍯',
            
            // Animals
            '🐱', '🐶', '🐺', '🦊', '🐸', '🐢', '🦅', '🦋', '🐉', '🦄',
            '🐲', '🦖', '🦕', '🐙', '🦈', '🐠', '🐟', '🦀', '🦞', '🐛',
            
            // Symbols
            '🎲', '🃏', '🎰', '🎪', '🎭', '🎨', '🎵', '🎶', '🎤', '🎧',
            '📱', '💻', '⌚', '📡', '🛸', '🚀', '🌍', '🌎', '🌏', '🗺️',
            
            // Time & Weather
            '⏰', '⏳', '⌛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖',
            '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '❄️',
            
            // Numbers
            '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'
        ];
        this.currentInput = null;
    }

    show(inputElement) {
        this.currentInput = inputElement;
        this.createPicker();
    }

    createPicker() {
        // Remove existing picker
        const existingPicker = document.getElementById('emojiPicker');
        if (existingPicker) {
            existingPicker.remove();
        }

        const picker = document.createElement('div');
        picker.id = 'emojiPicker';
        picker.className = 'emoji-picker';
        
        picker.innerHTML = `
            <div class="emoji-picker-header">
                <span>Emoji auswählen</span>
                <button class="emoji-picker-close" onclick="emojiPicker.hide()">×</button>
            </div>
            <div class="emoji-picker-search">
                <input type="text" placeholder="Suchen..." id="emojiSearch">
            </div>
            <div class="emoji-picker-grid" id="emojiGrid">
                ${this.emojis.map(emoji => 
                    `<button class="emoji-button" onclick="emojiPicker.selectEmoji('${emoji}')">${emoji}</button>`
                ).join('')}
            </div>
        `;

        document.body.appendChild(picker);

        // Position picker near input
        const inputRect = this.currentInput.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left = inputRect.left;
        let top = inputRect.bottom + 5;
        
        // Adjust if picker would go off screen
        if (left + 300 > viewportWidth) {
            left = viewportWidth - 310;
        }
        if (top + 300 > viewportHeight) {
            top = inputRect.top - 305;
        }
        
        picker.style.position = 'fixed';
        picker.style.left = Math.max(10, left) + 'px';
        picker.style.top = Math.max(10, top) + 'px';
        picker.style.zIndex = '10000';

        // Setup search
        const searchInput = document.getElementById('emojiSearch');
        searchInput.addEventListener('input', (e) => {
            this.filterEmojis(e.target.value);
        });

        // Close on outside click
        document.addEventListener('click', this.handleOutsideClick.bind(this));
    }

    filterEmojis(searchTerm) {
        const grid = document.getElementById('emojiGrid');
        if (!searchTerm) {
            grid.innerHTML = this.emojis.map(emoji => 
                `<button class="emoji-button" onclick="emojiPicker.selectEmoji('${emoji}')">${emoji}</button>`
            ).join('');
            return;
        }

        // Simple filter - in a real app you'd have emoji names/keywords
        const filtered = this.emojis.filter(emoji => {
            // Basic filtering by common keywords
            const keywords = this.getEmojiKeywords(emoji);
            return keywords.some(keyword => 
                keyword.toLowerCase().includes(searchTerm.toLowerCase())
            );
        });

        grid.innerHTML = filtered.map(emoji => 
            `<button class="emoji-button" onclick="emojiPicker.selectEmoji('${emoji}')">${emoji}</button>`
        ).join('');
    }

    getEmojiKeywords(emoji) {
        const keywordMap = {
            '🪙': ['coin', 'münze', 'geld', 'money'],
            '💰': ['money', 'geld', 'sack'],
            '🎯': ['target', 'ziel', 'dart'],
            '⏰': ['clock', 'uhr', 'time', 'zeit'],
            '🏆': ['trophy', 'pokal', 'win', 'sieg'],
            '🎮': ['game', 'spiel', 'controller'],
            '⚔️': ['sword', 'schwert', 'kampf', 'fight'],
            '🔥': ['fire', 'feuer', 'hot'],
            '⚡': ['lightning', 'blitz', 'power'],
            '🌟': ['star', 'stern'],
            '💎': ['diamond', 'diamant', 'gem'],
            '🗝️': ['key', 'schlüssel'],
            '🎲': ['dice', 'würfel'],
            '❤️': ['heart', 'herz', 'love']
        };
        
        return keywordMap[emoji] || [emoji];
    }

    selectEmoji(emoji) {
        if (this.currentInput) {
            this.currentInput.value = emoji;
            
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            this.currentInput.dispatchEvent(event);
        }
        this.hide();
    }

    hide() {
        const picker = document.getElementById('emojiPicker');
        if (picker) {
            picker.remove();
        }
        document.removeEventListener('click', this.handleOutsideClick);
        this.currentInput = null;
    }

    handleOutsideClick(event) {
        const picker = document.getElementById('emojiPicker');
        const emojiButton = event.target.closest('.emoji-trigger');
        if (picker && !picker.contains(event.target) && event.target !== this.currentInput && !emojiButton) {
            this.hide();
        }
    }
}

// Global instance
const emojiPicker = new EmojiPicker();
window.emojiPicker = emojiPicker;