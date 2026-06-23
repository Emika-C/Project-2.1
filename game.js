const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const heightLabel = document.getElementById("heightLabel");
const checkpointLabel = document.getElementById("checkpointLabel");
const p1BreedLabel = document.getElementById("p1BreedLabel");
const p2BreedLabel = document.getElementById("p2BreedLabel");
const p1CoinsLabel = document.getElementById("p1CoinsLabel");
const p2CoinsLabel = document.getElementById("p2CoinsLabel");
const p1LivesIcons = document.getElementById("p1LivesIcons");
const p2LivesIcons = document.getElementById("p2LivesIcons");

const startMenu = document.getElementById("startMenu");
const startMessage = document.getElementById("startMessage");
const breedSelectP1 = document.getElementById("breedSelectP1");
const breedSelectP2 = document.getElementById("breedSelectP2");
const startButton = document.getElementById("startButton");

const deathScreen = document.getElementById("deathScreen");
const deathMessage = document.getElementById("deathMessage");
const restartButton = document.getElementById("restartButton");

const WORLD_TOP = -7200;
const GROUND_Y = 488;
const MAX_LIVES = 9;
const FALL_TO_GROUND_DISTANCE = 145;

const CAT_BREEDS = {
  tabby: { name: "Tabby", fur: "#c58d56", dark: "#83512f", ear: "#9f6a44", eye: "#203449" },
  siamese: { name: "Siamese", fur: "#dfd4c2", dark: "#5e4738", ear: "#846a57", eye: "#2a5f97" },
  bombay: { name: "Bombay", fur: "#1f2430", dark: "#374053", ear: "#12151d", eye: "#f0d97c" },
  calico: { name: "Calico", fur: "#f4eadb", dark: "#a15f3a", ear: "#d7835b", eye: "#27384c" },
  ragdoll: { name: "Ragdoll", fur: "#d7deeb", dark: "#7f8ea7", ear: "#8e9cb3", eye: "#326aa0" },
};

const game = {
  width: canvas.width,
  height: canvas.height,
  gravity: 0.58,
  maxFall: 13,
  cameraY: 0,
  started: false,
  over: false,
  keys: {
    p1Left: false,
    p1Right: false,
    p1JumpPressed: false,
    p1JumpHeld: false,
    p2Left: false,
    p2Right: false,
    p2JumpPressed: false,
    p2JumpHeld: false,
  },
};

const platforms = [];
const checkpoints = [];
const stars = [];
const clouds = [];
const flowers = [];
const coins = [];

function makeCat(id, spawnX, breedKey) {
  return {
    id,
    x: spawnX,
    y: 430,
    w: 34,
    h: 46,
    vx: 0,
    vy: 0,
    speed: 0.63,
    maxSpeed: 5.2,
    friction: 0.8,
    jumpPower: 12.8,
    onGround: false,
    facing: 1,
    peakY: 430,
    jumpStartY: 430,
    breedKey,
    lives: MAX_LIVES,
    coins: 0,
    active: true,
    checkpoint: {
      x: spawnX,
      y: 452,
      id: "Ground",
    },
  };
}

let cats = [makeCat("Cat 1", 130, "tabby"), makeCat("Cat 2", 200, "siamese")];

function addPlatform(x, y, w, h = 16, kind = "stone") {
  platforms.push({ x, y, w, h, kind });
}

function addCheckpoint(x, y, id) {
  checkpoints.push({ x, y, w: 18, h: 34, id, touched: id === "Ground" });
}

