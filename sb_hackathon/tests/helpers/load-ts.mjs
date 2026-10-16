import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const cache=new Map();
export function tsURL(file){
  const resolved=path.resolve(file);
  if(cache.has(resolved))return cache.get(resolved);
  const source=fs.readFileSync(resolved,'utf8');
  let output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  output=output.replace(/from\s+["'](\.[^"']+)["']/g,(_match,relative)=>`from ${JSON.stringify(tsURL(path.resolve(path.dirname(resolved),relative)+'.ts'))}`);
  const url=`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;cache.set(resolved,url);return url;
}
export async function loadTS(file){return import(tsURL(file));}
