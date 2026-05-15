let noiseOsc;
let filter;

let isRunning = false;
let nextPhraseTime = 0;

let controls = {};
let modeSelect;

let bodyParts = [
  "left hand",
  "right hand",
  "left foot",
  "right foot"
];

let colors = [
  "red",
  "blue",
  "yellow",
  "green"
];

let twisterFragments = [
  "spin again",
  "hold position",
  "do not move",
  "wrong hand",
  "wrong foot",
  "reset the board",
  "too close",
  "switch sides",
  "balance failing",
  "floor is listening",
  "the mat remembers",
  "next color"
];

let twisterSentences = [
  "left hand red",
  "left hand blue",
  "left hand yellow",
  "left hand green",

  "right hand red",
  "right hand blue",
  "right hand yellow",
  "right hand green",

  "left foot red",
  "left foot blue",
  "left foot yellow",
  "left foot green",

  "right foot red",
  "right foot blue",
  "right foot yellow",
  "right foot green"
];

function setup() {
  createCanvas(windowWidth, windowHeight);

  textFont("monospace");
  textSize(16);

  filter = new p5.BandPass();

  noiseOsc = new p5.Noise("white");
  noiseOsc.disconnect();
  noiseOsc.connect(filter);

  filter.res(18);

  createControls();
}

function draw() {
  background(8);

  drawTitle();
  drawControlReadout();

  if (isRunning) {
    updateAudio();
    handlePhraseTiming();
  }
}

function mousePressed() {
  if (mouseX < 320 && mouseY < 520) return;

  userStartAudio();

  isRunning = !isRunning;

  if (isRunning) {
    noiseOsc.start();
    nextPhraseTime = millis() + 500;
  } else {
    noiseOsc.stop();
    speechSynthesis.cancel();
  }
}

function createControls() {
  let y = 60;

  controls.density = makeSlider("DENSITY", 20, y, 0, 3, 0.6, 0.01);
  y += 40;

  controls.clarity = makeSlider("CLARITY", 20, y, -1, 2, 0.4, 0.01);
  y += 40;

  controls.panic = makeSlider("PANIC", 20, y, 0, 5, 0.4, 0.01);
  y += 40;

  controls.static = makeSlider("STATIC", 20, y, 0, 4, 0.5, 0.01);
  y += 40;

  controls.filter = makeSlider("FILTER", 20, y, 40, 12000, 900, 1);
  y += 40;

  controls.pitch = makeSlider("PITCH", 20, y, 0.02, 5, 0.8, 0.01);
  y += 40;

  controls.rate = makeSlider("RATE", 20, y, 0.05, 4, 0.9, 0.01);
  y += 40;

  controls.dropout = makeSlider("DROPOUT", 20, y, 0, 3, 0.2, 0.01);
  y += 40;

  controls.stutter = makeSlider("STUTTER", 20, y, 0, 5, 0.3, 0.01);
  y += 50;

  createDiv("MODE")
    .position(20, y)
    .style("color", "#ddd")
    .style("font-family", "monospace");

  modeSelect = createSelect();
  modeSelect.position(90, y);

  modeSelect.option("mixed");
  modeSelect.option("spinner");
  modeSelect.option("cut-up");
  modeSelect.option("sentences");
  modeSelect.option("fragments");

  modeSelect.selected("spinner");
}

function makeSlider(label, x, y, min, max, start, step) {
  createDiv(label)
    .position(x, y)
    .style("color", "#ddd")
    .style("font-family", "monospace")
    .style("font-size", "12px");

  let slider = createSlider(min, max, start, step);
  slider.position(x + 90, y);
  slider.size(180);

  return slider;
}

function drawTitle() {
  fill(240);
  textSize(22);
  text("TWISTER GHOST SPINNER", 20, 30);

  textSize(14);
  fill(isRunning ? 120 : 180);

  text(
    isRunning ? "SPINNER ARMED" : "CLICK RIGHT SIDE TO ARM SPINNER",
    360,
    70
  );

  fill(120);
  text("Click outside controls to start / stop", 360, 95);
}

