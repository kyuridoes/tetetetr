const FIELD_ROWS = 20;
const FIELD_COLS = 10;
const BLOCK_SIZE = 30;

let field = Array.from({ length: FIELD_ROWS }, () => Array(FIELD_COLS).fill(null));
let currentMino = null;
let nextMinos = [];
let holdMino = null;
let holdUsed = false;
let fallInterval = null;
let lockDelay = 1000; 
let lockStartTime = null;

const SRS_OFFSETS = {
  normal: {
    "0->R": [[0, 0], [1, 0], [1, 1], [0, 2], [1, 2]],
    "R->0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "R->2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "2->R": [[0, 0], [1, 0], [1, -1], [0, -2], [1, -2]],
    "2->L": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "L->2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "L->0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "0->L": [[0, 0], [1, 0], [1, 1], [0, 2], [-1, 2]]
  },
  I: {
    "0->R": [[0, 0], [2, 0], [1, 0], [-2, -1], [1, 2]],
    "R->0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "R->2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    "2->R": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "2->L": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "L->2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "L->0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "0->L": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
  }
};

const DIRECTIONS = ["0", "R", "2", "L"];

function rotateDirection(current, turn) {
  let idx = DIRECTIONS.indexOf(current);
  return turn === "right"
    ? DIRECTIONS[(idx + 1) % 4]
    : DIRECTIONS[(idx + 3) % 4];
}

function tryRotate(mino, turn) {
  const from = mino.direction;
  const to = rotateDirection(from, turn);
  const rotated = rotateAroundPivot(mino.shape, MINOS[mino.type].pivot, turn);
  const kicks = (mino.type === "I" ? SRS_OFFSETS.I : SRS_OFFSETS.normal)[`${from}->${to}`] || [];

  for (const [dx, dy] of kicks) {
    const test = {
      ...mino,
      shape: rotated,
      x: mino.x + dx,
      y: mino.y + dy
    };
    if (isValid(test)) {
      mino.shape = rotated;
      mino.x += dx;
      mino.y += dy;
      mino.direction = to;
      return;
    }
  }
}
const MINOS = {
  I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: "cyan", pivot: {x: 1.5, y: 1.5} },
  O: { shape: [[1,1],[1,1]], color: "yellow", pivot: {x: 0.5, y: 0.5} },
  T: { shape: [[0,1,0],[1,1,1],[0,0,0]], color: "purple", pivot: {x: 1, y: 1} },
  S: { shape: [[0,1,1],[1,1,0],[0,0,0]], color: "green", pivot: {x: 1, y: 1} },
  Z: { shape: [[1,1,0],[0,1,1],[0,0,0]], color: "red", pivot: {x: 1, y: 1} },
  J: { shape: [[1,0,0],[1,1,1],[0,0,0]], color: "blue", pivot: {x: 1, y: 1} },
  L: { shape: [[0,0,1],[1,1,1],[0,0,0]], color: "orange", pivot: {x: 1, y: 1} },
};

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function refillBag() {
  const types = Object.keys(MINOS);
  shuffle(types);
  nextMinos.push(...types);
}

function rotateAroundPivot(shape, pivot, direction = "right") {
  const size = shape.length;
  const newShape = Array.from({ length: size }, () => Array(size).fill(0));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!shape[y][x]) continue;
      const relX = x - pivot.x;
      const relY = y - pivot.y;
      let newX, newY;
      if (direction === "right") {
        newX = pivot.x + relY;
        newY = pivot.y - relX;
      } else {
        newX = pivot.x - relY;
        newY = pivot.y + relX;
      }
      if (
        newY >= 0 && newY < size &&
        newX >= 0 && newX < size
      ) {
        newShape[newY][newX] = 1;
      }
    }
  }
  return newShape;
  
}
function spawnMino() {
  if (nextMinos.length < 7) refillBag();
  const type = nextMinos.shift();
  const { shape, color } = MINOS[type];
  currentMino = {
    type,
    shape,
    color,
    x: 3,
    y: 0,
    direction: "0"
  };
  holdUsed = false;
}

function isValid(mino) {
  return mino.shape.every((row, dy) =>
    row.every((val, dx) => {
      const x = mino.x + dx;
      const y = mino.y + dy;
      return !val || (x >= 0 && x < FIELD_COLS && y < FIELD_ROWS && y >= 0 && !field[y][x]);
    })
  );
}

function getGhostMino(mino) {
  const ghost = { ...mino, y: mino.y };
  while (isValid({ ...ghost, y: ghost.y + 1 })) {
    ghost.y++;
  }
  return ghost;
}

function placeMino() {
  currentMino.shape.forEach((row, dy) => {
    row.forEach((val, dx) => {
      if (val) {
        const x = currentMino.x + dx;
        const y = currentMino.y + dy;
        if (field[y]) field[y][x] = currentMino.color;
      }
    });
  });

  for (let y = FIELD_ROWS - 1; y >= 0; y--) {
    if (field[y].every(cell => cell)) {
      field.splice(y, 1);
      field.unshift(Array(FIELD_COLS).fill(null));
      y++;
    }
  }

  spawnMino();
}

