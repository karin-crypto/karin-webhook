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
  /* ---------- procedural yacht textures ---------- */
  const TEX = (function () {
    const out = {};
    const mk = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; };
    // window panes: dark glass with pale mullions every 1.6 m (u in metres via repeat)
    out.panes = mk(256, 64, (x, w, h) => { x.fillStyle = '#0d1c2c'; x.fillRect(0, 0, w, h); const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(120,160,200,0.35)'); g.addColorStop(0.5, 'rgba(20,40,60,0)'); g.addColorStop(1, 'rgba(0,0,0,0.25)'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#e8e6e0'; for (let i = 0; i < 4; i++) x.fillRect(i * 64, 0, 4, h); x.fillRect(0, 0, w, 3); x.fillRect(0, h - 3, w, 3); });
    // teak planking: seams every 0.15 m across (v), plank ends every 2 m (u)
    out.teak = mk(256, 128, (x, w, h) => { x.fillStyle = '#c29a6b'; x.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(${90 + Math.random() * 60 | 0},${60 + Math.random() * 40 | 0},${30 + Math.random() * 30 | 0},${0.06 + Math.random() * 0.1})`; x.fillRect(Math.random() * w, Math.random() * h, 12, 1); } x.fillStyle = '#f2ece2'; for (let r = 0; r < 8; r++) x.fillRect(0, r * 16, w, 1.5); x.fillStyle = 'rgba(80,50,30,0.5)'; for (let r = 0; r < 8; r++) x.fillRect((r % 2) * 128, r * 16, 1.5, 16); });
    out.panesAlpha = mk(256, 64, (x, w, h) => { x.fillStyle = '#8c8c8c'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; for (let i = 0; i < 4; i++) x.fillRect(i * 64, 0, 4, h); x.fillRect(0, 0, w, 3); x.fillRect(0, h - 3, w, 3); });
    out.panesAlpha.colorSpace = T.NoColorSpace;
    out.teak.repeat.set(1 / 2, 1 / 1.2);
    out.panes.repeat.set(1 / 6.4, 1); out.panesAlpha.repeat.set(1 / 6.4, 1);
    const plates = new Map();
    out.nameplate = name => {
      if (plates.has(name)) return plates.get(name);
      const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
      x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, 512, 128);
      x.fillStyle = '#1b2430'; x.textAlign = 'center'; x.textBaseline = 'middle';
      let size = 64; x.font = `600 ${size}px "Bodoni Moda", Georgia, serif`; const txt = name.toUpperCase();
      while (x.measureText(txt).width > 480 && size > 22) { size -= 4; x.font = `600 ${size}px "Bodoni Moda", Georgia, serif`; }
      x.fillText(txt, 256, 52); x.font = '400 22px "IBM Plex Mono", monospace'; x.fillStyle = '#3b4756'; x.fillText('MONACO YACHT SHOW 2026', 256, 100);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; plates.set(name, t); return t;
    };
    return out;
  })();

  const MAT = {
    hull: (c) => new T.MeshPhysicalMaterial({ color: c, roughness: 0.28, metalness: 0.05, clearcoat: 0.9, clearcoatRoughness: 0.12, vertexColors: true, envMapIntensity: 1.0 }),
    super: (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.38, metalness: 0.05 }),
    glass: new T.MeshStandardMaterial({ color: 0x0b1a2b, roughness: 0.08, metalness: 0.85 }),
    panes: new T.MeshStandardMaterial({ map: TEX.panes, color: 0xffffff, roughness: 0.15, metalness: 0.6 }),
    // real glass: pale mullions stay solid, the panes let ~45 % through onto a dark saloon behind, with a sharp sky reflection
    glazing: new T.MeshPhysicalMaterial({ map: TEX.panes, alphaMap: TEX.panesAlpha, color: 0xdfeaf2, transparent: true, opacity: 1.0, roughness: 0.06, metalness: 0.0, envMapIntensity: 1.6, clearcoat: 1.0, clearcoatRoughness: 0.04, side: T.DoubleSide, depthWrite: false }),
    interior: new T.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.9, emissive: new T.Color(0xffd9a6), emissiveIntensity: 0 }),
    teak: new T.MeshStandardMaterial({ map: TEX.teak, color: 0xffffff, roughness: 0.8, metalness: 0.0 }),
    mast: new T.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.5, metalness: 0.3 }),
    dome: new T.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 }),
    rope: new T.LineBasicMaterial({ color: 0x9aa4ad, transparent: true, opacity: 0.6 }),
    detailMetal: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.7 }),
    detailSoft: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.0 }),
    poolWater: new T.MeshStandardMaterial({ color: 0x4fc8e8, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.9 }),
  };
  // small painted geometry helpers: everything built with these is merged into two meshes per yacht
  const gBox = (w, h, d, x, y, z, color, ry, rz) => { const b = new T.BoxGeometry(w, h, d); if (rz) b.rotateZ(rz); if (ry) b.rotateY(ry); b.translate(x, y, z); return paint(b, color); };
  const gCyl = (rt, rb, h, x, y, z, color, seg) => { const c = new T.CylinderGeometry(rt, rb, h, seg || 10); c.translate(x, y, z); return paint(c, color); };
  const gTube = (pts, r, color) => { const t = new T.TubeGeometry(new T.CatmullRomCurve3(pts), Math.max(6, pts.length * 2), r, 6, false); return paint(t, color); };
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
  const HULL_COLORS = { white: 0xf3f1ec, navy: 0x1e2b45, grey: 0x8d959c, gray: 0x8d959c, black: 0x1a1a1f, silver: 0xc9ced3, iceblue: 0xbfd0dc, green: 0x2f4f3e, blue: 0x2b4f8a, cream: 0xefe6d2, red: 0x8a1c1c, darkblue: 0x16223a, bronze: 0x7a6a52, champagne: 0xd8cbb0, darkgrey: 0x4a5058 };
  function hullGeometry(L, B, type, bow, low) {
    const N = low ? 14 : 32, M = low ? 7 : 11;
    const sailing = type === 'sailing';
    const fb = sailing ? L * 0.022 + 0.9 : L * 0.026 + 1.25;   // freeboard at midship
    const draft = clamp(sailing ? L * 0.05 + 0.8 : L * 0.038 + 0.8, 1, 6.5);
    bow = bow || (type === 'explorer' ? 'plumb' : sailing ? 'plumb' : 'raked');
    const rake = bow === 'axe' ? -L * 0.028 : bow === 'plumb' ? L * 0.006 : bow === 'bulbous' ? L * 0.04 : L * 0.045;
    const pos = [], idx = [];
    const stations = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;                       // 0 stern -> 1 bow
      const x = -L / 2 + t * L;
      const full = type === 'explorer' || bow === 'plumb' || bow === 'axe';
      let f = 1 - Math.pow(Math.max(0, (t - (full ? 0.60 : 0.52)) / (full ? 0.40 : 0.48)), sailing ? 1.5 : full ? 2.4 : 1.9);
      f *= 0.86 + 0.14 * smooth(0, 0.28, t);
      if (sailing) f *= 0.72 + 0.28 * smooth(0, 0.5, t);
      const b = Math.max(0.05, B / 2 * f);
      const yd = fb * (1 + (sailing ? 0.28 : bow === 'axe' ? 0.22 : 0.38) * Math.pow(t, 2.6));
      const yk = -draft * (0.55 + 0.45 * Math.sin(Math.PI * Math.pow(t, 0.9)));
      stations.push({ x, b, yd, yk, t });
      for (let j = 0; j < M; j++) {
        const s = -1 + 2 * j / (M - 1);   // -1 port .. +1 stbd
        const phi = s * Math.PI / 2;
        const z = b * Math.sign(s) * Math.pow(Math.abs(Math.sin(phi)), sailing ? 0.95 : 0.78);
        const c = Math.pow(Math.cos(phi), sailing ? 1.1 : 0.7);
        const y = yd - (yd - yk) * c;
        const xr = x + rake * ((y - yk) / (yd - yk)) * smooth(0.72, 1, t); // stem rake / plumb / reverse
        pos.push(xr, y, z);
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
    stations.forEach(s => { const xr = s.x + rake * smooth(0.72, 1, s.t); pos.push(xr, s.yd + 0.02, -s.b); pos.push(xr, s.yd + 0.02, s.b); });
    for (let i = 0; i < N; i++) { const a = d0 + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    const uvs = new Float32Array(pos.length / 3 * 2); for (let i = 0, k = 0; i < pos.length; i += 3, k += 2) { uvs[k] = pos[i]; uvs[k + 1] = pos[i + 2]; }
    g.setAttribute('uv', new T.BufferAttribute(uvs, 2));
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
    return { geom: g, fb, draft, stations, rake };
  }

  /* ---------- foam / water disturbance around a hull ---------- */
  let foamTex = null;
  function getFoamTex() {
    if (foamTex) return foamTex;
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 20, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.28)'); gr.addColorStop(0.75, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    foamTex = new T.CanvasTexture(c); return foamTex;
  }

  /* ---------- yacht builder (v3: per-yacht look parameters) ---------- */
  function buildYacht(spec, low) {
    const type = spec.type || 'motor';
    const look = spec.look || {};
    const L = spec.loa, B = spec.beam || estBeam(L, type);
    const g = new T.Group();
    const hullColor = spec.hullColor || (look.hull && HULL_COLORS[look.hull]) || (type === 'explorer' ? (hash(spec.name) < 0.5 ? 0x2b3a4d : 0x8d959c) : pickHull(spec.name));
    const superColor = spec.superColor || (look.superstructure && look.superstructure !== 'white' && HULL_COLORS[look.superstructure]) || 0xf5f4f0;
    const glassy = (look.style || []).some(k => /rwd|sinot|winch|oino|nuvolari|glass|zuccon|espen|vripack|design unlimited|tim heywood/i.test(k)) || L > 70;
    const feats = (look.features || []).join(' ').toLowerCase();
    const opts = { glassy, decks: look.decks || null, flybridge: look.flybridge, aftDeckOpen: look.aftDeckOpen, feats, bow: look.bow && look.bow !== 'unknown' ? look.bow : null, low: !!low };
    const meshes = [];
    const parts = { metal: [], soft: [], decks: [], mastTop: null };
    let hullInfo = null;

    if (type === 'catamaran') {
      const bh = B * 0.24;
      for (const side of [-1, 1]) {
        const h = hullGeometry(L, bh, 'motor', 'plumb', low);
        const m = new T.Mesh(h.geom, [MAT.hull(hullColor), MAT.teak]);
        m.position.z = side * (B / 2 - bh / 2);
        g.add(m); meshes.push(m);
      }
      const fb = L * 0.026 + 1.25;
      const bridge = new T.Mesh(extrudeUp(roundedPlan(-L * 0.42, L * 0.30, B / 2 - 0.3, B * 0.35, 0.8), 0.6, fb - 0.3), MAT.super(superColor));
      g.add(bridge); meshes.push(bridge);
      if (spec.sailCat) addRig(g, meshes, L, B * 0.5, fb + 0.3, superColor, { rig: 'sloop', masts: 1, mastHeight: look.mastHeight_m, house: false });
      else addDeckhouses(g, meshes, L * 0.9, B * 0.95, fb + 0.3, 'motor', superColor, spec.name, Object.assign({}, opts, { decks: look.flybridge === false ? 1 : (look.decks || 2) }), parts);
    } else {
      const h = hullGeometry(L, B, type, opts.bow, low); hullInfo = h;
      const m = new T.Mesh(h.geom, [MAT.hull(hullColor), MAT.teak]);
      g.add(m); meshes.push(m);
      if (type === 'sailing') addRig(g, meshes, L, B, h.fb, superColor, { rig: look.rig, masts: look.masts, mastHeight: look.mastHeight_m, house: true });
      else addDeckhouses(g, meshes, L, B, h.fb, type, superColor, spec.name, opts, parts);
    }
    if (!low) addDetails(g, L, B, hullInfo ? hullInfo.fb : L * 0.026 + 1.55, type, opts, parts, hullInfo, hullColor, spec.name || '');
    if (parts.metal.length) { const mm = new T.Mesh(mergeGeoms(parts.metal), MAT.detailMetal); g.add(mm); meshes.push(mm); }
    if (parts.soft.length) { const ms = new T.Mesh(mergeGeoms(parts.soft), MAT.detailSoft); g.add(ms); meshes.push(ms); }
    // hull-side window strip (main-deck cabins) and swim platform
    if (type !== 'sailing' && L > 34) {
      const fbH = L * 0.026 + 1.25;
      for (const side of [-1, 1]) {
        const strip = new T.Mesh(new T.BoxGeometry(L * 0.46, fbH * (glassy ? 0.3 : 0.22), 0.12), MAT.glass);
        strip.position.set(-L * 0.06, fbH * 0.62, side * (B / 2 * 0.985)); g.add(strip);
      }
    }
    if (type !== 'sailing') {
      const plat = new T.Mesh(new T.BoxGeometry(Math.max(1.6, L * 0.035), 0.25, B * 0.72), MAT.teak);
      plat.position.set(-L / 2 - Math.max(0.8, L * 0.0175), 0.55, 0); g.add(plat); meshes.push(plat);
    }
    // stern nameplate
    if (!low && L >= 24) {
      const pw = Math.min(B * 0.55, 9), ph = pw / 4;
      const plate = new T.Mesh(new T.PlaneGeometry(pw, ph), new T.MeshBasicMaterial({ map: TEX.nameplate((spec.name || '').replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\/.*$/, '').trim()), transparent: true, depthWrite: false }));
      const fbP = type === 'sailing' ? L * 0.022 + 0.9 : L * 0.026 + 1.25;
      plate.position.set(-L / 2 - 0.06, fbP * 0.55, 0); plate.rotation.y = -Math.PI / 2; g.add(plate);
    }
    // foam ring at the waterline
    const foam = new T.Mesh(new T.PlaneGeometry(L * 1.3, B * 2.6), new T.MeshBasicMaterial({ map: getFoamTex(), transparent: true, depthWrite: false, opacity: 0.9 }));
    foam.rotation.x = -Math.PI / 2; foam.position.y = 0.08; g.add(foam);
    // night dressing: underwater LED glow on the water + warm deck-edge light strips (toggled by the app)
    if (!low) {
      const nightG = new T.Group(); nightG.visible = false; nightG.name = 'night';
      const glow = new T.Mesh(new T.PlaneGeometry(L * 1.45, B * 3.2), new T.MeshBasicMaterial({ map: getFoamTex(), color: 0x7fd6ff, transparent: true, depthWrite: false, opacity: 1.0, blending: T.AdditiveBlending }));
      glow.rotation.x = -Math.PI / 2; glow.position.y = 0.12; nightG.add(glow);
      const fbN = type === 'sailing' ? L * 0.022 + 0.9 : L * 0.026 + 1.25;
      const strip = new T.MeshBasicMaterial({ color: 0xfff0c8 });
      for (const side of [-1, 1]) { const st = new T.Mesh(new T.BoxGeometry(L * 0.82, 0.08, 0.08), strip); st.position.set(-L * 0.04, fbN + 0.95, side * (B / 2 * 0.96)); nightG.add(st); }
      if (type !== 'sailing') { const aft = new T.Mesh(new T.BoxGeometry(0.08, 0.08, B * 0.7), strip); aft.position.set(-L / 2 + 0.6, fbN + 0.95, 0); nightG.add(aft); }
      // navigation lights: white stern light, white masthead/anchor light, red port / green starboard sidelights
      const lamp = (c, x, y, z, r) => { const m = new T.Mesh(new T.SphereGeometry(r || 0.16, 6, 5), new T.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); nightG.add(m); };
      lamp(0xffffff, -L / 2 + 0.3, fbN + 1.3, 0, 0.14);
      const mastY = type === 'sailing' ? fbN + L * 1.25 : fbN + clamp(L * 0.012 + 2.3, 2.4, 3.2) * Math.min(6, L < 26 ? 2 : L < 42 ? 3 : L < 70 ? 4 : 5) + clamp(L * 0.09, 3, 12);
      lamp(0xffffff, L * 0.05, mastY, 0, 0.2);
      lamp(0xff3030, L * 0.1, fbN + 2.2, -B / 2 * 0.9, 0.12); lamp(0x30ff60, L * 0.1, fbN + 2.2, B / 2 * 0.9, 0.12);
      g.add(nightG);
    }
    meshes.forEach(m => { m.castShadow = true; m.receiveShadow = true; m.userData.yacht = spec; });
    g.userData = { spec, meshes };
    return g;
  }

  function addDeckhouses(g, meshes, L, B, fb, type, color, name, o, parts) {
    o = o || {}; parts = parts || { metal: [], soft: [], decks: [] }; const M = parts.metal; const STEEL = 0xdfe3e8;
    const levels = o.decks || (L < 26 ? 2 : L < 42 ? 3 : L < 70 ? 4 : L < 110 ? 5 : 6);
    const dh = clamp(L * 0.012 + 2.3, 2.4, 3.2);       // deck height
    const explorer = type === 'explorer';
    const aftOpen = explorer && o.aftDeckOpen !== false;
    let y = fb;
    let x0 = aftOpen ? -L * 0.20 : explorer ? -L * 0.34 : -L * 0.40, x1 = explorer ? L * 0.34 : L * 0.27;
    let w = B * (explorer ? 0.90 : 0.84);
    const rnd = hash(name + ':ss');
    const bandFrac = o.glassy ? 0.72 : 0.42, bandY = o.glassy ? 0.16 : 0.35;
    let topX = 0, topY = y; let lastHouse = null;
    for (let i = 0; i < levels; i++) {
      const last = i === levels - 1;
      const slabAft = i === 0 ? x0 : x0 - dh * 1.4;
      parts.decks.push({ level: i, y, aft: i === 0 ? -L / 2 + 1.2 : slabAft + 0.4, fore: x0 - 0.3, w: i === 0 ? B * 0.8 : w + 0.5 });
      const slab = new T.Mesh(extrudeUp(roundedPlan(slabAft, x1 + 0.4, w / 2 + 0.35, w * 0.55, 1.2), 0.32, y - 0.32), MAT.super(color));
      g.add(slab); meshes.push(slab);
      if (i > 0) {
        for (const side of [-1, 1]) M.push(gBox(x1 - slabAft, 0.05, 0.05, (slabAft + x1) / 2, y + 1.0, side * (w / 2 + 0.3), STEEL));
        M.push(gBox(0.05, 0.05, w + 0.6, slabAft, y + 1.0, 0, STEEL)); // aft rail across the deck edge
        if (!o.low) { const nSt = Math.max(2, Math.round((x1 - slabAft) / 2.4));
        for (let k = 0; k <= nSt; k++) for (const side of [-1, 1]) M.push(gBox(0.05, 1.0, 0.05, slabAft + (x1 - slabAft) * k / nSt, y + 0.5, side * (w / 2 + 0.3), STEEL)); }
      }
      const hH = last && !explorer ? dh * 0.85 : dh;
      const bY0 = y + hH * bandY, bH = hH * bandFrac, rF = w * (o.glassy ? 0.75 : 0.6);
      if (o.low) {
        const house = new T.Mesh(extrudeUp(roundedPlan(x0, x1, w / 2, rF, 0.9), hH, y), MAT.super(color)); g.add(house); meshes.push(house);
        const band = new T.Mesh(extrudeUp(roundedPlan(x0 + 0.3, x1 + 0.12, w / 2 + 0.06, rF, 0.9), bH, bY0), MAT.glass); g.add(band); meshes.push(band);
      } else {
        // solid wall below and above the glass, a dark saloon behind it, then the glazing shell
        const lower = new T.Mesh(extrudeUp(roundedPlan(x0, x1, w / 2, rF, 0.9), hH * bandY + 0.02, y), MAT.super(color)); g.add(lower); meshes.push(lower);
        const upperH = hH - hH * bandY - bH; if (upperH > 0.05) { const upper = new T.Mesh(extrudeUp(roundedPlan(x0, x1, w / 2, rF, 0.9), upperH + 0.02, bY0 + bH - 0.02), MAT.super(color)); g.add(upper); meshes.push(upper); }
        const inner = new T.Mesh(extrudeUp(roundedPlan(x0 + 0.5, x1 - 0.5, w / 2 - 0.55, Math.max(0.3, rF - 0.55), 0.6), bH + 0.04, bY0 - 0.02), MAT.interior); g.add(inner); meshes.push(inner);
        const band = new T.Mesh(extrudeUp(roundedPlan(x0 + 0.3, x1 + 0.12, w / 2 + 0.06, rF, 0.9), bH, bY0), MAT.glazing); band.renderOrder = 2; g.add(band); meshes.push(band);
      }
      topX = (x0 + x1) / 2; topY = y + hH; lastHouse = { x0, x1, w };
      y += hH;
      const shrink = explorer ? 0.86 : 0.80;
      const len = (x1 - x0);
      x1 = x1 - len * (explorer ? 0.06 : 0.10) - dh * 0.3;
      x0 = x0 + len * (explorer ? 0.30 : 0.22) + dh * 0.4;
      w *= shrink;
      if (x1 - x0 < dh * 1.5) break;
    }
    let hardtop = null;
    if (L > 30 && o.flybridge !== false) {
      const htL = Math.max(4, (x1 - x0) * 0.9), htW = w * 0.95 + 1.0;
      const ht = new T.Mesh(extrudeUp(roundedPlan(topX - htL * 0.15, topX + htL * 0.85, htW / 2, htW * 0.5, 1.0), 0.28, topY + dh * 0.72), MAT.super(color));
      g.add(ht); meshes.push(ht); hardtop = { x0: topX - htL * 0.15, x1: topX + htL * 0.85 };
      for (const side of [-1, 1]) for (const k of [0.15, 0.8]) M.push(gBox(0.18, dh * 0.72, 0.18, topX - htL * 0.15 + htL * k, topY + dh * 0.36, side * (htW / 2 - 0.4), STEEL));
    }
    if (lastHouse) parts.decks.push({ level: levels, top: true, y: topY, aft: lastHouse.x0 + 0.4, fore: lastHouse.x1 - 0.4, w: lastHouse.w, hardtop });
    const mastH = clamp(L * 0.09, 3, 12);
    M.push(gBox(0.6, mastH, w * 0.9 + 1.2, topX + (explorer ? 2 : 1), topY + mastH / 2, 0, STEEL, 0, -0.25));
    M.push(gBox(mastH * 0.6, 0.5, 0.6, topX + 1 + mastH * 0.25, topY + mastH, 0, STEEL));
    parts.mastTop = { x: topX + 1 + mastH * 0.25, y: topY + mastH + 0.25, len: mastH * 0.6 };
    const domeR = clamp(L * 0.012, 0.4, 1.6);
    for (const dz of [-1, 1]) { const d = new T.SphereGeometry(domeR, 12, 8); d.translate(topX + 1 + mastH * 0.35, topY + mastH + 0.4 + domeR, dz * (domeR + 0.3)); parts.soft.push(paint(d, 0xf2f2f2)); }
    const feats = o.feats || '';
    const wantPad = /helipad|heli|touch-and-go/.test(feats) || (L > 75 && !explorer && !feats);
    if (wantPad) {
      const r = clamp(L * 0.07, 6, 11);
      const pad = new T.Mesh(new T.CylinderGeometry(r, r, 0.12, 24), new T.MeshStandardMaterial({ color: 0x9db9c9, roughness: 0.9 }));
      pad.position.set(L * 0.36, fb + 0.1, 0); g.add(pad);
      const H = new T.Mesh(new T.RingGeometry(r * 0.75, r * 0.82, 24), new T.MeshBasicMaterial({ color: 0xffffff })); H.rotation.x = -Math.PI / 2; H.position.set(L * 0.36, fb + 0.18, 0); g.add(H);
    }
    if (explorer || /crane|expedition|tender garage|submarine/.test(feats)) {
      { const ch = clamp(L * 0.08, 3, 9); const cr = new T.BoxGeometry(0.5, ch, 0.5); cr.rotateX(0.35); cr.translate(-L * 0.36, fb + ch / 2, B * 0.32); M.push(paint(cr, STEEL)); }
      parts.aftTender = true;
      if (aftOpen || explorer) { const tender = buildTender(clamp(L * 0.14, 5, 12)); tender.position.set(-L * 0.35, fb + 0.6, -B * 0.15); g.add(tender); }
    }
    parts.wantPool = (/pool|jacuzzi|spa/.test(feats) || (!feats && rnd < 0.5)) && L > 40;
    parts.helipad = wantPad; parts.aftOpen = aftOpen;
  }

  /* ---------- close-up detail: rails, fenders, ensign, antennas, deck furniture, jacuzzi, toys ---------- */
  function addDetails(g, L, B, fb, type, o, parts, hull, hullColor, name) {
    const M = parts.metal, S = parts.soft; const rnd = k => hash(name + ':' + k);
    const STEEL = 0xdfe3e8, CUSHION = 0xf4f1ea, CUSHION2 = 0xe9e3d6, TEAKC = 0xb08a5a, DARK = 0x2a2e33, NAVY = 0x1f2d44;
    const hc = new T.Color(hullColor); const hullDark = (0.2126 * hc.r + 0.7152 * hc.g + 0.0722 * hc.b) < 0.25;
    const st = hull ? hull.stations : null;
    const stAt = x => { let best = st[0]; for (const s of st) if (Math.abs(s.x - x) < Math.abs(best.x - x)) best = s; return best; };
    // 1 · bulwark rails along the whole hull, following the sheer, with stanchions every ~2.4 m
    if (st && type !== 'catamaran') {
      const rake = hull.rake || 0;
      for (const side of [-1, 1]) {
        const pts = []; let acc = 0, lastX = st[0].x;
        st.forEach((s, i) => { const xr = s.x + rake * smooth(0.72, 1, s.t); const z = side * s.b * 0.965; const y = s.yd + 0.98;
          if (i % 2 === 0 || i === st.length - 1) pts.push(new T.Vector3(xr, y, z));
          acc += s.x - lastX; lastX = s.x; if (acc >= 2.4 && s.t < 0.985) { acc = 0; M.push(gBox(0.05, 0.98, 0.05, xr, s.yd + 0.49, z, STEEL)); } });
        M.push(gTube(pts, 0.035, STEEL));
        M.push(gTube(pts.map(p => new T.Vector3(p.x, p.y - 0.45, p.z)), 0.02, STEEL));
      }
      // transom rail and stern cleats, anchor gear on the bow
      M.push(gBox(0.05, 0.05, B * 0.86 * 0.86, -L / 2 + 0.15, fb + 0.98, 0, STEEL));
      for (const side of [-1, 1]) M.push(gBox(0.5, 0.18, 0.14, -L / 2 + 1.2, fb + 0.1, side * B * 0.38, STEEL));
      for (const side of [-1, 1]) M.push(gBox(0.7, 0.45, 0.5, L / 2 - 2.6, stAt(L / 2 - 2.6).yd + 0.24, side * 0.7, STEEL));
      M.push(gBox(0.6, 0.12, 0.25, L / 2 - 0.9, stAt(L / 2 - 0.9).yd + 0.08, 0, STEEL));
    }
    // 2 · fenders hung along the after quarters, white on dark hulls, dark on white hulls
    if (st && L > 22 && type !== 'catamaran') {
      const fr = clamp(B * 0.03, 0.2, 0.42), fh = clamp(L * 0.03, 0.8, 1.9); const fc = hullDark ? 0xf1f1ee : 0x2b2f34;
      for (const side of [-1, 1]) for (const dx of [1.6, 4.8, 8.2]) { if (dx > L * 0.3) continue; const s = stAt(-L / 2 + dx); M.push(gCyl(fr, fr, fh, s.x, s.yd - 0.3 - fh / 2, side * (s.b + fr * 0.6), fc, 8)); M.push(gBox(0.02, 0.6, 0.02, s.x, s.yd + 0.4, side * (s.b + fr * 0.6), STEEL)); }
    }
    // 3 · ensign staff at the stern
    M.push(gCyl(0.025, 0.035, 2.3, -L / 2 + 0.45, fb + 1.15, 0, STEEL, 6));
    S.push(gBox(0.95, 0.58, 0.03, -L / 2 + 0.45 - 0.5, fb + 2.0, 0, 0xc8102e));
    // 4 · antennas and a radar bar on the mast beam
    if (parts.mastTop) { const mt = parts.mastTop; const ah = clamp(L * 0.03, 1.4, 3.2);
      for (const [kx, kz] of [[-0.3, -0.7], [0.1, 0.8], [0.35, -0.2]]) M.push(gCyl(0.02, 0.035, ah, mt.x + mt.len * kx, mt.y + ah / 2, kz, STEEL, 5));
      M.push(gBox(0.2, 0.18, clamp(B * 0.16, 1.2, 2.6), mt.x - mt.len * 0.4, mt.y + 0.35, 0, 0xf2f2f2)); }
    // furniture builders
    const lounger = (x, y, z, ry) => { S.push(gBox(1.95, 0.26, 0.72, x, y + 0.3, z, CUSHION, ry)); S.push(gBox(0.12, 0.6, 0.7, x + Math.cos(ry || 0) * 0.78, y + 0.66, z - Math.sin(ry || 0) * 0.78, CUSHION2, ry, -0.55)); M.push(gBox(1.7, 0.06, 0.6, x, y + 0.15, z, STEEL, ry)); };
    const sofa = (x, y, z, len, ry) => { S.push(gBox(len, 0.42, 0.85, x, y + 0.24, z, CUSHION, ry)); S.push(gBox(len, 0.42, 0.18, x - Math.sin(ry || 0) * 0.34, y + 0.62, z - Math.cos(ry || 0) * 0.34, CUSHION2, ry)); };
    const table = (x, y, z, r, chairs) => { S.push(gCyl(r, r, 0.06, x, y + 0.74, z, TEAKC, 20)); M.push(gCyl(0.12, 0.28, 0.7, x, y + 0.36, z, STEEL, 8));
      for (let i = 0; i < chairs; i++) { const a = i / chairs * Math.PI * 2, cx = x + Math.cos(a) * (r + 0.5), cz = z + Math.sin(a) * (r + 0.5); S.push(gBox(0.5, 0.08, 0.5, cx, y + 0.46, cz, CUSHION, -a)); S.push(gBox(0.06, 0.5, 0.5, cx + Math.cos(a) * 0.24, y + 0.72, cz + Math.sin(a) * 0.24, CUSHION2, -a)); M.push(gBox(0.4, 0.44, 0.4, cx, y + 0.22, cz, STEEL, -a)); } };
    const umbrella = (x, y, z) => { M.push(gCyl(0.03, 0.03, 2.4, x, y + 1.2, z, STEEL, 6)); const c = new T.ConeGeometry(1.35, 0.32, 10); c.translate(x, y + 2.45, z); S.push(paint(c, CUSHION)); };
    const jetski = (x, y, z, ry) => { S.push(gBox(2.9, 0.5, 1.1, x, y + 0.28, z, 0xe6e8ea, ry)); S.push(gBox(1.3, 0.32, 0.5, x - 0.2, y + 0.68, z, DARK, ry)); M.push(gBox(0.1, 0.35, 0.7, x + 0.95, y + 0.85, z, DARK, ry)); };
    const cushionPad = (x, y, z, w, d) => { S.push(gBox(w, 0.28, d, x, y + 0.16, z, CUSHION)); S.push(gBox(w, 0.06, d, x, y + 0.33, z, CUSHION2)); };
    // 5 · deck by deck
    const decks = parts.decks || [];
    decks.forEach(d => {
      const len = d.fore - d.aft; if (len < 2.5) return;
      const mid = (d.aft + d.fore) / 2, hw = d.w / 2;
      if (d.level === 0) {
        if (parts.aftTender || parts.aftOpen) return; // explorer working deck
        if (len > 7 && hw > 2.4) { table(d.fore - Math.min(len * 0.45, 4.5), d.y, 0, clamp(hw * 0.28, 0.7, 1.4), len > 10 ? 8 : 6); sofa(d.aft + 0.8, d.y, 0, Math.min(d.w * 0.7, 6), Math.PI / 2); }
        else if (len > 3.5) { sofa(d.aft + 0.7, d.y, 0, Math.min(d.w * 0.6, 4), Math.PI / 2); }
      } else if (!d.top) {
        if (len > 6 && hw > 2.2) { const n = hw > 4 ? 2 : 1; for (const side of [-1, 1]) for (let k = 0; k < n; k++) lounger(mid + 0.3, d.y, side * (hw - 0.9 - k * 0.95), 0); sofa(d.fore - 0.6, d.y, 0, Math.min(d.w * 0.75, 7), 0); if (len > 9) table(d.aft + len * 0.32, d.y, 0, clamp(hw * 0.22, 0.6, 1.0), 4); }
        else if (len > 3) { sofa(d.fore - 0.6, d.y, 0, Math.min(d.w * 0.7, 5), 0); }
      } else {
        // sun deck: jacuzzi aft of the hardtop, loungers and parasols around it, a bar forward
        let jx = null;
        if (parts.wantPool && hw > 2.2) { const r = clamp(hw * 0.28, 0.9, 1.9); jx = d.aft + r + 0.9; if (d.hardtop && jx + r > d.hardtop.x0 - 0.3) jx = Math.max(d.aft + r + 0.3, d.hardtop.x1 - r - 0.5);
          S.push(gCyl(r + 0.32, r + 0.32, 0.72, jx, d.y + 0.36, 0, 0xf6f4ef, 24)); M.push(gCyl(r + 0.36, r + 0.36, 0.06, jx, d.y + 0.72, 0, STEEL, 24));
          const wm = new T.Mesh(new T.CircleGeometry(r, 24), MAT.poolWater); wm.rotation.x = -Math.PI / 2; wm.position.set(jx, d.y + 0.7, 0); g.add(wm);
          for (const side of [-1, 1]) if (hw - r > 1.2) lounger(jx, d.y, side * (hw - 0.75), 0); }
        if (len > 6 && hw > 2.4) { const lx = jx != null ? jx + 3.2 : d.aft + 1.6; for (const side of [-1, 1]) { lounger(lx, d.y, side * (hw - 0.9), 0); if (len > 10) lounger(lx + 2.3, d.y, side * (hw - 0.9), 0); } if (hw > 3) for (const side of [-1, 1]) umbrella(lx + 1.1, d.y, side * (hw - 1.9)); }
        if (len > 8 && hw > 2.6) { S.push(gBox(2.2, 1.0, 0.7, d.fore - 1.4, d.y + 0.5, 0, CUSHION2)); S.push(gBox(2.4, 0.06, 0.85, d.fore - 1.4, d.y + 1.03, 0, TEAKC)); for (const dz of [-1, 0, 1]) M.push(gCyl(0.18, 0.18, 0.7, d.fore - 2.3, d.y + 0.35, dz * 0.7, STEEL, 8)); }
      }
    });
    // 6 · foredeck: toys on chocks for the mid-size boats, sun cushions for the big ones, nothing under a helipad
    if (st && type !== 'sailing' && type !== 'catamaran' && !parts.helipad) {
      const d0 = decks.find(d => d.level === 0); const fore0 = decks.length ? (decks.find(d => d.level === 0) ? Math.max(...decks.filter(d => d.level === 0).map(d => d.fore)) : 0) : 0;
      const houseFore = L * (type === 'explorer' ? 0.34 : 0.27) + 0.6; const bowX = L / 2 - 4.5; const room = bowX - houseFore;
      if (room > 5) { const fx = houseFore + room * 0.45; const sy = stAt(fx).yd + 0.05;
        if (L < 78) { const tl = clamp(L * 0.11, 4, 7.5); if (room > tl + 1.5 && B > 7) { const t = buildTender(tl); t.position.set(fx, sy + 0.55, B * 0.12); t.rotation.y = 0; g.add(t); for (const dx of [-tl * 0.25, tl * 0.25]) M.push(gBox(0.3, 0.5, tl * 0.32, fx + dx, sy + 0.25, B * 0.12, STEEL)); jetski(fx - 0.5, sy, -B * 0.24, 0); if (room > 9) jetski(fx + 3.0, sy, -B * 0.24, 0); }
          else if (B > 5.5) { jetski(fx, sy, 0, 0); } }
        else { cushionPad(fx, sy, 0, Math.min(room * 0.5, 5), Math.min(B * 0.42, 5)); for (const side of [-1, 1]) sofa(fx + 2.6, sy, side * Math.min(B * 0.22, 2.6), 3, Math.PI); if (rnd('fj') < 0.5 && B > 9) { const r = 1.3; const jx = fx - 3.6; S.push(gCyl(r + 0.3, r + 0.3, 0.7, jx, sy + 0.35, 0, 0xf6f4ef, 20)); const wm = new T.Mesh(new T.CircleGeometry(r, 20), MAT.poolWater); wm.rotation.x = -Math.PI / 2; wm.position.set(jx, sy + 0.68, 0); g.add(wm); } } }
    }
    // 7 · sailing yachts: twin wheels, winches, cockpit table and cushions, deck hatches
    if (type === 'sailing' && st) {
      const cx = -L * 0.36; const cy = fb + 0.05;
      for (const side of [-1, 1]) { const w = new T.TorusGeometry(clamp(L * 0.012, 0.45, 0.8), 0.04, 6, 18); w.rotateY(Math.PI / 2); w.translate(cx, cy + 1.0, side * B * 0.22); M.push(paint(w, STEEL)); M.push(gCyl(0.08, 0.14, 0.9, cx + 0.2, cy + 0.45, side * B * 0.22, STEEL, 8)); }
      for (const [dx, dz] of [[-0.28, 0.3], [-0.28, -0.3], [-0.2, 0.36], [-0.2, -0.36], [-0.05, 0.3], [-0.05, -0.3]]) M.push(gCyl(0.17, 0.2, 0.34, L * dx, cy + 0.17, B * dz, STEEL, 10));
      S.push(gBox(1.4, 0.06, 0.7, cx + 2.6, cy + 0.72, 0, TEAKC)); M.push(gBox(0.1, 0.7, 0.5, cx + 2.6, cy + 0.36, 0, STEEL));
      for (const side of [-1, 1]) S.push(gBox(3.2, 0.3, 0.6, cx + 2.6, cy + 0.15, side * B * 0.2, CUSHION));
      for (const dx of [0.2, 0.3, 0.4]) if (L * dx < L / 2 - 3) S.push(gBox(0.9, 0.12, 0.9, L * dx, stAt(L * dx).yd + 0.06, 0, 0x2f3a45));
    }
  }
  function buildTender(l) {
    const t = new T.Group();
    const h = hullGeometry(l, l * 0.3, 'motor', 'raked');
    const m = new T.Mesh(h.geom, [MAT.hull(0xe8e8e4), MAT.teak]); t.add(m);
    const con = new T.Mesh(new T.BoxGeometry(l * 0.25, 0.9, l * 0.14), MAT.glass); con.position.set(l * 0.05, h.fb + 0.45, 0); t.add(con);
    return t;
  }
  function addRig(g, meshes, L, B, fb, color, r) {
    r = r || {};
    if (r.house !== false) {
      const house = new T.Mesh(extrudeUp(roundedPlan(-L * 0.30, L * 0.12, B * 0.30, B * 0.3, 1.0), 1.5, fb), MAT.super(color));
      g.add(house); meshes.push(house);
      const band = new T.Mesh(extrudeUp(roundedPlan(-L * 0.29, L * 0.125, B * 0.30 + 0.05, B * 0.3, 1.0), 0.6, fb + 0.6), MAT.glass);
      g.add(band); meshes.push(band);
    }
    const rig = r.rig || (L > 52 ? 'ketch' : 'sloop');
    const nM = r.masts || (rig === 'sloop' ? 1 : 2);
    const mh = r.mastHeight ? r.mastHeight - fb : L * 1.28;
    let masts;
    if (nM === 1) masts = [{ x: L * 0.08, h: mh }];
    else if (rig === 'schooner') masts = [{ x: L * 0.22, h: mh * 0.85 }, { x: -L * 0.16, h: mh }];
    else masts = [{ x: L * 0.12, h: mh }, { x: -L * 0.26, h: mh * 0.78 }];
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

  global.MYS3D = { buildTender, HULL_COLORS, T, ll, llArr, clamp, lerp, smooth, hash, planShape, roundedPlan, extrudeUp, mergeGeoms, paint, MAT, buildYacht, estBeam, makeWater, makeSky, OrbitControls, ORIGIN };
})(window);
