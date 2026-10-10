/* ==========================================================================
   FitPulse Studio PWA - Notification Manager
   ========================================================================== */

const NotificationManager = {
  permission: 'default',
  settings: {
    timerAlerts: true,
    workoutReminders: true,
    waterReminders: true,
    prAlerts: true
  },

  async init() {
    this.permission = Notification.permission;
    this.loadSettings();
    this.updateUI();
  },

  loadSettings() {
    try {
      const saved = localStorage.getItem('fitpulse_notif_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Error loading notification settings:', e);
    }
  },

  saveSettings() {
    try {
      localStorage.setItem('fitpulse_notif_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Error saving notification settings:', e);
    }
  },

  async requestPermission() {
    if (!('Notification' in window)) {
      this.showInAppToast('Tu navegador no soporta notificaciones.', 'error');
      return false;
    }

    const result = await Notification.requestPermission();
    this.permission = result;
    this.updateUI();

    if (result === 'granted') {
      this.showInAppToast('✅ Notificaciones activadas correctamente!', 'success');
      return true;
    } else {
      this.showInAppToast('❌ Permiso de notificación denegado.', 'error');
      return false;
    }
  },

  async sendNotification(title, body, type = 'general') {
    if (!this.settings[`${type}Alerts`] && type !== 'general') return;

    // Try to use Service Worker notification first
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && this.permission === 'granted') {
          await reg.showNotification(title, {
            body,
            icon: './icons/icon-192.png',
            badge: './icons/badge-96.png',
            vibrate: [200, 100, 200],
            data: { url: './index.html', type },
            actions: [
              { action: 'open', title: 'Abrir FitPulse 💪' },
              { action: 'close', title: 'Cerrar' }
            ]
          });
          return;
        }
      } catch (e) {
        console.warn('SW notification failed, falling back:', e);
      }
    }

    // Fallback: Direct Notification API
    if (this.permission === 'granted') {
      new Notification(title, {
        body,
        icon: './icons/icon-192.png',
        badge: './icons/badge-96.png'
      });
    }

    // Always show in-app toast
    this.showInAppToast(`${title}: ${body}`, 'info');
  },

  showInAppToast(message, type = 'info') {
    const existing = document.getElementById('inAppToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'inAppToast';
    toast.className = `in-app-toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    setTimeout(() => {
      toast.classList.remove('toast-visible');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  },

  updateUI() {
    const statusEl = document.getElementById('notifPermStatus');
    const requestBtn = document.getElementById('btnRequestNotif');

    if (statusEl) {
      statusEl.textContent = this.permission === 'granted'
        ? '✅ Activadas'
        : this.permission === 'denied'
        ? '🚫 Bloqueadas'
        : '⏳ Sin configurar';
      statusEl.className = `notif-status notif-${this.permission}`;
    }

    if (requestBtn) {
      requestBtn.disabled = this.permission === 'granted';
      requestBtn.textContent = this.permission === 'granted'
        ? 'Notificaciones Activas ✅'
        : 'Activar Notificaciones 🔔';
    }

    // Sync toggles with settings
    Object.entries(this.settings).forEach(([key, value]) => {
      const toggle = document.getElementById(`toggle_${key}`);
      if (toggle) toggle.checked = value;
    });
  },

  toggleSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
  }
};

window.NotificationManager = NotificationManager;
