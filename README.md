# Master IPTV para LG webOS

App web (HTML/JS) com **TV ao vivo, filmes e séries**, navegação por controle remoto (D-pad e Magic Remote).

## Login
Servidor, usuário e senha (Xtream Codes). **http ou https:** se o endereço digitado não conectar, o app tenta sozinho o outro (http↔https, ou https quando você digita sem prefixo) e guarda o que funcionou, avisando "Servidor ajustado". Usuário/senha errados não disparam essa segunda tentativa. Se algo der errado, os campos continuam preenchidos para você só corrigir o que errou.

## Telas
- **Início (estilo Netflix):** no topo, o botão de **três traços** à esquerda, o nome **Master IPTV** no centro e o **perfil** à direita. Logo abaixo, as abas **TV ao vivo**, **Filmes** e **Séries**, e depois as fileiras Continuar assistindo, **Favoritos** (só aparece se você favoritou algo; o último item, "Ver todos", abre a lista completa), Canais recentes e recomendações.
- **Estilo da tela inicial:** nas TVs (webOS e Android TV) a Início abre com **blocos grandes** (TV ao vivo, Filmes, Séries); no celular, com as **abas** do topo. Dá para trocar em Configurações → *Estilo da tela inicial* (vale só para aquele aparelho).
- **Menu lateral (três traços):** mostra o **clima** da sua cidade, o relógio, a validade da conta e o botão **Configurações**. **Voltar** fecha o menu.
- **Cada seção mostra só o seu conteúdo**, com categorias na coluna da esquerda e um botão **Buscar** que pesquisa só dentro dela. **Voltar** sobe um nível (lista → categorias → menu); o botão **Menu** do topo volta direto.
- **TV ao vivo:** lista em duas colunas, com o **programa atual** (horário de início e fim), a barra de progresso e o **próximo programa** em cada canal; canais sem guia mostram "Sem programação". Os nomes das categorias aparecem sem o prefixo repetido (ex.: "Canais | Esportes" vira "Esportes").
- **Configurações** (pelo menu lateral): dados da conta, **editar servidor**, chaves para **reproduzir o último conteúdo ao abrir o app**, **ocultar canais SD** e **ocultar canais HD** (FHD e 4K continuam), e a **cidade do clima** (busca pelo nome).
- **Perfis:** além da cor, cada perfil pode ter um **ícone** de avatar (carinha, gato, patinha, foguete, coroa, joystick…) ou a inicial do nome. Pelo menu de perfil (avatar no canto) → *Gerenciar perfis* → editar.
- **Mini player:** com o controle remoto só de setas (Android TV, sem botões coloridos), navegue para a direita até o mini player: **Ampliar** (à esquerda) e **Fechar** (à direita), e aperte OK. Nos controles com Amarelo/Azul, esses botões continuam valendo.
- **Player:** mostra a **resolução real** do vídeo (ex.: 1920×1080 · FHD).
- **Gestos no player (app Android, celular):** arraste o dedo para cima/baixo na **metade esquerda** para mudar o **brilho** (levando até o mínimo, ele volta ao **automático**, o brilho do sistema) e na **direita** para mudar o **volume**; em filmes e episódios, arraste **para os lados** para avançar ou voltar (a tela mostra quanto). O brilho volta ao normal ao sair do player.

## Esportes (placares)
Na Início, **Esportes** abre a central de jogos de futebol: **Brasileirão, Copa do Brasil, Libertadores, Sul-Americana, Champions, Premier League, La Liga, Ligue 1, Bundesliga e Campeonato Italiano**, e de seleções **Eliminatórias, Copa América, Eurocopa, Nations League e Copa do Mundo**; os **amistosos** aparecem só quando envolvem o Brasil ou um time que você segue.
- **Na Início:** uma fileira **Esportes · jogos de hoje** mostra os jogos ao vivo primeiro e depois os das próximas horas, por horário; o que já terminou sai da lista. OK abre o jogo (o último cartão leva à central de Esportes).
- **Placares:** jogos de ontem a daqui a 6 dias (um dia por consulta, guardado em memória), agrupados por liga, com **Ao vivo agora** no topo (minuto e placar atualizam sozinhos a cada 30 s). OK em um jogo abre gols, estatísticas (posse, finalizações, escanteios, faltas, cartões) e **onde assistir**.
- **Onde assistir:** o app procura, na programação (EPG) dos seus canais de esporte e abertos, qual deles passa o jogo (pelo nome dos times) e mostra o canal no cartão; OK no botão sintoniza.
- **Meus times:** em um jogo, **Seguir** no time; ele ganha uma estrela e a aba mostra só os jogos dele.
- **Nos meus canais:** só os jogos encontrados na programação; OK sintoniza o melhor canal.
- Fonte: API pública de placares da ESPN (sem chave, não oficial). Se ela mudar ou sair do ar, a tela avisa e o resto do app segue normal. O cruzamento com o canal depende de como o seu provedor escreve os títulos.

