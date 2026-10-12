const assert=require('assert/strict'),path=require('path'),fs=require('fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const legacy of [false,true]){
   const context=await browser.newContext({viewport:{width:1024,height:638},hasTouch:true,userAgent:legacy?'Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 Version/12.1.2 Mobile/15E148 Safari/604.1':undefined});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file:///'+path.resolve('index.html').replace(/\\/g,'/')+'?debug=1');
   await page.evaluate(async bytes=>{
    const api=window.__badmintonIpadV1;window.ratePlays=[];window.rateAudios=[];
    window.assertDefault=api.getState().settings.edgePlaybackRate;
    const st=api.getState();st.players=[{id:'p1',name:'雅雯',zone:'court1',slot:1,games:3,color:'#bfdbfe',isActive:true},{id:'p2',name:'Chris',zone:'next1',slot:1,games:4,color:'#fecaca',isActive:true},{id:'p3',name:'Kevin',zone:'rest',slot:null,games:0,color:'#bfdbfe',isActive:true}];st.settings.autoCallMode='edge';st.settings.autoCallEnabled=true;api.setState(st);
    for(const desc of api.requiredLocalVoiceAssetsForToday())await api.localVoicePut(Object.assign({},desc,{blob:new Blob([new Uint8Array(bytes)],{type:'audio/mpeg'}),createdAt:new Date().toISOString()}));
    HTMLMediaElement.prototype.play=function(){const a=this;if(a.src.indexOf('blob:')===0){window.ratePlays.push(a.playbackRate);window.rateAudios.push(a);if(window.ratePlays.length!==1)setTimeout(()=>{if(a.onended)a.onended();},10);}return Promise.resolve();};
    api.openPanel();
   },Array.from(fs.readFileSync('voice-poc/zh-TW-HsiaoChenNeural/rou-yi.mp3')));
   assert.equal(await page.evaluate(()=>window.assertDefault),1);
   await page.fill('#adminPasswordInput',await page.evaluate(()=>window.__badmintonIpadV1.getState().settings.adminPassword));await page.click('#adminLoginBtn');
   if(!(await page.locator('#edgePlaybackRateSelect').isVisible()))await page.evaluate(()=>document.querySelector('[data-collapse-target="adminVoiceBody"]').click());
   await page.selectOption('#edgePlaybackRateSelect','1.2');
   const before=await page.evaluate(()=>window.__badmintonIpadV1.getState().players);
   await page.evaluate(()=>window.__badmintonIpadV1.callPlayers(['雅雯','Chris'],'court1'));
   await page.waitForFunction(()=>window.ratePlays.length===1);
   await page.evaluate(()=>{window.__badmintonIpadV1.setEdgePlaybackRate(1.3);window.liveRate=window.rateAudios[0].playbackRate;window.rateAudios[0].onended();});
   assert.equal(await page.evaluate(()=>window.liveRate),1.3);
   await page.waitForFunction(()=>window.ratePlays.length===3);
   assert.deepEqual(await page.evaluate(()=>window.ratePlays),[1.2,1.3,1.3]);
   await page.evaluate(()=>window.__badmintonIpadV1.repeatLastCall());await page.waitForFunction(()=>window.ratePlays.length===6);
   await page.evaluate(()=>window.__badmintonIpadV1.prepareFirstNextGroupCall());await page.waitForFunction(()=>window.ratePlays.length===8);
   assert((await page.evaluate(()=>window.ratePlays.slice(3))).every(rate=>rate===1.3));
   const config=await page.evaluate(()=>{const api=window.__badmintonIpadV1,a={playbackRate:1,preservesPitch:false,webkitPreservesPitch:false};api.applyEdgePlaybackRate(a);return {audio:a,rate:api.createSetupTrialUtterance('Kevin','en-US').rate,invalid:api.normalizeEdgePlaybackRate(99)};});
   assert.equal(config.audio.playbackRate,1.3);assert.equal(config.audio.preservesPitch,true);assert.equal(config.audio.webkitPreservesPitch,true);assert(Math.abs(config.rate-.95)<0.000001);assert.equal(config.invalid,1);
   assert.deepEqual(await page.evaluate(()=>window.__badmintonIpadV1.getState().players),before);
   await page.reload();assert.equal(await page.evaluate(()=>window.__badmintonIpadV1.getState().settings.edgePlaybackRate),1.3);
   assert.deepEqual(errors,[]);console.log('PASS '+(legacy?'Legacy':'Modern')+' live rate, all segments, replay/prepare, persistence, Browser isolation');await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
