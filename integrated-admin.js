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
   var cell=element('div','status-metric'),icon=element('img');icon.src='./vendor/lucide/'+item[2]+'.svg';icon.alt='';icon.width=24;icon.height=24;
   cell.appendChild(icon);cell.appendChild(element('span','status-metric-label',item[1]));var value=element('strong','');value.id='statusMetric'+item[0];cell.appendChild(value);metricValues[item[0]]=value;metrics.appendChild(cell);
  });session.insertBefore(metrics,session.querySelector('#updateTodayRosterBtn'));
  var update=session.querySelector('#updateTodayRosterBtn');update.textContent='更新今日名單 ›';
  var modes=element('div','status-session-settings'),modeField=element('label','','排場模式'),modeSelect=element('select');modeSelect.id='statusArrangeMode';
  [['free','自由暢打'],['auto','自動排場']].forEach(function(item){var option=element('option','',item[1]);option.value=item[0];modeSelect.appendChild(option);});
  modeSelect.onchange=function(){today.querySelector(modeSelect.value==='auto'?'#autoModeBtn':'#freeModeBtn').click();};modeField.appendChild(modeSelect);modes.appendChild(modeField);
  var voiceField=element('div','status-mode-field');voiceField.appendChild(element('span','','自動呼叫'));var voiceLink=element('button','');voiceLink.type='button';voiceLink.id='statusVoiceMode';voiceLink.onclick=function(){showTab('voice');};voiceField.appendChild(voiceLink);modes.appendChild(voiceField);quick.insertBefore(modes,today);
  today.querySelector('.today-mode-control').hidden=true;
  function textIfChanged(node,text){if(node.textContent!==text)node.textContent=text;}
  function refreshSession(){
   var state=window.__badmintonIpadV1.getState(),count=state.players.filter(function(p){return p.isActive!==false;}).length;
   textIfChanged(metricValues.roster,count?'已載入 · '+count+' 人':'尚無名單');
   var source=assets.querySelector('#localVoiceSummary').textContent;
   textIfChanged(metricValues.voice,/Missing/.test(source)?'缺少音源':/Ready/.test(source)?'Ready':'檢查中');
   textIfChanged(metricValues.courts,'已設定 · '+state.settings.courtCount+' 場');
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
  showTab('today');window.StatusAdmin={showTab:showTab};
 }
 if(location.search.indexOf('admin-compare=1')>=0){
  var compareCss=document.createElement('link');compareCss.rel='stylesheet';compareCss.href='./admin-compare.css?v=20261012';document.head.appendChild(compareCss);
  var compareJs=document.createElement('script');compareJs.src='./admin-compare.js?v=20261012';document.body.appendChild(compareJs);
 }
})();
