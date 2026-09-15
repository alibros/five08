import type {Category,ComponentDefinition,PartSource} from './model';

/**
 * Citations for the dimensions this library asserts.
 *
 * A cutout figure is worth no more than its source. Anything without an entry
 * here is a generic estimate and the interface says so. `status:'verified'`
 * additionally requires a manufacturer and part number — see catalog.test.ts,
 * which enforces that contract.
 */
const SOURCE={
  pj398sm:{note:'Thonkiconn PJ398SM / PJ301M-12 — 6 mm panel hole, 4.5 mm thread',url:'https://www.thonk.co.uk/shop/thonkiconn/'},
  alpha9:{note:'Taiwan Alpha RD901F 9 mm potentiometer — M7×0.75 bushing',url:'https://www.mouser.com/datasheet/3/140/1/RD901F.pdf'},
  ec11:{note:'Alps Alpine EC11 encoder — M7×0.75 bushing',url:'https://tech.alpsalpine.com/assets/products/catalog/ec11.en.pdf'},
  m3fine:{note:'ISO 273 fine series clearance hole for M3',url:'https://www.iso.org/standard/4183.html'},
} satisfies Record<string,PartSource>;

const part=(id:string,name:string,category:Category,renderer:ComponentDefinition['renderer'],width:number,height:number,cutout:number|undefined,keepout:number,color:string,label:string,description:string,extra:Partial<ComponentDefinition>={}):ComponentDefinition=>({id,name,category,renderer,width,height,cutout,keepout,color,label,description,status:'generic',tags:[name.toLowerCase(),category.toLowerCase(),renderer],...extra});

