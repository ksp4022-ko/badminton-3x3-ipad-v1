const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve('.');
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep)||!fs.existsSync(p)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(p));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const device of ['modern','iphone','legacy']){
   const legacy=device==='legacy',phone=device==='iphone';
   const context=await browser.newContext({viewport:{width:phone?844:1024,height:phone?390:638},hasTouch:true,userAgent:legacy?'Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 Version/12.1.2 Mobile/15E148 Safari/604.1':phone?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15':undefined});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/index.html?debug=1');
   await page.evaluate(()=>{const api=window.__badmintonIpadV1,st=api.getState();st.players=Array.from({length:8},(_,i)=>({id:'p'+i,name:['柔伊','Chris','雅雯','Amy'][i%4],games:i,color:'#bfdbfe',isActive:true,zone:i<4?'court1':'next1',slot:i%4+1}));Object.assign(st.settings,{autoArrangeMode:true,autoCallEnabled:false,autoCallMode:'off',courtCount:3,callEffectDuration:3});api.setState(st);});
   const rects=await page.locator('#courtRow .slot').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
   await page.goto(base+'/integrated-test.html');await page.waitForFunction(()=>!!window.BoardPreview);
   assert(await page.locator('#previewGatheringBtn').count());
   const afterRects=await page.locator('#courtRow .slot').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
   assert.deepEqual(afterRects,rects);
   if(legacy){assert.equal(await page.locator('.preview-flip-head').count(),0);assert.equal(await page.evaluate(()=>!!window.Motion),false);}
   else{
    await page.waitForFunction(()=>document.querySelector('[data-court="court1"] .preview-flip-face').textContent==='按我下場 ↓',{},{timeout:7000});
    await page.click('[data-court="court1"]');await page.locator('#modalMask.show').waitFor();
    await page.waitForTimeout(350);assert.equal(await page.locator('[data-court="court1"] .preview-flip-face').innerText(),'1 號場');
    await page.click('#modalCancelBtn');assert.equal(await page.evaluate(()=>window.__badmintonIpadV1.getState().players[0].games),0);
    await page.evaluate(()=>{const api=window.__badmintonIpadV1;api.movePlayer('p0','next1',1);api.render();});
    assert.equal(await page.locator('.preview-move-clone').count(),2);
    assert.equal(await page.evaluate(()=>window.__badmintonIpadV1.getState().players.find(p=>p.id==='p0').zone),'next1');
    await page.waitForTimeout(500);assert.equal(await page.locator('[data-preview-hidden],.preview-motion-overlay').count(),0);
    await page.click('[data-court="court1"]');await page.locator('#modalMask.show').waitFor();await page.click('#modalOkBtn');
    await page.waitForFunction(()=>document.querySelector('[data-court="court1"] .preview-flip-face').textContent.includes('正在上場'));
    await page.screenshot({path:path.join(require('os').tmpdir(),'badminton-integrated.png')});
    await page.waitForTimeout(3500);assert(!(await page.locator('[data-court="court1"] .preview-flip-face').innerText()).includes('正在上場'));
   }
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('badminton3x3.ipad.v1.state')).players[0].zone),'court1');
   await page.evaluate(()=>window.__badmintonIpadV1.openPanel());
   await page.fill('#adminPasswordInput',await page.evaluate(()=>window.__badmintonIpadV1.getState().settings.adminPassword));await page.click('#adminLoginBtn');
   await page.locator('#previewGatheringBtn').waitFor({state:'visible'});
   assert.equal(await page.locator('.preview-retired').isVisible(),false);
   assert.equal(await page.locator('#callEffectDurationSelect').evaluate(el=>!!el.closest('#adminDataBody')),true);
   await page.screenshot({path:path.join(require('os').tmpdir(),'badminton-integrated-admin-'+legacy+'.png')});
   await page.click('#previewGatheringBtn');await page.waitForURL('**/setup-test.html?integrated=1');
   await page.waitForFunction(()=>!document.getElementById('gf-forward').disabled);
   assert((await page.locator('#gf-roster').inputValue()).includes('Chris'));
   assert((await page.locator('#setup-engine').getAttribute('src')).includes('ui-preview=1'));
   assert.deepEqual(errors,[]);console.log('PASS '+(legacy?'Legacy preservation':'Modern flip, pause, swap, entering status')+', geometry and formal isolation');await context.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
