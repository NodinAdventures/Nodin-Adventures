// handle-approval.js
// Called when the owner clicks Approve or Deny in their email.
// ?action=approve  → blocks the date in Netlify env + emails customer confirmation
// ?action=deny     → emails customer a polite decline
// Requires env vars: NETLIFY_ACCESS_TOKEN, NETLIFY_SITE_ID, SENDGRID_API_KEY

const ACCOUNT_SLUG = "info-qdkwtxq";
const OWNER_EMAIL  = process.env.OWNER_EMAIL || "Ashleyp369@gmail.com";
const SITE_URL     = "https://nodinadventures.com";

exports.handler = async (event) => {
  const p = event.queryStringParameters || {};
  const { action, token, date, name, email, type, phone } = p;

  // ── Validate token ────────────────────────────────────────────────────────
  if (!token || !date || !email) {
    return htmlPage("Error", "#9e3a18", "Invalid Link", "This link is missing required information.");
  }

  const expected = Buffer.from(`${date}-${email}-nodin2024`).toString("base64").slice(0, 16);
  if (token !== expected) {
    return htmlPage("Error", "#9e3a18", "Link Expired or Invalid",
      "This approval link is no longer valid. Please check the original inquiry email.");
  }

  const ACCESS_TOKEN = process.env.NETLIFY_ACCESS_TOKEN;
  const SITE_ID      = process.env.NETLIFY_SITE_ID;
  const SENDGRID_KEY = process.env.SENDGRID_API_KEY;

  // ── APPROVE ───────────────────────────────────────────────────────────────
  if (action === "approve") {
    // 1. Block the date in Netlify env
    if (ACCESS_TOKEN && SITE_ID) {
      const BASE = `https://api.netlify.com/api/v1/accounts/${ACCOUNT_SLUG}/env`;
      const AUTH = { Authorization: `Bearer ${ACCESS_TOKEN}` };

      let blockedDates = [];
      try {
        const r = await fetch(`${BASE}/BLOCKED_DATES?site_id=${SITE_ID}`, { headers: AUTH });
        if (r.ok) {
          const data = await r.json();
          blockedDates = JSON.parse(data.values?.[0]?.value || "[]");
        }
      } catch (_) {}

      if (!blockedDates.includes(date)) blockedDates.push(date);

      await fetch(`${BASE}/BLOCKED_DATES?site_id=${SITE_ID}`, { method: "DELETE", headers: AUTH }).catch(() => {});
      await fetch(`${BASE}?site_id=${SITE_ID}`, {
        method:  "POST",
        headers: { ...AUTH, "Content-Type": "application/json" },
        body: JSON.stringify([{
          key:    "BLOCKED_DATES",
          values: [{ value: JSON.stringify(blockedDates), context: "all" }]
        }])
      }).catch(() => {});
    }

    // 2. Email customer confirmation
    if (SENDGRID_KEY && email) {
      const firstName = (name || "").split(" ")[0] || "there";
      const customerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f5ef; margin: 0; padding: 0; }
    .wrap { max-width: 580px; margin: 0 auto; background: #fff; }
    .header { background: #3d2010; padding: 28px 32px; text-align: center; }
    .header h1 { color: #c47c08; margin: 0; font-size: 24px; }
    .header p { color: #f4ede0; margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; text-align: center; }
    .body p { color: #333; font-size: 15px; line-height: 1.6; }
    .detail-box { background: #fdf6ec; border: 2px solid #c47c08; border-radius: 10px;
                  padding: 18px 24px; margin: 20px auto; max-width: 360px; text-align: left; }
    .detail-box div { margin-bottom: 8px; font-size: 14px; color: #333; }
    .detail-box label { font-weight: 700; color: #9e3a18; }
    .btn { display: inline-block; background: #9e3a18; color: #fff; padding: 14px 36px;
           border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;
           margin-top: 20px; }
    .footer { background: #3d2010; padding: 16px 32px; text-align: center;
              font-size: 12px; color: #8a6840; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>✓ You're Booked!</h1>
    <p>Nodin Adventures, LLC — Manistee, Michigan</p>
  </div>
  <div class="body">
    <p>Hi <strong>${firstName}</strong>, your booking has been confirmed! We're excited to adventure with you.</p>
    <div class="detail-box">
      <div><label>Name: </label>${name || email}</div>
      <div><label>Rental: </label>${type || "See inquiry"}</div>
      <div><label>Date: </label>${date}</div>
      ${phone ? `<div><label>Phone: </label>${phone}</div>` : ""}
    </div>
    <p style="font-size:13px; color:#666;">Please arrive a few minutes early. A physical waiver must be signed at pickup.<br>Questions? Reply to this email or reach us at <a href="mailto:${OWNER_EMAIL}" style="color:#9e3a18;">${OWNER_EMAIL}</a>.</p>
    <a href="${SITE_URL}" class="btn">Visit nodinadventures.com</a>
  </div>
  <div class="footer">© 2026 Nodin Adventures, LLC · Mon–Sun 8AM–7PM · nodinadventures.com</div>
</div>
</body>
</html>`;

      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method:  "POST",
        headers: { Authorization: `Bearer ${SENDGRID_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from:    { email: "info@nodinadventures.com", name: "Nodin Adventures" },
          reply_to: { email: OWNER_EMAIL },
          subject: "✓ Your Nodin Adventures Booking is Confirmed!",
          content: [{ type: "text/html", value: customerHtml }]
        })
      }).catch(() => {});
    }

    return htmlPage(
      "Booking Approved",
      "#1a7870",
      "✓ Booking Approved!",
      `<strong>${name || email}</strong> has been confirmed for <strong>${type || "their rental"}</strong> on <strong>${date}</strong>.<br><br>A confirmation email has been sent to <strong>${email}</strong>.`
    );
  }

  // ── DENY ──────────────────────────────────────────────────────────────────
  if (action === "deny") {
    if (SENDGRID_KEY && email) {
      const firstName = (name || "").split(" ")[0] || "there";
      const denyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f5ef; margin: 0; padding: 0; }
    .wrap { max-width: 580px; margin: 0 auto; background: #fff; }
    .header { background: #3d2010; padding: 28px 32px; text-align: center; }
    .header h1 { color: #c47c08; margin: 0; font-size: 22px; }
    .header p { color: #f4ede0; margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .body p { color: #333; font-size: 15px; line-height: 1.7; }
    .btn { display: inline-block; background: #9e3a18; color: #fff; padding: 12px 32px;
           border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 16px; }
    .footer { background: #3d2010; padding: 16px 32px; text-align: center;
              font-size: 12px; color: #8a6840; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Nodin Adventures, LLC</h1>
    <p>Manistee, Michigan</p>
  </div>
  <div class="body">
    <p>Hi <strong>${firstName}</strong>,</p>
    <p>Thank you so much for your interest in Nodin Adventures! Unfortunately, we're unable to accommodate your request for <strong>${date}</strong> at this time.</p>
    <p>We'd love to find another date that works for you. Someone from Nodin Adventures will contact you shortly, or feel free to call us at 231-299-1295 </a> — we're happy to help find the right adventure for you and your group.</p>
    <p>We hope to ride the wind with you soon!</p>
    <p>— The Nodin Adventures Team</p>
    <a href="${SITE_URL}/index.html#contact" class="btn">Check Other Dates</a>
  </div>
  <div class="footer">© 2026 Nodin Adventures, LLC · Mon–Sun 8AM–7PM · nodinadventures.com</div>
</div>
</body>
</html>`;

      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method:  "POST",
        headers: { Authorization: `Bearer ${SENDGRID_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from:    { email: "noreply@nodinadventures.com", name: "Nodin Adventures" },
          reply_to: { email: OWNER_EMAIL },
          subject: "Re: Your Nodin Adventures Inquiry",
          content: [{ type: "text/html", value: denyHtml }]
        })
      }).catch(() => {});
    }

    return htmlPage(
      "Inquiry Declined",
      "#9e3a18",
      "Inquiry Declined",
      `A polite decline has been sent to <strong>${email}</strong>.`
    );
  }

  return htmlPage("Error", "#9e3a18", "Unknown Action", "Invalid action parameter.");
};

// ── Helper: return a styled HTML page ─────────────────────────────────────────
function htmlPage(title, accentColor, heading, bodyHtml) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — Nodin Adventures</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:sans-serif;background:#1a1008;color:#f4ede0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
    .card{background:rgba(244,237,224,.06);border:1px solid ${accentColor}55;border-radius:16px;padding:40px 48px;text-align:center;max-width:500px;width:100%}
    h1{color:${accentColor};font-size:1.8rem;margin-bottom:14px}
    p{color:rgba(244,237,224,.8);line-height:1.6;font-size:15px}
    a{display:inline-block;margin-top:24px;background:#9e3a18;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px}
  </style>
</head>
<body>
  <div class="card">
    <h1>${heading}</h1>
    <p>${bodyHtml}</p>
    <a href="https://nodinadventures.com">← Back to Site</a>
  </div>
</body>
</html>`
  };
}
