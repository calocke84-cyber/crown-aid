export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { wigDataUrl } = req.body;
  if (!wigDataUrl) return res.status(400).json({ error: "wigDataUrl required" });

  const b64  = wigDataUrl.split(",")[1];
  const mime = wigDataUrl.split(";")[0].replace("data:", "");

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
        max_tokens: 400,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this wig/hairpiece image. Return ONLY a raw JSON object — no markdown, no explanation, no code fences.

{
  "hairstyle_description": "<pick the single closest from: afro hairstyle, bob cut hairstyle, bowl cut hairstyle, braid hairstyle, caesar cut hairstyle, curtains hairstyle, dreadlocks hairstyle, fade hairstyle, french crop hairstyle, hi-top fade hairstyle, medium length hairstyle, mohawk hairstyle, mullet hairstyle, pompadour hairstyle, ponytail hairstyle, quiff hairstyle, shag hairstyle, short hairstyle, side part hairstyle, slick back hairstyle, straight hairstyle, taper hairstyle, textured hairstyle, undercut hairstyle, wavy hairstyle, long hairstyle, curly hairstyle, pixie cut hairstyle, lob hairstyle, beach waves hairstyle>",
  "color_description": "<natural color: black, dark brown, medium brown, light brown, blonde, platinum blonde, auburn, red, burgundy, silver, gray, or ombre description>",
  "editing_type": "both",
  "style_summary": "<2 warm sentences describing this wig's look and vibe>"
}`
            },
            {
              type: "image",
              source: { type: "base64", media_type: mime, data: b64 }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.find(b => b.type === "text")?.text || "{}";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.status(200).json(parsed);
  } catch (e) {
    console.error("analyze-wig error:", e);
    res.status(500).json({ error: e.message });
  }
}
