# To-do — próxima sessão

## Preços em falta
Só o **Pro** tem preços reais (curto €41 / longo €51). Falta definir curto/longo para:
- [ ] Pro+ (descrição: 2 visitas de cabeleireiro por mês)
- [ ] Premium
- [ ] Family (até 4 pessoas)
- [ ] Head Spa 1x — Individual
- [ ] Head Spa 1x — Família
- [ ] Head Spa 2x — Individual
- [ ] Head Spa 2x — Família
- [ ] Head Spa 3x — Individual
- [ ] Head Spa 3x — Família
- [ ] Head Spa 4x — Individual
- [ ] Head Spa 4x — Família

Confirmar também se os preços são iguais em Portimão e Tavira, ou se há lojas com preço diferente (a app já suporta override por loja).

## Decisões de negócio por confirmar com os donos
- [ ] Política de sessões partilhadas do Head Spa em família (o README assinala isto como não decidido — atualmente as sessões não usadas não transitam para o mês seguinte, e não são geridas como créditos individuais).
- [ ] Ficheiro `ASSUMPTIONS.md` é mencionado no README como fonte de preços/alocação de sessões, mas não existe no repositório — confirmar se deve ser criado ou se já foi substituído por esta conversa.

## Configuração pendente (opcional, antes de lançar a sério)
- [ ] `RESEND_API_KEY` e `EMAIL_FROM` no `.env` — sem isto, os emails de boas-vindas/cancelamento são simplesmente ignorados (não há erro, mas também não são enviados).
- [ ] Pagamentos com cartão/Stripe: **não mexer** — fica para um programador especializado rever antes de ativar `STRIPE_BILLING_ENABLED`.

## Para retomar localmente
1. Abrir o Docker Desktop e esperar que o motor arranque (o ícone deixa de girar).
2. Na pasta do projeto: `docker compose up -d`
3. `npm run dev` (nota: se a porta 3000 estiver ocupada por outra coisa nesta máquina, o Next.js usa automaticamente a 3002 — confirmar no terminal qual porta ficou ativa)
4. Login admin de teste: `admin@example.com` / `local-dev-admin-pass-123`
