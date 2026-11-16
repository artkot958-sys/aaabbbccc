const fs=require('fs'),{spawn}=require('child_process');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const root=__dirname+'/..';
for(const [name,file] of [['Rubik',`${root}/assets/fonts/Rubik.ttf`],['Rubik',`${root}/assets/fonts/Rubik-Bold.ttf`],['Rubik',`${root}/assets/fonts/Rubik-Black.ttf`]]) GlobalFonts.registerFromPath(file,name);
require('../public/engine.js');const timeline=JSON.parse(fs.readFileSync(`${root}/public/timeline.json`));
const {W,H,draw}=global.SurvivalEngine, fps=30, frames=Math.ceil(timeline.duration*fps),canvas=createCanvas(W,H),ctx=canvas.getContext('2d');
const ffmpeg=`${root}/.venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v9.0.2`;
const out=`${root}/public/video.mp4`;
const args=['-y','-hide_banner','-loglevel','error','-f','rawvideo','-pixel_format','rgba','-video_size',`${W}x${H}`,'-framerate',String(fps),'-i','pipe:0','-i',`${root}/public/audio/master.wav`,'-vf','scale=1920:1080:flags=lanczos','-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest',out];
const p=spawn(ffmpeg,args,{stdio:['pipe','ignore','inherit']});p.stdin.setMaxListeners(0);p.setMaxListeners(0);let i=0;
function write(buf){return new Promise((resolve,reject)=>{if(p.stdin.write(buf))resolve();else{p.stdin.once('drain',resolve);p.once('error',reject)}})}
(async()=>{try{for(;i<frames;i++){draw(ctx,i/fps,timeline);await write(Buffer.from(ctx.getImageData(0,0,W,H).data.buffer));if(i%900===0)console.log(`Rendered ${i}/${frames} frames`)}p.stdin.end();p.on('close',code=>{if(code!==0)process.exitCode=code;else console.log(`Wrote ${out} (${frames} frames)`)});}catch(e){console.error(e);p.kill();process.exit(1)}})();
