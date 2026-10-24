// Ship Your Cart — "notify" Edge Function
// Called by database triggers (see schema_v2.sql) with { table, id }.
// Reads the current row itself and sends the matching emails once (email_log).
// Secrets: RESEND_API_KEY, SITE_URL, MAIL_FROM, MAIL_REPLY_TO, ADMIN_EMAIL
import { createClient } from "jsr:@supabase/supabase-js@2";

function serviceKey() {
  const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (k) return k;
  const s = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  try { const o = JSON.parse(s); return (Object.values(o)[0] as string) || ""; } catch { return s; }
}

const sb = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey());
const SITE = (Deno.env.get("SITE_URL") || "https://shipyourcart.com.my").replace(/\/$/, "");
const FROM = Deno.env.get("MAIL_FROM") || "Ship Your Cart <info@shipyourcart.com.my>";
const REPLY = Deno.env.get("MAIL_REPLY_TO") || "shipyourcart@gmail.com";
const ADMIN = Deno.env.get("ADMIN_EMAIL") || "shipyourcart@gmail.com";
const WA = "60107070190";

type L = "en" | "ar" | "ms";
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const rm = (n: unknown) => "RM " + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
const accUrl = (l: L) => `${SITE}${l === "ar" ? "/ar" : l === "ms" ? "/ms-my" : ""}/account/`;

const T = {
  en: { hi: "Hello", team: "The Ship Your Cart team", acc: "Open my account", foot: "Ship Your Cart · WIZZ SMART SERVICES SDN. BHD. · Kuala Lumpur, Malaysia", help: "Questions? Reply to this email or WhatsApp us at +60 10-707 0190." },
  ar: { hi: "أهلاً", team: "فريق Ship Your Cart", acc: "افتح حسابي", foot: "Ship Your Cart · WIZZ SMART SERVICES SDN. BHD. · كوالالمبور، ماليزيا", help: 'عندك سؤال؟ رد على هذا الإيميل أو كلّمنا واتساب على <span dir="ltr">+60 10-707 0190</span>.' },
  ms: { hi: "Hai", team: "Pasukan Ship Your Cart", acc: "Buka akaun saya", foot: "Ship Your Cart · WIZZ SMART SERVICES SDN. BHD. · Kuala Lumpur, Malaysia", help: "Ada soalan? Balas e-mel ini atau WhatsApp +60 10-707 0190." },
};

function layout(l: L, title: string, body: string, btn?: { text: string; url: string }) {
  const rtl = l === "ar";
  const dir = rtl ? "rtl" : "ltr", al = rtl ? "right" : "left";
  const font = rtl ? "Tahoma,Arial,sans-serif" : "Arial,Helvetica,sans-serif";
  const button = btn ? `<tr><td style="padding:8px 32px 8px" align="${al}"><a href="${btn.url}" style="display:inline-block;background:#ff8a2a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:999px;font-family:${font}">${esc(btn.text)}</a></td></tr>` : "";
  return `<!doctype html><html lang="${l}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f3effd">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3effd"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:20px;overflow:hidden;font-family:${font};color:#22183f" dir="${dir}">
<tr><td align="center" style="padding:24px 24px 12px;background:#ffffff"><img src="${SITE}/assets/img/email-logo.png" width="170" alt="Ship Your Cart" style="display:block;border:0;width:170px;height:auto"></td></tr>
<tr><td style="height:6px;background:linear-gradient(90deg,#7a4fd0,#ff8a2a);background-color:#7a4fd0;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:28px 32px 6px" align="${al}"><h1 style="margin:0;font-size:22px;line-height:1.35;color:#2b1a5e;font-family:${font}">${esc(title)}</h1></td></tr>
<tr><td style="padding:6px 32px 12px;font-size:15px;line-height:1.7;color:#3b2f63" align="${al}">${body}</td></tr>
${button}
<tr><td style="padding:18px 32px 26px;font-size:13px;line-height:1.6;color:#6f6690" align="${al}">${T[l].help}<br>${esc(T[l].team)}</td></tr>
<tr><td align="center" style="background:#2b1a5e;color:#cfc3f5;font-size:12px;padding:16px 20px;font-family:${font}">${esc(T[l].foot)}<br><a href="${SITE}" style="color:#ffb27a;text-decoration:none">${SITE.replace(/^https?:\/\//, "")}</a> · <a href="https://wa.me/${WA}" style="color:#ffb27a;text-decoration:none">WhatsApp</a></td></tr>
</table></td></tr></table></body></html>`;
}
const box = (rows: [string, string][], ltr = false) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2ff;border-radius:14px;margin:12px 0" ${ltr ? 'dir="ltr"' : ""}>` +
  rows.map(([k, v]) => `<tr><td style="padding:7px 14px;color:#7a4fd0;font-weight:bold;font-size:14px;white-space:nowrap;vertical-align:top" ${ltr ? 'align="left"' : ""}>${esc(k)}</td><td style="padding:7px 14px;font-size:14px;font-weight:bold;color:#22183f" ${ltr ? 'align="left"' : ""}>${v}</td></tr>`).join("") + "</table>";
