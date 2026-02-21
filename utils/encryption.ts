import AES from 'crypto-js/aes';
import encUtf8 from 'crypto-js/enc-utf8';

const getSecretKey = (): string => {
    return (process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '').trim();
};

export const isEncryptionAvailable = (): boolean => {
    return getSecretKey().length > 0;
};

export const encryptData = (data: string): string => {
    const key = getSecretKey();
    if (!key) {
        throw new Error('Encryption key is not configured');
    }
    return AES.encrypt(data, key).toString();
};

export const decryptData = (ciphertext: string): string => {
    const key = getSecretKey();
    if (!key) {
        throw new Error('Encryption key is not configured');
    }
    const bytes = AES.decrypt(ciphertext, key);
    return bytes.toString(encUtf8);
};
