/* Wide side-view cutaway 2D engine: landscape surface, town skyline and a continuous underground cross-section. */
(function(root){
  const W=1280,H=720,INK='#211d1a',PAPER='#e4d7c2',GOLD='#e9a840';
  const palette={sky0:'#505a70',sky1:'#c58d63',soil:'#45291f',soil2:'#68402b',grass:'#78834b',house:'#d2ad82',roof:'#a34532'};
  function rr(c,x,y,w,h,r,fill,stroke,lw=1){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.lineWidth=lw;c.strokeStyle=stroke;c.stroke()}}
  function line(c,x1,y1,x2,y2,col,width=2){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=col;c.lineWidth=width;c.stroke()}
  function poly(c,p,fill,stroke){c.beginPath();c.moveTo(...p[0]);for(let i=1;i<p.length;i++)c.lineTo(...p[i]);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=3;c.stroke()}}
  function label(c,s,x,y,size,color,font='800',align='left'){c.font=`${font} ${size}px Rubik`;c.textAlign=align;c.textBaseline='alphabetic';c.fillStyle=color;c.fillText(s,x,y)}
  function skyline(c,shift=0){for(let i=-1;i<14;i++){let x=i*105-30+(shift%105),h=115+((i*71+300)%155);c.fillStyle=['#3d4657','#424b5d','#4a5364'][Math.abs(i)%3];c.fillRect(x,390-h,82,h);for(let yy=390-h+18;yy<383;yy+=22)for(let xx=x+12;xx<x+75;xx+=20){c.fillStyle=(Math.abs(i*3+yy+xx)%4===0)?'#d3ab75':'rgba(226,203,168,.28)';c.fillRect(xx,yy,5,7)}}}
  function house(c,x,base,s=1,variant=0){c.save();c.translate(x,base);c.scale(s,s);let wall=variant?'#c9b392':'#d4b68e',roof=variant?'#76563f':'#9c3b30';c.fillStyle=wall;c.fillRect(0,-128,194,128);c.strokeStyle='#42372f';c.lineWidth=3;c.strokeRect(0,-128,194,128);poly(c,[[-18,-126],[96,-197],[211,-126]],roof,'#44352e');for(let y=-105;y<-20;y+=28)line(c,4,y,190,y,'rgba(72,56,43,.28)',2);for(let xx of [12,72,132]){rr(c,xx,-105,37,39,2,'#3f4050','#2b2927',3);line(c,xx+18,-104,xx+18,-66,'#b8a98e',3);line(c,xx,-86,xx+36,-86,'#b8a98e',3);rr(c,xx+7,-45,29,45,1,'#523624','#332920',2)}c.restore()}
  function cloud(c,x,y,s=1,a=.42){c.fillStyle=`rgba(243,222,208,${a})`;for(const [dx,dy,r] of [[0,0,29],[32,-17,33],[62,2,25],[27,15,27]]){c.beginPath();c.arc(x+dx*s,y+dy*s,r*s,0,6.283);c.fill()}}
  function person(c,x,base,scale,t,inside=false){c.save();c.translate(x,base);c.scale(scale,scale);let stride=Math.sin(t*5)*14,skin='#b9825d',cloth=inside?'#546b58':'#525761';
    // side-on silhouette, facing right
    line(c,-6,-39,-9+stride*.45,0,INK,8);line(c,8,-39,12-stride*.45,0,INK,8);line(c,-9+stride*.45,0,-17+stride*.45,1,INK,6);line(c,12-stride*.45,0,20-stride*.45,1,INK,6);
    rr(c,-16,-93,34,58,10,cloth,INK,3);line(c,-11,-82,-25+Math.sin(t*5+1)*7,-51,INK,7);line(c,11,-81,24+Math.sin(t*5+2)*6,-56,INK,7);
    c.beginPath();c.ellipse(3,-111,20,24,.04,0,6.283);c.fillStyle=skin;c.fill();c.lineWidth=3;c.strokeStyle=INK;c.stroke();c.beginPath();c.arc(1,-121,20,Math.PI,Math.PI*2);c.fillStyle='#2c2726';c.fill();c.fillStyle=INK;c.beginPath();c.arc(10,-112,2.4,0,6.283);c.fill();line(c,13,-102,20,-101,INK,2);c.restore()}
  function machine(c,x,y){c.fillStyle='#bd723e';c.fillRect(x,y-62,112,45);rr(c,x+65,y-91,44,29,3,'#9bacaa','#443a31',2);c.strokeStyle='#3f372f';c.lineWidth=10;c.beginPath();c.arc(x+29,y-10,14,0,6.283);c.arc(x+89,y-10,14,0,6.283);c.stroke();line(c,x+20,y-62,x-12,y-112,'#4a4034',7);line(c,x-12,y-112,x+22,y-132,'#4a4034',6);line(c,x+1,y-107,x-33,y-64,'#4a4034',5)}
  function bunker(c,kind){let x=380,y=427,w=810,h=242;rr(c,x,y,w,h,12,'#383a38','#b7a88d',5);c.fillStyle='#292e2b';c.fillRect(x+12,y+12,w-24,h-24); // room walls and floor
    line(c,x+15,y+130,x+w-14,y+130,'#8b8070',5);for(let xx of [x+188,x+394,x+602])line(c,xx,y+14,xx,y+228,'#837a6a',6);
    // amber lights, doors, pipes
    for(let i=0;i<5;i++){rr(c,x+35+i*145,y+34,24,11,3,'#e8a744');}
    if(kind==='cutaway'||kind==='build'){rr(c,x+280,y+152,220,68,5,'#807867','#c0ae90',4);for(let xx=x+300;xx<x+500;xx+=26)line(c,xx,y+157,xx,y+218,'#655f53',2)}
    if(kind==='air'||kind==='power'){line(c,x+45,y+65,x+760,y+65,'#a5b4ad',9);line(c,x+90,y+65,x+90,y+105,'#a5b4ad',7);line(c,x+715,y+65,x+715,y+112,'#a5b4ad',7);for(let xx of [x+120,x+145,x+170])line(c,xx,y+52,xx,y+78,'#d8a355',3)}
    if(kind==='food'||kind==='garden'){for(let i=0;i<7;i++){let xx=x+46+i*48;c.fillStyle='#77945b';c.fillRect(xx,y+163,7,53);c.beginPath();c.ellipse(xx-8,y+173,13,6,-.5,0,6.28);c.ellipse(xx+14,y+189,13,6,.5,0,6.28);c.fillStyle='#8eaa66';c.fill()}}
    if(kind==='medical'){for(let i=0;i<7;i++){rr(c,x+35+i*84,y+161,55,42,4,['#748176','#b8a77e','#8e6658'][i%3],'#221f1a',2);c.fillStyle='#ede4ce';c.fillRect(x+57+i*84,y+174,11,4);c.fillRect(x+61+i*84,y+170,4,12)}}
    if(kind==='team'||kind==='test'){for(let i=0;i<4;i++)person(c,x+340+i*105,y+225,.52,kind==='test'?i*.9:1,true)}
    if(kind==='after'||kind==='impact'||kind==='countdown'){rr(c,x+730,y+53,45,162,6,'#907f65','#d4c3a3',4);for(let yy=y+73;yy<y+193;yy+=26)line(c,x+740,yy,x+765,yy,'#453d32',2)}
  }
  function ground(c,kind,t){let horizon=411;let sky=c.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,kind==='impact'?'#34364a':'#586276');sky.addColorStop(.68,kind==='impact'?'#a45c43':'#927c72');sky.addColorStop(1,'#d29a69');c.fillStyle=sky;c.fillRect(0,0,W,horizon);
    // distant mountains / industrial skyline
    if(['valley','farm','build','cutaway','air','power','water','food','garden','medical','team','test','budget','warning','countdown','impact','after'].includes(kind))poly(c,[[0,343],[115,230],[242,343],[371,276],[510,354],[667,205],[838,348],[1024,250],[1178,340],[1280,260],[1280,420],[0,420]],kind==='after'?'#4a5056':'#646b70');
    skyline(c,t*5);cloud(c,70,90,.8,.35);cloud(c,325,153,.75,.34);cloud(c,1020,82,.95,.4);cloud(c,1125,143,.68,.33);
    // ground cutaway, continuous strata
    let dirt=c.createLinearGradient(0,horizon,0,H);dirt.addColorStop(0,'#503329');dirt.addColorStop(.43,'#42281f');dirt.addColorStop(1,'#30221e');c.fillStyle=dirt;c.fillRect(0,horizon,W,H-horizon);c.fillStyle='#78834b';c.fillRect(0,horizon-7,W,12);line(c,0,horizon,W,horizon,'#28241f',4);
    for(let i=0;i<55;i++){let x=(i*193+47)%W,y=445+(i*89)%260;c.fillStyle=i%2?'rgba(193,151,104,.11)':'rgba(18,14,12,.14)';c.beginPath();c.arc(x,y,1+(i%3),0,6.283);c.fill()}
    if(kind==='city'){house(c,28,436,.95,0);house(c,1064,436,.95,1);}
    if(['valley','farm','build','cutaway','air','power','water','food','garden','medical','team','test','budget','warning','countdown','impact','after'].includes(kind)){
      // rural homestead, shed and a visible well; stable side-on staging
      house(c,40,436,.75,1);house(c,1050,436,.78,0);rr(c,783,345,155,86,1,'#aa6239','#40342d',3);poly(c,[[768,347],[856,290],[952,347]],'#785039','#3d3128');line(c,803,366,923,366,'#d39b65',2);label(c,'ХОЗЯЙСТВО',860,337,10,'#f0d7af','900','center');
      rr(c,696,385,42,47,2,'#7b6952','#40342c',3);line(c,704,384,704,360,'#49382b',3);line(c,730,384,730,360,'#49382b',3);
    }
    if(kind==='build')machine(c,530,411);
    if(kind==='impact'){
      // giant stylized blast bloom beyond town, glowing rings, drifting dust
      let k=.88+.1*Math.sin(t*1.6);let g=c.createRadialGradient(1000,184,20,1000,184,240*k);g.addColorStop(0,'rgba(255,235,182,.95)');g.addColorStop(.32,'rgba(255,157,70,.8)');g.addColorStop(1,'rgba(189,67,36,0)');c.fillStyle=g;c.fillRect(730,0,550,460);for(let r of [72,112,155]){c.beginPath();c.arc(1010,190,r*k,0,6.283);c.fillStyle='rgba(243,128,59,.23)';c.fill()}}
    if(kind==='after'){c.fillStyle='rgba(70,75,70,.22)';c.fillRect(0,0,W,H);for(let i=0;i<75;i++){let x=(i*127+Math.floor(t*10))%W,y=(i*83+Math.floor(t*21))%H;c.fillStyle='rgba(197,179,148,.38)';c.fillRect(x,y,2+(i%4),2+(i%5))}}
    // cross-section gives a persistent side-profile of the underground shelter
    if(!['city','map','valley','farm'].includes(kind))bunker(c,kind);
    if(kind==='map'){rr(c,267,160,370,193,7,'#ddcfaf','#443a30',4);for(let i=0;i<4;i++){c.beginPath();c.ellipse(450,254,130-i*22,60-i*10,0,0,6.283);c.strokeStyle='rgba(103,117,87,.5)';c.lineWidth=2;c.stroke()}line(c,326,279,560,207,'#a84c37',5);c.beginPath();c.arc(560,207,7,0,6.283);c.fillStyle='#a84c37';c.fill();}
    if(kind==='water'){rr(c,188,345,40,88,3,'#7b6853','#372f28',3);line(c,193,350,223,350,'#b39b72',4);line(c,208,345,208,320,'#403a31',3)}
    if(kind==='power'){rr(c,160,340,100,67,4,'#58615b','#30332e',4);c.fillStyle='#d4a252';c.fillRect(188,359,12,11);line(c,165,407,150,430,'#322d26',5);line(c,250,407,265,430,'#322d26',5)}
    if(kind==='garden'){for(let i=0;i<8;i++){let x=292+i*45;c.fillStyle='#63834e';c.fillRect(x,394,5,27);c.beginPath();c.ellipse(x-8,396,11,5,-.5,0,6.283);c.ellipse(x+10,406,11,5,.5,0,6.283);c.fillStyle='#88a665';c.fill()}}
    if(kind==='warning'||kind==='countdown'){for(let i=0;i<3;i++)rr(c,330+i*55,344,35,48,5,'#d2c3a1','#453b31',3)}
  }
  function hud(c,ch){rr(c,30,26,486,92,10,'rgba(30,27,28,.88)');rr(c,30,26,8,92,4,'#d99b42');label(c,'ЛОКАЦИЯ',53,51,12,'#dcb36c');label(c,ch.title,53,77,20,'#f5eee3','900');label(c,ch.day,53,103,14,'#d4c8b7','700');rr(c,W-250,27,218,52,11,'rgba(30,27,28,.88)');label(c,'БЮДЖЕТ',W-229,48,10,'#dcb36c');label(c,ch.money,W-229,68,19,'#fff3e1','900')}
  function wrap(c,ws,max,font){c.font=font;let lines=[],line=[];for(let w of ws){if(line.length&&c.measureText([...line,w].join(' ')).width>max){lines.push(line);line=[w]}else line.push(w)}if(line.length)lines.push(line);return lines}
  function captions(c,t,data){let a=data.words.find(w=>t>=w.start&&t<w.end);if(!a)return;let chunk=data.words.filter(w=>w.segment===a.segment&&w.start>=Math.max(0,a.start-2.1)&&w.start<=a.start+2.3),ws=chunk.map(w=>w.text.toUpperCase()),font='900 35px Rubik',lines=wrap(c,ws,1130,font),y=H-58-(lines.length-1)*43,k=0;c.font=font;c.textBaseline='middle';for(let li=0;li<lines.length;li++){let widths=lines[li].map(w=>c.measureText(w).width),gap=16,total=widths.reduce((u,v)=>u+v,0)+gap*(widths.length-1),x=(W-total)/2;for(let j=0;j<lines[li].length;j++){let cue=chunk[k++],active=t>=cue.start&&t<cue.end;c.textAlign='center';c.lineJoin='round';c.strokeStyle='rgba(20,17,17,.98)';c.lineWidth=10;c.strokeText(lines[li][j],x+widths[j]/2,y+li*43);c.fillStyle=active?'#fff':'#c6c1bb';c.fillText(lines[li][j],x+widths[j]/2,y+li*43);x+=widths[j]+gap}}}
  function draw(ctx,t,data){let ch=data.chapters.find(c=>t>=c.start&&t<c.end)||data.chapters[data.chapters.length-1],kind=ch.kind||'city',local=t-ch.start;ctx.save();let shake=kind==='impact'?Math.sin(t*24)*5:0;ctx.translate(Math.sin(t*.17)*2+shake,Math.cos(t*.11)*1.1);ground(ctx,kind,t);if(['city','map','valley','farm','build','warning','countdown'].includes(kind))person(ctx,480+Math.sin(local*.35)*125,422,1.1,t,false);else person(ctx,600+Math.sin(local*.28)*95,655,.85,t,true);hud(ctx,ch);
    if(t<4){ctx.save();ctx.fillStyle='rgba(20,21,29,.20)';ctx.fillRect(0,0,W,H);ctx.font='900 64px Rubik';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=12;ctx.lineJoin='round';ctx.strokeStyle='#171617';ctx.strokeText('ЧЕРЕЗ ГОД',W/2,232);ctx.fillStyle='#fff';ctx.fillText('ЧЕРЕЗ ГОД',W/2,232);ctx.restore()}
    // controlled cinematic vignette and dust; deterministic seed avoids frame flicker
    const vg=ctx.createRadialGradient(W/2,H/2,240,W/2,H/2,800);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(18,15,17,.30)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
    const bot=ctx.createLinearGradient(0,H-145,0,H);bot.addColorStop(0,'rgba(25,18,16,0)');bot.addColorStop(1,'rgba(22,16,14,.52)');ctx.fillStyle=bot;ctx.fillRect(0,H-150,W,150);captions(ctx,t,data);ctx.restore()}
  root.SurvivalEngine={W,H,draw};
})(typeof globalThis!=='undefined'?globalThis:this);
