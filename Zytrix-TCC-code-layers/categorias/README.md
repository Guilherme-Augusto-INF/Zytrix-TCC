# Zytrix — Categorias

Foram gerados 40 arquivos `main.tsx`:
- 8 para categorias principais.
- 32 para subcategorias.

## Regra do Firestore
Salve `categoryId` no formato:

`Categoria - Subcategoria`

Exemplo:
`Esportes - Futebol`

Assim:
- `Esportes/Futebol/main.tsx` mostra somente Futebol.
- `Esportes/main.tsx` mostra Esportes + todas as subcategorias de Esportes.

Os cards continuam salvando `zytrixSelectedStream` no localStorage,
portanto funcionam com o botão nativo do Figma que abre `/live`.

## Arquivos
- Gaming/main.tsx -> Gaming, Gaming - Ação / Aventura, Gaming - RPG, Gaming - Esportes, Gaming - Simulação
- Gaming/Ação / Aventura/main.tsx -> Gaming - Ação / Aventura
- Gaming/RPG/main.tsx -> Gaming - RPG
- Gaming/Esportes/main.tsx -> Gaming - Esportes
- Gaming/Simulação/main.tsx -> Gaming - Simulação
- Música/main.tsx -> Música, Música - Rock, Música - Sertanejo, Música - Eletrônica, Música - Funk
- Música/Rock/main.tsx -> Música - Rock
- Música/Sertanejo/main.tsx -> Música - Sertanejo
- Música/Eletrônica/main.tsx -> Música - Eletrônica
- Música/Funk/main.tsx -> Música - Funk
- Just Chatting/main.tsx -> Just Chatting, Just Chatting - Bate-Papo, Just Chatting - Perguntas e Respostas, Just Chatting - Histórias, Just Chatting - Desafios
- Just Chatting/Bate-Papo/main.tsx -> Just Chatting - Bate-Papo
- Just Chatting/Perguntas e Respostas/main.tsx -> Just Chatting - Perguntas e Respostas
- Just Chatting/Histórias/main.tsx -> Just Chatting - Histórias
- Just Chatting/Desafios/main.tsx -> Just Chatting - Desafios
- Criatividade/main.tsx -> Criatividade, Criatividade - Desenho, Criatividade - Design, Criatividade - Fotografia, Criatividade - Edição
- Criatividade/Desenho/main.tsx -> Criatividade - Desenho
- Criatividade/Design/main.tsx -> Criatividade - Design
- Criatividade/Fotografia/main.tsx -> Criatividade - Fotografia
- Criatividade/Edição/main.tsx -> Criatividade - Edição
- Esportes/main.tsx -> Esportes, Esportes - Futebol, Esportes - Basquete, Esportes - Automobilismo, Esportes - Lutas
- Esportes/Futebol/main.tsx -> Esportes - Futebol
- Esportes/Basquete/main.tsx -> Esportes - Basquete
- Esportes/Automobilismo/main.tsx -> Esportes - Automobilismo
- Esportes/Lutas/main.tsx -> Esportes - Lutas
- Tecnologia/main.tsx -> Tecnologia, Tecnologia - Programação, Tecnologia - Hardware, Tecnologia - Inteligência Artificial, Tecnologia - Ciência e Tech
- Tecnologia/Programação/main.tsx -> Tecnologia - Programação
- Tecnologia/Hardware/main.tsx -> Tecnologia - Hardware
- Tecnologia/Inteligência Artificial/main.tsx -> Tecnologia - Inteligência Artificial
- Tecnologia/Ciência e Tech/main.tsx -> Tecnologia - Ciência e Tech
- Podcasts/main.tsx -> Podcasts, Podcasts - Conversas, Podcasts - Entrevistas, Podcasts - Notícias, Podcasts - Entretenimento
- Podcasts/Conversas/main.tsx -> Podcasts - Conversas
- Podcasts/Entrevistas/main.tsx -> Podcasts - Entrevistas
- Podcasts/Notícias/main.tsx -> Podcasts - Notícias
- Podcasts/Entretenimento/main.tsx -> Podcasts - Entretenimento
- IRL/main.tsx -> IRL, IRL - Viagens, IRL - Eventos, IRL - Vida Cotidiana, IRL - Exploração
- IRL/Viagens/main.tsx -> IRL - Viagens
- IRL/Eventos/main.tsx -> IRL - Eventos
- IRL/Vida Cotidiana/main.tsx -> IRL - Vida Cotidiana
- IRL/Exploração/main.tsx -> IRL - Exploração