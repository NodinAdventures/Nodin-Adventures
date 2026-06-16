// confirm-booking.js
// Called by the booking inquiry form (via fetch from the website).
// Sends owner an email with Approve / Deny buttons.
// Requires env vars in Netlify UI:
//   NETLIFY_ACCESS_TOKEN  — personal access token
//   NETLIFY_SITE_ID       — site ID
//   SENDGRID_API_KEY      — SendGrid API key for sending emails
//   OWNER_EMAIL           — defaults to info@nodinadventures.com

const ACCOUNT_SLUG  = "info-qdkwtxq";
const OWNER_EMAIL   = process.env.OWNER_EMAIL || "info@nodinadventures.com";
const SITE_URL      = "https://nodinadventures.com";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON body" };
  }

  const {
    "first-name": firstName = "",
    "last-name":  lastName  = "",
    email        = "",
    phone        = "",
    date         = "",
    "party-size": partySize = "",
    message      = "",
  } = body;

  // Collect all selected rental types (can be an array or a single value)
  let rentalTypes = body["rental-type"] || "";
  if (Array.isArray(rentalTypes)) rentalTypes = rentalTypes.join(", ");

  const name = `${firstName} ${lastName}`.trim();

  if (!email || !name) {
    return { statusCode: 400, body: "Missing required fields" };
  }

  // Build a secure token so approve/deny links can't be forged
  const token = Buffer.from(`${date}-${email}-nodin2024`).toString("base64").slice(0, 16);

  const encEmail = encodeURIComponent(email);
  const encName  = encodeURIComponent(name);
  const encDate  = encodeURIComponent(date);
  const encType  = encodeURIComponent(rentalTypes);
  const encPhone = encodeURIComponent(phone);

  const approveURL = `${SITE_URL}/.netlify/functions/handle-approval?action=approve&token=${token}&date=${encDate}&name=${encName}&email=${encEmail}&type=${encType}&phone=${encPhone}`;
  const denyURL    = `${SITE_URL}/.netlify/functions/handle-approval?action=deny&token=${token}&date=${encDate}&name=${encName}&email=${encEmail}&type=${encType}`;

  // ── Send email to owner via SendGrid ─────────────────────────────────────
  const SENDGRID_KEY = process.env.SENDGRID_API_KEY;

  const ownerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f5ef; margin: 0; padding: 0; }
    .wrap { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #3d2010; padding: 28px 32px; }
    .header h1 { color: #c47c08; margin: 0; font-size: 22px; }
    .header p { color: #f4ede0; margin: 6px 0 0; font-size: 14px; }
    .body { padding: 28px 32px; }
    .field { margin-bottom: 14px; }
    .field label { font-size: 11px; font-weight: 700; text-transform: uppercase;
                   letter-spacing: .08em; color: #9e3a18; display: block; margin-bottom: 3px; }
    .field span { font-size: 15px; color: #1a1a1a; }
    .note-box { background: #fdf6ec; border-left: 4px solid #c47c08; padding: 12px 16px;
                border-radius: 4px; margin: 18px 0; font-size: 14px; color: #444; line-height: 1.5; }
    .actions { display: flex; gap: 16px; margin-top: 28px; }
    .btn-approve { display: inline-block; background: #1a7870; color: #fff;
                   padding: 14px 32px; border-radius: 8px; text-decoration: none;
                   font-weight: 700; font-size: 16px; }
    .btn-deny    { display: inline-block; background: #9e3a18; color: #fff;
                   padding: 14px 32px; border-radius: 8px; text-decoration: none;
                   font-weight: 700; font-size: 16px; }
    .footer { background: #3d2010; padding: 16px 32px; font-size: 12px; color: #8a6840; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>◆ New Booking Inquiry</h1>
    <p>Someone wants to book a Nodin Adventures rental — review and respond below.</p>
  </div>
  <div class="body">
    <div class="field"><label>Name</label><span>${name}</span></div>
    <div class="field"><label>Email</label><span>${email}</span></div>
    <div class="field"><label>Phone</label><span>${phone || "Not provided"}</span></div>
    <div class="field"><label>Rental Type</label><span>${rentalTypes || "Not specified"}</span></div>
    <div class="field"><label>Requested Date</label><span>${date || "Not specified"}</span></div>
    <div class="field"><label>Party Size</label><span>${partySize || "Not specified"}</span></div>
    ${message ? `<div class="note-box"><strong>Notes:</strong><br>${message.replace(/\n/g, '<br>')}</div>` : ""}

    <div class="actions">
      <a href="${approveURL}" class="btn-approve">✅ Approve Booking</a>
      <a href="${denyURL}"    class="btn-deny">❌ Deny Inquiry</a>
    </div>

    <p style="margin-top:24px; font-size:13px; color:#888;">
      Clicking Approve will automatically send ${firstName} a confirmation email.<br>
      Clicking Deny will send a polite decline message.
    </p>
  </div>
  <div class="footer">Nodin Adventures, LLC · info@nodinadventures.com · nodinadventures.com</div>
</div>
</body>
</html>`;

  if (SENDGRID_KEY) {
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${SENDGRID_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: OWNER_EMAIL }] }],
        from:    { email: "noreply@nodinadventures.com", name: "Nodin Adventures Bookings" },
        reply_to: { email },
        subject: `📬 New Inquiry: ${name} — ${date || "Date TBD"}`,
        content: [{ type: "text/html", value: ownerHtml }]
      })
    });
  } else {
    // Fallback: log the approve/deny URLs for debugging
    console.log("APPROVE:", approveURL);
    console.log("DENY:",    denyURL);
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, message: "Inquiry received" })
  };
};
