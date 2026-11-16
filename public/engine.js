/* Shared canvas art direction and scene engine for the rendered film and browser preview. */
(function(root){
  const W=1280,H=720, C={ink:'#30271f',dark:'#3b3026',brown:'#674d38',gold:'#c59b57',cream:'#e7ddc8',paper:'#d9c9aa',sage:'#89917a',rust:'#a75f43',blue:'#78817b',white:'#f6f0e3',shadow:'rgba(30,24,19,.24)'};
  const scenes=[
    {place:'МЕГАПОЛИС • ИНСАЙД',kind:'loft',sky:'#b7a58a',day:'ДЕНЬ 1 / 365',money:'$10,000,000'},
    {place:'КАРТА ВЕТРОВ • РАЗВЕДКА',kind:'map',sky:'#b8a788',day:'ДЕНЬ 12 / 365',money:'$9,900,000'},
    {place:'ПРЕДГОРЬЯ • ЭКОФЕРМА',kind:'farm',sky:'#a3a087',day:'ДЕНЬ 35 / 365',money:'$8,700,000'},
    {place:'ГЛУБИНА 12 М • БЕТОН',kind:'build',sky:'#766f62',day:'ДЕНЬ 95 / 365',money:'$4,500,000'},
    {place:'ИНЖЕНЕРНЫЙ ОТСЕК',kind:'bunker',sky:'#5f625b',day:'ДЕНЬ 160 / 365',money:'$2,600,000'},
    {place:'ГИДРОПОНИКА • СКЛАД',kind:'greenhouse',sky:'#7b846d',day:'ДЕНЬ 220 / 365',money:'$1,400,000'},
    {place:'КОМАНДА ВЫЖИВАНИЯ',kind:'team',sky:'#927c63',day:'ДЕНЬ 285 / 365',money:'$400,000'},
    {place:'ПОСЛЕДНЯЯ НЕДЕЛЯ',kind:'departure',sky:'#8e7561',day:'ДЕНЬ 355 / 365',money:'$0'},
    {place:'ЧАС ИКС • УДАРНАЯ ВОЛНА',kind:'impact',sky:'#54443b',day:'ДЕНЬ 365 / 365',money:'$0'},
    {place:'ЯДЕРНЫЕ СУМЕРКИ',kind:'after',sky:'#4b5048',day:'ДЕНЬ 380 / 365',money:'$0'}
  ];
  function rr(c,x,y,w,h,r,fill,stroke,lw=1){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.lineWidth=lw;c.strokeStyle=stroke;c.stroke()}}
  function poly(c,pts,fill,stroke){c.beginPath();c.moveTo(...pts[0]);pts.slice(1).forEach(p=>c.lineTo(...p));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=3;c.stroke()}}
  function line(c,x1,y1,x2,y2,color,width=2){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke()}
  function text(c,s,x,y,size,color,font='700',align='left'){c.font=`${font} ${size}px Rubik`;c.textAlign=align;c.textBaseline='alphabetic';c.fillStyle=color;c.fillText(s,x,y)}
  function human(c,x,y,scale=1,pose='idle',t=0,color='#ab7956',hair='#392e26'){
    c.save();c.translate(x,y);c.scale(scale,scale);const bob=Math.sin(t*2.3+x*.01)*2;
    // legs / boots
    line(c,-12,0,-15,42,C.ink,9);line(c,12,0,15,42,C.ink,9);line(c,-15,42,-25,45,C.ink,8);line(c,15,42,26,45,C.ink,8);
    rr(c,-23,-68,46,71,14,color,C.ink,3);
    // arms with gesture
    if(pose==='point'){line(c,-22,-53,-42,-18,C.ink,8);line(c,22,-50,56,-80,C.ink,8);c.beginPath();c.arc(59,-82,6,0,7);c.fillStyle=color;c.fill()}
    else if(pose==='work'){line(c,-21,-52,-46,-25,C.ink,8);line(c,21,-52,42,-25,C.ink,8);c.beginPath();c.arc(-47,-22,6,0,7);c.fillStyle=color;c.fill();c.beginPath();c.arc(43,-22,6,0,7);c.fill()}
    else {line(c,-21,-54,-37,-26,C.ink,8);line(c,21,-54,36,-27,C.ink,8);}
    c.beginPath();c.ellipse(0,-91+bob,24,28,0,0,Math.PI*2);c.fillStyle=color;c.fill();c.lineWidth=3;c.strokeStyle=C.ink;c.stroke();
    c.beginPath();c.arc(0,-101+bob,24,Math.PI,Math.PI*2);c.fillStyle=hair;c.fill();
    c.fillStyle=C.ink;c.beginPath();c.arc(-8,-91+bob,2.4,0,7);c.arc(8,-91+bob,2.4,0,7);c.fill();
    line(c,-5,-80+bob,5,-80+bob,C.ink,2.3);c.restore();
  }
  function hud(c,scene){rr(c,36,30,385,88,12,'rgba(47,38,30,.92)');rr(c,36,30,7,88,4,C.gold);text(c,'ЛОКАЦИЯ',61,56,13,'#c5a36c','800');text(c,scene.place,61,83,21,C.white,'800');text(c,scene.day,61,105,15,'#e2d5bf','700');rr(c,W-273,30,237,52,13,'rgba(47,38,30,.92)');text(c,'БЮДЖЕТ',W-252,51,11,'#c5a36c','800');text(c,scene.money,W-252,71,20,C.white,'900');}
  function room(c,t,kind){c.fillStyle='#b8a58a';c.fillRect(0,0,W,H); // striped plaster
    for(let i=0;i<22;i++){c.fillStyle=i%2?'rgba(255,247,226,.10)':'rgba(82,64,48,.08)';c.fillRect(i*60,0,30,H)}
    c.fillStyle='#75634e';c.fillRect(0,562,W,158);for(let x=0;x<W;x+=80)line(c,x,565,x,720,'rgba(38,30,23,.12)',2);line(c,0,563,W,563,'#493b2d',5);
    // windows with stylized city or hills
    if(kind==='loft'||kind==='departure'||kind==='impact'){rr(c,770,125,365,300,7,'#56463a','#463a30',10);c.fillStyle=kind==='impact'?'#a65e3e':'#78817a';c.fillRect(785,140,335,270);if(kind==='loft'||kind==='departure'){for(let i=0;i<9;i++){let x=800+i*40,h=80+(i*47)%160; c.fillStyle=['#746453','#8d775c','#5e5b51'][i%3];c.fillRect(x,410-h,32,h);for(let yy=430-h;yy<405;yy+=25){c.fillStyle='#dfbc78';c.fillRect(x+7,yy,5,7);c.fillRect(x+20,yy,5,7)}}}line(c,950,140,950,410,'#443a30',8);line(c,785,270,1120,270,'#443a30',8);}
    if(kind==='loft'){rr(c,80,460,205,96,5,'#6b4b36','#3c3026',4);c.fillStyle='#3a322a';c.fillRect(101,478,160,62);c.fillStyle='#d7a759';c.beginPath();c.moveTo(166,538);c.lineTo(177,497);c.lineTo(190,538);c.fill();}
  }
  function backdrop(c,kind,t){
    if(['loft','departure','impact'].includes(kind)){room(c,t,kind);return}
    c.fillStyle=kind==='map'?'#d1c19f':kind==='farm'?'#9b9b7e':kind==='after'?'#4f554e':'#68675e';c.fillRect(0,0,W,H);
    if(kind==='map'){
      c.fillStyle='#c8b996';c.fillRect(0,0,W,720);for(let y=180;y<620;y+=36){c.beginPath();for(let x=0;x<=W;x+=20){let yy=y+Math.sin(x*.012+y)*8+Math.cos(x*.022)*4;x===0?c.moveTo(x,yy):c.lineTo(x,yy)}c.strokeStyle='rgba(104,115,91,.35)';c.lineWidth=2;c.stroke()}
      c.save();c.translate(640,395);c.rotate(-.07);rr(c,-290,-170,580,340,5,'#e6d8ba','#75664f',3);for(let i=0;i<7;i++){c.beginPath();c.arc((i*91)%420-210,(i*71)%230-115,30+i*4,0,6.28);c.strokeStyle='rgba(97,119,91,.35)';c.stroke()}c.strokeStyle='#a3573d';c.lineWidth=5;c.beginPath();c.moveTo(-210,65);c.bezierCurveTo(-100,-70,20,110,200,-60);c.stroke();c.fillStyle='#a3573d';c.beginPath();c.arc(200,-60,9,0,6.28);c.fill();c.restore();
    }else if(kind==='farm'){
      poly(c,[[0,470],[220,240],[390,430],[590,210],[830,470],[1040,275],[1280,440],[1280,720],[0,720]],'#737866');poly(c,[[0,540],[235,360],[410,525],[690,330],[930,530],[1110,380],[1280,500],[1280,720],[0,720]],'#899076');c.fillStyle='#6b7159';c.fillRect(0,525,1280,195);for(let i=0;i<7;i++){c.fillStyle=i%2?'#9c845e':'#b39a6d';c.fillRect(i*200+30,565,3,155)}rr(c,790,375,255,165,5,'#ab9878','#493d30',4);poly(c,[[770,378],[915,295],[1065,378]],'#72543b','#3d3328');for(let x=825;x<1010;x+=62){rr(c,x,420,39,45,2,'#61705e','#44392c',2)}
    }else {
      // Cutaway layers, concrete ribs, utility room
      c.fillStyle=kind==='after'?'#383e39':'#6f6d64';c.fillRect(0,0,W,720);c.fillStyle=kind==='after'?'#484d46':'#8b8170';c.fillRect(0,0,W,135);
      for(let i=0;i<18;i++){c.fillStyle='rgba(230,219,196,.06)';c.fillRect(i*75,0,34,720)}
      c.fillStyle='#453f37';c.fillRect(0,500,W,220);c.fillStyle='#807767';c.fillRect(0,480,W,25);for(let y=535;y<720;y+=54)line(c,0,y,W,y,'rgba(20,18,15,.22)',2);
      // thick concrete arch
      rr(c,335,175,610,345,26,'#817d71','#37332e',16);rr(c,382,218,516,302,13,kind==='greenhouse'?'#465747':'#514f49','#b0a58f',4);
      // wall seams
      for(let x=410;x<900;x+=115)line(c,x,224,x,515,'rgba(220,211,193,.12)',2);
      if(kind==='build'){rr(c,500,345,280,142,8,'#a09179','#40372f',5);for(let x=530;x<750;x+=42)line(c,x,345,x,487,'#756b5d',3);for(let y=375;y<480;y+=37)line(c,500,y,780,y,'#756b5d',3);}
      if(kind==='bunker'){for(let i=0;i<5;i++){rr(c,405+i*90,290,48,140,4,'#586361','#353834',3);for(let y=320;y<405;y+=30){c.fillStyle=i%2?'#b18c51':'#88958a';c.fillRect(417+i*90,y,7,7)}}rr(c,832,260,43,190,6,'#a79576','#39332d',4);}
      if(kind==='greenhouse'){for(let i=0;i<6;i++){let x=420+i*75;c.fillStyle='#507551';c.fillRect(x,390,9,92);c.beginPath();c.ellipse(x-14,410,19,8,-.6,0,6.28);c.ellipse(x+17,438,21,8,.6,0,6.28);c.fillStyle='#779861';c.fill()};rr(c,400,470,490,19,5,'#a38b62','#43392e',3);}
      if(kind==='team'||kind==='after'){rr(c,410,250,470,50,7,'#988b70','#3b342e',4);for(let i=0;i<5;i++){c.fillStyle=['#d2ad65','#85918a','#bc7657'][i%3];c.fillRect(430+i*82,264,20,24)}}
    }
  }
  function scenery(c,scene,t){let k=scene.kind;
    if(k==='map'){human(c,170,595,1.25,'point',t,'#987151','#40352c');return}
    if(k==='loft'){human(c,500,610,1.45,'idle',t);rr(c,965,470,115,66,8,'#55483a','#332c25',4);text(c,'10M',1022,513,24,C.gold,'900','center');return}
    if(k==='farm'){human(c,640,640,1.15,'work',t,'#907050');return}
    if(k==='build'){human(c,270,635,1.1,'work',t,'#957656');rr(c,1010,315,105,145,6,'#aa9a80','#484037',4);text(c,'12 м',1060,390,22,C.ink,'900','center');return}
    if(k==='bunker'){human(c,240,640,1.0,'work',t,'#8e7255');rr(c,960,310,195,126,10,'#333c39','#b09b75',4);for(let i=0;i<3;i++){c.beginPath();c.arc(1005+i*55,375,15,0,6.28);c.fillStyle=i===1?'#b66a45':'#d0a45e';c.fill()}return}
    if(k==='greenhouse'){human(c,250,640,1.0,'work',t,'#9c7957');return}
    if(k==='team'){human(c,570,640,.92,'idle',t,'#9c7758');human(c,710,640,.92,'idle',t,'#b88664');human(c,850,640,.92,'idle',t,'#8e745e');return}
    if(k==='departure'){human(c,520,640,1.15,'point',t,'#907153');for(let i=0;i<3;i++)human(c,720+i*100,640,.8,'idle',t,'#94735a');return}
    if(k==='impact'){const flash=Math.max(0,1-Math.abs(Math.sin(t*.8)))*.45;c.fillStyle=`rgba(240,196,131,${flash})`;c.fillRect(0,0,W,H);human(c,545,640,1.1,'idle',t,'#80664f');rr(c,880,300,160,220,11,'#544b40','#d1b88d',5);text(c,'ГЕРМО',960,385,20,'#d9c79f','900','center');return}
    if(k==='after'){human(c,550,640,1.15,'idle',t,'#a17c5d');for(let i=0;i<9;i++){let x=450+(i*63)%440,y=405+Math.sin(i*4)*20;c.fillStyle='#6a965d';c.beginPath();c.ellipse(x,y,18,9,i*.5,0,6.28);c.fill()}return}
  }
  function wrapWords(c,words,maxWidth,font){c.font=font;let lines=[],line=[];for(const w of words){let test=[...line,w].join(' ');if(c.measureText(test).width>maxWidth&&line.length){lines.push(line);line=[w]}else line.push(w)}if(line.length)lines.push(line);return lines}
  function captions(c,t,timeline){const active=(timeline.words||[]).find(x=>t>=x.start&&t<x.end);if(!active)return;const chunk=timeline.words.filter(x=>x.segment===active.segment&&x.start>=Math.max(0,active.start-1.75)&&x.start<=active.start+2.2);const words=chunk.map(x=>x.text.toUpperCase());const font='900 34px Rubik';const lines=wrapWords(c,words,1050,font);let y=H-76-(lines.length-1)*42;let ix=0;c.textAlign='center';c.textBaseline='middle';c.font=font;lines.forEach((line,li)=>{let widths=line.map(w=>c.measureText(w).width),g=17,total=widths.reduce((a,b)=>a+b,0)+g*(line.length-1),x=(W-total)/2;for(let j=0;j<line.length;j++){let w=chunk[ix++],is=w&&t>=w.start&&t<w.end;c.lineJoin='round';c.strokeStyle='rgba(28,23,19,.97)';c.lineWidth=9;c.strokeText(line[j],x+widths[j]/2,y+li*42);c.fillStyle=is?'#fff':'#9e9b95';c.fillText(line[j],x+widths[j]/2,y+li*42);x+=widths[j]+g}})}
  function draw(ctx,t,timeline){let sc=timeline.chapters.find(x=>t>=x.start&&t<x.end)||timeline.chapters[timeline.chapters.length-1];let scene=scenes[sc.index]||scenes[0];ctx.save();const shake=scene.kind==='impact'?Math.max(0,1-Math.abs(Math.sin(t*1.4)))*4:0;ctx.translate(Math.sin(t*.17)*2+(Math.random()-.5)*shake,Math.cos(t*.14)*1.2);backdrop(ctx,scene.kind,t);scenery(ctx,scene,t);hud(ctx,scene); // soft paper grain and vignette
    ctx.fillStyle='rgba(245,232,207,.035)';for(let i=0;i<40;i++){let x=(i*337+Math.floor(t*9))%W,y=(i*193)%H;ctx.fillRect(x,y,2,2)}
    const g=ctx.createRadialGradient(W/2,H/2,220,W/2,H/2,800);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(31,24,18,.22)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    captions(ctx,t,timeline);ctx.restore();}
  root.SurvivalEngine={W,H,scenes,draw};
})(typeof globalThis!=='undefined'?globalThis:this);
