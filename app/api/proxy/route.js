export const dynamic = 'force-dynamic';
export async function GET(req) {
  const path = new URL(req.url).searchParams.get('path');
  if (!path) return Response.json({ error: 'path yok' }, { status: 400 });
  try {
    const r = await fetch('https://yxceotpservice.vercel.app' + path, { cache: 'no-store' });
    return Response.json(await r.json());
  } catch { return Response.json({ error: 'upstream' }, { status: 500 }); }
}