## Downloads para assistir offline (Android, celular)
Em cada filme há o botão **Baixar**; em séries, um botão por episódio e **Baixar temporada**. O download usa o gerenciador do Android (segue com a tela apagada, mostra o progresso na notificação e retoma se a conexão cair) e, por padrão, **só no Wi-Fi**. Os arquivos ficam dentro do app (somem se o app for desinstalado). A tela **Downloads** (menu de três traços) mostra o andamento, o espaço livre e deixa assistir ou apagar; o que já foi baixado toca direto do celular e o ponto de *continuar assistindo* continua sendo salvo. **Sem internet** ao abrir, o app entra direto nos downloads. Limites: TV ao vivo e itens em .m3u8 não baixam, e cada download usa uma das conexões simultâneas do servidor IPTV.

## Sincronizar TV e celular
Configurações → **Sincronização** mantém *continuar assistindo*, favoritos e histórico iguais nos aparelhos, usando um servidor gratuito no Cloudflare Workers (`worker/sync-worker.mjs`). Passo a passo em [docs/sincronizacao.md](docs/sincronizacao.md).

## Controles
| Tecla | Ao vivo | Filmes/séries |
|---|---|---|
| ▲ ▼ | trocar canal | abre o menu de baixo: **Episódio anterior · Áudio e legenda · Próximo episódio** (◀ ▶ escolhem, OK ativa) |
| CH+ CH- | trocar canal | séries: próximo / anterior episódio |
| 0–9 | ir ao canal pelo número | – |
| ◀ ▶ | mostra barra | ±10 s (acelera segurando) |
| OK | mostra barra | pausar/continuar |
| ⏪ ⏩ | – | ±30 s |
| Verde | áudio e legenda | áudio e legenda |
| Vermelho | favoritar canal | – (na lista: favoritar item) |
| Voltar | sai do player | sai do player (salva o ponto) |

Filmes e episódios retomam de onde parou; ao terminar um episódio, o próximo toca sozinho.

## Áudio e legenda
No player, em filme/série aperte ▲ ou ▼ para abrir o menu de baixo (título e barra de progresso): a opção **Áudio e legenda** aparece destacada, e **OK** abre o painel (na TV ao vivo, **OK** mostra o menu e **OK** de novo abre o painel; ▲ ▼ trocam de canal). Também vale a tecla **Verde** ou clicar no botão com o Magic Remote abre o painel com as faixas de áudio e as legendas embutidas. O idioma escolhido fica salvo e é aplicado nos próximos conteúdos que tiverem a mesma faixa. A lista vem do que o player da TV (ou o hls.js) expõe; se o conteúdo só tem uma faixa, o painel avisa. O rodapé do painel mostra o motor em uso e quantas faixas foram encontradas, útil para diagnóstico.

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
node tests/test-core.js && node tests/test-sync.js && node tests/test-sports.js && node tests/test-dl.js && node tests/test-ui.js
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

## Tocar com a tela bloqueada (Android, celular)

Em **Configurações → Continuar tocando com a tela bloqueada** (ligado por padrão). Com a opção ligada, o áudio segue tocando ao bloquear o celular ou sair do app: um serviço em primeiro plano (`PlaybackService`) mantém o app vivo, com uma notificação "Tocando em segundo plano", e só existe enquanto há reprodução. Pausar ou parar o conteúdo remove a notificação. Em Home com vídeo tocando continua valendo o Picture-in-Picture. Na TV nada muda.

## Esportes: onde assistir

Cada jogo mostra, além do botão do canal (quando a programação do seu servidor traz o jogo), uma linha **Onde: ...** com quem transmite no Brasil e, na tela do jogo, a lista completa. É uma tabela fixa por campeonato em `app/js/sports.js` (`RIGHTS`, `LIBRA`, `FFU`), conferida na imprensa em nov/2026: os direitos mudam por temporada e, em alguns torneios, por jogo. Serviços sem guia (HBO Max, Paramount+, Prime Video, YouTube) aparecem só como informação.

Quando um jogo do Brasileirão não acha canal no guia, o app mostra **Palpite: Premiere N** com os canais Premiere do seu servidor que estão sem guia (ou sem nenhum jogo identificado no guia). O Premiere exibe todos os jogos, mas qual canal passa qual jogo a Globo decide por rodada; por isso é só um palpite para você conferir.

## Início: banner de destaque

No topo da Início, abaixo das abas, um banner troca a cada 8 s (parado enquanto o foco está nos botões; os pontinhos trocam na mão). Começa pelo que você está **continuando a assistir** (até 3) e completa com filmes e séries **em alta** do catálogo. Mostra fundo (backdrop do servidor, ou o pôster desfocado), título, ano, nota, gênero, duração e sinopse, com **Continuar/Assistir** e **Mais informações**. Abaixo vêm as fileiras: continuar assistindo, jogos de hoje, favoritos, filmes e séries.

## Guia de TV (grade por horário)

Em **TV ao vivo → Guia de TV**: categorias em cima, detalhe do programa em foco (canal, horário, duração, barra de progresso e sinopse), lista de canais à esquerda e grade de 3 h à direita com a linha do "agora". ▲▼ trocam de canal, ◀▶ andam pelos programas (a janela de horário acompanha o foco), **‹ 3 h / Agora / 3 h ›** voltam e avançam a janela. OK (ou toque) abre o canal. A programação de cada canal (até 24 programas) é pedida só para as linhas que aparecem na tela e fica guardada por 20 min.

