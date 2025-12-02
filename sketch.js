let speedSlider, sizeSlider, colorPicker;

function setup() {
  const cnv = createCanvas(500, 500);
  cnv.parent("canvas-holder");

  rectMode(CENTER);
  noStroke();

  speedSlider = document.getElementById("speed");
  sizeSlider = document.getElementById("size");
  colorPicker = document.getElementById("color");

  document.getElementById("save").addEventListener("click", () => {
    saveCanvas("hell_yes_playground", "png");
  });
}

function draw() {
  background(10);

  const speed = parseFloat(speedSlider.value);
  const baseSize = parseFloat(sizeSlider.value);
  const col = color(colorPicker.value);

  const t = frameCount * 0.02 * speed;

  const orbitRadius = 120;
  const x = width / 2 + cos(t * 1.3) * orbitRadius;
  const y = height / 2 + sin(t * 0.9) * orbitRadius;

  const pulse = sin(t) * 40;
  const s = baseSize + pulse;

  fill(col);
  noStroke();
  ellipse(x, y, s, s);

  push();
  translate(width / 2, height / 2);
  rotate(-t * 0.3);
  noFill();
  stroke(red(col), green(col), blue(col), 70);
  strokeWeight(4);
  rect(0, 0, s * 1.4, s * 0.7, 40);
  pop();
}
