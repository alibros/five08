import {DEFAULT_DESIGN,DEFAULT_SCALE,FONT_STACK,parseScale,type Item,type Project} from './model';

export function legendStyle(p:Project,i:Item){
  const style=p.design??DEFAULT_DESIGN;
  return{font:FONT_STACK[i.font??style.font],weight:i.weight??style.weight,size:style.labelSize,
    label:style.uppercase?i.label.toUpperCase():i.label,
    inverted:i.role==='output'&&style.outputLabels==='inverted'};
}

/** Shared geometry for the renderer and tests. Full rings never duplicate the first tick. */
export function scaleTicks(i:Item){
  const s=i.scale?parseScale(i.scale):DEFAULT_SCALE;
  const count=Math.max(2,Math.min(64,Math.round(i.count??11))),outer=Math.min(i.width,i.height)/2;
  return Array.from({length:count},(_,n)=>{
    const angle=(s.start+s.sweep*n/(s.sweep===360?count:count-1))*Math.PI/180;
    const major=n%s.majorEvery===0||(s.sweep!==360&&n===count-1);
    const inner=Math.max(0,outer-s.tickLength*(major?1.5:1));
    return{x1:Math.cos(angle)*inner,y1:Math.sin(angle)*inner,x2:Math.cos(angle)*outer,y2:Math.sin(angle)*outer,
      width:s.lineWidth*(major?1.5:1),major};
  });
}
