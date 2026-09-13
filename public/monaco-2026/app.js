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
      fleet: 'Fleet', labels: 'Names', night: 'Night', fx: 'FX', tour: 'Tour', walk: 'Walk', sound: 'Sound', aboutBtn: 'Sources', walkHint: 'Walk: W A S D or arrows · drag to look · Shift to run · Esc to leave', timeHint: 'Time on show day', fleetTitle: 'The Fleet', search: 'Search yacht or builder…',
      loa: 'Length', beam: 'Beam', year: 'Year', type: 'Type', close: 'Close', aboutTitle: 'About this model',
      sigRole: '3D visualisation · Monaco Yacht Show 2026', sigMeta: 'Fleet, berths and beams compiled 13 Sept 2026 from the official list, shipyards, brokers and trade press', sigLink: 'accuracy notes',
      all: 'All', debut: 'Debuts', motor: 'Motor', sailing: 'Sail', explorer: 'Explorer', catamaran: 'Multihull', big: '60 m +',
      tDebut: 'World / show debut', tConfirmed: 'Official list', tReported: 'Reported', tMotor: 'Motor yacht', tSailing: 'Sailing yacht', tExplorer: 'Explorer', tCatamaran: 'Multihull',
      berth: 'Berth', est: 'est.', shownAt: 'Shown at', yachts: 'yachts', source: 'Source',
      views: { aerial: ['Aerial', 'Overview'], digue: ['Digue', 'Rainier III'], etats: ['Quai', 'des États-Unis'], antoine: ['Quai', 'Antoine 1er'], rocher: ['From', 'Le Rocher'], entrance: ['Harbour', 'entrance'] },
      about: [
        '<p>Every yacht in this model is drawn from its published length overall, beam and type, and moored where the show places it when a berth or quay was published. Berth codes follow the official scheme: D = Quai Rainier III (Digue), R = Quai Rainier 1er, E = Quai des États-Unis, C = Quai Chicane, S = Appontement Jules Soccal (the T-Central pier), H = Quai de l’Hirondelle, L = Jetée Lucciana, J = Quai Jarlan; numbered berths are placed in numeric order along their quay. Where no berth was published the yacht is placed on a quay of matching size following the show’s customary layout, largest hulls outboard on the Digue and Quai Rainier III.</p>',
        '<p>Quays, breakwaters and the surrounding buildings are traced from OpenStreetMap geometry of Port Hercule. Hull and superstructure shapes are parametric models driven by each yacht’s researched appearance (hull and superstructure colour, bow type, deck count, rig, helipad, pool, expedition deck) where the press or shipyard published it; they are not shipyard drawings. Terrain comes from the Mapzen / AWS terrarium elevation tiles (SRTM and EU-DEM, 25–30 m source resolution), flattened at the waterfront; Le Rocher’s plateau is restored to its published height inside the Monaco-Ville district boundary; the tallest Monte-Carlo towers carry their real heights.</p>',
        '<p>The fleet list combines the official MYS 2026 superyacht list with shipyard, broker and trade-press announcements as of 13 September 2026. Confidence is marked on each card: <b>Official list</b> or <b>Reported</b>. About 20 further yachts, mostly brokerage boats under 55 m, had not been named publicly at compile time; 28 published berth codes are used and 6 yachts lie at anchor in the bay.</p>',
      ],
    },
    he: {
      eyebrow: 'המהדורה ה-35 · נמל הרקולס · 23–26 בספטמבר 2026', h1: 'Monaco Yacht Show 2026', h1sub: 'הדמיה תלת-ממדית של הצי בנמל הרקולס',
      sub: 'גררו לסיבוב · גלגלו לזום · לחצן ימני או שתי אצבעות להזזה · לחצו על יאכטה',
      fleet: 'הצי', labels: 'שמות', night: 'לילה', fx: 'אפקטים', tour: 'סיור', walk: 'הליכה', sound: 'צליל', aboutBtn: 'מקורות', walkHint: 'הליכה: W A S D או חצים · גרירה להסתכל · Shift לריצה · Esc ליציאה', timeHint: 'שעה ביום התערוכה', fleetTitle: 'הצי', search: 'חיפוש יאכטה או מספנה…',
      loa: 'אורך', beam: 'רוחב', year: 'שנה', type: 'סוג', close: 'סגירה', aboutTitle: 'על ההדמיה',
      sigRole: 'הדמיה תלת-ממדית · תערוכת היאכטות מונקו 2026', sigMeta: 'הצי, העגינות והמידות נאספו ב-13.9.2026 מהרשימה הרשמית, מספנות, ברוקרים ועיתונות המקצוע', sigLink: 'הערות דיוק',
      all: 'הכול', debut: 'בכורות', motor: 'מנוע', sailing: 'מפרש', explorer: 'אקספלורר', catamaran: 'רב-גופית', big: '60 מ׳ +',
      tDebut: 'בכורה עולמית / בתערוכה', tConfirmed: 'ברשימה הרשמית', tReported: 'דווח', tMotor: 'יאכטת מנוע', tSailing: 'יאכטת מפרש', tExplorer: 'אקספלורר', tCatamaran: 'רב-גופית',
      berth: 'עגינה', est: 'משוער', shownAt: 'מוצגת ב', yachts: 'יאכטות', source: 'מקור',
      views: { aerial: ['מבט על', 'הנמל כולו'], digue: ['הדיג', 'רנייה השלישי'], etats: ['רציף', 'ארצות הברית'], antoine: ['רציף', 'אנטואן הראשון'], rocher: ['מבט', 'מהסלע'], entrance: ['פתח', 'הנמל'] },
      about: [
        '<p>כל יאכטה במודל בנויה לפי האורך הכולל, הרוחב והסוג שפורסמו לגביה, ומעוגנת במקום שבו התערוכה מציבה אותה כאשר פורסם רציף או קוד עגינה. קודי העגינה לפי הסכמה הרשמית: D = רציף רנייה השלישי (הדיג), R = רציף רנייה הראשון, E = רציף ארצות הברית, C = רציף השיקאן, S = מזח ז׳ול סוקאל (מזח ה-T המרכזי), H = רציף לירונדל, L = מזח לוצ׳יאנה, J = רציף ז׳רלן; עגינות ממוספרות מוצבות לפי הסדר המספרי לאורך הרציף. כשלא פורסם מיקום, היאכטה הוצבה ברציף התואם לגודלה לפי הפריסה המקובלת של התערוכה: הגופים הגדולים ביותר על הדיג ועל רציף רנייה השלישי.</p>',
        '<p>הרציפים, שוברי הגלים והבניינים שמסביב משורטטים מגיאומטריית OpenStreetMap של נמל הרקולס. צורות הגוף והמבנה העילי הן מודלים פרמטריים המונעים מהמראה האמיתי שנחקר לכל יאכטה (צבע גוף ומבנה עילי, סוג חרטום, מספר סיפונים, ריג, מנחת מסוקים, בריכה, סיפון משלחות) היכן שפורסם; אלה אינם שרטוטי מספנה. הטופוגרפיה מגיעה מאריחי גובה אמיתיים (Mapzen / AWS terrarium, מקור SRTM ו-EU-DEM ברזולוציה של 25–30 מ׳), מיושרת בקו המים; רמת הסלע הוחזרה לגובהה המפורסם בתוך גבול רובע מונקו-ויל; המגדלים הגבוהים של מונטה קרלו בגובהם האמיתי.</p>',
        '<p>רשימת הצי משלבת את הרשימה הרשמית של MYS 2026 עם הודעות מספנות, ברוקרים ועיתונות מקצועית נכון ל-13 בספטמבר 2026. רמת הוודאות מסומנת בכל כרטיס: <b>ברשימה הרשמית</b> או <b>דווח</b>. כ-20 יאכטות נוספות, רובן סירות ברוקראז׳ מתחת ל-55 מ׳, טרם פורסמו בשמן; 28 קודי עגינה שפורסמו בשימוש ו-6 יאכטות בעגינה במפרץ.</p>',
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
  // real terrain: Mapzen terrarium heightmap (SRTM / EU-DEM source) decoded from terrain.js; spot-height IDW as fallback
  const spots = H.spots.map(p => ({ x: E.ll(p[0], p[1]).x, z: E.ll(p[0], p[1]).z, h: p[2] }));
  for (let i = 0; i < H.coastCount; i += 3) { const c = landXZ[i]; spots.push({ x: c.x, z: c.z, h: 0 }); }
  function idw(x, z) {
    let num = 0, den = 0;
    for (const s of spots) { const d2 = (x - s.x) * (x - s.x) + (z - s.z) * (z - s.z) + 400; const w = 1 / (d2 * d2); num += w * s.h; den += w; }
    return num / den;
  }
  const DEM = (function () {
    const d = window.MYS_DEM; if (!d) return null;
    const bin = atob(d.data); const buf = new ArrayBuffer(bin.length); const u8 = new Uint8Array(buf); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return { n: d.n, size: d.size, a: new Int16Array(buf), step: d.size / (d.n - 1) };
  })();
  function demAt(x, z) {
    const gx = (x + DEM.size / 2) / DEM.step, gz = (z + DEM.size / 2) / DEM.step;
    const i0 = E.clamp(Math.floor(gx), 0, DEM.n - 2), j0 = E.clamp(Math.floor(gz), 0, DEM.n - 2); const fx = E.clamp(gx - i0, 0, 1), fz = E.clamp(gz - j0, 0, 1);
    const a = DEM.a[j0 * DEM.n + i0], b = DEM.a[j0 * DEM.n + i0 + 1], c = DEM.a[(j0 + 1) * DEM.n + i0], d = DEM.a[(j0 + 1) * DEM.n + i0 + 1];
    return ((a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz) / 10;
  }
  function elevation(x, z) {
    if (!pointInPoly(x, z, landXZ)) return -2.5;
    const dCoast = distToPoly(x, z, landXZ);
    let h = DEM ? Math.max(0, demAt(x, z)) : Math.max(0, idw(x, z));
    h = E.lerp(Math.min(h, 1.2), h, E.smooth(14, 90, dCoast));   // quays, promenades and reclaimed land stay flat at the waterfront
    // Le Rocher: the 30 m DEM smooths the plateau; restore its published height along the ridge, bounded by the Monaco-Ville ring (cliffs)
    if (pointInPoly(x, z, rockXZ)) {
      const dx = rockRidge.b.x - rockRidge.a.x, dz = rockRidge.b.z - rockRidge.a.z;
      const u = E.clamp(((x - rockRidge.a.x) * dx + (z - rockRidge.a.z) * dz) / (dx * dx + dz * dz), 0, 1);
      const top = u < 0.7 ? E.lerp(62, 52, u / 0.7) : E.lerp(52, 21, (u - 0.7) / 0.3);
      const dEdge = distToPoly(x, z, rockXZ);
      h = Math.max(h, top * E.smooth(18, 62, dEdge));
    }
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
  const stone = FX.makeGroundMaterial();
  const tentGeoms = [];
  const landGeoms = [];
  landGeoms.push(E.paint(E.extrudeUp(E.planShape(landXZ), 3.7, -1.5), 0xd8cfbd));
  (H.piers || []).forEach(p => { const xz = E.llArr(p.pts); if (xz.length < 3) return; landGeoms.push(E.paint(E.extrudeUp(E.planShape(xz), p.height + 1.5, -1.5), p.color || 0xd8cfbd)); });
  (H.structures || []).forEach(s => { // boxes: digue deck, jetties, tents, pavilions
    const c = E.ll(s.lat, s.lon);
    const g = new T.BoxGeometry(s.length, s.height, s.width);
    g.rotateY(-s.bearing * Math.PI / 180 + Math.PI / 2); g.translate(c.x, (s.y || 0) + s.height / 2, c.z);
    (s.color === 0xf4f2ee ? tentGeoms : landGeoms).push(E.paint(g, s.color || 0xd8cfbd));
  });
  const land = new T.Mesh(E.mergeGeoms(landGeoms, true), stone); land.castShadow = true; land.receiveShadow = true; scene.add(land);
  if (tentGeoms.length) { const tents = new T.Mesh(E.mergeGeoms(tentGeoms), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })); tents.castShadow = true; tents.receiveShadow = true; scene.add(tents); }

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
  (function buildBollards() {
    const pts = [];
    H.quays.forEach(q => { const xz = E.llArr(q.pts); for (let i = 0; i < xz.length - 1; i++) { const a = xz[i], b = xz[i + 1]; const len = Math.hypot(b.x - a.x, b.z - a.z); for (let d = 6; d < len; d += 12) { const t = d / len; pts.push([a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t]); } } });
    if (!pts.length) return;
    const geo = new T.CylinderGeometry(0.28, 0.34, 0.9, 8); geo.translate(0, 0.45, 0);
    const im = new T.InstancedMesh(geo, new T.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.6, metalness: 0.4 }), pts.length);
    const o = new T.Object3D(); pts.forEach((p, i) => { o.position.set(p[0], 2.2, p[1]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    im.castShadow = true; scene.add(im);
  })();

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
    const hi = E.buildYacht(y), lo = E.buildYacht(y, true);
    const g = new T.LOD(); g.addLevel(hi, 0); g.addLevel(lo, isMobile ? 420 : 760);
    g.userData = { spec: y, meshes: hi.userData.meshes.concat(lo.userData.meshes) };
    g.position.set(spot.x, 0, spot.z); g.rotation.y = spot.heading;
    if (spot.quay.mode === 'stern') { // stern lines to the quay bollards
      const bw = (y.beam || E.estBeam(y.loa, y.type)) / 2;
      const fbH0 = y.type === 'sailing' ? y.loa * 0.022 + 0.9 : y.loa * 0.026 + 1.25;
      const pts = [];
      for (const side of [-1, 1]) { pts.push(new T.Vector3(-y.loa / 2 + 0.5, fbH0 + 0.4, side * bw * 0.85)); pts.push(new T.Vector3(-y.loa / 2 - 2.6, 2.1, side * (bw * 0.85 + 2.2))); }
      const lines = new T.LineSegments(new T.BufferGeometry().setFromPoints(pts), E.MAT.rope); g.add(lines);
    }
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
  /* ---------- time of day: real sun path over Monaco on show day (23 Sept 2026, CEST) ---------- */
  let hour = 15.0, night = false;
  const LAT = 43.7355 * Math.PI / 180, DECL = -0.4 * Math.PI / 180, SOLAR_NOON = 13.38; // equinox declination, local solar noon (UTC+2, lon 7.43 E, EoT +7 min)
  function sunVector(h) {
    const H = (h - SOLAR_NOON) * 15 * Math.PI / 180;
    const alt = Math.asin(Math.sin(LAT) * Math.sin(DECL) + Math.cos(LAT) * Math.cos(DECL) * Math.cos(H));
    const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT) - Math.tan(DECL) * Math.cos(LAT)); // from south, +west
    return { alt, dir: new T.Vector3(-Math.sin(az) * Math.cos(alt), Math.sin(alt), Math.cos(az) * Math.cos(alt)) };
  }
  const C = (hex) => new T.Color(hex);
  const PAL = { // day, golden, dusk, night
    top: [C(0x2f6fb0), C(0x4a86c4), C(0x2a4d86), C(0x050b18)], hor: [C(0xdbe8f1), C(0xf8d09a), C(0xe08a55), C(0x1b2a45)],
    deep: [C(0x0a3f5c), C(0x114a66), C(0x0f3552), C(0x03101e)], shallow: [C(0x1f7f9c), C(0x2f8aa0), C(0x245a78), C(0x0a2438)], wsky: [C(0xa9d1e6), C(0xf4d2a8), C(0xd0906a), C(0x223a5a)],
    fog: [C(0xd7e6f0), C(0xf3d9bf), C(0xb9866e), C(0x0b1524)], sun: [C(0xfff1d8), C(0xffc987), C(0xff9a5a), C(0xb9c8ff)],
  };
  function mix4(arr, k) { // k in [0,3]
    const i = Math.min(2, Math.floor(k)), t = k - i; return arr[i].clone().lerp(arr[i + 1], t);
  }
  let sunOffset = new T.Vector3(-320, 780, 720);
  function applyLighting() {
    const wu = water.userData.uniforms, su = sky.userData.uniforms;
    const { alt, dir } = sunVector(hour); const altD = alt * 180 / Math.PI;
    // palette key: day (alt>14) -> golden (alt 5) -> dusk (alt -2) -> night (alt < -9)
    const k = altD > 14 ? 0 : altD > 5 ? (14 - altD) / 9 : altD > -2 ? 1 + (5 - altD) / 7 : altD > -9 ? 2 + (-2 - altD) / 7 : 3;
    night = altD < -3;
    const dayF = E.smooth(-3, 8, altD);
    sun.intensity = 0.35 + 2.1 * dayF; sun.color.copy(mix4(PAL.sun, k)); hemi.intensity = 0.3 + 0.55 * E.smooth(-6, 3, altD);
    su.uTop.value.copy(mix4(PAL.top, k)); su.uHorizon.value.copy(mix4(PAL.hor, k)); su.uNight.value = 1 - E.smooth(-9, -2, altD);
    wu.uDeep.value.copy(mix4(PAL.deep, k)); wu.uShallow.value.copy(mix4(PAL.shallow, k)); wu.uSky.value.copy(mix4(PAL.wsky, k)); wu.uNight.value = su.uNight.value;
    scene.fog.color.copy(mix4(PAL.fog, k)); renderer.toneMappingExposure = 0.92 + 0.13 * E.smooth(-6, 3, altD);
    // light direction: real sun above ~4 deg; below that a moon from the east-north-east keeps shadows readable
    const lightDir = altD > 4 ? dir.clone() : new T.Vector3(0.6, 0.35, -0.55).normalize().lerp(dir, E.clamp((altD + 2) / 6, 0, 1)).normalize();
    sunOffset.copy(lightDir).multiplyScalar(1100);
    wu.uSun.value.copy(altD > -1 ? dir : lightDir); su.uSun.value.copy(dir);
    wu.fogColor.value.copy(scene.fog.color); facadeMat.emissiveIntensity = 0.6 * (1 - E.smooth(-4, 3, altD));
    nightGroup.visible = altD < 1; updateEnv();
    document.getElementById('btnNight').setAttribute('aria-pressed', String(night));
    const hh = Math.floor(hour), mm = Math.round((hour - hh) * 60); document.getElementById('timeLabel').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const sl = document.getElementById('timeSlider'); if (+sl.value !== hour) sl.value = hour;
  }
  applyLighting();
  document.getElementById('timeSlider').addEventListener('input', e => { hour = +e.target.value; applyLighting(); });

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

  /* ---------- cinematic tour ---------- */
  const TOUR_EXTRA = { soccal: { lat: 43.7348, lon: 7.4238, theta: 1.9, phi: 1.2, dist: 230 }, hirondelle: { lat: 43.7365, lon: 7.4270, theta: -0.6, phi: 1.2, dist: 230 }, chicane: { lat: 43.7369, lon: 7.4258, theta: 0.2, phi: 1.18, dist: 200 } };
  const TOUR = [['aerial', 5], ['entrance', 7], ['digue', 8], ['hirondelle', 7], ['chicane', 7], ['etats', 7], ['soccal', 7], ['antoine', 7], ['rocher', 8], ['aerial', 6]];
  let tour = null; // {t, start}
  function viewOf(k) { return VIEWS[k] || TOUR_EXTRA[k]; }
  function lerpAngle(a, b, t) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; }
  function tourStep(dt) {
    tour.t += dt; let acc = 0;
    for (let i = 0; i < TOUR.length - 1; i++) {
      const [ka, da] = TOUR[i]; const kb = TOUR[i + 1][0];
      if (tour.t < acc + da) {
        const u = E.smooth(0, 1, (tour.t - acc) / da); const a = viewOf(ka), b = viewOf(kb);
        const ca = E.ll(a.lat, a.lon), cb = E.ll(b.lat, b.lon);
        controls.goal.target.set(E.lerp(ca.x, cb.x, u), E.lerp(a.y || 0, b.y || 0, u), E.lerp(ca.z, cb.z, u));
        controls.goal.theta = lerpAngle(a.theta, b.theta, u); controls.goal.phi = E.lerp(a.phi, b.phi, u); controls.goal.dist = E.lerp(a.dist, b.dist, u);
        return;
      }
      acc += da;
    }
    stopTour();
  }
  const btnTour = document.getElementById('btnTour');
  function startTour() { if (walk.on) stopWalk(); tour = { t: 0 }; controls.setDamp(0.06); btnTour.setAttribute('aria-pressed', 'true'); select(null); }
  function stopTour() { tour = null; controls.setDamp(0.12); btnTour.setAttribute('aria-pressed', 'false'); }
  btnTour.addEventListener('click', () => tour ? stopTour() : startTour());
  canvas.addEventListener('pointerdown', () => { if (tour) stopTour(); });
  canvas.addEventListener('wheel', () => { if (tour) stopTour(); }, { passive: true });

  /* ---------- shuttle boats (Only Yacht service between the show pontoons) ---------- */
  const shuttles = [];
  (function buildShuttles() {
    const routes = [
      [[43.7363, 7.4262], [43.7356, 7.4254], [43.7346, 7.4262], [43.7350, 7.4250], [43.7356, 7.4254]],            // Chicane – Hirondelle – Antoine – Jules Soccal
      [[43.7359, 7.4271], [43.7352, 7.4280], [43.7365, 7.4291], [43.7369, 7.4284], [43.7359, 7.4271]],            // Hirondelle – Rainier 1er – Lucciana
      [[43.7346, 7.4262], [43.7351, 7.4274], [43.7358, 7.4285], [43.7351, 7.4274]],                                // Antoine – Rainier 1er – entrance
    ];
    routes.forEach((r, i) => {
      const pts = r.map(p => { const c = E.ll(p[0], p[1]); return new T.Vector3(c.x, 0, c.z); });
      const curve = new T.CatmullRomCurve3(pts, true, 'centripetal', 0.5);
      const boat = E.buildTender(9 + i); boat.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
      const wake = new T.Mesh(new T.PlaneGeometry(18, 5), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }));
      wake.rotation.x = -Math.PI / 2; wake.position.set(-11, 0.1, 0); boat.add(wake);
      scene.add(boat);
      shuttles.push({ boat, curve, t: i / routes.length, speed: 3.2 / curve.getLength() });
    });
  })();
  function updateShuttles(dt) {
    if (reduceMotion) return;
    shuttles.forEach(s => {
      s.t = (s.t + dt * s.speed) % 1;
      const p = s.curve.getPointAt(s.t), tg = s.curve.getTangentAt(s.t);
      s.boat.position.set(p.x, 0.05 + Math.sin(performance.now() * 0.003 + s.t * 40) * 0.08, p.z);
      s.boat.rotation.y = Math.atan2(-tg.z, tg.x);
    });
  }

  /* ---------- show flags along the quays ---------- */
  (function buildFlags() {
    const poles = []; const flagPos = [], flagCol = [], flagPhase = [], flagUv = []; const idx = [];
    const colours = [new T.Color(0x1e2b45), new T.Color(0xf3f1ec), new T.Color(0xc8a24a)];
    quays.filter(q => /etats|chicane|louis|digue|hirondelle|antoine|soccal/.test(q.zone)).forEach(q => q.segs.forEach(sg => {
      for (let d = 5; d < sg.len; d += 11) {
        const x = sg.a.x + sg.d.x * d - sg.n.x * 1.4, z = sg.a.z + sg.d.z * d - sg.n.z * 1.4; const y0 = q.zone === 'digue' ? 3.95 : 2.2;
        poles.push([x, y0, z]);
        const c = colours[poles.length % 3]; const ph = Math.random() * 6.28; const base = flagPos.length / 3;
        // flag: 2x2 quad strip, hoisted along -n direction, top at y0+6
        const nx = -sg.d.x, nz = -sg.d.z; // flag streams along the quay direction
        for (let j = 0; j <= 2; j++) for (let i = 0; i <= 3; i++) { const u = i / 3, v = j / 2; flagPos.push(x + nx * u * 1.6, y0 + 6 - v * 1.0, z + nz * u * 1.6); flagCol.push(c.r, c.g, c.b); flagPhase.push(ph); flagUv.push(u, v); }
        for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) { const a = base + j * 4 + i; idx.push(a, a + 1, a + 4, a + 1, a + 5, a + 4); }
      }
    }));
    if (!poles.length) return;
    const pg = new T.CylinderGeometry(0.05, 0.07, 6, 6); pg.translate(0, 3, 0);
    const pm = new T.InstancedMesh(pg, new T.MeshStandardMaterial({ color: 0xd9dde2, metalness: 0.5, roughness: 0.4 }), poles.length);
    const o = new T.Object3D(); poles.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); }); scene.add(pm);
    const fg = new T.BufferGeometry();
    fg.setAttribute('position', new T.Float32BufferAttribute(flagPos, 3)); fg.setAttribute('color', new T.Float32BufferAttribute(flagCol, 3)); fg.setAttribute('phase', new T.Float32BufferAttribute(flagPhase, 1)); fg.setAttribute('uv', new T.Float32BufferAttribute(flagUv, 2)); fg.setIndex(idx);
    const fm = new T.ShaderMaterial({ side: T.DoubleSide, uniforms: { uTime: { value: 0 } }, vertexColors: true,
      vertexShader: `uniform float uTime; attribute float phase; varying vec3 vC; varying float vU; void main(){ vC = color; vU = uv.x; vec3 p = position; float w = sin(uTime*4.0 + phase + uv.x*6.0) * 0.18 * uv.x; p.y += w * 0.5; p.x += w * 0.3; p.z += w * 0.3; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
      fragmentShader: `varying vec3 vC; varying float vU;
void main(){
  gl_FragColor = vec4(vC * (0.85 + 0.15*sin(vU*6.0)), 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}` });
    const flags = new T.Mesh(fg, fm); scene.add(flags); flags.userData.mat = fm; window.__flags = fm;
  })();

  /* ---------- tenders & toys display on the Jetée Lucciana deck ---------- */
  (function buildTenderDisplay() {
    const a = E.ll(43.737255, 7.429276), b = E.ll(43.736330, 7.429798);
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz); const ux = dx / len, uz = dz / len; const nx = -uz, nz = ux;
    let k = 0;
    for (let d = 10; d < len - 6; d += 9) for (const side of [-1, 1]) {
      const L = 7 + ((k * 37) % 11) * 0.6; k++;
      const t = E.buildTender(L); const x = a.x + ux * d + nx * side * 7.5, z = a.z + uz * d + nz * side * 7.5;
      t.position.set(x, 1.9 + Math.min(1.2, L * 0.05 + 0.6), z); t.rotation.y = Math.atan2(-uz, ux) + Math.PI / 2 * side; t.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(t);
    }
  })();

  /* ---------- visitors on the quays ---------- */
  (function buildCrowd() {
    const pts = []; let seed = 3;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const want = isMobile ? 500 : 1700;
    quays.forEach(q => q.segs.forEach(sg => {
      const yq = q.zone === 'digue' ? 3.95 : q.zone === 'cruise' ? 3.95 : 2.2;
      for (let d = 2; d < sg.len; d += 2.4) {
        if (rnd() < 0.45) continue;
        const off = 2.5 + rnd() * 5.5; const along = d + (rnd() - 0.5) * 1.5;
        pts.push({ x: sg.a.x + sg.d.x * along - sg.n.x * off, z: sg.a.z + sg.d.z * along - sg.n.z * off, y: yq, r: rnd() * 6.28 });
      }
    }));
    // tents & pavilions forecourts
    (H.structures || []).forEach(st => { if (!/tent|Pavilion|Gallery|Lounge/.test(st.name)) return; const c = E.ll(st.lat, st.lon); for (let i = 0; i < 40; i++) { const a = rnd() * 6.28, r = st.width * 0.6 + rnd() * 10; pts.push({ x: c.x + Math.cos(a) * (st.length / 2 + 4) * (rnd() - 0.5) * 2 + Math.cos(a) * 2, z: c.z + Math.sin(a) * r, y: 2.2, r: rnd() * 6.28 }); } });
    const sel = pts.slice(0, want);
    const body = new T.CapsuleGeometry(0.2, 0.95, 3, 6); body.translate(0, 0.9, 0);
    const head = new T.SphereGeometry(0.13, 6, 5); head.translate(0, 1.62, 0);
    const mb = new T.InstancedMesh(body, new T.MeshStandardMaterial({ roughness: 0.9 }), sel.length);
    const mh = new T.InstancedMesh(head, new T.MeshStandardMaterial({ color: 0xd9b99b, roughness: 0.9 }), sel.length);
    const o = new T.Object3D(); const col = new T.Color();
    const palette = [0xf2f2f0, 0x1f2a3a, 0x9aa3ad, 0x223a5e, 0xd8c9b0, 0x2f2f33, 0x7a5c3a, 0xc9d3dc, 0x5a6b7c, 0xe8e0d0];
    sel.forEach((p, i) => { o.position.set(p.x, p.y, p.z); o.rotation.set(0, p.r, 0); const sc = 0.92 + rnd() * 0.16; o.scale.set(sc, sc, sc); o.updateMatrix(); mb.setMatrixAt(i, o.matrix); mh.setMatrixAt(i, o.matrix); col.set(palette[Math.floor(rnd() * palette.length)]); mb.setColorAt(i, col); });
    mb.castShadow = true; scene.add(mb); scene.add(mh);
  })();

  /* ---------- minimap ---------- */
  const mm = document.getElementById('minimap');
  const mmBase = document.createElement('canvas');
  const MM = { w: mm ? mm.width : 220, h: mm ? mm.height : 150, x0: -600, x1: 600, z0: -400, z1: 400 };
  const mmX = x => (x - MM.x0) / (MM.x1 - MM.x0) * MM.w, mmZ = z => (z - MM.z0) / (MM.z1 - MM.z0) * MM.h;
  (function drawMinimapBase() {
    if (!mm) return;
    mmBase.width = MM.w; mmBase.height = MM.h; const x = mmBase.getContext('2d');
    x.fillStyle = '#1f6f8f'; x.fillRect(0, 0, MM.w, MM.h);
    x.fillStyle = '#d9d0c0'; x.beginPath(); landXZ.forEach((p, i) => i ? x.lineTo(mmX(p.x), mmZ(p.z)) : x.moveTo(mmX(p.x), mmZ(p.z))); x.closePath(); x.fill();
    (H.piers || []).forEach(pp => { const xz = E.llArr(pp.pts); x.beginPath(); xz.forEach((p, i) => i ? x.lineTo(mmX(p.x), mmZ(p.z)) : x.moveTo(mmX(p.x), mmZ(p.z))); x.closePath(); x.fill(); });
    x.lineWidth = 2.5; x.lineCap = 'round';
    quays.forEach(q => { x.strokeStyle = '#' + (ZONE_COLORS[q.zone] || 0xffffff).toString(16).padStart(6, '0'); x.beginPath(); q.segs.forEach((sg, i) => { if (!i) x.moveTo(mmX(sg.a.x), mmZ(sg.a.z)); x.lineTo(mmX(sg.b.x), mmZ(sg.b.z)); }); x.stroke(); });
  })();
  function drawMinimap() {
    if (!mm) return; const x = mm.getContext('2d');
    x.drawImage(mmBase, 0, 0);
    yachts.forEach(y => { if (!y.obj) return; const p = y.obj.position; x.fillStyle = y === selected ? '#ffe9b0' : y.debut ? '#e0405a' : '#ffffff'; const r = y === selected ? 3 : Math.max(1.2, y.loa / 40); x.beginPath(); x.arc(mmX(p.x), mmZ(p.z), r, 0, 6.283); x.fill(); });
    const c = camera.position, tg = controls.state.target;
    x.strokeStyle = 'rgba(255,233,176,0.9)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(mmX(c.x), mmZ(c.z)); x.lineTo(mmX(tg.x), mmZ(tg.z)); x.stroke();
    x.fillStyle = '#ffe9b0'; x.beginPath(); x.arc(mmX(c.x), mmZ(c.z), 3.2, 0, 6.283); x.fill();
  }
  if (mm) mm.addEventListener('click', ev => { const r = mm.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width * MM.w, pz = (ev.clientY - r.top) / r.height * MM.h; const wx = MM.x0 + px / MM.w * (MM.x1 - MM.x0), wz = MM.z0 + pz / MM.h * (MM.z1 - MM.z0); if (tour) stopTour(); controls.flyTo(new T.Vector3(wx, 0, wz), undefined, undefined, Math.min(controls.goal.dist, 420)); });

  /* ---------- walk mode: first person on the show quays ---------- */
  const walk = { on: false, x: 0, z: 0, yaw: 0, pitch: -0.05, bob: 0, keys: {}, joy: { x: 0, y: 0 }, look: null };
  const btnWalk = document.getElementById('btnWalk');
  const quayPolys = quays.map(q => ({ q, segs: q.segs }));
  function nearestQuay(x, z) {
    let best = { d: 1e9, q: null, px: x, pz: z };
    quayPolys.forEach(({ q, segs }) => segs.forEach(sg => { const dx = sg.b.x - sg.a.x, dz = sg.b.z - sg.a.z; const l2 = dx * dx + dz * dz || 1; const u = E.clamp(((x - sg.a.x) * dx + (z - sg.a.z) * dz) / l2, 0, 1); const px = sg.a.x + u * dx, pz = sg.a.z + u * dz; const d = Math.hypot(x - px, z - pz); if (d < best.d) best = { d, q, px, pz, n: sg.n }; }));
    return best;
  }
  function walkGround(x, z) { const nq = nearestQuay(x, z); const deck = nq.q && /digue|cruise/.test(nq.q.zone) && nq.d < 30 ? 3.95 : 2.2; return Math.max(deck, elevation(x, z) - 0.3); }
  function walkAllowed(x, z) { if (!pointInPoly(x, z, landXZ)) return false; const nq = nearestQuay(x, z); return nq.d < 70; }
  function startWalk() {
    if (tour) stopTour();
    const t = controls.state.target; const nq = nearestQuay(t.x, t.z);
    // stand on the quay 4 m inland from the nearest quay edge
    walk.x = nq.px - nq.n.x * 4; walk.z = nq.pz - nq.n.z * 4;
    if (!walkAllowed(walk.x, walk.z)) { const c = E.ll(43.7370, 7.4240); const q2 = nearestQuay(c.x, c.z); walk.x = q2.px - q2.n.x * 4; walk.z = q2.pz - q2.n.z * 4; }
    walk.yaw = Math.atan2(nq.n.x, nq.n.z); walk.pitch = -0.04; walk.on = true; controls.state.enabled = false;
    btnWalk.setAttribute('aria-pressed', 'true'); document.getElementById('joystick').hidden = !('ontouchstart' in window); document.getElementById('walkHint').hidden = false;
    setTimeout(() => { document.getElementById('walkHint').hidden = true; }, 6000);
  }
  function stopWalk() {
    walk.on = false; controls.state.enabled = true; btnWalk.setAttribute('aria-pressed', 'false'); document.getElementById('joystick').hidden = true; document.getElementById('walkHint').hidden = true;
    controls.goal.target.set(walk.x, 2, walk.z); controls.goal.dist = 120; controls.goal.phi = 1.15; controls.goal.theta = walk.yaw + Math.PI; controls.snap();
  }
  btnWalk.addEventListener('click', () => walk.on ? stopWalk() : startWalk());
  window.addEventListener('keydown', e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; walk.keys[e.code] = true; if (walk.on && e.code === 'Escape') stopWalk(); });
  window.addEventListener('keyup', e => { walk.keys[e.code] = false; });
  canvas.addEventListener('pointerdown', e => { if (!walk.on) return; walk.look = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointermove', e => { if (!walk.on || !walk.look || walk.look.id !== e.pointerId) return; const dx = e.clientX - walk.look.x, dy = e.clientY - walk.look.y; walk.look.x = e.clientX; walk.look.y = e.clientY; walk.yaw -= dx * 0.0035; walk.pitch = E.clamp(walk.pitch - dy * 0.003, -1.2, 1.2); });
  const endLook = e => { if (walk.look && walk.look.id === e.pointerId) walk.look = null; };
  canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook);
  // touch joystick
  (function joystick() {
    const el = document.getElementById('joystick'), knob = el.querySelector('.knob'); let id = null, cx = 0, cy = 0;
    el.addEventListener('pointerdown', e => { id = e.pointerId; const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; el.setPointerCapture(id); });
    el.addEventListener('pointermove', e => { if (e.pointerId !== id) return; const dx = E.clamp((e.clientX - cx) / 40, -1, 1), dy = E.clamp((e.clientY - cy) / 40, -1, 1); walk.joy.x = dx; walk.joy.y = -dy; knob.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`; });
    const up = e => { if (e.pointerId !== id) return; id = null; walk.joy.x = walk.joy.y = 0; knob.style.transform = ''; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  })();
  function walkStep(dt) {
    const k = walk.keys; let fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), side = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    fwd += walk.joy.y; side += walk.joy.x;
    const run = k.ShiftLeft || k.ShiftRight ? 2 : 1; const sp = 2.4 * run * dt;
    const fx = Math.sin(walk.yaw), fz = Math.cos(walk.yaw); // forward vector (yaw 0 = +z)
    const nx = walk.x + (fx * fwd + fz * side) * sp, nz = walk.z + (fz * fwd - fx * side) * sp;
    if (walkAllowed(nx, nz)) { walk.x = nx; walk.z = nz; } else if (walkAllowed(nx, walk.z)) walk.x = nx; else if (walkAllowed(walk.x, nz)) walk.z = nz;
    const moving = Math.abs(fwd) + Math.abs(side) > 0.05; walk.bob += (moving ? 7 : 0) * dt;
    const gy = walkGround(walk.x, walk.z) + 1.68 + (moving ? Math.sin(walk.bob) * 0.035 : 0);
    camera.position.set(walk.x, gy, walk.z);
    camera.rotation.set(0, 0, 0, 'YXZ'); camera.rotation.y = walk.yaw + Math.PI; camera.rotation.x = walk.pitch;
    controls.state.target.set(walk.x + fx * 30, gy, walk.z + fz * 30); controls.goal.target.copy(controls.state.target); controls.state.dist = 60;
  }

  /* ---------- ambient sound (procedural: surf, gulls, crowd) ---------- */
  const snd = { ctx: null, on: false, master: null };
  function startSound() {
    if (!snd.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const ctx = snd.ctx = new AC();
      const master = snd.master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate); const d = noiseBuf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12; }
      // surf: pink noise through a low-pass, swelling slowly
      const surf = ctx.createBufferSource(); surf.buffer = noiseBuf; surf.loop = true; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; const sg = ctx.createGain(); sg.gain.value = 0.5;
      surf.connect(lp); lp.connect(sg); sg.connect(master); surf.start();
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lfoG = ctx.createGain(); lfoG.gain.value = 0.28; lfo.connect(lfoG); lfoG.connect(sg.gain); lfo.start();
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.053; const lfo2G = ctx.createGain(); lfo2G.gain.value = 0.16; lfo2.connect(lfo2G); lfo2G.connect(sg.gain); lfo2.start();
      // crowd murmur: band-passed noise
      const crowd = ctx.createBufferSource(); crowd.buffer = noiseBuf; crowd.loop = true; crowd.playbackRate.value = 0.7; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.7; const cg = ctx.createGain(); cg.gain.value = 0.12; crowd.connect(bp); bp.connect(cg); cg.connect(master); crowd.start();
      snd.crowdGain = cg; snd.surfGain = sg;
      // gulls
      const gull = () => { if (!snd.on) return; const n = 2 + Math.floor(Math.random() * 3); const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null; const out = pan || ctx.createGain(); if (pan) pan.pan.value = Math.random() * 2 - 1; out.connect(master);
        for (let i = 0; i < n; i++) { const t0 = ctx.currentTime + i * 0.42; const o = ctx.createOscillator(); o.type = 'sawtooth'; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600; const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.06, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.38);
          o.frequency.setValueAtTime(1500 + Math.random() * 300, t0); o.frequency.exponentialRampToValueAtTime(900, t0 + 0.3); o.connect(f); f.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 0.4); }
        setTimeout(gull, 5000 + Math.random() * 12000); };
      setTimeout(gull, 2500);
    }
    snd.ctx.resume(); snd.on = true; snd.master.gain.setTargetAtTime(0.9, snd.ctx.currentTime, 0.8);
  }
  function stopSound() { if (!snd.ctx) return; snd.on = false; snd.master.gain.setTargetAtTime(0, snd.ctx.currentTime, 0.4); }
  const btnSound = document.getElementById('btnSound');
  btnSound.addEventListener('click', () => { if (snd.on) { stopSound(); btnSound.setAttribute('aria-pressed', 'false'); } else { startSound(); btnSound.setAttribute('aria-pressed', 'true'); } });
  function updateSound() { if (!snd.on || !snd.ctx) return; const h = camera.position.y; const near = E.clamp(1.3 - h / 400, 0.25, 1.1); snd.surfGain.gain.setTargetAtTime(0.5 * near, snd.ctx.currentTime, 0.5); snd.crowdGain.gain.setTargetAtTime(0.12 * E.clamp(1.4 - h / 120, 0.05, 1) * (night ? 0.5 : 1), snd.ctx.currentTime, 0.5); }

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
  canvas.addEventListener('pointerup', ev => { canvas.classList.remove('dragging'); if (controls.wasDrag()) return; const y = pick(ev); if (y) select(y, !walk.on); else if (selected) select(null); });

  /* ---------- selection / card ---------- */
  const card = document.getElementById('card');
  function typeKey(y) { return y.type === 'catamaran' ? 'tCatamaran' : y.type === 'sailing' ? 'tSailing' : y.type === 'explorer' ? 'tExplorer' : 'tMotor'; }
  function select(y, fly) {
    selected = y;
    document.querySelectorAll('.item').forEach(el => el.setAttribute('aria-current', String(y && +el.dataset.id === y.id)));
    if (!y) { card.hidden = true; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } return; }
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
    const lk = y.look || {}; const bits = [];
    if (lk.hull && lk.hull !== 'unknown') bits.push((lang === 'he' ? 'גוף: ' : 'Hull: ') + lk.hull.replace(/^other:/, ''));
    if (lk.style && lk.style.length) bits.push((lang === 'he' ? 'עיצוב: ' : 'Design: ') + lk.style.slice(0, 2).join(', '));
    if (lk.features && lk.features.length) bits.push(lk.features.slice(0, 3).join(' · '));
    if (lk.rig) bits.push((lang === 'he' ? 'ריג: ' : 'Rig: ') + lk.rig + (lk.mastHeight_m ? ' · ' + lk.mastHeight_m + ' m' : ''));
    document.getElementById('cardLook').innerHTML = bits.map(b => `<span dir="ltr">${b}</span>`).join('<span class="sep"> · </span>');
    document.getElementById('cardNote').textContent = y.notes || '';
    try { history.replaceState(null, '', '#yacht=' + encodeURIComponent(shortName(y))); } catch (e) { }
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
  document.getElementById('btnNight').addEventListener('click', () => { hour = night ? 15 : 21.5; applyLighting(); });
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
  // deep link: #yacht=Name
  try { const m = /yacht=([^&]+)/.exec(location.hash); if (m) { const nm = decodeURIComponent(m[1]).toLowerCase(); const y = yachts.find(q => shortName(q).toLowerCase() === nm); if (y) setTimeout(() => select(y, true), 1500); } } catch (e) { }

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
    updateShuttles(dt); if (window.__flags) window.__flags.uniforms.uTime.value += dt;
    if (walk.on) walkStep(dt);
    else if (tour) tourStep(dt);
    else if (!reduceMotion && performance.now() - controls.lastInput() > 30000) controls.goal.theta += 0.00045;
    if (!walk.on) controls.update(); camera.updateMatrixWorld();
    if ((frame & 15) === 0) updateSound();
    sky.userData.uniforms.uTime.value = water.userData.uniforms.uTime.value;
    // keep the shadow frustum centred where the camera looks
    sun.target.position.copy(controls.state.target); sun.position.copy(controls.state.target).add(sunOffset);
    if (fxOn) {
      if ((frame & 1) === 0 || controls.state.dist < 600) water.userData.renderReflection(renderer, scene, camera, [nightGroup]);
      post.render(scene, camera, night, water.userData.uniforms.uTime.value);
    } else {
      renderer.setRenderTarget(null); renderer.render(scene, camera);
    }
    if ((frame & 1) === 0) updateLabels();
    if ((frame++ & 3) === 0) drawMinimap();
  }
  const loading = document.getElementById('loading');
  document.getElementById('loadbar').style.width = '100%';
  setTimeout(() => loading.classList.add('done'), 350);
  loop();

  window.MYS_APP = { select, goView, yachts, quays, controls, startTour, stopTour, startWalk, stopWalk, setHour: h => { hour = h; applyLighting(); } };
})();
