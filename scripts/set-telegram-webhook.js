// Simple helper to register Telegram webhook using env vars.
// Usage: npm run set:webhook
// Required env:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_WEBHOOK_URL (e.g. https://your-host/api/telegram/webhook)
// Optional env:
//   TELEGRAM_WEBHOOK_SECRET (recommended)
//   TELEGRAM_ALLOWED_UPDATES (JSON array, default ["message","my_chat_member"])

const token = process.env.TELEGRAM_BOT_TOKEN
const url = process.env.TELEGRAM_WEBHOOK_URL
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
const allowedUpdates = process.env.TELEGRAM_ALLOWED_UPDATES
  ? JSON.parse(process.env.TELEGRAM_ALLOWED_UPDATES)
  : ['message', 'my_chat_member']

if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN')
  process.exit(1)
}

if (!url) {
  console.error('Missing TELEGRAM_WEBHOOK_URL')
  process.exit(1)
}

const endpoint = `https://api.telegram.org/bot${token}/setWebhook`

const body = {
  url,
  allowed_updates: allowedUpdates
}

if (secret) {
  body.secret_token = secret
}

async function main() {
  console.log('Setting webhook...')
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })

  const json = await res.json().catch(() => ({}))
  if (!json.ok) {
    console.error('Failed to set webhook', json)
    process.exit(1)
  }

  console.log('Webhook set OK')
  console.log(JSON.stringify(json, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
