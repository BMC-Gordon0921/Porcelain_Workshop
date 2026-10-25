import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {reliefSculpture} from './relief-model.js';

function disposeTree(root){const geometries=new Set(),materials=new Set();root.traverse(m=>{if(m.geometry)geometries.add(m.geometry);if(m.material)for(const mat of [m.material].flat())materials.add(mat);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
export function createKilnModel(){
 const group=new THREE.Group(),brick=new THREE.MeshStandardMaterial({color:0xb47a53,roughness:.93}),trim=new THREE.MeshStandardMaterial({color:0xd6a271,roughness:.8}),iron=new THREE.MeshStandardMaterial({color:0x514b42,roughness:.65,metalness:.25}),dark=new THREE.MeshStandardMaterial({color:0x392b26,roughness:1}),rounded=new RoundedBoxGeometry(1,1,1,2,.065);
 const add=(geo,mat,x,y,z,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;group.add(m);return m;};
 const box=(mat,x,y,z,w,h,d)=>add(rounded,mat,x,y,z,w,h,d);
 box(iron,0,.15,0,2.35,.3,2.1);box(dark,0,.9,-.65,1.9,1.3,.4);
 for(const sign of [-1,1])box(brick,sign*.89,.91,0,.4,1.45,1.85);
 add(new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2),brick,0,1.5,0,1.09,.65,.94);
 box(dark,0,.33,.2,1.8,.13,1.55);
 for(const sign of [-1,1])for(let row=0;row<4;row++)box(trim,sign*.89,.48+row*.27,.97,.38,.24,.14);
 for(let i=0;i<9;i++){const angle=i/8*Math.PI,m=box(trim,Math.cos(angle)*.8,1.38+Math.sin(angle)*.57,.99,.27,.25,.18);m.rotation.z=angle-Math.PI/2;}
 const doorGroup=new THREE.Group();doorGroup.name='kiln-door';doorGroup.position.set(-.83,.15,.94);group.add(doorGroup);
 const doorShape=new THREE.Shape();doorShape.moveTo(0,0);doorShape.lineTo(1.66,0);doorShape.lineTo(1.66,1.02);doorShape.absarc(.83,1.02,.83,0,Math.PI,false);doorShape.lineTo(0,0);
 const doorPanel=new THREE.Mesh(new THREE.ShapeGeometry(doorShape,24),new THREE.MeshStandardMaterial({color:0x5d402e,roughness:.92,metalness:.04,side:THREE.DoubleSide}));doorPanel.castShadow=doorPanel.receiveShadow=true;doorGroup.add(doorPanel);
 for(let i=0;i<5;i++){const groove=new THREE.Mesh(new THREE.BoxGeometry(.035,1.02,.025),new THREE.MeshStandardMaterial({color:0x412b1f,roughness:1}));groove.position.set(.2+i*.31,.56,.012);doorGroup.add(groove);}
 for(const y of [.4,.94]){const strap=new THREE.Mesh(new THREE.BoxGeometry(1.5,.075,.035),iron);strap.position.set(.83,y,.027);strap.castShadow=true;doorGroup.add(strap);}
 const handle=new THREE.Mesh(new THREE.TorusGeometry(.095,.014,6,18),iron);handle.position.set(1.26,.74,.045);doorGroup.add(handle);
 let doorOpen=0;
 add(new THREE.CylinderGeometry(.26,.33,.9,24),brick,-.25,2.31,-.35);add(new THREE.CylinderGeometry(.36,.36,.14,24),iron,-.25,2.79,-.35);
 for(const y of [.68,1.23])for(const sign of [-1,1])box(iron,sign*1.075,y,0,.04,.055,1.85);
 const hearthMaterial=new THREE.MeshStandardMaterial({color:0x783e23,emissive:0xff7626,emissiveIntensity:.02,roughness:1});box(hearthMaterial,0,.44,-.36,1.4,.25,.1);
 const flameGroup=new THREE.Group();group.add(flameGroup);const flames=[];
 for(let i=0;i<9;i++){const mat=new THREE.MeshBasicMaterial({color:i%2?0xffb940:0xff6d20,transparent:true,opacity:.7,depthWrite:false});const m=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),mat);m.position.set((i%5-2)*.23,.52,i<5?.83:.0);m.scale.set(.07,.18+(i%3)*.06,.07);flameGroup.add(m);flames.push(m);}
 const light=new THREE.PointLight(0xff9c46,0,4);light.position.set(0,1,.72);group.add(light);
 const gauge=add(new THREE.CylinderGeometry(.14,.14,.04,24),iron,.86,1.7,.95);gauge.rotation.x=Math.PI/2;
 const upgrades=new THREE.Group();group.add(upgrades);
 const tiers=[new THREE.Group(),new THREE.Group()];tiers.forEach(t=>upgrades.add(t));
 for(const side of [-1,1]){tiers[0].add(box(iron,side*1.06,1.12,0,.11,1.7,1.78));tiers[0].add(box(trim,side*.83,.55,.93,.37,.55,.14));}
 tiers[0].add(box(iron,.74,1.95,.68,.43,.5,.22));
 for(let i=0;i<5;i++)tiers[0].add(box(trim,.82,.55+i*.075,.91,.5,.035,.13));
 for(const x of [-.7,.7]){tiers[1].add(box(iron,x,2.18,-.25,.21,.95,.36));tiers[1].add(box(trim,x,2.64,-.25,.42,.12,.48));}
 tiers[1].add(box(iron,0,2.05,.93,1.4,.16,.16));
 for(const x of [-.42,0,.42]){const dial=add(new THREE.CylinderGeometry(.14,.14,.065,20),trim,x,1.94,1.03);dial.rotation.x=Math.PI/2;tiers[1].add(dial);}
 let piece=null,key='',piecePixels=null,time=0;
 return {group,setPiece(pixels,revision){if(key===revision&&piecePixels===pixels)return;key=revision;piecePixels=pixels;if(piece){group.remove(piece);disposeTree(piece);}piece=reliefSculpture(pixels);piece.scale.setScalar(.86);piece.position.set(0,.4,.5);group.add(piece);},
  update(dt,{firing=false,heat=0,level=1,reduced=false}={}){if(firing)time+=dt;const hot=THREE.MathUtils.clamp(heat,0,1);
   doorOpen+=((firing?1:0)-doorOpen)*(reduced?1:Math.min(1,dt*7));
   doorGroup.rotation.y=-doorOpen*1.72;doorGroup.visible=doorOpen<.985;
   hearthMaterial.emissiveIntensity=.02+(firing?hot*3.1:0);light.intensity=firing?.35+hot*4.2:0;
   flameGroup.visible=firing&&hot>.015;
   flames.forEach((m,i)=>{const base=.1+hot*(.2+(i%3)*.055);m.scale.y=base*(1+(reduced?0:Math.sin(time*9+i*2)*.28));m.scale.x=.07*(.7+hot*.75);m.scale.z=.07*(.7+hot*.7);m.rotation.z=reduced?0:Math.sin(time*4+i)*.2;m.material.opacity=.35+hot*.55;});
   upgrades.children.forEach((m,i)=>m.visible=level>i+1);
  },dispose(){disposeTree(group);}};
}

