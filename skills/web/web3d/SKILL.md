---
name: web3d-webgl
description: >
  Use this skill when the user says 'Three.js', 'React Three Fiber', 'R3F', 'drei', '3D in the browser', 'GLTF model loading', 'product configurator 3D', 'WebGL scene performance', 'three.js memory leak'. It builds and optimises Three.js / React Three Fiber scenes: renderer setup, GLTF/Draco/KTX2 loading, instancing, resize and DPR handling, disposal, and frame-loop rules. Do NOT use for: raw WebGPU/WebGL pipeline code (use webgpu-webgl-rendering), game engines (use the game skills), or CSS 3D transforms (use frontend-animation).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [web, 3d, threejs, react-three-fiber, webgl, webgpu, gltf]
---

# Web3D with Three.js & React Three Fiber

## Purpose
Three.js is the dominant scene-graph library for WebGL (and WebGPU through `WebGPURenderer`); React Three Fiber (R3F) is its React renderer. This skill produces scenes that load fast (compressed assets), render efficiently (few draw calls, capped pixel ratio, on-demand rendering) and do not leak GPU memory.

## Agent Protocol

### Trigger
"three.js", "threejs", "react three fiber", "r3f", "drei", "gltf", "glb", "draco", "ktx2", "3d configurator", "webgl scene slow".

### Input Context
- Plain Three.js or R3F (React version: R3F v9 pairs with React 19, v8 with React 18).
- Asset types and sizes (GLB, textures), target devices (mobile?).
- Interactivity: static viewer, configurator, continuous animation.

### Output Artifact
Scene setup code, asset pipeline commands, performance settings.

### Response Format
```
Renderer: {WebGLRenderer|WebGPURenderer}  DPR cap: {n}
Assets: {file -> compression (Draco/Meshopt, KTX2)}
Draw calls target: {n}
Render loop: {continuous|on-demand}
Cleanup: {dispose strategy}
```

## Plain Three.js Setup

```ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export async function createViewer(container: HTMLElement, modelUrl: string) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace; // default since r152
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(2, 1.5, 3);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(5, 10, 7);
  scene.add(sun);

  const draco = new DRACOLoader().setDecoderPath('/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await loader.loadAsync(modelUrl);
  scene.add(gltf.scene);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const resize = new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = container;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resize.observe(container);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  return function dispose() {
    renderer.setAnimationLoop(null);
    resize.disconnect();
    controls.dispose();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of materials) {
          for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
          m.dispose();
        }
      }
    });
    draco.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
```
Lights use physically based units (r155+ default): old examples with `PointLight(0xffffff, 1, 100)` look far too dark; increase intensity or use directional/hemisphere/environment lighting.

## React Three Fiber

```tsx
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import type { Mesh } from 'three';

function Spinner() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.5; // frame-rate independent
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url); // Draco decoding supported via drei defaults
  return <primitive object={scene} />;
}

export default function Viewer() {
  return (
    <div style={{ height: '100vh' }}>
      <Canvas dpr={[1, 2]} camera={{ position: [2, 1.5, 3], fov: 45 }} frameloop="demand">
        <Suspense fallback={null}>
          <Environment preset="studio" />
          <Model url="/models/chair.glb" />
          <Spinner />
        </Suspense>
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
useGLTF.preload('/models/chair.glb');
```
- Never `setState` inside `useFrame`; mutate refs.
- `frameloop="demand"` renders only on changes (controls call `invalidate()`); with continuous animation like `Spinner` use the default `"always"`.
- The `attach="geometry"`/`attach="material"` props from old examples are unnecessary; children attach automatically.
- R3F disposes objects it created on unmount; objects passed via `<primitive>` are yours to dispose.

## Asset Pipeline
```bash
# Inspect and optimise a GLB: dedupe, prune, compress geometry and textures
npx @gltf-transform/cli inspect model.glb
npx @gltf-transform/cli optimize model.glb model.opt.glb --compress draco --texture-compress ktx2
```
- KTX2/Basis textures stay compressed in GPU memory (PNG/JPEG expand to full RGBA); load with `KTX2Loader` (`.detectSupport(renderer)`).
- Meshopt (`--compress meshopt`) decodes faster than Draco; both need the matching decoder on the loader.
- Generate typed R3F components from GLBs with `npx gltfjsx model.glb --transform`.

## Performance Rules
| Problem | Fix |
|---------|-----|
| Many identical meshes | `InstancedMesh` (drei `<Instances>`) — one draw call |
| Many unique static meshes | Merge geometries (`BufferGeometryUtils.mergeGeometries`) |
| High-DPI phones overheating | Cap DPR at 2 (or adaptive with drei `PerformanceMonitor`) |
| Real-time shadows everywhere | Bake lighting/AO into textures, `ContactShadows`, limit shadow-casting lights |
| Constant 60 fps render of static viewer | On-demand rendering |
| Post-processing stack | Use sparingly; each pass is a full-screen draw |

Check `renderer.info.render.calls` and `renderer.info.memory` during development; use `stats-gl` or `r3f-perf` overlays.

## WebGPU
`import * as THREE from 'three/webgpu'` provides `WebGPURenderer`, which falls back to a WebGL2 backend automatically; it uses TSL (Three Shading Language) node materials instead of `ShaderMaterial` GLSL. Await `renderer.init()` before the first render when not using `setAnimationLoop`.

## Accessibility & UX
- Provide a static image fallback and text description for the 3D content.
- Do not hijack page scroll with orbit controls on mobile; require a tap to interact.
- Respect `prefers-reduced-motion` for auto-rotation.

## Anti-patterns
| Anti-pattern | Fix |
|--------------|-----|
| Creating geometries/materials inside the render loop | Create once, reuse |
| Not disposing on unmount/route change | `dispose()` geometries, materials, textures, renderer |
| 20 MB uncompressed GLB | gltf-transform optimize + KTX2 |
| `requestAnimationFrame` loop that never stops | `setAnimationLoop(null)` on teardown |
| Forgetting resize handling | ResizeObserver on the container |

## Checklist
- [ ] Assets compressed (Draco/Meshopt + KTX2) and preloaded.
- [ ] DPR capped; draw calls measured.
- [ ] On-demand rendering for static scenes.
- [ ] Full disposal on teardown verified via `renderer.info.memory`.
- [ ] Non-3D fallback and reduced-motion support.
