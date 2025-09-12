/** api/email.js - SendGrid mailer */
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Use POST' });

    // Parse body from PowerShell/JSON
    let body = req.body;
    if (!body || typeof body !== 'object') {
      try { body = JSON.parse(req.body || '{}'); } catch { body = {}; }
    }
    const to      = String(body.to || '').trim();
    const subject = String(body.subject || '').trim();
    const html    = String(body.html || body.text || '').trim();

    if (!to)      return res.status(400).json({ ok:false, error:'Missing "to"' });
    if (!subject) return res.status(400).json({ ok:false, error:'Missing "subject"' });

    const key  = String(process.env.SENDGRID_API_KEY || '').trim();
    const from = String(process.env.FROM_EMAIL || 'reports@virtualcoachai.net').trim();
    if (!key)  return res.status(500).json({ ok:false, error:'Missing SENDGRID_API_KEY' });

    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject,
        content: [{ type: 'text/html', value: html || '<i>(empty)</i>' }]
      })
    });

    if (r.status !== 202) {
      const txt = await r.text();
      return res.status(r.status).json({ ok:false, provider:'sendgrid', status:r.status, body:txt });
    }
    return res.status(200).json({ ok:true, provider:'sendgrid' });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};
