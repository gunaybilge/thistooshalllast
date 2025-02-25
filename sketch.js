// ================================
// Global Configuration

// Harmonic synths (3 voices) configuration:
let harmonicConfigs = [
  { interval: 3, offset: 0, name: "Harmonic 1" },
  { interval: 3.5, offset: 0.5, name: "Harmonic 2" },
  { interval: 4, offset: 1, name: "Harmonic 3" },
];

// Drum synths (2 voices) configuration:
let drumConfigs = [
  { baseInterval: 2.5, speedFactor: 1, name: "Drum 1" },
  { baseInterval: 3.2, speedFactor: 1.5, name: "Drum 2" },
];

// Noise voice configuration (1 voice):
let noiseConfig = { interval: 4, offset: 2, name: "Noise" };

// A harmonic scale for the harmonic synths:
let scale = ["C3", "Db3", "Eb3", "F3", "Gb3", "A4", "Bb4", "C4"];

// Global arrays and variables:
let harmonicSynths = [];
let harmonicLFOs = [];
let activeHarmonicNotes = [];

let drumSynths = [];
let drumPitchShifts = [];
let drumDelayPitchShifts = [];

let noiseSynth;
let distortion;

let masterGain;
let started = false;

// Scheduling variables (using frameCount, at 30 fps)
let synthRate1 = 120;
let synthRate2 = 130;
let synthRate3 = 140;
let drumRate1 = 60;
let drumRate2 = 70;
let noiseRate = 196;

// Duration Variables (in seconds)
let harmonicNoteMinDuration = 0.5;
let harmonicNoteMaxDuration = 2.0;
let noiseNoteMinDuration = 3;
let noiseNoteMaxDuration = 5;

// Drum amplitude range:
let drumAmpMin = 0.1;
let drumAmpMax = 1;

let delayTimeRand = 0.1;
let feedbackRand = 0.1;
 let hpfilterRange = 200;
let drumDelay
let hpFilter

// Fixed start time for the timer (24 February 2025)
let startTime = new Date("2025-02-24T00:00:00");

// ================================
// Setup Function

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(30);
  background(20);

  // Create master gain.
  masterGain = new Tone.Gain(1);
  masterGain.toDestination();

  // ----------- Harmonic Synths -----------
  let harmonicOscTypes = ["sine", "triangle", "sine"];
  let attackRand = random(0.3, 1);
  let decayRand = random(0.3, 1);
  for (let i = 0; i < harmonicConfigs.length; i++) {
    let synth = new Tone.Synth({
      oscillator: { type: harmonicOscTypes[i % harmonicOscTypes.length] },
      envelope: {
        attack: attackRand,
        decay: decayRand,
        sustain: 0.7,
        release: 2,
      },
    });

    let lpFilter = new Tone.Filter(2000, "lowpass");

    let harmonicReverb;
    if (i === 0) {
      harmonicReverb = new Tone.Reverb({ decay: 20, preDelay: 0.5, wet: 0.5 });
    } else if (i === 1) {
      harmonicReverb = new Tone.Reverb({ decay: 5, preDelay: 0.7, wet: 0.6 });
    } else {
      harmonicReverb = new Tone.Reverb({ decay: 10, preDelay: 0.6, wet: 0.55 });
    }
    harmonicReverb.generate();

    let synthGain;
    if (i === 0) synthGain = new Tone.Gain(0.5);
    else if (i === 1) synthGain = new Tone.Gain(0.3);
    else synthGain = new Tone.Gain(0.15);

    // Chain: synth -> filter -> reverb -> individual gain -> master gain.
    synth.chain(lpFilter, harmonicReverb, synthGain, masterGain);
    harmonicSynths.push(synth);
    activeHarmonicNotes.push("");

    let lfo = new Tone.LFO({
      frequency: random(0.03, 0.08),
      min: -12,
      max: 0,
    }).start();
    // Uncomment the next line if you want to apply LFO to synth volume:
    // lfo.connect(synth.volume);
    harmonicLFOs.push(lfo);
  }

  // ----------- Drum Synths -----------
  // Using a NoiseSynth for high-pitched crackling drum sounds.
  for (let i = 0; i < drumConfigs.length; i++) {
    let drum = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 },
    });
    let pitchShift = new Tone.PitchShift({ pitch: 5 });

    let delayPitchShift = new Tone.PitchShift({ pitch: 0 });

     drumDelay = new Tone.FeedbackDelay({
      delayTime: delayTimeRand,
      feedback: feedbackRand,
      wet: 0.4,
    });

   
     hpFilter = new Tone.Filter(hpfilterRange, "lowpass");

    let drumReverb;
    if (i === 0) {
      drumReverb = new Tone.Reverb({ decay: 4, preDelay: 0.2, wet: 0.5 });
    } else {
      drumReverb = new Tone.Reverb({ decay: 5, preDelay: 0.3, wet: 0.6 });
    }
    drumReverb.generate();

    let drumGainAmp = random(0.1, 0.6);
    let drumGain = new Tone.Gain(drumGainAmp);

    // Chain: drum -> pitchShift -> delay -> delayPitchShift -> highpass -> reverb -> gain -> master gain.
    drum.chain(
      drumDelay,
      delayPitchShift,
      hpFilter,
      drumReverb,
      drumGain,
      masterGain
    );
    drumSynths.push(drum);
    drumPitchShifts.push(pitchShift);
    if (!window.drumDelayPitchShifts) window.drumDelayPitchShifts = [];
    window.drumDelayPitchShifts.push(delayPitchShift);
  }

  // ----------- Noise Synth -----------
  let lpFilter2 = new Tone.Filter(800, "lowpass");
  noiseSynth = new Tone.NoiseSynth({
    noise: { type: "brown" },
    envelope: { attack: 2, decay: 2, sustain: 0.5, release: 4 },
  });
  distortion = new Tone.Distortion(0.25);

  let noiseReverb = new Tone.Reverb({ decay: 8, preDelay: 0.4, wet: 0.7 });
  noiseReverb.generate();

  let noiseGain = new Tone.Gain(0.3);

  noiseSynth.chain(lpFilter2, distortion, noiseReverb, noiseGain, masterGain);

  // Setup start button (if not already created in HTML).
  let btn = select("#startButton");
  if (btn) {
    btn.mousePressed(startAudio);
  }
}

