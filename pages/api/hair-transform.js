export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
  maxDuration: 60,
};

const VMODEL_TOKEN = "uDmN-wgjm2WStewP2zwLZgVj5SoBFA9jg5Ls-eaDD7IrTVJw6MDVlmsvJBebRNW3rZsu212GaZ2yZZEEkY8fVg==";
const VMODEL_VERSION = "5c0440717a995b0bbd93377bd65dbb4fe360f67967c506aa6bd8f6b660733a7e";
const UPLOAD_IO_KEY = "secret_223k2dt67khWHxHMFGaYxNEaK4ew";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const uploadImage = async (dataUrl) => {
  const base64 = dataUrl.split(",")[1];
  const mimeType = dataUrl.split(";")[0].replace("data:", "");
  const buffer = Buffer.from(base64, "base64");

  const res = await fetch("https://api.upload.io/v2/accounts/223k2dt/uploads/binary", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${UPLOAD_IO_KEY}`,
      "Content-Type": mimeType,
    },
    body: buffer,
  });

  const data = await res.json();
  if (!data.fileUrl) throw new Error("Image upload failed: " + JSON.stringify(data));
  return data.fileUrl;
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userDataUrl, wigDataUrl } = req.body;
  if (!userDataUrl || !wigDataUrl) return res.status(400).json({ error: "Both images required" });

  try {
    const [userUrl, wigUrl] = await Promise.all([
      uploadImage(userDataUrl),
      uploadImage(wigDataUrl),
    ]);

    const submitRes = await fetch("https://api.vmodel.ai/api/tasks/v1/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VMODEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: VMODEL_VERSION,
        input: {
          source: wigUrl,
          target: userUrl,
          disable_safety_checker: false,
        },
      }),
    });

    const submitData = await submitRes.json();
    const taskId = submitData.result?.task_id || submitData.task_id;
if (!taskId) throw new Error("VModel submit failed: " + JSON.stringify(submitData));

    for (let i = 0; i < 30; i++) {
      await sleep(3000);
      const pollRes = await fetch(`https://api.vmodel.ai/api/tasks/v1/${taskId}`, {
        headers: { "Authorization": `Bearer ${VMODEL_TOKEN}` },
      });
      const pollData = await pollRes.json();

      if (pollData.status === "succeeded" && pollData.output?.[0]) {
        return res.status(200).json({ resultUrl: pollData.output[0] });
      }
      if (pollData.status === "failed") {
        return res.status(500).json({ error: "VModel failed: " + JSON.stringify(pollData) });
      }
    }

    res.status(504).json({ error: "Timed out" });
  } catch (e) {
    console.error("hair-transform error:", e);
    res.status(500).json({ error: e.message });
  }
}
