(function() {
  const container = document.getElementById('orb-stage');
  const devicePixelRatio = window.devicePixelRatio || 1;
// HUD PERSONA THEMES — ULTRON crimson / JARVIS cyan / FRIDAY gold (original stitch scheme)
const ORB_THEMES = {
    ultron: { fog:0x0c0406, ambient:0x1e090c, point:0xff2e40, hiLight:0xffc9c9, rim:0xe11d48,
        beamHi:'#ffb3b8', beam:'#ff2e40', beamDeep:'#4a0208', beamStroke:'rgba(255,150,158,0.45)',
        inner:0xff1e30, bezel:0x9c1a24, bezelEm:0x2a0104, glow:0xff2e40, cage:0xff6b76,
        metal:{c:0x2b0c0f,e:0x33030a}, obs:{c:0x170508,e:0x52060e},
        edgeGold:0xffaeb4, edgeAmber:0xff2e40, armorEdgeA:0xffc3c7, armorEdgeB:0xff2e40,
        particles:[[1.0,0.18,0.22],[0.88,0.10,0.13],[1.0,0.75,0.78]], speed:1.3, aggr:1.3 },
    jarvis: { fog:0x04090c, ambient:0x081a1e, point:0x22d3ee, hiLight:0xd6fbff, rim:0x0891b2,
        beamHi:'#c5f6ff', beam:'#22d3ee', beamDeep:'#083e4d', beamStroke:'rgba(150,235,250,0.45)',
        inner:0x1ecbe8, bezel:0x0e7490, bezelEm:0x03242c, glow:0x22d3ee, cage:0x67e8f9,
        metal:{c:0x0a2228,e:0x04292f}, obs:{c:0x051418,e:0x06424e},
        edgeGold:0xa5f3fc, edgeAmber:0x22d3ee, armorEdgeA:0xcffafe, armorEdgeB:0x22d3ee,
        particles:[[0.15,0.85,0.95],[0.05,0.55,0.65],[0.85,0.98,1.0]], speed:0.85, aggr:0.85 },
    friday: { fog:0x0e0c06, ambient:0x221a08, point:0xffcc00, hiLight:0xfff3a8, rim:0xf59e0b,
        beamHi:'#fff066', beam:'#ffc400', beamDeep:'#7a4b00', beamStroke:'rgba(255, 235, 150, 0.45)',
        inner:0xffb700, bezel:0xd4af37, bezelEm:0x3d2800, glow:0xffcc00, cage:0xffd54f,
        metal:{c:0x3a3014,e:0x241a04}, obs:{c:0x1c1708,e:0x472e00},
        edgeGold:0xffe082, edgeAmber:0xffb300, armorEdgeA:0xfff176, armorEdgeB:0xffb300,
        particles:[[1.0,0.80,0.0],[0.96,0.62,0.04],[1.0,0.98,0.85]], speed:1.0, aggr:1.0 }
};
let ORB_PERSONA = 'ultron';
function orbTheme(){ return ORB_THEMES[ORB_PERSONA] || ORB_THEMES.friday; }

  // Ultron / Friday 3D Sentience Orb - Full Golden Yellow & Radiant Solar Amber Theme with tactile neomorphic highlights
const width = container.clientWidth || window.innerWidth || 800;
const height = container.clientHeight || window.innerHeight || 600;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(orbTheme().fog, 0.035);
const STATE = {
    isDragging: false,
    prevMouseX: 0,
    prevMouseY: 0,
    pointerNormX: 0,
    pointerNormY: 0,
    rotY: 0,
    rotX: 0,
    baseRotY: 0,
    baseRotX: 0,
    velX: 0,
    velY: 0,
    targetExpansion: 0.22,
    smoothExpansion: 0.22,
    isHoldingExpand: false,
    zoomDistance: 13.2,
    targetZoom: 13.2,
    audioEnergy: 0.0,
    targetAudioEnergy: 0.0,
    microX: 0,
    microY: 0,
    microZ: 0
};
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120);
camera.position.set(0, 0, STATE.zoomDistance);
const renderer = new THREE.WebGLRenderer({ antialias: !window.__ULTRON_LITE, alpha: true, powerPreference: window.__ULTRON_LITE ? 'low-power' : 'high-performance' });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.__ULTRON_LITE ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
container.appendChild(renderer.domElement);

// Master Orb Group
const orbMasterGroup = new THREE.Group();
orbMasterGroup.scale.setScalar(0.70);
scene.add(orbMasterGroup);

// Ambient Lighting - Deep warm obsidian golden base
const ambientLight = new THREE.AmbientLight(orbTheme().ambient, 2.2);
scene.add(ambientLight);

// Intense luminous yellow/amber core point light
const corePointLight = new THREE.PointLight(orbTheme().point, 8.5, 30);
orbMasterGroup.add(corePointLight);

// Dual directional lights creating tactile neomorphic gold & amber highlights
const goldenHighlightLight = new THREE.DirectionalLight(orbTheme().hiLight, 3.0); // Warm solar specular highlight
goldenHighlightLight.position.set(9, 12, 10);
scene.add(goldenHighlightLight);

const deepAmberRimLight = new THREE.DirectionalLight(orbTheme().rim, 2.4); // Golden amber rim light
deepAmberRimLight.position.set(-8, -6, 7);
scene.add(deepAmberRimLight);

// Audio Shockwave Rings Group
const audioWavesGroup = new THREE.Group();
orbMasterGroup.add(audioWavesGroup);
const waveRings = [];
const waveRingGeo = new THREE.RingGeometry(0.88, 0.94, 64);
for (let i = 0; i < 4; i++) {
    const waveMat = new THREE.MeshBasicMaterial({
        color: (i % 2 === 0) ? orbTheme().point : orbTheme().rim,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const waveMesh = new THREE.Mesh(waveRingGeo, waveMat);
    waveMesh.position.z = 0.55;
    audioWavesGroup.add(waveMesh);
    waveRings.push({ mesh: waveMesh, mat: waveMat, offset: i * 0.25 });
}

// --- A. INNER SENTIENCE EYE & TURRET GIMBAL (Yellow / Gold) ---
const coreGroup = new THREE.Group();
orbMasterGroup.add(coreGroup);

function createCoreGlowTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 128);
    grad.addColorStop(0.0, '#ffffff');
    grad.addColorStop(0.18, orbTheme().beamHi);
    grad.addColorStop(0.40, orbTheme().beam);
    grad.addColorStop(0.72, orbTheme().beamDeep);
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = orbTheme().beamStroke;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 48; i++) {
        const ang = (i / 48) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(128 + Math.cos(ang) * 20, 128 + Math.sin(ang) * 20);
        ctx.lineTo(128 + Math.cos(ang) * 94, 128 + Math.sin(ang) * 94);
        ctx.stroke();
    }
    return new THREE.CanvasTexture(c);
}

