/* Ship Your Cart — customer accounts (Supabase)
   Mounts on #syc-account (full account page) and #syc-signup (sign-up card on Shop & Ship). */
(function(){
  var C=window.SYC||{},L=C.lang||'en',P=C.prefix||'';
  var ADDR={l1:'No.37, Jalan Cempaka 3A',l2:'Kawasan Perindustrian Anugerah Suria',pc:'48000',city:'Rawang',state:'Selangor',country:'Malaysia',phone:'+60 10-707 0190'};
  var WA='60107070190';
  var RATES=[0,220,290,335,390,450,500,560,610,670,720,780,830,890,940,1000,1050,1110,1170,1220,1290];
  var GCC=['saudi','ksa','السعودية','uae','emirates','الإمارات','الامارات','oman','عمان','عُمان','kuwait','الكويت','qatar','قطر','bahrain','البحرين'];
  var T={
  en:{signin:'Sign in',signup:'Create account',email:'Email',pw:'Password',pw2:'Repeat password',name:'Full name',wa:'WhatsApp number',country:'Country',
   forgot:'Forgot password?',send_reset:'Send reset link',back:'Back to sign in',have:'Already have an account?',noacc:'New here?',
   free:'Free account — you only pay when we ship.',newpw:'Set a new password',save:'Save',signout:'Sign out',
   hello:'Hello',code:'Your customer code',addr:'Your Malaysian address',addr_note:'Use this address at checkout in any Malaysian online store. Always keep your code next to your name so we know the parcel is yours.',
   copy:'Copy address',copied:'Copied ✓',k:['Full name','Address line 1','Address line 2','Postcode','City','State','Country','Phone'],
   parcels:'Parcels in our warehouse',noparcels:'No parcels yet. When your orders arrive at our warehouse we add them here with photos and weight.',
   store:'Store',track:'Tracking',weight:'Weight',received:'Received',sel:'Select',
   st:{received:'In warehouse',in_shipment:'Shipment requested',shipped:'Shipped',on_hold:'On hold',returned:'Returned'},
   req:'Request shipment',req_h:'Ship selected parcels',req_sel:'parcel(s) selected',est:'Estimated air freight to the GCC',est_q:'We will send you a quote',
   method:'Method',m:{air:'Air',sea:'Sea',land:'Land',express:'Express'},rname:'Recipient name',rphone:'Recipient phone',raddr:'Address',rcity:'City',rcountry:'Country',note:'Note (optional)',
   submit:'Send request',cancel:'Cancel',req_ok:'Request sent. We will confirm the final price on WhatsApp.',
   ships:'My shipments',noships:'No shipments yet.',sh:'Shipment',ss:{requested:'Requested',quoted:'Price ready',paid:'Paid',shipped:'Shipped',delivered:'Delivered',cancelled:'Cancelled'},
   price:'Price',pay:'Pay now',tracking:'Tracking',cancel_req:'Cancel request',profile:'My details',saved:'Saved ✓',
   check_mail:'Almost done: we sent a confirmation link to ',check_mail2:'. Open it, then sign in.',reset_sent:'If an account exists, we sent a link to set a new password.',
   err_email:'Please enter a valid email.',err_pw:'Use at least 8 characters.',err_pw2:'The passwords don\'t match.',err_req:'Please fill in the required fields.',
   err_login:'Email or password is not correct.',err_confirm:'Please confirm your email first (check your inbox).',err_exists:'This email already has an account. Sign in instead.',err_rate:'Too many attempts. Wait a minute and try again.',
   err:'Something went wrong: ',err_load:'The account service could not load. Check your connection and refresh.',
   paid_ok:'Payment received, thank you! We will ship your parcels soon.',wa_msg:'Hi Ship Your Cart, my customer code is ',go_acc:'Go to my account',photo:'Photo'},
  ar:{signin:'تسجيل الدخول',signup:'حساب جديد',email:'الإيميل',pw:'كلمة المرور',pw2:'أعد كلمة المرور',name:'الاسم الكامل',wa:'رقم الواتساب',country:'الدولة',
   forgot:'نسيت كلمة المرور؟',send_reset:'أرسل رابط التعيين',back:'رجوع لتسجيل الدخول',have:'عندك حساب؟',noacc:'جديد عندنا؟',
   free:'الحساب مجاني، وتدفع فقط لما نشحن.',newpw:'اختر كلمة مرور جديدة',save:'حفظ',signout:'تسجيل الخروج',
   hello:'أهلاً',code:'كود العميل الخاص بك',addr:'عنوانك في ماليزيا',addr_note:'استخدم هذا العنوان عند الطلب من أي متجر ماليزي أونلاين. اكتب الكود دائمًا بجانب اسمك عشان نعرف إن الطرد لك.',
   copy:'نسخ العنوان',copied:'تم النسخ ✓',k:['Full name','Address line 1','Address line 2','Postcode','City','State','Country','Phone'],
   parcels:'طرودك في المستودع',noparcels:'ما فيه طرود للحين. لما توصل طلباتك للمستودع نضيفها هنا مع الصور والوزن.',
   store:'المتجر',track:'رقم التتبع',weight:'الوزن',received:'تاريخ الاستلام',sel:'اختيار',
   st:{received:'في المستودع',in_shipment:'طلبت شحنه',shipped:'تم الشحن',on_hold:'معلّق',returned:'مرتجع'},
   req:'اطلب الشحن',req_h:'شحن الطرود المختارة',req_sel:'طرد مختار',est:'تقدير الشحن الجوي للخليج',est_q:'بنرسل لك عرض سعر',
   method:'طريقة الشحن',m:{air:'جوي',sea:'بحري',land:'بري',express:'سريع'},rname:'اسم المستلم',rphone:'جوال المستلم',raddr:'العنوان',rcity:'المدينة',rcountry:'الدولة',note:'ملاحظة (اختياري)',
   submit:'أرسل الطلب',cancel:'إلغاء',req_ok:'تم إرسال طلبك. بنأكد لك السعر النهائي على الواتساب.',
   ships:'شحناتي',noships:'ما فيه شحنات للحين.',sh:'شحنة',ss:{requested:'تم الطلب',quoted:'السعر جاهز',paid:'تم الدفع',shipped:'تم الشحن',delivered:'تم التسليم',cancelled:'ملغاة'},
   price:'السعر',pay:'ادفع الحين',tracking:'التتبع',cancel_req:'إلغاء الطلب',profile:'بياناتي',saved:'تم الحفظ ✓',
   check_mail:'بقيت خطوة: أرسلنا رابط تأكيد إلى ',check_mail2:'. افتحه ثم سجّل الدخول.',reset_sent:'إذا كان عندك حساب، أرسلنا لك رابط لتعيين كلمة مرور جديدة.',
   err_email:'اكتب إيميل صحيح.',err_pw:'استخدم 8 أحرف على الأقل.',err_pw2:'كلمتا المرور غير متطابقتين.',err_req:'عبّ الحقول المطلوبة.',
   err_login:'الإيميل أو كلمة المرور غير صحيحة.',err_confirm:'أكّد إيميلك أولاً (شيك بريدك).',err_exists:'هذا الإيميل له حساب. سجّل الدخول بداله.',err_rate:'محاولات كثيرة. انتظر دقيقة وحاول مرة ثانية.',
   err:'صار خطأ: ',err_load:'تعذّر تحميل خدمة الحساب. تأكد من اتصالك وحدّث الصفحة.',
   paid_ok:'استلمنا الدفع، شكراً لك! بنشحن طرودك قريب.',wa_msg:'هلا Ship Your Cart، كود العميل حقي ',go_acc:'روح لحسابي',photo:'صورة'},
  ms:{signin:'Log masuk',signup:'Buka akaun',email:'E-mel',pw:'Kata laluan',pw2:'Ulang kata laluan',name:'Nama penuh',wa:'Nombor WhatsApp',country:'Negara',
   forgot:'Lupa kata laluan?',send_reset:'Hantar pautan',back:'Kembali ke log masuk',have:'Sudah ada akaun?',noacc:'Baru di sini?',
   free:'Akaun percuma — anda hanya bayar apabila kami menghantar.',newpw:'Tetapkan kata laluan baharu',save:'Simpan',signout:'Log keluar',
   hello:'Hai',code:'Kod pelanggan anda',addr:'Alamat Malaysia anda',addr_note:'Gunakan alamat ini semasa checkout di mana-mana kedai dalam talian Malaysia. Sentiasa letakkan kod anda di sebelah nama.',
   copy:'Salin alamat',copied:'Disalin ✓',k:['Full name','Address line 1','Address line 2','Postcode','City','State','Country','Phone'],
   parcels:'Bungkusan di gudang kami',noparcels:'Belum ada bungkusan. Apabila pesanan anda tiba di gudang, kami tambah di sini dengan gambar dan berat.',
   store:'Kedai',track:'Penjejakan',weight:'Berat',received:'Diterima',sel:'Pilih',
   st:{received:'Di gudang',in_shipment:'Penghantaran diminta',shipped:'Dihantar',on_hold:'Ditahan',returned:'Dipulangkan'},
   req:'Minta penghantaran',req_h:'Hantar bungkusan terpilih',req_sel:'bungkusan dipilih',est:'Anggaran kargo udara ke GCC',est_q:'Kami akan hantar sebut harga',
   method:'Kaedah',m:{air:'Udara',sea:'Laut',land:'Darat',express:'Ekspres'},rname:'Nama penerima',rphone:'Telefon penerima',raddr:'Alamat',rcity:'Bandar',rcountry:'Negara',note:'Nota (pilihan)',
   submit:'Hantar permintaan',cancel:'Batal',req_ok:'Permintaan dihantar. Kami akan sahkan harga akhir melalui WhatsApp.',
   ships:'Penghantaran saya',noships:'Belum ada penghantaran.',sh:'Penghantaran',ss:{requested:'Diminta',quoted:'Harga sedia',paid:'Dibayar',shipped:'Dihantar',delivered:'Diterima',cancelled:'Dibatalkan'},
   price:'Harga',pay:'Bayar sekarang',tracking:'Penjejakan',cancel_req:'Batal permintaan',profile:'Butiran saya',saved:'Disimpan ✓',
   check_mail:'Hampir siap: kami hantar pautan pengesahan ke ',check_mail2:'. Buka pautan itu, kemudian log masuk.',reset_sent:'Jika akaun wujud, kami telah hantar pautan untuk kata laluan baharu.',
   err_email:'Masukkan e-mel yang sah.',err_pw:'Gunakan sekurang-kurangnya 8 aksara.',err_pw2:'Kata laluan tidak sama.',err_req:'Sila isi ruangan wajib.',
   err_login:'E-mel atau kata laluan salah.',err_confirm:'Sila sahkan e-mel anda dahulu.',err_exists:'E-mel ini sudah ada akaun. Sila log masuk.',err_rate:'Terlalu banyak cubaan. Tunggu seminit.',
   err:'Ralat: ',err_load:'Perkhidmatan akaun tidak dapat dimuatkan. Semak sambungan dan muat semula.',
   paid_ok:'Bayaran diterima, terima kasih! Kami akan menghantar bungkusan anda tidak lama lagi.',wa_msg:'Hai Ship Your Cart, kod pelanggan saya ',go_acc:'Ke akaun saya',photo:'Gambar'}
  }[L];
  var $=function(s,r){return (r||document).querySelector(s)};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var fmtD=function(d){try{return new Date(d).toLocaleDateString(L==='ar'?'ar':(L==='ms'?'ms-MY':'en-GB'),{day:'numeric',month:'short',year:'numeric'})}catch(e){return d}};
  var rm=function(n){return 'RM '+Number(n).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2})};
  var ACC=P+'/account/';
  var rootA=$('#syc-account'),rootS=$('#syc-signup');
  if(!rootA&&!rootS)return;
  if(!window.supabase||!C.url){(rootA||rootS).innerHTML='<p class="ac-msg bad">'+T.err_load+'</p>';return}
  var sb=window.supabase.createClient(C.url,C.key,{auth:{persistSession:true,detectSessionInUrl:true,flowType:'implicit'}});
  function friendly(m){m=String(m||'');
    if(/invalid login credentials/i.test(m))return T.err_login;
    if(/not confirmed/i.test(m))return T.err_confirm;
    if(/already (been )?registered/i.test(m))return T.err_exists;
    if(/rate limit|too many/i.test(m))return T.err_rate;
    if(/at least|weak/i.test(m))return T.err_pw;
    return T.err+esc(m)}
  function field(id,label,type,val,req,ac){return '<label class="ac-l" for="'+id+'">'+label+(req?' *':'')+'</label><input class="ac-i" id="'+id+'" type="'+(type||'text')+'" value="'+esc(val||'')+'"'+(req?' required':'')+(ac?' autocomplete="'+ac+'"':'')+(type==='email'||type==='tel'?' dir="ltr"':'')+'>'}
  function waLink(text){return 'https://api.whatsapp.com/send?phone='+WA+'&text='+encodeURIComponent(text)}

  /* ---------- auth card ---------- */
  var mode='signin',note=null,lastEmail='';
  function authCard(root,embed){
    var tabs='<div class="ac-tabs"><button type="button" data-m="signin" class="'+(mode==='signin'?'on':'')+'">'+T.signin+'</button><button type="button" data-m="signup" class="'+(mode==='signup'?'on':'')+'">'+T.signup+'</button></div>';
    var f='';
    if(mode==='signup'){f=field('acName',T.name,'text','',1,'name')+field('acWa',T.wa,'tel','',1,'tel')+field('acCountry',T.country,'text','',1,'country-name')+field('acEmail',T.email,'email',lastEmail,1,'email')+field('acPw',T.pw,'password','',1,'new-password')+field('acPw2',T.pw2,'password','',1,'new-password')}
    else if(mode==='forgot'){f=field('acEmail',T.email,'email',lastEmail,1,'email')}
    else if(mode==='reset'){f=field('acPw',T.newpw,'password','',1,'new-password')+field('acPw2',T.pw2,'password','',1,'new-password')}
    else {f=field('acEmail',T.email,'email',lastEmail,1,'email')+field('acPw',T.pw,'password','',1,'current-password')}
    var btn={signin:T.signin,signup:T.signup,forgot:T.send_reset,reset:T.save}[mode];
    var links=mode==='signin'?'<button type="button" class="ac-link" data-m="forgot">'+T.forgot+'</button>':(mode==='forgot'?'<button type="button" class="ac-link" data-m="signin">'+T.back+'</button>':'');
    root.innerHTML='<div class="ac-card ac-auth">'+((mode==='signin'||mode==='signup')?tabs:'<h3 class="ac-h">'+(mode==='reset'?T.newpw:T.forgot)+'</h3>')+
      '<form class="ac-form" novalidate>'+f+(note?'<p class="ac-msg '+note[0]+'">'+note[1]+'</p>':'')+'<button class="syc-btn ac-submit" type="submit">'+btn+'</button>'+links+'</form>'+
      (mode==='signup'?'<p class="ac-free">'+T.free+'</p>':'')+'</div>';
    root.querySelectorAll('[data-m]').forEach(function(b){b.addEventListener('click',function(){var e=$('#acEmail',root);if(e)lastEmail=e.value.trim();mode=b.getAttribute('data-m');note=null;authCard(root,embed)})});
    $('form',root).addEventListener('submit',function(e){e.preventDefault();submitAuth(root,embed)});
  }
  async function submitAuth(root,embed){
    var g=function(id){var x=$('#'+id,root);return x?x.value.trim():''};
    var email=g('acEmail'),pw=($('#acPw',root)||{}).value||'',pw2=($('#acPw2',root)||{}).value||'';
    if(mode!=='reset'&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){note=['bad',T.err_email];lastEmail=email;return authCard(root,embed)}
    if((mode==='signup'||mode==='reset')&&pw.length<8){note=['bad',T.err_pw];lastEmail=email;return authCard(root,embed)}
    if((mode==='signup'||mode==='reset')&&pw!==pw2){note=['bad',T.err_pw2];lastEmail=email;return authCard(root,embed)}
    if(mode==='signup'&&(!g('acName')||!g('acWa')||!g('acCountry'))){note=['bad',T.err_req];lastEmail=email;return authCard(root,embed)}
    lastEmail=email;var b=$('.ac-submit',root);b.disabled=true;b.classList.add('busy');var r;
    try{
      if(mode==='signin'){r=await sb.auth.signInWithPassword({email:email,password:pw});if(r.error)throw r.error;return afterLogin(embed)}
      if(mode==='signup'){r=await sb.auth.signUp({email:email,password:pw,options:{emailRedirectTo:location.origin+ACC,data:{full_name:g('acName'),whatsapp:g('acWa'),country:g('acCountry'),lang:L}}});
        if(r.error)throw r.error;
        if(r.data&&r.data.user&&r.data.user.identities&&r.data.user.identities.length===0)throw new Error('already registered');
        if(r.data&&r.data.session)return afterLogin(embed);
        mode='signin';note=['good',T.check_mail+esc(email)+T.check_mail2];return authCard(root,embed)}
      if(mode==='forgot'){r=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+ACC});if(r.error)throw r.error;mode='signin';note=['good',T.reset_sent];return authCard(root,embed)}
      if(mode==='reset'){r=await sb.auth.updateUser({password:pw});if(r.error)throw r.error;mode='signin';note=null;return afterLogin(embed)}
    }catch(err){note=['bad',friendly(err.message||err)];authCard(root,embed)}
  }
  function afterLogin(embed){if(embed){location.href=ACC;return}load()}

  /* ---------- dashboard ---------- */
  var me=null,parcels=[],ships=[],urls={},sel={};
  function addrVals(){var c=me.code;return [me.full_name+' '+c,ADDR.l1,ADDR.l2+', '+c,ADDR.pc,ADDR.city,ADDR.state,ADDR.country,ADDR.phone]}
  async function load(){
    var s;try{s=await Promise.race([sb.auth.getSession(),new Promise(function(_,r){setTimeout(function(){r(new Error('timeout'))},10000)})])}catch(e){mode='signin';note=['bad',T.err+esc(e.message)];return authCard(rootA,false)}
    var sess=s.data&&s.data.session;
    if(!sess){mode=mode==='reset'?'reset':'signin';return authCard(rootA,false)}
    var r=await sb.from('customers').select('*').eq('id',sess.user.id).maybeSingle();
    if(r.error||!r.data){rootA.innerHTML='<p class="ac-msg bad">'+T.err+esc(r.error?r.error.message:'no profile')+'</p><button class="ac-link" id="acOut">'+T.signout+'</button>';$('#acOut').onclick=signOut;return}
    me=r.data;try{localStorage.setItem('syc_code',me.code)}catch(e){}
    var a=await sb.from('parcels').select('*').order('received_at',{ascending:false});
    var b=await sb.from('shipments').select('*').order('created_at',{ascending:false});
    parcels=a.data||[];ships=b.data||[];
    var paths=[];parcels.forEach(function(p){(p.photos||[]).forEach(function(x){if(!urls[x])paths.push(x)})});
    if(paths.length){var u=await sb.storage.from('parcel-photos').createSignedUrls(paths,3600);(u.data||[]).forEach(function(x){if(x.signedUrl)urls[x.path]=x.signedUrl})}
    render();
  }
  var stripe=null;
  async function pay(id,btn){
    btn.disabled=true;btn.classList.add('busy');
    try{
      if(!window.Stripe)throw new Error('Stripe');
      stripe=stripe||window.Stripe(C.stripePk,{locale:L==='ms'?'ms':L});
      var r=await sb.functions.invoke('checkout',{body:{shipment_id:id,action:'start',lang:L}});
      if(r.error||!r.data||!r.data.clientSecret)throw new Error((r.data&&r.data.error)||(r.error&&r.error.message)||'checkout');
      var m=document.createElement('div');m.className='ac-modal';m.innerHTML='<div class="ac-mbox"><button class="ac-mx" aria-label="close">×</button><div id="acCheckout"></div></div>';document.body.appendChild(m);
      var co=await stripe.initEmbeddedCheckout({fetchClientSecret:function(){return Promise.resolve(r.data.clientSecret)}});co.mount('#acCheckout');
      m.querySelector('.ac-mx').onclick=function(){try{co.destroy()}catch(e){}m.remove()};
    }catch(e){alert(T.err+(e.message||e))}
    btn.disabled=false;btn.classList.remove('busy');
  }
  async function afterPay(){
    var q=new URLSearchParams(location.search);if(!q.get('paid')||!q.get('session_id'))return;
    history.replaceState(null,'',location.pathname);
    try{await sb.functions.invoke('checkout',{body:{shipment_id:+q.get('paid'),action:'confirm',session_id:q.get('session_id'),lang:L}})}catch(e){}
    await load();var m=document.createElement('p');m.className='ac-msg good';m.textContent=T.paid_ok;rootA.insertBefore(m,rootA.firstChild);
  }
  async function signOut(){await sb.auth.signOut();try{localStorage.removeItem('syc_code')}catch(e){}location.href=ACC}
  function render(){
    var v=addrVals();
    var dl=T.k.map(function(k,i){return '<dt>'+k+'</dt><dd>'+esc(v[i])+'</dd>'}).join('');
    var h='<div class="ac-top"><div><div class="ac-hello">'+T.hello+', '+esc(me.full_name||me.email)+'</div><div class="ac-codek">'+T.code+'</div><div class="ac-code">'+esc(me.code)+'</div></div><button class="ac-link" id="acOut">'+T.signout+'</button></div>';
    h+='<div class="ac-card syc-addr2"><h3 class="ac-h">'+T.addr+'</h3><dl class="ac-dl">'+dl+'</dl><p class="ac-note">'+T.addr_note+'</p><div class="ac-btns"><button class="syc-btn" id="acCopy">'+T.copy+'</button><a class="ac-wa" target="_blank" rel="noopener" href="'+waLink(T.wa_msg+me.code)+'">WhatsApp</a></div></div>';
    // parcels
    h+='<div class="ac-card"><h3 class="ac-h">'+T.parcels+'</h3>';
    if(!parcels.length)h+='<p class="ac-empty">'+T.noparcels+'</p>';
    else{h+='<div class="ac-parcels">'+parcels.map(function(p){
      var can=p.status==='received'&&!p.shipment_id;
      var ph=(p.photos||[]).map(function(x){return urls[x]?'<a href="'+urls[x]+'" target="_blank" rel="noopener"><img src="'+urls[x]+'" alt="'+T.photo+'" loading="lazy"></a>':''}).join('');
      return '<div class="ac-parcel'+(sel[p.id]?' on':'')+'">'+(can?'<label class="ac-chk"><input type="checkbox" data-p="'+p.id+'"'+(sel[p.id]?' checked':'')+'> '+T.sel+'</label>':'')+
        '<div class="ac-ph">'+(ph||'<div class="ac-noph">📦</div>')+'</div>'+
        '<div class="ac-pb"><div class="ac-pt">#'+p.id+(p.store?' · '+esc(p.store):'')+'</div>'+(p.description?'<div class="ac-pd">'+esc(p.description)+'</div>':'')+
        '<div class="ac-pm">'+(p.weight_kg?T.weight+': <b>'+p.weight_kg+' kg</b> · ':'')+T.received+': '+fmtD(p.received_at)+(p.tracking_in?'<br>'+T.track+': <span dir="ltr">'+esc(p.tracking_in)+'</span>':'')+'</div>'+
        '<span class="ac-pill s-'+p.status+'">'+(T.st[p.status]||p.status)+'</span></div></div>'}).join('')+'</div>';
      var n=Object.keys(sel).filter(function(k){return sel[k]}).length;
      if(parcels.some(function(p){return p.status==='received'&&!p.shipment_id}))h+='<div class="ac-reqbar"><span>'+n+' '+T.req_sel+'</span><button class="syc-btn" id="acReq"'+(n?'':' disabled')+'>'+T.req+'</button></div><div id="acReqForm"></div>';
    }
    h+='</div>';
    // shipments
    h+='<div class="ac-card"><h3 class="ac-h">'+T.ships+'</h3>';
    if(!ships.length)h+='<p class="ac-empty">'+T.noships+'</p>';
    else h+=ships.map(function(s){var cnt=parcels.filter(function(p){return p.shipment_id===s.id}).length;
      return '<div class="ac-ship"><div class="ac-sh1"><b>'+T.sh+' #'+s.id+'</b> · '+fmtD(s.created_at)+' · '+(T.m[s.method]||s.method)+(cnt?' · '+cnt+' 📦':'')+'<span class="ac-pill s-'+s.status+'">'+(T.ss[s.status]||s.status)+'</span></div>'+
        '<div class="ac-sh2">'+esc([s.ship_name,s.ship_city,s.ship_country].filter(Boolean).join(', '))+(s.weight_kg?' · '+s.weight_kg+' kg':'')+'</div>'+
        (s.price_rm?'<div class="ac-sh3">'+T.price+': <b>'+rm(s.price_rm)+'</b>'+(s.status==='quoted'?(C.stripePk?' <button class="syc-btn ac-pay" data-pay="'+s.id+'">'+T.pay+'</button>':(s.payment_link?' <a class="syc-btn ac-pay" href="'+esc(s.payment_link)+'" target="_blank" rel="noopener">'+T.pay+'</a>':'')):'')+'</div>':'')+
        (s.tracking_no?'<div class="ac-sh3">'+T.tracking+': '+(s.tracking_url?'<a href="'+esc(s.tracking_url)+'" target="_blank" rel="noopener" dir="ltr">'+esc((s.carrier?s.carrier+' ':'')+s.tracking_no)+'</a>':'<span dir="ltr">'+esc((s.carrier?s.carrier+' ':'')+s.tracking_no)+'</span>')+'</div>':'')+
        (s.status==='requested'?'<button class="ac-link" data-cancel="'+s.id+'">'+T.cancel_req+'</button>':'')+'</div>'}).join('');
    h+='</div>';
    // profile
    h+='<details class="ac-card ac-prof"><summary class="ac-h">'+T.profile+'</summary><form id="acProf" class="ac-form">'+field('pfName',T.name,'text',me.full_name,1)+field('pfWa',T.wa,'tel',me.whatsapp,1)+field('pfCountry',T.country,'text',me.country,1)+
      '<p class="ac-muted">'+T.email+': <span dir="ltr">'+esc(me.email)+'</span></p><button class="syc-btn" type="submit">'+T.save+'</button><span id="pfMsg" class="ac-ok"></span></form></details>';
    rootA.innerHTML=h;bind(v);
  }
  function bind(v){
    rootA.querySelectorAll('[data-pay]').forEach(function(b){b.onclick=function(){pay(+b.getAttribute('data-pay'),b)}});
    $('#acOut').onclick=signOut;
    var txt=T.k.map(function(k,i){return k+': '+v[i]}).join('\n');
    var cb=$('#acCopy');cb.onclick=function(){function ok(){cb.textContent=T.copied;setTimeout(function(){cb.textContent=T.copy},2000)}
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok,fb);else fb();
      function fb(){var t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch(e){}t.remove();ok()}};
    rootA.querySelectorAll('[data-p]').forEach(function(c){c.onchange=function(){sel[c.getAttribute('data-p')]=c.checked;render()}});
    var rq=$('#acReq');if(rq)rq.onclick=reqForm;
    rootA.querySelectorAll('[data-cancel]').forEach(function(b){b.onclick=async function(){b.disabled=true;var r=await sb.rpc('cancel_shipment',{p_id:+b.getAttribute('data-cancel')});if(r.error)alert(friendly(r.error.message));load()}});
    $('#acProf').onsubmit=async function(e){e.preventDefault();var r=await sb.from('customers').update({full_name:$('#pfName').value.trim(),whatsapp:$('#pfWa').value.trim(),country:$('#pfCountry').value.trim()}).eq('id',me.id);$('#pfMsg').textContent=r.error?friendly(r.error.message):T.saved;if(!r.error){me.full_name=$('#pfName').value.trim()}};
  }
  function estimate(ids,country){
    var kg=0,miss=false;ids.forEach(function(id){var p=parcels.find(function(x){return String(x.id)===String(id)});if(p&&p.weight_kg){var vol=(p.length_cm&&p.width_cm&&p.height_cm)?p.length_cm*p.width_cm*p.height_cm/5000:0;kg+=Math.max(+p.weight_kg,vol)}else miss=true});
    var gcc=GCC.some(function(g){return String(country||'').toLowerCase().indexOf(g)>-1});
    var c=Math.ceil(kg);if(miss||!gcc||c<1||c>20)return '<p class="ac-est">'+T.est_q+'</p>';
    return '<p class="ac-est">'+T.est+' ('+c+' kg): <b>'+rm(RATES[c])+'</b></p>';
  }
  function reqForm(){
    var ids=Object.keys(sel).filter(function(k){return sel[k]});
    var box=$('#acReqForm');
    box.innerHTML='<form class="ac-form ac-req"><h4 class="ac-h">'+T.req_h+' ('+ids.length+')</h4>'+
      '<label class="ac-l">'+T.method+'</label><select class="ac-i" id="rqM">'+['air','sea','land','express'].map(function(m){return '<option value="'+m+'">'+T.m[m]+'</option>'}).join('')+'</select>'+
      field('rqName',T.rname,'text',me.ship_name||me.full_name,1)+field('rqPhone',T.rphone,'tel',me.ship_phone||me.whatsapp,1)+field('rqAddr',T.raddr,'text',me.ship_address,1)+field('rqCity',T.rcity,'text',me.ship_city,1)+field('rqCountry',T.rcountry,'text',me.ship_country||me.country,1)+
      '<label class="ac-l" for="rqNote">'+T.note+'</label><textarea class="ac-i" id="rqNote" rows="2"></textarea><div id="rqEst"></div><p id="rqMsg"></p>'+
      '<div class="ac-btns"><button class="syc-btn" type="submit">'+T.submit+'</button><button type="button" class="ac-link" id="rqX">'+T.cancel+'</button></div></form>';
    var upd=function(){$('#rqEst').innerHTML=estimate(ids,$('#rqCountry').value)};upd();$('#rqCountry').oninput=upd;
    $('#rqX').onclick=function(){box.innerHTML=''};
    box.scrollIntoView({behavior:'smooth',block:'start'});
    $('form',box).onsubmit=async function(e){e.preventDefault();
      var g=function(id){return $('#'+id).value.trim()};
      if(!g('rqName')||!g('rqPhone')||!g('rqAddr')||!g('rqCity')||!g('rqCountry')){$('#rqMsg').className='ac-msg bad';$('#rqMsg').textContent=T.err_req;return}
      var b=$('button[type=submit]',box);b.disabled=true;
      var r=await sb.rpc('request_shipment',{p_parcels:ids.map(Number),p_method:g('rqM'),p_name:g('rqName'),p_phone:g('rqPhone'),p_address:g('rqAddr'),p_city:g('rqCity'),p_country:g('rqCountry'),p_note:g('rqNote')});
      if(r.error){b.disabled=false;$('#rqMsg').className='ac-msg bad';$('#rqMsg').textContent=friendly(r.error.message);return}
      sel={};await load();var m=document.createElement('p');m.className='ac-msg good';m.textContent=T.req_ok;rootA.insertBefore(m,rootA.firstChild);
      window.open(waLink(T.wa_msg+me.code+' - '+T.sh+' #'+r.data),'_blank');
    };
  }

  /* ---------- start ---------- */
  sb.auth.onAuthStateChange(function(ev){if(ev==='PASSWORD_RECOVERY'&&rootA){mode='reset';note=null;authCard(rootA,false)}});
  if(rootS){mode='signup';sb.auth.getSession().then(function(s){if(s.data&&s.data.session){rootS.innerHTML='<div class="ac-card ac-auth"><p>'+T.hello+'</p><a class="syc-btn" href="'+ACC+'">'+T.go_acc+'</a></div>'}else authCard(rootS,true)})}
  if(rootA){if(/type=recovery/.test(location.hash)){mode='reset';setTimeout(function(){authCard(rootA,false)},300)}else{var q=new URLSearchParams(location.search);if(q.get('paid'))afterPay();else load()}}
})();
