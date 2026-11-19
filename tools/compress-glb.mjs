// Lossless meshopt (EXT_meshopt_compression) re-encode of the UR5e GLB (positions + indices only).
// Vertex and triangle order change for better compression; the shapes stay identical.
// Usage: npm i --no-save meshoptimizer@0.22.0 && node tools/compress-glb.mjs in.glb out.glb
import fs from 'node:fs';
import { MeshoptEncoder } from 'meshoptimizer';
await MeshoptEncoder.ready;
const [, , inPath, outPath] = process.argv;
const b = fs.readFileSync(inPath);
const jl = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + jl).toString());
const bin = b.subarray(20 + jl + 8);
const read = (ai, Arr, comps) => { const a = j.accessors[ai], v = j.bufferViews[a.bufferView]; if (v.byteStride && v.byteStride !== Arr.BYTES_PER_ELEMENT * comps) throw new Error('strided'); const o = bin.byteOffset + (v.byteOffset || 0) + (a.byteOffset || 0); return new Arr(bin.buffer.slice(o, o + a.count * comps * Arr.BYTES_PER_ELEMENT)); };
const chunks = []; let off = 0, fallbackOff = 0; const views = [];
const push = (raw, count, size, mode, stride, target) => {
  const enc = MeshoptEncoder.encodeGltfBuffer(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength), count, size, mode);
  const pad = (4 - off % 4) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  chunks.push(Buffer.from(enc));
  const fb = (4 - fallbackOff % 4) % 4; fallbackOff += fb;
  const view = { buffer: 1, byteOffset: fallbackOff, byteLength: raw.byteLength, target,
    extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: off, byteLength: enc.length, byteStride: size, count, mode } } };
  if (mode === 'ATTRIBUTES') view.byteStride = stride;
  off += enc.length; fallbackOff += raw.byteLength; views.push(view); return views.length - 1;
};
const newAcc = [];
for (const m of j.meshes) for (const p of m.primitives) {
  const keys = Object.keys(p.attributes); if (keys.join() !== 'POSITION' || p.indices == null) throw new Error('unexpected attributes ' + keys);
  const pa = j.accessors[p.attributes.POSITION], ia = j.accessors[p.indices];
  const pos = read(p.attributes.POSITION, Float32Array, 3);
  const idx = ia.componentType === 5125 ? read(p.indices, Uint32Array, 1) : Uint32Array.from(read(p.indices, Uint16Array, 1));
  const [remap, unique] = MeshoptEncoder.reorderMesh(idx, true, true); // reorders idx in place
  const npos = new Float32Array(unique * 3);
  for (let i = 0; i < pa.count; i++) { const r = remap[i]; if (r !== 0xFFFFFFFF) { npos[r * 3] = pos[i * 3]; npos[r * 3 + 1] = pos[i * 3 + 1]; npos[r * 3 + 2] = pos[i * 3 + 2]; } }
  const small = unique < 65536, nidx = small ? Uint16Array.from(idx) : idx;
  const pv = push(npos, unique, 12, 'ATTRIBUTES', 12, 34962);
  const iv = push(nidx, nidx.length, small ? 2 : 4, 'TRIANGLES', 0, 34963);
  newAcc.push({ ...pa, bufferView: pv, byteOffset: 0, count: unique }); p.attributes.POSITION = newAcc.length - 1;
  newAcc.push({ ...ia, bufferView: iv, byteOffset: 0, componentType: small ? 5123 : 5125 }); p.indices = newAcc.length - 1;
}
j.accessors = newAcc; j.bufferViews = views;
j.buffers = [{ byteLength: off }, { byteLength: fallbackOff, extensions: { EXT_meshopt_compression: { fallback: true } } }];
j.extensionsUsed = [...new Set([...(j.extensionsUsed || []), 'EXT_meshopt_compression'])];
j.extensionsRequired = [...new Set([...(j.extensionsRequired || []), 'EXT_meshopt_compression'])];
let json = Buffer.from(JSON.stringify(j)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
let binOut = Buffer.concat(chunks); binOut = Buffer.concat([binOut, Buffer.alloc((4 - binOut.length % 4) % 4)]);
const h = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8), total = 28 + json.length + binOut.length;
h.writeUInt32LE(0x46546C67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(total, 8);
jh.writeUInt32LE(json.length, 0); jh.writeUInt32LE(0x4E4F534A, 4); bh.writeUInt32LE(binOut.length, 0); bh.writeUInt32LE(0x004E4942, 4);
fs.writeFileSync(outPath, Buffer.concat([h, jh, json, bh, binOut]));
console.log('wrote', total, 'bytes');
