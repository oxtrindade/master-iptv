/* Camada Android (TV e celular).
   Só age dentro do app Android (que injeta window.NativeApp); no webOS este arquivo não faz nada.
   Mantém a interface como um "palco" com escala: na TV usa 1080 px de altura lógica (igual ao webOS);
   no celular usa 720 px (elementos maiores para a tela pequena) e liga o modo compacto. */
(function () {
  'use strict';
  var N = window.NativeApp;
  if (!N) { return; }

  var tv = false;
  try { tv = !!N.isTv(); } catch (e) { tv = false; }
  var root = document.documentElement, body = document.body;
  root.classList.add('android');
  body.classList.add('android');
  body.classList.add(tv ? 'tv' : 'phone');
  if (!tv) { body.classList.add('touch'); }

  /* tamanho da interface (Configurações → Aparência): 1 = normal, 1.15 = grande, 1.3 = muito grande */
  function uiScale() {
    try { var v = parseFloat(JSON.parse(localStorage.getItem('iptv.uiscale'))); if (v >= 1 && v <= 1.5) { return v; } } catch (e) {}
    return 1;
  }

  function layout() {
    var W = window.innerWidth, H = window.innerHeight;
    if (!W || !H) { return; }
    var portrait = !tv && H > W, s, sw, sh;
    if (portrait) {
      sw = 400 / uiScale(); s = W / sw;   // celular em pé: 400 px lógicos de largura (menos = tudo maior)
    } else {
      var designH = tv ? 1080 : 620 / uiScale();
      s = H / designH; sw = W / s;
      if (sw < 1100) { sw = 1100; s = W / sw; }   // tela muito estreita: largura lógica mínima
    }
    sh = H / s;
    root.style.width = W + 'px';
    root.style.height = H + 'px';
    body.style.width = sw + 'px';
    body.style.height = sh + 'px';
    body.style.webkitTransformOrigin = '0 0';
    body.style.transformOrigin = '0 0';
    body.style.webkitTransform = 'scale(' + s + ')';
    body.style.transform = 'scale(' + s + ')';
    body.classList.toggle('portrait', portrait);
    body.classList.toggle('compact', portrait || sh < 900);
    if (window.Nav) { window.Nav.setScale(s); }
  }

  window.__relayout = layout;
  layout();
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', function () { setTimeout(layout, 250); });
  setTimeout(layout, 300);
})();
