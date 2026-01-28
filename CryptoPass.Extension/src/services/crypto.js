// CryptoPass Extension - Crypto Service

class CryptoService {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
    this.ivLength = 12;
    this.iterations = 100000;
    // IMPORTANT: Must match UserApp's EncryptionService salt for compatibility
    this.salt = 'CryptoPass-Salt-v1';
  }

  // Derive encryption key from wallet signature - compatible with UserApp
  async deriveKey(signature) {
    const encoder = new TextEncoder();
    const signatureData = encoder.encode(signature);

    // Import signature as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      signatureData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Use fixed salt for compatibility with UserApp
    const salt = encoder.encode(this.salt);

    // Derive AES key - same parameters as UserApp
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    );

    return key;
  }

  // Encrypt data
  async encrypt(data, key) {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(JSON.stringify(data));

    const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));

    const encryptedData = await crypto.subtle.encrypt(
      { name: this.algorithm, iv: iv },
      key,
      dataBytes
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return this.arrayBufferToBase64(combined.buffer);
  }

  // Decrypt data
  async decrypt(encryptedBase64, key) {
    const combined = this.base64ToArrayBuffer(encryptedBase64);
    const combinedArray = new Uint8Array(combined);

    const iv = combinedArray.slice(0, this.ivLength);
    const encryptedData = combinedArray.slice(this.ivLength);

    const decryptedData = await crypto.subtle.decrypt(
      { name: this.algorithm, iv: iv },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedData));
  }

  // Hash data
  async hash(data) {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Generate random password
  generatePassword(length = 16, options = {}) {
    const {
      uppercase = true,
      lowercase = true,
      numbers = true,
      symbols = true
    } = options;

    let chars = '';
    if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (numbers) chars += '0123456789';
    if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    return Array.from(array, x => chars[x % chars.length]).join('');
  }

  // Utility functions
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Export singleton
const cryptoService = new CryptoService();
