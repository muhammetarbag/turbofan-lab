import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, model, sampleAt, flowY, stageAt, stages, components } from '../lib/engine-model.ts';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test('bypass ratio is mass flow ratio and preserves core mass at fixed controls', () => {
  for (const ratio of [0, .5, 1, 8, 12]) {
    const m = model({ ...defaults, bypass: ratio });
    close(m.bypassMass / m.coreMass, ratio);
    close(m.bypassFraction, ratio / (1 + ratio));
    close(m.coreMass, model(defaults).coreMass);
  }
  assert.equal(model({ ...defaults, bypass: 0 }).bypassThrust, 0);
});
test('compression increases total pressure and temperature without requiring axial acceleration', () => {
  const m = model(defaults), inlet = sampleAt(m.core, 260), exit = sampleAt(m.core, 500);
  assert.ok(exit.pressure > inlet.pressure);
  assert.ok(exit.temperature > inlet.temperature);
  assert.ok(exit.velocity < inlet.velocity);
});
test('combustion heats flow with a small total pressure loss', () => {
  for (const throttle of [0, 50, 100]) {
    const m = model({ ...defaults, throttle });
    const before = sampleAt(m.core, 535), after = sampleAt(m.core, 655);
    assert.ok(after.temperature > before.temperature);
    assert.ok(after.pressure < before.pressure && after.pressure > before.pressure * .9);
  }
});
test('turbines extract energy and nozzles accelerate without inventing total temperature gain', () => {
  const m = model(defaults), hot = sampleAt(m.core, 655), turbineExit = sampleAt(m.core, 825), jet = sampleAt(m.core, 955);
  assert.ok(turbineExit.temperature < hot.temperature);
  assert.ok(turbineExit.pressure < hot.pressure);
  assert.ok(jet.velocity > turbineExit.velocity);
  close(jet.temperature, turbineExit.temperature);
  assert.ok(jet.pressure <= turbineExit.pressure);
});
test('higher throttle raises combustion temperature, shaft speeds and relative thrust', () => {
  const low = model({ ...defaults, throttle: 20 }), high = model({ ...defaults, throttle: 90 });
  assert.ok(high.core[6].temperature > low.core[6].temperature);
  assert.ok(high.lp > low.lp && high.hp > low.hp);
  assert.ok(high.thrust > low.thrust);
});
test('fan control affects bypass flow velocity and thrust; incoming velocity affects profiles', () => {
  const low = model({ ...defaults, fan: 0 }), high = model({ ...defaults, fan: 100 });
  assert.ok(high.bypassDelta > low.bypassDelta && high.thrust > low.thrust);
  const slow = model({ ...defaults, incoming: 0 }), fast = model({ ...defaults, incoming: 100 });
  assert.ok(fast.core[0].velocity > slow.core[0].velocity);
  assert.ok(fast.coreDelta < slow.coreDelta);
});
test('bypass does not pass through combustion or acquire its temperature peak', () => {
  const m = model(defaults);
  close(sampleAt(m.bypass, 500).temperature, sampleAt(m.bypass, 655).temperature);
  assert.ok(sampleAt(m.bypass, 655).temperature < sampleAt(m.core, 655).temperature);
  for (let x = 280; x <= 850; x += 10) {
    assert.ok(flowY(x, -.5, 'bypass') < flowY(x, -.5, 'core') - 25);
    assert.ok(flowY(x, .5, 'bypass') > flowY(x, .5, 'core') + 25);
  }
});
test('fixed scales remain finite and bounded at the full control envelope', () => {
  for (const fan of [0,50,100]) for (const throttle of [0,50,100]) for (const bypass of [0,.5,8,12]) for (const incoming of [0,50,100]) {
    const m = model({ fan, throttle, bypass, incoming });
    assert.ok(m.thrust >= 0 && m.thrust <= 1);
    for (const flow of ['core','bypass']) for (let x = 0; x <= 1120; x += 8) {
      const sample = sampleAt(m[flow], x);
      for (const key of ['pressure','temperature','velocity']) assert.ok(Number.isFinite(sample[key]) && sample[key] >= 0 && sample[key] <= 1, JSON.stringify({fan,throttle,bypass,incoming,x,key,value:sample[key]}));
      assert.ok(Number.isFinite(flowY(x, .6, flow)));
    }
  }
});
test('thrust is the sum of both stream momentum changes on the same scale', () => {
  const m = model(defaults);
  close(m.thrust * 5.5, m.coreMass * m.coreDelta + m.bypassMass * m.bypassDelta);
});
test('all nine components and seven stages have correct teaching locations', () => {
  assert.equal(components.length, 9);
  assert.equal(stages.length, 7);
  for (const [i, stage] of stages.entries()) assert.equal(stageAt(stage.x), i);
  assert.equal(components.find(c => c.name === 'HP compressor').stage, 2);
  assert.equal(components.find(c => c.name === 'HP turbine').stage, 4);
});
