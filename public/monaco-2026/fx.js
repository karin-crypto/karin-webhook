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
          }
          // stars + moon at night
          if (uNight > 0.5 && d.y > 0.0) {
            vec2 suv = d.xz / (d.y + 0.2) * 260.0;
            float s = step(0.9975, hash21(floor(suv))) * pow(h, 0.5);
            c += vec3(s)*0.9*(0.6+0.4*vnoise(suv*0.5+uTime));
            float m = smoothstep(0.9982, 0.9992, dot(d, normalize(vec3(-0.5,0.45,-0.6))));
            c += vec3(0.95,0.95,0.85)*m*1.0;
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
    const uFinal = { tex: { value: sceneRT.texture }, tAO: { value: aoBlurRT.texture }, tBloom: { value: blurB.texture }, uBloom: { value: 0.35 }, uTime: { value: 0 }, uVignette: { value: 0.32 }, uAOStrength: { value: 1.0 } };
    const fin = mk(`uniform sampler2D tex, tAO, tBloom; uniform float uBloom, uTime, uVignette, uAOStrength; varying vec2 vUv; ${NOISE}
      void main(){
        vec3 c = texture2D(tex, vUv).rgb;
        float ao = mix(1.0, texture2D(tAO, vUv).r, uAOStrength);
        c *= ao;
        c += texture2D(tBloom, vUv).rgb * uBloom;
        vec2 q = vUv - 0.5; float vig = 1.0 - dot(q, q) * uVignette * 1.6;
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
      render(scene, camera, night, time) {
        uAO.uNear.value = camera.near; uAO.uFar.value = camera.far; uAO.uRes.value.set(Math.round(w / 2), Math.round(h / 2));
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

  /* ---------- facade textures (procedural) ---------- */
  function makeFacadeTextures() {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const e = document.createElement('canvas'); e.width = e.height = S; const ex = e.getContext('2d');
    // tile = 6 m x 6 m : 2 floors x 3 windows
    x.fillStyle = '#e8dfcf'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${120 + Math.random() * 60 | 0},${100 + Math.random() * 50 | 0},${80 + Math.random() * 40 | 0},${0.05 + Math.random() * 0.08})`; x.fillRect(Math.random() * S, Math.random() * S, 3, 3); }
    x.fillStyle = 'rgba(0,0,0,0.10)'; x.fillRect(0, S / 2 - 2, S, 3); x.fillRect(0, S - 3, S, 3); // floor slabs
    ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
    const cw = S / 3, fh = S / 2;
    for (let f = 0; f < 2; f++) for (let k = 0; k < 3; k++) {
      const wx = k * cw + cw * 0.28, wy = f * fh + fh * 0.22, ww = cw * 0.44, wh = fh * 0.52;
      x.fillStyle = '#20303f'; x.fillRect(wx, wy, ww, wh);
      x.fillStyle = 'rgba(160,200,230,0.35)'; x.fillRect(wx, wy, ww, wh * 0.35);
      x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(wx - 3, wy - 3, ww + 6, 3); // lintel
      x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(wx, wy + wh, ww, 3);
      // balcony rail under windows
      x.fillStyle = 'rgba(70,70,70,0.55)'; x.fillRect(wx - 6, wy + wh + 4, ww + 12, 2);
      const lit = Math.random(); if (lit < 0.55) { ex.fillStyle = lit < 0.2 ? '#ffd9a0' : lit < 0.4 ? '#ffe9c0' : '#c9d9ff'; ex.fillRect(wx, wy, ww, wh); }
    }
    const map = new T.CanvasTexture(c); map.wrapS = map.wrapT = T.RepeatWrapping; map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
    const em = new T.CanvasTexture(e); em.wrapS = em.wrapT = T.RepeatWrapping; em.colorSpace = T.SRGBColorSpace;
    return { map, emissive: em };
  }
  function facadeMaterial(tex) {
    tex.map.repeat.set(1 / 6, 1 / 6); tex.emissive.repeat.set(1 / 6, 1 / 6);
    const m = new T.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissive, emissive: new T.Color(0xffffff), emissiveIntensity: 0, vertexColors: true, roughness: 0.85, metalness: 0.0 });
    m.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aWall; varying float vWall;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvWall = aWall;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWall;')
        .replace('#include <map_fragment>', `#ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vMapUv );
          diffuseColor *= mix(vec4(0.92,0.9,0.86,1.0), sampledDiffuseColor, vWall);
        #endif`)
        .replace('#include <emissivemap_fragment>', `#ifdef USE_EMISSIVEMAP
          vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
          totalEmissiveRadiance *= emissiveColor.rgb * vWall;
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

  global.MYSFX = { makeSky, makeWater, makePost, makeFacadeTextures, facadeMaterial, makeTrees };
})(window);
