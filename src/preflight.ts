import {cutoutShape,mountingShapes,shapeBounds,type Shape} from './geometry';
import {PANEL_H,panelWidth,type ComponentDefinition,type Item,type Project} from './model';

/**
 * Layout checks that catch the mistakes a panel only reveals after it has been
 * cut: holes off the edge, cutouts that merge into each other, nuts that have
 * no room for a spanner, and parts too deep for the case they are going in.
 *
 * Every issue names the components involved so the editor can select them.
 */
export type Severity='error'|'warning';
export type Issue={code:string;severity:Severity;message:string;detail:string;itemIds:string[]};

/** Clear space kept at the panel edge so a cutout does not break through. */
export const EDGE_MARGIN=3;
/** Minimum wall left between two cutouts before the metal gets fragile. */
export const MIN_WALL=1.2;
/** A 3.5 mm jack nut needs roughly this much centre-to-centre room for a spanner. */
export const MIN_JACK_PITCH=9.5;
/** Anything deeper than this will not fit a shallow skiff case. */
export const SKIFF_DEPTH=25;

const gap=(a:Shape,b:Shape)=>{
  if(a.kind==='circle'&&b.kind==='circle')return Math.hypot(a.cx-b.cx,a.cy-b.cy)-a.r-b.r;
  const ab=shapeBounds(a),bb=shapeBounds(b);
  return Math.max(Math.max(ab.l,bb.l)-Math.min(ab.r,bb.r),Math.max(ab.t,bb.t)-Math.min(ab.b,bb.b));
};

const bodyBounds=(i:Item,d:ComponentDefinition)=>{
  const w=Math.max(i.width,d.keepout??0),h=Math.max(i.height,d.keepout??0);
  return{l:i.x-w/2,r:i.x+w/2,t:i.y-h/2,b:i.y+h/2};
};

export function preflight(p:Project,definitions:Map<string,ComponentDefinition>):Issue[]{
  const issues:Issue[]=[],w=panelWidth(p.panel);
  const visible=p.items.filter(i=>!i.hidden);
  const parts=visible.flatMap(i=>{const d=definitions.get(i.componentId);return d?[{i,d,cut:cutoutShape(i,d)}]:[];});
  const name=(i:Item,d:ComponentDefinition)=>i.label.trim()||d.name;

  for(const{i,d,cut} of parts){
    const body=bodyBounds(i,d);
    const offPanel=body.l<0||body.r>w||body.t<0||body.b>PANEL_H;
    if(offPanel)
      issues.push({code:'off-panel',severity:'error',message:`${name(i,d)} hangs over the panel edge`,detail:'Move it back inside the outline or the part will not mount.',itemIds:[i.id]});
    else if(body.l<EDGE_MARGIN||body.r>w-EDGE_MARGIN||body.t<EDGE_MARGIN||body.b>PANEL_H-EDGE_MARGIN)
      issues.push({code:'edge-margin',severity:'warning',message:`${name(i,d)} sits inside the ${EDGE_MARGIN} mm edge margin`,detail:'Rails and neighbouring modules use this strip.',itemIds:[i.id]});

    if(cut){
      const b=shapeBounds(cut);
      if(!offPanel&&(b.l<MIN_WALL||b.r>w-MIN_WALL||b.t<MIN_WALL||b.b>PANEL_H-MIN_WALL))
        issues.push({code:'cutout-edge',severity:'error',message:`The cutout for ${name(i,d)} breaks the panel edge`,detail:`Keep at least ${MIN_WALL} mm of material around every hole.`,itemIds:[i.id]});
      for(const slot of mountingShapes(p.panel))
        if(gap(cut,slot)<MIN_WALL){
          issues.push({code:'mounting-clash',severity:'error',message:`${name(i,d)} collides with a mounting slot`,detail:'The screw slot and the cutout would merge.',itemIds:[i.id]});
          break;
        }
    }

    if((d.depth??0)>SKIFF_DEPTH)
      issues.push({code:'deep-part',severity:'warning',message:`${name(i,d)} is ${d.depth} mm deep`,detail:`Deeper than the ${SKIFF_DEPTH} mm a shallow skiff case allows.`,itemIds:[i.id]});
  }

  for(let a=0;a<parts.length;a++)for(let b=a+1;b<parts.length;b++){
    const first=parts[a],second=parts[b];
    if(first.cut&&second.cut){
      const clearance=gap(first.cut,second.cut);
      if(clearance<0)
        issues.push({code:'cutout-overlap',severity:'error',message:`Cutouts for ${name(first.i,first.d)} and ${name(second.i,second.d)} overlap`,detail:'They would be machined as one ragged hole.',itemIds:[first.i.id,second.i.id]});
      else if(clearance<MIN_WALL)
        issues.push({code:'thin-wall',severity:'warning',message:`Only ${clearance.toFixed(1)} mm of panel between ${name(first.i,first.d)} and ${name(second.i,second.d)}`,detail:`Thinner than the ${MIN_WALL} mm wall most shops will quote.`,itemIds:[first.i.id,second.i.id]});
    }
    if(first.d.renderer==='jack'&&second.d.renderer==='jack'){
      const pitch=Math.hypot(first.i.x-second.i.x,first.i.y-second.i.y);
      if(pitch<MIN_JACK_PITCH)
        issues.push({code:'jack-pitch',severity:'warning',message:`Jacks ${pitch.toFixed(1)} mm apart`,detail:`Below ${MIN_JACK_PITCH} mm there is no room to turn the nut with a spanner.`,itemIds:[first.i.id,second.i.id]});
    }
    const fb=bodyBounds(first.i,first.d),sb=bodyBounds(second.i,second.d);
    const overlapping=fb.l<sb.r&&fb.r>sb.l&&fb.t<sb.b&&fb.b>sb.t;
    if(overlapping&&!(first.cut&&second.cut&&gap(first.cut,second.cut)<0)&&(first.d.keepout||second.d.keepout)&&first.d.renderer!=='image'&&second.d.renderer!=='image'&&first.d.renderer!=='shape'&&second.d.renderer!=='shape'&&first.d.renderer!=='text'&&second.d.renderer!=='text')
      issues.push({code:'body-clash',severity:'warning',message:`${name(first.i,first.d)} and ${name(second.i,second.d)} bodies touch`,detail:'Knob skirts or component bodies will foul each other.',itemIds:[first.i.id,second.i.id]});
  }

  if(p.panel.widthMode==='custom'){
    const hp=w/5.08;
    if(Math.abs(hp-Math.round(hp))>.15)
      issues.push({code:'off-hp',severity:'warning',message:`Custom width is ${hp.toFixed(2)} HP`,detail:'A panel that is not a whole number of HP leaves a gap in the rack.',itemIds:[]});
  }

  const seen=new Set<string>();
  return issues.filter(issue=>{const key=issue.code+issue.itemIds.join(',');if(seen.has(key))return false;seen.add(key);return true;})
    .sort((a,b)=>a.severity===b.severity?0:a.severity==='error'?-1:1);
}

export const issueCounts=(issues:Issue[])=>({
  errors:issues.filter(i=>i.severity==='error').length,
  warnings:issues.filter(i=>i.severity==='warning').length,
});
