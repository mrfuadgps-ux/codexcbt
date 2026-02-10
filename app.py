import csv
import io
import json
import os
import secrets
import sqlite3
from datetime import datetime
from functools import wraps

from flask import (
    Flask,
    flash,
    g,
    redirect,
    render_template,
    request,
    send_file,
    session,
    url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "cbt.db")

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "cbt-secret-key")


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_error):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    cur = db.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
            student_class TEXT
        );

        CREATE TABLE IF NOT EXISTS exams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            duration_minutes INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            created_by INTEGER,
            FOREIGN KEY(created_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exam_id INTEGER NOT NULL,
            question_text TEXT NOT NULL,
            option_a TEXT NOT NULL,
            option_b TEXT NOT NULL,
            option_c TEXT NOT NULL,
            option_d TEXT NOT NULL,
            correct_option TEXT NOT NULL CHECK(correct_option IN ('A','B','C','D')),
            FOREIGN KEY(exam_id) REFERENCES exams(id)
        );

        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exam_id INTEGER NOT NULL,
            target_class TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            FOREIGN KEY(exam_id) REFERENCES exams(id)
        );

        CREATE TABLE IF NOT EXISTS student_exams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            exam_id INTEGER NOT NULL,
            score REAL,
            submitted_at TEXT,
            UNIQUE(student_id, exam_id),
            FOREIGN KEY(student_id) REFERENCES users(id),
            FOREIGN KEY(exam_id) REFERENCES exams(id)
        );

        CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_exam_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            selected_option TEXT NOT NULL CHECK(selected_option IN ('A','B','C','D')),
            is_correct INTEGER NOT NULL,
            FOREIGN KEY(student_exam_id) REFERENCES student_exams(id),
            FOREIGN KEY(question_id) REFERENCES questions(id)
        );
        """
    )

    cur.execute("SELECT COUNT(*) as c FROM users")
    if cur.fetchone()["c"] == 0:
        seed_users = [
            ("Administrator", "admin", generate_password_hash("admin123"), "admin", None),
            ("Guru Demo", "guru", generate_password_hash("guru123"), "teacher", None),
            ("Siswa Demo", "siswa", generate_password_hash("siswa123"), "student", "XII-A"),
        ]
        cur.executemany(
            "INSERT INTO users (full_name, username, password_hash, role, student_class) VALUES (?, ?, ?, ?, ?)",
            seed_users,
        )

    db.commit()
    db.close()


def login_required(role=None):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if "user_id" not in session:
                return redirect(url_for("login"))
            if role and session.get("role") != role:
                flash("Anda tidak memiliki akses ke halaman ini.", "danger")
                return redirect(url_for("dashboard"))
            return func(*args, **kwargs)

        return wrapper

    return decorator


def now_iso():
    return datetime.now().isoformat(timespec="minutes")


@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"]
        user = get_db().execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if user and check_password_hash(user["password_hash"], password):
            session["user_id"] = user["id"]
            session["role"] = user["role"]
            session["full_name"] = user["full_name"]
            flash("Login berhasil.", "success")
            return redirect(url_for("dashboard"))
        flash("Username atau password salah.", "danger")
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    flash("Anda telah logout.", "info")
    return redirect(url_for("login"))


@app.route("/dashboard")
@login_required()
def dashboard():
    role = session.get("role")
    db = get_db()
    if role == "admin":
        stats = {
            "users": db.execute("SELECT COUNT(*) c FROM users").fetchone()["c"],
            "exams": db.execute("SELECT COUNT(*) c FROM exams").fetchone()["c"],
            "schedules": db.execute("SELECT COUNT(*) c FROM schedules").fetchone()["c"],
        }
        return render_template("dashboard_admin.html", stats=stats)

    if role == "teacher":
        exams = db.execute(
            "SELECT e.*, COUNT(q.id) as total_questions FROM exams e LEFT JOIN questions q ON q.exam_id = e.id GROUP BY e.id ORDER BY e.id DESC"
        ).fetchall()
        return render_template("dashboard_teacher.html", exams=exams)

    upcoming = db.execute(
        """
        SELECT s.*, e.title, e.description, e.duration_minutes, e.token
        FROM schedules s
        JOIN exams e ON e.id = s.exam_id
        WHERE s.target_class = ?
        ORDER BY s.start_time ASC
        """,
        (get_current_user()["student_class"],),
    ).fetchall()
    history = db.execute(
        """
        SELECT se.*, e.title FROM student_exams se
        JOIN exams e ON e.id = se.exam_id
        WHERE se.student_id = ?
        ORDER BY se.id DESC
        """,
        (session["user_id"],),
    ).fetchall()
    return render_template("dashboard_student.html", upcoming=upcoming, history=history, now=now_iso())


def get_current_user():
    return get_db().execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()


@app.route("/admin/users", methods=["GET", "POST"])
@login_required("admin")
def admin_users():
    db = get_db()
    if request.method == "POST":
        data = (
            request.form["full_name"],
            request.form["username"],
            generate_password_hash(request.form["password"]),
            request.form["role"],
            request.form.get("student_class") or None,
        )
        try:
            db.execute(
                "INSERT INTO users (full_name, username, password_hash, role, student_class) VALUES (?, ?, ?, ?, ?)",
                data,
            )
            db.commit()
            flash("Pengguna berhasil ditambahkan.", "success")
        except sqlite3.IntegrityError:
            flash("Username sudah digunakan.", "danger")
    users = db.execute("SELECT id, full_name, username, role, student_class FROM users ORDER BY id DESC").fetchall()
    return render_template("admin_users.html", users=users)


@app.route("/admin/exams", methods=["GET", "POST"])
@login_required("admin")
def admin_exams():
    db = get_db()
    if request.method == "POST":
        token = request.form.get("token") or secrets.token_hex(3).upper()
        db.execute(
            "INSERT INTO exams (title, description, duration_minutes, token, created_by) VALUES (?, ?, ?, ?, ?)",
            (
                request.form["title"],
                request.form.get("description"),
                int(request.form["duration_minutes"]),
                token,
                session["user_id"],
            ),
        )
        db.commit()
        flash("Ujian berhasil dibuat.", "success")
    exams = db.execute("SELECT * FROM exams ORDER BY id DESC").fetchall()
    return render_template("admin_exams.html", exams=exams)


@app.route("/teacher/questions/<int:exam_id>", methods=["GET", "POST"])
@login_required("teacher")
def teacher_questions(exam_id):
    db = get_db()
    exam = db.execute("SELECT * FROM exams WHERE id = ?", (exam_id,)).fetchone()
    if not exam:
        flash("Ujian tidak ditemukan.", "danger")
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        db.execute(
            """
            INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                exam_id,
                request.form["question_text"],
                request.form["option_a"],
                request.form["option_b"],
                request.form["option_c"],
                request.form["option_d"],
                request.form["correct_option"],
            ),
        )
        db.commit()
        flash("Soal ditambahkan.", "success")

    questions = db.execute("SELECT * FROM questions WHERE exam_id = ? ORDER BY id DESC", (exam_id,)).fetchall()
    return render_template("teacher_questions.html", exam=exam, questions=questions)


