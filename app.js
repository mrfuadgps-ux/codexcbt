const STORAGE_KEY = "cbt_web_data_v1";

const seed = {
  users: [
    { id: 1, fullName: "Administrator", username: "admin", password: "admin123", role: "admin", className: "" },
    { id: 2, fullName: "Guru Demo", username: "guru", password: "guru123", role: "teacher", className: "" },
    { id: 3, fullName: "Siswa Demo", username: "siswa", password: "siswa123", role: "student", className: "XII-A" }
  ],
  exams: [],
  questions: [],
  schedules: [],
  studentExams: []
};

let state = loadState();
let currentUser = null;

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return structuredClone(seed);
  }
  return JSON.parse(raw);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(arr) {
  return arr.length ? Math.max(...arr.map((x) => x.id)) + 1 : 1;
}

function flash(message, type = "success") {
  document.getElementById("alertContainer").innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => {
    document.getElementById("alertContainer").innerHTML = "";
  }, 2500);
}

function fmt(dt) {
  return dt ? new Date(dt).toLocaleString("id-ID") : "-";
}

function randomToken() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function roleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "teacher") return "Guru";
  return "Siswa";
}

function render() {
  const loginView = document.getElementById("loginView");
  const appView = document.getElementById("appView");
  const navUser = document.getElementById("navUser");

  if (!currentUser) {
    loginView.classList.remove("d-none");
    appView.classList.add("d-none");
    navUser.classList.add("d-none");
    return;
  }

  loginView.classList.add("d-none");
  appView.classList.remove("d-none");
  navUser.classList.remove("d-none");
  navUser.textContent = `${currentUser.fullName} (${roleLabel(currentUser.role)})`;
  document.getElementById("roleTitle").textContent = `Panel ${roleLabel(currentUser.role)}`;

  ["adminView", "teacherView", "studentView"].forEach((id) => document.getElementById(id).classList.add("d-none"));

  if (currentUser.role === "admin") renderAdmin();
  if (currentUser.role === "teacher") renderTeacher();
  if (currentUser.role === "student") renderStudent();
}