const innerCoreGeo = new THREE.SphereGeometry(0.76, 36, 36);
const innerCoreMat = new THREE.MeshBasicMaterial({ color: orbTheme().inner });
const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
coreGroup.add(innerCoreMesh);

// Sentinel Eye Mechanical Pupil Aperture
const eyeTurretGroup = new THREE.Group();
coreGroup.add(eyeTurretGroup);

const pupilRingGeo = new THREE.RingGeometry(0.20, 0.42, 32);
const pupilRingMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending
});
const pupilRingMesh = new THREE.Mesh(pupilRingGeo, pupilRingMat);
pupilRingMesh.position.z = 0.76;
eyeTurretGroup.add(pupilRingMesh);

// Bezel in warm brushed gold titanium for neomorphic contrast
const irisBezelGeo = new THREE.TorusGeometry(0.48, 0.05, 12, 48);
const irisBezelMat = new THREE.MeshStandardMaterial({
    color: orbTheme().bezel,
    metalness: 0.88,
    roughness: 0.22,
    emissive: orbTheme().bezelEm
});
const irisBezelMesh = new THREE.Mesh(irisBezelGeo, irisBezelMat);
irisBezelMesh.position.z = 0.72;
eyeTurretGroup.add(irisBezelMesh);

const coreGlowTexture = createCoreGlowTexture();
const coreGlowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: coreGlowTexture,
    color: orbTheme().glow,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
}));
coreGlowSprite.scale.set(3.0, 3.0, 1);
coreGroup.add(coreGlowSprite);

