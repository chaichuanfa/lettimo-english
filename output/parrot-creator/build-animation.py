"""Split the exported Creator vector artwork; preserve source paths and palette."""
import copy,json,math
from pathlib import Path
from rlottie_python import LottieAnimation
from PIL import Image,ImageDraw
P=Path(__file__).resolve().parent
original=json.loads((P/'creator-original.json').read_text())
groups=original['layers'][0]['shapes']; FPS=60; END=288

def static(v): return {'a':0,'k':v}
def transform(anchor=(0,0),position=(0,0),scale=(100,100)):
 return {'a':static(list(anchor)),'p':static(list(position)),'s':static(list(scale)),'r':static(0),'o':static(100),'sk':static(0),'sa':static(0)}
def path(v,i=None,o=None,c=True):
 return {'c':c,'v':v,'i':i or [[0,0] for _ in v],'o':o or [[0,0] for _ in v]}
def sh(p,name):return {'ty':'sh','nm':name,'ks':static(p)}
def fill(hex):return {'ty':'fl','c':static([int(hex[n:n+2],16)/255 for n in (0,2,4)]),'o':static(100),'r':1}
def layer(name,shapes,anchor=(0,0)):
 return {'ddd':0,'ty':4,'nm':name,'sr':1,'ip':0,'op':END,'st':0,'bm':0,'ks':transform(anchor,anchor),'shapes':shapes,'parent':100}
def group(n): return copy.deepcopy(groups[n-1])
def subset(ns):return [group(n) for n in ns]
def smooth(a,b,t):
 u=max(0,min(1,(t-a)/(b-a)));return u*u*u*(u*(u*6-15)+10)
def lerp(a,b,s):return a+(b-a)*s
def upper(t):
 if t<.68:return 0
 if t<.94:return 4*smooth(.68,.94,t)
 if t<1.58:return lerp(4,-100,smooth(.94,1.58,t))
 if t<2.38:return -100+5*math.sin(2*math.pi*(t-1.58)/.8)**3
 if t<3.25:return -100*(1-smooth(2.38,3.25,t))
 return 0

def feather(t):
 # Feather flex follows the shoulder, settles before the long rest.
 return -9*math.sin(math.pi*max(0,min(1,(t-1.02)/2.3)))**2 + (6*math.sin(4*math.pi*(t-1.63)/.8)*math.sin(math.pi*(t-1.63)/.8)**2 if 1.63<t<2.43 else 0)
def tail(t):
 return 5.5*math.sin(2*math.pi*(t-.86)/2.72)*math.sin(math.pi*(t-.86)/2.72)**2 if .86<t<3.58 else 0

def anim_scalar(fn,step=2):
 ks=[]
 for f in list(range(0,END,step))+[END]:
  ks.append({'t':f,'s':[round(fn(f/FPS),5)],'o':{'x':.333333,'y':.333333},'i':{'x':.666667,'y':.666667}})
 return {'a':1,'k':ks}

def morph(fn,frames):
 return {'a':1,'k':[{'t':f,'s':[fn(f/FPS)],'o':{'x':.333333,'y':.333333},'i':{'x':.666667,'y':.666667}} for f in frames]}

# Complete the originally occluded torso, behind all of the original painted regions.
bodypath=path([[114,148],[149,148],[169,171],[165,203],[149,225],[112,225],[89,201],[89,174]],
 [[-9,4],[-13,-4],[-3,-12],[6,-10],[10,-3],[-12,2],[-2,12],[-3,12]],
 [[11,-4],[10,5],[3,12],[-4,11],[-11,3],[-12,-4],[-3,-12],[4,-13]])
bodypatch=layer('Torso · restored behind wing',[sh(bodypath,'Occluded torso contour'),fill('88bd27')])
body=layer('Body & feet · stationary',subset([6,9,12,18,21,26,28,32]))
face=layer('Head & eyes · original vector',subset([2,3,4,5,7,8,10,11,14,17,19,20,23,27,29,30,31,34]))
beak=layer('Beak · original vector',subset([1,15,16,22,33]))
wing=layer('Near wing · shoulder + feather flex',subset([25]),(147,158))
wing['ks']['r']=anim_scalar(upper)
# Restore the hidden feather edge where the traced tail cut into the wing.
base=path([[162,153],[173.79,163.717],[179.123,182.25],[176,197],[163,208],[153,203],[147,198],[137.396,166.388],[138,159],[153.75,152.768],[162,153]],
 [[-2.75,-.077],[-4.1,-6.2],[.2,-7.2],[3,-5], [6,0],[3.5,3],[2,3],[-1,11],[0,2.5],[-5.5,0],[-2.75,-.077]],
 [[5,2],[4.2,6.4],[-.1,6],[-3,5.5],[-4,0],[-2,-2],[-5,-7],[-.3,-2.5],[4,-4],[2.75,.077],[0,0]])
