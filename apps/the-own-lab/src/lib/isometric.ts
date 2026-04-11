const ISO_X = { x: 180.156, y: -74.623 };
const ISO_Y = { x: 147.447, y: 103.244 };
const DEPTH = 23;

interface Point {
  x: number;
  y: number;
}

function isoToScreen(origin: Point, gridX: number, gridY: number): Point {
  return {
    x: origin.x + gridX * ISO_X.x + gridY * ISO_Y.x,
    y: origin.y + gridX * ISO_X.y + gridY * ISO_Y.y,
  };
}

export function createCube(origin: Point, scaleX = 1, scaleY = 1, depth = DEPTH) {
  // Four corners of the cube
  const p1 = origin;
  const p2 = isoToScreen(origin, scaleX, 0);
  const p3 = isoToScreen(origin, scaleX, scaleY);
  const p4 = isoToScreen(origin, 0, scaleY);

  //   Depth
  const p1d = { x: p1.x, y: p1.y + depth };
  const p4d = { x: p4.x, y: p4.y + depth };
  const p3d = { x: p3.x, y: p3.y + depth };

  const toPath = (...pts: Point[]) => `M${pts.map((p) => `${p.x},${p.y}`).join('L')}Z`;

  return {
    top: toPath(p1, p2, p3, p4), // Top face
    side: toPath(p1, p4, p4d, p1d), // Left face
    front: toPath(p4, p3, p3d, p4d), // Front face
    shadow: toPath(
      // GroundShadow
      { x: p1.x - 4, y: p1.y + depth + 12 },
      { x: p2.x - 4, y: p2.y + depth + 12 },
      { x: p3.x - 4, y: p3.y + depth + 12 },
      { x: p4.x - 4, y: p4.y + depth + 12 },
    ),
  };
}

export function createSlidePath(startOrigin: Point, distance = 1): string {
  const end = isoToScreen(startOrigin, distance, distance);
  return `M${startOrigin.x},${startOrigin.y} L${end.x},${end.y}`;
}