function renderAdmin() {
  const el = document.getElementById("adminView");
  el.classList.remove("d-none");

  el.innerHTML = `
    <div class="row g-3 mb-3">
      <div class="col-md-4"><div class="metric"><small>Total User</small><p>${state.users.length}</p></div></div>
      <div class="col-md-4"><div class="metric"><small>Total Ujian</small><p>${state.exams.length}</p></div></div>
      <div class="col-md-4"><div class="metric"><small>Total Jadwal</small><p>${state.schedules.length}</p></div></div>
    </div>

    <div class="row g-3">
      <div class="col-lg-4">
        <div class="card"><div class="card-body">
          <h6>Tambah User</h6>
          <form id="formAddUser" class="vstack gap-2">
            <input class="form-control" name="fullName" placeholder="Nama lengkap" required />
            <input class="form-control" name="username" placeholder="Username" required />
            <input class="form-control" type="password" name="password" placeholder="Password" required />
            <select class="form-select" name="role" required>
              <option value="student">Siswa</option>
              <option value="teacher">Guru</option>
              <option value="admin">Admin</option>
            </select>
            <input class="form-control" name="className" placeholder="Kelas (khusus siswa)" />
            <button class="btn btn-primary">Simpan User</button>
          </form>
        </div></div>
      </div>

      <div class="col-lg-8">
        <div class="card mb-3"><div class="card-body">
          <h6>Buat Ujian</h6>
          <form id="formAddExam" class="row g-2">
            <div class="col-md-6"><input class="form-control" name="title" placeholder="Judul ujian" required /></div>
            <div class="col-md-2"><input class="form-control" type="number" min="1" name="duration" value="60" required /></div>
            <div class="col-md-4"><input class="form-control" name="token" placeholder="Token (opsional)" /></div>
            <div class="col-12"><textarea class="form-control" name="description" placeholder="Deskripsi"></textarea></div>
            <div class="col-12"><button class="btn btn-success">Tambah Ujian</button></div>
          </form>
        </div></div>

        <div class="card"><div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
            <h6 class="mb-0">Data Ujian</h6>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-warning" id="btnImport">Import JSON</button>
              <button class="btn btn-sm btn-dark" id="btnExportAll">Export Semua</button>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table table-sm">
              <thead><tr><th>Judul</th><th>Token</th><th>Durasi</th><th>Soal</th><th>CSV</th></tr></thead>
              <tbody>
                ${state.exams.map((e) => {
                  const qCount = state.questions.filter((q) => q.examId === e.id).length;
                  return `<tr>
                    <td>${e.title}</td>
                    <td><code>${e.token}</code></td>
                    <td>${e.duration} menit</td>
                    <td>${qCount}</td>
                    <td class="d-flex gap-1">
                      <button class="btn btn-outline-secondary btn-sm" data-expcsv="${e.id}">Export</button>
                      <button class="btn btn-outline-primary btn-sm" data-impcsv="${e.id}">Upload</button>
                    </td>
                  </tr>`;
                }).join("") || `<tr><td colspan="5" class="text-center">Belum ada ujian</td></tr>`}
              </tbody>
            </table>
          </div>
          <input id="importFile" type="file" accept="application/json" class="d-none" />
          <input id="importQuestionCsv" type="file" accept=".csv,text/csv" class="d-none" />
        </div></div>
      </div>
    </div>

    <div class="card mt-3"><div class="card-body table-responsive">
      <h6>Daftar Pengguna</h6>
      <table class="table table-sm">
        <thead><tr><th>Nama</th><th>Username</th><th>Role</th><th>Kelas</th></tr></thead>
        <tbody>
          ${state.users.map((u) => `<tr><td>${u.fullName}</td><td>${u.username}</td><td>${roleLabel(u.role)}</td><td>${u.className || "-"}</td></tr>`).join("")}
        </tbody>
      </table>
    </div></div>
  `;

  document.getElementById("formAddUser").onsubmit = (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    if (state.users.find((u) => u.username === fd.get("username"))) {
      return flash("Username sudah dipakai", "danger");
    }
    state.users.push({
      id: uid(state.users),
      fullName: fd.get("fullName"),
      username: fd.get("username"),
      password: fd.get("password"),
      role: fd.get("role"),
      className: fd.get("className") || ""
    });
    saveState();
    flash("User berhasil ditambahkan");
    render();
  };

  document.getElementById("formAddExam").onsubmit = (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const token = (fd.get("token") || randomToken()).toString().toUpperCase();
    if (state.exams.some((e) => e.token.toUpperCase() === token)) return flash("Token sudah digunakan", "danger");
    state.exams.push({
      id: uid(state.exams),
      title: fd.get("title"),
      description: fd.get("description") || "",
      duration: Number(fd.get("duration")),
      token,
      createdBy: currentUser.id
    });
    saveState();
    flash("Ujian berhasil ditambahkan");
    render();
  };

  el.querySelectorAll("[data-expcsv]").forEach((btn) => {
    btn.onclick = () => exportQuestionsCSV(Number(btn.dataset.expcsv));
  });

  let selectedExamForCsvImport = null;
  el.querySelectorAll("[data-impcsv]").forEach((btn) => {
    btn.onclick = () => {
      selectedExamForCsvImport = Number(btn.dataset.impcsv);
      document.getElementById("importQuestionCsv").click();
    };
  });

  document.getElementById("importQuestionCsv").onchange = (ev) => {
    if (!selectedExamForCsvImport) return;
    importQuestionsCSV(ev, selectedExamForCsvImport);
    selectedExamForCsvImport = null;
  };

  document.getElementById("btnExportAll").onclick = exportAll;
  document.getElementById("btnImport").onclick = () => document.getElementById("importFile").click();
  document.getElementById("importFile").onchange = importAll;
}

