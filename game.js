// =====================================================
//  CRIPTA 666 - juego web indie minimalista
//  JavaScript puro + Canvas + Web Audio (sin librerías)
// =====================================================

// ---------- 1. CONFIGURACIÓN BÁSICA ----------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;   // 960
const H = canvas.height;  // 540
const GROUND = 480;       // altura del suelo
const GRAVITY = 0.6;

// Plataformas de piedra (x, y, ancho)
const platforms = [
  { x: 140, y: 370, w: 220 },
  { x: 600, y: 370, w: 220 }
];

// ---------- 2. TECLADO ----------
const keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  const bloqueadas = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  if (bloqueadas.includes(e.code)) e.preventDefault();
  if (e.code === "Enter") handleEnter();
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

function pressLeft()  { return keys.KeyA || keys.ArrowLeft; }
function pressRight() { return keys.KeyD || keys.ArrowRight; }
function pressJump()  { return keys.KeyW || keys.ArrowUp || keys.Space; }
function pressShoot() { return keys.KeyJ || keys.KeyZ; }
function pressMelee() { return keys.KeyK || keys.KeyX; }

// ---------- 3. AUDIO (todo generado con código) ----------
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Un "beep": frecuencia, duración, tipo de onda, volumen y cambio de tono
function beep(freq, dur, type, vol, slide) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  }
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(t + dur);
}

// Ruido blanco (sirve para el estruendo de la escopeta)
function noise(dur, vol) {
  if (!audioCtx) return;
  const len = Math.floor(audioCtx.sampleRate * dur);
  const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const src = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  gain.gain.value = vol;
  src.buffer = buffer;
  src.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
}

const sfx = {
  shoot()  { noise(0.2, 0.4); beep(90, 0.2, "sawtooth", 0.2, -50); },
  empty()  { beep(80, 0.05, "square", 0.1, 0); },
  melee()  { beep(220, 0.1, "square", 0.15, -140); },
  hit()    { beep(150, 0.08, "square", 0.12, -60); },
  die()    { beep(300, 0.25, "sawtooth", 0.15, -250); },
  hurt()   { beep(110, 0.3, "square", 0.25, -70); },
  pickup() { beep(600, 0.1, "square", 0.12, 300); },
  wave()   { beep(200, 0.4, "triangle", 0.2, 200); },
  win()    { beep(400, 0.6, "triangle", 0.2, 400); },
  lose()   { beep(200, 0.8, "sawtooth", 0.2, -150); }
};

// Música: un bajo oscuro que se repite
const bassNotes = [55, 55, 65.4, 55, 49, 49, 58.3, 49];
let musicStep = 0;
let musicTimer = null;

function startMusic() {
  if (musicTimer) return;
  musicTimer = setInterval(() => {
    const n = bassNotes[musicStep % bassNotes.length];
    beep(n * 2, 0.25, "triangle", 0.08, 0);
    if (musicStep % 4 === 0) beep(n * 4, 0.15, "square", 0.03, 0);
    musicStep++;
  }, 300);
}

// ---------- 4. ESTADO DEL JUEGO ----------
let state = "menu"; // menu | play | over | win
let player, zombies, bullets, particles, drops;
let wave, toSpawn, spawnTimer, waveDelay, bossPending;
let score, quote, quoteTimer, shake, swingId;

const quotes = [
  "¡A descansar, huesos!",
  "Te toca la cripta.",
  "Uno menos. Faltan miles.",
  "Esta escopeta no perdona.",
  "Vengan por más.",
  "Buen intento, cadáver."
];

function resetGame() {
  player = {
    x: W / 2, y: GROUND - 48, w: 28, h: 48,
    vx: 0, vy: 0, kb: 0, dir: 1, onGround: true,
    hp: 100, ammo: 12,
    cd: 0, meleeT: 0, meleeCd: 0, inv: 0
  };
  zombies = [];
  bullets = [];
  particles = [];
  drops = [];
  wave = 0;
  toSpawn = 0;
  spawnTimer = 0;
  waveDelay = 90;
  bossPending = false;
  score = 0;
  quote = "";
  quoteTimer = 0;
  shake = 0;
  swingId = 0;
}

