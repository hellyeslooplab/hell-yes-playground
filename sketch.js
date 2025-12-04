// Hell Yes Playground — MP4 only
// - 8s loop, 24 fps, canvas 540x960 (9:16)
// - Upload de imagem + crop automático 9:16
// - 3 presets básicos (vamos evoluir depois)
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

  if (preset === "drift") renderDrift(tNorm, intensity);
  else if (preset === "slices") renderSlices(tNorm, intensity);
  else if (preset === "melt") renderMelt(tNorm, intensity);
  else image(baseImg, 0, 0, width, height);

  drawVignette();
}

// -------- Preset 1: Drift Orbit --------
function renderDrift(tNorm, intensity) {
  const t = tNorm * TWO_PI;
  const zoom = 1.05 + 0.08 * intensity * sin(t * 0.9);
  const offsetX = sin(t * 1.1) * 25 * intensity;
  const offsetY = cos(t * 0.7) * 30 * intensity;

  push();
  translate(width / 2 + offsetX, height / 2 + offsetY);
  scale(zoom);
  imageMode(CENTER);
  image(baseImg, 0, 0, width, height);
  pop();

  push();
  translate(width / 2 - offsetX * 0.5, height / 2 - offsetY * 0.5);
  scale(zoom * 0.95);
  tint(255, 40);
  imageMode(CENTER);
  image(baseImg, 0, 0, width, height);
  pop();
}

// -------- Preset 2: Glitch Slices --------
function renderSlices(tNorm, intensity) {
  const slices = 28;
  const sliceH = height / slices;

  for (let i = 0; i < slices; i++) {
    const y = i * sliceH;
    const glitchPhase = tNorm * TWO_PI * 2 + i * 0.4;
    const maxShift = 60 * intensity;
    const shiftX = sin(glitchPhase) * maxShift;

    image(baseImg, shiftX, y, width, sliceH, 0, y, width, sliceH);
  }

  tint(255, 30);
  image(baseImg, 0, 0, width, height);
  noTint();
}

// -------- Preset 3: Wave Melt --------
function renderMelt(tNorm, intensity) {
  const cols = 70;
  const colW = width / cols;

  for (let i = 0; i < cols; i++) {
    const x = i * colW;
    const wavePhase = tNorm * TWO_PI * 1.5 + i * 0.25;
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
