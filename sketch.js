// Hell Yes Playground v2
// - Upload de imagem
// - Crop automático 9:16 (centralizado)
// - Presets de animação
// - Export GIF 4s (16 fps)

let canvas;
let baseImg = null; // imagem já recortada em 9:16 para o canvas

let imgInput, presetSelect, intensitySlider, playToggleBtn, exportBtn, statusEl;

const LOOP_SECONDS = 4; // duração do loop
const FPS = 16; // fps do GIF
const NUM_FRAMES = LOOP_SECONDS * FPS;

let isPlaying = true;
let exporting = false;

function setup() {
  // Canvas em 9:16 (metade de 1080x1920 → 540x960)
  const cnv = createCanvas(540, 960);
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
    // placeholder
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

  if (!isPlaying) {
    // quando pausado, não avança o tempo
    return;
  }

  const tNorm = ((millis() / 1000) % LOOP_SECONDS) / LOOP_SECONDS;
  renderScene(tNorm);
}

// -------------------------------------------
// Upload + crop 9:16
// -------------------------------------------

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
      () => {
        statusEl.textContent = "Error loading image.";
      }
    );
  };
  reader.readAsDataURL(file);
}

function cropToCanvasAspect(img) {
  const targetAspect = width / height; // 9:16
  const srcAspect = img.width / img.height;

  let sx, sy, sWidth, sHeight;

  if (srcAspect > targetAspect) {
    // imagem muito larga → corta lados
    sHeight = img.height;
    sWidth = sHeight * targetAspect;
    sx = (img.width - sWidth) / 2;
    sy = 0;
  } else {
    // imagem muito alta → corta topo/base
    sWidth = img.width;
    sHeight = sWidth / targetAspect;
    sx = 0;
    sy = (img.height - sHeight) / 2;
  }

  const gfx = createGraphics(width, height);
  gfx.image(img, 0, 0, width, height, sx, sy, sWidth, sHeight);

  return gfx;
}

// -------------------------------------------
// Play / Pause
// -------------------------------------------

function togglePlay() {
  isPlaying = !isPlaying;
  playToggleBtn.textContent = isPlaying ? "Pause" : "Play";
  if (isPlaying) {
    loop();
  } else {
    noLoop();
  }
}

// -------------------------------------------
// Render da cena em função de tNorm (0..1)
// -------------------------------------------

function renderScene(tNorm) {
  const preset = presetSelect.value;
  const intensity = parseFloat(intensitySlider.value || "0.6");

  background(0);
  imageMode(CORNER);
  noTint();

  if (preset === "drift") {
    renderDrift(tNorm, intensity);
  } else if (preset === "slices") {
    renderSlices(tNorm, intensity);
  } else if (preset === "melt") {
    renderMelt(tNorm, intensity);
  } else {
    image(baseImg, 0, 0, width, height);
  }

  // leve vinheta
  drawVignette();
}

// ---- Preset 1: Drift Orbit (zoom + deslocamento suave) ----
function renderDrift(tNorm, intensity) {
  const t = tNorm * TWO_PI;

  const zoom = 1.05 + 0.08 * intensity * sin(t * 0.9);
  const offsetX = sin(t * 1.1) * 30 * intensity;
  const offsetY = cos(t * 0.7) * 40 * intensity;

  push();
  translate(width / 2 + offsetX, height / 2 + offsetY);
  scale(zoom);
  imageMode(CENTER);
  image(baseImg, 0, 0, width, height);
  pop();

  // eco escuro por baixo
  push();
  translate(width / 2 - offsetX * 0.5, height / 2 - offsetY * 0.5);
  scale(zoom * 0.95);
  tint(255, 40);
  imageMode(CENTER);
  image(baseImg, 0, 0, width, height);
  pop();
}

// ---- Preset 2: Glitch Slices (faixas deslocadas) ----
function renderSlices(tNorm, intensity) {
  const slices = 32;
  const sliceH = height / slices;

  for (let i = 0; i < slices; i++) {
    const y = i * sliceH;
    const glitchPhase = tNorm * TWO_PI * 2 + i * 0.4;
    const maxShift = 80 * intensity;
    const shiftX = sin(glitchPhase) * maxShift;

    const sx = 0;
    const sy = y;
    const sw = width;
    const sh = sliceH;

    const dx = shiftX;
    const dy = y;

    image(baseImg, dx, dy, sw, sh, sx, sy, sw, sh);
  }

  // overlay leve para recompor
  tint(255, 30);
  image(baseImg, 0, 0, width, height);
  noTint();
}

// ---- Preset 3: Wave Melt (ondas verticais) ----
function renderMelt(tNorm, intensity) {
  const cols = 90;
  const colW = width / cols;

  for (let i = 0; i < cols; i++) {
    const x = i * colW;
    const wavePhase = tNorm * TWO_PI * 1.5 + i * 0.25;
    const maxOffset = 60 * intensity;
    const offsetY = sin(wavePhase) * maxOffset;

    const sx = x;
    const sy = 0;
    const sw = colW;
    const sh = height;

    const dx = x;
    const dy = offsetY;

    image(baseImg, dx, dy, sw, sh, sx, sy, sw, sh);
  }

  // brilho extra
  push();
  blendMode(ADD);
  tint(255, 40);
  image(baseImg, 0, 0, width, height);
  pop();
  noTint();
  blendMode(BLEND);
}

// ---- Vinheta simples ----
function drawVignette() {
  push();
  noFill();
  const steps = 20;
  for (let i = 0; i < steps; i++) {
    const a = map(i, 0, steps - 1, 120, 0);
    stroke(0, a);
    strokeWeight(40 + i * 4);
    rectMode(CENTER);
    rect(width / 2, height / 2, width * 1.1, height * 1.1, 80);
  }
  pop();
}

// -------------------------------------------
// Export GIF
// -------------------------------------------

function startExportGIF() {
  if (!baseImg || exporting) return;

  exporting = true;
  statusEl.textContent = "Exporting GIF… this may take some seconds.";
  noLoop();

  const gif = new GIF({
    workers: 2,
    quality: 10,
    workerScript:
      "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js",
  });

  for (let i = 0; i < NUM_FRAMES; i++) {
    const tNorm = i / NUM_FRAMES;
    renderScene(tNorm);
    gif.addFrame(canvas.elt, {
      copy: true,
      delay: 1000 / FPS,
    });
  }

  gif.on("finished", (blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hell_yes_canvas.gif";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    statusEl.textContent = "GIF exported. You can convert it to MP4 for Spotify.";
    exporting = false;
    if (isPlaying) {
      loop();
    }
  });

  gif.render();
}
