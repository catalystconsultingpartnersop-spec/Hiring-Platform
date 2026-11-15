const { chromium } = require('playwright');
const S=__dirname;
const jobs = [
 ['teaser.html','owner-teaser',1350,'--top:84px;--gap:92px;--band:172px;--h1:100px;--m1:50px;--bar:66px 0 56px;--bigsz:166px;--vet:55px','.vet'],
 ['teaser.html','owner-teaser-status',1920,'--top:300px;--gap:150px;--band:400px;--h1:100px;--m1:60px;--bar:96px 0 84px;--bigsz:166px;--vet:55px','.vet'],
 ['concept.html','owner-concept',1350,'--top:70px;--band:172px;--h1:64px;--m1:36px;--h2:92px;--m2:14px;--mc:64px;--ms:56px;--mf:40px','.fee'],
 ['concept.html','owner-concept-status',1920,'--top:280px;--band:400px;--h1:66px;--m1:50px;--h2:94px;--m2:18px;--mc:84px;--ms:72px;--mf:56px','.fee'],
 ['words.html','owner-concept-words',1350,'--top:100px;--band:172px;--h1:78px;--m1:56px;--h2:100px;--m2:24px;--bar:96px 0 0;--ms:80px;--mf:92px;--ssz:42px;--fsz:58px','.fee'],
 ['words.html','owner-concept-words-status',1920,'--top:330px;--band:400px;--h1:78px;--m1:66px;--h2:100px;--m2:26px;--bar:140px 0 0;--ms:110px;--mf:150px;--ssz:42px;--fsz:58px','.fee'],
 ['revo.html','owner-revolutionary',1350,'--top:70px;--gap:0px;--band:172px;--h1:88px;--m1:40px;--bar:48px 0 40px;--bigsz:160px;--vet:1px','.s:last-of-type'],
 ['revo.html','owner-revolutionary-status',1920,'--top:290px;--gap:0px;--band:400px;--h1:96px;--m1:56px;--bar:90px 0 76px;--bigsz:166px;--vet:1px','.s:last-of-type'],
];
(async () => { const b = await chromium.launch();
for (const [file, name, h, css, last] of jobs) {
const p = await (await b.newContext({ viewport: { width: 1080, height: h } })).newPage();
await p.goto('file://' + S + '/' + file); await p.addStyleTag({ content: ':root{--h:'+h+'px;'+css+'}' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(350);
const els = await p.locator('.in > p.s, .in > p.fee, .in > p.vet').evaluateAll(a => Math.round(Math.max(...a.filter(e => getComputedStyle(e).display !== 'none').map(e => e.getBoundingClientRect().bottom))));
console.log(name.padEnd(30), 'content bottom', els, 'band top', h - parseInt(css.match(/--band:(\d+)/)[1]), 'pill', await p.evaluate(() => { const r = document.querySelector('.pill').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
await p.screenshot({ path: S + '/new-' + name + '.png' }); }
await b.close(); })();
