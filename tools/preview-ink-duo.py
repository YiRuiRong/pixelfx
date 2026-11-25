"""Optional *offline* role alignment proof (Pillow, adjacent Godot checkout). This is
not a Godot capture. Neither game backgrounds nor characters enter distributable sheets.
Run node tools/export-ink-duo.mjs first. Outputs only under pixelfx/records/ink-duo.
"""
import json
import math
from bisect import bisect_right
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'records/ink-duo'
ART = ROOT.parent / 'assets'
W, H = 324, 244
SWORD, STONE = 'flying-white-triptych', 'inkstone-cleave'
NEAR, SOFT = Image.Resampling.NEAREST, Image.Resampling.LANCZOS


@lru_cache(None)
def texture(p):
    with Image.open(p) as im:
        return im.convert('RGBA')


@lru_cache(None)
def arena(paper):
    # Inverse of the two arena texture rectangles, cropped near the top-left of
    # the field. Keep the sky behind the platform, not instead of the playable floor.
    x, y = -23, -17
    if paper:
        return texture(ART/'textures/ink-cross/ink-arena.png').transform((W,H), Image.Transform.AFFINE,
            (715/640,0,458+x*715/640,0,720/640,858+y*720/640),Image.Resampling.BICUBIC)
    sky = ImageOps.fit(texture(ART/'textures/orbital/sky.png'), (W,H))
    top = texture(ART/'textures/orbital/platform.png').transform((W,H), Image.Transform.AFFINE,
            (2,0,(x+64)*2,0,2,(y+64)*2), Image.Resampling.BICUBIC)
    return Image.alpha_composite(sky,top)


@lru_cache(None)
def ink(role, key):
    p = OUT/'atlases'/role
    data = json.loads((p/f'{key}.json').read_text(encoding='utf-8'))
    sheet = texture(p/data['meta']['image']); frames = []
    for frame in data['frames']:
        r = frame['frame']; x,y,w,h = [r[k] for k in ('x','y','w','h')]
        frames.append(sheet.crop((x,y,x+w,y+h)))
    return frames, data['meta']['pixelfx']['pivot']


def lay_ink(im,role,key,t,anchor,scale):
    frames, pivot = ink(role,key)
    index = math.floor(t*50 + 1e-7)
    if not 0 <= index < len(frames):
        return
    frame = frames[index].resize(tuple(round(s*scale) for s in frames[index].size),NEAR)
    im.alpha_composite(frame,(round(anchor[0]-pivot[0]*scale),round(anchor[1]-pivot[1]*scale)))


@lru_cache(None)
def sprite(file, scale, tint):
    im = texture(file); im = im.resize(tuple(round(n*scale) for n in im.size),SOFT)
    return Image.merge('RGBA',tuple(b.point(lambda x,m=m:min(255,round(x*m))) for b,m in zip(im.split(),tint)))


def hero(im,file,scale,pivot,feet,tint,alpha=1):
    b = sprite(file,scale,tint)
    if alpha < 1:
        b = b.copy(); b.putalpha(b.getchannel('A').point(lambda x:round(x*max(0,alpha))))
    im.alpha_composite(b,(round(feet[0]-scale*pivot[0]),round(feet[1]-scale*pivot[1])))


TIMES = [0,.04,.08,.12,.16,.20,.24,.28,.32,.355,.38,.41,.44,.46,.52,.60]