function renderTeacher() {
  const el = document.getElementById("teacherView");
  el.classList.remove("d-none");

  el.innerHTML = `
    <div class="card mb-3"><div class="card-body">
      <h6 class="mb-2">Panel Guru (Clean)</h6>
      <p class="text-muted small mb-0">Guru hanya mengelola persiapan ujian: token, waktu ujian, upload/download soal CSV.</p>
    </div></div>

    <div class="row g-3">
      <div class="col-lg-6">
        <div class="card"><div class="card-body">
          <h6 class="mb-3">Persiapan Ujian</h6>
          <form id="formTeacherExam" class="vstack gap-2">
            <input class="form-control" name="title" placeholder="Judul ujian" required />
            <div class="row g-2">
              <div class="col-md-6"><input class="form-control" type="number" min="1" name="duration" value="60" required /></div>
              <div class="col-md-6"><input class="form-control" name="token" placeholder="Token (opsional)" /></div>
            </div>
            <textarea class="form-control" name="description" placeholder="Deskripsi ujian"></textarea>
            <input class="form-control" name="targetClass" placeholder="Kelas target (mis. XII-A)" required />
            <label class="small text-muted">Waktu Mulai</label>
            <input class="form-control" type="datetime-local" name="startTime" required />
            <label class="small text-muted">Waktu Selesai</label>
            <input class="form-control" type="datetime-local" name="endTime" required />
            <button class="btn btn-success">Simpan Persiapan Ujian</button>
          </form>
        </div></div>
      </div>

      <div class="col-lg-6">
        <div class="card"><div class="card-body">
          <h6 class="mb-3">Bank Soal Ujian</h6>
          <form id="formTeacherCsv" class="vstack gap-2">
            <select class="form-select" name="examId" required>
              <option value="">Pilih Ujian</option>
              ${state.exams.map((e) => `<option value="${e.id}">${e.title} (${e.token})</option>`).join("")}
            </select>
            <div class="d-grid gap-2">
              <button type="button" class="btn btn-outline-primary" id="btnTeacherUploadCsv">Upload Soal CSV</button>
              <button type="button" class="btn btn-outline-secondary" id="btnTeacherExportCsv">Download Soal CSV</button>
              <button type="button" class="btn btn-outline-dark" id="btnTeacherGenToken">Generate Token Baru</button>
            </div>
            <small class="text-muted">Format CSV: question, option_a, option_b, option_c, option_d, correct</small>
          </form>
          <input id="teacherCsvFile" type="file" accept=".csv,text/csv" class="d-none" />
        </div></div>
      </div>
    </div>

    <div class="card mt-3"><div class="card-body table-responsive">
      <h6>Daftar Ujian Guru</h6>
      <table class="table table-sm">
        <thead><tr><th>Ujian</th><th>Token</th><th>Durasi</th><th>Kelas</th><th>Waktu</th><th>Soal</th></tr></thead>
        <tbody>
          ${state.exams.map((e) => {
            const sched = state.schedules.find((s) => s.examId === e.id);
            const qCount = state.questions.filter((q) => q.examId === e.id).length;
            return `<tr>
              <td>${e.title}</td>
              <td><code>${e.token}</code></td>
              <td>${e.duration} menit</td>
              <td>${sched?.targetClass || "-"}</td>
              <td>${sched ? `${fmt(sched.startTime)} - ${fmt(sched.endTime)}` : "-"}</td>
              <td>${qCount}</td>
            </tr>`;
          }).join("") || `<tr><td colspan="6" class="text-center">Belum ada ujian</td></tr>`}
        </tbody>
      </table>
    </div></div>
  `;

  document.getElementById("formTeacherExam").onsubmit = (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const token = (fd.get("token") || randomToken()).toString().toUpperCase();
    if (state.exams.some((e) => e.token.toUpperCase() === token)) return flash("Token sudah digunakan", "danger");

    const examId = uid(state.exams);
    state.exams.push({
      id: examId,
      title: fd.get("title"),
      description: fd.get("description") || "",
      duration: Number(fd.get("duration")),
      token,
      createdBy: currentUser.id
    });
    state.schedules.push({
      id: uid(state.schedules),
      examId,
      targetClass: fd.get("targetClass"),
      startTime: fd.get("startTime"),
      endTime: fd.get("endTime")
    });

    saveState();
    flash("Ujian & jadwal berhasil dipersiapkan");
    render();
  };

  const getSelectedExamId = () => {
    const v = new FormData(document.getElementById("formTeacherCsv")).get("examId");
    return Number(v);
  };

  document.getElementById("btnTeacherUploadCsv").onclick = () => {
    const examId = getSelectedExamId();
    if (!examId) return flash("Pilih ujian terlebih dahulu", "danger");
    document.getElementById("teacherCsvFile").click();
  };

  document.getElementById("teacherCsvFile").onchange = (ev) => {
    const examId = getSelectedExamId();
    if (!examId) return flash("Pilih ujian terlebih dahulu", "danger");
    importQuestionsCSV(ev, examId);
  };

  document.getElementById("btnTeacherExportCsv").onclick = () => {
    const examId = getSelectedExamId();
    if (!examId) return flash("Pilih ujian terlebih dahulu", "danger");
    exportQuestionsCSV(examId);
  };

  document.getElementById("btnTeacherGenToken").onclick = () => {
    const examId = getSelectedExamId();
    if (!examId) return flash("Pilih ujian terlebih dahulu", "danger");
    regenerateExamToken(examId);
  };
}