// ================================
// Helper Function: Pick a random note (from scale)
function pickRandomNote(scale) {
  return random(scale);
}

// ================================
// Audio Start Function
function startAudio() {
  if (!started) {
    Tone.start().then(() => {
      started = true;
      // Hide the start button.
      let btn = select("#startButton");
      if (btn) btn.hide();
      background(20);
    });
  }
}

// ================================
// Draw Loop for Scheduling and Text Visuals
function draw() {
  // Do not schedule events until audio has started.
  if (!started) {
    // Show instructions if not started.
    background(20);
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("Generative Music Radio", width / 2, height * 0.15);
    textSize(16);
    text(
      "This generative music algorithm uses three synths, two drum synths, and one noise synth,\nplaying randomly and continuously. Its ever-changing nature creates a unique soundscape that is never repeated.\nGenerative Music Radio is live since 24 February 2025.",
      width / 2,
      height * 0.25
    );
    let now = new Date();
    let diffMinutes = floor((now - new Date("2025-02-24T00:00:00")) / 60000);
    text("Playing for " + diffMinutes + " minutes", width / 2, height * 0.3);
    return;
  }

  // Once started, redraw the fading background.
  background(20, 20, 20, 50);

  // Draw Title, Description, and Timer.
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);

  textSize(32);
  text("Generative Music Radio", width / 2, height * 0.15);

  textSize(16);
  text(
    "This generative music algorithm uses three synths, two drum synths, and one noise synth,\nplaying randomly and continuously. Its ever-changing nature creates a unique soundscape that is never repeated.\nGenerative Music Radio is live since 24 February 2025.",
    width / 2,
    height * 0.25
  );

  let now = new Date();
  let diffMinutes = floor((now - new Date("2025-02-24T00:00:00")) / 60000);
  text("Playing for " + diffMinutes + " minutes", width / 2, height * 0.3);

  // ----- Scheduling: Harmonic Synths -----
  if (frameCount % synthRate1 === 0) {
    let note = pickRandomNote(scale);
    let duration = random(harmonicNoteMinDuration, harmonicNoteMaxDuration);
    harmonicSynths[0].triggerAttackRelease(note, duration, Tone.now());
    activeHarmonicNotes[0] = { note: note, triggerFrame: frameCount };
    synthRate1 = random([120, 110, 130, 160, 90, 30, 15, 5]);
  }
  if (frameCount % synthRate2 === 0) {
    let note = pickRandomNote(scale);
    let duration = random(harmonicNoteMinDuration, harmonicNoteMaxDuration);
    harmonicSynths[1].triggerAttackRelease(note, duration, Tone.now());
    activeHarmonicNotes[1] = { note: note, triggerFrame: frameCount };
    synthRate2 = random([120, 110, 130, 160, 90, 30, 15, 5]);
  }
  if (frameCount % synthRate3 === 0) {
    let note = pickRandomNote(scale);
    let duration = random(harmonicNoteMinDuration, harmonicNoteMaxDuration);
    harmonicSynths[2].triggerAttackRelease(note, duration, Tone.now());
    activeHarmonicNotes[2] = { note: note, triggerFrame: frameCount };
    synthRate3 = random([120, 110, 130, 160, 90]);
  }

  // ----- Scheduling: Drum Synths -----
  if (frameCount % drumRate1 === 0) {
    window.drumDelayPitchShifts[0].pitch.value = random(-3, 3);
    drumSynths[0].triggerAttackRelease(
      "8n",
      Tone.now(),
      random(drumAmpMin, drumAmpMax)
    );
    drumRate1 = random([60, 70, 80, 90, 100, 10, 30]);

    
    hpFilter.frequency.value =  random(4000, 10000);
    drumDelay.delayTime.value = random(0.05, 0.5);
    drumDelay.feedback.value = random(0.05, 0.6);
  }
  if (frameCount % drumRate2 === 0) {
    window.drumDelayPitchShifts[1].pitch.value = random(-3, 3);
    drumSynths[1].triggerAttackRelease(
      "8n",
      Tone.now(),
      random(drumAmpMin, drumAmpMax)
    );
    drumRate2 = random([60, 70, 80, 90, 100, 10, 30]);

    hpfilterRange = random(200, 1200);
    drumDelay.delayTime.value = random(0.05, 0.5);
    drumDelay.feedback.value = random(0.05, 0.6);
  }

  // ----- Scheduling: Noise Synth -----
  if (frameCount % noiseRate === 0) {
    let nDuration = random(noiseNoteMinDuration, noiseNoteMaxDuration);
    noiseSynth.triggerAttackRelease(nDuration, Tone.now());
    noiseRate = random([196, 184, 211, 190, 173]);
  }
}
