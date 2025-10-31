(function () {
  const THEME_KEY = 'vista-theme';
  const DETAILS_KEY = 'vista-show-details';
  const SPEED_KEY = 'vista-show-speed';
  const SPEED_UNIT_KEY = 'vista-speed-unit';
  const MODULE_GAP_KEY = 'vista-module-gap';
  const VALUE_SIZE_KEY = 'vista-large-value-size';
  const PADDING_KEY = 'vista-padding-x';
  const BUILD_VERSION = '2024-05-16';

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

  const longitudeLabelZhEl = document.getElementById('longitude-label-zh');
  const longitudeValueZhEl = document.getElementById('longitude-value-zh');
  const longitudeLabelEnEl = document.getElementById('longitude-label-en');
  const longitudeValueEnEl = document.getElementById('longitude-value-en');
  const latitudeLabelZhEl = document.getElementById('latitude-label-zh');
  const latitudeValueZhEl = document.getElementById('latitude-value-zh');
  const latitudeLabelEnEl = document.getElementById('latitude-label-en');
  const latitudeValueEnEl = document.getElementById('latitude-value-en');
  const altitudeValueEl = document.getElementById('altitude-value');
  const speedValueEl = document.getElementById('speed-value');
  const timestampValueEl = document.getElementById('timestamp-value');
  const accuracyValueEl = document.getElementById('accuracy-value');

  const spacingSlider = document.getElementById('spacing-slider');
  const spacingValue = document.getElementById('spacing-value');
  const valueSizeSlider = document.getElementById('value-size-slider');
  const valueSizeValue = document.getElementById('value-size-value');
  const paddingSlider = document.getElementById('padding-slider');
  const paddingValue = document.getElementById('padding-value');

  // 存储防崩
  const storage = (() => {
    try { localStorage.setItem('__vista__', '1'); localStorage.removeItem('__vista__'); return localStorage; }
    catch { return { getItem(){}, setItem(){}, removeItem(){} }; }
  })();
  const readPref = (k) => { try { return storage.getItem(k); } catch { return null; } };
  const writePref = (k,v) => { try { storage.setItem(k,v); } catch {} };

  // 定位 watch（积极刷新）
  let watchId = null;
  let latestPosition = null;
  const geoOptions = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 };

  function handlePosition(position) {
    latestPosition = position;
    renderReadings(position);
    hideError();
  }
  function handleError(error) {
    latestPosition = null;
    renderReadings(null);
    let key = 'unknownError';
    if (error && typeof error.code === 'number') {
      if (error.code === 1) { key = 'permissionDenied'; stopWatch(); }
      else if (error.code === 2) { key = 'positionUnavailable'; }
      else if (error.code === 3) { key = 'timeout'; }
    }
    showError(key);
  }

  function stopWatch() {
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  }
  function startWatch() {
    if (!('geolocation' in navigator)) { showError('positionUnavailable'); return; }
    hideError(); stopWatch();
    watchId = navigator.geolocation.watchPosition(handlePosition, handleError, geoOptions);
  }

  // 主题
  function resolvePreferredTheme() {
    const stored = readPref(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme(theme) {
    const nextTheme = theme || resolvePreferredTheme();
    html.setAttribute('data-theme', nextTheme);
    writePref(THEME_KEY, nextTheme);
    themeInputs.forEach(i => { i.checked = (i.value === nextTheme); });
  }

  function toggleModule(module, visible) {
    document.querySelectorAll('[data-module]').forEach((el) => {
      const modules = (el.dataset.module || '').split(/\s+/).filter(Boolean);
      if (!modules.includes(module)) return;
      if (visible) el.removeAttribute('hidden'); else el.setAttribute('hidden','');
    });
  }
  function applyModuleVisibility() {
    const showDetails = readPref(DETAILS_KEY) !== 'false';
    const showSpeed = readPref(SPEED_KEY) !== 'false';
    if (detailsToggle) detailsToggle.checked = showDetails;
    if (speedToggle) speedToggle.checked = showSpeed;
    toggleModule('timestamp', showDetails);
    toggleModule('accuracy', showDetails);
    toggleModule('speed', showSpeed);
  }

  function applySpeedUnit(unit) {
    const nextUnit = unit || readPref(SPEED_UNIT_KEY) || 'kmh';
    writePref(SPEED_UNIT_KEY, nextUnit);
    speedUnitInputs.forEach(i => { i.checked = (i.value === nextUnit); });
    renderReadings(latestPosition);
  }

  // ---- 格式化 ----
  function formatDMS(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return '-';
    let abs = Math.abs(value);
    let d = Math.floor(abs);
    let mFloat = (abs - d) * 60;
    let m = Math.floor(mFloat);
    let s = (mFloat - m) * 60;
    s = Math.round(s * 100) / 100;
    if (s >= 60) { s -= 60; m += 1; }
    if (m >= 60) { m -= 60; d += 1; }
    const dd = String(d).padStart(2,'0');
    const mm = String(m).padStart(2,'0');
    const ss = s.toFixed(2).padStart(5,'0');
    return `${dd}°${mm}′${ss}″`;
  }
  function formatAltitude(alt) { return (typeof alt === 'number' && !Number.isNaN(alt)) ? `${alt.toFixed(2)} m` : '- m'; }
  function formatSpeed(speed) {
    const unit = readPref(SPEED_UNIT_KEY) || 'kmh';
    if (typeof speed === 'number' && !Number.isNaN(speed)) {
      return unit === 'kmh' ? `${(speed*3.6).toFixed(2)} km/h` : `${speed.toFixed(2)} m/s`;
    }
    return unit === 'kmh' ? '- km/h' : '- m/s';
  }
  function formatTimestamp(ts) {
    if (typeof ts !== 'number' || Number.isNaN(ts)) return '-';
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    const ss = String(d.getSeconds()).padStart(2,'0');
    return `${hh}:${mm}:${ss}`;
  }
  function formatAccuracy(acc) { return (typeof acc === 'number' && !Number.isNaN(acc)) ? `± ${Math.round(acc)} m` : '-'; }

  // ---- 渲染 ----
  function getDict(lang, key) {
    const dicts = window.I18N && window.I18N.dictionaries;
    if (!dicts) return key;
    const dict = dicts[lang];
    return (dict && dict[key]) || key;
  }
  function hemisphere(value, axis, lang) {
    if (typeof value !== 'number' || Number.isNaN(value)) return '-';
    const key = axis === 'lon'
      ? (value >= 0 ? 'longitudeEast' : 'longitudeWest')
      : (value >= 0 ? 'latitudeNorth' : 'latitudeSouth');
    return getDict(lang, key);
  }
  function labelZh(base, hemi) { return `${base || ''}（${hemi && hemi !== '-' ? hemi : '-'}）`; }
  function labelEn(base, hemi) { return `${base || ''} (${hemi && hemi !== '-' ? hemi : '-'})`; }

  function updateCoordLabels(lang, lonBase, lonH, lonEl, latBase, latEl, latH) {
    if (!lonEl || !latEl) return;
    if (lang === 'zh') { lonEl.textContent = labelZh(lonBase, lonH); latEl.textContent = labelZh(latBase, latH); }
    else { lonEl.textContent = labelEn(lonBase, lonH); latEl.textContent = labelEn(latBase, latH); }
  }

  function renderReadings(position) {
    const lonLabelZhBase = getDict('zh','longitudeLabel');
    const lonLabelEnBase = getDict('en','longitudeLabel');
    const latLabelZhBase = getDict('zh','latitudeLabel');
    const latLabelEnBase = getDict('en','latitudeLabel');

    if (!position) {
      updateCoordLabels('zh', lonLabelZhBase, '-', longitudeLabelZhEl, latLabelZhBase, latitudeLabelZhEl, '-');
      updateCoordLabels('en', lonLabelEnBase, '-', longitudeLabelEnEl, latLabelEnBase, latitudeLabelEnEl, '-');
      longitudeValueZhEl.textContent = longitudeValueEnEl.textContent = '-';
      latitudeValueZhEl.textContent = latitudeValueEnEl.textContent = '-';
      altitudeValueEl.textContent = '- m';
      speedValueEl.textContent = formatSpeed();
      timestampValueEl.textContent = '-';
      accuracyValueEl.textContent = '-';
      return;
    }

    const { coords } = position;
    const lonHz = hemisphere(coords.longitude, 'lon', 'zh');
    const lonHe = hemisphere(coords.longitude, 'lon', 'en');
    const latHz = hemisphere(coords.latitude, 'lat', 'zh');
    const latHe = hemisphere(coords.latitude, 'lat', 'en');
    updateCoordLabels('zh', lonLabelZhBase, lonHz, longitudeLabelZhEl, latLabelZhBase, latitudeLabelZhEl, latHz);
    updateCoordLabels('en', lonLabelEnBase, lonHe, longitudeLabelEnEl, latLabelEnBase, latitudeLabelEnEl, latHe);

    const lonDMS = formatDMS(coords.longitude);
    const latDMS = formatDMS(coords.latitude);
    longitudeValueZhEl.textContent = longitudeValueEnEl.textContent = lonDMS;
    latitudeValueZhEl.textContent = latitudeValueEnEl.textContent = latDMS;

    altitudeValueEl.textContent = formatAltitude(coords.altitude);
    speedValueEl.textContent = formatSpeed(coords.speed);
    timestampValueEl.textContent = formatTimestamp(position.timestamp);
    accuracyValueEl.textContent = formatAccuracy(coords.accuracy);
  }

  // ---- 交互与状态 ----
  function showError(key) { errorMessage.textContent = I18N.t(key) || key; errorBox.hidden = false; }
  function hideError() { errorBox.hidden = true; }

  // 侧栏开关
  function openSidebar(){ sidebar.removeAttribute('hidden'); requestAnimationFrame(()=>sidebar.classList.add('open')); backdrop.hidden=false; menuToggle.setAttribute('aria-expanded','true'); }
  function closeSidebar(){ sidebar.classList.remove('open'); sidebar.setAttribute('hidden',''); backdrop.hidden=true; menuToggle.setAttribute('aria-expanded','false'); }
  menuToggle.addEventListener('click', ()=> sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
  backdrop.addEventListener('click', closeSidebar);

  retryButton.addEventListener('click', ()=>{ closeSidebar(); startWatch(); });

  // 语言
  langInputs.forEach(input => input.addEventListener('change', e => { if (e.target.checked) I18N.setLang(e.target.value); }));
  I18N.onLangChange((lang) => {
    langInputs.forEach(i => { i.checked = (i.value === lang); });
    html.setAttribute('data-lang', lang); // 控制中文/英文节点显隐
    renderReadings(latestPosition);
  });

  // 主题
  themeInputs.forEach(input => input.addEventListener('change', e => { if (e.target.checked) applyTheme(e.target.value); }));

  // 显示开关
  if (detailsToggle) detailsToggle.addEventListener('change', e => { writePref(DETAILS_KEY, e.target.checked ? 'true':'false'); applyModuleVisibility(); });
  if (speedToggle)   speedToggle.addEventListener('change', e => { writePref(SPEED_KEY,   e.target.checked ? 'true':'false'); applyModuleVisibility(); });

  // 速度单位
  speedUnitInputs.forEach(i => i.addEventListener('change', e => { if (e.target.checked){ writePref(SPEED_UNIT_KEY, e.target.value); renderReadings(latestPosition);} }));

  // 滑块 -> CSS 变量
  const setVar = (k,v)=> html.style.setProperty(k,v);
  function updateModuleGap(val, persist=true){ const n=Number.parseInt(val,10); const gap=Number.isFinite(n)?n:24; setVar('--gap-y',`${gap}px`); if(spacingSlider) spacingSlider.value=String(gap); if(spacingValue) spacingValue.textContent=`${gap}px`; if(persist) writePref(MODULE_GAP_KEY,String(gap)); }
  function updateLargeValueSize(val,persist=true){ const n=Number.parseInt(val,10); const size=Number.isFinite(n)?n:48; setVar('--big-size',`${size}px`); if(valueSizeSlider) valueSizeSlider.value=String(size); if(valueSizeValue) valueSizeValue.textContent=`${size}px`; if(persist) writePref(VALUE_SIZE_KEY,String(size)); }
  function updateContentPadding(val,persist=true){ const n=Number.parseInt(val,10); const pad=Number.isFinite(n)?n:20; setVar('--padding-x',`${pad}px`); if(paddingSlider) paddingSlider.value=String(pad); if(paddingValue) paddingValue.textContent=`${pad}px`; if(persist) writePref(PADDING_KEY,String(pad)); }
  if (spacingSlider) spacingSlider.addEventListener('input', e=>updateModuleGap(e.target.value));
  if (valueSizeSlider) valueSizeSlider.addEventListener('input', e=>updateLargeValueSize(e.target.value));
  if (paddingSlider)   paddingSlider.addEventListener('input', e=>updateContentPadding(e.target.value));

  // 初始化
  applyTheme(resolvePreferredTheme());
  applyModuleVisibility();
  applySpeedUnit();
  updateModuleGap(readPref(MODULE_GAP_KEY), false);
  updateLargeValueSize(readPref(VALUE_SIZE_KEY), false);
  updateContentPadding(readPref(PADDING_KEY), false);
  html.setAttribute('data-lang', I18N.getLang());
  renderReadings(null);
  startWatch();

  // 页面隐藏/显示时重启 watch，尽量“积极”
  document.addEventListener('visibilitychange', ()=>{ if (document.hidden) stopWatch(); else startWatch(); });
  window.addEventListener('pagehide', stopWatch);
  window.addEventListener('beforeunload', stopWatch);

  // Wake Lock（可用时）
  if ('wakeLock' in navigator) {
    let wakeLock = null;
    const request = async()=>{ try{ wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release',()=>{ wakeLock=null; }); }catch{} };
    document.addEventListener('click', ()=>{ if(!wakeLock) request(); }, { once:true });
  }

  // Service Worker 更新，确保新构建立即生效
  if ('serviceWorker' in navigator) {
    const swUrl = `./sw.js?v=${BUILD_VERSION}`;
    let refreshing = false;
    const skipWaiting = (worker) => { if (worker) worker.postMessage({ type: 'SKIP_WAITING' }); };

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        if (registration.waiting) {
          skipWaiting(registration.waiting);
        }
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              skipWaiting(newWorker);
            }
          });
        });
      })
      .catch(() => {});
  }
})();