@app.route("/teacher/schedules", methods=["GET", "POST"])
@login_required("teacher")
def teacher_schedules():
    db = get_db()
    if request.method == "POST":
        db.execute(
            "INSERT INTO schedules (exam_id, target_class, start_time, end_time) VALUES (?, ?, ?, ?)",
            (
                request.form["exam_id"],
                request.form["target_class"],
                request.form["start_time"],
                request.form["end_time"],
            ),
        )
        db.commit()
        flash("Jadwal berhasil ditambahkan.", "success")

    exams = db.execute("SELECT id, title FROM exams ORDER BY id DESC").fetchall()
    schedules = db.execute(
        "SELECT s.*, e.title FROM schedules s JOIN exams e ON e.id = s.exam_id ORDER BY s.start_time DESC"
    ).fetchall()
    return render_template("teacher_schedules.html", exams=exams, schedules=schedules)


@app.route("/student/exam/start", methods=["POST"])
@login_required("student")
def start_exam():
    token = request.form["token"].strip().upper()
    exam = get_db().execute("SELECT * FROM exams WHERE UPPER(token) = ?", (token,)).fetchone()
    if not exam:
        flash("Token ujian tidak valid.", "danger")
        return redirect(url_for("dashboard"))
    return redirect(url_for("take_exam", exam_id=exam["id"]))


