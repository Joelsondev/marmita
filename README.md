Crie um sistema SaaS web completo para marmitarias, com frontend e backend separados, rodando totalmente no navegador (sem app mobile).

o sistema sera por assinatura mensal, trimestral ou anual.

Cada marmitaria nova podera se cadastrar e usar por 7 dias gratis e caso não afetue o pagamento,o sistema irá boquear o acesso ate a quitação.

Os planos contratados, 10 dias antes do vencimento ira emitir um alerta informando que precisa regularizar a quitação.
Apos vencido o sistema deixa disponivel por mais 1 dia e não deixara mais acessar ate a regularização.

no super admin, preciso ter a opção de trocar a assinatura manual, conforme a opção do cliente

adm da 

---

# 🧠 Objetivo do sistema

Plataforma web onde:

1. A marmitaria (admin) gerencia:

* clientes
* marmitas
* pedidos
* créditos
* descontos
* retirada no balcão

2. O cliente acessa via navegador:

* vê saldo
* monta marmita personalizada
* faz pedidos com múltiplos itens
* visualiza QR Code para retirada

---

# 🏗️ Arquitetura

* Frontend: Next.js (App Router)
* Backend: Node.js com NestJS
* Banco: PostgreSQL
* Comunicação: API REST

Estrutura:

/backend
/web

---

# 🔐 Regras principais

1. Multi-tenant:

* cada marmitaria é um tenant
* todas as tabelas possuem tenant_id
* precisa se cadastrar incluindo o CNPJ ou CPF obrigatorio

2. Cliente:

* possui saldo (créditos)
* pode fazer pedidos mesmo sem saldo suficiente

* O sistema identifica  o cliente e direciona para a marmitaria, se possuir mais de um cadastro, em formato de dropdow a lista de qual ele ira acessar.

3. Pedido:

* possui múltiplos itens
* cada item pode ter opções personalizadas

4. Desconto:

* aplicado se pedido for feito antes de um horário limite

5. Retirada:

* feita por QR Code ou CPF
* só pode retirar se tiver saldo suficiente

---

# 💰 REGRA DE SALDO

* O cliente pode criar pedidos mesmo sem saldo suficiente

* Se saldo < total do pedido:
  → status = "pending_payment"

* O sistema deve exibir:
  "Faltam R$X para retirada"

* O cliente deve adicionar crédito antes de retirar

* Na retirada:
  → bloquear se saldo insuficiente

---

# 🧱 BACKEND (NestJS)

## Módulos

* auth
* tenants
* customers
* wallet
* meals
* option-groups
* options
* orders
* order-items
* discounts
* checkout
* dashboard

---

## Entidades

Customer:

* id
* tenant_id
* name
* cpf
* phone
* balance

Meal:

* id
* tenant_id
* name
* base_price
* date

OptionGroup:

* id
* meal_id
* name
* type (single/multiple)

Option:

* id
* group_id
* name
* price

Order:

* id
* customer_id
* total_amount
* status (pending, pending_payment, completed)
* checkout_method (qr, cpf)
* created_at

OrderItem:

* id
* order_id
* meal_id
* quantity
* unit_price

OrderItemOption:

* id
* order_item_id
* option_id
* price

DiscountRule:

* cutoff_time
* discount_value

---

## ⚙️ Regras de negócio

1. Calcular total:

* base da marmita
* somar opções
* multiplicar por quantidade

2. Aplicar desconto:

* se horário atual <= cutoff_time

3. Criar pedido:

Se saldo >= total:
→ status = pending

Se saldo < total:
→ status = pending_payment

4. Retirada (checkout):

* buscar cliente por QR ou CPF
* localizar pedido "pending" ou "pending_payment"
* validar saldo >= total
* se não tiver saldo → bloquear
* descontar saldo
* marcar como completed
* registrar método (qr ou cpf)

5. Não permitir:

* retirada duplicada
* retirada sem saldo

---

# 📊 DASHBOARD (ADMIN - MUITO IMPORTANTE)

O dashboard deve ser simples, direto e focado em tomada de decisão rápida.

## Métricas principais (cards)

1. 💰 Faturamento do dia

* valor total vendido hoje
* comparação com ontem (opcional)




2. 🍱 Marmitas vendidas

* quantidade total do dia

3. 👥 Clientes atendidos

* número de clientes únicos do dia

4. 📦 Pedidos por status

* pending
* pending_payment
* completed

5. 🚨 ALERTA PRINCIPAL

Se existir pedidos com status "pending_payment":

* exibir destaque em vermelho:

"⚠ X pedidos com saldo insuficiente"

---

6. 💳 Créditos no sistema

* soma de saldo de todos os clientes

7. 📈 Ticket médio

* valor médio por pedido

8. ⏰ Pedidos com desconto

* quantidade de pedidos feitos antes do horário limite
* total de desconto concedido

---

## Regras do dashboard

* dados devem ser do dia atual
* atualizar em tempo real ou sob refresh
* destacar problemas visualmente

1. 💰 Faturamento do mensal

* valor total vendido no mes
* quantidade de marmitas retiradas no mes

---

## UX do dashboard

* mostrar informações em cards grandes
* usar cores:

  * verde = OK
  * vermelho = problema
* foco em leitura rápida (menos de 10 segundos)

---

# 🌐 FRONTEND (Next.js)

## 🧑‍🍳 ADMIN

### Dashboard

* exibir todas as métricas acima
* destacar pedidos com problema
* mostrar alertas visuais

---

### Clientes

* listar
* ver saldo
* adicionar crédito

---

### Marmitas

* criar marmita
* criar grupos de opções
* criar opções

---

### Pedidos

Lista com:

* nome do cliente
* valor total
* status

## Destaque visual:

Se status = pending_payment:

* fundo vermelho claro
* mostrar:

"⚠ Faltam R$X"

* badge:

[PENDENTE PAGAMENTO]

## Filtros:

* TODOS
* COM PROBLEMA

## Ordenação:

* pedidos com problema primeiro

---

### 🚀 Tela de RETIRADA

* scanner de QR Code
* busca por CPF

Mostrar:

* cliente
* saldo
* pedido

Se saldo insuficiente:

* alerta vermelho
* bloquear retirada

Se saldo OK:

* botão confirmar retirada

---

## 🧑‍💻 CLIENTE

### Home

* saldo
* marmita do dia
* preço com desconto

---

### Montar pedido

* opções
* adicionar ao carrinho

---

### Carrinho

* múltiplos itens
* total

Se saldo insuficiente:

"⚠ Faltam R$X"

---

### QR Code

* exibir QR do cliente

---

### Histórico

* pedidos e créditos

---

# ⚙️ Tecnologias

Backend:

* NestJS
* Prisma ORM
* PostgreSQL

Frontend:

* Next.js
* Tailwind CSS
* React Query ou SWR

---

# 🚀 Entrega esperada

Gerar:

* estrutura completa
* backend funcional
* frontend funcional
* dashboard com métricas
* fluxo completo de pedidos e retirada

---

# ⭐ Diferencial

Sistema deve ser:

* simples
* rápido
* focado na operação real da marmitaria
* com destaque visual para problemas financeiros

Evitar complexidade desnecessária.
