const fs=require('fs');
const {Resvg}=require('/tmp/parrot-svg-render/node_modules/@resvg/resvg-js');
const dir=__dirname+'/teaching-v2-frames';
for(let f=0;f<288;f++){
 const key=String(f).padStart(4,'0');
 const svg=fs.readFileSync(dir+'/'+key+'.svg','utf8');
 fs.writeFileSync(dir+'/'+key+'.png',new Resvg(svg,{background:'#fffdf8',fitTo:{mode:'width',value:768}}).render().asPng());
}
