(function () {
  const THEME_KEY = 'vista-theme';
  const DETAILS_KEY = 'vista-show-details';
  const SPEED_KEY = 'vista-show-speed';
  const SPEED_UNIT_KEY = 'vista-speed-unit';

  const html = document.documentElement;
  const errorBox = document.getElementById('error');
  const errorMessage = document.getElementById('error-message');
  const retryButton = document.getElementById('retry');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('backdrop');

  const langInputs = document.querySelectorAll('input[name="lang"]');
  const themeInputs = document.querySelectorAll('input[name="theme"]');
  const detailsToggle = document.getElementById('toggle-details');
  const speedToggle = document.getElementById('toggle-speed');
  const speedUnitInputs = document.querySelectorAll('input[name="speed-unit"]');

  const longitudeHemisphereEl = document.getElementById('longitude-hemisphere');
  const longitudeValueEl = document.getElementById('longitude-value');
  const latitudeHemisphereEl = document.getElementById('latitude-hemisphere');
  const latitudeValueEl = document.getElementById('latitude-value');
  const altitudeValueEl = document.getElementById('altitude-value');
  const speedValueEl = document.getElementById('speed-value');
  const timestampValueEl = document.getElementById('timestamp-value');
  const accuracyValueEl = document.getElementById('accuracy-value');

  let watchId = null;
  let latestPosition = null;

  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 1000
  };

  function applyTheme(theme) {
    const nextTheme = theme || resolvePreferredTheme();
    html.setAttribute('data-theme', nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    themeInputs.forEach((input) => {
      input.checked = input.value === nextTheme;
    });
  }

  function resolvePreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyModuleVisibility() {
    const showDetails = localStorage.getItem(DETAILS_KEY) !== 'false';
    const showSpeed = localStorage.getItem(SPEED_KEY) !== 'false';

    detailsToggle.checked = showDetails;
    speedToggle.checked = showSpeed;

    toggleModule('timestamp', showDetails);
    toggleModule('accuracy', showDetails);
    toggleModule('speed', showSpeed);
  }

  function toggleModule(module, visible) {
    document.querySelectorAll(`[data-module="${module}"]`).forEach((el) => {
      if (visible) {
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', '');
      }
    });
  }

  function applySpeedUnit(unit) {
    const nextUnit = unit || localStorage.getItem(SPEED_UNIT_KEY) || 'kmh';
    localStorage.setItem(SPEED_UNIT_KEY, nextUnit);
    speedUnitInputs.forEach((input) => {
      input.checked = input.value === nextUnit;
    });
    renderReadings(latestPosition);
  }

  function formatDMS(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '-';
    }
    let abs = Math.abs(value);
    let degrees = Math.floor(abs);
    let minutesFloat = (abs - degrees) * 60;
    let minutes = Math.floor(minutesFloat);
    let seconds = (minutesFloat - minutes) * 60;
    seconds = Math.round(seconds * 100) / 100;

    if (seconds >= 60) {
      seconds -= 60;
      minutes += 1;
    }
    if (minutes >= 60) {
      minutes -= 60;
      degrees += 1;
    }

    const degStr = String(degrees).padStart(2, '0');
    const minStr = String(minutes).padStart(2, '0');
    const secStr = seconds.toFixed(2).padStart(5, '0');
    return `${degStr}°${minStr}′${secStr}″`;
  }

  function formatHemisphere(value, axis) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '-';
    }
    if (axis === 'lon') {
      return value >= 0 ? I18N.t('longitudeEast') : I18N.t('longitudeWest');
    }
    return value >= 0 ? I18N.t('latitudeNorth') : I18N.t('latitudeSouth');
  }

  function formatAltitude(altitude) {
    if (typeof altitude === 'number' && !Number.isNaN(altitude)) {
      return `${altitude.toFixed(2)} m`;
    }
    return '- m';
  }

  function formatSpeed(speed) {
    const unit = localStorage.getItem(SPEED_UNIT_KEY) || 'kmh';
    if (typeof speed === 'number' && !Number.isNaN(speed)) {
      if (unit === 'kmh') {
        return `${(speed * 3.6).toFixed(2)} km/h`;
      }
      return `${speed.toFixed(2)} m/s`;
    }
    return unit === 'kmh' ? '- km/h' : '- m/s';
  }

  function formatTimestamp(ts) {
    if (typeof ts !== 'number' || Number.isNaN(ts)) {
      return '-';
    }
    const date = new Date(ts);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  function formatAccuracy(acc) {
    if (typeof acc === 'number' && !Number.isNaN(acc)) {
      return `± ${Math.round(acc)} m`;
    }
    return '-';
  }

  function renderReadings(position) {
    if (!position) {
      longitudeHemisphereEl.textContent = '-';
      longitudeValueEl.textContent = '-';
      latitudeHemisphereEl.textContent = '-';
      latitudeValueEl.textContent = '-';
      altitudeValueEl.textContent = '- m';
      speedValueEl.textContent = formatSpeed();
      timestampValueEl.textContent = '-';
      accuracyValueEl.textContent = '-';
      return;
    }

    const { coords } = position;
    longitudeHemisphereEl.textContent = formatHemisphere(coords.longitude, 'lon');
    longitudeValueEl.textContent = formatDMS(coords.longitude);
    latitudeHemisphereEl.textContent = formatHemisphere(coords.latitude, 'lat');
    latitudeValueEl.textContent = formatDMS(coords.latitude);
    altitudeValueEl.textContent = formatAltitude(coords.altitude);
    speedValueEl.textContent = formatSpeed(coords.speed);
    timestampValueEl.textContent = formatTimestamp(position.timestamp);
    accuracyValueEl.textContent = formatAccuracy(coords.accuracy);
  }

  function showError(messageKey) {
    const text = I18N.t(messageKey) || messageKey;
    errorMessage.textContent = text;
    errorBox.hidden = false;
  }

  function hideError() {
    errorBox.hidden = true;
  }

  function startWatch() {
    if (!('geolocation' in navigator)) {
      showError('positionUnavailable');
      return;
    }
    hideError();
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    watchId = navigator.geolocation.watchPosition(handlePosition, handleError, geoOptions);
  }

  function handlePosition(position) {
    latestPosition = position;
    hideError();
    renderReadings(position);
  }

  function handleError(error) {
    latestPosition = null;
    renderReadings(null);
    let key = 'unknownError';
    if (error) {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          key = 'permissionDenied';
          break;
        case error.POSITION_UNAVAILABLE:
          key = 'positionUnavailable';
          break;
        case error.TIMEOUT:
          key = 'timeout';
          break;
        default:
          key = 'unknownError';
      }
    }
    showError(key);
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebar.setAttribute('hidden', '');
    backdrop.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  function openSidebar() {
    sidebar.removeAttribute('hidden');
    requestAnimationFrame(() => {
      sidebar.classList.add('open');
    });
    backdrop.hidden = false;
    menuToggle.setAttribute('aria-expanded', 'true');
  }

  menuToggle.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  backdrop.addEventListener('click', closeSidebar);

  retryButton.addEventListener('click', () => {
    closeSidebar();
    startWatch();
  });

  langInputs.forEach((input) => {
    input.addEventListener('change', (event) => {
      if (event.target.checked) {
        I18N.setLang(event.target.value);
      }
    });
  });

  themeInputs.forEach((input) => {
    input.addEventListener('change', (event) => {
      if (event.target.checked) {
        applyTheme(event.target.value);
      }
    });
  });

  detailsToggle.addEventListener('change', (event) => {
    const value = event.target.checked;
    localStorage.setItem(DETAILS_KEY, value ? 'true' : 'false');
    applyModuleVisibility();
  });

  speedToggle.addEventListener('change', (event) => {
    const value = event.target.checked;
    localStorage.setItem(SPEED_KEY, value ? 'true' : 'false');
    applyModuleVisibility();
  });

  speedUnitInputs.forEach((input) => {
    input.addEventListener('change', (event) => {
      if (event.target.checked) {
        localStorage.setItem(SPEED_UNIT_KEY, event.target.value);
        renderReadings(latestPosition);
      }
    });
  });

  I18N.onLangChange((lang) => {
    langInputs.forEach((input) => {
      input.checked = input.value === lang;
    });
    renderReadings(latestPosition);
  });

  applyTheme(resolvePreferredTheme());
  applyModuleVisibility();
  applySpeedUnit();
  renderReadings(null);
  startWatch();

  // Attempt wake lock if available after first user interaction
  if ('wakeLock' in navigator) {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
        });
      } catch (err) {
        wakeLock = null;
      }
    };
    document.addEventListener('click', () => {
      if (!wakeLock) {
        requestWakeLock();
      }
    }, { once: true });
  }
})();
