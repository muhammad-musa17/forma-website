"use strict";

(() => {
  const canvas = document.querySelector("#service-canvas");
  const host = canvas.parentElement;

  const preference = matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const state = {
    service: 0,
    paused: preference.matches,
    visible: true,
    x: 0,
    y: 0,
    dragX: 0,
    dragY: 0,
    dragging: false,
    wire: false,
    dirty: true
  };

  /* Controls are available before Three.js finishes loading. */
  window.studioScene = {
    setService(index) {
      state.service = index;
      state.dirty = true;
      state.dragging = false;
      state.dragX = 0;
      state.dragY = 0;

      controls.hidden = index !== 4;

      canvas.style.touchAction =
        index === 4 ? "none" : "pan-y";

      canvas.style.cursor =
        index === 4 ? "grab" : "default";

      const hint = host.querySelector(".visual-hint");

      if (hint) {
        hint.textContent = index === 4
          ? "DRAG TO ROTATE · EXPLORE THE FORM"
          : "MOVE YOUR CURSOR TO EXPLORE";
      }
    },

    toggleMotion() {
      state.paused = !state.paused;
      state.x = 0;
      state.y = 0;
      state.dirty = true;
    },

    isPaused() {
      return state.paused;
    }
  };

  preference.addEventListener("change", (event) => {
    state.paused = event.matches;
    state.x = 0;
    state.y = 0;
    state.dirty = true;

    window.dispatchEvent(
      new Event("studio-motion-change")
    );
  });

  /* ---------- 3D modelling controls ---------- */

  const controls = document.createElement("div");
  controls.className = "scene-controls";
  controls.hidden = true;

  controls.innerHTML = `
    <button type="button" aria-pressed="false">
      Wireframe
    </button>
    <button type="button">
      Reset view
    </button>
  `;

  host.appendChild(controls);

  const [wireButton, resetButton] = controls.children;

  wireButton.onclick = () => {
    state.wire = !state.wire;

    wireButton.setAttribute(
      "aria-pressed",
      String(state.wire)
    );

    wireButton.textContent = state.wire
      ? "Solid view"
      : "Wireframe";

    state.dirty = true;
  };

  resetButton.onclick = () => {
    state.dragX = 0;
    state.dragY = 0;
    state.wire = false;

    wireButton.setAttribute("aria-pressed", "false");
    wireButton.textContent = "Wireframe";

    state.dirty = true;
  };

  const message = document.createElement("p");
  message.className = "scene-message";
  message.setAttribute("role", "status");
  message.textContent = "Loading the 3D studio…";
  host.appendChild(message);

  import(
    "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js"
  )
    .then(start)
    .catch((error) => {
      message.hidden = false;
      message.textContent =
        "3D preview unavailable. Check your connection and reload.";

      controls.hidden = true;
      console.error(error);
    });

  function start(T) {
    /* ---------- Renderer and camera ---------- */

    const renderer = new T.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    });

    renderer.setPixelRatio(
      Math.min(devicePixelRatio || 1, 1.75)
    );

    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new T.Scene();

    const camera = new T.PerspectiveCamera(
      35, 1, 0.1, 50
    );

    camera.position.set(0, 0.05, 7.7);

    const world = new T.Group();
    scene.add(world);

    /* ---------- Lighting ---------- */

    scene.add(
      new T.HemisphereLight(0xd8edff, 0x15213d, 2)
    );

    const lights = [
      [0xffffff, 3.4, -3, 5, 5],
      [0x67e8f9, 2.6, -4, 1, 2],
      [0xa78bfa, 3, 4, 3, -2]
    ];

    lights.forEach(([colour, power, x, y, z]) => {
      const light = new T.DirectionalLight(
        colour,
        power
      );

      light.position.set(x, y, z);
      scene.add(light);
    });

    /* ---------- Reflection environment ---------- */

    const env = document.createElement("canvas");
    env.width = 1024;
    env.height = 512;

    const ec = env.getContext("2d");
    const gradient = ec.createLinearGradient(0, 0, 0, 512);

    gradient.addColorStop(0, "#172238");
    gradient.addColorStop(0.45, "#7892aa");
    gradient.addColorStop(0.55, "#17233d");
    gradient.addColorStop(1, "#070b14");

    ec.fillStyle = gradient;
    ec.fillRect(0, 0, 1024, 512);

    [
      ["#effaff", 130, 80, 160, 250],
      ["#91eafa", 550, 140, 75, 220],
      ["#b39bf1", 800, 90, 110, 210]
    ].forEach(([colour, x, y, width, height]) => {
      ec.fillStyle = colour;
      ec.fillRect(x, y, width, height);
    });

    const environmentTexture = new T.CanvasTexture(env);
    environmentTexture.mapping =
      T.EquirectangularReflectionMapping;
    environmentTexture.colorSpace = T.SRGBColorSpace;

    const pmrem = new T.PMREMGenerator(renderer);

    const environment = pmrem.fromEquirectangular(
      environmentTexture
    );

    scene.environment = environment.texture;

    environmentTexture.dispose();
    pmrem.dispose();

    /* ---------- Materials and helpers ---------- */

    function surface(colour, metalness = 0.6) {
      return new T.MeshPhysicalMaterial({
        color: colour,
        metalness,
        roughness: 0.24,
        clearcoat: 0.75,
        clearcoatRoughness: 0.2
      });
    }

    const dark = surface(0x14223b, 0.8);
    const silver = surface(0xc8d6e9, 0.85);
    const cyan = surface(0x67e8f9, 0.5);
    const violet = surface(0xa78bfa, 0.55);

    const groups = Array.from(
      { length: 6 },
      () => new T.Group()
    );

    const updates = Array.from(
      { length: 6 },
      () => []
    );

    groups.forEach((group) => {
      group.visible = false;
      world.add(group);
    });

    function mesh(
      parent,
      geometry,
      material,
      position = [0, 0, 0]
    ) {
      const object = new T.Mesh(
        geometry,
        material.clone()
      );

      object.position.set(...position);
      parent.add(object);

      return object;
    }

    function rounded(width, height, radius) {
      const shape = new T.Shape();

      const left = -width / 2;
      const bottom = -height / 2;
      const right = width / 2;
      const top = height / 2;

      shape.moveTo(left + radius, bottom);
      shape.lineTo(right - radius, bottom);

      shape.quadraticCurveTo(
        right, bottom, right, bottom + radius
      );

      shape.lineTo(right, top - radius);

      shape.quadraticCurveTo(
        right, top, right - radius, top
      );

      shape.lineTo(left + radius, top);

      shape.quadraticCurveTo(
        left, top, left, top - radius
      );

      shape.lineTo(left, bottom + radius);

      shape.quadraticCurveTo(
        left, bottom, left + radius, bottom
      );

      return shape;
    }

    function body(width, height, depth, radius = 0.12) {
      const geometry = new T.ExtrudeGeometry(
        rounded(width, height, radius),
        {
          depth,
          bevelEnabled: true,
          bevelThickness: 0.025,
          bevelSize: 0.025,
          bevelSegments: 3,
          curveSegments: 16,
          steps: 1
        }
      );

      geometry.translate(0, 0, -depth / 2);
      return geometry;
    }

    function rect(context, x, y, width, height, radius, colour) {
      context.fillStyle = colour;
      context.beginPath();
      context.roundRect(x, y, width, height, radius);
      context.fill();
    }

    function text(
      context,
      value,
      x,
      y,
      size,
      colour = "#f4f7ff",
      weight = "400"
    ) {
      context.fillStyle = colour;
      context.font = `${weight} ${size}px Arial`;
      context.fillText(value, x, y);
    }

    function screen(width, height) {
      const element = document.createElement("canvas");

      element.width = width;
      element.height = height;

      const texture = new T.CanvasTexture(element);
      texture.colorSpace = T.SRGBColorSpace;

      texture.anisotropy = Math.min(
        4,
        renderer.capabilities.getMaxAnisotropy()
      );

      return {
        canvas: element,
        c: element.getContext("2d"),
        texture
      };
    }

    /* ---------- Animated mobile interface ---------- */

    const app = screen(600, 1200);

    function drawApp(time) {
      const c = app.c;
      const cycle = time % 9;

      c.fillStyle = "#0b1425";
      c.fillRect(0, 0, 600, 1200);

      text(c, "9:41", 35, 54, 24, "#dbe8fa", "700");
      text(c, "FORMA / DAILY", 35, 126, 21, "#8fa4c2");

      text(
        c, "Make today count.",
        35, 194, 42, "#f4f7ff", "700"
      );

      text(
        c, "Your space. Your pace.",
        35, 237, 26, "#a7b3ca"
      );

      rect(c, 30, 280, 540, 365, 28, "#172940");

      text(c, "YOUR FOCUS", 60, 330, 21, "#a7b3ca");

      c.lineWidth = 21;
      c.strokeStyle = "#2c405c";

      c.beginPath();
      c.arc(300, 469, 102, 0, Math.PI * 2);
      c.stroke();

      c.strokeStyle = "#67e8f9";
      c.lineCap = "round";

      const progress = 0.55 + 0.2 * Math.sin(time * 0.7);

      c.beginPath();

      c.arc(
        300,
        469,
        102,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * progress
      );

      c.stroke();

      text(c, "Stay in", 243, 461, 34, "#f4f7ff", "700");
      text(c, "your flow.", 224, 503, 34, "#f4f7ff", "700");

      [
        "A little inspiration",
        "Your next idea",
        "Time to recharge"
      ].forEach((label, index) => {
        const y = 695 + index * 119;

        rect(c, 30, y, 540, 95, 20, "#142239");

        rect(
          c,
          51,
          y + 24,
          45,
          45,
          13,
          index === 1 ? "#a78bfa" : "#67e8f9"
        );

        text(c, label, 120, y + 58, 27);
      });

      rect(c, 215, 1158, 170, 7, 4, "#dce7f7");

      /*
       * The detail sheet opens, confirms an action,
       * then closes before the sequence repeats.
       */
      const open = Math.min(
        1,
        Math.max(0, (cycle - 3.1) / 0.55)
      );

      const close = Math.min(
        1,
        Math.max(0, (cycle - 7.8) / 0.55)
      );

      const slide = open * (1 - close);

      if (slide > 0) {
        c.fillStyle = `rgba(3,7,16,${slide * 0.6})`;
        c.fillRect(0, 80, 600, 1060);

        const y = 1200 - slide * 685;

        rect(c, 14, y, 572, 700, 35, "#20304c");
        rect(c, 245, y + 20, 110, 6, 3, "#7890b1");

        text(
          c, "A moment for you.",
          48, y + 103, 40, "#f4f7ff", "700"
        );

        text(
          c, "Save an idea. Make it happen.",
          48, y + 155, 25, "#bdcce0"
        );

        rect(c, 48, y + 200, 504, 194, 20, "#142138");

        text(c, "Your next chapter", 75, y + 265, 28);

        text(
          c, "Starts with one small step.",
          75, y + 308, 24, "#a7b3ca"
        );

        const saved = cycle > 5.5;

        rect(
          c,
          48,
          y + 438,
          504,
          88,
          18,
          saved ? "#a78bfa" : "#67e8f9"
        );

        text(
          c,
          saved ? "Saved to your day" : "Add to my day",
          145,
          y + 493,
          27,
          "#091120",
          "700"
        );
      }

      app.texture.needsUpdate = true;
    }

    drawApp(0);

    /* ---------- Web and social interfaces ---------- */

    function staticScreen(title, kind = "web") {
      const result = screen(720, 460);
      const c = result.c;

      c.fillStyle = "#101c30";
      c.fillRect(0, 0, 720, 460);

      text(
        c, "FORMA / WORKSPACE",
        35, 48, 20, "#a7b3ca"
      );

      text(c, title, 35, 110, 39, "#f4f7ff", "700");

      rect(c, 30, 146, 660, 272, 20, "#1a2b45");

      if (kind === "social") {
        const gradient = c.createLinearGradient(
          55, 170, 410, 350
        );

        gradient.addColorStop(0, "#67e8f9");
        gradient.addColorStop(1, "#a78bfa");

        rect(c, 53, 169, 276, 223, 18, gradient);

        text(c, "MAKE", 72, 233, 39, "#10213b", "700");
        text(c, "SOMETHING", 72, 279, 31, "#10213b", "700");
        text(c, "MATTER.", 72, 328, 39, "#10213b", "700");

        text(c, "Your next story", 356, 210, 25);
        text(c, "begins here.", 356, 247, 25);

        rect(c, 357, 291, 265, 12, 6, "#526889");
        rect(c, 357, 323, 215, 12, 6, "#526889");
      } else {
        for (let i = 0; i < 12; i++) {
          const height = 35 + i * 12 + Math.sin(i) * 23;

          rect(
            c,
            55 + i * 51,
            385 - height,
            30,
            height,
            6,
            i > 7 ? "#a78bfa" : "#67e8f9"
          );
        }
      }

      result.texture.needsUpdate = true;

      return result.texture;
    }

    const web = staticScreen("A clearer view.");

    const social = staticScreen(
      "Ideas worth sharing.",
      "social"
    );

    function device(parent, width, height, texture) {
      const group = new T.Group();
      parent.add(group);

      mesh(
        group,
        body(width, height, 0.13),
        silver
      );

      mesh(
        group,
        body(width - 0.06, height - 0.06, 0.05, 0.1),
        dark,
        [0, 0, 0.08]
      );

      mesh(
        group,
        new T.PlaneGeometry(
          width - 0.15,
          height - 0.18
        ),
        new T.MeshBasicMaterial({
          map: texture,
          toneMapped: false
        }),
        [0, 0, 0.14]
      );

      if (height > width * 1.5) {
        mesh(
          group,
          body(width * 0.3, 0.075, 0.01, 0.03),
          dark,
          [0, height / 2 - 0.145, 0.17]
        );
      }

      return group;
    }

    /* ---------- 01: Mobile ---------- */

    const back = device(
      groups[0], 1.23, 2.55, app.texture
    );

    back.position.set(0.64, 0.15, -0.4);
    back.rotation.set(0.06, -0.4, -0.13);

    const front = device(
      groups[0], 1.23, 2.55, app.texture
    );

    front.position.set(-0.56, -0.1, 0.3);
    front.rotation.set(-0.04, 0.26, 0.13);

    updates[0].push((time) => {
      front.position.y = -0.1 + Math.sin(time) * 0.07;
      back.position.y = 0.15 + Math.cos(time) * 0.08;
    });

    /* ---------- 02: Web ---------- */

    const browser = device(groups[1], 3.12, 2, web);
    browser.rotation.set(-0.04, -0.23, 0.02);

    const panel = device(groups[1], 1.28, 0.89, web);
    panel.position.set(0.93, -0.8, 0.6);
    panel.rotation.set(0, -0.12, -0.06);

    updates[1].push((time) => {
      panel.position.y = -0.8 + Math.sin(time) * 0.08;
    });

    /* ---------- 03: Cybersecurity ---------- */

    const shield = new T.Shape();

    shield.moveTo(0, 1.35);
    shield.lineTo(1, 1);
    shield.lineTo(0.92, -0.3);
    shield.quadraticCurveTo(0.8, -0.9, 0, -1.35);
    shield.quadraticCurveTo(-0.8, -0.9, -0.92, -0.3);
    shield.lineTo(-1, 1);
    shield.closePath();

    const shieldGeometry = new T.ExtrudeGeometry(
      shield,
      {
        depth: 0.16,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.035,
        bevelSegments: 3,
        steps: 1
      }
    );

    mesh(groups[2], shieldGeometry, dark);

    groups[2].add(
      new T.LineSegments(
        new T.EdgesGeometry(shieldGeometry),
        new T.LineBasicMaterial({ color: 0x67e8f9 })
      )
    );

    mesh(
      groups[2],
      new T.TorusGeometry(0.3, 0.065, 14, 48),
      silver,
      [0, 0.25, 0.32]
    );

    mesh(
      groups[2],
      body(0.8, 0.62, 0.15, 0.09),
      cyan,
      [0, -0.1, 0.38]
    );

    mesh(
      groups[2],
      new T.SphereGeometry(0.055, 16, 16),
      dark,
      [0, -0.08, 0.49]
    );

    const scan = mesh(
      groups[2],
      new T.TorusGeometry(1.55, 0.012, 8, 100),
      cyan
    );

    scan.rotation.x = 1.18;

    updates[2].push((time) => {
      groups[2].rotation.y =
        -0.2 + Math.sin(time * 0.6) * 0.2;

      scan.rotation.z = time * 0.3;
    });

    /* ---------- 04: Social media ---------- */

    for (let i = 0; i < 3; i++) {
      const card = device(
        groups[3], 1.75, 1.17, social
      );

      card.position.set(
        (i - 1) * 0.9,
        (i - 1) * 0.65,
        (1 - i) * 0.25
      );

      card.rotation.set(
        0,
        -0.2,
        (i - 1) * -0.09
      );

      updates[3].push((time) => {
        card.position.y =
          (i - 1) * 0.65 + Math.sin(time + i) * 0.06;
      });
    }

    /* ---------- 05: Interactive 3D model ---------- */

    const sculpture = mesh(
      groups[4],
      new T.TorusKnotGeometry(0.75, 0.235, 144, 24),
      cyan
    );

    const orbit = mesh(
      groups[4],
      new T.TorusGeometry(1.53, 0.025, 12, 100),
      silver
    );

    orbit.rotation.set(1.05, 0.3, -0.25);

    const satellite = mesh(
      groups[4],
      new T.IcosahedronGeometry(0.23, 0),
      violet,
      [1.15, 0.88, 0.2]
    );

    let spin = 0;

    updates[4].push(() => {
      sculpture.rotation.set(
        0.15 + state.dragY,
        spin + state.dragX,
        0.1
      );

      sculpture.material.wireframe = state.wire;
      satellite.rotation.set(spin, spin * 0.8, 0);
    });

    /* ---------- 06: AI network ---------- */

    const core = mesh(
      groups[5],
      new T.IcosahedronGeometry(0.6, 1),
      violet
    );

    core.add(
      new T.LineSegments(
        new T.EdgesGeometry(core.geometry),
        new T.LineBasicMaterial({ color: 0xe1d6ff })
      )
    );

    const nodes = [];

    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2;

      const position = new T.Vector3(
        Math.cos(angle) * 1.47,
        Math.sin(angle) * 1.2,
        Math.sin(angle * 3) * 0.4
      );

      const node = mesh(
        groups[5],
        new T.IcosahedronGeometry(0.1, 1),
        cyan,
        position.toArray()
      );

      nodes.push(node);

      groups[5].add(
        new T.Line(
          new T.BufferGeometry().setFromPoints([
            new T.Vector3(),
            position
          ]),
          new T.LineBasicMaterial({
            color: 0x67e8f9,
            transparent: true,
            opacity: 0.3
          })
        )
      );
    }

    updates[5].push((time) => {
      groups[5].rotation.y = time * 0.12;

      nodes.forEach((node, index) => {
        node.scale.setScalar(
          1 +
          Math.max(
            0,
            Math.sin(time * 2 - index * 0.55)
          ) * 0.35
        );
      });
    });

    /* ---------- Service crossfades ---------- */

    const materials = groups.map((group) => {
      const list = [];

      group.traverse((object) => {
        if (!object.material) return;

        list.push({
          material: object.material,
          opacity: object.material.opacity
        });
      });

      return list;
    });

    const weights = [1, 0, 0, 0, 0, 0];

    function setOpacity(index, value) {
      materials[index].forEach(
        ({ material, opacity: originalOpacity }) => {
          const transparent =
            value < 0.999 || originalOpacity < 1;

          if (material.transparent !== transparent) {
            material.transparent = transparent;
            material.needsUpdate = true;
          }

          material.opacity = originalOpacity * value;

          material.depthWrite =
            value > 0.99 && originalOpacity === 1;
        }
      );
    }

    /* ---------- Pointer interaction ---------- */

    let lastPointer = null;

    canvas.addEventListener("pointerdown", (event) => {
      if (state.service !== 4) return;

      state.dragging = true;
      lastPointer = [event.clientX, event.clientY];

      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    });

    canvas.addEventListener("pointermove", (event) => {
      if (
        state.dragging &&
        state.service === 4 &&
        lastPointer
      ) {
        state.dragX +=
          (event.clientX - lastPointer[0]) * 0.008;

        state.dragY +=
          (event.clientY - lastPointer[1]) * 0.008;

        lastPointer = [event.clientX, event.clientY];
        state.dirty = true;

        return;
      }

      if (
        state.paused ||
        event.pointerType === "touch"
      ) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();

      state.x =
        ((event.clientX - bounds.left) / bounds.width - 0.5) *
        0.35;

      state.y =
        ((event.clientY - bounds.top) / bounds.height - 0.5) *
        0.22;

      state.dirty = true;
    });

    function release(event) {
      state.dragging = false;
      lastPointer = null;

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      canvas.style.cursor =
        state.service === 4 ? "grab" : "default";
    }

    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);

    canvas.addEventListener("pointerleave", () => {
      state.x = 0;
      state.y = 0;
      state.dirty = true;
    });

    /* ---------- Visibility and resizing ---------- */

    new IntersectionObserver((entries) => {
      state.visible = entries[0].isIntersecting;
      state.dirty = true;
    }).observe(canvas);

    function resize() {
      const bounds = canvas.getBoundingClientRect();

      if (!bounds.width || !bounds.height) return;

      renderer.setSize(
        bounds.width,
        bounds.height,
        false
      );

      camera.aspect = bounds.width / bounds.height;

      camera.position.z =
        7.6 / Math.min(1, camera.aspect);

      camera.updateProjectionMatrix();
      state.dirty = true;
    }

    new ResizeObserver(resize).observe(canvas);
    resize();

    let contextLost = false;

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      contextLost = true;

      message.hidden = false;
      message.textContent =
        "3D preview interrupted. Refresh to reload.";
    });

    canvas.addEventListener("webglcontextrestored", () => {
      contextLost = false;
      state.dirty = true;
      message.hidden = true;
    });

    message.hidden = true;

    /* ---------- Animation loop ---------- */

    let previousTime = 0;
    let time = 0;
    let lastScreenUpdate = -1;

    function frame(now) {
      const delta = previousTime
        ? Math.min((now - previousTime) / 1000, 0.04)
        : 0;

      previousTime = now;

      if (
        state.visible &&
        !document.hidden &&
        !contextLost
      ) {
        let changing = false;

        weights.forEach((value, index) => {
          const target = index === state.service ? 1 : 0;

          let next = state.paused
            ? target
            : value +
              (target - value) *
              (1 - Math.exp(-delta * 9));

          if (Math.abs(next - target) < 0.002) {
            next = target;
          }

          if (next !== value) {
            changing = true;
          }

          weights[index] = next;
        });

        if (!state.paused || state.dirty || changing) {
          if (!state.paused) {
            time += delta;

            if (!state.dragging) {
              spin += delta * 0.23;
            }
          }

          /* Update the phone texture at approximately 10 FPS. */
          if (
            weights[0] > 0.002 &&
            time - lastScreenUpdate > 0.1
          ) {
            drawApp(time);
            lastScreenUpdate = time;
          }

          groups.forEach((group, index) => {
            const weight = weights[index];

            group.visible = weight > 0.001;

            if (!group.visible) return;

            setOpacity(index, weight);

            group.scale.setScalar(
              0.92 + weight * 0.08
            );

            group.position.y =
              (1 - weight) * -0.12;

            updates[index].forEach((update) => {
              update(time);
            });
          });

          if (state.paused) {
            world.rotation.x = 0;
            world.rotation.y = 0;
          } else {
            world.rotation.y +=
              (state.x - world.rotation.y) * 0.08;

            world.rotation.x +=
              (state.y - world.rotation.x) * 0.08;
          }

          renderer.render(scene, camera);
          state.dirty = false;
        }
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }
})();