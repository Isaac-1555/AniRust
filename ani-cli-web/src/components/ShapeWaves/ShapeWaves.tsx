import { useEffect, useRef, useState } from 'react';
import { Mesh, Program, Renderer, RenderTarget, Texture, Triangle } from 'ogl';

const SHAPE_MODES = { mixed: 0, squares: 1, circles: 2, triangles: 3 } as const;
export type ShapeWavesShapes = keyof typeof SHAPE_MODES;

const MAX_DPR = 1.5;
const MAX_MASK_SIZE = 1024;
const NOISE_CELLS = 32;
const TIME_RATE = 0.1;
const SIMULATION_STEP = 1 / 60;
const WAVE_SPEED = 0.42;
const WAVE_FRICTION = 0.94;
const WAVE_DECAY = 0.972;
const SETTLED_THRESHOLD = 0.01;
const INTRO_BAND = 0.2;
const INTRO_WARP = 0.3;
const INTRO_JITTER = 0.16;
const INTRO_END = 1 + INTRO_WARP + INTRO_JITTER + INTRO_BAND;
const GLOW_THRESHOLD = 0.6;

export interface ShapeWavesProps {
  text?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  textSize?: number;
  shapes?: ShapeWavesShapes;
  cellSize?: number;
  dotSize?: number;
  color?: string;
  hoverColor?: string;
  backgroundColor?: string;
  speed?: number;
  scale?: number;
  contrast?: number;
  brightness?: number;
  flow?: number;
  direction?: number;
  fade?: number;
  interactive?: boolean;
  splashRadius?: number;
  splashStrength?: number;
  glow?: number;
  intro?: boolean;
  introDuration?: number;
  introKey?: string | number;
  paused?: boolean;
  onError?: (error: Error) => void;
  className?: string;
}

interface ShapeWavesSettings {
  text: string;
  fontFamily: string;
  fontWeight: string | number;
  textSize: number;
  shapes: ShapeWavesShapes;
  cellSize: number;
  dotSize: number;
  color: string;
  hoverColor: string;
  backgroundColor: string;
  speed: number;
  scale: number;
  contrast: number;
  brightness: number;
  flow: number;
  direction: number;
  fade: number;
  interactive: boolean;
  splashRadius: number;
  splashStrength: number;
  glow: number;
  intro: boolean;
  introDuration: number;
  introKey: string | number;
  paused: boolean;
}

const VERTEX = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const SCENE_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;

in vec2 vUv;
out vec4 fragColor;

uniform vec2 uResolution;
uniform vec2 uOrigin;
uniform vec2 uDrift;
uniform float uRows;
uniform float uCols;
uniform float uCellPx;
uniform float uDotSize;
uniform float uMode;
uniform float uNoiseScale;
uniform float uThreshold;
uniform float uContrast;
uniform float uTime;
uniform float uHasMask;
uniform float uFade;
uniform float uIntroProgress;
uniform float uGlowFlag;
uniform vec3 uColor;
uniform vec3 uHover;
uniform vec3 uBackground;
uniform sampler2D uCharges;
uniform sampler2D uMask;

const vec2 SEED = vec2(12.9898, 78.233);

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fadeCurve(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec3 P) {
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(vec4(0.0), gx0) - 0.5);
  gy0 -= sz0 * (step(vec4(0.0), gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(vec4(0.0), gx1) - 0.5);
  gy1 -= sz1 * (step(vec4(0.0), gy1) - 0.5);

  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 f = fadeCurve(Pf0);
  vec4 nz = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), f.z);
  vec2 ny = mix(nz.xy, nz.zw, f.y);
  return 2.2 * mix(ny.x, ny.y, f.x);
}