function handleEnter() {
  if (state === "play") return;
  initAudio();
  resetGame();
  state = "play";
  startMusic();
}

// ---------- 5. UTILIDADES ----------
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// Gravedad, suelo y plataformas (sirve para jugador y zombis)
function physics(e) {
  e.vy += GRAVITY;
  e.x += e.vx;
  const prevBottom = e.y + e.h;
  e.y += e.vy;
  e.onGround = false;
  const bottom = e.y + e.h;

  if (bottom >= GROUND) {
    e.y = GROUND - e.h;
    e.vy = 0;
    e.onGround = true;
  } else if (e.vy >= 0) {
    for (const p of platforms) {
      const dentro = e.x + e.w > p.x && e.x < p.x + p.w;
      if (dentro && prevBottom <= p.y && bottom >= p.y) {
        e.y = p.y - e.h;
        e.vy = 0;
        e.onGround = true;
      }
    }
  }
  if (e.x < 0) e.x = 0;
  if (e.x + e.w > W) e.x = W - e.w;
}

function blood(x, y, amount) {
  for (let i = 0; i < amount; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: -Math.random() * 5,
      life: 25 + Math.random() * 20
    });
  }
}

// ---------- 6. OLEADAS Y ZOMBIS ----------
function startWave() {
  wave++;
  sfx.wave();
  if (wave === 1) toSpawn = 6;
  if (wave === 2) toSpawn = 10;
  if (wave === 3) { toSpawn = 6; bossPending = true; }
  spawnTimer = 30;
}

function spawnZombie(isBoss, isFast) {
  const fromLeft = Math.random() < 0.5;
  const z = {
    x: fromLeft ? 0 : W - 28,
    y: GROUND - 48, w: 28, h: 48,
    vx: 0, vy: 0, kb: 0, stun: 0, jumpCd: 0,
    hp: 2, speed: 1.1, boss: false, fast: false,
    lastSwing: -1, onGround: true
  };
  if (isFast) { z.fast = true; z.speed = 2.1; z.hp = 1; }
  if (isBoss) {
    z.boss = true; z.w = 70; z.h = 110; z.hp = 40; z.speed = 1.2;
    z.y = GROUND - 110;
  }
  zombies.push(z);
}

function killZombie(z) {
  zombies.splice(zombies.indexOf(z), 1);
  score += z.boss ? 1000 : (z.fast ? 150 : 100);
  blood(z.x + z.w / 2, z.y + z.h / 2, z.boss ? 40 : 14);
  sfx.die();
  shake = z.boss ? 14 : 3;

  const r = Math.random();
  if (r < 0.30) drops.push({ x: z.x + z.w / 2 - 9, y: GROUND - 18, type: "ammo" });
  else if (r < 0.40) drops.push({ x: z.x + z.w / 2 - 9, y: GROUND - 18, type: "hp" });

  if (Math.random() < 0.15) {
    quote = quotes[Math.floor(Math.random() * quotes.length)];
    quoteTimer = 120;
  }
}

function hurtPlayer(dmg, fromX) {
  player.hp -= dmg;
  player.inv = 50;
  player.vy = -6;
  player.kb = fromX < player.x ? 8 : -8;
  shake = 8;
  sfx.hurt();
  blood(player.x + player.w / 2, player.y + 20, 8);
  if (player.hp <= 0) {
    player.hp = 0;
    state = "over";
    sfx.lose();
  }
}