## Guia dentro do player (TV ao vivo)

Com um canal ao vivo na tela: **▲** abre o **guia por cima** (o vídeo e o som continuam tocando por trás) com os canais da lista atual; **▼** abre o menu de baixo (Áudio e legenda · Guia de TV); **CH+/CH−** (e os dígitos) continuam trocando de canal. No guia, OK/toque em um canal troca para ele; **Voltar** fecha só o guia. No celular há o botão **Guia de TV** no menu de baixo. O banner da Início agora ocupa a largura toda (~60% da altura da TV).

## Guia com o player ao lado (v1.31.0)

- **Guia no player (▲):** o vídeo desloca para uma janela no canto superior direito, o detalhe do programa fica ao lado e a grade ocupa o resto; o som não para. No celular em pé, o vídeo fica no topo e a grade embaixo.
- **Aba Guia (TV ao vivo → Guia de TV):** OK em um canal toca numa janela ao lado (mini player) sem sair do guia; OK de novo no mesmo canal amplia para tela cheia. A grade se ajusta à largura livre (3 h; 2 h quando o mini player ocupa o lado).
- **Ao vivo não tem mais "Áudio e legenda"** (nem a tecla verde): o menu de baixo traz só "Guia de TV". Filmes e episódios mantêm.
- O mini player continua sendo o que fica ao voltar para a Início do app (e o Picture-in-Picture ao ir para a tela inicial do celular).

## Animação de abertura (1.32.0)
Ao abrir o app (e ao trocar de perfil/servidor), o "Conectando…" vira uma animação simples estilo Netflix: o logo (ícone play) aparece com um "pop", o nome **MASTER IPTV** se abre com espaçamento de letras e uma barra de luz percorre abaixo. Dura no mínimo ~1,8 s na abertura; em caso de erro de login a tela sai na hora. Estilos em `#splash` / `.boot*` no `style.css`.

## Prévia no banner (1.33.0)
Depois de ~4 s parado no banner da Início, toca um trecho mudo do filme (ou do 1º episódio da série), com fade sobre o poster, como a Netflix. Qualquer tecla/toque para a prévia; a rotação do banner pausa enquanto ela toca (máx. 30 s). Só roda em arquivos diretos (mp4/mkv); HLS é ignorado e falhas são silenciosas. Configurações → "Prévia no banner da Início": ligada por padrão na TV e desligada no celular (usa uma conexão do provedor e dados móveis).

## Prévia em qualquer card (1.34.0)
Além do banner, segurar o foco ~2 s num filme/série (cards das listas, fileiras da Início e "Continuar assistindo") toca uma prévia muda dentro do próprio card; em "Continuar assistindo" ela começa no ponto onde você parou. Mover o foco, abrir algo ou sair da Início para a prévia. Se alguma prévia falhar (formato não suportado, servidor recusou), o motivo aparece em Configurações, logo abaixo da chave "Prévia no banner da Início", para diagnosticar na TV.

## Diagnóstico da prévia (1.34.1)
Configurações mostra sempre uma linha "Diagnóstico da prévia" com contadores (foco em filmes/séries, agendadas, iniciadas, tocando) e o último bloqueio ou falha, para descobrir em que etapa a prévia para na TV.

## Prévia: rastreio de eventos (1.34.2)
A prévia agora começa do início do vídeo e só pula para o meio depois de já estar tocando (o pulo antes disso podia travar em servidores sem suporte a Range). As falhas no diagnóstico trazem os eventos do vídeo (loadstart, loadedmetadata, canplay, stalled… com o tempo em segundos), `readyState`/`networkState` e o motivo do play recusado.

## Prévia: interrupção x falha (1.34.3)
Cancelar a prévia (tecla, troca de slide) não conta mais como falha ("AbortError" era causado pelo próprio app). O diagnóstico agora tem 3 linhas: contadores, última falha real e "Interrompida", com o tempo (t+Ns) e os eventos do vídeo até o cancelamento, para ver se o servidor demora a responder.

## Prévia de vídeo: experimental e desligada (1.34.4)
Na LG real a prévia carrega só às vezes (servidor lento / play cortado) e deixa o app mais pesado, então virou "Prévia de vídeo (experimental)" em Configurações, **desligada por padrão** (a 1.34.4 desliga também em quem já tinha ligada). O diagnóstico só aparece com a chave ligada.

## Abrir no YouTube (1.35.0)
Em "Onde assistir" de um jogo, quando a fonte transmite no YouTube (CazéTV, TNT Sports, ge tv, SportyNet) aparece o botão **Abrir … no YouTube**. Android (celular e TV): abre o app do YouTube (`NativeApp.openUrl`, só aceita endereços do youtube.com). CazéTV vai direto para `@CazeTV/live`; as demais abrem a busca de transmissões ao vivo. webOS: pede à TV para abrir o app `youtube.leanback.v4` com o endereço; se a TV recusar, mostra um aviso para procurar o canal lá.

