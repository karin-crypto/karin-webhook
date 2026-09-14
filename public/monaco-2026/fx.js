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

  /* ---------- shore mask: land (1) to open water (0), soft over the last ~40 m, in world XZ ----------
     used by the water for shallows and foam and by the ground for quayside paving vs. city blocks */
  const BLACK1 = new T.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); BLACK1.needsUpdate = true;
  function makeShoreMask(polys, size, px) {
    px = px || 1024; const c = document.createElement('canvas'); c.width = c.height = px; const x = c.getContext('2d');
    const o = document.createElement('canvas'); o.width = o.height = px; const ox = o.getContext('2d');
    ox.fillStyle = '#fff'; polys.forEach(p => { ox.beginPath(); p.forEach((q, i) => { const u = (q.x / size + 0.5) * px, v = (q.z / size + 0.5) * px; if (i) ox.lineTo(u, v); else ox.moveTo(u, v); }); ox.closePath(); ox.fill(); });
    x.fillStyle = '#000'; x.fillRect(0, 0, px, px);
    const blurs = [3, 9, 18]; x.globalAlpha = 1 / blurs.length;
    blurs.forEach(b => { try { x.filter = 'blur(' + b + 'px)'; } catch (e) { } x.drawImage(o, 0, 0); });
    x.filter = 'none'; x.globalAlpha = 1;
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.flipY = false; t.minFilter = T.LinearFilter; t.generateMipmaps = false;
    return { tex: t, size };
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
      uShore: { value: BLACK1 }, uShoreSize: { value: 1.0 }, uHasShore: { value: 0 },
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
        uniform sampler2D uReflect, uShore; uniform float uShoreSize, uHasShore;
        varying vec3 vPos; varying vec3 vNorm; varying vec4 vRef; ${NOISE}
        void main(){
          vec3 V = normalize(cameraPosition - vPos);
          float dCam = length(cameraPosition - vPos);
          float detail = clamp(1.0 - dCam/1800.0, 0.0, 1.0);
          // shore proximity: 0 open water .. 1 land
          vec2 suv = vPos.xz / uShoreSize + 0.5; float shore = 0.0;
          if (uHasShore > 0.5 && suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) shore = texture2D(uShore, suv).r;
          float near = smoothstep(0.08, 0.6, shore);
          vec2 n1 = vec2(vnoise(vPos.xz*0.45 + uTime*0.18), vnoise(vPos.zx*0.45 - uTime*0.15)) - 0.5;
          vec2 n2 = vec2(vnoise(vPos.xz*1.8 - uTime*0.35), vnoise(vPos.zx*1.7 + uTime*0.3)) - 0.5;
          float calm = 1.0 - near * 0.55;
          vec3 N = normalize(vNorm + vec3(n1.x, 0.0, n1.y)*0.45*detail*calm + vec3(n2.x,0.0,n2.y)*0.18*detail*calm);
          float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 4.0);
          float d = clamp(length(vPos.xz)/900.0, 0.0, 1.0);
          vec3 base = mix(uShallow, uDeep, d);
          // shallows along the quays: greener, lighter water over the harbour bed
          base = mix(base, uShallow * vec3(1.05, 1.22, 1.15) + vec3(0.02, 0.06, 0.04), near * 0.75 * (1.0 - uNight*0.7));
          vec3 skyRef = uSky;
          if (uUseReflect > 0.5) {
            vec2 ruv = vRef.xy / vRef.w;
            ruv += (N.xz) * 0.035 * detail;
            ruv = clamp(ruv, 0.001, 0.999);
            skyRef = texture2D(uReflect, ruv).rgb;
          }
          vec3 col = mix(base, skyRef, clamp(0.16 + fres*0.74, 0.0, 0.92));
          vec3 H = normalize(normalize(uSun) + V);
          float spec = pow(max(dot(N,H),0.0), 320.0) * 3.0 + pow(max(dot(N,H),0.0), 48.0)*0.22;
          col += uSunCol * spec * (1.0 - uNight*0.55);
          // sun glitter: sparse sparkles where the small facets catch the sun
          float glit = pow(max(dot(N,H),0.0), 900.0) * step(0.62, vnoise(vPos.xz*38.0 + uTime*2.5)) * 5.0 * detail;
          col += uSunCol * glit * (1.0 - uNight*0.7);
          col += vec3(0.03)*vnoise(vPos.xz*0.9 + uTime*0.3)*(1.0-uNight);
          // foam lines washing against the quays and the breakwater
          float fm = vnoise(vPos.xz*0.55 + uTime*0.35)*0.55 + vnoise(vPos.xz*2.6 - uTime*0.9)*0.45;
          float foam = smoothstep(0.22, 0.5, shore) * (1.0 - smoothstep(0.72, 0.95, shore)) * smoothstep(0.5, 0.78, fm);
          col = mix(col, vec3(0.92, 0.95, 0.96), foam * 0.55 * (1.0 - uNight*0.9));
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
        for (let k = 0; k < 3; k++) { const wx = k * cw + 6, ww = cw - 12; glass(x, wx, y0 + slab + 2, ww, fh - slab - 2, '#6d8290'); x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(wx + ww * 0.5, y0 + slab, 2, fh - slab); lit(ex, wx + ww * 0.18, y0 + slab + (fh - slab) * 0.12, ww * 0.64, (fh - slab) * 0.55, 0.3); }
        x.fillStyle = 'rgba(232,234,238,0.78)'; x.fillRect(0, y0 + slab + fh * 0.3, S, fh * 0.42); // glass balustrade
        x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillRect(0, y0 + slab + fh * 0.72, S, 2); // handrail
        x.fillStyle = '#f7f5f0'; x.fillRect(0, y0, S, slab); x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, y0 + slab, S, 5); // white slab and shadow under it
        x.fillStyle = 'rgba(0,0,0,0.08)'; x.fillRect(0, y0 + slab - 3, S, 3); }
      finish(c, e); }
    // 2 · Glass tower
    { const [c, x] = mk(), [e, ex] = mk(); x.fillStyle = '#8fa8bc'; x.fillRect(0, 0, S, S); ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
      for (let f = 0; f < 2; f++) { const y0 = f * fh; const g = x.createLinearGradient(0, y0, 0, y0 + fh); g.addColorStop(0, '#c3d7e6'); g.addColorStop(0.45, '#98b3c8'); g.addColorStop(1, '#7c95aa'); x.fillStyle = g; x.fillRect(0, y0, S, fh);
        x.fillStyle = '#6b7c8a'; x.fillRect(0, y0 + fh * 0.78, S, fh * 0.22); // spandrel
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
    const groundU = { tShore: { value: BLACK1 }, uShoreSize: { value: 1.0 }, uHasShore: { value: 0 } }; m.userData.uniforms = groundU;
    m.onBeforeCompile = sh => {
      sh.uniforms.tWall = { value: con }; sh.uniforms.tShore = groundU.tShore; sh.uniforms.uShoreSize = groundU.uShoreSize; sh.uniforms.uHasShore = groundU.uHasShore;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aWall; varying float vWall; varying vec3 vWp;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvWall = aWall; vWp = (modelMatrix * vec4(position,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tWall, tShore; uniform float uShoreSize, uHasShore; varying float vWall; varying vec3 vWp;\n' + NOISE)
        .replace('#include <map_fragment>', `#ifdef USE_MAP
          vec4 capC = texture2D( map, vWp.xz / 4.0 );
          vec4 wallC = texture2D( tWall, vec2((vWp.x + vWp.z) / 3.0, vWp.y / 3.7) );
          // inland the slab reads as city ground: asphalt courtyards, plazas and pockets of green, not one endless paving
          float shore = 1.0; vec2 suv = vWp.xz / uShoreSize + 0.5;
          if (uHasShore > 0.5 && suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) shore = texture2D(tShore, suv).r;
          float inland = smoothstep(0.86, 0.985, shore);
          float nb = fbm(vWp.xz * 0.045); float nf = vnoise(vWp.xz * 0.9);
          vec3 asphalt = vec3(0.40, 0.40, 0.39) * (0.85 + 0.3 * nf);
          vec3 plaza = vec3(0.66, 0.63, 0.57) * (0.9 + 0.2 * nf);
          vec3 green = vec3(0.33, 0.44, 0.24) * (0.8 + 0.4 * nf);
          vec3 city = mix(asphalt, plaza, smoothstep(0.42, 0.55, nb)); city = mix(city, green, smoothstep(0.58, 0.68, nb));
          vec3 cap = mix(diffuseColor.rgb * capC.rgb, city, inland);
          vec3 wall = diffuseColor.rgb * wallC.rgb;
          diffuseColor.rgb = mix(cap, wall, vWall);
        #endif`);
    };
    return m;
  }

  /* ---------- Mediterranean trees (instanced, four species, vertex-coloured canopies) ----------
     k: 0 umbrella pine · 1 round broadleaf · 2 palm · 3 cypress */
  function makeTrees(positions) {
    const n = positions.length; if (!n) return new T.Group();
    const col = new T.Color();
    const paintNoise = (g, base, spread) => { const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 0.72 + 0.28 * Math.min(1, Math.max(0, y / 4)) + (Math.sin(p.getX(i) * 7.1 + p.getZ(i) * 5.3) * 0.5 + 0.5) * spread; col.setHex(base).multiplyScalar(k); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; } g.setAttribute('color', new T.BufferAttribute(c, 3)); return g; };
    const paintFlat = (g, hex) => { const p = g.attributes.position, c = new Float32Array(p.count * 3); col.setHex(hex); for (let i = 0; i < p.count; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; } g.setAttribute('color', new T.BufferAttribute(c, 3)); return g; };
    const merge = list => { const parts = list.map(g => g.index ? g.toNonIndexed() : g); let cnt = 0; parts.forEach(g => cnt += g.attributes.position.count); const pos = new Float32Array(cnt * 3), nor = new Float32Array(cnt * 3), cc = new Float32Array(cnt * 3); let o = 0; parts.forEach(g => { pos.set(g.attributes.position.array, o * 3); if (!g.attributes.normal) g.computeVertexNormals(); nor.set(g.attributes.normal.array, o * 3); cc.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }); const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('color', new T.BufferAttribute(cc, 3)); return out; };
    const sph = (r, x, y, z, sy) => { const g = new T.IcosahedronGeometry(r, 1); g.scale(1, sy || 1, 1); g.translate(x, y, z); return g; };
    const cyl = (rt, rb, h, x, y, z) => { const g = new T.CylinderGeometry(rt, rb, h, 7); g.translate(x, y, z); return g; };
    const BARK = 0x5e4632, PINE = 0x3b6636, LEAF = 0x5f8a44, PALM = 0x4f8a3e, CYP = 0x2f4f2e;
    // umbrella pine: tall bare trunk, flat spreading crown of overlapping domes
    const pine = merge([paintFlat(cyl(0.22, 0.42, 6.5, 0, 3.25, 0), BARK), paintFlat(cyl(0.12, 0.2, 2.2, 0.9, 6.6, 0.3), BARK), paintFlat(cyl(0.12, 0.2, 2.2, -0.8, 6.6, -0.4), BARK),
      paintNoise(sph(2.6, 0, 7.6, 0, 0.55), PINE, 0.2), paintNoise(sph(2.1, 1.7, 7.9, 0.9, 0.55), PINE, 0.25), paintNoise(sph(2.0, -1.5, 7.8, -1.1, 0.55), PINE, 0.25), paintNoise(sph(1.7, 0.4, 8.3, -1.6, 0.6), PINE, 0.25), paintNoise(sph(1.6, -0.6, 8.4, 1.5, 0.6), PINE, 0.25)]);
    // round broadleaf: short trunk, cluster of blobs
    const round = merge([paintFlat(cyl(0.18, 0.3, 2.4, 0, 1.2, 0), BARK), paintNoise(sph(1.9, 0, 3.9, 0, 1.05), LEAF, 0.3), paintNoise(sph(1.4, 1.1, 3.4, 0.6, 1), LEAF, 0.3), paintNoise(sph(1.3, -1.0, 3.6, -0.5, 1), LEAF, 0.3), paintNoise(sph(1.2, 0.2, 4.9, 0.4, 1), LEAF, 0.3), paintNoise(sph(1.1, -0.4, 3.2, 1.2, 1), LEAF, 0.3)]);
    // palm: slightly leaning ringed trunk, eight drooping fronds and a coconut cluster
    const palmParts = [paintFlat(cyl(0.16, 0.26, 7.5, 0, 3.75, 0), 0x7a6650)];
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const f = new T.BoxGeometry(3.4, 0.08, 0.7); f.translate(1.7, 0, 0); f.rotateZ(-0.55 - (i % 2) * 0.35); f.rotateY(a); f.translate(0, 7.6, 0); palmParts.push(paintNoise(f, PALM, 0.35)); }
    palmParts.push(paintFlat(sph(0.45, 0, 7.4, 0, 1), 0x8a7a3a));
    const palm = merge(palmParts);
    // cypress: tall narrow spire
    const cypress = merge([paintFlat(cyl(0.12, 0.18, 1.2, 0, 0.6, 0), BARK), paintNoise((() => { const g = new T.ConeGeometry(0.9, 7.5, 7); g.translate(0, 4.6, 0); return g; })(), CYP, 0.25)]);
    const specs = [pine, round, palm, cypress];
    const counts = [0, 0, 0, 0]; positions.forEach(p => counts[p.k] = (counts[p.k] || 0) + 1);
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    const g = new T.Group(); const o = new T.Object3D(); const idx = [0, 0, 0, 0];
    const meshes = specs.map((geo, k) => { const m = new T.InstancedMesh(geo, mat, Math.max(1, counts[k])); m.count = counts[k]; return m; });
    positions.forEach(p => {
      const k = p.k, s = p.s || 1; const m = meshes[k];
      o.position.set(p.x, p.y, p.z); o.rotation.set(0, (p.x * 0.37 + p.z * 0.11) % 6.283, 0); o.scale.set(s, s * (k === 3 ? 1.1 : 1), s); o.updateMatrix(); m.setMatrixAt(idx[k], o.matrix);
      col.setHSL(k === 2 ? 0.26 : 0.29 + ((p.x * 13.1 + p.z * 7.7) % 1) * 0.06, 0.38, 0.9 + ((p.z * 3.3) % 1) * 0.2); m.setColorAt(idx[k], col); idx[k]++;
    });
    meshes.forEach(m => { if (m.count) { m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; g.add(m); } });
    return g;
  }

  global.MYSFX = { makeSky, makeWater, makePost, makeFacadeTextures, facadeMaterial, makeTrees, makeGroundMaterial, makeTerrainMaterial, makeBirds, makeShoreMask };
})(window);
