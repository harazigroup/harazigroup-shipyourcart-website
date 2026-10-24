#!/usr/bin/env python3
"""Builds the static Ship Your Cart site into ./public.

Pages live in src/pages/<slug>.<lang>.html (body only), shared header,
call-to-action band and footer in src/partials/, titles and descriptions
in src/pages.json. Run:  python3 build.py
"""
from html import escape as esc
import json, os, re, shutil, html
from datetime import date

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'public')
SITE = 'https://shipyourcart.com.my'
LANGS = [('en', '', 'en', 'ltr', 'EN'), ('ar', '/ar', 'ar', 'rtl', 'عربي'), ('ms', '/ms-my', 'ms-MY', 'ltr', 'BM')]
PAGES = ['home', 'shipping', 'shop-and-ship', 'buy-for-me', 'sourcing', 'amazon-fba-prep', 'how-it-works',
         'pricing', 'about', 'faq', 'contact', 'account']
NOINDEX = {'account'}
META = json.load(open(os.path.join(SRC, 'pages.json'), encoding='utf-8'))
SUPABASE_URL = 'https://lmwpilpcuxyzpygylclq.supabase.co'
SUPABASE_KEY = 'sb_publishable_gQveLo1t1IwFtuda2gOxpg_NxsCrWHg'
SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js'
# Stripe publishable key (pk_live_... — public). Empty = use the payment link set in the admin page.
STRIPE_PK = 'pk_live_51RrCUh0XHIOHPnxGxHo2KGulu5p4iYkxlyVf1k9uWjbE0qP0fB2rbPQQi1Mdvm8xPr8YLrmZl9QUBvQE8PcXuJuc00SXtEERut'
def _ver():
    import hashlib
    h = hashlib.sha1()
    for f in sorted(os.listdir(os.path.join(ROOT, 'assets'))):
        fp = os.path.join(ROOT, 'assets', f)
        if os.path.isfile(fp):
            h.update(open(fp, 'rb').read())
    return h.hexdigest()[:10]
VER = _ver()  # changes whenever a CSS/JS file changes, so browsers fetch the new version

def read(*p):
    return open(os.path.join(SRC, *p), encoding='utf-8').read()

def path_of(slug, prefix):
    return (prefix + '/') if slug == 'home' else '%s/%s/' % (prefix, slug)

UI = {
    'en': {'acct': 'My account', 'skip': 'Skip to content'},
    'ar': {'acct': 'حسابي', 'skip': 'تخطي إلى المحتوى'},
    'ms': {'acct': 'Akaun saya', 'skip': 'Langkau ke kandungan'},
}

def head(slug, lang, prefix, hl, d):
    m = META.get(slug, {}).get(lang) or META.get(slug, {}).get('en') or {}
    title = m.get('title') or 'Ship Your Cart'
    desc = m.get('description') or ''
    url = SITE + path_of(slug, prefix)
    alts = ''.join('<link rel="alternate" hreflang="%s" href="%s%s">' % (h, SITE, path_of(slug, p))
                   for _, p, h, _, _ in LANGS)
    alts += '<link rel="alternate" hreflang="x-default" href="%s%s">' % (SITE, path_of(slug, ''))
    robots = '<meta name="robots" content="noindex">' if slug in NOINDEX else ''
    return f'''<!doctype html>
<html lang="{hl}" dir="{d}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
{robots}<link rel="canonical" href="{url}">{alts}
<meta property="og:type" content="website"><meta property="og:site_name" content="Ship Your Cart">
<meta property="og:title" content="{html.escape(title)}"><meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}/assets/img/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#7a4fd0"><meta name="color-scheme" content="only light">
<link rel="icon" type="image/png" sizes="512x512" href="/assets/img/icon-512.png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v={VER}">
</head>
<body class="pg-{slug}">
'''

def lang_switch(slug, lang):
    return '<nav class="syc-lang" aria-label="Language">' + ''.join(
        '<a href="%s" hreflang="%s"%s>%s</a>' % (path_of(slug, p), h, ' class="on"' if l == lang else '', lab)
        for l, p, h, _, lab in LANGS) + '</nav>'

WA = ('<a class="syc-wa" href="https://wa.me/60107070190" target="_blank" rel="noopener" aria-label="WhatsApp">'
      '<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg></a>')

