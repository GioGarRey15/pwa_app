/* ==========================================================================
   FitPulse Studio PWA - PWA Install & Service Worker Manager
   ========================================================================== */

const PWAManager = {
  deferredPrompt: null,
  isInstalled: false,

  async init() {
    await this.registerServiceWorker();
    this.setupInstallPrompt();
    this.checkInstallState();
    this.monitorConnectivity();
  },

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      console.log('[FitPulse PWA] Service Worker registrado:', reg.scope);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[FitPulse PWA] Nueva versión disponible');
            this.showUpdateBanner();
          }
        });
      });
    } catch (err) {
      console.error('[FitPulse PWA] Error registrando SW:', err);
    }
  },

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallToast();
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.hideInstallToast();
      if (window.NotificationManager) {
        window.NotificationManager.showInAppToast('🎉 FitPulse Studio instalada correctamente!', 'success');
      }
    });
  },

  async triggerInstall() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log('[FitPulse PWA] Resultado de instalación:', outcome);
    this.deferredPrompt = null;
    this.hideInstallToast();
  },

  checkInstallState() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;

    if (isStandalone) {
      this.isInstalled = true;
      this.hideInstallToast();
    }

    const statusEl = document.getElementById('pwaInstallStatus');
    if (statusEl) {
      statusEl.textContent = isStandalone ? '📱 Instalada' : '🌐 En Navegador';
    }
  },

  showInstallToast() {
    const toast = document.getElementById('installToast');
    if (toast) toast.classList.remove('hidden');
  },

  hideInstallToast() {
    const toast = document.getElementById('installToast');
    if (toast) toast.classList.add('hidden');
  },

  showUpdateBanner() {
    const banner = document.getElementById('updateBanner');
    if (banner) {
      banner.classList.remove('hidden');
    } else {
      if (window.NotificationManager) {
        window.NotificationManager.showInAppToast('🔄 Nueva versión disponible. Recarga para actualizar.', 'info');
      }
    }
  },

  monitorConnectivity() {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      const offlineBanner = document.getElementById('offlineBanner');
      const statusBadge = document.getElementById('connectionStatus');

      if (offlineBanner) {
        offlineBanner.classList.toggle('hidden', isOnline);
      }

      if (statusBadge) {
        statusBadge.className = `badge-status ${isOnline ? 'online' : 'offline'}`;
        statusBadge.innerHTML = `<span class="status-dot"></span> ${isOnline ? 'Online' : 'Offline'}`;
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  }
};

window.PWAManager = PWAManager;
