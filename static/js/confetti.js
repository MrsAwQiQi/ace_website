// A short confetti burst for the student tools. Skipped for visitors who prefer reduced motion.
window.confettiBurst = function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const colours = ["#13234f", "#c8892d", "#c0262d", "#f0b85a", "#2f7d5b", "#3554a5"];
  const pieces = Array.from({ length: 140 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 120,
    y: canvas.height * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 12 - 4,
    size: Math.random() * 7 + 5,
    spin: Math.random() * Math.PI,
    colour: colours[Math.floor(Math.random() * colours.length)],
  }));
  const start = performance.now();
  const frame = (now) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.spin += 0.2;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = p.colour;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });
    if (now - start < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
};
