import crypto from "crypto";

// Convert encryption key to buffer
const getEncryptionKey = () => {
  const keyStr = process.env.ENCRYPTION_KEY;
  
  if (!keyStr) {
    console.warn("WARNING: ENCRYPTION_KEY not set in environment. Using fallback (NOT SECURE for production)");
    return crypto.randomBytes(32);
  }

  // If key is 64 hex characters (32 bytes in hex), convert from hex
  if (keyStr.length === 64 && /^[a-f0-9]{64}$/i.test(keyStr)) {
    return Buffer.from(keyStr, "hex");
  }

  // If key is 32 characters, treat as direct 32-byte key
  if (keyStr.length === 32) {
    return Buffer.from(keyStr);
  }

  // Hash the key to get a consistent 32-byte key
  console.warn("ENCRYPTION_KEY format not recognized. Hashing to create 32-byte key");
  return crypto.createHash("sha256").update(keyStr).digest();
};

const ENCRYPTION_KEY = getEncryptionKey();
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt text using AES-256-CBC
 * @param {string} text - The plain text to encrypt
 * @returns {string} - Encrypted text in format: iv:encryptedData (both hex encoded)
 */
export const encryptMessage = (text) => {
  if (!text) return text;

  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher with AES-256-CBC
    const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Return IV and encrypted data separated by colon
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error.message);
    throw new Error("Failed to encrypt message");
  }
};

/**
 * Decrypt text using AES-256-CBC
 * @param {string} encryptedText - The encrypted text in format: iv:encryptedData
 * @returns {string} - Decrypted plain text
 */
export const decryptMessage = (encryptedText) => {
  if (!encryptedText) return encryptedText;

  try {
    // Check if it looks like an encrypted message
    if (typeof encryptedText !== "string" || !encryptedText.includes(":")) {
      console.warn("Message does not appear to be encrypted, returning as-is");
      return encryptedText;
    }

    // Split IV and encrypted data
    const parts = encryptedText.split(":");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error("Invalid encrypted message format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];

    // Create decipher with AES-256-CBC
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);

    // Decrypt the data
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error.message);
    // Return a safe fallback instead of throwing
    return "[Unable to decrypt message]";
  }
};
