# Zytrix — versão HTML/CSS/JavaScript

Versão principal do projeto acadêmico Zytrix, uma plataforma web de livestream construída com HTML, CSS, JavaScript ES Modules, Firebase/Firestore/Firebase Authentication e Twitch Embed.

## Tecnologias
- HTML5 e CSS3
- JavaScript ES Modules
- Firebase Authentication
- Cloud Firestore
- Twitch Player Embed
- Vercel (site estático)

## Estrutura
- `index.html` — início e destaques ao vivo
- `ao-vivo.html` — listagem/pesquisa de transmissões
- `categorias.html` / `categoria.html` — navegação por categorias
- `live.html` — player, chat em tempo real, moderação e Zy Coins
- `perfil.html` — perfil e ativação de conta streamer
- `config-live.html` — configuração/início/fim de transmissão
- `loja.html` / `pagamento.html` — Zy Coins e pagamento demonstrativo
- `login.html`, `registro.html`, `recuperar-senha.html`, `sair.html` — autenticação
- `assets/js/firebase.js` — inicialização e exports do Firebase
- `assets/js/ui.js` — header/footer e utilidades seguras de UI
- `assets/js/live.js` — Twitch, chat, moderação e apoio
- `firestore.rules` — autorização e integridade do Firestore

## Executar localmente
O projeto usa módulos ES, portanto não abra os HTMLs diretamente com `file://`. Com VS Code, use Live Server na pasta `Zytrix-HTML-CSS`, ou execute `python -m http.server 5500` e acesse `http://localhost:5500`.

## Firebase
Projeto: `zytrix-ca4f2`. A Firebase Web API Key fica no frontend por design; ela não é uma credencial administrativa. Service accounts/chaves administrativas não devem ser colocadas no cliente. Para publicar as Rules: `firebase deploy --only firestore:rules`.

## Autenticação
Cadastro e-mail/senha, login, Google Sign-In, verificação de e-mail, recuperação de senha e logout. O domínio final da Vercel precisa constar em Firebase Authentication > Authorized domains.

## Chat em tempo real
Mensagens: `streams/{streamId}/chat/{messageId}` com `uid`, `text`, `createdAt`. Nome e foto vêm de `profiles/{uid}`. O cliente usa `textContent`, limita a 300 caracteres e carrega 100 mensagens recentes. Moderação usa `moderation/{uid}` e `pinned/current`. ADM modera qualquer chat; streamer apenas a própria live e não pune ADM; usuário comum envia e pode apagar a própria mensagem.

## Twitch
O `parent` é criado dinamicamente usando `location.hostname`, funcionando em localhost, 127.0.0.1 e domínio Vercel.

## Zy Coins
Carteiras ficam em `wallets/{uid}`. Apoios usam transação atômica e `zyCoinTransactions`; Rules impedem saldo negativo, autoapoio e criação arbitrária de moedas por usuário comum.

## Pagamento
`pagamento.html` é somente uma simulação acadêmica. Não há cobrança real e nenhum dado real de cartão deve ser informado ou armazenado.

## Segurança
Deny-by-default; sem `allow write: if true`; UID do chat vinculado ao auth; mensagens imutáveis; ADM não pode ser promovido pelo cliente; URLs validadas; conteúdo dinâmico escapado; chat com `textContent`; transações para Zy Coins; sem service account no frontend.

## Limitações conhecidas
- O throttle anti-spam do cliente não substitui rate limit server-side/App Check.
- Pagamentos são simulados por requisito do TCC.
- Testes multiusuário reais exigem duas contas válidas e as Firestore Rules publicadas.
