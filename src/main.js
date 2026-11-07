import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createRobot } from './robot.js';

const container = document.querySelector('#scene-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x09111b, 0.047);

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
const defaultCamera = new THREE.Vector3(6.1, 4.35, 7.1);
const defaultTarget = new THREE.Vector3(0, 2.1, 0);
camera.position.copy(defaultCamera);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x080e16, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const pmrem = new THREE.PMREMGenerator(renderer);
const environment = new RoomEnvironment();
scene.environment = pmrem.fromScene(environment, 0.04).texture;
environment.dispose();
pmrem.dispose();

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(defaultTarget);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 5;
controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI / 2.04;
controls.minPolarAngle = 0.22;
controls.enablePan = false;
controls.update();

scene.add(new THREE.HemisphereLight(0xa5d7ff, 0x07101c, 1.65));
const keyLight = new THREE.DirectionalLight(0xd5edff, 4.1);
keyLight.position.set(4, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -5;
keyLight.shadow.camera.right = 5;
keyLight.shadow.camera.top = 7;
keyLight.shadow.camera.bottom = -3;
keyLight.shadow.bias = -0.0003;
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x238dff, 5.2);
rimLight.position.set(-5, 4, -4);
scene.add(rimLight);
const fillLight = new THREE.PointLight(0x3caeff, 15, 12, 2);
fillLight.position.set(2, 2.5, -3);
scene.add(fillLight);

// A subdued engineering floor grounds the transparent model.
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.36 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.012;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(30, 60, 0x274562, 0x1c3145);
grid.material.transparent = true;
grid.material.opacity = 0.19;
grid.material.depthWrite = false;
scene.add(grid);

function floorCircle(radius, opacity = 0.22) {
  const points = [];
  for (let i = 0; i <= 128; i++) {
    const angle = (i / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0.012, Math.sin(angle) * radius));
  }
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x3d8aca, transparent: true, opacity }),
  );
  scene.add(line);
}
floorCircle(1.32, 0.3);
floorCircle(1.43, 0.1);
floorCircle(2.75, 0.075);

const tickMaterial = new THREE.LineBasicMaterial({ color: 0x4c98cf, transparent: true, opacity: 0.24 });
for (let i = 0; i < 60; i++) {
  const a = (i / 60) * Math.PI * 2;
  const inner = i % 5 === 0 ? 1.47 : 1.5;
  const outer = 1.55;
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(Math.sin(a) * inner, 0.014, Math.cos(a) * inner),
    new THREE.Vector3(Math.sin(a) * outer, 0.014, Math.cos(a) * outer),
  ]);
  scene.add(new THREE.Line(geometry, tickMaterial));
}

const { robot, joints, shellMaterials, wireOverlays, tcp, shoulder, wristPitch } = createRobot();
robot.rotation.y = -0.28;
scene.add(robot);

const definitions = [
  { name: 'Base rotation', min: -180, max: 180, axis: 'y' },
  { name: 'Shoulder', min: -90, max: 90, axis: 'z' },
  { name: 'Elbow', min: -135, max: 135, axis: 'z' },
  { name: 'Wrist pitch', min: -120, max: 120, axis: 'z' },
  { name: 'Wrist roll', min: -180, max: 180, axis: 'y' },
  { name: 'Tool rotation', min: -180, max: 180, axis: 'z' },
];
const home = [0, -24, 52, -20, 0, 0];
const values = [...home];
const presetValues = {
  home,
  pick: [-35, -53, 94, -40, 30, 0],
  reach: [25, -72, 105, -28, -20, 45],
  inspect: [50, 5, -48, 72, 65, -35],
};
let transition = null;
let demoRunning = false;
let demoStart = 0;

const jointList = document.querySelector('#joint-list');
definitions.forEach((definition, index) => {
  const control = document.createElement('div');
  control.className = 'joint-control';
  control.innerHTML = `
    <div class="joint-meta">
      <label class="joint-name" for="joint-${index}"><span>J0${index + 1}</span>${definition.name}</label>
      <output class="joint-value" for="joint-${index}">${home[index]}°</output>
    </div>
    <input id="joint-${index}" type="range" min="${definition.min}" max="${definition.max}" value="${home[index]}" step="1" aria-label="${definition.name} angle">`;
  const input = control.querySelector('input');
  input.addEventListener('input', () => {
    stopDemo();
    transition = null;
    values[index] = Number(input.value);
    clearActivePresets();
    updateControl(index);
  });
  jointList.appendChild(control);
});

