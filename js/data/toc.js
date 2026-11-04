/**
 * data/toc.js — Daftar isi buku.
 *
 * Setiap baris:
 *   title : judul bab/materi yang tampil
 *   page  : nomor halaman (sesuai nomor di daftar isi buku)
 *   isSub : false = judul besar (KUTTAB / MADRASAH), true = sub judul
 *
 * Jika nomor di daftar isi berbeda dengan nomor halaman PDF,
 * atur PAGE_OFFSET di js/config.js (jangan ubah angka di sini).
 */

export const TOC_DATA = [
  { title: "KUTTAB", page: 5, isSub: false },
  { title: "Bermodal Keyakinan, Berharap Kebesaran", page: 7, isSub: true },
  { title: "Kuttab", page: 9, isSub: true },
  { title: "Visi Rasulullah ﷺ untuk Generasi Abad 21", page: 17, isSub: true },
  { title: "Potret Akhir Generasi", page: 25, isSub: true },
  { title: "Karakter Imani", page: 34, isSub: true },
  { title: "Sentuhan Nabi dalam Mendidik Anak dan Para Pemuda", page: 44, isSub: true },
  { title: "Makkiyyah-Madaniyyah: Rahasia Urutan Kurikulum Nubuwwah", page: 70, isSub: true },
  { title: "Menjadi Guru Seperti Rasulullah ﷺ", page: 89, isSub: true },
  { title: "Mengapa Harus Menghafal Al-Qur'an?", page: 107, isSub: true },
  { title: "Menuju Generasi Qur'ani", page: 113, isSub: true },
  { title: "Bagaimana Al-Qur'an Memprogram Hidup", page: 123, isSub: true },
  { title: "Perbaikan Bumi di Antara Angka Tiga", page: 128, isSub: true },
  { title: "Surah 'Al-Alaq", page: 136, isSub: true },
  { title: "Berkisah dalam Al-Qur'an", page: 144, isSub: true },
  { title: "Teknik Mengaplikasikan Kepribadian Qur'ani", page: 159, isSub: true },
  { title: "Sains Juz 30", page: 165, isSub: true },
  { title: "Bahasa Peradaban Masa Depan, Bahasa Al-Qur'an", page: 170, isSub: true },
  { title: "Landasan Membaca dan Menulis", page: 177, isSub: true },
  { title: "Landasan Bahasa", page: 181, isSub: true },
  { title: "Landasan Berhitung", page: 185, isSub: true },
  { title: "Landasan Keterampilan Hidup", page: 189, isSub: true },
  { title: "Landasan Olahraga", page: 193, isSub: true },
  { title: "MADRASAH", page: 199, isSub: false },
  { title: "Mukaddimah", page: 201, isSub: true },
  { title: "Seutas Tali", page: 203, isSub: true },
  { title: "Kelas Persiapan, Kuttab Mini", page: 205, isSub: true },
  { title: "Al-Hafizh di Madrasah Kami", page: 211, isSub: true },
  { title: "Madrasah Syafi'iyyah", page: 216, isSub: true },
  { title: "Kurikulum Hadits", page: 225, isSub: true },
  { title: "Kurikulum Mutun Ilmiyah", page: 240, isSub: true },
  { title: "Keseharian Nabi Untuk Keseharian Santri", page: 241, isSub: true },
  { title: "Kajian Ringan di Tahun Persiapan", page: 250, isSub: true },
  { title: "Keistimewaan Hari Jumat", page: 254, isSub: true },
  { title: "Contoh Khutbah Jumat Tematik", page: 264, isSub: true },
  { title: "Ilmu Wasail", page: 271, isSub: true },
  { title: "Bahasa Arab Bahasa Peradaban", page: 274, isSub: true },
  { title: "Akademis di Madrasah Al-Fatih", page: 280, isSub: true },
  { title: "Tarbiyah Jasadiyyah", page: 286, isSub: true },
  { title: "Santri-Santri yang Terlatih Mencari Nafkah dan Menafkahi", page: 289, isSub: true },
  { title: "Kurikulum Parenting Nabawiyah", page: 296, isSub: true }
];
