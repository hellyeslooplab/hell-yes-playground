// Hell Yes Playground — MP4 only, loop fechado
// - Loop definido por tempo real: LOOP_SECONDS (8s)
// - 24 fps alvo para preview, canvas 540x960 (9:16)
// - Presets:
//     drift  → Orbital Overdrive
//     slices → Signal Splitter
//     melt   → Neon Melt

let canvas;
let baseImg = null;

let imgInput,
  presetSelect,
  intensitySlider,
  playToggleBtn,
  exportVideoBtn,
  statusEl;

const LOOP_SECONDS = 8;
const FPS = 24; // fps alvo para preview (não garante fps exato na gravação)

let isPlaying = true;

// controle de tempo do loop
let loopStartTime = 0; // millis() no ponto em que o loop "zera"

// gravação de vídeo
let recordingVideo = false;
let mediaRecorder = null;
let recordedChunks = [];

// ------------------------------------------------------
// setup
// ------------------------------------------------------
function setup() {
  const cnv = createCanvas(540, 960); // 9:16
  canvas = cnv;
  cnv.parent("canvas-holder");

  frameRate(FPS); // tenta manter 24 fps de preview

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

  // tempo decorrido em segundos desde loopStartTime
  const elapsedSec = (millis() - loopStartTime) / 1000.0;

  // fase normalizada 0..1 (loop de LOOP_SECONDS)
  let tNorm = (elapsedSec / LOOP_SECONDS) % 1.0;
  if (tNorm < 0) tNorm += 1.0;

  renderScene(tNorm);
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
        // reseta o tempo do loop quando carrega imagem nova
        loopStartTime = millis();
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
    // Orbital Overdrive
    renderOrbitalOverdrive(tNorm, intensity);
  } else if (preset === "slices") {
    // Signal Splitter
    renderSlices(tNorm, intensity);
  } else if (preset === "melt") {
    // Neon Melt
    renderMelt(tNorm, intensity);
  } else {
    image(baseImg, 0, 0, width, height);
  }

  drawVignette();
}

// ------------------------------------------------------
// PRESET 1 — ORBITAL OVERDRIVE
// harmônicos inteiros de t = 0..2π, vários ecos, zoom e rotação
// ------------------------------------------------------
function renderOrbitalOverdrive(tNorm, intensity) {
  const t = tNorm * TWO_PI; // fase 0..2π

  // zoom com harmônicos 1 e 2
  const zoomBase =
    1.15 +
    0.20 * intensity * sin(t * 1.0) +
    0.10 * intensity * sin(t * 2.0);

  // rotação com harmônico 3
  const angleBase = 0.35 * intensity * sin(t * 3.0);

  // órbita central com harmônicos 1 e 2
  const orbitRadius = 40 * intensity;
  const cxOffset = cos(t * 1.0) * orbitRadius;
  const cyOffset = sin(t * 2.0) * orbitRadius;

  imageMode(CENTER);

  // camada base
  push();
  translate(width / 2 + cxOffset, height / 2 + cyOffset);
  rotate(angleBase);
  scale(zoomBase);
  image(baseImg, 0, 0, width, height);
  pop();

  // ecos coloridos com mistura aditiva
  push();
  blendMode(ADD);

  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const li = i + 1;
    const layerScale = zoomBase * (1.0 + 0.08 * li);
    const layerAngle = angleBase * (1.0 + 0.6 * li);

    // deslocamento extra em espiral (harmônicos inteiros)
    const r = orbitRadius * (0.8 + 0.4 * li);
    const lx = cos(t * (1 + li)) * r;
    const ly = sin(t * (2 + li)) * r;

    // variação de cor com harmônico 2
    const hueShift = 0.5 + 0.5 * sin(t * 2.0 + li);
    const rCol = 255;
    const gCol = 80 + 120 * hueShift;
    const bCol = 180 + 70 * (1.0 - hueShift);
    const alpha = 90 - li * 20;

    push();
    translate(width / 2 + lx, height / 2 + ly);
    rotate(layerAngle);
    scale(layerScale);
    tint(rCol, gCol, bCol, alpha);
    image(baseImg, 0, 0, width, height);
    pop();
  }

  pop(); // blendMode ADD

  // faixas diagonais para streak / motion blur (harmônico 4)
  const bands = 10;
  const bandH = height / bands;
  for (let i = 0; i < bands; i++) {
    const y = i * bandH;
    const phase = t * 4.0 + i;
    const shiftX = 20 * intensity * sin(phase);

    push();
    blendMode(ADD);
    tint(255, 255 * 0.25);
    image(baseImg, shiftX, y, width, bandH, 0, y, width, bandH);
    pop();
  }

  imageMode(CORNER);
}

// ------------------------------------------------------
// PRESET 2 — SIGNAL SPLITTER (harmônico 2)
// ------------------------------------------------------
function renderSlices(tNorm, intensity) {
  const slices = 28;
  const sliceH = height / slices;
  const t = tNorm * TWO_PI;

  for (let i = 0; i < slices; i++) {
    const y = i * sliceH;
    const glitchPhase = t * 2.0 + i * 0.4; // harmônico 2 de t
    const maxShift = 60 * intensity;
    const shiftX = sin(glitchPhase) * maxShift;

    image(baseImg, shiftX, y, width, sliceH, 0, y, width, sliceH);
  }

  tint(255, 30);
  image(baseImg, 0, 0, width, height);
  noTint();
}

// ------------------------------------------------------
// PRESET 3 — NEON MELT (harmônico 2)
// ------------------------------------------------------
function renderMelt(tNorm, intensity) {
  const cols = 70;
  const colW = width / cols;
  const t = tNorm * TWO_PI;

  for (let i = 0; i < cols; i++) {
    const x = i * colW;
    const wavePhase = t * 2.0 + i * 0.25; // harmônico 2 de t
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
// Export VIDEO (~8 segundos de loop contínuo)
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

  // zera a fase do loop no momento da gravação
  loopStartTime = millis();

  isPlaying = true;
  loop();

  statusEl.textContent =
    "Recording video… capturing one seamless loop (~" +
    LOOP_SECONDS +
    " seconds).";

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
      "Video exported (~" +
      LOOP_SECONDS +
      " s, vertical 9:16 " +
      ext.toUpperCase() +
      "). Ready for Spotify Canvas.";

    recordingVideo = false;
  };

  mediaRecorder.start();

  // para a gravação depois de LOOP_SECONDS (em tempo real)
  setTimeout(() => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  }, LOOP_SECONDS * 1000);
}
