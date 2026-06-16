// get-availability.js — reads blocked dates from Netlify env API (account slug endpoint)
const ACCOUNT_SLUG = "info-qdkwtxq";   // Netlify account slug (fixed)

exports.handler = async () => {
  let blockedDates = [];

  try {
    const ACCESS_TOKEN = process.env.NETLIFY_ACCESS_TOKEN;
    const SITE_ID      = process.env.NETLIFY_SITE_ID;

    if (ACCESS_TOKEN && SITE_ID) {
      const r = await fetch(
        `https://api.netlify.com/api/v1/accounts/${ACCOUNT_SLUG}/env/BLOCKED_DATES?site_id=${SITE_ID}`,
        { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
      );
      if (r.ok) {
        const data = await r.json();
        const val  = data.values?.[0]?.value || "[]";
        blockedDates = JSON.parse(val);
      }
    }
  } catch (e) {
    blockedDates = [];
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type":                "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control":               "no-store"
    },
    body: JSON.stringify({ blockedDates })
  };
};