## YouTube na LG (1.35.1)
O app do YouTube da TV (inclusive o youtube-webos do Homebrew, mesmo id `youtube.leanback.v4`) só abre vídeo direto: um endereço de canal carregava o site de computador. Agora, para a CazéTV, o app busca a página `…/@CazeTV/live` pelo serviço de rede, lê o vídeo da transmissão no ar (link canônico) e abre esse vídeo no app. Se a CazéTV não estiver ao vivo, avisa e só abre o YouTube. Para TNT Sports, ge tv e SportyNet abre o YouTube e orienta a procurar o canal.

## YouTube na LG, todos os canais (1.35.2)
O mesmo processo da CazéTV vale para TNT Sports (`@TNTSportsBR`) e ge tv (`@getv`): o app lê a página `/live` do canal e abre o vídeo no ar no app do YouTube. SportyNet tenta algumas variações de endereço (`@SportyNet`, `@sportynetbr`, `@sportynet`) e usa a que responder. Sem transmissão no ar, avisa e só abre o YouTube.

## SportyNet (1.35.3)
O canal da SportyNet usa o endereço fixo por ID (`/channel/UCMcc9elPZGpg6eU4i3YaCpA/live`), confirmado a partir de uma transmissão real, em vez de tentar variações de @handle.

## Bundesliga (1.36.0)
Nova liga em Esportes (ESPN `ger.1`), com "Onde assistir" = SportyNet (YouTube, aberto) e o botão que abre a transmissão no YouTube.

## YouTube na LG: formato do parâmetro (1.36.1)
O youtube-webos (Homebrew) usa o mesmo id `youtube.leanback.v4` e só entende `contentTarget` no formato `v=ID_DO_VIDEO` (não o endereço completo). O app agora envia nesse formato, que o app oficial também aceita.

## Escolher a live certa (1.36.2)
Canais como a CazéTV têm várias transmissões ao mesmo tempo (a página `/live` abre só a principal, ex.: atletismo em vez do jogo). Agora o botão lê a lista `…/streams` do canal (Android direto; webOS pelo serviço de rede), ficando só com as transmissões **ao vivo**, e abre a que cita um dos times no título (`Sports.pickLive`). Se o jogo não estiver no ar, avisa e: no Android abre a busca do YouTube com os dois times (filtro "ao vivo"); na LG abre o app do YouTube. Se a lista não puder ser lida, usa o plano antigo (transmissão principal do canal na LG; busca no Android).

## Achar a live certa: feed RSS + navegador (1.36.3)
Na LG o serviço de rede se identificava como player IPTV e o YouTube devolvia uma página sem a lista de vídeos (por isso abria a live principal). Agora: (1) o serviço aceita `ua=browser` (User-Agent de navegador, só para o YouTube); (2) se a lista `/streams` não traz o jogo, o app lê o **feed RSS** do canal (`feeds/videos.xml?channel_id=…`, o id vem da própria página) e escolhe o vídeo recente (até 48 h) que cita os times, preferindo "AO VIVO" a resumos; (3) sem achar, não abre outra live: Android abre a busca com os dois times e a LG abre o YouTube, com um aviso que traz um diagnóstico curto (tamanho da página, vídeos, ao vivo, feed). (4) Na LG o app do YouTube é fechado antes de abrir outro vídeo (com ele aberto, o novo jogo era ignorado). O serviço de rede é atualizado junto com o app (reinstalar o IPK).

## Leitura genérica da busca do YouTube (1.36.4)
No teste real a página (562 KB) foi lida mas nenhum vídeo foi reconhecido: o YouTube mudou o formato dos componentes. A leitura agora não depende do tipo de componente: para cada id de vídeo (`videoId`/`contentId`) junta os textos próximos (título, canal, "AO VIVO"…). Ordem da procura: **1)** busca do YouTube só com transmissões ao vivo pelos dois times (o que o app do YouTube mostra), escolhendo a live que cita os times e, de preferência, é do canal pedido (CazéTV, não um "watchalong"); **2)** lista `/streams` do canal; **3)** feed RSS (até 14 dias se o título citar os dois times; até 12 h se citar só um, já que lives podem ser agendadas dias antes). O aviso de falha mantém o diagnóstico (KB, vídeos, ao vivo).

## Só canal oficial + aviso de gols (1.37.0)
- **Canal oficial:** o botão do YouTube só aceita transmissão cujo canal seja o da fonte (CazéTV, TNT Sports, ge tv, SportyNet); reações e watchalongs de outros canais são ignorados. A busca inclui o nome do canal. Se o jogo não está no ar, abre a página do canal (Android) ou o app do YouTube (LG), nunca uma busca geral.
- **Aviso de gols:** pop-up no topo (7 s, sem tirar o foco) com o placar, o time que marcou, o minuto e o autor quando a fonte informa. Vale enquanto o app está aberto (inclusive no player). Configurações → "Aviso de gols": *Todos os jogos ao vivo* (padrão), *Meus times e Brasil* ou *Desligado*. Consulta os placares a cada 45 s só das ligas com jogo ao vivo (varredura completa a cada 5 min); o primeiro placar visto de cada jogo não gera aviso.

