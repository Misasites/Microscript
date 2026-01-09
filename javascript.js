// javascript.js (CLIENTE - roda no navegador)
// ✅ Funcional: persiste dados, junta PDFs com páginas de texto, envia PDF+TXT para Apps Script
// ⚠️ Troque APPS_SCRIPT_WEBAPP_URL pela sua URL /exec do WebApp

const APPS_SCRIPT_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzx5To8lK42s_ketzlHbXfXr6MN28yqHnmwcR14DSnrHP7UJRpZcNelUhX4_MPIwDSGKQ/exec";




/* =========================
   SweetAlert2 helpers
========================= */
const Modal = {
  loading(title, text) {
    return Swal.fire({
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });
  },
  success(title, html) {
    return Swal.fire({
      title,
      icon: "success",
      html: html || "",
      draggable: true,
    });
  },
  error(title, text) {
    return Swal.fire({
      title,
      icon: "error",
      text: text || "Ocorreu um erro.",
      draggable: true,
    });
  },
  confirm({ title, text, confirmText = "Sim", cancelText = "Cancelar" }) {
    return Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      draggable: true,
    });
  },
};

/* =========================
   IndexedDB (persistência)
========================= */
const DB_NAME = "curso_destaques_db_v3";
const STORE_TEXTS = "texts";
const STORE_FILES = "files";
const STORE_META = "meta";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TEXTS)) {
        db.createObjectStore(STORE_TEXTS, { keyPath: "field" });
      }
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// META
async function putMeta(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readwrite");
    tx.objectStore(STORE_META).put({ key, value: value ?? "" });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function getMeta(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readonly");
    const req = tx.objectStore(STORE_META).get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : "");
    req.onerror = () => reject(req.error);
  });
}

async function clearMeta() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readwrite");
    tx.objectStore(STORE_META).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// TEXTOS
