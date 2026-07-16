export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

export function ok(data: unknown = {}): Response {
  return json({ ok: true, ...((data && typeof data === 'object') ? data as object : { data }) });
}

export async function readJson<T>(request: Request, maxBytes = 64 * 1024): Promise<T> {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', '请求内容过大');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', '请求内容过大');
  }
  try {
    return JSON.parse(text || '{}') as T;
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'JSON 格式错误');
  }
}

export function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('cookie') || '';
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function sessionCookie(token: string, maxAge: number): string {
  return `sid=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return 'sid=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function assertSameOrigin(request: Request): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  if (!origin) return;
  const reqUrl = new URL(request.url);
  const originUrl = new URL(origin);
  if (originUrl.host !== reqUrl.host || originUrl.protocol !== reqUrl.protocol) {
    throw new HttpError(403, 'BAD_ORIGIN', '请求来源不受信任');
  }
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

export function asInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