## Canais do jogo: recheca programação velha (1.37.1)
A programação de cada canal fica guardada por horas; se o provedor só atualiza o título do jogo mais tarde (ex.: "Futebol" → "Vasco x Palmeiras"), o app seguia usando a versão antiga e dizia que nenhum canal passava o jogo. Agora, quando um jogo ao vivo (ou que começa em até 2 h) fica sem canal, o app refaz a consulta dos canais principais (Premiere, SporTV, ESPN, TNT, CazéTV, Globo…) ignorando o que estava guardado, e só então conclui. Na tela do jogo, sem canal, há o botão **Procurar canais de novo**, que refaz tudo do zero.

## Canais do jogo não se perdem mais por falha do provedor (1.37.2)
A varredura de canais (até 160 consultas de programação) trocava o resultado anterior pelo novo; se o provedor falhasse ou demorasse em alguns canais, a falha era guardada como "canal sem programação" e o jogo perdia o canal que já tinha sido achado. Agora, falha de consulta não sobrescreve a programação guardada e, se o canal falhou nesta rodada, o link que já existia para o jogo é mantido.

## Avatares ilustrados e perfis maiores (1.38.0)
- **32 avatares originais** (SVG em `app/js/avatars.js`), em 4 grupos de 8 como numa galeria: Bichinhos, Robôs, Monstrinhos e Aventureiros. No editor de perfil o seletor mostra as fileiras por tema; "Simples" mantém a inicial do nome (com as cores). Perfis antigos com os ícones de linha continuam funcionando.
- **Perfis maiores:** quadrados grandes (TV 250 px; antes 190) com leve degradê, nome maior e o editor com rolagem pelo direcional. As cores só aparecem quando o avatar é a inicial (os ilustrados já têm cor própria).
- O avatar escolhido também aparece no topo da Início.

## 1.38.1 — Avatares de cachorros
- Novo grupo **Cachorros** no editor de perfil, com 8 raças diferentes: Labrador, Husky, Dálmata, Pug, Beagle, Poodle, Shih Tzu e Vira-lata caramelo.

## 1.39.0 — Card largo (estilo Netflix) na TV
- Nas fileiras da Início (TV), ao parar o foco por ~0,6 s num filme/série o pôster vira um cartão 16:9 com a imagem de fundo, título, ano/nota/gênero e sinopse; os vizinhos se afastam e a fileira acompanha o foco.
- A prévia muda passa a tocar nesse cartão maior (antes tocava no pôster pequeno).
- Segue a mesma chave da prévia (Configurações): desligada, tudo volta ao comportamento anterior. Celular não muda.

## 1.39.1 — Card largo com chave própria
- O card largo (1.39.0) dependia da chave da prévia de vídeo, que vem desligada; na LG parecia que nada tinha mudado. Agora tem chave própria, **"Card ampliado ao parar o foco"** (Configurações, só na TV), ligada por padrão. A prévia de vídeo continua separada e só toca dentro do card se estiver ligada.

## 1.40.0 — Banner estilo Netflix
- Banner da Início com cantos arredondados, margem nas laterais e sombra; degradê mais suave à esquerda para a imagem aparecer mais.
- Botões como na referência: **Assistir** branco e **Mais informações** translúcido, arredondados; indicador de destaque em branco.
- Só visual (celular e TV compacta ajustados); nada muda no comportamento do banner nem da prévia.

## 1.41.0 — Banner maior e sem filmes de cinema (CAM)
- Banner da Início mais alto (720 px na TV), na proporção da referência.
- Nova chave **"Ocultar filmes de cinema (gravação)"** (Configurações, ligada por padrão): esconde de Filmes, Início, busca e recomendações as categorias com "Cinema"/CAM/HDCAM/HDTS no nome e os títulos com etiqueta [CAM], (Cinema), HDCAM, HDTS ou "- Cinema". Só filmes; canais e séries não mudam.

## 1.42.0 — Cards maiores e prévia que não desiste na LG
- Cards (pôsteres) ~28% maiores na TV, e o card largo ao parar o foco passa a 700 px.
- Prévia: na LG o diagnóstico mostrava `loadedmetadata@3.2 … canplay rs4` e "play recusado AbortError" — o play() era cancelado quando os metadados chegavam (o provedor leva ~3 s) e o vídeo ficava pronto, porém parado. Agora o app não desiste no AbortError e chama play() de novo em loadedmetadata/canplay/loadeddata (até 3 vezes por vídeo), no card e no banner.

