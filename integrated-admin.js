(function(){
 'use strict';
 var tools=document.getElementById('adminTools');
 if(!tools||!window.BoardPreview)return;
 function element(tag,cls,text){var node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node;}
 function card(bodyId){var node=document.getElementById(bodyId).parentNode;node.classList.add('preview-managed-card');return node;}
 function heading(node,title,hidden){var h=node.querySelector('h3');h.innerHTML='';h.appendChild(element('span','',title));h.hidden=!!hidden;}
 var home=element('div','preview-admin-home');home.id='previewAdminHome';
 var top=element('div','preview-top-grid'),session=element('section','preview-session'),quick=element('section','preview-quick');
 session.setAttribute('aria-label','聚會與名單');quick.setAttribute('aria-label','排場操作');
 var sessionHead=element('div','preview-session-head'),start=document.getElementById('previewGatheringBtn');
 start.textContent='＋ 新聚會';sessionHead.appendChild(element('h2','','今日聚會'));sessionHead.appendChild(start);session.appendChild(sessionHead);
 var rosterStatus=element('div','preview-roster-status');rosterStatus.id='previewRosterStatus';rosterStatus.setAttribute('aria-live','polite');session.appendChild(rosterStatus);
 session.appendChild(document.getElementById('updateTodayRosterBtn'));
 var today=card('adminTodayBody');quick.appendChild(today);top.appendChild(session);top.appendChild(quick);home.appendChild(top);
 var operationsTitle=element('h2','preview-operations-title','現場操作');quick.insertBefore(operationsTitle,today);
 var actions=element('div','preview-secondary-actions');
 ['regroupNextBtn','undoRegroupNextBtn','randomFillBtn'].forEach(function(id){actions.appendChild(today.querySelector('#'+id));});
 today.querySelector('.admin-action-grid').appendChild(actions);
 var resetRow=element('div','preview-reset-row');resetRow.appendChild(today.querySelector('#resetTodayBtn'));today.querySelector('.admin-action-grid').appendChild(resetRow);
 function refreshRosterStatus(){
  var players=window.__badmintonIpadV1.getState().players.filter(function(p){return p.isActive!==false;}),court=0,next=0;
  players.forEach(function(p){if(/^court/.test(p.zone))court++;else if(/^next/.test(p.zone))next++;});
  var text=players.length+' 位成員 · '+court+' 位上場 · '+next+' 位預備';if(rosterStatus.textContent!==text)rosterStatus.textContent=text;
 }
 new MutationObserver(refreshRosterStatus).observe(document.getElementById('courtRow'),{childList:true,subtree:true});refreshRosterStatus();
 var voice=element('div','preview-voice-grid');voice.id='previewVoiceGrid';
 var call=card('adminVoiceBody'),assets=card('adminLocalVoiceBody');heading(call,'自動呼叫',false);heading(assets,'本機音源',false);voice.appendChild(call);voice.appendChild(assets);home.appendChild(voice);
 var voicePanels=window.__badmintonIpadV1.getState().settings.previewVoicePanels || {};
 function collapsible(node,bodyId,label,key,buttonId){
  node.classList.add('preview-voice-card');var h=node.querySelector('h3');h.innerHTML='';
  var button=element('button','preview-voice-toggle');button.type='button';button.id=buttonId;button.setAttribute('aria-controls',bodyId);
  var name=element('span','preview-voice-title',label),summary=element('span','preview-voice-summary'),arrow=element('span','preview-voice-arrow','›');arrow.setAttribute('aria-hidden','true');button.appendChild(name);button.appendChild(summary);button.appendChild(arrow);h.appendChild(button);
  function apply(){var closed=voicePanels[key]!==false;node.classList.toggle('preview-voice-collapsed',closed);button.setAttribute('aria-expanded',String(!closed));node.querySelector('#'+bodyId).setAttribute('aria-hidden',String(closed));}
  button.onclick=function(){voicePanels[key]=button.getAttribute('aria-expanded')==='true';window.__badmintonIpadV1.savePreviewSettings({previewVoicePanels:Object.assign({},voicePanels)});apply();};apply();return summary;
 }
 var callSummary=collapsible(call,'adminVoiceBody','自動呼叫','call','previewVoiceToggle');
 var assetSummary=collapsible(assets,'adminLocalVoiceBody','本機音源','assets','previewAssetsToggle');
 function refreshVoiceSummaries(){
  var body=call.querySelector('#autoCallBody'),status=call.querySelector('#edgeReadyStatus');
  var text=body.classList.contains('mode-checking')?'音源檢查中…':body.classList.contains('mode-edge')?'Edge 固定語音':body.classList.contains('mode-browser')?'網頁合成語音':'關閉';
  if(body.classList.contains('mode-edge')){if(status.classList.contains('is-ready'))text+=' · Ready';else if(status.classList.contains('is-missing'))text+=' · 缺少音源';else if(status.classList.contains('is-error'))text+=' · 檢查／播放失敗';}
  callSummary.textContent=text;
  if(status.textContent.trim()==='Edge 固定語音')status.setAttribute('data-preview-empty-status','');else status.removeAttribute('data-preview-empty-status');
  var source=assets.querySelector('#localVoiceSummary');assetSummary.textContent=source.textContent.split('\n')[0].replace('本機音源 ','').trim()||'尚未檢查';
 }
 var statusObserver=new MutationObserver(refreshVoiceSummaries);
 statusObserver.observe(call.querySelector('#autoCallBody'),{attributes:true,attributeFilter:['class']});
 statusObserver.observe(call.querySelector('#edgeReadyStatus'),{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']});
 statusObserver.observe(assets.querySelector('#localVoiceSummary'),{childList:true,characterData:true,subtree:true});refreshVoiceSummaries();
 var nav=element('nav','preview-category-grid');nav.setAttribute('aria-label','管理分類');home.appendChild(nav);
 var detail=element('div','preview-admin-detail');detail.id='previewAdminDetail';detail.hidden=true;
 var detailHead=element('div','preview-detail-head'),back=element('button','preview-detail-back','‹ 返回控制台'),title=element('h2','');back.type='button';back.id='previewAdminBackBtn';title.id='previewAdminDetailTitle';detailHead.appendChild(back);detailHead.appendChild(title);detail.appendChild(detailHead);
 var entries=[];
 [['players','球員與場次','adminPlayersBody'],['courts','場地設定','adminCourtsBody'],['settings','系統設定','adminDataBody']].forEach(function(entry){
  var pane=card(entry[2]);heading(pane,entry[1],true);pane.hidden=true;pane.setAttribute('data-preview-category',entry[0]);detail.appendChild(pane);
  var button=element('button','preview-category-entry');button.type='button';button.id='previewCategory'+entry[0];button.setAttribute('aria-controls','previewAdminDetail');button.setAttribute('aria-expanded','false');button.appendChild(element('span','',entry[1]));button.appendChild(element('span','preview-category-arrow','›'));
  button.onclick=function(){home.hidden=true;detail.hidden=false;title.textContent=entry[1];entries.forEach(function(e){e.pane.hidden=e.pane!==pane;e.button.setAttribute('aria-expanded',String(e.button===button));});document.querySelector('#floatPanel .panel-body').scrollTop=0;};
  nav.appendChild(button);entries.push({button:button,pane:pane});
 });
 back.onclick=function(){detail.hidden=true;home.hidden=false;entries.forEach(function(e){e.pane.hidden=true;e.button.setAttribute('aria-expanded','false');});document.querySelector('#floatPanel .panel-body').scrollTop=0;};
 var data=detail.querySelector('#adminDataBody');
 var dataTitle=element('h3','preview-data-title','資料工具');data.insertBefore(dataTitle,data.querySelector('.data-grid'));
 var display=data.querySelector('.preview-settings-inner');
 var groups=Array.from(display.children);
 groups.forEach(function(group){
  if(group.classList.contains('compact-state-row'))group.classList.add('preview-setting-field');
 });
 tools.insertBefore(home,tools.firstChild);tools.insertBefore(detail,home.nextSibling);
 document.getElementById('floatPanel').classList.add('preview-admin-v3','preview-status-layout');
 window.PreviewAdminLayout={home:home,detail:detail};
 if(location.search.indexOf('admin-compare=1')<0){
  var panel=document.getElementById('floatPanel');panel.classList.add('preview-tabbed-layout');
  var tabs=element('nav','status-tabs');tabs.id='statusAdminTabs';tabs.setAttribute('aria-label','控制台分類');
  var tabEntries=[],route='today',settingsRoute='courts',panes={};
  entries.forEach(function(entry){panes[entry.pane.getAttribute('data-preview-category')]=entry.pane;});
  [['today','聚會'],['players','球員'],['voice','語音'],['settings','設定']].forEach(function(item){
   var button=element('button','',item[1]);button.type='button';button.id='statusTab'+item[0];button.onclick=function(){showTab(item[0]);};tabs.appendChild(button);tabEntries.push({key:item[0],button:button});
  });
  tools.insertBefore(tabs,home);nav.hidden=true;detailHead.hidden=true;
  var settingsNav=element('nav','status-settings-nav');settingsNav.hidden=true;settingsNav.id='statusSettingsNav';
  [['courts','場地'],['settings','系統與資料']].forEach(function(item){var button=element('button','',item[1]);button.type='button';button.id='statusSetting'+item[0];button.onclick=function(){settingsRoute=item[0];showTab('settings');};settingsNav.appendChild(button);});detail.insertBefore(settingsNav,detail.firstChild);
  sessionHead.querySelector('h2').textContent='目前聚會';rosterStatus.hidden=true;operationsTitle.hidden=true;
  var metrics=element('div','status-metrics'),metricValues={};metrics.setAttribute('aria-live','polite');
  [['roster','名單','users'],['voice','音源','volume-2'],['courts','場地','grid-2x2']].forEach(function(item){
   var cell=element('button','status-metric'),icon=element('img');cell.type='button';cell.id='statusTile'+item[0];icon.src='./vendor/lucide/'+item[2]+'.svg';icon.alt='';icon.width=24;icon.height=24;
   cell.appendChild(icon);cell.appendChild(element('span','status-metric-label',item[1]));var value=element('strong','');value.id='statusMetric'+item[0];if(item[0]==='roster'){value.classList.add('status-roster-value');value.appendChild(element('span','status-roster-mark'));value.appendChild(element('span','status-roster-count'));}if(item[0]==='courts'){value.classList.add('status-court-value');value.appendChild(element('span','status-court-main'));value.appendChild(element('span','status-court-sub'));}cell.appendChild(value);metricValues[item[0]]=value;metrics.appendChild(cell);
  });session.insertBefore(metrics,session.querySelector('#updateTodayRosterBtn'));
  var nextStep=element('button','status-next-step'),nextMeta=element('span','status-next-meta'),nextText=element('span','status-next-text'),nextTitle=element('span','status-next-title'),nextSub=element('span','status-next-sub'),nextArrow=element('span','status-next-arrow','→'),nextAction=null;
  nextStep.type='button';nextStep.id='statusNextStep';nextArrow.setAttribute('aria-hidden','true');nextText.appendChild(nextTitle);nextText.appendChild(nextSub);nextStep.appendChild(nextMeta);nextStep.appendChild(nextText);nextStep.appendChild(nextArrow);
  nextStep.onclick=function(){if(nextAction)nextAction();};metrics.insertBefore(nextStep,metrics.firstChild);
  function openRoster(){update.click();}
  function openVoice(){showTab('voice');var toggle=document.getElementById('previewAssetsToggle');if(toggle&&toggle.getAttribute('aria-expanded')!=='true')toggle.click();}
  function openCourts(){settingsRoute='courts';showTab('settings');}
  document.getElementById('statusTileroster').onclick=openRoster;document.getElementById('statusTilevoice').onclick=openVoice;document.getElementById('statusTilecourts').onclick=openCourts;
  var update=session.querySelector('#updateTodayRosterBtn');update.textContent='更新今日名單 ›';update.hidden=true;
  var modes=element('div','status-session-settings'),modeField=element('label','','排場模式'),modeSelect=element('select');modeSelect.id='statusArrangeMode';
  [['free','自由暢打'],['auto','自動排場']].forEach(function(item){var option=element('option','',item[1]);option.value=item[0];modeSelect.appendChild(option);});
  modeSelect.onchange=function(){today.querySelector(modeSelect.value==='auto'?'#autoModeBtn':'#freeModeBtn').click();};modeField.appendChild(modeSelect);modes.appendChild(modeField);
  var voiceField=element('div','status-mode-field');voiceField.appendChild(element('span','','自動呼叫'));var voiceLink=element('button','');voiceLink.type='button';voiceLink.id='statusVoiceMode';voiceLink.onclick=function(){showTab('voice');};voiceField.appendChild(voiceLink);modes.appendChild(voiceField);quick.insertBefore(modes,today);
  today.querySelector('.today-mode-control').hidden=true;
  function textIfChanged(node,text){if(node.textContent!==text)node.textContent=text;}
  function refreshSession(){
   var state=window.__badmintonIpadV1.getState(),count=state.players.filter(function(p){return p.isActive!==false;}).length;
   var rosterValue=metricValues.roster;rosterValue.classList.toggle('is-loaded',count>0);textIfChanged(rosterValue.firstChild,count?'✓':'✗');textIfChanged(rosterValue.lastChild,count+' 人');
   if(rosterValue.getAttribute('aria-label')!==(count?'已載入 '+count+' 人':'尚無名單'))rosterValue.setAttribute('aria-label',count?'已載入 '+count+' 人':'尚無名單');rosterValue.firstChild.setAttribute('aria-hidden','true');
   var source=assets.querySelector('#localVoiceSummary').textContent;
   textIfChanged(metricValues.voice,/Missing/.test(source)?'缺少音源':/Ready/.test(source)?'Ready':'檢查中');
   var courtCount=Number(state.settings.courtCount),nextCount=window.__legacyIpad?(courtCount===2?2:3):Number(state.settings.nextCount);
   textIfChanged(metricValues.courts.firstChild,String(courtCount));textIfChanged(metricValues.courts.lastChild,'x'+nextCount);
   if(metricValues.courts.getAttribute('aria-label')!==courtCount+' 面場，預備 '+nextCount+' 組')metricValues.courts.setAttribute('aria-label',courtCount+' 面場，預備 '+nextCount+' 組');
   var pending=[];
   if(!count)pending.push({title:'更新今日名單',sub:'尚無名單，排場前要先載入球員',run:openRoster});
   if(/Missing/.test(source)&&call.querySelector('#autoCallBody').classList.contains('mode-edge'))pending.push({title:'補齊本機音源',sub:'缺少音源，Edge 呼叫無法播報',run:openVoice});
   var first=pending[0];nextAction=first?first.run:null;nextStep.classList.toggle('is-done',!first);nextStep.setAttribute('aria-disabled',String(!first));
   textIfChanged(nextMeta,first?'下一步・還有 '+pending.length+' 項待處理':'狀態');textIfChanged(nextTitle,first?first.title:'準備完成');
   textIfChanged(nextSub,first?first.sub:courtCount+' 面場・預備 '+nextCount+' 組');
   metrics.classList.toggle('helpers-off',state.settings.helperTextEnabled===false);
   [['roster','名單'],['voice','音源'],['courts','場地']].forEach(function(item){var tile=document.getElementById('statusTile'+item[0]),label=item[1]+'：'+(metricValues[item[0]].getAttribute('aria-label')||metricValues[item[0]].textContent);if(tile.getAttribute('aria-label')!==label)tile.setAttribute('aria-label',label);});
   modeSelect.value=state.settings.autoArrangeMode?'auto':'free';
   var body=call.querySelector('#autoCallBody');textIfChanged(voiceLink,body.classList.contains('mode-edge')?'Edge 固定語音':body.classList.contains('mode-browser')?'網頁合成語音':body.classList.contains('mode-checking')?'檢查中…':'關閉');
  }
  function showTab(key){
   route=key;home.hidden=key==='players'||key==='settings';detail.hidden=!home.hidden;top.hidden=key!=='today';voice.hidden=key!=='voice';settingsNav.hidden=key!=='settings';
   Object.keys(panes).forEach(function(p){panes[p].hidden=!(key==='players'&&p==='players'||key==='settings'&&p===settingsRoute);});
   tabEntries.forEach(function(item){item.button.setAttribute('aria-current',item.key===key?'page':'false');});
   Array.from(settingsNav.children).forEach(function(button){button.setAttribute('aria-pressed',String(button.id==='statusSetting'+settingsRoute));});
   document.querySelector('#floatPanel .panel-body').scrollTop=0;refreshSession();
  }
  var sessionObserver=new MutationObserver(refreshSession);
  sessionObserver.observe(assets.querySelector('#localVoiceSummary'),{childList:true,subtree:true,characterData:true});
  sessionObserver.observe(call.querySelector('#autoCallBody'),{attributes:true,attributeFilter:['class']});
  sessionObserver.observe(today.querySelector('.mode-row'),{subtree:true,attributes:true,attributeFilter:['class']});
  sessionObserver.observe(document.getElementById('courtRow'),{childList:true});
  var courtModes=panes.courts&&panes.courts.querySelector('#courtModeControls');
  if(courtModes){var courtModeLabel=element('div','compact-row-label status-court-count-label','場地數量');courtModes.insertBefore(courtModeLabel,courtModes.querySelector('.mode-row'));
   [['use2x2Btn','2 面場'],['use3x3Btn','3 面場'],['use4x4Btn','4 面場']].forEach(function(item){var b=courtModes.querySelector('#'+item[0]);if(b)b.textContent=item[1];});
   sessionObserver.observe(courtModes,{subtree:true,attributes:true,attributeFilter:['class']});}
  var nextCounts=panes.courts&&panes.courts.querySelector('#nextCountControls');if(nextCounts)sessionObserver.observe(nextCounts,{subtree:true,attributes:true,attributeFilter:['class']});
  var settingToggles=[];
  Array.from(display.querySelectorAll('.compact-state-row')).forEach(function(row){
   var original=Array.from(row.querySelectorAll('button'));if(original.length!==2)return;
   var label=row.querySelector('.compact-row-label').textContent,button=element('button','status-toggle');button.type='button';button.setAttribute('aria-label',label);button.setAttribute('data-setting-label',label);
   original.forEach(function(b){b.hidden=true;});row.querySelector('.compact-row-label').hidden=true;row.appendChild(button);
   function selected(){return original[1].classList.contains('active')||original[1].getAttribute('aria-pressed')==='true';}
   function refresh(){var on=selected(),helpers=window.__badmintonIpadV1.getState().settings.helperTextEnabled!==false;button.setAttribute('aria-pressed',String(on));button.disabled=original[1].disabled;button.textContent=(helpers&&on?'✓ ':'')+label+(helpers?(on?'・已開啟':'・已關閉'):'');}
   button.onclick=function(){original[selected()?0:1].click();settingToggles.forEach(function(refresh){refresh();});};
   var observer=new MutationObserver(refresh);original.forEach(function(b){observer.observe(b,{attributes:true,attributeFilter:['class','aria-pressed','disabled']});});settingToggles.push(refresh);row.classList.add('status-single-toggle');refresh();
  });
  function settingRow(id){return display.querySelector('#'+id).closest('.compact-state-row');}
  function infoCard(title,nodes){
   var section=element('section','status-info-card');section.setAttribute('aria-label',title);section.appendChild(element('h3','status-info-title',title));
   nodes.forEach(function(node){section.appendChild(node);});display.appendChild(section);
  }
  infoCard('上場提示',[settingRow('callEffectOnBtn'),display.querySelector('.effect-grid')]);
  infoCard('球員姓名',[display.querySelector('#playerNameScaleSelect').closest('.player-text-grid')]);
  var moduleFields=display.querySelector('#courtEntryAnimationModuleSelect').closest('.player-text-grid');moduleFields.classList.add('status-module-fields');infoCard('上場特效',[settingRow('courtEntryAnimationOnBtn'),moduleFields]);
  var manual=display.querySelector('.status-toggle[data-setting-label="手動移動動畫"]');
  if(manual)infoCard('手動操作',[manual.closest('.compact-state-row')]);
  infoCard('介面提示',[settingRow('helperTextOnBtn')]);
  infoCard('畫面方向',[settingRow('portraitAdminModeOnBtn')]);
  var dataCard=element('section','status-data-card');dataCard.setAttribute('aria-label','資料工具');dataCard.appendChild(dataTitle);dataCard.appendChild(data.querySelector('.data-grid'));var dangerRow=data.querySelector('.danger-row');if(dangerRow)dataCard.appendChild(dangerRow);data.appendChild(dataCard);
  new MutationObserver(function(){settingToggles.forEach(function(refresh){refresh();});}).observe(document.body,{attributes:true,attributeFilter:['class']});
  var autoBody=call.querySelector('#autoCallBody'),oldModes=autoBody.querySelector('.three-state-row'),modeButtons=Array.from(oldModes.children),sliderGroup=element('div','status-voice-slider');
  oldModes.hidden=true;var labels=element('div','status-slider-labels'),slider=element('input');slider.type='range';slider.min='0';slider.max='2';slider.step='1';slider.id='statusVoiceSlider';slider.setAttribute('aria-label','自動呼叫模式');
  var names=['關閉','Edge 模式','網頁音模式'],labelButtons=[],pill=element('span','status-slider-pill');pill.setAttribute('aria-hidden','true');
  function previewMode(index){pill.style.transform='translateX('+(index*100)+'%)';slider.setAttribute('aria-valuetext',names[index]);labelButtons.forEach(function(b,i){b.setAttribute('aria-pressed',String(i===index));});}
  function commitMode(index){
   if(modeButtons[index].disabled){refreshSlider();return;}
   // A range drag is not a button tap: bypass the panel's post-scroll click guard.
   var api=window.__badmintonIpadV1;
   if(index===1)api.enableAutoCallWithEdgeCheck();else if(index===2)api.enableBrowserAutoCall();else api.disableAutoCall();
   refreshSlider();
  }
  labels.setAttribute('aria-hidden','true');names.forEach(function(name){var b=element('button','',name);b.type='button';b.tabIndex=-1;labels.appendChild(b);labelButtons.push(b);});labels.appendChild(pill);sliderGroup.appendChild(labels);sliderGroup.appendChild(slider);autoBody.insertBefore(sliderGroup,oldModes);
  slider.onchange=function(){commitMode(Number(slider.value));};
  slider.oninput=function(){previewMode(Number(slider.value));};
  function refreshSlider(){
   var index=autoBody.classList.contains('mode-browser')?2:autoBody.classList.contains('mode-edge')?1:0;
   slider.value=String(index);slider.disabled=modeButtons.some(function(b){return b.disabled;});sliderGroup.classList.toggle('is-disabled',slider.disabled);previewMode(index);
   labelButtons.forEach(function(b){b.disabled=slider.disabled;});
  }
  var sliderObserver=new MutationObserver(refreshSlider);sliderObserver.observe(autoBody,{attributes:true,attributeFilter:['class']});modeButtons.forEach(function(b){sliderObserver.observe(b,{attributes:true,attributeFilter:['disabled']});});refreshSlider();
  if(!window.__badmintonIpadV1.isLegacyIpadRuntime()){
   var gapField=element('div','status-edge-gap'),gapLabel=element('label','','姓名間隔'),gapSelect=element('select');gapSelect.id='previewEdgeNameGapSelect';gapLabel.htmlFor=gapSelect.id;gapField.appendChild(gapLabel);
   [0,30,60,90,150].forEach(function(value){var option=element('option','',value+' ms');option.value=String(value);gapSelect.appendChild(option);});
   gapSelect.value=String(window.__badmintonIpadV1.edgeNameGapMs('edge'));gapSelect.onchange=function(){window.__badmintonIpadV1.savePreviewSettings({modernEdgeNameGapMs:Number(gapSelect.value)});};gapField.appendChild(gapSelect);call.querySelector('.edge-settings').insertBefore(gapField,call.querySelector('#edgeTestBtn'));
  }
  showTab('today');window.StatusAdmin={showTab:showTab};
 }
 if(location.search.indexOf('admin-compare=1')>=0){
  var compareCss=document.createElement('link');compareCss.rel='stylesheet';compareCss.href='./admin-compare.css?v=20261012';document.head.appendChild(compareCss);
  var compareJs=document.createElement('script');compareJs.src='./admin-compare.js?v=20261012';document.body.appendChild(compareJs);
 }
})();