export const catalog:ComponentDefinition[]=[
  part('knob-small','Small knob','Controls','knob',10,10,7,12,'#242520','LEVEL','Compact 10 mm cap · 7 mm panel cutout',{depth:14,libraryHidden:true,source:SOURCE.alpha9}),
  part('knob-medium','Standard knob','Controls','knob',15,15,7,18,'#242520','FREQUENCY','General-purpose potentiometer knob',{depth:14,sizePresets:[{label:'Small · 10 mm',componentId:'knob-small'},{label:'Medium · 15 mm',componentId:'knob-medium'},{label:'Large · 24 mm',componentId:'knob-large'}],source:SOURCE.alpha9}),
  part('knob-large','Large knob','Controls','knob',24,24,7,28,'#242520','TUNING','Performance-sized 24 mm cap',{depth:14,libraryHidden:true,source:SOURCE.alpha9}),
  part('knob-skirted','Skirted knob','Controls','knob',20,20,7,23,'#e5e3da','AMOUNT','Skirted cap with value scale',{tags:['knob','skirted','potentiometer'],source:SOURCE.alpha9}),
  part('knob-fluted','Fluted pointer knob','Controls','knob',16,16,7,19,'#252823','AMOUNT','Fluted cap with high-contrast pointer',{depth:14,tags:['knob','fluted','pointer','potentiometer'],source:SOURCE.alpha9}),
  part('knob-soft-touch','Soft-touch knob','Controls','knob',18,18,7,21,'#343936','TONE','Low-profile rubberized performance cap',{depth:14,tags:['knob','soft touch','rubber','potentiometer'],source:SOURCE.alpha9}),
  part('encoder','Endless encoder + push','Controls','knob',14,14,7.2,17,'#32342f','SELECT','Endless rotary encoder with integral push switch',{depth:16,tags:['encoder','endless','push','click','rotary'],source:SOURCE.ec11}),
  part('encoder-compact','Compact endless encoder + push','Controls','knob',11,11,7.2,14,'#292c28','VALUE','Compact endless encoder with integral push switch',{depth:15,tags:['encoder','endless','push','compact','rotary'],source:SOURCE.ec11}),
  part('encoder-large','Large endless encoder + push','Controls','knob',20,20,7.2,24,'#2b2e2a','BROWSE','Performance-sized endless encoder with push switch',{depth:17,tags:['encoder','endless','push','large','rotary'],source:SOURCE.ec11}),
  part('encoder-ring','Illuminated encoder + push','Controls','knob',22,22,8,26,'#202421','SELECT','Endless push encoder with illuminated halo',{depth:18,tags:['encoder','endless','push','illuminated','led ring','rotary'],source:SOURCE.ec11}),
  part('encoder-metal','Metal encoder + push','Controls','knob',16,16,7.2,20,'#aeb3ac','DATA','Machined aluminium endless push encoder',{depth:17,tags:['encoder','endless','push','metal','rotary'],source:SOURCE.ec11}),
  part('knob-concentric','Concentric knob','Controls','knob',18,18,8,22,'#252622','COARSE / FINE','Dual concentric control',{depth:18,source:SOURCE.alpha9}),
  part('slider-20','Vertical slider','Controls','slider',10,28,2.2,14,'#d8d8d0','LEVEL','Vertical panel fader',{cutoutShape:'obround',cutoutInset:.85,cutoutWidth:2.2,orientation:'vertical',depth:12,sizePresets:[{label:'20 mm travel',componentId:'slider-20'},{label:'30 mm travel',componentId:'slider-30'},{label:'45 mm travel',componentId:'slider-45'}]}),
  part('slider-30','30 mm slider','Controls','slider',10,38,2.2,14,'#d8d8d0','LEVEL','30 mm travel vertical fader',{cutoutShape:'obround',cutoutInset:.85,cutoutWidth:2.2,orientation:'vertical',depth:12,libraryHidden:true}),
  part('slider-45','45 mm slider','Controls','slider',10,53,2.2,14,'#d8d8d0','LEVEL','45 mm travel vertical fader',{cutoutShape:'obround',cutoutInset:.85,cutoutWidth:2.2,orientation:'vertical',depth:14,libraryHidden:true}),
  part('crossfader','Horizontal crossfader','Controls','slider',43,10,2.2,14,'#d8d8d0','MIX','Horizontal performance fader',{cutoutShape:'obround',cutoutInset:.85,cutoutHeight:2.2,orientation:'horizontal',depth:12}),
  part('joystick','Joystick','Controls','touch',25,25,12,31,'#262824','X / Y','Two-axis joystick',{depth:28}),
  part('touch-strip','Touch strip','Controls','touch',12,48,undefined,15,'#b8ff65','TOUCH','Capacitive touch strip, mounted on the panel face with no opening',{depth:3}),

  part('jack-mono','3.5 mm mono jack','Jacks & connectors','jack',9,9,6.2,12,'#171815','IN','Generic vertical mono jack',{depth:12}),
  part('jack-stereo','3.5 mm TRS jack','Jacks & connectors','jack',9,9,6.2,12,'#171815','STEREO','Stereo/switching jack',{depth:12}),
  part('jack-thonk','Thonkiconn jack','Jacks & connectors','jack',10,10,6,12,'#171815','CV','PJ398SM-style vertical jack',{manufacturer:'Wenzhou QingPu',partNumber:'PJ398SM',status:'verified',depth:11,source:SOURCE.pj398sm}),
  part('banana','Banana socket','Jacks & connectors','jack',12,12,8,15,'#e84f3c','PATCH','4 mm banana socket',{depth:20}),
  part('usb-c','USB-C receptacle','Jacks & connectors','connector',11,5,9.5,14,'#9da29c','USB','Panel USB-C opening',{depth:10,cutoutShape:'rect',cutoutWidth:9.5,cutoutHeight:3.5}),
  part('midi-trs','MIDI TRS','Jacks & connectors','jack',10,10,6.5,13,'#171815','MIDI','3.5 mm MIDI TRS jack',{depth:12}),
  part('midi-din','MIDI DIN','Jacks & connectors','connector',20,20,15,24,'#151614','MIDI','5-pin DIN socket',{depth:22}),
  part('sd-slot','Micro SD slot','Jacks & connectors','connector',14,4,12,18,'#11120f','SD','Micro SD card opening',{depth:12,cutoutShape:'rect',cutoutWidth:12,cutoutHeight:2.6}),

  part('button-tact','Tactile button','Switches & buttons','button',7,7,3.5,10,'#e8e7df','STEP','6 × 6 mm tactile switch',{depth:8}),
  part('button-round','Round pushbutton','Switches & buttons','button',10,10,7,14,'#e8e7df','TRIGGER','Momentary round pushbutton',{depth:15}),
  part('button-square','Square pushbutton','Switches & buttons','button',12,12,9,15,'#ecebe4','MODE','Square cap pushbutton',{depth:14,cutoutShape:'rect',cutoutWidth:9,cutoutHeight:9}),
  part('button-lit','Illuminated button','Switches & buttons','button',12,12,8,15,'#ff7254','RECORD','Illuminated momentary button',{depth:18}),
  part('button-lit-square','Illuminated square button','Switches & buttons','button',12,12,9,16,'#ff6d55','STEP','12 mm square illuminated momentary button',{depth:18,cutoutShape:'rect',cutoutWidth:9,cutoutHeight:9,tags:['button','square','illuminated','led','momentary']}),
  part('button-lit-square-large','Large illuminated square','Switches & buttons','button',16,16,12,20,'#8fe46d','LAUNCH','16 mm square illuminated performance button',{depth:21,cutoutShape:'rect',cutoutWidth:12,cutoutHeight:12,tags:['button','square','illuminated','led','large','momentary']}),
  part('button-lit-rect','Illuminated rectangular button','Switches & buttons','button',18,10,8,22,'#70cfff','SHIFT','Compact rectangular illuminated momentary button',{depth:18,orientation:'horizontal',cutoutShape:'rect',cutoutWidth:14.4,cutoutHeight:8,tags:['button','rectangular','illuminated','led','momentary']}),
  part('button-lit-wide','Wide illuminated button','Switches & buttons','button',24,11,9,28,'#ffd25f','PLAY / STOP','Wide rectangular illuminated transport button',{depth:20,orientation:'horizontal',cutoutShape:'rect',cutoutWidth:19.2,cutoutHeight:8.8,tags:['button','rectangular','wide','illuminated','transport','led']}),
  part('button-arcade','Arcade button','Switches & buttons','button',24,24,20,29,'#e55278','TRIGGER','Large performance arcade-style momentary button',{depth:32,tags:['button','arcade','large','performance','momentary']}),
  part('button-metal','Metal pushbutton','Switches & buttons','button',16,16,12,20,'#b8bdb7','POWER','Metal anti-vandal momentary pushbutton',{depth:24,tags:['button','metal','anti vandal','momentary']}),
  part('toggle-2','2-position toggle','Switches & buttons','toggle',10,14,6.2,14,'#d8d8d0','ON','Subminiature two-position toggle',{depth:18}),
  part('toggle-3','3-position toggle','Switches & buttons','toggle',10,14,6.2,14,'#d8d8d0','MODE','Subminiature three-position toggle',{depth:18}),
  part('slide-switch','Slide switch','Switches & buttons','toggle',12,7,8,15,'#d8d8d0','RANGE','Compact slide switch',{cutoutShape:'obround',cutoutWidth:8,cutoutHeight:3,orientation:'horizontal',depth:8}),
  part('rotary-switch','Rotary selector','Switches & buttons','knob',18,18,10,22,'#e2e0d7','RANGE','Multi-position rotary selector',{depth:22}),

  part('led-2mm','2 mm LED','Indicators & displays','led',2,2,2.1,4,'#ff6045','','Discrete 2 mm indicator',{libraryHidden:true}),
  part('led-3mm','Panel LED','Indicators & displays','led',3,3,3.1,5,'#ff6045','','Discrete panel indicator',{sizePresets:[{label:'2 mm',componentId:'led-2mm'},{label:'3 mm',componentId:'led-3mm'},{label:'5 mm',componentId:'led-5mm'}]}),
  part('led-5mm','5 mm LED','Indicators & displays','led',5,5,5.1,7,'#b7ff54','','Discrete 5 mm indicator',{libraryHidden:true}),
  part('led-rgb','RGB LED','Indicators & displays','led',5,5,5.1,7,'#70d7ff','RGB','Full-colour indicator'),
  part('led-ring','LED ring','Indicators & displays','led',22,22,undefined,25,'#b7ff54','VALUE','12 discrete LEDs — drill each one separately, Five08 cannot express the ring as a single cutout'),
  part('bargraph','10-segment bargraph','Indicators & displays','display',7,26,6,10,'#b7ff54','LEVEL','Vertical 10-segment LED meter',{cutoutShape:'rect'}),
  part('seven-seg','7-segment display','Indicators & displays','display',14,9,11,18,'#ff765c','VALUE','Two-digit numeric display',{cutoutShape:'rect'}),
  part('oled-091','0.91 in OLED','Indicators & displays','display',25,10,22,29,'#8effc6','STATUS','128 × 32 OLED viewport',{cutoutShape:'rect',cutoutInset:.86,depth:5}),
  part('oled-096','0.96 in OLED','Indicators & displays','display',25,15,22,29,'#8effc6','STATUS','128 × 64 OLED viewport',{cutoutShape:'rect',cutoutInset:.86,depth:5}),
  part('oled-13','1.3 in OLED','Indicators & displays','display',35,18,31,40,'#8effc6','DISPLAY','Large OLED viewport',{cutoutShape:'rect',cutoutInset:.86,depth:6}),
  part('vu-meter','Analogue VU meter','Indicators & displays','display',32,24,28,38,'#f3dca4','LEVEL','Backlit moving-coil meter',{cutoutShape:'rect',cutoutInset:.86,depth:25}),

  part('mount-hole','M3 mounting hole','Panel hardware','hole',3.2,3.2,3.2,5,'#999b94','','M3 clearance hole',{status:'verified',source:SOURCE.m3fine,manufacturer:'ISO 273',partNumber:'M3 fine'}),
  part('mount-slot','M3 mounting slot','Panel hardware','hole',6.5,3.2,3.2,8,'#999b94','','Horizontal M3 mounting slot',{status:'verified',orientation:'horizontal',source:SOURCE.m3fine,manufacturer:'ISO 273',partNumber:'M3 fine'}),
  part('vent-slot','Ventilation slot','Panel hardware','hole',14,2.5,2.5,4,'#34352f','','Rounded ventilation slot, cut at the size you draw it',{orientation:'horizontal'}),
  part('cutout-circle','Circular cutout','Panel hardware','shape',12,12,12,14,'#30312d','','Parametric circular opening'),
  part('cutout-rect','Rectangular cutout','Panel hardware','shape',18,10,18,21,'#30312d','','Rectangular opening, cut at the size you draw it',{cutoutShape:'rect',cutoutInset:1}),
  part('standoff','PCB standoff','Panel hardware','hole',3,3,3,6,'#8e9188','','PCB mounting reference',{depth:8}),

  part('text-label','Text label','Graphics','text',20,4,undefined,0,'#f2f2eb','LABEL','Panel legend — multi-line, with a choice of font, weight and alignment',{tags:['text','label','legend','type','font']}),
  part('knob-scale','Knob scale','Graphics','scale',26,26,undefined,0,'#f2f2eb','','270° tick arc to print around a knob',{resizable:true,tags:['scale','ticks','dial','marks','knob']}),
  part('arrow','Signal arrow','Graphics','arrow',14,2.6,undefined,0,'#f2f2eb','','Flow arrow — rotate it to aim',{resizable:true,tags:['arrow','signal','flow','routing']}),
  part('section-title','Section title','Graphics','text',28,6,undefined,0,'#f2f2eb','SECTION','Large section heading'),
  part('divider','Divider line','Graphics','shape',28,1,undefined,0,'#ff5d3b','','Graphic section divider'),
  part('shape-circle','Circle','Graphics','shape',12,12,undefined,0,'#ff5d3b','','Graphic circle or ring'),
  part('shape-rect','Rectangle','Graphics','shape',20,10,undefined,0,'#ff5d3b','','Graphic rectangle'),
  part('png-image','PNG image','Graphics','image',30,30,undefined,0,'#ff5d3b','','Transparent, resizable panel artwork',{tags:['png','image','artwork','graphic','texture','logo','transparent']}),
];

export const catalogMap=new Map(catalog.map(d=>[d.id,d]));
export const categories=[...new Set(catalog.map(d=>d.category))];
