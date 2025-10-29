(function () {
  const STORAGE_KEY = 'vista-lang';

  const dictionaries = {
    zh: {
      appTitle: 'Vista',
      navBackLabel: '返回 hey1www.github.io',
      navMenuLabel: '打开设置',
      navCloseLabel: '关闭设置',
      settingsTitle: '设置',
      languageLabel: '语言',
      languageZh: '中文',
      languageEn: 'English',
      themeLabel: '颜色模式',
      themeLight: '浅色',
      themeDark: '深色',
      detailModuleLabel: '信息细节模块',
      detailModuleToggle: '显示定位时间与精度',
      speedModuleLabel: '当前速度模块',
      speedModuleToggle: '显示当前速度',
      speedUnitLabel: '速度单位',
      speedUnitKmh: 'km/h',
      speedUnitMs: 'm/s',
      altitudeLabel: '海拔',
      speedLabel: '当前速度',
      timestampLabel: '定位获取时间',
      accuracyLabel: '定位精度',
      statusRequesting: '正在请求定位…',
      statusPermissionDenied: '定位被拒绝，请在浏览器设置中授权。',
      statusPositionUnavailable: '无法获取当前位置，请检查定位服务。',
      statusTimeout: '定位超时，请稍后重试。',
      statusUnknownError: '定位失败，请再次尝试。',
      statusUnsupported: '此设备或浏览器不支持定位功能。',
      retry: '重新尝试',
      hemisphere: {
        lonEast: '东经',
        lonWest: '西经',
        latNorth: '北纬',
        latSouth: '南纬'
      },
      units: {
        kmh: 'km/h',
        ms: 'm/s',
        meter: 'm'
      }
    },
    en: {
      appTitle: 'Vista',
      navBackLabel: 'Back to hey1www.github.io',
      navMenuLabel: 'Open settings',
      navCloseLabel: 'Close settings',
      settingsTitle: 'Settings',
      languageLabel: 'Language',
      languageZh: '中文',
      languageEn: 'English',
      themeLabel: 'Color mode',
      themeLight: 'Light',
      themeDark: 'Dark',
      detailModuleLabel: 'Information details',
      detailModuleToggle: 'Show timestamp and accuracy',
      speedModuleLabel: 'Current speed',
      speedModuleToggle: 'Show current speed',
      speedUnitLabel: 'Speed unit',
      speedUnitKmh: 'km/h',
      speedUnitMs: 'm/s',
      altitudeLabel: 'Altitude',
      speedLabel: 'Current speed',
      timestampLabel: 'Fix time',
      accuracyLabel: 'Accuracy',
      statusRequesting: 'Requesting location…',
      statusPermissionDenied: 'Location access denied. Please enable it in browser settings.',
      statusPositionUnavailable: 'Current position unavailable. Check your location services.',
      statusTimeout: 'Location request timed out. Try again shortly.',
      statusUnknownError: 'Unable to fetch location. Please try again.',
      statusUnsupported: 'This device or browser does not support geolocation.',
      retry: 'Retry',
      hemisphere: {
        lonEast: 'E',
        lonWest: 'W',
        latNorth: 'N',
        latSouth: 'S'
      },
      units: {
        kmh: 'km/h',
        ms: 'm/s',
        meter: 'm'
      }
    }
  };

  let currentLang = 'zh';

  function resolve(object, path) {
    return path.reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), object);
  }

  function t(key) {
    const path = key.split('.');
    const fromCurrent = resolve(dictionaries[currentLang], path);
    if (fromCurrent !== undefined) {
      return fromCurrent;
    }
    const fallback = resolve(dictionaries.zh, path) || resolve(dictionaries.en, path);
    return fallback !== undefined ? fallback : key;
  }

  function updateElement(el) {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const text = t(key);
    if (text !== undefined) {
      el.textContent = text;
    }
  }

  function updateAttr(el) {
    const attr = el.getAttribute('data-i18n-attr');
    const key = el.getAttribute('data-i18n');
    if (!attr || !key) return;
    const text = t(key);
    if (text !== undefined) {
      el.setAttribute(attr, text);
    }
  }

  function applyTranslations(root = document) {
    const textNodes = root.querySelectorAll('[data-i18n]');
    textNodes.forEach(updateElement);
    const attrNodes = root.querySelectorAll('[data-i18n-attr]');
    attrNodes.forEach(updateAttr);
  }

  function setLang(lang) {
    if (!dictionaries[lang]) {
      lang = 'zh';
    }
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {
      console.error('Unable to persist language preference', err);
    }
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    applyTranslations();
    window.dispatchEvent(new CustomEvent('vista:lang', { detail: { lang } }));
    return currentLang;
  }

  function init() {
    let stored;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      stored = null;
    }
    const lang = dictionaries[stored] ? stored : 'zh';
    currentLang = lang;
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => applyTranslations());
    } else {
      applyTranslations();
    }
    return currentLang;
  }

  window.I18N = {
    init,
    setLang,
    t,
    getLang() {
      return currentLang;
    },
    apply: applyTranslations
  };
})();
