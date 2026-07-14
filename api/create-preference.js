const { MercadoPagoConfig, Preference } = require('mercadopago');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    const { reservationId, giftName, amount, guestEmail } = body || {};

    if (!reservationId || !amount) {
      res.status(400).json({ error: 'missing reservationId or amount' });
      return;
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      res.status(500).json({ error: 'MP_ACCESS_TOKEN not configured' });
      return;
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preference = new Preference(client);

    const siteUrl = `https://${req.headers.host}`;

    const response = await preference.create({
      body: {
        items: [{
          title: giftName ? `Presente: ${giftName}` : 'Presente de casamento',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(amount)
        }],
        payer: guestEmail ? { email: guestEmail } : undefined,
        external_reference: reservationId,
        back_urls: {
          success: `${siteUrl}/?pagamento=sucesso&res=${reservationId}`,
          failure: `${siteUrl}/?pagamento=falha&res=${reservationId}`,
          pending: `${siteUrl}/?pagamento=pendente&res=${reservationId}`
        },
        auto_return: 'approved',
        notification_url: `${siteUrl}/api/mp-webhook`
      }
    });

    res.status(200).json({ init_point: response.init_point });
  } catch (err) {
    res.status(500).json({ error: 'preference creation failed', details: String(err && err.message ? err.message : err) });
  }
};