function seededNoise(i) {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function buildWorld() {
  platforms.length = 0;
  checkpoints.length = 0;
  flowers.length = 0;
  stars.length = 0;
  clouds.length = 0;
  coins.length = 0;

  addPlatform(-200, GROUND_Y, 1600, 60, "grass");
  addPlatform(-200, 548, 1600, 280, "dirt");

  for (let i = 0; i < 24; i += 1) {
    flowers.push({
      x: 22 + i * 42 + seededNoise(i) * 16,
      y: 486,
      color: i % 3 === 0 ? "#ffd166" : i % 3 === 1 ? "#ff7aa2" : "#fef08a",
      scale: 0.8 + seededNoise(i + 1) * 0.6,
    });
  }

  const introPlatforms = [
    { x: 240, y: 430, w: 170 },
    { x: 440, y: 360, w: 160 },
    { x: 580, y: 290, w: 150 },
    { x: 430, y: 220, w: 150 },
    { x: 240, y: 150, w: 150 },
  ];

  for (const p of introPlatforms) {
    addPlatform(p.x, p.y, p.w, 14, "stone");
  }

  addCheckpoint(275, 116, "Low Hills");

  let y = 60;
  let x = 360;
  let index = 0;

  // Constrained generation keeps horizontal/vertical deltas jumpable.
  while (y > WORLD_TOP + 140) {
    const width = 118 + seededNoise(index + 8) * 52;
    const horizontalStep = (seededNoise(index + 11) - 0.5) * 250;
    const verticalStep = 60 + seededNoise(index + 14) * 28;

    y -= verticalStep;
    x += horizontalStep;

    x = Math.max(70, Math.min(game.width - width - 70, x));

    const typeRoll = seededNoise(index + 17);
    const kind = typeRoll > 0.8 ? "metal" : typeRoll > 0.45 ? "stone" : "grass";
    addPlatform(x, y, width, 14, kind);

    if (index % 10 === 5) {
      const helperX = Math.max(50, Math.min(game.width - 110, x + (seededNoise(index + 20) - 0.5) * 140));
      addPlatform(helperX, y - 42, 108, 12, "stone");
    }

    if (index % 8 === 4) {
      const altitude = Math.max(0, Math.round(-y / 10));
      addCheckpoint(x + 12, y - 34, `${altitude} m`);
    }

    if (index % 2 === 0) {
      coins.push({ x: x + width * 0.5, y: y - 20, collectedBy: null });
    }

    index += 1;
  }

  addCheckpoint(130, 452, "Ground");

  for (let i = 0; i < 100; i += 1) {
    stars.push({
      x: seededNoise(i + 101) * game.width,
      y: WORLD_TOP + seededNoise(i + 130) * (-WORLD_TOP),
      size: 1 + seededNoise(i + 31) * 2,
      twinkle: seededNoise(i + 350) * Math.PI * 2,
    });
  }

  for (let i = 0; i < 16; i += 1) {
    clouds.push({
      x: seededNoise(i + 211) * (game.width + 260) - 130,
      y: 60 - i * 240,
      w: 120 + seededNoise(i + 240) * 140,
      h: 44 + seededNoise(i + 251) * 28,
      drift: 0.15 + seededNoise(i + 262) * 0.2,
    });
  }
}

function livesIcons(lives) {
  return "[=] ".repeat(lives).trim();
}

function updateHud() {
  const highest = Math.max(cats[0].peakY, cats[1].peakY);
  const meters = Math.max(0, Math.round(-highest / 10));
  heightLabel.textContent = `Height: ${meters} m`;

  checkpointLabel.textContent = `Checkpoint: C1 ${cats[0].checkpoint.id} | C2 ${cats[1].checkpoint.id}`;

  p1BreedLabel.textContent = `Breed: ${CAT_BREEDS[cats[0].breedKey].name}`;
  p2BreedLabel.textContent = `Breed: ${CAT_BREEDS[cats[1].breedKey].name}`;

  p1CoinsLabel.textContent = `Coins: ${cats[0].coins}`;
  p2CoinsLabel.textContent = `Coins: ${cats[1].coins}`;

  p1LivesIcons.textContent = livesIcons(cats[0].lives);
  p2LivesIcons.textContent = livesIcons(cats[1].lives);
}

function resetCats(breed1, breed2) {
  cats = [makeCat("Cat 1", 130, breed1), makeCat("Cat 2", 200, breed2)];

  for (const cp of checkpoints) {
    cp.touched = cp.id === "Ground";
  }

  for (const coin of coins) {
    coin.collectedBy = null;
  }
}

function startRun() {
  const breed1 = CAT_BREEDS[breedSelectP1.value] ? breedSelectP1.value : "tabby";
  const breed2 = CAT_BREEDS[breedSelectP2.value] ? breedSelectP2.value : "siamese";

  resetCats(breed1, breed2);

  game.started = true;
  game.over = false;
  game.cameraY = 0;

  for (const cat of cats) {
    respawnAtCheckpoint(cat);
  }

  startMenu.hidden = true;
  deathScreen.hidden = true;
  startButton.textContent = "Start Climb";
  startMessage.textContent = "Pick breeds and begin your 2-player climb. Each cat has 9 lives.";

  updateHud();
}

function setupMenus() {
  startButton.addEventListener("click", startRun);
  restartButton.addEventListener("click", () => {
    deathScreen.hidden = true;
    startMenu.hidden = false;
  });
}

function setKeyState(code, isDown) {
  if (code === "ArrowLeft" || code === "KeyA") game.keys.p1Left = isDown;
  if (code === "ArrowRight" || code === "KeyD") game.keys.p1Right = isDown;
  if (code === "ArrowUp" || code === "KeyW" || code === "Space") {
    if (isDown && !game.keys.p1JumpHeld) game.keys.p1JumpPressed = true;
    game.keys.p1JumpHeld = isDown;
  }

  if (code === "KeyJ") game.keys.p2Left = isDown;
  if (code === "KeyL") game.keys.p2Right = isDown;
  if (code === "KeyI") {
    if (isDown && !game.keys.p2JumpHeld) game.keys.p2JumpPressed = true;
    game.keys.p2JumpHeld = isDown;
  }
}

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW", "KeyI", "KeyJ", "KeyL"].includes(e.code)) {
    e.preventDefault();
  }
  setKeyState(e.code, true);
});

