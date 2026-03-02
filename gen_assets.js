const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'client', 'public', 'img');

function writePNG(filename, width, height, pixels) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4);
  ihdr[8]=8; ihdr[9]=6; // RGBA

  const scanlines = [];
  for(let y=0;y<height;y++){
    const row=Buffer.alloc(1+width*4); row[0]=0;
    for(let x=0;x<width;x++){
      const px = pixels(x,y,width,height);
      row[1+x*4]=px[0]; row[2+x*4]=px[1]; row[3+x*4]=px[2]; row[4+x*4]=px[3]??255;
    }
    scanlines.push(row);
  }
  const raw = Buffer.concat(scanlines);
  const compressed = zlib.deflateSync(raw);

  function crc32(buf){
    let c=0xffffffff;
    for(const b of buf){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^(c&1?0xedb88320:0);}
    return (c^0xffffffff)>>>0;
  }
  function chunk(t,d){
    const l=Buffer.alloc(4); l.writeUInt32BE(d.length);
    const tb=Buffer.from(t);
    const cr=Buffer.alloc(4); cr.writeUInt32BE(crc32(Buffer.concat([tb,d])));
    return Buffer.concat([l,tb,d,cr]);
  }

  fs.writeFileSync(path.join(OUT, filename),
    Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',compressed), chunk('IEND',Buffer.alloc(0))]));
}

// Helper shapes
const circle = (cx,cy,r) => (x,y) => Math.hypot(x-cx,y-cy) < r;
const rect   = (x1,y1,x2,y2) => (x,y) => x>=x1&&x<=x2&&y>=y1&&y<=y2;

