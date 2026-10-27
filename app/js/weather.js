/* Clima via Open-Meteo (sem chave): busca de cidade + previsão do dia. ES5.
   Weather.init(http) recebe a função de rede do app (XHR com fallback pelo proxy local). */
var Weather = (function () {
  'use strict';
  var http = null;

  function getJson(url) {
    if (!http) { return Promise.reject(new Error('sem rede')); }
    return Promise.resolve(http(url)).then(function (t) { return typeof t === 'string' ? JSON.parse(t) : t; });
  }

  // códigos WMO -> ícone e texto
  function kind(code, day) {
    if (code === 0 || code === 1) { return day === 0 ? 'cloud' : 'sun'; }
    if (code === 2) { return 'cloudsun'; }
    if (code === 3) { return 'cloud'; }
    if (code === 45 || code === 48) { return 'fog'; }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) { return 'rain'; }
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) { return 'snow'; }
    if (code >= 95) { return 'storm'; }
    return 'cloud';
  }

  function text(code) {
    if (code === 0) { return 'Céu limpo'; }
    if (code === 1) { return 'Poucas nuvens'; }
    if (code === 2) { return 'Parcialmente nublado'; }
    if (code === 3) { return 'Nublado'; }
    if (code === 45 || code === 48) { return 'Neblina'; }
    if (code >= 51 && code <= 57) { return 'Garoa'; }
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) { return 'Chuva'; }
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) { return 'Neve'; }
    if (code >= 95) { return 'Tempestade'; }
    return 'Nublado';
  }

  function search(name) {
    var q = encodeURIComponent(String(name || '').trim());
    return getJson('https://geocoding-api.open-meteo.com/v1/search?name=' + q + '&count=6&language=pt&format=json').then(function (d) {
      return ((d && d.results) || []).map(function (r) {
        return { name: r.name, admin: r.admin1 || '', country: r.country_code || r.country || '', lat: r.latitude, lon: r.longitude };
      });
    });
  }

  function forecast(city) {
    var u = 'https://api.open-meteo.com/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon +
      '&current=temperature_2m,apparent_temperature,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1';
    return getJson(u).then(function (d) {
      var c = d && d.current, dl = d && d.daily;
      if (!c) { throw new Error('resposta inválida'); }
      return {
        temp: c.temperature_2m, feels: c.apparent_temperature, code: c.weather_code, day: c.is_day,
        min: dl && dl.temperature_2m_min ? dl.temperature_2m_min[0] : c.temperature_2m,
        max: dl && dl.temperature_2m_max ? dl.temperature_2m_max[0] : c.temperature_2m
      };
    });
  }

  return { init: function (fn) { http = fn; }, search: search, forecast: forecast, kind: kind, text: text };
})();
