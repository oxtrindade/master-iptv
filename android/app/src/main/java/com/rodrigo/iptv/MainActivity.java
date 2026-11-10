package com.rodrigo.iptv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.UiModeManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.media.AudioManager;
import android.net.ConnectivityManager;
import android.provider.Settings;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Casca fina em volta de um WebView que carrega a interface web (assets/www).
 * Serve Android TV (controle remoto) e celular (toque) com o mesmo APK.
 * Os dados de login ficam no localStorage do WebView, dentro do app.
 */
public class MainActivity extends Activity {

    private static final String START_URL = "file:///android_asset/www/index.html";
    private static final String YT_HOST = "appassets.androidplatform.net";
    private static final Pattern YT_ID = Pattern.compile("^[\\w-]{11}$");

    /** Mesma página que o proxy local serve na LG: dá origem https ao embed e repassa eventos/comandos ao app. */
    private static String ytPage(String id) {
        String origin = "https://" + YT_HOST;
        String src = "https://www.youtube.com/embed/" + id
                + "?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3"
                + "&enablejsapi=1&origin=" + origin + "&widget_referrer=" + origin + "/";
        return "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"referrer\" content=\"strict-origin-when-cross-origin\">"
                + "<style>html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}iframe{position:absolute;left:0;top:0;width:100%;height:100%;border:0}</style></head>"
                + "<body><iframe id=\"f\" allow=\"autoplay; encrypted-media\" referrerpolicy=\"strict-origin-when-cross-origin\" src=\"" + src + "\"></iframe>"
                + "<script>var f=document.getElementById(\"f\");"
                + "window.addEventListener(\"message\",function(e){"
                + "if(e.source===f.contentWindow){parent.postMessage(e.data,\"*\");}"
                + "else if(e.source===parent&&typeof e.data===\"string\"&&e.data.indexOf('\"command\"')>0){try{f.contentWindow.postMessage(e.data,\"*\");}catch(x){}}});"
                + "f.onload=function(){try{f.contentWindow.postMessage(JSON.stringify({event:\"listening\",id:1,channel:\"widget\"}),\"*\");}catch(x){}};</script></body></html>";
    }