async function putText(field, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEXTS, "readwrite");
    tx.objectStore(STORE_TEXTS).put({
      field: Number(field),
      value: value || "",
      updatedAt: Date.now(),
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllTexts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEXTS, "readonly");
    const req = tx.objectStore(STORE_TEXTS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function clearTexts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEXTS, "readwrite");
    tx.objectStore(STORE_TEXTS).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// FILES (somente PDFs)
async function addFile(field, file) {
  const bytes = await file.arrayBuffer();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readwrite");
    tx.objectStore(STORE_FILES).add({
      field: Number(field),
      name: file.name,
      type: file.type || "application/pdf",
      size: file.size,
      addedAt: Date.now(),
      data: bytes,
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllFiles() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readonly");
    const req = tx.objectStore(STORE_FILES).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteFile(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readwrite");
    tx.objectStore(STORE_FILES).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function clearFiles() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readwrite");
    tx.objectStore(STORE_FILES).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/* =========================
   DOM Refs (IDs do seu HTML)
========================= */
const courseName = document.getElementById("courseName");
const synopsis = document.getElementById("synopsis");
const synopsisCount = document.getElementById("synopsisCount");
const synopsisHint = document.getElementById("synopsisHint");

const youtubeUrl = document.getElementById("youtubeUrl");
const youtubeStatus = document.getElementById("youtubeStatus");
const youtubePreview = document.getElementById("youtubePreview");
const youtubeIframe = document.getElementById("youtubeIframe");
const youtubeVideoId = document.getElementById("youtubeVideoId");
const btnClearYoutube = document.getElementById("btnClearYoutube");

const selNivel = document.getElementById("nivel");
const selCarga = document.getElementById("carga");

const textAreas = document.querySelectorAll(".texto");
const fileInputs = document.querySelectorAll(".files");

const btnLimpar = document.getElementById("btnLimpar");
const btnJuntar = document.getElementById("btnJuntar");
const btnDrive = document.getElementById("btnDrive");
const btnVoltar = document.getElementById("btnVoltar");
const lista = document.getElementById("lista");

/* =========================
   Validadores / Utils
========================= */
function safeTrim(v) {
  return String(v || "").trim();
}

function isPdfFile(file) {
  const name = (file.name || "").toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Sinopse 350..500 (se preenchida)
function validateSynopsisUI() {
  const len = (synopsis.value || "").length;
  synopsisCount.textContent = String(len);

  const ok = len === 0 || (len >= 350 && len <= 500);
  synopsis.classList.toggle("is-invalid", !ok && len > 0);
  synopsis.classList.toggle("is-valid", ok && len >= 350 && len <= 500);

  synopsisHint.textContent =
    len === 0
      ? "Mínimo 350 e máximo 500 caracteres."
      : len < 350
      ? `Faltam ${350 - len} caracteres para o mínimo.`
      : len > 500
      ? `Passou ${len - 500} caracteres do máximo.`
      : "Perfeito! Está dentro do limite.";

  return ok;
}

// YouTube parse
function parseYouTubeVideoId(urlRaw) {
  const url = safeTrim(urlRaw);
  if (!url) return { id: "", normalized: "" };

  const cleanId = (id) => {
    const m = String(id || "").match(/[a-zA-Z0-9_-]{11}/);
    return m ? m[0] : "";
  };

  try {
    const u = new URL(url);

    // youtu.be/<id>
    if (u.hostname.includes("youtu.be")) {
      return { id: cleanId(u.pathname.replace("/", "")), normalized: url };
    }

    // youtube.com/watch?v=<id>
    const v = u.searchParams.get("v");
    if (v) return { id: cleanId(v), normalized: url };

    // youtube.com/shorts/<id>
    if (u.pathname.includes("/shorts/")) {
      const id = u.pathname.split("/shorts/")[1]?.split(/[?&/]/)[0] || "";
      return { id: cleanId(id), normalized: url };
    }

    // youtube.com/embed/<id>
    if (u.pathname.includes("/embed/")) {
      const id = u.pathname.split("/embed/")[1]?.split(/[?&/]/)[0] || "";
      return { id: cleanId(id), normalized: url };
    }

    return { id: "", normalized: url };
  } catch {
    const m = url.match(/(?:v=|\/shorts\/|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
    return { id: m ? cleanId(m[1]) : "", normalized: url };
  }
}

function setYouTubePreview(id) {
  if (!id) {
    youtubePreview?.classList.add("d-none");
    if (youtubeIframe) youtubeIframe.src = "";
    if (youtubeVideoId) youtubeVideoId.textContent = "—";
    if (youtubeStatus) youtubeStatus.textContent = "";
    youtubeUrl?.classList.remove("is-valid", "is-invalid");
    return;
  }

  youtubePreview?.classList.remove("d-none");
  if (youtubeIframe) youtubeIframe.src = `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
  if (youtubeVideoId) youtubeVideoId.textContent = id;

  youtubeUrl?.classList.add("is-valid");
  youtubeUrl?.classList.remove("is-invalid");
  if (youtubeStatus) youtubeStatus.textContent = "Link válido ✔";
}

function setYouTubeInvalid(msg) {
  youtubePreview?.classList.add("d-none");
  if (youtubeIframe) youtubeIframe.src = "";
  if (youtubeVideoId) youtubeVideoId.textContent = "—";

  youtubeUrl?.classList.add("is-invalid");
  youtubeUrl?.classList.remove("is-valid");
  if (youtubeStatus) youtubeStatus.textContent = msg || "Link inválido";
}

/* =========================
   Lista + habilitar botões
========================= */
async function renderList() {
  const texts = await getAllTexts();
  const files = await getAllFiles();

  const nameVal = safeTrim(courseName?.value);
  const synVal = safeTrim(synopsis?.value);
  const ytVal = safeTrim(youtubeUrl?.value);

  const textMap = {};
  texts.forEach((t) => (textMap[t.field] = t.value || ""));

  files.sort((a, b) => (a.field - b.field) || (a.addedAt - b.addedAt));
  if (lista) lista.innerHTML = "";

  let hasAny = false;

  // Curso
  if (nameVal) {
    hasAny = true;
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `<span><span class="file-pill me-2">CURSO</span><b>${escapeHtml(
      nameVal
    )}</b></span><button class="btn btn-outline-primary mini-btn" type="button">Editar</button>`;
    li.querySelector("button").onclick = () => courseName?.focus();
    lista?.appendChild(li);
  }

  // Sinopse
  if (synVal) {
    hasAny = true;
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    const preview = synVal.length > 110 ? synVal.slice(0, 110) + "..." : synVal;
    li.innerHTML = `<span><span class="file-pill me-2">SINOPSE</span>${escapeHtml(
      preview
    )}</span><button class="btn btn-outline-primary mini-btn" type="button">Editar</button>`;
    li.querySelector("button").onclick = () => synopsis?.focus();
    lista?.appendChild(li);
  }

  // YouTube
  if (ytVal) {
    hasAny = true;
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `<span><span class="file-pill me-2">YOUTUBE</span>${escapeHtml(
      ytVal
    )}</span><button class="btn btn-outline-primary mini-btn" type="button">Editar</button>`;
    li.querySelector("button").onclick = () => youtubeUrl?.focus();
    lista?.appendChild(li);
  }

  // Tópicos 1..4
  for (const field of [1, 2, 3, 4]) {
    const txt = safeTrim(textMap[field]);
    const fieldFiles = files.filter((f) => f.field === field);

    if (txt || fieldFiles.length) hasAny = true;

    if (txt) {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      const preview = txt.length > 110 ? txt.slice(0, 110) + "..." : txt;
      li.innerHTML = `<span><span class="file-pill me-2">TÓPICO ${field}</span>${escapeHtml(
        preview
      )}</span><button class="btn btn-outline-primary mini-btn" type="button">Editar</button>`;
      li.querySelector("button").onclick = () =>
        document.querySelector(`.texto[data-field="${field}"]`)?.focus();
      lista?.appendChild(li);
    }

    for (const f of fieldFiles) {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `<span><span class="file-pill me-2">PDF</span>
        <span class="text-secondary">Tópico ${field} —</span>
        ${escapeHtml(f.name)}</span>
        <button class="btn btn-outline-danger mini-btn" type="button">Remover</button>`;
      li.querySelector("button").onclick = async () => {
        await deleteFile(f.id);
        await renderList();
      };
      lista?.appendChild(li);
    }
  }

  if (!hasAny) {
    const li = document.createElement("li");
    li.className = "list-group-item text-secondary";
    li.textContent = "Nenhum conteúdo salvo ainda.";
    lista?.appendChild(li);
  }

  // habilitar botões
  const hasFiles = files.length > 0;
  const hasText = texts.some((t) => safeTrim(t.value).length > 0);
  const hasMeta = !!nameVal || !!synVal || !!ytVal;

  const enabled = hasFiles || hasText || hasMeta;
  if (btnJuntar) btnJuntar.disabled = !enabled;
  if (btnDrive) btnDrive.disabled = !enabled;
}

/* =========================
   PDF-lib: texto vira páginas + junta PDFs
========================= */
function wrapText(text, font, size, maxWidth) {
  const paragraphs = String(text || "").replace(/\r/g, "").split("\n");
  const lines = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      const width = font.widthOfTextAtSize(test, size);
      if (width <= maxWidth) line = test;
      else {
        if (line) lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
    lines.push("");
  }
  return lines;
}

async function addTextAsPdfPage(doc, title, text) {
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);

  const margin = 50;
  const maxWidth = 595.28 - margin * 2;
  let y = 841.89 - margin;

  page.drawText(title, { x: margin, y, size: 18, font });
  y -= 28;

  const lines = wrapText(text, font, 12, maxWidth);
  for (const line of lines) {
    if (y < margin) break;
    if (!line) {
      y -= 10;
      continue;
    }
    page.drawText(line, { x: margin, y, size: 12, font });
    y -= 16;
  }
}

async function buildFinalPdfBytes() {
  // persistir meta + textos
  await putMeta("courseName", courseName?.value || "");
  await putMeta("synopsis", synopsis?.value || "");
  await putMeta("youtubeUrl", youtubeUrl?.value || "");
  await putMeta("nivel", selNivel?.value || "");
  await putMeta("carga", selCarga?.value || "");

  for (const t of textAreas) {
    await putText(t.dataset.field, t.value);
  }

  const allFiles = await getAllFiles();
  allFiles.sort((a, b) => (a.field - b.field) || (a.addedAt - b.addedAt));

  const merged = await PDFLib.PDFDocument.create();
  const font = await merged.embedFont(PDFLib.StandardFonts.Helvetica);

  // Capa
  const capa = merged.addPage([595.28, 841.89]);
  let y = 800;

  const nm = safeTrim(courseName?.value) || "—";
  const syn = safeTrim(synopsis?.value);
  const yt = safeTrim(youtubeUrl?.value);

  capa.drawText("Informações do Curso", { x: 50, y, size: 18, font });
  y -= 30;

  capa.drawText(`Curso: ${nm}`, { x: 50, y, size: 12, font });
  y -= 18;

  capa.drawText(`Nível: ${selNivel?.value || "—"}`, { x: 50, y, size: 12, font });
  y -= 18;

  capa.drawText(`Carga horária: ${selCarga?.value || "—"}`, { x: 50, y, size: 12, font });
  y -= 18;

  if (yt) {
    capa.drawText(`Link do YouTube: ${yt}`, { x: 50, y, size: 11, font });
    y -= 18;
  }

  if (syn) {
    y -= 8;
    capa.drawText("Sinopse:", { x: 50, y, size: 12, font });
    y -= 18;

    const lines = wrapText(syn, font, 11, 595.28 - 100);
    for (const line of lines) {
      if (y < 50) break;
      if (!line) {
        y -= 8;
        continue;
      }
      capa.drawText(line, { x: 50, y, size: 11, font });
      y -= 14;
    }
  }

  // Conteúdo por tópicos 1..4
  for (const field of [1, 2, 3, 4]) {
    const ta = document.querySelector(`.texto[data-field="${field}"]`);
    const txt = safeTrim(ta?.value);

    if (txt) {
      await addTextAsPdfPage(merged, `Tópico ${field}`, txt);
    }

    const fieldPdfs = allFiles.filter((f) => f.field === field);
    for (const it of fieldPdfs) {
      const pdf = await PDFLib.PDFDocument.load(it.data);
      const pages = await merged.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
  }

  return await merged.save();
}

function buildTextPlain() {
  const nm = safeTrim(courseName?.value);
  const syn = safeTrim(synopsis?.value);
  const yt = safeTrim(youtubeUrl?.value);

  const topics = [1, 2, 3, 4]
    .map((n) => {
      const v = safeTrim(document.querySelector(`.texto[data-field="${n}"]`)?.value);
      return `Tópico 0${n}:\n${v}\n`;
    })
    .join("\n");

  return (
    `Curso: ${nm || "-"}\n` +
    `Sinopse: ${syn || "-"}\n` +
    `YouTube: ${yt || "-"}\n` +
    `Nível: ${selNivel?.value || "-"}\n` +
    `Carga horária: ${selCarga?.value || "-"}\n\n` +
    topics
  ).trim();
}

/* =========================
   Eventos / Inicialização
========================= */
function bindEvents() {
  // Meta
  courseName?.addEventListener("input", async () => {
    await putMeta("courseName", courseName.value);
    await renderList();
  });

  synopsis?.addEventListener("input", async () => {
    validateSynopsisUI();
    await putMeta("synopsis", synopsis.value);
    await renderList();
  });

  selNivel?.addEventListener("change", async () => putMeta("nivel", selNivel.value));
  selCarga?.addEventListener("change", async () => putMeta("carga", selCarga.value));

  // YouTube (debounce)
  let ytTimer = null;
  youtubeUrl?.addEventListener("input", () => {
    clearTimeout(ytTimer);
    ytTimer = setTimeout(async () => {
      const raw = safeTrim(youtubeUrl.value);
      await putMeta("youtubeUrl", raw);

      if (!raw) {
        setYouTubePreview("");
        await renderList();
        return;
      }

      const { id } = parseYouTubeVideoId(raw);
      if (!id) setYouTubeInvalid("Cole um link válido do YouTube.");
      else setYouTubePreview(id);

      await renderList();
    }, 250);
  });

  btnClearYoutube?.addEventListener("click", async () => {
    youtubeUrl.value = "";
    await putMeta("youtubeUrl", "");
    setYouTubePreview("");
    await renderList();
  });

  // Textos
  textAreas.forEach((t) => {
    t.addEventListener("input", async () => {
      await putText(t.dataset.field, t.value);
      await renderList();
    });
  });

  // PDFs
  fileInputs.forEach((inp) => {
    inp.addEventListener("change", async () => {
      const field = inp.dataset.field;
      const files = inp.files ? [...inp.files] : [];

      for (const f of files) {
        if (!isPdfFile(f)) continue; // só PDF
        await addFile(field, f);
      }

      inp.value = "";
      await renderList();
    });
  });

  // Voltar
  btnVoltar?.addEventListener("click", () => window.history.back());

  // Limpar
  btnLimpar?.addEventListener("click", async () => {
    const r = await Modal.confirm({
      title: "Tem certeza?",
      text: "Vai apagar tudo salvo no navegador.",
      confirmText: "Sim, limpar",
      cancelText: "Cancelar",
    });
    if (!r.isConfirmed) return;

    if (courseName) courseName.value = "";
    if (synopsis) synopsis.value = "";
    if (youtubeUrl) youtubeUrl.value = "";
    setYouTubePreview("");

    if (selNivel) selNivel.value = "";
    if (selCarga) selCarga.value = "";

    textAreas.forEach((t) => (t.value = ""));
    fileInputs.forEach((i) => (i.value = ""));

    await clearMeta();
    await clearTexts();
    await clearFiles();
    validateSynopsisUI();
    await renderList();

    await Modal.success("✅ Limpo!", "Tudo foi apagado.");
  });

  // Juntar (download)
  btnJuntar?.addEventListener("click", async () => {
    const old = btnJuntar.textContent;
    try {
      btnJuntar.disabled = true;
      btnJuntar.textContent = "Gerando...";
      Modal.loading("Gerando PDF...", "Aguarde...");

      const bytes = await buildFinalPdfBytes();
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "pdf_unificado_com_texto.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
      Swal.close();

      await renderList();
      await Modal.success("✅ PDF gerado!", "Download iniciado.");
    } catch (e) {
      console.error(e);
      Swal.close();
      await Modal.error("❌ Erro ao gerar PDF", e.message || "Veja o console (F12).");
    } finally {
      btnJuntar.textContent = old;
      btnJuntar.disabled = false;
    }
  });

  // Enviar (Drive)
  btnDrive?.addEventListener("click", async () => {
    const old = btnDrive.textContent;
    try {
      // valida sinopse (se preenchida)
      if (!validateSynopsisUI()) {
        await Modal.error("Sinopse fora do limite", "A sinopse precisa ter entre 350 e 500 caracteres.");
        synopsis?.focus();
        return;
      }

      // valida youtube se preenchido
      const yt = safeTrim(youtubeUrl?.value);
      if (yt) {
        const { id } = parseYouTubeVideoId(yt);
        if (!id) {
          await Modal.error("Link do YouTube inválido", "Cole um link válido (watch, youtu.be, shorts ou embed).");
          youtubeUrl?.focus();
          return;
        }
      }

      // valida URL WebApp
      if (!APPS_SCRIPT_WEBAPP_URL || APPS_SCRIPT_WEBAPP_URL.includes("COLE_AQUI")) {
        await Modal.error("Falta configurar", "Você precisa colar a URL do WebApp /exec no APPS_SCRIPT_WEBAPP_URL.");
        return;
      }

      btnDrive.disabled = true;
      btnDrive.textContent = "Enviando...";
      Modal.loading("Enviando...", "Salvando PDF e TXT no Drive.");

      const bytes = await buildFinalPdfBytes();
      const pdfBase64 = arrayBufferToBase64(bytes);

      const payload = {
        pdfBase64,
        pdfName: "pdf_unificado_com_texto.pdf",
        textPlain: buildTextPlain(),
        txtName: "texto_formulario.txt",
      };

      const resp = await fetch(APPS_SCRIPT_WEBAPP_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const raw = await resp.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error("Resposta inválida do WebApp: " + raw.slice(0, 200));
      }

      if (!data.ok) throw new Error(data.error || "Falha ao salvar no Drive.");

      Swal.close();
      await Modal.success(
        "✅ Enviado!",
        `<div style="text-align:left">
          <p class="mb-1"><b>PDF ID:</b> ${data.pdfFileId || "—"}</p>
          <p class="mb-0"><b>TXT ID:</b> ${data.txtFileId || "—"}</p>
        </div>`
      );
    } catch (e) {
      console.error(e);
      Swal.close();
      await Modal.error("❌ Erro ao enviar", e.message || "Falha no envio.");
    } finally {
      btnDrive.textContent = old;
      btnDrive.disabled = false;
    }
  });
}

async function restoreAll() {
  // meta
  if (courseName) courseName.value = (await getMeta("courseName")) || "";
  if (synopsis) synopsis.value = (await getMeta("synopsis")) || "";
  if (youtubeUrl) youtubeUrl.value = (await getMeta("youtubeUrl")) || "";
  if (selNivel) selNivel.value = (await getMeta("nivel")) || "";
  if (selCarga) selCarga.value = (await getMeta("carga")) || "";

  validateSynopsisUI();

  // youtube preview
  const yt = safeTrim(youtubeUrl?.value);
  if (!yt) setYouTubePreview("");
  else {
    const { id } = parseYouTubeVideoId(yt);
    if (!id) setYouTubeInvalid("Cole um link válido do YouTube.");
    else setYouTubePreview(id);
  }

  // textos
  const items = await getAllTexts();
  const map = {};
  items.forEach((it) => (map[it.field] = it.value || ""));
  textAreas.forEach((t) => {
    const f = Number(t.dataset.field);
    t.value = map[f] || "";
  });

  await renderList();
}

/* =========================
   START
========================= */
window.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await restoreAll();
});
