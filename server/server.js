import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('Aviso: STRIPE_SECRET_KEY nao configurada no ambiente/env. Configure para processar pagamentos reais.');
}

const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder_kriativa');
const app = express();
const port = process.env.PORT || 3000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:8080';

// Webhook precisa do body raw (cru) para validar a assinatura criptografica da Stripe
app.post(
  '/api/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        // Modo fallback sem segredo de webhook (apenas para testes locais iniciais)
        event = JSON.parse(req.body.toString());
        console.warn('Aviso: STRIPE_WEBHOOK_SECRET nao configurada, validando payload sem assinatura.');
      }
    } catch (err) {
      console.error(`Falha na validacao do Webhook: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Processamento de Eventos da Stripe
    console.log(`Evento recebido da Stripe: [${event.type}]`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`Pagamento confirmado! Cliente: ${session.customer_email || session.customer}`);
        // Logica para disparar e-mail de boas-vindas / onboarding ou registrar no CRM
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        console.log(`Fatura B2B paga com sucesso: ${invoice.id} - Valor: ${invoice.amount_paid}`);
        break;
      }
      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object;
        console.warn(`Pagamento de fatura falhou: ${failedInvoice.id}`);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log(`Assinatura atualizada: ${subscription.id} - Status: ${subscription.status}`);
        break;
      }
      case 'customer.subscription.deleted': {
        const canceledSub = event.data.object;
        console.log(`Assinatura cancelada: ${canceledSub.id}`);
        break;
      }
      default:
        console.log(`Evento nao tratado: ${event.type}`);
    }

    res.json({ received: true });
  }
);

// Middlewares padrao para as demais rotas JSON
app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'kriativa-stripe-api', timestamp: new Date().toISOString() });
});

// 1. Obter Planos Ativos da Stripe
app.get('/api/plans', async (req, res) => {
  try {
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 10,
    });

    const formatted = prices.data.map(p => ({
      priceId: p.id,
      productId: p.product.id,
      name: p.product.name,
      description: p.product.description,
      amount: (p.unit_amount / 100).toFixed(2),
      currency: p.currency.toUpperCase(),
      type: p.type === 'recurring' ? 'recurring' : 'one_time',
      interval: p.recurring ? p.recurring.interval : null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Erro ao listar planos:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Criar Sessao de Stripe Checkout (Payments & Billing com Coleta de CPF/CNPJ e Endereco)
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, mode, customerEmail, successUrl, cancelUrl } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'priceId e obrigatorio' });
    }

    const sessionParams = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode || 'payment', // 'payment' para avulso, 'subscription' para recorrente
      tax_id_collection: { enabled: true }, // Coleta CPF/CNPJ
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      success_url: successUrl || `${clientUrl}/?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: cancelUrl || `${clientUrl}/#pricing`,
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Erro ao criar checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Faturamento B2B Sob Medida (Invoicing com Envio Automatico)
app.post('/api/create-invoice', async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      taxId, // CPF ou CNPJ
      description,
      amountCents,
      currency = 'brl',
      daysUntilDue = 15,
    } = req.body;

    if (!customerEmail || !amountCents || !description) {
      return res.status(400).json({ error: 'customerEmail, amountCents e description sao obrigatorios' });
    }

    // 1. Procurar ou criar o cliente na Stripe
    const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
    let customer;

    if (existing.data.length > 0) {
      customer = existing.data[0];
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName || customerEmail,
      });

      // Adicionar CPF/CNPJ se informado
      if (taxId) {
        try {
          const type = taxId.replace(/\D/g, '').length === 14 ? 'br_cnpj' : 'br_cpf';
          await stripe.customers.createTaxId(customer.id, {
            type: type,
            value: taxId.replace(/\D/g, ''),
          });
        } catch (taxErr) {
          console.warn('Aviso ao anexar Tax ID:', taxErr.message);
        }
      }
    }

    // 2. Criar o item da fatura
    await stripe.invoiceItems.create({
      customer: customer.id,
      amount: parseInt(amountCents, 10),
      currency: currency.toLowerCase(),
      description: description,
    });

    // 3. Criar a fatura formal
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: daysUntilDue,
      auto_advance: true,
    });

    // 4. Finalizar e enviar para o e-mail do cliente
    const finalized = await stripe.invoices.sendInvoice(invoice.id);

    res.json({
      invoiceId: finalized.id,
      invoiceNumber: finalized.number,
      hostedInvoiceUrl: finalized.hosted_invoice_url,
      invoicePdf: finalized.invoice_pdf,
      status: finalized.status,
    });
  } catch (error) {
    console.error('Erro ao gerar fatura B2B:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Portal do Cliente (Stripe Customer Portal para autoatendimento B2B)
app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId e obrigatorio' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || clientUrl,
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Erro ao criar portal session:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Kriativa Stripe API ouvindo na porta ${port}`);
});

