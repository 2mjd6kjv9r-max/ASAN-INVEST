# Təhlükəsizlik baxışı (əl ilə, OWASP Top 10 üzrə)

Tarix: 2026-10-15. Əhatə: bu repozitoriyadakı kod. Avtomatik skaner (`/ecc:security-scan`) bu mühitdə mövcud deyildi — yoxlama əl ilə və işləyən server üzərində sınaqla aparılıb (kod baxışı + HTTP sınaqları).

## Yoxlanılanlar və nəticə
| # | Sahə | Nəticə |
|---|---|---|
| A01 Giriş nəzarəti | Rol siyasətləri qovluq səviyyəsində (`/Investor`, `/Coordinator`, `/Officer`, `/Admin`), resurs səviyyəsində `AccessService` (iş, sorğu, sənəd). Sınaq: başqa investorun mərhələsi/sənədi → 404; investor→koordinator/admin səhifəsi → bloklanır; başqa qurumun əməkdaşı sorğunu və nəticə sənədini aça bilmir; investorun başqasının işinə POST-u (tapşırıq, hazırlıq, mesaj, yükləmə) heç nə dəyişmir; saxta `asan.job` cookie-si nəzərə alınmır. | Keçdi |
| A01 Daxili qeydlər | Koordinatorun daxili qeydləri investor/qurum əməkdaşına qaytarılmır (servis səviyyəsində filtr). | Keçdi |
| A02 Kriptoqrafiya | Parol saxlanmır (ASAN Login nəzərdə tutulub). Kukilər HttpOnly, SameSite, istehsalda Secure. Fayllar diskdə şifrələnmir. | **Qalıq risk:** fayl şifrələməsi yoxdur |
| A03 Injection | SQL yoxdur (JSON saxlama). Razor avtomatik HTML-encode edir; `Html.Raw` yalnız statik mətn/rəqəm ilə. XSS sınağı (`<script>` mesajda) escape olunur. Shell/Process istifadəsi yoxdur. | Keçdi |
| A04 Dizayn | Status keçidləri `RequestStateMachine`-də (səbəb məcburi hallar), serverdə yoxlanır. Rate limit: giriş. | Keçdi |
| A05 Konfiqurasiya | CSP (`default-src 'self'`, inline script/style yoxdur), `X-Content-Type-Options`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, `Server` başlığı yoxdur, HSTS (istehsal), developer exception page yalnız Development. Demo giriş istehsalda söndürülüb (yoxlanıldı: POST 400/404, demo UI görünmür). | Keçdi |
| A06 Komponentlər | NuGet paketi yoxdur → üçüncü tərəf zəiflik səthi yoxdur (yalnız .NET 10 runtime — yeniləmələri izləyin). | Keçdi |
| A07 Autentifikasiya | Sessiya 60 dəq (sliding); hər sorğuda istifadəçinin mövcudluğu/blok/rol yoxlanır → bloklanan və ya rolu dəyişən istifadəçinin sessiyası dərhal bitir (sınaq). | Keçdi. **Qalıq risk:** real giriş və 2FA hələ yoxdur (demo rejim) |
| A08 Bütövlük | CSRF: bütün POST-lar antiforgery ilə (token olmadan → 400, sınaq). Audit jurnalı «kimin adından» ilə, yalnız əlavə olunur. | Keçdi |
| A09 Jurnallaşdırma | Giriş, yükləmə/endirmə, sorğu qərarları, rol/blok dəyişiklikləri, katalog dəyişiklikləri audit olunur. Xəbərdarlıq/alarm mexanizmi yoxdur. | Qismən |
| A10 SSRF | Server tərəfli çıxış sorğuları yoxdur (şlüz saxtadır). | Keçdi |

## Fayl yükləmə
Uzantı ağ siyahısı (pdf/jpg/jpeg/png), **magic byte** yoxlaması (sınaq: `MZ…` məzmunlu «pdf» rədd edildi, `.exe` rədd edildi), ölçü limiti (11 MB fayl rədd edildi), təhlükəsiz ad, diskdə təsadüfi ad (`^[0-9a-f]{32}\.ext$`), `wwwroot`-dan kənarda, yol keçidi (`../`) bloklanır, endirmə həmişə `attachment` + `nosniff`. **Qalıq risk:** antivirus skanı yoxdur; PDF içində aktiv məzmun yoxlanmır.

## Açıq məsələlər (prioritet sırası ilə)
1. **Real autentifikasiya (ASAN Login/ASAN İmza) və 2FA** — demo giriş istehsalda istifadə edilməməlidir.
2. Fayl şifrələməsi və antivirus; fayl saxlamanı obyekt anbarına köçürmək.
3. Data Protection açarlarının davamlı/qorunan saxlanması (indi default; konteynerdə yenidən başlayanda sessiyalar etibarsızlaşır).
4. JSON saxlama çoxlu sorğu üçün nəzərdə tutulmayıb (tək proses, kilid) — PostgreSQL-ə keçid.
5. Rate limit yalnız girişdə; ümumi API limiti və audit alarmları əlavə edilməlidir.
6. Fiziki şəxs məlumatları (FİN, pasport) üçün məlumatın minimallaşdırılması və saxlama müddəti siyasəti (şəxsi məlumatlar qanunu) — hüquqi təsdiq lazımdır.
7. Qurum inteqrasiyaları gələndə: imzalanmış sorğular, qurumlar üçün ayrıca API açarları, webhook doğrulaması.
