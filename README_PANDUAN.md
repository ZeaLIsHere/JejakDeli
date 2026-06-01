# Panduan Penggunaan & Daftar Perubahan Projek JejakDeli

Dokumen ini menjelaskan cara menjalankan, melakukan pengujian (testing), serta daftar lengkap fitur/perubahan yang telah diterapkan pada aplikasi **JejakDeli** sejak pertama kali projek di-clone. Panduan ini dibuat agar mempermudah rekan Anda atau penguji lainnya saat melakukan instalasi dan pengujian sistem secara lokal.

---

## 1. Cara Menjalankan Projek (Setup & Run)

Aplikasi ini dibangun menggunakan **Spring Boot** di backend dan **Vanilla HTML/JS/CSS** di frontend, dengan **H2 Database** berbasis berkas (*file-based*) sebagai media penyimpanan datanya.

### Prasyarat (Prerequisites)
- **Java Development Kit (JDK)** versi **17** atau **21**.
- Koneksi internet aktif (untuk memuat peta Leaflet dan mengambil rute jalan dari OSRM API).

### Langkah-Langkah Menjalankan Server:
1. Buka terminal (Command Prompt, PowerShell, atau terminal IDE seperti VS Code) di folder utama projek (`JejakDeli`).
2. Jalankan perintah berikut untuk mengunduh dependensi dan memulai server lokal:
   - **Windows (PowerShell/CMD):**
     ```powershell
     .\mvnw spring-boot:run
     ```
   - **macOS / Linux:**
     ```bash
     chmod +x mvnw
     ./mvnw spring-boot:run
     ```
3. Tunggu hingga terminal menampilkan log bahwa Tomcat telah berjalan:
   `Tomcat started on port 8080 (http) with context path ''`
4. Buka browser Anda dan akses aplikasi melalui URL:
   **`http://localhost:8080`**

### Akun Bawaan untuk Pengujian:
Jika Anda ingin mencoba masuk dengan akun penjelajah yang sudah dibuat saat inisialisasi basis data, silakan gunakan:
- **Username:** `explorer`
- **Password:** `password`
*(Atau Anda dapat membuat akun penjelajah baru langsung melalui halaman register awal).*

---

## 2. Manajemen Basis Data (Reset & Re-seed)