// Internal Geodesic Cage with gold wireframe
const cageGeo = new THREE.IcosahedronGeometry(1.05, 2);
const cageMat = new THREE.MeshBasicMaterial({
    color: orbTheme().cage,
    wireframe: true,
    transparent: true,
    opacity: 0.70,
    blending: THREE.AdditiveBlending
});
const cageMesh = new THREE.Mesh(cageGeo, cageMat);
coreGroup.add(cageMesh);

// --- B. 5 CONCENTRIC GIMBAL RINGS (Full Yellow / Solar Amber Scheme) ---
const gimbalRings = [];

// Neomorphic Gold Materials:
// 1. Brushed Gold Titanium
const brushedGoldMetalMat = new THREE.MeshStandardMaterial({
    color: orbTheme().metal.c,
    metalness: 0.82,
    roughness: 0.25,
    emissive: orbTheme().metal.e,
    emissiveIntensity: 0.6,
    flatShading: true
});

// 2. Obsidian Deep Amber
const obsidianAmberMetalMat = new THREE.MeshStandardMaterial({
    color: orbTheme().obs.c,
    metalness: 0.85,
    roughness: 0.2,
    emissive: orbTheme().obs.e,
    emissiveIntensity: 0.75,
    flatShading: true
});

const ringSpecs = [
    { radius: 1.34, tube: 0.038, radial: 14, tubular: 84, mat: 'amber', wire: false, arc: Math.PI * 1.7, rx: 0.4, ry: 0.6, rz: 0.2, expandFactor: 0.45 },
    { radius: 1.64, tube: 0.065, radial: 8, tubular: 64, mat: 'gold', wire: false, arc: Math.PI * 1.5, rx: -0.8, ry: 0.4, rz: -0.5, metal: true, expandFactor: 0.65 },
    { radius: 1.94, tube: 0.032, radial: 12, tubular: 96, mat: 'goldWire', wire: true, arc: Math.PI * 2.0, rx: 0.3, ry: -0.7, rz: 0.6, expandFactor: 0.85 },
    { radius: 2.26, tube: 0.080, radial: 6, tubular: 56, mat: 'amber', wire: false, arc: Math.PI * 1.35, rx: -0.9, ry: -0.3, rz: 0.7, metal: true, expandFactor: 1.05 },
    { radius: 2.60, tube: 0.024, radial: 8, tubular: 120,mat: 'gold', wire: false, arc: Math.PI * 1.85, rx: 0.5, ry: 0.8, rz: -0.9, expandFactor: 1.25 }
];

