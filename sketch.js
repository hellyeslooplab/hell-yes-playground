// Hell Yes Playground v3 — TESTE 8 segundos
// - Upload de imagem
// - Crop automático 9:16 (centralizado)
// - Presets de animação
// - Export GIF 8s (12 fps = 96 frames)

let canvas;
let baseImg = null;

let imgInput, presetSelect, intensitySlider, playToggleBtn, exportBtn, statusEl;

const LOOP_SECONDS = 8;     // agora 8 segundos
const FPS = 12;             // mantém leve
const NUM_FRAMES = LOOP_SECONDS * FPS; // 96 frames

let isPlaying = true;
let exporting = false;

function setup() {
  const cnv = createCanvas(360, 640);
  canvas = cnv;
  cnv.parent("canvas-holder");

  imgInput = document.getElementById("image-input");
  presetSelect = document.getElementById("preset");
  intensitySlider = document.getElementById("intensity");
  playToggleBtn = document.getElementById("play-toggle");
  exportBtn = document.getElementById("export");
  statusEl = document.getElementById("status");

  imgInput.addEventListener("change", handleImageUpload);
  playToggleBtn.addEventListener("click", togglePlay);
  exportBtn.addEventListener("click", startExportGIF);
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
    sHeight = img.height;
    sWidth = sHeight * targetAspect;
    sx = (img.width - sWidth) / 2;
    sy = 0;
  } else {
    sWidth = img.width;
    sHeight = sWidth / targetAspect;
    sx = 0;
    sy = (img.height - sHeight) / 2;
  }

  const gfx = createGraphics(width, height);
  gfx.image(img, 0, 0, width, height, sx, sy, sWidth, sHeight);
  return gfx;
}

function togglePlay() {
  isPlaying = !isPlaying;
  playToggleBtn.textContent = isPlaying ? "Pause" : "Play";
  if (isPlaying) loop();
  else noLoop();
}

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

// -------- Drift --------
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

// -------- Slices --------
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

// -------- Melt --------
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

// -------- Vignette --------
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

// -------- Export GIF --------
function startExportGIF() {
  if (!baseImg || exporting) return;

  exporting = true;
  statusEl.textContent = "Exporting GIF…";
  noLoop();

  const gif = new GIF({
    workers: 1,
    quality: 10,
    workerScript: "gif.worker.js",
  });

  gif.on("progress", (p) => {
    statusEl.textContent = "Exporting GIF… " + Math.round(p * 100) + "%";
  });

  gif.on("finished", (blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hell_yes_canvas.gif";
    a.click();
    URL.revokeObjectURL(url);

    statusEl.textContent = "GIF exported (8s). Convert to MP4 for Spotify.";
    exporting = false;
    if (isPlaying) loop();
  });

  for (let i = 0; i < NUM_FRAMES; i++) {
    const tNorm = i / NUM_FRAMES;
    renderScene(tNorm);
    gif.addFrame(canvas.elt, { copy: true, delay: 1000 / FPS });
  }

  gif.render();
}
