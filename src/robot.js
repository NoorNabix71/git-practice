import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createRobot() {
  const robot = new THREE.Group();
  robot.name = 'EMNI_RK_06';
  const shellMaterials = [];
  const wireOverlays = [];

  const shell = new THREE.MeshPhysicalMaterial({
    color: 0x187bc9,
    metalness: 0.18,
    roughness: 0.19,
    transparent: true,
    opacity: 0.42,
    transmission: 0.18,
    thickness: 0.65,
    ior: 1.42,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  shellMaterials.push(shell);
  const shellLight = shell.clone();
  shellLight.color.set(0x369fe9);
  shellLight.opacity = 0.3;
  shellMaterials.push(shellLight);
  const core = new THREE.MeshStandardMaterial({ color: 0x123f64, metalness: 0.82, roughness: 0.28 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x101b27, metalness: 0.8, roughness: 0.3 });
  const silver = new THREE.MeshStandardMaterial({ color: 0x5e91b4, metalness: 0.92, roughness: 0.2 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x4daeff, toneMapped: false });
  const black = new THREE.MeshStandardMaterial({ color: 0x07101a, metalness: 0.5, roughness: 0.45 });

  function mesh(geometry, material, parent, position = [0, 0, 0]) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(...position);
    item.castShadow = material !== glow;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }

  function shellMesh(geometry, parent, position = [0, 0, 0], material = shell, edges = true) {
    const item = mesh(geometry, material, parent, position);
    item.renderOrder = 2;
    if (edges) {
      const lines = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 28),
        new THREE.LineBasicMaterial({ color: 0x65baff, transparent: true, opacity: 0.16, depthWrite: false }),
      );
      lines.renderOrder = 3;
      item.add(lines);
      wireOverlays.push(lines);
    }
    return item;
  }

  function cylinder(parent, radius, length, position, material = core, axis = 'y', segments = 48) {
    const item = mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material, parent, position);
    if (axis === 'x') item.rotation.z = Math.PI / 2;
    if (axis === 'z') item.rotation.x = Math.PI / 2;
    return item;
  }

  function ring(parent, radius, tube, position, axis = 'y', material = silver) {
    const item = mesh(new THREE.TorusGeometry(radius, tube, 8, 48), material, parent, position);
    if (axis === 'y') item.rotation.x = Math.PI / 2;
    if (axis === 'x') item.rotation.y = Math.PI / 2;
    return item;
  }

  function jointHousing(parent, radius, width) {
    cylinder(parent, radius * 0.82, width + 0.12, [0, 0, 0], dark, 'x');
    cylinder(parent, radius * 0.69, width + 0.145, [0, 0, 0], silver, 'x');
    cylinder(parent, radius * 0.58, width + 0.16, [0, 0, 0], core, 'x');
    const casing = cylinder(parent, radius, width, [0, 0, 0], shell, 'x');
    casing.renderOrder = 2;
    for (const side of [-1, 1]) {
      ring(parent, radius * 0.82, 0.025, [side * (width / 2 + 0.018), 0, 0], 'x');
      cylinder(parent, radius * 0.28, 0.025, [side * (width / 2 + 0.09), 0, 0], dark, 'x', 32);
      cylinder(parent, radius * 0.12, 0.032, [side * (width / 2 + 0.108), 0, 0], glow, 'x', 24);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        cylinder(parent, 0.025, 0.025, [side * (width / 2 + 0.075), Math.sin(a) * radius * 0.69, Math.cos(a) * radius * 0.69], silver, 'x', 10);
      }
    }
    return casing;
  }

  function link(parent, length, width, depth) {
    const assembly = new THREE.Group();
    parent.add(assembly);
    const shape = new RoundedBoxGeometry(width, length - 0.25, depth, 5, 0.16);
    shellMesh(shape, assembly, [0, length / 2, 0]);
    const spine = mesh(new RoundedBoxGeometry(width * 0.37, length - 0.4, depth * 0.55, 3, 0.08), core, assembly, [0, length / 2, 0]);
    spine.castShadow = true;
    for (const side of [-1, 1]) {
      const rail = mesh(new RoundedBoxGeometry(0.065, length - 0.48, depth * 0.72, 3, 0.025), silver, assembly, [side * width * 0.34, length / 2, 0]);
      rail.material = silver;
      for (const y of [0.35, length - 0.35]) {
        cylinder(assembly, 0.04, 0.03, [side * width * 0.35, y, depth * 0.39], dark, 'z', 12);
      }
    }
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.12, -depth * 0.48),
      new THREE.Vector3(width * 0.26, length * 0.35, -depth * 0.66),
      new THREE.Vector3(width * 0.25, length * 0.68, -depth * 0.66),
      new THREE.Vector3(0, length - 0.08, -depth * 0.48),
    ]);
    mesh(new THREE.TubeGeometry(cableCurve, 32, 0.035, 8, false), black, assembly);
    return assembly;
  }

  // Fixed mounting plinth and rotary base.
  cylinder(robot, 0.91, 0.16, [0, 0.08, 0], dark, 'y', 64);
  cylinder(robot, 0.83, 0.07, [0, 0.185, 0], silver, 'y', 64);
  cylinder(robot, 0.76, 0.15, [0, 0.285, 0], core, 'y', 64);
  ring(robot, 0.77, 0.018, [0, 0.365, 0], 'y', glow);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    cylinder(robot, 0.047, 0.035, [Math.sin(angle) * 0.7, 0.385, Math.cos(angle) * 0.7], silver, 'y', 12);
  }
  const baseShell = mesh(new THREE.CylinderGeometry(0.57, 0.71, 0.48, 64, 1, false), shell, robot, [0, 0.57, 0]);
  baseShell.renderOrder = 2;
  cylinder(robot, 0.48, 0.45, [0, 0.55, 0], dark, 'y', 48);

  const joints = [];
  const baseYaw = new THREE.Group();
  baseYaw.position.y = 0.78;
  robot.add(baseYaw);
  joints.push(baseYaw);
  cylinder(baseYaw, 0.59, 0.18, [0, 0, 0], shellLight, 'y', 64).renderOrder = 2;
  ring(baseYaw, 0.51, 0.025, [0, 0.105, 0], 'y', silver);
  const shoulderMount = mesh(new RoundedBoxGeometry(0.86, 0.58, 0.72, 4, 0.13), shell, baseYaw, [0, 0.32, 0]);
  shoulderMount.renderOrder = 2;

  const shoulder = new THREE.Group();
  shoulder.position.y = 0.48;
  baseYaw.add(shoulder);
  joints.push(shoulder);
  jointHousing(shoulder, 0.49, 0.9);
  link(shoulder, 1.9, 0.67, 0.56);

  const elbow = new THREE.Group();
  elbow.position.y = 1.9;
  shoulder.add(elbow);
  joints.push(elbow);
  jointHousing(elbow, 0.42, 0.79);
  link(elbow, 1.55, 0.55, 0.48);

  const wristPitch = new THREE.Group();
  wristPitch.position.y = 1.55;
  elbow.add(wristPitch);
  joints.push(wristPitch);
  jointHousing(wristPitch, 0.31, 0.63);
  cylinder(wristPitch, 0.235, 0.45, [0, 0.28, 0], shell, 'y', 40).renderOrder = 2;
  cylinder(wristPitch, 0.13, 0.44, [0, 0.27, 0], silver, 'y', 32);
  ring(wristPitch, 0.225, 0.025, [0, 0.47, 0], 'y', glow);

  const wristRoll = new THREE.Group();
  wristRoll.position.y = 0.48;
  wristPitch.add(wristRoll);
  joints.push(wristRoll);
  cylinder(wristRoll, 0.225, 0.25, [0, 0.12, 0], dark, 'y', 40);
  cylinder(wristRoll, 0.245, 0.17, [0, 0.14, 0], shellLight, 'y', 40).renderOrder = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const bar = mesh(new THREE.BoxGeometry(0.025, 0.16, 0.035), silver, wristRoll, [Math.sin(a) * 0.225, 0.13, Math.cos(a) * 0.225]);
    bar.rotation.y = a;
  }

  const toolRoll = new THREE.Group();
  toolRoll.position.y = 0.29;
  wristRoll.add(toolRoll);
  joints.push(toolRoll);
  cylinder(toolRoll, 0.24, 0.11, [0, 0.03, 0], silver, 'y', 40);
  const palm = mesh(new RoundedBoxGeometry(0.62, 0.24, 0.42, 3, 0.055), core, toolRoll, [0, 0.18, 0]);
  palm.castShadow = true;
  shellMesh(new RoundedBoxGeometry(0.66, 0.27, 0.46, 3, 0.06), toolRoll, [0, 0.18, 0], shellLight);
  for (const side of [-1, 1]) {
    const finger = new THREE.Group();
    finger.position.set(side * 0.24, 0.25, 0);
    toolRoll.add(finger);
    const fingerMesh = mesh(new RoundedBoxGeometry(0.12, 0.46, 0.22, 3, 0.035), silver, finger, [side * 0.035, 0.22, 0]);
    fingerMesh.rotation.z = side * -0.1;
    mesh(new RoundedBoxGeometry(0.13, 0.18, 0.24, 2, 0.025), dark, finger, [side * -0.005, 0.43, 0]);
  }
  const tcp = new THREE.Object3D();
  tcp.position.y = 0.76;
  toolRoll.add(tcp);
  const tcpLight = new THREE.PointLight(0x248eff, 0.65, 1.4);
  tcpLight.position.y = 0.5;
  toolRoll.add(tcpLight);

  robot.traverse((item) => {
    if (item.isMesh) {
      item.castShadow = true;
      item.receiveShadow = true;
    }
  });

  return { robot, joints, shellMaterials, wireOverlays, tcp, shoulder, wristPitch };
}