ringSpecs.forEach((spec, idx) => {
    const rGroup = new THREE.Group();
    const geo = new THREE.TorusGeometry(spec.radius, spec.tube, spec.radial, spec.tubular, spec.arc);
    
    let mat;
    if (spec.mat === 'goldWire') {
        mat = new THREE.MeshBasicMaterial({
            color: 0xffd54f,
            wireframe: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
    } else if (spec.mat === 'gold') {
        mat = brushedGoldMetalMat.clone();
    } else {
        mat = obsidianAmberMetalMat.clone();
    }
    const mesh = new THREE.Mesh(geo, mat);
    rGroup.add(mesh);
    if (spec.metal) {
        const edgeGeo = new THREE.EdgesGeometry(geo);
        const edgeMat = new THREE.LineBasicMaterial({
            color: (spec.mat === 'gold') ? orbTheme().edgeGold : orbTheme().edgeAmber,
            transparent: true,
            opacity: 0.85
        });
        rGroup.add(new THREE.LineSegments(edgeGeo, edgeMat));
    }
    // Fixed default pose (micro-adjustments only, no infinite spin)
    rGroup.rotation.set(spec.rx, spec.ry, spec.rz);
    orbMasterGroup.add(rGroup);
    gimbalRings.push({ group: rGroup, spec, baseRot: { x: spec.rx, y: spec.ry, z: spec.rz } });
});

// --- C. MECHANICAL ARMOR SHELL WITH FULL YELLOW NEOMORPHISM ---
const armorShellGroup = new THREE.Group();
orbMasterGroup.add(armorShellGroup);
const armorShards = [];
const shellSourceGeo = new THREE.IcosahedronGeometry(2.72, 2).toNonIndexed();
const posAttr = shellSourceGeo.attributes.position;
const totalFaces = posAttr.count / 3;

for (let f = 0; f < totalFaces; f++) {
    const v0 = new THREE.Vector3().fromBufferAttribute(posAttr, f * 3 + 0);
    const v1 = new THREE.Vector3().fromBufferAttribute(posAttr, f * 3 + 1);
    const v2 = new THREE.Vector3().fromBufferAttribute(posAttr, f * 3 + 2);
    const centroid = new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3);
    const normal = centroid.clone().normalize();
    const radialFrontDist = Math.hypot(normal.x, normal.y);
    if (normal.z > 0.55 && radialFrontDist < 0.62) continue;
    const thickness = 0.12 + (f % 3) * 0.04;
    const innerOffset = normal.clone().multiplyScalar(-thickness);
    const a0 = v0.clone().sub(centroid);
    const a1 = v1.clone().sub(centroid);
    const a2 = v2.clone().sub(centroid);
    const b0 = a0.clone().add(innerOffset);
    const b1 = a1.clone().add(innerOffset);
    const b2 = a2.clone().add(innerOffset);
    const shardVerts = new Float32Array([
        a0.x, a0.y, a0.z, a1.x, a1.y, a1.z, a2.x, a2.y, a2.z,
        b0.x, b0.y, b0.z, b2.x, b2.y, b2.z, b1.x, b1.y, b1.z,
        a0.x, a0.y, a0.z, b0.x, b0.y, b0.z, b1.x, b1.y, b1.z,
        a0.x, a0.y, a0.z, b1.x, b1.y, b1.z, a1.x, a1.y, a1.z,
        a1.x, a1.y, a1.z, b1.x, b1.y, b1.z, b2.x, b2.y, b2.z,
        a1.x, a1.y, a1.z, b2.x, b2.y, b2.z, a2.x, a2.y, a2.z,
        a2.x, a2.y, a2.z, b2.x, b2.y, b2.z, b0.x, b0.y, b0.z,
        a2.x, a2.y, a2.z, b0.x, b0.y, b0.z, a0.x, a0.y, a0.z
    ]);
    const shardGeo = new THREE.BufferGeometry();
    shardGeo.setAttribute('position', new THREE.BufferAttribute(shardVerts, 3));
    shardGeo.computeVertexNormals();
    const shardGroup = new THREE.Group();
    shardGroup.position.copy(centroid);
    
    // Alternating gold and deep obsidian amber armor plates
    const isGold = (f % 3 === 0);
    const shardMat = isGold ? brushedGoldMetalMat.clone() : obsidianAmberMetalMat.clone();
    const shardMesh = new THREE.Mesh(shardGeo, shardMat);
    shardMesh.scale.setScalar(0.92);
    shardGroup.add(shardMesh);
    
    const edgeGeo = new THREE.EdgesGeometry(shardGeo);
    const edgeColor = isGold ? orbTheme().armorEdgeA : orbTheme().armorEdgeB;
    const edgeMat = new THREE.LineBasicMaterial({
        color: edgeColor,
        transparent: true,
        opacity: isGold ? 0.75 : 0.85
    });
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    edgeLines.scale.setScalar(0.925);
    shardGroup.add(edgeLines);
    
    armorShellGroup.add(shardGroup);
    armorShards.push({
        group: shardGroup,
        edgeMat: edgeMat,
        basePos: centroid.clone(),
        normal: normal,
        phase: Math.random() * Math.PI * 2,
        distanceMultiplier: 0.8 + Math.random() * 0.65,
        tumbleX: (Math.random() - 0.5) * 0.8,
        tumbleY: (Math.random() - 0.5) * 0.8,
        tumbleZ: (Math.random() - 0.5) * 0.8,
        isGold: isGold
    });
}

// --- D. FULL YELLOW / GOLDEN PARTICLE CLOUD ---
const PARTICLE_COUNT = 900;
const particleGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
const particleColors = new Float32Array(PARTICLE_COUNT * 3);
const particleNodes = [];

for (let i = 0; i < PARTICLE_COUNT; i++) {
    const radius = 1.35 + Math.pow(Math.random(), 1.25) * 3.4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    particlePositions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
    particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    particlePositions[i * 3 + 2] = radius * Math.cos(phi);
    
    // Golden Yellow distribution: 55% Bright Gold, 30% Deep Warm Amber, 15% White Specular
    const pick = Math.random();
    const pcls = pick > 0.45 ? 0 : (pick > 0.15 ? 1 : 2);
    const pcol = orbTheme().particles[pcls];
    particleColors[i * 3] = pcol[0]; particleColors[i * 3 + 1] = pcol[1]; particleColors[i * 3 + 2] = pcol[2];
    particleNodes.push({
        basePos: new THREE.Vector3(particlePositions[i * 3], particlePositions[i * 3 + 1], particlePositions[i * 3 + 2]),
        phase: Math.random() * Math.PI * 2,
        jitterSpeed: 1.2 + Math.random() * 2.5,
        pick: pcls
    });
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
const particleMat = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const particleSystem = new THREE.Points(particleGeo, particleMat);
orbMasterGroup.add(particleSystem);

// Interaction listeners - manual drag still available, but no continuous self-spin
renderer.domElement.style.cursor = 'grab';
renderer.domElement.addEventListener('mousedown', (e) => {
    renderer.domElement.style.cursor = 'grabbing';
    STATE.isDragging = true;
    STATE.isHoldingExpand = true;
    STATE.prevMouseX = e.clientX;
    STATE.prevMouseY = e.clientY;
});
window.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
        STATE.pointerNormX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        STATE.pointerNormY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    if (STATE.isDragging) {
        const dx = e.clientX - STATE.prevMouseX;
        const dy = e.clientY - STATE.prevMouseY;
        STATE.velY = dx * 0.0035;
        STATE.velX = dy * 0.0035;
        STATE.rotY += STATE.velY;
        STATE.rotX += STATE.velX;
        STATE.prevMouseX = e.clientX;
        STATE.prevMouseY = e.clientY;
    }
});
window.addEventListener('mouseup', () => {
    renderer.domElement.style.cursor = 'grab';
    STATE.isDragging = false;
    STATE.isHoldingExpand = false;
});
renderer.domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = Math.sign(e.deltaY) * 0.85;
    STATE.targetZoom = Math.min(22.0, Math.max(7.0, STATE.targetZoom + delta));
}, { passive: false });
// HUD: touch drag + pinch zoom for mobile operators
let lastPinchDist = 0;
renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        STATE.isDragging = true; STATE.isHoldingExpand = true;
        STATE.prevMouseX = e.touches[0].clientX;
        STATE.prevMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        lastPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
}, { passive: true });
renderer.domElement.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && STATE.isDragging) {
        const dx = e.touches[0].clientX - STATE.prevMouseX;
        const dy = e.touches[0].clientY - STATE.prevMouseY;
        STATE.velY = dx * 0.0045; STATE.velX = dy * 0.0045;
        STATE.rotY += STATE.velY; STATE.rotX += STATE.velX;
        STATE.prevMouseX = e.touches[0].clientX;
        STATE.prevMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (lastPinchDist) {
            STATE.targetZoom = Math.min(22.0, Math.max(7.0, STATE.targetZoom - (d - lastPinchDist) * 0.02));
        }
        lastPinchDist = d;
    }
}, { passive: true });
renderer.domElement.addEventListener('touchend', () => {
    STATE.isDragging = false; STATE.isHoldingExpand = false; lastPinchDist = 0;
}, { passive: true });


