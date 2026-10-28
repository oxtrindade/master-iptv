package com.rodrigo.iptv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.UiModeManager;
import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
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

    private WebView web;
    private boolean tv;
    private boolean pageReady = false;
    private volatile boolean playing = false;   // há vídeo tocando (informado pela página)
    private boolean pipActive = false;

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

        web = new WebView(this);
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
    }

    @Override
    protected void onPause() {
        if (pipActive) {
            super.onPause();   // em PiP o vídeo segue tocando
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
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
