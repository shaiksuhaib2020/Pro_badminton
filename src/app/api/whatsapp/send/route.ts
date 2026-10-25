export async function POST(req: Request) {
  const body = await req.json()
  console.log('[WhatsApp stub] Would send:', body)
  // Phase 2: replace with real Meta Cloud API call
  return Response.json({ success: true, messageId: `mock-${Date.now()}` })
}