function updateControl(index) {
  const input = document.querySelector(`#joint-${index}`);
  const definition = definitions[index];
  const rounded = Math.round(values[index]);
  input.value = rounded;
  input.style.setProperty('--range-progress', `${((rounded - definition.min) / (definition.max - definition.min)) * 100}%`);
  input.parentElement.querySelector('output').textContent = `${rounded}°`;
}
values.forEach((_, index) => updateControl(index));

function clearActivePresets() {
  document.querySelectorAll('.preset').forEach((button) => button.classList.remove('active'));
}

function setPreset(name) {
  stopDemo();
  clearActivePresets();
  document.querySelector(`[data-preset="${name}"]`).classList.add('active');
  transition = {
    from: [...values],
    to: presetValues[name],
    start: performance.now(),
    duration: 900,
  };
}

document.querySelectorAll('.preset').forEach((button) => {
  button.addEventListener('click', () => setPreset(button.dataset.preset));
});
document.querySelector('#reset-joints').addEventListener('click', () => {
  setPreset('home');
  toast('Joints returned to home position');
});

const runButton = document.querySelector('#run-button');
const runLabel = document.querySelector('#run-label');
function startDemo() {
  transition = null;
  demoRunning = true;
  demoStart = performance.now();
  clearActivePresets();
  runButton.classList.add('running');
  runLabel.textContent = 'Pause demo sequence';
  runButton.querySelector('path').setAttribute('d', 'M6 5h3v10H6zm5 0h3v10h-3z');
}
function stopDemo() {
  if (!demoRunning) return;
  demoRunning = false;
  runButton.classList.remove('running');
  runLabel.textContent = 'Run demo sequence';
  runButton.querySelector('path').setAttribute('d', 'm7 5 8 5-8 5V5Z');
}
runButton.addEventListener('click', () => (demoRunning ? stopDemo() : startDemo()));
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !['INPUT', 'BUTTON'].includes(document.activeElement.tagName) && !document.querySelector('dialog').open) {
    event.preventDefault();
    demoRunning ? stopDemo() : startDemo();
  }
});

document.querySelector('#transparency-toggle').addEventListener('change', (event) => {
  shellMaterials.forEach((material, index) => {
    const transparent = event.target.checked;
    material.opacity = transparent ? (index === 0 ? 0.42 : 0.3) : 1;
    material.transmission = transparent ? 0.18 : 0;
    material.transparent = transparent;
    material.depthWrite = !transparent;
    material.needsUpdate = true;
  });
});
document.querySelector('#wireframe-toggle').addEventListener('change', (event) => {
  wireOverlays.forEach((lines) => {
    lines.material.opacity = event.target.checked ? 0.85 : 0.16;
    lines.material.color.set(event.target.checked ? 0x9bd5ff : 0x65baff);
  });
});

let labelsVisible = true;
document.querySelector('#labels-button').addEventListener('click', (event) => {
  labelsVisible = !labelsVisible;
  event.currentTarget.classList.toggle('active', labelsVisible);
  document.querySelectorAll('.annotation').forEach((label) => { label.style.display = labelsVisible ? '' : 'none'; });
});

let cameraTransition = null;
function moveCamera(position, target = defaultTarget) {
  cameraTransition = { from: camera.position.clone(), to: position.clone(), targetFrom: controls.target.clone(), targetTo: target.clone(), start: performance.now() };
}
document.querySelector('#reset-camera').addEventListener('click', () => {
  moveCamera(defaultCamera);
  toast('Perspective camera restored');
});
const cameraViews = [
  new THREE.Vector3(0, 3.1, 8.8),
  new THREE.Vector3(8.5, 3.1, 0),
  new THREE.Vector3(4.8, 7.8, 4.8),
];
let cameraViewIndex = -1;
document.querySelector('#camera-button').addEventListener('click', () => {
  cameraViewIndex = (cameraViewIndex + 1) % cameraViews.length;
  moveCamera(cameraViews[cameraViewIndex]);
  toast(['Front elevation', 'Side elevation', 'Top perspective'][cameraViewIndex]);
});
controls.addEventListener('start', () => { cameraTransition = null; });

