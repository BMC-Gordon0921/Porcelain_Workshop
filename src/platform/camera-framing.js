export function panLimit(home,min,max,value,zoom) {
 const fraction=Math.max(0,Math.min(1,(zoom-1)/.6));
 return Math.max(home+(min-home)*fraction,Math.min(home+(max-home)*fraction,value));
}

export function edgeCorrection(value,size) {
 const margin=size*.18;
 return value<margin?value-margin:value>size-margin?value-(size-margin):0;
}
