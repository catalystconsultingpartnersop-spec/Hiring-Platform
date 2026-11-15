const { chromium } = require('playwright');
const S='/tmp/claude-0/-home-claude/622a8e37-8676-541a-a547-c446bbd1cde0/scratchpad'; const out=process.argv[2]||S;
(async () => { const b = await chromium.launch();
for (const [suf, h, css] of [['', 1350, ''], ['-status', 1920, '--H:1920px;--top:320px;--band:400px;--g:1.3']]) {
const p = await (await b.newContext({ viewport: { width: 1080, height: h } })).newPage();
await p.goto('file://'+S+'/cand.html'); await p.addStyleTag({ content: ':root{'+css+'}' }); await p.evaluate(() => document.fonts.ready);
for (let v=1; v<=9; v++) { await p.addStyleTag({ content: '.v{display:none !important}.v'+v+'{display:block !important}' }); await p.waitForTimeout(200);
const m = await p.evaluate(v => { const q = '.v'+v; const bottom = Math.round(Math.max(...[...document.querySelectorAll(q+' .in > *')].map(e => e.getBoundingClientRect().bottom))); const right = Math.round(Math.max(...[...document.querySelectorAll(q+' .in .d, '+q+' .pill')].map(e => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect().right; }))); return { bottom, right, band: Math.round(document.querySelector(q+' .band').getBoundingClientRect().top) }; }, v);
console.log('c'+v+suf, JSON.stringify(m), (m.bottom > m.band - 40 || m.right > 1000) ? '<<< FIX' : '');
await p.screenshot({ path: out+'/cand'+v+suf+'.png' }); } }
await b.close(); })();
