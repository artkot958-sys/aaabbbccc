#!/usr/bin/env python3
"""Make the narration master, procedural score, and word-level chapter timeline."""
import os, re, json, math, subprocess
from pathlib import Path
import numpy as np
from scipy.io import wavfile
ROOT=Path(__file__).resolve().parents[1]; A=ROOT/'public/audio'; FFMPEG=str(ROOT/'.venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v9.0.2')
DATA=[
('МЕГАПОЛИС • ИНСАЙД','ДЕНЬ 1 / 365','$10,000,000','Ты просыпаешься утром, смотришь в телефон и видишь на счёте десять миллионов долларов. Рядом короткое сообщение: ровно через триста шестьдесят пять дней начнётся глобальная ядерная война. Первая ошибка — купить яхту. Без топлива и запчастей океан быстро станет ловушкой.'),
('КАРТА ВЕТРОВ • РАЗВЕДКА','ДЕНЬ 12 / 365','$9,900,000','Первые две недели ты не тратишь почти ничего и изучаешь карты ветров и военных баз. Секрет выживания — не стены, а география. Ты избегаешь мегаполисов и ракетных шахт, находя тихую долину в горах, вдали от розы радиоактивных осадков.'),
('ПРЕДГОРЬЯ • ЭКОФЕРМА','ДЕНЬ 35 / 365','$8,700,000','За миллион двести тысяч ты покупаешь глухой участок в предгорьях под видом маленькой экофермы. Соседи ничего не должны заподозрить, иначе в день катастрофы они придут к твоим воротам. Первым делом ты буришь артезианскую скважину глубже ста метров, куда не дойдёт заражённая пыль.'),
('ГЛУБИНА 12 М • БЕТОН','ДЕНЬ 95 / 365','$4,500,000','На третий месяц начинается главная трата — четыре миллиона двести тысяч за монолитный бункер на глубине двенадцати метров. Готовые стальные капсулы из рекламы часто ржавеют и всплывают от грунтовых вод. Тебе нужен армированный бетон, способный выдержать сдвиг породы и ударную волну.'),
('ИНЖЕНЕРНЫЙ ОТСЕК','ДЕНЬ 160 / 365','$2,600,000','Почти два миллиона уходит на сердце убежища — воздух и энергию. Обычная вентиляция забьётся радиоактивным пеплом за пару часов, поэтому ты ставишь каскад угольных фильтров и клапаны избыточного давления. А запасную солнечную станцию прячешь в стальные ящики Фарадея от электромагнитного импульса.'),
('ГИДРОПОНИКА • СКЛАД','ДЕНЬ 220 / 365','$1,400,000','Ещё миллион двести тысяч ты вкладываешь в еду и медицину на десять лет вперёд. Одних консервов мало — без свежих витаминов начинается цинга и апатия, поэтому ты запускаешь закрытую гидропонику. Но главная ценность на складе — антибиотики, стоматологический набор и чистые семена.'),
('КОМАНДА ВЫЖИВАНИЯ','ДЕНЬ 285 / 365','$400,000','К десятому месяцу ты понимаешь: в одиночку под землёй человек сходит с ума уже через полгода. Но нанимать вооружённую охрану за деньги смертельно опасно — после падения доллара оружие повернётся против тебя. Ты приглашаешь трёх проверенных друзей с семьями: хирурга, инженера и агронома.'),
('ПОСЛЕДНЯЯ НЕДЕЛЯ','ДЕНЬ 355 / 365','$0','За десять дней до финала твой счёт обнуляется. Остаток денег ты меняешь не на золото, которое нельзя съесть, а на запчасти, фильтры, бумажные книги и простые инструменты. В городах всё ещё работают кафе, но в новостях уже говорят о военной блокаде. Твоя группа тихо уходит на ферму.'),
('ЧАС ИКС • УДАРНАЯ ВОЛНА','ДЕНЬ 365 / 365','$0','День триста шестьдесят пятый. В четыре утра пропадает связь и гаснет внешняя сеть. Вы запираете трёхтонную гермодверь за двадцать минут до первой вспышки на горизонте. Через минуту земля глухо вздрагивает от далёкой ударной волны, а датчики наверху фиксируют начало чёрного пеплопада.'),
('ЯДЕРНЫЕ СУМЕРКИ','ДЕНЬ 380 / 365','$0','Проходит две недели тишины. По правилу семи к десяти уровень радиации на поверхности уже упал в сто раз, но впереди долгие месяцы холодных сумерек и отравленных дождей. Твои десять миллионов исчезли вместе со старым миром, но под двенадцатью метрами бетона горит тёплый свет, растёт зелень и продолжается жизнь.')]

