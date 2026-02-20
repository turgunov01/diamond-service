interface SupabaseServerConfig {
  url: string
  serviceRoleKey: string
  avatarBucket: string
  passportBucket: string
}

function normalizeUrl(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

export function getSupabaseServerConfig(): SupabaseServerConfig {
  const config = useRuntimeConfig()
  const url = config.supabase?.url
  const serviceRoleKey = config.supabase?.serviceRoleKey
  const avatarBucket = config.supabase?.avatarBucket
  const passportBucket = config.supabase?.passportBucket

  if (typeof url !== 'string' || !url.length) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SUPABASE_URL is not configured.'
    })
  }

  if (typeof serviceRoleKey !== 'string' || !serviceRoleKey.length) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SUPABASE_SERVICE_ROLE_KEY is not configured.'
    })
  }

  return {
    url: normalizeUrl(url),
    serviceRoleKey,
    avatarBucket: typeof avatarBucket === 'string' && avatarBucket.length ? avatarBucket : 'customer-avatars',
    passportBucket: typeof passportBucket === 'string' && passportBucket.length ? passportBucket : 'customer-passports'
  }
}

export function getSupabaseServerHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`
  }
}
