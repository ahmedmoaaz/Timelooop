# TimeLoop

AI-powered productivity tracking app with a Chrome extension that records website time and syncs it to the dashboard.

## Run locally

```powershell
Copy-Item .env.example .env
# edit .env with GOOGLE_CLIENT_ID, MONGODB_URI, and OPENAI_API_KEY
npm start
```

Open `http://localhost:3000`.

Google sign-in will not render until `GOOGLE_CLIENT_ID` is set. In Google Cloud Console, add these Authorized JavaScript origins:

- `http://localhost:3000`
- your Vercel URL, for example `https://your-project.vercel.app`

## Deploy to Vercel

Add these environment variables in Vercel Project Settings:

- `GOOGLE_CLIENT_ID`
- `MONGODB_URI`
- `MONGODB_DB` with value `timeloop`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` with value `gpt-4.1-mini`

The repo includes `vercel.json`, so Vercel serves the static app from `public/` and sends all `/api/*` requests to the serverless API.

## Chrome extension

The unpacked extension lives in `extension/`. In Chrome:

1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Click **Load unpacked**
4. Select this repo's `extension` folder
5. Sign in to TimeLoop, open **Extension Setup**, copy your User ID, and paste it in the extension popup.
6. Set the API URL to your running app, such as `http://localhost:3000` locally or your Vercel URL in production.

The app also serves a generated ZIP from `public/extension/` after running:

```powershell
npm run build:extension
```
