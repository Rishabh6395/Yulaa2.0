import crypto from 'crypto';

export function hashPassword(password: string): string {
    if (!password) throw new Error('Password is required');

    const hash = crypto
        .createHash('sha256')
        .update(password, 'utf8')
        .digest();

    return Buffer.from(hash).toString('base64');
}


export function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}