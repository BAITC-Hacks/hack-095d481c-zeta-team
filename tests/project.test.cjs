'use strict';
const assert=require('node:assert/strict'),PF=require('../assets/engine.js'),Project=require('../assets/project.js');
let count=0;function test(name,fn){fn();console.log('PASS',name);count++;}
const data=PF.demo(),cfg={...PF.defaults,categories:{},asOf:data.snapshot};
const state={data,cfg,sheets:[],errors:[],edits:{},approved:new Set(),lastCalc:new Date()};
const encoded=Project.encode(state),decoded=Project.decode(encoded);
test('Versioned project roundtrip retains complete data',()=>assert.deepEqual(decoded.data,data));
test('Same inputs give the same procurement orders after restore',()=>{const target={};Project.restore(target,decoded,PF);assert.deepEqual(target.rows.map(x=>[x.key,x.order]),PF.calculate(data,cfg).map(x=>[x.key,x.order]));});
test('Manual quantities and approval state survive roundtrip',()=>{const s={...state,edits:{demo0:60},approved:new Set(['Поставщик А'])},target={};Project.restore(target,Project.decode(Project.encode(s)),PF);assert.equal(target.edits.demo0,60);assert(target.approved.has('Поставщик А'));});
test('Approval state is reset across engine versions',()=>{const p=structuredClone(decoded);p.appVersion='0.1.0';p.approved=['Поставщик А'];const target={};Project.restore(target,p,PF);assert.equal(target.approved.size,0);});
test('Invalid file format is rejected',()=>assert.throws(()=>Project.decode('{}'),/формат/));
test('Broken JSON is rejected',()=>assert.throws(()=>Project.decode('{broken'),/повреждён/));
test('Prototype injection is rejected',()=>assert.throws(()=>Project.decode(encoded.replace('"schema":1','"schema":1,"__proto__":{"polluted":true}')),/недопустимое/));
test('Invalid time horizon is rejected',()=>{const p=structuredClone(decoded);p.cfg.lead=100000;assert.throws(()=>Project.validate(p),/диапазона/);});
test('Invalid MOQ edit is rejected without changing current state',()=>{const p=structuredClone(decoded);p.edits.demo0=3;const target={data:'not modified'};assert.throws(()=>Project.restore(target,p,PF),/кратности/);assert.equal(target.data,'not modified');});
test('All original sheets and import diagnostics survive',()=>{const s={...state,sheets:[{name:'Тест',file:'тест.xlsx',rows:[['SKU','Qty'],['A001',123]]}],errors:[{name:'test',error:'invalid'}]};const target={};Project.restore(target,Project.decode(Project.encode(s)),PF);assert.deepEqual(target.sheets,s.sheets);assert.deepEqual(target.errors,s.errors);});
test('Empty workspace can be saved',()=>{const s={...state,data:PF.empty()};assert.equal(Object.keys(Project.decode(Project.encode(s)).data.products).length,0);});
console.log(`\n${count} project tests passed.`);