function drawBlock(ctx, x, y, color, size = BLOCK_SIZE) {
  ctx.fillStyle = color;
  ctx.fillRect(x * size, y * size, size, size);
  ctx.strokeStyle = "black";
  ctx.strokeRect(x * size, y * size, size, size);
}

function drawGrid(ctx, cols, rows, size) {
  ctx.strokeStyle = "#ccc";
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * size, 0);
    ctx.lineTo(x * size, rows * size);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * size);
    ctx.lineTo(cols * size, y * size);
    ctx.stroke();
  }
}

function draw() {
  const canvas = document.getElementById("main");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid(ctx, FIELD_COLS, FIELD_ROWS, BLOCK_SIZE);
  for (let y = 0; y < FIELD_ROWS; y++) {
    for (let x = 0; x < FIELD_COLS; x++) {
      if (field[y][x]) drawBlock(ctx, x, y, field[y][x]);
    }
  }
  if (currentMino) {
    const ghost = getGhostMino(currentMino);
  ghost.shape.forEach((row, dy) => {
    row.forEach((val, dx) => {
      if (val) drawBlock(ctx, ghost.x + dx, ghost.y + dy, "rgba(128, 128, 128, 0.3)");
    });
  });
    currentMino.shape.forEach((row, dy) => {
      row.forEach((val, dx) => {
        if (val) drawBlock(ctx, currentMino.x + dx, currentMino.y + dy, currentMino.color);
      });
    });
  }

  drawHoldMino();
  drawNextMinos();
  requestAnimationFrame(draw);
}

function drawHoldMino() {
  const canvas = document.getElementById("hold");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (holdMino) {
    const { shape, color } = MINOS[holdMino];
    shape.forEach((row, y) => {
      row.forEach((val, x) => {
        if (val) drawBlock(ctx, x + 1, y + 1, color, 20);
      });
    });
  }
}

function drawNextMinos() {
  const canvas = document.getElementById("next");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  nextMinos.slice(0, 3).forEach((type, index) => {
    const { shape, color } = MINOS[type];
    shape.forEach((row, y) => {
      row.forEach((val, x) => {
        if (val) drawBlock(ctx, x + 1, y + index * 3 + 1, color, 20);
      });
    });
  });
}

document.addEventListener("keydown", function(event) {
  switch (event.key) {
    case "ArrowDown":
      currentMino.y++;
      if (!isValid(currentMino)) currentMino.y--;
      break;
    case "ArrowUp":
      while (isValid({ ...currentMino, y: currentMino.y + 1 })) currentMino.y++;
      placeMino();
      break;
    case "z":
      tryRotate(currentMino, "right");
      break;
    case "x":
      tryRotate(currentMino, "left");
      break;
    case "c":
      if (!holdUsed) {
        if (holdMino === null) {
          holdMino = currentMino.type;
          spawnMino();
        } else {
          [holdMino, currentMino.type] = [currentMino.type, holdMino];
          const { shape, color } = MINOS[currentMino.type];
          currentMino.shape = shape;
          currentMino.color = color;
          currentMino.x = 3;
          currentMino.y = 0;
          currentMino.direction = "0";
        }
        holdUsed = true;
      }
      break;
  }
});

function startFall() {
  fallInterval = setInterval(() => {
    if (!currentMino) return;

    currentMino.y++;
    if (!isValid(currentMino)) {
      currentMino.y--;

      if (lockStartTime === null) {
        lockStartTime = Date.now();
      } else if (Date.now() - lockStartTime >= lockDelay) {
        placeMino();
        lockStartTime = null;
      }
    } else {
      lockStartTime = null;
    }
  }, 1500); 
}


window.onload = () => {
  refillBag();
  spawnMino();
  draw();
  startFall();
};

function move(dx, dy = 0) {
  currentMino.x += dx;
  currentMino.y += dy;
  if (!isValid(currentMino)) {
    currentMino.x -= dx;
    currentMino.y -= dy;
  }
}

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

let das = 100; // 最初の待機時間
let arr = 25;  // 連続移動間隔
let heldKey = null;
let moveTimeout = null;
let moveInterval = null;

function handleKeyDown(e) {
  if (heldKey) return; // すでに処理中のキーがあるなら無視

  if (["ArrowLeft", "ArrowRight", "ArrowDown"].includes(e.code)) {
    heldKey = e.code;
    let moveFunc;

    if (e.code === "ArrowLeft") moveFunc = () => move(-1, 0);
    if (e.code === "ArrowRight") moveFunc = () => move(1, 0);
    if (e.code === "ArrowDown") moveFunc = () => move(0, 1);

    moveFunc(); // 最初の1回目（ここでカクっとなる）

    moveTimeout = setTimeout(() => {
      moveInterval = setInterval(moveFunc, arr);
    }, das);
  }
}

function handleKeyUp(e) {
  if (e.code === heldKey) {
    clearTimeout(moveTimeout);
    clearInterval(moveInterval);
    moveTimeout = null;
    moveInterval = null;
    heldKey = null;
  }
}



