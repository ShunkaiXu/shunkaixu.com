/* UR5e kinematic chain, built from ros-industrial/universal_robot (BSD-3): joint origins from ur5e
   default_kinematics.yaml, visual offsets from ur_macro.xacro. URDF is Z-up and in metres. */
export function buildUR5e(THREE) {
  const rpy = (o, r, p, y) => o.rotation.set(r, p, y, 'ZYX');
  const P = Math.PI;
  const root = new THREE.Group();            // base_link
  const inertia = new THREE.Group(); rpy(inertia, 0, 0, P); root.add(inertia);
  const J = [], V = {};
  const joint = (parent, xyz, r) => { const g = new THREE.Group(); g.position.set(...xyz); rpy(g, ...r); parent.add(g); const q = new THREE.Group(); g.add(q); J.push(q); return q; };
  const vis = (link, name, xyz, r) => { const g = new THREE.Group(); g.position.set(...xyz); rpy(g, ...r); link.add(g); V[name] = g; };
  vis(inertia, 'base', [0, 0, 0], [0, 0, P]);
  const shoulder = joint(inertia, [0, 0, .1625], [0, 0, 0]); vis(shoulder, 'shoulder', [0, 0, 0], [0, 0, P]);
  const upper = joint(shoulder, [0, 0, 0], [P / 2, 0, 0]); vis(upper, 'upperarm', [0, 0, .138], [P / 2, 0, -P / 2]);
  const fore = joint(upper, [-.425, 0, 0], [0, 0, 0]); vis(fore, 'forearm', [0, 0, .007], [P / 2, 0, -P / 2]);
  const w1 = joint(fore, [-.3922, 0, .1333], [0, 0, 0]); vis(w1, 'wrist1', [0, 0, -.127], [P / 2, 0, 0]);
  const w2 = joint(w1, [0, -.0997, 0], [P / 2, 0, 0]); vis(w2, 'wrist2', [0, 0, -.0997], [0, 0, 0]);
  const w3 = joint(w2, [0, .0996, 0], [P / 2, P, P]); vis(w3, 'wrist3', [0, 0, -.0989], [P / 2, 0, 0]);
  const flange = new THREE.Group(); rpy(flange, 0, -P / 2, -P / 2); w3.add(flange);
  const tool0 = new THREE.Group(); rpy(tool0, P / 2, 0, P / 2); flange.add(tool0);
  const q = new Float64Array(6);
  function set(a) { for (let i = 0; i < 6; i++) { q[i] = a[i]; J[i].rotation.z = a[i]; } }
  return { root, tool0, visuals: V, joints: J, q, set };
}

/* Damped least-squares IK on the real chain: put the tool tip at a point with the tool pointing
   straight down; rotation about the tool axis is left free. A weak pull toward a preferred posture
   keeps the elbow up and stops drift. */
export function makeIK(THREE, robot, tipLen, world) {
  const tip = new THREE.Vector3(), ax = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
  const pref = [-1.85, -1.75, 1.85, -1.67, -1.5708, 0];
  const read = () => { robot.tool0.updateWorldMatrix(true, false); const m = robot.tool0.matrixWorld; ax.set(m.elements[8], m.elements[9], m.elements[10]).normalize(); tip.setFromMatrixPosition(m).addScaledVector(ax, tipLen); };
  const err = (target, e) => { read(); e[0] = target.x - tip.x; e[1] = target.y - tip.y; e[2] = target.z - tip.z; const c = ax.clone().cross(down); e[3] = c.x * .35; e[4] = c.y * .35; e[5] = c.z * .35; };
  const e0 = new Float64Array(6), e1 = new Float64Array(6), Jm = Array.from({ length: 6 }, () => new Float64Array(6)), a = new Float64Array(6);
  function solve(target, iters = 6, lambda = .02) {
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < 6; i++) a[i] = robot.q[i];
      err(target, e0);
      const h = 1e-4;
      for (let j = 0; j < 6; j++) { a[j] += h; robot.set(a); err(target, e1); for (let i = 0; i < 6; i++) Jm[i][j] = (e0[i] - e1[i]) / h; a[j] -= h; }
      robot.set(a);
      // dq = J^T (J J^T + l^2 I)^-1 e  (6x6 solve)
      const M = Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, k) => { let s = 0; for (let j = 0; j < 6; j++) s += Jm[i][j] * Jm[k][j]; return s + (i === k ? lambda * lambda : 0); }));
      const y = gauss(M, Array.from(e0));
      let nrm = 0; const dq = new Float64Array(6);
      for (let j = 0; j < 6; j++) { let s = 0; for (let i = 0; i < 6; i++) s += Jm[i][j] * y[i]; dq[j] = s; nrm += s * s; }
      const k = Math.min(1, .12 / (Math.sqrt(nrm) || 1));
      for (let j = 0; j < 6; j++) a[j] = robot.q[j] + dq[j] * k + (pref[j] - robot.q[j]) * .0012;
      robot.set(a);
    }
    err(target, e0); return Math.hypot(e0[0], e0[1], e0[2]);
  }
  function gauss(M, b) {
    const n = b.length;
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]]; [b[c], b[p]] = [b[p], b[c]];
      for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k < n; k++) M[r][k] -= f * M[c][k]; b[r] -= f * b[c]; }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
    return x;
  }
  return { solve, tip: () => { read(); return tip.clone(); }, pref };
}
