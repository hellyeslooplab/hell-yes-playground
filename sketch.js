// Hell Yes Playground — MP4 only
// - 8s loop, 24 fps, canvas 540x960 (9:16)
// - Upload de imagem + crop automático 9:16
// - Presets:
//     1) Orbital Overdrive (radical, multi-ecos, rotação/zoom forte)
//     2) Signal Splitter (faixas glitchadas)
//     3) Neon Melt (ondas verticais)
// - Exporta vídeo 8s via MediaRecorder (MP4 se possível, senão WEBM)

let canvas;
let baseImg = null;

let imgInput,
  presetSelect,
  intensitySlider,
  playToggleBtn,
  exportVideoBtn,
  statusEl;

const LOOP_SECONDS = 8;
const FPS = 24; // 24 fps para suavidade

let isPlaying = true;

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

  if (!isPlaying) return;

  const tNorm = ((millis() / 1000) % LOOP_SECONDS) / LOOP_SECONDS;
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
  else noLoop();
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
// radical, com múltiplos ecos, rotação, zoom e "pulse" de luz
// tudo baseado em harmônicos inteiros de 2π para loop perfeito.
// ------------------------------------------------------
function renderOrbitalOverdrive(tNorm, intensity) {
  // t percorre 0..2π em 8s; todos os movimentos usam múltiplos inteiros de t
  const t = tNorm * TWO_PI;

  // zoom oscila em harmônicos 1 e 2 de t
  const zoomBase =
    1.15 +
    0.20 * intensity * sin(t * 1.0) +
    0.10 * intensity * sin(t * 2.0);

  // rotação pulsando com harmônico 3
  const angleBase = 0.35 * intensity * sin(t * 3.0);

  // órbita do "centro" usando harmônicos 1 e 2
  const orbitRadius = 40 * intensity;
  const cxOffset = cos(t * 1.0) * orbitRadius;
  const cyOffset = sin(t * 2.0) * orbitRadius;

  imageMode(CENTER);

  // camada base (mais limpa)
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

    // variação de cor oscilando em t (sem random)
    const hueShift = 0.5 + 0.5 * sin(t * 2.0 + li);
    const rCol = 255;
    const gCol = 80 + 120 * hueShift;
    const bCol = 180 + 70 * (1.0 - hueShift);
    const alpha = 90 - li * 20; // ecos mais distantes mais fracos

    push();
    translate(width / 2 + lx, height / 2 + ly);
    rotate(layerAngle);
    scale(layerScale);
    tint(rCol, gCol, bCol, alpha);
    image(baseImg, 0, 0, width, height);
    pop();
  }

  pop(); // blendMode

  // pequenas faixas diagonais para dar sensação de streak / motion blur
  const bands = 10;
  const bandH = height / bands;
  for (let i = 0; i < bands; i++) {
    const y = i * bandH;
    const phase = t * 4.0 + i; // harmônico 4 de t
    const shiftX = 20 * intensity * sin(phase);

    push();
    blendMode(ADD);
    tint(255, 255 * 0.25); // bem sutil
    image(
      baseImg,
      shiftX,
      y,
      width,
      bandH,
      0,
      y,
      width,
      bandH
    );
    pop();
  }

  imageMode(CORNER);
}

// ------------------------------------------------------
// PRESET 2 — SIGNAL SPLITTER (antigo slices, leve ajuste depois)
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
// PRESET 3 — NEON MELT (ondas verticais)
// ------------------------------------------------------
function renderMelt(tNorm, intensity) {
  const cols = 70;
  const colW = width / cols;
  const t = tNorm * TWO_PI;

  for (let i = 0; i < cols; i++) {
    const x = i * colW;
    const wavePhase = t * 1.5 + i * 0.25; // harmônico 1.5 ainda fecha o loop
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
// Export VIDEO (8s, 24 fps, vertical 9:16)
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
  statusEl.textContent = "Recording video… 8 seconds at 24 fps.";

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
      "Video exported (8s, 24 fps, vertical 9:16 " +
      ext.toUpperCase() +
      "). Ready for Spotify Canvas.";
    recordingVideo = false;
  };

  mediaRecorder.start();

  setTimeout(() => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  }, LOOP_SECONDS * 1000);
}