float fbm(vec3 p) {
  float total = 0.0;
  float amplitude = 1.0;
  float weight = 0.0;
  float frequency = 1.0;
  for (int i = 0; i < 2; i++) {
    total += amplitude * cnoise(p * frequency);
    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return total / weight;
}

float sdIsoscelesTriangle(vec2 point, vec2 q) {
  vec2 p = vec2(abs(point.x), point.y);
  vec2 a = p - q * clamp(dot(p, q) / dot(q, q), 0.0, 1.0);
  vec2 b = p - q * vec2(clamp(p.x / q.x, 0.0, 1.0), 1.0);
  float s = -sign(q.y);
  vec2 d = min(vec2(dot(a, a), s * (p.x * q.y - p.y * q.x)), vec2(dot(b, b), s * (p.y - q.y)));
  return -sqrt(d.x) * sign(d.y);
}

float shapeDistance(vec2 p, int shape, float c) {
  if (shape == 0) { return max(abs(p.x), abs(p.y)) - c; }
  if (shape == 1) { return length(p) - c; }
  return sdIsoscelesTriangle(vec2(p.x, p.y + c), vec2(c, 2.0 * c));
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 resolution = uResolution;
  float cellPx = uCellPx;
  float dotSize = uDotSize;
  int mode = int(uMode + 0.5);
  int cols = int(uCols + 0.5);
  int rows = int(uRows + 0.5);
  vec3 background = uBackground;
  bool toSurface = uGlowFlag < 0.5;
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);

  vec2 pixel = uv * resolution;
  vec2 origin = uOrigin;
  vec2 cell = floor((pixel - origin) / cellPx);
  if (cell.y < 0.0 || int(cell.y) >= rows || cell.x < 0.0 || int(cell.x) >= cols) {
    fragColor = vec4(background, toSurface ? 1.0 : 0.0);
    return;
  }
  vec2 center = origin + (cell + 0.5) * cellPx;
  vec2 local = (pixel - center) / (cellPx * 0.5);
  vec2 cellUv = center / resolution;

  if (uHasMask > 0.5 && texture(uMask, cellUv).r > 0.5) {
    fragColor = vec4(background, toSurface ? 1.0 : 0.0);
    return;
  }

  float level = 1.0;
  float fade = uFade;
  if (fade > 0.0) {
    vec2 q = abs(uv * 2.0 - 1.0);
    float radius = pow(pow(q.x, 2.5) + pow(q.y, 2.5), 1.0 / 2.5) / pow(2.0, 1.0 / 2.5);
    level = 1.0 - smoothstep(max(0.0, 1.0 - fade * 2.2), 1.0, radius);
  }

  float noise = fbm(vec3((center + uDrift) / uNoiseScale + SEED, uTime));
  float tone = clamp((noise * 0.5 + 0.5 - uThreshold) * uContrast + 0.5, 0.0, 1.0);
  int band = int(min(tone, 0.999999) * 3.0);

  float charge = texture(uCharges, (cell + 0.5) / vec2(float(cols), float(rows))).r;
  int stepped = (band + int(clamp(charge, 0.0, 0.999) * 3.0)) % 3;

  int shape = 2 - stepped;
  float size = dotSize;
  if (mode != 0) {
    shape = mode - 1;
    size = dotSize * mix(0.45, 1.0, float(stepped) / 2.0);
  }

  float introProgress = uIntroProgress;
  float front = 0.0;
  if (introProgress < ${INTRO_END.toFixed(2)}) {
    float radial = length((center - resolution * 0.5) / (resolution * 0.5)) * 0.70710678;
    float warp = cnoise(vec3(cellUv * vec2(3.2, 2.4) + SEED, 4.7)) * ${INTRO_WARP.toFixed(2)};
    float jitter = hash21(cell) * ${INTRO_JITTER.toFixed(2)};
    float spread = radial + warp + jitter + ${INTRO_WARP.toFixed(2)};
    float spawnBand = ${INTRO_BAND.toFixed(2)} * (0.6 + 0.8 * hash21(cell + vec2(17.0, 9.0)));
    float t = clamp((introProgress - spread) / spawnBand, 0.0, 1.0);
    if (t <= 0.0) {
      fragColor = vec4(background, toSurface ? 1.0 : 0.0);
      return;
    }
    float back = t - 1.0;
    size = max(size * (1.0 + 2.70158 * back * back * back + 1.70158 * back * back), 0.02);
    front = 1.0 - smoothstep(0.0, 1.0, abs(introProgress - spread) / spawnBand);
  }

  float aa = 2.0 / cellPx;
  float coverage = 1.0 - smoothstep(-aa, aa, shapeDistance(local, shape, size));
  vec3 tint = mix(uColor, uHover, max(smoothstep(0.15, 0.85, charge), front * 0.35));

  vec3 rgb = mix(background, tint, coverage * level);
  if (toSurface) {
    fragColor = vec4(rgb, 1.0);
    return;
  }
  float luminance = dot(tint * level, vec3(0.2126, 0.7152, 0.0722));
  float glow = max(0.0, (luminance - ${GLOW_THRESHOLD.toFixed(2)}) / (1.0 - ${GLOW_THRESHOLD.toFixed(2)})) * coverage;
  fragColor = vec4(rgb, glow);
}
`;

const BLUR_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D tSource;
uniform vec4 uDirection;
void main() {
  float sigma = uDirection.z;
  int radius = int(ceil(3.0 * sigma));
  vec3 sum = vec3(0.0);
  float weight = 0.0;
  for (int i = -radius; i <= radius; i++) {
    float offset = float(i);
    float w = exp(-(offset * offset) / (2.0 * sigma * sigma));
    vec4 texel = texture(tSource, vUv + offset * uDirection.xy);
    sum += (uDirection.w > 0.5 ? texel.rgb * texel.a : texel.rgb) * w;
    weight += w;
  }
  fragColor = vec4(sum / weight, 1.0);
}
`;

