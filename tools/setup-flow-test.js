const fs=require('fs');
const path=require('path');
const http=require('http');
const assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve('.');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');
  res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch();
 try{
  for(const legacy of [false,true]){
   const context=await browser.newContext({viewport:{width:legacy?1024:390,height:legacy?768:844},hasTouch:true,userAgent:legacy?'Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 Version/12.1.2 Mobile/15E148 Safari/604.1':undefined});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{if(window===window.top){localStorage.setItem('badminton3x3.ipad.v1.state',JSON.stringify({players:[{id:'one',name:'Amy',zone:'court1',slot:1,games:7,color:'#fecaca',isActive:true},{id:'two',name:'雅雯',zone:'rest',slot:null,games:2,color:'#bfdbfe',isActive:true}],settings:{courtCount:3,autoCallEnabled:false,helperTextEnabled:false},gameLog:[]}));}});
   await page.route('**/api/voice/generate',route=>route.fulfill({status:200,contentType:'audio/mpeg',body:fs.readFileSync('voice-poc/zh-TW-HsiaoChenNeural/rou-yi.mp3')}));
   await page.goto('http://127.0.0.1:'+server.address().port+'/setup-test.html');
   await page.waitForFunction(()=>!document.getElementById('gf-forward').disabled);
   assert.equal(await page.locator('#gf-roster').inputValue(),'Amy\n雅雯');
   assert(await page.locator('#gf-line-help').isHidden());
   await page.locator('.gf-player').first().click();await page.locator('#gf-swatches button').nth(1).click();
   await page.click('#gf-forward');assert(await page.locator('#gf-forward').isDisabled());
   await page.locator('section[data-step="1"]').waitFor({state:'visible'});
   const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,rects:Array.from(document.querySelectorAll('section[data-step="1"] .gf-setting-group')).map(x=>{const r=x.getBoundingClientRect();return {top:r.top,left:r.left,width:r.width};})}));
   assert.equal(geometry.overflow,false);if(legacy){assert.equal(geometry.rects[0].top,geometry.rects[1].top);assert(geometry.rects[1].left>geometry.rects[0].left);}
   await page.click('#gf-generate');await page.waitForFunction(()=>!document.getElementById('gf-forward').disabled);
   await page.evaluate(()=>{const api=document.getElementById('setup-engine').contentWindow.__badmintonIpadV1;window.trialCalls=0;api.testEdgeVoice=function(){window.parent.trialCalls++;};});
   await page.click('#gf-trial');await page.waitForFunction(()=>window.trialCalls===1);
   await page.click('#gf-forward');await page.locator('#gf-labels input').first().fill('A');
   await page.click('#gf-forward');assert(await page.locator('#gf-forward').isDisabled());
   await page.click('#gf-court-generate');await page.waitForFunction(()=>!document.getElementById('gf-forward').disabled);
   await page.click('#gf-forward');await page.click('#gf-forward');
   assert(await page.locator('#gf-previous').isVisible());
   await page.click('#gf-forward');
   const frame=page.frameLocator('#setup-engine');await frame.locator('#modalMask.show').waitFor();
   await frame.locator('#modalCancelBtn').click();await page.locator('#gf-forward').waitFor({state:'visible'});
   await page.click('#gf-forward');await frame.locator('#modalMask.show').waitFor();await frame.locator('#modalOkBtn').click();
   await page.waitForFunction(()=>document.getElementById('gathering-flow').hidden);
   const result=await page.evaluate(()=>({formal:JSON.parse(localStorage.getItem('badminton3x3.ipad.v1.state')),test:document.getElementById('setup-engine').contentWindow.__badmintonIpadV1.getState()}));
   assert.equal(result.formal.players[0].games,7);assert.equal(result.formal.players[0].zone,'court1');
   assert(result.test.players.every(p=>p.games===0&&p.zone==='rest'));
   assert.equal(result.test.players[0].color,'#bbf7d0');assert.equal(result.test.settings.courtLabels.court1,'A');
   assert.deepEqual(errors,[]);console.log((legacy?'Legacy':'modern')+' PASS real generation/store, color, guards, reset cancel/confirm, formal isolation');
   await context.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
