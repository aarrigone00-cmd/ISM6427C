(function () {
  'use strict';

  // Default location: Florida Atlantic University, Boca Raton, FL
  var DEFAULT_PLACE = {
    name: 'Boca Raton',
    sub: 'Florida Atlantic University · Florida, USA',
    latitude: 26.3728,
    longitude: -80.1021
  };

  var WEATHER_CODES = {
    0: ['Clear sky', '☀️', '🌙'],
    1: ['Mainly clear', '🌤️', '🌙'],
    2: ['Partly cloudy', '⛅', '☁️'],
    3: ['Overcast', '☁️', '☁️'],
    45: ['Fog', '🌫️', '🌫️'],
    48: ['Rime fog', '🌫️', '🌫️'],
    51: ['Light drizzle', '🌦️', '🌧️'],
    53: ['Drizzle', '🌦️', '🌧️'],
    55: ['Heavy drizzle', '🌧️', '🌧️'],
    56: ['Freezing drizzle', '🌧️', '🌧️'],
    57: ['Freezing drizzle', '🌧️', '🌧️'],
    61: ['Light rain', '🌦️', '🌧️'],
    63: ['Rain', '🌧️', '🌧️'],
    65: ['Heavy rain', '🌧️', '🌧️'],
    66: ['Freezing rain', '🌧️', '🌧️'],
    67: ['Freezing rain', '🌧️', '🌧️'],
    71: ['Light snow', '🌨️', '🌨️'],
    73: ['Snow', '🌨️', '🌨️'],
    75: ['Heavy snow', '❄️', '❄️'],
    77: ['Snow grains', '🌨️', '🌨️'],
    80: ['Rain showers', '🌦️', '🌧️'],
    81: ['Rain showers', '🌧️', '🌧️'],
    82: ['Violent showers', '⛈️', '⛈️'],
    85: ['Snow showers', '🌨️', '🌨️'],
    86: ['Snow showers', '❄️', '❄️'],
    95: ['Thunderstorm', '⛈️', '⛈️'],
    96: ['Thunderstorm, hail', '⛈️', '⛈️'],
    99: ['Thunderstorm, hail', '⛈️', '⛈️']
  };

  var $ = function (id) { return document.getElementById(id); };

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  function describe(code, isDay) {
    var w = WEATHER_CODES[code] || ['Unknown', '🌡️', '🌡️'];
    return { text: w[0], icon: isDay === 0 ? w[2] : w[1] };
  }

  /* ---------- Greeting ---------- */
  function setGreeting() {
    var h = new Date().getHours();
    var part = h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    $('greeting').textContent = part + ', Angela! 👋';
  }

  /* ---------- Theme ---------- */
  var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function applyTheme(choice) {
    var root = document.documentElement;
    if (choice === 'light' || choice === 'dark') root.setAttribute('data-theme', choice);
    else root.removeAttribute('data-theme');
    document.querySelectorAll('[data-theme-choice]').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-theme-choice') === choice));
    });
  }

  function initTheme() {
    var saved = store('theme') || 'system';
    applyTheme(saved);
    document.querySelectorAll('[data-theme-choice]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = b.getAttribute('data-theme-choice');
        store('theme', c);
        applyTheme(c);
      });
    });
  }

  /* ---------- Units ---------- */
  var unit = store('unit') === 'celsius' ? 'celsius' : 'fahrenheit';

  function syncUnitButtons() {
    document.querySelectorAll('[data-unit]').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-unit') === unit));
    });
  }

  function initUnits() {
    syncUnitButtons();
    document.querySelectorAll('[data-unit]').forEach(function (b) {
      b.addEventListener('click', function () {
        var u = b.getAttribute('data-unit');
        if (u === unit) return;
        unit = u;
        store('unit', u);
        syncUnitButtons();
        if (currentPlace) loadWeather(currentPlace);
      });
    });
  }

  /* ---------- Status ---------- */
  function setStatus(msg, isError) {
    var el = $('status');
    el.textContent = msg || '';
    el.classList.toggle('error', !!isError);
  }

  /* ---------- Formatting ---------- */
  function fmtTime(iso) {
    // Open-Meteo returns local times (timezone=auto) without offset; parse parts manually
    var t = iso.split('T')[1] || '00:00';
    var parts = t.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1];
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return m === '00' ? h12 + ' ' + ampm : h12 + ':' + m + ' ' + ampm;
  }

  function fmtDay(isoDate, index) {
    if (index === 0) return 'Today';
    var p = isoDate.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' });
  }

  function deg(v) { return Math.round(v) + '°'; }

  /* ---------- Weather ---------- */
  var currentPlace = null;
  var requestId = 0;

  function loadWeather(place) {
    currentPlace = place;
    var myId = ++requestId;
    setStatus('Loading weather for ' + place.name + '…');

    var windUnit = unit === 'fahrenheit' ? 'mph' : 'kmh';
    var precipUnit = unit === 'fahrenheit' ? 'inch' : 'mm';

    var params = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
      hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
      temperature_unit: unit,
      wind_speed_unit: windUnit,
      precipitation_unit: precipUnit,
      timezone: 'auto',
      forecast_days: 7
    });

    fetch('https://api.open-meteo.com/v1/forecast?' + params.toString())
      .then(function (r) {
        if (!r.ok) throw new Error('Weather service returned ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (myId !== requestId) return;
        render(place, data, windUnit, precipUnit);
        setStatus('');
      })
      .catch(function (err) {
        if (myId !== requestId) return;
        setStatus('Could not load weather: ' + err.message, true);
      });
  }

  function compass(d) {
    var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(d / 45) % 8];
  }

  function render(place, data, windUnit, precipUnit) {
    var c = data.current;
    var w = describe(c.weather_code, c.is_day);

    $('place-name').textContent = place.name;
    $('place-sub').textContent = place.sub || '';
    $('cur-icon').textContent = w.icon;
    $('cur-temp').textContent = deg(c.temperature_2m) + (unit === 'fahrenheit' ? 'F' : 'C');
    $('cur-desc').textContent = w.text;
    $('cur-feels').textContent = 'Feels like ' + deg(c.apparent_temperature);
    $('cur-humidity').textContent = c.relative_humidity_2m + '%';
    $('cur-wind').textContent = Math.round(c.wind_speed_10m) + ' ' + (windUnit === 'kmh' ? 'km/h' : 'mph') + ' ' + compass(c.wind_direction_10m);
    $('cur-precip').textContent = c.precipitation + (precipUnit === 'inch' ? ' in' : ' mm');
    $('cur-uv').textContent = data.daily.uv_index_max[0] != null ? data.daily.uv_index_max[0].toFixed(1) : '—';
    $('cur-sunrise').textContent = fmtTime(data.daily.sunrise[0]);
    $('cur-sunset').textContent = fmtTime(data.daily.sunset[0]);
    $('updated').textContent = 'Updated ' + fmtTime(c.time) + ' local time · ' + (data.timezone_abbreviation || data.timezone);

    // Hourly: next 24 hours starting from the current hour
    var hourly = $('hourly');
    hourly.innerHTML = '';
    var curHour = c.time.slice(0, 13);
    var start = data.hourly.time.findIndex(function (t) { return t.slice(0, 13) === curHour; });
    if (start < 0) start = 0;
    for (var i = start; i < Math.min(start + 24, data.hourly.time.length); i++) {
      var hw = describe(data.hourly.weather_code[i], data.hourly.is_day[i]);
      var div = document.createElement('div');
      div.className = 'hour';
      div.title = hw.text;
      var pp = data.hourly.precipitation_probability[i];
      div.innerHTML =
        '<div class="t">' + (i === start ? 'Now' : fmtTime(data.hourly.time[i])) + '</div>' +
        '<div class="i" aria-hidden="true">' + hw.icon + '</div>' +
        '<div class="v">' + deg(data.hourly.temperature_2m[i]) + '</div>' +
        '<div class="p">' + (pp != null ? '💧' + pp + '%' : '') + '</div>';
      hourly.appendChild(div);
    }

    // Daily
    var daily = $('daily');
    daily.innerHTML = '';
    data.daily.time.forEach(function (day, idx) {
      var dw = describe(data.daily.weather_code[idx], 1);
      var li = document.createElement('li');
      var rain = data.daily.precipitation_probability_max[idx];
      li.innerHTML =
        '<span class="d">' + fmtDay(day, idx) + '</span>' +
        '<span class="i" aria-hidden="true">' + dw.icon + '</span>' +
        '<span class="desc-sm">' + dw.text + '</span>' +
        '<span class="rain">' + (rain != null ? '💧' + rain + '%' : '') + '</span>' +
        '<span class="range">' + deg(data.daily.temperature_2m_max[idx]) +
        '<span class="lo">' + deg(data.daily.temperature_2m_min[idx]) + '</span></span>';
      daily.appendChild(li);
    });

    $('current').hidden = false;
    $('hourly-wrap').hidden = false;
    $('daily-wrap').hidden = false;
  }

  /* ---------- Search ---------- */
  function initSearch() {
    var form = $('search-form');
    var input = $('search-input');
    var results = $('results');

    function hideResults() { results.hidden = true; results.innerHTML = ''; }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      setStatus('Searching for “' + q + '”…');
      var url = 'https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=' + encodeURIComponent(q);
      fetch(url)
        .then(function (r) { if (!r.ok) throw new Error('Search failed'); return r.json(); })
        .then(function (data) {
          results.innerHTML = '';
          if (!data.results || !data.results.length) {
            setStatus('No places found for “' + q + '”.', true);
            hideResults();
            return;
          }
          setStatus('');
          data.results.forEach(function (p) {
            var sub = [p.admin1, p.country].filter(Boolean).join(', ');
            var li = document.createElement('li');
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = p.name + (sub ? ' — ' + sub : '');
            btn.addEventListener('click', function () {
              hideResults();
              input.value = '';
              loadWeather({ name: p.name, sub: sub, latitude: p.latitude, longitude: p.longitude });
            });
            li.appendChild(btn);
            results.appendChild(li);
          });
          results.hidden = false;
        })
        .catch(function (err) { setStatus(err.message, true); });
    });

    document.addEventListener('click', function (e) {
      if (!form.contains(e.target)) hideResults();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideResults();
    });

    $('home-btn').addEventListener('click', function () {
      hideResults();
      loadWeather(DEFAULT_PLACE);
    });

    $('locate-btn').addEventListener('click', function () {
      hideResults();
      if (!navigator.geolocation) {
        setStatus('Geolocation is not supported by this browser.', true);
        return;
      }
      setStatus('Finding your location…');
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          loadWeather({
            name: 'My location',
            sub: pos.coords.latitude.toFixed(3) + ', ' + pos.coords.longitude.toFixed(3),
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        function () { setStatus('Could not get your location. Showing Boca Raton instead.', true); },
        { timeout: 10000 }
      );
    });
  }

  /* ---------- Boot ---------- */
  setGreeting();
  initTheme();
  initUnits();
  initSearch();
  loadWeather(DEFAULT_PLACE);

  // Refresh every 10 minutes so data stays current
  setInterval(function () {
    setGreeting();
    if (currentPlace) loadWeather(currentPlace);
  }, 10 * 60 * 1000);
})();
