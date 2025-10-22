export const runtime = 'nodejs'
export const preferredRegion = ['hnd1']

export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      now: new Date().toISOString(),
      regionHint: 'hnd1 (Tokyo) preferred',
    }),
    { headers: { 'content-type': 'application/json' } }
  )
}


