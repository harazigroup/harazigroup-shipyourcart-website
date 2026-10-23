// Ship Your Cart — "checkout" Edge Function (signed-in customers only)
// POST { shipment_id, action?: "start" | "confirm", session_id? }
//  start   → creates a Stripe Embedded Checkout session for the shipment price, returns { clientSecret }
//  confirm → checks a finished session and marks the shipment as paid (the webhook does the same)
// Secrets: STRIPE_SECRET_KEY, SITE_URL
import { createClient } from "jsr:@supabase/supabase-js@2";

function serviceKey() {
  const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (k) return k;
  const s = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  try { const o = JSON.parse(s); return (Object.values(o)[0] as string) || ""; } catch { return s; }
}

const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, serviceKey());
const SITE = (Deno.env.get("SITE_URL") || "https://shipyourcart.com.my").replace(/\/$/, "");
const SK = Deno.env.get("STRIPE_SECRET_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function stripe(path: string, params?: Record<string, string>) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method: params ? "POST" : "GET",
    headers: { Authorization: `Bearer ${SK}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params ? new URLSearchParams(params) : undefined,
  });
  const b = await r.json();
  if (!r.ok) throw new Error(b?.error?.message || "Stripe error");
  return b;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const { data: u } = await admin.auth.getUser(auth.replace(/^Bearer /i, ""));
    if (!u?.user) return json({ error: "not signed in" }, 401);
    const { shipment_id, action = "start", session_id, lang = "en" } = await req.json();
    const { data: s } = await admin.from("shipments").select("*, customers(code,email,full_name)").eq("id", shipment_id).single();
    if (!s || s.customer_id !== u.user.id) return json({ error: "not found" }, 404);
    const pfx = lang === "ar" ? "/ar" : lang === "ms" ? "/ms-my" : "";

    if (action === "confirm") {
      if (!session_id) return json({ error: "missing session" }, 400);
      const cs = await stripe("checkout/sessions/" + encodeURIComponent(session_id));
      if (cs.metadata?.shipment_id === String(s.id) && cs.payment_status === "paid" && s.status === "quoted") {
        await admin.from("shipments").update({ status: "paid", paid_at: new Date().toISOString(), stripe_session_id: cs.id }).eq("id", s.id).eq("status", "quoted");
      }
      return json({ status: cs.payment_status });
    }

    if (s.status !== "quoted" || !s.price_rm) return json({ error: "not payable" }, 400);
    const cs = await stripe("checkout/sessions", {
      mode: "payment",
      ui_mode: "embedded",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "myr",
      "line_items[0][price_data][unit_amount]": String(Math.round(Number(s.price_rm) * 100)),
      "line_items[0][price_data][product_data][name]": `Shipment #${s.id} — ${s.customers.code}`,
      customer_email: s.customers.email,
      "metadata[shipment_id]": String(s.id),
      "metadata[customer_code]": s.customers.code,
      "payment_intent_data[metadata][shipment_id]": String(s.id),
      "payment_intent_data[description]": `Ship Your Cart shipment #${s.id} (${s.customers.code})`,
      return_url: `${SITE}${pfx}/account/?paid=${s.id}&session_id={CHECKOUT_SESSION_ID}`,
    });
    await admin.from("shipments").update({ stripe_session_id: cs.id }).eq("id", s.id);
    return json({ clientSecret: cs.client_secret });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
