# 🚂 Railway Deployment Guide for Dr. Dent

To get WhatsApp connected via the QR code method, you need to host the **WhatsApp Bridge Service** (located in the `/whatsapp-service` folder) on a persistent server like Railway.

## 1. What to Upload?
You should upload your **entire project repository** to GitHub. Railway will connect to this repository. You do **not** need to upload folders manually.

**The key files Railway will use are:**
- `whatsapp-service/Dockerfile`: Tells Railway how to install Chrome and Node.js.
- `whatsapp-service/index.js`: The actual code that talks to WhatsApp.
- `whatsapp-service/railway.json`: Tells Railway to look inside the subfolder.

---

## 2. How to Upload & Connect

### Step A: Push to GitHub
If you haven't already, push your code to a GitHub repository.
```bash
git add .
git commit -m "Configure WhatsApp service for Railway deployment"
git push origin main
```

### Step B: Create Railway Service
1.  Go to **[Railway.app](https://railway.app/)** and log in.
2.  Click **+ New Project** > **Deploy from GitHub repo**.
3.  Select your **Dr. Dent** repository.
4.  Once the service is created, click on it to open the settings.

### Step C: Configure the Subfolder (Crucial!)
Railway needs to know the code is inside `whatsapp-service`, not the root.
1.  Go to the **Settings** tab.
2.  Find the **General** section -> **Root Directory**.
3.  Change it from `/` to `/whatsapp-service`.
4.  Click **Save**. Railway will automatically start a new build.

### Step D: Add Variables
Go to the **Variables** tab and add these three:
- `NEXT_PUBLIC_APP_URL`: Your main app URL (e.g., `https://dr-dent.vercel.app`).
- `WHATSAPP_SERVICE_API_KEY`: Set this to `default-secret`.
- `PORT`: `3001`

---

## 3. Connecting to your App
1.  In Railway, go to **Settings** > **Networking**.
2.  Click **Generate Domain** to get a public link (e.g., `https://service-production.up.railway.app`).
3.  Go to your **Dr. Dent Settings** > **WhatsApp** tab.
4.  Paste that link into the **Service URL** box.
5.  Click **Save QR Settings**.
6.  Click **Retry Connection**—your QR code will appear within seconds!
