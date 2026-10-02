import test from 'node:test';
import assert from 'node:assert/strict';
import {landscape} from '../src/art.js';
test('map renders foundation, new bonfire order, and preserved legacy mill independently',()=>{
 const empty=landscape(1,[]);assert.match(empty,/class="foundation"/);assert.doesNotMatch(empty,/class="cottage"|class="bonfire"|class="mill"/);
 const dayThree=landscape(3,[0,3]);assert.match(dayThree,/class="bonfire"/);assert.match(dayThree,/class="cottage"/);assert.doesNotMatch(dayThree,/class="mill"|class="foundation"/);
 const legacy=landscape(3,[0,1]);assert.match(legacy,/class="mill"/);assert.doesNotMatch(legacy,/class="bonfire"/);
});