window.addEventListener("keyup", (e) => {
  setKeyState(e.code, false);
});

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function findLandingPlatform(cat, prevY, nextY) {
  let landing = null;
  let bestY = Number.POSITIVE_INFINITY;

  for (const platform of platforms) {
    const overlapsX = cat.x + cat.w > platform.x && cat.x < platform.x + platform.w;
    if (!overlapsX) continue;

    const prevBottom = prevY + cat.h;
    const nextBottom = nextY + cat.h;
    const crossedTop = prevBottom <= platform.y && nextBottom >= platform.y;
    if (!crossedTop) continue;

    if (platform.y < bestY) {
      bestY = platform.y;
      landing = platform;
    }
  }

  return landing;
}

function collectCoins(cat) {
  for (const coin of coins) {
    if (coin.collectedBy) continue;
    const dx = cat.x + cat.w * 0.5 - coin.x;
    const dy = cat.y + cat.h * 0.45 - coin.y;
    if (dx * dx + dy * dy <= 18 * 18) {
      coin.collectedBy = cat.id;
      cat.coins += 1;
    }
  }
}

function respawnAtCheckpoint(cat) {
  cat.x = cat.checkpoint.x;
  cat.y = cat.checkpoint.y - cat.h;
  cat.vx = 0;
  cat.vy = 0;
  cat.jumpStartY = cat.y;
  cat.onGround = false;
}

function loseLife(cat) {
  cat.lives = Math.max(0, cat.lives - 1);
  if (cat.lives === 0) {
    cat.active = false;
    return;
  }
  respawnAtCheckpoint(cat);
}

