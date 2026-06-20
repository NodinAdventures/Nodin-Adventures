const OWNER_EMAIL = "ashleyp369@gmail.com";
const SITE_URL    = "https://nodinadventures.com";
const SENDGRID_KEY = "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";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: "Invalid JSON" }; }

  const {
    "first-name": firstName = "",
    "last-name":  lastName  = "",
    email        = "",
    phone        = "",
    date         = "",
    "party-size": partySize = "",
    message      = "",
  } = body;

  let rentalTypes = body["rental-type"] || "";
  if (Array.isArray(rentalTypes)) rentalTypes = rentalTypes.join(", ");

  const name = `${firstName} ${lastName}`.trim();
  if (!email || !name) return { statusCode: 400, body: "Missing required fields" };

  const token    = Buffer.from(`${date}-${email}-nodin2024`).toString("base64").slice(0, 16);
  const approveURL = `${SITE_URL}/.netlify/functions/handle-approval?action=approve&token=${token}&date=${encodeURIComponent(date)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&type=${encodeURIComponent(rentalTypes)}&phone=${encodeURIComponent(phone)}`;
  const denyURL    = `${SITE_URL}/.netlify/functions/handle-approval?action=deny&token=${token}&date=${encodeURIComponent(date)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&type=${encodeURIComponent(rentalTypes)}`;

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f9f5ef;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#fff">
  <div style="background:#3d2010;padding:28px 32px">
    <h1 style="color:#c47c08;margin:0;font-size:22px">New Booking Inquiry</h1>
    <p style="color:#f4ede0;margin:6px 0 0;font-size:14px">Someone wants to book a Nodin Adventures rental.</p>
  </div>
  <div style="padding:28px 32px">
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
    <p><strong>Rental Type:</strong> ${rentalTypes || "Not specified"}</p>
    <p><strong>Requested Date:</strong> ${date || "Not specified"}</p>
    <p><strong>Party Size:</strong> ${partySize || "Not specified"}</p>
    ${message ? `<p><strong>Notes:</strong> ${message}</p>` : ""}
    <div style="margin-top:28px;display:flex;gap:16px">
      <a href="${approveURL}" style="background:#1a7870;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">Approve Booking</a>
      <a href="${denyURL}" style="background:#9e3a18;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">Deny</a>
    </div>
  </div>
  <div style="background:#3d2010;padding:16px 32px;font-size:12px;color:#8a6840">
    Nodin Adventures, LLC · info@nodinadventures.com · nodinadventures.com
  </div>
</div>
</body></html>`;

  const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method:  "POST",
    headers: { Authorization: `Bearer ${SENDGRID_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: OWNER_EMAIL }] }],
      from:     { email: "info@nodinadventures.com", name: "Nodin Adventures" },
      reply_to: { email },
      subject:  `New Inquiry: ${name} — ${date || "Date TBD"}`,
      content:  [{ type: "text/html", value: html }]
    })
  });

  console.log("SendGrid status:", sgRes.status);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, message: "Inquiry received" })
  };
};
