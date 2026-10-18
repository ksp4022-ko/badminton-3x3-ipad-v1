const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve('.');
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep)||!fs.existsSync(p)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
// In-memory stand-in for the Worker's /api/court-remote endpoints.
const API='https://remote.test/api/court-remote';
function fakeRemote(){
 const sessions={},commands=[];let nextId=1;
 return async route=>{
  const req=route.request(),u=new URL(req.url()),p=u.pathname.replace('/api/court-remote','');const body=req.method()==='POST'?JSON.parse(req.postData()||'{}'):{};
  const ok=data=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,data})});
  const err=(status,code)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:false,error:{code}})});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'GET, POST, OPTIONS'}});
  const now=Date.now();
  if(p==='/sync'){if(body.retire)delete sessions[body.retire];const s=sessions[body.code]||(sessions[body.code]={state:{},seen:0});s.seen=now;if(body.state)s.state=body.state;return ok({commands:commands.filter(c=>c.code===body.code&&c.status==='pending').map(c=>({id:c.id,court:c.court}))});}
  if(p==='/ack'){const c=commands.find(c=>c.id===body.id&&c.code===body.code&&c.status==='pending');if(c){c.status='done';c.result=body.result;}return ok({id:body.id});}
  if(p==='/view'){const s=sessions[u.searchParams.get('code')];if(!s)return err(404,'NOT_PAIRED');return ok({online:now-s.seen<15000,state:s.state});}
  if(p==='/command'&&req.method()==='POST'){if(!sessions[body.code])return err(404,'NOT_PAIRED');const c={id:nextId++,code:body.code,court:body.court,status:'pending',result:''};commands.push(c);return ok({id:c.id});}
  if(p==='/command'){const c=commands.find(c=>c.id===Number(u.searchParams.get('id')));if(!c)return err(404,'NOT_FOUND');return ok({id:c.id,status:c.status,result:c.result});}
  return err(404,'NOT_FOUND');
 };
}
const LEGACY_UA='Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 Version/12.1.2 Mobile/15E148 Safari/604.1';
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const legacy of [false,true]){
   const handler=fakeRemote();
   const ipad=await browser.newContext(Object.assign({viewport:{width:1180,height:820},hasTouch:true},legacy?{userAgent:LEGACY_UA}:{}));
   await ipad.addInitScript(api=>{window.__COURT_REMOTE_API=api;},API);await ipad.route('https://remote.test/**',handler);
   const page=await ipad.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/index.html');await page.waitForFunction(()=>!!window.__badmintonIpadV1);
   assert.equal(await page.evaluate(()=>window.__badmintonIpadV1.courtRemote.status()),'off');
   await page.evaluate(()=>{const api=window.__badmintonIpadV1,st=api.getState();st.settings.courtCount=3;st.settings.autoArrangeMode=false;st.players=Array.from({length:12},(_,i)=>({id:'p'+i,name:'P'+i,games:0,color:'#bfdbfe',isActive:true,zone:'court'+(Math.floor(i/4)+1),slot:i%4+1}));api.setState(st);api.render();});
   const url=await page.evaluate(()=>window.__badmintonIpadV1.courtRemote.enable());
   assert.match(url,/\/remote\.html\?c=[A-Za-z0-9]{16}$/);
   assert.equal(await page.evaluate(()=>window.__badmintonIpadV1.getState().settings.remoteCode.length),16);
   await page.waitForFunction(()=>window.__badmintonIpadV1.courtRemote.status()==='online');
   // Phone
   const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   await phone.addInitScript(api=>{window.__COURT_REMOTE_API=api;},API);await phone.route('https://remote.test/**',handler);
   const ph=await phone.newPage(),phErrors=[];ph.on('pageerror',e=>phErrors.push(e.message));
   await ph.goto(url);
   await ph.locator('.down[data-court="court2"]:not([disabled])').waitFor();
   assert.equal(await ph.locator('.court').count(),3);
   const fits=await ph.evaluate(()=>document.documentElement.scrollHeight<=window.innerHeight+1);assert.equal(fits,true);
   assert.deepEqual(await ph.locator('.court').nth(1).locator('.names span').allInnerTexts(),['P4','P5','P6','P7']);
   assert.match(await ph.locator('#status').innerText(),/已連線/);
   // cancel does nothing
   await ph.click('.down[data-court="court2"]');await ph.locator('#mask.show').waitFor();await ph.click('#cancelBtn');
   await page.waitForTimeout(3500);assert.equal(await page.evaluate(()=>window.__badmintonIpadV1.getState().players.find(p=>p.id==='p4').games),0);
   // confirm on phone -> iPad downs court 2 without its own confirm card
   await ph.click('.down[data-court="court2"]');await ph.locator('#mask.show').waitFor();await ph.click('#okBtn');
   await ph.waitForFunction(()=>/2 號場已下場/.test(document.getElementById('sheet').textContent),null,{timeout:12000});
   assert.match(await ph.locator('#sheet').innerText(),/已空出/);await ph.click('#doneBtn');
   const st=await page.evaluate(()=>window.__badmintonIpadV1.getState().players);
   assert.deepEqual(st.filter(p=>['p4','p5','p6','p7'].includes(p.id)).map(p=>[p.games,p.zone]),[[1,'rest'],[1,'rest'],[1,'rest'],[1,'rest']]);
   assert.equal(st.find(p=>p.id==='p0').games,0);
   assert.equal(await page.locator('#modalMask.show').count(),0);
   // phone view refreshes: court 2 empty, its button disabled
   await ph.waitForFunction(()=>document.querySelector('.down[data-court="court2"]').disabled,null,{timeout:10000});
   // busy: a dialog open on the iPad -> command reported busy, nothing changes
   await page.evaluate(()=>{document.getElementById('modalMask').classList.add('show');});
   await ph.click('.down[data-court="court1"]');await ph.click('#okBtn');
   await ph.waitForFunction(()=>/稍後再按/.test(document.getElementById('sheet').textContent),null,{timeout:12000});await ph.click('#doneBtn');
   assert.equal(await page.evaluate(()=>window.__badmintonIpadV1.getState().players.find(p=>p.id==='p0').games),0);
   await page.evaluate(()=>{document.getElementById('modalMask').classList.remove('show');});
   // auto-arrange on: the next group moves up and the phone lists who goes on
   await page.evaluate(()=>{const api=window.__badmintonIpadV1,st=api.getState();st.settings.autoArrangeMode=true;['n0','n1','n2','n3'].forEach((id,i)=>st.players.push({id,name:'N'+i,games:0,color:'#bfdbfe',isActive:true,zone:'next1',slot:i+1}));api.setState(st);api.render();});
   await ph.waitForTimeout(3500);
   await ph.click('.down[data-court="court3"]');await ph.click('#okBtn');
   await ph.waitForFunction(()=>/3 號場已下場/.test(document.getElementById('sheet').textContent),null,{timeout:15000});
   assert.deepEqual(await ph.locator('#sheet .sheet-names.up span').allInnerTexts(),['N0','N1','N2','N3']);
   assert.equal(await page.evaluate(()=>window.__badmintonIpadV1.getState().players.filter(p=>p.zone==='court3').map(p=>p.name).sort().join()),'N0,N1,N2,N3');
   await ph.click('#doneBtn');
   // renewing the code invalidates the phone
   await page.evaluate(()=>window.__badmintonIpadV1.courtRemote.renew());
   await ph.waitForFunction(()=>/未配對/.test(document.getElementById('status').textContent),null,{timeout:12000});
   assert.deepEqual(errors,[]);assert.deepEqual(phErrors,[]);
   console.log('PASS court remote'+(legacy?' (legacy iPad)':''));
   await phone.close();await ipad.close();
  }
  // phone without a code
  const ctx=await browser.newContext();const p2=await ctx.newPage();await p2.goto(base+'/remote.html');
  assert.match(await p2.locator('.empty-page').innerText(),/掃描/);console.log('PASS remote page without code');await ctx.close();
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
