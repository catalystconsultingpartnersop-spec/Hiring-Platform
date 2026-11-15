const { chromium } = require('playwright');
const S='/tmp/claude-0/-home-claude/622a8e37-8676-541a-a547-c446bbd1cde0/scratchpad';
const W='--h1:78px;--m1:56px;--h2:84px;--m2:24px;--fsz:58px;', WS='--h:1920px;--top:330px;--band:400px;--h1:78px;--m1:66px;--h2:84px;--m2:26px;--fsz:58px;';
const jobs=[
 ['vars.html','owner-handpicked',1350,'',1],['vars.html','owner-handpicked-status',1920,'--H:1920px;--top:350px;--band:400px',1],
 ['vars.html','owner-four-reasons',1350,'',4],['vars.html','owner-four-reasons-status',1920,'--H:1920px;--top:300px;--band:400px;--rp:44px;--hm:70px 0 76px',4],
 ['optA.html','owner-concept-half-hour',1350,'--h:1350px;--top:100px;--band:172px;'+W+'--bar:90px 0 0;--ms:72px;--mf:80px;--ssz:42px'],['optA.html','owner-concept-half-hour-status',1920,WS+'--bar:120px 0 0;--ms:96px;--mf:120px;--ssz:42px'],
 ['optB.html','owner-concept-talk-browse',1350,'--h:1350px;--top:100px;--band:172px;'+W+'--bar:90px 0 0;--ms:72px;--mf:80px;--ssz:42px'],['optB.html','owner-concept-talk-browse-status',1920,WS+'--bar:120px 0 0;--ms:96px;--mf:120px;--ssz:42px'],
 ['optA2.html','owner-concept-short',1350,'--h:1350px;--top:100px;--band:172px;'+W+'--bar:96px 0 0;--ms:80px;--mf:88px;--ssz:48px'],['optA2.html','owner-concept-short-status',1920,WS+'--bar:130px 0 0;--ms:104px;--mf:130px;--ssz:48px'],
 ['words.html','owner-concept-words',1350,'--h:1350px;--top:100px;--band:172px;--h1:78px;--m1:56px;--h2:100px;--m2:24px;--bar:96px 0 0;--ms:80px;--mf:92px;--ssz:42px;--fsz:58px'],['words.html','owner-concept-words-status',1920,'--h:1920px;--top:330px;--band:400px;--h1:78px;--m1:66px;--h2:100px;--m2:26px;--bar:140px 0 0;--ms:110px;--mf:150px;--ssz:42px;--fsz:58px'],
 ['concept.html','owner-concept',1350,'--h:1350px;--top:70px;--band:172px;--h1:64px;--m1:36px;--h2:92px;--m2:14px;--mc:64px;--ms:56px;--mf:40px'],['concept.html','owner-concept-status',1920,'--h:1920px;--top:280px;--band:400px;--h1:66px;--m1:50px;--h2:94px;--m2:18px;--mc:84px;--ms:72px;--mf:56px'],
];
(async () => { const b = await chromium.launch();
for (const [file,name,h,css,v] of jobs) { const p = await (await b.newContext({ viewport: { width: 1080, height: h } })).newPage();
await p.goto('file://'+S+'/'+file); await p.addStyleTag({ content: ':root{'+css+'}' }); await p.evaluate(() => document.fonts.ready); if (v) await p.evaluate(v => document.body.dataset.v = v, v); await p.waitForTimeout(300);
const txt = await p.evaluate(() => document.body.innerText); console.log(name.padEnd(36), /hefty/.test(txt) ? 'STILL HEFTY' : 'ok', /percentage/.test(txt) ? 'pct' : 'NO PCT');
await p.screenshot({ path: '/home/claude/hiring-platform/public/share/'+name+'.png' }); await p.close(); }
await b.close(); })();
