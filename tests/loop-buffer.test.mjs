import test from 'node:test';
import assert from 'node:assert/strict';
import {seamlessLoop} from '../src/loop-buffer.js';
import {pcm} from './pcm.mjs';
const ctx={createBuffer:pcm};
test('codec padding is removed and the loop has no silent seam',()=>{
  const input=pcm(2,2200,1000);
  input.getChannelData(0).fill(.2,100,2100);
  input.getChannelData(1).fill(-.1,100,2100);
  const output=seamlessLoop(ctx,input);
  assert.equal(output.length,1600);
  for(let i=0;i<output.length;i++) {
    assert.ok(Math.abs(output.getChannelData(0)[i]-.2)<1e-7);
    assert.ok(Math.abs(output.getChannelData(1)[i]+.1)<1e-7);
  }
  assert.equal(input.getChannelData(0)[0],0,'source stays untouched');
});
test('crossfade replaces a discontinuity without clipping or summing channels',()=>{
  const input=pcm(2,4000,1000);
  for(let i=0;i<input.length;i++) {
    input.getChannelData(0)[i]=.2+.1*Math.sin(i/300);
    input.getChannelData(1)[i]=-.5*input.getChannelData(0)[i];
  }
  const output=seamlessLoop(ctx,input);
  const data=output.getChannelData(0);
  assert.ok(Math.abs(data[0]-data.at(-1))<.001);
  assert.ok(Math.abs(data[3199]-data[3200])<.001);
  assert.ok(data.every(v=>v>=.099&&v<=.301));
  for(let i=0;i<data.length;i++) assert.ok(Math.abs(output.getChannelData(1)[i]+data[i]*.5)<1e-7);
});
test('very short buffers are safe and internal quiet passages remain',()=>{
  const short=pcm(1,2,44100);assert.equal(seamlessLoop(ctx,short),short);
  const input=pcm(1,4000,1000);input.getChannelData(0).fill(.2);input.getChannelData(0).fill(0,1200,1300);
  const result=seamlessLoop(ctx,input).getChannelData(0);
  assert.ok(result.subarray(800,900).every(v=>v===0));
});
