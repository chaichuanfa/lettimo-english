const fs=require('fs');
const {Resvg}=require('/tmp/parrot-svg-render/node_modules/@resvg/resvg-js');
const dir=__dirname+'/gallery-frames';
for(let f=0;f<144;f++){
 const key=String(f).padStart(4,'0');
 const birds=JSON.parse(fs.readFileSync(dir+'/'+key+'.json','utf8'));
 const labels=['欢迎挥翅','阅读翻页','侧耳聆听','字母讲解','双翅庆祝'];
 const cards=birds.map((s,i)=>s.replace(/<svg[^>]*>/,`<svg x="${i*200}" y="0" width="200" height="200" viewBox="0 0 512 512">`)+`<text x="${i*200+100}" y="218" font-family="Arial, PingFang SC" font-size="16" font-weight="bold" text-anchor="middle" fill="#29452d">${labels[i]}</text>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="242"><rect width="1000" height="242" fill="#fffdf8"/>${cards}</svg>`;
 fs.writeFileSync(dir+'/'+key+'.png',new Resvg(svg).render().asPng());
}
