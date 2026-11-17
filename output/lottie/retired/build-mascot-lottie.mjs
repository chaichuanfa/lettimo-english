// Original vector rig for English Path. All motion is on named anatomical joints.
// Rebuild editable Lottie JSON and matching static SVG posters with:
// node scripts/build-mascot-lottie.mjs
import { mkdir, writeFile } from "node:fs/promises";

const C = { green: "#77CA16", light: "#8DDA28", shade: "#56AF13", wing: "#248D43", feather: "#36A150", deep: "#17683C", cream: "#DDF3B1", white: "#FFFFF6", eye: "#214537", orange: "#FFA323", beak: "#FF8A16", red: "#BB422C", tongue: "#F77953", blue: "#38B6E8", blueDark: "#1695CD", paper: "#FFF8DF" };
const prop = k => ({ a: 0, k });
// Sample continuous, C2 easing curves. Linear interpolation between samples keeps
// velocity continuous instead of coming to a halt at every authored keyframe.
const FPS = 60, END = 288;
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x*x*x*(x*(x*6-15)+10); };
const ramp = (t, from, to) => smooth((t-from)/(to-from));
const gesture = (t, start=.35, peak=1.45, release=2.5, end=4.3) => ramp(t,start,peak)*(1-ramp(t,release,end));
function sampled(fn, shape = false) {
  const frames = [];
  for (let t=0;t<=END;t+=2) {
    const result=fn(t/FPS);
    const value=shape ? [result] : Array.isArray(result) ? result : [result];
    frames.push({t,s:value,...(t<END?{o:{x:[0],y:[0]},i:{x:[1],y:[1]}}:{})});
  }
  // Discard interiors of holds, retaining both boundaries and all moving samples.
  const signatures=frames.map(f=>JSON.stringify(f.s));
  const compact=frames.filter((f,i)=>i===0||i===frames.length-1||signatures[i]!==signatures[i-1]||signatures[i]!==signatures[i+1]);
  return {a:1,k:compact};
}
const curve = fn => sampled(fn);
const shapeMotion = fn => sampled(fn,true);
const rgb = hex => hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).concat(1);
const transform = (p = [0, 0], rotation = 0, scale = [100, 100]) => ({ o: prop(100), r: typeof rotation === "object" ? rotation : prop(rotation), p: p.a !== undefined ? p : prop([...p, 0]), a: prop([0, 0, 0]), s: scale.a !== undefined ? scale : prop([...scale, 100]) });

// Small SVG path compiler; author silhouettes with cubic curves, not polygon tracing.
function bezier(d) {
  const tokens = d.match(/[MLCQZ]|-?\d*\.?\d+/g);
  const v = [], i = [], o = [];
  let n = 0, closed = false;
  const point = () => [Number(tokens[n++]), Number(tokens[n++])];
  const vertex = p => { v.push(p); i.push([0, 0]); o.push([0, 0]); };
  while (n < tokens.length) {
    const cmd = tokens[n++];
    if (cmd === "M" || cmd === "L") vertex(point());
    else if (cmd === "C") {
      const a = point(), b = point(), end = point(), last = v.at(-1);
      o[o.length - 1] = a.map((x, k) => x - last[k]);
      vertex(end); i[i.length - 1] = b.map((x, k) => x - end[k]);
    } else if (cmd === "Q") {
      const control = point(), end = point(), last = v.at(-1);
      o[o.length - 1] = control.map((x, k) => (x - last[k]) * 2 / 3);
      vertex(end); i[i.length - 1] = control.map((x, k) => (x - end[k]) * 2 / 3);
    } else if (cmd === "Z") closed = true;
    else throw new Error(`Unsupported path command ${cmd}`);
  }
  if (closed && v.length > 1 && v[0].every((x, k) => x === v.at(-1)[k])) {
    i[0] = i.at(-1); v.pop(); i.pop(); o.pop();
  }
  return { v, i, o, c: closed };
}
const fill = hex => ({ ty: "fl", c: prop(rgb(hex)), o: prop(100), r: 1, bm: 0 });
const stroke = (hex, width) => ({ ty: "st", c: prop(rgb(hex)), o: prop(100), w: prop(width), lc: 2, lj: 2, ml: 4 });
const group = (shape, color, width) => ({ ty: "gr", it: [shape, width ? stroke(color, width) : fill(color), { ty: "tr", ...transform() }], nm: "Vector shape" });
const path = (d, color, width) => group({ ty: "sh", ks: prop(bezier(d)), nm: "Bezier silhouette" }, color, width);
const ellipse = (x, y, w, h, color) => group({ ty: "el", p: prop([x, y]), s: prop([w, h]), d: 1 }, color);

