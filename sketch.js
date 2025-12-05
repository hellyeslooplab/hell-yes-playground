// Hell Yes Playground — MP4 only, loop fechado
// - 8s conceituais (NUM_FRAMES = 8 * 24)
// - 24 fps, canvas 540x960 (9:16)
// - Fase discreta por frame (framePhase) → sem jump
// - Presets:
//   drift  → Preset 1: fatias curvas estáticas (reinterpretation)
//   slices → Preset 2: Signal Splitter (animado, harmônico 2)
//   melt   → Preset 3: Neon Melt (animado, harmônico 2)
//   scan   → Preset 4: Scanline Glitch (animado, harmônico 2)

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

// buffer para o preset 1 (imagem reinterpretada)
let preset1Buffer = null;
let preset1LastIntensity = -1;

// ------------------------------------------------------
// setup
// ------------------------------------------------------
function setup() {
  const cnv = createCanvas(540, 960); // 9:16
  canvas = cnv;
  cnv.parent("canvas-holder");

  frameRate(FPS);

  imgInput = document.getElementById("image-input");
  presetSelect = document.getElementById("preset");
  intensitySlider = document.getElementById("intensity");
  playToggleBtn = document.getElementById("play-toggle");
  exportVideoBtn = document.getElementById("export-video");
  statusEl = document.getElementById("status");

  imgInput.addEventListener("change", handleImageUpload);
  playToggleBtn.addEventListener("click", togglePlay);
  exportVideoBtn.addEventListener("click", startExportVideo);

  // UX: se trocar preset enquanto está pausado, redesenha 1 frame
  presetSelect.addEventListener("change", () => {
    framePhase = 0;
    if (!isPlaying && !recordingVideo) {
      redraw(); // funciona porque usamos noLoop() quando pausa
    }
  });

  // UX: mexer na intensidade com animação pausada atualiza o frame
  intensitySlider.addEventListener("input", () => {
    // reset do buffer do preset estático
    preset1Buffer = null;
    if (!isPlaying && !recordingVideo) {
      redraw();
    }
  });

  // por padrão, p5 loopa; draw vai parar sozinho quando baseImg for null
}

// ------------------------------------------------------
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

  const tNorm = framePhase / NUM_FRAMES;
  renderScene(tNorm);

  // avança fase discreta
  framePhase = (framePhase + 1) % NUM_FRAMES;

  // se estamos gravando, conta frames
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

        // nova imagem → refaz preset 1
        preset1Buffer = null;
        preset1LastIntensity = -1;

        // força redesenho se estiver pausado
        if (!isPlaying && !recordingVideo) {
          redraw();
        }
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

// ------------------------------------------------------
// Play / Pause
// ------------------------------------------------------
function togglePlay() {
  isPlaying = !isPlaying;
  playToggleBtn.textContent = isPlaying ? "Pause" : "Play";
  if (isPlaying) {
    loop();
  } else if (!recordingVideo) {
    noLoop();
  }
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
    // PRESET 1: reinterpretar com fatias curvas (estático)
    renderPreset1Slices(intensity);
  } else if (preset === "slices") {
    // PRESET 2: animado
    renderSlices(tNorm, intensity);
  } else if (preset === "melt") {
    // PRESET 3: animado
    renderMelt(tNorm, intensity);
  } else if (preset === "scan") {
    // PRESET 4: animado
    renderScan(tNorm, intensity);
  } else {
    image(baseImg, 0, 0, width, height);
  }

  drawVignette();
}

// ------------------------------------------------------
// PRESET 1 — Fatias curvas suaves + textura de papel (estático)
// ------------------------------------------------------
function renderPreset1Slices(intensity) {
  if (!baseImg) return;

  // Rebuild se ainda não existe ou se a intensidade mudou
  if (!preset1Buffer || Math.abs(intensity - preset1LastIntensity) > 0.01) {
    preset1Buffer = createGraphics(width, height);
    preset1Buffer.pixelDensity(1);

    // cor de fundo aproximada do bg do Processing (248,245,232)
    preset1Buffer.background(248, 245, 232);

    // reinterpretar com fatias curvas
    applyCurvedSlicesToBuffer(baseImg, preset1Buffer, intensity);

    // textura de papel
    applyPaperTextureToBuffer(preset1Buffer, intensity);

    preset1LastIntensity = intensity;
  }

  image(preset1Buffer, 0, 0, width, height);
}

