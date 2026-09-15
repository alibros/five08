import {describe,expect,it} from 'vitest';
import {sanitizeSvg} from './artwork';

const wrap=(inner:string,attrs='viewBox="0 0 10 10"')=>`<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${inner}</svg>`;
const clean=(source:string)=>{const r=sanitizeSvg(source);if(!r.ok)throw new Error(r.reason);return r;};

describe('SVG import',()=>{
  it('keeps ordinary drawing markup',()=>{
    const {svg}=clean(wrap('<g><path d="M0 0h10"/><circle cx="5" cy="5" r="2" fill="#f00"/></g>'));
    expect(svg).toContain('<path');
    expect(svg).toContain('<circle');
    expect(svg).toContain('fill="#f00"');
  });

  it('removes scripts',()=>{
    const {svg,removed}=clean(wrap('<script>fetch("//evil")</script><rect width="4" height="4"/>'));
    expect(svg).not.toContain('script');
    expect(svg).toContain('<rect');
    expect(removed).toContain('script');
  });

  it('removes event handlers wherever they hide',()=>{
    const {svg}=clean(wrap('<rect width="4" height="4" onload="alert(1)" onclick="alert(2)"/>'));
    expect(svg).not.toMatch(/onload|onclick/i);
    const root=clean(wrap('<rect width="4" height="4"/>','viewBox="0 0 10 10" onload="alert(1)"'));
    expect(root.svg).not.toMatch(/onload/i);
  });

  it('removes foreignObject, which can carry HTML',()=>{
    const {svg}=clean(wrap('<foreignObject><body xmlns="http://www.w3.org/1999/xhtml">hi</body></foreignObject><rect width="1" height="1"/>'));
    expect(svg.toLowerCase()).not.toContain('foreignobject');
  });

  it('removes animation elements that can retarget attributes',()=>{
    const {svg}=clean(wrap('<rect width="4" height="4"><set attributeName="href" to="javascript:alert(1)"/></rect>'));
    expect(svg).not.toContain('<set');
  });

  it('cuts links that reach outside the document',()=>{
    const {svg}=clean(wrap('<use href="https://evil.test/x.svg#a"/><use href="#local"/><rect width="1" height="1"/>'));
    expect(svg).not.toContain('evil.test');
    expect(svg).toContain('#local');
  });

  it('cuts styles that fetch',()=>{
    const {svg}=clean(wrap('<rect width="4" height="4" style="fill:url(//evil.test/x)"/>'));
    expect(svg).not.toContain('evil.test');
  });

  it('drops a stylesheet element rather than parsing its CSS',()=>{
    const {svg}=clean(wrap('<style>@import url(//evil.test)</style><rect width="1" height="1"/>'));
    expect(svg).not.toContain('evil.test');
    expect(svg).not.toContain('<style');
  });

  it('derives a viewBox from width and height when one is missing',()=>{
    const {svg}=clean(wrap('<rect width="1" height="1"/>','width="40" height="20"'));
    expect(svg).toContain('viewBox="0 0 40 20"');
  });

  it('refuses what it cannot scale or read',()=>{
    expect(sanitizeSvg(wrap('<rect width="1" height="1"/>',''))).toMatchObject({ok:false});
    expect(sanitizeSvg('<html><body>nope</body></html>')).toMatchObject({ok:false});
    expect(sanitizeSvg('not markup at all')).toMatchObject({ok:false});
  });

  it('refuses a file that is nothing but unsafe markup',()=>
    expect(sanitizeSvg(wrap('<script>alert(1)</script>'))).toMatchObject({ok:false}));

  it('refuses anything oversized before parsing it',()=>
    expect(sanitizeSvg('<svg>'+'x'.repeat(2_000_001)+'</svg>')).toMatchObject({ok:false,reason:expect.stringContaining('2 MB')}));
});