Semua data awal situs sejarah, kuis, rute *trail*, dan penghargaan (*badge*) disimpan di dalam berkas [data.json](file:///c:/FOLDER%20D/PROJEK%20UAS%20LAB%20PBO/JejakDeli/src/main/resources/data.json).

### Cara Memicu Re-seed (Mengimpor Ulang Data Baru dari data.json):
Aplikasi Spring Boot hanya akan mengimpor data awal dari `data.json` ke database jika database dalam keadaan kosong. Apabila Anda memperbarui isi berkas `data.json` dan ingin memicu impor ulang:
1. Matikan proses server di terminal (tekan `Ctrl + C`).
2. Masuk ke folder `data` di dalam direktori projek Anda dan hapus berkas **`jejakdeli.mv.db`**.
3. Jalankan kembali perintah server (`.\mvnw spring-boot:run`). Basis data H2 baru yang bersih akan dibuat secara otomatis dan diisi dengan data terbaru dari `data.json`.

---

## 3. Daftar Perubahan & Fitur Baru (Sejak Clone)

Berikut adalah modifikasi rinci yang telah diterapkan pada aplikasi untuk meningkatkan estetika, kegunaan, dan gamifikasi perjalanan:

### A. Penataan Nama Tabel Database (Bahasa Indonesia)
- Mengubah nama tabel database bawaan JPA menggunakan anotasi `@Table` menjadi penamaan bahasa Indonesia yang bersih untuk mempermudah integrasi:
  - `akun_user` (menyimpan data pengguna/explorer)
  - `situs_sejarah` (menyimpan data situs pariwisata bersejarah)
  - `ulasan` (menyimpan catatan perjalanan & ulasan)
  - `badge` (menyimpan daftar penghargaan)
  - `trail` (menyimpan rute penjelajahan)

### B. Foto Tempat Wisata
- Menambahkan kolom `imageUrl` di database H2 dan entitas Java `HeritageSite`.
- Menyertakan tautan foto publik berkualitas tinggi untuk seluruh 10 situs bersejarah di Medan di dalam `data.json`.
- Foto-foto ini ditampilkan sebagai banner utama pada kartu situs di halaman utama dan di bagian atas modal informasi lengkap.

### C. Penyesuaian Tata Letak Kartu Situs
- **Penyelarasan Informasi**: Koordinat lokasi (`site-coords` di kiri) dan kategori situs (`site-status` di kanan, contoh: *Cagar Budaya*, *Museum*) kini disejajarkan secara horizontal.
- **Tombol "Selengkapnya &rarr;"**: Menambahkan tombol berlabel **Selengkapnya &rarr;** dengan gaya outline moderen di samping tombol kuis. Tombol ini didorong ke ujung kanan kartu agar posisinya sejajar dengan teks kategori di atasnya.
- **Efek Responsif**: Pada layar mobile (&le; 480px), tombol-tombol kartu akan otomatis menumpuk vertikal dengan lebar penuh (`100%`) agar mudah diklik di smartphone.

### D. Modal Deskripsi yang Lapang & Terperinci
- **Pelebaran Modal**: Ukuran modal informasi diperlebar dari `550px` menjadi **`780px`** agar teks deskripsi yang panjang lebih mudah dan nyaman dibaca.
- **Deskripsi Mendalam**: Deskripsi 10 situs di `data.json` telah ditulis ulang mencakup informasi sejarah yang mendalam, desain arsitektur, dan fakta unik.
- **Format HTML**: Skrip frontend diubah menggunakan `.innerHTML` sehingga tulisan tebal (`<strong>`) dan pemisah paragraf (`<br>`) dari basis data dirender secara sempurna di modal.

### E. Penanda Avatar Melayang & Pop-up Hover (Explore Page)
- **Avatar Melayang**: Lingkaran kuning biasa di peta Jelajah digantikan dengan **miniatur foto tempat wisata melayang** yang dilengkapi dengan animasi naik-turun halus (`float-marker`) untuk kesan visual gamifikasi yang premium.
- **Detail saat Hover**: Mengarahkan kursor di atas penanda akan otomatis membuka pop-up berisi foto miniatur, nama tempat, era sejarah, dan tombol aksi **Mulai Perjalanan**.

### F. Rute Navigasi Dinamis & Gamifikasi EXP
- **Mulai Perjalanan**: Menekan tombol **Mulai Perjalanan** pada pop-up akan memicu perutean jalan kaki dinamis (OSRM API) menuju situs tersebut, menggantikan rute bawaan (yang melacak situs terdekat).
- **Bintang EXP di Jalur Navigasi**: Ketika rute biru aktif digambar, sistem menyebarkan bintang EXP hijau (`★`) mengambang di sepanjang jalur rute setiap kelipatan **120 meter**.
- **Koleksi & Sinkronisasi XP**: Ketika pengguna (titik biru) berjalan mendekati bintang EXP tersebut (radius **25 meter**), bintang akan dikoleksi (menghilang dari peta) dan mengirimkan permintaan penambahan **+15 XP** ke endpoint backend baru `/api/explorer/add-xp`.
- Bar kemajuan XP (*XP progress bar*) dan level Anda di tab **Riwayat** akan bertambah secara instan saat bintang dikoleksi. Sistem akan mendeteksi otomatis jika pengguna naik level dan memberikan notifikasi Toast.
- **Navigasi Selesai**: Begitu situs tujuan berhasil dikunjungi, rute navigasi akan otomatis kembali melacak lokasi terdekat berikutnya yang belum dikunjungi.

### G. Proteksi Cache-Busting (v1.3)
- Menambahkan parameter versi `?v=1.3` pada file skrip dan stylesheet di `index.html`. Hal ini memastikan browser penguji langsung memuat berkas JS/CSS terbaru dari server tanpa terhalang cache lokal browser.

---
*Selamat menjelajahi sejarah kota Medan dengan JejakDeli! Jika ada kendala, pastikan H2 Database file dihapus agar inisialisasi awal berjalan kembali dengan bersih.*
