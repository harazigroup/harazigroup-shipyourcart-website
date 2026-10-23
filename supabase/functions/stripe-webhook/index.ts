// Ship Your Cart — "stripe-webhook" Edge Function (turn OFF "Verify JWT")
// Stripe → Developers → Webhooks → endpoint https://lmwpilpcuxyzpygylclq.supabase.co/functions/v1/stripe-webhook
// Event: checkout.session.completed  ·  Secrets: STRIPE_WEBHOOK_SECRET
import { createClient } from "jsr:@supabase/supabase-js@2";

function serviceKey() {
  const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (k) return k;
  const s = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  try { const o = JSON.parse(s); return (Object.values(o)[0] as string) || ""; } catch { return s; }
}

const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey());
const SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

async function valid(payload: string, header: string) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts["t"];
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 600) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`)));
  const hex = Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.includes(hex);
}

Deno.serve(async (req) => {
  const payload = await req.text();
  if (!(await valid(payload, req.headers.get("stripe-signature") || ""))) return new Response("bad signature", { status: 400 });
  const ev = JSON.parse(payload);
  if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
    const cs = ev.data.object;
    const id = Number(cs.metadata?.shipment_id);
    if (id && cs.payment_status === "paid") {
      await admin.from("shipments").update({ status: "paid", paid_at: new Date().toISOString(), stripe_session_id: cs.id })
        .eq("id", id).eq("status", "quoted");
    }
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