def bend(t):
 angle=math.radians(feather(t));cx,cy=162,184
 def warp(p):
  x,y=p;u=max(0,min(1,(y-175)/27));a=angle*u*u*(3-2*u);c,s=math.cos(a),math.sin(a)
  return [round(cx+(x-cx)*c-(y-cy)*s,4),round(cy+(x-cx)*s+(y-cy)*c,4)]
 q=copy.deepcopy(base)
 for j,v in enumerate(base['v']):
  nv=warp(v);q['v'][j]=nv
  for key in ['i','o']:
   p=warp([v[0]+base[key][j][0],v[1]+base[key][j][1]])
   q[key][j]=[round(p[k]-nv[k],4) for k in range(2)]
 return q
wing['shapes'][0]['it'][0]['ks']=morph(bend,list(range(0,END,2))+[END])
far=layer('Far wing · subtle follow',subset([13]),(91,158));far['ks']['r']=anim_scalar(lambda t:upper(max(0,t-.1))*.035)
tail_layer=layer('Tail · delayed follow-through',subset([24]),(156,215));tail_layer['ks']['r']=anim_scalar(tail)
oldtail=tail_layer['shapes'][0]['it'][0]['ks']['k']
newtail={k:[copy.deepcopy(oldtail[k][j]) for j in range(2,14)] for k in ['v','i','o']};newtail['c']=True
newtail['v'] += [[153,214],[169,199]];newtail['i'] += [[-1,4],[-6,4]];newtail['o'] += [[3,-6],[6,-4]]
newtail['i'][0]=[-6,2];newtail['o'][11]=[-2,-3]
tail_layer['shapes'][0]['it'][0]['ks']=static(newtail)

# Mask lids to the existing white-eye contours, preserving eyes and pupils at full size.
def eye_mask(n,indices):
 src=groups[n-1]['it'][0]['ks']['k'];q={key:[copy.deepcopy(src[key][j]) for j in indices] for key in ['v','i','o']};q['c']=True
 q['i'][0]=[0,0];q['o'][-1]=[0,0];return q
rightmask=eye_mask(14,list(range(9,20))+[1,2])
leftmask=eye_mask(8,list(range(0,10)))
leftmask['v'] += [[113,103],[96,108]];leftmask['i'] += [[0,-3],[4,0]];leftmask['o'] += [[-5,2],[-4,-2]]

def blink(t,delay=0):
 t-=delay
 return smooth(2.50,2.61,t)*(1-smooth(2.66,2.87,t))

def lidshape(x0,x1,bound,upperlid):
 if upperlid:
  return path([[x0,45],[x1,45],[x1,bound],[x0,bound]],o=[[0,0],[0,0],[-(x1-x0)/3,4],[0,0]],i=[[0,0],[0,0],[0,0],[(x1-x0)/3,4]])
 return path([[x0,bound],[x1,bound],[x1,145],[x0,145]],o=[[(x1-x0)/3,4],[0,0],[0,0],[0,0]],i=[[0,0],[-(x1-x0)/3,4],[0,0],[0,0]])
blinks=[]
for name,mask,x0,x1,top,bottom,mid,delay in [('Near',rightmask,120,166,75,135,103,.015),('Far',leftmask,82,119,63,106,85,0)]:
 for upperlid in [True,False]:
  fn=lambda t,up=upperlid,x0=x0,x1=x1,top=top,bottom=bottom,mid=mid,delay=delay:lidshape(x0,x1,lerp(top if up else bottom,mid,blink(t,delay)),up)
  shape=sh(fn(0),'Lid closing contour');shape['ks']=morph(fn,[0]+list(range(148,176))+[END])
  lid=layer(name+(' upper eyelid' if upperlid else ' lower eyelid'),[shape,fill('98c747')]);lid['masksProperties']=[{'inv':False,'mode':'a','pt':static(mask),'o':static(100),'x':static(0),'nm':name+' eye contour'}]
  blinks.append(lid)
 # Curved crease is visible only during the shut moment.
 line=path([[x0+2,mid],[x1-2,mid]],o=[[(x1-x0-4)/3,4],[0,0]],i=[[0,0],[-(x1-x0-4)/3,4]],c=False)
 crease=layer(name+' eyelid crease',[sh(line,'Closed eyelid arc'),{'ty':'st','c':static([.26,.43,.11]),'o':static(100),'w':static(1.15),'lc':2,'lj':2}]);crease['ks']['o']=anim_scalar(lambda t,d=delay:80*blink(t,d)**5,1);crease['masksProperties']=[{'inv':False,'mode':'a','pt':static(mask),'o':static(100),'x':static(0)}];blinks.insert(0,crease)
