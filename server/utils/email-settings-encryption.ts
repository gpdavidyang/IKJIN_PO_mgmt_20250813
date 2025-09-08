import crypto from 'crypto';

/**
 * 이메일 설정 비밀번호 암호화/복호화 서비스
 * AES-256-GCM 암호화 방식 사용
 */
export class EmailSettingsEncryption {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly keyLength = 32; // 256 bits
  private static readonly ivLength = 16;  // 128 bits
  
  /**
   * 암호화 키 생성 (환경 변수 기반)
   */
  private static getEncryptionKey(): Buffer {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production';
    // 환경 변수를 32바이트 키로 변환
    return crypto.scryptSync(secret, 'salt', this.keyLength);
  }
  
  /**
   * 비밀번호 암호화
   * @param plainText 평문 비밀번호
   * @returns 암호화된 문자열 (iv:tag:encrypted 형태)
   */
  static encrypt(plainText: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      cipher.setAAD(Buffer.from('email-settings', 'utf8'));
      
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // iv:tag:encrypted 형태로 반환
      return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('암호화 실패:', error);
      throw new Error('비밀번호 암호화에 실패했습니다');
    }
  }
  
  /**
   * 비밀번호 복호화
   * @param encryptedText 암호화된 문자열 (iv:tag:encrypted 형태)
   * @returns 평문 비밀번호
   */
  static decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('잘못된 암호화 형식');
      }
      
      const [ivHex, tagHex, encrypted] = parts;
      const key = this.getEncryptionKey();
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from('email-settings', 'utf8'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('복호화 실패:', error);
      throw new Error('비밀번호 복호화에 실패했습니다');
    }
  }
  
  /**
   * 암호화 테스트 함수
   */
  static test(): boolean {
    try {
      const testPassword = 'test-password-123';
      const encrypted = this.encrypt(testPassword);
      const decrypted = this.decrypt(encrypted);
      
      return testPassword === decrypted;
    } catch (error) {
      console.error('암호화 테스트 실패:', error);
      return false;
    }
  }
  
  /**
   * 안전한 비밀번호 비교
   * @param plainText 평문 비밀번호
   * @param encryptedText 암호화된 비밀번호
   * @returns 일치 여부
   */
  static compare(plainText: string, encryptedText: string): boolean {
    try {
      const decrypted = this.decrypt(encryptedText);
      return plainText === decrypted;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 이메일 설정 마스킹 (UI 표시용)
   * @param email 이메일 주소
   * @returns 마스킹된 이메일
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return '***@***.***';
    }
    
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 
      ? local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1)
      : local;
    
    return `${maskedLocal}@${domain}`;
  }
  
  /**
   * 호스트 정보 마스킹 (보안을 위해)
   * @param host SMTP 호스트
   * @returns 마스킹된 호스트
   */
  static maskHost(host: string): string {
    if (!host) return '***';
    
    if (host.includes('.')) {
      const parts = host.split('.');
      return parts.map((part, index) => 
        index === 0 || index === parts.length - 1 
          ? part 
          : '*'.repeat(part.length)
      ).join('.');
    }
    
    return host.length > 4 
      ? host.substring(0, 2) + '*'.repeat(host.length - 4) + host.substring(host.length - 2)
      : host;
  }
}

// 모듈 초기화 시 암호화 기능 테스트
if (process.env.NODE_ENV !== 'production') {
  if (EmailSettingsEncryption.test()) {
    console.log('✅ 이메일 설정 암호화 기능 정상 작동');
  } else {
    console.warn('⚠️ 이메일 설정 암호화 기능 테스트 실패');
  }
}