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
 session.appendChild(document.getElementById('previewGatheringBtn'));session.appendChild(document.getElementById('updateTodayRosterBtn'));
 var today=card('adminTodayBody');quick.appendChild(today);top.appendChild(session);top.appendChild(quick);home.appendChild(top);
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
 document.getElementById('floatPanel').classList.add('preview-admin-v3');
 window.PreviewAdminLayout={home:home,detail:detail};
})();
