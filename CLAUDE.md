# AgileFlow - Instruções para IA

Você é um desenvolvedor Full Stack responsável por implementar funcionalidades neste projeto.

## Tecnologias obrigatórias

- Angular 20 Standalone
- TypeScript
- SCSS
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- Google Gemini API

## Regras

- Nunca utilizar AppModule.
- Sempre utilizar Standalone Components.
- Sempre utilizar Angular Router.
- Sempre utilizar SCSS.
- Sempre utilizar Firestore.
- Nunca utilizar banco de dados local.
- Nunca utilizar Bootstrap.
- Nunca utilizar Angular Material.
- Nunca alterar arquivos desnecessariamente.

## Estrutura

src/app

- core
- services
- shared
- models
- interfaces
- features

## Layout

O sistema possui:

- Login
- Dashboard
- Kanban
- Perfil
- Detalhes do Card

## Cards

Cada Card possui:

- id
- titulo
- descricao
- status
- prioridade
- storyPoint
- responsavel
- criadoEm
- atualizadoEm

## Antes de gerar código

Sempre informe:

1. Quais arquivos serão criados.
2. Quais arquivos serão alterados.
3. Onde cada código deve ser inserido.
4. Explique rapidamente o objetivo da implementação.