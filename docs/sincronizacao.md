# Sincronizar TV e celular (Master IPTV)

Mantém **continuar assistindo**, **favoritos**, o histórico e o último episódio de cada série iguais nos seus aparelhos.
O login do servidor IPTV **não** é enviado: você digita uma vez em cada aparelho.

Como não existe conta nem servidor do app, você cria um servidorzinho gratuito no **Cloudflare Workers** (leva uns 10 minutos, sem cartão).
Ele só guarda um arquivo pequeno por código de sincronização.

## 1. Criar o servidor (uma vez)
1. Entre em https://dash.cloudflare.com e crie uma conta gratuita.
2. Menu **Workers & Pages** → **Create** → **Create Worker** → dê um nome (ex.: `master-sync`) → **Deploy**.
3. Clique em **Edit code**, apague o exemplo, cole **todo** o conteúdo de `worker/sync-worker.mjs` deste repositório e clique em **Deploy**.
4. Crie o armazenamento: menu **Storage & Databases** → **KV** → **Create** → nome `master-sync-kv`.
5. Volte ao Worker → **Settings** → **Bindings** → **Add** → **KV namespace**: em *Variable name* escreva exatamente `SYNC` e escolha o `master-sync-kv` → **Deploy**.
6. Anote o endereço do Worker (algo como `master-sync.seunome.workers.dev`).

(Os nomes dos menus do Cloudflare mudam de vez em quando; o que importa é: um Worker com este código e um KV ligado com o nome `SYNC`.)

## 2. Ligar no primeiro aparelho
Configurações → **Sincronização**:
1. Em *Endereço do servidor* digite o endereço do Worker.
2. Toque em **Gerar novo código**. Aparece o código (16 letras e números) e a linha *"Para parear outro aparelho, digite lá: ..."*.

## 3. Ligar nos outros aparelhos
Configurações → **Sincronização** → no campo do código digite o texto da linha de pareamento (`endereço#código`, já leva o endereço junto) → **Salvar**.

O código vale **por perfil**: o Perfil 1 da TV e o Perfil 1 do celular usam o mesmo código; outro perfil usa outro código.
Quem tem o código acessa aquela cópia, então não compartilhe.

## Quando sincroniza
Ao abrir o app, ao voltar para a Início, ao sair do player, a cada ~45 s assistindo e quando o app volta para a tela.
Se um aparelho acabou de gravar, o outro pode demorar até cerca de 1 minuto para enxergar (o KV do Cloudflare é eventual).

## Evitar digitar o endereço em cada aparelho
Em `app/js/sync.js`, preencha `Sy.DEFAULT_URL` com `https://master-sync.seunome.workers.dev` antes de gerar o zip.
