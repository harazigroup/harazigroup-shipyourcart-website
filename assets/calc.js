/* Ship Your Cart — instant shipping price calculator. Mounts on #syc-calc. Prices come from quote() in Supabase. */
(function(){
  var root=document.getElementById('syc-calc');if(!root)return;
  var C=window.SYC||{},L=C.lang||'en',P=C.prefix||'';
  var T={
    en:{to:'Ship to',kg:'Weight (kg)',dims:'Box size (optional, cm)',l:'Length',w:'Width',h:'Height',go:'Check price',charge:'Chargeable weight',
        none:'No instant price for this destination or weight yet. Ask us on WhatsApp and we will quote you.',wa:'Ask on WhatsApp',
        days:'',first:'New customers: {p}% off the first shipment (up to RM {m})',signup:'Get your free Malaysian address',
        note:'Door to door. Final price uses the packed weight we measure at our warehouse.',err:'Could not load prices. Please try again.',load:'Loading…',cheap:'Best price',ship:'Ship with this'},
    ar:{to:'الشحن إلى',kg:'الوزن (كجم)',dims:'مقاس الصندوق (اختياري، سم)',l:'الطول',w:'العرض',h:'الارتفاع',go:'احسب السعر',charge:'الوزن المحتسب',
        none:'ما عندنا سعر فوري لهذي الوجهة أو الوزن للحين. راسلنا واتساب ونعطيك السعر.',wa:'اسأل على الواتساب',
        days:'',first:'للعملاء الجدد: خصم {p}% على أول شحنة (حتى RM {m})',signup:'احصل على عنوانك في ماليزيا مجاناً',
        note:'من الباب إلى الباب. السعر النهائي حسب وزن الشحنة بعد التغليف في مستودعنا.',err:'ما قدرنا نجيب الأسعار. جرّب مرة ثانية.',load:'جاري التحميل…',cheap:'أفضل سعر',ship:'اشحن معهم'},
    ms:{to:'Hantar ke',kg:'Berat (kg)',dims:'Saiz kotak (pilihan, cm)',l:'Panjang',w:'Lebar',h:'Tinggi',go:'Semak harga',charge:'Berat boleh caj',
        none:'Tiada harga segera untuk destinasi atau berat ini lagi. Tanya kami di WhatsApp.',wa:'Tanya di WhatsApp',
        days:'',first:'Pelanggan baharu: {p}% diskaun penghantaran pertama (sehingga RM {m})',signup:'Dapatkan alamat Malaysia percuma',
        note:'Pintu ke pintu. Harga akhir ikut berat bungkusan yang kami ukur di gudang.',err:'Harga tidak dapat dimuatkan. Cuba lagi.',load:'Memuatkan…',cheap:'Harga terbaik',ship:'Hantar dengan ini'}
  }[L]||{};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function cname(cc){try{return new Intl.DisplayNames([L],{type:'region'}).of(cc)}catch(e){return cc}}
  function rm(n){return 'RM '+Number(n).toLocaleString('en-US',{maximumFractionDigits:2})}
  async function rpc(fn,args){
    var r=await fetch(C.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'apikey':C.key,'Content-Type':'application/json'},body:JSON.stringify(args||{})});
    if(!r.ok)throw new Error('http '+r.status);return r.json()}
  var TOP=['SA','AE','OM','KW','QA','BH'],disc=null;
  root.innerHTML='<p class="ac-muted">'+T.load+'</p>';
  Promise.all([rpc('quote_countries'),rpc('first_discount_info').catch(function(){return []})]).then(function(res){
    var cc=(res[0]||[]).map(function(x){return typeof x==='string'?x:x.quote_countries});disc=(res[1]||[])[0]||null;
    if(!cc.length){root.innerHTML='<p class="ac-muted">'+T.none+'</p>';return}
    var top=TOP.filter(function(c){return cc.indexOf(c)>-1}),rest=cc.filter(function(c){return top.indexOf(c)<0}).sort(function(a,b){return cname(a).localeCompare(cname(b),L)});
    var opts=top.concat(rest).map(function(c){return '<option value="'+c+'">'+esc(cname(c))+'</option>'}).join('');
    root.innerHTML='<form class="cl-form" novalidate>'+
      '<div class="cl-row"><label class="cl-f"><span>'+T.to+'</span><select class="ac-i" name="cc">'+opts+'</select></label>'+
      '<label class="cl-f cl-kg"><span>'+T.kg+'</span><input class="ac-i" name="kg" type="number" inputmode="decimal" min="0.1" step="0.1" value="1" dir="ltr"></label></div>'+
      '<details class="cl-dims"><summary>'+T.dims+'</summary><div class="cl-row cl-3">'+
      ['l','w','h'].map(function(k){return '<label class="cl-f"><span>'+T[k]+'</span><input class="ac-i" name="'+k+'" type="number" inputmode="decimal" min="0" step="1" dir="ltr"></label>'}).join('')+'</div></details>'+
      '<button class="syc-btn" type="submit">'+T.go+'</button></form><div class="cl-out" aria-live="polite"></div>';
    var f=root.querySelector('form'),out=root.querySelector('.cl-out'),t=null;
    async function run(){
      var v=function(n){return parseFloat(f.elements[n].value)||0};
      var kg=v('kg'),vol=(v('l')&&v('w')&&v('h'))?v('l')*v('w')*v('h')/5000:0,ch=Math.max(kg,vol);
      if(!(ch>0)){out.innerHTML='';return}
      ch=Math.round(ch*100)/100;out.innerHTML='<p class="ac-muted">'+T.load+'</p>';
      try{var q=await rpc('quote',{p_cc:f.elements.cc.value,p_kg:ch})}catch(e){out.innerHTML='<p class="ac-msg bad">'+T.err+'</p>';return}
      var h='<p class="cl-ch">'+T.charge+': <b dir="ltr">'+ch+' kg</b></p>';
      if(!q.length){h+='<p class="ac-muted">'+T.none+'</p><a class="ac-wa" href="https://wa.me/60107070190" target="_blank" rel="noopener">'+T.wa+'</a>';out.innerHTML=h;return}
      h+='<div class="cl-list">'+q.map(function(r,i){var tr=r['transit_'+L]||r.transit_en||'';
        return '<div class="cl-item'+(i===0?' best':'')+'"><div><b>'+esc(r.name)+'</b>'+(i===0&&q.length>1?'<span class="cl-best">'+T.cheap+'</span>':'')+(tr?'<div class="cl-tr">'+esc(tr)+'</div>':'')+'</div><div class="cl-p" dir="ltr">'+rm(r.price_rm)+'</div></div>'}).join('')+'</div>';
      if(disc&&+disc.pct>0)h+='<p class="cl-disc">'+T.first.replace('{p}',+disc.pct).replace('{m}',+disc.max_rm)+'</p>';
      h+='<p class="ac-muted cl-note">'+T.note+'</p><a class="syc-btn" href="'+P+'/account/?signup=1">'+T.signup+'</a>';
      out.innerHTML=h}
    f.onsubmit=function(e){e.preventDefault();run()};
    f.oninput=function(){clearTimeout(t);t=setTimeout(run,450)};
    run();
  }).catch(function(){var sec=root.closest('section');if(sec)sec.hidden=true;else root.hidden=true});
})();