def build_page(slug, lang, prefix, hl, d):
    body = read('pages', '%s.%s.html' % (slug, lang))
    nav = read('partials', 'nav.%s.html' % lang)
    # header button -> account page
    nav = re.sub(r'<a class="syc-hbtn"[^>]*>.*?</a>',
                 '<a class="syc-hbtn" href="%s/account/" data-acct>%s</a>' % (prefix, UI[lang]['acct']), nav, flags=re.S)
    nav = nav.replace('<header class="syc-hdr">', '<header class="syc-hdr" id="top">', 1)
    body = body.replace('{{nav}}', nav)
    body = body.replace('{{cta}}', read('partials', 'cta.%s.html' % lang))
    body = body.replace('{{footer}}', read('partials', 'footer.%s.html' % lang))
    body = body.replace('{{signup_form}}', '<div id="syc-signup" class="ac-embed"></div>')
    body = body.replace('{{calc}}', '<div id="syc-calc" class="cl"></div>')
    page = head(slug, lang, prefix, hl, d) + body + WA + lang_switch(slug, lang)
    page += '\n<script>window.SYC={url:"%s",key:"%s",lang:"%s",prefix:"%s",stripePk:"%s"};</script>' % (SUPABASE_URL, SUPABASE_KEY, lang, prefix, STRIPE_PK)
    page += '\n<script src="/assets/site.js?v=%s" defer></script>' % VER
    if 'id="syc-calc"' in body:
        page += '\n<script src="/assets/calc.js?v=%s" defer></script>' % VER
    if slug in ('account', 'shop-and-ship'):
        if slug == 'account' and STRIPE_PK:
            page += '\n<script src="https://js.stripe.com/v3/"></script>'
        page += '\n<script src="%s" defer></script>\n<script src="/assets/account.js?v=%s" defer></script>' % (SUPABASE_JS, VER)
    page += '\n</body>\n</html>\n'
    out = os.path.join(OUT, path_of(slug, prefix).lstrip('/'), 'index.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(page)


# digital business cards: /card/<slug>/ (+ contact.vcf)
CARDS = [
    {'slug': 'ahmed', 'init': 'AH', 'phone': '+968 9492 5080', 'wa': '96894925080', 'email': 'ahmed@shipyourcart.com.my',
     'en': ('Ahmed Mohammed Al-Harazi', 'International Relations Manager'), 'ar': ('أحمد محمد الحرازي', 'مسؤول العلاقات الدولية'),
     'vn': ('Al-Harazi', 'Ahmed Mohammed')},
    {'slug': 'arkan', 'init': 'AA', 'phone': '+60 10-707 0190', 'wa': '60107070190', 'email': 'arkan@shipyourcart.com.my',
     'en': ('Arkan Saleh Abbad', 'Warehouse Manager, Malaysia'), 'ar': ('أركان صالح عباد', 'مسؤول المخازن ماليزيا'),
     'vn': ('Abbad', 'Arkan Saleh')},
    {'slug': 'moe', 'init': 'MM', 'phone': '+60 10-707 0190', 'wa': '60107070190', 'email': 'moe@shipyourcart.com.my',
     'en': ('Mohammed Jalal Mustafa', 'International Shipping Manager'), 'ar': ('محمد جلال مصطفى', 'مسؤول الشحن الدولي'),
     'vn': ('Mustafa', 'Mohammed Jalal')},
]
ICON = {
 'save': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>',
 'wa': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21l1.7-4.6A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 10c.5 2 2.5 4 4.5 4.5l1.2-1.2 2 1-.4 1.6c-3.6.4-8-4-7.6-7.6l1.6-.4 1 2z"/></svg>',
 'call': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
 'mail': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
 'web': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7a4fd0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>',
 'ig': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7a4fd0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="#7a4fd0"/></svg>',
 'tt': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7a4fd0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.6 2.3 4.4 5 4.8"/></svg>',
 'pin': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7a4fd0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
}
CARD_UI = {
 'en': {'save': 'Save contact', 'wa': 'WhatsApp', 'call': 'Call', 'mail': 'Email', 'co': 'Ship Your Cart · Kuala Lumpur',
        'addr': 'Kuala Lumpur, Malaysia', 'hi': 'Hello {n}, I got your card from Ship Your Cart'},
 'ar': {'save': 'حفظ جهة الاتصال', 'wa': 'واتساب', 'call': 'اتصال', 'mail': 'إيميل', 'co': 'Ship Your Cart · كوالالمبور',
        'addr': 'كوالالمبور، ماليزيا', 'hi': 'مرحبا {n}، حصلت على بطاقتك من Ship Your Cart'},
}

def build_cards():
    from urllib.parse import quote
    tpl = read('card.html')
    for c in CARDS:
        blocks = ''
        for l in ('ar', 'en'):
            u = CARD_UI[l]; name, title = c[l]
            wa = 'https://api.whatsapp.com/send?phone=%s&text=%s' % (c['wa'], quote(u['hi'].format(n=name.split()[0])))
            blocks += ('<section data-lang="%s"%s><div class="who"><h1>%s</h1><p>%s</p><div class="co">%s</div></div>'
                '<a class="save" href="contact.vcf" download="%s.vcf">%s%s</a>'
                '<div class="acts"><a class="wa" href="%s" target="_blank" rel="noopener">%s%s</a><a href="tel:%s">%s%s</a><a href="mailto:%s">%s%s</a></div>'
                '<div class="list"><a href="tel:%s">%s<span class="ltr">%s</span></a><a href="mailto:%s">%s<span class="ltr">%s</span></a>'
                '<a href="https://shipyourcart.com.my/%s">%s<span class="ltr">shipyourcart.com.my</span></a>'
                '<a href="https://instagram.com/shipyourcart" target="_blank" rel="noopener">%s<span class="ltr">@shipyourcart</span></a>'
                '<a href="https://www.tiktok.com/@shipyourcart" target="_blank" rel="noopener">%s<span class="ltr">@shipyourcart</span></a>'
                '<div>%s<span>%s</span></div></div>'
                '<div class="ft" dir="ltr">© 2026 WIZZ SMART SERVICES SDN. BHD.</div></section>') % (
                l, '' if l == 'ar' else ' hidden', esc(name), esc(title), esc(u['co']),
                c['slug'], ICON['save'], u['save'],
                wa, ICON['wa'], u['wa'], c['phone'].replace(' ', '').replace('-', ''), ICON['call'], u['call'], c['email'], ICON['mail'], u['mail'],
                c['phone'].replace(' ', '').replace('-', ''), ICON['call'].replace('currentColor', '#7a4fd0').replace('22', '20'), c['phone'],
                c['email'], ICON['mail'].replace('currentColor', '#7a4fd0').replace('22', '20'), c['email'],
                'ar/' if l == 'ar' else '', ICON['web'], ICON['ig'], ICON['tt'], ICON['pin'], u['addr'])
        page = (tpl.replace('{{BLOCKS}}', blocks).replace('{{INITIALS}}', c['init'])
                .replace('{{NAME_EN}}', esc(c['en'][0])).replace('{{TITLE_EN}}', esc(c['en'][1])).replace('{{TITLE_AR}}', esc(c['ar'][1]))
                .replace('{{LANG0}}', 'ar').replace('{{DIR0}}', 'rtl'))
        d = os.path.join(OUT, 'card', c['slug']); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(page)
        last, first = c['vn']
        vcf = ('BEGIN:VCARD\r\nVERSION:3.0\r\nN:%s;%s;;;\r\nFN:%s\r\nORG:Ship Your Cart\r\nTITLE:%s\r\n'
               'TEL;TYPE=CELL:%s\r\nEMAIL;TYPE=WORK:%s\r\nURL:https://shipyourcart.com.my/\r\n'
               'ADR;TYPE=WORK:;;;Kuala Lumpur;;;Malaysia\r\nNOTE:%s · %s\r\nEND:VCARD\r\n') % (
               last, first, c['en'][0], c['en'][1], c['phone'].replace(' ', '').replace('-', ''), c['email'], c['ar'][0], c['ar'][1])
        open(os.path.join(d, 'contact.vcf'), 'w', encoding='utf-8', newline='').write(vcf)

def main():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    shutil.copytree(os.path.join(ROOT, 'assets'), os.path.join(OUT, 'assets'))
    for slug in PAGES:
        for lang, prefix, hl, d, _ in LANGS:
            build_page(slug, lang, prefix, hl, d)
    # admin (Arabic, not indexed)
    a = read('admin.html').replace('{{VER}}', VER).replace('{{SUPABASE_JS}}', SUPABASE_JS)
    a = a.replace('{{URL}}', SUPABASE_URL).replace('{{KEY}}', SUPABASE_KEY)
    os.makedirs(os.path.join(OUT, 'admin'))
    open(os.path.join(OUT, 'admin', 'index.html'), 'w', encoding='utf-8').write(a)
    build_cards()
    # 404
    n = read('404.html')
    open(os.path.join(OUT, '404.html'), 'w', encoding='utf-8').write(n)
    # sitemap + robots
    urls = []
    for slug in PAGES:
        if slug in NOINDEX:
            continue
        for _, p, _, _, _ in LANGS:
            urls.append('<url><loc>%s%s</loc><lastmod>%s</lastmod></url>' % (SITE, path_of(slug, p), date.today().isoformat()))
    open(os.path.join(OUT, 'sitemap.xml'), 'w').write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + '\n'.join(urls) + '\n</urlset>\n')
    open(os.path.join(OUT, 'robots.txt'), 'w').write(
        'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /account/\nDisallow: /ar/account/\nDisallow: /ms-my/account/\n'
        'Sitemap: %s/sitemap.xml\n' % SITE)
    print('built', len(PAGES) * len(LANGS) + 2, 'pages into public/')

if __name__ == '__main__':
    main()
