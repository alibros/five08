/**
 * Contact sheets from the real renderers, with SVG bounds and WebGL pixel checks.
 * Run against Vite dev: node scripts/dev/component-audit.mjs /tmp/five08-audit
 * Creates only compact JPEG sheets and a JSON report in the supplied directory.
 */
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

if(!process.argv[2])throw new Error('Supply a disposable output directory.');
const output=resolve(process.argv[2]),origin=process.env.BASE_URL??'http://127.0.0.1:5173';
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
try{
  const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/__component-audit',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><title>Component audit</title></head><body></body></html>'}));
  await page.goto(`${origin}/__component-audit`);
  const report=await page.evaluate(async()=>{
    const {catalog}=await import('/src/catalog.ts');
    const {emptyProject}=await import('/src/model.ts');
    const {componentSvg}=await import('/src/svg.ts');
    const {createHardware,HardwareResources}=await import('/src/hardware3d.ts');
    const {cutoutShape}=await import('/src/geometry.ts');
    const {contour}=await import('/src/inspect3d.ts');
    const THREE=await import('/node_modules/.vite/deps/three.js');
    const {RoomEnvironment}=await import('/node_modules/three/examples/jsm/environments/RoomEnvironment.js');
    const hardware=catalog.filter(d=>d.category!=='Graphics'&&!['hole','shape'].includes(d.renderer));
    const p=emptyProject(),failures=[],pixelChecks=[];
    const item=(d,value=.62)=>({id:d.id,componentId:d.id,x:0,y:0,rotation:0,label:'',color:d.color,width:d.width,height:d.height,value,locked:false,hidden:false,role:'none',identifier:''});
    document.head.insertAdjacentHTML('beforeend',`<style>
      *{box-sizing:border-box}body{margin:0;font:12px system-ui;color:#263139;background:#edf0f1}
      section{padding:16px}h1{font-size:20px;margin:0 0 16px;font-weight:600}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px 10px}
      article{border-top:1px solid #87969d;padding-top:8px;min-width:0}
      h2{font-size:12px;font-weight:600;margin:0 0 3px}small{opacity:.7;font:10px ui-monospace,monospace}
      .views{display:grid;grid-template-columns:repeat(3,1fr);margin-top:6px;gap:3px}.views>div{min-width:0}
      svg,img{display:block;width:100%;height:156px;object-fit:contain}.caption{text-align:center;font-size:10px;opacity:.65;margin-top:3px}
      .dark{color:#e2e8e8;background:#171d1e}.dark article{border-color:#445256}
    </style>`);
    const probe=document.createElementNS('http://www.w3.org/2000/svg','svg');
    probe.setAttribute('width','200');probe.setAttribute('height','200');document.body.append(probe);
    let boundsChecks=0;
    for(const d of catalog.filter(d=>d.category!=='Graphics'))for(const value of [0,.5,1])for(const rotation of [0,37,90]){
      probe.innerHTML=`<g id="probe">${componentSvg({...item(d,value),rotation},d,p,false,'design','preview')}</g>`;
      const box=probe.querySelector('#probe').getBBox(),r=rotation*Math.PI/180;
      const width=Math.abs(Math.cos(r))*d.width+Math.abs(Math.sin(r))*d.height;
      const height=Math.abs(Math.sin(r))*d.width+Math.abs(Math.cos(r))*d.height;
      boundsChecks++;
      if(box.x < -width/2-.001 || box.y < -height/2-.001 || box.x+box.width > width/2+.001 || box.y+box.height > height/2+.001){
        failures.push({id:d.id,value,rotation,box:{x:box.x,y:box.y,width:box.width,height:box.height},footprint:{width,height}});
      }
    }
    probe.remove();

    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(240,312);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    const environmentScene=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(environmentScene,.04);
    environmentScene.dispose();pmrem.dispose();
    const sample=document.createElement('canvas');sample.width=60;sample.height=78;const context=sample.getContext('2d');
    const families={rotary:['knob'],connectors:['jack','connector'],performance:['slider','button','toggle','touch'],indicators:['display','led']};
    for(const tone of ['light','dark'])for(const [family,renderers] of Object.entries(families)){
      const section=document.createElement('section');section.id=`${family}-${tone}`;section.className=tone;
      section.innerHTML=`<h1>${family.toUpperCase()} / ${tone}</h1><div class="grid"></div>`;document.body.append(section);
      const grid=section.querySelector('.grid'),bg=tone==='dark'?'#171d1e':'#edf0f1',surface=tone==='dark'?'#242c2a':'#bdc4c6';
      for(const d of hardware.filter(d=>renderers.includes(d.renderer))){
        const i=item(d),resources=new HardwareResources(),scene=new THREE.Scene();
        scene.background=new THREE.Color(bg);scene.environment=environment.texture;scene.environmentIntensity=.75;
        const key=new THREE.DirectionalLight('#fff6e9',3.1);key.position.set(-70,100,150);key.castShadow=true;
        key.shadow.mapSize.set(512,512);Object.assign(key.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:500});key.shadow.camera.updateProjectionMatrix();
        key.shadow.normalBias=.075;key.shadow.bias=-.00012;scene.add(key);
        const rim=new THREE.DirectionalLight('#cfdeee',2.2);rim.position.set(100,40,-120);scene.add(rim);
        scene.add(new THREE.HemisphereLight('#f4f7ff','#7a818a',.7));
        const root=new THREE.Group(),model=createHardware(d,i,p.accentColor,resources);root.add(model.front);scene.add(root);
        const span=Math.max(d.width,d.height)+8;
        const shape=new THREE.Shape([new THREE.Vector2(-span/2,-span/2),new THREE.Vector2(span/2,-span/2),new THREE.Vector2(span/2,span/2),new THREE.Vector2(-span/2,span/2)]);
        const hole=cutoutShape(i,d);if(hole)shape.holes.push(new THREE.Path(contour(hole).map(pt=>new THREE.Vector2(pt.x,-pt.y))));
        const geometry=new THREE.ExtrudeGeometry(shape,{depth:2,bevelEnabled:false});geometry.translate(0,0,-2.03);
        const material=new THREE.MeshStandardMaterial({color:surface,metalness:.5,roughness:.55});
        const panel=new THREE.Mesh(geometry,material);panel.receiveShadow=true;root.add(panel);
        const article=document.createElement('article');
        article.innerHTML=`<h2>${d.name}</h2><small>${d.id} / ${d.width} x ${d.height} mm</small><div class="views"><div><svg viewBox="${-span/2} ${-span*.65} ${span} ${span*1.3}" xmlns="http://www.w3.org/2000/svg"><rect x="${-span/2}" y="${-span/2}" width="${span}" height="${span}" fill="${surface}"/>${componentSvg(i,d,p,false,'design','preview')}</svg><div class="caption">2D</div></div></div>`;
        for(const view of ['front','iso']){
          const box=new THREE.Box3().setFromObject(root),center=box.getCenter(new THREE.Vector3());
          const direction=new THREE.Vector3(view==='iso'?.55:0,view==='iso'?.35:0,1).normalize();
          const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000);camera.position.copy(center).addScaledVector(direction,200);camera.lookAt(center);camera.updateMatrixWorld();
          let extentX=0,extentY=0;
          for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
            const corner=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);extentX=Math.max(extentX,Math.abs(corner.x));extentY=Math.max(extentY,Math.abs(corner.y));
          }
          const half=Math.max(extentY,extentX*1.3)*1.06;
          camera.left=-half/1.3;camera.right=half/1.3;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.render(scene,camera);
          context.drawImage(renderer.domElement,0,0,60,78);const data=context.getImageData(0,0,60,78).data;let visible=0;
          for(let n=0;n<data.length;n+=4)if(Math.abs(data[n]-data[0])+Math.abs(data[n+1]-data[1])+Math.abs(data[n+2]-data[2])>25)visible++;
          const minimum=Math.max(20,Math.min(150,2000*d.width*d.height/(span*span)));
          pixelChecks.push({id:d.id,tone,view,visible,minimum});if(visible<minimum)failures.push({id:d.id,tone,view,visible,minimum});
          const holder=document.createElement('div'),image=new Image();image.alt=`${d.name} ${view}`;image.src=renderer.domElement.toDataURL('image/png');holder.append(image);
          holder.insertAdjacentHTML('beforeend',`<div class="caption">3D ${view}</div>`);article.querySelector('.views').append(holder);
        }
        grid.append(article);resources.dispose();geometry.dispose();material.dispose();key.shadow.dispose();
      }
      section.hidden=true;
    }
    environment.dispose();renderer.dispose();renderer.forceContextLoss();
    return{catalogParts:catalog.length,modeledParts:hardware.length,boundsChecks,pixelChecks,failures};
  });
  for(const tone of ['light','dark'])for(const family of ['rotary','connectors','performance','indicators']){
    const selector=`#${family}-${tone}`;
    await page.locator(selector).evaluate(el=>el.hidden=false);
    await page.locator(selector).screenshot({path:join(output,`${family}-${tone}.jpg`),type:'jpeg',quality:83});
    await page.locator(selector).evaluate(el=>el.hidden=true);
  }
  report.errors=errors;
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({output,catalogParts:report.catalogParts,modeledParts:report.modeledParts,boundsChecks:report.boundsChecks,pixelChecks:report.pixelChecks.length,failures:report.failures,errors},null,2));
  if(report.failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
