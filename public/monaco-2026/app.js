/* Monaco Yacht Show 2026 — application: harbour, berthing, UI */
(function () {
  'use strict';
  const E = window.MYS3D, FX = window.MYSFX, T = E.T, D = window.MYS_DATA;
  const isMobile = window.innerWidth < 760 || /Mobi|Android/i.test(navigator.userAgent);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- i18n ---------- */
  const I18N = {
    en: {
      eyebrow: '35th edition · Port Hercule · 23–26 September 2026', h1: 'Monaco Yacht Show 2026', h1sub: 'A 3D model of the fleet in Port Hercule',
      sub: 'Drag to orbit · scroll to zoom · right-drag or two fingers to pan · click a yacht',
      fleet: 'Fleet', labels: 'Names', night: 'Night', fx: 'FX', aboutBtn: 'Sources', fleetTitle: 'The Fleet', search: 'Search yacht or builder…',
      loa: 'Length', beam: 'Beam', year: 'Year', type: 'Type', close: 'Close', aboutTitle: 'About this model',
      sigRole: '3D visualisation · Monaco Yacht Show 2026', sigMeta: 'Fleet, berths and beams compiled 12 Sept 2026 from the official list, shipyards, brokers and trade press', sigLink: 'accuracy notes',
      all: 'All', debut: 'Debuts', motor: 'Motor', sailing: 'Sail', explorer: 'Explorer', catamaran: 'Multihull', big: '60 m +',
      tDebut: 'World / show debut', tConfirmed: 'Official list', tReported: 'Reported', tMotor: 'Motor yacht', tSailing: 'Sailing yacht', tExplorer: 'Explorer', tCatamaran: 'Multihull',
      berth: 'Berth', est: 'est.', shownAt: 'Shown at', yachts: 'yachts', source: 'Source',
      views: { aerial: ['Aerial', 'Overview'], digue: ['Digue', 'Rainier III'], etats: ['Quai', 'des États-Unis'], antoine: ['Quai', 'Antoine 1er'], rocher: ['From', 'Le Rocher'], entrance: ['Harbour', 'entrance'] },
      about: [
        '<p>Every yacht in this model is drawn from its published length overall, beam and type, and moored where the show places it when a berth or quay was published. Berth codes follow the official scheme: D = Quai Rainier III (Digue), R = Quai Rainier 1er, E = Quai des États-Unis, C = Quai Chicane, S = Appontement Jules Soccal (the T-Central pier), H = Quai de l’Hirondelle, L = Jetée Lucciana, J = Quai Jarlan; numbered berths are placed in numeric order along their quay. Where no berth was published the yacht is placed on a quay of matching size following the show’s customary layout, largest hulls outboard on the Digue and Quai Rainier III.</p>',
        '<p>Quays, breakwaters and the surrounding buildings are traced from OpenStreetMap geometry of Port Hercule. Hull and superstructure shapes are parametric approximations, not shipyard drawings. Terrain is interpolated from published street and landmark altitudes; Le Rocher follows the Monaco-Ville district boundary; the tallest Monte-Carlo towers carry their real heights.</p>',
        '<p>The fleet list combines the official MYS 2026 superyacht list with shipyard, broker and trade-press announcements as of 12 September 2026. Confidence is marked on each card: <b>Official list</b> or <b>Reported</b>. About 40 further yachts, mostly brokerage boats under 55 m, had not been named publicly at compile time.</p>',
      ],
    },
    he: {
      eyebrow: 'המהדורה ה-35 · נמל הרקולס · 23–26 בספטמבר 2026', h1: 'Monaco Yacht Show 2026', h1sub: 'הדמיה תלת-ממדית של הצי בנמל הרקולס',
      sub: 'גררו לסיבוב · גלגלו לזום · לחצן ימני או שתי אצבעות להזזה · לחצו על יאכטה',
      fleet: 'הצי', labels: 'שמות', night: 'לילה', fx: 'אפקטים', aboutBtn: 'מקורות', fleetTitle: 'הצי', search: 'חיפוש יאכטה או מספנה…',
      loa: 'אורך', beam: 'רוחב', year: 'שנה', type: 'סוג', close: 'סגירה', aboutTitle: 'על ההדמיה',
      sigRole: 'הדמיה תלת-ממדית · תערוכת היאכטות מונקו 2026', sigMeta: 'הצי, העגינות והמידות נאספו ב-12.9.2026 מהרשימה הרשמית, מספנות, ברוקרים ועיתונות המקצוע', sigLink: 'הערות דיוק',
      all: 'הכול', debut: 'בכורות', motor: 'מנוע', sailing: 'מפרש', explorer: 'אקספלורר', catamaran: 'רב-גופית', big: '60 מ׳ +',
      tDebut: 'בכורה עולמית / בתערוכה', tConfirmed: 'ברשימה הרשמית', tReported: 'דווח', tMotor: 'יאכטת מנוע', tSailing: 'יאכטת מפרש', tExplorer: 'אקספלורר', tCatamaran: 'רב-גופית',
      berth: 'עגינה', est: 'משוער', shownAt: 'מוצגת ב', yachts: 'יאכטות', source: 'מקור',
      views: { aerial: ['מבט על', 'הנמל כולו'], digue: ['הדיג', 'רנייה השלישי'], etats: ['רציף', 'ארצות הברית'], antoine: ['רציף', 'אנטואן הראשון'], rocher: ['מבט', 'מהסלע'], entrance: ['פתח', 'הנמל'] },
      about: [
        '<p>כל יאכטה במודל בנויה לפי האורך הכולל, הרוחב והסוג שפורסמו לגביה, ומעוגנת במקום שבו התערוכה מציבה אותה כאשר פורסם רציף או קוד עגינה. קודי העגינה לפי הסכמה הרשמית: D = רציף רנייה השלישי (הדיג), R = רציף רנייה הראשון, E = רציף ארצות הברית, C = רציף השיקאן, S = מזח ז׳ול סוקאל (מזח ה-T המרכזי), H = רציף לירונדל, L = מזח לוצ׳יאנה, J = רציף ז׳רלן; עגינות ממוספרות מוצבות לפי הסדר המספרי לאורך הרציף. כשלא פורסם מיקום, היאכטה הוצבה ברציף התואם לגודלה לפי הפריסה המקובלת של התערוכה: הגופים הגדולים ביותר על הדיג ועל רציף רנייה השלישי.</p>',
        '<p>הרציפים, שוברי הגלים והבניינים שמסביב משורטטים מגיאומטריית OpenStreetMap של נמל הרקולס. צורות הגוף והמבנה העילי הן קירובים פרמטריים, לא שרטוטי מספנה. הטופוגרפיה מחושבת מגבהים ידועים של רחובות ואתרים; הסלע עוקב אחר גבול רובע מונקו-ויל; המגדלים הגבוהים של מונטה קרלו בגובהם האמיתי.</p>',
        '<p>רשימת הצי משלבת את הרשימה הרשמית של MYS 2026 עם הודעות מספנות, ברוקרים ועיתונות מקצועית נכון ל-12 בספטמבר 2026. רמת הוודאות מסומנת בכל כרטיס: <b>ברשימה הרשמית</b> או <b>דווח</b>. כ-40 יאכטות נוספות, רובן סירות ברוקראז׳ מתחת ל-55 מ׳, טרם פורסמו בשמן.</p>',
      ],
    },
  };
  let lang = 'he';
  try { lang = localStorage.getItem('mys-lang') || (navigator.language.startsWith('he') ? 'he' : 'en'); } catch (e) { }
  const t = k => I18N[lang][k];

  /* ---------- renderer / scene ---------- */
  const canvas = document.getElementById('stage');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(50, 1, 2, 12000);
  const controls = E.OrbitControls(camera, canvas);

  const hemi = new T.HemisphereLight(0xcfe3f2, 0x3b4a3a, 0.75); scene.add(hemi);
  const sun = new T.DirectionalLight(0xfff1d8, 2.4);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera; sc.near = 50; sc.far = 3200; sc.left = -900; sc.right = 900; sc.top = 900; sc.bottom = -900; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
  scene.add(sun); scene.add(sun.target);
  const sky = FX.makeSky(); scene.add(sky);
  const water = FX.makeWater(9000, { reflectSize: isMobile ? 512 : 1024 }); scene.add(water);
  let fxOn = !isMobile;
  const post = FX.makePost(renderer);
  const pmrem = new T.PMREMGenerator(renderer); const envScene = new T.Scene();
  function updateEnv() { scene.remove(sky); envScene.add(sky); const rt = pmrem.fromScene(envScene, 0.04); envScene.remove(sky); scene.add(sky); if (scene.environment) scene.environment.dispose(); scene.environment = rt.texture; }
  scene.fog = new T.Fog(0xd7e6f0, 1400, 5200);

  /* ---------- terrain ---------- */
  const H = D.harbour;
  function pointInPoly(x, z, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
    }
    return inside;
  }
  function distToPoly(x, z, poly) {
    let best = 1e9;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j]; const dx = b.x - a.x, dz = b.z - a.z; const l2 = dx * dx + dz * dz || 1;
      const u = E.clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1);
      best = Math.min(best, Math.hypot(x - (a.x + u * dx), z - (a.z + u * dz)));
    }
    return best;
  }
  const landXZ = E.llArr(H.landPoly);
  const rockXZ = E.llArr(H.rockPoly);
  const rockRidge = { a: E.ll(43.7313, 7.4200), b: E.ll(43.7331, 7.4280) };
  // spot heights + coastline zeros -> inverse-distance field
  const spots = H.spots.map(p => ({ x: E.ll(p[0], p[1]).x, z: E.ll(p[0], p[1]).z, h: p[2] }));
  for (let i = 0; i < H.coastCount; i += 3) { const c = landXZ[i]; spots.push({ x: c.x, z: c.z, h: 0 }); }
  function idw(x, z) {
    let num = 0, den = 0;
    for (const s of spots) { const d2 = (x - s.x) * (x - s.x) + (z - s.z) * (z - s.z) + 400; const w = 1 / (d2 * d2); num += w * s.h; den += w; }
    return num / den;
  }
  function elevation(x, z) {
    if (!pointInPoly(x, z, landXZ)) return -2.5;
    let h = Math.max(0, idw(x, z));
    const dCoast = distToPoly(x, z, landXZ);
    h *= E.smooth(8, 60, dCoast);                       // quays and promenades stay flat
    // Le Rocher: plateau bounded by cliffs (Monaco-Ville district ring)
    if (pointInPoly(x, z, rockXZ)) {
      const dx = rockRidge.b.x - rockRidge.a.x, dz = rockRidge.b.z - rockRidge.a.z;
      const u = E.clamp(((x - rockRidge.a.x) * dx + (z - rockRidge.a.z) * dz) / (dx * dx + dz * dz), 0, 1);
      const top = u < 0.7 ? E.lerp(62, 52, u / 0.7) : E.lerp(52, 21, (u - 0.7) / 0.3);
      const dEdge = distToPoly(x, z, rockXZ);
      h = Math.max(h, top * E.smooth(18, 62, dEdge));
    }
    h += (Math.sin(x * 0.011) * Math.cos(z * 0.013) + Math.sin(x * 0.031 + z * 0.02)) * 1.2 * E.smooth(0, 80, dCoast);
    return h;
  }
  controls.setGround(elevation);
  (function buildTerrain() {
    const S = 3800, N = 190;
    const g = new T.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, elevation(p.getX(i), p.getZ(i)) - 0.6);
    g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: 0x7a8560, roughness: 1 }));
    m.receiveShadow = true; scene.add(m);
  })();

  /* ---------- land slab, piers, structures ---------- */
  const stone = new T.MeshStandardMaterial({ color: 0xd8cfbd, roughness: 0.95, vertexColors: true });
  const landGeoms = [];
  landGeoms.push(E.paint(E.extrudeUp(E.planShape(landXZ), 3.7, -1.5), 0xd8cfbd));
  (H.piers || []).forEach(p => { const xz = E.llArr(p.pts); if (xz.length < 3) return; landGeoms.push(E.paint(E.extrudeUp(E.planShape(xz), p.height + 1.5, -1.5), p.color || 0xd8cfbd)); });
  (H.structures || []).forEach(s => { // boxes: digue deck, jetties, tents, pavilions
    const c = E.ll(s.lat, s.lon);
    const g = new T.BoxGeometry(s.length, s.height, s.width);
    g.rotateY(-s.bearing * Math.PI / 180 + Math.PI / 2); g.translate(c.x, (s.y || 0) + s.height / 2, c.z);
    landGeoms.push(E.paint(g, s.color || 0xd8cfbd));
  });
  const land = new T.Mesh(E.mergeGeoms(landGeoms), stone); land.castShadow = true; land.receiveShadow = true; scene.add(land);

  const facadeMat = FX.facadeMaterial(FX.makeFacadeTextures());
  // buildings (merged, coloured by height band; base on terrain)
  (function buildBuildings() {
    const geoms = [];
    const palette = [0xe9dfcc, 0xe3d6c2, 0xf0e8d8, 0xd9c9b3, 0xe6dccb, 0xcfc3b0];
    (H.buildings || []).forEach((b, i) => {
      const xz = E.llArr(b.pts); if (xz.length < 3) return;
      let cx = 0, cz = 0; xz.forEach(p => { cx += p.x; cz += p.z; }); cx /= xz.length; cz /= xz.length;
      const base = elevation(cx, cz);
      const h = b.height || 16;
      const g = E.extrudeUp(E.planShape(xz), h + 3, base - 3);
      geoms.push(E.paint(g, b.color || palette[i % palette.length]));
    });
    if (!geoms.length) return;
    const m = new T.Mesh(E.mergeGeoms(geoms, true), facadeMat);
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
  })();

  // roads: asphalt ribbons draped on the terrain (the Grand Prix circuit runs on the harbour-front ones)
  const roadSegs = [];
  (function buildRoads() {
    const geoms = [];
    (H.roads || []).forEach(r => {
      const xz = E.llArr(r.pts); const w = r.w;
      for (let i = 0; i < xz.length - 1; i++) {
        const a = xz[i], b = xz[i + 1]; const len = Math.hypot(b.x - a.x, b.z - a.z); if (len < 0.5) continue;
        roadSegs.push([a, b]);
        const ya = elevation(a.x, a.z) + 0.35, yb = elevation(b.x, b.z) + 0.35;
        const g = new T.PlaneGeometry(len, w, Math.max(1, Math.round(len / 25)), 1); g.rotateX(-Math.PI / 2); g.rotateY(-Math.atan2(b.z - a.z, b.x - a.x));
        const pa = g.attributes.position; for (let k = 0; k < pa.count; k++) { const px = pa.getX(k) + (a.x + b.x) / 2, pz = pa.getZ(k) + (a.z + b.z) / 2; pa.setX(k, px); pa.setZ(k, pz); pa.setY(k, Math.max(elevation(px, pz), 0) + 0.35); }
        geoms.push(E.paint(g, r.f1 ? 0x3d3f45 : 0x4a4b50));
        const joint = new T.CircleGeometry(w / 2, 8); joint.rotateX(-Math.PI / 2); joint.translate(b.x, yb, b.z); geoms.push(E.paint(joint, r.f1 ? 0x3d3f45 : 0x4a4b50));
        if (i === 0) { const j0 = new T.CircleGeometry(w / 2, 8); j0.rotateX(-Math.PI / 2); j0.translate(a.x, ya, a.z); geoms.push(E.paint(j0, 0x4a4b50)); }
      }
    });
    if (!geoms.length) return;
    const m = new T.Mesh(E.mergeGeoms(geoms), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 }));
    m.receiveShadow = true; scene.add(m);
  })();

  // trees: scattered on land away from buildings, roads and quays; denser in the gardens
  (function buildTrees() {
    const bPolys = (H.buildings || []).map(b => { const xz = E.llArr(b.pts); let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; xz.forEach(p => { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); minz = Math.min(minz, p.z); maxz = Math.max(maxz, p.z); }); return { xz, minx, maxx, minz, maxz }; });
    const inBuilding = (x, z) => bPolys.some(b => x > b.minx - 2 && x < b.maxx + 2 && z > b.minz - 2 && z < b.maxz + 2 && pointInPoly(x, z, b.xz));
    const nearRoad = (x, z) => roadSegs.some(([a, b]) => { const dx = b.x - a.x, dz = b.z - a.z; const l2 = dx * dx + dz * dz || 1; const u = E.clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1); return Math.hypot(x - (a.x + u * dx), z - (a.z + u * dz)) < 6; });
    const pts = []; let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const tryAdd = (x, z, k, s) => {
      if (!pointInPoly(x, z, landXZ)) return; if (distToPoly(x, z, landXZ) < 30) return;
      if (inBuilding(x, z) || nearRoad(x, z)) return;
      const y = elevation(x, z); if (y < 2) return;
      pts.push({ x, y: y - 0.3, z, k, s });
    };
    (H.gardens || []).forEach(([lat, lon, r, n]) => { const c = E.ll(lat, lon); for (let i = 0; i < n; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * r; tryAdd(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, rnd() < 0.5 ? 0 : 1, 0.8 + rnd() * 0.6); } });
    for (let i = 0; i < 9000 && pts.length < (isMobile ? 900 : 2600); i++) {
      const a = rnd() * 6.283, d = 150 + Math.pow(rnd(), 0.6) * 1750; const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const far = d > 1000; if (!far && rnd() < 0.55) continue;
      tryAdd(x, z, far || rnd() < 0.6 ? 0 : 1, 0.7 + rnd() * 0.8);
    }
    scene.add(FX.makeTrees(pts));
  })();

  // quay zone strips (thin coloured kerb along each show quay) + tents
  const ZONE_COLORS = { etats: 0xc8a24a, rainier: 0x2e8ba8, digue: 0x1e2b45, antoine: 0xc8102e, louis: 0x4f9f6a, soccal: 0xd97a3a, anchor: 0x9ec5d8, hirondelle: 0x3b6fb6, cruise: 0x6b6b78, chicane: 0xe0c060, lucciana: 0x7fb7a8, jarlan: 0xb56b8a };
  const stripMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
  const strips = [];
  H.quays.forEach(q => {
    const xz = E.llArr(q.pts);
    for (let i = 0; i < xz.length - 1; i++) {
      const a = xz[i], b = xz[i + 1]; const len = Math.hypot(b.x - a.x, b.z - a.z);
      const g = new T.BoxGeometry(len, 0.35, 1.4); g.rotateY(-Math.atan2(b.z - a.z, b.x - a.x));
      g.translate((a.x + b.x) / 2, 0.9, (a.z + b.z) / 2);
      strips.push(E.paint(g, ZONE_COLORS[q.zone] || 0xffffff));
    }
  });
  if (strips.length) { const m = new T.Mesh(E.mergeGeoms(strips), stripMat); scene.add(m); }

  /* ---------- berthing ---------- */
  const quays = H.quays.map(q => {
    const xz = E.llArr(q.pts); const w = E.ll(q.water[0], q.water[1]);
    const segs = [];
    for (let i = 0; i < xz.length - 1; i++) {
      const a = xz[i], b = xz[i + 1]; const len = Math.hypot(b.x - a.x, b.z - a.z);
      const d = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
      let n = { x: -d.z, z: d.x }; // one of the two normals
      const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      if ((w.x - mid.x) * n.x + (w.z - mid.z) * n.z < 0) n = { x: d.z, z: -d.x };
      segs.push({ a, b, d, n, len });
    }
    const total = segs.reduce((s, x) => s + x.len, 0);
    return { ...q, segs, total, used: q.margin ?? 0, endMargin: q.endMargin ?? 6, placed: [] };
  });
  const quayById = Object.fromEntries(quays.map(q => [q.id, q]));
  function zoneFor(y) {
    const z = (y.zone || '').toLowerCase();
    if (/cruise terminal/.test(z)) return 'cruise';
    if (/anchor/.test(z)) return 'anchor';
    if (/berth d\d|digue/.test(z)) return y.loa >= 88 ? 'cruise' : 'digue';
    if (/berth r\d|rainier/.test(z)) return 'rainier';
    if (/berth e\d|etats|états|qe\d/.test(z)) return 'etats';
    if (/berth c\d|chicane/.test(z)) return 'chicane';
    if (/berth s\d|soccal|js\d/.test(z)) return 'soccal';
    if (/berth h\d|hirondelle|sailing/.test(z)) return 'hirondelle';
    if (/berth l\d|lucciana/.test(z)) return 'lucciana';
    if (/berth j\d|jarlan/.test(z)) return 'jarlan';
    if (/ql\d|louis/.test(z)) return 'louis';
    if (/antoine/.test(z)) return 'antoine';
    return null;
  }
  function berthNo(y) { const m = /berth [a-z](\d+)/i.exec(y.zone || ''); return m ? +m[1] : 999; }
  function fits(q, y) {
    const need = q.mode === 'alongside' ? y.loa + 6 : (y.beam || E.estBeam(y.loa, y.type)) + 3.2;
    return (!q.maxLoa || y.loa <= q.maxLoa) && (!q.minLoa || y.loa >= q.minLoa) && q.used + need <= q.total - q.endMargin;
  }
  function place(q, y) {
    const beam = y.beam || E.estBeam(y.loa, y.type);
    const need = q.mode === 'alongside' ? y.loa + 6 : beam + 3.2;
    const centreAlong = q.used + need / 2; q.used += need;
    let acc = 0, seg = q.segs[q.segs.length - 1], local = seg.len;
    for (const s of q.segs) { if (centreAlong <= acc + s.len) { seg = s; local = centreAlong - acc; break; } acc += s.len; }
    const px = seg.a.x + seg.d.x * local, pz = seg.a.z + seg.d.z * local;
    let x, z, heading;
    if (q.mode === 'alongside') {
      const off = beam / 2 + 1.2; x = px + seg.n.x * off; z = pz + seg.n.z * off;
      heading = Math.atan2(-seg.d.z, seg.d.x); // bow along quay direction
    } else {
      const off = y.loa / 2 + 2.0; x = px + seg.n.x * off; z = pz + seg.n.z * off;
      heading = Math.atan2(-seg.n.z, seg.n.x);   // bow pointing away from the quay (stern-to)
    }
    q.placed.push(y);
    return { x, z, heading, quay: q };
  }
  const yachts = D.yachts.slice().sort((a, b) => b.loa - a.loa);
  // placement order: yachts with a published berth number first (in berth order along their quay), then the rest by size
  const placeOrder = yachts.slice().sort((a, b) => { const za = zoneFor(a) ? 0 : 1, zb = zoneFor(b) ? 0 : 1; if (za !== zb) return za - zb; const na = berthNo(a), nb = berthNo(b); if (na !== nb) return na - nb; return b.loa - a.loa; });
  const order = ['digue', 'rainier', 'etats', 'chicane', 'hirondelle', 'soccal', 'louis', 'lucciana', 'antoine', 'jarlan', 'cruise'];
  const anchorSlots = (H.anchorage || []).map(a => ({ ...a, xz: E.ll(a.lat, a.lon), used: false }));
  placeOrder.forEach(y => {
    let zone = zoneFor(y);
    if (!zone && (y.type === 'sailing' || y.sailCat)) zone = 'hirondelle';
    let spot = null;
    if (zone === 'anchor') {
      const s = anchorSlots.find(a => !a.used); if (s) { s.used = true; spot = { x: s.xz.x, z: s.xz.z, heading: (s.heading || 120) * Math.PI / 180, quay: { id: 'anchor', name: H.anchorName } }; }
    } else {
      const candidates = [zone, ...order.filter(o => o !== zone)].filter(Boolean).flatMap(id => quays.filter(q => q.zone === id && q.id !== 'anchor'));
      for (const q of candidates) if (fits(q, y)) { spot = place(q, y); break; }
      if (!spot) { const s = anchorSlots.find(a => !a.used); if (s) { s.used = true; spot = { x: s.xz.x, z: s.xz.z, heading: (s.heading || 120) * Math.PI / 180, quay: { id: 'anchor', name: H.anchorName } }; } }
    }
    if (!spot) return;
    y.spot = spot; y.placedZone = spot.quay.zone || 'anchor'; y.quayName = spot.quay.name;
    const g = E.buildYacht(y);
    g.position.set(spot.x, 0, spot.z); g.rotation.y = spot.heading;
    if (spot.quay.mode === 'stern') { // passerelle from the stern to the quay
      const fbH = y.type === 'sailing' ? y.loa * 0.022 + 0.9 : y.loa * 0.026 + 1.25;
      const gl = Math.max(4, y.loa * 0.08);
      const gw = new T.Mesh(new T.BoxGeometry(gl, 0.12, 0.9), E.MAT.mast);
      gw.position.set(-y.loa / 2 - gl / 2 + 0.6, (fbH + 2.2) / 2 + 0.3, 0); gw.rotation.z = -Math.atan2(fbH - 2.0, gl) ; g.add(gw);
    }
    scene.add(g); y.obj = g;
    y.top = new T.Vector3(0, y.type === 'sailing' ? y.loa * 1.3 + 4 : y.loa * 0.16 + 14, 0);
  });
  const pickables = []; yachts.forEach(y => y.obj && y.obj.userData.meshes.forEach(m => pickables.push(m)));

  // decorative tenders & chase boats in the Tenders & Toys zones (not part of the fleet list)
  (H.smallcraft || []).forEach((sc, si) => {
    if (!sc.n) return;
    const q = { ...sc, id: 'sc' + si, mode: 'stern', margin: 4, zone: 'tenders' };
    const xz = E.llArr(q.pts); const w = E.ll(q.water[0], q.water[1]); const segs = [];
    for (let i = 0; i < xz.length - 1; i++) { const a = xz[i], b = xz[i + 1]; const len = Math.hypot(b.x - a.x, b.z - a.z); const d = { x: (b.x - a.x) / len, z: (b.z - a.z) / len }; let n = { x: -d.z, z: d.x }; const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }; if ((w.x - mid.x) * n.x + (w.z - mid.z) * n.z < 0) n = { x: d.z, z: -d.x }; segs.push({ a, b, d, n, len }); }
    q.segs = segs; q.total = segs.reduce((s, x) => s + x.len, 0); q.used = 4; q.endMargin = 4; q.placed = [];
    for (let i = 0; i < sc.n; i++) {
      const loa = sc.lo + (sc.hi - sc.lo) * E.hash('t' + si + ':' + i); const y = { name: 'tender-' + si + '-' + i, loa: Math.round(loa * 10) / 10, type: 'motor', hullColor: [0xf3f1ec, 0x2a2f36, 0xd9dde2][i % 3] };
      y.beam = E.estBeam(loa, 'motor') * 0.85;
      if (!fits(q, y)) break;
      const spot = place(q, y); const g = E.buildYacht(y); g.position.set(spot.x, 0, spot.z); g.rotation.y = spot.heading; g.userData.meshes.forEach(m => { m.userData.yacht = null; }); scene.add(g);
    }
  });

  // mooring lines + fenders as tiny detail: skip for perf. Night lights:
  const nightGroup = new T.Group(); nightGroup.visible = false; scene.add(nightGroup);
  (function buildLights() {
    const pts = [], cols = [];
    const warm = new T.Color(0xffd28a), cool = new T.Color(0xcfe8ff);
    quays.forEach(q => q.segs.forEach(s => { for (let d = 0; d < s.len; d += 18) { pts.push(s.a.x + s.d.x * d, 5.5, s.a.z + s.d.z * d); cols.push(warm.r, warm.g, warm.b); } }));
    yachts.forEach(y => { if (!y.obj) return; const p = y.obj.position; const n = Math.max(2, Math.round(y.loa / 12));
      for (let i = 0; i < n; i++) { const along = -y.loa / 2 + (i + 0.5) * y.loa / n; const x = p.x + Math.cos(y.spot.heading) * along, z = p.z - Math.sin(y.spot.heading) * along;
        pts.push(x, y.loa * 0.03 + 3, z); cols.push(cool.r, cool.g, cool.b); } });
    (H.buildings || []).forEach((b, i) => { if (i % 3) return; const xz = E.llArr(b.pts); let cx = 0, cz = 0; xz.forEach(p => { cx += p.x; cz += p.z; }); cx /= xz.length; cz /= xz.length;
      pts.push(cx, elevation(cx, cz) + (b.height || 16) * 0.6, cz); cols.push(warm.r, warm.g, warm.b); });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    const tex = (function () { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
    const m = new T.PointsMaterial({ size: 12, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true });
    nightGroup.add(new T.Points(g, m));
  })();

  /* ---------- day / night ---------- */
  let night = false;
  function applyLighting() {
    const wu = water.userData.uniforms, su = sky.userData.uniforms;
    if (!night) {
      sun.position.set(-320, 780, 720); sun.intensity = 2.4; sun.color.set(0xfff1d8); hemi.intensity = 0.75;
      su.uTop.value.set(0x2f6fb0); su.uHorizon.value.set(0xdbe8f1); su.uNight.value = 0;
      wu.uDeep.value.set(0x0a3f5c); wu.uShallow.value.set(0x1f7f9c); wu.uSky.value.set(0xa9d1e6); wu.uNight.value = 0;
      scene.fog.color.set(0xd7e6f0); renderer.toneMappingExposure = 1.05;
    } else {
      sun.position.set(900, 260, -600); sun.intensity = 0.4; sun.color.set(0xb9c8ff); hemi.intensity = 0.3;
      su.uTop.value.set(0x050b18); su.uHorizon.value.set(0x1b2a45); su.uNight.value = 1;
      wu.uDeep.value.set(0x03101e); wu.uShallow.value.set(0x0a2438); wu.uSky.value.set(0x223a5a); wu.uNight.value = 1;
      scene.fog.color.set(0x0b1524); renderer.toneMappingExposure = 0.9;
    }
    const dir = sun.position.clone().normalize(); wu.uSun.value.copy(dir); su.uSun.value.copy(dir);
    wu.fogColor.value.copy(scene.fog.color); facadeMat.emissiveIntensity = night ? 0.6 : 0;
    nightGroup.visible = night; updateEnv();
    document.getElementById('btnNight').setAttribute('aria-pressed', String(night));
  }
  applyLighting();

  /* ---------- camera presets ---------- */
  const VIEWS = H.views; // {key:{lat,lon,theta,phi,dist}}
  function goView(k) { const v = VIEWS[k]; const c = E.ll(v.lat, v.lon); controls.flyTo(new T.Vector3(c.x, v.y || 0, c.z), v.theta, v.phi, v.dist); }
  const viewsEl = document.getElementById('views');
  function renderViews() {
    viewsEl.innerHTML = '';
    Object.keys(VIEWS).forEach(k => {
      const b = document.createElement('button'); b.className = 'btn'; const lbl = t('views')[k];
      b.innerHTML = `<span>${lbl[0]}</span><small>${lbl[1]}</small>`; b.addEventListener('click', () => goView(k)); viewsEl.appendChild(b);
    });
  }
  goView('aerial'); controls.snap();
  if (!reduceMotion) { controls.goal.dist = 2600; controls.goal.theta += 0.9; controls.goal.phi = 1.25; controls.snap(); controls.setDamp(0.022); goView('aerial'); setTimeout(() => controls.setDamp(0.12), 4200); }

  /* ---------- labels ---------- */
  const labelsEl = document.getElementById('labels');
  let showLabels = true, hovered = null, selected = null;
  const labelNodes = new Map();
  const placeLabels = (H.places || []).map(p => ({ ...p, xz: E.ll(p.lat, p.lon), el: null }));
  function labelFor(y) {
    let el = labelNodes.get(y.id);
    if (!el) { el = document.createElement('div'); el.className = 'lbl'; el.innerHTML = `<span class="nm"></span><span class="len"></span>`; labelsEl.appendChild(el); labelNodes.set(y.id, el);
      el.querySelector('.nm').textContent = shortName(y); el.querySelector('.len').textContent = y.loa + ' m'; }
    return el;
  }
  function shortName(y) { return y.name.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\/.*$/, '').trim(); }
  const v3 = new T.Vector3();
  function updateLabels() {
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    const camDist = controls.state.dist;
    const maxN = camDist > 1500 ? 6 : camDist > 900 ? 12 : camDist > 450 ? 28 : 200;
    let shown = 0; const taken = [];
    for (const y of yachts) {
      if (!y.obj) continue;
      const el = labelFor(y);
      const want = showLabels && (y === selected || y === hovered || shown < maxN);
      if (!want) { el.style.display = 'none'; continue; }
      v3.copy(y.top).applyMatrix4(y.obj.matrixWorld).project(camera);
      if (v3.z > 1 || Math.abs(v3.x) > 0.98 || Math.abs(v3.y) > 0.98) { el.style.display = 'none'; continue; }
      const d = camera.position.distanceTo(y.obj.position);
      if (y !== selected && y !== hovered && d > 2600) { el.style.display = 'none'; continue; }
      const sx = (v3.x + 1) / 2 * w, sy = (1 - v3.y) / 2 * h;
      const pri = y === selected || y === hovered;
      if (!pri && taken.some(p => Math.abs(p[0] - sx) < 84 && Math.abs(p[1] - sy) < 18)) { el.style.display = 'none'; continue; }
      taken.push([sx, sy]);
      el.style.display = 'block'; shown++;
      el.style.left = sx + 'px'; el.style.top = sy + 'px';
      el.classList.toggle('sel', y === selected || y === hovered);
      el.style.opacity = y === selected || y === hovered ? 1 : E.clamp(1.4 - d / 2200, 0.35, 1);
    }
    placeLabels.forEach(p => {
      if (!p.el) { p.el = document.createElement('div'); p.el.className = 'lbl place'; p.el.textContent = lang === 'he' && p.he ? p.he : p.name; labelsEl.appendChild(p.el); }
      const on = showLabels && camDist < 2200;
      if (!on) { p.el.style.display = 'none'; return; }
      v3.set(p.xz.x, (p.y || 0) + 6, p.xz.z).project(camera);
      if (v3.z > 1 || Math.abs(v3.x) > 1 || Math.abs(v3.y) > 1) { p.el.style.display = 'none'; return; }
      p.el.style.display = 'block'; p.el.style.left = ((v3.x + 1) / 2 * w) + 'px'; p.el.style.top = ((1 - v3.y) / 2 * h) + 'px';
    });
  }

  /* ---------- picking ---------- */
  const ray = new T.Raycaster(); const mouse = new T.Vector2();
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.yacht : null;
  }
  let lastMove = 0;
  canvas.addEventListener('pointermove', ev => { if (ev.pointerType !== 'mouse') return; const now = performance.now(); if (now - lastMove < 40) return; lastMove = now; hovered = pick(ev); canvas.classList.toggle('hover', !!hovered); });
  canvas.addEventListener('pointerdown', () => canvas.classList.add('dragging'));
  canvas.addEventListener('pointerup', ev => { canvas.classList.remove('dragging'); if (controls.wasDrag()) return; const y = pick(ev); if (y) select(y, true); else if (selected) select(null); });

  /* ---------- selection / card ---------- */
  const card = document.getElementById('card');
  function typeKey(y) { return y.type === 'catamaran' ? 'tCatamaran' : y.type === 'sailing' ? 'tSailing' : y.type === 'explorer' ? 'tExplorer' : 'tMotor'; }
  function select(y, fly) {
    selected = y;
    document.querySelectorAll('.item').forEach(el => el.setAttribute('aria-current', String(y && +el.dataset.id === y.id)));
    if (!y) { card.hidden = true; return; }
    card.hidden = false;
    document.getElementById('cardTags').innerHTML =
      (y.debut ? `<span class="tag debut">${t('tDebut')}</span>` : '') +
      `<span class="tag ${y.status === 'confirmed2026' ? 'conf' : ''}">${y.status === 'confirmed2026' ? t('tConfirmed') : t('tReported')}</span>` +
      `<span class="tag">${t(typeKey(y))}</span>`;
    document.getElementById('cardName').textContent = y.name;
    document.getElementById('cardBuilder').textContent = y.builder || '';
    document.getElementById('cardLoa').innerHTML = `${y.loa} <small>m</small>`;
    document.getElementById('cardBeam').innerHTML = y.beam ? `${y.beam} <small>m</small>` : `${E.estBeam(y.loa, y.type).toFixed(1)} <small>m · ${t('est')}</small>`;
    document.getElementById('cardYear').textContent = y.year || '—';
    document.getElementById('cardType').textContent = (y.typeText || y.type).split('(')[0].trim();
    const qn = y.quayName ? (lang === 'he' && y.quayName.he ? y.quayName.he : y.quayName.en || y.quayName) : '';
    document.getElementById('cardZone').innerHTML = `${t('berth')}: <b>${qn}</b>${y.zone ? ` · <span dir="ltr">${y.zone}</span>` : ''}`;
    document.getElementById('cardNote').textContent = y.notes || '';
    const src = (y.source || '').split(/[;,\s]+/).find(s => /^https?:/.test(s));
    document.getElementById('cardSrc').innerHTML = src ? `<a href="${src}" target="_blank" rel="noopener">${t('source')} ↗</a>` : '';
    if (fly && y.obj) {
      const p = y.obj.position; const dist = E.clamp(y.loa * 3.2, 90, 420);
      controls.flyTo(new T.Vector3(p.x, 4, p.z), y.spot.heading + Math.PI * 0.62, 1.12, dist);
    }
    const it = document.querySelector(`.item[data-id="${y.id}"]`); if (it && it.scrollIntoView) it.scrollIntoView({ block: 'nearest' });
  }
  document.getElementById('cardClose').addEventListener('click', () => select(null));

  /* ---------- list / filters ---------- */
  const listEl = document.getElementById('list'), chipsEl = document.getElementById('chips'), searchEl = document.getElementById('search'), countEl = document.getElementById('count');
  let filter = 'all', query = '';
  const FILTERS = ['all', 'debut', 'big', 'motor', 'explorer', 'sailing', 'catamaran'];
  function passes(y) {
    if (filter === 'debut' && !y.debut) return false;
    if (filter === 'big' && y.loa < 60) return false;
    if (['motor', 'explorer', 'sailing', 'catamaran'].includes(filter) && y.type !== filter) return false;
    if (query && !(y.name + ' ' + (y.builder || '')).toLowerCase().includes(query)) return false;
    return true;
  }
  function renderChips() {
    chipsEl.innerHTML = '';
    FILTERS.forEach(f => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = t(f); b.setAttribute('aria-pressed', String(filter === f)); b.addEventListener('click', () => { filter = f; renderChips(); renderList(); }); chipsEl.appendChild(b); });
  }
  function renderList() {
    listEl.innerHTML = '';
    let n = 0;
    yachts.forEach(y => {
      if (!passes(y)) return; n++;
      const b = document.createElement('button'); b.className = 'item'; b.dataset.id = y.id; b.setAttribute('role', 'option'); b.setAttribute('aria-current', String(selected === y));
      const qn = y.quayName ? (lang === 'he' && y.quayName.he ? y.quayName.he : y.quayName.en || y.quayName) : '';
      b.innerHTML = `<span class="n" dir="ltr">${shortName(y)}${y.debut ? '<i class="debut" title="debut"></i>' : ''}</span><span class="m">${y.loa}<small> m</small></span><span class="b"><span dir="ltr">${y.builder || ''}${y.year ? ' · ' + y.year : ''}</span>${qn ? ` · <span class="q">${qn.split(' · ')[0]}</span>` : ''}</span>`;
      b.addEventListener('click', () => select(y, true));
      listEl.appendChild(b);
    });
    countEl.textContent = `${n} / ${yachts.length} ${t('yachts')}`;
  }
  searchEl.addEventListener('input', () => { query = searchEl.value.trim().toLowerCase(); renderList(); });

  /* ---------- legend / about ---------- */
  function renderLegend() {
    const el = document.getElementById('legend'); el.innerHTML = '';
    (H.legend || []).forEach(([zone, name]) => { const s = document.createElement('span'); s.innerHTML = `<i style="background:#${(ZONE_COLORS[zone] || 0xffffff).toString(16).padStart(6, '0')}"></i>${lang === 'he' && name.he ? name.he : name.en}`; el.appendChild(s); });
    const d = document.createElement('span'); d.innerHTML = `<i style="background:var(--red);border-radius:50%"></i>${t('tDebut')}`; el.appendChild(d);
  }
  function renderAbout() {
    const f = D.facts; const facts = document.getElementById('facts'); facts.innerHTML = '';
    const rows = lang === 'he' ? f.he : f.en;
    rows.forEach(([k, v]) => { const d = document.createElement('div'); d.innerHTML = `<dt>${k}</dt><dd>${v}</dd>`; facts.appendChild(d); });
    document.getElementById('aboutBody').innerHTML = t('about').join('') + `<p style="font-size:12.5px;color:var(--text-2)">${D.sourcesHtml}</p>`;
  }
  const about = document.getElementById('about');
  const openAbout = () => { about.hidden = false; document.getElementById('aboutClose').focus(); };
  document.getElementById('btnAbout').addEventListener('click', openAbout);
  document.getElementById('btnAbout2').addEventListener('click', openAbout);
  document.getElementById('aboutClose').addEventListener('click', () => { about.hidden = true; });
  about.addEventListener('click', e => { if (e.target === about) about.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { about.hidden = true; if (selected) select(null); } });

  /* ---------- toolbar ---------- */
  const drawer = document.getElementById('drawer');
  const btnFleet = document.getElementById('btnFleet');
  let drawerOpen = window.innerWidth > 760;
  function applyDrawer() { drawer.hidden = !drawerOpen; btnFleet.setAttribute('aria-pressed', String(drawerOpen)); }
  btnFleet.addEventListener('click', () => { drawerOpen = !drawerOpen; applyDrawer(); });
  applyDrawer();
  const btnLabels = document.getElementById('btnLabels');
  btnLabels.addEventListener('click', () => { showLabels = !showLabels; btnLabels.setAttribute('aria-pressed', String(showLabels)); });
  document.getElementById('btnNight').addEventListener('click', () => { night = !night; applyLighting(); });
  const btnFx = document.getElementById('btnFx'); btnFx.setAttribute('aria-pressed', String(fxOn));
  btnFx.addEventListener('click', () => { fxOn = !fxOn; btnFx.setAttribute('aria-pressed', String(fxOn)); water.userData.uniforms.uUseReflect.value = fxOn ? 1 : 0; });
  water.userData.uniforms.uUseReflect.value = fxOn ? 1 : 0;
  document.getElementById('btnLang').addEventListener('click', () => { lang = lang === 'he' ? 'en' : 'he'; try { localStorage.setItem('mys-lang', lang); } catch (e) { } applyLang(); });
  function applyLang() {
    document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    placeLabels.forEach(p => { if (p.el) p.el.textContent = lang === 'he' && p.he ? p.he : p.name; });
    renderViews(); renderChips(); renderList(); renderLegend(); renderAbout(); if (selected) select(selected, false);
  }
  applyLang();

  /* ---------- resize + loop ---------- */
  const dbs = new T.Vector2();
  function resize() { const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight; renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.getDrawingBufferSize(dbs); post.setSize(dbs.x, dbs.y); }
  window.addEventListener('resize', resize); resize();
  const clock = new T.Clock(); let frame = 0;
  function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    if (!reduceMotion) water.userData.uniforms.uTime.value += dt;
    // idle: slow cinematic orbit after 30 s without input
    if (!reduceMotion && performance.now() - controls.lastInput() > 30000) controls.goal.theta += 0.00045;
    controls.update(); camera.updateMatrixWorld();
    sky.userData.uniforms.uTime.value = water.userData.uniforms.uTime.value;
    // keep the shadow frustum centred where the camera looks
    sun.target.position.copy(controls.state.target); sun.position.copy(controls.state.target).add(night ? new T.Vector3(900, 260, -600) : new T.Vector3(-320, 780, 720));
    if (fxOn) {
      if ((frame & 1) === 0 || controls.state.dist < 600) water.userData.renderReflection(renderer, scene, camera, [nightGroup]);
      post.render(scene, camera, night, water.userData.uniforms.uTime.value);
    } else {
      renderer.setRenderTarget(null); renderer.render(scene, camera);
    }
    if ((frame++ & 1) === 0) updateLabels();
  }
  const loading = document.getElementById('loading');
  document.getElementById('loadbar').style.width = '100%';
  setTimeout(() => loading.classList.add('done'), 350);
  loop();

  window.MYS_APP = { select, goView, yachts, quays, controls };
})();
