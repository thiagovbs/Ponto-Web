```markdown
# 🌐 Painel Administrativo - Ponto Web

Este é o dashboard administrativo do sistema de controle de horas. Por meio dele, os gestores podem cadastrar novos colaboradores, gerenciar perfis de sistema, associar jornadas contratuais e revisar os pontos batidos.

---

## 🚀 Tecnologias Utilizadas

* **Framework:** Vue 3 (Composition API / `<script setup>`)
* **Linguagem:** TypeScript
* **Ferramenta de Build:** Vite
* **Checagem de Tipos:** vue-tsc
* **Cliente HTTP:** Axios
* **Servidor de Produção (Docker):** Nginx (imagem Alpine leve)

---

## 🛠️ Pré-requisitos

Se for executar o projeto de forma local (sem Docker), você precisará de:
* Node.js v20 ou superior
* A API Backend rodando na porta `3003`

---

## 🏃 Como Executar o Projeto

### Opção A: Pelo Docker Compose Unificado (Na Raiz)
Se você utilizou o `docker-compose up` na raiz do projeto de controle de horas, este painel já foi compilado e está sendo servido de forma otimizada pelo Nginx.

* **URL de Acesso:** `http://localhost:8080`

---

### Opção B: Execução Local para Desenvolvimento

1. Entre na pasta do projeto web:
   ```bash
   cd ponto-web
2. Execute o servidor localmente:
   ```bash
   npm run dev   