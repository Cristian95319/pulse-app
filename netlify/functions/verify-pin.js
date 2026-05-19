exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  const { pin } = JSON.parse(event.body || '{}');
  if (!pin || pin !== process.env.APP_PIN) {
    return { statusCode: 401, body: JSON.stringify({ error: 'PIN incorrecto' }) };
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