function animation(pose) {
  const layers = [];
  const add = (name, shapes, { parent, p = [0, 0], r = 0, s = [100, 100], opacity } = {}) => {
    const layer = { ddd: 0, ind: layers.length + 1, ty: shapes ? 4 : 3, nm: name, sr: 1, ks: transform(p, r, s), ip: 0, op: END, st: 0, bm: 0 };
    if (parent) layer.parent = parent;
    if (shapes) layer.shapes = [...shapes].reverse();
    if (opacity) layer.ks.o = opacity;
    layers.push(layer);
    return layer.ind;
  };
  const root = add("Body root", null, { p: [158, 218] });
  const look = t => gesture(t,.45,1.45,2.45,4.2);
  const head = add("Head pivot", null, { parent: root, p: [0, -34], r: curve(t => (pose === "reading" ? 2.6 : pose === "listening" ? -3.4 : -2) * look(t)) });
  // Rotate around the neck, not around the middle of the face.
  layers.at(-1).ks.a = prop([0,60,0]);
  add("Tail feathers", [
    path("M 30 21 C 52 17 76 16 91 2 C 104 -9 112 0 104 14 C 99 25 85 34 69 38 C 94 32 114 33 116 41 C 119 51 85 57 61 54 C 87 57 103 62 99 68 C 92 77 50 60 27 46 Z", C.deep),
    path("M 40 30 C 59 30 78 25 90 17 C 85 31 66 39 45 40 Z", C.wing),
  ], { parent: root, p: [6, 10], r: curve(t => 1.4 * gesture(t,.7,1.9,2.4,4.5)) });
  add("Body silhouette", [
    path("M -51 -33 C -61 -7 -62 36 -43 57 C -25 78 25 78 47 57 C 67 36 59 -8 46 -36 C 27 -61 -32 -57 -51 -33 Z", C.green),
    path("M 37 -38 C 60 -18 67 29 47 57 C 35 69 20 72 8 71 C 44 50 45 10 37 -38 Z", C.shade),
    ellipse(-6, 20, 79, 96, C.cream),
    path("M -19 -18 C -10 -28 5 -30 16 -21 C 3 -25 -8 -23 -19 -18 Z", "#ECF9D1"),
  ], { parent: root, s: [100,100] });
  const foot = "M -20 -8 C -24 -21 -10 -27 -2 -14 C 4 -30 18 -24 18 -8 C 32 -11 35 0 23 8 C 10 17 -18 13 -23 7 C -28 1 -27 -4 -20 -8 Z";
  add("Left foot", [path(foot,C.beak),path("M -15 2 C -2 7 11 7 21 2", "#FFBC4A", 4)], { parent: root, p: [-30,66], r: -9 });
  add("Right foot", [path(foot,C.orange),path("M -15 2 C -2 7 11 7 21 2", "#FFD071", 4)], { parent: root, p: [26,68], r: 9 });
  if (pose === "reading") {
    add("Open book", [
      path("M -64 -7 C -40 -18 -16 -9 0 0 C 20 -12 45 -15 66 -9 L 64 48 C 39 43 18 49 0 58 C -17 48 -40 45 -62 46 Z", C.blueDark),
      path("M -59 -14 C -40 -25 -18 -14 0 -4 C 20 -17 43 -22 60 -16 L 60 38 C 38 35 17 39 0 49 C -18 37 -39 34 -59 36 Z", C.paper),
      path("M -59 -14 C -39 -20 -15 -10 0 -4 L 0 49 C -19 38 -40 34 -59 36 Z", "#F3E9C7"),
      path("M -64 -7 C -39 -10 -16 0 0 10 L 0 58 C -22 48 -43 43 -62 46 Z", C.blue),
      path("M 0 10 C 21 -1 46 -13 66 -9 L 64 48 C 42 44 18 49 0 58 Z", "#26ADE1"),
      path("M 0 10 L 0 56", "#138AB8", 3),
    ], { parent: root, p: [0,9] });
    const page = path("M 0 3 C 17 -7 35 -13 53 -10 L 52 33 C 31 32 15 39 0 48 Z", "#FFFCED");
    // A curved page lifts from the outer edge and settles, without mirrored scale.
    page.it[0].ks = shapeMotion(t => {
      const lift = gesture(t,.9,1.9,2.1,3.65);
      return bezier(`M 0 3 C 17 ${-7-14*lift} ${35-12*lift} ${-13-24*lift} ${53-20*lift} ${-10-26*lift} L ${52-17*lift} ${33-10*lift} C ${31-8*lift} ${32-10*lift} 15 39 0 48 Z`);
    });
    add("Turning page", [page], {parent: root,p:[0,9]});
  }
  // Head is drawn above the body, with its own pivot rather than moving the root.
  add("Head silhouette", [
    path("M -68 -27 C -63 -63 -39 -76 -1 -77 C 34 -82 67 -60 73 -24 C 85 19 64 56 27 63 C 12 72 -4 66 -9 61 C -48 67 -77 35 -74 1 C -74 -9 -73 -18 -68 -27 Z", C.green),
    path("M 34 -68 C 62 -56 73 -33 74 -7 C 86 28 64 56 27 63 C 43 49 51 30 54 6 C 59 -21 48 -51 34 -68 Z", C.shade),
    path("M -61 -35 C -50 -58 -29 -67 -7 -69 C -34 -70 -54 -59 -61 -35 Z", C.light),
    ellipse(-29,-6,67,94,C.cream), ellipse(27,-2,76,98,C.cream),
  ], {parent: head});
  add("Feather crest", [
    path("M -18 -69 C -9 -83 8 -79 19 -98 C 23 -111 30 -108 33 -97 C 36 -84 23 -72 12 -65 C 28 -69 36 -72 42 -82 C 46 -88 53 -83 50 -75 C 43 -57 14 -54 -8 -60 Z", C.green),
    path("M 5 -70 C 15 -76 24 -83 27 -95 C 26 -81 19 -72 5 -70 Z", C.shade),
  ], {parent:head});
  // Eyelids cover intact eyeballs; pupils never squash or disappear by scaling.
  const blinkAt = {reading:2.62,listening:3.12,teaching:2.05,cheer:3.4}[pose];
  const blink = t => ramp(t,blinkAt,blinkAt+.12)*(1-ramp(t,blinkAt+.17,blinkAt+.4));
  for (const [name,x,y,w] of [["Left",-29,-4,41],["Right",27,0,47]]) {
    const eye = add(`${name} eye socket`, null, {parent:head,p:[x,y]});
    add(`${name} eye white`, [ellipse(0,0,w,62,C.white)], {parent:eye});
    add(`${name} pupil`, [ellipse(3,5,20,34,C.eye),ellipse(7,-5,7,10,"#FFFFFF"),ellipse(-1,13,3,4,"#9BC5A2")], {parent:eye,p:curve(t=>[pose==="reading" ? -1.5*look(t) : 1.5*look(t),pose==="reading" ? 4*look(t) : 0,0])});
    const edge=w/2+2;
    const upper = path(`M ${-edge} -36 L ${edge} -36 L ${edge} -33 Q 0 -33 ${-edge} -33 Z`,C.cream);
    upper.it[0].ks=shapeMotion(t=>{const b=blink(t),y=-33+37*b;return bezier(`M ${-edge} -36 L ${edge} -36 L ${edge} ${y} Q 0 ${y+5*b} ${-edge} ${y} Z`);});
    add(`${name} upper eyelid`,[upper],{parent:eye});
    const lower=path(`M ${-edge} 36 L ${edge} 36 L ${edge} 33 Q 0 33 ${-edge} 33 Z`,C.cream);
    lower.it[0].ks=shapeMotion(t=>{const b=blink(t),y=33-29*b;return bezier(`M ${-edge} 36 L ${edge} 36 L ${edge} ${y} Q 0 ${y+5*b} ${-edge} ${y} Z`);});
    add(`${name} lower eyelid`,[lower],{parent:eye});
    add(`${name} lid crease`,[path("M -13 4 Q 0 9 13 4",C.eye,2.5)],{parent:eye,opacity:curve(t=>100*Math.pow(blink(t),6))});
  }
  add("Smile cheek", [ellipse(-53,29,14,8,"#B9E565"),ellipse(57,33,13,8,"#B9E565")],{parent:head});
  add("Lower beak", [
    path("M -31 4 C -29 28 -9 42 7 31 C 17 21 19 7 13 -1 Z",C.red),
    path("M -17 26 C -9 16 2 17 9 25 C 0 38 -10 35 -17 26 Z",C.tongue),
    path("M -29 9 C -24 32 -6 41 9 27 C -3 48 -25 36 -31 17 Z",C.beak),
  ],{parent:head,p:[-8,20],r:0});
  add("Upper beak", [
    path("M -46 13 C -37 -5 -12 -7 6 1 C 20 7 27 19 17 26 C 7 35 -6 23 -16 29 C -27 36 -31 45 -28 53 C -43 47 -57 30 -46 13 Z",C.beak),
    path("M -44 14 C -35 0 -15 -3 2 2 C 12 6 20 14 18 19 C 6 24 -5 17 -19 25 C -31 31 -35 37 -36 41 C -46 33 -49 23 -44 14 Z",C.orange),
    path("M -34 9 C -26 4 -17 4 -11 6", "#FFD26A", 4),
  ],{parent:head,p:[-8,12]});
  if (pose === "listening") {
    add("Headphone band",[path("M -71 -2 C -88 -99 80 -112 78 1",C.blueDark,11),path("M -71 -10 C -76 -82 67 -99 77 -9",C.blue,6)],{parent:head});
    add("Headphone left",[ellipse(-72,9,25,54,C.blueDark),ellipse(-76,7,17,43,C.blue)],{parent:head});
    add("Headphone right",[ellipse(73,10,30,60,C.blueDark),ellipse(79,7,24,48,C.blue),ellipse(82,6,12,32,"#7CDBF7")],{parent:head});
  }
  const spread = pose === "cheer";
  const wingPath = "M 0 0 C 14 -8 29 6 34 25 C 38 38 38 58 30 65 C 24 69 20 57 17 52 C 20 70 9 74 5 61 C -1 47 -16 30 -11 14 C -9 7 -5 3 0 0 Z";
  const wingDetail = "M 7 12 C 21 14 24 26 26 38 C 16 34 9 25 7 12 Z";
  // A single intentional gesture, with the wrist following the shoulder.
  const rightAngle = t => pose === "reading" ? 18+12*gesture(t,.75,1.65,2.0,3.9)
    : pose === "listening" ? -42-78*gesture(t,.4,1.65,2.65,4.35)
    : spread ? -24-53*gesture(t,.35,1.5,2.2,4.25)
    : -32-31*gesture(t,.45,1.65,2.4,4.3);
  const leftAngle = t => pose === "reading" ? -32+2*look(t)
    : spread ? 14+28*gesture(t,.5,1.75,2.35,4.35) : 12+3*look(t);
  // Bend the feather tips around a wrist with a small delayed follow-through.
  // The shoulder and upper wing stay attached and retain their dimensions.
  function flexibleWing(d, color, sign) {
    const source=bezier(d), item=path(d,color);
    item.it[0].ks=shapeMotion(t=>{
      const bend=sign*5*gesture(t,.7,1.95,2.5,4.5)*Math.PI/180;
      const warp=([x,y])=>{const amount=smooth((y-20)/45),a=bend*amount,dy=y-24;return [x*Math.cos(a)-dy*Math.sin(a),24+x*Math.sin(a)+dy*Math.cos(a)];};
      const v=source.v.map(warp);
      const tangent=(values)=>values.map((p,j)=>{const q=warp(p.map((x,k)=>x+source.v[j][k]));return q.map((x,k)=>x-v[j][k]);});
      return {v,i:tangent(source.i),o:tangent(source.o),c:true};
    });
    return item;
  }
  add("Left wing",[flexibleWing(wingPath,C.wing,-1),flexibleWing(wingDetail,C.feather,-1)],{parent:root,p:[-45,-12],r:curve(leftAngle),s:[-100,100]});
  const rightWing = add("Right wing",[flexibleWing(wingPath,C.wing,1),flexibleWing(wingDetail,C.feather,1)],{parent:root,p:[45,-12],r:curve(rightAngle)});
  if(pose === "teaching") {
    add("Teaching pointer",[path("M -4 2 L 4 2 L 4 -71 Q 0 -78 -4 -71 Z", "#D38B36"),path("M -2 -69 L -2 -8", "#F2B85C",2)],{parent:rightWing,p:[23,42],r:85});
    add("Pointer grip",[ellipse(23,42,20,22,C.wing),path("M 17 40 Q 23 44 29 40",C.feather,3)],{parent:rightWing});
  }
  return {v:"5.12.2",fr:FPS,ip:0,op:END,w:320,h:320,nm:`English Path · ${pose}`,ddd:0,assets:[],layers:layers.reverse(),markers:[]};
}

