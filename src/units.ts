/**
 * Figures and their units are one token: "6.2 mm" must never break across a
 * line, and the gap between them is a narrow no-break space, not a word
 * space. Copy is written with ordinary spaces and passed through here.
 */
export const NNBSP=' ';
export const units=(s:string)=>s.replace(/(\d) (mm|HP|dpi|MB|kB|inch|U)\b/g,`$1${NNBSP}$2`);