export function createKilnPreview(canvas,state){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(37,1,.1,30);camera.position.set(3.1,2.85,6.7);camera.lookAt(0,1.5,0);
 scene.add(new THREE.HemisphereLight(0xfff0d7,0x8b7e6a,2.6));const sun=new THREE.DirectionalLight(0xffedd2,3.3);sun.position.set(-3,6,5);scene.add(sun);
 const kiln=createKilnModel();scene.add(kiln.group);const floor=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.7,.12,48),new THREE.MeshStandardMaterial({color:0xd5bea0,roughness:1}));floor.position.y=-.07;scene.add(floor);
 const resize=()=>{const r=canvas.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=Math.max(1,r.width)/Math.max(1,r.height);camera.updateProjectionMatrix();renderer.render(scene,camera);};
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();let disposed=false;
 function update(dt,current,paused=false){if(disposed)return;kiln.setPiece(current.piece.pixels,current.piece.revision);kiln.update(paused?0:dt,{firing:!!current.kiln,heat:current.kiln?.heat||0,level:current.stationLevel('kiln'),reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});renderer.render(scene,camera);canvas.dataset.heat=String(current.kiln?.heat||0);canvas.dataset.paused=String(paused);}
 update(0,state);
 return {update,dispose(){if(disposed)return;disposed=true;observer.disconnect();kiln.dispose();floor.geometry.dispose();floor.material.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
