const { chromium } = require('playwright');
const S='/tmp/claude-0/-home-claude/cc396be3-c463-5250-8db8-5bc86662ceac/scratchpad';
(async()=>{const b=await chromium.launch();
for (const [w,h,tag] of [[1280,1250,'desk'],[390,844,'phone']]) {
  const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:w<500,hasTouch:w<500});
  const e=[];p.on('pageerror',x=>e.push(String(x).slice(0,120)));
  await p.goto('https://thearena.flashpointhistory.com/#/us/throwback',{waitUntil:'networkidle',timeout:60000});
  await p.waitForTimeout(2800);
  console.log(tag, JSON.stringify(await p.evaluate(()=>({
    tabs:[...document.querySelectorAll('.tb-tab')].map(x=>x.textContent.trim()),
    years:[...document.querySelectorAll('.tb-year')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),
    openable:[...document.querySelectorAll('button.tb-year')].map(x=>x.querySelector('.tb-year-n')?.textContent)}))), e.length?e[0]:'no errors');
  await p.screenshot({path:`${S}/STUDENT-${tag}.png`});
  // open 1850 and the paper, as a kid would
  const ys=await p.$$('button.tb-year');
  if (ys.length){ await ys[ys.length-1].click(); await p.waitForTimeout(1500);
    const panel=await p.$('.tb-panel'); if(panel){ await panel.click(); await p.waitForTimeout(1200);
      console.log('  '+tag+' paper opens:', await p.evaluate(()=>!!document.querySelector('.tb-cut img')?.naturalWidth)); } }
  await p.close();
}
await b.close()})();
