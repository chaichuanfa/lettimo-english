"""Build the page-specific Lottie poses from the approved Creator vector rig.

python3 scripts/build-parrot-animations.py
uv run --no-project --with 'rlottie-python[full]' python scripts/build-parrot-animations.py --posters
"""
import copy
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / 'assets/mascots/parrot'
SOURCE = json.loads((ROOT / 'scripts/mascot-source/approved-wave.json').read_text())
END, FPS = 288, 60


def prop(value):
    return {'a': 0, 'k': value}


def smooth(a, b, t):
    u = max(0, min(1, (t-a)/(b-a)))
    return u*u*u*(u*(u*6-15)+10)


def envelope(t, start=.6, up=1.2, down=3.0, end=3.7):
    return smooth(start, up, t)*(1-smooth(down, end, t))


def keyframes(fn, step=2):
    keys = []
    for frame in list(range(0, END, step))+[END]:
        value = fn(frame/FPS)
        keys.append({'t': frame, 's': value if isinstance(value, list) else [value],
                     'o': {'x': .333333, 'y': .333333}, 'i': {'x': .666667, 'y': .666667}})
    for current, nxt in zip(keys, keys[1:]):
        current['e'] = copy.deepcopy(nxt['s'])
    return {'a': 1, 'k': keys}


def path(vertices, incoming=None, outgoing=None, closed=True):
    return {'c': closed, 'v': vertices, 'i': incoming or [[0, 0] for _ in vertices],
            'o': outgoing or [[0, 0] for _ in vertices]}


def shape(points, name='Contour'):
    return {'ty': 'sh', 'nm': name, 'ks': prop(points)}


def rgb(color):
    return [int(color[i:i+2], 16)/255 for i in (0, 2, 4)]


def fill(color):
    return {'ty': 'fl', 'c': prop(rgb(color)), 'o': prop(100), 'r': 1}


def stroke(color, width=1.5):
    return {'ty': 'st', 'c': prop(rgb(color)), 'o': prop(100), 'w': prop(width), 'lc': 2, 'lj': 2}


def transform(anchor=(0, 0)):
    return {'a': prop(list(anchor)), 'p': prop(list(anchor)), 's': prop([100, 100]),
            'r': prop(0), 'o': prop(100)}


def layer(name, shapes, anchor=(0, 0), parent=100):
    return {'ty': 4, 'ddd': 0, 'nm': name, 'sr': 1, 'ip': 0, 'op': END, 'st': 0,
            'parent': parent, 'ks': transform(anchor), 'shapes': shapes}


def group(name, points, color, line=False, width=1.5):
    return {'ty': 'gr', 'nm': name, 'it': [shape(points), stroke(color, width) if line else fill(color),
                                          {'ty': 'tr', **transform()}]}


def ellipse(cx, cy, rx, ry):
    k = .55228475
    return path([[cx, cy-ry], [cx+rx, cy], [cx, cy+ry], [cx-rx, cy]],
                [[-rx*k, 0], [0, -ry*k], [rx*k, 0], [0, ry*k]],
                [[rx*k, 0], [0, ry*k], [-rx*k, 0], [0, -ry*k]])


def first_value(node):
    if isinstance(node, dict):
        if node.get('a') == 1 and isinstance(node.get('k'), list):
            value = copy.deepcopy(node['k'][0]['s'])
            return prop(value[0] if len(value) == 1 else value)
        return {k: first_value(v) for k, v in node.items()}
    if isinstance(node, list):
        return [first_value(v) for v in node]
    return node


def find(scene, prefix):
    return next(l for l in scene['layers'] if l['nm'].startswith(prefix))


def base_pose(name):
    scene = copy.deepcopy(SOURCE)
    scene['nm'] = 'Green parrot · '+name
    for prefix in ['Near wing', 'Far wing', 'Tail']:
        item = find(scene, prefix)
        item['ks']['r'] = prop(0)
        item['shapes'] = first_value(item['shapes'])
    return scene


def add_head_tilt(scene, fn):
    head = {'ty': 3, 'ddd': 0, 'ind': 200, 'nm': 'Head · gentle neck pivot', 'sr': 1,
            'ip': 0, 'op': END, 'st': 0, 'parent': 100, 'ks': transform((130, 151))}
    head['ks']['r'] = keyframes(fn)
    for item in scene['layers']:
        if item['nm'].startswith(('Head &', 'Beak', 'Near upper', 'Near lower', 'Far upper', 'Far lower', 'Near eyelid', 'Far eyelid')):
            item['parent'] = 200
    scene['layers'].append(layer('Neck · covered joint', [shape(ellipse(134, 151, 19, 13)), fill('88bd27')]))
    scene['layers'].append(head)


