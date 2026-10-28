// Эмуляция окружения BazisScript для проверки скрипта вне БАЗИС-Мебельщик
const fs = require('fs');
const vm = require('vm');

const scriptPath = process.argv[2];
const dataFile = process.argv[3];

function Vector(x,y,z){ this.x=x; this.y=y; this.z=z; }

let panels = [];
function AddHorizPanel(x1, z1, x2, z2, y) {
    const p = {
        Contour: { lines: [], Clear(){this.lines=[];}, AddLine(a,b,c,d){this.lines.push([a,b,c,d]);} },
        Orient(n,v){ this._orient=[n,v]; },
        Build(){ this._built=true; panels.push(p); return p; }
    };
    let _th=0,_name='',_pos=null;
    Object.defineProperty(p,'Thickness',{get:()=>_th,set:v=>{_th=v;}});
    Object.defineProperty(p,'Name',{get:()=>_name,set:v=>{_name=v;}});
    Object.defineProperty(p,'Position',{get:()=>_pos,set:v=>{_pos=v;}});
    return p;
}

const srcTxt = fs.readFileSync(dataFile);
const rawMode = process.env.RAW === '1';
function readTextFileImpl() {
    if (rawMode) return srcTxt.toString('latin1');            // Bazis отдал сырые байты
    if (srcTxt.slice(0,2).equals(Buffer.from([0xFF,0xFE]))) return srcTxt.toString('utf16le'); // Bazis декодировал UTF-16
    return srcTxt.toString('latin1');
}

const logs = [];
const ctx = {
    console, Vector, AddHorizPanel,
    fileExists: () => true,
    readTextFile: readTextFileImpl,
    askReadTextFile: () => dataFile,
    confirm: (m) => { logs.push('CONFIRM:\n'+m); return true; },
    alert: (m) => { logs.push('ALERT:\n'+m); },
    log: (m) => { logs.push('LOG: '+m); },
    Action: { Commit: () => { logs.push('COMMIT'); } },
    Math, Number, String, Array, Object, JSON, RegExp, isNaN, parseFloat, parseInt, Date, Error
};
ctx.global = ctx;
vm.createContext(ctx);
try {
    vm.runInContext(fs.readFileSync(scriptPath,'utf8'), ctx, {filename:scriptPath});
} catch(e) { console.log('EXCEPTION:', e && e.message ? e.message : e); }

console.log(logs.join('\n---\n'));
console.log('\n=== СОЗДАНО ПАНЕЛЕЙ:', panels.length, '===');
const byKey={};
panels.forEach(p=>{
  const L=p.Contour.lines[0]?p.Contour.lines[0][2]:0;
  const W=p.Contour.lines[1]?p.Contour.lines[1][3]:0;
  const k=`${L}x${W}x${p.Thickness}`;
  byKey[k]=(byKey[k]||0)+1;
});
Object.keys(byKey).sort().forEach(k=>console.log(k,'-',byKey[k],'шт'));
