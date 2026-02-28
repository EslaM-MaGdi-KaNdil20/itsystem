const crypto = require('crypto');

// مفتاح التشفير - يجب حفظه في .env في الإنتاج
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!'; // Must be 32 characters
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * تشفير النص
 * @param {string} text - النص المراد تشفيره
 * @returns {string} - النص المشفر
 */
function encrypt(text) {
  if (!text) return null;
  
  try {
    // Create a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher with key
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
      iv
    );
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return iv + encrypted text (concatenated)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('فشل في تشفير البيانات');
  }
}

/**
 * فك تشفير النص
 * @param {string} encryptedText - النص المشفر
 * @returns {string} - النص الأصلي
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  
  try {
    // Split iv and encrypted text
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // Create decipher
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
      iv
    );
    
    // Decrypt the text
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('فشل في فك تشفير البيانات');
  }
}

/**
 * التحقق من صحة التشفير
 */
function testEncryption() {
  try {
    const testText = 'MySecurePassword123!';
    const encrypted = encrypt(testText);
    const decrypted = decrypt(encrypted);
    
    if (testText === decrypted) {
      console.log('✅ Encryption/Decryption test passed');
      return true;
    } else {
      console.error('❌ Encryption/Decryption test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Encryption test error:', error);
    return false;
  }
}

module.exports = {
  encrypt,
  decrypt,
  testEncryption
};
