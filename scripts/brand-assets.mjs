import {readFile,writeFile,copyFile} from 'node:fs/promises';
import opentype from 'opentype.js';

// Outline the same face used by the homepage so image logos never fall back to a system font.
const root=new URL('../',import.meta.url);
const fontBytes=await readFile(new URL('node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-500-normal.woff',root));
const font=opentype.parse(fontBytes.buffer.slice(fontBytes.byteOffset,fontBytes.byteOffset+fontBytes.byteLength));
const first=font.getPath('FIVE',0,0,1).getBoundingBox(),last=font.getPath('08',0,0,1).getBoundingBox();
const left=15,right=105,gap=3,dotRadius=2.4;
// Match visible ink heights, not font sizes, while preserving each glyph's proportions.
const firstHeight=first.y2-first.y1,lastHeight=last.y2-last.y1;
const height=(right-left-gap*2-dotRadius*2)/((first.x2-first.x1)/firstHeight+(last.x2-last.x1)/lastHeight);
const firstSize=height/firstHeight,lastSize=height/lastHeight;
const dotX=left+(first.x2-first.x1)*firstSize+gap+dotRadius;
const digitsX=dotX+dotRadius+gap;
const letters=font.getPath('FIVE',left-first.x1*firstSize,20-height/2-first.y1*firstSize,firstSize).toPathData(3);
const digits=font.getPath('08',digitsX-last.x1*lastSize,20-height/2-last.y1*lastSize,lastSize).toPathData(3);
const metal=`<linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f4ef"/><stop offset="0.48" stop-color="#d9dad5"/><stop offset="1" stop-color="#bfc1bc"/></linearGradient>`;
const face=(stroke=2)=>`<rect x="1" y="1" width="118" height="38" rx="3" fill="url(#metal)" stroke="#171816" stroke-width="${stroke}"/>
  <path d="M7 10v4M7 26v4M113 10v4M113 26v4" stroke="#646661" stroke-width="2" stroke-linecap="round"/>
  <g id="wordmark" fill="#171816" data-typeface="Chakra Petch Medium">
    <path id="wordmark-letters" d="${letters}"/>
    <circle cx="${dotX.toFixed(3)}" cy="20" r="${dotRadius}" fill="#e8472c"/>
    <path id="wordmark-digits" d="${digits}"/>
  </g>`;
await writeFile(new URL('public/five08-logo.svg',root),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" role="img" aria-labelledby="title">
  <title id="title">FIVE08</title>
  <defs>${metal}</defs>
  ${face()}
</svg>\n`);
await writeFile(new URL('public/social-card.svg',root),`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">FIVE08 Eurorack panel designer</title>
  <desc id="desc">Design Eurorack panels in real dimensions. One HP equals 5.08 millimetres.</desc>
  <defs>${metal}</defs>
  <rect width="1200" height="630" fill="#f2f0e9"/>
  <path d="M0 64h1200M0 572h1200" stroke="#c5c7c3"/>
  <g transform="translate(78 80) scale(8.7)">${face(1)}</g>
  <text x="80" y="497" fill="#171816" font-family="Arial,Helvetica,sans-serif" font-size="40" font-weight="500">Eurorack panel designer</text>
  <text x="1120" y="497" text-anchor="end" fill="#b43b28" font-family="ui-monospace,monospace" font-size="28">1 HP = 5.08 mm</text>
  <text x="82" y="544" fill="#686b66" font-family="ui-monospace,monospace" font-size="21">REAL DIMENSIONS / 3D INSPECTION / FABRICATION EXPORTS</text>
</svg>\n`);
await copyFile(new URL('node_modules/@fontsource/chakra-petch/LICENSE',root),new URL('public/chakra-petch-OFL.txt',root));
console.log(`Updated outlined brand assets: ${height.toFixed(2)}px matching ink heights, ${left}px / ${120-right}px side margins.`);
