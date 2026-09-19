"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// ═════════════════════════════════════════════════════════════
// SHARED REF TYPES
// ═════════════════════════════════════════════════════════════
type MouseState = { x: number; y: number; tx: number; ty: number };
type ScrollState = {
  raw: number;
  progress: number;
  smooth: number;
  velocity: number;
  boost: number;
};

const SCROLL_EASE_EXP = 0.75;

// ═════════════════════════════════════════════════════════════
// NEBULA (world-anchored for parallax)
// ═════════════════════════════════════════════════════════════
const nebulaVertex = /* glsl */ `
  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uIntro;
  uniform float uBoost;
  uniform float uProgress;

  attribute float aSeed;
  attribute float aSize;

  varying float vAlpha;
  varying float vSeed;
  varying float vHeat;

  vec3 curl(vec3 p, float t) {
    return vec3(
      sin(p.y * 0.4 + t * 0.3) + cos(p.z * 0.3 + t * 0.4),
      sin(p.z * 0.35 + t * 0.25) + cos(p.x * 0.4 + t * 0.35),
      sin(p.x * 0.3 + t * 0.35) + cos(p.y * 0.35 + t * 0.3)
    );
  }

  void main() {
    vec3 pos = position;
    float flow = 0.5 + uBoost * 0.8 + uProgress * 0.6;
    float t = uTime * flow + aSeed * 10.0;
    pos += curl(pos * 0.3, t) * (0.9 + uBoost * 0.4 + uProgress * 0.45);
    pos.y += sin(uTime * 0.3 + aSeed * 6.28) * 0.6;
    pos *= 1.0 + uProgress * 0.18;

    float depth = smoothstep(-15.0, 15.0, pos.z);
    pos.xy += uMouse * (0.3 + depth * 0.9);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float dist = max(-mv.z, 0.001);
    gl_PointSize = min(aSize * (220.0 / dist) * (1.0 + uProgress * 0.5), 64.0);

    float near = smoothstep(0.5, 3.0, dist);
    float far  = 1.0 - smoothstep(5.0, 70.0, dist);
    vAlpha = near * far * uIntro * (0.85 + uProgress * 0.35);

    vHeat = clamp(0.35 + 0.65 * uBoost + uProgress * 0.6, 0.0, 1.0);
    vSeed = aSeed;
  }
`;

const nebulaFragment = /* glsl */ `
  varying float vAlpha;
  varying float vSeed;
  varying float vHeat;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float a = 1.0 - smoothstep(0.0, 0.5, d);
    a = pow(a, 1.5);

    vec3 ember  = vec3(0.65, 0.10, 0.03);
    vec3 red    = vec3(0.92, 0.18, 0.06);
    vec3 orange = vec3(1.00, 0.52, 0.12);
    vec3 yellow = vec3(1.00, 0.85, 0.35);
    vec3 white  = vec3(1.00, 0.97, 0.80);

    vec3 color = mix(ember, red, smoothstep(0.0, 0.35, vSeed));
    color = mix(color, orange, smoothstep(0.30, 0.70, vSeed));
    color = mix(color, yellow, smoothstep(0.55, 0.95, vSeed) * vHeat);
    color = mix(color, white, smoothstep(0.85, 1.00, vHeat));

    gl_FragColor = vec4(color, a * vAlpha * 0.9);
  }
`;