// SVG poster uses exactly the first frame of the rig, so no visual swap on load.
const value = p => p.a ? p.k[0].s : p.k;
const scalar = p => { const v=value(p); return Array.isArray(v)?v[0]:v; };
function svgTransform(ks) { const p=value(ks.p),a=value(ks.a),s=value(ks.s); return `translate(${p[0]} ${p[1]}) rotate(${scalar(ks.r)}) scale(${s[0]/100} ${s[1]/100}) translate(${-a[0]} ${-a[1]})`; }
const color = p => `rgb(${value(p).slice(0,3).map(x=>Math.round(x*255)).join(" ")})`;
function svgShape(group) {
  const shape=group.it[0],paint=group.it[1],style=paint.ty==="fl"?`fill="${color(paint.c)}"`:`fill="none" stroke="${color(paint.c)}" stroke-width="${scalar(paint.w)}" stroke-linecap="round" stroke-linejoin="round"`;
  if(shape.ty==="el") {const p=value(shape.p),s=value(shape.s);return `<ellipse cx="${p[0]}" cy="${p[1]}" rx="${s[0]/2}" ry="${s[1]/2}" ${style}/>`;}
  const raw=value(shape.ks); const {v,i,o,c}=Array.isArray(raw)?raw[0]:raw; let d=`M${v[0].join(" ")}`;
  for(let j=1;j<v.length+(c?1:0);j++){const prev=(j-1)%v.length,k=j%v.length;d+=`C${v[prev].map((x,n)=>x+o[prev][n]).join(" ")} ${v[k].map((x,n)=>x+i[k][n]).join(" ")} ${v[k].join(" ")}`;}
  return `<path d="${d}${c?"Z":""}" ${style}/>`;
}
function svgPoster(data) {
  const byId=new Map(data.layers.map(l=>[l.ind,l]));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">`+ [...data.layers].reverse().filter(l=>l.ty===4).map(l=>{let chain=[],p=l;while(p){chain.unshift(p);p=byId.get(p.parent);}return chain.map(x=>`<g transform="${svgTransform(x.ks)}" opacity="${scalar(x.ks.o)/100}">`).join("")+[...l.shapes].reverse().map(svgShape).join("")+"</g>".repeat(chain.length);}).join("")+"</svg>";
}
await mkdir("assets/mascots/lottie",{recursive:true});
for(const pose of ["reading","listening","teaching","cheer"]){
  const data=animation(pose);
  await writeFile(`assets/mascots/lottie/parrot-${pose}.json`,JSON.stringify(data,(_key,value)=>typeof value==="number"?Math.round(value*10000)/10000:value));
  await writeFile(`assets/mascots/lottie/parrot-${pose}.svg`,svgPoster(data));
}
console.log("Built four articulated Lottie animations and matching vector posters.");