function applyCurvedSlicesToBuffer(src, pg, intensity) {
  let y = 0;

  while (y < src.height) {
    let sliceH = random(15, 50);
    if (y + sliceH > src.height) sliceH = src.height - y;

    const slice = src.get(0, int(y), src.width, int(sliceH));

    const offsets = [];
    const freq = random(0.005, 0.015);
    const amp = random(5, 15) * (0.5 + intensity);
    const phase = random(TWO_PI);

    for (let i = 0; i < slice.width; i++) {
      offsets[i] = sin(i * freq + phase) * amp;
    }

    const deslocamentoX = random(-5, 5) * (0.5 + intensity);

    for (let j = 0; j < sliceH; j++) {
      for (let i = 0; i < slice.width; i++) {
        const c = slice.get(i, j);
        const r = red(c);
        const g = green(c);
        const b = blue(c);

        const r2 = constrain(r * random(0.97, 1.05), 0, 255);
        const g2 = constrain(g * random(0.97, 1.05), 0, 255);
        const b2 = constrain(b * random(0.97, 1.05), 0, 255);

        const xx = i + offsets[i] + deslocamentoX;
        const yy = y + j;

        pg.stroke(r2, g2, b2);
        pg.point(xx, yy);
      }
    }

    y += sliceH;
  }
}

function applyPaperTextureToBuffer(pg, intensity) {
  const baseDensity = 5000;
  const densidade = int(baseDensity * (0.5 + intensity));

  for (let i = 0; i < densidade; i++) {
    const x = random(pg.width);
    const y = random(pg.height);
    const r = random(0.3, 1.5);
    const alpha = int(random(5, 25));

    pg.noStroke();
    pg.fill(255, alpha);
    pg.ellipse(x, y, r, r);
  }
}

// ------------------------------------------------------
// PRESET 2 — Signal Splitter (animado, harmônico 2)
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
// PRESET 3 — Neon Melt (animado, harmônico 2)
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

// ------------------------------------------------------
// PRESET 4 — Scanline Glitch (animado, harmônico 2)
// ------------------------------------------------------
function renderScan(tNorm, intensity) {
  const rows = 90; // mais linhas = scan mais fino
  const rowH = height / rows;
  const t = tNorm * TWO_PI;

  // base: desenha linhas com deslocamento vertical + leve scaling
  for (let i = 0; i < rows; i++) {
    const y = i * rowH;
    const phase = t * 2.0 + i * 0.35; // harmônico 2
    const maxShiftY = 35 * intensity;
    const shiftY = sin(phase) * maxShiftY;

    const jitterX = sin(phase * 1.7) * 10 * intensity;
    const srcY = y;

    // linha principal
    image(baseImg, jitterX, y + shiftY, width, rowH, 0, srcY, width, rowH);
  }

  // leve RGB split (apenas nas bordas)
  push();
  blendMode(ADD);

  const rgbOffset = 10 * intensity;
  tint(255, 0, 0, 40);
  image(baseImg, -rgbOffset, -rgbOffset, width, height);

  tint(0, 255, 255, 35);
  image(baseImg, rgbOffset * 0.7, rgbOffset * 0.7, width, height);

  pop();
  noTint();
  blendMode(BLEND);

  // “scanline darkness”: reforça linhas escuras
  push();
  noFill();
  stroke(0, 40 + 80 * intensity);
  strokeWeight(1);
  for (let y = 0; y < height; y += 2) {
    line(0, y, width, y);
  }
  pop();
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

  // começa o ciclo do frame 0
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
