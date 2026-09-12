/* Monaco Yacht Show 2026 — 3D engine (Three.js r158 UMD)
   Coordinates: X = east, Z = south (north is -Z), Y = up. Units: metres. */
(function (global) {
  'use strict';
  const T = global.THREE;

  /* ---------- geo helpers ---------- */
  const ORIGIN = { lat: 43.7355, lon: 7.4265 }; // centre of Port Hercule basin
  const M_PER_LAT = 111132.0;
  const M_PER_LON = 111320.0 * Math.cos(ORIGIN.lat * Math.PI / 180);
  function ll(lat, lon) { return { x: (lon - ORIGIN.lon) * M_PER_LON, z: -(lat - ORIGIN.lat) * M_PER_LAT }; }
  function llArr(list) { return list.map(p => ll(p[0], p[1])); }

  /* ---------- small utils ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
  function planShape(pts) { // pts in world XZ -> Shape (extruded along +Y after rotation)
    const s = new T.Shape();
    pts.forEach((p, i) => i ? s.lineTo(p.x, -p.z) : s.moveTo(p.x, -p.z));
    s.closePath();
    return s;
  }
  function roundedPlan(x0, x1, zHalf, rFront, rBack) { // plan-view rounded rectangle along X (bow = +x)
    const rf = Math.min(rFront, zHalf, (x1 - x0) / 2), rb = Math.min(rBack, zHalf, (x1 - x0) / 2);
    const s = new T.Shape();
    s.moveTo(x0 + rb, -zHalf);
    s.lineTo(x1 - rf, -zHalf);
    s.quadraticCurveTo(x1, -zHalf, x1, -zHalf + rf);
    s.lineTo(x1, zHalf - rf);
    s.quadraticCurveTo(x1, zHalf, x1 - rf, zHalf);
    s.lineTo(x0 + rb, zHalf);
    s.quadraticCurveTo(x0, zHalf, x0, zHalf - rb);
    s.lineTo(x0, -zHalf + rb);
    s.quadraticCurveTo(x0, -zHalf, x0 + rb, -zHalf);
    return s;
  }
  function extrudeUp(shape, height, y0) {
    const g = new T.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 6 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y0 || 0, 0);
    return g;
  }
  function mergeGeoms(list, withUv) {
    const parts = list.map(g => g.index ? g.toNonIndexed() : g);
    let n = 0; parts.forEach(g => n += g.attributes.position.count);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const uv = withUv ? new Float32Array(n * 2) : null, wall = withUv ? new Float32Array(n) : null;
    let o = 0;
    parts.forEach(g => {
      pos.set(g.attributes.position.array, o * 3);
      if (!g.attributes.normal) g.computeVertexNormals();
      nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.color) col.set(g.attributes.color.array, o * 3);
      if (withUv) {
        if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
        const na = g.attributes.normal.array, c = g.attributes.position.count;
        for (let i = 0; i < c; i++) wall[o + i] = Math.abs(na[i * 3 + 1]) < 0.5 ? 1 : 0;
      }
      o += g.attributes.position.count;
    });
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(pos, 3));
    out.setAttribute('normal', new T.BufferAttribute(nor, 3));
    out.setAttribute('color', new T.BufferAttribute(col, 3));
    if (withUv) { out.setAttribute('uv', new T.BufferAttribute(uv, 2)); out.setAttribute('aWall', new T.BufferAttribute(wall, 1)); }
    return out;
  }
  function paint(g, color) {
    const c = new T.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new T.BufferAttribute(arr, 3));
    return g;
  }

  /* ---------- materials ---------- */
  const MAT = {
    hull: (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.22, metalness: 0.1, vertexColors: true, envMapIntensity: 1.0 }),
    super: (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.38, metalness: 0.05 }),
    glass: new T.MeshStandardMaterial({ color: 0x0b1a2b, roughness: 0.08, metalness: 0.85 }),
    teak: new T.MeshStandardMaterial({ color: 0xb98a5a, roughness: 0.8, metalness: 0.0 }),
    mast: new T.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.5, metalness: 0.3 }),
    dome: new T.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 }),
    rope: new T.LineBasicMaterial({ color: 0x9aa4ad, transparent: true, opacity: 0.6 }),
  };
  const HULL_PALETTE = [
    [0.62, 0xf3f1ec], [0.12, 0x1e2b45], [0.10, 0x8d959c], [0.06, 0x1a1a1f], [0.06, 0xbfd0dc], [0.04, 0x4a5b6e],
  ];
  function pickHull(name) {
    let r = hash(name + ':hull'), acc = 0;
    for (const [w, c] of HULL_PALETTE) { acc += w; if (r <= acc) return c; }
    return 0xf3f1ec;
  }
  function estBeam(L, type) {
    if (type === 'sailing') return clamp(L * 0.185 + 0.6, 4, 15);
    if (type === 'catamaran') return clamp(L * 0.42, 8, 24);
    if (type === 'explorer') return clamp(L * 0.19 + 1.5, 6, 21);
    return clamp(L * 0.17 + 1.6, 5, 20); // motor
  }

  /* ---------- hull loft ---------- */
  function hullGeometry(L, B, type) {
    const N = 30, M = 11;
    const sailing = type === 'sailing';
    const fb = sailing ? L * 0.022 + 0.9 : L * 0.026 + 1.25;   // freeboard at midship
    const draft = clamp(sailing ? L * 0.05 + 0.8 : L * 0.038 + 0.8, 1, 6.5);
    const pos = [], idx = [];
    const stations = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;                       // 0 stern -> 1 bow
      const x = -L / 2 + t * L;
      let f = 1 - Math.pow(Math.max(0, (t - (type === 'explorer' ? 0.62 : 0.52)) / (type === 'explorer' ? 0.38 : 0.48)), sailing ? 1.4 : type === 'explorer' ? 2.6 : 1.9);
      f *= 0.86 + 0.14 * smooth(0, 0.28, t);
      if (sailing) f *= 0.75 + 0.25 * smooth(0, 0.5, t);
      const b = Math.max(0.05, B / 2 * f);
      const yd = fb * (1 + (sailing ? 0.28 : 0.38) * Math.pow(t, 2.6)) + (sailing ? 0 : 0.0);
      const yk = -draft * (0.55 + 0.45 * Math.sin(Math.PI * Math.pow(t, 0.9)));
      stations.push({ x, b, yd, yk });
      for (let j = 0; j < M; j++) {
        const s = -1 + 2 * j / (M - 1);   // -1 port .. +1 stbd
        const phi = s * Math.PI / 2;
        const z = b * Math.sign(s) * Math.pow(Math.abs(Math.sin(phi)), sailing ? 0.95 : 0.78);
        const c = Math.pow(Math.cos(phi), sailing ? 1.1 : 0.7);
        const y = yd - (yd - yk) * c;
        pos.push(x, y, z);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M - 1; j++) {
      const a = i * M + j, b = a + M;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    // transom
    const base = pos.length / 3; const st = stations[0];
    pos.push(st.x, (st.yd + st.yk) / 2, 0);
    for (let j = 0; j < M - 1; j++) idx.push(base, j + 1, j);
    // deck
    const d0 = pos.length / 3;
    stations.forEach(s => { pos.push(s.x, s.yd + 0.02, -s.b); pos.push(s.x, s.yd + 0.02, s.b); });
    for (let i = 0; i < N; i++) { const a = d0 + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    const colors = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      const y = pos[i + 1]; let r = 1, gg = 1, b = 1;
      if (y < 0.02) { r = 0.42; gg = 0.16; b = 0.14; }               // antifouling red
      else if (y < 0.02 + fb * 0.16) { r = 0.16; gg = 0.2; b = 0.26; } // boot-top stripe
      colors[i] = r; colors[i + 1] = gg; colors[i + 2] = b;
    }
    g.setAttribute('color', new T.BufferAttribute(colors, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.addGroup(0, N * (M - 1) * 6 + (M - 1) * 3, 0);
    g.addGroup(N * (M - 1) * 6 + (M - 1) * 3, N * 6, 1);
    return { geom: g, fb, draft, stations };
  }

  /* ---------- yacht builder ---------- */
  function buildYacht(spec) {
    const type = spec.type || 'motor';
    const L = spec.loa, B = spec.beam || estBeam(L, type);
    const g = new T.Group();
    const hullColor = spec.hullColor || (type === 'explorer' ? (hash(spec.name) < 0.5 ? 0x2b3a4d : 0x8d959c) : pickHull(spec.name));
    const superColor = 0xf5f4f0;
    const meshes = [];

    if (type === 'catamaran') {
      const bh = B * 0.24;
      for (const side of [-1, 1]) {
        const h = hullGeometry(L, bh, 'motor');
        const m = new T.Mesh(h.geom, [MAT.hull(hullColor), MAT.teak]);
        m.position.z = side * (B / 2 - bh / 2);
        g.add(m); meshes.push(m);
      }
      const fb = L * 0.026 + 1.25;
      const bridge = new T.Mesh(extrudeUp(roundedPlan(-L * 0.42, L * 0.30, B / 2 - 0.3, B * 0.35, 0.8), 0.6, fb - 0.3), MAT.super(superColor));
      g.add(bridge); meshes.push(bridge);
      addDeckhouses(g, meshes, L * 0.9, B * 0.95, fb + 0.3, 'motor', superColor, spec.name);
    } else {
      const h = hullGeometry(L, B, type);
      const m = new T.Mesh(h.geom, [MAT.hull(hullColor), MAT.teak]);
      g.add(m); meshes.push(m);
      if (type === 'sailing') addRig(g, meshes, L, B, h.fb, superColor);
      else addDeckhouses(g, meshes, L, B, h.fb, type, superColor, spec.name);
    }
    // hull-side window strip (main-deck cabins) and swim platform
    if (type !== 'sailing' && L > 34) {
      const fbH = L * 0.026 + 1.25;
      for (const side of [-1, 1]) {
        const strip = new T.Mesh(new T.BoxGeometry(L * 0.46, fbH * 0.22, 0.12), MAT.glass);
        strip.position.set(-L * 0.06, fbH * 0.62, side * (B / 2 * 0.985)); g.add(strip);
      }
    }
    if (type !== 'sailing') {
      const plat = new T.Mesh(new T.BoxGeometry(Math.max(1.6, L * 0.035), 0.25, B * 0.72), MAT.teak);
      plat.position.set(-L / 2 - Math.max(0.8, L * 0.0175), 0.55, 0); g.add(plat); meshes.push(plat);
    }
    meshes.forEach(m => { m.castShadow = true; m.receiveShadow = true; m.userData.yacht = spec; });
    g.userData = { spec, meshes };
    return g;
  }

  function addDeckhouses(g, meshes, L, B, fb, type, color, name) {
    const levels = L < 26 ? 2 : L < 42 ? 3 : L < 70 ? 4 : L < 110 ? 5 : 6;
    const dh = clamp(L * 0.012 + 2.3, 2.4, 3.2);       // deck height
    const explorer = type === 'explorer';
    let y = fb;
    let x0 = explorer ? -L * 0.22 : -L * 0.40, x1 = explorer ? L * 0.34 : L * 0.27;
    let w = B * (explorer ? 0.90 : 0.84);
    const rnd = hash(name + ':ss');
    let topX = 0, topY = y;
    for (let i = 0; i < levels; i++) {
      const last = i === levels - 1;
      // floor slab / terrace of this level (extends aft over the deck below)
      const slabAft = i === 0 ? x0 : x0 - dh * 1.4;
      const slab = new T.Mesh(extrudeUp(roundedPlan(slabAft, x1 + 0.4, w / 2 + 0.35, w * 0.55, 1.2), 0.32, y - 0.32), MAT.super(color));
      g.add(slab); meshes.push(slab);
      if (i > 0) { // railing line along the terrace edge
        const rail = new T.Mesh(new T.BoxGeometry(x1 - slabAft, 0.05, 0.05), MAT.mast);
        rail.position.set((slabAft + x1) / 2, y + 1.0, w / 2 + 0.3); g.add(rail);
        const rail2 = rail.clone(); rail2.position.z = -(w / 2 + 0.3); g.add(rail2);
      }
      const hH = last && !explorer ? dh * 0.85 : dh;
      const house = new T.Mesh(extrudeUp(roundedPlan(x0, x1, w / 2, w * 0.6, 0.9), hH, y), MAT.super(color));
      g.add(house); meshes.push(house);
      // window band
      const band = new T.Mesh(extrudeUp(roundedPlan(x0 + 0.3, x1 + 0.12, w / 2 + 0.06, w * 0.6, 0.9), hH * 0.42, y + hH * 0.35), MAT.glass);
      g.add(band); meshes.push(band);
      topX = (x0 + x1) / 2; topY = y + hH;
      y += hH;
      const shrink = explorer ? 0.86 : 0.80;
      const len = (x1 - x0);
      x1 = x1 - len * (explorer ? 0.06 : 0.10) - dh * 0.3;
      x0 = x0 + len * (explorer ? 0.30 : 0.22) + dh * 0.4;
      w *= shrink;
      if (x1 - x0 < dh * 1.5) break;
    }
    // hardtop over the aft part of the top deck (open sun deck / flybridge)
    if (L > 30) {
      const htL = Math.max(4, (x1 - x0) * 0.9), htW = w * 0.95 + 1.0;
      const ht = new T.Mesh(extrudeUp(roundedPlan(topX - htL * 0.15, topX + htL * 0.85, htW / 2, htW * 0.5, 1.0), 0.28, topY + dh * 0.72), MAT.super(color));
      g.add(ht); meshes.push(ht);
      for (const side of [-1, 1]) for (const k of [0.15, 0.8]) {
        const post = new T.Mesh(new T.BoxGeometry(0.18, dh * 0.72, 0.18), MAT.mast);
        post.position.set(topX - htL * 0.15 + htL * k, topY + dh * 0.36, side * (htW / 2 - 0.4)); g.add(post);
      }
    }
    // sun deck details: mast + radar arch + domes
    const mastH = clamp(L * 0.09, 3, 12);
    const arch = new T.Mesh(new T.BoxGeometry(0.6, mastH, w * 0.9 + 1.2), MAT.mast);
    arch.position.set(topX + (explorer ? 2 : 1), topY + mastH / 2, 0); arch.rotation.z = -0.25; g.add(arch);
    const beam = new T.Mesh(new T.BoxGeometry(mastH * 0.6, 0.5, 0.6), MAT.mast);
    beam.position.set(topX + 1 + mastH * 0.25, topY + mastH, 0); g.add(beam);
    const domeR = clamp(L * 0.012, 0.4, 1.6);
    for (const dz of [-1, 1]) {
      const d = new T.Mesh(new T.SphereGeometry(domeR, 12, 8), MAT.dome);
      d.position.set(topX + 1 + mastH * 0.35, topY + mastH + 0.4 + domeR, dz * (domeR + 0.3)); g.add(d);
    }
    // helipad / tender-deck / pool hints for big yachts
    if (L > 75 && !explorer) {
      const pad = new T.Mesh(new T.CylinderGeometry(clamp(L * 0.07, 6, 11), clamp(L * 0.07, 6, 11), 0.12, 24), new T.MeshStandardMaterial({ color: 0x9db9c9, roughness: 0.9 }));
      pad.position.set(L * 0.36, fb + 0.1, 0); g.add(pad);
    }
    if (explorer) {
      const crane = new T.Mesh(new T.BoxGeometry(0.5, clamp(L * 0.08, 3, 9), 0.5), MAT.mast);
      crane.position.set(-L * 0.36, fb + clamp(L * 0.08, 3, 9) / 2, B * 0.32); crane.rotation.x = 0.35; g.add(crane);
      const tender = buildTender(clamp(L * 0.14, 5, 12)); tender.position.set(-L * 0.35, fb + 0.6, -B * 0.15); g.add(tender);
    }
    if (rnd < 0.5 && L > 40) { // pool
      const pool = new T.Mesh(new T.BoxGeometry(clamp(L * 0.07, 3, 8), 0.1, clamp(B * 0.28, 2, 5)), new T.MeshStandardMaterial({ color: 0x3fb7d6, roughness: 0.1, metalness: 0.2 }));
      pool.position.set(-L * 0.44, fb + 0.08, 0); g.add(pool);
    }
  }
  function buildTender(l) {
    const t = new T.Group();
    const h = hullGeometry(l, l * 0.3, 'motor');
    const m = new T.Mesh(h.geom, [MAT.hull(0xe8e8e4), MAT.teak]); t.add(m);
    const con = new T.Mesh(new T.BoxGeometry(l * 0.25, 0.9, l * 0.14), MAT.glass); con.position.set(l * 0.05, h.fb + 0.45, 0); t.add(con);
    return t;
  }
  function addRig(g, meshes, L, B, fb, color) {
    const house = new T.Mesh(extrudeUp(roundedPlan(-L * 0.30, L * 0.12, B * 0.30, B * 0.3, 1.0), 1.5, fb), MAT.super(color));
    g.add(house); meshes.push(house);
    const band = new T.Mesh(extrudeUp(roundedPlan(-L * 0.29, L * 0.125, B * 0.30 + 0.05, B * 0.3, 1.0), 0.6, fb + 0.6), MAT.glass);
    g.add(band); meshes.push(band);
    const ketch = L > 52;
    const masts = ketch ? [{ x: L * 0.12, h: L * 1.22 }, { x: -L * 0.26, h: L * 0.95 }] : [{ x: L * 0.08, h: L * 1.28 }];
    masts.forEach(mm => {
      const mast = new T.Mesh(new T.CylinderGeometry(0.18, 0.42, mm.h, 10), MAT.mast);
      mast.position.set(mm.x, fb + mm.h / 2, 0); g.add(mast); meshes.push(mast);
      const boom = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, mm.h * 0.36, 8), MAT.mast);
      boom.rotation.z = Math.PI / 2; boom.position.set(mm.x - mm.h * 0.18, fb + 2.4, 0); g.add(boom);
      const furled = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, mm.h * 0.34, 8), MAT.dome);
      furled.rotation.z = Math.PI / 2; furled.position.set(mm.x - mm.h * 0.17, fb + 2.9, 0); g.add(furled);
      const spreaders = Math.max(2, Math.round(mm.h / 14));
      for (let i = 1; i <= spreaders; i++) {
        const sp = new T.Mesh(new T.BoxGeometry(0.12, 0.12, B * 0.55), MAT.mast);
        sp.position.set(mm.x, fb + mm.h * i / (spreaders + 1), 0); g.add(sp);
      }
      const top = new T.Vector3(mm.x, fb + mm.h, 0);
      const pts = [new T.Vector3(L * 0.5 - 0.3, fb * 1.35, 0), top, new T.Vector3(-L * 0.5 + 0.3, fb + 0.2, 0),
        new T.Vector3(mm.x, fb, B * 0.5 - 0.2), top, new T.Vector3(mm.x, fb, -B * 0.5 + 0.2)];
      const line = new T.Line(new T.BufferGeometry().setFromPoints(pts), MAT.rope); g.add(line);
    });
  }

  /* ---------- water ---------- */
  function makeWater(size) {
    const uniforms = {
      uTime: { value: 0 }, uSun: { value: new T.Vector3(0.4, 0.8, 0.3) },
      uDeep: { value: new T.Color(0x0a3f5c) }, uShallow: { value: new T.Color(0x1f7f9c) },
      uSky: { value: new T.Color(0x9ecbe4) }, uSunCol: { value: new T.Color(0xfff2d0) }, uNight: { value: 0 },
    };
    const mat = new T.ShaderMaterial({
      uniforms, transparent: false,
      vertexShader: `
        uniform float uTime; varying vec3 vPos; varying vec3 vNorm;
        void main(){
          vec3 p = position;
          float w = sin(p.x*0.09 + uTime*0.9)*0.12 + sin(p.z*0.13 - uTime*0.7)*0.10 + sin((p.x+p.z)*0.05 + uTime*0.5)*0.15;
          p.y += w;
          float dx = cos(p.x*0.09 + uTime*0.9)*0.09*0.12 + cos((p.x+p.z)*0.05 + uTime*0.5)*0.05*0.15;
          float dz = cos(p.z*0.13 - uTime*0.7)*0.13*0.10 + cos((p.x+p.z)*0.05 + uTime*0.5)*0.05*0.15;
          vNorm = normalize(vec3(-dx*6.0, 1.0, -dz*6.0));
          vPos = (modelMatrix*vec4(p,1.0)).xyz;
          gl_Position = projectionMatrix*viewMatrix*vec4(vPos,1.0);
        }`,
      fragmentShader: `
        uniform vec3 uSun, uDeep, uShallow, uSky, uSunCol; uniform float uTime, uNight;
        varying vec3 vPos; varying vec3 vNorm;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
        void main(){
          vec3 V = normalize(cameraPosition - vPos);
          vec3 N = normalize(vNorm + vec3(noise(vPos.xz*0.35 + uTime*0.15)-0.5, 0.0, noise(vPos.zx*0.35 - uTime*0.12)-0.5)*0.35);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          float d = clamp(length(vPos.xz)/900.0, 0.0, 1.0);
          vec3 base = mix(uShallow, uDeep, d);
          vec3 col = mix(base, uSky, fres*0.75);
          vec3 H = normalize(normalize(uSun) + V);
          float spec = pow(max(dot(N,H),0.0), 260.0) * 2.2 + pow(max(dot(N,H),0.0), 40.0)*0.25;
          col += uSunCol * spec * (1.0 - uNight*0.6);
          float glint = noise(vPos.xz*0.9 + uTime*0.3);
          col += vec3(0.04)*glint*(1.0-uNight);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const geom = new T.PlaneGeometry(size, size, 220, 220);
    geom.rotateX(-Math.PI / 2);
    const mesh = new T.Mesh(geom, mat);
    mesh.receiveShadow = false;
    mesh.userData.uniforms = uniforms;
    return mesh;
  }

  /* ---------- sky ---------- */
  function makeSky() {
    const uniforms = { uTop: { value: new T.Color(0x2f6fb0) }, uHorizon: { value: new T.Color(0xd7e6f0) }, uSun: { value: new T.Vector3(0.4, 0.8, 0.3) }, uNight: { value: 0 } };
    const mat = new T.ShaderMaterial({
      uniforms, side: T.BackSide, depthWrite: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uTop,uHorizon,uSun; uniform float uNight; varying vec3 vDir;
        void main(){ float h = clamp(vDir.y,0.0,1.0); vec3 c = mix(uHorizon, uTop, pow(h,0.55));
          float s = pow(max(dot(normalize(vDir), normalize(uSun)),0.0), 600.0);
          c += vec3(1.0,0.92,0.75)*s*(1.0-uNight);
          float glow = pow(max(dot(normalize(vDir), normalize(uSun)),0.0), 6.0)*0.25;
          c += vec3(1.0,0.8,0.55)*glow*(1.0-uNight);
          gl_FragColor = vec4(c,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment> }`,
    });
    const m = new T.Mesh(new T.SphereGeometry(6000, 32, 16), mat);
    m.userData.uniforms = uniforms;
    return m;
  }

  /* ---------- orbit controls (custom, touch friendly) ---------- */
  function OrbitControls(camera, dom, opts) {
    const o = Object.assign({ minDist: 25, maxDist: 2600, minPolar: 0.08, maxPolar: 1.48 }, opts);
    const s = { target: new T.Vector3(0, 0, 0), theta: 0.6, phi: 0.9, dist: 900, enabled: true };
    const goal = { target: s.target.clone(), theta: s.theta, phi: s.phi, dist: s.dist };
    let ground = null;
    let ptrs = new Map(), lastPinch = 0, lastMid = null, mode = null, moved = false;
    let damp = 0.12; let lastInput = performance.now();
    function apply() {
      camera.position.set(
        s.target.x + s.dist * Math.sin(s.phi) * Math.sin(s.theta),
        s.target.y + s.dist * Math.cos(s.phi),
        s.target.z + s.dist * Math.sin(s.phi) * Math.cos(s.theta));
      camera.lookAt(s.target);
    }
    function pan(dx, dy) {
      const k = goal.dist / dom.clientHeight * 1.1;
      const fwd = new T.Vector3(Math.sin(goal.theta), 0, Math.cos(goal.theta));
      const right = new T.Vector3(fwd.z, 0, -fwd.x);
      goal.target.addScaledVector(right, dx * k).addScaledVector(fwd, dy * k);
      goal.target.x = clamp(goal.target.x, -1600, 1600); goal.target.z = clamp(goal.target.z, -1600, 1600);
    }
    dom.addEventListener('pointerdown', e => {
      if (!s.enabled) return; dom.setPointerCapture(e.pointerId); lastInput = performance.now();
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false;
      mode = (e.button === 2 || e.shiftKey || e.ctrlKey) ? 'pan' : 'rot';
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; lastPinch = Math.hypot(a.x - b.x, a.y - b.y); lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    });
    dom.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      const p = ptrs.get(e.pointerId); const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (lastPinch) goal.dist = clamp(goal.dist * lastPinch / d, o.minDist, o.maxDist);
        if (lastMid) pan(-(mid.x - lastMid.x), -(mid.y - lastMid.y));
        lastPinch = d; lastMid = mid; return;
      }
      if (mode === 'pan') pan(-dx, -dy);
      else { goal.theta -= dx * 0.005; goal.phi = clamp(goal.phi - dy * 0.005, o.minPolar, o.maxPolar); }
    });
    const up = e => { ptrs.delete(e.pointerId); lastPinch = 0; lastMid = null; };
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);
    dom.addEventListener('wheel', e => { e.preventDefault(); lastInput = performance.now(); goal.dist = clamp(goal.dist * Math.exp(e.deltaY * 0.0012), o.minDist, o.maxDist); }, { passive: false });
    dom.addEventListener('contextmenu', e => e.preventDefault());
    const api = {
      state: s, goal,
      wasDrag: () => moved,
      lastInput: () => lastInput,
      setDamp(d) { damp = d; },
      setGround(fn) { ground = fn; },
      update() {
        s.theta += (goal.theta - s.theta) * damp; s.phi += (goal.phi - s.phi) * damp; s.dist += (goal.dist - s.dist) * damp;
        s.target.lerp(goal.target, damp);
        // keep the camera above the water and the terrain
        apply();
        const gMin = Math.max(4, ground ? ground(camera.position.x, camera.position.z) + 9 : 4);
        if (camera.position.y < gMin) { s.phi = Math.min(s.phi, Math.acos(clamp((gMin - s.target.y) / Math.max(s.dist, 5), -1, 1))); goal.phi = Math.min(goal.phi, s.phi); apply(); }
      },
      flyTo(target, theta, phi, dist) { lastInput = performance.now(); goal.target.copy(target); if (theta !== undefined) goal.theta = theta; if (phi !== undefined) goal.phi = phi; if (dist !== undefined) goal.dist = clamp(dist, o.minDist, o.maxDist); },
      snap() { s.theta = goal.theta; s.phi = goal.phi; s.dist = goal.dist; s.target.copy(goal.target); apply(); },
    };
    return api;
  }

  global.MYS3D = { T, ll, llArr, clamp, lerp, smooth, hash, planShape, roundedPlan, extrudeUp, mergeGeoms, paint, MAT, buildYacht, estBeam, makeWater, makeSky, OrbitControls, ORIGIN };
})(window);