def reading():
    scene = base_pose('reading and turning a page')
    add_head_tilt(scene, lambda t: -4-3*envelope(t))
    near = find(scene, 'Near wing')
    near['ks']['r'] = keyframes(lambda t: 32+8*envelope(t, .9, 1.5, 2.1, 2.8))
    find(scene, 'Tail')['ks']['r'] = keyframes(lambda t: 2*math.sin(2*math.pi*t/4.8)**3)
    pages = [
        group('Blue book cover', path([[83, 173], [123, 183], [163, 173], [167, 214], [124, 227], [80, 214]]), '279ec5'),
        group('Left page', path([[85, 172], [123, 181], [123, 222], [83, 211]],
                               [[0, 0], [-12, -6], [0, 0], [12, 0]], [[12, 0], [0, 0], [-12, -5], [0, 0]]), 'fff4ce'),
        group('Right page', path([[124, 181], [161, 172], [164, 211], [124, 222]],
                                [[0, 0], [-12, 0], [0, 0], [12, -5]], [[12, -6], [0, 0], [-12, 0], [0, 0]]), 'fffbea'),
    ]
    pages.append(pages.pop(0))  # The cover stays behind the cream pages.
    for side in [-1, 1]:
        for y in [191, 198, 205]:
            pages.insert(0, group('Page line', path([[124+side*8, y], [124+side*29, y-5]], closed=False), 'c6b87e', True, 1.3))
    pages.insert(0, group('Book spine', path([[124, 184], [124, 220]], closed=False), 'd7c48b', True, 1))
    book = layer('Reading · open book', pages)
    # Page turns about its spine; the character itself never stretches.
    flip = layer('Reading · turning page', [shape(path([[124, 181], [160, 174], [163, 210], [124, 221]])), fill('fffcf0')], (124, 201))
    flip['ks']['s'] = keyframes(lambda t: [100*math.cos(math.pi*smooth(1.1, 2.5, t)), 100])
    flip['ks']['o'] = keyframes(lambda t: 100*envelope(t, 1.05, 1.2, 2.35, 2.6))
    wing_index = scene['layers'].index(near)
    scene['layers'][wing_index+1:wing_index+1] = [flip, book]
    return scene


def listening():
    scene = base_pose('listening attentively')
    add_head_tilt(scene, lambda t: 6*envelope(t)+1.5*math.sin(2*math.pi*(t-1.4)/1.8)**3*envelope(t, 1.3, 1.7, 2.7, 3.1))
    find(scene, 'Near wing')['ks']['r'] = keyframes(lambda t: -137*envelope(t, .6, 1.35, 2.9, 3.65))
    find(scene, 'Tail')['ks']['r'] = keyframes(lambda t: 3*math.sin(2*math.pi*t/4.8)**3)
    for i, x in enumerate([207, 217, 227]):
        arc = layer('Listening · sound arc '+str(i+1), [
            shape(path([[x, 100-i*4], [x, 120+i*4]], incoming=[[0, 0], [7+i, -5]], outgoing=[[7+i, 5], [0, 0]], closed=False)), stroke('39a9cf', 2.2)])
        arc['ks']['o'] = keyframes(lambda t, i=i: 65*envelope(t, 1+i*.12, 1.4+i*.12, 2.6+i*.12, 3.1+i*.12))
        scene['layers'].insert(0, arc)
    return scene


def teaching():
    scene = base_pose('lifting a letter card in front')
    # The wing and its small grip follow the same shoulder pivot. The card's
    # lower-right corner stays attached to that grip throughout the gesture.
    def lift(t):
        return envelope(t, .45, 1.4, 3.0, 3.95)

    def shoulder(t):
        return -72*lift(t)

    def grip_position(t):
        angle = math.radians(shoulder(t))
        return [147+16*math.cos(angle)-44*math.sin(angle),
                158+16*math.sin(angle)+44*math.cos(angle)]

    near = find(scene, 'Near wing')
    near['ks']['r'] = keyframes(shoulder)
    find(scene, 'Tail')['ks']['r'] = keyframes(
        lambda t: 3*math.sin(2*math.pi*(t-.2)/2.8)*envelope(t, .5, 1.3, 3.0, 4.05))
    add_head_tilt(scene, lambda t: 2.5*envelope(t, 1.4, 1.9, 2.2, 2.8))

    card = layer('Teaching · held letter card', [
        group('Letter a bowl', ellipse(-3, -2, 9, 11), '168db2', True, 4.2),
        group('Letter a stem', path([[6, -13], [6, 8], [10, 9]], closed=False), '168db2', True, 4.2),
        group('Letter baseline', path([[-11, 17], [11, 17]], closed=False), '85cede', True, 1.7),
        group('Card paper', path([[-20, -27], [20, -27], [25, -22], [25, 22], [20, 27], [-20, 27], [-25, 22], [-25, -22]],
                               [[0, 0], [0, 0], [0, -2.76], [0, 0], [2.76, 0], [0, 0], [0, 2.76], [0, 0]],
                               [[0, 0], [2.76, 0], [0, 0], [0, 2.76], [0, 0], [-2.76, 0], [0, 0], [0, -2.76]]), 'e0f5f9'),
    ], (22, 19))
    card['ks']['p'] = keyframes(grip_position)
    card['ks']['r'] = keyframes(lambda t: 8-12*envelope(t, .5, 1.5, 2.95, 4.0))
    grip = layer('Teaching · wingtip over card edge',
                 [shape(ellipse(163, 202, 6.5, 5)), fill('287c38')], (147, 158))
    grip['ks']['r'] = keyframes(shoulder)
    # Topmost layers: grip, card, then the existing wing/body/face artwork.
    # No part of the letter card is hidden behind the parrot's torso.
    scene['layers'][0:0] = [grip, card]
    return scene


