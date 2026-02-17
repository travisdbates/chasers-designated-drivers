import jwt from 'jsonwebtoken';

const JWT_SECRET = import.meta.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function verifyAdminToken(request: Request): boolean {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return false;

    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(cookie => {
        const [key, ...valueParts] = cookie.split('=');
        return [key, valueParts.join('=')];
      })
    );

    const token = cookies['admin_token'];
    if (!token) return false;

    const decoded = jwt.verify(token, JWT_SECRET) as { admin: boolean };
    return decoded.admin === true;
  } catch (error) {
    return false;
  }
}

export function createUnauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
