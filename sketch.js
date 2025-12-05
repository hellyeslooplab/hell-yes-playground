// Hell Yes Playground — MP4 only, loop fechado
// - Loop definido por tempo real: LOOP_SECONDS (8s)
// - 24 fps alvo para preview, canvas 540x960 (9:16)
// - Presets:
//     drift  → Multi-layer Radial Twist (do sketch em Processing)
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

// buffer de distorção para o preset 1
let distortedImg = null;

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

        // prepara buffer de distorção do tamanho correto
        distortedImg = createImage(width, height);
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
    // Multi-layer Radial Twist (adaptação do sketch de Processing)
    renderMultiLayerRadialTwist(tNorm, intensity);
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
// PRESET 1 — MULTI-LAYER RADIAL TWIST
// Adaptação fiel do sketch de Processing para p5.js
// (usa baseImg já redimensionada ao canvas)
// intensity escala a força das distorções
// ------------------------------------------------------
function renderMultiLayerRadialTwist(tNorm, intensity) {
  if (!baseImg) return;
  if (!distortedImg) distortedImg = createImage(width, height);

  const strength = 0.4 + intensity; // fator extra de força

  const loopAngle = TWO_PI * tNorm; // 0..2π
  const cx = width / 2;
  const cy = height / 2;

  baseImg.loadPixels();
  distortedImg.loadPixels();

  const w = width;
  const h = height;
  const imgW = baseImg.width;
  const imgH = baseImg.height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // --------- CAMADAS ORIGINAIS (adaptadas) ---------
      let dx =
        60 * strength * Math.sin(loopAngle + y * 0.01) +
        30 * strength * Math.sin(loopAngle * 2.0 + y * 0.03) +
        25 * strength * Math.cos(loopAngle * 3.0 + (x + y) * 0.02) +
        10 * strength * Math.sin(loopAngle * 6.0 + x * 0.05);

      let dy =
        40 * strength * Math.cos(loopAngle + x * 0.01) +
        50 * strength * Math.cos(loopAngle * 2.0 + y * 0.02) +
        25 * strength * Math.sin(loopAngle * 3.0 + (x - y) * 0.02) +
        10 * strength * Math.cos(loopAngle * 6.0 + y * 0.05);

      // --------- CAMADA: ONDAS RADIÁIS ---------
      const dxC = x - cx;
      const dyC = y - cy;
      const distCenter = Math.sqrt(dxC * dxC + dyC * dyC);

      const radialShift = 40 * strength * Math.sin(loopAngle * 2 + distCenter * 0.02);
      dx += Math.cos((y - cy) * 0.01) * radialShift * 0.5;
      dy += Math.sin((x - cx) * 0.01) * radialShift * 0.5;

      // --------- CAMADA: TWIST ROTACIONAL ---------
      const angle = Math.atan2(dyC, dxC);
      const radius = distCenter;
      const twist = 0.2 * strength * Math.sin(loopAngle * 2);
      const newAngle = angle + twist;
      const tx = cx + radius * Math.cos(newAngle);
      const ty = cy + radius * Math.sin(newAngle);

      dx += (tx - x) * 0.3;
      dy += (ty - y) * 0.3;

      // --------- AMOSTRAGEM / WRAP ---------
      let sx = (x + dx + w) % w;
      let sy = (y + dy + h) % h;

      if (sx < 0) sx += w;
      if (sy < 0) sy += h;

      const sxImg = Math.floor((sx / w) * (imgW - 1));
      const syImg = Math.floor((sy / h) * (imgH - 1));

      const srcIndex = (syImg * imgW + sxImg) * 4;
      const dstIndex = (y * w + x) * 4;

      distortedImg.pixels[dstIndex + 0] = baseImg.pixels[srcIndex + 0];
      distortedImg.pixels[dstIndex + 1] = baseImg.pixels[srcIndex + 1];
      distortedImg.pixels[dstIndex + 2] = baseImg.pixels[srcIndex + 2];
      distortedImg.pixels[dstIndex + 3] = 255;
    }
  }

  distortedImg.updatePixels();
  image(distortedImg, 0, 0, width, height);
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
    const shiftX = Math.sin(glitchPhase) * maxShift;

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
    const offsetY = Math.sin(wavePhase) * maxOffset;

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