def cheer():
    scene = base_pose('celebrating a completed lesson')
    def lift(t):
        return envelope(t, .4, 1.05, 2.9, 3.55)
    def pulse(t):
        return math.sin(2*math.pi*(t-1.1)/.85)**3*envelope(t, 1.05, 1.3, 2.5, 2.8)
    find(scene, 'Near wing')['ks']['r'] = keyframes(lambda t: -113*lift(t)+9*pulse(t))
    far = find(scene, 'Far wing')
    contour = copy.deepcopy(find(scene, 'Near wing')['shapes'][0]['it'][0]['ks']['k'])
    contour['v'] = [[91-.7*(x-147), 158+.9*(y-158)] for x, y in contour['v']]
    for key in ['i', 'o']:
        contour[key] = [[-.7*x, .9*y] for x, y in contour[key]]
    far['shapes'] = [shape(contour), fill('226633')]
    far['ks']['r'] = keyframes(lambda t: 105*lift(max(0, t-.07))-8*pulse(max(0, t-.07)))
    find(scene, 'Tail')['ks']['r'] = keyframes(lambda t: 6*math.sin(2*math.pi*(t-.15)/1.3)*envelope(t, .5, 1.2, 2.8, 3.6))
    for i, (x, y, color) in enumerate([(56, 119, 'f5b537'), (215, 91, '39a9cf'), (224, 147, 'f5b537')]):
        vertices = [[x+math.sin(j*math.pi/4)*(6 if j%2 == 0 else 2.6), y-math.cos(j*math.pi/4)*(6 if j%2 == 0 else 2.6)] for j in range(8)]
        star = layer('Cheer · sparkle '+str(i+1), [shape(path(vertices)), fill(color)], (x, y))
        star['ks']['o'] = keyframes(lambda t, i=i: 90*envelope(t, .9+i*.14, 1.35+i*.14, 2.2+i*.14, 2.7+i*.14))
        star['ks']['s'] = keyframes(lambda t, i=i: [70+30*envelope(t, .9+i*.14, 1.35+i*.14, 2.2+i*.14, 2.7+i*.14)]*2)
        scene['layers'].insert(0, star)
    return scene


def compact(node):
    """Remove redundant rest keys without changing the interpolation timing."""
    if isinstance(node, dict):
        if node.get('a') == 1 and isinstance(node.get('k'), list):
            keys = node['k']
            keep = [k for i, k in enumerate(keys) if i in (0, len(keys)-1) or not (keys[i-1]['s'] == k['s'] == keys[i+1]['s'])]
            for current, nxt in zip(keep, keep[1:]):
                current['e'] = copy.deepcopy(nxt['s'])
            keep[-1] = {'t': keep[-1]['t'], 's': keep[-1]['s']}
            if all(k['s'] == keep[0]['s'] for k in keep):
                value = keep[0]['s']
                return prop(value[0] if len(value) == 1 else value)
            node['k'] = keep
        return {k: compact(v) for k, v in node.items()}
    if isinstance(node, list):
        return [compact(v) for v in node]
    if isinstance(node, float):
        return round(node, 5) or 0
    return node


def build():
    TARGET.mkdir(parents=True, exist_ok=True)
    variants = {'wave': copy.deepcopy(SOURCE), 'reading': reading(), 'listening': listening(), 'teaching': teaching(), 'cheer': cheer()}
    for name, scene in variants.items():
        index = 1
        for item in scene['layers']:
            if item['ty'] != 3:
                item['ind'] = index
                index += 1
        scene = compact(scene)
        text = json.dumps(scene, separators=(',', ':'))
        (TARGET / (name+'.json')).write_text(text)
        if '--posters' in sys.argv:
            from rlottie_python import LottieAnimation
            from PIL import Image
            still = LottieAnimation.from_data(json.dumps(first_value(scene)))
            still.render_pillow_frame(0, width=768, height=768).resize((384, 384), Image.Resampling.LANCZOS).save(TARGET / (name+'.webp'), lossless=True)
        print(name, len(scene['layers']), 'layers', len(text), 'bytes')


if __name__ == '__main__':
    build()
