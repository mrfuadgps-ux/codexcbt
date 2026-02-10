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
  setTimeout(() => (document.getElementById("alertContainer").innerHTML = ""), 2500);
}

function fmt(dt) {
  return dt ? new Date(dt).toLocaleString("id-ID") : "-";
}

function randomToken() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
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
  navUser.textContent = `${currentUser.fullName} (${currentUser.role})`;
  document.getElementById("roleTitle").textContent = `Dashboard ${currentUser.role.toUpperCase()}`;

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
      <div class="col-md-4"><div class="metric"><small>User</small><p>${state.users.length}</p></div></div>
      <div class="col-md-4"><div class="metric"><small>Ujian</small><p>${state.exams.length}</p></div></div>
      <div class="col-md-4"><div class="metric"><small>Jadwal</small><p>${state.schedules.length}</p></div></div>
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
            <input class="form-control" name="className" placeholder="Kelas (untuk siswa)" />
            <button class="btn btn-primary">Simpan</button>
          </form>
        </div></div>
      </div>

      <div class="col-lg-8">
        <div class="card mb-3"><div class="card-body">
          <h6>Buat Ujian</h6>
          <form id="formAddExam" class="row g-2">
            <div class="col-md-6"><input class="form-control" name="title" placeholder="Judul ujian" required /></div>
            <div class="col-md-3"><input class="form-control" type="number" min="1" name="duration" value="60" required /></div>
            <div class="col-md-3"><input class="form-control" name="token" placeholder="Token (opsional)" /></div>
            <div class="col-12"><textarea class="form-control" name="description" placeholder="Deskripsi"></textarea></div>
            <div class="col-12"><button class="btn btn-success">Tambah Ujian</button></div>
          </form>
        </div></div>

        <div class="card"><div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">Data Ujian</h6>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-warning" id="btnImport">Import JSON</button>
              <button class="btn btn-sm btn-dark" id="btnExportAll">Export Semua</button>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table table-sm">
              <thead><tr><th>Judul</th><th>Token</th><th>Durasi</th><th>Export Soal</th></tr></thead>
              <tbody>
                ${state.exams.map((e) => `<tr><td>${e.title}</td><td><code>${e.token}</code></td><td>${e.duration} menit</td><td><button class="btn btn-outline-secondary btn-sm" data-expcsv="${e.id}">CSV</button></td></tr>`).join("") || `<tr><td colspan="4" class="text-center">Belum ada ujian</td></tr>`}
              </tbody>
            </table>
          </div>
          <input id="importFile" type="file" accept="application/json" class="d-none" />
        </div></div>
      </div>
    </div>

    <div class="card mt-3"><div class="card-body table-responsive">
      <h6>Daftar Pengguna</h6>
      <table class="table table-sm">
        <thead><tr><th>Nama</th><th>Username</th><th>Role</th><th>Kelas</th></tr></thead>
        <tbody>
          ${state.users.map((u) => `<tr><td>${u.fullName}</td><td>${u.username}</td><td>${u.role}</td><td>${u.className || "-"}</td></tr>`).join("")}
        </tbody>
      </table>
    </div></div>
  `;

  document.getElementById("formAddUser").onsubmit = (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    if (state.users.find((u) => u.username === fd.get("username"))) return flash("Username sudah dipakai", "danger");
    state.users.push({
      id: uid(state.users),
      fullName: fd.get("fullName"),
      username: fd.get("username"),
      password: fd.get("password"),
      role: fd.get("role"),
      className: fd.get("className") || ""
    });
    saveState();
    flash("User ditambahkan");
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
    flash("Ujian ditambahkan");
    render();
  };

  el.querySelectorAll("[data-expcsv]").forEach((btn) => {
    btn.onclick = () => exportQuestionsCSV(Number(btn.dataset.expcsv));
  });

  document.getElementById("btnExportAll").onclick = exportAll;
  document.getElementById("btnImport").onclick = () => document.getElementById("importFile").click();
  document.getElementById("importFile").onchange = importAll;
}

function renderTeacher() {
  const el = document.getElementById("teacherView");
  el.classList.remove("d-none");

  el.innerHTML = `
    <div class="row g-3">
      <div class="col-lg-6">
        <div class="card"><div class="card-body">
          <h6>Tambah Soal</h6>
          <form id="formAddQuestion" class="vstack gap-2">
            <select class="form-select" name="examId" required>
              <option value="">Pilih Ujian</option>
              ${state.exams.map((e) => `<option value="${e.id}">${e.title}</option>`).join("")}
            </select>
            <textarea class="form-control" name="question" placeholder="Pertanyaan" required></textarea>
            <input class="form-control" name="a" placeholder="Pilihan A" required />
            <input class="form-control" name="b" placeholder="Pilihan B" required />
            <input class="form-control" name="c" placeholder="Pilihan C" required />
            <input class="form-control" name="d" placeholder="Pilihan D" required />
            <select class="form-select" name="correct"><option>A</option><option>B</option><option>C</option><option>D</option></select>
            <button class="btn btn-primary">Tambah Soal</button>
          </form>
        </div></div>
      </div>

      <div class="col-lg-6">
        <div class="card"><div class="card-body">
          <h6>Atur Jadwal Ujian</h6>
          <form id="formSchedule" class="vstack gap-2">
            <select class="form-select" name="examId" required>
              <option value="">Pilih Ujian</option>
              ${state.exams.map((e) => `<option value="${e.id}">${e.title}</option>`).join("")}
            </select>
            <input class="form-control" name="targetClass" placeholder="Target kelas (mis. XII-A)" required />
            <input class="form-control" type="datetime-local" name="startTime" required />
            <input class="form-control" type="datetime-local" name="endTime" required />
            <button class="btn btn-success">Simpan Jadwal</button>
          </form>
        </div></div>
      </div>
    </div>

    <div class="card mt-3"><div class="card-body table-responsive">
      <h6>Daftar Ujian & Soal</h6>
      <table class="table table-sm">
        <thead><tr><th>Ujian</th><th>Token</th><th>Durasi</th><th>Jumlah Soal</th></tr></thead>
        <tbody>
          ${state.exams.map((e) => `<tr><td>${e.title}</td><td><code>${e.token}</code></td><td>${e.duration} menit</td><td>${state.questions.filter((q) => q.examId === e.id).length}</td></tr>`).join("") || `<tr><td colspan="4" class="text-center">Belum ada ujian</td></tr>`}
        </tbody>
      </table>
    </div></div>

    <div class="card mt-3"><div class="card-body table-responsive">
      <h6>Jadwal</h6>
      <table class="table table-sm">
        <thead><tr><th>Ujian</th><th>Kelas</th><th>Mulai</th><th>Selesai</th></tr></thead>
        <tbody>
          ${state.schedules.map((s) => `<tr><td>${(state.exams.find((e) => e.id === s.examId) || {}).title || "-"}</td><td>${s.targetClass}</td><td>${fmt(s.startTime)}</td><td>${fmt(s.endTime)}</td></tr>`).join("") || `<tr><td colspan="4" class="text-center">Belum ada jadwal</td></tr>`}
        </tbody>
      </table>
    </div></div>
  `;

  document.getElementById("formAddQuestion").onsubmit = (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    state.questions.push({
      id: uid(state.questions),
      examId: Number(fd.get("examId")),
      question: fd.get("question"),
      options: { A: fd.get("a"), B: fd.get("b"), C: fd.get("c"), D: fd.get("d") },
      correct: fd.get("correct")
    });
    saveState();
    flash("Soal ditambahkan");
    render();
  };

  document.getElementById("formSchedule").onsubmit = (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    state.schedules.push({
      id: uid(state.schedules),
      examId: Number(fd.get("examId")),
      targetClass: fd.get("targetClass"),
      startTime: fd.get("startTime"),
      endTime: fd.get("endTime")
    });
    saveState();
    flash("Jadwal ditambahkan");
    render();
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
      flash("Import berhasil");
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
