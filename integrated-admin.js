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
