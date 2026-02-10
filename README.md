# CBT School App

Aplikasi CBT lengkap sederhana berbasis Flask dengan fitur:

- Login multi-role: **admin**, **guru**, **siswa**.
- Ujian berbasis **token**.
- **Penjadwalan ujian** per kelas.
- Kelola pengguna, ujian, dan soal.
- Siswa mengerjakan ujian dan mendapatkan nilai otomatis.
- **Import/Export data** penuh (JSON).
- Export soal ujian ke CSV.
- UI modern menggunakan Bootstrap 5.

## Menjalankan

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Buka: `http://localhost:5000`

## Akun default

- Admin: `admin / admin123`
- Guru: `guru / guru123`
- Siswa: `siswa / siswa123`

## Catatan

Database SQLite (`cbt.db`) dibuat otomatis saat aplikasi dijalankan.
