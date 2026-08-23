# Zytrix-TCC — Code Layers

Pacote com os `main.tsx` mais recentes desenvolvidos para o Zytrix.

## Conteúdo

- `home/destaques/main.tsx`
  - TOP 3 por `viewerCount`
  - seleção da live via `localStorage`

- `home/ao-vivo-na-zytrix/main.tsx`
  - mostra as posições 4 a 7
  - sem duplicar o TOP 3

- `ao-vivo/main.tsx`
  - todas as lives
  - pesquisa e filtros por categoria principal
  - suporta `categoryId` com subcategoria

- `live/main.tsx`
  - lê `zytrixSelectedStream`
  - carrega a stream e o perfil
  - player Twitch

- `perfil/main.tsx`
  - perfil do usuário
  - edição de perfil e verificação de e-mail
  - transformação de usuário em streamer
  - vínculo/troca de conta Twitch
  - esta é a versão mais recente trabalhada no Perfil

- `configlive/main.tsx`
  - thumbnail, título e descrição
  - categoria + subcategoria
  - grava `categoryId` no formato `Categoria - Subcategoria`
  - iniciar/encerrar transmissão

- `categorias/`
  - 8 categorias principais
  - 32 subcategorias
  - 40 `main.tsx`

## Total

46 arquivos `main.tsx`.

## Padrão atual de categorias

Exemplo:

`Esportes - Futebol`

A página/subcategoria Futebol filtra exatamente esse valor.
A página principal Esportes aceita `Esportes` e todas as subcategorias de Esportes.

## Navegação das lives no Figma Preview

Os cards não tentam abrir `/live` diretamente pelo JavaScript.
Ao clicar, salvam:

- `zytrixSelectedStream`
- `zytrixSelectedStreamName`
- `zytrixSelectedStreamTitle`

no `localStorage`.

Depois, um botão nativo do Figma com Page Link para `/live` faz a navegação.

## Observação sobre a troca da Twitch

O arquivo de Perfil incluído é a versão mais recente do fluxo por link de e-mail.
A etapa de callback externo/Firebase Hosting estava sendo configurada no momento
em que este pacote foi montado.