const codeTag = (c: string) => `<span style="display:inline-block;background:#ff8a2a;color:#fff;font-weight:bold;font-size:20px;letter-spacing:1px;padding:6px 14px;border-radius:10px" dir="ltr">${esc(c)}</span>`;

async function send(key: string, to: string, subject: string, html: string) {
  const ins = await sb.from("email_log").insert({ key });
  if (ins.error) return "skip"; // already sent
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY, subject, html }),
  });
  if (!r.ok) { await sb.from("email_log").delete().eq("key", key); return "fail " + (await r.text()); }
  return "sent";
}

const lang = (c: { lang?: string }): L => (c?.lang === "ar" || c?.lang === "ms" ? c.lang : "en") as L;
const addrRows = (code: string, name: string): [string, string][] => [
  ["Full name", esc(name + " " + code)], ["Address line 1", "No.37, Jalan Cempaka 3A"], ["Address line 2", esc("Kawasan Perindustrian Anugerah Suria, " + code)],
  ["Postcode", "48000"], ["City", "Rawang"], ["State", "Selangor"], ["Country", "Malaysia"], ["Phone", "+60 10-707 0190"],
];
const ST = { requested: "طلب جديد", quoted: "تم التسعير", paid: "مدفوع", shipped: "تم الشحن", delivered: "تم التسليم", cancelled: "ملغى" } as Record<string, string>;

async function onCustomer(id: string) {
  const { data: c } = await sb.from("customers").select("*").eq("id", id).single();
  if (!c) return [];
  // wait until the customer has confirmed their email (if confirmation is on)
  const { data: au } = await sb.auth.admin.getUserById(id);
  if (!au?.user?.email_confirmed_at) return ["waiting for email confirmation"];
  const l = lang(c), out: string[] = [];
  const W = {
    en: [`Welcome to Ship Your Cart, your code is ${c.code}`, "Your account is ready", `${T.en.hi} ${esc(c.full_name)},<br>Your customer code is ${codeTag(c.code)}<br><br>Use this address at checkout in any Malaysian online store, and always keep your code next to your name:`, "Registration is free. You only pay for shipping after we weigh your parcels."],
    ar: [`أهلاً بك في Ship Your Cart، كودك ${c.code}`, "حسابك جاهز", `${T.ar.hi} ${esc(c.full_name)}،<br>كود العميل الخاص بك ${codeTag(c.code)}<br><br>استخدم هذا العنوان عند الطلب من أي متجر ماليزي أونلاين، واكتب الكود دائمًا بجانب اسمك:`, "التسجيل مجاني، وتدفع قيمة الشحن فقط بعد ما نوزن طرودك."],
    ms: [`Selamat datang ke Ship Your Cart, kod anda ${c.code}`, "Akaun anda sedia", `${T.ms.hi} ${esc(c.full_name)},<br>Kod pelanggan anda ${codeTag(c.code)}<br><br>Gunakan alamat ini semasa checkout di kedai dalam talian Malaysia dan sentiasa letakkan kod di sebelah nama:`, "Pendaftaran percuma. Anda hanya bayar penghantaran selepas bungkusan ditimbang."],
  }[l];
  out.push(await send(`welcome:${c.id}`, c.email, W[0], layout(l, W[1], W[2] + box(addrRows(c.code, c.full_name), true) + W[3], { text: T[l].acc, url: accUrl(l) })));
  out.push(await send(`admin_customer:${c.id}`, ADMIN, `عميل جديد ${c.code}: ${c.full_name}`,
    layout("ar", `عميل جديد سجّل: ${c.code}`, box([["الاسم", esc(c.full_name)], ["الدولة", esc(c.country)], ["واتساب", `<a href="https://wa.me/${String(c.whatsapp).replace(/\D/g, "")}" dir="ltr">${esc(c.whatsapp)}</a>`], ["الإيميل", `<span dir="ltr">${esc(c.email)}</span>`]]), { text: "لوحة الإدارة", url: `${SITE}/admin/` })));
  return out;
}