function updateCat(cat, controls) {
  if (!cat.active) return;

  const wasGrounded = cat.onGround;

  if (controls.left) {
    cat.vx -= cat.speed;
    cat.facing = -1;
  }
  if (controls.right) {
    cat.vx += cat.speed;
    cat.facing = 1;
  }

  if (!controls.left && !controls.right) {
    cat.vx *= cat.friction;
    if (Math.abs(cat.vx) < 0.06) cat.vx = 0;
  }

  cat.vx = Math.max(-cat.maxSpeed, Math.min(cat.maxSpeed, cat.vx));

  if (controls.jumpPressed && cat.onGround) {
    cat.vy = -cat.jumpPower;
    cat.onGround = false;
    cat.jumpStartY = cat.y;
  }

  cat.vy += game.gravity;
  cat.vy = Math.min(cat.vy, game.maxFall);

  const totalMove = Math.max(Math.abs(cat.vx), Math.abs(cat.vy));
  const steps = Math.max(1, Math.ceil(totalMove / 7));
  const stepVX = cat.vx / steps;
  const stepVY = cat.vy / steps;

  cat.onGround = false;
  let landedOn = null;

  for (let i = 0; i < steps; i += 1) {
    cat.x += stepVX;

    if (cat.x < -60) cat.x = game.width + 20;
    if (cat.x + cat.w > game.width + 60) cat.x = -20 - cat.w;

    const prevY = cat.y;
    const nextY = cat.y + stepVY;
    const landing = stepVY >= 0 ? findLandingPlatform(cat, prevY, nextY) : null;

    if (landing) {
      cat.y = landing.y - cat.h;
      cat.vy = 0;
      cat.onGround = true;
      landedOn = landing;
      break;
    }

    cat.y = nextY;
  }

  if (wasGrounded && !cat.onGround) {
    cat.jumpStartY = cat.y;
  }

  if (!wasGrounded && cat.onGround && landedOn) {
    const fellDistance = landedOn.y - cat.jumpStartY;
    const landedOnGround = landedOn.kind === "grass" && landedOn.y === GROUND_Y;

    if (landedOnGround && fellDistance > FALL_TO_GROUND_DISTANCE) {
      loseLife(cat);
      return;
    }
  }

  if (cat.y > game.cameraY + game.height + 320) {
    loseLife(cat);
    return;
  }

  cat.peakY = Math.min(cat.peakY, cat.y);
  collectCoins(cat);
}

function updateCheckpoints() {
  for (const cat of cats) {
    if (!cat.active) continue;

    for (const cp of checkpoints) {
      const zone = { x: cp.x - 6, y: cp.y - 12, w: cp.w + 12, h: cp.h + 24 };
      const catBox = { x: cat.x, y: cat.y, w: cat.w, h: cat.h };

      if (overlap(catBox, zone)) {
        cp.touched = true;
        cat.checkpoint.x = cp.x;
        cat.checkpoint.y = cp.y;
        cat.checkpoint.id = cp.id;
      }
    }
  }
}

