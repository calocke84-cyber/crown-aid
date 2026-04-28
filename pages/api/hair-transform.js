export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
  maxDuration: 60,
};

const MAGIC_KEY  = process.env.MAGICAPI_KEY;
const MAGIC_BASE = "https://api.magicapi.dev/api/v1/magicapi/hair";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userDataUrl, wigDesc } = req.body;
  if (!userDataUrl || !wigDesc) return res.status(400).json({ error: "userDataUrl and wigDesc required" });

  try {
    // Submit to MagicAPI
    const submitRes = await fetch(`${MAGIC_BASE}/hair`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "x-magicapi-key": MAGIC_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: userDataUrl,
        editing_type: "both",
        hairstyle_description: wigDesc.hairstyle_description,
        color_description: wigDesc.color_description,
      }),
    });

    const submitData = await submitRes.json();
    if (!submitData.request_id) {
      return res.status(500).json({ error: `MagicAPI submit failed: ${JSON.stringify(submitData)}` });
    }

    const requestId = submitData.request_id;

    // Poll for result (server-side, no CORS issues)
    for (let i = 0; i < 30; i++) {
      await sleep(3000);
      const pollRes = await fetch(`${MAGIC_BASE}/predictions/${requestId}`, {
        headers: {
          "accept": "application/json",
          "x-magicapi-key": MAGIC_KEY,
        },
      });
      const pollData = await pollRes.json();

      if (pollData.status === "succeeded" && pollData.result) {
        return res.status(200).json({ resultUrl: pollData.result });
      }
      if (pollData.status === "failed") {
        return res.status(500).json({ error: "MagicAPI transformation failed" });
      }
    }

    res.status(504).json({ error: "Timed out waiting for MagicAPI result" });
  } catch (e) {
    console.error("hair-transform error:", e);
    res.status(500).json({ error: e.message });
  }
}
