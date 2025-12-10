import AES from 'crypto-js/aes';
import encUtf8 from 'crypto-js/enc-utf8';

// Secret key should be in env vars. 
// Note: For client-side encryption, the key must be exposed to the client (NEXT_PUBLIC_).
// This protects against network sniffing (TLS stripping) but not against a compromised client.
const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'oracle-default-secret-key-change-me';

export const encryptData = (data: string): string => {
    return AES.encrypt(data, SECRET_KEY).toString();
};

export const decryptData = (ciphertext: string): string => {
    const bytes = AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(encUtf8);
};
