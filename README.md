# ASAN İnvest — vahid pəncərə platforması (MVP, .NET 10)

İnvestorlar (hüquqi/fiziki, rezident/qeyri-rezident) üçün 12 ssenari üzrə yol xəritəsi, tapşırıqlar, sənədlər, qurumlara elektron sorğular və koordinator/qurum/admin panelləri.
Mənbə: layihə sənədləri (`ASAN Invest — Texniki tapşırıq`, `Qurumlar və müraciət kanalları`, `investisiya-yol-xeritesi`) — ssenari məlumatı `seed/` qovluğundadır.

## İşə salmaq

```bash
dotnet --version          # 10.x lazımdır
dotnet run --project src/AsanInvest.Web          # http://localhost:5098 (Development: demo rejim açıqdır)
dotnet run --project tests/AsanInvest.Tests      # 49 test
```

İlk işə düşəndə `data/` qovluğu yaranır (JSON faylları + yüklənmiş fayllar) və demo məlumat yüklənir (yalnız `AsanInvest:Demo=true` olduqda). Hər şey lokal qalır. Sıfırlamaq üçün `data/` qovluğunu silin.

Heç bir NuGet paketi istifadə olunmur (yalnız .NET SDK-nın özü).

### Demo istifadəçilər (giriş səhifəsində seçilir)
Koordinator `koordinator@demo.az`, admin `admin@demo.az`, qurum əməkdaşları `dvx@`, `not@`, `bank@`, `ain@demo.az`, investorlar `agro@`, `nermin@`, `hans@`, `tekstil@demo.az`, nümayəndə `numayende@demo.az`. Yuxarı sağdakı siyahı ilə rolu dəyişmək olar.

## Quruluş

| Qat | Qovluq | Məsuliyyət |
|---|---|---|
| Core | `src/AsanInvest.Core` | Domen, 12 ssenari mühərriki, status qaydaları (TZ 12), son tarixlər, sorğu vəziyyət maşını, servislər, abstraksiyalar. I/O yoxdur. |
| Infrastructure | `src/AsanInvest.Infrastructure` | JSON repozitoriyalar, fayl saxlama, **saxta** qurum şlüzü, bildiriş jurnalı (`data/outbox.log`), seed yükləyici, demo data. |
| Web | `src/AsanInvest.Web` | Razor Pages: investor, koordinator, qurum, admin. |
| Tests | `tests/AsanInvest.Tests` | Katalog, mühərrik və servis testləri. |
| Seed | `seed/` | Qurumlar, mərhələlər, çeklistlər (redaktə oluna bilən markdown). |

### Sonra nəyi dəyişdirmək lazımdır (sərhədlər hazırdır)
- **Verilənlər bazası:** `IDataStore`/`IRepository<T>` (Core/Abstractions) — PostgreSQL + EF Core implementasiyası yazılıb `Platform.Create`-də əvəz edilir.
- **Real qurum inteqrasiyası:** `IInstitutionGateway` — hazırda `MockInstitutionGateway` (sorğular «simulyasiya» kimi işarələnir, qurumun sistem məlumatları uydurmadır).
- **E-poçt/SMS:** `IOutbox` — hazırda fayla yazılır.
- **Giriş:** `Pages/Login.cshtml.cs` — demo giriş yalnız `AsanInvest:Demo=true`; real versiyada ASAN Login/ASAN İmza callback-i ilə əvəzlənməlidir.
- **Fayl saxlama:** `IFileStorage` — S3/Blob + şifrələmə.

## İstehsala çıxarmazdan əvvəl (məcburi)
1. `AsanInvest:Demo` **false** qalmalıdır (appsettings.json-da belədir). Demo giriş rolu seçmək imkanı verir — açıq qalsa hər kəs admin ola bilər.
2. Yalnız HTTPS: kukilər istehsalda `Secure`-dir. TLS-i reverse proxy sonlandırırsa `X-Forwarded-Proto` ötürülməli və `ForwardedHeadersOptions.KnownProxies` konfiqurasiya olunmalıdır.
3. Data Protection açarlarını davamlı və qorunan yerdə saxlayın (`AddDataProtection().PersistKeysTo…`); default açarlar şifrələnmir.
4. Real autentifikasiya (ASAN Login), 2FA, fayl antivirus yoxlaması və şifrələmə (bax: `SECURITY.md`).

## Tətbiq olunmuş qərarlar (sənədlərdəki boşluqlar)
- Sorğunu **koordinator** yaradıb göndərir; investor mərhələni «göndərməyə hazıram» işarələyir.
- Kapital artımı elektron qaydadadır; əcnəbi fiziki şəxsin pay yolunda təsisçi dəyişikliyi (registry-change) **kağız** kanal və 40 günlük müddətlə hesablanır.
- ASC yolu heç bir ssenaridə aktiv deyil (boz) — mənbədə ayrıca yazılmayıb.
- Qanuni müddət: bitməyə ≤7 gün qalanda sarı xəbərdarlıq, keçəndə qırmızı və status «Diqqət tələb edir».
- Qurum cavab norması 5 gün, fayl limiti 10 MB (admin parametrlərində dəyişir).
- Koordinator təyinatı: ən az aktiv işi olana.
- Hələ yoxdur: EN/RU, qlobal axtarış, PDF/Excel ixrac, admin ssenari redaktoru (mərhələ/bənd əlavə etmə), real inteqrasiyalar. Bildirişlər yalnız tətbiqdə və `outbox.log`-da.
