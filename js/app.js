(() => {
  const canvas = document.getElementById("editor-canvas");
  const ctx = canvas.getContext("2d");
  const mainImage = new Image();
  const stickers = [];
  const images = new Map();
  let selected = null;
  let interaction = null;
  let scale = 1;

  const $ = (id) => document.getElementById(id);
  const toast = (message) => {
    const element = $("toast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("show"), 2200);
  };

  mainImage.onload = () => {
    canvas.width = mainImage.naturalWidth;
    canvas.height = mainImage.naturalHeight;
    $("loading").hidden = true;
    fitCanvas();
    render();
  };
  mainImage.onerror = () => { $("loading").textContent = "主图加载失败，请检查 img/main.webp"; };
  mainImage.src = "img/main.webp";

  function fitCanvas() {
    const box = $("canvas-wrap");
    const maxWidth = Math.max(100, box.clientWidth - 32);
    const maxHeight = Math.min(window.innerHeight * .7, box.clientHeight - 32);
    scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height, 1);
    canvas.style.width = `${canvas.width * scale}px`;
    canvas.style.height = `${canvas.height * scale}px`;
  }
  window.addEventListener("resize", fitCanvas);

  function render() {
    if (!mainImage.complete || !canvas.width) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mainImage, 0, 0);
    stickers.forEach((sticker) => {
      const image = images.get(sticker.fileName);
      if (!image) return;
      ctx.save();
      ctx.translate(sticker.x, sticker.y);
      ctx.rotate(sticker.rotation);
      ctx.globalAlpha = sticker === selected ? .94 : 1;
      ctx.drawImage(image, -sticker.width / 2, -sticker.height / 2, sticker.width, sticker.height);
      if (sticker === selected) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#ae5f4f";
        ctx.lineWidth = Math.max(2, canvas.width / 420);
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(-sticker.width / 2, -sticker.height / 2, sticker.width, sticker.height);
        ctx.setLineDash([]);
        drawControls(sticker);
      }
      ctx.restore();
    });
  }

  function drawControls(sticker) {
    const size = Math.max(30 / scale, canvas.width / 28);
    const corners = [
      [-sticker.width / 2, -sticker.height / 2, "#fffefa", "#ae5f4f"],
      [sticker.width / 2, -sticker.height / 2, "#ae5f4f", "#fffefa"],
      [sticker.width / 2, sticker.height / 2, "#fffefa", "#ae5f4f"],
      [-sticker.width / 2, sticker.height / 2, "#ae5f4f", "#fffefa"]
    ];
    corners.forEach(([x, y, fill, stroke]) => {
      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(2, size / 12);
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    drawResizeIcon(-sticker.width / 2, -sticker.height / 2, size);
    drawRotateIcon(sticker.width / 2, -sticker.height / 2, size);
    drawResizeIcon(sticker.width / 2, sticker.height / 2, size);
    drawDeleteIcon(-sticker.width / 2, sticker.height / 2, size);
  }

  function drawResizeIcon(x, y, size) {
    const arm = size * .25;
    ctx.save();
    ctx.strokeStyle = "#ae5f4f";
    ctx.lineWidth = Math.max(2, size / 10);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - arm * .9, y - arm * .9);
    ctx.lineTo(x + arm, y + arm);
    ctx.moveTo(x - arm * .9, y - arm * .9);
    ctx.lineTo(x - arm * .9, y - arm * .15);
    ctx.moveTo(x - arm * .9, y - arm * .9);
    ctx.lineTo(x - arm * .15, y - arm * .9);
    ctx.moveTo(x + arm * .9, y + arm * .9);
    ctx.lineTo(x + arm * .9, y + arm * .15);
    ctx.moveTo(x + arm * .9, y + arm * .9);
    ctx.lineTo(x + arm * .15, y + arm * .9);
    ctx.stroke();
    ctx.restore();
  }

  function drawRotateIcon(x, y, size) {
    ctx.save();
    ctx.strokeStyle = "#fffefa";
    ctx.fillStyle = "#fffefa";
    ctx.lineWidth = Math.max(2, size / 10);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x, y, size * .25, -.8, 4.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size * .24, y - size * .28);
    ctx.lineTo(x + size * .02, y - size * .3);
    ctx.lineTo(x + size * .17, y - size * .1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDeleteIcon(x, y, size) {
    const width = size * .32;
    const height = size * .34;
    ctx.save();
    ctx.strokeStyle = "#fffefa";
    ctx.fillStyle = "#fffefa";
    ctx.lineWidth = Math.max(2, size / 11);
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.rect(x - width / 2, y - height / 2 + size * .05, width, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - width * .65, y - height / 2);
    ctx.lineTo(x + width * .65, y - height / 2);
    ctx.moveTo(x - width * .28, y - height / 2);
    ctx.lineTo(x - width * .16, y - height / 2 - size * .12);
    ctx.lineTo(x + width * .16, y - height / 2 - size * .12);
    ctx.lineTo(x + width * .28, y - height / 2);
    ctx.stroke();
    ctx.restore();
  }

  function loadSticker(item) {
    if (images.has(item.fileName)) return Promise.resolve(images.get(item.fileName));
    const image = new Image();
    const promise = new Promise((resolve, reject) => {
      image.onload = () => { images.set(item.fileName, image); resolve(image); };
      image.onerror = reject;
    });
    image.src = `img/${item.fileName}`;
    return promise;
  }

  function addSticker(item) {
    loadSticker(item).then((image) => {
      const base = Math.min(canvas.width, canvas.height) * .22;
      const ratio = image.naturalWidth / image.naturalHeight;
      const width = ratio >= 1 ? base : base * ratio;
      const height = ratio >= 1 ? base / ratio : base;
      const offset = stickers.length * 18;
      selected = { ...item, x: canvas.width / 2 + offset, y: canvas.height / 2 + offset, width, height, baseWidth: width, baseHeight: height, rotation: 0 };
      stickers.push(selected);
      updateEditor();
      renderLayers();
      render();
      if (document.body.contains($("controls")) && $("controls").classList.contains("mobile-collection")) {
        $("controls").classList.remove("open", "mobile-collection");
      }
      toast(`${item.content} 已添加`);
    }).catch(() => toast("贴纸加载失败，请检查图片文件"));
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
  }
  function localPosition(point, sticker) {
    const dx = point.x - sticker.x, dy = point.y - sticker.y;
    const cos = Math.cos(-sticker.rotation), sin = Math.sin(-sticker.rotation);
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  }
  function controlAt(point, sticker) {
    const local = localPosition(point, sticker);
    const size = Math.max(30 / scale, canvas.width / 28);
    const controls = [
      { name: "resize", x: -sticker.width / 2, y: -sticker.height / 2 },
      { name: "rotate", x: sticker.width / 2, y: -sticker.height / 2 },
      { name: "resize", x: sticker.width / 2, y: sticker.height / 2 },
      { name: "delete", x: -sticker.width / 2, y: sticker.height / 2 }
    ];
    return controls.find((control) => Math.hypot(local.x - control.x, local.y - control.y) <= size * .85);
  }
  function hitTest(point, sticker) {
    const local = localPosition(point, sticker);
    return Math.abs(local.x) <= sticker.width / 2 && Math.abs(local.y) <= sticker.height / 2;
  }
  function findTopmostSticker(point, test) {
    for (let index = stickers.length - 1; index >= 0; index -= 1) {
      if (test(point, stickers[index])) return stickers[index];
    }
    return null;
  }
  canvas.addEventListener("pointerdown", (event) => {
    const point = pointerPosition(event);
    const previouslySelected = selected;
    const selectedControl = previouslySelected ? controlAt(point, previouslySelected) : null;
    const hitSticker = findTopmostSticker(point, (position, sticker) => hitTest(position, sticker));

    if (selectedControl && previouslySelected) {
      selected = previouslySelected;
      canvas.setPointerCapture(event.pointerId);
      if (selectedControl.name === "delete") {
        stickers.splice(stickers.indexOf(selected), 1);
        selected = null;
        updateEditor();
        renderLayers();
        render();
        toast("贴纸已删除");
        return;
      }
      if (selectedControl.name === "rotate") {
        interaction = {
          mode: "rotate",
          startAngle: Math.atan2(point.y - selected.y, point.x - selected.x),
          rotation: selected.rotation
        };
      } else if (selectedControl.name === "resize") {
        interaction = {
          mode: "resize",
          startDistance: Math.max(1, Math.hypot(point.x - selected.x, point.y - selected.y)),
          width: selected.width,
          height: selected.height
        };
      }
    } else {
      selected = hitSticker || null;
      if (selected) {
        canvas.setPointerCapture(event.pointerId);
        interaction = { mode: "move", startX: point.x, startY: point.y, x: selected.x, y: selected.y };
      }
    }
    updateEditor(); render();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!interaction || !selected) return;
    const point = pointerPosition(event);
    if (interaction.mode === "move") {
      selected.x = interaction.x + point.x - interaction.startX;
      selected.y = interaction.y + point.y - interaction.startY;
    } else if (interaction.mode === "resize") {
      const distance = Math.hypot(point.x - selected.x, point.y - selected.y);
      const ratio = Math.max(.2, Math.min(2.2, distance / interaction.startDistance));
      selected.width = interaction.width * ratio;
      selected.height = interaction.height * ratio;
      $("size-slider").value = Math.round(selected.width / selected.baseWidth * 100);
      $("size-value").textContent = `${$("size-slider").value}%`;
    } else if (interaction.mode === "rotate") {
      const angle = Math.atan2(point.y - selected.y, point.x - selected.x);
      selected.rotation = interaction.rotation + angle - interaction.startAngle;
    }
    render();
  });
  ["pointerup", "pointercancel"].forEach((name) => canvas.addEventListener(name, () => { interaction = null; }));

  function updateEditor() {
    const active = Boolean(selected);
    $("sticker-count").textContent = `${stickers.length} 个贴纸`;
    $("empty-state").hidden = active;
    $("edit-tools").hidden = !active;
    if (!active) { $("selection-hint").textContent = "点击贴纸开始编辑"; return; }
    $("selection-hint").textContent = "拖动贴纸，使用四角控制点";
    $("selected-name").textContent = selected.content;
    const size = Math.round(selected.width / selected.baseWidth * 100);
    $("size-slider").value = size;
    $("size-value").textContent = `${size}%`;
  }
  function renderLayers() {
    const list = $("layer-list");
    $("layer-count").textContent = stickers.length;
    $("mobile-layer-count").textContent = stickers.length;
    $("layers-empty").hidden = stickers.length > 0;
    list.innerHTML = "";
    let layerDrag = null;
    [...stickers].reverse().forEach((sticker, visibleIndex) => {
      const item = document.createElement("div");
      item.className = `layer-item selectable${sticker === selected ? " active" : ""}`;
      item.title = "点击选中，拖动调整层级";
      item.dataset.layerIndex = visibleIndex;
      const thumb = document.createElement("img");
      thumb.className = "layer-thumb";
      thumb.src = `img/${sticker.fileName}`;
      thumb.alt = "";
      const name = document.createElement("span");
      name.className = "layer-name";
      name.textContent = sticker.content;
      const actions = document.createElement("div");
      actions.className = "layer-actions";
      const down = document.createElement("button");
      down.className = "layer-action";
      down.type = "button";
      down.title = "下移一层";
      down.textContent = "↓";
      down.disabled = visibleIndex === stickers.length - 1;
      const up = document.createElement("button");
      up.className = "layer-action";
      up.type = "button";
      up.title = "上移一层";
      up.textContent = "↑";
      up.disabled = visibleIndex === 0;
      const remove = document.createElement("button");
      remove.className = "layer-action danger";
      remove.type = "button";
      remove.title = "删除贴纸";
      remove.textContent = "×";
      actions.append(down, up, remove);
      item.append(thumb, name, actions);
      item.addEventListener("pointerdown", (event) => {
        if (event.target.closest("button")) return;
        layerDrag = { sticker, target: sticker, moved: false };
        item.setPointerCapture(event.pointerId);
      });
      item.addEventListener("pointermove", (event) => {
        if (!layerDrag || layerDrag.sticker !== sticker) return;
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".layer-item");
        if (target && target !== item) {
          const targetIndex = Number(target.dataset.layerIndex);
          if (Number.isInteger(targetIndex)) {
            layerDrag.target = [...stickers].reverse()[targetIndex];
            layerDrag.moved = true;
            list.querySelectorAll(".layer-item").forEach((entry) => entry.classList.remove("drop-target"));
            target.classList.add("drop-target");
          }
        }
      });
      item.addEventListener("pointerup", () => {
        if (!layerDrag || layerDrag.sticker !== sticker) return;
        const drag = layerDrag;
        layerDrag = null;
        list.querySelectorAll(".layer-item").forEach((entry) => entry.classList.remove("drop-target"));
        if (!drag.moved || drag.sticker === drag.target) return;
        item.dataset.dragged = "true";
        setTimeout(() => delete item.dataset.dragged, 0);
        const from = stickers.indexOf(drag.sticker);
        const to = stickers.indexOf(drag.target);
        stickers.splice(from, 1);
        stickers.splice(to, 0, drag.sticker);
        renderLayers();
        render();
      });
      item.onclick = () => {
        if (item.dataset.dragged === "true") return;
        selected = sticker;
        updateEditor();
        renderLayers();
        render();
      };
      down.onclick = (event) => {
        event.stopPropagation();
        const index = stickers.indexOf(sticker);
        if (index > 0) {
          [stickers[index], stickers[index - 1]] = [stickers[index - 1], stickers[index]];
          renderLayers();
          render();
        }
      };
      up.onclick = (event) => {
        event.stopPropagation();
        const index = stickers.indexOf(sticker);
        if (index < stickers.length - 1) {
          [stickers[index], stickers[index + 1]] = [stickers[index + 1], stickers[index]];
          renderLayers();
          render();
        }
      };
      remove.onclick = (event) => {
        event.stopPropagation();
        stickers.splice(stickers.indexOf(sticker), 1);
        if (selected === sticker) selected = null;
        updateEditor();
        renderLayers();
        render();
        toast("贴纸已删除");
      };
      list.appendChild(item);
    });
  }
  $("rotate-left").onclick = () => { if (selected) { selected.rotation -= Math.PI / 12; render(); } };
  $("rotate-right").onclick = () => { if (selected) { selected.rotation += Math.PI / 12; render(); } };
  $("size-slider").oninput = (event) => {
    if (!selected) return;
    const value = Number(event.target.value) / 100;
    selected.width = selected.baseWidth * value; selected.height = selected.baseHeight * value;
    $("size-value").textContent = `${event.target.value}%`; render();
  };
  $("delete-button").onclick = () => {
    if (!selected) return;
    stickers.splice(stickers.indexOf(selected), 1); selected = null; updateEditor(); renderLayers(); render(); toast("贴纸已删除");
  };

  const grid = $("sticker-grid");
  const lazyStickerImages = "IntersectionObserver" in window
    ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const image = entry.target;
        image.src = image.dataset.src;
        image.removeAttribute("data-src");
        observer.unobserve(image);
      });
    }, { root: grid, rootMargin: "120px" })
    : null;
  function drawGrid(query = "") {
    grid.innerHTML = "";
    sticker_name.filter((item) => item.content.includes(query)).forEach((item) => {
      const button = document.createElement("button");
      button.className = "sticker-card"; button.type = "button"; button.title = `添加${item.content}`;
      const image = document.createElement("img");
      image.dataset.src = `img/${item.fileName}`;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      button.append(image, Object.assign(document.createElement("span"), { textContent: item.content }));
      button.onclick = () => addSticker(item);
      grid.appendChild(button);
      if (lazyStickerImages) lazyStickerImages.observe(image);
      else image.src = image.dataset.src;
    });
    if (!grid.children.length) grid.innerHTML = '<p class="empty-state">没有找到贴纸</p>';
  }
  drawGrid();
  renderLayers();
  $("sticker-search").oninput = (event) => drawGrid(event.target.value.trim());
  $("open-panel").onclick = () => {
    $("controls").classList.remove("mobile-layers");
    $("controls").classList.add("open", "mobile-collection");
  };
  $("open-layers").onclick = () => {
    $("controls").classList.remove("mobile-collection");
    $("controls").classList.add("open", "mobile-layers");
  };
  $("close-panel").onclick = () => $("controls").classList.remove("open", "mobile-collection", "mobile-layers");
  $("close-layers").onclick = () => $("controls").classList.remove("open", "mobile-collection", "mobile-layers");
  function showBrowserNotice() {
    const notice = $("browser-notice");
    const warning = $("browser-warning");
    const userAgent = navigator.userAgent || "";
    const embeddedBrowsers = [
      { pattern: /MicroMessenger/i, name: "微信" },
      { pattern: /(?:\bQQ\/|QQBrowser)/i, name: "QQ" },
      { pattern: /Weibo/i, name: "微博" },
      { pattern: /(?:XiaoHongShu|XHS|RedNote)/i, name: "小红书" }
    ];
    const browser = embeddedBrowsers.find(({ pattern }) => pattern.test(userAgent));
    if (browser) {
      warning.textContent = `检测到您正在使用${browser.name}内置浏览器，请注意：可能无法导出图片，建议复制链接后使用系统浏览器打开。`;
      warning.hidden = false;
    }
    notice.hidden = false;
    $("browser-notice-close").focus();
  }
  $("browser-notice-close").onclick = () => { $("browser-notice").hidden = true; };
  showBrowserNotice();
  $("export-button").onclick = () => {
    if (!canvas.width) return;
    const link = document.createElement("a");
    link.download = "kazuha-sticker-collage.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast("图片已导出");
  };
  document.querySelector(".controls").id = "controls";
})();