def stage(role,t,paper):
    im = arena(paper).copy(); fx,fy = 112,210
    if role == SWORD:
        i = min(2,max(0,math.floor((t+1e-6)/.16))); age=t-i*.16
        pose = f'combo-{2*i+int(age>=.055)}' if t<.48 else 'dash-5'
        hero(im, ART/f'heroes/action-polish/blade_master/{pose}.png',114/564,(392,808),(fx,fy),(.58,.96,.91,.80),min(1,(.60-t)/.12))
        # Sample per-gesture placement, keyed to the tip of the complete armed pose;
        # these are review offsets in foot space, NOT changes to an attack or its range.
        dx,dy,s = [(-19,-11,1.60),(1,-45,1.13),(-30,-7,2.0)][i]
        lay_ink(im,role,['rise','cross','fall'][i],age,(fx+dx,fy+dy),s)
        lay_ink(im,role,'spray',t-.32,(fx+74,fy-31),2)
    else:
        if .12 <= t < .26: h = 88*(1-(1-(t-.12)/.14)**2)
        elif .26 <= t < .32: h = 88
        elif .32 <= t < .46: h = 88*(1-((t-.32)/.14)**2.4)
        else: h = 0
        # Camera-framed composite follows the jump a little so both the feet and staff fit.
        cy = round(h*.54); fx += round(13*min(1,max(0,(t-.12)/.34)))
        n = max(1,min(16,bisect_right(TIMES,t+1e-7)))
        # Sampled end caps in the original unmirrored armed frames, relative to feet.
        staff_tips = {9:(-109,-139),10:(-10,-156),11:(93,-120),12:(117,-55),13:(103,-8),14:(80,-5)}
        if n in staff_tips:
            dx,dy=staff_tips[n]
            lay_ink(im,role,'trail',t-.32,(fx+dx,fy-h+cy+dy),1.35)
        tip = (fx+80,fy-5)
        hero(im,ART/f'heroes/stone_monkey/clone_tracking/clone_slam_{n:02d}.png',116/480,(528,660),
             (fx,fy-h+cy),(.68,1.12,.92,1),min(1,max(0,(.88-t)/.29)))
        lay_ink(im,role,'stamp',t-.46,tip,1.40)
    return im.convert('RGB')


@lru_cache(None)
def font(size,serif=False):
    for p in (['simsun.ttc','NotoSerifCJK-Regular.ttc'] if serif else ['msyh.ttc','NotoSansCJK-Regular.ttc']) + ['DejaVuSans.ttf']:
        try: return ImageFont.truetype(p,size)
        except OSError: pass
    return ImageFont.load_default()


def board(role,t,slow):
    im = Image.new('RGB',(2*W+30,H+98),'#f4f0e6'); d=ImageDraw.Draw(im)
    title,sub=('飞白三折','剑圣 · 镜影三连') if role==SWORD else ('落墨开碑','灵兽石猴 · 分身追砸')
    d.text((12,4),title,font=font(29,True),fill='#152a28');d.text((149,16),sub,font=font(13),fill='#425c53')
    d.text((im.width-15,18),'0.5×  /  慢放' if slow else '1×  /  原速',font=font(13),fill='#425c53',anchor='ra')
    d.line((12,46,im.width-12,46),fill='#aab0a0');
    for j,label in enumerate(['宣纸山水','深空星环']):
        x=12+j*(W+6); im.paste(stage(role,t,j==0),(x,53)); d.text((x,61+H),label,font=font(14,True),fill='#273c37')
    d.text((im.width-12,H+76),'PIXELFX   /   角色素材合成预览',font=font(10),fill='#5f7065',anchor='ra'); return im


def main():
    out = OUT/'role-preview'; out.mkdir(exist_ok=True,parents=True)
    animated = []
    for role,end in [(SWORD,.60),(STONE,.80)]:
        for slow in [False,True]:
            count=round(end*25*(2 if slow else 1)); frames=[board(role,i/(50 if slow else 25),slow) for i in range(count+1)]
            animated.extend([frames[0]]*5+frames+[frames[-1]]*4)
    # One palette for both stages avoids background shimmer. Source assets remain local.
    sample=Image.new('RGB',(animated[0].width,animated[0].height*4))
    for i,(r,t) in enumerate([(SWORD,.06),(SWORD,.40),(STONE,.26),(STONE,.54)]): sample.paste(board(r,t,False),(0,i*animated[0].height))
    palette=sample.quantize(colors=256,method=Image.Quantize.MEDIANCUT)
    seq=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in animated]
    seq[0].save(out/'ink-duo.gif',save_all=True,append_images=seq[1:],duration=40,loop=0,disposal=1,optimize=False)
    # Still proof: three sword silhouettes + stone contact, on each original surface.
    read=Image.new('RGB',(4*210+20,2*160+76),'#f4f0e6'); d=ImageDraw.Draw(read)
    d.text((9,4),'水墨招式   /   角色对位',font=font(22,True),fill='#152a28')
    for j,(r,t,caption) in enumerate([(SWORD,.06,'挑锋 · 0.06 s'),(SWORD,.20,'横擦 · 0.20 s'),(SWORD,.40,'顿落 · 0.40 s'),(STONE,.54,'开碑 · 0.54 s')]):
        x=8+j*211
        for i in range(2): read.paste(stage(r,t,i==0).resize((207,156),SOFT),(x,39+160*i))
        d.text((x,362),caption,font=font(14),fill='#425c53')
    read.save(out/'keyframes.png'); print(out)


if __name__ == '__main__': main()