## 1.43.0 — Trailer na prévia
- Nova chave **"Usar o trailer na prévia"** (Configurações, ligada por padrão; só tem efeito com a prévia de vídeo ligada).
- O trailer vem do campo `youtube_trailer` do provedor ou, se não houver, do TMDB (precisa da chave do TMDB, a mesma das recomendações). Toca pelo player incorporado do YouTube, mudo e sem controles, cortado para preencher: no **banner** e no **card largo**.
- Se não houver trailer, o YouTube recusar ou não começar em 9 s, volta sozinho ao trecho do filme (como antes), e esse título passa a pular o trailer. Nos pôsteres estreitos das listas em grade continua o trecho do filme.
- Experimental na LG (Chromium 68): o diagnóstico em Configurações mostra "trailer … não iniciou" quando falha.

## 1.44.0 — Prévia só com trailer (e correção do erro 153 do YouTube)
- A prévia deixou de ser "experimental" e **não toca mais um trecho do filme**: só o trailer (campo `youtube_trailer` do provedor, senão TMDB). A chave virou **"Trailer na prévia"** e vem ligada para todos. Sem trailer, nada toca.
- Erro **153** ("erro de configuração do player"): o YouTube recusa embed sem endereço de origem, e o app abre de `file://`. Na LG a página do player agora vem do proxy local (`http://127.0.0.1:porta/yt?t=…&id=…`), que dá uma origem http válida e repassa os eventos ao app. Fora da LG usa o embed direto.
- Trailer também nos pôsteres estreitos (cortado para preencher); banner e card largo como antes. Falhas aparecem no diagnóstico em Configurações.

## 1.44.1 — Trailer em tela cheia no card e com som
- Corrigido o trailer "minúsculo": a página do player no proxy não tinha altura (o iframe ficava com 150 px e o vídeo em tarja no meio). Agora ocupa 100% do card/banner, cortado para preencher.
- Nova chave **"Som no trailer"** (ligada por padrão): o trailer começa mudo (sempre permitido) e o app liga o som assim que toca; se o aparelho travar o vídeo por causa do som, volta ao mudo sozinho e não tenta de novo nessa sessão.

## 1.45.0 — Só trailer dublado e trailer inteiro
- Nova chave **"Só trailer dublado"** (ligada por padrão): usa apenas trailers em português do Brasil marcados no TMDB (idioma `pt`, país diferente de Portugal; prefere `BR`). O campo `youtube_trailer` do provedor não informa o idioma, então fica de fora nesse modo. Sem trailer em português, nada toca. Desligada, aceita qualquer idioma e também o do provedor. Precisa da chave do TMDB.
- O trailer agora toca **inteiro**: sem limite de 90 s e sem repetir; ao acabar, volta ao pôster. Para ao mover o foco ou apertar qualquer tecla, como antes.

## 1.46.0 — Lista de desejos da Netflix: banner em alta, trailer na hora, TV e celular
- **Banner**: só filmes/séries em alta (sem "Continuar assistindo", que fica na fileira abaixo) e o trailer começa logo (~0,7 s). Ao acabar, passa ao próximo destaque. **TV:** ◀ ▶ nos botões do banner trocam o destaque; no celular segue como era.
- **Trailer ao parar o foco**: começa em ~0,35 s (antes 2 s) e o card largo abre em 0,25 s; o app já busca o trailer dos cards vizinhos para não esperar.
- **Dublado como preferência**: tenta o trailer em português do Brasil (TMDB); sem ele, usa o do provedor e depois qualquer idioma.
- **TV**: clicar num filme das fileiras da Início já inicia o filme (séries continuam abrindo o detalhe).
- **Celular**: a tela do filme/série mostra o trailer ao fundo (com som, se a chave ligar).
- Removida a fileira "Canais recentes" da Início.
- Corrigido: a página do player no proxy repetia o trailer (loop); agora toca uma vez.

## 1.47.0 — Prévia e som sempre ligados; série na TV continua de onde parou
- Removidas as chaves "Trailer na prévia" e "Som no trailer": o trailer na prévia e o som ficam sempre ligados. Se a TV travar o vídeo por causa do som, ele volta ao mudo sozinho (nessa sessão). O diagnóstico do trailer continua em Configurações. Ficou só "Preferir trailer dublado".
- **TV:** clicar numa série das fileiras da Início abre direto no episódio em que parou (ou no seguinte, se o último terminou). Série nunca assistida abre o detalhe.

## 1.47.1 — Trailer só com som
- Causa provável: o trailer do banner seguia tocando depois de descer para as fileiras (banner fora da tela), ficando só o som. Agora o banner só toca se estiver visível e o foco não estiver numa fileira; é interrompido ao sair da tela, ao focar uma fileira e quando um card começa o seu trailer.

## 1.47.2 — Trailer sem atraso
- O trailer começa no mesmo instante em que o foco para (card e banner): tirados os atrasos de 350 ms/700 ms e a espera de 250 ms para o card largo abrir. Ao mover o foco, o trailer anterior é derrubado na hora.
- Inclui a correção da 1.47.1 (banner fora da tela não toca).

## 1.47.3 — Correção do teste no GitHub
- O teste de interface falhava no CI (e só lá): com internet, o jsdom carregava o player do YouTube dentro do iframe do trailer e o script do YouTube lançava `responseStart` indefinido. O teste agora ignora erros que nascem dentro desse iframe. Nenhuma mudança no app.