document.querySelector('#fullscreen-button').addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await document.querySelector('#viewer-panel').requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    toast('Fullscreen is not available in this browser');
  }
});

const specsDialog = document.querySelector('#specs-dialog');
document.querySelector('#specs-button').addEventListener('click', () => specsDialog.showModal());
document.querySelector('.dialog-close').addEventListener('click', () => specsDialog.close());
specsDialog.addEventListener('click', (event) => {
  const rect = specsDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) specsDialog.close();
});

let toastTimer;
function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 2400);
}

document.querySelector('#export-button').addEventListener('click', async () => {
  const button = document.querySelector('#export-button');
  button.disabled = true;
  toast('Preparing your 3D model…');
  try {
    const result = await new GLTFExporter().parseAsync(robot, { binary: true, onlyVisible: true });
    const blob = new Blob([result], { type: 'model/gltf-binary' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'axis-rk-06.glb';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('RK—06 exported successfully');
  } catch (error) {
    console.error(error);
    toast('Unable to export the model. Please try again.');
  } finally {
    button.disabled = false;
  }
});

const labelShoulder = document.querySelector('#label-shoulder');
const labelWrist = document.querySelector('#label-wrist');
const worldPosition = new THREE.Vector3();
const projected = new THREE.Vector3();
function positionLabel(element, object, offsetX, offsetY) {
  object.getWorldPosition(worldPosition);
  projected.copy(worldPosition).project(camera);
  const x = (projected.x * 0.5 + 0.5) * container.clientWidth + offsetX;
  const y = (-projected.y * 0.5 + 0.5) * container.clientHeight + offsetY;
  element.style.transform = `translate(${x}px, ${y}px)`;
  element.style.opacity = projected.z > 1 || x < 0 || x > container.clientWidth - 90 ? '0' : '1';
}

function resize() {
  const { clientWidth, clientHeight } = container;
  if (!clientWidth || !clientHeight) return;
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight, false);
}
new ResizeObserver(resize).observe(container);
resize();

const clock = new THREE.Clock();
function animate(now) {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  if (demoRunning) {
    const t = (now - demoStart) / 1000;
    const demo = [
      Math.sin(t * 0.45) * 65,
      -28 + Math.sin(t * 0.62) * 32,
      48 + Math.sin(t * 0.74 + 1) * 48,
      -15 + Math.sin(t * 0.82 + 2) * 48,
      Math.sin(t * 0.54) * 100,
      Math.sin(t * 0.7) * 75,
    ];
    demo.forEach((value, index) => { values[index] = value; updateControl(index); });
  }
  if (transition) {
    const raw = Math.min((now - transition.start) / transition.duration, 1);
    const eased = 1 - Math.pow(1 - raw, 3);
    transition.to.forEach((target, index) => {
      values[index] = THREE.MathUtils.lerp(transition.from[index], target, eased);
      updateControl(index);
    });
    if (raw === 1) transition = null;
  }
  joints.forEach((joint, index) => {
    joint.rotation[definitions[index].axis] = THREE.MathUtils.degToRad(values[index]);
  });

  if (cameraTransition) {
    const raw = Math.min((now - cameraTransition.start) / 850, 1);
    const eased = 1 - Math.pow(1 - raw, 3);
    camera.position.lerpVectors(cameraTransition.from, cameraTransition.to, eased);
    controls.target.lerpVectors(cameraTransition.targetFrom, cameraTransition.targetTo, eased);
    if (raw === 1) cameraTransition = null;
  }
  controls.update();
  robot.updateMatrixWorld();
  if (labelsVisible) {
    positionLabel(labelShoulder, shoulder, 35, -28);
    positionLabel(labelWrist, wristPitch, 38, 20);
  }
  if (Math.floor(elapsed * 10) % 2 === 0) {
    tcp.getWorldPosition(worldPosition);
    document.querySelector('#tcp-x').textContent = `X ${worldPosition.x >= 0 ? '+' : ''}${worldPosition.x.toFixed(2)}`;
    document.querySelector('#tcp-y').textContent = `Y ${worldPosition.y >= 0 ? '+' : ''}${worldPosition.y.toFixed(2)}`;
    document.querySelector('#tcp-z').textContent = `Z ${worldPosition.z >= 0 ? '+' : ''}${worldPosition.z.toFixed(2)}`;
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
