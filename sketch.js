// Hell Yes Playground — MP4 only, loop fechado
// - 8s conceituais: NUM_FRAMES = 8 * 24 = 192
// - 24 fps, canvas 540x960 (9:16)
// - Fase discreta por frame (framePhase) → último frame = primeiro
// - Presets:
//   drift  → Preset 1 (Orbital animado, radical, sem random)
//   slices → Preset 2 (Signal Splitter)
//   melt   → Preset 3 (Neon Melt)

let canvas;
let baseImg = null;

let imgInput,
  presetSelect,
  intensitySlider,
  playToggleBtn,
  exportVideoBtn,
  statusEl;

const LOOP_SECONDS = 8;
const FPS = 24;
const NUM_FRAMES = LOOP_SECONDS * FPS; // 192 frames

let isPlaying = true;

// fase atual (0..NUM_FRAMES-1)
let framePhase = 0;

// gravação de vídeo
let recordingVideo = false;
let recordingFrames = 0;
let mediaRecorder = null;
let recordedChunks = [];

// ------------------------------------------------------
// setup
// ------------------------------------------------------
function setup() {
  const cnv = createCanvas(540, 960); // 9:16
  canvas = cnv;
  cnv.parent("canvas-holder");

  frameRate(FPS); // tenta manter 24 fps visuais

  imgInput = document.getElementById("image-input");
  presetSelect = document.getElementById("preset");
  intensitySlider = document.getElementById("intensity");
  playToggleBtn = document.getElementById("play-toggle");
  exportVideoBtn = document.getElementById("export-video");
  statusEl = document.getElementById("status");

  imgInput.addEventListener("change", handleImageUpload);
  playToggleBtn.addEventListener("click", togglePlay);
  exportVideoBtn.addEventListener("click", startExportVideo);
}

function draw() {
  if (!baseImg) {
    background(10);
    fill(120);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text(
      "Upload an image to begin.\nThe tool crops to 9:16 automatically.",
      width / 2,
      height / 2
    );
    return;
  }

  if (!isPlaying && !recordingVideo) return;

  // fase normalizada 0..1, discreta
  const tNorm = framePhase / NUM_FRAMES;
  renderScene(tNorm);

  // avança fase (sempre 0..NUM_FRAMES-1)
  framePhase = (framePhase + 1) % NUM_FRAMES;

  // se estamos gravando, contamos frames
  if (recordingVideo) {
    recordingFrames++;
    if (recordingFrames >= NUM_FRAMES) {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
      recordingVideo = false;
    }
  }
}

// ------------------------------------------------------
// Upload + crop 9:16
// ------------------------------------------------------
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    loadImage(
      ev.target.result,
      (img) => {
        baseImg = cropToCanvasAspect(img);
        statusEl.textContent =
          "Image loaded. Choose a preset, adjust intensity and export.";
      },
      () => (statusEl.textContent = "Error loading image.")
    );
  };
  reader.readAsDataURL(file);
}

function cropToCanvasAspect(img) {
  const targetAspect = width / height;
  const srcAspect = img.width / img.height;

  let sx, sy, sWidth, sHeight;
  if (srcAspect > targetAspect) {
    // imagem mais larga → corta lados
    sHeight = img.height;
    sWidth = sHeight * targetAspect;
    sx = (img.width - sWidth) / 2;
    sy = 0;
  } else {
    // imagem mais alta → corta topo/base
    sWidth = img.width;
    sHeight = sWidth / targetAspect;
    sx = 0;
    sy = (img.height - sHeight) / 2;
  }

  const gfx = createGraphics(width, height);
  gfx.image(img, 0, 0, width, height, sx, sy, sWidth, sHeight);
  return gfx;
}

// ------------------------------------------------------
// Play / Pause
// ------------------------------------------------------
function togglePlay() {
  isPlaying = !isPlaying;
  playToggleBtn.textContent = isPlaying ? "Pause" : "Play";
  if (isPlaying) loop();
  else if (!recordingVideo) noLoop();
}

// ------------------------------------------------------
// Render da cena em função de tNorm (0..1)
// ------------------------------------------------------
function renderScene(tNorm) {
  const preset = presetSelect.value;
  const intensity = parseFloat(intensitySlider.value || "0.6");

  background(0);
  imageMode(CORNER);
  noTint();

  if (preset === "drift") {
    // PRESET 1 — Orbital animado
    renderPreset1Orbital(tNorm, intensity);
  } else if (preset === "slices") {
    // PRESET 2
    renderSlices(tNorm, intensity);
  } else if (preset === "melt") {
    // PRESET 3
    renderMelt(tNorm, intensity);
  } else {
    image(baseImg, 0, 0, width, height);
  }

  drawVignette();
}

