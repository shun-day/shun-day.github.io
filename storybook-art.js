/* ================================================================
   STORYBOOK ART — textured 2D crayon, not SVG or an external image.
   Each picture is drawn in a seeded, reproducible manner.
   Drawings follow rendered pages, including dynamically flipped ones.
   ================================================================ */
(() => {
  'use strict';
  const COL = {
    ink:'#79695e', rose:'#d59d9a', pink:'#eabbb2', leaf:'#98ae91',
    leaf2:'#b8c6a4', blue:'#b3cad1', sky:'#dae7e5', yellow:'#e9c77e',
    cream:'#f4e8cc', earth:'#b9a68c', gray:'#c7c0b3', dress:'#f4eee5'
  };

  function painter(canvas, seed) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    let state = seed >>> 0;
    const r = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
    const between = (a,b) => a + r() * (b-a);
    const W = 800, H = 580;
    canvas.width = W; canvas.height = H;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.lineCap='round'; ctx.lineJoin='round';

    // Wax pigment consists of short, uneven layered marks.
    function stroke(points, color, width=3, strength=.8) {
      for (let pass=0; pass<5; pass++) {
        ctx.beginPath();
        points.forEach(([x,y],i) => {
          const px=x+between(-2,2), py=y+between(-2,2);
          if(!i)ctx.moveTo(px,py); else ctx.lineTo(px,py);
        });
        ctx.strokeStyle=color; ctx.globalAlpha=strength * between(.09,.29);
        ctx.lineWidth=width*between(.35,1.12); ctx.stroke();
      }
      ctx.globalAlpha=1;
      // Pale dry pencil-like speckles along the path.
      for(let i=1;i<points.length;i++) {
        const [x0,y0]=points[i-1], [x1,y1]=points[i];
        const n=Math.round(Math.hypot(x1-x0,y1-y0)/2.8);
        for(let j=0;j<n;j++) {
          const t=r(), x=x0+(x1-x0)*t+between(-3,3), y=y0+(y1-y0)*t+between(-3,3);
          ctx.fillStyle=color;ctx.globalAlpha=strength*between(.04,.22);
          ctx.fillRect(x,y,between(.7,2.5),between(.6,1.9));
        }
      }
      ctx.globalAlpha=1;
    }
    function pathPoints(fn, steps=44) {
      return Array.from({length:steps+1},(_,i)=>fn(i/steps));
    }
    function pigment(color,box,count=60) {
      // The current shape is a clipping path: small translucent scratches
      // remain inside the colored area, like wax skipping paper grain.
      ctx.save(); ctx.clip();
      for(let i=0;i<count;i++) {
        const x=between(box[0],box[2]),y=between(box[1],box[3]);
        ctx.beginPath();ctx.moveTo(x,y);
        ctx.lineTo(x+between(3,14),y+between(-4,4));
        ctx.strokeStyle=color;ctx.lineWidth=between(.7,3.0);
        ctx.globalAlpha=between(.06,.28);ctx.stroke();
      }
      ctx.restore();ctx.globalAlpha=1;
    }
    function oval(cx,cy,rx,ry,color,width=3,fill=.16) {
      const p=pathPoints(t=>[cx+Math.cos(t*Math.PI*2)*rx,cy+Math.sin(t*Math.PI*2)*ry],60);
      ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
      ctx.fillStyle=color; ctx.globalAlpha=fill; ctx.fill(); ctx.globalAlpha=1;
      pigment(color,[cx-rx,cy-ry,cx+rx,cy+ry],Math.max(9,Math.round(rx*ry/90)));
      stroke(p,color,width);
      return p;
    }
    function polygon(points,color,fill=.23) {
      ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
      ctx.fillStyle=color;ctx.globalAlpha=fill;ctx.fill();ctx.globalAlpha=1;
      const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
      pigment(color,[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],150);
      stroke([...points,points[0]],color,4);
    }
    function curve(x1,y1,x2,y2,x3,y3,color,width=3) {
      stroke(pathPoints(t=>{
        const s=1-t;
        return [s*s*x1+2*s*t*x2+t*t*x3,s*s*y1+2*s*t*y2+t*t*y3];
      },32),color,width);
    }
    function flower(x,y,s=1,pigment=COL.rose) {
      stroke([[x,y+8*s],[x-2*s,y+21*s],[x+2*s,y+33*s]],COL.leaf,2.5);
      oval(x-9*s,y+22*s,9*s,3.5*s,COL.leaf2,1.6,.26);
      for(let i=0;i<5;i++){
        const a=(Math.PI*2*i/5), cx=x+Math.cos(a)*7*s, cy=y+Math.sin(a)*7*s;
        oval(cx,cy,7*s,5*s,pigment,2.2,.28);
      }
      oval(x,y,4*s,4*s,COL.yellow,1.8,.55);
    }
    function stars(x,y,s=1){
      stroke([[x-8*s,y],[x+8*s,y]],COL.yellow,2);
      stroke([[x,y-8*s],[x,y+8*s]],COL.yellow,2);
      oval(x,y,2*s,2*s,COL.yellow,1,.4);
    }
    function grass(x,y,s=1){
      stroke([[x-7*s,y+7*s],[x-4*s,y-3*s],[x,y+7*s],[x+5*s,y-6*s],[x+8*s,y+5*s]],COL.leaf,2.2);
    }
    function cloud(x,y,s=1){
      curve(x-55*s,y,x-35*s,y-18*s,x-18*s,y-9*s,COL.blue,4);
      curve(x-18*s,y-9*s,x-9*s,y-43*s,x+13*s,y-22*s,COL.blue,4);
      curve(x+13*s,y-22*s,x+31*s,y-35*s,x+40*s,y-9*s,COL.blue,4);
      curve(x+40*s,y-9*s,x+58*s,y-6*s,x+50*s,y+1*s,COL.blue,4);
    }
    function butterfly(x,y,s=1){
      oval(x-8*s,y-5*s,9*s,12*s,COL.pink,2,.18);
      oval(x+8*s,y-5*s,9*s,12*s,COL.blue,2,.20);
      oval(x-6*s,y+9*s,6*s,8*s,COL.yellow,1.5,.15);
      oval(x+6*s,y+9*s,6*s,8*s,COL.leaf,1.5,.17);
      stroke([[x,y-12*s],[x,y+18*s]],COL.ink,2);
    }
    function smallGarden(lower=true){
      const bottom=lower?510:425;
      for(let i=0;i<45;i++){
        const x=between(24,776), y=between(bottom-25,bottom+34);
        if(r()<.22) flower(x,y,between(.40,.85),r()<.5?COL.rose:COL.yellow);
        else grass(x,y,between(.4,1));
      }
      curve(35,bottom+12,370,bottom-35,764,bottom+14,COL.leaf,3);
    }
    function branch(x,y,flip=1) {
      curve(x,y,x+45*flip,y-92,x+28*flip,y-215,COL.earth,5);
      curve(x+24*flip,y-117,x+70*flip,y-137,x+91*flip,y-172,COL.earth,3);
      for(let j=0;j<17;j++){
        const yy=y-215+between(-18,100);
        const xx=x+flip*between(13,96);
        if(j%3===0)flower(xx,yy,between(.8,1.6),j%2?COL.pink:COL.rose);
        else oval(xx,yy,between(8,16),between(4,9),COL.leaf2,2,.25);
      }
    }
    function couple(x=405,y=400,scale=1) {
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
      // Wedding clothes: deliberately simple, faceless and hand-drawn.
      polygon([[-73,-77],[-103,39],[-5,39],[-31,-80]],COL.dress,.52);
      for(let i=0;i<13;i++){
        const xx=between(-95,-15);
        stroke([[xx,27],[xx+between(-5,5),36]],COL.earth,between(1,2),.5);
      }
      polygon([[35,-79],[19,30],[101,30],[87,-79],[63,-96]],COL.blue,.32);
      stroke([[62,-86],[62,24]],COL.ink,1.5,.5);
      stroke([[-59,37],[-61,68]],COL.ink,3);
      stroke([[60,30],[57,65]],COL.ink,3);
      stroke([[79,30],[82,65]],COL.ink,3);
      stroke([[-65,69],[-47,70]],COL.earth,4);
      stroke([[56,66],[44,69]],COL.earth,4);
      stroke([[82,65],[95,69]],COL.earth,4);
      // Arms meet in the middle
      stroke([[-30,-66],[-13,-39],[18,-38],[38,-67]],COL.earth,7);
      oval(-56,-125,29,33,COL.earth,3,.25);
      oval(69,-128,29,33,COL.earth,3,.25);
      // Hair is a dusty pencil silhouette, not a polished icon.
      curve(-84,-123,-91,-182,-48,-160,COL.ink,14);
      curve(-48,-160,-12,-163,-29,-120,COL.ink,11);
      curve(41,-133,46,-176,80,-170,COL.ink,12);
      curve(80,-170,109,-145,91,-125,COL.ink,10);
      // Flower in hair, lapel + little bouquet
      flower(-34,-157,.7,COL.rose);
      flower(-24,-70,.82,COL.pink);
      flower(-11,-67,.63,COL.yellow);
      flower(-16,-56,.75,COL.blue);
      stroke([[-15,-56],[-24,-18]],COL.leaf,2);
      ctx.restore();
    }
    function envelope(cx=400,cy=325){
      polygon([[cx-145,cy-85],[cx+145,cy-85],[cx+145,cy+92],[cx-145,cy+92]],COL.cream,.65);
      stroke([[cx-145,cy-85],[cx,cy+20],[cx+145,cy-85]],COL.ink,3);
      stroke([[cx-145,cy+92],[cx-22,cy+9]],COL.ink,2.5);
      stroke([[cx+145,cy+92],[cx+22,cy+9]],COL.ink,2.5);
      oval(cx,cy+21,23,21,COL.rose,4,.45);
      stroke([[cx-9,cy+19],[cx,cy+28],[cx+9,cy+19]],COL.paper||COL.cream,2.5);
      branch(cx-165,cy+110,-1);branch(cx+165,cy+112,1);
    }
    function venue(cx=400,cy=330){
      polygon([[cx-147,cy-61],[cx+144,cy-61],[cx+144,cy+132],[cx-147,cy+132]],COL.cream,.52);
      polygon([[cx-173,cy-64],[cx,cy-170],[cx+173,cy-64]],COL.rose,.28);
      stroke([[cx-173,cy-64],[cx,cy-170],[cx+173,cy-64]],COL.ink,4);
      polygon([[cx-34,cy+31],[cx+34,cy+31],[cx+34,cy+132],[cx-34,cy+132]],COL.blue,.34);
      oval(cx,cy-110,23,23,COL.yellow,3,.17);
      for(let dx of [-103,103]){
        polygon([[cx+dx-20,cy-18],[cx+dx+20,cy-18],[cx+dx+20,cy+29],[cx+dx-20,cy+29]],COL.blue,.20);
      }
      for(let i=0;i<10;i++)flower(cx-195+i*42,cy+150,.5,i%2?COL.pink:COL.yellow);
    }
    function album(cx=400,cy=300){
      ctx.save();ctx.translate(cx,cy);ctx.rotate(-.08);
      polygon([[-165,-145],[145,-145],[145,149],[-165,149]],COL.cream,.35);
      polygon([[-122,-105],[104,-105],[104,101],[-122,101]],COL.sky,.34);
      ctx.restore();
      // Tiny dreamy landscape inside the album
      curve(270,350,370,260,540,365,COL.leaf2,12);
      oval(475,245,32,32,COL.yellow,3,.23);
      cloud(347,250,.55);flower(333,399,1.4,COL.rose);flower(491,407,1.2,COL.pink);
      for(let j=0;j<4;j++)stars(215+j*110,165+(j%2)*24,.65);
    }
    function calendar(){
      polygon([[269,158],[532,158],[532,435],[269,435]],COL.cream,.45);
      polygon([[269,158],[532,158],[532,212],[269,212]],COL.rose,.27);
      for(let x=319;x<521;x+=64)stroke([[x,148],[x,184]],COL.ink,4);
      for(let row=0;row<3;row++)for(let col=0;col<4;col++){
        oval(315+col*57,254+row*55,6,6,COL.earth,1.5,.13);
      }
      oval(430,312,39,38,COL.pink,4,.12);
      stars(542,125,1.15);flower(248,426,1.9,COL.pink);flower(550,422,1.6,COL.yellow);
    }
    return { ctx,r,between,stroke,curve,oval,flower,stars,grass,cloud,butterfly,smallGarden,branch,couple,envelope,venue,album,calendar };
  }
  function render(canvas){
      const scene=canvas.dataset.crayon||'couple';
      const seed=[...scene].reduce((n,c)=>n*31+c.charCodeAt(0),57);
      const P=painter(canvas,seed); if(!P)return;
      const {ctx,r,between,stroke,curve,oval,flower,stars,grass,cloud,butterfly,smallGarden,branch,couple,envelope,venue,album,calendar}=P;
      if(scene==='sprig'||scene==='botanical') {
        // Same canvas dimensions, cropped composition with breathing room
        curve(240,300,405,340,565,300,COL.leaf,4);
        flower(370,294,1.6,COL.rose);flower(428,289,1.2,COL.yellow);
        for(let x=282;x<530;x+=41)grass(x,308,.8);
        stars(590,276,.85);stars(215,286,.5);
      } else if(scene==='venue') { venue();smallGarden(); }
      else if(scene==='day') { calendar();smallGarden(); }
      else if(scene==='gallery') { album();smallGarden(); }
      else if(scene==='love') { envelope();smallGarden(); }
      else if(scene==='story') {
        branch(123,469,1);branch(678,469,-1);
        couple(400,425,1.2); smallGarden();
        stars(418,115,1);butterfly(192,170,1.1);
      } else if(scene==='garden') {
        cloud(185,185,.85);cloud(615,132,.68);
        branch(95,468,1);branch(710,480,-1);
        couple(402,420,1.04);smallGarden();
        stars(400,108,1.25); butterfly(560,220,1.4);
      } else { // front cover: tender garden and two tiny protagonists
        cloud(185,122,.63); cloud(585,107,.58);
        branch(95,510,1);branch(706,506,-1);
        couple(405,415,1.10);
        smallGarden(); stars(397,95,1);stars(477,158,.7);
        butterfly(620,285,.9);
      }
      // Sparse pigment grains create irregular pastel wax on white paper.
      for(let i=0;i<450;i++){
        const x=between(18,782),y=between(12,568);
        const color=[COL.pink,COL.yellow,COL.blue,COL.leaf][Math.floor(r()*4)];
        ctx.globalAlpha=between(.025,.10);ctx.fillStyle=color;
        ctx.fillRect(x,y,between(.4,2.4),between(.4,1.7));
      }
      ctx.globalAlpha=1;
    }
  function paintPending(root=document){
    root.querySelectorAll('canvas[data-crayon]:not([data-painted])').forEach(canvas=>{
      canvas.dataset.painted='yes';
      try { render(canvas); } catch(err) { console.error('Crayon illustration:',err); }
    });
  }
  const book=document.getElementById('book');
  if(!book)return;
  paintPending(book);
  const observer=new MutationObserver(()=>paintPending(book));
  observer.observe(book,{childList:true,subtree:true});
})();
