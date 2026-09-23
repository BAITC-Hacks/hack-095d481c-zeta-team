'use strict';importScripts('engine.js','planner.js');self.onmessage=e=>{try{self.postMessage({data:PF.build(e.data.sheets)});}catch(error){self.postMessage({error:error.message});}};
