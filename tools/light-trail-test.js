const path = require('path');
const assert = require('assert/strict');
const {chromium} = require('playwright');
const url = 'file:///' + path.resolve('index.html').replace(/\\/g,'/') + '?debug=1';
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const count of [1,2,3,4]){
   const context=await browser.newContext({viewport:{width:1024,height:638},hasTouch:true});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url);
   await page.evaluate(count=>{
    const api=window.__badmintonIpadV1,st=api.getState();
    st.players=Array.from({length:count},(_,i)=>({id:'light'+i,name:['柔伊','Chris','雅雯','Amy'][i],zone:'next1',slot:i+1,games:0,color:'#bfdbfe',isActive:true,sortOrder:i}));
    Object.assign(st.settings,{courtCount:3,nextCount3x3:3,autoCallEnabled:false,autoCallMode:'off',courtEntryAnimationEnabled:true,courtEntryAnimationModule:'light-trail-v1',callEffectEnabled:true});
    api.setState(st);window.move=api.autoNextUpToCourt('next1','court1',true);
   },count);
   if(count<4){await page.locator('#modalMask.show').waitFor();await page.click('#modalOkBtn');}
   await page.evaluate(async()=>{await window.move;window.__badmintonIpadV1.render();});
   await page.locator('.entry-light-overlay').waitFor();
   assert.equal(await page.locator('.entry-light-clone').count(),count);
   assert.equal(await page.locator('.entry-light-trail').count(),count);
   assert.equal(await page.locator('.entry-light-ripple').count(),count);
   assert.equal(await page.locator('.entry-light-border').count(),1);
   await page.waitForTimeout(450);
   await page.screenshot({path:path.join(require('os').tmpdir(),'badminton-light-'+count+'.png')});
   assert(await page.evaluate(()=>Array.from(document.querySelectorAll('.entry-light-trail')).some(p=>Number(getComputedStyle(p).opacity)>0.1)));
   assert.equal(await page.evaluate(()=>window.__badmintonIpadV1.getState().players.filter(p=>p.zone==='court1').length),count);
   await page.locator('.entry-animation-overlay').waitFor({state:'detached'});
   assert.equal(await page.locator('.entry-destination-hidden').count(),0);
   assert.deepEqual(errors,[]);
   console.log('PASS light module '+count+' players, visible paths, immediate mutation, cleanup');
   await context.close();
  }
  for(const scenario of ['reduced','unavailable','legacy']){
   const context=await browser.newContext({viewport:{width:1024,height:638},hasTouch:true,reducedMotion:scenario==='reduced'?'reduce':'no-preference',userAgent:scenario==='legacy'?'Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 Version/12.1.2 Mobile/15E148 Safari/604.1':undefined});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
   await page.evaluate(scenario=>{
    const api=window.__badmintonIpadV1,st=api.getState();st.players=Array.from({length:4},(_,i)=>({id:'fallback'+i,name:'Player '+i,zone:'next1',slot:i+1,games:0,color:'#bfdbfe',isActive:true}));
    Object.assign(st.settings,{autoCallEnabled:false,autoCallMode:'off',courtEntryAnimationEnabled:true,courtEntryAnimationModule:'light-trail-v1',callEffectEnabled:true});api.setState(st);
    if(scenario==='unavailable')Element.prototype.animate=undefined;
    window.move=api.autoNextUpToCourt('next1','court1',true);
   },scenario);
   await page.evaluate(async()=>{await window.move;window.__badmintonIpadV1.render();});await page.waitForTimeout(1500);
   assert.equal(await page.locator('.entry-light-overlay,.entry-destination-hidden').count(),0);
   assert.equal(await page.evaluate(()=>window.__badmintonIpadV1.getState().players.filter(p=>p.zone==='court1').length),4);
   assert.deepEqual(errors,[]);console.log('PASS '+scenario+' fallback, successful placement and cleanup');await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
