/* Wide side-view cutaway 2D engine: landscape surface, town skyline and a continuous underground cross-section. */
(function(root){
  const W=1280,H=720,INK='#211d1a',PAPER='#e4d7c2',GOLD='#e9a840';
  const ISLAND=new Set(['island_wreck','island_shore','island_signal','island_island','island_shelter','island_water','island_fire','island_food','island_medical','island_storm','island_rescue','island_countdown']);
  const BACKGROUNDS={};
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
  function islandAction(c,kind,t,local,ch){
    let walkX=340+Math.min(local*14,360);
    // These two painted plates have deliberately different ground planes. Keep
    // the staging local to their location IDs; the other scenes retain their
    // established blocking and baseline.
    if(ch.location==='storm_ship'){
      const ease=(a,p)=>{const q=Math.max(0,Math.min(1,(local-a)/p));return q*q*(3-2*q)};
      const x1=430-80*ease(3,5)+95*ease(15,5),x2=550+120*ease(3,5)-105*ease(13,6);
      const p1=local<3?'storm':local<8?'walk':local<15?'pull':local<19?'walk':'carry';
      const p2=local<3?'storm':local<8?'walk':local<13?'carry':local<19?'walk':'idle';
      actor(c,x1,632,local,p1,1.02,'#59636e');actor(c,x2,632,local+1,p2,.9,'#74836b');
      // Salvage stays on the same beach plane as the survivors, not mid-air.
      rr(c,655,599,52,31,4,'#ad8a60','#473d31',3);line(c,650,611,620,603,'#eadaba',3);return;
    }
    if(ch.location==='raincatch_cliff'){
      const ease=(a,p)=>{const q=Math.max(0,Math.min(1,(local-a)/p));return q*q*(3-2*q)};
      const ridgeX=535+175*ease(2.5,5),shoreX=790-135*ease(1,5);
      const ridgeBase=280-(ridgeX-535)*.405;
      const ridgePose=local<2.5?'scan':local<7.5?'walk':'pull';
      const shorePose=local<6?'walk':local<16?'pour':'carry';
      // One survivor climbs the visible rock shelf; the other works beside the pool.
      actor(c,ridgeX,ridgeBase,local,ridgePose,.70,'#61705b');
      actor(c,shoreX,635,local+1,shorePose,.96,'#8a6852');
      // Catching container is grounded beside the pool, aligned to the foreground.
      rr(c,640,597,48,38,6,'#a8a07c','#413a30',3);c.fillStyle='#b8d2cb';c.fillRect(644,616,40,15);line(c,674,605,693,625,'#c2b79d',4);return;
    }
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
  function detailedIsland(c,kind,t,ch){
    const loc=ch.location;
    const plate={storm_ship:['storm',0,0,1672,941],wreck_beach:['storm',250,105,1350,760],beacon_ridge:['cliff',0,0,1672,941],palm_shelter:['jungle',0,70,1672,871],freshwater_spring:['jungle',0,0,1672,941],night_camp:['night',0,0,1672,941],coral_lagoon:['coral',0,0,1672,941],jungle_path:['jungle',350,0,1322,744],raincatch_cliff:['jungle',210,0,1462,823],tempest_coast:['storm',260,0,1412,794],cookfire_shore:['night',170,0,1502,845],radio_ridge:['cliff',250,0,1422,799],search_horizon:['rescue',230,0,1442,811],rescue_cove:['rescue',0,0,1672,941]}[loc];
    if(plate&&BACKGROUNDS[plate[0]]){
      const [key,sx0,sy,sw,sh]=plate,pan=Math.sin(t*.13)*Math.min(14,1672-sw);c.drawImage(BACKGROUNDS[key],Math.max(0,sx0+pan),sy,sw,sh,0,0,W,H);
      if(loc==='tempest_coast'||loc==='storm_ship')for(let i=0;i<36;i++){let x=(i*53+Math.floor(t*112))%W,y=(i*71+Math.floor(t*79))%H;line(c,x,y,x-9,y+20,'rgba(226,236,239,.43)',2)}
      if(loc==='freshwater_spring')for(let i=0;i<13;i++){let x=660+(i*17)%112,y=(i*31+Math.floor(t*18))%H;line(c,x,y,x+2,y+20,'rgba(231,251,246,.5)',2)}
      if(loc==='coral_lagoon')for(let i=0;i<11;i++){let x=(i*137+Math.floor(t*12))%W,y=430+(i*31)%180;c.beginPath();c.arc(x,y,2+(i%3),0,6.28);c.fillStyle='rgba(226,255,237,.55)';c.fill()}
      if(loc==='cookfire_shore'){c.fillStyle='rgba(228,106,48,.12)';c.fillRect(0,0,W,H)}
      if(loc==='search_horizon'){c.fillStyle='rgba(56,77,92,.16)';c.fillRect(0,0,W,H)}
      return;
    }
    const sets={
      storm_ship:['#19293b','#58697b','#234c60','#4c4844'],wreck_beach:['#3e596c','#da9b6d','#476c73','#c99b6b'],beacon_ridge:['#39566a','#ddb082','#3c7075','#8f806b'],rocky_coast:['#293d52','#a67968','#2c5262','#756456'],palm_shelter:['#376174','#e4a471','#28727a','#cda06e'],freshwater_spring:['#345165','#8dc0bb','#2d7780','#92846c'],night_camp:['#121f35','#5c5870','#21495b','#4b3f36'],coral_lagoon:['#3e8190','#e5c196','#48a6a1','#e1b67f'],medical_cove:['#182a32','#63817f','#2f6062','#655244'],signal_sand:['#48667b','#edb47e','#477d87','#d9ad79'],jungle_path:['#1f4850','#bd9672','#28676c','#75644b'],raincatch_cliff:['#384e61','#929696','#335968','#61594e'],tempest_coast:['#172433','#515d6b','#1c4558','#655849'],driftwood_bay:['#465260','#a47b69','#3a5a60','#907559'],cookfire_shore:['#313c57','#dc8758','#255a63','#ba8055'],radio_ridge:['#26344e','#b97863','#315364','#7e705d'],cave_countdown:['#151d25','#677781','#2a4c57','#493d34'],search_horizon:['#4a6174','#ecc18b','#44818a','#c6a071'],rescue_cove:['#598094','#f1c68b','#43a0a0','#d7b17d']};
    const p=sets[loc]||sets.wreck_beach,sky=c.createLinearGradient(0,0,0,390);sky.addColorStop(0,p[0]);sky.addColorStop(.67,p[1]);sky.addColorStop(1,'#efd6aa');c.fillStyle=sky;c.fillRect(0,0,W,390);
    if(loc==='night_camp'||loc==='cave_countdown'){c.fillStyle='rgba(12,20,38,.45)';c.fillRect(0,0,W,390);for(let i=0;i<38;i++){let x=(i*193+55)%W,y=(i*71+28)%270;c.fillStyle='rgba(255,238,190,.68)';c.beginPath();c.arc(x,y,1+(i%2),0,6.28);c.fill()}c.beginPath();c.arc(1080,100,35,0,6.28);c.fillStyle='#f2d8a0';c.fill()}
    for(const [x,y,s] of [[85,92,.7],[420,137,.62],[1030,79,.84]])cloud(c,(x+t*2)%1370,y,s,loc.includes('storm')?.52:.29);
    const sea=c.createLinearGradient(0,300,0,450);sea.addColorStop(0,p[2]);sea.addColorStop(1,loc==='coral_lagoon'?'#56b9ad':'#254854');c.fillStyle=sea;c.fillRect(0,301,W,152);
    // distant headlands vary by location; no repeated skyline or same beach plate
    if(['beacon_ridge','rocky_coast','radio_ridge','cave_countdown','medical_cove'].includes(loc))poly(c,[[0,345],[90,222],[180,321],[306,180],[410,327],[545,238],[660,345],[790,198],[920,330],[1060,228],[1180,340],[1280,250],[1280,430],[0,430]],loc==='cave_countdown'?'#344449':'#435e61');
    else poly(c,[[0,342],[110,279],[225,330],[355,265],[495,337],[650,283],[803,337],[940,270],[1100,331],[1210,280],[1280,320],[1280,425],[0,425]],loc==='night_camp'?'#263a3d':'#5e7770');
    for(let i=0;i<12;i++){let y=321+i*9,x=((i*139+Math.floor(t*(loc.includes('storm')?26:8)))%1500)-100,amp=loc.includes('storm')?5:2;line(c,x,y,x+100,y+Math.sin(t*2+i)*amp,'rgba(223,235,220,.35)',loc.includes('storm')?3:2)}
    const sand=p[3];poly(c,[[0,430],[100,416],[234,421],[355,397],[485,402],[630,415],[755,408],[890,390],[1020,399],[1160,409],[1280,418],[1280,720],[0,720]],sand);
    // distinct terrain silhouettes / set dressing
    if(['beacon_ridge','radio_ridge','rocky_coast','medical_cove','cave_countdown'].includes(loc))poly(c,[[0,431],[70,379],[150,348],[245,385],[330,425],[330,720],[0,720]],loc==='medical_cove'||loc==='cave_countdown'?'#3d4140':'#66594a');
    if(['palm_shelter','wreck_beach','freshwater_spring','night_camp','coral_lagoon','signal_sand','jungle_path','driftwood_bay','cookfire_shore','rescue_cove'].includes(loc)){
      // wind-shaped palms and broad tropical foliage, with location-specific density
      const density=loc==='jungle_path'?8:loc==='palm_shelter'?5:3;for(let i=0;i<density;i++){let x=80+i*(loc==='jungle_path'?150:280),base=425,h=110+(i*31)%70;line(c,x,base,x+12,base-h,'#554736',loc==='jungle_path'?10:8);for(let k=0;k<6;k++){let a=-2.9+k*.48;c.beginPath();c.ellipse(x+12+Math.cos(a)*39,base-h+Math.sin(a)*23,37,7,a,0,6.28);c.fillStyle=loc==='jungle_path'?['#345345','#456b4d','#5d784c'][k%3]:'#48654a';c.fill()}}}
    // location-specific foreground landmarks and readable silhouettes
    if(loc==='storm_ship'){
      poly(c,[[0,386],[160,335],[305,405],[470,348],[635,420],[810,350],[980,418],[1160,345],[1280,397],[1280,445],[0,445]],'#254b5e');
      poly(c,[[526,414],[790,414],[845,393],[793,384],[716,399],[635,387]],'#453a32','#202427');rr(c,687,365,58,30,3,'#b59a72','#302e2a',3);line(c,730,393,787,335,'#554a3a',5);
      for(let i=0;i<5;i++){let x=600+i*56,y=414-i*11;c.beginPath();c.arc(x,y,16+Math.sin(t*6+i)*5,0,6.28);c.fillStyle='rgba(215,235,230,.32)';c.fill()}for(let i=0;i<50;i++){let x=(i*41+Math.floor(t*120))%W,y=(i*67+Math.floor(t*70))%410;line(c,x,y,x-13,y+27,'rgba(215,222,221,.38)',2)}
    }else if(loc==='wreck_beach'){
      poly(c,[[755,423],[925,423],[958,408],[860,399],[800,405]],'#594335','#322c26');rr(c,796,374,46,29,3,'#ac8960','#44382c',3);rr(c,877,388,51,35,5,'#9c794f','#43382d',3);line(c,40,426,128,413,'#79644a',10);
    }else if(loc==='beacon_ridge'){
      poly(c,[[0,421],[86,370],[200,387],[320,426],[320,720],[0,720]],'#645b4c');line(c,192,373,192,261,'#453b32',7);rr(c,175,245,35,27,4,'#e3d3a4','#44382d',3);let b=35+18*Math.sin(t*8);c.fillStyle=`rgba(255,242,173,.${Math.floor(b)})`;c.beginPath();c.moveTo(192,258);c.lineTo(350,210);c.lineTo(350,300);c.closePath();c.fill();
    }else if(loc==='rocky_coast'){
      poly(c,[[0,434],[115,380],[190,298],[268,374],[337,425],[337,720],[0,720]],'#66594c');poly(c,[[990,433],[1068,356],[1158,332],[1212,393],[1280,405],[1280,720],[990,720]],'#716050');
    }else if(loc==='palm_shelter'){
      poly(c,[[373,416],[458,329],[580,347],[675,416]],'#8c6648','#45382c');line(c,392,413,657,413,'#574334',7);for(let x=403;x<650;x+=31)line(c,x,391,x,414,'#d0b98e',2);
    }else if(loc==='freshwater_spring'){
      poly(c,[[0,430],[0,180],[100,152],[181,236],[253,335],[280,432]],'#5a594e');c.fillStyle='#b5d8d2';c.fillRect(170,230,35,178);c.fillStyle='rgba(216,248,241,.6)';c.fillRect(181,230,8,178);c.fillStyle='#4ba1a0';c.beginPath();c.ellipse(210,421,115,18,0,0,6.28);c.fill();
    }else if(loc==='night_camp'){
      poly(c,[[0,429],[285,430],[317,358],[463,328],[595,417],[810,427],[1280,421],[1280,720],[0,720]],'#4c4339');poly(c,[[730,421],[810,353],[910,366],[974,421]],'#8c6546','#3b3028');line(c,741,419,960,419,'#48382b',5);for(let i=0;i<16;i++){let x=(i*53+Math.floor(t*7))%W,y=370+(i*39)%270;c.fillStyle='rgba(231,164,89,.25)';c.beginPath();c.arc(x,y,2,0,6.28);c.fill()}
    }else if(loc==='coral_lagoon'){
      c.fillStyle='rgba(61,190,175,.24)';c.fillRect(0,350,W,98);for(let i=0;i<12;i++){let x=i*112+35;c.strokeStyle=['#dd7860','#d7a44c','#905d7d'][i%3];c.lineWidth=9;c.beginPath();c.moveTo(x,425);c.lineTo(x,387-i%3*9);c.lineTo(x-13,372-i%3*9);c.moveTo(x,400);c.lineTo(x+16,384);c.stroke()}for(let i=0;i<6;i++){let x=(i*197+Math.floor(t*20))%W,y=365+(i*13)%45;c.beginPath();c.ellipse(x,y,11,5,0,0,6.28);c.fillStyle='#e8d096';c.fill()}
    }else if(loc==='medical_cove'){
      c.fillStyle='rgba(13,24,27,.65)';c.beginPath();c.moveTo(0,0);c.lineTo(1280,0);c.lineTo(1280,380);c.quadraticCurveTo(1050,245,860,328);c.quadraticCurveTo(600,400,400,316);c.quadraticCurveTo(200,248,0,377);c.closePath();c.fill();rr(c,880,341,18,60,4,'#ffcb6b');c.fillStyle='rgba(255,197,93,.18)';c.beginPath();c.arc(888,354,64,0,6.28);c.fill();
    }else if(loc==='signal_sand'){
      c.save();c.translate(642,454);c.rotate(-.04);c.font='900 98px Rubik';c.textAlign='center';c.fillStyle='#eee2c5';c.strokeStyle='#7c644a';c.lineWidth=6;c.strokeText('SOS',0,0);c.fillText('SOS',0,0);c.restore();
    }else if(loc==='jungle_path'){
      for(let i=0;i<11;i++){let x=i*130-20,h=230+(i*47)%170;line(c,x,422,x+((i%3)-1)*33,420-h,'#443b2c',14);for(let j=0;j<6;j++){c.beginPath();c.ellipse(x-20+j*21,255+(i*23)%100,42,20,(j-2)*.19,0,6.28);c.fillStyle=['#315541','#47714d','#67814e'][Math.abs(i+j)%3];c.fill()}}poly(c,[[446,435],[545,334],[632,334],[730,435]],'#bd9866');
    }else if(loc==='raincatch_cliff'){
      poly(c,[[0,433],[0,150],[78,98],[223,130],[332,213],[370,432]],'#4f5551');line(c,388,338,710,355,'#d8c7a0',7);line(c,388,339,388,420,'#d8c7a0',5);line(c,710,355,710,420,'#d8c7a0',5);for(let i=0;i<9;i++){let x=440+i*24,y=355+Math.sin(t*4+i)*4;line(c,x,y,x+4,y+18,'#92d2d0',2)}
    }else if(loc==='tempest_coast'){
      c.fillStyle='rgba(21,29,38,.52)';c.fillRect(0,0,W,445);for(let j=0;j<3;j++){let y=385+j*24;c.beginPath();c.moveTo(0,y);for(let x=0;x<=W;x+=50)c.lineTo(x,y+Math.sin(x*.023+t*4+j)*17);c.lineTo(W,445);c.lineTo(0,445);c.closePath();c.fillStyle=['#294b59','#315765','#3b6670'][j];c.fill()}for(let i=0;i<45;i++){let x=(i*51+Math.floor(t*155))%W,y=(i*79+Math.floor(t*90))%420;line(c,x,y,x-12,y+25,'rgba(221,228,223,.43)',2)}
    }else if(loc==='driftwood_bay'){
      for(let i=0;i<6;i++){let x=130+i*185,y=412-i%2*14;line(c,x,y,x+86,y-20,'#694c37',12);line(c,x+26,y-6,x+22,y-57,'#594330',7);line(c,x+51,y-10,x+70,y-47,'#594330',6)}
    }else if(loc==='cookfire_shore'){
      for(let i=0;i<3;i++)line(c,720+i*22,413,796+i*15,407,'#544231',6);line(c,757,411,757,341,'#4a3b2d',4);line(c,757,342,714,412,'#4a3b2d',4);line(c,757,342,801,412,'#4a3b2d',4);rr(c,738,365,40,27,8,'#51463a','#292725',3);let f=22+Math.sin(t*8)*5;poly(c,[[718,411],[730,411-f],[741,411]],'#f09242');poly(c,[[746,412],[756,412-f-4],[768,412]],'#ffd16b');
    }else if(loc==='radio_ridge'){
      poly(c,[[0,432],[125,401],[250,345],[383,402],[520,432],[520,720],[0,720]],'#625b50');line(c,310,351,310,242,'#3b3731',7);line(c,275,255,345,255,'#3b3731',5);line(c,287,278,333,278,'#3b3731',4);rr(c,260,339,62,46,5,'#65685d','#34332d',3);for(let i=0;i<4;i++){c.fillStyle=i===2?'#e9ba68':'#92b5ae';c.beginPath();c.arc(275+i*13,359,3,0,6.28);c.fill()}
    }else if(loc==='cave_countdown'){
      c.fillStyle='rgba(10,16,20,.82)';c.beginPath();c.moveTo(0,0);c.lineTo(1280,0);c.lineTo(1280,720);c.lineTo(1125,720);c.quadraticCurveTo(1010,470,945,330);c.quadraticCurveTo(640,115,337,330);c.quadraticCurveTo(205,520,125,720);c.lineTo(0,720);c.closePath();c.fill();rr(c,850,354,138,83,4,'#ddcfaf','#302c27',3);label(c,'ДЕНЬ 90',919,405,24,'#9b4937','900','center');
    }else if(loc==='search_horizon'){
      poly(c,[[0,427],[85,398],[180,388],[290,423],[290,720],[0,720]],'#6d6050');poly(c,[[862,346],[1034,346],[1010,370],[891,370]],'#c9c2ac','#373a3b');rr(c,920,317,69,30,4,'#d1c9b7','#39383a',3);for(let i=0;i<5;i++){let x=(i*187+Math.floor(t*20))%W,y=150+(i*47)%90;c.beginPath();c.moveTo(x,y);c.lineTo(x+20,y+4);c.lineTo(x,y+8);c.lineTo(x-20,y+4);c.closePath();c.fillStyle='#343c45';c.fill();line(c,x-18,y+4,x+18,y+4,'#343c45',2)}
    }else if(loc==='rescue_cove'){
      poly(c,[[778,395],[1080,395],[1038,427],[819,427]],'#e5dfca','#34363b',4);rr(c,858,348,154,49,5,'#e7e0cb','#34363b',4);for(let x=874;x<996;x+=29)rr(c,x,359,22,22,3,'#547185','#292d32',2);line(c,927,348,927,330,'#30343a',4);line(c,888,330,968,330,'#30343a',4);c.fillStyle='rgba(255,232,179,.22)';c.beginPath();c.arc(910,330,92,0,6.28);c.fill();
    }
    // Color-grain and highlights give each plate an illustrated, less sterile finish.
    for(let i=0;i<40;i++){let x=(i*229+17)%W,y=440+(i*97)%250;c.fillStyle=i%2?'rgba(255,230,185,.11)':'rgba(50,39,30,.10)';c.beginPath();c.arc(x,y,1+(i%3),0,6.28);c.fill()}
  }
  function islandGround(c,kind,t,ch){if(ch&&ch.location){detailedIsland(c,kind,t,ch);return}
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
  function ground(c,kind,t,ch){if(ISLAND.has(kind)){islandGround(c,kind,t,ch);return}let horizon=411;let sky=c.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,kind==='impact'?'#34364a':'#586276');sky.addColorStop(.68,kind==='impact'?'#a45c43':'#927c72');sky.addColorStop(1,'#d29a69');c.fillStyle=sky;c.fillRect(0,0,W,horizon);
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
  function draw(ctx,t,data){let ch=data.chapters.find(c=>t>=c.start&&t<c.end)||data.chapters[data.chapters.length-1],kind=ch.kind||'city',local=t-ch.start,isIsland=ISLAND.has(kind);ctx.save();let shake=kind==='impact'?Math.sin(t*24)*5:0;ctx.translate(Math.sin(t*.17)*2+shake,Math.cos(t*.11)*1.1);ground(ctx,kind,t,ch);if(isIsland)islandAction(ctx,kind,t,local,ch);else if(['city','map','valley','farm','build','warning','countdown'].includes(kind))person(ctx,480+Math.sin(local*.35)*125,422,1.1,t,false);else person(ctx,600+Math.sin(local*.28)*95,655,.85,t,true);hud(ctx,ch);
    if(t<4){ctx.save();ctx.fillStyle='rgba(20,21,29,.20)';ctx.fillRect(0,0,W,H);ctx.font='900 58px Rubik';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=12;ctx.lineJoin='round';ctx.strokeStyle='#171617';const title=isIsland?'100 ДНЕЙ ДО СПАСЕНИЯ':'ЧЕРЕЗ ГОД';ctx.strokeText(title,W/2,232);ctx.fillStyle='#fff';ctx.fillText(title,W/2,232);ctx.restore()}
    // controlled cinematic vignette and dust; deterministic seed avoids frame flicker
    const vg=ctx.createRadialGradient(W/2,H/2,240,W/2,H/2,800);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(18,15,17,.30)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
    const bot=ctx.createLinearGradient(0,H-145,0,H);bot.addColorStop(0,'rgba(25,18,16,0)');bot.addColorStop(1,'rgba(22,16,14,.52)');ctx.fillStyle=bot;ctx.fillRect(0,H-150,W,150);captions(ctx,t,data);ctx.restore()}
  root.SurvivalEngine={W,H,draw,setBackground:(name,image)=>{BACKGROUNDS[name]=image}};
})(typeof globalThis!=='undefined'?globalThis:this);