def run(args): subprocess.run(args,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
def syllables(word):
    w=re.sub(r'[^а-яёА-ЯЁ]','',word.lower()); v='аеёиоуыэюя'; return max(1,sum(ch in v for ch in w))
def main():
    wavs=[]; durations=[]
    for i in range(10):
        src=A/f'clip_{i+1:02d}.mp3'; out=A/f'_fast_{i+1:02d}.wav'
        run([FFMPEG,'-y','-i',str(src),'-af','atempo=1.2,aresample=44100','-ac','2','-ar','44100','-c:a','pcm_s16le',str(out)])
        rate,data=wavfile.read(out); dur=len(data)/rate; wavs.append((out,data));durations.append(dur)
    words=[]; chapters=[]; cursor=0
    for i,((place,day,money,sentence),(_,audio),dur) in enumerate(zip(DATA,wavs,durations)):
        parts=re.findall(r'\S+',sentence); weights=np.array([syllables(p)*(1.24 if p.endswith(('.', '!', '?', '…')) else 1.0)*(1.12 if p.endswith((',', ';', ':')) else 1.0) for p in parts],float)
        # Slight silence buffers before clauses; spread speaking over the measured audio extent.
        available=max(.1,dur-.16); spans=available*weights/weights.sum(); st=cursor+.055
        for p,span in zip(parts,spans):
            words.append({'text':p,'start':round(st,3),'end':round(st+span,3),'segment':i});st+=span
        chapters.append({'index':i,'start':round(cursor,3),'end':round(cursor+dur,3),'title':place,'day':day,'money':money,'audio':f'clip_{i+1:02d}.mp3','text':sentence})
        cursor+=dur+.12
    total=cursor-.12
    # Assemble PCM narration with tiny interchapter breath gaps.
    silence=np.zeros((int(.12*44100),2),dtype=np.int16); chunks=[]
    for _,d in wavs: chunks.extend([d.astype(np.int16),silence])
    narration=np.concatenate(chunks[:-1],axis=0); wavfile.write(A/'_narration.wav',44100,narration)
    # Earthy suspense underscore with soft evolving low drone, sparse ticking and scene-specific textures.
    n=int(total*44100); t=np.arange(n)/44100; rng=np.random.default_rng(773); noise=rng.normal(0,1,n).astype(np.float32)
    # low-pass noise, slow bass intervals and a restrained pulse
    from scipy.signal import butter,sosfilt
    low=sosfilt(butter(3,150,fs=44100,output='sos'),noise)
    music=.075*low + .025*np.sin(2*np.pi*(42+2*np.sin(2*np.pi*t/29))*t) + .018*np.sin(2*np.pi*55*t)
    pulse=(np.maximum(0,np.sin(2*np.pi*t*.48))**16)*(.012+.015*np.sin(2*np.pi*t/42))
    music+=pulse*np.sin(2*np.pi*82*t)
    # quiet wind-like texture and short, filtered event accents
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
        i=ch['index']; st=ch['start'];
        if i==1:
            for q in range(7):add_burst(st+2+q*.48,.22,.09,'noise',1800)
        if i==2:add_burst(st+8,8,.13,'tone',48)
        if i==3:
            add_burst(st+5,12,.12,'tone',38)
            for q in range(4):add_burst(st+7+q*.65,.32,.07,'noise',900)
        if i==4:
            for q in range(8):add_burst(st+4+q*.7,.17,.08,'noise',1400)
        if i==5:
            for q in range(5):add_burst(st+8+q*1.1,.035,.12,'tone',2200)
        if i==8:
            add_burst(st+12,8,.26,'tone',39); add_burst(st+14,5,.16,'noise',150)
        if i==9:
            for q in range(16):add_burst(st+8+q*.52,.06,.07,'tone',1650)
    mix=np.clip(music+fx,-.78,.78); stereo=np.column_stack((mix,mix*.94)).astype(np.float32); wavfile.write(A/'_score.wav',44100,stereo)
    run([FFMPEG,'-y','-i',str(A/'_narration.wav'),'-i',str(A/'_score.wav'),'-filter_complex','[0:a]volume=1.0[n];[1:a]volume=0.62[m];[n][m]amix=inputs=2:duration=first:dropout_transition=2,alimiter=limit=0.92[out]','-map','[out]','-ar','44100','-ac','2','-c:a','pcm_s16le',str(A/'master.wav')])
    run([FFMPEG,'-y','-i',str(A/'master.wav'),'-codec:a','libmp3lame','-b:a','192k',str(A/'master.mp3')])
    json.dump({'width':1920,'height':1080,'fps':30,'duration':round(total,3),'chapters':chapters,'words':words},open(ROOT/'public/timeline.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
    print(f'Created {len(words)} word cues, {len(chapters)} chapters, {total:.2f}s master')
if __name__=='__main__':main()