function drawControlReadout() {
  fill(180);
  textSize(13);

  let x = 360;
  let y = 140;

  text("CURRENT PATCH", x, y);
  y += 30;

  text("density: " + nf(controls.density.value(), 1, 2), x, y);
  y += 22;

  text("clarity: " + nf(controls.clarity.value(), 1, 2), x, y);
  y += 22;

  text("panic: " + nf(controls.panic.value(), 1, 2), x, y);
  y += 22;

  text("static: " + nf(controls.static.value(), 1, 2), x, y);
  y += 22;

  text("filter: " + int(controls.filter.value()) + " hz", x, y);
  y += 22;

  text("pitch: " + nf(controls.pitch.value(), 1, 2), x, y);
  y += 22;

  text("rate: " + nf(controls.rate.value(), 1, 2), x, y);
  y += 22;

  text("dropout: " + nf(controls.dropout.value(), 1, 2), x, y);
  y += 22;

  text("stutter: " + nf(controls.stutter.value(), 1, 2), x, y);
  y += 30;

  text("mode: " + modeSelect.value(), x, y);
}

function updateAudio() {
  let staticAmount = controls.static.value();
  let panic = controls.panic.value();
  let filterFreq = controls.filter.value();

  let staticLevel = map(staticAmount, 0, 4, 0, 0.9);
  noiseOsc.amp(staticLevel, 0.05);

  let jitter = random(-3000, 3000) * (panic * 0.25);

  filter.freq(constrain(filterFreq + jitter, 40, 12000));
  filter.res(map(panic, 0, 5, 5, 60));
}

function handlePhraseTiming() {
  if (millis() > nextPhraseTime) {
    speakTwisterPhrase();

    let density = controls.density.value();
    let panic = controls.panic.value();

    let minGap = map(density, 0, 3, 7000, 40);
    let maxGap = map(density, 0, 3, 12000, 400);

    minGap *= map(panic, 0, 5, 1, 0.1);
    maxGap *= map(panic, 0, 5, 1, 0.15);

    nextPhraseTime = millis() + random(minGap, maxGap);
  }
}

function speakTwisterPhrase() {
  let phrase = generateTwisterPhrase();

  phrase = applyDropout(phrase);
  phrase = applyStutter(phrase);

  if (phrase.trim().length === 0) return;

  let voice = new SpeechSynthesisUtterance(phrase);
  let panic = controls.panic.value();

  voice.pitch = constrain(
    controls.pitch.value() + random(-1.5, 1.5) * panic * 0.25,
    0.02,
    5
  );

  voice.rate = constrain(
    controls.rate.value() + random(-1.2, 2.5) * panic * 0.2,
    0.05,
    4
  );

  voice.volume = constrain(
    0.2 + panic * 0.2 + random(-0.3, 0.3),
    0,
    1
  );

  speechSynthesis.speak(voice);

  console.log("SPIN:", phrase);
}

function generateTwisterPhrase() {
  let mode = modeSelect.value();

  if (mode === "spinner") {
    return generateSpinnerCombo();
  }

  if (mode === "cut-up") {
    return generateCutUpPhrase();
  }

  if (mode === "sentences") {
    return pick(twisterSentences);
  }

  if (mode === "fragments") {
    return pick(twisterFragments);
  }

  // mixed mode
  let r = random();

  if (r < 0.5) {
    return generateSpinnerCombo();
  } else if (r < 0.7) {
    return pick(twisterSentences);
  } else if (r < 0.9) {
    return generateCutUpPhrase();
  } else {
    return pick(twisterFragments);
  }
}

function generateSpinnerCombo() {
  return pick(bodyParts) + " " + pick(colors);
}

function generateCutUpPhrase() {
  let source = pick(twisterSentences).split(" ");
  let output = [];

  let count = floor(random(1, source.length + 1));

  for (let i = 0; i < count; i++) {
    output.push(pick(source));
  }

  return output.join(" ");
}

function applyDropout(phrase) {
  let dropout = controls.dropout.value();
  let probability = map(dropout, 0, 3, 0, 0.95);

  if (random() > probability) return phrase;

  let parts = phrase.split(" ");
  let keepCount = floor(random(1, parts.length + 1));

  return parts.slice(0, keepCount).join(" ");
}

function applyStutter(phrase) {
  let stutter = controls.stutter.value();
  let probability = map(stutter, 0, 5, 0, 1);

  if (random() > probability) return phrase;

  let parts = phrase.split(" ");
  let word = pick(parts);

  let repeatCount = floor(random(2, 12));
  let repeated = [];

  for (let i = 0; i < repeatCount; i++) {
    repeated.push(word);
  }

  if (random() < 0.5) {
    return repeated.join(" ") + " " + phrase;
  } else {
    return phrase + " " + repeated.join(" ");
  }
}

function pick(arr) {
  return arr[floor(random(arr.length))];
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}