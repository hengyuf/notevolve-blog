(function () {
  const data = window.PACKING_DATA;
  if (!data || !Array.isArray(data.frames)) return;

  const frames = data.frames;
  const target = data.target || 2.635;
  const canvas = document.getElementById("packingCanvas");
  const ctx = canvas.getContext("2d");
  const chart = document.getElementById("scoreChart");
  const slider = document.getElementById("frameSlider");
  const playButton = document.getElementById("playButton");
  const frameButtons = document.getElementById("frameButtons");
  const frameLabel = document.getElementById("frameLabel");
  const frameScore = document.getElementById("frameScore");
  const behaviorTitle = document.getElementById("behaviorTitle");
  const behaviorText = document.getElementById("behaviorText");

  let current = 0;
  let timer = null;
  let animation = null;

  slider.max = String(frames.length - 1);

  frames.forEach((frame, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = frame.cell;
    button.addEventListener("click", () => {
      stopPlayback();
      setFrame(index, true);
    });
    frameButtons.appendChild(button);
  });

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const size = Math.max(320, Math.round(rect.width || 640));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPacking(frames[current]);
  }

  function interpolateFrame(a, b, t) {
    const n = Math.min(a.centers.length, b.centers.length);
    const centers = [];
    const radii = [];
    for (let i = 0; i < n; i += 1) {
      const ax = a.centers[i][0];
      const ay = a.centers[i][1];
      const bx = b.centers[i][0];
      const by = b.centers[i][1];
      centers.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      radii.push(a.radii[i] + (b.radii[i] - a.radii[i]) * t);
    }
    return { centers, radii, score: a.score + (b.score - a.score) * t };
  }

  function drawPacking(frame) {
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || width;
    ctx.clearRect(0, 0, width, height);

    const pad = width * 0.08;
    const span = width - pad * 2;

    ctx.save();
    ctx.fillStyle = "#f8faf8";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#9aa8a9";
    ctx.lineWidth = 1.4;
    ctx.fillRect(pad, pad, span, span);
    ctx.strokeRect(pad, pad, span, span);

    const order = frame.radii
      .map((radius, index) => ({ radius, index }))
      .sort((a, b) => b.radius - a.radius);

    order.forEach(({ index }) => {
      const [cx, cy] = frame.centers[index];
      const r = frame.radii[index];
      const x = pad + cx * span;
      const y = pad + (1 - cy) * span;
      const radius = r * span;
      const hue = (index * 43) % 360;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 68%, 62%, 0.43)`;
      ctx.fill();
      ctx.strokeStyle = `hsla(${hue}, 58%, 38%, 0.78)`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    ctx.fillStyle = "#38464d";
    ctx.font = "600 13px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText("unit square, 26 circles", pad, height - pad * 0.45);
    ctx.restore();
  }

  function drawScoreChart(activeIndex) {
    const width = 720;
    const height = 260;
    const margin = { left: 56, right: 26, top: 22, bottom: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const scores = frames.map((frame) => frame.score);
    const minScore = Math.min(...scores) - 0.03;
    const maxScore = Math.max(...scores, target) + 0.01;
    const firstCross = frames.findIndex((frame) => frame.score > target);

    const x = (i) =>
      margin.left + (frames.length === 1 ? 0 : (i / (frames.length - 1)) * innerWidth);
    const y = (score) =>
      margin.top + ((maxScore - score) / (maxScore - minScore)) * innerHeight;

    const points = frames.map((frame, index) => `${x(index)},${y(frame.score)}`).join(" ");
    const activePoints = frames
      .slice(0, activeIndex + 1)
      .map((frame, index) => `${x(index)},${y(frame.score)}`)
      .join(" ");

    chart.innerHTML = "";

    const ns = "http://www.w3.org/2000/svg";
    const add = (name, attrs, parent = chart) => {
      const el = document.createElementNS(ns, name);
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
      parent.appendChild(el);
      return el;
    };

    add("rect", { x: 0, y: 0, width, height, rx: 8, fill: "#ffffff" });
    add("line", {
      x1: margin.left,
      y1: margin.top + innerHeight,
      x2: margin.left + innerWidth,
      y2: margin.top + innerHeight,
      stroke: "#bac5c7",
      "stroke-width": 1
    });
    add("line", {
      x1: margin.left,
      y1: margin.top,
      x2: margin.left,
      y2: margin.top + innerHeight,
      stroke: "#bac5c7",
      "stroke-width": 1
    });

    const targetY = y(target);
    add("line", {
      x1: margin.left,
      y1: targetY,
      x2: margin.left + innerWidth,
      y2: targetY,
      stroke: "#c2410c",
      "stroke-width": 1.4,
      "stroke-dasharray": "6 6"
    });
    const targetText = add("text", {
      x: margin.left + innerWidth - 104,
      y: targetY - 8,
      class: "target-label"
    });
    targetText.textContent = "target 2.635";

    add("polyline", {
      points,
      fill: "none",
      stroke: "#c6d0d3",
      "stroke-width": 4,
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    });
    add("polyline", {
      points: activePoints,
      fill: "none",
      stroke: "#0f766e",
      "stroke-width": 4,
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    });

    frames.forEach((frame, index) => {
      const isActive = index === activeIndex;
      const isCross = index === firstCross;
      add("circle", {
        cx: x(index),
        cy: y(frame.score),
        r: isActive ? 7 : isCross ? 6 : 4.5,
        fill: isActive ? "#0f766e" : isCross ? "#c2410c" : "#ffffff",
        stroke: isActive ? "#0f766e" : isCross ? "#c2410c" : "#91a0a5",
        "stroke-width": isActive ? 2 : 1.6
      }).addEventListener("click", () => {
        stopPlayback();
        setFrame(index, true);
      });
    });

    if (firstCross >= 0) {
      const crossX = x(firstCross);
      const crossY = y(frames[firstCross].score);
      add("line", {
        x1: crossX,
        y1: crossY + 10,
        x2: crossX,
        y2: margin.top + innerHeight,
        stroke: "#c2410c",
        "stroke-width": 1,
        "stroke-dasharray": "3 5"
      });
      const label = add("text", {
        x: Math.min(crossX + 10, margin.left + innerWidth - 160),
        y: crossY - 14,
        class: "point-label"
      });
      label.textContent = "first exceeds target";
    }

    const xLabel = add("text", {
      x: margin.left + innerWidth / 2 - 58,
      y: height - 12,
      class: "axis-label"
    });
    xLabel.textContent = "Rounds / notebook cells";

    const yLabel = add("text", {
      x: 10,
      y: 20,
      class: "axis-label"
    });
    yLabel.textContent = "score";

    frames.forEach((frame, index) => {
      if (index === 0 || index === frames.length - 1 || index === firstCross) {
        const label = add("text", {
          x: x(index) - 18,
          y: margin.top + innerHeight + 24,
          class: "axis-label"
        });
        label.textContent = frame.cell;
      }
    });
  }

  function setFrame(index, animate) {
    const next = Math.max(0, Math.min(frames.length - 1, index));
    const from = frames[current];
    const to = frames[next];
    current = next;
    slider.value = String(next);
    updateText(to);
    updateButtons(next);
    drawScoreChart(next);

    if (animation) cancelAnimationFrame(animation);
    if (!animate || from === to) {
      drawPacking(to);
      return;
    }

    const start = performance.now();
    const duration = 520;
    const tick = (now) => {
      const raw = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - raw, 3);
      drawPacking(interpolateFrame(from, to, eased));
      if (raw < 1) {
        animation = requestAnimationFrame(tick);
      } else {
        animation = null;
      }
    };
    animation = requestAnimationFrame(tick);
  }

  function updateText(frame) {
    frameLabel.textContent = `${frame.cell} · ${frame.label}`;
    frameScore.textContent = frame.score.toFixed(6);
    behaviorTitle.textContent = frame.label;
    behaviorText.textContent = frame.description;
  }

  function updateButtons(index) {
    Array.from(frameButtons.children).forEach((button, i) => {
      button.classList.toggle("active", i === index);
    });
  }

  function stopPlayback() {
    if (timer) {
      clearInterval(timer);
      timer = null;
      playButton.textContent = "Play";
    }
  }

  function startPlayback() {
    if (timer) return;
    playButton.textContent = "Pause";
    timer = setInterval(() => {
      const next = current + 1 >= frames.length ? 0 : current + 1;
      setFrame(next, true);
    }, 1350);
  }

  slider.addEventListener("input", (event) => {
    stopPlayback();
    setFrame(Number(event.target.value), true);
  });

  playButton.addEventListener("click", () => {
    if (timer) stopPlayback();
    else startPlayback();
  });

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  setFrame(0, false);
})();