    private WebView web;
    private boolean tv;
    private boolean pageReady = false;
    private volatile boolean playing = false;   // há vídeo tocando (informado pela página)
    private boolean pipActive = false;
    private volatile boolean bgPlay = true;   // opção "continuar tocando com a tela bloqueada"
    private boolean svcOn = false;
    private Downloads downloads;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @SuppressWarnings("deprecation")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        tv = detectTv();
        // TV fica sempre deitada; celular acompanha a rotação (vertical ou horizontal)
        setRequestedOrientation(tv
                ? android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                : android.content.pm.ActivityInfo.SCREEN_ORIENTATION_USER);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this) {
            /** Com a tela bloqueada o sistema avisa que a janela sumiu; ignorar isso mantém a página (e o áudio) ativa. */
            @Override
            protected void onWindowVisibilityChanged(int visibility) {
                if (visibility != View.VISIBLE && !tv && playing && bgPlay) {
                    return;
                }
                super.onWindowVisibilityChanged(visibility);
            }
        };
        web.setBackgroundColor(Color.parseColor("#0B101A"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        // A página é local (file://). Estas duas opções deixam o JS dela chamar o servidor IPTV sem CORS.
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setUseWideViewPort(false);
        s.setLoadWithOverviewMode(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);

        // precisa existir antes do carregamento da página: o JS decide TV/celular ao iniciar
        web.addJavascriptInterface(new Bridge(), "NativeApp");

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public Bitmap getDefaultVideoPoster() {
                return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
            }
        });
        web.setWebViewClient(new WebViewClient() {
            /** Página do player do YouTube com origem https (o app abre de file://, e o YouTube recusa embed sem origem: erro 153). */
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                android.net.Uri u = request.getUrl();
                if (u != null && YT_HOST.equals(u.getHost()) && "/yt".equals(u.getPath())) {
                    String id = u.getQueryParameter("id");
                    if (id != null && YT_ID.matcher(id).matches()) {
                        return new WebResourceResponse("text/html", "utf-8",
                                new ByteArrayInputStream(ytPage(id).getBytes(StandardCharsets.UTF_8)));
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // só a navegação da página principal é restrita; o player do YouTube roda dentro de um iframe
                if (!request.isForMainFrame()) { return false; }
                return shouldOverrideUrlLoading(view, request.getUrl().toString());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // nunca sai das páginas do próprio app
                return !url.startsWith("file:///android_asset/");
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
            }
        });

        web.loadUrl(START_URL);
        web.requestFocus();
    }

    /** Ponte exposta ao JavaScript como window.NativeApp. */
    public class Bridge {
        /** true se a conexão ativa é paga/limitada (dados móveis): o trailer só toca no Wi-Fi. */
        @JavascriptInterface
        public boolean isMetered() {
            try {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                return cm != null && cm.isActiveNetworkMetered();
            } catch (Exception e) {
                return false;
            }
        }

        /** Abre um endereço fora do app (YouTube). Tenta o app do YouTube e, se não houver, o que o sistema escolher. */
        @JavascriptInterface
        public boolean openUrl(String url) {
            if (url == null || !(url.startsWith("https://www.youtube.com/") || url.startsWith("https://youtube.com/"))) {
                return false;
            }
            String[] pkgs = tv
                    ? new String[] { "com.google.android.youtube.tv", "com.google.android.youtube", null }
                    : new String[] { "com.google.android.youtube", null };
            for (String pkg : pkgs) {
                try {
                    Intent i = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
                    if (pkg != null) {
                        i.setPackage(pkg);
                    }
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(i);
                    return true;
                } catch (Exception e) {
                    // tenta a próxima opção
                }
            }
            return false;
        }

        @JavascriptInterface
        public boolean isTv() {
            return tv;
        }

        /** Player aberto: trava deitado (tela cheia). Fechado: volta a seguir a rotação do celular. */
        @JavascriptInterface
        public void setFullscreen(final boolean on) {
            if (tv) {
                return;
            }
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    setRequestedOrientation(on
                            ? android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                            : android.content.pm.ActivityInfo.SCREEN_ORIENTATION_USER);
                }
            });
        }

        /** A página avisa se há vídeo tocando: só nesse caso o botão Home vira janela flutuante (PiP). */
        @JavascriptInterface
        public void setPlaying(boolean on) {
            playing = on;
            syncService();
        }

        /** Opção do usuário: continuar tocando com a tela bloqueada / app em segundo plano (só celular). */
        @JavascriptInterface
        public void setBackground(boolean on) {
            bgPlay = on;
            syncService();
        }

        /* ---- gestos do player: brilho (só desta janela) e volume do aparelho ---- */

        /** Brilho atual de 0 a 1 (texto). */
        @JavascriptInterface
        public String getBrightness() {
            float b = getWindow().getAttributes().screenBrightness;
            if (b < 0) {
                try {
                    b = Settings.System.getInt(getContentResolver(), Settings.System.SCREEN_BRIGHTNESS) / 255f;
                } catch (Throwable t) {
                    b = 0.5f;
                }
            }
            return String.valueOf(b);
        }

        /** 0..1 ajusta o brilho desta tela; valor negativo volta ao brilho do sistema. */
        @JavascriptInterface
        public void setBrightness(final float v) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    WindowManager.LayoutParams lp = getWindow().getAttributes();
                    lp.screenBrightness = v < 0 ? WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE : Math.min(1f, v);
                    getWindow().setAttributes(lp);
                }
            });
        }

        /** Volume de mídia de 0 a 1 (texto). */
        @JavascriptInterface
        public String getVolume() {
            try {
                AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                return String.valueOf(max > 0 ? am.getStreamVolume(AudioManager.STREAM_MUSIC) / (float) max : 0.5f);
            } catch (Throwable t) {
                return "0.5";
            }
        }

        @JavascriptInterface
        public void setVolume(float v) {
            try {
                AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                am.setStreamVolume(AudioManager.STREAM_MUSIC, Math.round(Math.max(0f, Math.min(1f, v)) * max), 0);
            } catch (Throwable t) {
                // sem permissão ou sem áudio: ignora
            }
        }

        /* ---- downloads para assistir offline (celular) ---- */

        /** Enfileira o download. Devolve o id (texto) ou "-1" se falhou. */
        @JavascriptInterface
        public String dlStart(String url, String fileName, String title, boolean wifiOnly, String userAgent) {
            askNotificationPermission();
            return String.valueOf(dl().start(url, fileName, title, wifiOnly, userAgent));
        }

        /** Situação dos downloads: recebe ids separados por vírgula, devolve JSON (ou null se a consulta falhou). */
        @JavascriptInterface
        public String dlStatus(String idsCsv) {
            return dl().status(parseIds(idsCsv));
        }

        @JavascriptInterface
        public boolean dlRemove(String id) {
            try {
                return dl().remove(Long.parseLong(id.trim()));
            } catch (Throwable t) {
                return false;
            }
        }

        /** Espaço livre em bytes (texto), "-1" se desconhecido. */
        @JavascriptInterface
        public String dlFree() {
            return String.valueOf(dl().freeBytes());
        }

        @JavascriptInterface
        public void exit() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    finish();
                }
            });
        }
    }

    private synchronized Downloads dl() {
        if (downloads == null) {
            downloads = new Downloads(this);
        }
        return downloads;
    }

    private static long[] parseIds(String csv) {
        if (csv == null || csv.trim().length() == 0) {
            return new long[0];
        }
        String[] parts = csv.split(",");
        long[] tmp = new long[parts.length];
        int n = 0;
        for (String p : parts) {
            try {
                tmp[n] = Long.parseLong(p.trim());
                n++;
            } catch (NumberFormatException ignored) {
                // id inválido: ignora
            }
        }
        long[] out = new long[n];
        System.arraycopy(tmp, 0, out, 0, n);
        return out;
    }

    /** Android 13+: sem a permissão de notificações o download funciona, mas o progresso não aparece na barra. */
    @SuppressLint("NewApi")
    private void askNotificationPermission() {
        if (Build.VERSION.SDK_INT < 33) {
            return;
        }
        if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") == PackageManager.PERMISSION_GRANTED) {
            return;
        }
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 77);
            }
        });
    }

    private boolean detectTv() {
        UiModeManager um = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
        if (um != null && um.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION) {
            return true;
        }
        return getPackageManager().hasSystemFeature("android.software.leanback")
                || getPackageManager().hasSystemFeature("android.hardware.type.television");
    }

    /** Voltar do Android não vira tecla no WebView: repassa para a lógica de navegação da página. */
    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (web != null && pageReady) {
            web.evaluateJavascript("window.__nativeBack && window.__nativeBack()", null);
        } else {
            super.onBackPressed();
        }
    }

    /** Teclas de mídia/canal do controle remoto -> códigos que o app web já entende. */
    private int mapKey(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_MEDIA_PLAY:
                return 415;
            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                return 19;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_HEADSETHOOK:
                return 1000;
            case KeyEvent.KEYCODE_MEDIA_STOP:
                return 413;
            case KeyEvent.KEYCODE_MEDIA_REWIND:
                return 412;
            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
                return 417;
            case KeyEvent.KEYCODE_CHANNEL_UP:
            case KeyEvent.KEYCODE_MEDIA_NEXT:
                return 33;
            case KeyEvent.KEYCODE_CHANNEL_DOWN:
            case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                return 34;
            case KeyEvent.KEYCODE_MENU:
            case KeyEvent.KEYCODE_PROG_RED:
                return 403; // favoritar
            case KeyEvent.KEYCODE_PROG_GREEN:
                return 404; // áudio e legenda
            case KeyEvent.KEYCODE_PROG_YELLOW:
                return 405; // pular introdução / ampliar mini player
            case KeyEvent.KEYCODE_PROG_BLUE:
                return 406; // fechar mini player
            default:
                return 0;
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int code = mapKey(event.getKeyCode());
        if (code != 0 && web != null && pageReady) {
            if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                web.evaluateJavascript("window.__nativeKey && window.__nativeKey(" + code + ")", null);
            }
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUi();
        }
    }

    /** Liga o serviço em primeiro plano só enquanto há reprodução e a opção está ligada. */
    private void syncService() {
        if (tv) {
            return;
        }
        final boolean want = playing && bgPlay;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Intent i = new Intent(MainActivity.this, PlaybackService.class);
                    if (want && !svcOn) {
                        if (Build.VERSION.SDK_INT >= 26) {
                            startForegroundService(i);
                        } else {
                            startService(i);
                        }
                        svcOn = true;
                    } else if (!want && svcOn) {
                        stopService(i);
                        svcOn = false;
                    }
                } catch (Throwable t) {
                    svcOn = false;
                }
            }
        });
    }

    /** Home com vídeo tocando: Picture-in-Picture do sistema (Android 8+). Usa reflexão para compilar também com SDKs antigos. */
    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (tv || !playing || Build.VERSION.SDK_INT < 26) {
            return;
        }
        try {
            Class<?> bc = Class.forName("android.app.PictureInPictureParams$Builder");
            Object b = bc.getConstructor().newInstance();
            bc.getMethod("setAspectRatio", android.util.Rational.class).invoke(b, new android.util.Rational(16, 9));
            Object params = bc.getMethod("build").invoke(b);
            pipActive = true;
            Activity.class.getMethod("enterPictureInPictureMode", Class.forName("android.app.PictureInPictureParams"))
                    .invoke(this, params);
        } catch (Throwable t) {
            pipActive = false;
        }
    }

    /** Sem @Override de propósito: o método só existe a partir do Android 7/8. */
    public void onPictureInPictureModeChanged(boolean inPip, Configuration cfg) {
        if (web != null) {
            web.evaluateJavascript("window.__pip && window.__pip(" + (inPip ? "true" : "false") + ")", null);
        }
    }

    @Override
    protected void onStop() {
        // janela flutuante fechada no X: para o vídeo e o WebView
        if (pipActive && web != null) {
            web.evaluateJavascript(
                    "(function(){var v=document.getElementById('video');if(v){v.pause();}})()", null);
            web.onPause();
        }
        pipActive = false;
        super.onStop();
        if (!tv && playing && bgPlay && web != null) {
            web.onResume();       // tela bloqueada: mantém o WebView ativo para o áudio não parar
            web.resumeTimers();
        }
    }

    @Override
    protected void onPause() {
        if (pipActive || (!tv && playing && bgPlay)) {
            super.onPause();   // em PiP, ou com a opção de segundo plano, o vídeo/áudio segue tocando
            return;
        }
        if (web != null) {
            // não deixa o vídeo/áudio tocando em segundo plano
            web.evaluateJavascript(
                    "(function(){var v=document.getElementById('video');if(v){v.pause();}})()", null);
            web.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        pipActive = false;
        if (web != null) {
            web.onResume();
        }
        hideSystemUi();
    }

    @Override
    protected void onDestroy() {
        try { stopService(new Intent(this, PlaybackService.class)); } catch (Throwable t) { /* ignora */ }
        svcOn = false;
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
