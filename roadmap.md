# Roadmap — WhatsApp Tracker & Link Rotator

- [x] Database: CS agents, settings/backup, campaigns, clicks, chats, activity log
- [ ] Rotator link /go/<slug> (round-robin 50:50, failover, backup owner)
- [ ] CS emergency portal /cs/<token> (lapor banned, pakai nomor lama, ganti nomor +62, undo)
- [ ] Admin dashboard (password gate "admin password" via server session, override status, edit nomor, backup, kampanye + ref code, stats, realtime log)
- [ ] MacroDroid webhook + simulator
- [x] Audit history (DB): CS, nomor lama & baru, waktu, dampak rotasi (sebelum → sesudah)
- [ ] Tests for rotation and phone formatting rules
- [ ] Admin password protection (CS portal stays open via private link)
- [ ] Show the finished web to the user (preview + screenshots)