// ---------- 7. ACTUALIZAR (lógica de cada cuadro) ----------
function update() {
  if (state !== "play") return;

  // --- jugador: movimiento ---
  player.vx = 0;
  if (pressLeft())  { player.vx = -4; player.dir = -1; }
  if (pressRight()) { player.vx = 4;  player.dir = 1; }
  if (pressJump() && player.onGround) player.vy = -12.5;
  player.x += player.kb;
  player.kb *= 0.85;
  physics(player);

  if (player.cd > 0) player.cd--;
  if (player.meleeCd > 0) player.meleeCd--;
  if (player.meleeT > 0) player.meleeT--;
  if (player.inv > 0) player.inv--;

  // --- jugador: disparo (escopeta, 5 perdigones) ---
  if (pressShoot() && player.cd <= 0) {
    if (player.ammo > 0) {
      player.ammo--;
      player.cd = 25;
      for (let i = -2; i <= 2; i++) {
        bullets.push({
          x: player.x + player.w / 2,
          y: player.y + 20,
          vx: player.dir * 12,
          vy: i * 0.7,
          life: 40
        });
      }
      player.kb = -player.dir * 2;
      sfx.shoot();
    } else {
      player.cd = 20;
      sfx.empty();
    }
  }

  // --- jugador: golpe cuerpo a cuerpo ---
  if (pressMelee() && player.meleeCd <= 0) {
    player.meleeT = 12;
    player.meleeCd = 24;
    swingId++;
    sfx.melee();
  }

  // --- balas ---
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;
    let borrar = b.life <= 0 || b.x < 0 || b.x > W;
    const caja = { x: b.x - 3, y: b.y - 3, w: 6, h: 6 };
    for (const z of zombies) {
      if (overlap(caja, z)) {
        z.hp--;
        sfx.hit();
        blood(b.x, b.y, 3);
        if (z.hp <= 0) killZombie(z);
        borrar = true;
        break;
      }
    }
    if (borrar) bullets.splice(i, 1);
  }

  // --- golpe: zona frente al jugador ---
  if (player.meleeT > 0) {
    const caja = {
      x: player.dir > 0 ? player.x + player.w : player.x - 40,
      y: player.y + 6, w: 40, h: 36
    };
    for (const z of zombies.slice()) {
      if (overlap(caja, z) && z.lastSwing !== swingId) {
        z.lastSwing = swingId;
        z.hp -= 3;
        z.kb = player.dir * 6;
        z.stun = 12;
        sfx.hit();
        blood(z.x + z.w / 2, z.y + 20, 6);
        if (z.hp <= 0) killZombie(z);
      }
    }
  }

  // --- zombis ---
  for (const z of zombies) {
    const dx = (player.x + player.w / 2) - (z.x + z.w / 2);
    if (z.stun > 0) {
      z.stun--;
      z.vx = z.kb;
    } else {
      z.vx = Math.abs(dx) > 4 ? Math.sign(dx) * z.speed : 0;
    }
    if (z.jumpCd > 0) z.jumpCd--;
    // si el jugador está más arriba (plataforma), el zombi salta
    if (z.onGround && z.jumpCd <= 0 && Math.abs(dx) < 90 && player.y + player.h < z.y + z.h - 40) {
      z.vy = -13;
      z.jumpCd = 90;
    }
    physics(z);

    if (overlap(z, player) && player.inv <= 0) {
      hurtPlayer(z.boss ? 25 : 10, z.x);
    }
  }

  // --- objetos del suelo ---
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    if (overlap({ x: d.x, y: d.y, w: 18, h: 18 }, player)) {
      if (d.type === "ammo") player.ammo = Math.min(30, player.ammo + 5);
      else player.hp = Math.min(100, player.hp + 25);
      sfx.pickup();
      drops.splice(i, 1);
    }
  }

  // --- partículas de sangre ---
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.3;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // --- control de oleadas ---
  if (waveDelay > 0) {
    waveDelay--;
    if (waveDelay === 0) startWave();
  } else if (toSpawn > 0 || bossPending) {
    spawnTimer--;
    if (spawnTimer <= 0) {
      if (bossPending) {
        spawnZombie(true, false);
        bossPending = false;
        spawnTimer = 60;
      } else {
        spawnZombie(false, wave === 2 && Math.random() < 0.4);
        toSpawn--;
        spawnTimer = 70;
      }
    }
  } else if (zombies.length === 0) {
    if (wave >= 3) {
      score += 500;
      state = "win";
      sfx.win();
    } else {
      score += 200 * wave;
      waveDelay = 150;
    }
  }

  if (quoteTimer > 0) quoteTimer--;
  if (shake > 0) shake *= 0.9;
}