async function onParcel(id: number) {
  const { data: p } = await sb.from("parcels").select("*, customers(*)").eq("id", id).single();
  if (!p || !p.customers) return [];
  const c = p.customers, l = lang(c);
  let photos = "";
  if (p.photos?.length) {
    const s = await sb.storage.from("parcel-photos").createSignedUrls(p.photos.slice(0, 3), 60 * 60 * 24 * 7);
    photos = (s.data || []).filter((x) => x.signedUrl).map((x) => `<img src="${x.signedUrl}" width="160" style="width:160px;height:160px;object-fit:cover;border-radius:12px;margin:4px;border:0" alt="">`).join("");
    if (photos) photos = `<div style="margin:10px 0">${photos}</div>`;
  }
  const rows: Record<L, [string, string][]> = {
    en: [["Parcel", "#" + p.id], ["Store", esc(p.store || "-")], ["Description", esc(p.description || "-")], ["Weight", p.weight_kg + " kg"]],
    ar: [["رقم الطرد", "#" + p.id], ["المتجر", esc(p.store || "-")], ["الوصف", esc(p.description || "-")], ["الوزن", p.weight_kg + " كجم"]],
    ms: [["Bungkusan", "#" + p.id], ["Kedai", esc(p.store || "-")], ["Keterangan", esc(p.description || "-")], ["Berat", p.weight_kg + " kg"]],
  };
  const t = {
    en: [`Your parcel #${p.id} has arrived at our warehouse`, "Your parcel has arrived", `${T.en.hi} ${esc(c.full_name)}, we received a parcel for ${esc(c.code)}:`, "When all your orders have arrived, select them in your account and request shipping. We pack them into one box.", "View & request shipping"],
    ar: [`وصل طردك #${p.id} لمستودعنا`, "وصل طردك للمستودع", `${T.ar.hi} ${esc(c.full_name)}، استلمنا طرد باسم ${esc(c.code)}:`, "لما توصل كل طلباتك، اخترها من حسابك واطلب الشحن، ونجمعها لك في صندوق واحد.", "شوف الطرد واطلب الشحن"],
    ms: [`Bungkusan #${p.id} telah tiba di gudang kami`, "Bungkusan anda telah tiba", `${T.ms.hi} ${esc(c.full_name)}, kami menerima bungkusan untuk ${esc(c.code)}:`, "Apabila semua pesanan tiba, pilih dalam akaun anda dan minta penghantaran. Kami bungkus dalam satu kotak.", "Lihat & minta penghantaran"],
  }[l];
  return [await send(`parcel:${p.id}`, c.email, t[0], layout(l, t[1], t[2] + photos + box(rows[l]) + t[3], { text: t[4], url: accUrl(l) }))];
}

