# Arquitetura do Sistema

## Arquitetura Geral

Angular 20 (Frontend)

↓

Firebase Authentication

↓

Cloud Firestore

↓

Gemini API

↓

Firebase Hosting

## Organização

O projeto utiliza arquitetura Feature-Based, onde cada funcionalidade possui seus próprios componentes.

## Estrutura

- Core
- Shared
- Services
- Models
- Interfaces
- Features

## Banco

Cloud Firestore

Coleções:

- users (perfil criado no cadastro por e-mail/senha)
- projects (ownerId)
- cards (projectId, createdBy)

Planejada: cardEvents (histórico de movimentação dos cartões).

A coleção `comments` não existe; `ai.service.ts` ainda está vazio (a integração com o Gemini não foi implementada).