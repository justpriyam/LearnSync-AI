import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ token: null }, { status: 401 });
  }

  // Create a simple JWT with the user's Google sub ID to send to our backend
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ token: null }, { status: 500 });
  }

  // Use the jose library (bundled with next-auth) to create a JWT
  const { SignJWT } = await import('jose');
  const token = await new SignJWT({
    sub: (session.user as any).id,
    email: session.user.email,
    name: session.user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));

  return NextResponse.json({ token });
}
