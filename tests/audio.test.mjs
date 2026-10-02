import test from 'node:test';
import assert from 'node:assert/strict';
import {Soundscape} from '../src/audio.js';
function parameter(){return {value:0,events:[],setTargetAtTime(...args){this.events.push(['target',...args]);},setValueAtTime(...args){this.events.push(['value',...args]);},linearRampToValueAtTime(...args){this.events.push(['ramp',...args]);},cancelScheduledValues(...args){this.events.push(['cancel',...args]);}};}
function engine(){const a=new Soundscape();a.ctx={currentTime:100,state:'running'};a.master={gain:parameter()};a.channels=Array.from({length:4},()=>({gain:{gain:parameter()}}));return a;}
test('mixer keeps rain 70% and fire 30% independent',()=>{const a=engine();a.active=[true,true,false,false];a.volume=[.7,.3,.4,.3];a.apply();assert.equal(a.channels[0].gain.gain.events[0][1],.7);assert.equal(a.channels[1].gain.gain.events[0][1],.3);assert.equal(a.channels[2].gain.gain.events[0][1],0);assert.equal(a.playing,true);});
test('paused and zero-volume channels do not count as listening',()=>{const a=engine();a.active[0]=true;a.paused=true;a.apply();assert.equal(a.playing,false);assert.equal(a.channels[0].gain.gain.events[0][1],0);a.paused=false;a.volume[0]=0;assert.equal(a.playing,false);a.volume[0]=.5;a.ctx.state='suspended';assert.equal(a.playing,false);});
test('sleep fade is scheduled on audio clock exactly 10 seconds before deadline',()=>{const a=engine();a.scheduleSleep(900);assert.deepEqual(a.master.gain.events,[['cancel',100],['value',.55,100],['value',.55,990],['ramp',0,1000]]);});
test('infinite timer removes scheduled fade and keeps master volume',()=>{const a=engine();a.scheduleSleep(Infinity);assert.deepEqual(a.master.gain.events,[['cancel',100],['value',.55,100]]);});
test('stop clears all layers and paused state',()=>{const a=engine();a.active.fill(true);a.paused=true;a.stop();assert.deepEqual(a.active,[false,false,false,false]);assert.equal(a.paused,false);assert.equal(a.playing,false);});
