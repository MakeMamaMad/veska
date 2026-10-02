import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
for (const name of ["rain", "fire", "forest", "wind"])
  test(`${name}: valid PCM recording with headroom and no anomalous seam`, () => {
    const file = readFileSync(
      new URL(`../assets/audio/${name}.wav`, import.meta.url),
    );
    assert.equal(file.toString("ascii", 0, 4), "RIFF");
    assert.equal(file.toString("ascii", 8, 12), "WAVE");
    assert.equal(file.readUInt16LE(20), 1);
    assert.equal(file.readUInt16LE(22), 2);
    assert.equal(file.readUInt32LE(24), 44100);
    assert.equal(file.readUInt16LE(34), 16);
    const bytes = file.readUInt32LE(40),
      frames = bytes / 4;
    assert.ok(frames / 44100 >= 8);
    assert.equal(bytes, file.length - 44);
    let peak = 0,
      sum = 0,
      maxStep = 0;
    for (let n = 44; n < file.length; n += 2) {
      const x = file.readInt16LE(n) / 32768;
      peak = Math.max(peak, Math.abs(x));
      sum += x * x;
      if (n >= 48)
        maxStep = Math.max(
          maxStep,
          Math.abs(x - file.readInt16LE(n - 4) / 32768),
        );
    }
    assert.ok(peak < 0.356);
    assert.ok(sum / (bytes / 2) > 0.00001);
    for (let c = 0; c < 2; c++) {
      const seam =
        Math.abs(
          file.readInt16LE(44 + c * 2) -
            file.readInt16LE(file.length - 4 + c * 2),
        ) / 32768;
      assert.ok(
        seam <= maxStep,
        `Seam step ${seam} exceeds recorded waveform steps ${maxStep}`,
      );
    }
  });
