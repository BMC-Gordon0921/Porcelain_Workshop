export function createOrbitGesture() {
  const points = new Map();
  const distance = () => {
    const [a,b] = points.values();
    return Math.hypot(a.x-b.x,a.y-b.y);
  };
  return {
    get active() { return points.size > 0; },
    add(id,x,y,touch,pan=false) {
      if (points.size >= 2 || (points.size && (!touch || !points.values().next().value.touch))) return false;
      points.set(id,{x,y,touch,pan});
      return true;
    },
    move(id,x,y) {
      const point = points.get(id);
      if (!point) return null;
      const pinch = points.size === 2;
      const before = pinch ? distance() : 0;
      const dx = x-point.x, dy = y-point.y;
      Object.assign(point,{x,y});
      return pinch ? {scale:before >= 1 ? distance()/before : 1,panX:dx/2,panY:dy/2} : point.pan ? {panX:dx,panY:dy} : {dx,dy};
    },
    remove(id) { points.delete(id); },
    clear() { points.clear(); },
  };
}

export function bindOrbitGesture(canvas,listen,{enabled,rotate,zoom,pan,activity=()=>{}}) {
  const gesture = createOrbitGesture();
  listen(canvas,'pointerdown',event=>{
    if (!enabled() || (event.button !== 0 && !(pan && event.button===2 && event.pointerType==='mouse')) || !gesture.add(event.pointerId,event.clientX,event.clientY,event.pointerType==='touch',event.button===2)) return;
    event.preventDefault();
    try { canvas.setPointerCapture?.(event.pointerId); } catch { /* Window listeners still track the pointer. */ }
    activity();
  });
  listen(window,'pointermove',event=>{
    if (!enabled()) return;
    const motion = gesture.move(event.pointerId,event.clientX,event.clientY);
    if (!motion) return;
    if (motion.scale !== undefined) zoom(motion.scale);
    if (motion.panX !== undefined) pan?.(motion.panX,motion.panY);
    if (motion.dx !== undefined) rotate(motion.dx,motion.dy);
    activity();
  });
  if(pan)listen(canvas,'contextmenu',event=>{if(enabled())event.preventDefault();});
  listen(window,'pointerup',event=>gesture.remove(event.pointerId));
  const clear = ()=>gesture.clear();
  listen(window,'pointercancel',clear);
  listen(canvas,'lostpointercapture',event=>gesture.remove(event.pointerId));
  listen(window,'blur',clear);
  listen(document,'visibilitychange',()=>{if(document.hidden)clear();});
  return gesture;
}
