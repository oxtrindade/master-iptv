# Master IPTV para LG webOS

App web (HTML/JS) com **TV ao vivo, filmes e séries**, navegação por controle remoto (D-pad e Magic Remote).

## Login
Servidor, usuário e senha (Xtream Codes). Se algo der errado, os campos continuam preenchidos para você só corrigir o que errou.

## Telas
- **Menu inicial:** três blocos grandes — **TV ao vivo**, **Filmes** e **Séries** —, atalho para Favoritos, **lupa** (Buscar) e **engrenagem** (Configurações) no topo, o **clima** da sua cidade e as fileiras Continuar assistindo, Canais recentes e Favoritos.
- **Cada seção mostra só o seu conteúdo**, com categorias na coluna da esquerda e um botão **Buscar** que pesquisa só dentro dela. **Voltar** sobe um nível (lista → categorias → menu); o botão **Menu** do topo volta direto.
- **TV ao vivo:** lista em duas colunas, com o **programa atual** (EPG) e a barra de progresso em cada canal.
- **Configurações:** dados da conta, **editar servidor**, chaves para **reproduzir o último conteúdo ao abrir o app**, **ocultar canais SD** e **ocultar canais HD** (FHD e 4K continuam), e a **cidade do clima** (busca pelo nome).
- **Player:** mostra a **resolução real** do vídeo (ex.: 1920×1080 · FHD).

## Controles
| Tecla | Ao vivo | Filmes/séries |
|---|---|---|
| ▲ ▼ / CH+ CH- | trocar canal | ▲ abre áudio e legenda |
| 0–9 | ir ao canal pelo número | – |
| ◀ ▶ | mostra barra | ±10 s (acelera segurando) |
| OK | mostra barra | pausar/continuar |
| ⏪ ⏩ | – | ±30 s |
| Verde | áudio e legenda | áudio e legenda |
| Vermelho | favoritar canal | – (na lista: favoritar item) |
| Voltar | sai do player | sai do player (salva o ponto) |

Filmes e episódios retomam de onde parou; ao terminar um episódio, o próximo toca sozinho.

## Áudio e legenda
No player, tecla **Verde** (ou ▲ em filme/série, ou o botão "Áudio e legenda" no canto superior com o Magic Remote) abre o painel com as faixas de áudio e as legendas embutidas. O idioma escolhido fica salvo e é aplicado nos próximos conteúdos que tiverem a mesma faixa. A lista vem do que o player da TV (ou o hls.js) expõe; se o conteúdo só tem uma faixa, o painel avisa. O rodapé do painel mostra o motor em uso e quantas faixas foram encontradas, útil para diagnóstico.

## Instalar (TV com root / modo desenvolvedor)
```
npm i -g @webos-tools/cli
ares-setup-device            # adicione a TV (root: porta 22; modo dev: porta 9922)
ares-install -d <nome-da-tv> dist/com.rodrigo.iptv_1.4.0_all.ipk
ares-launch  -d <nome-da-tv> com.rodrigo.iptv
```
Com root + Homebrew Channel também dá para copiar o `.ipk` para a TV e instalar por lá.

## Recompilar
```
npm install
node tests/test-core.js && node tests/test-ui.js
npx ares-package app services --no-minify -o dist
```

## Como funciona a rede
O app tenta o servidor direto. Muitos painéis não enviam CORS; nesse caso ele usa o serviço
`com.rodrigo.iptv.service`, um proxy em `127.0.0.1:18080` (protegido por token) que só repassa
as chamadas de API/lista. O vídeo em si é tocado direto pelo `<video>` da TV
(HLS nativo; `.ts` nativo; hls.js/mpegts.js como reserva).

## Limites conhecidos
- Testado em Node/jsdom (parser, API, proxy e fluxo de telas); **ainda não testado numa TV real**.
- Catálogos enormes em "Todos"/Buscar demoram na primeira carga.
- EPG só no modo Xtream (não lê XMLTV de listas M3U).

## Atualizar pela TV (Homebrew Channel)
O repositório precisa ser **público**. Ao criar uma etiqueta (`git tag v1.4.1 && git push origin v1.4.1`), o workflow roda os testes, monta o IPK e cria a Release com `.ipk`, `repo.json`, descrição e ícone (a etiqueta tem de ser `v` + a versão do `appinfo.json`, ex.: versão 1.4.1 → `v1.4.1`). Na TV: Homebrew Channel → Settings → Add repository →
`https://github.com/SEU_USUARIO/NOME_DO_REPO/releases/latest/download/repo.json`
Lembre de subir `version` em `app/appinfo.json` antes de cada etiqueta.
