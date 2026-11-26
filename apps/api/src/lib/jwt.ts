import { jwtVerify, SignJWT } from 'jose';

const ISSUER = 'boveda-tcg';

export type AccessClaims = { sub: string; sid: string };
export type MfaClaims = { sub: string };

export class TokenService {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly accessTtlSeconds: number,
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  signAccess(claims: AccessClaims): Promise<string> {
    return new SignJWT({ sid: claims.sid, typ: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(claims.sub)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime(`${this.accessTtlSeconds}s`)
      .sign(this.key);
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    const { payload } = await jwtVerify(token, this.key, { issuer: ISSUER, algorithms: ['HS256'] });
    if (payload.typ !== 'access' || !payload.sub || typeof payload.sid !== 'string') {
      throw new Error('Token inválido');
    }
    return { sub: payload.sub, sid: payload.sid };
  }

  /** Token corto (5 min) entre la contraseña correcta y el segundo factor. */
  signMfa(claims: MfaClaims): Promise<string> {
    return new SignJWT({ typ: 'mfa' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(claims.sub)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(this.key);
  }

  async verifyMfa(token: string): Promise<MfaClaims> {
    const { payload } = await jwtVerify(token, this.key, { issuer: ISSUER, algorithms: ['HS256'] });
    if (payload.typ !== 'mfa' || !payload.sub) throw new Error('Token inválido');
    return { sub: payload.sub };
  }
}
