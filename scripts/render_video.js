const fs=require('fs'),{spawn}=require('child_process');
const {createCanvas,GlobalFonts,loadImage}=require('@napi-rs/canvas');
const root=__dirname+'/..',island=process.env.PROJECT==='island',base=island?`${root}/public/island`:`${root}/public`;
for(const [name,file] of [['Rubik',`${root}/assets/fonts/Rubik.ttf`],['Rubik',`${root}/assets/fonts/Rubik-Bold.ttf`],['Rubik',`${root}/assets/fonts/Rubik-Black.ttf`]]) GlobalFonts.registerFromPath(file,name);
require('../public/engine.js');const engine=global.SurvivalEngine;
const ffmpeg=`${root}/.venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v9.0.2`;
(async()=>{
  try{
    if(island){for(const [name,file] of [['storm','storm-shipwreck.png'],['jungle','jungle-spring.png'],['rescue','rescue-dawn.png'],['night','night-camp.png'],['coral','coral-lagoon.png'],['cliff','cliff-signal.png']])engine.setBackground(name,await loadImage(`${base}/art/${file}`))}
    const timeline=JSON.parse(fs.readFileSync(`${base}/timeline.json`)),{W,H,draw}=engine,fps=30,frames=Math.ceil(timeline.duration*fps),canvas=createCanvas(W,H),ctx=canvas.getContext('2d'),out=`${base}/video.mp4`;
    const args=['-y','-hide_banner','-loglevel','error','-f','rawvideo','-pixel_format','rgba','-video_size',`${W}x${H}`,'-framerate',String(fps),'-i','pipe:0','-i',`${base}/audio/master.wav`,'-vf','scale=1920:1080:flags=lanczos','-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest',out];
    const p=spawn(ffmpeg,args,{stdio:['pipe','ignore','inherit']});p.stdin.setMaxListeners(0);p.setMaxListeners(0);let writeError=null;p.stdin.on('error',e=>{writeError=e});
    function write(buf){return new Promise((resolve,reject)=>{if(writeError)return reject(writeError);if(p.stdin.destroyed)return reject(new Error('FFmpeg input closed'));if(p.stdin.write(buf))resolve();else{p.stdin.once('drain',resolve);p.once('error',reject)}})}
    const done=new Promise((resolve,reject)=>{p.once('error',reject);p.once('close',code=>code===0?resolve():reject(new Error(`FFmpeg exited ${code}`)))});
    for(let i=0;i<frames;i++){draw(ctx,i/fps,timeline);await write(Buffer.from(ctx.getImageData(0,0,W,H).data.buffer));if(i%900===0)console.log(`Rendered ${i}/${frames} frames`)}
    p.stdin.end();await done;console.log(`Wrote ${out} (${frames} frames)`);
  }catch(e){console.error(e);process.exitCode=1}
})();
