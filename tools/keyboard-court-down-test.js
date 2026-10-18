const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve('.');
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep)||!fs.existsSync(p)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const LEGACY_UA='Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 Version/12.1.2 Mobile/15E148 Safari/604.1';
  for(const [url,legacy] of [['/index.html?classic=1&debug=1',false],['/index.html',false],['/index.html?debug=1',true]]){
   const context=await browser.newContext(Object.assign({viewport:{width:1180,height:820},hasTouch:true},legacy?{userAgent:LEGACY_UA}:{}));
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+url);await page.waitForFunction(()=>!!window.__badmintonIpadV1);
   await page.evaluate(()=>{const api=window.__badmintonIpadV1,st=api.getState();st.settings.courtCount=3;st.settings.autoArrangeMode=false;st.players=Array.from({length:12},(_,i)=>({id:'p'+i,name:'P'+i,games:0,color:'#bfdbfe',isActive:true,zone:'court'+(Math.floor(i/4)+1),slot:i%4+1}));api.setState(st);api.render();});
   await page.waitForTimeout(800);
   if(legacy)assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('legacyIpad')),true);
   const games=id=>page.evaluate(id=>window.__badmintonIpadV1.getState().players.find(p=>p.id===id).games,id);
   const zone=id=>page.evaluate(id=>window.__badmintonIpadV1.getState().players.find(p=>p.id===id).zone,id);
   // 4 exceeds active court count: nothing happens
   await page.keyboard.press('4');await page.waitForTimeout(200);assert.equal(await page.locator('#modalMask.show').count(),0);
   // 2 opens confirm, Escape cancels
   await page.keyboard.press('2');await page.locator('#modalMask.show').waitFor();
   assert.equal(await page.locator('#modalOkBtn.court-down-ok').count(),1);
   await page.keyboard.press('Escape');await page.waitForTimeout(200);
   assert.equal(await page.locator('#modalMask.show').count(),0);assert.equal(await games('p4'),0);
   // digits are ignored while the confirm is open
   await page.keyboard.press('2');await page.locator('#modalMask.show').waitFor();
   await page.keyboard.press('3');await page.waitForTimeout(150);assert.match(await page.locator('#modalTitle').innerText(),/2/);
   // Enter confirms court 2 only
   await page.keyboard.press('Enter');await page.waitForTimeout(600);
   assert.equal(await page.locator('#modalMask.show').count(),0);
   assert.equal(await games('p4'),1);assert.equal(await games('p0'),0);assert.equal(await games('p8'),0);
   assert.notEqual(await zone('p4'),'court2');
   // repeated Enter after close does nothing
   await page.keyboard.press('Enter');await page.waitForTimeout(200);assert.equal(await games('p0'),0);
   assert.deepEqual(errors,[]);console.log('PASS keyboard court down '+url+(legacy?' (legacy iPad)':''));await context.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
