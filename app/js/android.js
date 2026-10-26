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

  function layout() {
    var W = window.innerWidth, H = window.innerHeight;
    if (!W || !H) { return; }
    var designH = tv ? 1080 : 720;
    var s = H / designH, sw = W / s;
    if (sw < 1100) { sw = 1100; s = W / sw; }   // tela muito estreita: largura lógica mínima
    var sh = H / s;
    root.style.width = W + 'px';
    root.style.height = H + 'px';
    body.style.width = sw + 'px';
    body.style.height = sh + 'px';
    body.style.webkitTransformOrigin = '0 0';
    body.style.transformOrigin = '0 0';
    body.style.webkitTransform = 'scale(' + s + ')';
    body.style.transform = 'scale(' + s + ')';
    body.classList.toggle('compact', sh < 900);
    if (window.Nav) { window.Nav.setScale(s); }
  }

  layout();
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', function () { setTimeout(layout, 250); });
  setTimeout(layout, 300);
})();