async function onShipment(id: number) {
  const { data: s } = await sb.from("shipments").select("*, customers(*)").eq("id", id).single();
  if (!s || !s.customers) return [];
  const c = s.customers, l = lang(c), out: string[] = [];
  const key = `ship:${s.id}:${s.status}`;
  const trk = s.tracking_no ? (s.tracking_url ? `<a href="${esc(s.tracking_url)}" dir="ltr">${esc((s.carrier ? s.carrier + " " : "") + s.tracking_no)}</a>` : `<span dir="ltr">${esc((s.carrier ? s.carrier + " " : "") + s.tracking_no)}</span>`) : "-";
  const msgs: Record<string, Record<L, [string, string, string, string?]>> = {
    requested: {
      en: [`We received your shipping request #${s.id}`, "Shipping request received", `${T.en.hi} ${esc(c.full_name)}, we are packing your parcels and will send you the final weight and price shortly.`],
      ar: [`استلمنا طلب الشحن #${s.id}`, "استلمنا طلب الشحن", `${T.ar.hi} ${esc(c.full_name)}، بنجهز طرودك ونرسل لك الوزن النهائي والسعر قريب.`],
      ms: [`Permintaan penghantaran #${s.id} diterima`, "Permintaan diterima", `${T.ms.hi} ${esc(c.full_name)}, kami sedang membungkus bungkusan anda dan akan menghantar berat serta harga akhir.`],
    },
    quoted: {
      en: [`Shipment #${s.id} is ready: ${rm(s.price_rm)}`, "Your shipment is ready to go", `${T.en.hi} ${esc(c.full_name)}, ${s.auto_quoted ? "here is the price for your shipment." : "your parcels are packed."}` + box([...(s.carrier ? [["Carrier", esc(s.carrier)] as [string, string]] : []), ["Weight", s.weight_kg + " kg"], ...(s.discount_rm ? [["First shipment discount", "−" + rm(s.discount_rm)] as [string, string]] : []), ["Price", rm(s.price_rm)]]) + "Pay securely in your account and we ship right away.", "Pay now"],
      ar: [`شحنتك #${s.id} جاهزة: ${rm(s.price_rm)}`, "شحنتك جاهزة للشحن", `${T.ar.hi} ${esc(c.full_name)}، ${s.auto_quoted ? "هذا سعر شحنتك." : "جهّزنا طرودك."}` + box([...(s.carrier ? [["الشحن", esc(s.carrier)] as [string, string]] : []), ["الوزن", s.weight_kg + " كجم"], ...(s.discount_rm ? [["خصم أول شحنة", "−" + rm(s.discount_rm)] as [string, string]] : []), ["السعر", rm(s.price_rm)]]) + "ادفع بأمان من حسابك ونشحنها على طول.", "ادفع الحين"],
      ms: [`Penghantaran #${s.id} sedia: ${rm(s.price_rm)}`, "Penghantaran anda sedia", `${T.ms.hi} ${esc(c.full_name)}, ${s.auto_quoted ? "ini harga penghantaran anda." : "bungkusan anda telah dibungkus."}` + box([...(s.carrier ? [["Penghantar", esc(s.carrier)] as [string, string]] : []), ["Berat", s.weight_kg + " kg"], ...(s.discount_rm ? [["Diskaun penghantaran pertama", "−" + rm(s.discount_rm)] as [string, string]] : []), ["Harga", rm(s.price_rm)]]) + "Bayar dengan selamat dalam akaun anda dan kami terus hantar.", "Bayar sekarang"],
    },
    paid: {
      en: [`Payment received for shipment #${s.id}`, "Thank you, payment received", `${T.en.hi} ${esc(c.full_name)}, we received ${rm(s.price_rm)} for shipment #${s.id}. We will send the tracking number once it ships.`],
      ar: [`استلمنا الدفع للشحنة #${s.id}`, "شكراً، استلمنا الدفع", `${T.ar.hi} ${esc(c.full_name)}، استلمنا ${rm(s.price_rm)} للشحنة #${s.id}. بنرسل لك رقم التتبع أول ما تنشحن.`],
      ms: [`Bayaran diterima untuk #${s.id}`, "Terima kasih, bayaran diterima", `${T.ms.hi} ${esc(c.full_name)}, kami menerima ${rm(s.price_rm)} untuk penghantaran #${s.id}. Nombor penjejakan akan dihantar sebaik sahaja dihantar.`],
    },
    shipped: {
      en: [`Shipment #${s.id} is on its way`, "Your shipment is on its way", `${T.en.hi} ${esc(c.full_name)}, shipment #${s.id} has left Malaysia.` + box([["Tracking", trk]])],
      ar: [`شحنتك #${s.id} في الطريق`, "شحنتك في الطريق", `${T.ar.hi} ${esc(c.full_name)}، شحنتك #${s.id} طلعت من ماليزيا.` + box([["رقم التتبع", trk]])],
      ms: [`Penghantaran #${s.id} dalam perjalanan`, "Penghantaran dalam perjalanan", `${T.ms.hi} ${esc(c.full_name)}, penghantaran #${s.id} telah meninggalkan Malaysia.` + box([["Penjejakan", trk]])],
    },
    delivered: {
      en: [`Shipment #${s.id} delivered`, "Delivered, thank you!", `${T.en.hi} ${esc(c.full_name)}, shipment #${s.id} has been delivered. Thank you for shipping with us.`],
      ar: [`وصلت شحنتك #${s.id}`, "وصلت شحنتك، شكراً لك", `${T.ar.hi} ${esc(c.full_name)}، شحنتك #${s.id} وصلت بالسلامة. شكراً لاختيارك Ship Your Cart.`],
      ms: [`Penghantaran #${s.id} diterima`, "Telah diterima, terima kasih!", `${T.ms.hi} ${esc(c.full_name)}, penghantaran #${s.id} telah diterima. Terima kasih.`],
    },
  };
  const m = msgs[s.status]?.[l];
  if (m) out.push(await send(key, c.email, m[0], layout(l, m[1], m[2], { text: m[3] || T[l].acc, url: accUrl(l) })));
  if (s.status === "requested" || s.status === "paid" || (s.status === "quoted" && s.auto_quoted)) {
    const { data: ps } = await sb.from("parcels").select("id,weight_kg").eq("shipment_id", s.id);
    out.push(await send(`admin_${key}`, ADMIN, `${s.status === "paid" ? "دفعة وصلت" : s.status === "quoted" ? "طلب شحن جديد (مسعّر)" : "طلب شحن جديد"} #${s.id} — ${c.code}`,
      layout("ar", `${s.status === "paid" ? "دفعة وصلت" : "طلب شحن جديد"}: شحنة #${s.id}`, box([
        ["العميل", `${esc(c.code)} — ${esc(c.full_name)}`], ["الحالة", ST[s.status]], ["الطريقة", esc(s.carrier || s.method)],
        ["المستلم", esc([s.ship_name, s.ship_phone, s.ship_address, s.ship_city, s.ship_country].filter(Boolean).join("، "))],
        ["الطرود", (ps || []).map((p) => `#${p.id} (${p.weight_kg ?? "?"} كجم)`).join("، ")],
        ...(s.price_rm ? [["المبلغ", rm(s.price_rm)] as [string, string]] : []),
        ...(s.contents ? [["المحتويات", esc(s.contents)] as [string, string]] : []),
        ...(s.declared_value_rm ? [["القيمة المصرّح بها", rm(s.declared_value_rm)] as [string, string]] : []),
        ...(s.customer_note ? [["ملاحظة العميل", esc(s.customer_note)] as [string, string]] : []),
      ]), { text: "لوحة الإدارة", url: `${SITE}/admin/` })));
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  try {
    const { table, id } = await req.json();
    let r: string[] = [];
    if (table === "customers") r = await onCustomer(String(id));
    else if (table === "parcels") r = await onParcel(Number(id));
    else if (table === "shipments") r = await onShipment(Number(id));
    return new Response(JSON.stringify({ ok: true, r }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