function Nebula({
  mouseRef,
  scrollRef,
}: {
  mouseRef: React.RefObject<MouseState>;
  scrollRef: React.RefObject<ScrollState>;
}) {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 5000;

  const { positions, seeds, sizes } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const sizes = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const r = Math.pow(Math.random(), 0.5) * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.7;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      seeds[i] = Math.random();
      sizes[i] = 0.5 + Math.random() * 2.6;
    }
    return { positions, seeds, sizes };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const uniforms = useMemo(
    () => ({
      uTime:     { value: 0 },
      uMouse:    { value: new THREE.Vector2() },
      uIntro:    { value: 0 },
      uBoost:    { value: 0 },
      uProgress: { value: 0 },
    }),
    [],
  );

  useFrame((state, delta) => {
    if (!ref.current) return;
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uIntro.value = Math.min(1, uniforms.uIntro.value + delta * 0.4);

    const sc = scrollRef.current;
    const boost = sc?.boost ?? 0;
    const progress = sc?.smooth ?? 0;

    uniforms.uBoost.value    += (boost - uniforms.uBoost.value) * Math.min(1, delta * 3);
    uniforms.uProgress.value += (progress - uniforms.uProgress.value) * Math.min(1, delta * 3);

    const m = mouseRef.current;
    uniforms.uMouse.value.x += (m.x - uniforms.uMouse.value.x) * delta * 1.5;
    uniforms.uMouse.value.y += (m.y - uniforms.uMouse.value.y) * delta * 1.5;

    ref.current.rotation.y += delta * (0.015 + boost * 0.18 + progress * 0.08);
    ref.current.rotation.x += delta * (boost * 0.05 + progress * 0.03);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed"   args={[seeds, 1]} />
        <bufferAttribute attach="attributes-aSize"   args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={nebulaVertex}
        fragmentShader={nebulaFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ═════════════════════════════════════════════════════════════
// FIRE SNOW — camera-anchored, denser, brighter, in-front-of-camera
// ═════════════════════════════════════════════════════════════
const fireVertex = /* glsl */ `
  uniform float uTime;
  uniform float uFall;
  uniform float uBoost;
  uniform float uProgress;
  uniform vec2  uMouse;

  attribute float aSeed;
  attribute float aSize;
  attribute float aSpeed;

  varying float vAlpha;
  varying float vSeed;
  varying float vTwinkle;
  varying float vHot;

  void main() {
    vec3 pos = position;

    // Wrap range matches the ±55 distribution in the buffer
    float fallRange = 110.0;

    // Snow-fall pace — gentle, picks up with scroll
    float fallSpeed = aSpeed * (0.55 + uBoost * 1.2 + uProgress * 0.6);
    pos.y = mod(pos.y - uTime * fallSpeed, fallRange) - fallRange * 0.5;

    // Convection drift
    float drift = 0.5 + uBoost * 0.5 + uProgress * 0.6;
    pos.x += sin(uTime * 0.6 + aSeed * 6.28) * drift;
    pos.z += cos(uTime * 0.5 + aSeed * 6.28) * drift;

    // Mouse wind
    pos.x += uMouse.x * (1.0 + aSeed * 0.4);
    pos.z += uMouse.y * 0.5;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float dist = max(-mv.z, 0.001);
    float depthScale = 1.0 + (1.0 - smoothstep(4.0, 30.0, dist)) * 0.8;

    // Bigger growth per story beat
    float storyScale = 1.0 + uProgress * 1.2 + uBoost * 0.5;

    // Bigger multiplier + higher clamp so sparks read clearly
    gl_PointSize = min(
      aSize * 340.0 / dist * depthScale * uFall * storyScale,
      130.0
    );

    // Softer edge fades — we WANT particles visible near the frame edges
    float fallProgress = (pos.y + fallRange * 0.5) / fallRange;
    float bottomFade = smoothstep(0.0, 0.04, fallProgress);
    float topFade    = 1.0 - smoothstep(0.96, 1.0, fallProgress);
    float edgeFade   = bottomFade * topFade;

    // Spec-safe near fade — only culls things basically AT the lens
    float nearFade = smoothstep(0.15, 0.9, dist);

    float twinkleRate = 2.5 + uBoost * 4.0 + uProgress * 2.0;
    vTwinkle = 0.65 + 0.35 * sin(uTime * twinkleRate + aSeed * 20.0);

    vHot = 1.0 - fallProgress;

    // MUCH stronger base alpha so sparks actually show up
    vAlpha = edgeFade * nearFade * uFall * vTwinkle *
             (1.2 + uBoost * 0.7 + uProgress * 0.9);

    vSeed = aSeed;
  }
`;

const fireFragment = /* glsl */ `
  varying float vAlpha;
  varying float vSeed;
  varying float vTwinkle;
  varying float vHot;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float a = 1.0 - smoothstep(0.0, 0.5, d);
    a = pow(a, 1.6);

    vec3 ember  = vec3(0.75, 0.15, 0.05);
    vec3 red    = vec3(1.00, 0.28, 0.08);
    vec3 orange = vec3(1.00, 0.60, 0.15);
    vec3 yellow = vec3(1.00, 0.90, 0.45);
    vec3 white  = vec3(1.00, 0.98, 0.90);

    float heat = clamp(vSeed * 0.45 + vHot * 0.35 + 0.55, 0.0, 1.0);

    vec3 color = mix(ember, red, smoothstep(0.0, 0.30, heat));
    color = mix(color, orange, smoothstep(0.25, 0.60, heat));
    color = mix(color, yellow, smoothstep(0.55, 0.90, heat));
    color = mix(color, white, smoothstep(0.85, 1.00, heat));

    // Bright incandescent core
    float core = pow(1.0 - smoothstep(0.0, 0.5, d), 5.0);
    color += vec3(1.0, 0.90, 0.65) * core * 1.1 * vTwinkle;

    gl_FragColor = vec4(color, a * vAlpha);
  }
`;

function FireSnow({
  mouseRef,
  scrollRef,
}: {
  mouseRef: React.RefObject<MouseState>;
  scrollRef: React.RefObject<ScrollState>;
}) {
  const ref = useRef<THREE.Points>(null);
  const { camera } = useThree();

  // 2× the particle count for real density
  const COUNT = 12000;

  const { positions, seeds, sizes, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const sizes = new Float32Array(COUNT);
    const speeds = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      // Box sized to cover a 60° fov across the useful depth range,
      // and biased toward the front half so close-range sparks are dense.
      const depth = Math.pow(Math.random(), 0.6) * 60; // 0..60, biased near 0
      const z = -depth;

      // Spread widens with depth to roughly match the frustum
      const maxX = 12 + depth * 1.4;
      const maxY = 8  + depth * 0.95;

      positions[i * 3]     = (Math.random() - 0.5) * 2 * maxX;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2 * maxY;
      positions[i * 3 + 2] = z;

      seeds[i]  = Math.random();
      sizes[i]  = 0.6 + Math.random() * 2.4;
      speeds[i] = 0.35 + Math.random() * 0.75;
    }
    return { positions, seeds, sizes, speeds };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const uniforms = useMemo(
    () => ({
      uTime:     { value: 0 },
      uFall:     { value: 0 },
      uBoost:    { value: 0 },
      uProgress: { value: 0 },
      uMouse:    { value: new THREE.Vector2() },
    }),
    [],
  );

  useFrame((state, delta) => {
    if (!ref.current) return;

    // Anchor the fire field to the camera (small lag for parallax)
    const lag = Math.min(1, delta * 6);
    ref.current.position.x += (camera.position.x - ref.current.position.x) * lag;
    ref.current.position.y += (camera.position.y - ref.current.position.y) * lag;
    ref.current.position.z += (camera.position.z - ref.current.position.z) * lag;

    uniforms.uTime.value = state.clock.elapsedTime;
    // Faster intro fade-in so sparks appear almost immediately
    uniforms.uFall.value = Math.min(1, uniforms.uFall.value + delta * 0.6);

    const sc = scrollRef.current;
    const boost = sc?.boost ?? 0;
    const progress = sc?.smooth ?? 0;

    uniforms.uBoost.value    += (boost - uniforms.uBoost.value) * Math.min(1, delta * 3);
    uniforms.uProgress.value += (progress - uniforms.uProgress.value) * Math.min(1, delta * 2.5);

    const m = mouseRef.current;
    uniforms.uMouse.value.x += (m.x - uniforms.uMouse.value.x) * delta * 1.2;
    uniforms.uMouse.value.y += (m.y - uniforms.uMouse.value.y) * delta * 1.2;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed"   args={[seeds, 1]} />
        <bufferAttribute attach="attributes-aSize"   args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aSpeed"  args={[speeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={fireVertex}
        fragmentShader={fireFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ═════════════════════════════════════════════════════════════
// ORBITING SHAPES — slow, story-driven orbit and growth
// ═════════════════════════════════════════════════════════════
type OrbitConfig = {
  kind: "ico" | "octa" | "torus" | "dodeca" | "knot" | "tetra";
  radius: number;
  speed: number;
  phase: number;
  yAmp: number;
  ySpeed: number;
  scale: number;
  color: string;
  tilt: number;
};

const ORBITS: OrbitConfig[] = [
  { kind: "ico",    radius: 7.5,  speed:  0.18, phase: 0.0, yAmp: 1.5, ySpeed: 0.4,  scale: 1.4, color: "#fb923c", tilt:  0.3 },
  { kind: "octa",   radius: 8.5,  speed: -0.14, phase: 1.2, yAmp: 1.2, ySpeed: 0.5,  scale: 1.6, color: "#f97316", tilt: -0.2 },
  { kind: "torus",  radius: 6.5,  speed:  0.22, phase: 2.4, yAmp: 2.0, ySpeed: 0.3,  scale: 1.2, color: "#ef4444", tilt:  0.5 },
  { kind: "dodeca", radius: 9.0,  speed: -0.12, phase: 3.6, yAmp: 1.0, ySpeed: 0.6,  scale: 1.5, color: "#fdba74", tilt: -0.4 },
  { kind: "knot",   radius: 10.5, speed:  0.10, phase: 4.8, yAmp: 1.8, ySpeed: 0.35, scale: 1.0, color: "#ea580c", tilt:  0.6 },
  { kind: "tetra",  radius: 7.0,  speed: -0.20, phase: 5.5, yAmp: 1.3, ySpeed: 0.45, scale: 1.3, color: "#fbbf24", tilt: -0.5 },
  { kind: "ico",    radius: 11.5, speed:  0.08, phase: 0.8, yAmp: 0.8, ySpeed: 0.25, scale: 1.1, color: "#dc2626", tilt:  0.25 },
  { kind: "octa",   radius: 12.0, speed: -0.07, phase: 2.9, yAmp: 1.5, ySpeed: 0.3,  scale: 1.4, color: "#fb7185", tilt: -0.35 },
];

function geometryFor(kind: OrbitConfig["kind"]) {
  switch (kind) {
    case "ico":    return new THREE.IcosahedronGeometry(1, 0);
    case "octa":   return new THREE.OctahedronGeometry(1, 0);
    case "torus":  return new THREE.TorusGeometry(1, 0.35, 10, 30);
    case "dodeca": return new THREE.DodecahedronGeometry(1, 0);
    case "knot":   return new THREE.TorusKnotGeometry(1, 0.3, 60, 8, 2, 3);
    case "tetra":  return new THREE.TetrahedronGeometry(1, 0);
  }
}

function OrbitingShape({
  config,
  index,
  mouseRef,
  scrollRef,
  positionRegistry,
}: {
  config: OrbitConfig;
  index: number;
  mouseRef: React.RefObject<MouseState>;
  scrollRef: React.RefObject<ScrollState>;
  positionRegistry: React.MutableRefObject<THREE.Vector3[]>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef  = useRef<THREE.MeshBasicMaterial>(null);
  const accum   = useRef({ angle: config.phase, spin: 0 });

  const geometry = useMemo(() => geometryFor(config.kind), [config.kind]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const sc = scrollRef.current;
    const s = sc?.smooth ?? 0;
    const v = sc?.velocity ?? 0;
    const boost = sc?.boost ?? 0;
    const m = mouseRef.current;

    const speedMult = 1 + boost * 1.6 + s * 0.9;
    accum.current.angle += delta * config.speed * speedMult;
    accum.current.spin  += delta * v * 1.5;

    const angle = accum.current.angle + accum.current.spin;
    const radiusNow = config.radius * (1 + s * 0.15);

    const x = Math.cos(angle) * radiusNow;
    const z = Math.sin(angle) * radiusNow;
    const y = Math.sin(t * config.ySpeed + config.phase) * config.yAmp;

    const mouseInfluence = 0.15;
    meshRef.current.position.set(
      x + m.x * radiusNow * mouseInfluence,
      y - m.y * config.yAmp * mouseInfluence * 2,
      z,
    );

    meshRef.current.rotation.x = t * 0.3 + config.tilt + s * Math.PI * 1.2;
    meshRef.current.rotation.y = t * 0.5 + config.phase + s * Math.PI * 1.8 + v * 1.2;
    meshRef.current.rotation.z = Math.sin(t * 0.4) * 0.2 + s * Math.PI * 0.8;

    const pulse = 1 + Math.sin(t * 1.5 + config.phase) * 0.08;
    const storyGrow = 1 + s * 1.4 + Math.abs(v) * 0.25 + boost * 0.4;
    meshRef.current.scale.setScalar(config.scale * pulse * storyGrow);

    if (matRef.current) {
      const target = 0.4 + s * 0.35 + boost * 0.15;
      matRef.current.opacity +=
        (target - matRef.current.opacity) * Math.min(1, delta * 3);
    }

    positionRegistry.current[index].copy(meshRef.current.position);
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial
        ref={matRef}
        color={config.color}
        wireframe
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// ═════════════════════════════════════════════════════════════
// CONNECTIONS — dynamic glowing lines between nearby shapes
// ═════════════════════════════════════════════════════════════
function Connections({
  positionRegistry,
  scrollRef,
}: {
  positionRegistry: React.MutableRefObject<THREE.Vector3[]>;
  scrollRef: React.RefObject<ScrollState>;
}) {
  const MAX_SEGMENTS = 96;
  const matRef = useRef<THREE.LineBasicMaterial>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(MAX_SEGMENTS * 2 * 3);
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    g.setDrawRange(0, 0);
    return g;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    const pts = positionRegistry.current;
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    let segIdx = 0;

    const sc = scrollRef.current;
    const boost = sc?.boost ?? 0;
    const progress = sc?.smooth ?? 0;

    const linkDist = 5.5 + boost * 1.5 + progress * 2.0;

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (segIdx >= MAX_SEGMENTS) break;
        const dist = pts[i].distanceTo(pts[j]);
        if (dist < linkDist) {
          arr[segIdx * 6]     = pts[i].x;
          arr[segIdx * 6 + 1] = pts[i].y;
          arr[segIdx * 6 + 2] = pts[i].z;
          arr[segIdx * 6 + 3] = pts[j].x;
          arr[segIdx * 6 + 4] = pts[j].y;
          arr[segIdx * 6 + 5] = pts[j].z;
          segIdx++;
        }
      }
    }

    geometry.setDrawRange(0, segIdx * 2);
    attr.needsUpdate = true;

    if (matRef.current) {
      const target = 0.22 + boost * 0.3 + progress * 0.22;
      matRef.current.opacity +=
        (target - matRef.current.opacity) * Math.min(1, delta * 5);
    }
  });

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        ref={matRef}
        color="#fb923c"
        transparent
        opacity={0.22}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

// ═════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════
function ScrollDriver({
  scrollRef,
}: {
  scrollRef: React.RefObject<ScrollState>;
}) {
  useFrame((_, delta) => {
    const s = scrollRef.current;
    if (!s) return;

    s.progress = Math.min(1, Math.pow(Math.max(0, s.raw), SCROLL_EASE_EXP));

    const k = Math.min(1, delta * 4);
    const prev = s.smooth;
    s.smooth += (s.progress - s.smooth) * k;

    s.velocity = delta > 0 ? (s.smooth - prev) / delta : 0;

    const target = Math.min(1.0, Math.abs(s.velocity) * 1.0);
    s.boost += (target - s.boost) * Math.min(1, delta * 4);
    s.boost *= Math.pow(0.35, delta);
  });
  return null;
}

function MouseTracker({
  mouseRef,
}: {
  mouseRef: React.RefObject<MouseState>;
}) {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const m = mouseRef.current;
      m.tx = (e.clientX / window.innerWidth) * 2 - 1;
      m.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mouseRef]);

  useFrame((_, delta) => {
    const m = mouseRef.current;
    const k = Math.min(1, delta * 4);
    m.x += (m.tx - m.x) * k;
    m.y += (m.ty - m.y) * k;
  });

  return null;
}

function ScrollCamera({
  scrollRef,
}: {
  scrollRef: React.RefObject<ScrollState>;
}) {
  const { camera } = useThree();
  useFrame((_, delta) => {
    const s = scrollRef.current;
    if (!s) return;
    const targetZ = 16 - s.smooth * 5;
    const targetY = s.smooth * 0.9;
    const k = Math.min(1, delta * 2.5);
    camera.position.z += (targetZ - camera.position.z) * k;
    camera.position.y += (targetY - camera.position.y) * k;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ═════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════
export function ThreeBackground() {
  const mouseRef = useRef<MouseState>({ x: 0, y: 0, tx: 0, ty: 0 });
  const scrollRef = useRef<ScrollState>({
    raw: 0,
    progress: 0,
    smooth: 0,
    velocity: 0,
    boost: 0,
  });

  const positionRegistry = useRef<THREE.Vector3[]>(
    ORBITS.map(() => new THREE.Vector3()),
  );

  const [active, setActive] = useState(true);
  useEffect(() => {
    const onVis = () => setActive(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current.raw = max > 0 ? window.scrollY / max : 0;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 0, 16], fov: 60 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
      >
        <ScrollDriver scrollRef={scrollRef} />
        <MouseTracker mouseRef={mouseRef} />
        <ScrollCamera scrollRef={scrollRef} />

        {/* World-anchored background — gives parallax as camera dollies */}
        <Nebula mouseRef={mouseRef} scrollRef={scrollRef} />

        {/* Camera-anchored — fills the screen no matter where we are */}
        <FireSnow mouseRef={mouseRef} scrollRef={scrollRef} />

        <group>
          {ORBITS.map((config, i) => (
            <OrbitingShape
              key={i}
              index={i}
              config={config}
              mouseRef={mouseRef}
              scrollRef={scrollRef}
              positionRegistry={positionRegistry}
            />
          ))}
        </group>

        <Connections
          positionRegistry={positionRegistry}
          scrollRef={scrollRef}
        />
      </Canvas>
    </div>
  );
}