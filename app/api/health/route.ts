// Process health only. CRM, email, and webhook readiness need a separate
// controlled end-to-end test; never expose integration settings here.
export const dynamic = "force-dynamic"

export function GET() {
  return Response.json({ ok: true }, {
    headers: { "Cache-Control": "no-store" },
  })
}
