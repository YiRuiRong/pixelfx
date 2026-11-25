#!/usr/bin/env python3
"""Render the three effect modules, then proof and package their actual transparent atlases.
Requires Node and Pillow. No character assets, browser, FFmpeg or Godot installation.
"""
import json
import os
import random
import subprocess
import zipfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'records' / 'ink-studies'
# id, title, plate, key frame, captions at frame (preview only; never baked into a sheet)
STUDIES = [
    ('water/white-horse-breaker', '白马拍岸', 'White horse breaker', '水势', 'WATER', 35,
     [(0,'贴地推浪','Swell'),(24,'浪尖见马','One half-step'),(39,'前蹄拍岸','Break'),(49,'一绺迟落','Last lock'),(57,'退作余波','Runout')]),
    ('lightning/thunder-under-ink', '墨池藏雷', 'Thunder under ink', '雷隙', 'FISSURE', 30,
     [(0,'一滴浓墨','Drop'),(10,'墨向外洇','Bleed'),(29,'留白成雷','Hold the cut'),(32,'两岸弹开','Recoil'),(47,'湿墨收干','Dry')]),
    ('arcane/empty-mountain-echo', '空山回钟', 'Empty mountain echo', '余音', 'ECHO', 33,
     [(0,'八滴悬墨','Suspension'),(16,'钟声向右','Outward'),(64,'回到寂静','Stillness'),(73,'弱响折返','Half-echo'),(107,'余音收尽','Silence')]),
]
PAPER = (243,239,226)
INK = (35,49,48)
MUTED = (88,101,91)
SEAL = (155,63,47)
RULE = (188,182,158)
PAD, GUTTER, CW, HEIGHT = 26, 18, 438, 370
WIDTH = PAD*2+CW*3+GUTTER*2
WIN = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts'
CJK = next((str(p) for p in [WIN/'simkai.ttf', WIN/'simsun.ttc', Path('/System/Library/Fonts/PingFang.ttc'), Path('/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc')] if p.is_file()), None)
LATIN = next((str(p) for p in [WIN/'consola.ttf', Path('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'), Path('/System/Library/Fonts/Menlo.ttc')] if p.is_file()), 'DejaVuSans.ttf')

def word(zh,en): return zh if CJK else en

def font(size, latin=False): return ImageFont.truetype(LATIN if latin or not CJK else CJK, size)


