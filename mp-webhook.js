const { MercadoPagoConfig, Payment } = require('mercadopago');
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async (req, res) => {
  try {
    const paymentId =
      (req.query && (req.query['data.id'] || req.query.id)) ||
      (req.body && req.body.data && req.body.data.id);

    if (!paymentId || !process.env.MP_ACCESS_TOKEN) {
      res.status(200).json({ ok: true });
      return;
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: paymentId });

    if (payment && payment.status === 'approved' && payment.external_reference) {
      const reservations = (await redis.get('reservations')) || [];
      const idx = reservations.findIndex((r) => r.id === payment.external_reference);
      if (idx !== -1 && reservations[idx].status !== 'confirmado') {
        reservations[idx].status = 'confirmado';
        reservations[idx].paymentMethod = 'cartao';
        await redis.set('reservations', reservations);
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('mp-webhook error', err);
    res.status(200).json({ ok: true });
  }
};