function renderStudent() {
  const el = document.getElementById("studentView");
  el.classList.remove("d-none");
  const now = Date.now();

  const schedules = state.schedules.filter((s) => s.targetClass === currentUser.className);
  const history = state.studentExams.filter((x) => x.studentId === currentUser.id);

  el.innerHTML = `
    <div class="card mb-3"><div class="card-body">
      <h6>Mulai Ujian dengan Token</h6>
      <form id="formStartExam" class="row g-2">
        <div class="col-md-6"><input class="form-control" name="token" placeholder="Masukkan token" required /></div>
        <div class="col-md-3"><button class="btn btn-primary w-100">Mulai</button></div>
      </form>
    </div></div>

    <div id="examArea"></div>

    <div class="row g-3 mt-1">
      <div class="col-lg-7">
        <div class="card"><div class="card-body">
          <h6>Jadwal Kelas Anda (${currentUser.className || "-"})</h6>
          <ul class="list-group list-group-flush">
            ${schedules.map((s) => {
              const exam = state.exams.find((e) => e.id === s.examId);
              const active = now >= new Date(s.startTime).getTime() && now <= new Date(s.endTime).getTime();
              return `<li class="list-group-item"><strong>${exam?.title || "-"}</strong><br><small>${fmt(s.startTime)} - ${fmt(s.endTime)} | Token: <code>${exam?.token || "-"}</code> ${active ? '<span class="badge text-bg-success">Berlangsung</span>' : ''}</small></li>`;
            }).join("") || `<li class="list-group-item text-muted">Belum ada jadwal</li>`}
          </ul>
        </div></div>
      </div>
      <div class="col-lg-5">
        <div class="card"><div class="card-body">
          <h6>Riwayat Nilai</h6>
          <ul class="list-group list-group-flush">
            ${history.map((h) => `<li class="list-group-item d-flex justify-content-between"><span>${(state.exams.find((e) => e.id === h.examId) || {}).title || "-"}</span><strong>${h.score.toFixed(2)}</strong></li>`).join("") || `<li class="list-group-item text-muted">Belum ada nilai</li>`}
          </ul>
        </div></div>
      </div>
    </div>
  `;

  document.getElementById("formStartExam").onsubmit = (ev) => {
    ev.preventDefault();
    const token = new FormData(ev.target).get("token").toString().trim().toUpperCase();
    const exam = state.exams.find((e) => e.token.toUpperCase() === token);
    if (!exam) return flash("Token tidak valid", "danger");
    openExam(exam.id);
  };
}

function openExam(examId) {
  const exam = state.exams.find((e) => e.id === examId);
  const questions = state.questions.filter((q) => q.examId === examId);
  const area = document.getElementById("examArea");

  area.innerHTML = `
    <div class="card mb-3"><div class="card-body">
      <h5>${exam.title}</h5>
      <p class="text-muted">Durasi ${exam.duration} menit</p>
      <form id="examForm" class="vstack gap-3">
        ${questions.map((q, idx) => `
          <div class="border rounded p-3">
            <strong>${idx + 1}. ${q.question}</strong>
            ${["A", "B", "C", "D"].map((opt) => `<div class="form-check"><input class="form-check-input" type="radio" name="q_${q.id}" value="${opt}" id="q${q.id}${opt}"/><label class="form-check-label" for="q${q.id}${opt}">${opt}. ${q.options[opt]}</label></div>`).join("")}
          </div>
        `).join("") || `<div class="alert alert-warning">Belum ada soal di ujian ini.</div>`}
        <button class="btn btn-success">Kumpulkan Jawaban</button>
      </form>
    </div></div>
  `;

  document.getElementById("examForm").onsubmit = (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    let correct = 0;
    const answers = {};

    questions.forEach((q) => {
      const selected = fd.get(`q_${q.id}`);
      if (selected) {
        answers[q.id] = selected;
        if (selected === q.correct) correct += 1;
      }
    });

    const score = questions.length ? (correct / questions.length) * 100 : 0;
    const old = state.studentExams.find((x) => x.studentId === currentUser.id && x.examId === examId);
    if (old) {
      old.score = score;
      old.submittedAt = new Date().toISOString();
      old.answers = answers;
    } else {
      state.studentExams.push({
        id: uid(state.studentExams),
        studentId: currentUser.id,
        examId,
        score,
        submittedAt: new Date().toISOString(),
        answers
      });
    }

    saveState();
    flash(`Ujian selesai. Nilai Anda ${score.toFixed(2)}`);
    render();
  };
}

