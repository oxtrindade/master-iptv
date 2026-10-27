/* Navegação espacial por controle remoto (D-pad). Elementos navegáveis têm a classe "f". */
var Nav = (function () {
  'use strict';
  var scopeEl = null;
  var onFocus = null;

  function root() { return scopeEl || document.body; }

  function visible(el) {
    var r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) { return false; }
    var p = el, st;
    while (p && p !== document.body) {
      st = window.getComputedStyle(p);
      if (st.display === 'none' || st.visibility === 'hidden') { return false; }
      p = p.parentNode;
    }
    return true;
  }

  function all() {
    var out = [], list = root().querySelectorAll('.f'), i;
    for (i = 0; i < list.length; i++) { if (visible(list[i])) { out.push(list[i]); } }
    return out;
  }

  function current() {
    var c = root().querySelector('.f.focus');
    return c && visible(c) ? c : null;
  }

  var scale = 1;   // escala visual do palco (Android); 1 = sem escala

  function adjust(sc, el) {
    // getBoundingClientRect devolve px visuais; scrollTop/Left são px de layout => divide pela escala
    var r = el.getBoundingClientRect(), p = sc.getBoundingClientRect(), k = scale || 1;
    if (sc.scrollHeight > sc.clientHeight + 1) {
      var pv = 70 * k;
      if (r.top < p.top + pv) { sc.scrollTop -= (p.top + pv - r.top) / k; }
      else if (r.bottom > p.bottom - pv) { sc.scrollTop += (r.bottom - p.bottom + pv) / k; }
    }
    if (sc.scrollWidth > sc.clientWidth + 1) {
      var ph = 90 * k;
      if (r.left < p.left + ph) { sc.scrollLeft -= (p.left + ph - r.left) / k; }
      else if (r.right > p.right - ph) { sc.scrollLeft += (r.right - p.right + ph) / k; }
    }
  }

  function ensureVisible(el) {
    var p = el.parentNode;
    while (p && p !== document.body) {
      if (p.classList && p.classList.contains('scroll')) {
        if (el.getAttribute('data-top') && p.classList.contains('page')) { p.scrollTop = 0; }
        else { adjust(p, el); }
      }
      p = p.parentNode;
    }
  }

  function focus(el) {
    if (!el) { return; }
    var olds = document.querySelectorAll('.f.focus'), i;
    for (i = 0; i < olds.length; i++) { olds[i].classList.remove('focus'); }
    el.classList.add('focus');
    ensureVisible(el);
    if (onFocus) { onFocus(el); }
  }

  function overlap(a1, a2, b1, b2) { return Math.min(a2, b2) - Math.max(a1, b1) > 0; }

  function move(dir) {
    var list = all();
    if (!list.length) { return; }
    var cur = current();
    if (!cur) { focus(list[0]); return; }
    var a = cur.getBoundingClientRect();
    var acx = (a.left + a.right) / 2, acy = (a.top + a.bottom) / 2;
    var best = null, bestScore = Infinity, i;
    for (i = 0; i < list.length; i++) {
      var el = list[i];
      if (el === cur) { continue; }
      var b = el.getBoundingClientRect();
      var bcx = (b.left + b.right) / 2, bcy = (b.top + b.bottom) / 2;
      var primary, perp, ok;
      if (dir === 'right') {
        ok = bcx > acx + 1 && b.right > a.right;
        primary = Math.max(0, b.left - a.right);
        perp = overlap(a.top, a.bottom, b.top, b.bottom) ? 0 : Math.min(Math.abs(b.top - a.bottom), Math.abs(a.top - b.bottom));
      } else if (dir === 'left') {
        ok = bcx < acx - 1 && b.left < a.left;
        primary = Math.max(0, a.left - b.right);
        perp = overlap(a.top, a.bottom, b.top, b.bottom) ? 0 : Math.min(Math.abs(b.top - a.bottom), Math.abs(a.top - b.bottom));
      } else if (dir === 'down') {
        ok = bcy > acy + 1 && b.bottom > a.bottom;
        primary = Math.max(0, b.top - a.bottom);
        perp = overlap(a.left, a.right, b.left, b.right) ? 0 : Math.min(Math.abs(b.left - a.right), Math.abs(a.left - b.right));
      } else {
        ok = bcy < acy - 1 && b.top < a.top;
        primary = Math.max(0, a.top - b.bottom);
        perp = overlap(a.left, a.right, b.left, b.right) ? 0 : Math.min(Math.abs(b.left - a.right), Math.abs(a.left - b.right));
      }
      if (!ok) { continue; }
      var off = (dir === 'left' || dir === 'right') ? Math.abs(acy - bcy) : Math.abs(acx - bcx);
      var score = primary + perp * 3 + off * 0.5;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { focus(best); }
  }

  function activate() {
    var el = current();
    if (!el) { return; }
    if (el.tagName === 'INPUT') { el.focus(); return; }
    el.click();
  }

  return {
    setScope: function (el) { scopeEl = el; },
    setScale: function (s) { scale = s > 0 ? s : 1; },
    getScope: function () { return scopeEl; },
    onFocus: function (fn) { onFocus = fn; },
    all: all,
    current: current,
    focus: focus,
    focusFirst: function () { var l = all(); if (l.length) { focus(l[0]); } },
    move: move,
    activate: activate
  };
})();
