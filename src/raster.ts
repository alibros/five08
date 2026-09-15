/**
 * Turning panel SVG into things you can hand to somebody else: a PNG at a
 * chosen resolution, and a print sheet that comes out of the printer at 1:1 so
 * it can be taped to a blank and drilled through.
 */

const MM_PER_INCH=25.4;

const dataUrl=(svg:string)=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function pixelSize(widthMm:number,heightMm:number,dpi:number){
  return{width:Math.round(widthMm/MM_PER_INCH*dpi),height:Math.round(heightMm/MM_PER_INCH*dpi)};
}

export async function svgToPng(svg:string,widthMm:number,heightMm:number,dpi:number,background?:string):Promise<Blob>{
  const{width,height}=pixelSize(widthMm,heightMm,dpi);
  const image=new Image();
  image.decoding='sync';
  await new Promise<void>((resolve,reject)=>{
    image.onload=()=>resolve();
    image.onerror=()=>reject(new Error('The panel could not be rasterised'));
    image.src=dataUrl(svg);
  });
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');
  if(!context)throw new Error('This browser has no 2D canvas');
  if(background){context.fillStyle=background;context.fillRect(0,0,width,height);}
  context.drawImage(image,0,0,width,height);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encoding failed')),'image/png'));
}

/**
 * Prints through the page itself rather than a popup, so no window gets
 * blocked and the app's content security policy stays untouched.
 */
export function printSheet(svg:string,caption:string){
  document.querySelector('#print-sheet')?.remove();
  const sheet=document.createElement('div');
  sheet.id='print-sheet';
  sheet.innerHTML=`<figure>${svg}<figcaption>${caption}</figcaption></figure>`;
  document.body.append(sheet);
  const cleanup=()=>{sheet.remove();window.removeEventListener('afterprint',cleanup);};
  window.addEventListener('afterprint',cleanup);
  window.print();
  // Safari never fires afterprint in some versions; drop the sheet anyway.
  setTimeout(cleanup,60_000);
}
