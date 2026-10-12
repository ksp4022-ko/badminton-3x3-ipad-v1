const path=require('path'),assert=require('assert/strict'),os=require('os');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const width of [390,1024]){
   const context=await browser.newContext({viewport:{width,height:width===390?844:638},hasTouch:true});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{localStorage.setItem('badminton3x3.ipad.v1.state',JSON.stringify({players:[{id:'a',name:'柔伊',zone:'court1',slot:1,games:3,color:'#bfdbfe',isActive:true},{id:'b',name:'Chris',zone:'rest',slot:null,games:4,color:'#fecaca',isActive:true}],settings:{adminPassword:'1234',freePlayMode:false,autoArrangeMode:true,autoCallMode:'off',autoCallEnabled:false},gameLog:[]}));});
   await page.goto('file:///'+path.resolve('admin-compare.html').replace(/\\/g,'/'));await page.waitForFunction(()=>!!window.CompareAdmin);
   assert.equal(await page.locator('#adminTools').isVisible(),false);
   await page.fill('#adminPasswordInput',await page.evaluate(()=>window.__badmintonIpadV1.getState().settings.adminPassword));await page.click('#adminLoginBtn');
   const before=await page.evaluate(()=>window.__badmintonIpadV1.getState().players);
   await page.locator('#compareAdmin').waitFor({state:'visible'});
   assert.equal(await page.locator('#floatPanel').evaluate(el=>el.classList.contains('compare-style-a')),true);
   assert.equal(await page.locator('#floatPanel').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(243, 245, 247)');
   assert.equal(await page.locator('#floatPanel .panel-body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(243, 245, 247)');
   assert.equal(await page.locator('#panelTitle').evaluate(el=>getComputedStyle(el).color),'rgb(24, 32, 45)');
   await page.screenshot({path:path.join(os.tmpdir(),'badminton-style-a-'+width+'.png')});
   await page.click('#compareTabvoice');await page.click('#previewVoiceToggle');assert(await page.locator('#edgeCallBtn').isVisible());await page.click('#browserCallBtn');assert(await page.locator('#voiceRateSelect').isVisible());await page.click('#autoCallOffBtn');
   await page.click('#compareTabplayers');await page.click('#showGamesDetailBtn');assert(await page.locator('#plusGameBtn').isVisible());await page.click('#hideGamesDetailBtn');
   await page.click('#compareTabsettings');assert(await page.locator('#saveCourtLabelsBtn').isVisible());await page.click('#compareSettingsettings');assert(await page.locator('#callEffectDurationSelect').isVisible());
   await page.click('#compareStyleb');assert(await page.locator('#compareOpenvoice').isVisible());assert.equal(await page.locator('#previewVoiceGrid').isVisible(),false);
   await page.screenshot({path:path.join(os.tmpdir(),'badminton-style-b-'+width+'.png')});
   await page.click('#compareOpenvoice');assert(await page.locator('#autoCallOffBtn').isVisible());await page.click('#compareBack');await page.click('#compareOpenplayers');assert(await page.locator('#showPlayerDetailBtn').isVisible());await page.click('#compareBack');
   await page.click('#compareOpencourts');assert(await page.locator('#saveCourtLabelsBtn').isVisible());await page.click('#compareBack');await page.click('#compareOpensettings');assert(await page.locator('#exportBackupBtn').isVisible());
   assert.deepEqual(await page.evaluate(()=>window.__badmintonIpadV1.getState().players),before);
   assert.equal(await page.locator('#floatPanel').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
   for(const id of ['previewGatheringBtn','edgeCallBtn','saveCourtLabelsBtn','addPlayerBtn','plusGameBtn'])assert.equal(await page.locator('#'+id).count(),1);
   assert.deepEqual(errors,[]);console.log('PASS A/B '+width+' login gate, real controls, navigation, no overflow, unchanged players');await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