function onResize() {
    const w = (renderer.domElement.parentElement ? renderer.domElement.parentElement.clientWidth : container.clientWidth) || window.innerWidth;
    const h = (renderer.domElement.parentElement ? renderer.domElement.parentElement.clientHeight : container.clientHeight) || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);

// Audio Reactive Hook
window.addEventListener('ultron-audio-packet', (e) => {
    if (e.detail && typeof e.detail.energy === 'number') {
        STATE.targetAudioEnergy = Math.min(1.0, e.detail.energy);
    }
});

// Master Animation Loop - MICRO MOVEMENTS ONLY (No Continuous Auto-Spinning)
let animId;
function animate(now) {
    animId = requestAnimationFrame(animate);
    const time = now * 0.001;
    
    // Simulated Voice Activity Rhythm
    const voiceCadence = Math.sin(time * 3.0) * Math.cos(time * 1.6) * Math.sin(time * 0.8);
    const speechBurst = Math.max(0, voiceCadence);
    const speechMod = Math.sin(time * 16.0) * 0.25 + 0.75;
    const simulatedAudioInput = speechBurst > 0.18 ? speechBurst * speechMod * 0.95 * orbTheme().aggr : 0.04 * Math.sin(time * 4.0) * orbTheme().aggr;
    
    if (simulatedAudioInput > STATE.audioEnergy) {
        STATE.audioEnergy += (simulatedAudioInput - STATE.audioEnergy) * 0.25;
    } else {
        STATE.audioEnergy += (simulatedAudioInput - STATE.audioEnergy) * 0.08;
    }
    const audio = Math.max(0, STATE.audioEnergy);
    
    // Subtle breathing expansion without spinning
    const breathingCycle = 0.18 + (Math.sin(time * 0.45) * 0.5 + 0.5) * 0.18 + audio * 0.32;
    STATE.targetExpansion = STATE.isHoldingExpand ? 0.78 : breathingCycle;
    STATE.smoothExpansion += (STATE.targetExpansion - STATE.smoothExpansion) * 0.05;
    const expand = STATE.smoothExpansion;
    
    STATE.zoomDistance += (STATE.targetZoom - STATE.zoomDistance) * 0.06;
    camera.position.z = STATE.zoomDistance;
    
    // STOP CONTINUOUS ROUNDING / ROTATION:
    // Only micro-drift, organic tremor, and pointer inertia
    if (!STATE.isDragging) {
        const microDriftY = Math.sin(time * 0.35) * 0.04 + Math.sin(time * 1.4) * 0.012;
        const microDriftX = Math.cos(time * 0.28) * 0.03 + Math.sin(time * 1.1) * 0.009;
        
        // Tremor when audio triggers
        const acousticMicroJitter = (audio > 0.2) ? Math.sin(time * 32.0) * (audio * 0.008) : 0.0;
        STATE.velX *= 0.92;
        STATE.velY *= 0.92;
        STATE.rotY += STATE.velY;
        STATE.rotX += STATE.velX;
        orbMasterGroup.rotation.y = STATE.rotY + microDriftY + acousticMicroJitter;
        orbMasterGroup.rotation.x = STATE.rotX + microDriftX + (acousticMicroJitter * 0.5);
    } else {
        orbMasterGroup.rotation.y = STATE.rotY;
        orbMasterGroup.rotation.x = STATE.rotX;
    }
    
    // Micro translation wobble for organic sentience suspension
    orbMasterGroup.position.y = Math.sin(time * 0.8) * 0.06;
    orbMasterGroup.position.x = Math.cos(time * 0.6) * 0.04;
    
    // Shockwave Rings (Pulses outward during speech in golden hues)
    waveRings.forEach((w) => {
        const progress = ((time * 0.75 + w.offset) % 1.0);
        const waveScale = 1.0 + progress * (3.4 + audio * 2.0);
        w.mesh.scale.setScalar(waveScale);
        
        const baseOpacity = Math.sin(progress * Math.PI);
        w.mat.opacity = baseOpacity * (0.12 + audio * 0.75);
        w.mesh.lookAt(camera.position);
    });
    
    // 1. Inner Core & Sentinel Pupil Micro Movement
    const pulseSpeed = (1.6 + audio * 6.5) * orbTheme().speed;
    const corePulse = 1.0 + Math.sin(time * pulseSpeed) * (0.03 + audio * 0.28);
    const coreScale = (0.76 + expand * 0.32 + audio * 0.35) * corePulse;
    innerCoreMesh.scale.setScalar(coreScale);
    coreGlowSprite.scale.setScalar(2.6 + expand * 1.6 + audio * 3.2);
    
    // Eye Turret tracks cursor with subtle robotic saccades
    const eyeJitterX = Math.sin(time * 4.2) * 0.04;
    const eyeJitterY = Math.cos(time * 3.8) * 0.04;
    eyeTurretGroup.lookAt(STATE.pointerNormX * 2.2 + eyeJitterX, STATE.pointerNormY * 2.2 + eyeJitterY, 6.0);
    pupilRingMesh.scale.setScalar(1.0 + audio * 0.4 + Math.sin(time * 12.0) * (audio * 0.08));
    
    // 2. Gimbal Rings Micro-Movement (NO Continuous Spin: Subtle harmonic tilting & micro-flex only)
    gimbalRings.forEach((r, idx) => {
        const ringMicroAngle = Math.sin(time * (0.4 + idx * 0.15)) * 0.08;
        const audioTwitch = (audio > 0.15) ? Math.sin(time * (16.0 + idx * 3.0)) * (audio * 0.04) : 0;
        r.group.rotation.x = r.baseRot.x + ringMicroAngle + audioTwitch;
        r.group.rotation.y = r.baseRot.y + ringMicroAngle * 0.8;
        r.group.rotation.z = r.baseRot.z + Math.cos(time * 0.5 + idx) * 0.06;
        const ringScale = 0.78 + expand * r.spec.expandFactor * 0.38 + (audio * 0.18 * r.spec.expandFactor);
        r.group.scale.setScalar(ringScale);
    });
    
    // 3. Mechanical Armor Shards (Breathing micro-expansion & acoustic flutter, fixed stationary chassis)
    const baseRadialBlast = -0.22 * (1.0 - expand) + Math.pow(expand, 1.1) * 1.6 + (audio * 0.75);
    armorShards.forEach((shard, idx) => {
        const microFloat = Math.sin(time * 0.9 + shard.phase) * (0.02 + expand * 0.06);
        const acousticFlutter = Math.sin(time * 24.0 + idx * 0.7) * (audio * 0.07);
        const disp = Math.max(-0.25, baseRadialBlast * shard.distanceMultiplier + microFloat + acousticFlutter);
        shard.group.position.set(
            shard.basePos.x + shard.normal.x * disp,
            shard.basePos.y + shard.normal.y * disp,
            shard.basePos.z + shard.normal.z * disp
        );
        const microTilt = Math.max(0, disp) * 0.25 + (audio * 0.12);
        shard.group.rotation.x = microTilt * shard.tumbleX;
        shard.group.rotation.y = microTilt * shard.tumbleY;
        shard.group.rotation.z = microTilt * shard.tumbleZ;
        // Dynamic edge brightness
        shard.edgeMat.opacity = shard.isGold ? (0.45 + audio * 0.45) : (0.55 + audio * 0.45);
    });
    
    // 4. Golden Embers (Subtle micro-floating & acoustic dispersal, no infinite orbiting)
    const posArr = particleGeo.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const node = particleNodes[i];
        const microTremorX = Math.sin(time * node.jitterSpeed + node.phase) * (0.06 + audio * 0.15);
        const microTremorY = Math.cos(time * (node.jitterSpeed * 0.8) + node.phase) * (0.06 + audio * 0.15);
        const microTremorZ = Math.sin(time * (node.jitterSpeed * 1.2) + node.phase) * (0.06 + audio * 0.15);
        const expMult = 0.92 + expand * 0.35 + audio * 0.45;
        posArr[i * 3]     = node.basePos.x * expMult + microTremorX;
        posArr[i * 3 + 1] = node.basePos.y * expMult + microTremorY + (Math.sin(time * 0.7 + i) * 0.04);
        posArr[i * 3 + 2] = node.basePos.z * expMult + microTremorZ;
    }
    particleGeo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
}