@app.route("/student/exam/<int:exam_id>", methods=["GET", "POST"])
@login_required("student")
def take_exam(exam_id):
    db = get_db()
    exam = db.execute("SELECT * FROM exams WHERE id = ?", (exam_id,)).fetchone()
    if not exam:
        flash("Ujian tidak ditemukan.", "danger")
        return redirect(url_for("dashboard"))

    questions = db.execute("SELECT * FROM questions WHERE exam_id = ? ORDER BY id", (exam_id,)).fetchall()
    if request.method == "POST":
        student_id = session["user_id"]
        db.execute("INSERT OR IGNORE INTO student_exams (student_id, exam_id) VALUES (?, ?)", (student_id, exam_id))
        student_exam = db.execute(
            "SELECT * FROM student_exams WHERE student_id = ? AND exam_id = ?", (student_id, exam_id)
        ).fetchone()

        db.execute("DELETE FROM answers WHERE student_exam_id = ?", (student_exam["id"],))

        correct = 0
        for q in questions:
            ans = request.form.get(f"q_{q['id']}")
            if not ans:
                continue
            is_correct = int(ans == q["correct_option"])
            correct += is_correct
            db.execute(
                "INSERT INTO answers (student_exam_id, question_id, selected_option, is_correct) VALUES (?, ?, ?, ?)",
                (student_exam["id"], q["id"], ans, is_correct),
            )

        score = (correct / len(questions) * 100) if questions else 0
        db.execute(
            "UPDATE student_exams SET score = ?, submitted_at = ? WHERE id = ?",
            (score, datetime.now().isoformat(timespec="seconds"), student_exam["id"]),
        )
        db.commit()
        flash(f"Ujian selesai. Nilai Anda: {score:.2f}", "success")
        return redirect(url_for("dashboard"))

    return render_template("student_take_exam.html", exam=exam, questions=questions)


@app.route("/admin/export/all")
@login_required("admin")
def export_all():
    db = get_db()
    data = {}
    for table in ["users", "exams", "questions", "schedules", "student_exams", "answers"]:
        rows = db.execute(f"SELECT * FROM {table}").fetchall()
        data[table] = [dict(row) for row in rows]

    payload = io.BytesIO(json.dumps(data, indent=2, default=str).encode("utf-8"))
    payload.seek(0)
    return send_file(payload, as_attachment=True, download_name="cbt_backup.json", mimetype="application/json")


@app.route("/admin/export/questions/<int:exam_id>")
@login_required("admin")
def export_questions_csv(exam_id):
    db = get_db()
    exam = db.execute("SELECT * FROM exams WHERE id = ?", (exam_id,)).fetchone()
    if not exam:
        flash("Ujian tidak ditemukan.", "danger")
        return redirect(url_for("admin_exams"))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["question_text", "option_a", "option_b", "option_c", "option_d", "correct_option"])
    questions = db.execute("SELECT * FROM questions WHERE exam_id = ?", (exam_id,)).fetchall()
    for q in questions:
        writer.writerow([q["question_text"], q["option_a"], q["option_b"], q["option_c"], q["option_d"], q["correct_option"]])

    mem = io.BytesIO(output.getvalue().encode("utf-8"))
    mem.seek(0)
    return send_file(mem, as_attachment=True, download_name=f"soal_{exam['title']}.csv", mimetype="text/csv")


@app.route("/admin/import", methods=["GET", "POST"])
@login_required("admin")
def import_data():
    if request.method == "POST":
        file = request.files.get("file")
        if not file:
            flash("Pilih file JSON terlebih dahulu.", "danger")
            return redirect(url_for("import_data"))

        payload = json.load(file)
        db = get_db()
        for table in ["users", "exams", "questions", "schedules", "student_exams", "answers"]:
            if table not in payload:
                continue
            db.execute(f"DELETE FROM {table}")
            rows = payload[table]
            if not rows:
                continue
            columns = list(rows[0].keys())
            placeholders = ",".join(["?" for _ in columns])
            col_list = ",".join(columns)
            values = [tuple(row.get(col) for col in columns) for row in rows]
            db.executemany(f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})", values)
        db.commit()
        flash("Import data selesai.", "success")
        return redirect(url_for("dashboard"))

    return render_template("admin_import.html")


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
