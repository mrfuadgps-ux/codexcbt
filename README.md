# CBT Full Web (Tanpa Python)

Aplikasi CBT versi **full web** (HTML + CSS + JavaScript), tanpa backend Python.

## Fitur
- Login role terpisah: **admin**, **guru**, **siswa**.
- Ujian dengan **token**.
- Penjadwalan ujian per kelas.
- Kelola data user, ujian, soal, dan jadwal.
- Siswa mengerjakan ujian + nilai otomatis.
- **Export semua data** ke JSON.
- **Import data** dari JSON.
- Export soal per ujian ke CSV.
- **Upload/import soal CSV** per ujian (admin & guru).
- Panel **guru dibuat clean**: fokus upload/download soal, generate token, dan persiapan jadwal ujian.
- UI modern dengan Bootstrap.

## Cara Menjalankan
Cukup buka `index.html` di browser, atau jalankan server statis:

```bash
python3 -m http.server 8080
```

lalu buka `http://localhost:8080`.

## Akun Default
- Admin: `admin / admin123`
- Guru: `guru / guru123`
- Siswa: `siswa / siswa123`

## Format CSV Soal
Header wajib:

```csv
question,option_a,option_b,option_c,option_d,correct
```

Contoh:

```csv
"2+2=?","1","2","3","4","D"
```

## Catatan
Semua data disimpan di **localStorage browser** (`cbt_web_data_v1`).
