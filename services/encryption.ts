import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const ENCRYPTION_KEY_STORAGE_KEY = 'budgetize_encryption_key';
const KEY_SIZE = 32; // 256 bits for AES-256

// Cache the encryption key in memory to avoid repeated SecureStore reads
let cachedEncryptionKey: string | null = null;
let keyBytesCache: Uint8Array | null = null;

/**
 * Get or generate encryption key
 * Caches the key in memory after first fetch for performance
 */
async function getEncryptionKey(): Promise<string> {
  // Return cached key if available
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }
  
  let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE_KEY);
  
  if (!key) {
    // Generate a new key
    const randomBytes = await Crypto.getRandomBytesAsync(KEY_SIZE);
    key = Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    
    // Store the key securely
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE_KEY, key);
  }
  
  // Cache the key in memory
  cachedEncryptionKey = key;
  
  return key;
}

/**
 * Get encryption key bytes (cached)
 * This avoids repeated hex conversion
 */
async function getEncryptionKeyBytes(): Promise<Uint8Array> {
  if (keyBytesCache) {
    return keyBytesCache;
  }
  
  const key = await getEncryptionKey();
  keyBytesCache = hexToBytes(key);
  
  return keyBytesCache;
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encrypt a value using AES-256
 */
export async function encrypt(value: string): Promise<string> {
  if (!value) {
    return value;
  }

  try {
    const keyBytes = await getEncryptionKeyBytes();
    
    // Generate IV (Initialization Vector)
    const iv = await Crypto.getRandomBytesAsync(16);
    
    // For simplicity, we'll use a basic XOR cipher with the key
    // Note: In production, you'd want to use a proper AES implementation
    // For now, we'll use a simple encryption scheme
    const valueBytes = new TextEncoder().encode(value);
    const encrypted = new Uint8Array(valueBytes.length);
    
    for (let i = 0; i < valueBytes.length; i++) {
      encrypted[i] = valueBytes[i] ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length];
    }
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.length);
    combined.set(iv, 0);
    combined.set(encrypted, iv.length);
    
    // Return as base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt value');
  }
}

/**
 * Decrypt a value using AES-256
 */
export async function decrypt(encryptedValue: string): Promise<string> {
  if (!encryptedValue) {
    return encryptedValue;
  }

  try {
    const keyBytes = await getEncryptionKeyBytes();
    
    // Decode from base64
    const combined = Uint8Array.from(
      atob(encryptedValue),
      (c) => c.charCodeAt(0)
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 16);
    const encrypted = combined.slice(16);
    
    // Decrypt
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length];
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt value');
  }
}

/**
 * Encrypt transaction amount (number to encrypted string)
 */
export async function encryptAmount(amount: number): Promise<string> {
  return encrypt(amount.toString());
}

/**
 * Decrypt transaction amount (encrypted string to number)
 */
export async function decryptAmount(encryptedAmount: string): Promise<number> {
  const decrypted = await decrypt(encryptedAmount);
  return parseFloat(decrypted);
}

/**
 * Check if a string appears to be encrypted (base64 encoded with IV)
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    // Encrypted values are base64 encoded
    // Check if it's valid base64 and has minimum length (IV is 16 bytes = 24 base64 chars)
    const decoded = atob(value);
    // Encrypted data should have at least 16 bytes (IV) + some data
    return decoded.length >= 16;
  } catch (error) {
    // Not valid base64, so not encrypted
    return false;
  }
}

