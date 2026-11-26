'use strict';
/* NORX หน้าร้าน: หน้ารวม (การ์ด) → หน้ารุ่น (ตารางไซส์ −/+ แบบ Drop 03) → ตะกร้ารวมทุกรุ่น ชำระครั้งเดียว */
(function(){
const API=window.NORX_API,PAGE=window.NORX_PAGE||{},ROOT=PAGE.root||'./';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
let testKey=params.get('test')||'';
try{if(testKey)sessionStorage.setItem('norx-test',testKey);else testKey=sessionStorage.getItem('norx-test')||'';}catch(e){}
const money=n=>Number(n).toLocaleString('th-TH')+' บาท';
const sleeveName=s=>s==='short'?'แขนสั้น':'แขนยาว';
const thDate=s=>{const d=new Date(s);return d.toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric'})+' · '+d.toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'})+' น.';};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const CART_KEY='norx-cart-v2';
let CONFIG=null,ROUND=null,cart=[],saved=false,busy=false,lastSignature='',requestId='';
const product=id=>CONFIG.products.find(p=>p.id===id);
const deliveryMethod=()=>{const c=document.querySelector('input[name="delivery"]:checked');return c?c.value:'';};
/* ลิงก์ภายในให้พา ?test ติดไปด้วย */
function keepTest(){if(!testKey)return;for(const a of document.querySelectorAll('a[data-internal]')){const u=new URL(a.getAttribute('href'),location.href);u.searchParams.set('test',testKey);a.href=u.pathname+u.search+u.hash;}}
function saveCart(){try{localStorage.setItem(CART_KEY,JSON.stringify({roundId:ROUND&&ROUND.id,items:cart}));}catch(e){}}
function loadCart(){try{const v=JSON.parse(localStorage.getItem(CART_KEY)||'null');if(v&&ROUND&&v.roundId===ROUND.id&&Array.isArray(v.items))cart=v.items.filter(i=>{const p=product(i.product);return p&&p.fit===i.fit&&p.sizes.includes(i.size)&&p.prices[i.sleeve]&&Number.isSafeInteger(i.qty)&&i.qty>0&&i.qty<100;});}catch(e){cart=[];}}
function qtyOf(p,sleeve,size){const i=cart.find(i=>i.product===p&&i.sleeve===sleeve&&i.size===size);return i?i.qty:0;}
function setQty(p,sleeve,size,qty){qty=Math.max(0,Math.min(99,qty));const pr=product(p);const i=cart.find(i=>i.product===p&&i.sleeve===sleeve&&i.size===size);if(i){if(qty)i.qty=qty;else cart.splice(cart.indexOf(i),1);}else if(qty)cart.push({product:p,fit:pr.fit,sleeve,size,qty});saveCart();render();}
function calculate(delivery){const subtotal=cart.reduce((n,i)=>n+i.qty*product(i.product).prices[i.sleeve],0);const shipping=delivery==='ship'?ROUND.shipping:0;return{subtotal,shipping,total:subtotal+shipping,pieces:cart.reduce((n,i)=>n+i.qty,0)};}
/* ตารางไซส์ −/+ ของรุ่นนี้ (เหมือนหน้า Drop 03 เดิม) */
function buildMatrix(p){
 const box=$('products');if(!box)return;box.replaceChildren();
 for(const sleeve of ['short','long']){if(!p.prices[sleeve])continue;
  const card=el('section','product'),title=el('div','product-title');title.append(el('h3','',(sleeve==='short'?'เสื้อแขนสั้น':'เสื้อแขนยาว')),el('span','price',money(p.prices[sleeve])));
  const grid=el('div','qty-grid');
  for(const size of p.sizes){const row=el('div','qty-label'),step=el('span','qty-stepper'),minus=el('button','qty-btn','−'),plus=el('button','qty-btn','+'),out=el('input');
   minus.type=plus.type='button';out.type='number';out.readOnly=true;out.id='qty-'+p.id+'-'+sleeve+'-'+size;out.setAttribute('aria-label',p.name+' '+sleeveName(sleeve)+' ไซส์ '+size+' จำนวน');
   minus.setAttribute('aria-label','ลด '+sleeveName(sleeve)+' ไซส์ '+size);plus.setAttribute('aria-label','เพิ่ม '+sleeveName(sleeve)+' ไซส์ '+size);
   minus.onclick=()=>setQty(p.id,sleeve,size,qtyOf(p.id,sleeve,size)-1);plus.onclick=()=>setQty(p.id,sleeve,size,qtyOf(p.id,sleeve,size)+1);
   step.append(minus,out,plus);row.append(el('span','',size),step);grid.append(row);}
  card.append(title,grid);box.append(card);}
}
function buildDelivery(){const box=$('delivery');if(!box)return;for(const n of [...box.querySelectorAll('label')])n.remove();const defs={city:['นัดรับในเมืองเชียงราย','ไม่มีค่าส่ง'],event:['รับที่งาน '+(CONFIG.eventName||'กิจกรรม NORX'),'ไม่มีค่าส่ง'],ship:['จัดส่ง',money(ROUND.shipping)+' ต่อออเดอร์ · ซื้อหลายรุ่นส่งรวมพัสดุเดียว']};for(const d of ROUND.deliveries){const [name,sub]=defs[d];const label=el('label','delivery-choice'),input=el('input');input.type='radio';input.name='delivery';input.value=d;input.required=true;const span=el('span');span.append(el('strong','',name),el('small','',sub+(ROUND.readyText&&d!=='ship'?' · '+ROUND.readyText:'')));label.append(input,span);box.append(label);}}
function render(){
 if(!CONFIG||!ROUND)return;
 const bill=calculate(deliveryMethod());
 for(const b of document.querySelectorAll('[data-cart-count]'))b.textContent=String(bill.pieces);
 if(PAGE.product){const p=product(PAGE.product);if(p)for(const s of ['short','long'])for(const z of p.sizes){const i=$('qty-'+p.id+'-'+s+'-'+z);if(i){const q=qtyOf(p.id,s,z);i.value=String(q);i.previousSibling.disabled=!q;}}}
 const list=$('cartItems');if(!list)return;list.replaceChildren();
 if(!cart.length)list.append(el('p','empty','ยังไม่มีเสื้อในตะกร้า'));
 const order=i=>[CONFIG.products.findIndex(p=>p.id===i.product),i.sleeve==='short'?0:1,product(i.product).sizes.indexOf(i.size)];
 for(const i of cart.slice().sort((a,b)=>{const x=order(a),y=order(b);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];})){const p=product(i.product),row=el('div','cart-item'),label=el('span','',(p.short||p.name)+' · '+sleeveName(i.sleeve)+' · '+i.size+' × '+i.qty),right=el('span','cart-right'),del=el('button','link-btn','ลบ');del.type='button';del.setAttribute('aria-label','ลบ '+label.textContent);del.onclick=()=>setQty(i.product,i.sleeve,i.size,0);right.append(el('b','',money(p.prices[i.sleeve]*i.qty)),del);row.append(label,right);list.append(row);}
 $('subtotal').textContent=money(bill.subtotal);$('shipping').textContent=deliveryMethod()?money(bill.shipping):'เลือกวิธีรับ';$('total').textContent=money(bill.total);
 if($('mobileTotal'))$('mobileTotal').textContent=money(bill.total);if($('mobileCount'))$('mobileCount').textContent=bill.pieces?'ตะกร้า '+bill.pieces+' ตัว':'ตะกร้าว่าง';
 const ship=deliveryMethod()==='ship';$('addressField').hidden=!ship;$('address').required=ship;$('pickupNote').hidden=!['city','event'].includes(deliveryMethod());
}
function showError(m){$('formError').hidden=false;$('formError').textContent=m;}
function fail(e){busy=false;$('orderFields').disabled=false;$('submitButton').textContent='ลองบันทึกอีกครั้ง';showError((e&&e.message)||'ยังยืนยันการบันทึกไม่ได้ กรุณาลองบันทึกอีกครั้งก่อนโอนเงิน');}
function success(r){saved=true;busy=false;$('orderFields').disabled=true;$('submitButton').textContent='บันทึกแล้ว';$('savedCustomer').textContent='ชื่อผู้สั่งซื้อ: '+r.name;$('savedOrder').textContent='เลขออเดอร์ '+r.id+' · '+r.items.map(i=>{const p=product(i.product);return (p?p.short:i.product)+' '+sleeveName(i.sleeve)+' '+i.size+' × '+i.qty;}).join(', ');$('payTotal').textContent=money(r.total);$('payDue').textContent=thDate(r.paymentDue);cart=[];saveCart();render();$('payment').hidden=false;if($('mobileBar'))$('mobileBar').hidden=true;$('payment').scrollIntoView({behavior:'smooth',block:'start'});}
function closed(msg){for(const b of document.querySelectorAll('[data-open-badge]'))b.textContent='ปิดรับสั่งจอง';const a=$('availability');if(a){a.hidden=false;a.textContent=msg;}if($('orderFields'))$('orderFields').disabled=true;if($('mobileBar'))$('mobileBar').hidden=true;}
function wireForm(){
 const form=$('orderForm');if(!form)return;
 $('delivery').addEventListener('change',render);
 form.addEventListener('submit',e=>{e.preventDefault();if(saved||busy||!ROUND)return;try{
  if(!cart.length)throw new Error('กรุณาเลือกเสื้ออย่างน้อย 1 ตัว');
  const name=$('customerName').value.trim();if(name.length<2)throw new Error('กรุณากรอกชื่อ - นามสกุล');
  const phone=$('phone').value.replace(/[\s()-]/g,'');if(!/^0[0-9]{8,9}$/.test(phone))throw new Error('กรุณาตรวจสอบเบอร์โทรศัพท์ 9–10 หลัก');
  if(!deliveryMethod())throw new Error('กรุณาเลือกวิธีรับสินค้า');
  if(deliveryMethod()==='ship'&&($('address').value.trim().length<15||!/(^|\D)[0-9]{5}(\D|$)/.test($('address').value)))throw new Error('กรุณากรอกที่อยู่พร้อมรหัสไปรษณีย์ 5 หลัก');
  if(!$('preorder').checked||!$('sizing').checked||!$('privacy').checked)throw new Error('กรุณาติ๊กยอมรับเงื่อนไขทั้ง 3 ข้อ');
  const bill=calculate(deliveryMethod());
  const payload={roundId:ROUND.id,name,phone,delivery:deliveryMethod(),address:$('address').value,items:cart.map(i=>({product:i.product,fit:i.fit,sleeve:i.sleeve,size:i.size,qty:i.qty})),preorder:true,sizing:true,privacy:true,website:$('website').value,expectedTotal:bill.total};
  const sig=JSON.stringify(payload);if(sig!==lastSignature){requestId=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2).padEnd(16,'0');lastSignature=sig;}payload.requestId=requestId;if(testKey)payload.testKey=testKey;
  busy=true;$('orderFields').disabled=true;$('submitButton').textContent='กำลังบันทึก…';$('formError').hidden=true;
  fetch(API,{method:'POST',body:JSON.stringify({action:'submit',order:payload})}).then(r=>r.json()).then(res=>{if(res&&res.ok===true)success(res);else fail(new Error(res&&res.error));}).catch(()=>fail());
 }catch(err){showError(err.message);}});
 $('copyAccount').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('bankAccount').textContent.replace(/\D/g,''));$('copyStatus').textContent='คัดลอกเลขบัญชีแล้ว';}catch(e){$('copyStatus').textContent='แตะค้างที่เลขบัญชีด้านบนเพื่อคัดลอก';}});
}
function start(data){
 if(!data||data.ok!==true)throw new Error(data&&data.error||'ระบบสั่งซื้อยังไม่พร้อม');
 CONFIG=data;const round=data.round,canTest=!data.testOnly||!!testKey,show=round||data.nextRound;
 for(const n of document.querySelectorAll('[data-price]')){const p=product(n.dataset.price);n.textContent=p?['short','long'].filter(s=>p.prices[s]).map(s=>sleeveName(s)+' '+money(p.prices[s])).join(' · '):'';}
 if(show){for(const [id,k] of [['tOpen','opensAt'],['tClose','closesAt'],['tDue','paymentDue']])if($(id))$(id).textContent=thDate(show[k]);}
 if(!round||!canTest){closed(data.nextRound&&canTest?'รอบถัดไปเปิดรับ '+thDate(data.nextRound.opensAt):'ขณะนี้ยังไม่เปิดรับพรีออเดอร์ ติดตามรอบถัดไปได้ที่เพจ NORX');return;}
 ROUND=round;for(const b of document.querySelectorAll('[data-open-badge]'))b.textContent=round.name+' · เปิดรับถึง '+thDate(round.closesAt);
 if($('testNote'))$('testNote').hidden=!data.testOnly;
 loadCart();
 if(PAGE.product&&product(PAGE.product))buildMatrix(product(PAGE.product));
 if($('orderForm')){$('dueText').textContent=thDate(round.paymentDue);$('readyText').textContent=round.readyText?' '+round.readyText:'';$('bankName').textContent=data.bank.name;$('bankAccount').textContent=data.bank.account;$('bankHolder').textContent=data.bank.holder;buildDelivery();$('orderFields').disabled=false;}
 if($('availability'))$('availability').hidden=true;
 render();
 const left=Date.parse(round.closesAt)-data.serverNow;if(left>0&&left<2147483647)setTimeout(()=>{if(!saved){ROUND=null;closed('ปิดรับรอบนี้แล้ว ติดตามรอบถัดไปที่เพจ NORX');}},left);
}
for(const link of document.querySelectorAll('a[href^="#"]'))link.addEventListener('click',ev=>{const t=document.getElementById(link.getAttribute('href').slice(1));if(t){ev.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});}});
const lookbook=$('lookbook');
if(lookbook)lookbook.addEventListener('toggle',()=>{const c=$('lookbookContent'),s=$('lookbookStatus');if(!lookbook.open||c.firstElementChild)return;s.hidden=false;s.textContent='กำลังโหลดภาพ…';fetch(PAGE.lookbook).then(r=>{if(!r.ok)throw 0;return r.text();}).then(h=>{c.innerHTML=h;s.hidden=true;}).catch(()=>{s.textContent='โหลดภาพไม่สำเร็จ ลองพับแล้วเปิดอีกครั้ง';});});
keepTest();wireForm();
fetch(API).then(r=>r.json()).then(start).catch(err=>{closed('โหลดข้อมูลรอบสั่งซื้อไม่ได้ ลองรีเฟรชหน้า หรือทักเพจ NORX');console.error(err);});
})();
