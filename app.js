// === SpinTheWheel App ===

class SpinTheWheel {
    constructor() {
        // State
        this.currentRoom = null;
        this.games = [];
        this.isSpinning = false;
        this.currentRotation = 0;
        this.userId = this.getOrCreateUserId();
        this.suggestionsUsed = 0;
        this.maxSuggestions = 2;
        this.minGamesToSpin = 2;

        // Firebase refs
        this.db = null;
        this.roomRef = null;
        this.presenceRef = null;

        // Canvas
        this.canvas = document.getElementById('wheel-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

        // Colors for wheel segments
        this.colors = [
            '#8b5cf6', // purple
            '#00f5ff', // cyan
            '#ff00aa', // pink
            '#00ff88', // green
            '#ff6b35', // orange
            '#ffd700', // yellow
            '#6366f1', // indigo
            '#ec4899', // rose
        ];

        // Audio context for sound effects
        this.audioCtx = null;

        // Initialize
        this.initFirebase();
        this.bindEvents();
        this.checkUrlForRoom();
    }

    // === User ID Management ===
    getOrCreateUserId() {
        let id = localStorage.getItem('spinTheWheel_userId');
        if (!id) {
            id = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('spinTheWheel_userId', id);
        }
        return id;
    }

    // === Firebase Initialization ===
    initFirebase() {
        if (typeof firebase !== 'undefined' && window.firebaseConfig) {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(window.firebaseConfig);
                }
                this.db = firebase.database();
                console.log('Firebase initialized successfully');
            } catch (error) {
                console.error('Firebase initialization error:', error);
                this.showError('Firebase connection failed. Check your configuration.');
            }
        } else {
            console.warn('Firebase not configured. Running in demo mode.');
        }
    }

    // === Event Binding ===
    bindEvents() {
        // Room screen
        document.getElementById('create-room-btn')?.addEventListener('click', () => this.createRoom());
        document.getElementById('join-room-btn')?.addEventListener('click', () => this.joinRoom());
        document.getElementById('room-code-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        // Wheel screen
        document.getElementById('add-game-btn')?.addEventListener('click', () => this.addGame());
        document.getElementById('game-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addGame();
        });
        document.getElementById('spin-btn')?.addEventListener('click', () => this.spinWheel());
        document.getElementById('copy-link-btn')?.addEventListener('click', () => this.copyInviteLink());
        document.getElementById('leave-room-btn')?.addEventListener('click', () => this.leaveRoom());

        // Modal
        document.getElementById('close-modal-btn')?.addEventListener('click', () => this.closeModal());

        // Handle page visibility for presence
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.presenceRef) {
                this.presenceRef.set(false);
            } else if (!document.hidden && this.presenceRef) {
                this.presenceRef.set(true);
            }
        });

        // Handle window close
        window.addEventListener('beforeunload', () => {
            if (this.presenceRef) {
                this.presenceRef.set(false);
            }
        });
    }

    // === URL Room Code Check ===
    checkUrlForRoom() {
        const params = new URLSearchParams(window.location.search);
        const roomCode = params.get('room');
        if (roomCode) {
            document.getElementById('room-code-input').value = roomCode.toUpperCase();
            this.joinRoom();
        }
    }

    // === Room Management ===
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async createRoom() {
        if (!this.db) {
            this.showError('Firebase not connected. Please configure Firebase first.');
            return;
        }

        const roomCode = this.generateRoomCode();

        try {
            const roomRef = this.db.ref('rooms/' + roomCode);
            await roomRef.set({
                created: Date.now(),
                createdBy: this.userId,
                games: {},
                spinning: false,
                result: null,
                spinData: null
            });

            this.enterRoom(roomCode);
        } catch (error) {
            console.error('Error creating room:', error);
            this.showError('Failed to create room. Please try again.');
        }
    }

    async joinRoom() {
        const input = document.getElementById('room-code-input');
        const roomCode = input.value.trim().toUpperCase();

        if (!roomCode || roomCode.length !== 6) {
            this.showError('Please enter a valid 6-character room code.');
            return;
        }

        if (!this.db) {
            this.showError('Firebase not connected. Please configure Firebase first.');
            return;
        }

        try {
            const snapshot = await this.db.ref('rooms/' + roomCode).once('value');
            if (snapshot.exists()) {
                this.enterRoom(roomCode);
            } else {
                this.showError('Room not found. Please check the code and try again.');
            }
        } catch (error) {
            console.error('Error joining room:', error);
            this.showError('Failed to join room. Please try again.');
        }
    }

    enterRoom(roomCode) {
        this.currentRoom = roomCode;
        this.roomRef = this.db.ref('rooms/' + roomCode);

        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('room', roomCode);
        window.history.pushState({}, '', url);

        // Set up presence
        this.setupPresence(roomCode);

        // Load suggestion count for this room
        this.loadSuggestionCount(roomCode);

        // Listen for changes
        this.setupListeners();

        // Switch screens
        document.getElementById('room-screen').classList.remove('active');
        document.getElementById('wheel-screen').classList.add('active');
        document.getElementById('current-room-code').textContent = roomCode;

        // Initial wheel draw
        this.drawWheel();
    }

    setupPresence(roomCode) {
        this.presenceRef = this.db.ref('rooms/' + roomCode + '/presence/' + this.userId);

        // Set presence on connect
        this.presenceRef.onDisconnect().remove();
        this.presenceRef.set(true);

        // Listen for presence changes
        this.db.ref('rooms/' + roomCode + '/presence').on('value', (snapshot) => {
            const presence = snapshot.val() || {};
            const count = Object.values(presence).filter(v => v === true).length;
            document.getElementById('player-count').textContent = count;
        });
    }

    loadSuggestionCount(roomCode) {
        const key = `spinTheWheel_suggestions_${roomCode}`;
        this.suggestionsUsed = parseInt(localStorage.getItem(key) || '0', 10);
        this.updateSuggestionsDisplay();
    }

    saveSuggestionCount(roomCode) {
        const key = `spinTheWheel_suggestions_${roomCode}`;
        localStorage.setItem(key, this.suggestionsUsed.toString());
    }

    updateSuggestionsDisplay() {
        const remaining = Math.max(0, this.maxSuggestions - this.suggestionsUsed);
        document.getElementById('suggestions-left').textContent = remaining;

        const input = document.getElementById('game-input');
        const btn = document.getElementById('add-game-btn');

        if (remaining <= 0) {
            input.disabled = true;
            input.placeholder = 'No suggestions remaining';
            btn.disabled = true;
        } else {
            input.disabled = false;
            input.placeholder = 'Enter game name...';
            btn.disabled = false;
        }
    }

    setupListeners() {
        // Listen for games changes
        this.roomRef.child('games').on('value', (snapshot) => {
            const gamesData = snapshot.val() || {};
            // Sort by Firebase push key to ensure consistent ordering across all clients
            this.games = Object.entries(gamesData)
                .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                .map(([id, data]) => ({
                    id,
                    name: data.name,
                    addedBy: data.addedBy
                }));
            this.updateGamesList();
            this.drawWheel();
            this.updateSpinButton();
        });

        // Listen for spin events
        this.roomRef.child('spinData').on('value', (snapshot) => {
            const spinData = snapshot.val();
            if (spinData && spinData.timestamp > Date.now() - 30000) {
                // Only respond to recent spins (within 30 seconds)
                if (!this.isSpinning && spinData.startedBy !== this.userId) {
                    this.executeSpinAnimation(spinData.targetRotation, spinData.winnerIndex);
                }
            }
        });

        // Listen for results
        this.roomRef.child('result').on('value', (snapshot) => {
            const result = snapshot.val();
            if (result && result.timestamp > Date.now() - 5000) {
                // Show result modal for recent results
                setTimeout(() => {
                    if (!this.isSpinning) {
                        this.showResult(result.game);
                    }
                }, 100);
            }
        });
    }

    leaveRoom() {
        if (this.presenceRef) {
            this.presenceRef.remove();
        }
        if (this.roomRef) {
            this.roomRef.off();
        }

        // Clear URL
        const url = new URL(window.location);
        url.searchParams.delete('room');
        window.history.pushState({}, '', url);

        // Reset state
        this.currentRoom = null;
        this.roomRef = null;
        this.presenceRef = null;
        this.games = [];
        this.currentRotation = 0;

        // Switch screens
        document.getElementById('wheel-screen').classList.remove('active');
        document.getElementById('room-screen').classList.add('active');
        document.getElementById('room-code-input').value = '';
    }

    // === Game Management ===
    async addGame() {
        const input = document.getElementById('game-input');
        const gameName = input.value.trim();

        if (!gameName) {
            return;
        }

        if (this.suggestionsUsed >= this.maxSuggestions) {
            this.showError('You have used all your suggestions for this session.');
            return;
        }

        if (gameName.length > 30) {
            this.showError('Game name must be 30 characters or less.');
            return;
        }

        // Check for duplicates
        if (this.games.some(g => g.name.toLowerCase() === gameName.toLowerCase())) {
            this.showError('This game is already on the wheel.');
            return;
        }

        try {
            const newGameRef = this.roomRef.child('games').push();
            await newGameRef.set({
                name: gameName,
                addedBy: this.userId,
                timestamp: Date.now()
            });

            this.suggestionsUsed++;
            this.saveSuggestionCount(this.currentRoom);
            this.updateSuggestionsDisplay();

            input.value = '';
            this.playSound('add');
        } catch (error) {
            console.error('Error adding game:', error);
            this.showError('Failed to add game. Please try again.');
        }
    }

    updateGamesList() {
        const list = document.getElementById('game-list');
        const countEl = document.getElementById('game-count');

        list.innerHTML = '';
        countEl.textContent = this.games.length;

        this.games.forEach(game => {
            const li = document.createElement('li');
            li.textContent = game.name;
            if (game.addedBy === this.userId) {
                li.classList.add('mine');
            }
            list.appendChild(li);
        });
    }

    updateSpinButton() {
        const btn = document.getElementById('spin-btn');
        const hasEnoughGames = this.games.length >= this.minGamesToSpin;
        btn.disabled = !hasEnoughGames || this.isSpinning;

        if (!hasEnoughGames) {
            btn.querySelector('.btn-text').textContent = `ADD ${this.minGamesToSpin - this.games.length} MORE GAME(S)`;
        } else {
            btn.querySelector('.btn-text').textContent = 'SPIN THE WHEEL';
        }
    }

    // === Wheel Drawing ===
    drawWheel() {
        if (!this.ctx) return;

        const canvas = this.canvas;
        const ctx = this.ctx;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (this.games.length === 0) {
            // Draw empty wheel
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fillStyle = '#1a1a25';
            ctx.fill();
            ctx.strokeStyle = '#2a2a3a';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = '#606070';
            ctx.font = '20px Rajdhani';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Add games to spin!', centerX, centerY);
            return;
        }

        const sliceAngle = (2 * Math.PI) / this.games.length;

        // Save context for rotation
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.currentRotation * Math.PI / 180);
        ctx.translate(-centerX, -centerY);

        // Draw segments
        this.games.forEach((game, i) => {
            const startAngle = i * sliceAngle - Math.PI / 2;
            const endAngle = startAngle + sliceAngle;

            // Draw slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();

            // Gradient fill
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            const color = this.colors[i % this.colors.length];
            gradient.addColorStop(0, this.adjustColor(color, 30));
            gradient.addColorStop(1, color);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Slice border
            ctx.strokeStyle = '#0a0a0f';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Rajdhani';

            // Truncate text if too long
            let text = game.name;
            const maxWidth = radius - 50;
            while (ctx.measureText(text).width > maxWidth && text.length > 0) {
                text = text.slice(0, -1);
            }
            if (text !== game.name) text += '...';

            ctx.fillText(text, radius - 20, 0);
            ctx.restore();
        });

        ctx.restore();

        // Draw outer ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw tick marks
        const tickCount = Math.max(this.games.length * 2, 12);
        for (let i = 0; i < tickCount; i++) {
            const angle = (i * 2 * Math.PI / tickCount) - Math.PI / 2;
            const innerRadius = radius - 8;
            const outerRadius = radius;

            ctx.beginPath();
            ctx.moveTo(
                centerX + innerRadius * Math.cos(angle),
                centerY + innerRadius * Math.sin(angle)
            );
            ctx.lineTo(
                centerX + outerRadius * Math.cos(angle),
                centerY + outerRadius * Math.sin(angle)
            );
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    adjustColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    // === Spinning ===
    async spinWheel() {
        if (this.isSpinning || this.games.length < this.minGamesToSpin) return;

        // Calculate spin
        const spins = 5 + Math.random() * 5; // 5-10 full rotations
        const winnerIndex = Math.floor(Math.random() * this.games.length);
        const sliceAngle = 360 / this.games.length;
        const targetAngle = 360 - (winnerIndex * sliceAngle + sliceAngle / 2);
        const targetRotation = spins * 360 + targetAngle;

        // Broadcast spin to all users
        const spinData = {
            targetRotation,
            winnerIndex,
            startedBy: this.userId,
            timestamp: Date.now()
        };

        try {
            await this.roomRef.child('spinData').set(spinData);
            this.executeSpinAnimation(targetRotation, winnerIndex);
        } catch (error) {
            console.error('Error starting spin:', error);
            this.showError('Failed to spin. Please try again.');
        }
    }

    executeSpinAnimation(targetRotation, winnerIndex) {
        if (this.isSpinning) return;

        this.isSpinning = true;
        this.updateSpinButton();

        const startRotation = this.currentRotation;
        const totalRotation = targetRotation - (startRotation % 360);
        const duration = 6000; // 6 seconds
        const startTime = performance.now();

        this.playSound('spin');

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease out cubic)
            const eased = 1 - Math.pow(1 - progress, 3);

            this.currentRotation = startRotation + (totalRotation * eased);
            this.drawWheel();

            // Play tick sound periodically
            if (progress < 0.9 && Math.random() < 0.1) {
                this.playSound('tick');
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isSpinning = false;
                this.currentRotation = targetRotation % 360;
                this.updateSpinButton();

                // Set result
                const winner = this.games[winnerIndex];
                if (winner) {
                    this.playSound('win');
                    this.roomRef.child('result').set({
                        game: winner.name,
                        timestamp: Date.now()
                    });
                }
            }
        };

        requestAnimationFrame(animate);
    }

    // === Sound Effects ===
    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioCtx;
    }

    playSound(type) {
        try {
            const ctx = this.initAudio();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            switch (type) {
                case 'add':
                    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                    oscillator.start(ctx.currentTime);
                    oscillator.stop(ctx.currentTime + 0.1);
                    break;

                case 'spin':
                    oscillator.type = 'sawtooth';
                    oscillator.frequency.setValueAtTime(150, ctx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
                    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                    oscillator.start(ctx.currentTime);
                    oscillator.stop(ctx.currentTime + 0.5);
                    break;

                case 'tick':
                    oscillator.frequency.setValueAtTime(600 + Math.random() * 200, ctx.currentTime);
                    gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
                    oscillator.start(ctx.currentTime);
                    oscillator.stop(ctx.currentTime + 0.05);
                    break;

                case 'win':
                    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                    notes.forEach((freq, i) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
                        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
                        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
                        osc.start(ctx.currentTime + i * 0.15);
                        osc.stop(ctx.currentTime + i * 0.15 + 0.3);
                    });
                    return;
            }
        } catch (e) {
            // Audio not supported or blocked
            console.log('Audio not available');
        }
    }

    // === Result Modal ===
    showResult(gameName) {
        document.getElementById('result-text').textContent = gameName;
        document.getElementById('result-modal').classList.add('active');
    }

    closeModal() {
        document.getElementById('result-modal').classList.remove('active');
    }

    // === Utilities ===
    copyInviteLink() {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            const feedback = document.getElementById('copy-feedback');
            feedback.classList.add('show');
            setTimeout(() => feedback.classList.remove('show'), 2000);
        }).catch(() => {
            this.showError('Failed to copy link. Please copy the URL manually.');
        });
    }

    showError(message) {
        // Simple alert for now - could be replaced with toast notification
        alert(message);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SpinTheWheel();
});