const assets = {
  'player.png':       { w:48, h:48, fn:(x,y,w,h) => circle(w/2,h/2,20)(x,y) ? [100,160,230,255] : [0,0,0,0] },
  'rabbit.png':       { w:40, h:40, fn:(x,y,w,h) => circle(20,22,14)(x,y) ? [220,200,180,255] : [0,0,0,0] },
  'wolf.png':         { w:48, h:40, fn:(x,y,w,h) => circle(24,22,18)(x,y) ? [120,120,140,255] : [0,0,0,0] },
  'mammoth.png':      { w:64, h:56, fn:(x,y,w,h) => circle(32,30,26)(x,y) ? [160,150,140,255] : [0,0,0,0] },
  'tree.png':         { w:64, h:80, fn:(x,y,w,h) => {
    if (y < 58 && circle(32,30,26)(x,y)) return [60,140,60,255];
    if (y >= 55 && Math.abs(x-32)<7)    return [120,80,40,255];
    return [0,0,0,0];
  }},
  'tree_snow.png':    { w:64, h:80, fn:(x,y,w,h) => {
    if (y < 58 && circle(32,30,26)(x,y)) return [210,230,250,255];
    if (y >= 55 && Math.abs(x-32)<7)    return [120,80,40,255];
    return [0,0,0,0];
  }},
  'stone.png':        { w:48, h:40, fn:(x,y,w,h) => circle(24,22,18)(x,y) ? [150,150,155,255] : [0,0,0,0] },
  'gold.png':         { w:48, h:40, fn:(x,y,w,h) => circle(24,22,18)(x,y) ? [230,185,45,255]  : [0,0,0,0] },
  'berry_bush.png':   { w:48, h:48, fn:(x,y,w,h) => {
    const r = Math.hypot(x-24,y-24);
    if (r < 20) return [70,150,50,255];
    if (r < 23 && Math.sin(x*1.2+y*0.9) > 0.3) return [210,40,40,255];
    return [0,0,0,0];
  }},
  'cactus.png':       { w:32, h:64, fn:(x,y,w,h) => Math.abs(x-16)<8 ? [55,155,55,255] : [0,0,0,0] },
  'campfire.png':     { w:48, h:44, fn:(x,y,w,h) => {
    if (y > 26 && Math.abs(x-24) < 16) return [130,85,40,255];
    if (y <= 26 && circle(24,18,10)(x,y)) return [240,130,30,255];
    return [0,0,0,0];
  }},
  'wall_wood.png':    { w:48, h:48, fn:(x,y,w,h) => rect(5,5,43,43)(x,y) ? [160,108,55,255] : [0,0,0,0] },
  'wall_stone.png':   { w:48, h:48, fn:(x,y,w,h) => rect(5,5,43,43)(x,y) ? [140,138,140,255] : [0,0,0,0] },
  'spike_wood.png':   { w:48, h:48, fn:(x,y,w,h) => Math.abs(x-24)+Math.abs(y-24)<22 ? [155,105,50,255] : [0,0,0,0] },
  'axe.png':          { w:32, h:40, fn:(x,y,w,h) => {
    if (Math.abs(x-10)<5 && y>4 && y<36) return [150,100,50,255];
    if (x>14 && x<30 && y>4 && y<22)     return [200,205,215,255];
    return [0,0,0,0];
  }},
  'pick.png':         { w:40, h:32, fn:(x,y,w,h) => {
    if (y>12 && y<20 && x>4 && x<36) return [150,100,50,255];
    if (x>8 && x<32 && y<14)          return [200,205,215,255];
    return [0,0,0,0];
  }},
  'sword.png':        { w:16, h:52, fn:(x,y,w,h) => {
    if (Math.abs(x-8)<4 && y<38) return [205,212,220,255];
    if (Math.abs(x-8)<5 && y>=38) return [160,130,55,255];
    return [0,0,0,0];
  }},
  'big_axe.png':      { w:44, h:52, fn:(x,y,w,h) => {
    if (Math.abs(x-12)<6 && y>4 && y<48) return [110,75,30,255];
    if (x>18 && x<42 && y>4 && y<32)     return [205,210,220,255];
    return [0,0,0,0];
  }},
  'gold_axe.png':     { w:44, h:52, fn:(x,y,w,h) => {
    if (Math.abs(x-12)<6 && y>4 && y<48) return [110,75,30,255];
    if (x>18 && x<42 && y>4 && y<32)     return [235,190,45,255];
    return [0,0,0,0];
  }},
  'gold_sword.png':   { w:16, h:52, fn:(x,y,w,h) => {
    if (Math.abs(x-8)<4 && y<38) return [235,190,45,255];
    if (Math.abs(x-8)<5 && y>=38) return [160,130,55,255];
    return [0,0,0,0];
  }},
  'berries.png':      { w:32, h:32, fn:(x,y,w,h) => circle(16,16,12)(x,y) ? [215,45,45,255] : [0,0,0,0] },
  'raw_meat.png':     { w:32, h:24, fn:(x,y,w,h) => rect(3,2,29,22)(x,y) ? [200,95,95,255] : [0,0,0,0] },
  'cooked_meat.png':  { w:32, h:24, fn:(x,y,w,h) => rect(3,2,29,22)(x,y) ? [135,75,45,255] : [0,0,0,0] },
  'wood.png':         { w:36, h:20, fn:(x,y,w,h) => rect(2,2,34,18)(x,y) ? [155,105,55,255] : [0,0,0,0] },
  'stone_item.png':   { w:24, h:20, fn:(x,y,w,h) => circle(12,10,9)(x,y)  ? [155,155,155,255] : [0,0,0,0] },
  'gold_item.png':    { w:24, h:20, fn:(x,y,w,h) => circle(12,10,9)(x,y)  ? [235,190,45,255]  : [0,0,0,0] },
  'thread.png':       { w:24, h:24, fn:(x,y,w,h) => circle(12,12,10)(x,y) ? [215,195,170,255] : [0,0,0,0] },
  'hat_winter.png':   { w:48, h:32, fn:(x,y,w,h) => {
    if (y < 18 && Math.abs(x-24)<18) return [200,228,255,255];
    if (y >= 18 && Math.abs(x-24)<24) return [200,228,255,255];
    return [0,0,0,0];
  }},
  'hat_cowboy.png':   { w:64, h:32, fn:(x,y,w,h) => {
    if (y < 18 && Math.abs(x-32)<14) return [135,95,55,255];
    if (y >= 18 && Math.abs(x-32)<30) return [135,95,55,255];
    return [0,0,0,0];
  }},
  'ground_grass.png': { w:32, h:32, fn:(x,y) => { const v=(x*7+y*13)%12; return [95+v,145+v,55+v,255]; }},
  'ground_sand.png':  { w:32, h:32, fn:(x,y) => { const v=(x*5+y*11)%10; return [215+v,195+v,130+v,255]; }},
  'ground_snow.png':  { w:32, h:32, fn:(x,y) => { const v=(x*3+y*7)%8;   return [228+v,238+v,255,255]; }},
  'ground_water.png': { w:32, h:32, fn:(x,y) => { const v=(x*9+y*5)%14;  return [35+v,90+v,195+v,255]; }},
  'ground_dark.png':  { w:32, h:32, fn:(x,y) => { const v=(x*6+y*9)%10;  return [55+v,70+v,45+v,255]; }},
  'hand.png':         { w:24, h:32, fn:(x,y,w,h) => rect(3,3,21,29)(x,y)  ? [215,175,135,255] : [0,0,0,0] },
};

let count = 0;
for (const [name, {w, h, fn}] of Object.entries(assets)) {
  writePNG(name, w, h, fn);
  count++;
  process.stdout.write('.');
}
console.log('\nGenerated', count, 'sprites in', OUT);
