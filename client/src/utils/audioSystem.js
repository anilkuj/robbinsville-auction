// Simple Web Audio API Synthesizer
// Generates purely mathematical sounds so we don't need any .mp3 files!

class AudioSystem {
    constructor() {
        this.audioCtx = null;
        this.initialized = false;
    }

    init() {
        // Browsers require a user interaction before AudioContext can start
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    // A bright, pleasant ping for when a bid is placed
    playBidSound() {
        if (!this.audioCtx) return;

        const t = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = 'sine';
        // F#5 note
        osc.frequency.setValueAtTime(739.99, t);

        // Quick attack, smooth decay
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.3, t + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start(t);
        osc.stop(t + 0.5);
    }

    // A deep, satisfying low thud (like a gavel) for SOLD
    playSoldSound() {
        if (!this.audioCtx) return;

        const t = this.audioCtx.currentTime;

        // Bass thud
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        // Start low, pitch down quickly
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);

        // Punchy attack
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.6, t + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start(t);
        osc.stop(t + 0.6);
    }

    // A very short, high-pitched "tick" for the final seconds of a countdown
    playTickSound() {
        if (!this.audioCtx) return;

        const t = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = 'triangle';
        // High pitch C6
        osc.frequency.setValueAtTime(1046.50, t);

        // Extremely short duration
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.15, t + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start(t);
        osc.stop(t + 0.15);
    }
}

export const audioSystem = new AudioSystem();
