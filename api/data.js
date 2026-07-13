const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async (req, res) => {
  const key = req.query.key;
  if (!key) {
    res.status(400).json({ error: 'missing key parameter' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const value = await redis.get(key);
      res.status(200).json({ value: value === undefined ? null : value });
      return;
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);
      await redis.set(key, body.value);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    res.status(500).json({ error: 'storage operation failed' });
  }
};
