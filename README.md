# CrownAid — Virtual Wig Try-On

AI-powered wig try-on for women with medical hair loss. Upload your selfie + any wig image — Claude reads the wig style and MagicAPI applies it directly to your photo.

---

## Deploy to Vercel (10 minutes)

### Option A — GitHub (recommended)

1. **Create a GitHub repo**
   - Go to github.com → New repository → name it `crownaid` → Create
   - Upload all these files (drag the whole folder into the repo)

2. **Connect to Vercel**
   - Go to vercel.com → Sign up/Log in with GitHub
   - Click **Add New Project** → Import your `crownaid` repo
   - Framework: **Next.js** (auto-detected)
   - Click **Environment Variables** and add:
     ```
     ANTHROPIC_API_KEY = your_anthropic_api_key
     MAGICAPI_KEY = cmohy2yet0006l704813sduhh
     ```
   - Click **Deploy**

3. **Get your URL**
   - Vercel gives you a URL like `crownaid.vercel.app`
   - That's it — fully working, no CORS issues

### Option B — Vercel CLI

```bash
npm i -g vercel
cd crownaid
vercel
# Follow prompts, then add env vars in Vercel dashboard
```

---

## Get your Anthropic API Key

1. Go to console.anthropic.com
2. Sign in → API Keys → Create Key
3. Copy and paste into Vercel environment variables as `ANTHROPIC_API_KEY`

---

## Local Development

```bash
# 1. Copy env file
cp .env.example .env.local

# 2. Fill in your keys in .env.local

# 3. Install and run
npm install
npm run dev

# 4. Open http://localhost:3000
```

---

## How It Works

1. User uploads selfie + wig image
2. `/api/analyze-wig` — Claude Vision reads the wig and identifies style + color
3. `/api/hair-transform` — MagicAPI applies the hairstyle to the selfie server-side
4. `/api/consultation` — Claude Vision writes a personalized fit consultation
5. Results displayed with insurance reimbursement reminder (HCPCS A9282)

---

## Stack

- **Next.js 14** — React framework with API routes (no CORS)
- **Claude Sonnet** — Wig analysis + style consultation
- **MagicAPI Hair v2** — AI hair transformation
- **Vercel** — Deployment
