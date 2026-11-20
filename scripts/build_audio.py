#!/usr/bin/env python3
"""Make the narration master, procedural score, and word-level chapter timeline."""
import os, re, json, math, subprocess
from pathlib import Path
import numpy as np
from scipy.io import wavfile
ROOT=Path(__file__).resolve().parents[1]; PROJECT=os.getenv('PROJECT','main'); SUBDIR={'island':'island','pizzeria':'pizzeria','pizzeria2':'pizzeria2'}.get(PROJECT,''); BASE=ROOT/'public'/SUBDIR; A=BASE/'audio'; A.mkdir(parents=True,exist_ok=True); FFMPEG=str(ROOT/'.venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v9.0.2')
STORY={'island':'island_story.json','pizzeria':'pizzeria_story.json','pizzeria2':'pizzeria2_story.json'}.get(PROJECT,'story.json')
SCRIPT=json.load(open(ROOT/'scripts'/STORY,encoding='utf-8'))

def run(args): subprocess.run(args,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
def syllables(word):
    w=re.sub(r'[^а-яёА-ЯЁ]','',word.lower()); v='аеёиоуыэюя'; return max(1,sum(ch in v for ch in w))
def main():
    wavs=[]; durations=[]; tempo=.82 if PROJECT=='pizzeria2' else .95 if PROJECT=='pizzeria' else 1.0 if PROJECT=='island' else 1.2
    for i in range(len(SCRIPT)): 
        src=A/f'clip_{i+1:02d}.mp3'; out=A/f'_fast_{i+1:02d}.wav'
        if not src.exists(): raise FileNotFoundError(f'Missing narration clip {src.name}; synthesize clips 01–{len(SCRIPT):02d} with the selected voice first.')
        run([FFMPEG,'-y','-i',str(src),'-af',f'atempo={tempo},aresample=44100','-ac','2','-ar','44100','-c:a','pcm_s16le',str(out)])
        rate,data=wavfile.read(out); dur=len(data)/rate; wavs.append((out,data));durations.append(dur)
    words=[]; chapters=[]; cursor=0
    for i,(item,(_,audio),dur) in enumerate(zip(SCRIPT,wavs,durations)):
        sentence=item['text']; parts=re.findall(r'\S+',sentence); weights=np.array([syllables(p)*(1.24 if p.endswith(('.', '!', '?', '…')) else 1.0)*(1.12 if p.endswith((',', ';', ':')) else 1.0) for p in parts],float)
        # Slight silence buffers before clauses; spread speaking over the measured audio extent.
        available=max(.1,dur-.16); spans=available*weights/weights.sum(); st=cursor+.055
        for p,span in zip(parts,spans):
            words.append({'text':p,'start':round(st,3),'end':round(st+span,3),'segment':i});st+=span
        chapters.append({'index':i,'start':round(cursor,3),'end':round(cursor+dur,3),'title':item['place'],'day':item['day'],'money':item.get('money',item.get('metric','')),'metricLabel':item.get('metricLabel','БЮДЖЕТ'),'location':item.get('location',''),'audio':f'clip_{i+1:02d}.mp3','text':sentence,'kind':item['kind']})
        cursor+=dur+.12
    total=cursor-.12
    # Assemble PCM narration with tiny interchapter breath gaps.
    silence=np.zeros((int(.12*44100),2),dtype=np.int16); chunks=[]
    for _,d in wavs: chunks.extend([d.astype(np.int16),silence])
    narration=np.concatenate(chunks[:-1],axis=0); wavfile.write(A/'_narration.wav',44100,narration)
    n=int(total*44100); t=np.arange(n)/44100; rng=np.random.default_rng(773); noise=rng.normal(0,1,n).astype(np.float32)
    from scipy.signal import butter,sosfilt
    if PROJECT in ('pizzeria','pizzeria2'):
        # Warm, restrained four-chord pulse that builds through the rush and resolves at closing.
        chords=np.array([220.00,196.00,174.61,261.63]); root=chords[(t//8).astype(np.int32)%len(chords)]
        music=.018*np.sin(2*np.pi*root*t)+.011*np.sin(2*np.pi*root*1.5*t)+.009*np.sin(2*np.pi*root*2*t)
        beat=(np.maximum(0,np.sin(2*np.pi*t*.72))**8)*(.008+.006*np.sin(2*np.pi*t/38))
        music+=beat*np.sin(2*np.pi*root*.5*t)
        room=sosfilt(butter(2,1300,fs=44100,output='sos'),noise);music+=.006*room
    else:
        # Earthy suspense underscore with soft evolving low drone, sparse ticking.
        low=sosfilt(butter(3,150,fs=44100,output='sos'),noise)
        music=.075*low + .025*np.sin(2*np.pi*(42+2*np.sin(2*np.pi*t/29))*t) + .018*np.sin(2*np.pi*55*t)
        pulse=(np.maximum(0,np.sin(2*np.pi*t*.48))**16)*(.012+.015*np.sin(2*np.pi*t/42))
        music+=pulse*np.sin(2*np.pi*82*t)
        airy=sosfilt(butter(2,900,fs=44100,output='sos'),noise); music+=.018*airy
    fx=np.zeros(n,dtype=np.float32)
    def add_burst(at,length,amount,kind='noise',freq=80):
        a=int(at*44100); z=min(n,a+int(length*44100));
        if a>=n:return
        q=np.arange(z-a)/44100; env=np.exp(-q*3)*np.minimum(1,q*12)
        if kind=='tone': sig=np.sin(2*np.pi*(freq*q+18*q*q))
        else: sig=sosfilt(butter(2,min(freq,12000),fs=44100,output='sos'),rng.normal(0,1,z-a))
        fx[a:z]+=amount*env*sig
    for ch in chapters:
        st=ch['start']; kind=ch['kind'].removeprefix('island_')
        if PROJECT in ('pizzeria','pizzeria2') and kind.startswith('pizzeria2_'):
            relative=st/max(total,1)
            # Restrained restaurant ambience cues follow the visible actions.
            if kind in ('pizzeria2_hook','pizzeria2_reply'):
                for q in range(3):add_burst(st+.45+q*.65,.14,.045,'tone',1700)
            elif kind in ('pizzeria2_open','pizzeria2_setup'):
                add_burst(st+1,.10,.045,'tone',1300);add_burst(st+5,.5,.035,'noise',950)
            elif kind=='pizzeria2_audit':
                for q in range(4):add_burst(st+3+q*4,.08,.04,'noise',2100)
            elif kind=='pizzeria2_order':
                add_burst(st+2,.12,.05,'noise',1800);add_burst(st+8,.35,.045,'noise',1100)
            elif kind=='pizzeria2_bake':
                add_burst(st+8,.22,.04,'noise',800);add_burst(st+20,.18,.05,'tone',1250)
            elif kind=='pizzeria2_rush':
                for q in (3,10,18,27,38):add_burst(st+q,.16,.045,'tone',1550)
            elif kind=='pizzeria2_montage':
                for q in range(6):add_burst(st+3+q*5,.12,.025,'noise',1400)
            elif kind=='pizzeria2_cliffhanger':
                for q in range(3):add_burst(st+2+q*.7,.16,.05,'tone',1600)
            continue
        if PROJECT=='pizzeria' and kind.startswith('pizzeria_'):
            if kind=='pizzeria_hook':
                for q in range(3):add_burst(st+.5+q*.55,.16,.05,'tone',1700)
            elif kind=='pizzeria_morning':add_burst(st+.1,1.5,.035,'tone',880)
            elif kind=='pizzeria_open':
                add_burst(st+2,.08,.055,'tone',1350);add_burst(st+8,.15,.035,'noise',2200)
            elif kind=='pizzeria_dough':
                for q in range(4):add_burst(st+8+q*5,.35,.035,'noise',1500)
            elif kind=='pizzeria_station':
                for q in range(5):add_burst(st+5+q*6,.08,.035,'noise',2400)
            elif kind=='pizzeria_ticket':
                add_burst(st+1,.12,.05,'tone',1800);add_burst(st+11,.12,.04,'noise',2200)
            elif kind=='pizzeria_rush':
                for q in (3,13,24,34,43):add_burst(st+q,.18,.055,'tone',1600)
            elif kind=='pizzeria_break':add_burst(st+4,.22,.03,'tone',1100)
            elif kind=='pizzeria_oven_issue':
                add_burst(st+4,.16,.06,'tone',1450);add_burst(st+15,.18,.05,'tone',1550)
            elif kind=='pizzeria_close':
                for q in range(7):add_burst(st+5+q*5,.24,.028,'noise',1200)
                add_burst(st+42,.08,.05,'tone',700)
            continue
        if kind=='map':
            for q in range(8):add_burst(st+5+q*.55,.12,.045,'noise',2100)
        elif kind=='build':
            for q in range(6):add_burst(st+6+q*1.4,.3,.05,'noise',650)
        elif kind=='power':
            for q in range(6):add_burst(st+7+q*.9,.035,.08,'tone',1800)
        elif kind=='water': add_burst(st+8,10,.045,'tone',95)
        elif kind=='impact':
            add_burst(st+10,8,.22,'tone',39);add_burst(st+12,6,.12,'noise',150)
        elif kind=='after':
            for q in range(16):add_burst(st+8+q*.52,.06,.05,'tone',1650)
        elif kind in ('wreck','storm'):
            add_burst(st+2,7,.10,'tone',kind=='wreck' and 58 or 42);add_burst(st+5,6,.10,'noise',420)
        elif kind=='fire':
            for q in range(12):add_burst(st+4+q*.6,.08,.035,'noise',2400)
        elif kind=='rescue':
            for q in range(8):add_burst(st+10+q*.55,.08,.06,'tone',1300)
    mix=np.clip(music+fx,-.78,.78); stereo=np.column_stack((mix,mix*.94)).astype(np.float32); wavfile.write(A/'_score.wav',44100,stereo)
    run([FFMPEG,'-y','-i',str(A/'_narration.wav'),'-i',str(A/'_score.wav'),'-filter_complex','[0:a]volume=1.0[n];[1:a]volume=0.62[m];[n][m]amix=inputs=2:duration=first:dropout_transition=2,alimiter=limit=0.92[out]','-map','[out]','-ar','44100','-ac','2','-c:a','pcm_s16le',str(A/'master.wav')])
    run([FFMPEG,'-y','-i',str(A/'master.wav'),'-codec:a','libmp3lame','-b:a','192k',str(A/'master.mp3')])
    if PROJECT=='pizzeria':run([FFMPEG,'-y','-i',str(A/'_narration.wav'),'-codec:a','libmp3lame','-b:a','192k',str(A/'voiceover.mp3')])
    width,height=(3840,2160) if PROJECT in ('pizzeria','pizzeria2') else (1920,1080)
    json.dump({'width':width,'height':height,'fps':30,'duration':round(total,3),'chapters':chapters,'words':words},open(BASE/'timeline.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
    print(f'Created {len(words)} word cues, {len(chapters)} chapters, {total:.2f}s master')
if __name__=='__main__':main()