// ------------------------------------------------------
// PRESET 1 — Orbital animado radical, sem random
// Loop perfeito: tudo é função de t = 0..2π com harmônicos inteiros
// ------------------------------------------------------
function renderPreset1Orbital(tNorm, intensity) {
  const t = tNorm * TWO_PI; // 0..2π

  imageMode(CENTER);

  // camada base — deslocamento orbital + zoom + rotação
  const baseOrbitR = 40 * intensity;
  const baseCx = width / 2 + baseOrbitR * cos(t * 1.0);
  const baseCy = height / 2 + baseOrbitR * sin(t * 2.0);

  const baseZoom =
    1.15 +
    0.18 * intensity * sin(t * 1.0) +
    0.10 * intensity * sin(t * 2.0);
  const baseAngle = 0.35 * intensity * sin(t * 3.0);

  push();
  translate(baseCx, baseCy);
  rotate(baseAngle);
  scale(baseZoom);
  image(baseImg, 0, 0, width, height);
  pop();

  // ecos coloridos em blendMode(ADD)
  push();
  blendMode(ADD);

  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const li = i + 1;

    // raio de órbita maior pra cada eco
    const r = baseOrbitR * (1.0 + 0.7 * li);
    const angleOrbit = t * (1.0 + li); // harmônicos 2,3,4...

    const lx = width / 2 + r * cos(angleOrbit);
    const ly = height / 2 + r * sin(angleOrbit * 1.5);

    const layerScale =
      baseZoom * (1.0 + 0.10 * li * (0.5 + intensity));
    const layerAngle =
      baseAngle * (1.0 + 0.8 * li) +
      0.4 * intensity * sin(t * (2 + li));

    // variação de cor estável (sem random)
    const huePhase = t * 2.0 + li;
    const rCol = 200 + 55 * sin(huePhase);
    const gCol = 80 + 120 * sin(huePhase + PI * 0.33);
    const bCol = 160 + 80 * sin(huePhase + PI * 0.66);
    const alpha = 85 - li * 20;

    push();
    translate(lx, ly);
    rotate(layerAngle);
    scale(layerScale);
    tint(rCol, gCol, bCol, alpha);
    image(baseImg, 0, 0, width, height);
    pop();
  }

  pop(); // blendMode ADD

  // streaks horizontais (tipo scanline / motion blur)
  const bands = 12;
  const bandH = height / bands;
  for (let i = 0; i < bands; i++) {
    const y = i * bandH;
    const phase = t * 4.0 + i; // harmônico 4
    const shiftX = 25 * intensity * sin(phase);
    const shiftY = 6 * intensity * cos(phase * 0.5);

    push();
    blendMode(ADD);
    tint(255, 40);
    image(baseImg, shiftX, y + shiftY, width, bandH, 0, y, width, bandH);
    pop();
  }

  imageMode(CORNER);
}

// ------------------------------------------------------
// PRESET 2 — Signal Splitter (slices animados, harmônico 2)
// ------------------------------------------------------
function renderSlices(tNorm, intensity) {
  const slices = 28;
  const sliceH = height / slices;
  const t = tNorm * TWO_PI;

  for (let i = 0; i < slices; i++) {
    const y = i * sliceH;
    const glitchPhase = t * 2.0 + i * 0.4; // harmônico 2
    const maxShift = 60 * intensity;
    const shiftX = sin(glitchPhase) * maxShift;

    image(baseImg, shiftX, y, width, sliceH, 0, y, width, sliceH);
  }

  tint(255, 30);
  image(baseImg, 0, 0, width, height);
  noTint();
}

// ------------------------------------------------------
// PRESET 3 — Neon Melt (ondas verticais, harmônico 2)
// ------------------------------------------------------
function renderMelt(tNorm, intensity) {
  const cols = 70;
  const colW = width / cols;
  const t = tNorm * TWO_PI;

  for (let i = 0; i < cols; i++) {
    const x = i * colW;
    const wavePhase = t * 2.0 + i * 0.25; // harmônico 2
    const maxOffset = 50 * intensity;
    const offsetY = sin(wavePhase) * maxOffset;

    image(baseImg, x, offsetY, colW, height, x, 0, colW, height);
  }

  push();
  blendMode(ADD);
  tint(255, 40);
  image(baseImg, 0, 0, width, height);
  pop();
  noTint();
  blendMode(BLEND);
}

// -------- Vinheta --------
function drawVignette() {
  push();
  noFill();
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const a = map(i, 0, steps - 1, 120, 0);
    stroke(0, a);
    strokeWeight(30 + i * 3);
    rectMode(CENTER);
    rect(width / 2, height / 2, width * 1.1, height * 1.1, 60);
  }
  pop();
}

// ------------------------------------------------------
// Export VIDEO (um ciclo completo: NUM_FRAMES frames)
// ------------------------------------------------------
function startExportVideo() {
  if (!baseImg || recordingVideo) return;

  if (typeof MediaRecorder === "undefined") {
    statusEl.textContent =
      "Video export not supported in this browser (no MediaRecorder).";
    return;
  }

  let mimeType = "";
  if (MediaRecorder.isTypeSupported("video/mp4")) {
    mimeType = "video/mp4";
  } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    mimeType = "video/webm;codecs=vp9";
  } else if (MediaRecorder.isTypeSupported("video/webm")) {
    mimeType = "video/webm";
  } else {
    statusEl.textContent =
      "Video export not supported (no compatible codecs found).";
    return;
  }

  const stream = canvas.elt.captureStream(FPS);

  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType });
  } catch (err) {
    console.error("MediaRecorder init error:", err);
    statusEl.textContent = "Could not start video export.";
    return;
  }

  recordedChunks = [];
  recordingVideo = true;
  recordingFrames = 0;

  // começa o ciclo do frame 0 sempre que for exportar
  framePhase = 0;
  isPlaying = true;
  loop();

  statusEl.textContent =
    "Recording video… capturing one full loop (" +
    NUM_FRAMES +
    " frames at " +
    FPS +
    " fps).";

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
    a.href = url;
    a.download = "hell_yes_canvas." + ext;
    a.click();
    URL.revokeObjectURL(url);

    statusEl.textContent =
      "Video exported (one seamless loop, " +
      FPS +
      " fps, vertical 9:16 " +
      ext.toUpperCase() +
      "). Ready for Spotify Canvas.";
    recordingVideo = false;
  };

  mediaRecorder.start();
}
