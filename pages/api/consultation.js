export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userDataUrl, wigDataUrl, wigSummary } = req.body;
  if (!userDataUrl || !wigDataUrl) return res.status(400).json({ error: "Images required" });

  const uB64  = userDataUrl.split(",")[1];
  const uMime = userDataUrl.split(";")[0].replace("data:", "");
  const wB64  = wigDataUrl.split(",")[1];
  const wMime = wigDataUrl.split(";")[0].replace("data:", "");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "This is the user's photo:" },
            { type: "image", source: { type: "base64", media_type: uMime, data: uB64 } },
            { type: "text", text: "This is the wig they selected:" },
            { type: "image", source: { type: "base64", media_type: wMime, data: wB64 } },
            { type: "text", text: `Wig summary: ${wigSummary}

You are a compassionate expert wig consultant for CrownAid, an app supporting women with medical hair loss. Analyze the user's face and this wig using EXACTLY these bold headers:

**FIT ANALYSIS**
How this wig complements her face shape, skin tone, and features. Be specific and warm.

**STYLE NOTES**
Key characteristics — length, texture, density, vibe.

**WEAR TIPS**
2–3 practical tips for making this wig look most natural on her specifically.

**VERDICT**
Confident recommendation — should she get it or consider alternatives?

**INSURANCE REMINDER**
One sentence: this may qualify as a Cranial Prosthesis (HCPCS A9282) for insurance reimbursement.

Warm, empowering tone. Make her feel seen and beautiful.` }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.find(b => b.type === "text")?.text || "Analysis unavailable.";
    res.status(200).json({ consultation: text });
  } catch (e) {
    console.error("consultation error:", e);
    res.status(500).json({ error: e.message });
  }
}
