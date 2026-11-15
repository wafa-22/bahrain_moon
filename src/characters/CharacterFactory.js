// Builds the stylized, blocky-but-cute astronauts from Three.js geometry.
// Front of every character faces +Z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { flagTexture, canvasTexture, roundRect } from '../utils/textures.js';

const SUIT_WHITE = '#F7F8FF';
const SUIT_GRAY = '#c9d1e6';
const BOOT = '#7d88ab';

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...opts });
}

function mesh(geo, material, { x = 0, y = 0, z = 0, shadow = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = false;
  return m;
}

/** Name label floating above a character. */
function nameTag(text, color) {
  const tex = canvasTexture(256, 72, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(23,36,72,0.85)';
    roundRect(ctx, 4, 4, w - 8, h - 8, 30);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#F7F8FF';
    ctx.font = '700 40px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  sprite.scale.set(1.3, 0.37, 1);
  return sprite;
}

export class Astronaut {
  /**
   * @param {object} data  entry from characterData.js
   * @param {object} look  { accent, visor, headlamp }
   * @param {object} opts  { nameTag: boolean }
   */
  constructor(data, look = {}, opts = {}) {
    this.data = data;
    this.group = new THREE.Group();
    this.group.name = `astronaut-${data.id}`;
    this.rig = new THREE.Group(); // everything that bobs / animates
    this.group.add(this.rig);
    this.time = Math.random() * 10;
    this.waveTimer = 0;
    this.walkBlend = 0;

    this.accentMat = mat(look.accent || '#CE1126');
    this.visorMat = mat(look.visor || '#FFC857', { metalness: 0.4, roughness: 0.3 });
    this.glassMat = new THREE.MeshStandardMaterial({
      color: look.visor || '#FFC857',
      transparent: true,
      opacity: 0.18,
      roughness: 0.05,
      metalness: 0.2,
      depthWrite: false,
    });
    this.lampMat = mat('#fff4c2', { emissive: '#FFE08A', emissiveIntensity: 2.2 });

    this.build();
    this.setHeadlamp(look.headlamp !== false);

    const s = data.height || 1;
    this.group.scale.setScalar(s);

    if (opts.nameTag) {
      this.tag = nameTag(data.name, data.color);
      this.tag.position.y = 2.75;
      this.group.add(this.tag);
    }
  }

  build() {
    const d = this.data;
    const white = mat(SUIT_WHITE);
    const gray = mat(SUIT_GRAY);
    const boot = mat(BOOT);
    const skin = mat(d.skin, { roughness: 0.7 });
    const hair = mat(d.hair, { roughness: 0.8 });
    const dark = mat('#141420', { roughness: 0.3 });

    // ---- Legs ----
    const legGeo = new RoundedBoxGeometry(0.3, 0.62, 0.34, 3, 0.08);
    const bootGeo = new RoundedBoxGeometry(0.34, 0.18, 0.44, 3, 0.07);
    const makeLeg = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.7, 0);
      pivot.add(mesh(legGeo, white, { y: -0.3 }));
      pivot.add(mesh(new THREE.BoxGeometry(0.32, 0.06, 0.36), this.accentMat, { y: -0.18 }));
      pivot.add(mesh(bootGeo, boot, { y: -0.6, z: 0.04 }));
      this.rig.add(pivot);
      return pivot;
    };
    this.leftLeg = makeLeg(-0.18);
    this.rightLeg = makeLeg(0.18);

    // ---- Torso ----
    const body = new THREE.Group();
    body.position.y = 1.08;
    this.rig.add(body);
    this.body = body;
    body.add(mesh(new RoundedBoxGeometry(0.86, 0.8, 0.56, 4, 0.14), white));
    body.add(mesh(new THREE.BoxGeometry(0.89, 0.1, 0.59), this.accentMat, { y: -0.3 }));       // belt
    body.add(mesh(new THREE.BoxGeometry(0.89, 0.06, 0.59), this.accentMat, { y: 0.24 }));      // chest stripe
    // Chest control panel with colourful buttons
    body.add(mesh(new RoundedBoxGeometry(0.34, 0.22, 0.06, 2, 0.03), mat('#172448'), { x: 0.13, y: -0.04, z: 0.285 }));
    ['#FFC857', '#54D6AE', '#FF7894'].forEach((c, i) => {
      body.add(mesh(new THREE.SphereGeometry(0.032, 10, 8), mat(c, { emissive: c, emissiveIntensity: 0.6 }), { x: 0.03 + i * 0.1, y: -0.04, z: 0.32, shadow: false }));
    });
    // Bahrain flag patch
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.15), new THREE.MeshStandardMaterial({ map: flagTexture(), roughness: 0.8 }));
    patch.position.set(-0.22, 0.08, 0.283);
    body.add(patch);

    // Backpack (life support)
    const pack = new THREE.Group();
    pack.position.set(0, 0.05, -0.4);
    body.add(pack);
    pack.add(mesh(new RoundedBoxGeometry(0.72, 0.74, 0.3, 3, 0.1), gray));
    pack.add(mesh(new THREE.BoxGeometry(0.74, 0.08, 0.32), this.accentMat, { y: 0.18 }));
    pack.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), gray, { x: 0.24, y: 0.55 }));
    this.antennaTip = mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(d.color, { emissive: d.color, emissiveIntensity: 1.2 }), { x: 0.24, y: 0.77, shadow: false });
    pack.add(this.antennaTip);

    // ---- Arms ----
    const armGeo = new RoundedBoxGeometry(0.24, 0.6, 0.28, 3, 0.08);
    const makeArm = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.38, 0);
      pivot.add(mesh(armGeo, white, { y: -0.27 }));
      pivot.add(mesh(new THREE.BoxGeometry(0.27, 0.08, 0.31), this.accentMat, { y: -0.5 }));
      pivot.add(mesh(new THREE.SphereGeometry(0.15, 14, 10), gray, { y: -0.64 }));
      this.rig.add(pivot);
      return pivot;
    };
    this.leftArm = makeArm(-0.55);
    this.rightArm = makeArm(0.55);
    // Attachment point in the right glove (used for the pickaxe)
    this.hand = new THREE.Group();
    this.hand.position.set(0, -0.64, 0.05);
    this.rightArm.add(this.hand);

    // ---- Head + helmet ----
    const head = new THREE.Group();
    head.position.y = 1.98;
    this.rig.add(head);
    this.head = head;

    head.add(mesh(new THREE.TorusGeometry(0.3, 0.08, 10, 24), gray, { y: -0.47 }).rotateX(Math.PI / 2)); // collar

    head.add(mesh(new THREE.SphereGeometry(0.36, 24, 18), skin));
    // Eyes with highlights
    [-0.13, 0.13].forEach((x) => {
      head.add(mesh(new THREE.SphereGeometry(0.058, 12, 10), dark, { x, y: 0.03, z: 0.31, shadow: false }));
      head.add(mesh(new THREE.SphereGeometry(0.02, 8, 6), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.5 }), { x: x + 0.02, y: 0.055, z: 0.36, shadow: false }));
      // cheeks
      const cheek = mesh(new THREE.SphereGeometry(0.05, 10, 8), mat('#ff8fa3', { transparent: true, opacity: 0.6 }), { x: x * 1.55, y: -0.07, z: 0.29, shadow: false });
      cheek.scale.set(1.2, 0.7, 0.4);
      head.add(cheek);
    });
    // Smile
    const smile = mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 16, Math.PI), dark, { y: d.feature === 'mustache' ? -0.13 : -0.1, z: 0.335, shadow: false });
    smile.rotation.z = Math.PI;
    head.add(smile);

    // Hair cap (tilted so the face stays visible)
    const cap = mesh(new THREE.SphereGeometry(0.385, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, { shadow: false });
    cap.rotation.x = -0.5;
    head.add(cap);
    if (d.gender === 'female') {
      head.add(mesh(new THREE.SphereGeometry(0.15, 14, 10), hair, { y: -0.08, z: -0.36, shadow: false })); // bun / ponytail
    }
    this.addFeature(head, d);

    // Helmet back shell (open at the front so we can see the face)
    const shell = mesh(new THREE.SphereGeometry(0.56, 28, 18, Math.PI / 2 + 1.25, Math.PI * 2 - 2.5, 0, Math.PI * 0.82), white);
    shell.material = white.clone();
    shell.material.side = THREE.DoubleSide;
    head.add(shell);
    // Visor rim
    const rim = mesh(new THREE.TorusGeometry(0.51, 0.045, 10, 32), this.visorMat, { z: 0.18, shadow: false });
    head.add(rim);
    // Glass bubble
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.565, 28, 20), this.glassMat);
    glass.renderOrder = 2;
    head.add(glass);
    // Glint
    const glint = new THREE.Mesh(
      new THREE.SphereGeometry(0.568, 12, 8, Math.PI / 2 + 0.35, 0.35, 0.55, 0.35),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }),
    );
    glint.renderOrder = 3;
    head.add(glint);
    // Helmet lamp
    this.lamp = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 12), this.lampMat, { x: 0.46, y: 0.22, z: 0.22, shadow: false });
    this.lamp.rotation.x = Math.PI / 2;
    head.add(this.lamp);
    this.lampHousing = mesh(new THREE.BoxGeometry(0.12, 0.14, 0.16), gray, { x: 0.47, y: 0.22, z: 0.12, shadow: false });
    head.add(this.lampHousing);
  }

  addFeature(head, d) {
    const fm = mat(d.featureColor, { roughness: 0.6 });
    if (d.feature === 'ribbon') {
      // Purple hair ribbon on the side
      const g = new THREE.Group();
      g.position.set(0.27, 0.25, 0.1);
      g.rotation.z = -0.5;
      const cone = new THREE.ConeGeometry(0.08, 0.17, 10);
      const l = mesh(cone, fm, { x: -0.09, shadow: false }); l.rotation.z = Math.PI / 2;
      const r = mesh(cone, fm, { x: 0.09, shadow: false }); r.rotation.z = -Math.PI / 2;
      g.add(l, r, mesh(new THREE.SphereGeometry(0.05, 10, 8), fm, { shadow: false }));
      head.add(g);
    } else if (d.feature === 'bow') {
      // Big orange bow on top
      const g = new THREE.Group();
      g.position.set(0, 0.36, 0.02);
      const cone = new THREE.ConeGeometry(0.1, 0.2, 10);
      const l = mesh(cone, fm, { x: -0.11, shadow: false }); l.rotation.z = Math.PI / 2;
      const r = mesh(cone, fm, { x: 0.11, shadow: false }); r.rotation.z = -Math.PI / 2;
      g.add(l, r, mesh(new THREE.SphereGeometry(0.06, 10, 8), fm, { shadow: false }));
      head.add(g);
    } else if (d.feature === 'curly') {
      // Curly hair: bumpy spheres on top
      const geo = new THREE.SphereGeometry(0.095, 10, 8);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const ring = i % 2 ? 0.2 : 0.29;
        head.add(mesh(geo, fm, { x: Math.cos(a) * ring, y: 0.3 + (i % 2 ? 0.07 : 0), z: Math.sin(a) * ring - 0.04, shadow: false }));
      }
    } else if (d.feature === 'mustache') {
      [-0.065, 0.065].forEach((x) => {
        const m = mesh(new THREE.SphereGeometry(0.06, 10, 8), fm, { x, y: -0.055, z: 0.34, shadow: false });
        m.scale.set(1.45, 0.55, 0.6);
        m.rotation.z = x < 0 ? 0.25 : -0.25;
        head.add(m);
      });
      // eyebrows
      [-0.13, 0.13].forEach((x) => head.add(mesh(new THREE.BoxGeometry(0.11, 0.025, 0.03), fm, { x, y: 0.12, z: 0.33, shadow: false })));
    }
  }

  // ---- Customization ----
  setAccent(color) { this.accentMat.color.set(color); }
  setVisor(color) { this.visorMat.color.set(color); this.glassMat.color.set(color); }
  setHeadlamp(on) {
    this.lamp.visible = on;
    this.lampHousing.visible = on;
  }

  wave(seconds = 2) { this.waveTimer = seconds; }

  /** Pickaxe swing (0.42 s). */
  swing() { this.swingTimer = 0.42; }

  /** Seated pose for driving the rover. */
  setSitting(on) { this.sitting = on; }

  /** Put a tool (Object3D) in the right hand, or remove it with null. */
  holdTool(object) {
    if (this.tool) this.hand.remove(this.tool);
    this.tool = object;
    if (object) this.hand.add(object);
  }

  /**
   * Animate limbs.
   * @param {number} dt
   * @param {object} s { speed: 0..1 walking amount, airborne: boolean }
   */
  update(dt, { speed = 0, airborne = false } = {}) {
    this.time += dt;
    this.walkBlend += (speed - this.walkBlend) * Math.min(1, dt * 10);
    const w = this.walkBlend;
    const t = this.time;

    const swing = Math.sin(t * 9) * 0.75 * w;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.9;
    this.rightArm.rotation.x = swing * 0.9;
    this.leftArm.rotation.z = -0.12;
    this.rightArm.rotation.z = 0.12;

    // Idle breathing + walking bounce
    const idle = Math.sin(t * 2.2) * 0.025 * (1 - w);
    this.rig.position.y = idle + Math.abs(Math.sin(t * 9)) * 0.07 * w;
    this.head.rotation.z = Math.sin(t * 1.3) * 0.04 * (1 - w);

    if (airborne) {
      this.leftArm.rotation.z = -0.9;
      this.rightArm.rotation.z = 0.9;
      this.leftLeg.rotation.x = 0.35;
      this.rightLeg.rotation.x = -0.2;
    }

    if (this.sitting) {
      this.leftLeg.rotation.x = -1.45;
      this.rightLeg.rotation.x = -1.45;
      this.leftArm.rotation.x = -0.9;
      this.rightArm.rotation.x = -0.9;
      this.rig.position.y = 0;
    }

    if (this.swingTimer > 0) {
      this.swingTimer -= dt;
      const k = 1 - Math.max(0, this.swingTimer) / 0.42; // 0 → 1
      // Wind up over the head, then strike down
      this.rightArm.rotation.x = k < 0.45 ? -2.8 * (k / 0.45) : -2.8 + 2.6 * Math.min(1, (k - 0.45) / 0.3);
      this.rightArm.rotation.z = 0.15;
    }

    if (this.waveTimer > 0) {
      this.waveTimer -= dt;
      this.rightArm.rotation.z = 2.6 + Math.sin(t * 12) * 0.35;
      this.rightArm.rotation.x = 0;
    }

    if (this.antennaTip) this.antennaTip.material.emissiveIntensity = 0.8 + Math.sin(t * 4) * 0.6;
  }
}
