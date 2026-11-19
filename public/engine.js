/* Wide side-view cutaway 2D engine: landscape surface, town skyline and a continuous underground cross-section. */
(function(root){
  const W=1280,H=720,INK='#211d1a',PAPER='#e4d7c2',GOLD='#e9a840';
  const ISLAND=new Set(['island_wreck','island_shore','island_signal','island_island','island_shelter','island_water','island_fire','island_food','island_medical','island_storm','island_rescue','island_countdown']);
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
  function actor(c,x,base,t,pose='idle',scale=1,shirt='#56665b'){
    c.save();c.translate(x,base);c.scale(scale,scale);const step=Math.sin(t*6)*12,bob=Math.sin(t*6)*1.6;
    c.fillStyle='rgba(35,28,22,.22)';c.beginPath();c.ellipse(0,1,26,6,0,0,6.283);c.fill();
    const arm=(x1,y1,x2,y2)=>{line(c,x1,y1,x2,y2,'#282623',8);line(c,x2-1,y2,x2+2,y2,'#b97e5b',7)};
    // Action-specific silhouette: the pose changes with the task, not a looping walk cycle.
    const poses={idle:[[-11,-76,-23,-48],[11,-76,24,-52]],pull:[[-12,-78,-37,-58],[11,-78,40,-91]],carry:[[-12,-76,-27,-48],[11,-76,29,-48]],scan:[[-12,-76,-25,-48],[11,-76,22,-132]],hammer:[[-12,-76,-26,-48],[11,-76,37,-105]],pour:[[-12,-76,-26,-48],[11,-76,34,-72]],light:[[-12,-76,-26,-48],[11,-76,39,-47]],fish:[[-12,-76,-26,-48],[11,-76,33,-87]],bandage:[[-12,-71,-28,-43],[11,-71,35,-48]],storm:[[-12,-76,-45,-112],[11,-76,49,-119]],wave:[[-12,-76,-24,-48],[11,-76,23,-130]],write:[[-12,-76,-24,-48],[11,-76,35,-82]]};
    const arms=(poses[pose]||poses.idle).map(a=>a.slice()),beat=Math.sin(t*7);
    if(pose==='pull'||pose==='hammer'||pose==='pour'||pose==='light'||pose==='fish'||pose==='wave'||pose==='storm'||pose==='write'){
      arms[1][2]+=beat*(pose==='storm'?5:4);arms[1][3]+=beat*(pose==='hammer'||pose==='light'?14:7);
    }
    if(pose==='carry'){arms[0][3]+=Math.sin(t*3)*2;arms[1][3]-=Math.sin(t*3)*2}
    // legs mostly planted; only the purposeful scouting scene walks forward
    if(pose==='walk'){line(c,-7,-40,-10+step*.45,0,'#282623',8);line(c,8,-40,11-step*.45,0,'#282623',8)}else{line(c,-7,-40,-12,0,'#282623',8);line(c,8,-40,12,0,'#282623',8)}
    line(c,-12,0,-20,2,'#302b26',7);line(c,12,0,21,2,'#302b26',7);
    rr(c,-17,-95+bob,35,57,10,shirt,'#282623',3); // jacket seams and backpack
    line(c,-8,-88+bob,-8,-47+bob,'rgba(233,222,199,.36)',2);rr(c,-26,-87+bob,11,31,4,'#72684f','#302c27',2);
    arm(...arms[0]);arm(...arms[1]);
    c.beginPath();c.ellipse(3,-113+bob,20,24,.03,0,6.283);c.fillStyle='#b9805d';c.fill();c.lineWidth=3;c.strokeStyle='#282623';c.stroke();
    c.beginPath();c.arc(1,-124+bob,20,Math.PI,Math.PI*2);c.fillStyle='#292624';c.fill();c.fillStyle='#211e1b';c.beginPath();c.arc(10,-114+bob,2.5,0,6.283);c.fill();line(c,13,-103+bob,20,-102+bob,'#30251f',2);c.restore();
  }
  function islandAction(c,kind,t,local){
    let walkX=340+Math.min(local*14,360);
    if(kind==='island_wreck'){actor(c,500,417,t,'pull',1.05,'#59636e');actor(c,286,417,t+.5,'wave',.9,'#74836b');rr(c,645,388,52,31,4,'#ad8a60','#473d31',3);line(c,640,400,610,392,'#eadaba',3)}
    else if(kind==='island_shore'){actor(c,440,417,t,'carry',1.05,'#6b735b');actor(c,695,417,t+1,'carry',.88,'#8d644f');rr(c,515+Math.sin(t*1.5)*10,382,57,34,4,'#aa8259','#45392f',3)}
    else if(kind==='island_signal'){actor(c,450,417,t,'wave',1.05,'#66725c');let beam=30+25*(.5+.5*Math.sin(t*9));c.save();c.globalAlpha=.35;c.fillStyle='#fff3bb';c.beginPath();c.moveTo(482,286);c.lineTo(665,286-beam);c.lineTo(665,286+beam);c.closePath();c.fill();c.restore()}
    else if(kind==='island_island'){actor(c,walkX,417,t,'walk',1,'#596c5d');rr(c,walkX+28,329,56,39,3,'#e0d4b4','#3d342b',2);line(c,walkX+45,335,walkX+70,356,'#a74b39',3)}
    else if(kind==='island_shelter'){actor(c,455,417,t,'hammer',1.02,'#66715a');actor(c,735,417,t+1,'pull',.9,'#88624d');line(c,514,403,543,374,'#514333',5);line(c,538,371,550+Math.sin(t*8)*4,383,'#c9b17d',4);rr(c,528,407,18,9,2,'#5a402d')}
    else if(kind==='island_water'){actor(c,485,417,t,'pour',1,'#61705b');actor(c,765,417,t+1,'carry',.9,'#8a6852');rr(c,533,365,42,43,7,'#a8a07c','#413a30',3);c.fillStyle='#b8d2cb';c.fillRect(537,390,34,15);line(c,558,373,582,399,'#c2b79d',4)}
    else if(kind==='island_fire'){actor(c,470,417,t,'light',1,'#64745d');actor(c,740,417,t+1,'idle',.9,'#8c6550');line(c,525,405,555,408,'#49382a',6);line(c,533,411,556,401,'#49382a',5);let flame=22+Math.sin(t*8)*4;poly(c,[[539,407],[548,407-flame],[558,407]],'#e5a341');}
    else if(kind==='island_food'){actor(c,460,417,t,'fish',1.02,'#647261');actor(c,780,417,t+.7,'pull',.88,'#8c6650');line(c,470,340,560,394,'#4b4033',4);line(c,560,394,623,398,'#443b31',2);line(c,620,398,636,411+Math.sin(t*6)*4,'#ded4bf',2);poly(c,[[632,408],[648,402],[654,410],[647,416]],'#d6c5a2','#463a2e');}
    else if(kind==='island_medical'){actor(c,510,417,t,'bandage',1.02,'#65715b');actor(c,695,417,t,'idle',.84,'#9a7159');rr(c,645,366,56,22,4,'#e3dac5','#4b4034',2);line(c,671,369,671,385,'#b05043',4);}
    else if(kind==='island_storm'){actor(c,450,417,t,'storm',1,'#64745d');actor(c,770,417,t+1,'storm',.92,'#926b53');poly(c,[[403,322],[548,326+Math.sin(t*7)*10],[630,350],[760,327+Math.cos(t*6)*10],[853,343],[853,358],[760,342],[630,367],[548,344],[403,340]],'#ad8461','#514334');}
    else if(kind==='island_countdown'){actor(c,480,417,t,'write',1,'#69745f');rr(c,625,319,120,90,4,'#ddcfaf','#463b30',3);for(let i=0;i<4;i++){line(c,640+i*24,336,640+i*24,394,'#aa7353',2)}label(c,'10',687,374,25,'#9e4b38','900','center')}
    else if(kind==='island_rescue'){actor(c,455,417,t,'wave',1.05,'#6b745e');actor(c,645,417,t+1,'wave',.9,'#a47558');actor(c,720,417,t+2,'carry',.82,'#667c76');if(local<14){let flash=(Math.sin(t*12)>0)?1:.3;c.save();c.globalAlpha=flash;c.fillStyle='#ffdc75';c.beginPath();c.arc(489,282,10,0,6.283);c.fill();c.restore()}}
  }
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
  function islandGround(c,kind,t){
    const sky=c.createLinearGradient(0,0,0,360);sky.addColorStop(0,kind==='island_storm'?'#535d69':'#596678');sky.addColorStop(.68,kind==='island_storm'?'#77818a':'#ce9870');sky.addColorStop(1,'#efd09a');c.fillStyle=sky;c.fillRect(0,0,W,365);
    for(const [x,y,s] of [[85,93,.8],[420,145,.65],[1010,82,.9]])cloud(c,x,y,s,kind==='island_storm'?.48:.33);
    // distant headland and the open sea
    poly(c,[[0,330],[95,276],[210,320],[345,268],[455,329],[580,287],[700,330],[850,275],[1010,326],[1150,282],[1280,320],[1280,424],[0,424]],'#66776e');
    let ocean=c.createLinearGradient(0,330,0,440);ocean.addColorStop(0,'#617d82');ocean.addColorStop(1,'#385d67');c.fillStyle=ocean;c.fillRect(0,330,W,110);
    for(let i=0;i<8;i++){let y=346+i*11,x=((i*173+Math.floor(t*8))%1450)-80;line(c,x,y,x+90,y+Math.sin(t+i)*2,'rgba(227,220,193,.34)',2)}
    // broad, side-on beach and inland strip
    poly(c,[[0,426],[100,415],[220,418],[335,396],[474,400],[600,412],[735,408],[868,390],[1020,395],[1145,405],[1280,418],[1280,720],[0,720]],'#c69a66');
    poly(c,[[230,416],[340,396],[478,400],[585,413],[710,408],[855,390],[1006,396],[1060,414],[1060,435],[230,435]],'#74814f');
    for(let i=0;i<46;i++){let x=(i*157+24)%W,y=447+(i*83)%235;c.fillStyle=i%2?'rgba(255,226,165,.20)':'rgba(95,63,41,.10)';c.beginPath();c.ellipse(x,y,2+(i%3),1.4+(i%2),0,0,6.283);c.fill()}
    // palm and broad-leaf silhouettes
    line(c,125,419,139,286,'#594636',12);for(let i=0;i<7;i++){let a=-2.8+i*.48;line(c,139,287,139+Math.cos(a)*82,287+Math.sin(a)*42,'#4e614b',7)}
    for(let i=0;i<5;i++){let x=1130+i*26;line(c,x,417,x-7,352-(i%3)*13,'#435844',7);c.beginPath();c.ellipse(x-16,365-(i%3)*13,23,9,-.45,0,6.283);c.ellipse(x+11,376-(i%3)*13,24,9,.45,0,6.283);c.fillStyle='#59734d';c.fill()}
    if(kind==='island_wreck'&&t<5.5){let k=Math.max(0,1-t/5.5);c.save();c.globalAlpha=k;c.beginPath();c.moveTo(565,418);c.bezierCurveTo(665,386,715,275,823,250);c.bezierCurveTo(892,234,930,292,1000,278);c.bezierCurveTo(980,342,1030,382,1120,414);c.closePath();c.fillStyle='#3f7881';c.fill();c.strokeStyle='#d8e3d5';c.lineWidth=9;c.stroke();for(let i=0;i<8;i++){c.beginPath();c.arc(795+i*19,258+Math.sin(i)*8,7,0,6.283);c.fillStyle='#e6e4d6';c.fill()}c.restore()}
    if(kind==='island_wreck'){poly(c,[[675,412],[846,412],[881,401],[818,395],[777,402],[740,396]],'#765442','#43372e');rr(c,745,372,43,25,2,'#b28e67','#443a31',2);line(c,821,397,850,360,'#5a4938',4)}
    if(kind==='island_shelter'||kind==='island_shore'||kind==='island_countdown'){line(c,280,415,326,340,'#594936',8);line(c,446,409,400,340,'#594936',8);poly(c,[[282,347],[397,319],[447,405],[295,405]],'#9f7155','#493c30');line(c,295,407,444,407,'#4d3f32',4)}
    if(kind==='island_water'){rr(c,520,374,53,41,5,'#9d8056','#453a30',3);rr(c,582,379,50,36,5,'#a98c5d','#453a30',3);line(c,484,349,660,357,'#dfd0b1',5);line(c,488,350,488,410,'#dfd0b1',4);line(c,657,357,657,410,'#dfd0b1',4)}
    if(kind==='island_fire'){for(let i=0;i<5;i++)line(c,820+i*9,413,850+i*7,407,'#57402d',6);poly(c,[[833,408],[838,384+Math.sin(t*8)*4],[847,407]],'#e98b3f');poly(c,[[846,408],[851,389+Math.cos(t*7)*4],[859,407]],'#e8b14d')}
    if(kind==='island_food'){line(c,700,352,744,401,'#4e4637',4);line(c,744,401,798,405,'#594a39',2);poly(c,[[764,410],[783,410],[777,416]],'#e6d4ad')}
    if(kind==='island_medical'){rr(c,650,375,65,42,4,'#8b7354','#4a3d30',3);rr(c,722,382,52,35,4,'#d0c1a1','#4a3d30',3);line(c,744,389,744,409,'#a64d3c',4);line(c,735,399,753,399,'#a64d3c',4)}
    if(kind==='island_storm'){c.fillStyle='rgba(46,54,63,.34)';c.fillRect(0,0,W,390);for(let i=0;i<35;i++){let x=(i*53+Math.floor(t*90))%W,y=(i*71+Math.floor(t*45))%410;line(c,x,y,x-7,y+19,'rgba(223,228,222,.42)',2)}}
    if(kind==='island_signal'){poly(c,[[910,408],[946,408],[945,327],[924,327]],'#e6d8bc','#3a332c');poly(c,[[945,327],[1000,344],[945,360]],'#d94f39','#44352c');}
    if(kind==='island_rescue'){// rescue launch and small distant helicopter
      poly(c,[[790,387],[1040,387],[1008,414],[820,414]],'#d4c5a4','#35322d');rr(c,863,353,117,34,4,'#e8dfcb','#34312c',3);for(let x=880;x<970;x+=28)rr(c,x,360,20,16,2,'#526475','#292c30',2);line(c,905,352,905,342,'#332d28',4);line(c,875,342,935,342,'#332d28',3);}
  }
  function ground(c,kind,t){if(ISLAND.has(kind)){islandGround(c,kind,t);return}let horizon=411;let sky=c.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,kind==='impact'?'#34364a':'#586276');sky.addColorStop(.68,kind==='impact'?'#a45c43':'#927c72');sky.addColorStop(1,'#d29a69');c.fillStyle=sky;c.fillRect(0,0,W,horizon);
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
  function hud(c,ch){rr(c,30,26,486,92,10,'rgba(30,27,28,.88)');rr(c,30,26,8,92,4,'#d99b42');label(c,'ЛОКАЦИЯ',53,51,12,'#dcb36c');label(c,ch.title,53,77,20,'#f5eee3','900');label(c,ch.day,53,103,14,'#d4c8b7','700');rr(c,W-250,27,218,52,11,'rgba(30,27,28,.88)');label(c,ch.metricLabel||'БЮДЖЕТ',W-229,48,10,'#dcb36c');label(c,ch.money||ch.metric||'',W-229,68,19,'#fff3e1','900')}
  function wrap(c,ws,max,font){c.font=font;let lines=[],line=[];for(let w of ws){if(line.length&&c.measureText([...line,w].join(' ')).width>max){lines.push(line);line=[w]}else line.push(w)}if(line.length)lines.push(line);return lines}
  function captions(c,t,data){let a=data.words.find(w=>t>=w.start&&t<w.end);if(!a)return;let chunk=data.words.filter(w=>w.segment===a.segment&&w.start>=Math.max(0,a.start-2.1)&&w.start<=a.start+2.3),ws=chunk.map(w=>w.text.toUpperCase()),font='900 35px Rubik',lines=wrap(c,ws,1130,font),y=H-58-(lines.length-1)*43,k=0;c.font=font;c.textBaseline='middle';for(let li=0;li<lines.length;li++){let widths=lines[li].map(w=>c.measureText(w).width),gap=16,total=widths.reduce((u,v)=>u+v,0)+gap*(widths.length-1),x=(W-total)/2;for(let j=0;j<lines[li].length;j++){let cue=chunk[k++],active=t>=cue.start&&t<cue.end;c.textAlign='center';c.lineJoin='round';c.strokeStyle='rgba(20,17,17,.98)';c.lineWidth=10;c.strokeText(lines[li][j],x+widths[j]/2,y+li*43);c.fillStyle=active?'#fff':'#c6c1bb';c.fillText(lines[li][j],x+widths[j]/2,y+li*43);x+=widths[j]+gap}}}
  function draw(ctx,t,data){let ch=data.chapters.find(c=>t>=c.start&&t<c.end)||data.chapters[data.chapters.length-1],kind=ch.kind||'city',local=t-ch.start,isIsland=ISLAND.has(kind);ctx.save();let shake=kind==='impact'?Math.sin(t*24)*5:0;ctx.translate(Math.sin(t*.17)*2+shake,Math.cos(t*.11)*1.1);ground(ctx,kind,t);if(isIsland)islandAction(ctx,kind,t,local);else if(['city','map','valley','farm','build','warning','countdown'].includes(kind))person(ctx,480+Math.sin(local*.35)*125,422,1.1,t,false);else person(ctx,600+Math.sin(local*.28)*95,655,.85,t,true);hud(ctx,ch);
    if(t<4){ctx.save();ctx.fillStyle='rgba(20,21,29,.20)';ctx.fillRect(0,0,W,H);ctx.font='900 58px Rubik';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=12;ctx.lineJoin='round';ctx.strokeStyle='#171617';const title=isIsland?'100 ДНЕЙ ДО СПАСЕНИЯ':'ЧЕРЕЗ ГОД';ctx.strokeText(title,W/2,232);ctx.fillStyle='#fff';ctx.fillText(title,W/2,232);ctx.restore()}
    // controlled cinematic vignette and dust; deterministic seed avoids frame flicker
    const vg=ctx.createRadialGradient(W/2,H/2,240,W/2,H/2,800);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(18,15,17,.30)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
    const bot=ctx.createLinearGradient(0,H-145,0,H);bot.addColorStop(0,'rgba(25,18,16,0)');bot.addColorStop(1,'rgba(22,16,14,.52)');ctx.fillStyle=bot;ctx.fillRect(0,H-150,W,150);captions(ctx,t,data);ctx.restore()}
  root.SurvivalEngine={W,H,draw};
})(typeof globalThis!=='undefined'?globalThis:this);