## 1.48.0 — Trailer no Android (celular e TV) e só no Wi-Fi
- No Android o app abre de `file://` e o YouTube recusava o player (erro 153, o mesmo da LG). Agora o app serve a página do player ele mesmo, em `https://appassets.androidplatform.net/yt?id=…` (interceptada no WebView, `shouldInterceptRequest`), dando ao embed uma origem https; a página repassa eventos e comandos (som) ao app como a do proxy da LG. A navegação de iframes deixou de ser bloqueada (só a página principal é restrita).
- **Só no Wi-Fi:** novo `NativeApp.isMetered()` (conexão paga/dados móveis). Em dados móveis o trailer não toca (nem no detalhe, nem no card, nem no banner); diagnóstico mostra "dados móveis: trailer só no Wi-Fi".
- A tela do filme/série no celular toca o trailer ao fundo assim que abre (já existia desde a 1.46.0, mas dependia desse player).

## 1.49.0 — Cards do mesmo tamanho e Filmes/Séries por gênero (estilo Netflix)
- **Continuar assistindo** agora usa o mesmo cartão de pôster das demais fileiras (mesmo tamanho, mesmo foco/card largo), com barra de progresso e "T1 E3 · 28 min restantes" sobre o pôster.
- **Filmes e Séries** abrem como a Início: banner de destaque (trailer) da seção, botão "Todas as categorias", "Continuar assistindo" do tipo, "em alta" e fileiras por gênero (Lançamentos, Ação, Aventura, Animação, Comédia, Drama, Suspense, Terror, Ficção, Documentário…), montadas a partir das categorias do provedor (adultas ficam de fora; mínimo de 4 títulos; os mais recentes primeiro).
- O último cartão de cada fileira, "Ver todos", abre a lista clássica daquela categoria; "Todas as categorias" abre a visão clássica e nela o botão "Por gênero" volta às fileiras. Se o provedor não tiver categorias úteis, a visão clássica abre sozinha.

## 1.50.0 — Cards 25% maiores
- Todos os cards (pôsteres, Continuar assistindo, card largo, Ver todos) ficaram ~25% maiores na TV, no Android TV e no celular, para ficar mais próximo da Netflix.

## 1.50.1 — App mais leve
- Capas só carregam quando estão perto da tela (antes a Início/Filmes/Séries baixavam e decodificavam centenas de imagens de uma vez).
- Filmes/Séries por gênero montam 4 fileiras e o resto conforme a rolagem; fileiras com até 16 títulos + "Ver todos".

## 1.50.2 — Texto menor no card com trailer
- No card largo, o texto (título, dados, sinopse) ficou menor e, enquanto o trailer toca, mostra só título e dados numa linha, sem a sinopse, para cobrir menos o vídeo.

## 1.50.3 — Banner com troca fácil de destaque
- **TV:** ◀ ▶ em qualquer botão do banner troca de filme/série (o foco fica no botão); "Assistir" e "Mais informações" agora ficam um sobre o outro. O trailer do primeiro destaque toca ao abrir e o do novo destaque começa ao trocar.
- **Celular:** arrastar o banner para o lado troca de destaque, e o trailer do novo começa (só no Wi-Fi). Animação curta de deslize na troca.

## 1.50.4 — Texto do card largo
- Enquanto o card largo mostra o pôster, o texto (título, dados, sinopse) volta ao tamanho grande de antes; quando o trailer entra, encolhe (só título e dados, sem sinopse).

## 1.51.0 — Início como a Netflix (menu no topo + banner único)
- Menu superior: **Início · TV ao vivo · Filmes · Séries · Esportes** (Início é a aba atual).
- **Um banner só**, sorteado entre os filmes/séries em alta a cada abertura do app (voltar à Início mantém o mesmo). A capa aparece e o trailer começa logo em seguida.
- A seleção já começa no **banner** (Assistir); ▲ sobe ao menu para trocar de seção, ▼ volta ao banner. Fim da troca de destaque por ◀ ▶ (os botões voltam lado a lado).

## 1.51.1 — Sem mini player dentro do app
- **Voltar** no player (botão ‹, tecla Voltar) agora sai do vídeo e volta à tela anterior, salvando o ponto para "Continuar assistindo". Acabou o mini player dentro do app (Ampliar/Fechar).
- O **PiP do Android** (janelinha do sistema) continua só ao sair do app (Início do Android) com algo tocando.
- Única exceção: na aba **Guia**, o canal continua tocando na janela ao lado da grade.

## 1.51.2 / 1.51.3
- **Voltar** em Início/Filmes/Séries com o foco numa fileira sobe primeiro ao banner (superfície); só depois volta/sai (Voltar de novo).
- **Filmes e Séries** ficam iguais à Início: menu no topo (Início · TV ao vivo · Filmes · Séries · Esportes), banner com trailer e a seleção começando no botão "Assistir" (o foco nunca chegava ao banner porque os botões só aparecem após a animação do 1º destaque; isso valia também para a Início).

