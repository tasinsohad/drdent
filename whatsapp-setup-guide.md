# 🚀 WhatsApp Railway (Runway) Integration Guide

This guide will help you connect your WhatsApp to the **Dr. Dent** app using the QR Code (unoffical) method hosted on **Railway.app**.

## Prerequisites
- A **GitHub** account with your Dr. Dent repository pushed to it.
- A **Railway.app** account.
- A WhatsApp account on your phone ready to scan a QR code.

---

## Step 1: Deploy the WhatsApp Service to Railway

1.  Log in to [Railway](https://railway.app/).
2.  Click **"New Project"** -> **"Deploy from GitHub repo"**.
3.  Select your **Dr. Dent** repository.
4.  Once the project is created, click on the service card.
5.  Go to **Settings** -> **General** -> **Root Directory**.
6.  Change it to: `whatsapp-service`.
7.  Click **Save**. Railway will now redeploy only the WhatsApp sub-folder.

## Step 2: Configure Environment Variables

In your Railway service, go to the **Variables** tab and add the following:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `https://your-dr-dent.vercel.app` | The URL where your main app is hosted. |
| `WHATSAPP_SERVICE_API_KEY` | `default-secret` | A secure key (keep as `default-secret` for now). |
| `PORT` | `3001` | The port the service runs on. |

> [!TIP]
> You can find your **NEXT_PUBLIC_APP_URL** and other values ready to copy in your app's **Settings -> WhatsApp** tab.

## Step 3: Link to Dr. Dent

1.  In Railway, go to **Settings** -> **Networking** and click **"Generate Domain"** (if not already done).
2.  Copy the generated URL (e.g., `https://whatsapp-service-production.up.railway.app`).
3.  In your Dr. Dent app, go to **Settings -> WhatsApp**.
4.  Select **"QR Code Connection"**.
5.  Paste your Railway URL into the **Service URL** field.
6.  Click **"Save QR Settings"**.
7.  Click **"Retry Connection"** and wait for the QR code to appear.
8.  **Scan it!** 🤳

---

## Important Warnings

> [!CAUTION]
> **Risk of Ban:** Using unofficial WhatsApp libraries (`whatsapp-web.js`) can lead to your number being flagged if used for high-volume messaging or spam. We recommend using a secondary number for testing.

> [!NOTE]
> For a more stable and official connection, consider the **Meta Official API** method also available in the settings.
