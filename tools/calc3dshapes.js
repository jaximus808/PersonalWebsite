const fs = require('fs');

const FUNCTIONS_3D = {
  
  sphere: (x, y, time = 0) => {
    const r = 5;
    const inside = r * r - x * x - y * y;
    if (inside < 0) return [];
    const z = Math.sqrt(inside);
    return [z, -z];
  },

  torus: (x, y, time = 0) => {
    const R = 4;
    const r = 2;
    const distFromCenter = Math.sqrt(x * x + y * y);
    const distFromTube = distFromCenter - R;
    const inside = r * r - distFromTube * distFromTube;
    if (inside < 0) return [];
    const z = Math.sqrt(inside);
    return [z, -z];
  },

  hyperbolicParaboloid: (x, y, time = 0) => {
    const z = x * x - y * y;
    return [z * 0.3];
  },

  ripple: (x, y, time = 0) => {
    const dist = Math.sqrt(x * x + y * y);
    return [Math.sin(dist - time) * 2];
  },

  waveReflection: (x, y, time = 0) => {
    const z = Math.sin(x + time) * Math.cos(y + time) * 2;
    return [z, -z];
  },

  doubleCone: (x, y, time = 0) => {
    const dist = Math.sqrt(x * x + y * y);
    return [dist, -dist];
  },

  hyperboloidOneSheet: (x, y, time = 0) => {
    const a = 1, b = 1, c = 1;
    const inside = (x * x) / (a * a) + (y * y) / (b * b) - 1;
    if (inside < 0) return [];
    const z = c * Math.sqrt(inside);
    return [z, -z];
  },

  hyperboloidTwoSheets: (x, y, time = 0) => {
    const a = 1, b = 1, c = 2;
    const value = (x * x) / (a * a) + (y * y) / (b * b);
    const z = c * Math.sqrt(1 + value);
    return [z, -z];
  },

  paraboloid: (x, y, time = 0) => {
    return [(x * x + y * y) * 0.2];
  },

  ellipsoid: (x, y, time = 0) => {
    const a = 3, b = 3, c = 2;
    const inside = 1 - (x * x) / (a * a) - (y * y) / (b * b);
    if (inside < 0) return [];
    const z = c * Math.sqrt(inside);
    return [z, -z];
  },

  mexicanHat: (x, y, time = 0) => {
    const r2 = x * x + y * y;
    const z = (1 - r2) * Math.exp(-r2 / 2) * 3;
    return [z];
  },

  standingWaves: (x, y, time = 0) => {
    const base = Math.sin(x * 2 + time) + Math.cos(y * 2 - time);
    return [base * 2, base * 1, base * 0.5];
  },

  helicoid: (x, y, time = 0) => {
    const angle = Math.atan2(y, x);
    const dist = Math.sqrt(x * x + y * y);
    const z = angle * dist * 0.5;
    return [z];
  },

  twistedTorus: (x, y, time = 0) => {
    const angle = Math.atan2(y, x);
    const R = 4 + 0.5 * Math.sin(angle * 3 + time);
    const r = 2;
    const distFromCenter = Math.sqrt(x * x + y * y);
    const distFromTube = distFromCenter - R;
    const inside = r * r - distFromTube * distFromTube;
    if (inside < 0) return [];
    const z = Math.sqrt(inside);
    return [z, -z];
  },

  eggCarton: (x, y, time = 0) => {
    const z = Math.sin(x + time) + Math.cos(y + time);
    return [z, -z - 4];
  },

  kleinBottle: (x, y, time = 0) => {
    const r = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x);
    const z1 = Math.sin(r + time) * Math.cos(angle * 2);
    const z2 = Math.cos(r + time) * Math.sin(angle * 2);
    return [z1 * 2, z2 * 2];
  },

  tripleHelix: (x, y, time = 0) => {
    const angle = Math.atan2(y, x);
    const dist = Math.sqrt(x * x + y * y);
    const z1 = Math.sin(angle * 3 + dist - time) * 2;
    const z2 = Math.sin(angle * 3 + dist - time + Math.PI * 2 / 3) * 2;
    const z3 = Math.sin(angle * 3 + dist - time + Math.PI * 4 / 3) * 2;
    return [z1, z2, z3];
  },

  flower: (x, y, time = 0) => {
    const angle = Math.atan2(y, x);
    const dist = Math.sqrt(x * x + y * y);
    const petals = 6;
    const z1 = Math.sin(angle * petals + time) * Math.exp(-dist * 0.3) * 2;
    const z2 = Math.sin(angle * petals + time + Math.PI) * Math.exp(-dist * 0.3) * 2;
    return [z1 + 2, z2 - 2];
  }
};

// Generate shape data
function generateShapeData() {
  const step = 0.2;
  const shapesData = {};
  
  const shapeNames = [
    "sphere",
    "torus",
    "hyperbolicParaboloid",
    "ripple",
    "waveReflection",
    "doubleCone",
    "hyperboloidOneSheet",
    "hyperboloidTwoSheets",
    "paraboloid",
    "ellipsoid",
    "mexicanHat",
    "standingWaves",
    "helicoid",
    "twistedTorus",
    "eggCarton",
    "kleinBottle",
    "tripleHelix",
    "flower"
  ];
  
  shapeNames.forEach(shapeName => {
    const positions = [];
    
    for (let x = -6; x <= 6; x += step) {
      for (let y = -6; y <= 6; y += step) {
        const method = FUNCTIONS_3D[shapeName];
        if (method === undefined) continue;
        const zPos = method(x, y, 0);
        for (const z_p of zPos) {
          positions.push([x, z_p, y]);
        }
      }
    }
    
    shapesData[shapeName] = positions;
  });
  
  // Ensure all shapes have the same number of points by padding with duplicates
  const maxPoints = Math.max(...Object.values(shapesData).map(p => p.length));
  Object.keys(shapesData).forEach(key => {
    const positions = shapesData[key];
    while (positions.length < maxPoints) {
      positions.push([...positions[positions.length - 1]]);
    }
  });
  
  return shapesData;
}

// Generate and save
console.log('Generating shape positions...');
const shapeData = generateShapeData();

// Calculate stats
const shapeNames = Object.keys(shapeData);
const totalPoints = shapeData[shapeNames[0]].length;
console.log(`Generated ${shapeNames.length} shapes with ${totalPoints} points each`);

// Save to JSON file
const outputPath = './shapePositions.json';
fs.writeFileSync(outputPath, JSON.stringify(shapeData, null, 2));
console.log(`Saved to ${outputPath}`);

// Show file size
const stats = fs.statSync(outputPath);
console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);