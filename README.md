# Zytrix — Zy Coins

Este pacote adiciona o sistema inicial de Zy Coins ao projeto.

## Arquivos

- `loja/main.tsx` — carteira e seleção de pacotes de Zy Coins.
- `pagamento/main.tsx` — checkout demonstrativo.
- `live/main.tsx` — versão atualizada da `/live` com envio de Zy Coins ao streamer.
- `firebase/firestore.rules` — regras completas do Firestore, mantendo as regras anteriores e acrescentando Zy Coins.

## Fluxo

1. O usuário autenticado ativa automaticamente sua carteira.
2. Cada carteira nova recebe 500 Zy Coins de bônus de demonstração.
3. Na Loja, o usuário seleciona um pacote.
4. A seleção é salva em `localStorage` com a chave `zytrixSelectedCoinPackage`.
5. No Preview do Figma Sites, use um botão nativo do Figma com Page Link para `/pagamento`.
6. Usuário comum pode criar um pedido `pending`; nenhuma moeda é creditada pelo navegador.
7. Administradores podem usar o modo de demonstração, que credita o pacote imediatamente.
8. Na `/live`, espectadores podem enviar Zy Coins para o streamer.
9. O envio é feito com uma transação atômica do Firestore: débito do espectador + crédito do streamer + registro da transação.

## Coleções novas

- `wallets/{uid}`
- `zyCoinTransactions/{transactionId}`
- `zyCoinOrders/{orderId}`

## Segurança

O navegador não pode aumentar livremente o próprio saldo. Os apoios usam `runTransaction()` e as regras validam o débito e o crédito juntos com `getAfter()`.

A tela de pagamento NÃO processa dinheiro real e NÃO coleta dados de cartão. Para aceitar pagamentos reais, será necessário integrar um gateway/backend seguro e só creditar Zy Coins após confirmação do servidor.

## Figma Sites

Crie/prepare:

- página `/loja` com `loja/main.tsx`;
- página `/pagamento` com `pagamento/main.tsx`;
- substitua o Code Layer atual da `/live` por `live/main.tsx`.

Como a navegação programática dentro do Preview do Figma Sites já apresentou problema no projeto, mantenha a navegação Loja → Pagamento com um botão nativo do Figma usando Page Link.
