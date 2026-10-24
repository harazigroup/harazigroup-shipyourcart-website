/* Ship Your Cart — public shipment tracking. Mounts on #syc-track, uses track(code, id) in Supabase. */
(function(){
  var root=document.getElementById('syc-track');if(!root)return;
  var C=window.SYC||{},L=C.lang||'en';
  var T={
    en:{code:'Customer code',id:'Shipment number',go:'Track',ph_code:'SYC-10001',ph_id:'e.g. 12',none:'We could not find this shipment. Check your customer code and shipment number.',
        err:'Tracking is not available right now. Please try again.',carrier:'Carrier',trk:'Tracking number',open:'Open carrier tracking',to:'To',
        st:{requested:'Request received',quoted:'Price ready',paid:'Paid',shipped:'On the way',delivered:'Delivered'}},
    ar:{code:'كود العميل',id:'رقم الشحنة',go:'تتبّع',ph_code:'SYC-10001',ph_id:'مثال: 12',none:'ما لقينا هذي الشحنة. تأكد من كود العميل ورقم الشحنة.',
        err:'التتبع مو متاح الحين. جرّب مرة ثانية.',carrier:'شركة الشحن',trk:'رقم التتبع',open:'افتح تتبع شركة الشحن',to:'إلى',
        st:{requested:'استلمنا الطلب',quoted:'السعر جاهز',paid:'تم الدفع',shipped:'في الطريق',delivered:'تم التسليم'}},
    ms:{code:'Kod pelanggan',id:'Nombor penghantaran',go:'Jejak',ph_code:'SYC-10001',ph_id:'cth. 12',none:'Penghantaran tidak dijumpai. Semak kod pelanggan dan nombor penghantaran.',
        err:'Penjejakan tidak tersedia sekarang. Cuba lagi.',carrier:'Kurier',trk:'Nombor penjejakan',open:'Buka penjejakan kurier',to:'Ke',
        st:{requested:'Permintaan diterima',quoted:'Harga sedia',paid:'Dibayar',shipped:'Dalam perjalanan',delivered:'Diterima'}}
  }[L];
  var ORDER=['requested','quoted','paid','shipped','delivered'];
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  var saved='';try{saved=localStorage.getItem('syc_code')||''}catch(e){}
  root.innerHTML='<form class="tk-form"><label class="cl-f"><span>'+T.code+'</span><input class="ac-i" name="code" dir="ltr" autocomplete="off" placeholder="'+T.ph_code+'" value="'+esc(saved)+'" required></label>'+
    '<label class="cl-f"><span>'+T.id+'</span><input class="ac-i" name="id" type="number" inputmode="numeric" min="1" dir="ltr" placeholder="'+esc(T.ph_id)+'" required></label>'+
    '<button class="syc-btn" type="submit">'+T.go+'</button></form><div class="tk-out" aria-live="polite"></div>';
  var f=root.querySelector('form'),out=root.querySelector('.tk-out');
  f.onsubmit=async function(e){e.preventDefault();
    var code=f.elements.code.value.trim(),id=parseInt(f.elements.id.value,10);if(!code||!id)return;
    out.innerHTML='<div class="ac-loading"></div>';
    try{
      var r=await fetch(C.url+'/rest/v1/rpc/track',{method:'POST',headers:{'apikey':C.key,'Content-Type':'application/json'},body:JSON.stringify({p_code:code,p_id:id})});
      if(!r.ok)throw new Error(r.status);var d=(await r.json())[0];
      if(!d){out.innerHTML='<p class="ac-msg bad">'+T.none+'</p>';return}
      var at=ORDER.indexOf(d.status);
      var h='<ol class="tk-steps">'+ORDER.map(function(s,i){return '<li class="'+(i<at?'done':i===at?'now':'')+'"><span></span>'+T.st[s]+'</li>'}).join('')+'</ol>';
      h+='<div class="tk-info">'+(d.country?'<div>'+T.to+': <b>'+esc(d.country)+'</b></div>':'')+(d.carrier?'<div>'+T.carrier+': <b>'+esc(d.carrier)+'</b></div>':'')+
        (d.tracking_no?'<div>'+T.trk+': <b dir="ltr">'+esc(d.tracking_no)+'</b></div>':'')+'</div>';
      if(d.tracking_url&&/^https?:\/\//.test(d.tracking_url))h+='<a class="syc-btn" href="'+esc(d.tracking_url)+'" target="_blank" rel="noopener">'+T.open+'</a>';
      out.innerHTML=h;
    }catch(err){out.innerHTML='<p class="ac-msg bad">'+T.err+'</p>'}
  };
})();
