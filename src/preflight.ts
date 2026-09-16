import {cutoutShape,mountingShapes,shapeBounds,type Shape} from './geometry';
import {DEFAULT_RULES,PANEL_H,panelWidth,type ComponentDefinition,type Item,type Project} from './model';
import {legendStyle} from './design';

/**
 * Layout checks that catch the mistakes a panel only reveals after it has been
 * cut: holes off the edge, cutouts that merge into each other, nuts that have
 * no room for a spanner, and parts too deep for the case they are going in.
 *
 * Every issue names the components involved so the editor can select them.
 */
export type Severity='error'|'warning';
export type IssueCategory='Machining'|'Assembly'|'Ergonomics'|'Artwork';
export const ISSUE_CATEGORIES:IssueCategory[]=['Machining','Assembly','Ergonomics','Artwork'];
export type Issue={code:string;category:IssueCategory;severity:Severity;message:string;detail:string;itemIds:string[]};

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
  return shapeBounds({kind:'rect',cx:i.x,cy:i.y,w,h,rotation:i.rotation});
};

export function preflight(p:Project,definitions:Map<string,ComponentDefinition>):Issue[]{
  const issues:Omit<Issue,'category'>[]=[],w=panelWidth(p.panel);
  const {edgeMargin:EDGE_MARGIN,minWall:MIN_WALL,jackPitch:MIN_JACK_PITCH,rearDepth:SKIFF_DEPTH,fingerGap,minText}=p.rules??DEFAULT_RULES;
  const visible=p.items.filter(i=>!i.hidden);
  const parts=visible.flatMap(i=>{const d=definitions.get(i.componentId);return d?[{i,d,cut:cutoutShape(i,d)}]:[];});
  // "Small knob “2”" reads better in a warning than a bare label of "2".
  const name=(i:Item,d:ComponentDefinition)=>i.label.trim()?`${d.name} \u201c${i.label.trim()}\u201d`:d.name;

  for(const{i,d,cut} of parts){
    const body=shapeBounds({kind:'rect',cx:i.x,cy:i.y,w:i.width,h:i.height,rotation:i.rotation});
    const offPanel=body.l<0||body.r>w||body.t<0||body.b>PANEL_H;
    if(offPanel)
      issues.push({code:'off-panel',severity:'error',message:`${name(i,d)} hangs over the panel edge`,detail:'Move it back inside the outline or the part will not mount.',itemIds:[i.id]});
    else if(d.category!=='Graphics'&&(body.l<EDGE_MARGIN||body.r>w-EDGE_MARGIN||body.t<EDGE_MARGIN||body.b>PANEL_H-EDGE_MARGIN))
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
      issues.push({code:'deep-part',severity:'warning',message:`${name(i,d)} is ${d.depth} mm deep`,detail:`Exceeds the configured ${SKIFF_DEPTH} mm rear space. Allow extra room for wiring.`,itemIds:[i.id]});
    const textSize=d.renderer==='text'?i.height:legendStyle(p,i).size;
    if(i.label.trim()&&textSize<minText)
      issues.push({code:'small-text',severity:'warning',message:`${name(i,d)} text is ${textSize} mm`,detail:`Below the configured ${minText} mm minimum. Check readability at physical size.`,itemIds:[i.id]});
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
    if(overlapping&&!(first.cut&&second.cut&&gap(first.cut,second.cut)<0)&&(first.d.keepout||second.d.keepout)&&first.d.category!=='Graphics'&&second.d.category!=='Graphics')
      issues.push({code:'body-clash',severity:'warning',message:`${name(first.i,first.d)} and ${name(second.i,second.d)} clearance envelopes overlap`,detail:'Conservative rotated bounding boxes; confirm the actual component bodies and wiring.',itemIds:[first.i.id,second.i.id]});
    if(first.d.renderer==='knob'&&second.d.renderer==='knob'){
      const space=Math.hypot(first.i.x-second.i.x,first.i.y-second.i.y)-(first.i.width+second.i.width)/2;
      if(space<-.001)
        issues.push({code:'hardware-overlap',severity:'error',message:`${name(first.i,first.d)} and ${name(second.i,second.d)} knob skirts overlap`,detail:'The chosen physical knob sizes cannot occupy these positions together.',itemIds:[first.i.id,second.i.id]});
      if(space>=0&&space<fingerGap)
        issues.push({code:'finger-gap',severity:'warning',message:`Only ${space.toFixed(1)} mm between knob skirts`,detail:`Below the configured ${fingerGap} mm finger clearance.`,itemIds:[first.i.id,second.i.id]});
    }
  }

  if(p.panel.widthMode==='custom'){
    const hp=w/5.08;
    if(Math.abs(hp-Math.round(hp))>.15)
      issues.push({code:'off-hp',severity:'warning',message:`Custom width is ${hp.toFixed(2)} HP`,detail:'A panel that is not a whole number of HP leaves a gap in the rack.',itemIds:[]});
  }

  const seen=new Set<string>();
  return issues.filter(issue=>{const key=issue.code+issue.itemIds.join(',');if(seen.has(key))return false;seen.add(key);return true;})
    .map(issue=>({...issue,category:categoryFor(issue.code,issue.itemIds,definitions,p)}))
    .sort((a,b)=>a.severity===b.severity?0:a.severity==='error'?-1:1);
}

function categoryFor(code:string,ids:string[],definitions:Map<string,ComponentDefinition>,p:Project):IssueCategory{
  if(code==='small-text'||(code==='off-panel'&&ids.every(id=>definitions.get(p.items.find(i=>i.id===id)!.componentId)?.category==='Graphics')))return'Artwork';
  if(['finger-gap','jack-pitch'].includes(code))return'Ergonomics';
  if(['deep-part','body-clash','hardware-overlap','off-panel','edge-margin'].includes(code))return'Assembly';
  return'Machining';
}

export const issueCounts=(issues:Issue[])=>({
  errors:issues.filter(i=>i.severity==='error').length,
  warnings:issues.filter(i=>i.severity==='warning').length,
});
