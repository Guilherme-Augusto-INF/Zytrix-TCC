# Zytrix — TCC

Plataforma web de livestream desenvolvida para o TCC do curso técnico em Informática.

## Estado atual

A versão mais recente do projeto é a edição web em **HTML, CSS e JavaScript ES Modules**, com:

- Firebase Authentication e Cloud Firestore;
- Twitch Embed e Kick Embed;
- chat em tempo real por live;
- moderação de chat;
- categorias e subcategorias;
- perfil e conta de streamer;
- configuração de live;
- Zy Coins e apoio a streamers;
- loja e pagamento demonstrativo;
- preparação para deploy na Vercel.

## Snapshot atual

O snapshot completo mais recente está em:

`/snapshots/Zytrix-HTML-CSS-Twitch-Kick-v3.zip`

Ele corresponde à versão validada com **Twitch + Kick funcionando lado a lado**.

## Estrutura histórica

- `Zytrix-TCC-code-layers/` — Code Layers da versão original no Figma Sites;
- `figma/` — arquivo/projeto original do Figma;
- `firebase/` — regras e arquivos relacionados ao Firebase;
- `docs/` — documentação e screenshots;
- `snapshots/` — versões completas da edição HTML/CSS/JS.

## Próxima etapa planejada

Sincronizar automaticamente o status da Zytrix com Twitch/Kick: ao iniciar uma transmissão na plataforma vinculada, a live deverá entrar em `live` automaticamente no Firestore e voltar para `offline` quando a transmissão terminar.

## Observação

A tela de pagamento do projeto é demonstrativa e não processa pagamentos reais nem coleta dados reais de cartão.