// ---------- 8. DIBUJAR ----------
function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0d0812");
  g.addColorStop(1, "#2a1030");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // luna
  ctx.fillStyle = "#e8dfc8";
  ctx.beginPath();
  ctx.arc(780, 90, 38, 0, Math.PI * 2);
  ctx.fill();

  // castillo de fondo
  ctx.fillStyle = "#150a1c";
  ctx.fillRect(60, 250, 120, 230);
  ctx.fillRect(40, 220, 40, 60);
  ctx.fillRect(160, 220, 40, 60);
  ctx.fillRect(380, 300, 200, 180);
  ctx.fillRect(400, 260, 50, 60);
  ctx.fillRect(510, 260, 50, 60);
  ctx.fillRect(700, 270, 190, 210);
  ctx.fillRect(720, 230, 40, 60);
  ctx.fillRect(830, 230, 40, 60);
  // ventanas encendidas
  ctx.fillStyle = "#b3122b";
  ctx.fillRect(110, 300, 14, 24);
  ctx.fillRect(470, 340, 14, 24);
  ctx.fillRect(780, 320, 14, 24);

  // suelo
  ctx.fillStyle = "#3b2a2a";
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = "#4e3a38";
  ctx.fillRect(0, GROUND, W, 6);

  // plataformas
  for (const p of platforms) {
    ctx.fillStyle = "#5a4a55";
    ctx.fillRect(p.x, p.y, p.w, 16);
    ctx.fillStyle = "#6f5d6b";
    ctx.fillRect(p.x, p.y, p.w, 4);
  }
}

function drawPlayer() {
  if (player.inv > 0 && Math.floor(player.inv / 4) % 2 === 0) return;
  const p = player;
  // cuerpo (gabardina oscura)
  ctx.fillStyle = "#3a2a4a";
  ctx.fillRect(p.x, p.y + 14, p.w, p.h - 14);
  // cabeza
  ctx.fillStyle = "#d9b38c";
  ctx.fillRect(p.x + 4, p.y, 20, 16);
  // pelo
  ctx.fillStyle = "#e8dfc8";
  ctx.fillRect(p.x + 4, p.y, 20, 5);
  // escopeta
  ctx.fillStyle = "#222";
  const gx = p.dir > 0 ? p.x + p.w - 4 : p.x - 22;
  ctx.fillRect(gx, p.y + 22, 26, 6);
  // destello del golpe
  if (p.meleeT > 0) {
    ctx.fillStyle = "#e8dfc8";
    const sx = p.dir > 0 ? p.x + p.w : p.x - 40;
    ctx.fillRect(sx, p.y + 14, 40, 8);
  }
}

function drawZombie(z) {
  ctx.fillStyle = z.boss ? "#7a1020" : (z.fast ? "#8a9a3c" : "#5f8a3c");
  ctx.fillRect(z.x, z.y, z.w, z.h);
  // ropa rota
  ctx.fillStyle = z.boss ? "#2a0810" : "#3a3a50";
  ctx.fillRect(z.x, z.y + z.h * 0.45, z.w, z.h * 0.55);
  // ojos rojos
  ctx.fillStyle = "#ff3030";
  const ey = z.y + z.h * 0.15;
  ctx.fillRect(z.x + z.w * 0.2, ey, 5, 5);
  ctx.fillRect(z.x + z.w * 0.6, ey, 5, 5);
  // barra de vida del jefe
  if (z.boss) {
    ctx.fillStyle = "#000";
    ctx.fillRect(W / 2 - 150, H - 28, 300, 12);
    ctx.fillStyle = "#b3122b";
    ctx.fillRect(W / 2 - 150, H - 28, 300 * (z.hp / 40), 12);
    ctx.fillStyle = "#e8dfc8";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("EL CONDE", W / 2, H - 32);
  }
}

