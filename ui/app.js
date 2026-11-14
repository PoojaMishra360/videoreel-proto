const icons={spark:'✦',home:'⌂',video:'▣',calendar:'▦',instagram:'◎',palette:'◈',billing:'◉',settings:'⚙',help:'?',bell:'♧',arrow:'↗',plus:'+',play:'▶',dots:'···',search:'⌕',check:'✓',leaf:'❋',code:'⌘',space:'✦',chart:'↗'};
const icon=(name)=>icons[name]||'•';
const esc=(value='')=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const sampleProjects=[
 {title:'How photosynthesis works',date:'Today · 10:42 AM',status:'Ready',format:'9:16',icon:'🌿',theme:'photosynthesis',duration:'60 sec'},
 {title:'What is JavaScript?',date:'Yesterday · 4:18 PM',status:'Ready',format:'9:16',icon:'✨',theme:'javascript',duration:'60 sec'},
 {title:'A quick guide to the solar system',date:'Nov 08 · 2:30 PM',status:'Ready',format:'1:1',icon:'🪐',theme:'space',duration:'30 sec'},
 {title:'Compound interest, made simple',date:'Nov 06 · 9:15 AM',status:'Ready',format:'16:9',icon:'📈',theme:'compound',duration:'90 sec'}
];
const authRoute=location.pathname.toLowerCase();
const authRequested=new URLSearchParams(location.search).get('auth');
const initialAuthMode=authRoute==='/login'||authRequested==='login'?'login':authRoute==='/signup'||authRequested==='signup'?'signup':authRoute==='/reset'||authRequested==='reset'?'reset':null;
const state={page:initialAuthMode||'home',authMode:initialAuthMode||'login',authenticated:!initialAuthMode,topic:'',duration:'60',format:'9:16',language:'English',level:'Beginner',tone:'Friendly',style:'Flat illustration',voice:'Maya · Warm & clear',captions:'Bold highlight',extra:'',customize:false,projects:[...sampleProjects],current:null,scene:0,tab:'Captions',generating:false,jobId:null,currentStage:'queued',videoUrl:null,generatedScript:null,progress:0,exportFormat:'9:16',exportResolution:'720p',exportCaptions:true,settingsTab:'Profile',query:'',filter:'All videos'};
const stages=['Checking topic','Planning the explainer','Researching sources','Writing the script','Fact-checking claims','Creating voice and captions','Rendering the video'];
const sampleScenes=[
 {title:'It starts with sunlight',type:'Hook',narration:'What if a leaf could turn sunlight into food? That is exactly what photosynthesis does.'},
 {title:'Meet the ingredients',type:'Diagram',narration:'Plants take in carbon dioxide through tiny openings in their leaves and draw water up from their roots.'},
 {title:'The tiny solar panels',type:'Visual',narration:'Inside each leaf, chlorophyll captures light energy. It gives plants their green color, too.'},
 {title:'A little plant chemistry',type:'Motion',narration:'Using that energy, plants transform water and carbon dioxide into sugar and oxygen.'},
 {title:'Why it matters',type:'Example',narration:'The sugar feeds the plant. The oxygen is released into the air we breathe.'},
 {title:'The big picture',type:'Recap',narration:'Sunlight, water and carbon dioxide go in. Food and oxygen come out. That is photosynthesis.'}
];
const app=document.querySelector('#app');
function shell(content){
 const active=state.page;
 const navItems=[['home','Home','home'],['library','My videos','video'],['schedule','Schedule','calendar'],['instagram','Instagram','instagram'],['brand','Brand kit','palette'],['billing','Billing','billing'],['settings','Settings','settings']];
 app.innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="brand"><div class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 6.5 18.5 4l-3 14L4 20l1-13.5Z"/><path d="m9 15 6-7M8 9l2 1m3 2 2 1"/></svg></div><span class="brand-word">VideoReel</span></div><div class="workspace-label">Workspace</div><nav class="nav-list">${navItems.map(([id,label,ico])=>`<button class="nav-button ${active===id?'active':''}" data-page="${id}"><span class="nav-icon">${icon(ico)}</span><span>${label}</span>${id==='library'?'<span class="nav-count">4</span>':''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-help"><div class="help-icon">${icon('help')}</div><strong>Need a hand?</strong><p>Explore quick guides to make your first video.</p><button class="text-link" data-action="help">Visit help center ↗</button></div><div class="user-card"><div class="avatar">AS</div><div class="user-meta"><strong>Alex Smith</strong><small>Free plan</small></div><button class="user-more" aria-label="Account options">···</button></div></div></aside><main class="main-area"><header class="topbar"><div class="breadcrumb"><button class="icon-button mobile-menu" data-action="menu" aria-label="Open menu">☰</button><span>Workspace</span><span style="padding:0 7px;color:#c3c1cd">/</span><strong>${pageTitle(active)}</strong></div><div class="top-actions"><button class="credits-pill" data-page="billing"><span class="credits-star">✦</span> 8 <span style="color:#aaa7b7;font-weight:400">/ 12 credits</span></button><button class="icon-button" data-action="notifications" aria-label="Notifications">♧</button><div class="avatar">AS</div></div></header><section class="page-content">${content}</section></main>${mobileNav(active)}<div id="modal-root"></div></div>`;
}
function pageTitle(page){return ({home:'Home',library:'My videos',schedule:'Schedule',instagram:'Instagram',brand:'Brand kit',billing:'Billing',settings:'Settings',progress:'Creating your video',editor:'Video editor'})[page]||'Home'}
function mobileNav(active){return `<nav class="mobile-nav"><button data-page="home" class="${active==='home'?'active':''}"><span>⌂</span>Home</button><button data-page="library" class="${active==='library'?'active':''}"><span>▣</span>Videos</button><button data-action="new-video" class="${active==='home'?'active':''}"><span>＋</span>Create</button><button data-page="schedule" class="${active==='schedule'?'active':''}"><span>▦</span>Schedule</button><button data-page="settings" class="${active==='settings'?'active':''}"><span>◯</span>Profile</button></nav>`}
function heading(eyebrow,title,description,action=''){return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`}
function renderHome(){
 const cards=state.projects.slice(0,3).map(videoCard).join('');
 shell(`${heading('TUESDAY, NOVEMBER 11','Good morning, Alex ✨','Let’s turn a great idea into something worth watching.')}
 <section class="hero-card"><div class="hero-copy"><div class="hero-kicker"><span class="sparkle">✦</span> YOUR NEXT BIG IDEA STARTS HERE</div><h2>Make something<br>people love to learn.</h2><p>One topic is all it takes. We’ll take care of the research, script, visuals and voice.</p></div><div class="hero-preview" aria-label="Sample educational video"><div class="sun-orb"></div><div class="leaf"></div><div class="leaf two"></div><div class="preview-play">▶</div><div class="preview-caption">A tiny leaf.<br>A big transformation.</div></div></section>
 <section class="composer-card"><div class="composer-head"><strong>What would you like to explain?</strong><span class="subtle-label">✨ AI-powered, fact-checked</span></div><textarea class="topic-box" id="topic-input" maxlength="500" placeholder="Try “How does JavaScript work?” or “Why do we dream?”">${esc(state.topic)}</textarea><div class="composer-bottom"><div class="select-row"><label class="select-chip">🌐 <select id="language-select" aria-label="Language"><option ${state.language==='English'?'selected':''}>English</option><option ${state.language==='Hindi'?'selected':''}>Hindi</option><option>Tamil</option><option>Bengali</option></select></label><span class="divider-dot">·</span><label class="select-chip">◷ <select id="duration-select" aria-label="Duration"><option value="30" ${state.duration==='30'?'selected':''}>30 sec</option><option value="60" ${state.duration==='60'?'selected':''}>60 sec</option><option value="90" ${state.duration==='90'?'selected':''}>90 sec</option></select></label><span class="divider-dot">·</span><label class="select-chip">▣ <select id="format-select" aria-label="Format"><option ${state.format==='9:16'?'selected':''}>9:16</option><option ${state.format==='1:1'?'selected':''}>1:1</option><option ${state.format==='16:9'?'selected':''}>16:9</option></select></label></div><button class="button button-primary" data-action="generate">Generate video <span>↗</span></button></div><div class="customize-row"><button class="customize-toggle" data-action="toggle-customize">${state.customize?'− Hide':'＋ Customize'} <span style="color:#aaa8b6;font-weight:400">(optional)</span></button><span class="cost-note">Estimated cost: <strong>${Math.ceil(Number(state.duration)/10)} credits</strong></span></div><div class="customize-panel ${state.customize?'open':''}"><div class="customize-grid"><div class="field"><label for="level-select">Audience level</label><select id="level-select"><option ${state.level==='Kids'?'selected':''}>Kids</option><option ${state.level==='Beginner'?'selected':''}>Beginner</option><option ${state.level==='Intermediate'?'selected':''}>Intermediate</option><option ${state.level==='Expert'?'selected':''}>Expert</option></select></div><div class="field"><label for="style-select">Visual style</label><select id="style-select"><option>Flat illustration</option><option>Whiteboard</option><option>Dark tech</option><option>Playful</option></select></div><div class="field"><label for="voice-select">Voice</label><select id="voice-select"><option>Maya · Warm & clear</option><option>Arjun · Calm & confident</option><option>Riley · Bright & upbeat</option></select></div><div class="field"><label for="tone-select">Tone</label><select id="tone-select"><option>Friendly</option><option>Professional</option><option>Energetic</option></select></div></div><div class="customize-grid" style="margin-top:12px"><div class="field"><label for="caption-select">Caption style</label><select id="caption-select"><option>Bold highlight</option><option>Clean subtitle</option><option>Typewriter</option><option>Minimal</option></select></div><div class="field"><label>Format</label><select id="format-custom"><option>Vertical · 9:16</option><option>Square · 1:1</option><option>Landscape · 16:9</option></select></div><div class="field"><label>Script approval</label><select><option>Generate in one go</option><option>Review script first</option></select></div><div class="field"><label>Captions</label><select><option>On by default</option><option>Off</option></select></div></div><div class="field must-cover"><label for="extra-context">Extra context or must-cover points <span style="font-weight:400;color:#aaa">(optional · up to 2,000 characters)</span></label><input id="extra-context" maxlength="2000" placeholder="Anything specific you want included?" value="${esc(state.extra)}"></div></div></section>
 <div class="stat-row"><div class="stat-card"><span>Videos created</span><strong>04</strong></div><div class="stat-card"><span>Minutes watched</span><strong>12.5</strong></div><div class="stat-card"><span>Credits left</span><strong>08 <span style="font:500 10px 'DM Sans';color:#999">/ 12</span></strong></div></div>
 <section class="recent-section"><div class="section-title"><h2>Recent videos</h2><a href="#" data-page="library">View all videos ↗</a></div><div class="video-grid">${cards}</div></section>`);
}
function videoCard(project){return `<article class="video-card" data-action="open-project" data-title="${esc(project.title)}"><div class="video-thumb ${project.theme||'javascript'}"><span class="thumb-symbol">${project.icon||'✦'}</span><span class="thumb-caption">${esc(project.title)}</span></div><div class="video-card-body"><div class="video-title-row"><strong class="video-title">${esc(project.title)}</strong><span class="status ${project.status.toLowerCase()}">${project.status}</span></div><div class="video-meta"><span>${esc(project.date)}</span><span class="format-label">${esc(project.format)}</span></div></div></article>`}
function renderLibrary(){
 const projects=state.projects.filter(p=>(state.filter==='All videos'||p.status===state.filter)&&p.title.toLowerCase().includes(state.query.toLowerCase()));
 shell(`${heading('YOUR WORKSPACE','My videos','All your explainers, drafts and finished videos.',`<button class="button button-primary" data-action="new-video">＋ New video</button>`)}<div class="stat-row"><div class="stat-card"><span>Total videos</span><strong>${String(state.projects.length).padStart(2,'0')}</strong></div><div class="stat-card"><span>Ready to export</span><strong>${String(state.projects.filter(p=>p.status==='Ready').length).padStart(2,'0')}</strong></div><div class="stat-card"><span>Storage</span><strong>1.2 <span style="font:500 10px 'DM Sans';color:#999">/ 5 GB</span></strong></div></div><section class="content-card"><div class="filters-row"><div class="search-wrap"><input id="search-projects" value="${esc(state.query)}" placeholder="Search videos by title…"></div><select class="filter-select" id="filter-projects"><option ${state.filter==='All videos'?'selected':''}>All videos</option><option ${state.filter==='Ready'?'selected':''}>Ready</option><option ${state.filter==='Generating'?'selected':''}>Generating</option><option ${state.filter==='Failed'?'selected':''}>Failed</option></select><button class="filter-select" data-action="grid-view">▦ Grid view</button></div>${projects.length?`<div class="table-head"><span>Video</span><span>Status</span><span>Created</span><span>Format</span><span></span></div>${projects.map(p=>`<div class="video-list-row"><div class="list-project"><div class="mini-thumb video-thumb ${p.theme}">${p.icon}</div><div><strong>${esc(p.title)}</strong><small>Educational explainer · ${p.duration||'60 sec'}</small></div></div><span class="status ${p.status.toLowerCase()}">${p.status}</span><span style="color:#88869a">${esc(p.date.split(' · ')[0])}</span><span>${esc(p.format)}</span><div class="row-actions"><button data-action="open-project" data-title="${esc(p.title)}" title="Open">↗</button><button data-action="download" title="Download">↓</button><button data-action="more-project" data-title="${esc(p.title)}" title="More">···</button></div></div>`).join('')}`:`<div class="empty-state"><div class="empty-icon">▣</div><h3>No videos found</h3><p>Try changing your search or filters to find what you’re looking for.</p><button class="button button-primary button-sm" data-action="new-video">Create a video</button></div>`}</section>`);
}
function renderProgress(){
 const topic=esc(state.topic||'Your new explainer');
 const progress=Math.max(0,Math.min(100,Number(state.progress)||0));
 const stageMap={"0 moderation":0,"1 intake":1,"2 research":2,"3 script":3,"4 fact-check":4,"5 narration, captions and timeline":5,"6 Remotion render":6,ready:stages.length};
 const currentIndex=stageMap[state.currentStage]??0;
 const stageMarkup=stages.map((label,index)=>`<div class="stage-item ${index<currentIndex?'done':index===currentIndex?'active':''}"><div class="stage-icon">${index<currentIndex?'✓':index===currentIndex?'<span class="spinner">◌</span>':index+1}</div><div class="stage-text">${label}<small>${index<currentIndex?'Completed':index===currentIndex?'In progress':'Up next'}</small></div></div>`).join('');
 const progressCopy=state.generatedScript?.sentences?.slice(0,2).map(sentence=>sentence.text).join(' ')||'The script will appear here after it has been written and fact-checked.';
 shell(`${heading('LIVE GENERATION',`Making “${topic}”`,'This video is being generated from your topic and selected options.') }<div class="progress-layout"><section class="progress-main"><h2>Creating your video</h2><p>Stages and progress update from the live generation job.</p><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div><div class="progress-labels"><span>${progress}% complete</span><span>${state.currentStage==='6 Remotion render'?'Rendering MP4':'Working…'}</span></div><div class="stage-list">${stageMarkup}</div><div class="script-preview"><div class="script-preview-head"><span>Script</span><span class="live-badge">${state.generatedScript?'FACT-CHECKED':'GENERATING'}</span></div><p>${esc(progressCopy)}</p></div></section><aside class="progress-aside"><div class="aside-visual"><div class="sun-orb"></div><div class="aside-leaf"></div><div class="aside-leaf alt"></div><div class="aside-caption">${topic}</div></div><div class="aside-note"><span>✉</span><div><strong style="color:#4b495f">Generation runs on the server</strong><br>You can leave the page; the job keeps running.</div></div></aside></div>`);
}
function renderEditorMock(){
 const title=state.current?.title||state.topic||'How photosynthesis works';const scene=sampleScenes[state.scene]||sampleScenes[0];
 shell(`<div class="editor-toolbar"><div class="editor-title"><button class="button button-ghost button-sm" data-page="library">← My videos</button><strong>${esc(title)}</strong><span class="saved-label">● Saved</span></div><div class="editor-actions"><button class="button button-secondary button-sm" data-action="share">↗ Share</button><button class="button button-primary button-sm" data-action="export">↓ Export MP4</button></div></div><div class="editor-layout"><section class="editor-panel editor-scenes"><div class="panel-title"><span>Scenes <small>(6)</small></span><button class="button button-ghost button-sm" data-action="add-scene">＋ Add</button></div><div class="scene-list">${sampleScenes.map((s,i)=>`<div class="scene-row ${state.scene===i?'selected':''}" data-action="select-scene" data-index="${i}"><div class="scene-art video-thumb ${['photosynthesis','javascript','space','compound'][i%4]}">${['🌿','💧','☀️','⚗️','🌬️','✨'][i]}</div><div class="scene-row-info"><small>SCENE ${String(i+1).padStart(2,'0')} · 0:${String(i*8).padStart(2,'0')}</small><strong>${esc(s.title)}</strong><span class="scene-type">◈ ${s.type}</span></div></div>`).join('')}</div><button class="button button-secondary button-sm button-full" style="margin-top:12px" data-action="undo">↶ Undo last change</button></section><section class="preview-column"><div class="preview-frame"><div class="phone-screen"><span class="video-overline">VIDEOREEL · LEARN SOMETHING</span><div class="sun-orb"></div><div class="leaf"></div><div class="leaf two"></div><button class="video-play-button" data-action="play-preview">▶</button><div class="video-headline">${esc(scene.title)}</div><div class="video-subline">${esc(scene.narration.slice(0,95))}${scene.narration.length>95?'…':''}</div></div></div><div class="format-tabs"><button class="${state.format==='9:16'?'active':''}" data-format="9:16">▯ 9:16</button><button class="${state.format==='1:1'?'active':''}" data-format="1:1">□ 1:1</button><button class="${state.format==='16:9'?'active':''}" data-format="16:9">▭ 16:9</button></div></section><section class="editor-panel editor-controls"><div class="panel-title"><span>Fine-tune your video</span><small>Changes autosave</small></div><div class="settings-tabs">${['Captions','Voice','Music'].map(t=>`<button data-tab="${t}" class="${state.tab===t?'active':''}">${t}</button>`).join('')}</div>${controlPanel()}${sourcesPanel()}</section><section class="editor-panel" style="grid-column:1/-1"><div class="panel-title"><span>Scene narration</span><small>Changes to narration may use credits when re-rendered</small></div><textarea id="scene-narration" class="topic-box" style="min-height:70px">${esc(scene.narration)}</textarea><div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><span class="cost-note">This scene is about 8 seconds</span><button class="button button-secondary button-sm" data-action="save-narration">Save changes</button></div></section><section class="timeline-panel"><div class="panel-title"><span>Timeline</span><small>00:48 total · 30 fps</small></div><div class="timeline-ruler"><span>00:00</span><span>00:10</span><span>00:20</span><span>00:30</span><span>00:40</span><span>00:48</span></div><div class="timeline-track">${sampleScenes.map((s,i)=>`<div class="timeline-clip" title="${esc(s.title)}" style="flex:${i===state.scene?1.35:1}">${esc(s.title)}</div>`).join('')}</div></section></div>`);
}
function renderEditor(){
 const title=state.current?.title||state.topic||'Your explainer';
 const scene=sampleScenes[state.scene]||sampleScenes[0];
 const sceneView=state.videoUrl
  ?`<div class="preview-frame live-video-frame"><video class="real-video-player" src="${esc(state.videoUrl)}" controls playsinline preload="metadata" aria-label="${esc(title)} video preview"></video></div>`
  :`<div class="preview-frame"><div class="phone-screen"><span class="video-overline">PREVIEW SAMPLE</span><div class="sun-orb"></div><div class="leaf"></div><div class="leaf two"></div><button class="video-play-button" data-action="play-preview" aria-label="Play sample preview">▶</button><div class="video-headline">${esc(scene.title)}</div><div class="video-subline">${esc(scene.narration.slice(0,95))}${scene.narration.length>95?'…':''}</div></div></div>`;
 shell(`<div class="editor-toolbar"><div class="editor-title"><button class="button button-ghost button-sm" data-page="library">← My videos</button><strong>${esc(title)}</strong><span class="saved-label">● ${state.videoUrl?'Generated':'Sample'}</span></div><div class="editor-actions"><button class="button button-secondary button-sm" data-action="share">↗ Share</button><a class="button button-primary button-sm" href="${esc(state.videoUrl||'#')}" ${state.videoUrl?'download':''}>↓ Download MP4</a></div></div><div class="editor-layout"><section class="editor-panel editor-scenes"><div class="panel-title"><span>Scenes <small>(${sampleScenes.length})</small></span></div><div class="scene-list">${sampleScenes.map((item,index)=>`<div class="scene-row ${state.scene===index?'selected':''}" data-action="select-scene" data-index="${index}"><div class="scene-art video-thumb ${['photosynthesis','javascript','space','compound'][index%4]}">${['🌿','💧','☀️','⚗️','🌬️','✨'][index%6]}</div><div class="scene-row-info"><small>SCENE ${String(index+1).padStart(2,'0')}</small><strong>${esc(item.title)}</strong><span class="scene-type">◈ ${esc(item.type)}</span></div></div>`).join('')}</div></section><section class="preview-column">${sceneView}<div class="format-tabs"><button class="${state.format==='9:16'?'active':''}" data-format="9:16">▯ 9:16</button><button class="${state.format==='1:1'?'active':''}" data-format="1:1">□ 1:1</button><button class="${state.format==='16:9'?'active':''}" data-format="16:9">▭ 16:9</button></div></section><section class="editor-panel editor-controls"><div class="panel-title"><span>Video settings</span><small>${state.videoUrl?'Burned into generated video':'Preview controls'}</small></div><div class="settings-tabs">${['Captions','Voice','Music'].map(tab=>`<button data-tab="${tab}" class="${state.tab===tab?'active':''}">${tab}</button>`).join('')}</div>${controlPanel()}${sourcesPanel()}</section><section class="editor-panel" style="grid-column:1/-1"><div class="panel-title"><span>Scene narration</span><small>${state.videoUrl?'Saved in the generated render':'Sample narration'}</small></div><textarea class="topic-box" id="scene-narration" style="min-height:70px" readonly>${esc(scene.narration)}</textarea></section><section class="timeline-panel"><div class="panel-title"><span>Timeline</span><small>${state.videoUrl?'Rendered video':'Preview'}</small></div><div class="timeline-track">${sampleScenes.map((item,index)=>`<div class="timeline-clip" title="${esc(item.title)}">${esc(item.title)}</div>`).join('')}</div></section></div>`);
}
function controlPanel(){if(state.tab==='Captions')return `<div class="control-grid"><div class="field"><label>Caption preset</label><select><option>Bold highlight</option><option>Clean subtitle</option><option>Typewriter</option><option>Minimal</option></select></div><div class="field"><label>Position</label><select><option>Bottom safe area</option><option>Center</option><option>Top</option></select></div><div class="field"><label>Text size</label><select><option>Medium · 32 px</option><option>Small · 24 px</option><option>Large · 40 px</option></select></div></div><div class="settings-row"><div><strong>Captions are burned in</strong><small>Download the SRT file in your run output</small></div><span class="status ready">ON</span></div>`;if(state.tab==='Voice')return `<div class="control-grid"><div class="field"><label>Voice provider</label><input value="${esc(state.generatedScript?.voiceProvider||'Generated voice')}" readonly></div></div><div class="alert-box">The narration audio is included in the generated video.</div>`;return `<div class="alert-box">Background music is not connected yet. The current render contains narration audio only.</div>`}
function renderBilling(){shell(`${heading('YOUR PLAN','Credits & billing','Manage your plan and keep your ideas flowing.') }<div class="content-card" style="margin-bottom:16px"><div class="section-title"><h2>Free plan</h2><span class="status ready">ACTIVE</span></div><p style="font-size:11px;color:#898798;margin:0">Your credits refresh on December 1, 2026.</p><div style="height:9px;background:#f0eef6;border-radius:20px;margin:17px 0 8px;overflow:hidden"><div style="width:33%;height:100%;background:var(--purple);border-radius:20px"></div></div><div style="display:flex;justify-content:space-between;color:#898798;font-size:10px"><span>4 of 12 credits used</span><span>8 credits left</span></div><div class="alert-box">Free videos include a small VideoReel watermark and are stored for 30 days.</div></div><div class="section-title"><h2>Choose a plan that fits your pace</h2><span style="font-size:10px;color:#898798">Monthly billing</span></div><div class="plan-grid"><article class="plan-card"><div class="plan-name">Free</div><div class="plan-price">$0<small> / month</small></div><p>A good place to start creating.</p><div class="plan-features"><span>12 credits per month</span><span>720p exports with watermark</span><span>1 video generating at a time</span></div><button class="button button-secondary button-sm button-full">Current plan</button></article><article class="plan-card featured"><div class="eyebrow">MOST POPULAR</div><div class="plan-name" style="margin-top:6px">Creator</div><div class="plan-price">$19<small> / month</small></div><p>For creators who post consistently.</p><div class="plan-features"><span>90 credits per month</span><span>1080p exports, no watermark</span><span>All voices and visual styles</span></div><button class="button button-primary button-sm button-full" data-action="upgrade">Upgrade to Creator</button></article><article class="plan-card"><div class="plan-name">Pro</div><div class="plan-price">$49<small> / month</small></div><p>More room for your best ideas.</p><div class="plan-features"><span>300 credits per month</span><span>1080p exports, no watermark</span><span>Priority generation queue</span></div><button class="button button-secondary button-sm button-full" data-action="upgrade">Choose Pro</button></article></div>`)}
function renderSettings(){const tabs=['Profile','Defaults','Notifications','Security'];shell(`${heading('YOUR ACCOUNT','Settings','Make VideoReel feel a little more like yours.') }<section class="content-card"><div class="settings-tabs">${tabs.map(t=>`<button class="${state.settingsTab===t?'active':''}" data-settings-tab="${t}">${t}</button>`).join('')}</div>${settingsContents()}</section>`)}
function settingsContents(){if(state.settingsTab==='Profile')return `<div class="settings-form"><h3 class="settings-section-title">Personal profile</h3><p class="settings-description">These details are private to your account.</p><div class="field"><label>Full name</label><input value="Alex Smith"></div><div class="field"><label>Email address</label><input type="email" value="alex@example.com"></div><div class="field"><label>Time zone</label><select><option>Asia/Kolkata (GMT+5:30)</option><option>America/New_York (GMT-5:00)</option><option>Europe/London (GMT+0:00)</option></select></div><button class="button button-primary button-sm" data-action="save-settings">Save changes</button></div>`;if(state.settingsTab==='Defaults')return `<div class="settings-form"><h3 class="settings-section-title">Your creative defaults</h3><p class="settings-description">New videos start with these settings. You can change them at any time.</p><div class="field"><label>Default language</label><select><option>English</option><option>Hindi</option></select></div><div class="field"><label>Default video format</label><select><option>Vertical · 9:16</option><option>Square · 1:1</option><option>Landscape · 16:9</option></select></div><div class="field"><label>Audience level</label><select><option>Beginner</option><option>Intermediate</option><option>Expert</option></select></div><button class="button button-primary button-sm" data-action="save-settings">Save defaults</button></div>`;if(state.settingsTab==='Notifications')return `<div class="settings-form"><h3 class="settings-section-title">Email notifications</h3><p class="settings-description">Choose what you’d like to hear about.</p>${[['Video is ready','We’ll email you when a generation finishes.'],['Generation needs attention','Helpful updates if something goes wrong.'],['Credits are running low','A heads-up before you run out.']].map(([a,b])=>`<div class="settings-row"><div><strong>${a}</strong><small>${b}</small></div><button class="toggle on" data-action="toggle-setting"></button></div>`).join('')}</div>`;return `<div class="settings-form"><h3 class="settings-section-title">Security & privacy</h3><p class="settings-description">Your videos, credits and account settings belong only to you.</p><div class="settings-row"><div><strong>Private workspace</strong><small>Your projects and assets are never shared with other users.</small></div><span class="status ready">ON</span></div><div class="settings-row"><div><strong>Export your data</strong><small>Request a copy of your account data.</small></div><button class="button button-secondary button-sm" data-action="export-data">Request export</button></div><div class="settings-row"><div><strong>Delete account</strong><small>Permanently remove your projects and personal data.</small></div><button class="button button-danger button-sm" data-action="delete-account">Delete account</button></div></div>`}
function renderSchedule(){shell(`${heading('PUBLISHING','Your schedule','Plan what goes live next. Instagram posting is coming soon.') }<div class="content-card"><div class="empty-state"><div class="empty-icon">▦</div><h3>Your content calendar is ready when you are</h3><p>Connect your Instagram account to plan upcoming posts. Your account stays private, and nothing is published without your approval.</p><button class="button button-primary button-sm" data-page="instagram">Connect Instagram</button></div></div>`)}
function renderInstagram(){shell(`${heading('CONNECTED ACCOUNTS','Instagram','Connect your own account to prepare for publishing.') }<div class="progress-layout"><section class="content-card"><div class="panel-title"><span>Connect your Instagram</span><span class="status generating">NOT CONNECTED</span></div><p style="font-size:11px;line-height:1.7;color:#88869a">Connect an Instagram Business or Creator account linked to a Facebook Page. Your account is private to you. VideoReel will never post without your approval.</p><div class="alert-box">Instagram publishing is planned for a future release. This UI is a preview; no account authorization occurs yet.</div><button class="button button-primary button-sm" data-action="connect-instagram">◎ Connect Instagram</button></section><section class="content-card"><h3 class="settings-section-title">Before you connect</h3><div class="stage-list"><div class="stage-item done"><div class="stage-icon">1</div><div class="stage-text">Use a Business or Creator account<small>Personal accounts need to switch account type.</small></div></div><div class="stage-item done"><div class="stage-icon">2</div><div class="stage-text">Link a Facebook Page<small>Your Instagram profile must be linked to a Page.</small></div></div><div class="stage-item"><div class="stage-icon">3</div><div class="stage-text">Approve secure access<small>You can disconnect at any time.</small></div></div></div></section></div>`)}
function renderBrand(){shell(`${heading('YOUR VISUAL IDENTITY','Brand kit','Keep your videos feeling like you.') }<section class="content-card"><div class="empty-state"><div class="empty-icon">◈</div><h3>Make every video unmistakably yours</h3><p>Save your logo, colors and preferred fonts. Brand kits are coming in a future release.</p><button class="button button-secondary button-sm" data-action="brand-preview">Preview brand kit</button></div></section>`)}
function renderAuth(){
 const mode=state.authMode||'login';
 const reset=mode==='reset';
 const signup=mode==='signup';
 app.innerHTML=`<main class="auth-shell"><section class="auth-story"><button class="brand auth-brand" data-auth-action="home"><span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 6.5 18.5 4l-3 14L4 20l1-13.5Z"/><path d="m9 15 6-7M8 9l2 1m3 2 2 1"/></svg></span><span class="brand-word">VideoReel</span></button><div class="auth-story-content"><span class="auth-kicker"><span>✦</span> YOUR IDEAS, READY FOR THE SPOTLIGHT</span><h1>Turn what you know into something everyone can watch.</h1><p>Research-backed scripts, thoughtful visuals, voice-over and captions—made from one simple idea.</p><div class="auth-art"><div class="auth-art-orb"></div><div class="auth-art-leaf leaf-a"></div><div class="auth-art-leaf leaf-b"></div><div class="auth-art-card"><span>YOUR NEXT EXPLAINER</span><strong>Small ideas.<br>Big “aha” moments.</strong><i>▶</i></div></div><div class="auth-benefits"><span>✓ 12 free credits to start</span><span>✓ No card needed</span><span>✓ Your workspace stays private</span></div></div><div class="auth-story-footer">Made for people who love to teach. <span>✦</span></div></section><section class="auth-panel"><div class="auth-form-wrap"><div class="auth-mobile-brand"><span class="brand-mark">✦</span><strong>VideoReel</strong></div><div class="auth-form-heading"><span class="eyebrow">${reset?'ACCOUNT RECOVERY':signup?'WELCOME TO VIDEOREEL':'YOUR CREATOR WORKSPACE'}</span><h2>${reset?'Reset your password':signup?'Create your account':'Welcome back'}</h2><p>${reset?'We’ll send a reset link to your email address.':signup?'Start making educational videos in minutes.':'Sign in to pick up where your next great idea begins.'}</p></div>${reset?'':`<button class="google-button" type="button" data-auth-action="google"><span class="google-g">G</span>${signup?'Continue with Google':'Continue with Google'}</button><div class="auth-divider"><span>or continue with email</span></div>`}<form id="auth-form" class="auth-form">${signup?`<label class="auth-label" for="auth-name">Your name</label><input id="auth-name" name="name" autocomplete="name" placeholder="Alex Smith" required>`:''}<label class="auth-label" for="auth-email">Email address</label><input id="auth-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required>${reset?'':`<div class="auth-password-heading"><label class="auth-label" for="auth-password">Password</label>${signup?'':`<button class="auth-text-button" type="button" data-auth-action="reset">Forgot password?</button>`}</div><div class="password-wrap"><input id="auth-password" name="password" type="password" autocomplete="${signup?'new-password':'current-password'}" placeholder="${signup?'At least 8 characters':'Enter your password'}" minlength="8" required><button class="password-toggle" type="button" data-auth-action="show-password" aria-label="Show password">Show</button></div>${signup?'<label class="auth-consent"><input type="checkbox" required><span>I agree to the <a href="#terms" data-auth-action="terms">Terms</a> and <a href="#privacy" data-auth-action="privacy">Privacy Policy</a>.</span></label>':''}`}<button class="button button-primary auth-submit" type="submit">${reset?'Send reset link':signup?'Create account':'Sign in'} <span>↗</span></button></form><div class="auth-switch">${reset?`Remembered it? <button data-auth-action="login">Back to sign in</button>`:signup?`Already have an account? <button data-auth-action="login">Sign in</button>`:`New to VideoReel? <button data-auth-action="signup">Create a free account</button>`}</div><div class="auth-prototype-note"><span>ⓘ</span> UI preview only. Authentication and email delivery are not connected yet.</div></div><div class="auth-panel-footer">By continuing, you agree to our <a href="#terms" data-auth-action="terms">Terms</a> and <a href="#privacy" data-auth-action="privacy">Privacy Policy</a>.</div></section></main>`;
}
function render(){switch(state.page){case'login':case'signup':case'reset':renderAuth();break;case'home':renderHome();break;case'library':renderLibrary();break;case'progress':renderProgress();break;case'editor':renderEditor();break;case'billing':renderBilling();break;case'settings':renderSettings();break;case'schedule':renderSchedule();break;case'instagram':renderInstagram();break;case'brand':renderBrand();break;default:state.page='home';renderHome();}}
function toast(message){const region=document.querySelector('#toast-region');const el=document.createElement('div');el.className='toast';el.textContent=message;region.append(el);setTimeout(()=>el.remove(),3200)}
function showModal(markup){document.querySelector('#modal-root').innerHTML=`<div class="modal-backdrop" data-action="backdrop-close"><div class="modal ${markup.includes('wide')?'wide':''}" role="dialog" aria-modal="true">${markup}</div></div>`}
function closeModal(){const modalRoot=document.querySelector('#modal-root');if(modalRoot)modalRoot.innerHTML=''}
async function generate(){
 const topic=document.querySelector('#topic-input')?.value.trim()||state.topic.trim();
 if(topic.length<3){toast('Add a topic with at least 3 characters to get started.');document.querySelector('#topic-input')?.focus();return}
 if(topic.length>500){toast('Keep your topic under 500 characters.');return}
 state.topic=topic;
 state.language=document.querySelector('#language-select')?.value||state.language;
 state.duration=Number(document.querySelector('#duration-select')?.value||state.duration);
 state.format=document.querySelector('#format-select')?.value||state.format;
 state.level=(document.querySelector('#level-select')?.value||state.level).toLowerCase();
 state.style=document.querySelector('#style-select')?.value||state.style;
 state.voice=document.querySelector('#voice-select')?.value||state.voice;
 state.tone=document.querySelector('#tone-select')?.value||state.tone;
 state.captions=document.querySelector('#caption-select')?.value||state.captions;
 state.extra=document.querySelector('#extra-context')?.value||'';
 state.videoUrl=null;
 state.generatedScript=null;
 state.progress=1;
 state.currentStage='starting';
 state.page='progress';
 state.generating=true;
 render();
 try{
  const response=await fetch('/api/generations',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({topic,duration:state.duration,level:state.level,format:state.format})});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error?.message||'Could not start video generation.');
  state.jobId=result.jobId;
  state.current={title:topic,status:'Generating',date:'Just now',format:state.format,icon:'✦',duration:`${state.duration} sec`};
  state.projects.unshift(state.current);
  const credits=document.querySelector('.credits-pill');
  if(credits&&Number.isFinite(result.creditsBalance))credits.innerHTML=`<span class="credits-star">✦</span> ${result.creditsBalance} <span class="credits-muted">credits</span>`;
  await pollGeneration(result.jobId);
 }catch(error){
  state.generating=false;
  state.current=null;
  state.page='home';
  render();
  toast(error instanceof Error?error.message:'Video generation failed.');
 }
}
async function pollGeneration(jobId){
 while(state.generating&&state.jobId===jobId){
  const response=await fetch(`/api/generations/${encodeURIComponent(jobId)}`,{credentials:'same-origin',cache:'no-store'});
  const job=await response.json();
  if(!response.ok)throw new Error(job.error?.message||'Could not check generation progress.');
  state.currentStage=job.stage;
  state.progress=job.progress||0;
  if(job.status==='failed'){
   state.generating=false;
   if(state.current)state.current.status='Failed';
   if(state.page==='progress')state.page='home';
   render();
   toast('Video generation failed. Reserved credits were released.');
   return;
  }
  if(job.status==='succeeded'){
   state.generating=false;
   state.videoUrl=job.videoUrl;
   state.generatedScript=job.script;
   if(job.script)useGeneratedScript(job.script);
    if(state.current){state.current.title=job.script?.title||job.topic;state.current.status='Ready';state.current.videoUrl=job.videoUrl;state.current.script=job.script;}
   if(state.page==='progress')state.page='editor';
   state.scene=0;
   render();
   toast('Your video is ready to play.');
   return;
  }
  if(state.page==='progress')render();
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
}
function exportDialog(){showModal(`<div class="modal-head"><div><h2>Export your video</h2><p>Choose your download settings.</p></div><button class="modal-close" data-action="close-modal">×</button></div><div class="export-options"><div class="option-group"><label>Video format</label><div class="option-cards">${['9:16','1:1','16:9'].map(f=>`<button class="option-card ${state.exportFormat===f?'active':''}" data-export-format="${f}">${f==='9:16'?'▯':f==='1:1'?'□':'▭'}<br>${f}</button>`).join('')}</div></div><div class="option-group"><label>Resolution</label><div class="option-cards">${['720p','1080p'].map(f=>`<button class="option-card ${state.exportResolution===f?'active':''}" data-export-resolution="${f}">${f}${f==='720p'?' · Free':' · Creator'}</button>`).join('')}</div></div><div class="export-check"><span>Burn captions into video</span><button class="toggle ${state.exportCaptions?'on':''}" data-action="toggle-export-captions"></button></div><div class="alert-box">Free exports include a small VideoReel watermark. Upgrade to Creator to export watermark-free at 1080p.</div><button class="button button-primary button-full" data-action="confirm-export">↓ Prepare MP4</button><button class="button button-ghost button-full" data-action="download-srt">Download captions (.SRT)</button></div>`)}
function handleAction(action,target){switch(action){case'toggle-customize':state.customize=!state.customize;render();break;case'generate':generate();break;case'new-video':state.page='home';render();document.querySelector('#topic-input')?.focus();break;case'cancel-generation':clearInterval(state.generatingTimer);state.generating=false;state.page='home';render();toast('Generation cancelled. No credits were used.');break;case'open-project':state.topic=target.dataset.title;useTopicScenes(target.dataset.title);state.current=state.projects.find(p=>p.title===state.topic)||{title:state.topic};state.page='editor';state.scene=0;render();break;case'toggle-caption':target.classList.toggle('on');toast('Caption preference updated.');break;case'toggle-music':case'toggle-setting':target.classList.toggle('on');break;case'export':exportDialog();break;case'close-modal':closeModal();break;case'toggle-export-captions':state.exportCaptions=!state.exportCaptions;exportDialog();break;case'confirm-export':closeModal();toast('Your MP4 is being prepared. This is a UI preview—no file is rendered yet.');break;case'download-srt':closeModal();toast('Caption download will be available when video rendering is connected.');break;case'upgrade':toast('Billing checkout will be connected in the next phase.');break;case'save-settings':toast('Settings saved in this preview.');break;case'connect-instagram':toast('Instagram connection will be enabled in a future release.');break;case'preview-voice':toast('Voice sample preview is not connected yet.');break;case'play-preview':toast('Video playback will be enabled with the Remotion preview.');break;case'share':toast('Share links will be available after account and storage setup.');break;case'undo':toast('Nothing to undo yet.');break;case'add-scene':toast('Scene tools are coming in the editor phase.');break;case'export-data':toast('Your data export request has been noted in this preview.');break;case'delete-account':showModal(`<div class="modal-head"><div><h2>Delete your account?</h2><p>This action can’t be undone.</p></div><button class="modal-close" data-action="close-modal">×</button></div><p style="font-size:11px;line-height:1.6;color:#77758b">Account deletion and data removal will be available once account services are connected.</p><button class="button button-secondary button-full" data-action="close-modal">Got it</button>`);break;case'notifications':toast('You’re all caught up.');break;case'help':toast('Help center is coming soon.');break;case'brand-preview':toast('Brand kit editing is planned for a future release.');break;case'grid-view':toast('Grid view is coming soon.');break;case'more-project':showModal(`<div class="modal-head"><div><h2>${esc(target.dataset.title)}</h2><p>Video options</p></div><button class="modal-close" data-action="close-modal">×</button></div><div style="display:grid;gap:8px"><button class="button button-secondary button-full" data-action="open-project" data-title="${esc(target.dataset.title)}">Open in editor ↗</button><button class="button button-secondary button-full" data-action="duplicate-project" data-title="${esc(target.dataset.title)}">Duplicate video</button><button class="button button-secondary button-full" data-action="download">Download MP4 ↓</button><button class="button button-danger button-full" data-action="delete-video" data-title="${esc(target.dataset.title)}">Delete video</button></div>`);break;case'delete-video':showModal(`<div class="modal-head"><div><h2>Delete this video?</h2><p>${esc(target.dataset.title)}</p></div><button class="modal-close" data-action="close-modal">×</button></div><p style="font-size:11px;color:#77758b">This preview only removes the item from the sample library.</p><button class="button button-danger button-full" data-action="confirm-delete" data-title="${esc(target.dataset.title)}">Delete video</button>`);break;case'confirm-delete':state.projects=state.projects.filter(p=>p.title!==target.dataset.title);closeModal();renderLibrary();toast('Video removed from your library.');break;case'download':toast('Download will be available after video rendering is connected.');break;case'save-narration':{const val=document.querySelector('#scene-narration').value;sampleScenes[state.scene].narration=val;render();toast('Narration saved in this preview.');break}}
}
app.addEventListener('click',event=>{const target=event.target.closest('button,[data-action],[data-page],[data-tab],[data-settings-tab],[data-format],[data-index],[data-export-format],[data-export-resolution]');if(!target)return;if(target.dataset.action==='backdrop-close'&&event.target===target){closeModal();return}if(target.dataset.action){handleAction(target.dataset.action,target);return}if(target.dataset.page){state.page=target.dataset.page;render();return}if(target.dataset.tab){state.tab=target.dataset.tab;render();return}if(target.dataset.settingsTab){state.settingsTab=target.dataset.settingsTab;render();return}if(target.dataset.index!==undefined){state.scene=Number(target.dataset.index);render();return}if(target.dataset.format){state.format=target.dataset.format;render();return}if(target.dataset.exportFormat){state.exportFormat=target.dataset.exportFormat;exportDialog();return}if(target.dataset.exportResolution){state.exportResolution=target.dataset.exportResolution;exportDialog();return}});
app.addEventListener('input',event=>{if(event.target.id==='topic-input')state.topic=event.target.value;if(event.target.id==='search-projects'){state.query=event.target.value;const cursor=event.target.selectionStart;renderLibrary();const input=document.querySelector('#search-projects');input.focus();input.setSelectionRange(cursor,cursor)}});
app.addEventListener('change',event=>{if(event.target.id==='filter-projects'){state.filter=event.target.value;renderLibrary()}if(event.target.id==='duration-select'){state.duration=event.target.value;renderHome()}if(event.target.id==='language-select')state.language=event.target.value;if(event.target.id==='format-select')state.format=event.target.value;if(event.target.id==='extra-context')state.extra=event.target.value});
render();
function useTopicScenes(topic){
 const existingProject=state.projects.find(project=>project.title===topic&&project.script);
 if(existingProject){state.generatedScript=existingProject.script;state.videoUrl=existingProject.videoUrl||null;useGeneratedScript(existingProject.script);return;}
 const normalized=topic.toLowerCase();
 const isNodeJs=/\bnode\s*\.?\s*js\b/.test(normalized);
 const isJavaScript=/\bjavascript\b|\bjava\s+script\b/.test(normalized)||(!isNodeJs&&/\bjs\b/.test(normalized));
 let scenes;
 if(isNodeJs){
  scenes=[
   {title:'Node.js leaves the browser',type:'Hook',narration:'Node.js lets developers run JavaScript outside a web browser.'},
   {title:'Built on the V8 engine',type:'Diagram',narration:'It uses Chrome’s V8 engine to execute JavaScript on a computer or server.'},
   {title:'JavaScript gets system access',type:'Motion',narration:'Node.js adds APIs that let JavaScript work with files, networks and operating system services.'},
   {title:'An event-driven runtime',type:'Diagram',narration:'Its event loop helps handle input and network tasks while waiting for them to finish.'},
   {title:'Build servers and tools',type:'Example',narration:'Developers use Node.js for web servers, command-line programs and background services.'},
   {title:'Language and runtime',type:'Recap',narration:'JavaScript is the language. Node.js is one runtime that executes it outside the browser.'}
  ];
 }else if(isJavaScript){
  scenes=[
   {title:'Meet JavaScript',type:'Hook',narration:'JavaScript is a programming language that helps make websites interactive.'},
   {title:'A language for the web',type:'Diagram',narration:'A browser can read JavaScript and use it to respond when someone clicks, types or scrolls.'},
   {title:'Give the browser a task',type:'Motion',narration:'A script is a set of instructions. JavaScript tells the page what action to take.'},
   {title:'Make a button respond',type:'Example',narration:'For example, a button can run a small JavaScript function when you click it.'},
   {title:'More than buttons',type:'Visual',narration:'JavaScript can also update page content, check a form or load new information.'},
   {title:'The big picture',type:'Recap',narration:'JavaScript adds behavior to web pages, turning a static page into an interactive experience.'}
  ];
 }else if(normalized.includes('photosynthesis')){
  scenes=[
   {title:'It starts with sunlight',type:'Hook',narration:'What if a leaf could turn sunlight into food? That is exactly what photosynthesis does.'},
   {title:'Meet the ingredients',type:'Diagram',narration:'Plants take in carbon dioxide through tiny openings in their leaves and draw water up from their roots.'},
   {title:'The tiny solar panels',type:'Visual',narration:'Inside each leaf, chlorophyll captures light energy. It gives plants their green color, too.'},
   {title:'A little plant chemistry',type:'Motion',narration:'Using that energy, plants transform water and carbon dioxide into sugar and oxygen.'},
   {title:'Why it matters',type:'Example',narration:'The sugar feeds the plant. The oxygen is released into the air we breathe.'},
   {title:'The big picture',type:'Recap',narration:'Sunlight, water and carbon dioxide go in. Food and oxygen come out. That is photosynthesis.'}
  ];
 }else{
  scenes=[
   {title:'Start with the big idea',type:'Hook',narration:`Let’s make ${topic} easier to understand, one clear idea at a time.`},
   {title:'The key pieces',type:'Diagram',narration:'First, identify the main parts and how they fit together.'},
   {title:'How it connects',type:'Motion',narration:'Once the pieces are clear, look at the process that links them.'},
   {title:'A simple example',type:'Example',narration:'A familiar example can make an abstract idea feel concrete.'},
   {title:'Why it matters',type:'Visual',narration:'Understanding the basics helps you see where this idea shows up in everyday life.'},
   {title:'The big picture',type:'Recap',narration:`That’s the core idea behind ${topic}.`}
  ];
 }
 sampleScenes.splice(0,sampleScenes.length,...scenes);
}
function useGeneratedScript(script){
 if(!Array.isArray(script?.sentences)||!script.sentences.length)return;
 const scenes=script.sentences.map((sentence,index)=>({
  title:sentence.text.trim().split(/\s+/).slice(0,6).join(' ').replace(/[.!?]+$/,''),
  type:sentence.role==='hook'?'Hook':sentence.role==='example'?'Example':sentence.role==='recap'?'Recap':sentence.role==='cta'?'CTA':'Point',
  narration:sentence.text,
 }));
 sampleScenes.splice(0,sampleScenes.length,...scenes);
}
function sourcesPanel(){
 const topic=(state.current?.title||state.topic||'').toLowerCase();
 const generatedSources=state.generatedScript?.sources||[];
 const previewSources=topic.includes('javascript')? [
  ['JavaScript Guide — MDN','https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide'],
  ['JavaScript — MDN Web Docs','https://developer.mozilla.org/en-US/docs/Web/JavaScript']
 ]:topic.includes('photosynthesis')? [
  ['Photosynthesis — Britannica','https://www.britannica.com/science/photosynthesis'],
  ['Photosynthesis — Khan Academy','https://www.khanacademy.org/science/biology/photosynthesis-in-plants']
 ]:[];
 const sources=generatedSources.length?generatedSources.map(source=>[source.title,source.url]):previewSources;
 return `<div class="source-list"><div class="panel-title"><span>Research sources</span><small>${generatedSources.length?`${generatedSources.length} researched`:'Sample sources'}</small></div>${sources.length?sources.map(([title,url],i)=>`<a class="source-item" href="${url}" target="_blank" rel="noreferrer"><span class="source-number">${i+1}</span><span>${title}</span><span class="source-arrow">↗</span></a>`).join(''):'<p class="source-placeholder">Source links are returned with live generations.</p>'}</div>`;
}

app.addEventListener('click',event=>{
 const trigger=event.target.closest('[data-action="menu"]');
 if(!trigger)return;
 const items=[['home','Home'],['library','My videos'],['schedule','Schedule'],['instagram','Instagram'],['brand','Brand kit'],['billing','Billing'],['settings','Settings']];
 showModal(`<div class="modal-head"><div><h2>Workspace</h2><p>Choose where to go.</p></div><button class="modal-close" data-action="close-modal">×</button></div><div style="display:grid;gap:7px">${items.map(([page,label])=>`<button class="button button-secondary button-full" data-page="${page}">${label}</button>`).join('')}</div>`);
});

app.addEventListener('click',event=>{
 const target=event.target.closest('.user-more,.top-actions .avatar,[data-action="account-menu"],[data-auth-action]');
 if(!target)return;
 if(target.dataset.action==='account-menu'||target.classList.contains('user-more')||target.classList.contains('avatar')){
  showModal(`<div class="modal-head"><div><h2>Alex Smith</h2><p>Free plan · Demo account</p></div><button class="modal-close" data-action="close-modal">×</button></div><div style="display:grid;gap:8px"><button class="button button-secondary button-full" data-page="settings">Account settings</button><button class="button button-danger button-full" data-auth-action="signout">Sign out of preview</button></div>`);
  return;
 }
 const action=target.dataset.authAction;
 if(action==='home'){state.authenticated=true;state.page='home';render();return;}
 if(action==='login'||action==='signup'||action==='reset'){
  closeModal();state.authMode=action;state.page=action;render();return;
 }
 if(action==='signout'){
  closeModal();state.authenticated=false;state.authMode='login';state.page='login';render();return;
 }
 if(action==='show-password'){
  const field=document.querySelector('#auth-password');
  if(field){field.type=field.type==='password'?'text':'password';target.textContent=field.type==='password'?'Show':'Hide';}
  return;
 }
 if(action==='google'){toast('Google sign-in will be enabled when authentication is connected.');return;}
 if(action==='terms'||action==='privacy'){event.preventDefault();toast(`${action==='terms'?'Terms of Service':'Privacy Policy'} will be available before launch.`);}
});

app.addEventListener('submit',event=>{
 if(event.target.id!=='auth-form')return;
 event.preventDefault();
 const email=new FormData(event.target).get('email');
 if(state.authMode==='reset'){
  toast(`If ${email} is registered, a password reset link would be sent.`);
  return;
 }
 toast('Demo only: authentication is not connected yet. No account was created and no password was sent.');
});

async function playLatestRenderedVideo(button){
 const frame=button.closest('.preview-column')?.querySelector('.preview-frame');
 if(!frame)return;
 button.disabled=true;
 try{
  const response=await fetch('/api/videos/latest',{cache:'no-store'});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error?.message||'No rendered video was found.');
  const url=new URL(result.url,window.location.origin);
  if(url.origin!==window.location.origin||!url.pathname.startsWith('/media/runs/'))throw new Error('The video URL is not allowed.');
  const video=document.createElement('video');
  video.className='preview-video';
  video.controls=true;
  video.autoplay=true;
  video.playsInline=true;
  video.preload='metadata';
  video.src=url.href;
  video.setAttribute('aria-label',`Video preview: ${result.title}`);
  video.addEventListener('error',()=>toast('The video could not be decoded by this browser. Download the MP4 to play it.'));
  frame.replaceChildren(video);
  const title=document.querySelector('.editor-title > strong');
  if(title)title.textContent=result.title;
  state.current={...(state.current||{}),title:result.title,status:'Ready',format:state.format};
  state.playbackUrl=url.href;
  try{await video.play()}catch{toast('Video is loaded. Press play in the controls to start playback.')}
 }catch(error){
  toast(error instanceof Error?error.message:'Could not load the latest rendered video.');
 }finally{
  if(button.isConnected)button.disabled=false;
 }
}

document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action="play-preview"]');
 if(!button)return;
 event.preventDefault();
 event.stopImmediatePropagation();
 void playLatestRenderedVideo(button);
},true);
