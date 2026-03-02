const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const DEFAULT_OBJECT_ID = Number(process.env.TELEGRAM_DEFAULT_OBJECT_ID || NaN)

function assertBotToken() {
  if (!BOT_TOKEN) {
    throw createError({ statusCode: 500, statusMessage: 'Missing TELEGRAM_BOT_TOKEN env' })
  }
}

export async function sendTelegramMessage(tgChatId: number, text: string) {
  assertBotToken()
  return await $fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    body: {
      chat_id: tgChatId,
      text
    }
  })
}

export function verifyTelegramSecret(event: H3Event) {
  if (!WEBHOOK_SECRET) return true
  const header = getHeader(event, 'x-telegram-bot-api-secret-token')
  return header === WEBHOOK_SECRET
}

export function getDefaultObjectId(): number {
  if (!Number.isInteger(DEFAULT_OBJECT_ID) || DEFAULT_OBJECT_ID <= 0) {
    throw createError({ statusCode: 500, statusMessage: 'Set TELEGRAM_DEFAULT_OBJECT_ID env to valid object id' })
  }
  return DEFAULT_OBJECT_ID
}
