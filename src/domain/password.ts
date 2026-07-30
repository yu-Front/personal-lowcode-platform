const encoder = new TextEncoder()

const toBase64 = (bytes: Uint8Array) => {
  let value = ''
  bytes.forEach((byte) => { value += String.fromCharCode(byte) })
  return btoa(value)
}

const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0))

export function createPasswordSalt() {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)))
}

export async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations: 120000 }, key, 256)
  return toBase64(new Uint8Array(bits))
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  return hashPassword(password, salt).then((hash) => hash === expectedHash)
}