const COMPOSITE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D tScene;
uniform sampler2D tGlow;
uniform float uStrength;
void main() {
  vec3 scene = texture(tScene, vUv).rgb;
  vec3 glow = texture(tGlow, vUv).rgb;
  fragColor = vec4(scene + glow * uStrength, 1.0);
}
`;

function parseColor(value: string | undefined, fallback: string): [number, number, number] {
  const source = typeof value === 'string' ? value.trim() : '';
  const match = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(source) || /^#?([\da-f]{6})$/i.exec(fallback);
  let hex = match![1];
  if (hex.length === 3) hex = hex.replace(/./g, (char) => char + char);
  const int = Number.parseInt(hex, 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

export default function ShapeWaves({
  text = '',
  fontFamily = 'Geist, "Geist Sans", system-ui, sans-serif',
  fontWeight = 500,
  textSize = 0.6,
  shapes = 'mixed',
  cellSize = 10,
  dotSize = 0.75,
  color = '#929292',
  hoverColor = '#ffffff',
  backgroundColor = '#000000',
  speed = 1,
  scale = 1,
  contrast = 1,
  brightness = 0.4,
  flow = 0,
  direction = 0,
  fade = 0.25,
  interactive = true,
  splashRadius = 40,
  splashStrength = 0.4,
  glow = 0.35,
  intro = true,
  introDuration = 1.6,
  introKey = 0,
  paused = false,
  onError,
  className = ''
}: ShapeWavesProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const settingsRef = useRef<ShapeWavesSettings>(null as unknown as ShapeWavesSettings);
  const applyRef = useRef<() => void>(() => {});
  const maskRef = useRef<() => void>(() => {});
  const replayRef = useRef<() => void>(() => {});
  const onErrorRef = useRef<ShapeWavesProps['onError']>(onError);

  settingsRef.current = {
    text: String(text ?? ''),
    fontFamily,
    fontWeight,
    textSize,
    shapes,
    cellSize: Math.max(2, cellSize),
    dotSize,
    color,
    hoverColor,
    backgroundColor,
    speed,
    scale: Math.max(0.05, scale),
    contrast,
    brightness,
    flow,
    direction,
    fade,
    interactive,
    splashRadius,
    splashStrength,
    glow,
    intro,
    introDuration: Math.max(0.1, introDuration),
    introKey,
    paused
  };
  onErrorRef.current = onError;

  const settingsSignature = [
    shapes, cellSize, dotSize, color, hoverColor, backgroundColor, speed, scale, contrast,
    brightness, flow, direction, fade, interactive, splashRadius, splashStrength, glow,
    intro, introDuration, paused
  ].join('|');
  const maskSignature = [text, fontFamily, fontWeight, textSize].join('|');

  useEffect(() => {
    applyRef.current();
  }, [settingsSignature]);

  useEffect(() => {
    maskRef.current();
  }, [maskSignature]);

  useEffect(() => {
    if (introKey) replayRef.current();
  }, [introKey]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return undefined;

    let disposed = false;
    let failed = false;
    let frameId = 0;
    let lastFrameTime = 0;
    let time = 0;
    let drift: [number, number] = [0, 0];
    let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    let visible = true;
    let presented = false;
    let cols = 1;
    let rows = 1;
    let cellPx = 10;
    let gridOrigin: [number, number] = [0, 0];
    let charges = new Float32Array(1);
    let chargeData = new Uint8Array(4);
    let heights = new Float32Array(1);
    let previousHeights = new Float32Array(1);
    let simulationBacklog = 0;
    let introStart = 0;
    let introProgress = INTRO_END;
    let introArmed = false;
    let lastIntro = false;
    let chargesActive = false;
    let bounds: DOMRect | null = null;
    let wake: () => void = () => {};
    const pointer = { x: 0, y: 0, at: 0, inside: false };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const reportFailure = (error: unknown) => {
      if (disposed || failed) return;
      failed = true;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      setReady(false);
      onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
    };

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        canvas,
        dpr,
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
        premultipliedAlpha: false,
        powerPreference: 'low-power',
        webgl: 2
      });
      if (!renderer.isWebgl2) throw new Error('WebGL2 is not available');
    } catch (error) {
      reportFailure(error);
      return undefined;
    }

    const gl = renderer.gl;
    const geometry = new Triangle(gl);

    const sceneProgram = new Program(gl, {
      vertex: VERTEX,
      fragment: SCENE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      transparent: false,
      uniforms: {
        uResolution: { value: [1, 1] },
        uOrigin: { value: [0, 0] },
        uDrift: { value: [0, 0] },
        uRows: { value: 1 },
        uCols: { value: 1 },
        uCellPx: { value: 10 },
        uDotSize: { value: dotSize },
        uMode: { value: 0 },
        uNoiseScale: { value: 320 },
        uThreshold: { value: 0.5 },
        uContrast: { value: 2.8 },
        uTime: { value: 0 },
        uHasMask: { value: 0 },
        uFade: { value: fade },
        uIntroProgress: { value: INTRO_END },
        uGlowFlag: { value: glow > 0 ? 1 : 0 },
        uColor: { value: parseColor(color, '#929292') },
        uHover: { value: parseColor(hoverColor, '#ffffff') },
        uBackground: { value: parseColor(backgroundColor, '#000000') },
        uCharges: { value: new Texture(gl, { image: new Uint8Array([0, 0, 0, 255]), width: 1, height: 1, magFilter: gl.NEAREST, minFilter: gl.NEAREST, generateMipmaps: false }) },
        uMask: { value: new Texture(gl, { image: new Uint8Array([0, 0, 0, 255]), width: 1, height: 1, magFilter: gl.LINEAR, minFilter: gl.LINEAR, generateMipmaps: false }) }
      }
    });
    const sceneMesh = new Mesh(gl, { geometry, program: sceneProgram });

    const blurProgram = new Program(gl, {
      vertex: VERTEX,
      fragment: BLUR_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tSource: { value: null },
        uDirection: { value: [0, 0, 4, 1] }
      }
    });
    const blurMesh = new Mesh(gl, { geometry, program: blurProgram });

    const compositeProgram = new Program(gl, {
      vertex: VERTEX,
      fragment: COMPOSITE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tScene: { value: null },
        tGlow: { value: null },
        uStrength: { value: 0 }
      }
    });
    const compositeMesh = new Mesh(gl, { geometry, program: compositeProgram });

    let sceneTarget = new RenderTarget(gl, { width: 1, height: 1, depth: false, stencil: false });
    let glowA = new RenderTarget(gl, { width: 1, height: 1, depth: false, stencil: false });
    let glowB = new RenderTarget(gl, { width: 1, height: 1, depth: false, stencil: false });
    blurProgram.uniforms.tSource.value = sceneTarget.texture;

    let chargesTexture = new Texture(gl, {
      image: chargeData,
      width: 1,
      height: 1,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
      magFilter: gl.NEAREST,
      minFilter: gl.NEAREST,
      generateMipmaps: false,
      flipY: false,
      unpackAlignment: 4
    });
    sceneProgram.uniforms.uCharges.value = chargesTexture;

    const maskCanvas = document.createElement('canvas');
    const maskContext = maskCanvas.getContext('2d') as CanvasRenderingContext2D;
    let maskTexture: Texture | undefined;

    const glowEnabled = () => settingsRef.current.glow > 0;

    const measureSurface = (): [number, number] => [
      Math.max(1, gl.drawingBufferWidth),
      Math.max(1, gl.drawingBufferHeight)
    ];

    const writeCharges = () => {
      for (let i = 0; i < charges.length; i++) {
        const value = Math.max(0, Math.min(1, charges[i]));
        chargeData[i * 4] = Math.round(value * 255);
      }
      chargesTexture.needsUpdate = true;
    };

    const configureGrid = () => {
      const settings = settingsRef.current;
      const [width, height] = measureSurface();
      const nextCols = Math.max(1, Math.round(width / (settings.cellSize * dpr)));
      cellPx = width / nextCols;
      const nextRows = Math.max(1, Math.floor(height / cellPx));
      gridOrigin = [0, (height - nextRows * cellPx) / 2];
      if (nextCols === cols && nextRows === rows && charges.length === nextCols * nextRows) return;
      cols = nextCols;
      rows = nextRows;
      charges = new Float32Array(cols * rows);
      heights = new Float32Array(cols * rows);
      previousHeights = new Float32Array(cols * rows);
      chargeData = new Uint8Array(cols * rows * 4);
      chargesActive = false;
      if (chargesTexture.texture) gl.deleteTexture(chargesTexture.texture);
      chargesTexture = new Texture(gl, {
        image: chargeData,
        width: cols,
        height: rows,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
        magFilter: gl.NEAREST,
        minFilter: gl.NEAREST,
        generateMipmaps: false,
        flipY: false,
        unpackAlignment: 4
      });
      sceneProgram.uniforms.uCharges.value = chargesTexture;
    };

    const stepRipples = () => {
      const lastCol = cols - 1;
      const lastRow = rows - 1;
      let peak = 0;
      for (let row = 0; row < rows; row++) {
        const up = (row === 0 ? row : row - 1) * cols;
        const down = (row === lastRow ? row : row + 1) * cols;
        const base = row * cols;
        for (let col = 0; col < cols; col++) {
          const index = base + col;
          const left = base + (col === 0 ? col : col - 1);
          const right = base + (col === lastCol ? col : col + 1);
          const height = heights[index];
          const laplacian = heights[left] + heights[right] + heights[up + col] + heights[down + col] - 4 * height;
          const velocity = (height - previousHeights[index]) * WAVE_FRICTION;
          const next = (height + velocity + WAVE_SPEED * laplacian) * WAVE_DECAY;
          previousHeights[index] = next;
          const charge = Math.min(1, Math.max(0, next));
          charges[index] = charge;
          if (charge > peak) peak = charge;
        }
      }
      const swap = heights;
      heights = previousHeights;
      previousHeights = swap;
      return peak;
    };

    const updateCharges = (deltaSeconds: number) => {
      if (!chargesActive) return false;
      simulationBacklog = Math.min(simulationBacklog + deltaSeconds, SIMULATION_STEP * 4);
      let peak = 1;
      while (simulationBacklog >= SIMULATION_STEP) {
        simulationBacklog -= SIMULATION_STEP;
        peak = stepRipples();
      }
      if (peak < SETTLED_THRESHOLD) {
        heights.fill(0);
        previousHeights.fill(0);
        charges.fill(0);
        chargesActive = false;
      }
      writeCharges();
      return chargesActive;
    };

    const invalidateBounds = () => {
      bounds = null;
    };

    const splash = (x: number, y: number, strength: number) => {
      const settings = settingsRef.current;
      const sigma = Math.max(0.5, ((settings.splashRadius * dpr) / cellPx) * 0.5);
      const reach = Math.ceil(sigma * 2.5);
      const centerCol = (x * dpr - gridOrigin[0]) / cellPx - 0.5;
      const centerRow = (y * dpr - gridOrigin[1]) / cellPx - 0.5;
      const minRow = Math.max(0, Math.floor(centerRow - reach));
      const maxRow = Math.min(rows - 1, Math.ceil(centerRow + reach));
      const minCol = Math.max(0, Math.floor(centerCol - reach));
      const maxCol = Math.min(cols - 1, Math.ceil(centerCol + reach));
      for (let row = minRow; row <= maxRow; row++) {
        const dy = row - centerRow;
        for (let col = minCol; col <= maxCol; col++) {
          const dx = col - centerCol;
          const bump = strength * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
          const index = row * cols + col;
          heights[index] = Math.min(1.2, heights[index] + bump);
        }
      }
      chargesActive = true;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!settingsRef.current.interactive) return;
      if (!bounds) bounds = root.getBoundingClientRect();
      const now = performance.now();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const inside = x >= 0 && y >= 0 && x <= bounds.width && y <= bounds.height;
      if (inside) {
        const elapsed = pointer.inside ? Math.max(8, now - pointer.at) : 16;
        const travelled = pointer.inside ? Math.hypot(x - pointer.x, y - pointer.y) : 0;
        const speed = (travelled / elapsed) * 1000;
        splash(x, y, Math.min(1, 0.22 + speed * 0.0006) * settingsRef.current.splashStrength);
        wake();
      }
      pointer.x = x;
      pointer.y = y;
      pointer.at = now;
      pointer.inside = inside;
    };

    const handleWake = () => wake();

    const isAnimating = () => {
      const settings = settingsRef.current;
      return visible && !document.hidden && !settings.paused && settings.speed > 0 && !reduceMotion.matches;
    };

    const render = (now: number) => {
      frameId = 0;
      if (disposed || failed) return;
      const settings = settingsRef.current;
      const deltaSeconds = lastFrameTime ? Math.min(0.1, (now - lastFrameTime) / 1000) : 0;
      lastFrameTime = now;
      const animating = isAnimating();
      if (animating) {
        time += deltaSeconds * TIME_RATE * settings.speed;
        const angle = (settings.direction * Math.PI) / 180;
        const distance = settings.flow * cellPx * deltaSeconds;
        drift = [drift[0] + Math.cos(angle) * distance, drift[1] + Math.sin(angle) * distance];
      }
      const hovering = visible && !document.hidden && updateCharges(deltaSeconds);
      if (introArmed) {
        introArmed = false;
        introStart = now;
        introProgress = 0;
      }
      const introPlaying = introProgress < INTRO_END;
      if (introPlaying) {
        introProgress = Math.min(INTRO_END, ((now - introStart) / 1000 / settings.introDuration) * INTRO_END);
      }

      const [width, height] = measureSurface();
      sceneProgram.uniforms.uResolution.value = [width, height];
      sceneProgram.uniforms.uOrigin.value = gridOrigin;
      sceneProgram.uniforms.uRows.value = rows;
      sceneProgram.uniforms.uCols.value = cols;
      sceneProgram.uniforms.uCellPx.value = cellPx;
      sceneProgram.uniforms.uDrift.value = drift;
      sceneProgram.uniforms.uTime.value = time;
      sceneProgram.uniforms.uIntroProgress.value = introProgress;
      sceneProgram.uniforms.uNoiseScale.value = NOISE_CELLS * cellPx * settings.scale;
      sceneProgram.uniforms.uThreshold.value = 0.5 - (settings.brightness - 0.5) * 0.4;
      sceneProgram.uniforms.uContrast.value = 2.8 * settings.contrast;
      sceneProgram.uniforms.uFade.value = settings.fade;
      sceneProgram.uniforms.uGlowFlag.value = glowEnabled() ? 1 : 0;

      sceneProgram.uniforms.uCharges.value = chargesTexture;

      try {
        if (!glowEnabled()) {
          renderer.render({ scene: sceneMesh, target: undefined });
        } else {
          renderer.render({ scene: sceneMesh, target: sceneTarget });
          blurProgram.uniforms.tSource.value = sceneTarget.texture;
          blurProgram.uniforms.uDirection.value = [1 / glowA.width, 0, 4, 1];
          renderer.render({ scene: blurMesh, target: glowA });
          blurProgram.uniforms.tSource.value = glowA.texture;
          blurProgram.uniforms.uDirection.value = [0, 1 / glowB.height, 4, 0];
          renderer.render({ scene: blurMesh, target: glowB });
          compositeProgram.uniforms.tScene.value = sceneTarget.texture;
          compositeProgram.uniforms.tGlow.value = glowB.texture;
          compositeProgram.uniforms.uStrength.value = 2 * settings.glow;
          renderer.render({ scene: compositeMesh, target: undefined });
        }
      } catch (error) {
        reportFailure(error);
        return;
      }

      if (!presented) {
        presented = true;
        setReady(true);
      }

      if (animating || hovering || introPlaying) frameId = requestAnimationFrame(render);
      else lastFrameTime = 0;
    };

    wake = () => {
      if (disposed || failed || frameId) return;
      frameId = requestAnimationFrame(render);
    };

    const drawMask = () => {
      const settings = settingsRef.current;
      const content = settings.text.trim();
      const [surfaceWidth, surfaceHeight] = measureSurface();
      const hasText = content.length > 0;
      const maskScale = hasText ? Math.min(1, MAX_MASK_SIZE / Math.max(surfaceWidth, surfaceHeight)) : 0;
      const maskWidth = hasText ? Math.max(1, Math.round(surfaceWidth * maskScale)) : 1;
      const maskHeight = hasText ? Math.max(1, Math.round(surfaceHeight * maskScale)) : 1;

      maskCanvas.width = maskWidth;
      maskCanvas.height = maskHeight;
      maskContext.fillStyle = '#000';
      maskContext.fillRect(0, 0, maskWidth, maskHeight);

      if (hasText) {
        let fontPx = Math.max(1, settings.textSize * maskHeight);
        maskContext.font = `${settings.fontWeight} ${fontPx}px ${settings.fontFamily}`;
        const measured = maskContext.measureText(content).width;
        const maxWidth = maskWidth * 0.9;
        if (measured > maxWidth) {
          fontPx = Math.max(1, (fontPx * maxWidth) / measured);
          maskContext.font = `${settings.fontWeight} ${fontPx}px ${settings.fontFamily}`;
        }
        maskContext.textAlign = 'center';
        maskContext.textBaseline = 'middle';
        maskContext.fillStyle = '#fff';
        maskContext.fillText(content, maskWidth / 2, maskHeight / 2);
      }

      if (maskTexture?.texture) gl.deleteTexture(maskTexture.texture);
      maskTexture = new Texture(gl, {
        image: maskCanvas,
        width: maskWidth,
        height: maskHeight,
        magFilter: gl.LINEAR,
        minFilter: gl.LINEAR,
        generateMipmaps: false,
        flipY: false
      });
      sceneProgram.uniforms.uMask.value = maskTexture;
      sceneProgram.uniforms.uHasMask.value = hasText ? 1 : 0;
    };

    const applySettings = () => {
      if (disposed || failed) return;
      const settings = settingsRef.current;
      configureGrid();
      sceneProgram.uniforms.uDotSize.value = Math.min(1, Math.max(0.1, settings.dotSize));
      sceneProgram.uniforms.uMode.value = SHAPE_MODES[settings.shapes] ?? 0;
      sceneProgram.uniforms.uColor.value = parseColor(settings.color, '#929292');
      sceneProgram.uniforms.uHover.value = parseColor(settings.hoverColor, '#ffffff');
      sceneProgram.uniforms.uBackground.value = parseColor(settings.backgroundColor, '#000000');
      sceneProgram.uniforms.uFade.value = settings.fade;
      if (settings.intro !== lastIntro) {
        lastIntro = settings.intro;
        if (settings.intro && !reduceMotion.matches) introArmed = true;
      }
      if (!settings.interactive && chargesActive) {
        heights.fill(0);
        previousHeights.fill(0);
        charges.fill(0);
        chargesActive = false;
        writeCharges();
      }
      wake();
    };

    const applyMask = () => {
      if (disposed || failed) return;
      drawMask();
      applySettings();
      const settings = settingsRef.current;
      if (!settings.text.trim() || !document.fonts?.load) return;
      document.fonts
        .load(`${settings.fontWeight} 32px ${settings.fontFamily}`)
        .then(() => {
          if (disposed || failed) return;
          drawMask();
          wake();
        })
        .catch(() => {});
    };

    const resizeTargets = () => {
      const [width, height] = measureSurface();
      sceneTarget.setSize(width, height);
      const half: [number, number] = [Math.max(1, Math.ceil(width / 2)), Math.max(1, Math.ceil(height / 2))];
      glowA.setSize(half[0], half[1]);
      glowB.setSize(half[0], half[1]);
    };

    const resize = () => {
      if (disposed || failed) return;
      invalidateBounds();
      const rect = root.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      renderer.dpr = dpr;
      renderer.setSize(Math.max(1, Math.round(rect.width)), Math.max(1, Math.round(rect.height)));
      resizeTargets();
      drawMask();
      applySettings();
    };

    applyRef.current = applySettings;
    maskRef.current = applyMask;
    replayRef.current = () => {
      if (disposed || failed || !settingsRef.current.intro || reduceMotion.matches) return;
      introArmed = true;
      wake();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) wake();
      },
      { threshold: 0 }
    );
    visibilityObserver.observe(root);
    document.addEventListener('visibilitychange', handleWake);
    reduceMotion.addEventListener('change', handleWake);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', invalidateBounds, { capture: true, passive: true });

    applyMask();
    resize();

    return () => {
      disposed = true;
      wake = () => {};
      applyRef.current = () => {};
      maskRef.current = () => {};
      replayRef.current = () => {};
      document.removeEventListener('visibilitychange', handleWake);
      reduceMotion.removeEventListener('change', handleWake);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', invalidateBounds, { capture: true } as EventListenerOptions);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
      if (chargesTexture.texture) gl.deleteTexture(chargesTexture.texture);
      if (maskTexture?.texture) gl.deleteTexture(maskTexture.texture);
      sceneProgram.remove();
      blurProgram.remove();
      compositeProgram.remove();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`pointer-events-none relative isolate h-full w-full overflow-hidden ${className}`}
      data-ready={ready}
      style={{ backgroundColor }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className={`pointer-events-none absolute inset-0 block h-full w-full transition-opacity duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${ready ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
