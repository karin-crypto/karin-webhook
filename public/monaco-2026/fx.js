/* Monaco Yacht Show 2026 — rendering FX: sky, reflective water, post-processing, facade textures, trees */
(function (global) {
  'use strict';
  const T = global.THREE;
  const NOISE = `
    float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p=p*2.03+vec2(17.1,9.7); a*=0.5; } return v; }`;

  /* ---------- sky: gradient + sun + procedural clouds + stars ---------- */
  function makeSky() {
    const uniforms = { uTop: { value: new T.Color(0x2f6fb0) }, uHorizon: { value: new T.Color(0xd7e6f0) }, uSun: { value: new T.Vector3(0.4, 0.8, 0.3) }, uNight: { value: 0 }, uTime: { value: 0 } };
    const mat = new T.ShaderMaterial({
      uniforms, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uTop,uHorizon,uSun; uniform float uNight,uTime; varying vec3 vDir; ${NOISE}
        void main(){
          vec3 d = normalize(vDir); float h = clamp(d.y,0.0,1.0);
          vec3 c = mix(uHorizon, uTop, pow(h,0.5));
          vec3 sd = normalize(uSun); float sdot = max(dot(d, sd),0.0);
          // sun disc + glow
          c += vec3(1.0,0.95,0.85)*smoothstep(0.9985,0.9995,sdot)*(1.0-uNight)*3.0;
          c += vec3(1.0,0.85,0.6)*pow(sdot, 12.0)*0.35*(1.0-uNight);
          c += vec3(1.0,0.75,0.5)*pow(sdot, 3.0)*0.12*(1.0-uNight);
          // clouds (thin cirrus band)
          if (d.y > 0.02) {
            vec2 cuv = d.xz / (d.y + 0.15) * 1.6 + vec2(uTime*0.004, 0.0);
            float cl = fbm(cuv*1.3); cl = smoothstep(0.52, 0.78, cl) * smoothstep(0.02, 0.25, d.y);
            vec3 cc = mix(vec3(1.0), vec3(0.98,0.93,0.86), sdot*0.6);
            c = mix(c, cc*(1.0-uNight*0.85), cl*0.55);
            // fair-weather cumulus lower down, shaded underneath, warmed when the sun is low
            vec2 cuv2 = d.xz / (d.y + 0.10) * 0.55 + vec2(uTime*0.0025, 41.0);
            float f2 = fbm(cuv2*0.9); float cu = smoothstep(0.50, 0.66, f2) * smoothstep(0.02, 0.16, d.y) * (1.0 - smoothstep(0.35, 0.8, d.y));
            float top = smoothstep(0.45, 0.85, fbm(cuv2*0.9 + vec2(0.0, 0.06)));
            vec3 warm = mix(vec3(1.0), vec3(1.0, 0.74, 0.52), clamp(1.0 - sd.y*4.0, 0.0, 1.0));
            vec3 cuc = mix(vec3(0.74, 0.78, 0.84), vec3(1.0), top) * warm;
            c = mix(c, cuc*(1.0-uNight*0.92), cu*0.9);
          }
          // stars + moon at night
          if (uNight > 0.5 && d.y > 0.0) {
            vec2 suv = d.xz / (d.y + 0.2) * 260.0;
            float s = step(0.9975, hash21(floor(suv))) * pow(h, 0.5);
            c += vec3(s)*0.9*(0.6+0.4*vnoise(suv*0.5+uTime));
            float m = smoothstep(0.99935, 0.99975, dot(d, normalize(vec3(-0.5,0.45,-0.6))));
            c += vec3(0.95,0.95,0.85)*m*0.7;
          }
          gl_FragColor = vec4(c,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const m = new T.Mesh(new T.SphereGeometry(6000, 48, 24), mat);
    m.userData.uniforms = uniforms;
    return m;
  }

  /* ---------- water with planar reflection ---------- */
  function makeWater(size, opts) {
    opts = Object.assign({ reflectSize: 1024 }, opts || {});
    const reflectRT = new T.WebGLRenderTarget(opts.reflectSize, Math.round(opts.reflectSize * 0.6), { type: T.HalfFloatType });
    const uniforms = {
      uTime: { value: 0 }, uSun: { value: new T.Vector3(0.4, 0.8, 0.3) },
      uDeep: { value: new T.Color(0x0a3f5c) }, uShallow: { value: new T.Color(0x1f7f9c) },
      uSky: { value: new T.Color(0x9ecbe4) }, uSunCol: { value: new T.Color(0xfff2d0) }, uNight: { value: 0 },
      uReflect: { value: reflectRT.texture }, uTexMat: { value: new T.Matrix4() }, uUseReflect: { value: 1 },
      fogColor: { value: new T.Color(0xd7e6f0) }, fogNear: { value: 1400 }, fogFar: { value: 5200 },
    };
    const mat = new T.ShaderMaterial({
      uniforms, transparent: false,
      vertexShader: `
        uniform float uTime; uniform mat4 uTexMat; varying vec3 vPos; varying vec3 vNorm; varying vec4 vRef;
        void main(){
          vec3 p = position;
          float w = sin(p.x*0.09 + uTime*0.9)*0.12 + sin(p.z*0.13 - uTime*0.7)*0.10 + sin((p.x+p.z)*0.05 + uTime*0.5)*0.15;
          p.y += w;
          float dx = cos(p.x*0.09 + uTime*0.9)*0.09*0.12 + cos((p.x+p.z)*0.05 + uTime*0.5)*0.05*0.15;
          float dz = cos(p.z*0.13 - uTime*0.7)*0.13*0.10 + cos((p.x+p.z)*0.05 + uTime*0.5)*0.05*0.15;
          vNorm = normalize(vec3(-dx*6.0, 1.0, -dz*6.0));
          vec4 wp = modelMatrix*vec4(p,1.0); vPos = wp.xyz;
          vRef = uTexMat * wp;
          gl_Position = projectionMatrix*viewMatrix*wp;
        }`,
      fragmentShader: `
        uniform vec3 uSun, uDeep, uShallow, uSky, uSunCol, fogColor; uniform float uTime, uNight, uUseReflect, fogNear, fogFar;
        uniform sampler2D uReflect;
        varying vec3 vPos; varying vec3 vNorm; varying vec4 vRef; ${NOISE}
        void main(){
          vec3 V = normalize(cameraPosition - vPos);
          float dCam = length(cameraPosition - vPos);
          float detail = clamp(1.0 - dCam/1800.0, 0.0, 1.0);
          vec2 n1 = vec2(vnoise(vPos.xz*0.45 + uTime*0.18), vnoise(vPos.zx*0.45 - uTime*0.15)) - 0.5;
          vec2 n2 = vec2(vnoise(vPos.xz*1.8 - uTime*0.35), vnoise(vPos.zx*1.7 + uTime*0.3)) - 0.5;
          vec3 N = normalize(vNorm + vec3(n1.x, 0.0, n1.y)*0.45*detail + vec3(n2.x,0.0,n2.y)*0.18*detail);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 3.5);
          float d = clamp(length(vPos.xz)/900.0, 0.0, 1.0);
          vec3 base = mix(uShallow, uDeep, d);
          vec3 skyRef = uSky;
          if (uUseReflect > 0.5) {
            vec2 ruv = vRef.xy / vRef.w;
            ruv += (N.xz) * 0.035 * detail;
            ruv = clamp(ruv, 0.001, 0.999);
            skyRef = texture2D(uReflect, ruv).rgb;
          }
          vec3 col = mix(base, skyRef, 0.18 + fres*0.72);
          vec3 H = normalize(normalize(uSun) + V);
          float spec = pow(max(dot(N,H),0.0), 320.0) * 3.0 + pow(max(dot(N,H),0.0), 48.0)*0.22;
          col += uSunCol * spec * (1.0 - uNight*0.55);
          col += vec3(0.03)*vnoise(vPos.xz*0.9 + uTime*0.3)*(1.0-uNight);
          float fogF = smoothstep(fogNear, fogFar, dCam);
          col = mix(col, fogColor, fogF);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const geom = new T.PlaneGeometry(size, size, 200, 200); geom.rotateX(-Math.PI / 2);
    const mesh = new T.Mesh(geom, mat);
    mesh.userData.uniforms = uniforms; mesh.userData.reflectRT = reflectRT;
    // planar reflection renderer (mirror camera about y = 0)
    const mirrorCam = new T.PerspectiveCamera();
    const clip = new T.Plane(new T.Vector3(0, 1, 0), 0.15);
    const bias = new T.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    mesh.userData.renderReflection = function (renderer, scene, camera, hide) {
      mirrorCam.copy(camera); mirrorCam.aspect = camera.aspect; mirrorCam.fov = camera.fov; mirrorCam.near = camera.near; mirrorCam.far = camera.far;
      const p = camera.position.clone(); p.y = -p.y;
      const dir = new T.Vector3(); camera.getWorldDirection(dir); dir.y = -dir.y;
      mirrorCam.position.copy(p); mirrorCam.up.set(0, 1, 0); mirrorCam.lookAt(p.clone().add(dir)); mirrorCam.updateMatrixWorld(); mirrorCam.updateProjectionMatrix();
      uniforms.uTexMat.value.copy(bias).multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
      const prevClip = renderer.clippingPlanes, prevRT = renderer.getRenderTarget();
      mesh.visible = false; (hide || []).forEach(o => o.visible = false);
      renderer.clippingPlanes = [clip];
      renderer.setRenderTarget(reflectRT); renderer.clear(); renderer.render(scene, mirrorCam);
      renderer.setRenderTarget(prevRT); renderer.clippingPlanes = prevClip;
      mesh.visible = true; (hide || []).forEach(o => o.visible = true);
    };
    return mesh;
  }

  /* ---------- post-processing: SSAO-lite + bloom + vignette + grain ---------- */
  function makePost(renderer) {
    const quadGeo = new T.PlaneGeometry(2, 2);
    const quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mk = (frag, uniforms) => new T.Mesh(quadGeo, new T.ShaderMaterial({ uniforms, depthTest: false, depthWrite: false, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`, fragmentShader: frag }));
    let w = 2, h = 2;
    const sceneRT = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples: 4 });
    sceneRT.depthTexture = new T.DepthTexture(w, h, T.UnsignedIntType);
    const aoRT = new T.WebGLRenderTarget(w, h); const aoBlurRT = new T.WebGLRenderTarget(w, h);
    const brightRT = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType }); const blurA = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType }); const blurB = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType });
    const uAO = { tDepth: { value: sceneRT.depthTexture }, uNear: { value: 2 }, uFar: { value: 12000 }, uRes: { value: new T.Vector2(1, 1) }, uRadius: { value: 14 }, uProj: { value: new T.Matrix4() } };
    const ao = mk(`uniform sampler2D tDepth; uniform float uNear,uFar,uRadius; uniform vec2 uRes; varying vec2 vUv;
      float viewZ(vec2 uv){ float d = texture2D(tDepth, uv).x; return (uNear*uFar)/((uFar-uNear)*d - uFar); }
      ${NOISE}
      void main(){
        float z = viewZ(vUv); float dist = -z;
        if (dist > 3000.0) { gl_FragColor = vec4(1.0); return; }
        float rad = uRadius / dist * 60.0; // screen-space radius in px scaled by depth
        rad = clamp(rad, 2.0, 40.0);
        float occ = 0.0; float rnd = hash21(vUv*uRes) * 6.2831;
        for (int i = 0; i < 12; i++) {
          float a = rnd + float(i) * 0.5236; float r = (float(i) + 1.5) / 12.0;
          vec2 off = vec2(cos(a), sin(a)) * rad * r / uRes;
          float zs = viewZ(vUv + off); float diff = (-zs) - dist; // negative when sample is closer
          float rangeCheck = smoothstep(0.0, 1.0, (uRadius*3.0) / max(abs(diff), 0.001));
          occ += (diff < -0.6 ? 1.0 : 0.0) * rangeCheck;
        }
        occ /= 12.0;
        gl_FragColor = vec4(vec3(1.0 - occ * 0.85), 1.0);
      }`, uAO);
    const uBlur = { tex: { value: null }, uDir: { value: new T.Vector2(1, 0) }, uRes: { value: new T.Vector2(1, 1) } };
    const blur = mk(`uniform sampler2D tex; uniform vec2 uDir, uRes; varying vec2 vUv;
      void main(){ vec2 px = uDir / uRes; vec4 c = texture2D(tex, vUv)*0.227;
        c += (texture2D(tex, vUv+px*1.385)+texture2D(tex, vUv-px*1.385))*0.316;
        c += (texture2D(tex, vUv+px*3.23)+texture2D(tex, vUv-px*3.23))*0.070;
        gl_FragColor = c; }`, uBlur);
    const uBright = { tex: { value: sceneRT.texture }, uThresh: { value: 1.0 } };
    const bright = mk(`uniform sampler2D tex; uniform float uThresh; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tex, vUv).rgb; float l = dot(c, vec3(0.2126,0.7152,0.0722)); float k = smoothstep(uThresh, uThresh+0.6, l); gl_FragColor = vec4(c*k, 1.0); }`, uBright);
    const uFinal = { tex: { value: sceneRT.texture }, tAO: { value: aoBlurRT.texture }, tBloom: { value: blurB.texture }, tDepth: { value: sceneRT.depthTexture }, uBloom: { value: 0.35 }, uTime: { value: 0 }, uVignette: { value: 0.32 }, uAOStrength: { value: 1.0 }, uSunUV: { value: new T.Vector2(-9, -9) }, uSunI: { value: 0 }, uSunCol: { value: new T.Color(1, 0.9, 0.7) }, uAspect: { value: 1 }, uNear: { value: 2 }, uFar: { value: 12000 }, uGrade: { value: 1 } };
    const fin = mk(`uniform sampler2D tex, tAO, tBloom, tDepth; uniform float uBloom, uTime, uVignette, uAOStrength, uSunI, uAspect, uNear, uFar, uGrade; uniform vec2 uSunUV; uniform vec3 uSunCol; varying vec2 vUv; ${NOISE}
      float viewZ(vec2 uv){ float d = texture2D(tDepth, uv).x; return (uNear*uFar)/((uFar-uNear)*d - uFar); }
      void main(){
        vec2 q = vUv - 0.5;
        // lens: a touch of chromatic aberration towards the corners
        float ca = dot(q, q) * 0.006;
        vec3 c = texture2D(tex, vUv).rgb; c.r = texture2D(tex, vUv + q * ca).r; c.b = texture2D(tex, vUv - q * ca).b;
        float ao = mix(1.0, texture2D(tAO, vUv).r, uAOStrength);
        c *= ao;
        c += texture2D(tBloom, vUv).rgb * uBloom;
        // sun glare: soft glow, an anamorphic streak and two ghosts, occluded by whatever stands in front of the sun
        if (uSunI > 0.0) {
          vec2 su = clamp(uSunUV, vec2(0.0), vec2(1.0));
          float vis = 0.0; for (int i = 0; i < 5; i++) { vec2 off = vec2(float(i - 2) * 0.006, float((i * 3) % 5 - 2) * 0.006); vis += step(4500.0, -viewZ(clamp(su + off, 0.0, 1.0))); } vis /= 5.0;
          vec2 dd = (vUv - uSunUV) * vec2(uAspect, 1.0); float r = length(dd);
          float glow = exp(-r * 2.6) * 0.42 + exp(-r * 11.0) * 0.55;
          float streak = exp(-abs(dd.y) * 110.0) * exp(-abs(dd.x) * 2.4) * 0.65;
          vec2 gd = 0.5 - uSunUV; vec2 g1 = uSunUV + gd * 1.45, g2 = uSunUV + gd * 0.55;
          float ghost = smoothstep(0.075, 0.0, length((vUv - g1) * vec2(uAspect, 1.0))) * 0.10 + smoothstep(0.035, 0.0, length((vUv - g2) * vec2(uAspect, 1.0))) * 0.07;
          c += (uSunCol * glow + vec3(0.75, 0.85, 1.0) * streak + vec3(0.7, 0.9, 0.75) * ghost) * vis * uSunI;
        }
        // film grade: mild contrast about mid-grey, a little saturation, cool shadows and warm highlights
        if (uGrade > 0.5) {
          float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = max(vec3(0.0), (c - 0.18) * 1.07 + 0.18);
          c = mix(vec3(lum), c, 1.08);
          c += vec3(-0.004, 0.006, 0.018) * (1.0 - smoothstep(0.0, 0.3, lum)) + vec3(0.03, 0.014, 0.0) * smoothstep(0.45, 1.3, lum);
        }
        float vig = 1.0 - dot(q, q) * uVignette * 1.6;
        c *= vig;
        c += (hash21(vUv * 1234.5 + fract(uTime)) - 0.5) * 0.012;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`, uFinal);
    const s = new T.Scene(); let cur = null;
    function draw(m, rt) { if (cur) s.remove(cur); s.add(m); cur = m; renderer.setRenderTarget(rt); renderer.render(s, quadCam); }
    return {
      sceneRT,
      setSize(W, H) {
        w = W; h = H; sceneRT.setSize(W, H); sceneRT.depthTexture.image.width = W; sceneRT.depthTexture.image.height = H;
        const aw = Math.max(1, Math.round(W / 2)), ah = Math.max(1, Math.round(H / 2)); aoRT.setSize(aw, ah); aoBlurRT.setSize(aw, ah);
        const bw = Math.max(1, Math.round(W / 4)), bh = Math.max(1, Math.round(H / 4)); brightRT.setSize(bw, bh); blurA.setSize(bw, bh); blurB.setSize(bw, bh);
      },
      render(scene, camera, night, time, sunInfo) {
        uAO.uNear.value = camera.near; uAO.uFar.value = camera.far; uFinal.uNear.value = camera.near; uFinal.uFar.value = camera.far; uFinal.uAspect.value = w / h;
        if (sunInfo) { uFinal.uSunUV.value.copy(sunInfo.uv); uFinal.uSunI.value = sunInfo.i; uFinal.uSunCol.value.copy(sunInfo.col); } else uFinal.uSunI.value = 0.0; uAO.uRes.value.set(Math.round(w / 2), Math.round(h / 2));
        renderer.setRenderTarget(sceneRT); renderer.clear(); renderer.render(scene, camera);
        draw(ao, aoRT);
        uBlur.tex.value = aoRT.texture; uBlur.uDir.value.set(1, 0); uBlur.uRes.value.set(Math.round(w / 2), Math.round(h / 2)); draw(blur, aoBlurRT);
        uBlur.tex.value = aoBlurRT.texture; uBlur.uDir.value.set(0, 1); draw(blur, aoRT);
        uFinal.tAO.value = aoRT.texture;
        uBright.uThresh.value = night ? 0.55 : 1.05; draw(bright, brightRT);
        uBlur.tex.value = brightRT.texture; uBlur.uDir.value.set(1, 0); uBlur.uRes.value.set(Math.round(w / 4), Math.round(h / 4)); draw(blur, blurA);
        uBlur.tex.value = blurA.texture; uBlur.uDir.value.set(0, 1); draw(blur, blurB);
        uBlur.tex.value = blurB.texture; uBlur.uDir.value.set(2, 0); draw(blur, blurA);
        uBlur.tex.value = blurA.texture; uBlur.uDir.value.set(0, 2); draw(blur, blurB);
        uFinal.uBloom.value = night ? 0.6 : 0.28; uFinal.uTime.value = time;
        draw(fin, null);
      },
    };
  }

  /* ---------- facade textures (procedural, four Monaco building styles) ----------
     0 Belle Époque: cream/ochre plaster, tall windows, cornices, wrought balconies
     1 Modern residential: white slabs with continuous balcony bands (the Monaco 1970s–2000s look)
     2 Glass tower: blue-grey curtain wall with mullions and spandrels
     3 Monaco-Ville: ochre and rose plaster, small shuttered windows, terracotta roofs   */
  function makeFacadeTextures() {
    const S = 256; const cw = S / 3, fh = S / 2; // tile = 6 m x 6 m : 2 floors x 3 bays
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return [c, c.getContext('2d')]; };
    const grain = (x, n, a) => { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${90 + Math.random() * 80 | 0},${80 + Math.random() * 60 | 0},${60 + Math.random() * 50 | 0},${a * (0.4 + Math.random())})`; x.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 2, 2); } };
    const glass = (x, wx, wy, ww, wh, tint) => { x.fillStyle = tint || '#22303c'; x.fillRect(wx, wy, ww, wh); const g = x.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, 'rgba(180,210,235,0.45)'); g.addColorStop(0.5, 'rgba(120,150,180,0.12)'); g.addColorStop(1, 'rgba(40,60,80,0.1)'); x.fillStyle = g; x.fillRect(wx, wy, ww, wh); };
    const lit = (ex, wx, wy, ww, wh, p, cool) => { const r = Math.random(); if (r < p) { ex.fillStyle = r < p * 0.35 ? '#ffd9a0' : r < p * 0.7 ? '#ffe9c0' : (cool ? '#cfe0ff' : '#fff2d8'); ex.fillRect(wx, wy, ww, wh); } };
    const out = [];
    const finish = (c, e) => { const map = new T.CanvasTexture(c); map.wrapS = map.wrapT = T.RepeatWrapping; map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8; const em = new T.CanvasTexture(e); em.wrapS = em.wrapT = T.RepeatWrapping; em.colorSpace = T.SRGBColorSpace; out.push({ map, emissive: em }); };

    // 0 · Belle Époque
    { const [c, x] = mk(), [e, ex] = mk(); x.fillStyle = '#e9dcc4'; x.fillRect(0, 0, S, S); grain(x, 1600, 0.08); ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
      for (let f = 0; f < 2; f++) { const y0 = f * fh; x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect(0, y0, S, 5); x.fillStyle = 'rgba(0,0,0,0.16)'; x.fillRect(0, y0 + 5, S, 3); // cornice line per floor
        for (let k = 0; k < 3; k++) { const wx = k * cw + cw * 0.3, wy = y0 + fh * 0.2, ww = cw * 0.4, wh = fh * 0.58;
          x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(wx - 5, wy - 5, ww + 10, wh + 10); // reveal
          x.fillStyle = '#f4ede0'; x.fillRect(wx - 4, wy - 4, ww + 8, wh + 8); // stone surround
          glass(x, wx, wy, ww, wh); x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(wx + ww / 2 - 1, wy, 2, wh); x.fillRect(wx, wy + wh * 0.45, ww, 2); // muntins
          x.fillStyle = 'rgba(40,40,45,0.7)'; for (let b = 0; b < 7; b++) x.fillRect(wx - 6 + b * (ww + 12) / 6, wy + wh + 2, 1.5, 9); x.fillRect(wx - 7, wy + wh + 2, ww + 14, 2); x.fillRect(wx - 7, wy + wh + 10, ww + 14, 2); // wrought-iron balcony
          lit(ex, wx, wy, ww, wh, 0.34); } }
      finish(c, e); }
    // 1 · Modern residential with balcony bands
    { const [c, x] = mk(), [e, ex] = mk(); x.fillStyle = '#f1efe9'; x.fillRect(0, 0, S, S); grain(x, 900, 0.05); ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
      for (let f = 0; f < 2; f++) { const y0 = f * fh; const slab = fh * 0.24;
        x.fillStyle = '#5a6b78'; x.fillRect(0, y0 + slab, S, fh - slab); // recessed glazing behind the balcony
        for (let k = 0; k < 3; k++) { const wx = k * cw + 6, ww = cw - 12; glass(x, wx, y0 + slab + 2, ww, fh - slab - 2, '#6d8290'); x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(wx + ww * 0.5, y0 + slab, 2, fh - slab); lit(ex, wx, y0 + slab + 2, ww, fh - slab - 4, 0.28); }
        x.fillStyle = 'rgba(232,234,238,0.78)'; x.fillRect(0, y0 + slab + fh * 0.3, S, fh * 0.42); // glass balustrade
        x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillRect(0, y0 + slab + fh * 0.72, S, 2); // handrail
        x.fillStyle = '#f7f5f0'; x.fillRect(0, y0, S, slab); x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, y0 + slab, S, 5); // white slab and shadow under it
        x.fillStyle = 'rgba(0,0,0,0.08)'; x.fillRect(0, y0 + slab - 3, S, 3); }
      finish(c, e); }
    // 2 · Glass tower
    { const [c, x] = mk(), [e, ex] = mk(); x.fillStyle = '#4f6a82'; x.fillRect(0, 0, S, S); ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
      for (let f = 0; f < 2; f++) { const y0 = f * fh; const g = x.createLinearGradient(0, y0, 0, y0 + fh); g.addColorStop(0, '#9dbdd4'); g.addColorStop(0.45, '#6d8fa9'); g.addColorStop(1, '#4f6a82'); x.fillStyle = g; x.fillRect(0, y0, S, fh);
        x.fillStyle = '#3d4d5b'; x.fillRect(0, y0 + fh * 0.78, S, fh * 0.22); // spandrel
        x.fillStyle = 'rgba(220,230,240,0.55)'; x.fillRect(0, y0 + fh * 0.78, S, 2); x.fillRect(0, y0, S, 2);
        for (let k = 0; k <= 3; k++) x.fillRect(Math.min(S - 2, k * cw), y0, 2, fh); for (let k = 0; k < 3; k++) x.fillRect(k * cw + cw / 2, y0, 1, fh);
        for (let k = 0; k < 3; k++) lit(ex, k * cw + 3, y0 + 3, cw - 6, fh * 0.74, 0.38, true); }
      finish(c, e); }
    // 3 · Monaco-Ville
    { const [c, x] = mk(), [e, ex] = mk(); x.fillStyle = '#e4bf8f'; x.fillRect(0, 0, S, S); grain(x, 2200, 0.1); ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
      x.fillStyle = 'rgba(120,70,40,0.10)'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * S, Math.random() * S, 10 + Math.random() * 40, 2 + Math.random() * 6); // weathering
      for (let f = 0; f < 2; f++) for (let k = 0; k < 3; k++) { const wx = k * cw + cw * 0.34, wy = f * fh + fh * 0.26, ww = cw * 0.32, wh = fh * 0.5;
        x.fillStyle = '#f0e2c8'; x.fillRect(wx - 3, wy - 3, ww + 6, wh + 6); glass(x, wx, wy, ww, wh, '#2b2a2a');
        x.fillStyle = f === 0 && k === 1 ? '#5d7a63' : '#6f7d72'; x.fillRect(wx - 12, wy - 1, 9, wh + 2); x.fillRect(wx + ww + 3, wy - 1, 9, wh + 2); // shutters
        x.fillStyle = 'rgba(0,0,0,0.25)'; for (let s = 0; s < 6; s++) { x.fillRect(wx - 12, wy + 2 + s * wh / 6, 9, 1); x.fillRect(wx + ww + 3, wy + 2 + s * wh / 6, 9, 1); }
        x.fillStyle = 'rgba(40,40,45,0.6)'; x.fillRect(wx - 6, wy + wh + 3, ww + 12, 2); lit(ex, wx, wy, ww, wh, 0.3); }
      finish(c, e); }
    return out;
  }
  function facadeMaterial(texs) {
    texs.forEach(tx => { tx.map.repeat.set(1 / 6, 1 / 6); tx.emissive.repeat.set(1 / 6, 1 / 6); });
    const m = new T.MeshStandardMaterial({ map: texs[0].map, emissiveMap: texs[0].emissive, emissive: new T.Color(0xffffff), emissiveIntensity: 0, vertexColors: true, roughness: 0.85, metalness: 0.0, envMapIntensity: 0.9 });
    m.onBeforeCompile = sh => {
      sh.uniforms.tex1 = { value: texs[1].map }; sh.uniforms.tex2 = { value: texs[2].map }; sh.uniforms.tex3 = { value: texs[3].map };
      sh.uniforms.em1 = { value: texs[1].emissive }; sh.uniforms.em2 = { value: texs[2].emissive }; sh.uniforms.em3 = { value: texs[3].emissive };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aWall; attribute float aStyle; varying float vWall; varying float vStyle; varying vec3 vWp;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvWall = aWall; vStyle = aStyle; vWp = (modelMatrix * vec4(position,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
          uniform sampler2D tex1, tex2, tex3, em1, em2, em3; varying float vWall; varying float vStyle; varying vec3 vWp;
          float fhash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }`)
        .replace('#include <map_fragment>', `#ifdef USE_MAP
          float st = floor(vStyle + 0.001); float rv = fract(vStyle);
          vec2 uvo = vec2(floor(rv * 7.0) / 3.0, floor(rv * 13.0) / 2.0);
          vec2 fuv = vMapUv + uvo;
          vec4 fc = st < 0.5 ? texture2D(map, fuv) : st < 1.5 ? texture2D(tex1, fuv) : st < 2.5 ? texture2D(tex2, fuv) : texture2D(tex3, fuv);
          // roofs: gravel and plant rooms for the town, terracotta tiles on the Rock
          float rn = fhash(floor(vWp.xz / 2.5)); float rn2 = fhash(floor(vWp.xz / 0.7) + 3.0);
          vec3 roofTown = vec3(0.60, 0.58, 0.55) * (0.82 + 0.22 * rn) * (0.9 + 0.2 * rn2);
          vec3 roofRock = vec3(0.64, 0.38, 0.27) * (0.8 + 0.3 * rn) * (0.9 + 0.2 * fract(vWp.x * 1.7));
          vec3 roofC = st > 2.5 ? roofRock : roofTown;
          vec3 tint = st > 1.5 && st < 2.5 ? vec3(0.9, 0.95, 1.0) : vec3(1.0);
          diffuseColor.rgb = mix(roofC, diffuseColor.rgb * fc.rgb * tint, vWall);
        #endif`)
        .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness; if (st > 1.5 && st < 2.5 && vWall > 0.5) roughnessFactor = 0.45; if (vWall < 0.5) roughnessFactor = 0.95;`)
        .replace('#include <metalnessmap_fragment>', `float metalnessFactor = metalness; if (st > 1.5 && st < 2.5 && vWall > 0.5) metalnessFactor = 0.2;`)
        .replace('#include <emissivemap_fragment>', `#ifdef USE_EMISSIVEMAP
          vec2 euv = vEmissiveMapUv + uvo;
          vec4 emissiveColor = st < 0.5 ? texture2D(emissiveMap, euv) : st < 1.5 ? texture2D(em1, euv) : st < 2.5 ? texture2D(em2, euv) : texture2D(em3, euv);
          totalEmissiveRadiance *= emissiveColor.rgb * vWall;
        #endif`);
    };
    return m;
  }

  /* ---------- terrain: grass and scrub with rock breaking through on the steep slopes ---------- */
  function makeTerrainMaterial() {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const img = x.createImageData(S, S); const d = img.data;
    // three independent value-noise channels at different scales (tileable via wrap of the lattice)
    const lat = (n, seed) => { const g = new Float32Array(n * n); for (let i = 0; i < n * n; i++) { const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; g[i] = s - Math.floor(s); } return (u, v) => { const x0 = Math.floor(u) % n, y0 = Math.floor(v) % n, x1 = (x0 + 1) % n, y1 = (y0 + 1) % n; const fx = u - Math.floor(u), fy = v - Math.floor(v); const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); const a = g[y0 * n + x0], b = g[y0 * n + x1], cc = g[y1 * n + x0], dd = g[y1 * n + x1]; return (a + (b - a) * sx) + ((cc + (dd - cc) * sx) - (a + (b - a) * sx)) * sy; }; };
    const fb = (seed, base) => { const ls = [lat(base, seed), lat(base * 2, seed + 1), lat(base * 4, seed + 2), lat(base * 8, seed + 3)]; return (u, v) => { let s = 0, a = 0.5, f = 1; for (const l of ls) { s += a * l(u * base * f, v * base * f); f *= 2; a *= 0.5; } return s; }; };
    const ch = [fb(1, 4), fb(2, 8), fb(3, 16)];
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const o = (j * S + i) * 4; const u = i / S, v = j / S; d[o] = ch[0](u, v) * 255; d[o + 1] = ch[1](u, v) * 255; d[o + 2] = ch[2](u, v) * 255; d[o + 3] = 255; }
    x.putImageData(img, 0, 0);
    const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.anisotropy = 8;
    const m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
    m.onBeforeCompile = sh => {
      sh.uniforms.tNoise = { value: tex };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vWn;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(position,1.0)).xyz; vWn = normalize(mat3(modelMatrix) * normal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tNoise; varying vec3 vWp; varying vec3 vWn;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 n1 = texture2D(tNoise, vWp.xz / 260.0).rgb, n2 = texture2D(tNoise, vWp.xz / 41.0).rgb, n3 = texture2D(tNoise, vWp.xz / 6.5).rgb;
          vec3 grass = mix(vec3(0.33, 0.44, 0.22), vec3(0.56, 0.55, 0.32), n1.r);          // green scrub to dry maquis
          grass = mix(grass, vec3(0.42, 0.40, 0.28), smoothstep(0.55, 0.8, n2.g) * 0.5);    // bare earth patches
          grass *= 0.78 + 0.34 * n2.r; grass *= 0.88 + 0.24 * n3.b;
          vec3 rock = mix(vec3(0.52, 0.50, 0.46), vec3(0.74, 0.70, 0.62), n2.b) * (0.8 + 0.35 * n3.r);
          float slope = 1.0 - vWn.y; float rk = smoothstep(0.16, 0.40, slope + (n2.r - 0.5) * 0.18);
          diffuseColor.rgb *= mix(grass, rock, rk);`);
    };
    return m;
  }

  /* ---------- gulls: a slow wheeling flock over the harbour mouth ---------- */
  function makeBirds(n, center, radius, height) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute([-1.0, 0.25, 0, 0, 0, -0.15, 0, 0, 0.15, 1.0, 0.25, 0, 0, 0, 0.15, 0, 0, -0.15], 3));
    g.computeVertexNormals();
    const m = new T.InstancedMesh(g, new T.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.9, side: T.DoubleSide }), n);
    m.frustumCulled = false;
    const o = new T.Object3D(); const ph = []; for (let i = 0; i < n; i++) ph.push({ a: Math.random() * 6.283, r: radius * (0.5 + Math.random() * 0.7), y: height + (Math.random() - 0.5) * 30, s: 0.7 + Math.random() * 0.6, f: 6 + Math.random() * 4, w: 0.12 + Math.random() * 0.1 });
    m.userData.update = t => {
      for (let i = 0; i < n; i++) { const p = ph[i]; const a = p.a + t * p.w; const x = center.x + Math.cos(a) * p.r, z = center.z + Math.sin(a) * p.r * 0.7; const y = p.y + Math.sin(t * 0.7 + i) * 4;
        o.position.set(x, y, z); o.rotation.set(0, -a, Math.sin(t * p.f + i) * 0.55); o.scale.setScalar(p.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
      m.instanceMatrix.needsUpdate = true;
    };
    return m;
  }

  /* ---------- quay paving + concrete wall material ---------- */
  function makeGroundMaterial() {
    const mk = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; };
    // paving: 4 m tile = 4 x 4 slabs of 1 m with joints and grain
    const pav = mk(512, 512, (x, w, h) => { x.fillStyle = '#d6cdbd'; x.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${90 + Math.random() * 80 | 0},${80 + Math.random() * 60 | 0},${60 + Math.random() * 50 | 0},${0.05 + Math.random() * 0.1})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const k = 0.9 + Math.random() * 0.14; x.fillStyle = `rgba(255,255,255,${(k - 0.9) * 0.9})`; x.fillRect(c * 128 + 2, r * 128 + 2, 124, 124); } x.strokeStyle = 'rgba(70,60,50,0.55)'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 128); x.lineTo(w, i * 128); x.stroke(); } });
    pav.repeat.set(1 / 4, 1 / 4);
    const con = mk(256, 256, (x, w, h) => { x.fillStyle = '#b9b3a6'; x.fillRect(0, 0, w, h); for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(${60 + Math.random() * 60 | 0},${55 + Math.random() * 50 | 0},${50 + Math.random() * 40 | 0},${0.04 + Math.random() * 0.12})`; x.fillRect(Math.random() * w, Math.random() * h, 3, 1 + Math.random() * 3); } x.fillStyle = 'rgba(40,50,60,0.35)'; x.fillRect(0, h - 40, w, 40); x.fillStyle = 'rgba(30,60,50,0.35)'; x.fillRect(0, h - 22, w, 22); });
    con.repeat.set(1 / 3, 1 / 3.7);
    const m = new T.MeshStandardMaterial({ map: pav, vertexColors: true, roughness: 0.92, metalness: 0 });
    m.onBeforeCompile = sh => {
      sh.uniforms.tWall = { value: con };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aWall; varying float vWall; varying vec3 vWp;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvWall = aWall; vWp = (modelMatrix * vec4(position,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tWall; varying float vWall; varying vec3 vWp;')
        .replace('#include <map_fragment>', `#ifdef USE_MAP
          vec4 capC = texture2D( map, vWp.xz / 4.0 );
          vec4 wallC = texture2D( tWall, vec2((vWp.x + vWp.z) / 3.0, vWp.y / 3.7) );
          diffuseColor *= mix(capC, wallC, vWall);
        #endif`);
    };
    return m;
  }

  /* ---------- low-poly trees (instanced) ---------- */
  function makeTrees(positions) { // positions: [{x,y,z,s,k}] k: 0 pine, 1 round
    const n = positions.length; if (!n) return new T.Group();
    const trunk = new T.CylinderGeometry(0.25, 0.4, 1, 6); trunk.translate(0, 0.5, 0);
    const pine = new T.ConeGeometry(1, 1, 7); pine.translate(0, 0.5, 0);
    const round = new T.IcosahedronGeometry(1, 1);
    const g = new T.Group();
    const mTrunk = new T.InstancedMesh(trunk, new T.MeshStandardMaterial({ color: 0x6b5138, roughness: 1 }), n);
    const mPine = new T.InstancedMesh(pine, new T.MeshStandardMaterial({ color: 0x3f6b3a, roughness: 0.95 }), n);
    const mRound = new T.InstancedMesh(round, new T.MeshStandardMaterial({ color: 0x5a8a45, roughness: 0.95 }), n);
    const o = new T.Object3D(); const col = new T.Color();
    let ip = 0, ir = 0;
    positions.forEach((p, i) => {
      const s = p.s || 1;
      o.position.set(p.x, p.y, p.z); o.scale.set(0.9 * s, 3.2 * s, 0.9 * s); o.rotation.set(0, 0, 0); o.updateMatrix(); mTrunk.setMatrixAt(i, o.matrix);
      if (p.k === 0) { o.position.set(p.x, p.y + 2.2 * s, p.z); o.scale.set(2.6 * s, 6.5 * s, 2.6 * s); o.updateMatrix(); mPine.setMatrixAt(ip, o.matrix); col.setHSL(0.3 + Math.random() * 0.06, 0.35, 0.28 + Math.random() * 0.1); mPine.setColorAt(ip, col); ip++; }
      else { o.position.set(p.x, p.y + 4.2 * s, p.z); o.scale.set(2.8 * s, 2.4 * s, 2.8 * s); o.updateMatrix(); mRound.setMatrixAt(ir, o.matrix); col.setHSL(0.24 + Math.random() * 0.08, 0.4, 0.3 + Math.random() * 0.12); mRound.setColorAt(ir, col); ir++; }
    });
    mPine.count = ip; mRound.count = ir;
    [mTrunk, mPine, mRound].forEach(m => { m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; g.add(m); });
    return g;
  }

  global.MYSFX = { makeSky, makeWater, makePost, makeFacadeTextures, facadeMaterial, makeTrees, makeGroundMaterial, makeTerrainMaterial, makeBirds };
})(window);
