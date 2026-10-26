/* Ship Your Cart — shop (Buy for me products). Mounts on #syc-shop. Orders are created with create_store_order()
   and paid on the account page (card or USDT). */
(function(){
  var root=document.getElementById('syc-shop');if(!root)return;
  var C=window.SYC||{},L=C.lang||'en',P=C.prefix||'',ACC=P+'/account/';
  var T={
    en:{add:'Add',min:'Minimum order: {n} items',more:'Add {n} more to order',items:'items',sub:'Products',checkout:'Checkout',empty:'Products are coming soon. Message us on WhatsApp for prices.',
        how:'How do you want it?',direct:'Ship it to my address now',direct_d:'One price for the products and door-to-door shipping.',wh:'Send it to my Malaysian address',wh_d:'Pay for the products now, then ship them later together with your other orders.',
        to:'Country',name:'Recipient name',phone:'Recipient phone',addr:'Address',city:'City',ship:'Shipping',total:'Total',note:'Note (optional)',
        pay:'Continue to payment',signin:'Sign in or create a free account to order. Your cart is saved.',signup:'Create free account',login:'Sign in',
        noship:'No instant shipping price for this country yet. Choose "Send it to my Malaysian address", or message us.',err:'Something went wrong: ',load:'Loading…',weight:'Estimated weight',fill:'Please fill in the recipient details.',
        loaded:'Could not load the shop. Please try again.',all:'All',cats:{coffee:'Coffee',raw:'Cosmetic raw materials'},cmin:'Coffee: minimum {n} bags',cmore:'Add {n} more coffee bags'},
    ar:{add:'أضف',min:'أقل طلب: {n} قطع',more:'أضف {n} قطع عشان تطلب',items:'قطع',sub:'المنتجات',checkout:'إتمام الطلب',empty:'المنتجات قريباً. راسلنا واتساب للأسعار.',
        how:'كيف تبي طلبك؟',direct:'اشحنه لعنواني الحين',direct_d:'سعر واحد للمنتجات والشحن من الباب إلى الباب.',wh:'أرسله لعنواني في ماليزيا',wh_d:'ادفع قيمة المنتجات الحين، واشحنها بعدين مع طلباتك الثانية.',
        to:'الدولة',name:'اسم المستلم',phone:'جوال المستلم',addr:'العنوان',city:'المدينة',ship:'الشحن',total:'الإجمالي',note:'ملاحظة (اختياري)',
        pay:'كمّل للدفع',signin:'سجّل دخول أو افتح حساب مجاني عشان تطلب. سلتك محفوظة.',signup:'افتح حساب مجاني',login:'تسجيل الدخول',
        noship:'ما عندنا سعر شحن فوري لهذي الدولة للحين. اختار "أرسله لعنواني في ماليزيا" أو راسلنا.',err:'صار خطأ: ',load:'جاري التحميل…',weight:'الوزن التقريبي',fill:'اكتب بيانات المستلم.',
        loaded:'ما قدرنا نحمّل المتجر. جرّب مرة ثانية.',all:'الكل',cats:{coffee:'القهوة',raw:'مواد خام للتجميل'},cmin:'القهوة: أقل طلب {n} أكياس',cmore:'أضف {n} أكياس قهوة كمان'},
    ms:{add:'Tambah',min:'Pesanan minimum: {n} item',more:'Tambah {n} lagi untuk memesan',items:'item',sub:'Produk',checkout:'Teruskan',empty:'Produk akan datang. Hubungi kami di WhatsApp untuk harga.',
        how:'Bagaimana anda mahu?',direct:'Hantar ke alamat saya sekarang',direct_d:'Satu harga untuk produk dan penghantaran pintu ke pintu.',wh:'Hantar ke alamat Malaysia saya',wh_d:'Bayar produk sekarang, hantar kemudian bersama pesanan lain.',
        to:'Negara',name:'Nama penerima',phone:'Telefon penerima',addr:'Alamat',city:'Bandar',ship:'Penghantaran',total:'Jumlah',note:'Nota (pilihan)',
        pay:'Teruskan ke pembayaran',signin:'Log masuk atau buka akaun percuma untuk memesan. Troli anda disimpan.',signup:'Buka akaun percuma',login:'Log masuk',
        noship:'Tiada harga penghantaran segera untuk negara ini lagi. Pilih "Hantar ke alamat Malaysia saya", atau hubungi kami.',err:'Ralat: ',load:'Memuatkan…',weight:'Anggaran berat',fill:'Sila isi butiran penerima.',
        loaded:'Kedai tidak dapat dimuatkan. Cuba lagi.',all:'Semua',cats:{coffee:'Kopi',raw:'Bahan mentah kosmetik'},cmin:'Kopi: minimum {n} beg',cmore:'Tambah {n} beg kopi lagi'}
  }[L];
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function rm(n){return 'RM '+Number(n).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2})}
  function cname(cc){try{return new Intl.DisplayNames([L],{type:'region'}).of(cc)}catch(e){return cc}}
  function $(s,r){return (r||document).querySelector(s)}
  var H={'apikey':C.key,'Content-Type':'application/json'};
  function rest(path){return fetch(C.url+'/rest/v1/'+path,{headers:H}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
  function rpc(fn,a){return fetch(C.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:H,body:JSON.stringify(a||{})}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
  var sb=null;function client(){if(!sb&&window.supabase)sb=window.supabase.createClient(C.url,C.key,{auth:{persistSession:true,detectSessionInUrl:false}});return sb}

  var products=[],info={min_items:6,pack_kg:0.3},cart={},mode='direct',car='',quotes=[],countries=[],cat='';
  try{var m=/[?&]cat=([a-z_]+)/.exec(location.search);if(m)cat=m[1]}catch(e){}
  function coffeeQty(){return products.reduce(function(a,p){return a+(p.category==='coffee'?(cart[p.id]||0):0)},0)}
  try{cart=JSON.parse(localStorage.getItem('syc_cart')||'{}')||{}}catch(e){cart={}}
  function save(){try{localStorage.setItem('syc_cart',JSON.stringify(cart))}catch(e){}}
  function count(){return Object.keys(cart).reduce(function(a,k){return a+(products.find(function(p){return String(p.id)===k})?cart[k]:0)},0)}
  function sub(){return products.reduce(function(a,p){return a+(cart[p.id]||0)*p.price_rm},0)}
  function kg(){return Math.round((products.reduce(function(a,p){return a+(cart[p.id]||0)*p.weight_kg},0)+(+info.pack_kg||0))*100)/100}
  function nm(p){return p['name_'+L]||p.name_en}

  root.innerHTML='<p class="ac-muted">'+T.load+'</p>';
  Promise.all([rest('products?select=*&order=sort.asc,id.asc'),rpc('store_info').catch(function(){return []}),rpc('quote_countries').catch(function(){return []})]).then(function(r){
    products=r[0]||[];info=(r[1]||[])[0]||info;countries=(r[2]||[]).map(function(x){return typeof x==='string'?x:x.quote_countries});
    if(!products.length){root.innerHTML='<p class="ac-muted">'+T.empty+'</p><a class="ac-wa" href="https://wa.me/60107070190" target="_blank" rel="noopener">WhatsApp</a>';return}
    var cs=cats();if(cat&&cs.indexOf(cat)<0)cat='';if(!cat&&cs.length>1)cat=cs[0];
    render();
  }).catch(function(){root.innerHTML='<p class="ac-msg bad">'+T.loaded+'</p>'});

  function cats(){var a=[];products.forEach(function(p){var c=p.category||'other';if(a.indexOf(c)<0)a.push(c)});return a}
  function render(){
    var cs=cats(),tabs=cs.length>1?'<div class="cl-tabs sh-tabs" role="tablist">'+cs.map(function(c){return '<button type="button" role="tab" aria-selected="'+(c===cat)+'" class="'+(c===cat?'on':'')+'" data-cat="'+esc(c)+'">'+esc((T.cats||{})[c]||c)+'</button>'}).join('')+'</div>':'';
    var list=cat?products.filter(function(p){return (p.category||'other')===cat}):products;
    var h=tabs+'<div class="sh-grid">'+list.map(function(p){var q=cart[p.id]||0;
      return '<div class="sh-card"><div class="sh-img">'+(p.photo?'<img src="'+esc(p.photo)+'" alt="'+esc(nm(p))+'" loading="lazy">':'<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#b9b3cc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v2M10 2v2M14 2v2"/></svg>')+'</div>'+
        '<div class="sh-b">'+(p.brand?'<div class="sh-brand">'+esc(p.brand)+'</div>':'')+'<h3 class="sh-n">'+esc(nm(p))+'</h3>'+((p['desc_'+L]||p.desc_en)?'<p class="sh-d">'+esc(p['desc_'+L]||p.desc_en)+'</p>':'')+
        '<div class="sh-row"><b class="sh-p" dir="ltr">'+rm(p.price_rm)+'</b>'+
        (q?'<div class="sh-q" dir="ltr"><button type="button" data-dec="'+p.id+'" aria-label="−">−</button><span>'+q+'</span><button type="button" data-inc="'+p.id+'" aria-label="+">+</button></div>':'<button type="button" class="sh-add" data-inc="'+p.id+'">'+T.add+'</button>')+
        '</div></div></div>'}).join('')+'</div>';
    var n=count(),cq=coffeeQty(),mi=+info.min_items||1,need=cq>0?Math.max(0,mi-cq):0,hasCoffee=products.some(function(p){return p.category==='coffee'});
    var mtxt=need?T.cmore.replace('{n}',need):(hasCoffee&&(cat==='coffee'||cq>0)?T.cmin.replace('{n}',mi):'');
    h+='<div class="sh-bar'+(n?'':' sh-bar-empty')+'"><div><b>'+n+' '+T.items+'</b> · <span dir="ltr">'+rm(sub())+'</span>'+(mtxt?'<div class="sh-min">'+mtxt+'</div>':'')+'</div>'+
      '<button class="syc-btn" type="button" id="shGo"'+(need||!n?' disabled':'')+'>'+T.checkout+'</button></div><div id="shCo"></div>';
    root.innerHTML=h;
    root.querySelectorAll('[data-cat]').forEach(function(b){b.onclick=function(){cat=b.getAttribute('data-cat');render()}});
    root.querySelectorAll('[data-inc]').forEach(function(b){b.onclick=function(){var id=b.getAttribute('data-inc');cart[id]=(cart[id]||0)+1;save();render()}});
    root.querySelectorAll('[data-dec]').forEach(function(b){b.onclick=function(){var id=b.getAttribute('data-dec');cart[id]=Math.max(0,(cart[id]||0)-1);if(!cart[id])delete cart[id];save();render()}});
    var g=$('#shGo');if(g)g.onclick=checkout;
  }

  async function checkout(){
    var box=$('#shCo'),c=client(),sess=null;
    if(c){try{sess=(await c.auth.getSession()).data.session}catch(e){}}
    if(!sess){try{localStorage.setItem('syc_next',location.pathname)}catch(e){}
      box.innerHTML='<div class="ac-card sh-co"><p>'+T.signin+'</p><div class="ac-btns"><a class="syc-btn" href="'+ACC+'?signup=1">'+T.signup+'</a><a class="ac-link" href="'+ACC+'">'+T.login+'</a></div></div>';box.scrollIntoView({behavior:'smooth',block:'center'});return}
    var me=(await c.from('customers').select('*').eq('id',sess.user.id).maybeSingle()).data||{};
    var cc0='';try{var nmap={};countries.forEach(function(k){nmap[new Intl.DisplayNames(['en'],{type:'region'}).of(k).toLowerCase()]=k});cc0=nmap[String(me.ship_country||me.country||'').toLowerCase()]||''}catch(e){}
    var f=function(id,l,v,t){return '<label class="ac-l" for="'+id+'">'+l+' *</label><input class="ac-i" id="'+id+'" type="'+(t||'text')+'" value="'+esc(v||'')+'"'+(t==='tel'?' dir="ltr"':'')+'>'};
    box.innerHTML='<form class="ac-card sh-co ac-form" id="shForm"><h3 class="ac-h">'+T.how+'</h3>'+
      '<label class="rq-opt"><input type="radio" name="shMode" value="direct"'+(mode==='direct'?' checked':'')+'><span class="rq-n"><b>'+T.direct+'</b><small>'+T.direct_d+'</small></span></label>'+
      '<label class="rq-opt"><input type="radio" name="shMode" value="wh"'+(mode==='wh'?' checked':'')+'><span class="rq-n"><b>'+T.wh+'</b><small>'+T.wh_d+'</small></span></label>'+
      '<div id="shAddr"><label class="ac-l" for="shCC">'+T.to+' *</label><select class="ac-i" id="shCC"><option value="">—</option>'+countries.map(function(k){return '<option value="'+k+'"'+(k===cc0?' selected':'')+'>'+esc(cname(k))+'</option>'}).join('')+'</select>'+
      f('shName',T.name,me.ship_name||me.full_name)+f('shPhone',T.phone,me.ship_phone||me.whatsapp,'tel')+f('shAddrL',T.addr,me.ship_address)+f('shCity',T.city,me.ship_city)+'<div id="shCar" class="rq-car"></div></div>'+
      '<label class="ac-l" for="shNote">'+T.note+'</label><input class="ac-i" id="shNote">'+
      '<div class="sh-sum" id="shSum"></div><p id="shMsg"></p><button class="syc-btn" type="submit">'+T.pay+'</button></form>';
    box.scrollIntoView({behavior:'smooth',block:'start'});
    function sum(){var s=sub(),q=quotes.find(function(x){return x.carrier===car}),sh=mode==='direct'&&q?+q.price_rm:0;
      $('#shSum').innerHTML='<div><span>'+T.sub+'</span><b dir="ltr">'+rm(s)+'</b></div>'+(mode==='direct'?'<div><span>'+T.ship+(q?' · '+esc(q['name_'+L]||q.name):'')+'</span><b dir="ltr">'+(q?rm(sh):'—')+'</b></div>':'')+
        '<div class="sh-tot"><span>'+T.total+'</span><b dir="ltr">'+rm(s+sh)+'</b></div><div class="ac-muted">'+T.weight+': <span dir="ltr">'+kg()+' kg</span></div>'}
    async function loadQ(){car='';quotes=[];var cc=$('#shCC').value,cb=$('#shCar');
      if(!cc){cb.innerHTML='';sum();return}
      cb.innerHTML='<p class="ac-muted">'+T.load+'</p>';
      try{quotes=await rpc('quote_store',{p_cc:cc,p_kg:kg()})}catch(e){try{quotes=await rpc('quote',{p_cc:cc,p_kg:kg()})}catch(e2){quotes=[]}}
      if(!quotes.length){cb.innerHTML='<p class="ac-est">'+T.noship+'</p>';sum();return}
      car=quotes[0].carrier;
      cb.innerHTML=quotes.map(function(q,i){var tr=q['transit_'+L]||q.transit_en||'';return '<label class="rq-opt"><input type="radio" name="shCarR" value="'+esc(q.carrier)+'"'+(i===0?' checked':'')+'><span class="rq-n"><b>'+esc(q['name_'+L]||q.name)+'</b>'+(tr?'<small>'+esc(tr)+'</small>':'')+'</span><span class="rq-p" dir="ltr"><b>'+rm(q.price_rm)+'</b></span></label>'}).join('');
      cb.querySelectorAll('input').forEach(function(x){x.onchange=function(){car=x.value;sum()}});sum()}
    function setMode(){$('#shAddr').hidden=mode!=='direct';sum()}
    box.querySelectorAll('input[name=shMode]').forEach(function(x){x.onchange=function(){mode=x.value;setMode()}});
    $('#shCC').onchange=loadQ;setMode();loadQ();
    $('#shForm').onsubmit=async function(e){e.preventDefault();var v=function(id){return $('#'+id).value.trim()},msg=$('#shMsg');
      if(mode==='direct'&&(!v('shCC')||!v('shName')||!v('shPhone')||!v('shAddrL')||!v('shCity'))){msg.className='ac-msg bad';msg.textContent=T.fill;return}
      if(mode==='direct'&&!car){msg.className='ac-msg bad';msg.textContent=T.noship;return}
      var btn=$('#shForm button[type=submit]');btn.disabled=true;
      var items=Object.keys(cart).filter(function(k){return cart[k]>0}).map(function(k){return {id:+k,qty:cart[k]}});
      var d=mode==='direct',r=await c.rpc('create_store_order',{p_items:items,p_mode:mode,p_carrier:d?car:null,p_name:d?v('shName'):null,p_phone:d?v('shPhone'):null,p_address:d?v('shAddrL'):null,p_city:d?v('shCity'):null,
        p_country:d?new Intl.DisplayNames(['en'],{type:'region'}).of(v('shCC')):null,p_cc:d?v('shCC'):null,p_note:v('shNote')||null});
      if(r.error){btn.disabled=false;msg.className='ac-msg bad';msg.textContent=T.err+r.error.message;return}
      cart={};save();location.href=ACC+'?pay='+r.data;
    };
  }
})();
