/**
 * SVG artwork import.
 *
 * Imported SVG is untrusted: it arrives as a file and is then stored in the
 * project and re-embedded in every export. Five08 renders artwork through an
 * <image> element, which browsers treat as secure static mode and will not run
 * scripts from — but a project file travels between people, so the markup is
 * stripped to a presentational subset on the way in rather than relying on that
 * alone.
 */

const ALLOWED=new Set([
  'svg','g','defs','title','desc','symbol','use','switch',
  'path','rect','circle','ellipse','line','polyline','polygon',
  'text','tspan','textpath',
  'lineargradient','radialgradient','stop','pattern','clippath','mask',
  'marker','filter','fegaussianblur','feoffset','feblend','femerge','femergenode',
  'fecolormatrix','fecomposite','feflood','image',
]);

/** Anything that can execute, navigate, or reach off the document. */
const BANNED=new Set([
  'script','foreignobject','iframe','embed','object','audio','video','a','handler',
  'animate','animatetransform','animatemotion','set','discard','style',
]);

const DANGEROUS_VALUE=/url\s*\(|expression\s*\(|javascript:|data:text\/html/i;

export type SanitizeResult=
  |{ok:true;svg:string;removed:string[]}
  |{ok:false;reason:string};

/** Strips an SVG down to shapes, text and gradients. Returns null-safe markup. */
export function sanitizeSvg(source:string):SanitizeResult{
  if(source.length>2_000_000)return{ok:false,reason:'That SVG is larger than 2 MB'};
  const doc=new DOMParser().parseFromString(source,'image/svg+xml');
  if(doc.querySelector('parsererror'))return{ok:false,reason:'That file is not valid SVG'};
  const root=doc.documentElement;
  if(!root||root.nodeName.toLowerCase()!=='svg')return{ok:false,reason:'That file is not an SVG'};

  const removed=new Set<string>();
  const walk=(node:Element)=>{
    for(const child of [...node.children]){
      const tag=child.nodeName.toLowerCase();
      if(BANNED.has(tag)||!ALLOWED.has(tag)){removed.add(tag);child.remove();continue;}
      for(const attr of [...child.attributes]){
        const name=attr.name.toLowerCase(),value=attr.value;
        if(name.startsWith('on')){removed.add(name);child.removeAttribute(attr.name);continue;}
        if((name==='href'||name==='xlink:href')&&!value.trim().startsWith('#')){
          removed.add(name);child.removeAttribute(attr.name);continue;
        }
        if(DANGEROUS_VALUE.test(value)){removed.add(name);child.removeAttribute(attr.name);}
      }
      walk(child);
    }
  };
  for(const attr of [...root.attributes])
    if(attr.name.toLowerCase().startsWith('on')||DANGEROUS_VALUE.test(attr.value)){
      removed.add(attr.name);root.removeAttribute(attr.name);
    }
  walk(root);

  // A viewBox is what lets the artwork scale to the box it is dropped into.
  if(!root.getAttribute('viewBox')){
    const w=Number(root.getAttribute('width')),h=Number(root.getAttribute('height'));
    if(Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0)root.setAttribute('viewBox',`0 0 ${w} ${h}`);
    else return{ok:false,reason:'That SVG has no viewBox or size, so it cannot be scaled'};
  }
  root.setAttribute('xmlns','http://www.w3.org/2000/svg');
  if(!root.querySelector('*'))return{ok:false,reason:'Nothing was left after removing unsafe markup'};

  return{ok:true,svg:new XMLSerializer().serializeToString(root),removed:[...removed]};
}

/** Encodes sanitised markup for storage and for embedding in an export. */
export const svgDataUrl=(svg:string)=>`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

const SVG_URL=/^data:image\/svg\+xml;base64,/i;

const decode=(url:string)=>{
  try{return decodeURIComponent(escape(atob(url.slice(url.indexOf(',')+1))));}catch{return null;}
};

/**
 * Re-cleans every piece of artwork carried by a project.
 *
 * Called wherever a project enters the editor — opened from storage, imported
 * from a file, pasted — because artwork from someone else's `.panel.json` is
 * embedded verbatim into exported SVG, and an export opened directly in a
 * browser is a live document rather than a static image.
 */
export function sanitizeProjectArtwork<T extends{panelImage?:string;items:Array<{imageData?:string}>}>(project:T):{project:T;stripped:number}{
  let stripped=0;
  const scrub=(url:string|undefined)=>{
    if(!url||!SVG_URL.test(url))return url;
    const markup=decode(url);
    const result=markup?sanitizeSvg(markup):{ok:false as const,reason:'unreadable'};
    if(!result.ok){stripped++;return undefined;}
    if(result.removed.length)stripped++;
    return svgDataUrl(result.svg);
  };
  project.panelImage=scrub(project.panelImage);
  for(const item of project.items)item.imageData=scrub(item.imageData);
  return{project,stripped};
}