function drawFace() {
  const x = 16, y = 14, s = 56;
  ctx.fillStyle = "#000";
  ctx.fillRect(x - 3, y - 3, s + 6, s + 6);
  ctx.fillStyle = "#d9b38c";
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = "#e8dfc8";
  ctx.fillRect(x, y, s, 14);
  // ojos
  ctx.fillStyle = "#000";
  ctx.fillRect(x + 12, y + 24, 8, 8);
  ctx.fillRect(x + 36, y + 24, 8, 8);
  // boca
  ctx.fillRect(x + 16, y + 44, 24, 4);
  // heridas según la vida
  ctx.fillStyle = "#b3122b";
  if (player.hp < 70) ctx.fillRect(x + 6, y + 16, 4, 20);
  if (player.hp < 40) { ctx.fillRect(x + 40, y + 10, 6, 30); ctx.fillRect(x + 20, y + 36, 16, 4); }
  if (player.hp < 20) ctx.fillRect(x, y + 50, s, 6);
}

function drawHUD() {
  drawFace();
  ctx.textAlign = "left";
  ctx.font = "bold 16px monospace";
  ctx.fillStyle = "#000";
  ctx.fillRect(90, 18, 154, 18);
  ctx.fillStyle = "#b3122b";
  ctx.fillRect(92, 20, 150 * (player.hp / 100), 14);
  ctx.fillStyle = "#e8dfc8";
  ctx.fillText("VIDA " + player.hp, 92, 54);
  ctx.fillText("BALAS " + player.ammo, 92, 74);

  ctx.textAlign = "right";
  ctx.fillText("PUNTOS " + score, W - 20, 34);
  ctx.fillText("OLEADA " + Math.max(1, wave) + "/3", W - 20, 56);

  // avisos al centro
  ctx.textAlign = "center";
  if (waveDelay > 0) {
    ctx.font = "bold 40px Georgia";
    ctx.fillStyle = "#e8dfc8";
    ctx.fillText("OLEADA " + (wave + 1), W / 2, 160);
  }
  if (quoteTimer > 0) {
    ctx.font = "italic 22px Georgia";
    ctx.fillStyle = "#e8dfc8";
    ctx.fillText(quote, player.x + player.w / 2, player.y - 20);
  }
}

function drawCenterScreen(title, line1, line2) {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#b3122b";
  ctx.font = "bold 80px Georgia";
  ctx.fillText(title, W / 2, 200);
  ctx.fillStyle = "#e8dfc8";
  ctx.font = "22px Georgia";
  ctx.fillText(line1, W / 2, 270);
  ctx.fillText(line2, W / 2, 310);
}

function draw() {
  ctx.save();
  if (shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }

  drawBackground();

  if (state !== "menu") {
    for (const d of drops) {
      ctx.fillStyle = d.type === "ammo" ? "#e0b030" : "#e8dfc8";
      ctx.fillRect(d.x, d.y, 18, 18);
      ctx.fillStyle = d.type === "ammo" ? "#7a5a10" : "#b3122b";
      if (d.type === "ammo") ctx.fillRect(d.x + 6, d.y + 3, 6, 12);
      else { ctx.fillRect(d.x + 7, d.y + 3, 4, 12); ctx.fillRect(d.x + 3, d.y + 7, 12, 4); }
    }
    for (const z of zombies) drawZombie(z);
    drawPlayer();
    ctx.fillStyle = "#e8dfc8";
    for (const b of bullets) ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
    ctx.fillStyle = "#b3122b";
    for (const p of particles) ctx.fillRect(p.x, p.y, 4, 4);
    drawHUD();
  }

  ctx.restore();

  if (state === "menu") {
    drawCenterScreen("CRIPTA 666", "Un cazador, una escopeta y una cripta llena de zombis.", "Presiona ENTER para empezar");
  } else if (state === "over") {
    drawCenterScreen("HAS MUERTO", "Puntos: " + score, "Presiona ENTER para intentarlo de nuevo");
  } else if (state === "win") {
    drawCenterScreen("¡CRIPTA LIMPIA!", "Derrotaste al Conde. Puntos: " + score, "Presiona ENTER para jugar otra vez");
  }
}

// ---------- 9. BUCLE PRINCIPAL ----------
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

resetGame();
loop();
