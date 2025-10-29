(function () {
  const STORAGE_KEY = 'vista-lang';
  const dictionaries = {
    zh: {
      brand: 'Vista',
      longitudeLabel: '经度',
      latitudeLabel: '纬度',
      altitudeLabel: '海拔',
      speedLabel: '当前速度',
      timestampLabel: '定位获取时间',
      accuracyLabel: '定位精度',
      language: '语言',
      langZh: '中文',
      langEn: 'English',
      theme: '颜色模式',
      themeLight: '浅色',
      themeDark: '深色',
      settings: '设置',
      detailToggle: '信息细节模块',
      speedToggle: '当前速度模块',
      speedUnit: '速度单位',
      kmh: 'km/h',
      ms: 'm/s',
      retry: '重新尝试',
      permissionDenied: '定位被拒绝，请在浏览器设置中授权。',
      positionUnavailable: '无法获取位置信息。',
      timeout: '定位请求超时，请稍后再试。',
      unknownError: '发生未知错误。',
      toggleOn: '开启',
      longitudeEast: '东经',
      longitudeWest: '西经',
      latitudeNorth: '北纬',
      latitudeSouth: '南纬',
      moduleSpacing: '模块间距',
      primaryValueSize: '大字信息字号',
      contentPadding: '文字与左右页边距'
    },
    en: {
      brand: 'Vista',
      longitudeLabel: 'Longitude',
      latitudeLabel: 'Latitude',
      altitudeLabel: 'Altitude',
      speedLabel: 'Current Speed',
      timestampLabel: 'Time',
      accuracyLabel: 'Accuracy',
      language: 'Language',
      langZh: 'Chinese',
      langEn: 'English',
      theme: 'Color Mode',
      themeLight: 'Light',
      themeDark: 'Dark',
      settings: 'Settings',
      detailToggle: 'Information Details',
      speedToggle: 'Speed Module',
      speedUnit: 'Speed Unit',
      kmh: 'km/h',
      ms: 'm/s',
      retry: 'Try Again',
      permissionDenied: 'Location permission denied. Please enable it in browser settings.',
      positionUnavailable: 'Unable to determine your position.',
      timeout: 'Location request timed out. Please try again.',
      unknownError: 'An unknown error occurred.',
      toggleOn: 'On',
      longitudeEast: 'East',
      longitudeWest: 'West',
      latitudeNorth: 'North',
      latitudeSouth: 'South',
      moduleSpacing: 'Module Spacing',
      primaryValueSize: 'Large Reading Size',
      contentPadding: 'Text Padding'
    }
  };

  let currentLang = localStorage.getItem(STORAGE_KEY) || 'zh';
  if (!dictionaries[currentLang]) currentLang = 'zh';

  const listeners = new Set();

  function applyTranslations() {
    document.documentElement.setAttribute('lang', currentLang);
    document.documentElement.setAttribute('data-lang', currentLang); // 让 CSS 控制显隐
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const text = t(key);
      if (text) el.textContent = text;
    });
    listeners.forEach((fn) => fn(currentLang));
  }

  function setLang(lang) {
    if (!dictionaries[lang]) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, currentLang);
    applyTranslations();
  }

  function t(key) {
    const dict = dictionaries[currentLang] || dictionaries.zh;
    return dict[key] || key;
  }

  function onLangChange(cb) { if (typeof cb === 'function') listeners.add(cb); }

  document.addEventListener('DOMContentLoaded', applyTranslations, { once: true });

  window.I18N = { setLang, t, onLangChange, getLang: () => currentLang, dictionaries };
})();
