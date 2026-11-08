# Modul Al Fatih Reader

Aplikasi web (PWA) untuk membaca Modul Kuttab dan Madrasah Al Fatih: daftar isi, lanjut baca,
penanda & catatan, tema gelap/terang, mode baca malam, layar tetap menyala saat membaca, dan bisa dibaca offline.

## Struktur folder

```
mdlkttb-main/
├── index.html          Kerangka halaman (semua layar ada di sini)
├── manifest.json       Info aplikasi untuk dipasang di HP (PWA)
├── sw.js               Service Worker: membuat aplikasi bisa dibuka offline
├── buku.enc            Buku (PDF) yang sudah dienkripsi
├── icon-192.png        Ikon aplikasi
├── icon-512.png
│
├── assets/             Gambar
│   ├── logo.png            Logo aplikasi
│   └── favicon.png         Ikon tab browser
│
├── css/                Tampilan (urutan pemuatan ada di index.html)
│   ├── base/               variables.css (warna & tema), base.css (reset & dasar)
│   ├── components/         buttons, footer, dialogs (toast & modal), about
│   ├── screens/            splash, login, toc, bookmarks, reader  (satu file per layar)
│   ├── responsive.css      penyesuaian layar pendek / lebar
│   └── accessibility.css   cetak & "reduce motion"
│
└── js/                 Logika aplikasi
    ├── main.js             TITIK MASUK: merangkai semua modul
    ├── config.js           PENGATURAN (kata sandi, nama file buku, batas zoom, dll.)
    ├── theme-init.js       Menerapkan tema lebih awal agar layar tidak berkedip
    ├── data/               Data statis: toc.js (daftar isi)
    ├── core/               Fondasi: storage, state, session, utils, dom, icons
    ├── services/           Kerja di balik layar: pdf-loader, pwa, notes-store, wake-lock
    ├── ui/                 Komponen umum: router (pindah layar), toast, dialogs,
    │                       about, splash, theme, actions
    └── features/           Fitur per layar: auth, toc, reader, gestures,
                            notes, night-mode, keyboard, chapters, reader-overlay
```

## Cara mengubah hal-hal yang sering dipakai

| Ingin mengubah...                     | Buka file                | Yang diubah                          |
|---------------------------------------|--------------------------|--------------------------------------|
| Kata sandi aplikasi                   | `js/config.js`           | `PASSWORD_HASH` (isi dengan SHA-256 dari kata sandi baru) |
| Selisih nomor halaman daftar isi/PDF  | `js/config.js`           | `PAGE_OFFSET`                        |
| Batas zoom, lebar halaman             | `js/config.js`           | `ZOOM_MIN`, `ZOOM_MAX`, `MAX_PAGE_WIDTH` |
| Lama splash screen                    | `js/config.js`           | `SPLASH_VISIBLE_MS`                  |
| Daftar isi (judul / nomor halaman)    | `js/data/toc.js`         | baris `{ title, page, isSub }`       |
| Warna tema                            | `css/base/variables.css` | variabel `--primary`, `--bg-main`, dst. |
| Teks di layar (judul, tombol, dsb.)   | `index.html`             | teks di dalam tag                    |
| Versi aplikasi (tampil di "Tentang")  | `js/config.js`           | `APP_VERSION`                        |

> Jangan mengubah `BOOK_PASSPHRASE`, `BOOK_SALT`, dan `PBKDF2_ITERATIONS` di `js/config.js`
> kecuali `buku.enc` dibuat ulang dengan kunci yang sama. Jika berbeda, buku tidak bisa dibuka.

## Alur kerja singkat (untuk memahami kode)

1. `index.html` memuat CSS, lalu `js/main.js`.
2. `main.js` menghubungkan tombol (atribut `data-action` di HTML) dengan fungsinya, menjalankan splash,
   lalu membuka layar Login atau Daftar Isi.
3. Layar berpindah lewat `ui/router.js` (`showScreen('toc-screen')`, dst.).
4. Saat pembaca dibuka, `services/pdf-loader.js` mengunduh `buku.enc`, mendekripsinya, dan membukanya
   dengan PDF.js. `features/reader.js` menggambar halaman ke kanvas.
5. Catatan disimpan di browser (localStorage) lewat `services/notes-store.js`.

**Menambah tombol baru?** Beri atribut `data-action="nama-aksi"` di HTML, lalu daftarkan
`'nama-aksi': namaFungsi` di objek `ACTIONS` pada `js/main.js`.

## Menjalankan di komputer sendiri

Aplikasi memakai ES module, jadi **tidak bisa dibuka dengan klik dua kali** pada `index.html`.
Jalankan lewat server lokal, misalnya:

- VS Code: pasang ekstensi **Live Server**, lalu klik kanan `index.html` > *Open with Live Server*; atau
- Terminal di folder ini: `python3 -m http.server 8000`, lalu buka <http://localhost:8000>.

## Deploy (GitHub + Vercel)

Unggah seluruh isi folder ini ke repositori GitHub; Vercel akan menayangkannya apa adanya
(tidak perlu build).

**PENTING setiap kali memperbarui file di `css/`, `js/`, atau `assets/`:** naikkan nomor versi
`CACHE` di bagian atas `sw.js` (misalnya `alfatih-pwa-v14` menjadi `alfatih-pwa-v15`) agar
HP pengguna ikut memperbarui. Jika menambah file baru di folder tersebut, tambahkan juga ke daftar `SHELL`
di `sw.js` supaya ikut tersimpan untuk mode offline.