// HUD: live persona re-theming
function applyOrbTheme() {
    const t = orbTheme();
    scene.fog.color.setHex(t.fog);
    ambientLight.color.setHex(t.ambient);
    corePointLight.color.setHex(t.point);
    goldenHighlightLight.color.setHex(t.hiLight);
    deepAmberRimLight.color.setHex(t.rim);
    innerCoreMat.color.setHex(t.inner);
    irisBezelMat.color.setHex(t.bezel);
    irisBezelMat.emissive.setHex(t.bezelEm);
    cageMat.color.setHex(t.cage);
    brushedGoldMetalMat.color.setHex(t.metal.c); brushedGoldMetalMat.emissive.setHex(t.metal.e);
    obsidianAmberMetalMat.color.setHex(t.obs.c); obsidianAmberMetalMat.emissive.setHex(t.obs.e);
    waveRings.forEach((w, i) => w.mat.color.setHex(i % 2 === 0 ? t.point : t.rim));
    gimbalRings.forEach((r) => {
        const mesh = r.group.children[0];
        const mat = mesh.material;
        if (r.spec.mat === 'goldWire') mat.color.setHex(t.cage);
        else if (r.spec.mat === 'gold') { mat.color.setHex(t.metal.c); mat.emissive.setHex(t.metal.e); }
        else { mat.color.setHex(t.obs.c); mat.emissive.setHex(t.obs.e); }
        if (r.spec.metal && r.group.children[1]) {
            r.group.children[1].material.color.setHex(r.spec.mat === 'gold' ? t.edgeGold : t.edgeAmber);
        }
    });
    armorShards.forEach((shard) => {
        shard.edgeMat.color.setHex(shard.isGold ? t.armorEdgeA : t.armorEdgeB);
        const sm = shard.group.children[0].material;
        if (shard.isGold) { sm.color.setHex(t.metal.c); sm.emissive.setHex(t.metal.e); }
        else { sm.color.setHex(t.obs.c); sm.emissive.setHex(t.obs.e); }
    });
    const colArr = particleGeo.attributes.color.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pc = t.particles[particleNodes[i].pick];
        colArr[i * 3] = pc[0]; colArr[i * 3 + 1] = pc[1]; colArr[i * 3 + 2] = pc[2];
    }
    particleGeo.attributes.color.needsUpdate = true;
    const tex = createCoreGlowTexture();
    if (coreGlowSprite.material.map) coreGlowSprite.material.map.dispose();
    coreGlowSprite.material.map = tex;
    coreGlowSprite.material.color.setHex(t.glow);
    coreGlowSprite.material.needsUpdate = true;
}
window.ultronOrb = {
    setPersona(key) {
        if (!ORB_THEMES[key]) return;
        ORB_PERSONA = key;
        applyOrbTheme();
    },
    pulse(level) { STATE.targetAudioEnergy = Math.min(1.0, level); }
};
applyOrbTheme();

// HUD: pause the render loop when the tab is hidden (mobile memory + battery)
let __orbPaused = false;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) { __orbPaused = true; cancelAnimationFrame(animId); }
    else if (__orbPaused) { __orbPaused = false; animId = requestAnimationFrame(animate); }
});

requestAnimationFrame(animate);

})();
// HUD: keep renderer sized when canvas is re-parented between scenes
(function () {
  let lastW = 0, lastH = 0;
  setInterval(() => {
    const el = document.querySelector('#orb-stage canvas, #stage-orb canvas, #scene-workspace canvas');
    if (!el) return;
    const w = el.parentElement ? el.parentElement.clientWidth : window.innerWidth;
    const h = el.parentElement ? el.parentElement.clientHeight : window.innerHeight;
    if (w && h && (Math.abs(w - lastW) > 2 || Math.abs(h - lastH) > 2)) {
      lastW = w; lastH = h;
      const ev = new Event('resize'); window.dispatchEvent(ev);
    }
  }, 300);
})();
