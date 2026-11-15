# Rotatorcs

Buatkan WhatsApp tracker dan link rotator untuk jualan di WhatsApp dengan fitur:
1. Layar/portal darurat khusus karyawan CS (misal CS 1 dan CS 2) di URL terpisah ramah HP:
   - Tombol lapor banned (alarm darurat). Saat ditekan, status CS berubah menjadi Banned/Nonaktif.
   - Pilihan tindakan saat nomor mati: tombol 'Pakai Nomor Lama Lagi' (jika banding berhasil) dan form input 'Ganti Nomor' (masukkan nomor WA baru dengan validasi dan auto-format +62) lalu klik tombol Ganti Nomor untuk aktif kembali.
   - Tombol batalkan laporan / undo jika terjadi salah pencet.
2. Dashboard Admin & Rotator Otomatis:
   - Rotator dua arah otomatis (failover timbal balik): saat kedua CS aktif, klik dibagi bergantian rata (round-robin 50:50).
   - Jika CS 1 lapor banned, trafik 100% otomatis dialihkan ke CS 2. Jika CS 2 lapor banned, trafik 100% dialihkan ke CS 1.
   - Slot nomor cadangan darurat (backup owner) jika kedua CS sama-sama banned.
   - Saat CS mengaktifkan kembali nomornya (pakai nomor lama atau ganti nomor baru), data nomor di dashboard langsung ter-update otomatis secara realtime dan rotasi kembali normal 50:50 secara mulus (smooth re-entry).
   - Tombol override status CS langsung dari dashboard admin.
   - Generator link kampanye dengan kode referensi unik (ref code) yang disisipkan ke pesan WhatsApp (misal: 'Halo kak mau promo ini ya [REF-XXXX]').
   - Halaman simulator / endpoint webhook untuk MacroDroid guna mencatat otomatis chat yang masuk berdasarkan kode referensi.
   - Statistik & analytics: Total Klik, Chat Masuk, Conversion Rate, serta Log Aktivitas pergantian nomor dan status banned secara realtime.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rotatorcs.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/086e1647-97d6-46ac-b563-773c9d43e942).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
