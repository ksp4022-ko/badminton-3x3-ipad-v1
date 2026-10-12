(function(){
 'use strict';
 var api=window.__badmintonIpadV1,base=window.PreviewAdminLayout;
 if(!api||!api.setupTestMode||!base)return;
 function el(tag,cls,text){var node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node;}
 var tools=document.getElementById('adminTools'),panel=document.getElementById('floatPanel');
 var mode=api.getState().settings.previewCompareStyle==='b'?'b':'a',route='today',settingRoute='courts';
 var top=base.home.querySelector('.preview-top-grid'),voice=base.home.querySelector('#previewVoiceGrid');
 var panes={players:base.detail.querySelector('[data-preview-category="players"]'),courts:base.detail.querySelector('[data-preview-category="courts"]'),settings:base.detail.querySelector('[data-preview-category="settings"]')};
 base.home.hidden=true;base.detail.hidden=true;
 var root=el('div','compare-root');root.id='compareAdmin';
 var chooser=el('div','compare-chooser');chooser.setAttribute('role','group');chooser.setAttribute('aria-label','控制台風格');
 var styles=[];[['a','A 分頁工具台'],['b','B 現場操作台']].forEach(function(item){var b=el('button','',item[1]);b.type='button';b.id='compareStyle'+item[0];b.onclick=function(){mode=item[0];route='today';api.savePreviewSettings({previewCompareStyle:mode});render();};chooser.appendChild(b);styles.push(b);});root.appendChild(chooser);
 var tabs=el('nav','compare-tabs');tabs.setAttribute('aria-label','控制台分類');var tabButtons=[];
 [['today','聚會'],['players','球員'],['voice','語音'],['settings','設定']].forEach(function(item){var b=el('button','',item[1]);b.type='button';b.id='compareTab'+item[0];b.onclick=function(){route=item[0];render();};tabs.appendChild(b);tabButtons.push({button:b,key:item[0]});});root.appendChild(tabs);
 var detailHead=el('div','compare-detail-head'),back=el('button','','‹ 返回工具台'),title=el('h2','');back.type='button';back.id='compareBack';back.onclick=function(){route='today';render();};detailHead.appendChild(back);detailHead.appendChild(title);root.appendChild(detailHead);
 var settingsNav=el('nav','compare-setting-tabs');settingsNav.setAttribute('aria-label','設定分類');var settingButtons=[];
 [['courts','場地與排場'],['settings','系統設定']].forEach(function(item){var b=el('button','',item[1]);b.type='button';b.id='compareSetting'+item[0];b.onclick=function(){settingRoute=item[0];render();};settingsNav.appendChild(b);settingButtons.push({button:b,key:item[0]});});root.appendChild(settingsNav);
 var content=el('div','compare-content');root.appendChild(content);content.appendChild(top);content.appendChild(voice);Object.keys(panes).forEach(function(key){content.appendChild(panes[key]);});
 var categories=el('nav','compare-b-categories');categories.setAttribute('aria-label','現場工具分類');
 [['players','球員與場次'],['voice','語音與音源'],['courts','場地設定'],['settings','系統設定']].forEach(function(item){var b=el('button','',item[1]);b.type='button';b.id='compareOpen'+item[0];b.appendChild(el('span','compare-chevron','›'));b.onclick=function(){route=item[0];render();};categories.appendChild(b);});content.appendChild(categories);
 tools.insertBefore(root,tools.firstChild);
 document.getElementById('previewGatheringBtn').onclick=function(){location.href='./setup-test.html?integrated=1&admin-compare=1';};
 function render(){
  panel.classList.toggle('compare-style-a',mode==='a');panel.classList.toggle('compare-style-b',mode==='b');
  styles.forEach(function(b,i){b.setAttribute('aria-pressed',String((i===0?'a':'b')===mode));});
  tabs.hidden=mode!=='a';detailHead.hidden=mode!=='b'||route==='today';settingsNav.hidden=!(mode==='a'&&route==='settings');
  tabButtons.forEach(function(item){item.button.setAttribute('aria-current',route===item.key?'page':'false');});
  settingButtons.forEach(function(item){item.button.setAttribute('aria-pressed',String(settingRoute===item.key));});
  top.hidden=route!=='today';voice.hidden=route!=='voice';categories.hidden=mode!=='b'||route!=='today';
  Object.keys(panes).forEach(function(key){panes[key].hidden=true;});
  if(mode==='a'&&route==='settings')panes[settingRoute].hidden=false;
  else if(panes[route])panes[route].hidden=false;
  title.textContent={players:'球員與場次',voice:'語音與音源',courts:'場地設定',settings:'系統設定'}[route]||'';
  document.querySelector('#floatPanel .panel-body').scrollTop=0;
 }
 render();api.openPanel();
 window.CompareAdmin={render:render};
})();
