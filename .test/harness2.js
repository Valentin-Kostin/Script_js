// проверка раскладки и вызовов API
const fs=require('fs'), vm=require('vm');
const scriptPath=process.argv[2], dataFile=process.argv[3];
function Vector(x,y,z){this.x=x;this.y=y;this.z=z;}
const calls=[]; const panels=[];
function AddHorizPanel(x1,z1,x2,z2,y){
  calls.push({x1,z1,x2,z2,y});
  const p={Contour:{lines:[],Clear(){this.lines=[]},AddLine(a,b,c,d){this.lines.push([a,b,c,d])}},
    Orient(n,v){this.o=[n,v]},Build(){panels.push(p);return p}};
  let th=0,nm='';
  Object.defineProperty(p,'Thickness',{get:()=>th,set:v=>{th=v}});
  Object.defineProperty(p,'Name',{get:()=>nm,set:v=>{nm=v}});
  Object.defineProperty(p,'Position',{get:()=>null,set:()=>{}});
  return p;
}
const src=fs.readFileSync(dataFile);
function rt(){ if(process.env.RAW==='1') return src.toString('latin1');
  if(src.slice(0,2).equals(Buffer.from([0xFF,0xFE]))) return src.toString('utf16le');
  return src.toString('latin1'); }
const ctx={console,Vector,AddHorizPanel,fileExists:()=>true,readTextFile:rt,askReadTextFile:()=>dataFile,
  confirm:()=>true,alert:m=>calls.push({alert:m}),log:()=>{},Action:{Commit:()=>{}},
  Math,String,Number,Array,Object,JSON,RegExp,isNaN,parseFloat,parseInt};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(scriptPath,'utf8'),ctx,{filename:scriptPath});
const layout=calls.filter(c=>c.x1!==undefined);
console.log('панелей:',panels.length);
layout.forEach((c,i)=>console.log(i,`x:${c.x1}->${c.x2}`,`z:${c.z1}->${c.z2}`,'th='+panels[i].Thickness,'name='+panels[i].Name,'contourLines='+panels[i].Contour.lines.length));
