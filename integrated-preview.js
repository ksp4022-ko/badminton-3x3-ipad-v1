(function(){
 'use strict';
 var api=window.__badmintonIpadV1;
 if(!api||!api.setupTestMode)return;
 var legacy=api.isLegacyIpadRuntime(),motion=window.Motion,heads=[],pending=[],moveOverlay=null,moveControls=[],moveTimer=null,arrivalTimer=null,epoch=Date.now(),entering={},paused=false;
 var reduced=function(){return window.matchMedia('(prefers-reduced-motion: reduce)').matches;};
 function animate(el,frames,options){return motion?motion.animate(el,frames,options):null;}
 function courtText(label){label=String(label);if(/場$/.test(label))return label;return /^\d+$/.test(label)?label+' 號場':label+' 場';}
 function playerEl(id){var chips=document.querySelectorAll('.player-chip');for(var i=0;i<chips.length;i++)if(chips[i].getAttribute('data-player-id')===id)return chips[i];return null;}
 function clearMove(){clearTimeout(moveTimer);clearTimeout(arrivalTimer);moveControls.forEach(function(c){try{c.cancel();}catch(e){}});moveControls=[];if(moveOverlay)moveOverlay.remove();moveOverlay=null;document.querySelectorAll('[data-preview-hidden]').forEach(function(el){el.style.visibility='';el.removeAttribute('data-preview-hidden');});document.querySelectorAll('.preview-arrival').forEach(function(el){el.classList.remove('preview-arrival');});}
 function captureMove(id,zone,slot){
  pending=[];clearMove();if(legacy||reduced()||!motion||api.getState().settings.manualMoveAnimationEnabled===false)return;
  var state=api.getState(),ids=[id];state.players.forEach(function(p){if(p.zone===zone&&p.slot===slot&&p.id!==id)ids.push(p.id);});
  ids.forEach(function(pid){var el=playerEl(pid);if(!el)return;var rect=el.getBoundingClientRect();if(rect.width>0&&rect.height>0)pending.push({id:pid,rect:rect,html:el.outerHTML});});
 }
 function runMove(){
  if(!pending.length)return;var items=pending;pending=[];clearMove();
  try{
   moveOverlay=document.createElement('div');moveOverlay.className='preview-motion-overlay';moveOverlay.setAttribute('aria-hidden','true');document.body.appendChild(moveOverlay);
   items.forEach(function(item){var dest=playerEl(item.id);if(!dest)return;var target=dest.getBoundingClientRect();if(target.width<=0||target.height<=0)return;
    var wrapper=document.createElement('div');wrapper.className='preview-move-clone';wrapper.innerHTML=item.html;wrapper.style.left=item.rect.left+'px';wrapper.style.top=item.rect.top+'px';wrapper.style.width=item.rect.width+'px';wrapper.style.height=item.rect.height+'px';moveOverlay.appendChild(wrapper);
    dest.setAttribute('data-preview-hidden','');dest.style.visibility='hidden';dest.classList.add('preview-arrival');
    var dx=target.left-item.rect.left,dy=target.top-item.rect.top,sx=target.width/item.rect.width,sy=target.height/item.rect.height;
    var c=animate(wrapper,{transform:['translate(0,0) scale(1)','translate('+dx+'px,'+dy+'px) scale('+(sx*1.025)+','+(sy*1.025)+')','translate('+dx+'px,'+dy+'px) scale('+sx+','+sy+')']},{duration:.34,times:[0,.82,1],ease:'easeInOut'});if(c)moveControls.push(c);
   });moveTimer=setTimeout(function(){clearMove();items.forEach(function(item){var el=playerEl(item.id);if(el)el.classList.add('preview-arrival');});arrivalTimer=setTimeout(function(){document.querySelectorAll('.preview-arrival').forEach(function(el){el.classList.remove('preview-arrival');});},300);},390);
  }catch(e){clearMove();}
 }
 function cancelHead(head){if(head.control){try{head.control.cancel();}catch(e){}head.control=null;}}
 function setFace(head,key,instant){
  if(head.key===key)return;cancelHead(head);head.key=key;
  var face=head.face,zone=head.zone,label=api.courtLabel(zone),text=key==='entering'?courtText(label)+'｜正在上場':key==='action'?'按我下場 ↓':courtText(label);
  head.button.setAttribute('aria-label',courtText(label)+'，下場');
  function update(){face.textContent=text;face.className='preview-flip-face'+(key==='action'?' action':key==='entering'?' entering':'');}
  if(instant||!motion){update();face.style.transform='';face.style.opacity='1';return;}
  if(reduced()){update();head.control=animate(face,{opacity:[.25,1]},{duration:.2});return;}
  head.control=animate(face,{transform:['rotateX(0deg)','rotateX(90deg)']},{duration:.14,ease:'easeIn'});
  var control=head.control;control.then(function(){if(head.control!==control||!face.isConnected)return;update();head.control=animate(face,{transform:['rotateX(-90deg)','rotateX(0deg)']},{duration:.16,ease:'easeOut'});});
 }
 function suspended(){return document.hidden||document.body.classList.contains('admin-panel-open')||document.getElementById('modalMask').classList.contains('show');}
 function tick(){
  var blocked=suspended(),time=Date.now();
  if(blocked&&!paused){paused=true;heads.forEach(function(h){setFace(h,'identity',true);});return;}
  if(blocked)return;if(paused){paused=false;epoch=time;}var state=api.getState();
  heads.forEach(function(h,index){var occupied=state.players.some(function(p){return p.isActive!==false&&p.zone===h.zone;});var active=occupied&&entering[h.zone]>time;var key=active?'entering':(!occupied?'identity':Math.floor((time-epoch+index*900)/4000)%2?'action':'identity');setFace(h,key,false);});
 }
 function mountHeads(){
  if(legacy)return;heads.forEach(cancelHead);heads=[];
  document.querySelectorAll('#courtRow .zone-head').forEach(function(button){var zone=button.getAttribute('data-court');if(!zone)return;var height=button.getBoundingClientRect().height;var count=button.querySelector('.zone-count');button.style.height=height+'px';button.innerHTML='';var face=document.createElement('span');face.className='preview-flip-face';button.appendChild(face);if(count)button.appendChild(count);button.classList.add('preview-flip-head');var head={button:button,face:face,zone:zone,key:null,control:null};heads.push(head);setFace(head,entering[zone]>Date.now()?'entering':'identity',true);});tick();
 }
 function onRender(){mountHeads();runMove();}
 function enteringCourt(zone){if(legacy)return;entering[zone]=Date.now()+(Number(api.getState().settings.callEffectDuration)||5)*1000;}
 function addSetting(parent,label,key){var row=document.createElement('div');row.className='compact-state-row';var title=document.createElement('div');title.className='compact-row-label';title.textContent=label;row.appendChild(title);[false,true].forEach(function(value){var b=document.createElement('button');b.textContent=value?'開啟':'關閉';b.type='button';b.disabled=legacy;b.setAttribute('aria-pressed',String((api.getState().settings[key]!==false)===value));b.onclick=function(){var settings={};settings[key]=value;api.savePreviewSettings(settings);row.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});if(!value)clearMove();};row.appendChild(b);});parent.appendChild(row);}
 function setupAdmin(){
  var tools=document.getElementById('adminTools');document.getElementById('floatPanel').classList.add('preview-admin');
  var start=document.createElement('button');start.id='previewGatheringBtn';start.textContent='開始新聚會';start.onclick=function(){location.href='./setup-test.html?integrated=1';};tools.insertBefore(start,tools.firstChild);
  var today=document.getElementById('adminTodayBody');today.parentNode.classList.add('preview-today-card');today.parentNode.querySelector('h3').classList.add('preview-today-title');
  var data=document.getElementById('adminDataBody'),display=document.getElementById('adminDisplayBody'),oldCard=display.parentNode;
  data.parentNode.querySelector('.admin-collapse-head').textContent='系統設定';
  var inner=document.createElement('div');inner.className='preview-settings-inner';while(display.firstChild)inner.appendChild(display.firstChild);data.insertBefore(inner,data.firstChild);oldCard.hidden=true;oldCard.classList.add('preview-retired');
  addSetting(inner,'手動移動動畫','manualMoveAnimationEnabled');
  var observer=new MutationObserver(function(){if(display.parentNode===oldCard)oldCard.hidden=true;});observer.observe(display,{attributes:true,attributeFilter:['hidden','class']});
 }
 window.BoardPreview={onRender:onRender,captureMove:captureMove,enteringCourt:enteringCourt};
 document.body.classList.add('preview-test');setupAdmin();mountHeads();setInterval(tick,250);
 new MutationObserver(function(){if(!legacy)requestAnimationFrame(mountHeads);}).observe(document.getElementById('courtRow'),{childList:true});
 document.addEventListener('visibilitychange',function(){if(document.hidden){clearMove();pending=[];}tick();});
 new MutationObserver(function(){if(document.body.classList.contains('admin-panel-open')){clearMove();pending=[];}tick();}).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('click',function(e){if(e.target.closest('.preview-flip-head')){heads.forEach(function(h){setFace(h,'identity',true);});}},true);
})();
