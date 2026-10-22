/* Ship Your Cart — team admin (Arabic). Access limited to emails in the admins table. */
(function(){
  var C=window.SYC||{},root=document.getElementById('syc-admin');
  var $=function(s,r){return (r||document).querySelector(s)};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var fmtD=function(d){try{return new Date(d).toLocaleDateString('ar',{day:'numeric',month:'short',year:'numeric'})}catch(e){return d}};
  var PST={received:'في المستودع',in_shipment:'ضمن شحنة',shipped:'تم الشحن',on_hold:'معلّق',returned:'مرتجع'};
  var SST={requested:'طلب جديد',quoted:'تم التسعير',paid:'مدفوع',shipped:'تم الشحن',delivered:'تم التسليم',cancelled:'ملغى'};
  var MT={air:'جوي',sea:'بحري',land:'بري',express:'سريع'};
  var waNum=function(n){return String(n||'').replace(/[^0-9]/g,'')};
  var waLink=function(n,t){return 'https://wa.me/'+waNum(n)+'?text='+encodeURIComponent(t)};
  if(!window.supabase){root.innerHTML='<p class="ac-msg bad">تعذّر تحميل الخدمة. حدّث الصفحة.</p>';return}
  var sb=window.supabase.createClient(C.url,C.key,{auth:{persistSession:true,lock:function(n,t,fn){return fn()},detectSessionInUrl:true}});
  var urls={};

  function login(msg){
    root.innerHTML='<div class="ac-card ac-auth"><h3 class="ac-h">دخول الفريق</h3><form class="ac-form" id="lg"><label class="ac-l">الإيميل</label><input class="ac-i" id="lgE" type="email" dir="ltr" autocomplete="email"><label class="ac-l">كلمة المرور</label><input class="ac-i" id="lgP" type="password" dir="ltr" autocomplete="current-password">'+(msg?'<p class="ac-msg bad">'+msg+'</p>':'')+'<button class="syc-btn" type="submit">دخول</button></form></div>';
    $('#lg').onsubmit=async function(e){e.preventDefault();var r=await sb.auth.signInWithPassword({email:$('#lgE').value.trim(),password:$('#lgP').value});if(r.error)return login('الإيميل أو كلمة المرور غير صحيحة.');start()};
  }
  window.addEventListener('error',function(e){if(root&&!root.querySelector('.ac-card'))root.innerHTML='<p class="ac-msg bad">خطأ: '+esc(e.message)+'</p>'});
  window.addEventListener('unhandledrejection',function(e){root.insertAdjacentHTML('afterbegin','<p class="ac-msg bad">خطأ: '+esc(e.reason&&e.reason.message||e.reason)+'</p>')});
  function withTimeout(p,ms){return Promise.race([p,new Promise(function(_,rej){setTimeout(function(){rej(new Error('انتهت مهلة الاتصال بقاعدة البيانات'))},ms)})])}
  async function start(){
    var s;try{s=await withTimeout(sb.auth.getSession(),10000)}catch(e){return login(esc(e.message))}
    if(!s.data.session)return login();
    var a=await sb.rpc('is_admin');
    $('#adWho').innerHTML=esc(s.data.session.user.email)+' · <button class="ac-link" id="adOut">خروج</button>';
    $('#adOut').onclick=async function(){await sb.auth.signOut();location.reload()};
    if(a.error||!a.data){root.innerHTML='<p class="ac-msg bad">هذا الحساب ما عنده صلاحية الإدارة. أضف الإيميل في جدول admins في Supabase.</p>';return}
    shell();
  }
  var view='ships';
  function shell(){
    root.innerHTML='<div class="ad-tabs"><button data-v="ships">الشحنات</button><button data-v="cust">العملاء</button><button data-v="add">استلام طرد</button></div><div id="adBody"></div>';
    root.querySelectorAll('[data-v]').forEach(function(b){b.onclick=function(){view=b.getAttribute('data-v');go()}});go();
  }
  function go(){root.querySelectorAll('[data-v]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-v')===view)});({ships:ships,cust:custList,add:addByCode})[view]()}
  var body=function(){return $('#adBody')};

  /* ---------- customers ---------- */
  async function custList(q){
    body().innerHTML='<div class="ac-card"><input class="ac-i" id="cq" placeholder="ابحث بالكود أو الاسم أو الجوال أو الإيميل" value="'+esc(q||'')+'"><div id="cl" class="ad-list"><div class="ac-loading"></div></div></div>';
    var inp=$('#cq');var t;inp.oninput=function(){clearTimeout(t);t=setTimeout(function(){custList(inp.value.trim())},350)};if(q){inp.focus();inp.setSelectionRange(q.length,q.length)}
    var qq=sb.from('customers').select('*').order('created_at',{ascending:false}).limit(60);
    if(q){var s=q.replace(/[,%()]/g,' ');qq=qq.or('code.ilike.%'+s+'%,full_name.ilike.%'+s+'%,whatsapp.ilike.%'+s+'%,email.ilike.%'+s+'%')}
    var r=await qq;var l=$('#cl');if(!l)return;
    if(r.error){l.innerHTML='<p class="ac-msg bad">'+esc(r.error.message)+'</p>';return}
    l.innerHTML=(r.data||[]).map(function(c){return '<button class="ad-row" data-c="'+c.id+'"><b class="ad-code">'+esc(c.code)+'</b><span>'+esc(c.full_name)+'</span><span dir="ltr">'+esc(c.whatsapp)+'</span><span>'+esc(c.country)+'</span><span class="ac-muted">'+fmtD(c.created_at)+'</span></button>'}).join('')||'<p class="ac-empty">ما فيه نتائج.</p>';
    l.querySelectorAll('[data-c]').forEach(function(b){b.onclick=function(){customer(b.getAttribute('data-c'))}});
  }
  async function signed(paths){paths=paths.filter(function(p){return !urls[p]});if(!paths.length)return;var u=await sb.storage.from('parcel-photos').createSignedUrls(paths,3600);(u.data||[]).forEach(function(x){if(x.signedUrl)urls[x.path]=x.signedUrl})}
  async function customer(id,flash){
    body().innerHTML='<div class="ac-loading"></div>';
    var c=(await sb.from('customers').select('*').eq('id',id).single()).data;
    var ps=(await sb.from('parcels').select('*').eq('customer_id',id).order('received_at',{ascending:false})).data||[];
    var ss=(await sb.from('shipments').select('*').eq('customer_id',id).order('created_at',{ascending:false})).data||[];
    var all=[];ps.forEach(function(p){all=all.concat(p.photos||[])});await signed(all);
    var h=(flash?'<p class="ac-msg good">'+flash+'</p>':'')+'<button class="ac-link" id="bk">→ رجوع للعملاء</button>';
    h+='<div class="ac-card"><div class="ac-top"><div><div class="ac-code">'+esc(c.code)+'</div><div class="ac-hello">'+esc(c.full_name)+'</div><div class="ac-muted"><span dir="ltr">'+esc(c.email)+'</span> · '+esc(c.country)+' · منذ '+fmtD(c.created_at)+'</div></div>'+
      (c.whatsapp?'<a class="ac-wa" target="_blank" rel="noopener" href="'+waLink(c.whatsapp,'هلا '+c.full_name+' 👋 معك Ship Your Cart. ')+'" dir="ltr">'+esc(c.whatsapp)+'</a>':'')+'</div>'+
      '<label class="ac-l">ملاحظة داخلية</label><textarea class="ac-i" id="cn" rows="2">'+esc(c.admin_note||'')+'</textarea><button class="ac-link" id="cns">حفظ الملاحظة</button></div>';
    h+='<div class="ac-card"><h3 class="ac-h">استلام طرد جديد لـ '+esc(c.code)+'</h3>'+parcelForm()+'</div>';
    h+='<div class="ac-card"><h3 class="ac-h">الطرود ('+ps.length+')</h3>'+(ps.length?ps.map(parcelRow).join(''):'<p class="ac-empty">ما فيه طرود.</p>')+'</div>';
    h+='<div class="ac-card"><h3 class="ac-h">الشحنات ('+ss.length+')</h3>'+(ss.length?ss.map(function(s){return shipCard(s,c,ps)}).join(''):'<p class="ac-empty">ما فيه شحنات.</p>')+'</div>';
    body().innerHTML=h;
    $('#bk').onclick=function(){custList()};
    $('#cns').onclick=async function(){var r=await sb.from('customers').update({admin_note:$('#cn').value}).eq('id',id);$('#cns').textContent=r.error?r.error.message:'تم الحفظ ✓'};
    bindParcelForm(c,function(msg){customer(id,msg)});
    bindParcelRows(function(){customer(id)});
    bindShipCards(function(){customer(id)});
  }

  /* ---------- parcels ---------- */
  function parcelForm(){return '<form class="ac-form ad-pf" id="pf"><div class="ad-g2"><div><label class="ac-l">المتجر</label><input class="ac-i" id="pfS" placeholder="Shopee, Lazada..."></div><div><label class="ac-l">رقم التتبع الوارد</label><input class="ac-i" id="pfT" dir="ltr"></div></div>'+
    '<label class="ac-l">الوصف</label><input class="ac-i" id="pfD" placeholder="مثلاً: ملابس، 2 قطعة">'+
    '<div class="ad-g4"><div><label class="ac-l">الوزن كجم *</label><input class="ac-i" id="pfW" type="number" step="0.01" min="0" dir="ltr"></div><div><label class="ac-l">طول سم</label><input class="ac-i" id="pfL" type="number" step="0.1" dir="ltr"></div><div><label class="ac-l">عرض سم</label><input class="ac-i" id="pfWi" type="number" step="0.1" dir="ltr"></div><div><label class="ac-l">ارتفاع سم</label><input class="ac-i" id="pfH" type="number" step="0.1" dir="ltr"></div></div>'+
    '<label class="ac-l">صور الطرد</label><input class="ac-i" id="pfP" type="file" accept="image/*" multiple>'+
    '<label class="ac-l">ملاحظة داخلية</label><input class="ac-i" id="pfN"><p id="pfM"></p><button class="syc-btn" type="submit">حفظ الطرد</button></form>'}
  function shrink(file){return new Promise(function(res){
    if(!/^image\//.test(file.type)||file.type==='image/gif')return res(file);
    var img=new Image(),u=URL.createObjectURL(file);img.onload=function(){var m=1600,w=img.width,h=img.height,k=Math.min(1,m/Math.max(w,h));var cv=document.createElement('canvas');cv.width=Math.round(w*k);cv.height=Math.round(h*k);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);cv.toBlob(function(b){URL.revokeObjectURL(u);res(b||file)},'image/jpeg',0.82)};img.onerror=function(){res(file)};img.src=u})}
  function bindParcelForm(c,done){
    var f=$('#pf');if(!f)return;
    f.onsubmit=async function(e){e.preventDefault();var n=function(id){var v=$('#'+id).value;return v===''?null:+v};
      if(!$('#pfW').value){$('#pfM').className='ac-msg bad';$('#pfM').textContent='اكتب الوزن.';return}
      var b=$('button[type=submit]',f);b.disabled=true;$('#pfM').className='ac-muted';$('#pfM').textContent='جاري الحفظ...';
      var r=await sb.from('parcels').insert({customer_id:c.id,store:$('#pfS').value.trim()||null,tracking_in:$('#pfT').value.trim()||null,description:$('#pfD').value.trim()||null,weight_kg:n('pfW'),length_cm:n('pfL'),width_cm:n('pfWi'),height_cm:n('pfH'),admin_note:$('#pfN').value.trim()||null}).select().single();
      if(r.error){b.disabled=false;$('#pfM').className='ac-msg bad';$('#pfM').textContent=r.error.message;return}
      var p=r.data,files=[].slice.call($('#pfP').files||[]),paths=[];
      for(var i=0;i<files.length;i++){$('#pfM').textContent='رفع الصور '+(i+1)+'/'+files.length+'...';var blob=await shrink(files[i]);var path=c.id+'/'+p.id+'/'+Date.now()+'-'+i+'.jpg';
        var u=await sb.storage.from('parcel-photos').upload(path,blob,{contentType:blob.type||'image/jpeg',upsert:false});if(!u.error)paths.push(path)}
      if(paths.length)await sb.from('parcels').update({photos:paths}).eq('id',p.id);
      var msg='هلا '+c.full_name+' 👋\nوصل طردك لمستودع Ship Your Cart ✅\nرقم الطرد: #'+p.id+(p.store?'\nالمتجر: '+p.store:'')+'\nالوزن: '+p.weight_kg+' كجم\nتقدر تشوف الصور وتطلب الشحن من حسابك: https://shipyourcart.com.my/ar/account/';
      done('تم حفظ الطرد #'+p.id+(c.whatsapp?' — <a target="_blank" rel="noopener" href="'+waLink(c.whatsapp,msg)+'">بلّغ العميل على الواتساب</a>':''));
    };
  }
  function parcelRow(p){var ph=(p.photos||[]).map(function(x){return urls[x]?'<a href="'+urls[x]+'" target="_blank" rel="noopener"><img src="'+urls[x]+'" alt=""></a>':''}).join('');
    var vol=(p.length_cm&&p.width_cm&&p.height_cm)?(p.length_cm*p.width_cm*p.height_cm/5000).toFixed(2):null;
    return '<div class="ad-parcel" data-pid="'+p.id+'"><div class="ac-ph">'+(ph||'<div class="ac-noph">📦</div>')+'</div><div class="ac-pb"><b>#'+p.id+'</b> '+esc(p.store||'')+' · '+esc(p.description||'')+'<div class="ac-muted">'+p.weight_kg+' كجم'+(vol?' · حجمي '+vol:'')+(p.tracking_in?' · <span dir="ltr">'+esc(p.tracking_in)+'</span>':'')+' · '+fmtD(p.received_at)+(p.shipment_id?' · شحنة #'+p.shipment_id:'')+'</div>'+(p.admin_note?'<div class="ac-muted">📝 '+esc(p.admin_note)+'</div>':'')+
      '<div class="ad-inl"><select class="ac-i" data-ps>'+Object.keys(PST).map(function(k){return '<option value="'+k+'"'+(k===p.status?' selected':'')+'>'+PST[k]+'</option>'}).join('')+'</select><input class="ac-i" data-pw type="number" step="0.01" value="'+(p.weight_kg||'')+'" dir="ltr" title="الوزن"><button class="ac-link" data-psave>حفظ</button><button class="ac-link bad" data-pdel>حذف</button></div></div></div>'}
  function bindParcelRows(done){
    document.querySelectorAll('.ad-parcel').forEach(function(row){var id=+row.getAttribute('data-pid');
      $('[data-psave]',row).onclick=async function(){var r=await sb.from('parcels').update({status:$('[data-ps]',row).value,weight_kg:$('[data-pw]',row).value===''?null:+$('[data-pw]',row).value}).eq('id',id);if(r.error)alert(r.error.message);done()};
      $('[data-pdel]',row).onclick=async function(){if(!confirm('حذف الطرد #'+id+'؟'))return;var p=(await sb.from('parcels').select('photos').eq('id',id).single()).data;if(p&&p.photos&&p.photos.length)await sb.storage.from('parcel-photos').remove(p.photos);var r=await sb.from('parcels').delete().eq('id',id);if(r.error)alert(r.error.message);done()};
    });
  }
  function addByCode(){
    body().innerHTML='<div class="ac-card"><h3 class="ac-h">استلام طرد</h3><p class="ac-muted">اكتب كود العميل المكتوب على الطرد.</p><form id="abc" class="ad-inl"><input class="ac-i" id="abcC" placeholder="SYC-10001" dir="ltr"><button class="syc-btn" type="submit">فتح</button></form><p id="abcM"></p></div>';
    $('#abcC').focus();
    $('#abc').onsubmit=async function(e){e.preventDefault();var v=$('#abcC').value.trim().toUpperCase().replace(/\s/g,'');if(/^\d+$/.test(v))v='SYC-'+v;if(/^SYC\d/.test(v))v=v.replace('SYC','SYC-');
      var r=await sb.from('customers').select('id').eq('code',v).maybeSingle();if(!r.data){$('#abcM').className='ac-msg bad';$('#abcM').textContent='ما لقينا عميل بهذا الكود.';return}customer(r.data.id)};
  }

  /* ---------- shipments ---------- */
  var fStatus='requested';
  async function ships(){
    body().innerHTML='<div class="ac-card"><div class="ad-inl"><label class="ac-l">الحالة</label><select class="ac-i" id="sf"><option value="">الكل</option>'+Object.keys(SST).map(function(k){return '<option value="'+k+'"'+(k===fStatus?' selected':'')+'>'+SST[k]+'</option>'}).join('')+'</select></div><div id="sl"><div class="ac-loading"></div></div></div>';
    $('#sf').onchange=function(){fStatus=$('#sf').value;ships()};
    var q=sb.from('shipments').select('*').order('created_at',{ascending:false}).limit(100);if(fStatus)q=q.eq('status',fStatus);
    var r=await q;var list=r.data||[];
    var cids=list.map(function(s){return s.customer_id}).filter(function(v,i,a){return a.indexOf(v)===i});
    var cs={},ps=[];if(cids.length){((await sb.from('customers').select('*').in('id',cids)).data||[]).forEach(function(c){cs[c.id]=c});ps=(await sb.from('parcels').select('*').in('shipment_id',list.map(function(s){return s.id}))).data||[]}
    $('#sl').innerHTML=list.length?list.map(function(s){return shipCard(s,cs[s.customer_id]||{},ps)}).join(''):'<p class="ac-empty">ما فيه شحنات بهذي الحالة.</p>';
    bindShipCards(ships);
    document.querySelectorAll('[data-open]').forEach(function(b){b.onclick=function(){customer(b.getAttribute('data-open'))}});
  }
  function shipCard(s,c,ps){var mine=ps.filter(function(p){return p.shipment_id===s.id});
    var kg=mine.reduce(function(a,p){return a+(+p.weight_kg||0)},0);
    var vol=mine.reduce(function(a,p){return a+((p.length_cm&&p.width_cm&&p.height_cm)?p.length_cm*p.width_cm*p.height_cm/5000:0)},0);
    var inp=function(k,l,v,t){return '<div><label class="ac-l">'+l+'</label><input class="ac-i" data-k="'+k+'" value="'+esc(v==null?'':v)+'"'+(t?' type="'+t+'" step="0.01"':'')+' dir="ltr"></div>'};
    return '<div class="ad-ship" data-sid="'+s.id+'" data-wa="'+esc(c.whatsapp||s.ship_phone||'')+'" data-name="'+esc(c.full_name||'')+'" data-code="'+esc(c.code||'')+'">'+
      '<div class="ac-sh1"><b>شحنة #'+s.id+'</b> · '+fmtD(s.created_at)+' · '+(MT[s.method]||s.method)+' · '+(c.code?'<button class="ac-link" data-open="'+s.customer_id+'">'+esc(c.code)+' — '+esc(c.full_name)+'</button>':'')+'<span class="ac-pill s-'+s.status+'">'+SST[s.status]+'</span></div>'+
      '<div class="ac-sh2">📍 '+esc([s.ship_name,s.ship_phone,s.ship_address,s.ship_city,s.ship_country].filter(Boolean).join(' · '))+'</div>'+
      '<div class="ac-sh2">📦 '+mine.map(function(p){return '#'+p.id+' ('+(p.weight_kg||'?')+' كجم)'}).join('، ')+' — المجموع '+kg.toFixed(2)+' كجم'+(vol?' · حجمي '+vol.toFixed(2):'')+'</div>'+
      (s.customer_note?'<div class="ac-sh2">💬 '+esc(s.customer_note)+'</div>':'')+
      '<div class="ad-g4"><div><label class="ac-l">الحالة</label><select class="ac-i" data-k="status">'+Object.keys(SST).map(function(k){return '<option value="'+k+'"'+(k===s.status?' selected':'')+'>'+SST[k]+'</option>'}).join('')+'</select></div>'+
      inp('weight_kg','الوزن النهائي كجم',s.weight_kg,'number')+inp('price_rm','السعر RM',s.price_rm,'number')+inp('payment_link','رابط الدفع (Stripe)',s.payment_link)+
      inp('carrier','شركة الشحن',s.carrier)+inp('tracking_no','رقم التتبع',s.tracking_no)+inp('tracking_url','رابط التتبع',s.tracking_url)+
      '<div><label class="ac-l">ملاحظة داخلية</label><input class="ac-i" data-k="admin_note" value="'+esc(s.admin_note||'')+'"></div></div>'+
      '<div class="ac-btns"><button class="syc-btn" data-ssave>حفظ</button><button class="ac-wa" data-swa>رسالة واتساب للعميل</button><span class="ac-ok" data-smsg></span></div></div>'}
  function bindShipCards(done){
    document.querySelectorAll('.ad-ship').forEach(function(card){var id=+card.getAttribute('data-sid');
      var val=function(k){var x=$('[data-k="'+k+'"]',card);return x?x.value.trim():''};
      $('[data-ssave]',card).onclick=async function(){var up={status:val('status'),payment_link:val('payment_link')||null,carrier:val('carrier')||null,tracking_no:val('tracking_no')||null,tracking_url:val('tracking_url')||null,admin_note:val('admin_note')||null,
        weight_kg:val('weight_kg')===''?null:+val('weight_kg'),price_rm:val('price_rm')===''?null:+val('price_rm')};
        if(up.price_rm&&up.status==='requested'){up.status='quoted';$('[data-k="status"]',card).value='quoted'}
        var r=await sb.from('shipments').update(up).eq('id',id);$('[data-smsg]',card).textContent=r.error?r.error.message:'تم الحفظ ✓';if(!r.error)setTimeout(done,700)};
      $('[data-swa]',card).onclick=function(){var st=val('status'),n=card.getAttribute('data-name'),acc='https://shipyourcart.com.my/ar/account/',t;
        if(st==='quoted')t='هلا '+n+' 👋\nشحنتك #'+id+' جاهزة للشحن ✈️\nالوزن: '+val('weight_kg')+' كجم\nالسعر: RM '+val('price_rm')+(val('payment_link')?'\nرابط الدفع: '+val('payment_link'):'')+'\nأو ادفع من حسابك: '+acc;
        else if(st==='paid')t='هلا '+n+' 👋\nاستلمنا الدفع لشحنتك #'+id+' ✅ بنشحنها قريب ونرسل لك رقم التتبع.';
        else if(st==='shipped')t='هلا '+n+' 👋\nتم شحن شحنتك #'+id+' 🚚'+(val('tracking_no')?'\nرقم التتبع: '+(val('carrier')?val('carrier')+' ':'')+val('tracking_no'):'')+(val('tracking_url')?'\n'+val('tracking_url'):'');
        else if(st==='delivered')t='هلا '+n+' 👋\nوصلت شحنتك #'+id+' بالسلامة ✅ شكراً لاختيارك Ship Your Cart 🧡';
        else t='هلا '+n+' 👋 بخصوص شحنتك #'+id+' من Ship Your Cart: ';
        var num=card.getAttribute('data-wa');window.open(num?waLink(num,t):'https://wa.me/?text='+encodeURIComponent(t),'_blank')};
    });
  }
  start();
})();
