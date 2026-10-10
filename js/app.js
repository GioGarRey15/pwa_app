/* ==========================================================================
   FitPulse Studio PWA - Main Application Logic
   ========================================================================== */

const App = {
  currentTab: 'timer',
  workoutLog: [],
  waterIntake: 0,
  waterGoal: 2500,
  exercises: [
    { id: 'squat', name: '🏋️ Sentadilla', sets: 4, defaultReps: 10, defaultWeight: 60 },
    { id: 'bench', name: '💪 Press Banca', sets: 4, defaultReps: 8, defaultWeight: 80 },
    { id: 'deadlift', name: '🔩 Peso Muerto', sets: 3, defaultReps: 6, defaultWeight: 100 },
    { id: 'pullup', name: '🧗 Jalón al Pecho', sets: 3, defaultReps: 12, defaultWeight: 60 },
    { id: 'shoulder', name: '🙌 Press Hombros', sets: 3, defaultReps: 10, defaultWeight: 40 },
    { id: 'curl', name: '💪 Curl Bíceps', sets: 3, defaultReps: 12, defaultWeight: 20 },
  ],
  prs: {},

  async init() {
    this.loadData();
    this.buildTabs();
    this.renderTimerTab();
    this.renderWorkoutTab();
    this.renderHydrationTab();
    this.renderNotifTab();
    this.switchTab('timer');
    this.setupEventListeners();

    await NotificationManager.init();
    await PWAManager.init();
    RestTimer.init();

    this.startWaterReminderCycle();
    console.log('[FitPulse App] Inicializado correctamente 🚀');
  },

  loadData() {
    try {
      const savedLog = localStorage.getItem('fitpulse_log');
      if (savedLog) this.workoutLog = JSON.parse(savedLog);

      const savedPrs = localStorage.getItem('fitpulse_prs');
      if (savedPrs) this.prs = JSON.parse(savedPrs);

      const savedWater = localStorage.getItem('fitpulse_water_today');
      const savedWaterDate = localStorage.getItem('fitpulse_water_date');
      const today = new Date().toDateString();
      if (savedWaterDate === today && savedWater) {
        this.waterIntake = parseInt(savedWater);
      } else {
        this.waterIntake = 0;
        localStorage.setItem('fitpulse_water_date', today);
      }
    } catch (e) {
      console.warn('Error loading data:', e);
    }
  },

  saveData() {
    try {
      localStorage.setItem('fitpulse_log', JSON.stringify(this.workoutLog));
      localStorage.setItem('fitpulse_prs', JSON.stringify(this.prs));
      localStorage.setItem('fitpulse_water_today', this.waterIntake.toString());
    } catch (e) {
      console.warn('Error saving data:', e);
    }
  },

  buildTabs() {
    const tabDefs = [
      { id: 'timer', label: '⏱️ Timer HIIT' },
      { id: 'workout', label: '🏋️ Rutina' },
      { id: 'hydration', label: '💧 Hidratación' },
      { id: 'notif', label: '🔔 Notif.' }
    ];

    const tabBar = document.getElementById('tabBar');
    if (!tabBar) return;
    tabBar.innerHTML = '';

    tabDefs.forEach(({ id, label }) => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.id = `tab_${id}`;
      btn.textContent = label;
      btn.setAttribute('aria-selected', 'false');
      btn.addEventListener('click', () => this.switchTab(id));
      tabBar.appendChild(btn);
    });
  },

  switchTab(tabId) {
    this.currentTab = tabId;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      const isActive = btn.id === `tab_${tabId}`;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('hidden', panel.id !== `panel_${tabId}`);
    });
  },

  /* ---- TIMER TAB ---- */
  renderTimerTab() {
    const panel = document.getElementById('panel_timer');
    if (!panel) return;

    panel.innerHTML = `
      <section class="glass-card" id="timerSection" aria-label="Temporizador de Descanso HIIT">
        <h2 class="section-title">⏱️ Temporizador de Descanso</h2>
        <p class="section-sub">Controla tu recuperación entre series con precisión</p>

        <div class="timer-container">
          <div class="timer-circle-wrapper" role="timer" aria-live="polite" aria-label="Tiempo restante">
            <svg class="timer-svg" viewBox="0 0 260 260" aria-hidden="true">
              <defs>
                <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#f43f5e"/>
                  <stop offset="100%" stop-color="#06b6d4"/>
                </linearGradient>
              </defs>
              <circle class="timer-bg-ring" cx="130" cy="130" r="115"/>
              <circle class="timer-progress-ring" id="timerRing" cx="130" cy="130" r="115"
                stroke-dasharray="722" stroke-dashoffset="0"/>
            </svg>
            <div class="timer-display">
              <span class="timer-digits" id="timerDigits">01:00</span>
              <span class="timer-label">descanso</span>
            </div>
          </div>

          <div class="preset-timer-btns" role="group" aria-label="Tiempos preestablecidos">
            <button class="preset-btn" data-seconds="30" id="preset_30">30s</button>
            <button class="preset-btn active" data-seconds="60" id="preset_60">1 min</button>
            <button class="preset-btn" data-seconds="90" id="preset_90">1:30</button>
            <button class="preset-btn" data-seconds="120" id="preset_120">2 min</button>
            <button class="preset-btn" data-seconds="180" id="preset_180">3 min</button>
            <button class="preset-btn" data-seconds="300" id="preset_300">5 min</button>
          </div>

          <div class="timer-controls" role="group" aria-label="Controles del temporizador">
            <button class="btn btn-primary" id="btnStartTimer">▶️ Iniciar Descanso</button>
            <button class="btn" id="btnResetTimer">🔄 Reiniciar</button>
          </div>
        </div>

        <div class="hiit-section">
          <h3 class="subsection-title">🔥 Programa HIIT Rápido</h3>
          <div class="hiit-grid">
            <div class="hiit-card" id="hiitCard_tabata">
              <div class="hiit-icon">🔥</div>
              <div class="hiit-info">
                <strong>Tabata</strong>
                <span>20s trabajo / 10s descanso × 8 rondas</span>
              </div>
              <button class="btn btn-primary hiit-start-btn" data-work="20" data-rest="10" data-rounds="8" id="btnHiitTabata">Iniciar</button>
            </div>
            <div class="hiit-card" id="hiitCard_classic">
              <div class="hiit-icon">⚡</div>
              <div class="hiit-info">
                <strong>HIIT Clásico</strong>
                <span>30s trabajo / 30s descanso × 10 rondas</span>
              </div>
              <button class="btn btn-cyan hiit-start-btn" data-work="30" data-rest="30" data-rounds="10" id="btnHiitClassic">Iniciar</button>
            </div>
          </div>
        </div>
      </section>
    `;

    // HIIT buttons
    panel.querySelectorAll('.hiit-start-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const work = parseInt(e.target.dataset.work);
        const rest = parseInt(e.target.dataset.rest);
        const rounds = parseInt(e.target.dataset.rounds);
        this.startHIITSession(work, rest, rounds, e.target);
      });
    });
  },

  hiitSession: null,

  startHIITSession(workSecs, restSecs, totalRounds, triggerBtn) {
    if (this.hiitSession) {
      clearTimeout(this.hiitSession);
      this.hiitSession = null;
      if (triggerBtn) {
        triggerBtn.textContent = 'Iniciar';
        triggerBtn.classList.remove('btn-danger');
      }
      NotificationManager.showInAppToast('⏹️ Sesión HIIT detenida', 'info');
      return;
    }

    let round = 1;
    let phase = 'work';

    if (triggerBtn) {
      triggerBtn.textContent = '⏹️ Detener';
      triggerBtn.classList.add('btn-danger');
    }

    const runPhase = () => {
      if (round > totalRounds) {
        NotificationManager.sendNotification('🏁 HIIT Completado!', `¡Completaste ${totalRounds} rondas! Increíble trabajo. 🎉`, 'timerAlerts');
        NotificationManager.showInAppToast(`🏆 HIIT completado! ${totalRounds} rondas terminadas`, 'success');
        if (triggerBtn) {
          triggerBtn.textContent = 'Iniciar';
          triggerBtn.classList.remove('btn-danger');
        }
        this.hiitSession = null;
        return;
      }

      const isWork = phase === 'work';
      const duration = isWork ? workSecs : restSecs;
      const label = isWork ? `💥 Ronda ${round}/${totalRounds} - ¡TRABAJA!` : `😮‍💨 Ronda ${round}/${totalRounds} - Descansa`;

      RestTimer.setDuration(duration);
      RestTimer.start();
      NotificationManager.showInAppToast(label, isWork ? 'error' : 'success');

      const delay = (duration + 1) * 1000;

      this.hiitSession = setTimeout(() => {
        if (phase === 'work') {
          phase = 'rest';
        } else {
          phase = 'work';
          round++;
        }
        runPhase();
      }, delay);
    };

    runPhase();
  },

  /* ---- WORKOUT TAB ---- */
  renderWorkoutTab() {
    const panel = document.getElementById('panel_workout');
    if (!panel) return;

    const cardsHtml = this.exercises.map(ex => `
      <div class="exercise-card" id="exCard_${ex.id}">
        <div class="exercise-header">
          <h3 class="exercise-title">${ex.name}</h3>
          <span class="badge-pr" id="pr_${ex.id}" style="display:none">🏆 PR</span>
        </div>
        <table class="sets-table" aria-label="Series de ${ex.name}">
          <thead>
            <tr>
              <th>#</th>
              <th>Reps</th>
              <th>Peso (kg)</th>
              <th>✓</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: ex.sets }, (_, i) => `
              <tr id="set_${ex.id}_${i + 1}">
                <td><span class="set-num">${i + 1}</span></td>
                <td><input class="input-num" type="number" id="reps_${ex.id}_${i + 1}" min="1" max="100" value="${ex.defaultReps}" aria-label="Repeticiones serie ${i + 1}"></td>
                <td><input class="input-num" type="number" id="weight_${ex.id}_${i + 1}" min="0" max="500" step="2.5" value="${ex.defaultWeight}" aria-label="Peso serie ${i + 1}"></td>
                <td><input class="check-set" type="checkbox" id="check_${ex.id}_${i + 1}" aria-label="Serie ${i + 1} completada"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button class="btn btn-primary" id="logExBtn_${ex.id}" style="margin-top:0.5rem">📝 Registrar Serie</button>
      </div>
    `).join('');

    panel.innerHTML = `
      <section class="glass-card" aria-label="Registro de Entrenamiento">
        <div class="section-header-row">
          <div>
            <h2 class="section-title">🏋️ Bitácora de Rutina</h2>
            <p class="section-sub">Registra tus series, repeticiones y pesos</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-cyan" id="btnExportLog">📤 Exportar</button>
            <button class="btn" id="btnClearLog" style="color:#f87171">🗑️ Limpiar</button>
          </div>
        </div>
        <div class="workout-grid" id="workoutGrid">
          ${cardsHtml}
        </div>
      </section>

      <section class="glass-card log-history-card" aria-label="Historial de entrenamiento">
        <h2 class="section-title">📈 Historial de Hoy</h2>
        <div id="workoutLogList" class="log-list"></div>
      </section>
    `;

    // Log buttons
    this.exercises.forEach(ex => {
      const logBtn = document.getElementById(`logExBtn_${ex.id}`);
      if (logBtn) logBtn.addEventListener('click', () => this.logExercise(ex));
    });

    document.getElementById('btnExportLog')?.addEventListener('click', () => this.exportLog());
    document.getElementById('btnClearLog')?.addEventListener('click', () => this.clearLog());

    this.renderLogHistory();
    this.refreshPRBadges();
  },

  logExercise(ex) {
    const sets = [];
    let hasPR = false;

    for (let i = 1; i <= ex.sets; i++) {
      const repsEl = document.getElementById(`reps_${ex.id}_${i}`);
      const weightEl = document.getElementById(`weight_${ex.id}_${i}`);
      const checkEl = document.getElementById(`check_${ex.id}_${i}`);

      if (!checkEl || !checkEl.checked) continue;

      const reps = parseInt(repsEl?.value || 0);
      const weight = parseFloat(weightEl?.value || 0);
      const volume = reps * weight;

      // Check PR
      if (!this.prs[ex.id] || volume > this.prs[ex.id]) {
        this.prs[ex.id] = volume;
        hasPR = true;
      }

      sets.push({ set: i, reps, weight, volume });
    }

    if (sets.length === 0) {
      NotificationManager.showInAppToast('⚠️ Marca al menos una serie como completada!', 'error');
      return;
    }

    const entry = {
      id: Date.now(),
      exercise: ex.name,
      exId: ex.id,
      sets,
      timestamp: new Date().toISOString(),
      hasPR
    };

    this.workoutLog.unshift(entry);
    this.saveData();
    this.renderLogHistory();
    this.refreshPRBadges();

    if (hasPR) {
      NotificationManager.sendNotification('🏆 ¡Nuevo Record Personal!', `${ex.name} - Nuevo PR logrado! 💪`, 'prAlerts');
    } else {
      NotificationManager.showInAppToast(`✅ ${ex.name} registrada correctamente!`, 'success');
    }
  },

  renderLogHistory() {
    const list = document.getElementById('workoutLogList');
    if (!list) return;

    const today = new Date().toDateString();
    const todayEntries = this.workoutLog.filter(entry =>
      new Date(entry.timestamp).toDateString() === today
    );

    if (todayEntries.length === 0) {
      list.innerHTML = `<p class="empty-log">Sin entrenamientos registrados hoy. ¡Empieza a registrar tus series! 💪</p>`;
      return;
    }

    list.innerHTML = todayEntries.map(entry => {
      const time = new Date(entry.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      const totalVolume = entry.sets.reduce((sum, s) => sum + s.volume, 0);
      return `
        <div class="log-entry ${entry.hasPR ? 'log-pr' : ''}">
          <div class="log-entry-header">
            <strong>${entry.exercise}</strong>
            ${entry.hasPR ? '<span class="badge-pr">🏆 PR!</span>' : ''}
            <span class="log-time">${time}</span>
          </div>
          <div class="log-entry-body">
            ${entry.sets.map(s => `<span class="log-set">${s.set}ª: ${s.reps}×${s.weight}kg</span>`).join('')}
          </div>
          <div class="log-volume">Volumen total: <strong>${totalVolume.toLocaleString()}kg</strong></div>
        </div>
      `;
    }).join('');
  },

  refreshPRBadges() {
    this.exercises.forEach(ex => {
      const badge = document.getElementById(`pr_${ex.id}`);
      if (badge) {
        badge.style.display = this.prs[ex.id] ? 'inline-flex' : 'none';
      }
    });
  },

  exportLog() {
    if (this.workoutLog.length === 0) {
      NotificationManager.showInAppToast('No hay datos para exportar', 'error');
      return;
    }

    const data = JSON.stringify(this.workoutLog, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitpulse_log_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    NotificationManager.showInAppToast('📤 Log exportado correctamente', 'success');
  },

  clearLog() {
    if (!confirm('¿Seguro que quieres borrar todo el historial?')) return;
    this.workoutLog = [];
    this.prs = {};
    this.saveData();
    this.renderLogHistory();
    this.refreshPRBadges();
    NotificationManager.showInAppToast('🗑️ Historial borrado', 'info');
  },

  /* ---- HYDRATION TAB ---- */
  renderHydrationTab() {
    const panel = document.getElementById('panel_hydration');
    if (!panel) return;

    panel.innerHTML = `
      <section class="glass-card water-card-main" aria-label="Seguimiento de Hidratación">
        <h2 class="section-title">💧 Hidratación Diaria</h2>
        <p class="section-sub">Meta: <strong id="waterGoalDisplay">${(this.waterGoal / 1000).toFixed(1)}L</strong> al día</p>

        <div class="water-progress-wrapper">
          <div class="water-bottle-visual" aria-hidden="true">
            <div class="water-fill" id="waterFill" style="height: ${Math.min((this.waterIntake / this.waterGoal) * 100, 100)}%"></div>
            <div class="water-percentage" id="waterPct">${Math.round((this.waterIntake / this.waterGoal) * 100)}%</div>
          </div>

          <div class="water-stats">
            <div class="water-stat-main">
              <span class="water-val" id="waterVal">${(this.waterIntake / 1000).toFixed(2)}L</span>
              <span class="water-stat-label">consumido hoy</span>
            </div>
            <div class="water-stat">
              <span class="water-stat-num" id="waterRemaining">${((this.waterGoal - this.waterIntake) / 1000).toFixed(2)}L</span>
              <span class="water-stat-label">restante</span>
            </div>

            <div class="water-add-btns" role="group" aria-label="Añadir agua">
              <button class="btn water-btn" data-ml="100" id="addWater100">+100ml</button>
              <button class="btn water-btn" data-ml="200" id="addWater200">+200ml</button>
              <button class="btn btn-cyan water-btn" data-ml="250" id="addWater250">+250ml 🥤</button>
              <button class="btn water-btn" data-ml="500" id="addWater500">+500ml 🍶</button>
            </div>

            <div class="water-goal-row">
              <label for="waterGoalInput" class="water-goal-label">Meta diaria (ml):</label>
              <input type="number" class="input-num" id="waterGoalInput" value="${this.waterGoal}" min="500" max="6000" step="100" style="width:90px">
              <button class="btn" id="btnSetWaterGoal">Guardar</button>
            </div>

            <button class="btn" id="btnResetWater" style="color:#f87171; margin-top:0.5rem">🔄 Reiniciar día</button>
          </div>
        </div>

        <div class="water-log-list" id="waterLog"></div>
      </section>
    `;

    // Event listeners
    panel.querySelectorAll('.water-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ml = parseInt(e.target.dataset.ml);
        this.addWater(ml);
      });
    });

    document.getElementById('btnSetWaterGoal')?.addEventListener('click', () => {
      const val = parseInt(document.getElementById('waterGoalInput').value);
      if (val >= 500 && val <= 6000) {
        this.waterGoal = val;
        this.saveData();
        document.getElementById('waterGoalDisplay').textContent = `${(val / 1000).toFixed(1)}L`;
        this.updateWaterUI();
        NotificationManager.showInAppToast('💧 Meta de agua actualizada', 'success');
      }
    });

    document.getElementById('btnResetWater')?.addEventListener('click', () => {
      this.waterIntake = 0;
      this.saveData();
      this.updateWaterUI();
      NotificationManager.showInAppToast('💧 Registro de agua reiniciado', 'info');
    });

    this.updateWaterUI();
  },

  waterLogs: [],

  addWater(ml) {
    this.waterIntake = Math.min(this.waterIntake + ml, this.waterGoal * 1.5);
    this.waterLogs.push({ ml, time: new Date() });
    this.saveData();
    this.updateWaterUI();

    if (this.waterIntake >= this.waterGoal) {
      NotificationManager.sendNotification('🎉 ¡Meta de Agua Alcanzada!', '¡Estás perfectamente hidratado hoy! Sigue así. 💪', 'waterReminders');
    } else {
      NotificationManager.showInAppToast(`💧 +${ml}ml registrado`, 'success');
    }
  },

  updateWaterUI() {
    const pct = Math.min((this.waterIntake / this.waterGoal) * 100, 100);

    const fillEl = document.getElementById('waterFill');
    const pctEl = document.getElementById('waterPct');
    const valEl = document.getElementById('waterVal');
    const remEl = document.getElementById('waterRemaining');

    if (fillEl) fillEl.style.height = `${pct}%`;
    if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
    if (valEl) valEl.textContent = `${(this.waterIntake / 1000).toFixed(2)}L`;
    if (remEl) {
      const rem = Math.max(this.waterGoal - this.waterIntake, 0);
      remEl.textContent = `${(rem / 1000).toFixed(2)}L`;
    }
  },

  startWaterReminderCycle() {
    // Remind every 45 minutes if water < goal
    setInterval(() => {
      if (this.waterIntake < this.waterGoal) {
        const remaining = ((this.waterGoal - this.waterIntake) / 1000).toFixed(1);
        NotificationManager.sendNotification(
          '💧 Hora de Hidratarse!',
          `Te faltan ${remaining}L para tu meta diaria. ¡Bebe un vaso de agua! 🥤`,
          'waterReminders'
        );
      }
    }, 45 * 60 * 1000);
  },

  /* ---- NOTIFICATIONS TAB ---- */
  renderNotifTab() {
    const panel = document.getElementById('panel_notif');
    if (!panel) return;

    panel.innerHTML = `
      <section class="glass-card" aria-label="Configuración de Notificaciones">
        <h2 class="section-title">🔔 Notificaciones & PWA</h2>
        <p class="section-sub">Gestiona las alertas de entrenamiento y el estado de la app</p>

        <div class="notif-permission-row">
          <div>
            <strong>Estado de Notificaciones</strong>
            <div id="notifPermStatus" class="notif-status">Verificando...</div>
          </div>
          <button class="btn btn-primary" id="btnRequestNotif">Activar 🔔</button>
        </div>

        <hr class="section-divider">

        <h3 class="subsection-title">Tipos de Alertas</h3>
        <div class="notif-options">
          ${[
            { key: 'timerAlerts', label: '⏱️ Alertas de Temporizador', desc: 'Aviso al finalizar el tiempo de descanso' },
            { key: 'workoutReminders', label: '🏋️ Recordatorios de Rutina', desc: 'Motivación durante el entrenamiento' },
            { key: 'waterReminders', label: '💧 Recordatorios de Agua', desc: 'Alertas de hidratación cada 45 minutos' },
            { key: 'prAlerts', label: '🏆 Alertas de PR', desc: 'Notificación cuando superas un récord personal' }
          ].map(opt => `
            <div class="notification-option">
              <div>
                <strong>${opt.label}</strong>
                <p class="notif-desc">${opt.desc}</p>
              </div>
              <label class="toggle-switch" for="toggle_${opt.key}">
                <input type="checkbox" id="toggle_${opt.key}"
                  ${NotificationManager.settings[opt.key] ? 'checked' : ''}
                  aria-label="${opt.label}">
                <span class="slider"></span>
              </label>
            </div>
          `).join('')}
        </div>

        <hr class="section-divider">

        <h3 class="subsection-title">Estado de la Aplicación</h3>
        <div class="pwa-status-grid">
          <div class="pwa-stat-item">
            <span class="pwa-stat-icon">📱</span>
            <div>
              <strong>Modo Instalación</strong>
              <span id="pwaInstallStatus" class="pwa-stat-val">Verificando...</span>
            </div>
          </div>
          <div class="pwa-stat-item">
            <span class="pwa-stat-icon">🌐</span>
            <div>
              <strong>Conectividad</strong>
              <span id="connectionStatus" class="badge-status online"><span class="status-dot"></span> Online</span>
            </div>
          </div>
          <div class="pwa-stat-item">
            <span class="pwa-stat-icon">⚙️</span>
            <div>
              <strong>Service Worker</strong>
              <span class="pwa-stat-val" id="swStatus">Verificando...</span>
            </div>
          </div>
        </div>

        <div style="margin-top:1.5rem; display:flex; gap:0.75rem; flex-wrap:wrap">
          <button class="btn btn-primary" id="btnInstallPWA">📲 Instalar App</button>
          <button class="btn" id="btnTestNotif">🔔 Probar Notificación</button>
        </div>
      </section>
    `;

    // Event listeners
    document.getElementById('btnRequestNotif')?.addEventListener('click', () => NotificationManager.requestPermission());
    document.getElementById('btnInstallPWA')?.addEventListener('click', () => PWAManager.triggerInstall());
    document.getElementById('btnTestNotif')?.addEventListener('click', () => {
      NotificationManager.sendNotification('🔔 Prueba FitPulse', '¡Las notificaciones funcionan correctamente! 💪', 'general');
    });

    // Toggle listeners
    ['timerAlerts', 'workoutReminders', 'waterReminders', 'prAlerts'].forEach(key => {
      const toggle = document.getElementById(`toggle_${key}`);
      if (toggle) {
        toggle.addEventListener('change', (e) => NotificationManager.toggleSetting(key, e.target.checked));
      }
    });

    // SW status
    this.checkSWStatus();
  },

  async checkSWStatus() {
    const swEl = document.getElementById('swStatus');
    if (!swEl) return;

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        swEl.textContent = reg ? '✅ Activo' : '⚠️ No registrado';
      } catch (e) {
        swEl.textContent = '❌ Error';
      }
    } else {
      swEl.textContent = '⚠️ No soportado';
    }
  },

  setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === ' ') {
        e.preventDefault();
        if (this.currentTab === 'timer') RestTimer.toggle();
      }
      if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        RestTimer.reset();
      }
    });
  }
};

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());
