#!/usr/bin/env python3
"""Builds the static Ship Your Cart site into ./public.

Pages live in src/pages/<slug>.<lang>.html (body only), shared header,
call-to-action band and footer in src/partials/, titles and descriptions
in src/pages.json. Run:  python3 build.py
"""
import json, os, re, shutil, html
from datetime import date

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'public')
SITE = 'https://shipyourcart.com.my'
LANGS = [('en', '', 'en', 'ltr', 'EN'), ('ar', '/ar', 'ar', 'rtl', 'عربي'), ('ms', '/ms-my', 'ms-MY', 'ltr', 'BM')]
PAGES = ['home', 'shipping', 'shop-and-ship', 'buy-for-me', 'sourcing', 'how-it-works',
         'pricing', 'about', 'faq', 'contact', 'account']
NOINDEX = {'account'}
META = json.load(open(os.path.join(SRC, 'pages.json'), encoding='utf-8'))
SUPABASE_URL = 'https://lmwpilpcuxyzpygylclq.supabase.co'
SUPABASE_KEY = 'sb_publishable_gQveLo1t1IwFtuda2gOxpg_NxsCrWHg'
SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js'
# Stripe publishable key (pk_live_... — public). Empty = use the payment link set in the admin page.
STRIPE_PK = 'pk_live_51RrCUh0XHIOHPnxGxHo2KGulu5p4iYkxlyVf1k9uWjbE0qP0fB2rbPQQi1Mdvm8xPr8YLrmZl9QUBvQE8PcXuJuc00SXtEERut'
VER = date.today().strftime('%Y%m%d')

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
    page = head(slug, lang, prefix, hl, d) + body + WA + lang_switch(slug, lang)
    page += '\n<script>window.SYC={url:"%s",key:"%s",lang:"%s",prefix:"%s",stripePk:"%s"};</script>' % (SUPABASE_URL, SUPABASE_KEY, lang, prefix, STRIPE_PK)
    page += '\n<script src="/assets/site.js?v=%s" defer></script>' % VER
    if slug in ('account', 'shop-and-ship'):
        if slug == 'account' and STRIPE_PK:
            page += '\n<script src="https://js.stripe.com/v3/"></script>'
        page += '\n<script src="%s" defer></script>\n<script src="/assets/account.js?v=%s" defer></script>' % (SUPABASE_JS, VER)
    page += '\n</body>\n</html>\n'
    out = os.path.join(OUT, path_of(slug, prefix).lstrip('/'), 'index.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(page)

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