## 1.51.4 — Banner com várias opções de volta
- O banner volta a ter até 8 destaques (filmes e séries em alta); o sorteado a cada abertura do app vem primeiro. Na TV: ◀ ▶ trocam de destaque (botões um sobre o outro; ▲ sobe ao menu). No celular: arrastar o banner de lado troca; os cards continuam rolando com o dedo e tocar num card abre a capa/detalhe com o trailer (só no Wi-Fi).
- LG: se o trailer do destaque não iniciou na largada (acontecia só funcionar depois de navegar e voltar ao topo), o banner tenta de novo a cada 1,5 s enquanto está à vista.

## 1.52.0 — Banner selecionado, ações no celular, card 16:9 no celular
- **Banner (TV):** selecionado = contorno branco e o trailer só toca com o foco no banner (Assistir/Ver episódios/Mais informações); ao sair dele o trailer para. Com o trailer tocando o texto encolhe (título e dados menores, sem sinopse).
- **Celular:** toque longo num filme/série abre uma folha com **Favoritar** e **Baixar** (série: abre os episódios para baixar). No **player** há botões ★ e ⬇ no topo.
- **Celular:** o 1º toque num card agora vira mesmo 16:9 (capa + trailer, só Wi-Fi) — antes o CSS do modo retrato deixava o card estreito; o 2º toque abre.

## 1.52.1 — Trailer visível no detalhe (celular)
- Na tela do filme/série no celular (retrato), o trailer agora aparece em 16:9 no topo (capa até o vídeo começar, só no Wi-Fi); o pôster desceu e ficou menor, ao lado do conteúdo, em vez de cobrir o vídeo.

## 1.53.0 — Abertura direto nos perfis + app mais leve na TV
- Com mais de um perfil, o app abre **direto no seletor de perfis**, com animação de entrada (sem a tela "MASTER IPTV · Conectando…"): a conexão acontece por trás e, ao escolher o perfil, entra na Início (se ainda estiver conectando, mostra "Entrando…" e entra assim que terminar). Com um perfil só, continua a abertura animada de antes.
- **Banner instantâneo:** os destaques da última abertura ficam guardados e aparecem na hora; a lista completa do catálogo (pesada na TV) só atualiza o cache em segundo plano.
- **Navegação mais leve:** cada ▲▼◀▶ deixou de consultar o estilo de todos os ancestrais de todos os itens; contorno do banner sem sombra com blur.

## 1.54.0 — Só trailer dublado (nova fonte), banner só na Início, Voltar passa pelos perfis
- **Trailer dublado:** por padrão prefere o trailer **dublado**. Fontes: 1) TMDB (vídeo pt-BR cujo nome diz "dublado" — o idioma "pt" do TMDB também marca trailers só legendados); 2) **busca no YouTube** por "<filme> <ano> trailer dublado", aceitando só resultados que sejam trailer, digam "dublado" e tenham o nome do filme (ajuda nos filmes antigos). Sem dublado, cai no trailer do provedor e depois em qualquer idioma (original) — 1.54.1.
- **Banner só na Início:** Filmes e Séries ficam só com o menu, "Todas as categorias" e as fileiras por gênero.
- **Voltar na Início** (com mais de um perfil): abre a seleção de perfis; Voltar de novo mostra o aviso para sair.

## 1.55.0
- **Celular:** menu superior cabe na tela; toque longo no card expande para 16:9 com trailer; um toque abre o filme (Favoritar/Baixar ficam na tela de detalhes); cache de trailers persistente.
- **Voltar encerra o trailer:** ao voltar do detalhe/trailer para a Home, o áudio é parado na hora.
- **Perfil infantil:** no editor de perfil, opção "Perfil infantil". Mostra só categorias/itens infantis (desenho, animação, família, Disney…), bloqueia adultos e esconde Esportes. Selo "INFANTIL" na escolha de perfis.
- **Esportes → Times:** escolha de times favoritos por campeonato (Brasileirão, Libertadores, Premier League, Champions, La Liga etc.) e seleções, via ESPN.

## 1.55.1
- **Esportes:** Nations League agora lista Premiere + ge tv (YouTube). Em qualquer jogo sem fonte do YouTube listada (e não encerrado), aparecem os botões "Procurar ao vivo na ge tv / CazéTV (YouTube)", que acham a transmissão oficial que cita os dois times.

## 1.55.2
- **YouTube direto no jogo:** a ESPN traz seleções em inglês (Serbia, Germany) e os canais escrevem em português (Sérvia x Alemanha), então a busca não achava a live e caía na página do canal. Agora há tradução de ~70 seleções, usada na busca e no casamento do título.

## 1.55.3
- **Trailer só na Home/Filmes/Séries:** ao trocar de aba (TV ao vivo, Esportes, Favoritos, Downloads, Configurações…), o trailer e o áudio do banner/card são encerrados na hora.

## 1.55.4
- **Banner da Início voltou no celular/TV:** a partir da 2ª abertura o banner vinha do cache dos destaques, mas nunca era exibido (só aparecia na 1ª vez, sem cache). Corrigido, com teste. O banner continua só na Início; Filmes/Séries/Esportes/TV ao vivo não têm banner, e o trailer ao parar/segurar o card segue igual.
