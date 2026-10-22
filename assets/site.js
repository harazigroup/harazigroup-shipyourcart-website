(function(){
  // mobile menu
  var hdr=document.querySelector('.syc-hdr'),inn=document.querySelector('.syc-hdr-in');
  if(hdr&&inn){var b=document.createElement('button');b.className='syc-burger';b.type='button';b.setAttribute('aria-label','Menu');b.innerHTML='<span></span><span></span><span></span>';inn.appendChild(b);b.addEventListener('click',function(){hdr.classList.toggle('menu-open')})}
  function closeAll(k){document.querySelectorAll('.syc-dd.open').forEach(function(d){if(d!==k)d.classList.remove('open')})}
  document.querySelectorAll('.syc-dd-t').forEach(function(t){t.setAttribute('role','button');t.addEventListener('click',function(e){e.preventDefault();var d=t.parentNode;closeAll(d);d.classList.toggle('open')})});
  document.addEventListener('click',function(e){if(!e.target.closest('.syc-dd'))closeAll(null);if(hdr&&!e.target.closest('.syc-hdr'))hdr.classList.remove('menu-open')});
  // header button shows the customer code when signed in (set by account.js)
  try{var c=localStorage.getItem('syc_code');var a=document.querySelector('[data-acct]');if(c&&a)a.textContent=a.textContent+' · '+c}catch(e){}
})();
