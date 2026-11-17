"""Assemble generated animation cels; no bones, deformation, or interpolation."""
from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parent
atlas = Image.open(root / 'parrot-frames-v1.png').convert('RGBA')
columns, rows = 6, 4
width, height = atlas.width // columns, atlas.height // rows
assert atlas.width % columns == 0 and atlas.height % rows == 0
frames = [atlas.crop((x*width,y*height,(x+1)*width,(y+1)*height)) for y in range(rows) for x in range(columns)]
# GIF has binary transparency. Keep the generated artwork; reserve one palette
# entry for transparent pixels, and use one palette across the entire sequence.
sheet = Image.new('RGB', (width*columns,height*rows), (255,255,255))
foot_positions=[]
for i,frame in enumerate(frames):
    sheet.paste(frame,(i%columns*width,i//columns*height),frame.getchannel('A'))
    foot=[]
    for y in range(int(height*.8),height):
        for x in range(width):
            r,g,b,a=frame.getpixel((x,y))
            if a>128 and r>190 and 60<g<200 and b<90: foot.append((x,y))
    foot_positions.append([round(sum(p[k] for p in foot)/len(foot),2) for k in [0,1]])
palette=sheet.quantize(colors=255,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
encoded=[]
for frame in frames:
    white=Image.new('RGBA',frame.size,'white');white.alpha_composite(frame)
    indexed=white.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE)
    indexed.paste(255,mask=frame.getchannel('A').point(lambda a:255 if a<128 else 0))
    colors=indexed.getpalette();colors[765:768]=[0,0,0];indexed.putpalette(colors)
    indexed.info['transparency']=255
    encoded.append(indexed)
# Alternating 80/90 ms delivers 12 fps in GIF's 10 ms timing units.
durations=[round((i+1)*100/12)*10-round(i*100/12)*10 for i in range(24)]
durations[0]=450;durations[-1]=650
encoded[0].save(root/'parrot-wave-v1.gif',save_all=True,append_images=encoded[1:],duration=durations,loop=0,transparency=255,disposal=2,optimize=False)
frames[0].save(root/'parrot-poster-v1.png')
contact=Image.new('RGB',(width*6,height*4),'white')
for i,frame in enumerate(frames):contact.paste(frame,(i%6*width,i//6*height),frame.getchannel('A'))
contact.save(root/'contact-sheet-white.jpg',quality=92)
with Image.open(root/'parrot-wave-v1.gif') as gif:
    total=0
    for i in range(gif.n_frames):gif.seek(i);total+=gif.info['duration']
    report={'format':gif.format,'dimensions':gif.size,'frames':gif.n_frames,'duration_ms':total,'transparent':True,'foot_centers':foot_positions}
(root/'verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
