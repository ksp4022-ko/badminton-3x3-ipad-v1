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
   await page.goto(base+'/integrated-test.html');await page.waitForFunction(()=>!!window.PreviewAdminLayout);
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
   await page.waitForFunction(()=>!!window.PreviewAdminLayout);
   assert.equal(await page.locator('#previewAdminHome').isVisible(),true);
   assert.equal(await page.locator('#floatPanel').evaluate(el=>el.classList.contains('preview-status-layout')),true);
   assert.equal(await page.locator('#previewGatheringBtn').innerText(),'＋ 新聚會');
   assert.equal(await page.locator('#previewGatheringBtn').evaluate(el=>el.getBoundingClientRect().width<el.closest('.preview-session').getBoundingClientRect().width*.7),true);
   assert.equal(await page.locator('#previewRosterStatus').innerText(),'8 位成員 · 4 位上場 · 4 位預備');
   assert.equal(await page.locator('#selectedAdminBar').isVisible(),true);
   assert.equal(await page.locator('#selectedAdminBar').evaluate(el=>el.nextElementSibling.classList.contains('panel-body')),true);
   assert.equal(await page.locator('#previewAdminDetail').isVisible(),false);
   assert.equal(await page.locator('#previewVoiceToggle').getAttribute('aria-expanded'),'false');
   assert.equal(await page.locator('#autoCallOffBtn').isVisible(),false);
   assert.equal(await page.locator('#previewAssetsToggle').getAttribute('aria-expanded'),'false');
   const modeBefore=await page.evaluate(()=>window.__badmintonIpadV1.getState().settings.autoCallMode);
   await page.click('#previewVoiceToggle');assert.equal(await page.locator('#autoCallOffBtn').isVisible(),true);
   await page.reload();await page.waitForFunction(()=>!!window.PreviewAdminLayout);await page.evaluate(()=>window.__badmintonIpadV1.openPanel());
   assert.equal(await page.locator('#previewVoiceToggle').getAttribute('aria-expanded'),'true');
   await page.click('#previewVoiceToggle');assert.equal(await page.locator('#autoCallOffBtn').isVisible(),false);
   await page.click('#previewAssetsToggle');assert.equal(await page.locator('#toggleLocalVoiceDetailsBtn').isVisible(),true);
   await page.click('#previewAssetsToggle');assert.equal(await page.locator('#toggleLocalVoiceDetailsBtn').isVisible(),false);
   assert.equal(await page.evaluate(()=>window.__badmintonIpadV1.getState().settings.autoCallMode),modeBefore);
   const layout=await page.locator('#previewVoiceGrid').evaluate(el=>{const a=el.children[0].getBoundingClientRect(),b=el.children[1].getBoundingClientRect();return {topA:a.top,topB:b.top,leftA:a.left,leftB:b.left};});
   assert.equal(layout.topA,layout.topB);assert(layout.leftB>layout.leftA);
   await page.click('#previewCategoryplayers');assert.equal(await page.locator('#previewAdminHome').isVisible(),false);await page.click('#showGamesDetailBtn');assert.equal(await page.locator('#plusGameBtn').isVisible(),true);await page.click('#hideGamesDetailBtn');await page.click('#previewAdminBackBtn');
   await page.click('#previewCategorycourts');assert.equal(await page.locator('#saveCourtLabelsBtn').isVisible(),true);await page.click('#previewAdminBackBtn');
   await page.click('#previewCategorysettings');assert.equal(await page.locator('#callEffectDurationSelect').isVisible(),true);assert.equal(await page.locator('#exportBackupBtn').isVisible(),true);await page.click('#previewAdminBackBtn');
   assert.equal(await page.locator('#previewGatheringBtn').count(),1);
   assert.equal(await page.locator('.preview-retired').isVisible(),false);
   assert.equal(await page.locator('#callEffectDurationSelect').evaluate(el=>!!el.closest('#adminDataBody')),true);
   await page.screenshot({path:path.join(require('os').tmpdir(),'badminton-integrated-admin-'+device+'.png')});
   await page.evaluate(()=>window.__badmintonIpadV1.closePanel());
   await page.click('.player-chip[data-player-id="p1"]');
   await page.evaluate(()=>window.__badmintonIpadV1.openPanel());
   assert.equal(await page.locator('#selectedAdminName').innerText(),'Chris');
   assert.equal(await page.locator('#selectedAdminCount').innerText(),String(await page.evaluate(()=>window.__badmintonIpadV1.getState().players.find(p=>p.id==='p1').games)));
   assert.equal(await page.locator('#selectedAdminName').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(191, 219, 254)');
   await page.screenshot({path:path.join(require('os').tmpdir(),'badminton-integrated-admin-selected-'+device+'.png')});
   await page.click('#selectedAdminCancelBtn');assert.equal(await page.locator('#selectedAdminEmpty').isVisible(),true);
   if(phone){
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
    const portrait=await page.locator('#previewVoiceGrid').evaluate(el=>{const a=el.children[0].getBoundingClientRect(),b=el.children[1].getBoundingClientRect();return {a:a.top,b:b.top,right:el.getBoundingClientRect().right};});
    assert(portrait.b>portrait.a);assert(portrait.right<=390);
    await page.click('#previewVoiceToggle');const modes=await page.locator('#autoCallOffBtn,#edgeCallBtn,#browserCallBtn').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().top));assert(modes.every(top=>top===modes[0]));await page.click('#previewVoiceToggle');
    assert.equal(await page.locator('#previewGatheringBtn').evaluate(el=>el.closest('.preview-session-head').querySelector('h2').getBoundingClientRect().top<=el.getBoundingClientRect().bottom),true);
    assert.equal(await page.locator('#previewRosterStatus').innerText(),'8 位成員 · 4 位上場 · 4 位預備');
    await page.click('#previewCategorysettings');assert.equal(await page.locator('#callEffectDurationSelect').isVisible(),true);
    assert.equal(await page.locator('#floatPanel').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
    await page.screenshot({path:path.join(require('os').tmpdir(),'badminton-integrated-admin-portrait-settings.png')});await page.click('#previewAdminBackBtn');
    await page.screenshot({path:path.join(require('os').tmpdir(),'badminton-integrated-admin-portrait.png')});
   }
   await page.click('#previewGatheringBtn');await page.waitForURL('**/setup-test.html?integrated=1');
   await page.waitForFunction(()=>!document.getElementById('gf-forward').disabled);
   assert((await page.locator('#gf-roster').inputValue()).includes('Chris'));
   assert((await page.locator('#setup-engine').getAttribute('src')).includes('ui-preview=1'));
   assert.deepEqual(errors,[]);console.log('PASS '+(legacy?'Legacy preservation':'Modern flip, pause, swap, entering status')+', geometry and formal isolation');await context.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
