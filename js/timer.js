/* ==========================================================================
   FitPulse Studio PWA - Rest Timer & HIIT Audio/Notification Engine
   ========================================================================== */

const RestTimer = {
  totalSeconds: 60,
  remainingSeconds: 60,
  timerInterval: null,
  isRunning: false,
  audioCtx: null,

  init() {
    this.setupEventListeners();
    this.updateDisplay();
  },

  setDuration(seconds) {
    this.stop();
    this.totalSeconds = seconds;
    this.remainingSeconds = seconds;
    this.updateDisplay();
    
    // Highlight preset active button
    document.querySelectorAll('.preset-btn').forEach(btn => {
      if (parseInt(btn.dataset.seconds) === seconds) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const startBtn = document.getElementById('btnStartTimer');
    if (startBtn) {
      startBtn.textContent = '⏸️ Pausar';
      startBtn.classList.add('btn-primary');
    }

    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      this.updateDisplay();

      if (this.remainingSeconds <= 0) {
        this.finishTimer();
      }
    }, 1000);
  },

  pause() {
    this.isRunning = false;
    clearInterval(this.timerInterval);
    const startBtn = document.getElementById('btnStartTimer');
    if (startBtn) {
      startBtn.textContent = '▶️ Reanudar';
    }
  },

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  },

  reset() {
    this.pause();
    this.remainingSeconds = this.totalSeconds;
    this.updateDisplay();
    const startBtn = document.getElementById('btnStartTimer');
    if (startBtn) {
      startBtn.textContent = '▶️ Iniciar Descanso';
    }
  },

  finishTimer() {
    this.pause();
    this.playBeepSound();
    
    // Trigger PWA Notification
    if (window.NotificationManager) {
      window.NotificationManager.sendNotification(
        '⏱️ ¡Tiempo de Descanso Finalizado!',
        'El tiempo de recuperación ha terminado. ¡A por tu siguiente serie! 💪',
        'timer'
      );
    }

    alert('⏱️ ¡Tiempo de descanso completado! Tu siguiente serie te espera.');
    this.reset();
  },

  updateDisplay() {
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const digitsEl = document.getElementById('timerDigits');
    if (digitsEl) digitsEl.textContent = formatted;

    // Update SVG Circle Progress Ring (Circumference ~722px)
    const ringEl = document.getElementById('timerRing');
    if (ringEl) {
      const progressFraction = this.remainingSeconds / this.totalSeconds;
      const offset = 722 * (1 - progressFraction);
      ringEl.style.strokeDashoffset = offset;
    }
  },

  playBeepSound() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio Context error:', e);
    }
  },

  setupEventListeners() {
    const startBtn = document.getElementById('btnStartTimer');
    const resetBtn = document.getElementById('btnResetTimer');

    if (startBtn) startBtn.addEventListener('click', () => this.toggle());
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const secs = parseInt(e.target.dataset.seconds);
        if (secs) this.setDuration(secs);
      });
    });
  }
};

window.RestTimer = RestTimer;
