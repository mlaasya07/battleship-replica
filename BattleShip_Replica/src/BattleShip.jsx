import React, { useRef, useEffect, useState } from "react";
import { FaGithub, FaLinkedin } from "react-icons/fa";

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const SHIPS = [5, 4, 3, 3, 2];

function createEmptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill("."));
}

function createEmptyShots(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function Battleship() {
  const playerCanvasRef = useRef(null);
  const enemyCanvasRef = useRef(null);
  const [playerGrid, setPlayerGrid] = useState(() => createEmptyGrid(GRID_SIZE));
  const [enemyGrid, setEnemyGrid] = useState(() => createEmptyGrid(GRID_SIZE));
  const [playerShots, setPlayerShots] = useState(() => createEmptyShots(GRID_SIZE));
  const [enemyShots, setEnemyShots] = useState(() => createEmptyShots(GRID_SIZE));
  const [phase, setPhase] = useState("placement");
  const [shipsToPlace, setShipsToPlace] = useState([...SHIPS]);
  const [orientation, setOrientation] = useState("h");
  const [playerShips, setPlayerShips] = useState([]);
  const [enemyShips, setEnemyShips] = useState([]);
  const [sunkPlayerShips, setSunkPlayerShips] = useState([]);
  const [sunkEnemyShips, setSunkEnemyShips] = useState([]);
  const [winner, setWinner] = useState(null);
  const [cpuTargets, setCpuTargets] = useState([]);
  const [turn, setTurn] = useState("player"); // track whose turn it is

  useEffect(() => {
    if (phase === "play" && enemyShips.length === 0) {
      autoPlaceShips("enemy");
    }
    if (sunkEnemyShips.length === enemyShips.length && enemyShips.length > 0) {
      setWinner("You Win!");
      setPhase("end");
    } else if (sunkPlayerShips.length === playerShips.length && playerShips.length > 0) {
      setWinner("Computer Wins!");
      setPhase("end");
    }
    drawBoards();

    // if it's CPU's turn, trigger its move
    if (phase === "play" && turn === "cpu" && !winner) {
      const timer = setTimeout(cpuTurn, 800);
      return () => clearTimeout(timer);
    }
  }, [playerGrid, enemyGrid, playerShots, enemyShots, sunkPlayerShips, sunkEnemyShips, phase, turn, winner]);

  const drawBoards = () => {
    drawBoard(playerCanvasRef.current, playerGrid, enemyShots, playerShips, sunkPlayerShips, true);
    drawBoard(enemyCanvasRef.current, enemyGrid, playerShots, enemyShips, sunkEnemyShips, false);
  };

  const drawBoard = (canvas, grid, shots, ships, sunkShips, showShips) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        let color = "#1e40af";
        if (shots[i][j] === "miss") color = "#374151";
        if (shots[i][j] === "hit") {
          const sunk = ships.some(
            (ship, idx) => sunkShips.includes(idx) && ship.some(([sx, sy]) => sx === i && sy === j)
          );
          color = sunk ? "#dc2626" : "#facc15";
        }
        if (showShips && grid[i][j] === "X") color = "#2563eb";

        ctx.fillStyle = color;
        ctx.fillRect(j * CELL_SIZE + 1, i * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        ctx.strokeStyle = "#073c6b";
        ctx.strokeRect(j * CELL_SIZE, i * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  };

  const placeShip = (row, col) => {
    if (phase !== "placement") return;
    const len = shipsToPlace[0];
    if (!len) return;
    const newGrid = playerGrid.map((r) => r.slice());
    const coords = [];

    for (let i = 0; i < len; i++) {
      const r = row + (orientation === "v" ? i : 0);
      const c = col + (orientation === "h" ? i : 0);
      if (r >= GRID_SIZE || c >= GRID_SIZE || newGrid[r][c] === "X") return;
      coords.push([r, c]);
    }
    coords.forEach(([r, c]) => (newGrid[r][c] = "X"));
    setPlayerGrid(newGrid);
    setPlayerShips((prev) => [...prev, coords]);
    setShipsToPlace((prev) => prev.slice(1));
    if (shipsToPlace.length === 1) setPhase("play");
  };

  const autoPlaceShips = (who) => {
    const newGrid = createEmptyGrid(GRID_SIZE);
    const shipsCoords = [];
    SHIPS.forEach((len) => {
      let placed = false;
      while (!placed) {
        const dir = Math.random() > 0.5 ? "h" : "v";
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);
        const coords = [];
        let valid = true;
        for (let i = 0; i < len; i++) {
          const r = row + (dir === "v" ? i : 0);
          const c = col + (dir === "h" ? i : 0);
          if (r >= GRID_SIZE || c >= GRID_SIZE || newGrid[r][c] === "X") {
            valid = false;
            break;
          }
          coords.push([r, c]);
        }
        if (valid) {
          coords.forEach(([r, c]) => (newGrid[r][c] = "X"));
          shipsCoords.push(coords);
          placed = true;
        }
      }
    });
    if (who === "player") {
      setPlayerGrid(newGrid);
      setPlayerShips(shipsCoords);
      setShipsToPlace([]);
      setPhase("play");
    } else {
      setEnemyGrid(newGrid);
      setEnemyShips(shipsCoords);
    }
  };

  const handleEnemyClick = (e) => {
    if (phase !== "play" || turn !== "player") return;
    const rect = enemyCanvasRef.current.getBoundingClientRect();
    const row = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    const col = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    if (row < 0 || col < 0 || row >= GRID_SIZE || col >= GRID_SIZE) return;
    if (playerShots[row][col] !== null) return;

    const newShots = playerShots.map((r) => r.slice());
    const hit = enemyGrid[row][col] === "X";
    newShots[row][col] = hit ? "hit" : "miss";
    setPlayerShots(newShots);

    if (hit) {
      enemyShips.forEach((ship, idx) => {
        if (!sunkEnemyShips.includes(idx)) {
          const sunk = ship.every(([sx, sy]) => newShots[sx][sy] === "hit");
          if (sunk) setSunkEnemyShips((prev) => [...prev, idx]);
        }
      });
    }

    // Switch turn only if miss
    if (!hit) {
      setTurn("cpu");
    }
  };

  const cpuTurn = () => {
    if (phase !== "play" || turn !== "cpu") return;

    const newShots = enemyShots.map((r) => r.slice());
    let row, col;

    if (cpuTargets.length > 0) {
      [row, col] = cpuTargets[0];
      setCpuTargets((prev) => prev.slice(1));
    }

    if (row === undefined || col === undefined) {
      do {
        row = Math.floor(Math.random() * GRID_SIZE);
        col = Math.floor(Math.random() * GRID_SIZE);
      } while (newShots[row][col] !== null);
    }

    const hit = playerGrid[row][col] === "X";
    newShots[row][col] = hit ? "hit" : "miss";
    setEnemyShots(newShots);

    if (hit) {
      const newTargets = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1]
      ].filter(([r, c]) => r >= 0 && c >= 0 && r < GRID_SIZE && c < GRID_SIZE && newShots[r][c] === null);

      setCpuTargets((prev) => [...prev, ...newTargets]);

      playerShips.forEach((ship, idx) => {
        if (!sunkPlayerShips.includes(idx)) {
          const sunk = ship.every(([sx, sy]) => newShots[sx][sy] === "hit");
          if (sunk) {
            setSunkPlayerShips((prev) => [...prev, idx]);
            setCpuTargets([]);
          }
        }
      });

      // CPU continues if it hits
      setTurn("cpu");
    } else {
      setTurn("player");
    }
  };

  const rotate = () => setOrientation((prev) => (prev === "h" ? "v" : "h"));

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-black min-h-screen text-white">
      <header className="w-full max-w-4xl flex items-center justify-between">
        <h1 className="text-2xl font-bold">Battleship ⚓</h1>
        {phase === "placement" && (
          <div className="flex gap-2">
            <button onClick={rotate} className="px-3 py-1.5 rounded-xl bg-blue-900/50 border border-blue-700 hover:bg-blue-900/70">Rotate</button>
            <button onClick={() => autoPlaceShips("player")} className="px-3 py-1.5 rounded-xl bg-blue-900/50 border border-blue-700 hover:bg-blue-900/70">Auto-Place</button>
          </div>
        )}
      </header>

      {phase === "play" && (
        <div className="text-lg font-semibold mb-4">
          Turn: <span className={turn === "player" ? "text-green-400" : "text-red-400"}>{turn === "player" ? "Your Turn" : "Computer's Turn"}</span>
        </div>
      )}

      <div className="flex gap-8">
        <div>
          <h2 className="text-lg mb-2">Your Board ({playerShips.length - sunkPlayerShips.length} ships remaining)</h2>
          <canvas
            ref={playerCanvasRef}
            width={GRID_SIZE * CELL_SIZE}
            height={GRID_SIZE * CELL_SIZE}
            onClick={(e) => {
              if (phase === "placement") {
                const rect = playerCanvasRef.current.getBoundingClientRect();
                const row = Math.floor((e.clientY - rect.top) / CELL_SIZE);
                const col = Math.floor((e.clientX - rect.left) / CELL_SIZE);
                placeShip(row, col);
              }
            }}
            className="border border-gray-500"
          />
        </div>
        <div>
          <h2 className="text-lg mb-2">Enemy Board ({enemyShips.length - sunkEnemyShips.length} ships remaining)</h2>
          <canvas
            ref={enemyCanvasRef}
            width={GRID_SIZE * CELL_SIZE}
            height={GRID_SIZE * CELL_SIZE}
            onClick={handleEnemyClick}
            className="border border-gray-500"
          />
        </div>
      </div>

      {winner && <div className="text-2xl font-bold text-green-400 mt-4">{winner}</div>}

      <footer className="mt-8 flex gap-6 items-center">
        <a href="https://github.com/mlaasya07" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-500 text-2xl">
          <FaGithub />
        </a>
        <a href="https://www.linkedin.com/in/mlaasya07" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-500 text-2xl">
          <FaLinkedin />
        </a>
      </footer>
    </div>
  );
}

export default Battleship;