root={'ty':3,'ddd':0,'ind':100,'nm':'Character placement · fixed','sr':1,'ip':0,'op':END,'st':0,'ks':transform((141,130),(238,256),(175,175))}
layers=[beak]+blinks+[wing,face,body,far,bodypatch,tail_layer]
for ind,l in enumerate(layers,1):l['ind']=ind
scene={'v':'5.12.2','fr':FPS,'ip':0,'op':END,'w':512,'h':512,'nm':'Green parrot · wave and blink','ddd':0,'assets':[],'layers':layers+[root], 'markers':[{'tm':0,'dr':END,'cm':'4.8s seamless loop'}]}
# Include explicit endpoint values for broad player compatibility.
def compatibility(node):
 if isinstance(node,dict):
  if 'masksProperties' in node: node['hasMask']=True
  if node.get('a')==1 and isinstance(node.get('k'),list):
   for current,nxt in zip(node['k'],node['k'][1:]):
    if isinstance(current,dict) and 's' in nxt: current['e']=copy.deepcopy(nxt['s'])
  for value in node.values(): compatibility(value)
 elif isinstance(node,list):
  for value in node: compatibility(value)
compatibility(scene)
(P/'parrot-wave-v2.json').write_text(json.dumps(scene,separators=(',',':')))
a=LottieAnimation.from_data(json.dumps(scene)); (P/'frames').mkdir(exist_ok=True)
def mix(x,y,u):
 if isinstance(x,list):return [mix(a,b,u) for a,b in zip(x,y)]
 if isinstance(x,dict):return {k:mix(v,y[k],u) if k in ['v','i','o'] else v for k,v in x.items()}
 return x+(y-x)*u

def freeze(node,f):
 if isinstance(node,dict):
  if node.get('a')==1 and isinstance(node.get('k'),list):
   keys=node['k'];idx=0
   while idx+1<len(keys) and keys[idx+1]['t']<=f:idx+=1
   v=keys[idx]['s']
   if idx+1<len(keys):v=mix(v,keys[idx+1]['s'],max(0,(f-keys[idx]['t'])/(keys[idx+1]['t']-keys[idx]['t'])))
   return {'a':0,'k':v[0] if len(v)==1 else v}
  return {k:freeze(v,f) for k,v in node.items()}
 if isinstance(node,list):return [freeze(v,f) for v in node]
 return node
for f in range(END):
 still=freeze(scene,f);a=LottieAnimation.from_data(json.dumps(still))
 im=a.render_pillow_frame(0,width=768,height=768).resize((512,512),Image.Resampling.LANCZOS)
 bg=Image.new('RGBA',im.size,'#fffdf8');bg.alpha_composite(im);bg.convert('RGB').save(P/'frames'/f'{f:04}.png')
 if f==0: im.save(P/'parrot-wave-v2-poster.png')
frames=[Image.open(P/'frames'/f'{f:04}.png') for f in range(0,END,2)]
frames[0].save(P/'parrot-wave-v2.webp',save_all=True,append_images=frames[1:],duration=[33,33,34]*48,loop=0,lossless=True)
sheet=Image.new('RGB',(4*300,3*324),'#fffdf8');draw=ImageDraw.Draw(sheet)
for j,f in enumerate([0,50,75,94,110,130,149,157,162,174,195,287]):
 im=Image.open(P/'frames'/f'{f:04}.png').resize((300,300),Image.Resampling.LANCZOS);x=j%4*300;y=j//4*324;sheet.paste(im,(x,y));draw.text((x+12,y+303),f'{f/60:.2f} s',fill='#42512f')
sheet.save(P/'motion-check.jpg')
print('Created pure-vector animation:',len(layers),'art layers, 288 frames, 4.8 sec')
