import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const keyStr = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32ch'
  if (keyStr.length < 32) {
    return scryptSync(keyStr, 'dr-dent-salt', KEY_LENGTH)
  }
  return Buffer.from(keyStr.slice(0, KEY_LENGTH))
}

export function encrypt(text: string): string {
  if (!text) return ''

  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encrypted: string): string {
  if (!encrypted) return ''

  try {
    const [ivHex, authTagHex, encryptedText] = encrypted.split(':')
    if (!ivHex || !authTagHex || !encryptedText) {
      return Buffer.from(encrypted, 'base64').toString('utf-8')
    }

    const key = getKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch {
    try {
      return Buffer.from(encrypted, 'base64').toString('utf-8')
    } catch {
      return encrypted
    }
  }
}

export function hashForComparison(text: string): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(text).digest('hex')
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '****'
  return key.slice(0, 4) + '****' + key.slice(-4)
}

export function validateApiKeyFormat(key: string, provider: 'openai' | 'google' | 'stripe'): boolean {
  if (!key) return false

  switch (provider) {
    case 'openai':
      return key.startsWith('sk-') && key.length > 20
    case 'google':
      return key.length > 20
    case 'stripe':
      return key.startsWith('sk_') && key.length > 20
    default:
      return key.length > 10
  }
}
