(function () {
  const SETTINGS_KEY = 'vista-settings';
  const WATCH_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 };
  const DEFAULT_SETTINGS = { showDetails: true, showSpeed: true, speedUnit: 'kmh', theme: null };

  let settings = { ...DEFAULT_SETTINGS };
  let watchId = null;
  let lastPosition = null;
  let menuOpen = false;
  let wakeLock = null;
  let currentStatusKey = null;
  let currentStatusRetry = false;

  const elements = {};

  function detectTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (err) {
      console.warn('Failed to parse settings, using defaults', err);
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('Unable to save settings', err);
    }
  }

  function applyTheme(theme, persist = true) {
    const applied = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', applied);
    settings.theme = applied;
    if (persist) {
      saveSettings();
    }
    const themeInput = document.getElementById(`theme-${applied}`);
    if (themeInput) {
      themeInput.checked = true;
    }
  }

  function updateMenuButtonLabel() {
    if (!elements.menuButton) return;
    const key = menuOpen ? 'navCloseLabel' : 'navMenuLabel';
    elements.menuButton.setAttribute('data-i18n', key);
    if (window.I18N && typeof window.I18N.apply === 'function') {
      window.I18N.apply(elements.menuButton);
    }
    const translated = window.I18N ? window.I18N.t(key) : elements.menuButton.getAttribute('aria-label');
    if (translated) {
      elements.menuButton.setAttribute('aria-label', translated);
    }
  }

  function toggleMenu(open) {
    menuOpen = typeof open === 'boolean' ? open : !menuOpen;
    elements.settings.classList.toggle('open', menuOpen);
    elements.menuButton.setAttribute('aria-expanded', String(menuOpen));
    updateMenuButtonLabel();
    if (menuOpen) {
      elements.overlay.hidden = false;
      elements.overlay.classList.add('active');
      elements.settings.setAttribute('aria-hidden', 'false');
    } else {
      elements.overlay.classList.remove('active');
      elements.settings.setAttribute('aria-hidden', 'true');
      window.setTimeout(() => {
        if (!menuOpen) {
          elements.overlay.hidden = true;
        }
      }, 200);
    }
  }

  function clearWakeLock() {
    if (wakeLock) {
      wakeLock.release().catch(() => undefined);
      wakeLock = null;
    }
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator) || wakeLock) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    } catch (err) {
      console.warn('WakeLock not granted', err);
    }
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function padDegrees(value) {
    return value >= 100 ? String(value) : String(value).padStart(2, '0');
  }

  function formatDMS(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '-';
    }
    const absolute = Math.abs(value);
    let degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    let minutes = Math.floor(minutesFloat);
    let seconds = (minutesFloat - minutes) * 60;
    seconds = Number(seconds.toFixed(2));
    if (seconds === 60) {
      seconds = 0;
      minutes += 1;
      if (minutes === 60) {
        minutes = 0;
        degrees += 1;
      }
    }
    return `${padDegrees(degrees)}°${pad(minutes)}′${seconds.toFixed(2).padStart(5, '0')}″`;
  }

  function formatAltitude(value) {
    const unit = window.I18N ? window.I18N.t('units.meter') : 'm';
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return `${value.toFixed(2)} ${unit}`;
    }
    return `- ${unit}`;
  }

  function formatSpeed(speed) {
    const unitKey = settings.speedUnit === 'ms' ? 'units.ms' : 'units.kmh';
    const unit = window.I18N ? window.I18N.t(unitKey) : settings.speedUnit;
    if (typeof speed === 'number' && !Number.isNaN(speed)) {
      const value = settings.speedUnit === 'ms' ? speed : speed * 3.6;
      return `${value.toFixed(2)} ${unit}`;
    }
    return `- ${unit}`;
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  function formatAccuracy(accuracy) {
    const unit = window.I18N ? window.I18N.t('units.meter') : 'm';
    if (typeof accuracy === 'number' && !Number.isNaN(accuracy)) {
      return `± ${Math.round(accuracy)} ${unit}`;
    }
    return `± - ${unit}`;
  }

  function updateModuleVisibility() {
    const speedEls = document.querySelectorAll('[data-module="speed"]');
    speedEls.forEach((el) => {
      el.classList.toggle('hidden', !settings.showSpeed);
    });
    const detailEls = document.querySelectorAll('[data-module="details"]');
    detailEls.forEach((el) => {
      el.classList.toggle('hidden', !settings.showDetails);
    });
  }

  function showStatus(key, allowRetry) {
    currentStatusKey = key;
    currentStatusRetry = allowRetry;
    if (!elements.statusSection) return;
    const message = window.I18N ? window.I18N.t(key) : key;
    elements.statusText.textContent = message;
    elements.statusSection.classList.remove('hidden');
    if (elements.retryButton) {
      elements.retryButton.classList.toggle('hidden', !allowRetry);
    }
  }

  function hideStatus() {
    currentStatusKey = null;
    currentStatusRetry = false;
    if (elements.statusSection) {
      elements.statusSection.classList.add('hidden');
    }
  }

  function updateStatusLanguage() {
    if (!currentStatusKey) return;
    showStatus(currentStatusKey, currentStatusRetry);
  }

  function updateDisplay() {
    const coords = lastPosition ? lastPosition.coords : null;
    const longitude = coords && typeof coords.longitude === 'number' ? coords.longitude : null;
    const latitude = coords && typeof coords.latitude === 'number' ? coords.latitude : null;

    if (longitude !== null) {
      const key = longitude >= 0 ? 'hemisphere.lonEast' : 'hemisphere.lonWest';
      elements.lonHemisphere.textContent = window.I18N ? window.I18N.t(key) : key;
      elements.lonDms.textContent = formatDMS(longitude);
    } else {
      elements.lonHemisphere.textContent = '-';
      elements.lonDms.textContent = '-';
    }

    if (latitude !== null) {
      const key = latitude >= 0 ? 'hemisphere.latNorth' : 'hemisphere.latSouth';
      elements.latHemisphere.textContent = window.I18N ? window.I18N.t(key) : key;
      elements.latDms.textContent = formatDMS(latitude);
    } else {
      elements.latHemisphere.textContent = '-';
      elements.latDms.textContent = '-';
    }

    const altitude = coords && typeof coords.altitude === 'number' ? coords.altitude : null;
    elements.altitudeValue.textContent = formatAltitude(altitude);

    const speed = coords && typeof coords.speed === 'number' ? coords.speed : null;
    elements.speedValue.textContent = formatSpeed(speed);

    const timestamp = lastPosition ? lastPosition.timestamp : null;
    elements.timestampValue.textContent = formatTimestamp(timestamp);

    const accuracy = coords && typeof coords.accuracy === 'number' ? coords.accuracy : null;
    elements.accuracyValue.textContent = formatAccuracy(accuracy);
  }

  function stopWatch() {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }

  function onPosition(position) {
    lastPosition = position;
    updateDisplay();
    hideStatus();
  }

  function onError(error) {
    console.warn('Geolocation error', error);
    switch (error.code) {
      case error.PERMISSION_DENIED:
        stopWatch();
        showStatus('statusPermissionDenied', true);
        break;
      case error.POSITION_UNAVAILABLE:
        showStatus('statusPositionUnavailable', true);
        break;
      case error.TIMEOUT:
        showStatus('statusTimeout', true);
        break;
      default:
        showStatus('statusUnknownError', true);
        break;
    }
  }

  function startWatch() {
    if (!('geolocation' in navigator)) {
      showStatus('statusUnsupported', false);
      return;
    }
    stopWatch();
    showStatus('statusRequesting', false);
    try {
      watchId = navigator.geolocation.watchPosition(onPosition, onError, WATCH_OPTIONS);
    } catch (err) {
      console.error('Unable to start geolocation watch', err);
      showStatus('statusUnknownError', true);
    }
  }

  function initElements() {
    elements.menuButton = document.getElementById('menu-button');
    elements.closeSettings = document.getElementById('close-settings');
    elements.overlay = document.getElementById('overlay');
    elements.settings = document.getElementById('settings');
    elements.retryButton = document.getElementById('retry-button');
    elements.statusSection = document.getElementById('status-message');
    elements.statusText = document.getElementById('status-text');
    elements.lonHemisphere = document.getElementById('longitude-hemisphere');
    elements.lonDms = document.getElementById('longitude-dms');
    elements.latHemisphere = document.getElementById('latitude-hemisphere');
    elements.latDms = document.getElementById('latitude-dms');
    elements.altitudeValue = document.getElementById('altitude-value');
    elements.speedValue = document.getElementById('speed-value');
    elements.timestampValue = document.getElementById('timestamp-value');
    elements.accuracyValue = document.getElementById('accuracy-value');
  }

  function initLanguageControls(currentLang) {
    const langRadios = document.querySelectorAll('input[name="language"]');
    langRadios.forEach((radio) => {
      radio.checked = radio.value === currentLang;
      radio.addEventListener('change', (event) => {
        if (!event.target.checked) return;
        if (window.I18N) {
          window.I18N.setLang(event.target.value);
        }
      });
    });
  }

  function initThemeControls(initialTheme) {
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach((radio) => {
      radio.checked = radio.value === initialTheme;
      radio.addEventListener('change', (event) => {
        if (!event.target.checked) return;
        applyTheme(event.target.value, true);
      });
    });
  }

  function initModuleControls() {
    const toggleDetails = document.getElementById('toggle-details');
    const toggleSpeed = document.getElementById('toggle-speed');
    toggleDetails.checked = settings.showDetails;
    toggleSpeed.checked = settings.showSpeed;
    toggleDetails.addEventListener('change', () => {
      settings.showDetails = toggleDetails.checked;
      updateModuleVisibility();
      saveSettings();
    });
    toggleSpeed.addEventListener('change', () => {
      settings.showSpeed = toggleSpeed.checked;
      updateModuleVisibility();
      saveSettings();
    });
  }

  function initSpeedUnitControls() {
    const unitRadios = document.querySelectorAll('input[name="speed-unit"]');
    unitRadios.forEach((radio) => {
      radio.checked = radio.value === settings.speedUnit;
      radio.addEventListener('change', (event) => {
        if (!event.target.checked) return;
        settings.speedUnit = event.target.value;
        saveSettings();
        updateDisplay();
      });
    });
  }

  function initMenuControls() {
    elements.menuButton.addEventListener('click', () => {
      toggleMenu();
    });
    elements.closeSettings.addEventListener('click', () => toggleMenu(false));
    elements.overlay.addEventListener('click', () => toggleMenu(false));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuOpen) {
        toggleMenu(false);
      }
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((err) => {
          console.warn('Service worker registration failed', err);
        });
      });
    }
  }

  function initWakeLock() {
    document.addEventListener('pointerdown', requestWakeLock, { once: true });
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      requestWakeLock();
    } else {
      clearWakeLock();
    }
  }

  function onLanguageUpdated() {
    updateMenuButtonLabel();
    updateDisplay();
    updateStatusLanguage();
  }

  function init() {
    const currentLang = window.I18N ? window.I18N.init() : 'zh';
    initElements();
    settings = loadSettings();
    const theme = settings.theme || detectTheme();
    applyTheme(theme, Boolean(settings.theme));
    initLanguageControls(currentLang);
    initThemeControls(document.documentElement.getAttribute('data-theme'));
    initModuleControls();
    initSpeedUnitControls();
    initMenuControls();
    updateModuleVisibility();
    updateMenuButtonLabel();
    updateDisplay();
    startWatch();
    registerServiceWorker();
    initWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (elements.retryButton) {
      elements.retryButton.addEventListener('click', () => {
        toggleMenu(false);
        startWatch();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  window.addEventListener('vista:lang', onLanguageUpdated);
})();
