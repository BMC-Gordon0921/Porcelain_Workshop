import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

let manifestPromise;
const downloads=new Map();
const base=import.meta.env?.BASE_URL||'/';
async function read(url){const response=await fetch(base+url);if(!response.ok)throw new Error(`Scene asset: ${response.status}`);return response;}
export async function loadSceneEnvironment(id){
 if(!manifestPromise)manifestPromise=read('models/maps/manifest.json').then(r=>r.json()).catch(e=>{manifestPromise=null;throw e;});
 const config=(await manifestPromise)[id];
 if(!config)throw new Error(`Unknown scene: ${id}`);
 if(!downloads.has(id))downloads.set(id,read(config.url).then(r=>r.arrayBuffer()).catch(e=>{downloads.delete(id);throw e;}));
 let gltf;try{gltf=await new GLTFLoader().parseAsync((await downloads.get(id)).slice(0),base+'models/maps/');}catch(error){downloads.delete(id);throw error;}
 const group=gltf.scene;group.name=`environment-${id}`;
 group.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});
 return {...config,group,dispose(){disposeSceneTree(group);group.clear();}};
}
export function disposeSceneTree(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});
 geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());
}