def paper(w,h,color=PAPER):
    image=Image.new('RGB',(w,h),color); pen=ImageDraw.Draw(image); rng=random.Random(805)
    for _ in range(w*h//195):
        x,y=rng.randrange(w),rng.randrange(h); d=rng.choice([-4,-2,2]); length=rng.choice([1,2,3,7])
        pen.line((x,y,x+length,y+int(length>5)),fill=tuple(v+d for v in color))
    return image


def read_atlas(id_):
    folder=OUT/id_; name=id_.split('/')[1]
    atlas=json.loads((folder/(name+'.json')).read_text('utf-8'))
    with Image.open(folder/atlas['meta']['image']) as sheet:
        assert sheet.mode=='RGBA'
        frames=[]
        for entry in atlas['frames']:
            r=entry['frame']; x,y,w,h=(r[k] for k in ('x','y','w','h'))
            frames.append(sheet.crop((x,y,x+w,y+h)))
        return frames


def center(im, sprite, x, y, scale=2):
    art=sprite.resize((sprite.width*scale,sprite.height*scale),Image.Resampling.NEAREST)
    im.paste(art,(int(x-art.width/2),int(y-art.height/2)),art)


def cover():
    im=paper(WIDTH,HEIGHT); d=ImageDraw.Draw(im)
    d.rectangle((PAD,19,PAD+44,63),fill=SEAL); d.rectangle((PAD+3,22,PAD+41,60),outline=(217,151,119))
    d.text((PAD+22,40),word('墨','IN'),font=font(31),anchor='mm',fill=PAPER)
    d.text((PAD+60,39),word('水墨三式','Three studies in ink'),font=font(42),anchor='lm',fill=INK)
    d.text((WIDTH-PAD,29),'PIXELFX   /   INK IN MOTION',font=font(16,True),anchor='rm',fill=MUTED)
    d.text((WIDTH-PAD,52),word('独立墨稿   ·   原速', 'INDEPENDENT STUDIES   /   1x'),font=font(19),anchor='rm',fill=INK)
    d.line((PAD,80,WIDTH-PAD,80),fill=INK,width=2)
    for k,(_,zh,en,cn_label,label,_,_) in enumerate(STUDIES):
        x=PAD+k*(CW+GUTTER)
        if k: d.line((x-GUTTER//2,98,x-GUTTER//2,HEIGHT-22),fill=RULE)
        d.text((x+5,100),f'{k+1:02d}  /  {label}',font=font(16,True),fill=SEAL)
        d.text((x+3,124),word(zh,en),font=font(33 if CJK else 25),fill=INK)
        d.text((x+CW-7,143),word(cn_label,''),font=font(21),anchor='rm',fill=MUTED)
        d.line((x+6,319,x+CW-6,319),fill=RULE)
    return im


def draw_board(base, takes, tick):
    im=base.copy(); d=ImageDraw.Draw(im)
    for k,((_,_,_,_,_,key,phases),frames) in enumerate(zip(STUDIES,takes)):
        # 160 frames is two complete 80-frame periods, so playback stays real-time
        # and the GIF seam is ordinary motion, not a cut back to the poster.
        i=(key+tick)%(160 if k==2 else 80); x=PAD+k*(CW+GUTTER)
        frame=frames[min(i,len(frames)-1)]
        # Ground-based plates share a baseline; the last row hangs above it.
        center(im,frame,x+CW/2,[223,220,233][k],2)
        label=word(*next((a[1:] for a in reversed(phases) if i>=a[0]))) if i<len(frames)-1 else word('歇笔','Rest')
        d.text((x+7,338),label,anchor='lm',font=font(21),fill=MUTED)
        d.text((x+CW-7,338),f'{min(i,len(frames)-1)/50:0.2f} s',anchor='rm',font=font(16,True),fill=SEAL)
    return im


def animate(base,takes):
    poster=draw_board(base,takes,0); poster.save(OUT/'ink-studies.png')
    palette=poster.quantize(colors=240,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
    animation=[draw_board(base,takes,t).quantize(palette=palette,dither=Image.Dither.NONE) for t in range(160)]
    animation[0].save(OUT/'ink-studies.gif',save_all=True,append_images=animation[1:],duration=20,loop=0,disposal=1,optimize=False)
    for row,frames in zip(STUDIES,takes):
        images=[]
        for frame in frames:
            flat=Image.new('RGB',frame.size,PAPER); flat.paste(frame,(0,0),frame)
            images.append(flat.resize((frame.width*2,frame.height*2),Image.Resampling.NEAREST).quantize(palette=palette,dither=Image.Dither.NONE))
        images[0].save(OUT/row[0]/'anim.gif',save_all=True,append_images=images[1:],duration=[20]*(len(images)-1)+[300],loop=0,disposal=1,optimize=False)


def proof(takes):
    # Same atlas cells pasted over three unrelated grounds. Especially useful at
    # the thunder fork: both colours of the stripe must come THROUGH that slit.
    h=3*208+73; im=paper(WIDTH,h); d=ImageDraw.Draw(im)
    for k,(a,b) in enumerate([('纸色','Paper'),('深色','Slate'),('双色纹底','Striped')]):
        d.text((PAD+k*(CW+GUTTER)+5,25),word(a,b),font=font(24),fill=INK)
    for j,(row,frames) in enumerate(zip(STUDIES,takes)):
        for k in range(3):
            x=PAD+k*(CW+GUTTER); y=62+j*208
            tile=Image.new('RGB',(CW,201),[PAPER,(48,62,68),(214,198,168)][k])
            if k==2:
                stripes=ImageDraw.Draw(tile)
                for a in range(-200,CW,23): stripes.line((a,201,a+155,0),fill=(161,185,174),width=7)
            center(tile,frames[row[5]],CW/2,109 if j==0 else 95)
            im.paste(tile,(x,y)); d.text((x+7,y+6),f'0{j+1}  /  {row[5]/50:.2f} s',font=font(16,True),fill=(201,210,200) if k==1 else MUTED)
    im.save(OUT/'alpha-proof.png')


def main():
    ids=[s[0] for s in STUDIES]
    subprocess.run(['node','tools/render.mjs',*ids,'--sheet','--no-actor','--out',str(OUT)],cwd=ROOT,check=True)
    takes=[read_atlas(id_) for id_ in ids]; animate(cover(),takes); proof(takes)
    with zipfile.ZipFile(OUT/'ink-studies-atlases.zip','w',zipfile.ZIP_DEFLATED) as bundle:
        for id_ in ids:
            for ext in ('png','json'):
                path=Path(id_)/(Path(id_).name+'.'+ext); bundle.write(OUT/path,path.as_posix())
        bundle.write(ROOT/'docs'/'INK-STUDIES.zh-CN.md','README.zh-CN.md')
    print('Preview, transparency proof and sprite pack:',OUT)

if __name__=='__main__': main()