function updateCamera() {
  const activeCats = cats.filter((c) => c.active);
  if (!game.started || activeCats.length === 0) {
    game.cameraY += (0 - game.cameraY) * 0.08;
    return;
  }

  let avgY = 0;
  for (const cat of activeCats) {
    avgY += cat.y;
  }
  avgY /= activeCats.length;

  const focusY = avgY - game.height * 0.56;
  const maxCameraY = 120;
  const targetY = Math.max(WORLD_TOP, Math.min(maxCameraY, focusY));
  game.cameraY += (targetY - game.cameraY) * 0.14;
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, game.height);

  const t = Math.min(1, Math.max(0, -game.cameraY / -WORLD_TOP));
  const blendMid = 130 - Math.round(t * 60);
  const blendTop = 95 - Math.round(t * 55);

  gradient.addColorStop(0, `rgb(${blendTop}, ${blendTop + 30}, ${blendTop + 70})`);
  gradient.addColorStop(0.6, `rgb(52, ${blendMid}, 220)`);
  gradient.addColorStop(1, `rgb(157, 218, 255)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, game.width, game.height);

  const starAlpha = Math.max(0, (-game.cameraY - 900) / 1600);
  if (starAlpha > 0) {
    for (const star of stars) {
      const sy = star.y - game.cameraY;
      if (sy < -10 || sy > game.height + 10) continue;
      const pulse = 0.4 + Math.sin(performance.now() * 0.0015 + star.twinkle) * 0.35;
      ctx.fillStyle = `rgba(255,255,235,${Math.min(1, starAlpha * pulse)})`;
      ctx.fillRect(star.x, sy, star.size, star.size);
    }
  }

  for (const cloud of clouds) {
    const y = cloud.y - game.cameraY;
    if (y > -110 && y < game.height + 110) {
      cloud.x += cloud.drift;
      if (cloud.x > game.width + 200) cloud.x = -260;

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.ellipse(cloud.x, y, cloud.w * 0.32, cloud.h * 0.56, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x + cloud.w * 0.28, y - 6, cloud.w * 0.26, cloud.h * 0.48, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x - cloud.w * 0.24, y + 4, cloud.w * 0.24, cloud.h * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGroundDecor() {
  for (const f of flowers) {
    const x = f.x;
    const y = f.y - game.cameraY;
    if (y < -20 || y > game.height + 20) continue;

    ctx.strokeStyle = "#2f7f30";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.lineTo(x, y - 10 * f.scale);
    ctx.stroke();

    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(x, y - 12 * f.scale, 3.5 * f.scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlatform(p) {
  const y = p.y - game.cameraY;
  if (y > game.height + 30 || y + p.h < -30) return;

  if (p.kind === "grass") {
    ctx.fillStyle = "#49a63f";
    ctx.fillRect(p.x, y, p.w, p.h);
    ctx.fillStyle = "#66c35b";
    ctx.fillRect(p.x, y, p.w, 5);
  } else if (p.kind === "metal") {
    ctx.fillStyle = "#7f90a0";
    ctx.fillRect(p.x, y, p.w, p.h);
    ctx.fillStyle = "#a7b7c7";
    for (let i = 0; i < p.w; i += 18) {
      ctx.fillRect(p.x + i + 2, y + 3, 6, 2);
    }
  } else if (p.kind === "dirt") {
    ctx.fillStyle = "#7a4f2d";
    ctx.fillRect(p.x, y, p.w, p.h);
  } else {
    ctx.fillStyle = "#7c8598";
    ctx.fillRect(p.x, y, p.w, p.h);
    ctx.fillStyle = "#5e6678";
    ctx.fillRect(p.x, y + p.h - 4, p.w, 4);
  }
}

function drawCheckpoints() {
  for (const cp of checkpoints) {
    const y = cp.y - game.cameraY;
    if (y < -100 || y > game.height + 40) continue;

    ctx.fillStyle = cp.touched ? "#ffe082" : "#f3f7ff";
    ctx.fillRect(cp.x, y, 4, cp.h);

    ctx.fillStyle = cp.touched ? "#f7b801" : "#8bb6ff";
    ctx.beginPath();
    ctx.moveTo(cp.x + 4, y + 3);
    ctx.lineTo(cp.x + 24, y + 10);
    ctx.lineTo(cp.x + 4, y + 17);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCoins() {
  for (const coin of coins) {
    if (coin.collectedBy) continue;
    const sy = coin.y - game.cameraY;
    if (sy < -20 || sy > game.height + 20) continue;

    ctx.fillStyle = "#ffd34d";
    ctx.beginPath();
    ctx.arc(coin.x, sy, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffec9e";
    ctx.fillRect(coin.x - 1.5, sy - 4, 3, 8);
  }
}

function drawCatTail(cat, breed) {
  const px = cat.x;
  const py = cat.y - game.cameraY;
  ctx.strokeStyle = breed.dark;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  const tailDir = cat.facing === 1 ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(px + cat.w * (tailDir === -1 ? 0.2 : 0.8), py + cat.h * 0.63);
  ctx.quadraticCurveTo(
    px + cat.w * (tailDir === -1 ? -0.42 : 1.42),
    py + cat.h * 0.52,
    px + cat.w * (tailDir === -1 ? -0.2 : 1.2),
    py + cat.h * 0.32
  );
  ctx.stroke();
}

function drawCat(cat) {
  if (!cat.active) return;

  const px = cat.x;
  const py = cat.y - game.cameraY;
  const breed = CAT_BREEDS[cat.breedKey] || CAT_BREEDS.tabby;

  drawCatTail(cat, breed);

  ctx.fillStyle = breed.fur;
  ctx.beginPath();
  ctx.ellipse(px + cat.w * 0.5, py + cat.h * 0.63, cat.w * 0.44, cat.h * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  const headX = px + cat.w * 0.5;
  const headY = py + cat.h * 0.33;

  ctx.fillStyle = breed.ear;
  ctx.beginPath();
  ctx.moveTo(headX - 11, headY - 8);
  ctx.lineTo(headX - 3, headY - 24);
  ctx.lineTo(headX + 1, headY - 8);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(headX + 11, headY - 8);
  ctx.lineTo(headX + 3, headY - 24);
  ctx.lineTo(headX - 1, headY - 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = breed.fur;
  ctx.beginPath();
  ctx.arc(headX, headY, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = breed.dark;
  ctx.fillRect(headX - 1, headY - 11, 2, 22);
  ctx.fillRect(headX - 8, headY - 7, 2, 16);
  ctx.fillRect(headX + 6, headY - 7, 2, 16);

  const eyeOffset = cat.facing === 1 ? 1 : -1;
  ctx.fillStyle = breed.eye;
  ctx.fillRect(headX - 7 + eyeOffset, headY - 2, 3, 4);
  ctx.fillRect(headX + 4 + eyeOffset, headY - 2, 3, 4);

  ctx.fillStyle = "#f2b5b5";
  ctx.fillRect(headX - 1, headY + 3, 2, 2);
}

function drawAltitudeHints() {
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "600 15px Barlow";

  const marks = [400, 1200, 2600, 4200, 6000];
  for (const m of marks) {
    const worldY = -m * 10;
    const sy = worldY - game.cameraY;
    if (sy < 25 || sy > game.height - 20) continue;
    ctx.fillText(`${m} m`, game.width - 84, sy);
  }
}

function draw() {
  drawSky();
  platforms.forEach(drawPlatform);
  drawGroundDecor();
  drawCheckpoints();
  drawCoins();
  drawCat(cats[0]);
  drawCat(cats[1]);
  drawAltitudeHints();
}

function updateGameOverState() {
  const aliveCount = cats.filter((c) => c.active).length;
  if (aliveCount > 0) return;

  game.started = false;
  game.over = true;

  deathMessage.textContent = `Run over. Coins: Cat 1 ${cats[0].coins}, Cat 2 ${cats[1].coins}.`;
  deathScreen.hidden = false;
}

function tick() {
  if (game.started) {
    updateCat(cats[0], {
      left: game.keys.p1Left,
      right: game.keys.p1Right,
      jumpPressed: game.keys.p1JumpPressed,
    });

    updateCat(cats[1], {
      left: game.keys.p2Left,
      right: game.keys.p2Right,
      jumpPressed: game.keys.p2JumpPressed,
    });

    game.keys.p1JumpPressed = false;
    game.keys.p2JumpPressed = false;

    updateCheckpoints();
    updateGameOverState();
  }

  updateCamera();
  updateHud();
  draw();

  requestAnimationFrame(tick);
}

buildWorld();
setupMenus();
updateHud();
heightLabel.textContent = "Height: 0 m";
requestAnimationFrame(tick);