function exportAll() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  downloadBlob(blob, "cbt_backup.json");
}

function importAll(ev) {
  const file = ev.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const required = ["users", "exams", "questions", "schedules", "studentExams"];
      if (!required.every((k) => Array.isArray(data[k]))) throw new Error("Format tidak valid");
      state = data;
      saveState();
      flash("Import data JSON berhasil");
      render();
    } catch (_e) {
      flash("Gagal import file JSON", "danger");
    }
  };
  reader.readAsText(file);
}

function exportQuestionsCSV(examId) {
  const exam = state.exams.find((e) => e.id === examId);
  const rows = state.questions.filter((q) => q.examId === examId);
  const head = ["question", "option_a", "option_b", "option_c", "option_d", "correct"];
  const csv = [head.join(",")]
    .concat(rows.map((q) => [q.question, q.options.A, q.options.B, q.options.C, q.options.D, q.correct].map(csvCell).join(",")))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  downloadBlob(blob, `soal_${(exam?.title || "ujian").replace(/\s+/g, "_")}.csv`);
}

function importQuestionsCSV(ev, examId) {
  const file = ev.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || "").trim();
      if (!text) throw new Error("File kosong");

      const parsed = parseCsv(text);
      if (parsed.length < 2) throw new Error("CSV tidak berisi data");

      const header = parsed[0].map((h) => String(h || "").trim().toLowerCase());
      const required = ["question", "option_a", "option_b", "option_c", "option_d", "correct"];
      for (const key of required) {
        if (!header.includes(key)) throw new Error("Header CSV tidak sesuai");
      }

      const idx = Object.fromEntries(required.map((k) => [k, header.indexOf(k)]));
      const importedRows = [];
      for (let i = 1; i < parsed.length; i += 1) {
        const row = parsed[i];
        if (!row || row.every((c) => String(c || "").trim() === "")) continue;

        const question = String(row[idx.question] || "").trim();
        const a = String(row[idx.option_a] || "").trim();
        const b = String(row[idx.option_b] || "").trim();
        const c = String(row[idx.option_c] || "").trim();
        const d = String(row[idx.option_d] || "").trim();
        const correct = String(row[idx.correct] || "").trim().toUpperCase();

        if (!question || !a || !b || !c || !d || !["A", "B", "C", "D"].includes(correct)) {
          continue;
        }

        importedRows.push({
          id: uid(state.questions.concat(importedRows)),
          examId,
          question,
          options: { A: a, B: b, C: c, D: d },
          correct
        });
      }

      state.questions = state.questions.filter((q) => q.examId !== examId);
      state.questions.push(...importedRows);
      saveState();
      flash(`Import CSV selesai: ${importedRows.length} soal`);
      render();
    } catch (_e) {
      flash("Gagal import CSV soal", "danger");
    }
  };
  reader.readAsText(file);
  ev.target.value = "";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function regenerateExamToken(examId) {
  const exam = state.exams.find((e) => e.id === examId);
  if (!exam) return;

  let token = randomToken();
  while (state.exams.some((e) => e.id !== examId && e.token.toUpperCase() === token.toUpperCase())) {
    token = randomToken();
  }

  exam.token = token;
  saveState();
  flash(`Token baru: ${token}`);
  render();
}

function csvCell(x) {
  const s = String(x ?? "").replaceAll('"', '""');
  return `"${s}"`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById("loginForm").onsubmit = (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const user = state.users.find((u) => u.username === fd.get("username") && u.password === fd.get("password"));
  if (!user) return flash("Username/password salah", "danger");
  currentUser = user;
  render();
};

document.getElementById("btnLogout").onclick = () => {
  currentUser = null;
  render();
};

render();
