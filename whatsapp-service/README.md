# Dr. Dent — WhatsApp Bridge Service

This is a standalone Express.js service that acts as a bridge between **WhatsApp** (via `whatsapp-web.js`) and the **Dr. Dent** main app.

## Deployment (Railway)

This service is optimized for deployment on [Railway](https://railway.app/).

1.  Connect your repo to Railway.
2.  Set the **Root Directory** to `whatsapp-service`.
3.  Add the following Variables:
    - `NEXT_PUBLIC_APP_URL`: Your main app's URL.
    - `WHATSAPP_SERVICE_API_KEY`: Secret key for authentication.

## Local Development

```bash
npm install
npm run dev
```

The service will start on port 3001.

## Endpoints

- `GET /`: Health check.
- `GET /status`: Get connection status.
- `GET /qr`: Get the current QR code.
- `POST /send`: Send a message.
- `POST /disconnect`: Log out from WhatsApp.
