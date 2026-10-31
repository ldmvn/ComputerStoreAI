export const dynamic = 'force-dynamic';

export function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return new Response(null, { status: 404 });
  }
  return Response.json({ service: 'computerstoreai-frontend', status: 'ok' });
}
