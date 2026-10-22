/**
 * Derivação de hash de senha local (PBKDF2/SHA-256 via WebCrypto).
 * Tudo acontece no navegador — nenhuma senha sai do dispositivo.
 */

const ITERATIONS = 150000
const KEY_LENGTH = 256

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomSalt() {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return toHex(bytes)
}

function subtleAvailable() {
  return typeof crypto !== 'undefined' && !!crypto.subtle
}

async function derive(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH
  )
  return toHex(bits)
}

/**
 * Fallback simples para contextos sem WebCrypto (ex.: http sem localhost).
 * Não é criptografia forte — serve apenas para não bloquear o usuário.
 */
function weakFallback(password, salt) {
  let hash = 0x811c9dc5
  const input = `${salt}:${password}`
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `weak$${hash.toString(16).padStart(8, '0')}`
}

export async function createPassword(password) {
  const salt = randomSalt()
  const hash = subtleAvailable() ? await derive(password, salt) : weakFallback(password, salt)
  return { hash, salt, strong: subtleAvailable() }
}

export async function verifyPassword(password, hash, salt) {
  if (!hash) return false
  if (String(hash).startsWith('weak$')) {
    return weakFallback(password, salt) === hash
  }
  if (!subtleAvailable()) return false
  const candidate = await derive(password, salt)
  return candidate === hash
}
