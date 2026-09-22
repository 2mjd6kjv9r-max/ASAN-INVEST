# ASAN Invest — Texniki Tapşırıq

**İnvestor üçün Vahid Müraciət, İcra və Dəstək Platforması**

*Kəşfdən istismara və genişlənməyə qədər investisiya prosesinin bütün mərhələlərini bir-birinə bağlı modullar vasitəsilə vahid rəqəmsal mühitdə birləşdirən investor-mərkəzli platforma.*

| Parametr | Dəyər |
| --- | --- |
| Versiya | 4.0 |
| Status | Redaktə edilmiş iş versiyası |
| Tip | Funksional texniki tapşırıq + dizayn sistemi |
| Yer, il | Bakı, 2026 |

## Mündəricat

- [0. Sənəd haqqında](#0-sənəd-haqqında)
- [1. Məqsəd və prinsiplər](#1-məqsəd-və-prinsiplər)
- [2. Anlayışlar](#2-anlayışlar)
- [3. Məntiq zənciri](#3-məntiq-zənciri)
- [4. Arxitektura](#4-arxitektura)
- [5. İstifadəçi rolları](#5-istifadəçi-rolları)
- [6. Açıq portal](#6-açıq-portal)
- [7. Giriş və profil](#7-giriş-və-profil)
- [8. Şəxsi kabinet](#8-şəxsi-kabinet)
- [9. Şirkət qeydiyyatı](#9-şirkət-qeydiyyatı)
- [10. Layihə pasportu](#10-layihə-pasportu)
- [11. Vahid Müraciət](#11-vahid-müraciət)
- [12. İlkin qiymətləndirmə](#12-ilkin-qiymətləndirmə)
- [13. Case Management](#13-case-management)
- [14. Statuslar, müddət və eskalasiya](#14-statuslar-müddət-və-eskalasiya)
- [15. İnvestisiya Ombudsmanı](#15-investisiya-ombudsmanı)
- [16. Aftercare](#16-aftercare)
- [17. Bildirişlər](#17-bildirişlər)
- [18. Hesabatlılıq və analitika](#18-hesabatlılıq-və-analitika)
- [19. İnzibatçılıq](#19-inzibatçılıq)
- [20. Ödənişlər və tərəfdaş xidmətləri](#20-ödənişlər-və-tərəfdaş-xidmətləri)
- [21. Ümumi sistem servisləri](#21-ümumi-sistem-servisləri)
- [22. İnteqrasiyalar](#22-inteqrasiyalar)
- [23. Vəziyyətlər və kənar hallar](#23-vəziyyətlər-və-kənar-hallar)
- [24. İnterfeys və qeyri-funksional tələblər](#24-interfeys-və-qeyri-funksional-tələblər)
- [25. Tətbiq mərhələləri və risklər](#25-tətbiq-mərhələləri-və-risklər)

## 0. Sənəd haqqında

> **MƏHSULUN ƏSASI**  
> Azərbaycana investisiya qoymaq istəyən istənilən şəxs — yerli sahibkardan xaricdə yaşayan əcnəbiyə qədər — bir hesabla, bir dildə, bir statusla, mümkün qədər ölkəyə gəlmədən layihəsini ideyadan istismara, sonra isə genişlənməyə qədər apara bilsin. Portal dövlət qurumlarını əvəz etmir; o, investorla qurumlar arasında **tək təmas nöqtəsidir**.

### 0.1. Sənəd necə oxunur

| Hissə | Bölmələr | Kim üçün |
| --- | --- | --- |
| Çərçivə | 1–5: prinsiplər, anlayışlar, məntiq zənciri, arxitektura, məlumat obyektləri, rollar | Hamı — əvvəlcə bu hissə oxunur |
| Modullar | 6–20: hər modul eyni formatda — modul kartı + funksional tələblər + ssenari | Sifarişçi (nə edir), developer (necə qurulur) |
| Ortaq qat | 21–23: sistem servisləri, inteqrasiyalar, kənar hallar | Developer, arxitektor |
| Tətbiq | 24–25: interfeys və qeyri-funksional tələblər, tətbiq mərhələləri və risklər | Sifarişçi, layihə rəhbəri, developer |

**Modul kartı** hər modul bölməsinin əvvəlində durur və beş suala cavab verir: kim istifadə edir, harada yerləşir, nəyi qəbul edir, nəyi ötürür, hansı modullarla bağlıdır. Kartdan sonra gələn cədvəldə hər tələbin unikal identifikatoru (məs. FR-KYA-04) var; tələblər yalnız bir dəfə, sahib olduqları modulda yazılır, digər yerlərdə istinad edilir. Hər modul bölməsi **ssenari nümunəsi** ilə bitir: rezident və qeyri-rezident investorun, həmçinin back-office rollarının həmin modulda nə etdiyi eyni iştirakçılar üzərində göstərilir (iştirakçılar — bölmə 5.2).

## 1. Məqsəd və prinsiplər

Portal investora yalnız məlumat vermir: marşrutun müəyyən edilməsi, şirkətin qeydiyyatı, icazələrin müəyyənləşdirilməsi, müraciətlərin qurumlara yönləndirilməsi, koordinasiya, icranın izlənməsi, nəticənin alınması və sonrakı dəstək vahid platforma üzərindən idarə olunur.

### 1.1. Prinsiplər

| № | Prinsip | Məzmun |
| --- | --- | --- |
| 01 | İnvestor-mərkəzli model | Struktur qurumların təşkilati quruluşuna deyil, investorun ehtiyaclarına və prosesin mərhələlərinə uyğun qurulur. |
| 02 | Vahid giriş | Bütün məlumat, müraciət və dəstək xidmətləri bir hesabdan əlçatandır. |
| 03 | Şəffaf proses | Hər müraciətin statusu, cavabdehi, mərhələsi və müddəti investor üçün görünür. |
| 04 | Koordinasiya sistemin işidir | Qurumlar arasında əlaqələndirməni investor deyil, platformanın workflow-ları aparır. |
| 05 | Fərdiləşdirmə | İnvestora yalnız profilinə, sahəsinə, ölkəsinə və niyyətinə aid olan göstərilir. |
| 06 | Ölçülə bilən idarəetmə | Müddətlər, gecikmələr və qurumların göstəriciləri sistemdə izlənir və təhlil olunur. |
| 07 | Dürüstlük | Sistem yerinə yetirə bilməyəcəyi heç nəyi vəd etmir; hər addımın real kanalı açıq göstərilir (1.2, 1.3). |

### 1.2. Dürüst çərçivə: qadağan vədlər

| Qadağan ifadə | Niyə | İnterfeysdə düzgün ifadə |
| --- | --- | --- |
| «Bank hesabı avtomatik açılır» | Qərarı bank verir | «Sənəd paketi banka göndərildi. Bank cavabı razılaşdırılmış müddətdə — X iş günü ərzində gözlənilir.» |
| «Güzəşt zəmanətlidir» | Qərarı İqtisadiyyat Nazirliyi verir | «Uyğunluq ilkin olaraq təsdiqləndi. Yekun qərarı Nazirlik verir.» |
| «İcazə alınacaq» | Sistem qərar vermir, müraciəti aparır | «Müraciət göndərildi. Qurumun cavabı X iş günü ərzində gözlənilir.» |
| «Heç yerə getmək lazım deyil» | Şirkət uzaqdan (nümayəndə vasitəsilə) qurula bilər, amma bank hesabı və yaşayış icazəsi üçün gəliş tələb oluna bilər | «Azərbaycanda fiziki təmas: bank hesabı; yaşayış icazəsi istənilərsə — ayrıca.» |
| «Bir neçə gündə investor olun» | Miqrasiya prosedurlarının öz müddətləri var | Hər prosedurun öz müddəti ayrıca göstərilir. |

Bütün hesablamalar (qənaət, müddət, xərc) «təxmini» işarəsi və qeydlə göstərilir: «Bu, hüquqi və ya maliyyə rəyi deyil. Yekun qərarı səlahiyyətli qurum verir.»

### 1.3. Reallıq bayraqları

Platformadakı hər prosedur və addım dörd bayraqdan biri ilə işarələnir. Bayraq marşrutda, KYA nəticəsində, layihə pasportunda və müraciət formalarında eyni görünür. İnvestorun əsl ağrısı gözləmə deyil, naməlumluqdur — bayraq naməlumluğu aradan qaldırır.

| Bayraq | Mənası |
| --- | --- |
| AVTO | Sistem özü icra edir, insan iştirakı yoxdur |
| ONLAYN | İnsan qərar verir, fiziki gəliş lazım deyil |
| FİZİKİ | Bir dəfəlik fiziki iştirak tələb olunur |
| PLAN | Hələ mövcud deyil; inteqrasiya və ya qanunvericilik dəyişikliyi gözlənilir (bölmə 22) |

| ID | Tələb |
| --- | --- |
| **FR-FLAG-01** | Hər prosedur, marşrut addımı və pasport mərhələsi üçün bayrağın göstərilməsi. Bayraq prosedurun atributudur və İnzibatçılıq modulunda təyin edilir (FR-ADM-08). |
| **FR-FLAG-02** | Marşrut və pasport üzrə yekun xülasənin bayraqlardan avtomatik hesablanması: «N iş günü · M fiziki təmas». |
| **FR-FLAG-03** | Prosedurun bayrağı dəyişdikdə (məs. PLAN → ONLAYN) açıq pasportların yenilənməsi və layihə sahiblərinə bildiriş. |

### 1.4. Əhatə dairəsi

| Platformaya daxildir | Platformaya daxil deyil |
| --- | --- |
| İnvestorun məlumatlandırılması, marşrut, icazələrin müəyyən edilməsi | Dövlət qurumunun qərar səlahiyyəti — platforma qərar vermir, müraciəti aparır |
| Müraciətlərin qəbulu, yönləndirilməsi, icra və müddət nəzarəti | Qurumların daxili informasiya sistemlərinin əvəzlənməsi |
| Şirkət qeydiyyatı üçün sənəd paketinin hazırlanması və ötürülməsi | Bank hesabının açılması haqqında qərar |
| Qurumlararası koordinasiya, Ombudsman və Aftercare | Hüquqi, vergi və maliyyə məsləhəti |
| Monitorinq, analitika, ictimai hesabatlılıq | Kommersiya xidmətlərinin (hüquqi ünvan, tərcümə, müşayiət) birbaşa göstərilməsi — bunları akkreditə olunmuş tərəfdaşlar göstərir (bölmə 20) |

### 1.5. Uğur göstəriciləri

Başlanğıc (baza) dəyərlər Mərhələ 1-in ilk üç ayında ölçülür; hədəflər sifarişçi tərəfindən həmin bazaya əsasən təsdiqlənir. Hesablama qaydası analitika modulunda saxlanılır (FR-REP-11).

| Göstərici | Nəyi ölçür |
| --- | --- |
| Şirkət qeydiyyatına qədər orta müddət | Marşrut A və C üzrə ayrıca, iş günü ilə |
| Fiziki təmas sayı | Qeyri-rezident investorun şirkət, hesab və icazələr üçün Azərbaycana neçə dəfə gəlməli olduğu |
| Qurumların vaxtında cavab faizi | Tapşırıqların konfiqurasiya olunmuş müddətdə icrası |
| Müraciətin orta baxılma müddəti | Müraciət növləri üzrə |
| Huni konversiyası | Marşrut nəticəsini görən qonaqdan ilk müraciətə keçid faizi |
| Həll olunmuş sistemli problemlər | Ombudsman və Aftercare üzrə islahata çevrilmiş problemlər |
| İnvestor məmnunluğu | Tamamlanmış müraciətlər üzrə sorğu nəticəsi (WF-07) |

### 1.6. İdarəetmə modeli

| Tərəf | Öhdəliyi |
| --- | --- |
| Sifarişçi | Qayda dəstlərini, müraciət növlərini, müddətləri, ictimai dərc olunan göstəriciləri və tərəfdaşların akkreditasiya meyarlarını təsdiqləyir. |
| Operator — ASAN | Prosesin təşkili: platformanın istismarı, müraciətlərin qəbulu və qeydiyyatı, müddətlərin monitorinqi, bildirişlər, açıq portalın məzmunu, texniki inzibatçılıq. |
| Koordinator — İqtisadiyyat Nazirliyi | Prosesin məzmun üzrə koordinasiyası: case management, qurumlararası koordinasiya, ilkin qiymətləndirmə, təşviq, Aftercare; case manager və nəzarətçi heyəti. Tabeli qurumların (o cümlədən AZPROMO) rol bölgüsü Nazirlik tərəfindən müəyyən edilir (25.3). |
| İştirakçı qurumlar | Koordinatorla protokol imzalayır: məsul nümayəndə təyin edir, tapşırıqlar üzrə cavab müddətlərini öhdəsinə götürür, inteqrasiya imkanı olduqda API təqdim edir. |
| Banklar | Protokol əsasında KYC paketini qəbul edir və cavab müddətini öhdəsinə götürür; hesab haqqında qərar bankda qalır. |
| Akkreditə olunmuş tərəfdaşlar | Kommersiya xidmətlərini öz məsuliyyəti ilə göstərir; qiymət və şərtlər platformada şəffaf dərc olunur. |

## 2. Anlayışlar

Sənəddə və interfeysdə aşağıdakı terminlər yalnız bu mənada işlədilir. Sinonim işlətmək qadağandır (məsələn, Aftercare üçün də «müraciət» deyilir, «sorğu» yox).

| Termin | Mənası |
| --- | --- |
| Rezident investor | Azərbaycan vətəndaşı və ya FİN-i olan əcnəbi — ASAN Login / SİMA İmzadan istifadə edə bilən şəxs. Vergi rezidentliyi anlayışı ilə eyniləşdirilmir. |
| Qeyri-rezident investor | Azərbaycanda yaşayış əsasında FİN-i olmayan fiziki şəxs və ya onun təmsil etdiyi xarici hüquqi şəxs; identifikasiya e-poçt ilə aparılır. Hüquqi əməliyyatları nümayəndə vasitəsilə və ya Azərbaycan e-imzası (mövcud qayda ilə diplomatik nümayəndəlikdən alınmış qeyri-rezident e-imzası daxil) ilə aparır; virtual FİN bu statusu dəyişmir. Xaricdə daimi yaşayan Azərbaycan vətəndaşı e-imza qaydası baxımından qeyri-rezidentdir (9.1). |
| Layihə | İnvestorun konkret investisiya təşəbbüsü. Mərkəzi obyektdir: bütün mərhələlər, müraciətlər, sənədlər və ödənişlər ona bağlanır. |
| Layihə pasportu | Layihənin mərhələlərini tək zaman xəttində göstərən görünüş və idarəetmə modulu. |
| Mərhələ | Pasportdakı bir addım; adətən bir prosedura (icazə, lisenziya, qoşulma) uyğun gəlir. |
| Prosedur | Dövlət qurumu tərəfindən aparılan icazə, lisenziya, qeydiyyat və s. Atributları: qurum, sənədlər, müddət, ödəniş, hüquqi əsas, bayraq. |
| Müraciət | İnvestorun platforma vasitəsilə təqdim etdiyi istənilən təqdimat: investisiya niyyəti, konsultasiya, mərhələ müraciəti, Ombudsman, Aftercare və s. Hamısı Vahid Müraciət modulundan keçir. |
| Müraciət növü | Müraciətin formasını, tələb olunan sənədləri və hansı workflow ilə icra olunacağını müəyyən edən konfiqurasiya. |
| Workflow | Müraciət növü üzrə statuslar, rollar, keçidlər və müddətlər toplusu. Üç workflow var: Standart, Ombudsman, Aftercare. |
| Case | Təqdim edilmiş müraciətin back-office-dəki icra obyekti. Hər müraciətə bir case uyğun gəlir. |
| Tapşırıq | Case çərçivəsində konkret quruma və ya icraçıya verilən iş. |
| Qayda dəsti | Versiyalanan biznes qaydaları: KYA, təşviq uyğunluğu, risk, marşrut, bayraq, müddət qaydaları. |
| SLA / icra müddəti | Status, tapşırıq və ya müraciət üçün konfiqurasiya edilmiş maksimal müddət. |
| İdentifikasiya səviyyəsi | İstifadəçinin hansı əməliyyatları edə biləcəyini müəyyən edən giriş etibarlılığı (bölmə 7.2). |
| Operator / Koordinator | Operator — prosesi təşkil edən və platformanı istismar edən ASAN; Koordinator — qurumlararası koordinasiyanı və case-lərin icrasını aparan İqtisadiyyat Nazirliyi (bölmə 1.6). |
| Nümayəndə | İnvestorun dəvəti ilə onun adından təyin edilmiş səlahiyyət həddində işləyən istifadəçi (FR-PROF-04). |
| Akkreditə olunmuş tərəfdaş | Kommersiya xidmətlərini öz məsuliyyəti ilə göstərən, sifarişçinin meyarları ilə akkreditə olunmuş özəl şirkət (bölmə 20). |
| Sistemli problem | Bir neçə müraciətdə təkrarlanan inzibati və ya prosedur problemi; islahat üçün əsasdır. |

## 3. Məntiq zənciri

Modullar ayrı funksiyalar toplusu deyil: hər biri əvvəlkinin nəticəsini qəbul edir və özününkünü növbətiyə ötürür. Zəncir qapalıdır — son mərhələlərin məlumatı qaydaları yeniləyərək əvvələ qayıdır.

| № | Mərhələ | Modul | Qəbul edir | Ötürür |
| --- | --- | --- | --- | --- |
| 1 | Kəşf | Açıq portal | CMS məzmunu | Seçilmiş sahə, layihə, park |
| 2 | İlkin marşrut | Marşrut kalkulyatoru, Təşviq uyğunluğu | Ölkə, sahə, məbləğ, ərazi | Fərdi marşrut, müddət, xərc, uyğunluq (qonaq sessiyası) |
| 3 | Qeydiyyat | Giriş və profil | Qonaq sessiyası | Profil — cavablar köçürülür |
| 4 | İcazələr | Know Your Approvals | Profil + layihə təsviri | Prosedurlar, ardıcıllıq, bayraqlar |
| 5 | Şirkət | Şirkət qeydiyyatı | Profil + marşrut + imza (investorun e-imzası və ya nümayəndə) | Şirkət, VÖEN; Layihə yaradılır. Mövcud şirkəti olan investor bu mərhələni keçir |
| 6 | Layihə | Layihə pasportu | KYA nəticəsi + şirkət | Mərhələlər və onların müraciət şablonları |
| 7 | Müraciət | Vahid Müraciət | Mərhələ / imkan kartı / yeni müraciət | Nömrəli müraciət |
| 8 | Yoxlama | İlkin qiymətləndirmə | Case-dəki müraciət + profil + risk qaydaları | Rəy və qərar ssenarisi (case daxilində) |
| 9 | İcra | Case Management | Qiymətləndirmə nəticəsi | Tapşırıqlar, cavablar, yekun nəticə |
| 10 | Nəticə | Kabinet, Bildirişlər | Case statusu | Mərhələ bağlanır, növbəti açılır |
| 11 | Sonrakı dövr | Aftercare, Ombudsman | Problemlər, passivlik, rədd | Həll; rədd həll olunarsa case yenidən açılır (9); genişlənmə → yeni KYA və Layihə (4) |
| 12 | Öyrənmə | Analitika | Bütün modulların hadisələri | KPI, sistemli problemlər, ictimai hesabat |
| 13 | Təkmilləşdirmə | İnzibatçılıq | Analitika + islahat qərarları | Yeni qayda versiyası → 2, 4, 8 |

### 3.1. Zəncirin qaydaları

Bu qaydalar bütün modullara aiddir və modul bölmələrində təkrar yazılmır.

| ID | Tələb |
| --- | --- |
| **Z-01** | **Bir dəfə soruş.** Heç bir modul başqa modulda artıq olan məlumatı investordan yenidən soruşmur; məlumat profil, layihə və Sənədlərim vasitəsilə ötürülür. |
| **Z-02** | **Bağlılıq.** Hər müraciət bir layihəyə, layihə olmayan ümumi hallarda isə profilə bağlanır. Bağlantısız müraciət yaradıla bilməz. |
| **Z-03** | **Vahid status mənbəyi.** Statusun yeganə mənbəyi Case Management-dir. Kabinet, pasport və bildirişlər ayrıca məlumat saxlamır — həmin statusu göstərir. |
| **Z-04** | **Çıxılmaz nöqtə yoxdur.** Rədd, gecikmə və uyğunsuzluq halında sistem həmişə növbəti yolu təklif edir: alternativ, eskalasiya, şikayət və ya düzəliş. |
| **Z-05** | **Versiyalı nəticə.** Hər nəticə hesablandığı qayda versiyasına bağlı qalır; yeni versiya çıxanda investora yenidən hesablama təklif olunur. |
| **Z-06** | **Vahid qayda mühərriki.** KYA, təşviq, risk, marşrut, bayraq və case təyinatı eyni mühərriklə işləyir; qaydalar yalnız İnzibatçılıq modulunda idarə olunur. |

## 4. Arxitektura

### 4.1. Modul xəritəsi

| № | Modul | Prefiks | Mühit | İstifadəçilər | Bölmə |
| --- | --- | --- | --- | --- | --- |
| 1 | Açıq portal məzmunu (Ana səhifə, Niyə Azərbaycan, İmkanlar, Bələdçi, Şəffaflıq, Haqqında) | HOME, WHY, OPP, GUIDE, TRN, ABOUT | Açıq | Qonaq, investor | 6.1 |
| 2 | Marşrut kalkulyatoru | ROUTE | Açıq, kabinet | Qonaq, investor | 6.2 |
| 3 | Təşviq uyğunluğu | INC | Açıq, kabinet | Qonaq, investor | 6.3 |
| 4 | Know Your Approvals | KYA | Açıq, kabinet | Qonaq, investor | 6.4 |
| 5 | Giriş və profil | AUTH, PROF | Açıq → kabinet | İnvestor | 7 |
| 6 | Şəxsi kabinet | CAB | Kabinet | İnvestor | 8 |
| 7 | Şirkət qeydiyyatı | REG | Kabinet | İnvestor | 9 |
| 8 | Layihə pasportu | PROJ | Kabinet, back-office | İnvestor, case manager | 10 |
| 9 | Vahid Müraciət | APP | Kabinet | İnvestor | 11 |
| 10 | İlkin qiymətləndirmə | EVAL | Back-office | Qiymətləndirici | 12 |
| 11 | Case Management | CASE | Back-office | Case manager, nəzarətçi, qurum nümayəndəsi | 13 |
| 12 | Statuslar və müddətlər | WF | Back-office | Bütün daxili rollar | 14 |
| 13 | Ombudsman workflow | OMB | Açıq, kabinet, back-office | İnvestor, Ombudsman əməkdaşı | 15 |
| 14 | Aftercare workflow | AFT | Kabinet, back-office | İnvestor, case manager | 16 |
| 15 | Bildirişlər | NOT | Hamısı + kanallar | Bütün istifadəçilər | 17 |
| 16 | Hesabatlılıq və analitika | REP | Back-office, açıq (ictimai hesabat) | Analitik, rəhbər | 18 |
| 17 | İnzibatçılıq | ADM | Admin interfeysi | İnzibatçı, məzmun meneceri | 19 |
| 18 | Ödənişlər və tərəfdaşlar | PAY | Kabinet | İnvestor | 20 |

### 4.2. Sayt xəritəsi

| Açıq portal | Şəxsi kabinet | Back-office |
| --- | --- | --- |
| • Ana səhifə<br>• Niyə Azərbaycan?<br>• İnvestisiya İmkanları: sahələr · layihələr · zonalar və parklar (xəritə) · regionlar<br>• İnvestor Bələdçisi<br>• Marşrut kalkulyatoru<br>• Know Your Approvals<br>• İnvestisiya Ombudsmanı<br>• Şəffaflıq<br>• ASAN Invest haqqında<br>• Giriş / Qeydiyyat | • İdarə paneli — «Növbəti addımınız»<br>• Layihələrim → Layihə pasportu<br>• Müraciətlərim (bütün növlər)<br>• Yeni müraciət<br>• KYA nəticələrim<br>• Marşrutum (sənəd hazırlığı, leqallaşdırma, nümayəndə)<br>• Sənədlərim<br>• Mesajlar<br>• Bildirişlər<br>• Ödənişlər və tərəfdaşlar<br>• Profil, şirkət və nümayəndələr | • Case iş masası<br>• Nəzarət paneli (növbə, təyinat, eskalasiyalar)<br>• Qiymətləndirmə növbəsi<br>• Qurum tapşırıqları<br>• Ombudsman iş masası<br>• Aftercare iş masası<br>• Analitika panelləri<br>• İnzibatçılıq: istifadəçilər və rollar · qayda dəstləri · müraciət növləri və workflow · təsnifatlar · məzmun (CMS) · bildiriş şablonları · tərəfdaşlar və rüsumlar |

### 4.3. Əsas məlumat obyektləri

Developer üçün məlumat modelinin skeleti. Hər obyektin bir sahib modulu var; digər modullar onu oxuyur, dəyişmir.

| Obyekt | Əsas atributlar | Əlaqələr | Sahib modul |
| --- | --- | --- | --- |
| İstifadəçi | Rol(lar), identifikasiya səviyyəsi, dil, razılıqlar | 1:1 Profil | Giriş və profil |
| Profil | Ölkə, sektor, əlaqə; şirkət rekvizitləri, UBO; versiya tarixçəsi | 1:N Layihə | Giriş və profil |
| Nümayəndəlik | İnvestor, nümayəndə istifadəçi, səlahiyyət həddi (baxış / hazırlama / imza), etibarnamə, müddət | N:1 Profil | Giriş və profil |
| Layihə | Ad, sahə, ərazi, həcm, ölçü kateqoriyası, şirkət, təyin edilmiş case manager, layihə statusu (FR-PROJ-08) | 1:N Mərhələ, Müraciət, KYA nəticəsi, Ödəniş | Layihə pasportu |
| Mərhələ | Prosedur, bayraq, sıra, status, gözlənilən və faktiki müddət | N:1 Layihə; 0..1 Müraciət | Layihə pasportu |
| KYA nəticəsi | Giriş parametrləri, prosedur siyahısı, qayda versiyası | N:1 Profil; 0..1 Layihə (layihə yaradılanda bağlanır) | KYA |
| Müraciət | Nömrə, növ, workflow, təqdim nüsxəsi (snapshot), investor görünüşü statusu | 1:1 Case; N:1 Layihə və ya Profil | Vahid Müraciət |
| Case | Daxili status, case manager, müddətlər, yekun nəticə | 1:N Tapşırıq; 0..N Qiymətləndirmə | Case Management |
| Tapşırıq | Qurum, icraçı, son tarix, status, rəy, sənədlər | N:1 Case | Case Management |
| Qiymətləndirmə | Marşrut, qiymətləndirici, rəy, istifadə edilmiş meyarlar, siyahı versiyası | N:1 Case; identifikasiya yoxlaması üçün N:1 İstifadəçi | İlkin qiymətləndirmə |
| Sənəd | Növ, versiya, etibarlılıq müddəti, mənbə (yüklənib / generasiya) | N:M Profil, Layihə, Müraciət | Sənəd servisi |
| Mesaj | Göndərən, mətn, əlavələr, tarix | N:1 Müraciət | Kabinet (Mesajlar) |
| Bildiriş | Hadisə, alıcı, kanal, göndəriş nəticəsi, oxunma | N:1 İstifadəçi | Bildirişlər |
| Sistemli problem | Kateqoriya, qurum, səbəb, islahat statusu | N:M Müraciət | Ombudsman |
| Qayda dəsti | Növ, versiya, qüvvəyəminmə tarixi, təsdiq edən | Nəticələr versiyaya istinad edir | İnzibatçılıq |
| Ödəniş | Növ (dövlət rüsumu / tərəfdaş xidməti), məbləğ, status, qəbz | N:1 Layihə və ya Müraciət | Ödənişlər |
| Audit qeydi | Kim, nə, nə vaxt, əvvəlki və yeni dəyər | Bütün obyektlər | Audit servisi |

## 5. İstifadəçi rolları

| № | Rol | Giriş üsulu | Əsas səlahiyyət | Əsas sualı |
| --- | --- | --- | --- | --- |
| 1 | Qonaq | Tələb olunmur | Açıq məzmun, marşrut, KYA ilkin nəticəsi | «Mənə uyğundurmu? Nə qədər çəkir?» |
| 2 | Rezident investor | ASAN Login / SİMA İmza; e-imzası yoxdursa — e-poçt (səviyyə 1) | Profil, layihələr, müraciətlər, sənədlər, ödənişlər | «Hansı güzəştə düşürəm?» |
| 3 | Qeyri-rezident investor | E-poçt + kod | Rezident investorla eyni; hüquqi əməliyyatlar nümayəndə vasitəsilə və ya Azərbaycan e-imzası ilə | «Gəlmədən nə qədərini edə bilərəm?» |
| 4 | Case manager | Daxili hesab + 2FA | Koordinator. Case-lərin təyinatı, koordinasiyası, müddət və nəticəsi | «Hansı case ilişib?» |
| 5 | Nəzarətçi | Daxili hesab + 2FA | Koordinator. Case manager-lərin rəhbəri: növbə və təyinat, müddətin uzadılması, eskalasiyaların qəbulu, imtina qərarının təsdiqi, case-in yenidən açılması | «Harada müdaxilə lazımdır?» |
| 6 | Qurum nümayəndəsi | Daxili hesab + 2FA | Yalnız öz qurumunun (o cümlədən bankın) tapşırıqları: rəy, nəticə, əlavə məlumat tələbi | «Mənim müddətim necədir?» |
| 7 | İlkin qiymətləndirici | Daxili hesab + 2FA | Koordinator (səfirlik və ticarət nümayəndəliyi əməkdaşları daxil). Qiymətləndirmə rəyinin daxil edilməsi | «Hansı yoxlama məndədir?» |
| 8 | Ombudsman əməkdaşı | Daxili hesab + 2FA | Ombudsman müraciətləri, mediasiya, rəy layihəsi, sistemli problemlər; rəyi Ombudsman rəhbəri təsdiqləyir | «Hansı problem sistemlidir?» |
| 9 | Məzmun meneceri | Daxili hesab + 2FA | Operator. Açıq portal məzmunu | «Məzmun aktualdırmı?» |
| 10 | Analitik / rəhbər | Daxili hesab + 2FA | Operator və Koordinator. Hesabatlar və panellər (yalnız oxu) | «Sistem necə işləyir?» |
| 11 | Sistem inzibatçısı | Daxili hesab + 2FA | Operator. İstifadəçilər, rollar, qaydalar, workflow, parametrlər | «Sistem sağlamdırmı?» |

### 5.1. Giriş qaydaları

| ID | Tələb |
| --- | --- |
| **GİR-01** | **Minimum səlahiyyət:** hər istifadəçi yalnız vəzifəsinin tələb etdiyi funksiya və məlumatları görür. Rollar yalnız inzibatçı tərəfindən verilir. |
| **GİR-02** | Qurum nümayəndəsi yalnız öz qurumuna yönləndirilmiş case və tapşırıqları görür. |
| **GİR-03** | İnvestor yalnız öz məlumatlarını görür. Daxili qeydlər, qurumlararası yazışmalar və xidməti sənədlər investora heç bir ekranda göstərilmir. |
| **GİR-04** | Həssas məlumatın görünməsi sahə və sənəd səviyyəsində ayrıca səlahiyyətlə məhdudlaşdırıla bilir. |

### 5.2. Ssenari iştirakçıları

Modul bölmələrinin sonundakı ssenarilər eyni iki investorun yolunu kəşfdən genişlənməyə qədər izləyir; back-office rolları həmin işləri icra edən tərəf kimi göstərilir. Layihə parametrləri, rəqəm və müddətlər nümunədir. Ssenarilər Mərhələ 2-dən sonrakı funksionallığı göstərir (bölmə 25.1).

| İştirakçı | Marşrut | Nümunə profil |
| --- | --- | --- |
| Rezident investor | A | Azərbaycan vətəndaşı, SİMA İmzası var, mövcud ticarət şirkəti reyestrdədir. Yeni layihə: Gəncə yaxınlığında meyvə-tərəvəz emalı və qablaşdırma zavodu, ~1,2 mln ₼; layihə üçün yeni MMC yaradır. |
| Qeyri-rezident investor | D | Almaniya vətəndaşı, Berlində yaşayır; Almaniyada qeydiyyatlı şirkətin direktoru və yeganə sahibi. Həmin şirkət Azərbaycanda MMC təsis edir. Azərbaycan e-imzası yoxdur. Layihə: Sumqayıt Kimya Sənaye Parkında polimer boru zavodu, ~4,5 mln $. |

Back-office tərəfdə bölmə 5-dəki rollar iştirak edir: case manager (standart növbə), daimi case manager (böyük layihə), nəzarətçi, «Azərişıq» nümayəndəsi, ilkin qiymətləndirici, Ombudsman əməkdaşı, məzmun meneceri, analitik və sistem inzibatçısı.

## 6. Açıq portal

Açıq portal qeydiyyatsız işləyir. Əsas qaydası: **dəyər qeydiyyatdan əvvəl verilir** — qonaq ilk 60 saniyədə öz marşrutunu, təşviq uyğunluğunu və tələb olunan icazələri görür; hesabı yalnız nəticəni saxlamaq üçün yaradır.

### 6.1. Məzmun bölmələri

> **Kim:** Qonaq və investor oxuyur; məzmun meneceri idarə edir  
> **Harada:** Açıq portal; məzmun CMS-dən gəlir (FR-ADM-05)  
> **Ötürür:** Seçilmiş sahə, layihə və ya park → Marşrut kalkulyatoru, KYA, Vahid Müraciət

#### Ana səhifə

| ID | Tələb |
| --- | --- |
| **FR-HOME-01** | İki əsas hərəkət: «Layihəm var — nə lazımdır?» (Marşrut kalkulyatoru) və «Hazır layihələrə baxıram» (İmkanlar). Qeydiyyat ikinci dərəcəli elementdir. |
| **FR-HOME-02** | Bütün əsas bölmələrə, seçilmiş sahə və layihələrə («Hamısına bax» keçidi ilə), KYA, Ombudsman və Aftercare bloklarına keçidlər. |
| **FR-HOME-03** | İnvestor axınının və ASAN Invest-in vahid koordinasiya nöqtəsi rolunun qısa vizual təqdimatı. |
| **FR-HOME-04** | Göstəricilər zolağı analitika modulunun təsdiqlənmiş məlumatlarından gəlir (FR-REP-09); təsdiqlənməmiş rəqəm dərc edilmir. |

#### Niyə Azərbaycan?

| ID | Tələb |
| --- | --- |
| **FR-WHY-01** | Mövzular: makroiqtisadi göstəricilər; coğrafi mövqe və bazarlara çıxış; biznes mühiti; vergi və tənzimləmə; təşviqlər; infrastruktur və logistika; insan kapitalı; innovasiya; təbii resurslar və dayanıqlı inkişaf; milli prioritetlər. |
| **FR-WHY-02** | Statistika, infoqrafika və xəritə blokları; hər mövzudan əlaqəli imkanlara, Bələdçiyə və Marşrut kalkulyatoruna keçid. |

#### İnvestisiya İmkanları

| ID | Tələb |
| --- | --- |
| **FR-OPP-01** | Dörd alt bölmə: Sahələr · İnvestisiya layihələri · İqtisadi zonalar və sənaye parkları · Regionlar; aralarında qarşılıqlı keçidlər. |
| **FR-OPP-02** | Layihələr kart və ətraflı səhifə formatında. Kartda real obyektə «İŞLƏYİR», planlaşdırılana «LAYİHƏ» nişanı. |
| **FR-OPP-03** | Sahə, region, zona/park, həcm, mərhələ üzrə axtarış, filtr və sıralama. |
| **FR-OPP-04** | Layihə səhifəsi: təsvir, sahə, region, mərhələ, investisiya modeli və həcmi, torpaq və infrastruktur, iqtisadi göstəricilər, iş yerləri, məsul qurum, sənədlər və Təşviq uyğunluğunun ilkin nəticəsi (FR-INC-01). |
| **FR-OPP-05** | Zona və parklar interaktiv xəritədə: boş sahələr, qiymət, kommunikasiya gücləri, rezidentlik şərtləri və güzəştlər, rezidentlər. |
| **FR-OPP-06** | Sahə və regionlar üzrə göstəricilər, ixtisaslaşma, üstünlüklər və mövcud layihələr. |
| **FR-OPP-07** | «Maraq bildir / Müraciət et» — layihə məlumatı müraciətə avtomatik bağlanır (FR-APP-06). |

#### İnvestor Bələdçisi

| ID | Tələb |
| --- | --- |
| **FR-GUIDE-01** | Bilik bazası kateqoriyaları: biznesin qeydiyyatı; vergi və gömrük; təşviqlər; torpaq və əmlak; əmək münasibətləri; miqrasiya; icazə və lisenziyalar; əsas prosedurlar; FAQ; nümunə sənədlər. |
| **FR-GUIDE-02** | Açar sözlə axtarış, kateqoriya və mövzu filtrləri. |
| **FR-GUIDE-03** | Prosedur məzmunu addım-addım: sənədlər, qurumlar, hüquqi əsas, elektron xidmət keçidi, bayraq; oradan KYA və Marşrut kalkulyatoruna keçid. |
| **FR-GUIDE-04** | Nümunə sənədlərin endirilməsi; şirkət adının əlçatanlığının real vaxtda yoxlanması. |

#### Şəffaflıq və ASAN Invest haqqında

| ID | Tələb |
| --- | --- |
| **FR-TRN-01** | İslahatlar xronikası: prosedur dəyişiklikləri, yeni elektron xidmətlər, PLAN → ONLAYN keçidləri. |
| **FR-TRN-02** | İctimai hesabat: qurumlar üzrə orta cavab müddəti və vaxtında icra faizi, Ombudsman üzrə ümumiləşdirilmiş statistika (FR-REP-09). |
| **FR-ABOUT-01** | ASAN Invest-in məqsədi, fəaliyyət modeli, operatoru, iştirakçı qurumlar və onların rolu, koordinasiya mexanizmi, əlaqə kanalları. |

### 6.2. Marşrut kalkulyatoru

> **Nə edir:** İnvestorun ölkəsinə və layihəsinə görə necə, harada, nə qədər vaxta və xərclə keçəcəyini göstərir  
> **Kim:** Qonaq, investor  
> **Qəbul edir:** Vətəndaşlıq, sahə, təxmini həcm, ərazi  
> **Ötürür:** Qeydiyyat marşrutu (A/B/C/D) → Şirkət qeydiyyatı; cavablar → Profil

| ID | Tələb |
| --- | --- |
| **FR-ROUTE-01** | Hər ekranda bir sual: ölkə (axtarışlı) → sahə (kartlar) → həcm (AZN/USD/EUR slider) → ərazi. |
| **FR-ROUTE-02** | Nəticə: hüquqi forma; qeydiyyat marşrutu (9.1); sənədlərin leqallaşdırma yolu (apostil və ya konsul leqallaşdırması, ölkəyə görə); viza növü; yaşayış icazəsi əsası (FR-ROUTE-06); təxmini müddət; Azərbaycanda fiziki təmas sayı; təşviq uyğunluğu. Nəticə «təxmini» işarəsi daşıyır. |
| **FR-ROUTE-03** | Dövlət rüsumları və (seçilərsə) tərəfdaş xidmət haqları ayrı sətirlərdə; cəmlənib tək rəqəm kimi verilmir. |
| **FR-ROUTE-04** | Apostil konvensiyasına üzv olmayan ölkə: konsul leqallaşdırması yolu və akkreditə olunmuş səfirlik göstərilir. Sanksiya altındakı ölkə: nəzakətli dayanma və insanla əlaqə təklifi. |
| **FR-ROUTE-05** | Nəticəni saxlamaq və PDF endirmək üçün e-poçt tələb olunur; qeydiyyatda cavablar profilə köçür. |
| **FR-ROUTE-06** | İnvestisiya əsasında yaşayış: investisiya həcminə görə əcnəbinin müvəqqəti yaşamaq icazəsi üçün əsası olub-olmadığı göstərilir — ölkə iqtisadiyyatına ən azı 500 000 ₼ investisiya və ya Azərbaycanda ən azı 100 000 ₼ dəyərində daşınmaz əmlak, bank əmanəti və ya müəyyən qiymətli kağızlar. Adi şirkətin yaradılması üçün minimum investisiya məbləği yoxdur. Hədlər qayda dəsti kimi saxlanılır (FR-ADM-07). |

### 6.3. Təşviq uyğunluğu

> **Nə edir:** İnvestisiya təşviqi sənədinə uyğunluğu qüvvədə olan meyarlar üzrə hesablayır: strateji istiqamət (fəaliyyət sahəsi), minimal məbləğ və yerləşmə (inzibati ərazi və ya zona — sənaye məhəlləsi, aqropark və s.)  
> **Harada:** Marşrut nəticəsi, layihə kartı, pasport, müraciət forması — hamısı eyni mühərrikdən (Z-06)  
> **Ötürür:** Uyğunluq statusu → kapital addımının bloklayıcısı (FR-APP-07)

| ID | Tələb |
| --- | --- |
| **FR-INC-01** | Real vaxtda hesablama və üç nəticədən biri: **Uyğundur** (təxmini 7 illik qənaətlə); **Şərti uyğundur** (konkret alternativ: «Emal layihəsi aqroparkda həyata keçirildikdə strateji istiqamətə düşür» / «Məbləği X-ə çatdırsanız uyğun olursunuz»); **Uyğun deyil** (alternativ istiqamət, yerləşmə və ya digər güzəşt rejimi). |
| **FR-INC-02** | Meyarlar Prezidentin fərmanları ilə müəyyən edilir və dəyişir (sənədin tərtib tarixinə: verilmə müddəti 01.01.2029-dək uzadılıb, strateji istiqamətlər 19.06.2026 tarixli 689 nömrəli Fərmanla müəyyən edilib). Ona görə meyarlar yalnız qayda dəsti kimi saxlanılır (FR-ADM-07) və hər nəticədə əsas götürülən normativ aktın adı və tarixi göstərilir. |
| **FR-INC-03** | Digər güzəşt rejimləri — sənaye parkı və sənaye məhəlləsi rezidentliyi və s. — ayrıca qayda dəstləri kimi idarə olunur; investora uyğun gələn bütün rejimlər yan-yana göstərilir, seçim investorda qalır. |

### 6.4. Know Your Approvals (KYA)

> **Nə edir:** Layihə təsvirini Sİ ilə strukturlaşdırır, təsdiqlənmiş qaydaları tətbiq edir və tələb olunan prosedurları ardıcıllıqla müəyyən edir. Sadə kataloq deyil — Sİ + qayda əsaslı qərarvermə komponentidir  
> **Kim:** Qonaq (nəticəyə baxış), investor (saxlama, yenidən hesablama)  
> **Qəbul edir:** Profil + layihə təsviri (struktur forma və ya sərbəst mətn)  
> **Ötürür:** Prosedur siyahısı → Layihə pasportunun mərhələləri (FR-PROJ-02)

| ID | Tələb |
| --- | --- |
| **FR-KYA-01** | Layihənin strukturlaşdırılmış forma və ya sərbəst mətnlə təsviri; sərbəst mətnin Sİ ilə sahə, növ, yer, həcm və digər parametrlərə çevrilməsi. |
| **FR-KYA-02** | Sİ-nin çıxardığı parametrlər investora göstərilir, investor düzəldir və təsdiqləyir; təsdiqsiz parametr qaydalara ötürülmür. |
| **FR-KYA-03** | Suallar əvvəlki cavablara və layihənin xüsusiyyətlərinə görə dinamik qurulur. |
| **FR-KYA-04** | Prosedurların qaydalar əsasında avtomatik müəyyən edilməsi və fərdi ardıcıllıq kimi təqdimi. |
| **FR-KYA-05** | Hər prosedur üzrə: ad və təsvir; qurum; sənədlər; mərhələlər; müddət və ödəniş; hüquqi əsas; digər prosedurlarla asılılıq; elektron müraciət imkanı; bayraq. |
| **FR-KYA-06** | Nəticənin kabinetdə saxlanması, layihəyə bağlanması, girişlər dəyişdikdə yenidən hesablanması. |
| **FR-KYA-07** | İzah edilə bilənlik: hər prosedurun yanında onu hansı layihə parametrinin və hansı qaydanın (versiyası ilə) tələb etdiyi göstərilir. Nəticə məlumat xarakterlidir; prosedurun tətbiqi barədə yekun qərarı səlahiyyətli qurum verir. |

### 6.5. Ssenari nümunələri

| İştirakçı | Ssenari |
| --- | --- |
| Məzmun meneceri | Sumqayıt Kimya Sənaye Parkına 2 ha boş sahə əlavə edir: qiymət, elektrik gücü, rezidentlik şərtləri. Kart qaralama → razılaşdırma → dərc mərhələlərindən keçir və xəritədə görünür (FR-OPP-05, FR-ADM-06). |
| Qeyri-rezident investor · Marşrut | Qeydiyyatsız dörd sual cavablayır: Almaniya → kimya sənayesi → 4,5 mln $ → Sumqayıt.<br>Nəticə: Marşrut D (nümayəndə + etibarnamə); sənədlər Almaniyada notarial təsdiq və apostillə — Azərbaycana gəlmədən; investisiya həcmi 500 000 ₼-dan çox olduğu üçün müvəqqəti yaşamaq icazəsi əsası var; xülasə «təxmini 10 iş günü · Azərbaycanda 1 fiziki təmas (bank)»; dövlət rüsumları ayrı sətirdə. Nəticəni saxlamaq üçün e-poçtunu qeyd edir. |
| Rezident investor · Təşviq | Zavodu aqroparkdan kənarda planlaşdırır: «Şərti uyğundur — emal layihəsi aqroparkda həyata keçirildikdə strateji istiqamətə düşür». Kart aqroparkları göstərir; investor aqroparkı seçir — «Uyğundur», təxmini 7 illik qənaət və əsas götürülən fərmanın tarixi göstərilir. Marşrut A, fiziki təmas yoxdur. |
| Qeyri-rezident investor · KYA | Layihəni sərbəst mətnlə təsvir edir: «Sumqayıtda polimer boru zavodu, 3 xətt, 60 işçi». Sİ parametrləri çıxarır və xarici mütəxəssis sayını 6 kimi təyin edir (təşviq: «yerli kimya xammalına əsaslanan istehsal» — uyğundur; yanında sənaye parkı rezidentliyi rejimi də göstərilir); investor onu 4-ə düzəldib təsdiqləyir. Nəticə: 11 prosedur ardıcıllıqla, hər biri bayraq və onu tələb edən qaydanın göstəricisi ilə (FR-KYA-07). |

## 7. Giriş və profil

> **Nə edir:** Hesab yaradır, istifadəçini identifikasiya edir, investor və şirkət məlumatlarını bir dəfə toplayır  
> **Qəbul edir:** Qonaq sessiyası (marşrut, KYA, təşviq cavabları)  
> **Ötürür:** Profil → bütün formalar, KYA, bank paketi (Z-01); identifikasiya səviyyəsi → icazə verilən əməliyyatlar

Qeydiyyat üçün inzibati təsdiq və ya risk qiymətləndirməsi tələb olunmur; yoxlama lazım olduqda konkret müraciət və ya identifikasiya mərhələsində aparılır (bölmə 12).

### 7.1. Giriş

| ID | Tələb |
| --- | --- |
| **FR-AUTH-01** | Qeyri-rezident investor: e-poçt və ilkin məlumatla qeydiyyat; təsdiq keçidi və ya birdəfəlik kodla aktivləşdirmə; təhlükəsizlik tələblərinə uyğun şifrə. |
| **FR-AUTH-02** | E-imzası olan rezident investor: ASAN Login / SİMA İmza ilə giriş; FİN, VÖEN və mövcud şirkətlər reyestrdən çəkilir, bu sənədlər istənilmir. |
| **FR-AUTH-03** | Sessiya idarəsi, şifrənin dəyişdirilməsi və bərpası, təhlükəsiz çıxış. |
| **FR-AUTH-04** | Qeydiyyatda qonaq sessiyasının cavabları profilə köçürülür. |
| **FR-AUTH-05** | E-imzası olmayan rezident investor FR-AUTH-01 ilə qeydiyyatdan keçir (səviyyə 1); hüquqi əməliyyatlar üçün ona ASAN İmza və ya SİMA əldə etmə yolu, alternativ olaraq Marşrut B göstərilir. E-imza sonradan qoşulduqda hesab səviyyə 2-yə keçir, məlumatlar itmir. |

### 7.2. İdentifikasiya səviyyələri

| Səviyyə | Necə əldə edilir | Nəyə imkan verir |
| --- | --- | --- |
| 1 — Əsas | E-poçt + təsdiq | Baxış, KYA və marşrutun saxlanması, qaralamalar, konsultasiya, Ombudsman və Aftercare müraciətləri, mesajlar |
| 2 — Hüquqi | ASAN Login / SİMA və ya digər Azərbaycan e-imzası (qeyri-rezident e-imzası daxil) | Şirkət qeydiyyatı sənədlərinin imzalanması, təşviq müraciəti, hüquqi əhəmiyyətli müraciətlər, bank paketinin göndərilməsi |

İnvestisiya niyyəti və digər səviyyə 1 müraciətləri üçün e-imza tələb olunmur. Səviyyə 2 tələb edən əməliyyata başlayan istifadəçi xəta deyil, «Marşrutum» ekranını görür: nümayəndə təyini (FR-PROF-04) və ya e-imza ilə davam etmə yolu. Başladığı qaralama itmir.

### 7.3. Profil

| ID | Tələb |
| --- | --- |
| **FR-PROF-01** | Fərdi profil: ölkə, əlaqə, sektor, fəaliyyət sahəsi. Şirkət profili: ad, qeydiyyat ölkəsi, qeydiyyat və vergi identifikatorları, fəaliyyət sahəsi, benefisiar (UBO) strukturu. |
| **FR-PROF-02** | Profilin investor tərəfindən yenilənməsi; dəyişikliklərin versiya tarixçəsi. |
| **FR-PROF-03** | Şəxsi məlumatların emalı şərtləri, hər sahənin niyə soruşulduğunun izahı; verilmiş razılığın məzmunu, tarixi və versiyasının qeydə alınması; hesabın bağlanması və məlumatların saxlanma müddəti barədə məlumat. |
| **FR-PROF-04** | Nümayəndələr: investor şirkət profilinə əlavə istifadəçi (hüquqşünas, akkreditə olunmuş tərəfdaş, Marşrut D-də nümayəndə) dəvət edir və səlahiyyət həddini təyin edir — baxış, hazırlama və ya imza; imza həddi etibarnamə ilə təsdiqlənir. Nümayəndənin bütün hərəkətləri investorun kabinetində və audit jurnalında görünür; səlahiyyət istənilən vaxt ləğv edilir. |

### 7.4. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Rezident investor | ASAN Login ilə daxil olur. FİN, VÖEN və mövcud şirkəti reyestrdən avtomatik gəlir; qonaq kimi verdiyi cavablar profildədir. Birbaşa səviyyə 2-dədir və heç bir sənəd yükləmir. |
| Qeyri-rezident investor | E-poçt və kodla qeydiyyatdan keçir (səviyyə 1) və investisiya niyyəti müraciətini dərhal təqdim edir — e-imza tələb olunmur. Alman şirkətinin rekvizitlərini və UBO strukturunu bir dəfə daxil edir. Akkreditə olunmuş hüquq firmasının əməkdaşını «imza» səlahiyyəti ilə nümayəndə kimi dəvət edir; imza həddi apostilli etibarnamə ilə təsdiqlənəcək (FR-PROF-04). |

## 8. Şəxsi kabinet

> **Nə edir:** İnvestorun bütün modullardakı məlumatlarını vahid ekranda göstərir. Ayrıca məlumat saxlamır (Z-03)  
> **Kim:** Rezident və qeyri-rezident investor  
> **Əsas sualı:** «Növbəti addımınız nədir?»

| ID | Tələb |
| --- | --- |
| **FR-CAB-01** | İdarə paneli: yuxarıda layihə pasportundan «Növbəti addımınız» kartı; altında aktiv müraciətlər və statuslar, cavab gözləyən tələblər, son bildirişlər. |
| **FR-CAB-02** | Müraciətlərim: bütün növlər bir siyahıda, statusa görə qruplar — qaralama · təqdim edilmiş · baxılmaqda · cavabınız gözlənilir · tamamlanmış · geri götürülmüş. Hər sətirdə nömrə, növ, tarix, status, növbəti addım. |
| **FR-CAB-03** | Müraciət səhifəsi: investora açıq status keçidləri, tələblər, cavablar və nəticələrin xronoloji tarixçəsi; əlavə məlumat tələbinə kabinetdən cavab. |
| **FR-CAB-04** | Sənədlərim: yüklənmiş və generasiya olunmuş sənədlər, layihə və müraciətlərlə əlaqəsi, təkrar istifadəsi, versiyalar və etibarlılıq müddəti (bitməsinə 30 gün qalmış bildiriş). |
| **FR-CAB-05** | Mesajlar: konkret müraciət üzrə case manager ilə yazışma; yazışma müraciət tarixçəsinə bağlanır. Case manager-in cavab müddəti konfiqurasiya olunur və analitikada ölçülür. |
| **FR-CAB-06** | Layihələrim (pasport), KYA nəticələrim, Marşrutum (sənəd hazırlığı, leqallaşdırma, nümayəndə və imza vəziyyəti), Ödənişlər və tərəfdaşlar, Profil və şirkət bölmələri. |

### 8.1. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Rezident investor | İdarə panelində: «Növbəti addımınız — Tikinti icazəsi, müraciət etmək olar». Biznes-plan bir dəfə yüklənib və üç müraciətdə istifadə olunub. Bildiriş: «İcarə müqaviləsinin etibarlılığı 30 gün sonra bitir». |
| Qeyri-rezident investor | «Marşrutum»da: «Etibarnamə Berlində notarial təsdiq olunub, apostil gözlənilir — 2-ci gün»; eyni vaxtda paralel addımları tamamlayır. Mesajlar bölməsində daimi case manager ilə yazışır. |

## 9. Şirkət qeydiyyatı

> **Nə edir:** İnvestorun Azərbaycanda hüquqi şəxs yaratmasını elektron marşrutla aparır  
> **Qəbul edir:** Marşrut (6.2), profil, investorun səviyyə 2 imzası və ya nümayəndənin imzası  
> **Ötürür:** Şirkət və VÖEN → Layihə obyekti yaradılır (FR-PROJ-01); bank KYC paketi → banklar

### 9.1. Sənədlər və marşrutlar

Rezident və qeyri-rezident üçün sənədlər əsasən eynidir; fərq təsisçinin hüquqi şəxs olması, xarici sənədlərin leqallaşdırılması və imza kanalındadır. Aşağıdakı siyahı Koordinatorun təqdim etdiyi siyahıdır; sənəd dəstləri marşrutlar üzrə İnzibatçılıq modulunda saxlanılır (FR-ADM-07).

| Sənəd | Kimə aid | Platformada |
| --- | --- | --- |
| Təsis, nizamnamənin təsdiqi və idarəetmə orqanlarının formalaşdırılması haqqında qərar | Hamı | Şablondan generasiya (AVTO) |
| Təsisçi(lər) və ya səlahiyyətli nümayəndə tərəfindən təsdiq edilmiş nizamnamə | Hamı | Şablondan generasiya (AVTO) |
| Təsisçi fiziki şəxsin şəxsiyyət sənədinin surəti | Təsisçi fiziki şəxs | Rezident — reyestrdən; qeyri-rezident — yükləmə |
| Təsisçi hüquqi şəxsin qeydiyyat sənədləri (şəhadətnamə, reyestrdən çıxarış, nizamnamə) | Təsisçi hüquqi şəxs | Rezident — elektron qeydiyyatda DVX tərəfindən əlavə edilir; qeyri-rezident — leqallaşdırılmış/apostilli surət və notarial tərcümə |
| Qanuni təmsilçinin şəxsiyyət sənədinin surəti | Hamı | Profildən |
| Dövlət rüsumunun ödənilməsi haqqında sənəd | Kağız qeydiyyatda | Ödəniş modulundan (elektron qeydiyyat rüsumsuzdur) |
| Nizamnamə kapitalının ödənilməsini təsdiq edən sənəd | Tələb olunan halda | Yükləmə |
| Müstəqil auditor rəyi | Kapital əmlak formasında olduqda | Tərəfdaş kataloqundan auditor |
| Dövlət qeydiyyatı haqqında ərizə | Hamı | Profil və layihədən avtomatik doldurulur |
| Etibarnamə və nümayəndənin şəxsiyyət sənədinin surəti | Nümayəndə vasitəsilə müraciətdə | Etibarnamə şablondan; xaricdə verilmişsə — apostil/leqallaşdırma və tərcümə |

Xarici ölkədə verilmiş sənədlər, beynəlxalq müqavilələrdə başqa qayda nəzərdə tutulmayıbsa, leqallaşdırılmalı və ya «Apostil» ilə təsdiq edilməli, Azərbaycan dilinə tərcüməsi notariat qaydasında təsdiq olunmalıdır. Hansı sənədin hazırda elektron, hansının ənənəvi qaydada təqdim olunduğu Koordinatorla dəqiqləşdirilir (25.3).

#### Marşrutlar

| Kim | E-imzası | Marşrut | Xarakteri |
| --- | --- | --- | --- |
| Rezident investor | Var (SİMA / ASAN İmza) | A | Tam elektron; elektron qeydiyyat rüsumsuzdur |
| Rezident investor | Yoxdur | B | DVX-nin e-imzasız elektron üsulu (mövcud olduqda) və ya kağız müraciət; sistem sənədləri hazırlayır. Kağız qeydiyyatda dövlət rüsumu tutulur |
| Qeyri-rezident investor | Var (Azərbaycan e-imzası, o cümlədən qeyri-rezident e-imzası) | C | Elektron qeydiyyat investorun öz imzası ilə. E-imzanın alınması platformanın prosesi deyil; ehtiyac olarsa sonrakı mərhələdə inteqrasiya olunur (25.1) |
| Qeyri-rezident investor | Yoxdur | D | **Əsas marşrut.** Nümayəndə + etibarnamə; sənədlər investorun ölkəsində notarial təsdiq və apostil — Azərbaycana gəlmədən |

Xaricdə daimi yaşayan Azərbaycan vətəndaşı qeyri-rezident sayılır və C və ya D marşrutu ilə gedir; ASAN İmzası varsa, Marşrut A ilə.

Təsisçi xarici hüquqi şəxsdirsə, istənilən marşrutda onun qeydiyyat ölkəsinin reyestrindən çıxarış və benefisiar məlumatı apostil (və ya konsul leqallaşdırması) və notarial tərcümə ilə tələb olunur; sənəd elektron yüklənir, əslinin təqdimi qaydası marşrut konfiqurasiyasında göstərilir.

### 9.2. Marşrut D — qeyri-rezident investor

| Addım | Məzmun | Bayraq |
| --- | --- | --- |
| D1 Qeydiyyat | E-poçtla qeydiyyat, profil və təsisçi məlumatı; sanksiya/PEP yoxlaması (FR-EVAL-01) | ONLAYN / AVTO |
| D2 Sənəd paketi | Qərar, nizamnamə, ərizə və etibarnamə şablondan generasiya olunur; nümayəndə (tərəfdaş və ya investorun seçdiyi şəxs) təyin edilir (FR-PROF-04) | AVTO |
| D3 Leqallaşdırma | İnvestor etibarnaməni və təsisçi sənədlərini öz ölkəsində notarial təsdiq etdirir və apostil (və ya konsul leqallaşdırması) alır; skan yüklənir | FİZİKİ — investorun ölkəsində |
| D4 Tərcümə | Notarial tərcümə Azərbaycanda (tərəfdaş vasitəsilə) | ONLAYN |
| D5 Paralel iş | Leqallaşdırma gedərkən: şirkət adı, hüquqi ünvan, nizamnamənin təsdiqi, bank seçimi və KYC, vergi rejimi, kapital strukturu | AVTO / ONLAYN |
| D6 Qeydiyyat | Nümayəndə paketi öz e-imzası ilə DVX-yə elektron təqdim edir (orijinalların təqdimi qaydası marşrut konfiqurasiyasındadır) | ONLAYN |
| D7 Bank | KYC paketi banka ötürülür; qərarı bank verir. Hazırda imza nümunəsi üçün filiala bir gəliş tələb oluna bilər (22.1) | FİZİKİ → PLAN: ONLAYN |

Marşrut A D6 və D7 addımlarından ibarətdir, imzanı investor özü atır. Marşrut C-də D2–D4 əvəzinə investor sənədləri öz e-imzası ilə imzalayır.

### 9.3. Funksional tələblər

| ID | Tələb |
| --- | --- |
| **FR-REG-01** | Nizamnamə, təsisçi qərarı, etibarnamə və digər sənədlərin şablondan generasiyası. Hüquqi qüvvəyə malik versiya Azərbaycan dilindədir; digər dil versiyaları məlumat xarakterlidir və bu, sənəddə qeyd olunur. |
| **FR-REG-02** | **Paralel iş:** yoxlama müddətində boş «gözləyin» ekranı yoxdur; investora həmin müddətdə tamamlaya biləcəyi addımlar göstərilir (D5). |
| **FR-REG-03** | Şirkət adının real vaxtda əlçatanlıq yoxlaması; hüquqi ünvanın dörd variantdan seçimi: sənaye parkı, biznes mərkəzi, virtual ofis, öz icarəsi. |
| **FR-REG-04** | Marşrut D üçün apostil və tərcümə yoxlama siyahısı: hansı sənəd, hansı ölkədə, hansı ardıcıllıqla. |
| **FR-REG-05** | Bank KYC formaları (UBO, vəsaitin mənbəyi, FATCA/CRS, fəaliyyət təsviri) bir dəfə doldurulur və ən çoxu üç banka eyni anda göndərilir. |
| **FR-REG-06** | Bank cavab müddəti bankla protokolda razılaşdırılmış dəyərlə göstərilir və bankın risk kateqoriyasından asılı ola bilər (məs. aşağı risk — 1 iş günü, orta — 3 iş günü, yüksək — fərdi baxılma, müddət göstərilmir). Risk kateqoriyasını bank müəyyən edir. |
| **FR-REG-07** | Hər banka göndəriş pasportun «Bank hesabı» mərhələsində müraciət və case kimi qeydə alınır; bank qurum nümayəndəsi kimi tapşırığı icra edir və qərarını (açıldı / əlavə sorğu / imtina) inteqrasiya və ya back-office interfeysi ilə qaytarır. Bank qərarı səbəbini açıqlamaya bilər; bu halda investora alternativ banklar təklif olunur. |

### 9.4. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Qeyri-rezident investor · Marşrut D | **Gün 1:** sanksiya/PEP yoxlaması təmiz; sistem qərarı, nizamnaməni, ərizəni və etibarnaməni generasiya edir.<br>**Gün 2–5:** Berlində notarius və apostil — Azərbaycana gəlmədən; skanlar yüklənir, notarial tərcüməni tərəfdaş edir. Paralel: seçilmiş şirkət adı boşdur, hüquqi ünvan — Sumqayıt parkı, iki bank seçilir, KYC formaları bir dəfə doldurulur.<br>**Gün 6:** nümayəndə paketi öz e-imzası ilə DVX-yə təqdim edir; VÖEN alınır.<br>**Sonra:** hər banka göndəriş «Bank hesabı» mərhələsində ayrıca case kimi görünür; protokol üzrə cavab 1 iş günü. Hesabın aktivləşdirilməsi üçün investor Bakıya ilk səfərində filialda imza nümunəsi verir — yeganə fiziki təmas. |
| Rezident investor · Marşrut A | Yeni MMC-ni SİMA İmzası ilə qeydiyyatdan keçirir; kimlik və e-imza addımları yoxdur. Ekranda «Dövlət rüsumu: 0 ₼». VÖEN alınan kimi layihə yaranır. |

## 10. Layihə pasportu

> **Nə edir:** Layihənin bütün mərhələlərini tək zaman xəttində göstərir və idarə edir. Platformanın mərkəzi obyektidir  
> **Kim:** İnvestor (idarə edir), case manager (izləyir)  
> **Qəbul edir:** Şirkət (bölmə 9), KYA nəticəsi (6.4), case statusları (13)  
> **Ötürür:** Mərhələ → müraciət şablonu (11); «Növbəti addımınız» → kabinet

### 10.1. Nümunəvi zaman xətti

| Mərhələ | Bayraq | Qeyd |
| --- | --- | --- |
| Şirkət qurulub, VÖEN | AVTO | Bölmə 9 |
| Təşviq uyğunluğu ön-baxışı | AVTO | Saniyələr içində |
| Bank hesabı | ONLAYN / FİZİKİ | Bankın qərarı case statusu kimi qayıdır (FR-REG-07) |
| Kapital qoyuluşu | ONLAYN | Bank hesabı açıldıqdan və təşviq ön-baxışından sonra açılır (FR-APP-07) |
| İnvestisiya təşviqi sənədi | ONLAYN | Qərarı İqtisadiyyat Nazirliyi verir |
| Torpaq / sənaye parkı | ONLAYN | Xəritədən seçim (FR-OPP-05) |
| Zonalaşdırma ön-sorğusu | AVTO | Rəqəmsal məlumat olduqda dərhal |
| Tikinti icazəsi, layihə ekspertizası | ONLAYN | KYA ardıcıllığı ilə |
| Avadanlıq idxalı üzrə təsdiqedici sənəd | AVTO | Təşviq sənədindən törəyir |
| Kommunal qoşulmalar | ONLAYN | Elektrik, qaz, su |
| İş icazəsi (xarici işçilər üçün) | ONLAYN | İşəgötürən müraciət edir; işçi gəlməzdən əvvəl mümkündür; adətən 1 il müddətinə |
| Müvəqqəti yaşamaq icazəsi | ONLAYN / FİZİKİ | İşçi üçün — iş icazəsi ilə birlikdə və ya sonra; investor üçün — FR-ROUTE-06 əsasında |
| Ekoloji və yanğın yoxlaması | FİZİKİ | Yoxlamadır, prosedur deyil |
| İstismara qəbul | FİZİKİ | Layihə Aftercare dövrünə keçir |

### 10.2. Mərhələ statusları

Mərhələ statusu ayrıca idarə olunmur — bağlı müraciətin case statusundan hesablanır (Z-03).

| Mərhələ statusu | Şərt |
| --- | --- |
| Kilidli | Asılı olduğu mərhələ tamamlanmayıb və ya bloklayıcı qayda işləyir |
| Açıq | Müraciət etmək olar, müraciət hələ yaradılmayıb |
| İcrada | Bağlı müraciət təqdim edilib, case aktivdir |
| Cavabınız gözlənilir | Case «Əlavə məlumat gözlənilir» statusundadır |
| Tamamlandı | Case «Tamamlanıb» statusundadır |
| Problemli | Case imtina və ya gecikmədədir; Ombudsman və alternativ yollar təklif olunur (Z-04) |
| Tətbiq edilmir | KYA üzrə bu layihə üçün lazım deyil |

### 10.3. Funksional tələblər

| ID | Tələb |
| --- | --- |
| **FR-PROJ-01** | Layihə şirkət qeydiyyatı zamanı avtomatik, mövcud şirkət üçün investor tərəfindən yaradılır. Yaradılarkən investor hansı KYA nəticəsinin əsas götürüləcəyini seçir; nəticə yoxdursa, KYA-ya yönləndirilir. |
| **FR-PROJ-02** | KYA nəticəsindəki prosedurlar ardıcıllıq və bayraqlarla pasport mərhələlərinə çevrilir. KYA yenidən hesablandıqda fərqlər investora göstərilir; təsdiqdən sonra yeni mərhələlər əlavə olunur, lazımsız olanlar «Tətbiq edilmir» olur, tamamlanmış mərhələlər dəyişmir. |
| **FR-PROJ-03** | Hər mərhələnin öz müraciət növü var; mərhələdən yaradılan müraciət layihə, KYA və profil məlumatı ilə doldurulur. Biznes-plan və əsas sənədlər bir dəfə yüklənir. |
| **FR-PROJ-04** | Mərhələlər gözlənilən və faktiki müddətlərlə tək zaman xəttində; mərhələ tamamlananda növbəti avtomatik açılır. |
| **FR-PROJ-05** | Layihənin ölçü kateqoriyası (hədd FR-ADM-07 ilə təyin olunur): kiçik — standart növbə; böyük — daimi case manager, investora adı və fotosu ilə göstərilir (FR-CASE-02). |
| **FR-PROJ-06** | Zonalaşdırma ön-sorğusu: xəritədə sahə seçildikdə tikinti əmsalı, sıxlıq, hündürlük və təyinat göstərilir. Rəqəmsal planlaşdırma məlumatı əlçatan olduqda cavab dərhaldır (AVTO); olmadıqda sorğu aidiyyəti quruma tapşırıq kimi gedir (ONLAYN). |
| **FR-PROJ-07** | Ombudsman və Aftercare müraciətləri, reinvestisiya təşəbbüsləri pasporta bağlanır; pasport PDF-ə ixrac olunur. |
| **FR-PROJ-08** | Layihə statusu: Hazırlıq (şirkət və ilkin mərhələlər) → İcra (icazə və tikinti mərhələləri) → İstismar (istismara qəbuldan sonra; Aftercare dövrü) → Dayandırılıb / Bağlanıb. Status mərhələlərin vəziyyətindən hesablanır, «Dayandırılıb» və «Bağlanıb» isə investorun qərarı ilə qoyulur. |

### 10.4. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Qeyri-rezident investor | Layihə böyük kateqoriyadadır — kabinetdə daimi case manager-in adı və fotosu görünür. KYA-dan gələn 11 mərhələ zaman xəttindədir; «Kapital qoyuluşu» təşviq ön-baxışı bitənə qədər «Kilidli»dir. Zonalaşdırma ön-sorğusu sahə seçilən kimi cavab verir. |
| Rezident investor | «Elektrik qoşulması» — «İcrada», «Tikinti icazəsi» — «Problemli» (qurum cavabı gecikir); yanında Ombudsman və alternativ yollar göstərilir. |
| Daimi case manager | Qeyri-rezident investorun pasportunu back-office-də açır: bütün mərhələlər gözlənilən və faktiki müddətlərlə bir ekranda; gecikmə riski olan mərhələ ayrıca işarələnir. |

## 11. Vahid Müraciət

> **Nə edir:** Bütün müraciət növləri üçün vahid forma, qaralama, yoxlama və təqdim mexanizmi. Ombudsman və Aftercare də buradan təqdim olunur, yalnız workflow-ları fərqlidir  
> **Qəbul edir:** Pasport mərhələsi, imkan kartı və ya «Yeni müraciət»  
> **Ötürür:** Nömrəli müraciət → təqdim anında case yaradılır; qaydaya görə case-in ilk mərhələsi İlkin qiymətləndirmədir

### 11.1. Müraciət növləri

| Növ | Workflow | Səviyyə | Qiymətləndirmə |
| --- | --- | --- | --- |
| İnvestisiya niyyəti | Standart | 1 | Qaydaya görə |
| Konkret layihəyə maraq (imkan kartından) | Standart | 1 | Qaydaya görə |
| Konsultasiya | Standart | 1 | Yox |
| Tərəfdaşlıq təklifi | Standart | 1 | Qaydaya görə |
| Pasport mərhələsi müraciəti (təşviq, torpaq, icazə, qoşulma və s.) | Standart | 2 | Qaydaya görə |
| Ombudsman müraciəti | Ombudsman (15) | 1 | Yox |
| Aftercare müraciəti | Aftercare (16) | 1 | Yox |

Növlər, formaları, məcburi sənədləri və workflow-a bağlılığı İnzibatçılıq modulunda konfiqurasiya olunur (FR-ADM-03).

### 11.2. Funksional tələblər

| ID | Tələb |
| --- | --- |
| **FR-APP-01** | Seçilmiş növə uyğun sahələr, məcburi məlumatlar və sənədlər formada dinamik görünür; profildə və layihədə olanlar avtomatik doldurulur. |
| **FR-APP-02** | Qaralama kimi saxlama, redaktə, yoxlama və təqdim. Təqdimdən əvvəl məcburi sahələr, format, fayl növü və ölçüsü yoxlanılır; xəta konkret düzəliş yolu ilə göstərilir. |
| **FR-APP-03** | Təqdim edilən hər müraciətə unikal nömrə, tarix və vaxt verilir; qəbul təsdiqi kabinetdə göstərilir və bildiriş göndərilir. Bu qayda bütün növlərə, o cümlədən Ombudsman və Aftercare-ə aiddir. |
| **FR-APP-04** | Təqdim anında məlumat və sənədlərin tam nüsxəsi (snapshot) saxlanılır; sonrakı profil dəyişiklikləri onu dəyişmir. |
| **FR-APP-05** | Müraciət konfiqurasiya olunmuş statuslarda geri götürülə bilir; səbəb və vaxt qeydə alınır. |
| **FR-APP-06** | İmkan kartından və ya pasport mərhələsindən yaradılan müraciət mənbə obyektə avtomatik bağlanır. |
| **FR-APP-07** | **Uyğunluq bloklayıcısı:** təşviq uyğunluğu ön-baxışı keçilmədən kapital köçürmə addımı açılmır. Doğru sıra: ön-baxış → cavab → vəsait. |
| **FR-APP-08** | **Kapital strukturu xəbərdarlığı** — vəsait addımından əvvəl modal:<br>– «Nizamnamə kapitalı şirkətin əmlakına çevrilir; geri qaytarılması yalnız kapitalın azaldılması və ya ləğv yolu ilə mümkündür.»<br>– «Təsisçi borcu müqavilə üzrə geri qaytarıla bilər.»<br>– «Təşviq sənədi üçün investisiya həcmi tələb olunur — balansı vergi məsləhətçisi ilə qurun.» [Məsləhətçi seç] [Davam et] |

### 11.3. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Rezident investor | Pasportdan «İnvestisiya təşviqi sənədi» müraciətini açır. Şirkət, OKED, məbləğ və ərazi artıq doludur; yalnız investisiya planı cədvəlini və bir sənəd əlavə edir. Müraciət INV-2026-00412 nömrəsini alır, qəbul bildirişi gəlir. |
| Qeyri-rezident investor | Kapital köçürmə addımında xəbərdarlıq modalı açılır. Tərəfdaş məsləhətçi ilə 500 min $-ı nizamnamə kapitalı, qalanını təsisçi borcu kimi rəsmiləşdirmək qərarına gəlir. Təşviq ön-baxışı keçilmədən bu addım açılmazdı. |
| Sistem inzibatçısı | Yeni müraciət növü yaradır: «Sənaye parkı rezidentliyi» — forma sahələri, məcburi sənədlər, Standart workflow, səviyyə 2. Növ dərhal pasport mərhələsi kimi istifadəyə hazırdır (FR-ADM-03). |

## 12. İlkin qiymətləndirmə

> **Nə edir:** Qaydalar tələb etdikdə investoru və niyyəti yoxlayır, müraciətin sonrakı istiqamətini müəyyən edir. Qeydiyyat üçün şərt deyil  
> **Kim:** İlkin qiymətləndirici; avtomatik qat üçün sistem  
> **Qəbul edir:** Case-dəki müraciət (və ya identifikasiya anında istifadəçi), profil, risk qaydaları  
> **Ötürür:** Rəy və qərar ssenarisi → Case Management

| ID | Tələb |
| --- | --- |
| **FR-EVAL-01** | İki qat:<br>– **Avtomatik:** hər qeyri-rezident investor üçün qeydiyyatdan sonra ilk hüquqi əhəmiyyətli addımda (ilk müraciət və ya Marşrut D-nin D1 addımı) sanksiya və PEP yoxlaması — risk investor vaxt və vəsait sərf etməzdən əvvəl aşkarlanır. Nəticə istifadəçiyə bağlı saxlanılır, sonrakı müraciətlərdə təkrarlanmır; siyahılar yeniləndikdə aktiv istifadəçilər avtomatik yenidən yoxlanılır;<br>– **Marşrut:** qaydalar tələb etdikdə müraciət bir və ya bir neçə yoxlamaya yönləndirilir — risk meyarları üzrə ekspert, səfirlik/konsulluq, ticarət nümayəndəliyi. |
| **FR-EVAL-02** | Marşrut müraciət növü, profil, ölkə, sektor və fəaliyyət sahəsinə görə qayda mühərriki ilə müəyyən edilir. |
| **FR-EVAL-03** | Hər yoxlama üzrə məsul qiymətləndirici, başlanma və son tarix, status, rəy, qeydlər və sənədlər. |
| **FR-EVAL-04** | Nəticəyə görə ssenari: növbəti mərhələ, əlavə məlumat tələbi, baxılmanın davamı və ya digər təsdiqlənmiş qərar; meyarlar və əsaslandırma case tarixçəsində saxlanılır. |
| **FR-EVAL-05** | Uyğunsuzluq investora ittiham kimi göstərilmir: nəzakətli dayanma mesajı və insanla əlaqə təklifi. |

### 12.1. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Qeyri-rezident investor | Avtomatik yoxlama D1 addımında keçib. Risk qaydası «xarici hüquqi şəxs təsisçi + həcm 3 mln $-dan çox» ekspert yoxlamasını tələb edir; müraciət qiymətləndirmə növbəsinə düşür. |
| İlkin qiymətləndirici | Təsisçi şirkətin Almaniya ticarət reyestrindən apostilli çıxarışını və benefisiar strukturunu yoxlayır, 2 iş günündə «Davam» rəyini əsaslandırma ilə daxil edir; müraciət daimi case manager-in case-inə keçir. |
| Rezident investor | Qaydaya görə rezident fiziki şəxs üçün qiymətləndirmə tələb olunmur — müraciət birbaşa Case Management-ə gedir. |

## 13. Case Management

> **Nə edir:** Hər müraciətin qəbulundan yekun nəticəyə qədər icrasını və qurumlararası koordinasiyanı idarə edir. Statusun yeganə mənbəyidir (Z-03)  
> **Kim:** Case manager, nəzarətçi, qurum nümayəndəsi; Ombudsman workflow-unda Ombudsman əməkdaşı  
> **Qəbul edir:** Müraciət + qiymətləndirmə nəticəsi  
> **Ötürür:** Status və yekun nəticə → pasport, kabinet, bildirişlər, analitika

| ID | Tələb |
| --- | --- |
| **FR-CASE-01** | Case müraciət təqdim edildiyi anda yaradılır və növ, sahə, region, qurum üzrə kateqoriyalaşdırılır. Qaydaya görə qiymətləndirmə tələb olunursa, o, case manager təyinatından əvvəl case daxilində aparılır. |
| **FR-CASE-02** | Case manager təyinat qaydaları ilə avtomatik və ya nəzarətçi tərəfindən təyin edilir. Böyük layihələrin bütün case-ləri layihənin daimi case manager-inə düşür. |
| **FR-CASE-03** | Bir və ya bir neçə quruma paralel və ya ardıcıl tapşırıqlar; hər tapşırıqda qurum, icraçı, son tarix, status, rəy, sənədlər və nəticə. |
| **FR-CASE-04** | Qurum cavablarının nəzərdən keçirilməsi və konsolidasiyası, koordinasiya qeydləri, investora əlavə məlumat tələbi, yekun nəticənin hazırlanması. |
| **FR-CASE-05** | İş masası: son tarixi yaxınlaşan, gecikmiş və eskalasiya olunmuş case və tapşırıqlar ayrıca; hər kartda rəngi dəyişən müddət halqası. |
| **FR-CASE-06** | Case yalnız məcburi nəticə sahələri doldurulduqda və bütün tapşırıqlar bağlandıqda yekunlaşır; nəticə, tarix və icraçı qeydə alınır. |
| **FR-CASE-07** | Bağlanmış case yalnız nəzarətçi tərəfindən, səbəb göstərilməklə yenidən açılır. |
| **FR-CASE-08** | Daxili tam tarixçə: status keçidləri, təyinatlar, tapşırıqlar, qeydlər, sənədlər, qərarlar. |

### 13.1. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Case manager (standart növbə) | Rezident investorun təşviq müraciətini növbədən götürür, Nazirliyin təşviq üzrə struktur bölməsinə tapşırıq verir, cavabı alıb yekun nəticəni hazırlayır. Case «Tamamlanıb» olur; pasportda mərhələ bağlanır və «Avadanlıq idxalı» mərhələsi açılır. |
| Daimi case manager | Qeyri-rezident investorun elektrik qoşulması üçün iki paralel tapşırıq yaradır: «Azərişıq» və park idarəsi. |
| Qurum nümayəndəsi («Azərişıq») | Yalnız öz tapşırığını görür. Tələb olunan gücü (kVt) soruşur — sorğu investorun kabinetinə «Cavabınız gözlənilir» kimi düşür. Cavabdan sonra texniki şərtləri yükləyir. |
| Qeyri-rezident investor | Kabinetdə gücü daxil edir və sxemi yükləyir; başqa sənəd istənilmir. |

## 14. Statuslar, müddət və eskalasiya

Bu bölmənin qaydaları üç workflow-a — Standart, Ombudsman, Aftercare — eyni tətbiq olunur və workflow bölmələrində təkrar yazılmır.

### 14.1. Standart workflow statusları

| Daxili status | Məzmun | Məsul | İnvestor görür |
| --- | --- | --- | --- |
| Qaralama | Yaradılıb, təqdim edilməyib | İnvestor | Qaralama |
| Təqdim edilib | Göndərilib, nömrə verilib | Sistem | Təqdim edilib |
| Qeydiyyata alınıb | Case yaradılıb və kateqoriyalaşdırılıb | Sistem | Baxılmaqdadır |
| İlkin qiymətləndirmədə | Yoxlama aparılır | Qiymətləndirici | Baxılmaqdadır |
| Əlavə məlumat gözlənilir | İnvestordan tələb olunub | İnvestor | Cavabınız gözlənilir |
| İcraya təyin edilib | Case manager təyin olunub | Sistem / nəzarətçi | Baxılmaqdadır |
| Baxılır | Daxili baxılma | Case manager | Baxılmaqdadır |
| Qurumlararası koordinasiyada | Qurum rəyi gözlənilir | Qurum nümayəndəsi | Qurumda baxılır |
| Nəticə hazırlanır | Cavablar konsolidasiya olunur | Case manager | Nəticə hazırlanır |
| Tamamlanıb | Yekun nəticə təqdim edilib | Case manager | Tamamlanıb |
| İmtina edilib | Əsaslandırılmış imtina | Case manager + nəzarətçi təsdiqi | İmtina edilib |
| Geri götürülüb | İnvestor geri götürüb | İnvestor | Geri götürülüb |
| Arxivləşdirilib | Aktiv mühitdən çıxarılıb | Sistem | Arxiv |

### 14.2. Ombudsman və Aftercare üçün əlavə statuslar

| Workflow | Əlavə statuslar (standart statuslara əlavə olaraq) |
| --- | --- |
| Ombudsman | Araşdırılır · Mediasiyada · Rəy hazırlanır · Rəy təsdiqdə |
| Aftercare | Növbəti əlaqə planlaşdırılıb · Monitorinqdə |

Statusların adları və keçidləri İnzibatçılıq modulunda dəqiqləşdirilir (FR-ADM-03).

### 14.3. Qaydalar

| ID | Tələb |
| --- | --- |
| **WF-01** | Hər müraciət növü, status və tapşırıq üçün icra müddəti konfiqurasiya olunur; hesablamada iş və qeyri-iş günləri nəzərə alınır. |
| **WF-02** | «Əlavə məlumat gözlənilir» statusunda ümumi müddətin dayanıb-dayanmaması workflow qaydası ilə müəyyən edilir. |
| **WF-03** | Son tarix yaxınlaşanda məsul istifadəçiyə və nəzarətçiyə xəbərdarlıq; gecikmədə case eskalasiya pilləsinə keçir və investora avtomatik məlumat verilir. |
| **WF-04** | Yenidən təyinat, müddətin uzadılması və eskalasiyanın dayandırılması yalnız nəzarətçi tərəfindən, səbəb göstərilməklə. |
| **WF-05** | Əlavə məlumat tələbində: konkret məlumat və ya sənəd adı, son tarix, nümunə şablon, cavab kanalı. İnvestorun cavabı əvvəlkini silmir, yeni versiya kimi saxlanılır. |
| **WF-06** | Yekun nəticədə: qərarın növü, əsaslandırma, sənədlər, növbəti addımlar. İmtina halında əlavə olaraq hüquqi əsas, şikayət hüququ və müddəti, alternativ və «Şikayət et» düyməsi — o, rədd edilmiş case-ə bağlı Ombudsman müraciəti açır. |
| **WF-07** | Tamamlanmış hər müraciətdən sonra məmnunluq sorğusu; nəticələr analitikaya ötürülür. |

### 14.4. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Qurum nümayəndəsi («Azərişıq») | Tapşırığın müddəti 10 iş günüdür; investorun cavabı gözlənilərkən müddət dayanır (WF-02). 8-ci gün xəbərdarlıq alır; 11-ci gün tapşırıq eskalasiya pilləsinə keçir. |
| Nəzarətçi | Eskalasiyanı qəbul edir, qurumla əlaqə saxlayır; müddəti səbəb göstərməklə 3 iş günü uzadır (WF-04). |
| Qeyri-rezident investor | Kabinetdə görür: «Qurumda baxılır — müddət keçib, məsələ eskalasiya edilib». |
| Rezident investor | Tikinti icazəsi üzrə imtina alır: səbəb, hüquqi əsas, şikayət hüququ və 30 günlük müddət, alternativ; ekranda «Şikayət et» düyməsi. |

## 15. İnvestisiya Ombudsmanı

> **Nə edir:** İnvestorun dövlət qurumları ilə qarşılaşdığı inzibati və prosedur problemlərini araşdırır, həllinə kömək edir və təkrarlanan problemləri islahat təklifinə çevirir  
> **Kim:** İnvestor (müraciət edir), Ombudsman əməkdaşı (araşdırır)  
> **Harada:** Açıq səhifə (məlumat + «Müraciət et»), kabinet (Vahid Müraciət, növ «Ombudsman»), back-office (Ombudsman iş masası)  
> **Ötürür:** Tövsiyə rəyi → investor; sistemli problemlər → analitika, Şəffaflıq, qayda versiyası

Qəbul, nömrə, təyinat, qurumlara sorğular, müddət və eskalasiya ümumi qaydalarla işləyir (FR-APP-03, FR-CASE-02, FR-CASE-03, bölmə 14). Aşağıda yalnız Ombudsmana xas tələblər var.

| ID | Tələb |
| --- | --- |
| **FR-OMB-01** | Açıq səhifə: mexanizmin məqsədi, müraciət halları, baxılma prosesi; «Müraciət et» — girişli istifadəçini formaya, girişsiz istifadəçini əvvəlcə giriş/qeydiyyata aparır. |
| **FR-OMB-02** | Forma sahələri: problemin təsviri; tarix və mərhələ; aidiyyəti qurum; hadisələrin xronologiyası; əvvəlki müraciət və cavablar; gözlənilən həll; sübut sənədləri; layihəyə bağlama. |
| **FR-OMB-03** | Workflow-un ayrıca məxfilik səviyyələri, statusları və müddətləri. |
| **FR-OMB-04** | Görüş və mediasiya qeydləri: iştirakçılar, müzakirə olunan məsələlər, razılaşdırılmış tədbirlər. |
| **FR-OMB-05** | Tövsiyə xarakterli rəyin hazırlanması, razılaşdırılması və Ombudsman rəhbəri tərəfindən təsdiqi; təsdiqlənmiş rəyin kabinetdə təqdimi. |
| **FR-OMB-06** | **Nəticənin əsas müraciətə qaytarılması:** tövsiyə nəticəsində qurum yenidən baxmağa razı olduqda rədd edilmiş case nəzarətçi tərəfindən yenidən açılır (FR-CASE-07), pasport mərhələsi «Problemli»dən «İcrada»ya keçir və Ombudsman müraciəti nəticə ilə bağlanır. |
| **FR-OMB-07** | **Sistemli problem kataloqu** (Aftercare ilə ortaq): təkrarlanan problemin işarələnməsi, əlaqəli müraciətlərin qruplaşdırılması, səbəb və tədbirlərin qeydi, islahat təklifinin statusu. Qəbul edilmiş islahat Şəffaflıq bölməsində və qayda dəstinin yeni versiyasında əks olunur. |

### 15.1. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Rezident investor | «Şikayət et»-i seçir. Ombudsman müraciəti rədd edilmiş case-ə avtomatik bağlanır; investor yalnız problemi təsvir edir: imtina səbəbi kimi qüvvədə olmayan norma göstərilib. |
| Ombudsman əməkdaşı | Quruma sorğu göndərir, görüş keçirir, mediasiyanın nəticəsini qeydə alır; rəy layihəsini Ombudsman rəhbəri təsdiqləyir. Qurum yenidən baxmağa razılaşır: nəzarətçi rədd edilmiş case-i yenidən açır, pasport mərhələsi «İcrada»ya qayıdır və icazə verilir. Əməkdaş eyni problemin son üç ayda 7 müraciətdə təkrarlandığını görür, onu sistemli problem kimi işarələyir və islahat təklifi hazırlayır. |

## 16. Aftercare

> **Nə edir:** Layihəni həyata keçirən investorun problem və dəstək ehtiyaclarını idarə edir; passivliyi aşkarlayır və reinvestisiyanı yeni layihəyə çevirir  
> **Kim:** İnvestor, case manager  
> **Harada:** Kabinet (Vahid Müraciət, növ «Aftercare»), back-office (Aftercare iş masası)  
> **Ötürür:** Həll → investor; genişlənmə → yeni KYA və Layihə pasportu; təkrarlanan problem → sistemli problem kataloqu (FR-OMB-07)

Qəbul, nömrə, təyinat, tapşırıqlar, müddət və eskalasiya ümumi qaydalarla işləyir. Aşağıda yalnız Aftercare-ə xas tələblər var.

| ID | Tələb |
| --- | --- |
| **FR-AFT-01** | Kateqoriyalar: inzibati və prosedur problemlər; qurumlarla koordinasiya; genişlənmə; reinvestisiya; icazə və lisenziya çətinlikləri; digər təsdiqlənmiş kateqoriyalar. |
| **FR-AFT-02** | Növbəti əlaqənin planlaşdırılması: tarix, məqsəd, məsul əməkdaş. |
| **FR-AFT-03** | **Passivlik xəbərdarlığı:** DVX-dən alınan fəaliyyət məlumatına (hesabat və bəyannamə təqdimi, əməliyyat statusu) görə şirkət konfiqurasiya olunmuş müddət (standart 60 gün) hərəkətsizdirsə:<br>– investora: «Fəaliyyət olmasa da hesabat öhdəliyi davam edir. Seçimləriniz: fəaliyyəti müvəqqəti dayandırmaq · ləğv proseduruna başlamaq · davam etmək. Heç nə edilməzsə maliyyə sanksiyaları yarana bilər.»;<br>– case manager-ə proaktiv Aftercare tapşırığı. |
| **FR-AFT-04** | Reinvestisiya və ya genişlənmə təsdiqləndikdə KYA yeni layihə parametrləri ilə işə salınır (mövcud şirkət və profil məlumatı avtomatik ötürülür) və onun nəticəsi ilə yeni Layihə pasportu yaradılır (zəncirin 4-cü mərhələsinə qayıdış). |

### 16.1. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Qeyri-rezident investor | Zavod işləyir, lakin idxal olunan avadanlıq üzrə güzəşt gömrükdə tanınmır. «İcazə çətinlikləri» kateqoriyasında Aftercare müraciəti açır; daimi case manager gömrüyə tapşırıq verir, məsələ həll olunur. Bir il sonra 4-cü xətt üçün genişlənmə təsdiqlənir: KYA mövcud şirkət məlumatı ilə yenidən işə salınır, nəticəsindən yeni layihə pasportu yaranır. |
| Rezident investor | DVX məlumatına görə mövcud ticarət şirkəti 60 gündür hərəkətsizdir; passivlik xəbərdarlığı gəlir və investor «fəaliyyəti müvəqqəti dayandırmaq» seçir. |
| Case manager (standart növbə) | Proaktiv Aftercare tapşırığı alır və dayandırma prosedurunu müşayiət edir. |

## 17. Bildirişlər

> **Nə edir:** Bütün modulların hadisələri əsasında istifadəçiləri məlumatlandırır  
> **Kanallar:** Portal daxili (əsas), e-poçt, SMS, digər təsdiqlənmiş kanallar

| ID | Tələb |
| --- | --- |
| **FR-NOT-01** | Bildirişlər hadisələr əsasında avtomatik yaradılır. Minimum hadisələr:<br>– qeydiyyat və hesab; müraciətin təqdimi, status dəyişikliyi və nəticəsi; əlavə məlumat tələbi;<br>– müddətin yaxınlaşması, keçməsi, eskalasiya; rəy və qərar;<br>– qayda versiyasının dəyişməsi (KYA və ya təşviq nəticəsinə təsir edirsə); prosedurun bayrağının dəyişməsi;<br>– sənədin etibarlılığının bitməsinə 30 gün; passivlik; ödəniş. |
| **FR-NOT-02** | Şablonlar hadisə, rol, dil və kanal üzrə; dinamik sahələr: nömrə, status, tarix, son müddət. Alıcı rol, müraciətlə əlaqə və qaydalar əsasında müəyyən edilir. |
| **FR-NOT-03** | Hər göndəriş cəhdi jurnalda: tarix, kanal, alıcı, nəticə, xəta; uğursuz göndərişin təkrarı. |
| **FR-NOT-04** | Portal daxili bildirişlər: oxunmuş/oxunmamış, arxiv. |
| **FR-NOT-05** | İnvestor kanal və kateqoriya seçimlərini idarə edir; məcburi xidməti bildirişlər söndürülə bilmir. |
| **FR-NOT-06** | Bildiriş mətnində şəxsi, məxfi və xidməti məlumat açıq yazılmır — ətraflı məlumat kabinetdədir. |

### 17.1. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Qeyri-rezident investor | Bildirişləri ingilis dilində, portalda və e-poçtla alır. Mətndə yalnız nömrə və status var — «INV-2026-00588 requires additional information»; detallar kabinetdədir. |
| Rezident investor | SMS kanalını söndürür, lakin «əlavə məlumat tələbi» məcburi xidməti bildiriş olduğu üçün söndürülə bilmir. |

## 18. Hesabatlılıq və analitika

> **Nə edir:** Bütün modulların əməliyyat məlumatlarından göstəricilər formalaşdırır. Bütün KPI-lar yalnız bu bölmədə təyin olunur  
> **Kim:** Analitik, rəhbər; ictimai hissə — hamı  
> **Ötürür:** İdarəetmə panelləri; anonimləşdirilmiş ictimai məlumat → Ana səhifə, Şəffaflıq; sistemli problemlər → islahat

| ID | Tələb |
| --- | --- |
| **FR-REP-01** | İdarəetmə paneli; filtrlər: sahə, region, ölkə, müraciət növü, qurum, case manager, status, tarix intervalı; filtrə görə avtomatik yenilənmə; əvvəlki dövrlə müqayisə. |
| **FR-REP-02** | Müraciətlər: ümumi say; statuslar üzrə bölgü; orta baxılma müddəti; vaxtında və gecikmə ilə tamamlananlar; əlavə məlumat tələb olunanlar; eskalasiyalar; nəticələr üzrə bölgü. |
| **FR-REP-03** | Qurumlar: yönləndirilmiş, icrada və tamamlanmış tapşırıqlar; vaxtında cavab faizi; orta cavab müddəti; gecikmiş, eskalasiya olunmuş və təkrar baxılmaya qaytarılmış tapşırıqlar. |
| **FR-REP-04** | Case manager-lər: case sayı, tamamlanma faizi, orta müddət, gecikmə və eskalasiya. |
| **FR-REP-05** | Ombudsman: daxil olmuş və nəticələndirilmiş, gecikmiş, eskalasiya olunmuş müraciətlər; orta müddət; qurumlar üzrə bölgü; sistemli problemlər və onların həlli; məmnunluq. |
| **FR-REP-06** | Aftercare: açıq və tamamlanmış müraciətlər, kateqoriyalar, qurumlar, həll müddəti, reinvestisiya və genişlənmə, məmnunluq. |
| **FR-REP-07** | KYA: hesablamaların sayı, sahələr üzrə bölgü, ən çox müəyyən edilən prosedurlar, yenidən hesablamalar, elektron xidmət keçidlərindən istifadə. |
| **FR-REP-08** | İnvestor hunisi: qonaq → marşrut nəticəsi → qeydiyyat → ilk müraciət → şirkət → istismar; qeyri-rezident üçün leqallaşdırma və nümayəndə mərhələləri ayrıca; hər mərhələdə itki. |
| **FR-REP-09** | İctimai məlumat dəsti: anonimləşdirilmiş və ümumiləşdirilmiş göstəricilər — Ana səhifə, Şəffaflıq bölməsi və illik Ombudsman hesabatı üçün. |
| **FR-REP-10** | Hesabatlar rol, səlahiyyət və qurum mənsubiyyətinə görə görünür; ekranda baxış və geniş yayılmış formatlarda ixrac. |
| **FR-REP-11** | Hər göstərici üçün ad, hesablama qaydası, mənbə və yenilənmə tezliyi saxlanılır; göstəricilər əməliyyat məlumatları ilə uzlaşır. |
| **FR-REP-12** | Uğur göstəriciləri paneli (bölmə 1.5): şirkət qeydiyyatına qədər orta müddət və fiziki təmas sayı layihə pasportunun mərhələ tarixlərindən və bayraqlarından, qalan göstəricilər FR-REP-02…08 məlumatlarından hesablanır; baza dəyər və hədəf ilə müqayisə göstərilir. |

### 18.1. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Analitik / rəhbər | Aylıq paneldə «Azərişıq» üzrə orta cavab müddəti 14 gün, vaxtında cavab faizi 62%-dir — məsələ qurum rəhbərliyi ilə görüşə çıxarılır.<br>İnvestor hunisində ən böyük itki leqallaşdırma mərhələsindədir; qərar: Bələdçidə ölkələr üzrə apostil təlimatlarının genişləndirilməsi və tərəfdaş şəbəkəsinin artırılması. Təsdiqlənmiş göstəricilərin anonim versiyası Şəffaflıq bölməsində dərc olunur. |

## 19. İnzibatçılıq

> **Nə edir:** Bütün konfiqurasiyanın, qaydaların və məzmunun yeganə idarəetmə nöqtəsi. Modul bölmələrində «konfiqurasiya olunur» deyilən hər şey burada idarə edilir  
> **Kim:** Sistem inzibatçısı, məzmun meneceri  
> **Ötürür:** Qaydaların yeni versiyası → Marşrut, KYA, təşviq, qiymətləndirmə, case təyinatı (zəncirin 13-cü mərhələsi)

| ID | Tələb |
| --- | --- |
| **FR-ADM-01** | İstifadəçilər, rollar, səlahiyyətlər və qurum mənsubiyyəti: yaradılma, dəyişmə, aktivləşdirmə, deaktivləşdirmə; rolun qüvvədəolma müddəti. |
| **FR-ADM-02** | Təsnifatlar: sahə, fəaliyyət, region, ölkə, zona və park, qurum, sənəd növü. |
| **FR-ADM-03** | Müraciət növləri: formalar, sahələr, məcburi sənədlər, workflow-a bağlılıq; workflow-ların statusları və keçidləri. |
| **FR-ADM-04** | Müddət, yönləndirmə, təsdiq, təyinat və eskalasiya qaydaları. |
| **FR-ADM-05** | Məzmun (CMS): açıq portalın bütün səhifələri, FAQ, fayllar, vizual materiallar. Hər məzmun vahidində qüvvəyə minmə tarixi, son yenilənmə tarixi və məsul sahib; həyat dövrü: qaralama → razılaşdırma → dərc → arxiv; planlı dərc; əvvəlki versiyalar. |
| **FR-ADM-06** | İnvestisiya İmkanları məzmunu: sahələr, layihələr, zona və parklar, regionlar, onların əlaqələri və sənədləri — FR-ADM-05 həyat dövrü ilə. |
| **FR-ADM-07** | Qayda dəstləri — versiya, razılaşdırma, təsdiq və qüvvəyəminmə tarixi ilə:<br>– KYA qaydaları; təşviq uyğunluğu meyarları; risk meyarları və sanksiya siyahılarının mənbələri;<br>– marşrut qaydaları, hər marşrutun sənəd dəsti və akkreditasiya cədvəli (hansı ölkəyə hansı konsulluq xidmət göstərir);<br>– layihənin ölçü kateqoriyası həddi; passivlik həddi.<br>Köhnə nəticələr öz versiyalarına bağlı qalır (Z-05). |
| **FR-ADM-08** | Prosedur kataloqu: hər prosedur üçün qurum, sənədlər, mərhələlər, müddət, ödəniş, hüquqi əsas, asılılıqlar, elektron xidmət keçidi və bayraq. KYA və pasport bu kataloqdan istifadə edir. |
| **FR-ADM-09** | Bildiriş şablonları. |
| **FR-ADM-10** | Dövlət rüsumları cədvəli; akkreditə olunmuş tərəfdaşlar, onların xidmətləri, qiymətləri və akkreditasiya statusu. |
| **FR-ADM-11** | Sistem və inteqrasiya parametrləri. |

### 19.1. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Sistem inzibatçısı | **Qayda versiyası:** Ombudsmanın islahat təklifi qəbul edildikdən sonra KYA qaydasının yeni versiyasını hazırlayır, təsdiqə göndərir və qüvvəyəminmə tarixi qoyur. Köhnə nəticələr köhnə versiyaya bağlı qalır; təsirə məruz qalan investorlara «Yenidən hesabla» bildirişi gedir.<br>**Bayraq:** Miqrasiya Xidməti ilə inteqrasiya açılır; müvəqqəti yaşamaq icazəsi proseduru PLAN-dan ONLAYN-a keçir, qeyri-rezident investorun pasportu avtomatik yenilənir.<br>**Rol:** «Azərişıq» əməkdaşına «Qurum nümayəndəsi» rolunu qurum mənsubiyyəti ilə bir il müddətinə verir. Hər üç əməliyyat audit jurnalına yazılır. |

## 20. Ödənişlər və tərəfdaş xidmətləri

> **Nə edir:** Dövlət rüsumlarını qəbul edir; akkreditə olunmuş tərəfdaşların kommersiya xidmətlərini şəffaf göstərir  
> **Əsas qayda:** Dövlət rüsumu və tərəfdaş xidmət haqqı heç vaxt qarışdırılmır — ayrı sətir, ayrı qəbz, ayrı alan tərəf

Dövlət platforması kommersiya xidmətlərini özü göstərmir və özəl sektorla rəqabət aparmır. Hüquqi ünvan, tərcümə, notarial müşayiət, hüquq və vergi məsləhəti, qarşılanma kimi xidmətləri sifarişçinin təsdiqlədiyi meyarlarla akkreditə olunmuş tərəfdaşlar göstərir. ASAN Invest-in öz xidmət haqqı yalnız normativ əsas olduqda tətbiq edilir.

| ID | Tələb |
| --- | --- |
| **FR-PAY-01** | Dövlət rüsumlarının onlayn ödənişi: beynəlxalq kart, ASAN ödəniş və provayderin dəstəklədiyi digər üsullar; yalnız yerli kartla məhdudlaşma qadağandır. |
| **FR-PAY-02** | Tərəfdaş kataloqu: xidmət növü, qiymət, müddət, reytinq və akkreditasiya statusu; investor tərəfdaşı seçir, müqavilə investorla tərəfdaş arasında bağlanır. |
| **FR-PAY-03** | Seçilmiş tərəfdaş xidməti pasportun müvafiq mərhələsinə bağlanır və mərhələ kartında göstərilir. |
| **FR-PAY-04** | Qəbzlər avtomatik Sənədlərim bölməsinə düşür; uğursuz ödənişdə səbəb, təkrar cəhd və alternativ üsul göstərilir. |

### 20.1. Ssenari nümunəsi

| İştirakçı | Ssenari |
| --- | --- |
| Qeyri-rezident investor | Dövlət rüsumlarını kartla ödəyir; ilk cəhd bank tərəfindən rədd edilir — səbəb və alternativ üsul göstərilir. Tərəfdaş kataloqundan akkreditə olunmuş hüquq firmasını seçir (nümayəndəlik, tərcümə, kapital strukturu, hüquqi ünvan); müqavilə investorla firma arasında bağlanır, xidmət «Kapital qoyuluşu» mərhələsinə bağlanır. Qəbzlər Sənədlərim bölməsindədir. |
| Rezident investor | Tərəfdaş xidməti seçmir; elektron qeydiyyat rüsumsuz olduğundan ödəniş ekranında yalnız «Dövlət rüsumu: 0 ₼» görünür. |

## 21. Ümumi sistem servisləri

Bunlar biznes modulu deyil — bütün modulların ortaq istifadə etdiyi texniki servislərdir.

| Servis | Təyinat |
| --- | --- |
| Qayda mühərriki | KYA, təşviq, risk, marşrut, bayraq və case təyinatı üçün vahid, versiyalanan qaydalar (Z-06). |
| Autentifikasiya | E-poçt, ASAN Login / SİMA, digər Azərbaycan e-imzaları; identifikasiya səviyyələri. |
| Avtorizasiya | Rol və səlahiyyətə görə funksiya və məlumata çıxış (bölmə 5.1). |
| Sənəd servisi | Yükləmə, saxlama, versiya, generasiya, obyektlərlə əlaqə. |
| Uyğunluq yoxlaması | Sanksiya və PEP yoxlaması; siyahılar konfiqurasiya kimi yenilənir. |
| Ödəniş servisi | Provayderlərlə əlaqə, qəbzlər, uzlaşdırma. |
| Axtarış | Modullar üzrə məlumat axtarışı. |
| Audit Log | Dəyişdirilə bilməyən əməliyyat jurnalı (21.1). |
| İnteqrasiya qatı | Xarici və dövlət sistemləri ilə mübadilə (bölmə 22). |

### 21.1. Audit jurnalına yazılan hadisələr

Audit bütün modullar üçün bir yerdə təyin olunur. Hər qeyddə: kim, nə, nə vaxt, əvvəlki və yeni dəyər. Jurnal dəyişdirilə bilmir; axtarış yalnız səlahiyyətli istifadəçilər üçündür.

- Rol və səlahiyyətlərin verilməsi, dəyişdirilməsi, ləğvi.
- Qayda dəstləri, prosedur kataloqu, məzmun və konfiqurasiya dəyişiklikləri (dəyişən və təsdiq edən şəxslə).
- Bütün status keçidləri, təyinatlar, müddət uzadılmaları, eskalasiyalar, case-in yenidən açılması.
- Profil və razılıq dəyişiklikləri, sənəd təqdimi, müraciətin geri götürülməsi.
- Ödəniş əməliyyatları.
- Hesabatların yaradılması, açılması və ixracı.

## 22. İnteqrasiyalar

Səviyyə interfeysdəki bayraqla bağlıdır: açılmamış inteqrasiyaya əsaslanan addım **PLAN** göstərilir və inteqrasiya açıldıqda avtomatik ONLAYN və ya AVTO olur (FR-FLAG-03). Konkret məlumat dəstləri, hüquqi əsas və API ayrıca inteqrasiya spesifikasiyasında təsdiqlənir.

| Səviyyə | Mənası |
| --- | --- |
| 1 | Qurumun razılığı olmadan bu gün qurula bilər |
| 2 | Qurumla rəsmi protokol və API tələb edir |
| 3 | Qanunvericilik dəyişikliyi tələb edir |

| Qurum / sistem | Məqsəd | Səviyyə | Forma |
| --- | --- | --- | --- |
| E-poçt və SMS provayderləri | Bildirişlər | 1 | İnteqrasiya |
| Ödəniş provayderləri, ASAN ödəniş | Dövlət rüsumları | 2 | Protokol + inteqrasiya |
| Sanksiya/PEP siyahıları provayderi | Uyğunluq yoxlaması | 1 | İnteqrasiya |
| ASAN Login / SİMA / ASAN İmza | Rezident investorun girişi və imzası | 2 | İnteqrasiya |
| «e-qeyri-rezident» altsistemi (ASAN İmza + virtual FİN) | Qeyri-rezidentin e-imza alması — ehtiyac olarsa (Koordinatorun qərarı ilə) | 2 | Mərhələ 3 |
| İqtisadiyyat Nazirliyi yanında Dövlət Vergi Xidməti | Şirkət qeydiyyatı, VÖEN, reyestr məlumatı, şirkətin fəaliyyət statusu (passivlik üçün) | 2 | API |
| DXA — ASAN Viza | Viza yönləndirməsi | 2 | API |
| Dövlət Miqrasiya Xidməti | İş və yaşayış icazəsi | 2 | Dəqiqləşdirilməlidir |
| İqtisadiyyat Nazirliyi və tabeli qurumlar | Koordinatorun iş sistemləri; təşviq sənədi, layihə məlumatı | 2 | Dəqiqləşdirilməlidir |
| Əmlak Məsələləri Dövlət Xidməti / Daşınmaz Əmlakın Dövlət Reyestri | Hüquqi ünvan, kadastr, əmlak qeydiyyatı | 2 | Dəqiqləşdirilməlidir |
| Dövlət Gömrük Komitəsi | Avadanlıq idxalı güzəşti, statuslar | 2 | Dəqiqləşdirilməlidir |
| «Azərişıq» ASC, «Azəriqaz» İB, Azərbaycan Dövlət Su Ehtiyatları Agentliyi; Kommunal Xidmətlər Vahid İnformasiya Sistemi (fəaliyyətə başladıqda) | Kommunal qoşulmalar | 2 | Dəqiqləşdirilməlidir |
| Mərkəzi Bank + banklar | Bank KYC paketi; ilk mərhələdə 2 bankla pilot | 2 | Protokol + API |
| Elektron notariat | Etibarnamə, notarial əməliyyatlar | 2 | Dəqiqləşdirilməlidir |
| Səfirlik, konsulluq, ticarət nümayəndəlikləri | Qiymətləndirmə rəyləri | 2 | UI / inteqrasiya |
| Azərbaycan Respublikasının Şəhərsalma və Arxitektura Komitəsi (tikinti icazəsi üzrə mövcud elektron sistem daxil) | Zonalaşdırma və planlaşdırma məlumatı (FR-PROJ-06), tikinti icazəsi statusları | 2 | Dəqiqləşdirilməlidir |
| Sİ model provayderi | KYA sərbəst mətninin strukturlaşdırılması (NFR-03) | 1 | İnteqrasiya |

### 22.1. Səviyyə 3 — qanunvericilik təşəbbüsləri

- e-Rezidentlik statusu.
- Əcnəbi üçün uzaqdan gücləndirilmiş e-imza (video-identifikasiya + NFC).
- Bankın e-imzanı yaş imza nümunəsi kimi qəbul etməsi (Mərkəzi Bankla razılaşdırma).
- Xarici e-imzaların qarşılıqlı tanınması.

## 23. Vəziyyətlər və kənar hallar

Hər ekran üçün bu vəziyyətlər dizayn edilir; yalnız uğurlu ssenari qəbul olunmur. Hamısı Z-04 qaydasına tabedir.

| № | Vəziyyət | Tələb |
| --- | --- | --- |
| 1 | Yüklənmə | Skelet ekran; real məzmunun formasını təkrarlayır. |
| 2 | Boş | Hərəkətə dəvət: «Hələ layihəniz yoxdur. İlkini 60 saniyəyə yaradın.» |
| 3 | Xəta | Nə baş verdi və necə düzəldilir. |
| 4 | Rədd | WF-06 tərkibi + «Şikayət et». |
| 5 | Müddət keçib | Eskalasiya statusu və investora məlumat (WF-03). |
| 6 | Əlavə sənəd tələbi | WF-05 tərkibi. |
| 7 | Sessiya bitib | Cavablar itmir, bərpa olunur. |
| 8 | Sanksiya uyğunsuzluğu | Nəzakətli dayanma, insanla əlaqə (FR-EVAL-05). |
| 9 | Ölkə Apostil konvensiyasında deyil | Konsul leqallaşdırması yolu və akkreditə olunmuş səfirlik (FR-ROUTE-04). |
| 10 | Passiv şirkət | Üç seçimli xəbərdarlıq (FR-AFT-03). |
| 11 | Ödəniş uğursuz | FR-PAY-04. |
| 12 | Qayda versiyası dəyişib | Dəyişikliyin qısa izahı + «Yenidən hesabla» (Z-05). |

## 24. İnterfeys və qeyri-funksional tələblər

### 24.1. İnterfeys

Vizual əsas — **ASAN Invest brend dili**: tünd göy-mavi palitra, ağ səthlər, ciddi dövlət üslubu. Ətraflı dizayn sistemi (palitra tokenləri, tipoqrafiya, komponentlər) prototip mərhələsində hazırlanır və sifarişçi ilə razılaşdırılır.

| ID | Tələb |
| --- | --- |
| **UI-01** | Açıq portal, kabinet və back-office eyni brend dilində və eyni komponent sistemindədir. |
| **UI-02** | Açıq portalın naviqasiyası: Niyə Azərbaycan? · İnvestisiya İmkanları · İnvestor Bələdçisi · Know Your Approvals · İnvestisiya Ombudsmanı · ASAN Invest haqqında; yuxarı sağda dil, bildirişlər, Giriş / Qeydiyyat. |
| **UI-03** | Status və bayraqlar rəng + simvol + mətn etiketi ilə göstərilir, yalnız rənglə yox. Bayraq rəngləri: AVTO — yaşıl, ONLAYN — mavi, FİZİKİ — kəhrəba, PLAN — boz. |
| **UI-04** | Dillər: Azərbaycan (əsas), İngilis, Rus, Türk, Ərəb; Ərəb dili üçün RTL. Hüquqi mətnlərin və qərarların rəsmi versiyası Azərbaycan dilindədir. |
| **UI-05** | Responsiv: 380–1920 px; back-office planşetdə işləkdir. |
| **UI-06** | Əlçatanlıq: WCAG 2.1 AA, tam klaviatura naviqasiyası, prefers-reduced-motion dəstəyi. |
| **UI-07** | Mətnlər aktiv səslə; xəta mesajı nə baş verdiyini və necə düzəldiləcəyini deyir; bölmə 1.2-dəki qadağan ifadələr və emoji istifadə edilmir. |
| **UI-08** | Vizual məzmun — real Azərbaycan obyektləri (rəsmi media arxivlərindən); stok foto və 3D render istifadə edilmir. |
| **UI-09** | Dizayn prototipləri investor, case manager, qurum nümayəndəsi və inzibatçı ssenariləri üzrə sifarişçi ilə razılaşdırılır. |

### 24.2. Qeyri-funksional tələblər

Rəqəmlər ilkin hədəfdir və texniki layihə mərhələsində sifarişçi ilə dəqiqləşdirilir.

| ID | Tələb |
| --- | --- |
| **NFR-01** | Məlumatlar Azərbaycan ərazisində saxlanılır; emal fərdi məlumatlar haqqında qanunvericiliyə və dövlət informasiya sistemlərinə dair tələblərə uyğundur. |
| **NFR-02** | Təhlükəsizlik: ötürmə və saxlamada şifrələmə; daxili rollar üçün məcburi iki faktorlu giriş; yüklənən faylların zərərli proqram yoxlaması; açıq formalarda bot qoruması; istismardan əvvəl və ildə bir dəfə müstəqil penetrasiya testi. |
| **NFR-03** | Sİ komponenti: yalnız investorun təsvirini strukturlaşdırır, qərar vermir (qərarı qayda mühərriki verir); investor məlumatı modelin təlimi üçün istifadə edilmir; Sİ-yə göndərilən və ondan alınan məlumat jurnallaşdırılır; yerləşdirmə modeli NFR-01-ə uyğun seçilir. |
| **NFR-04** | Əlçatımlılıq — ilkin hədəf 99,5%; planlı texniki işlər əvvəlcədən elan olunur. |
| **NFR-05** | Ehtiyat nüsxə və bərpa: ilkin hədəf RPO — 1 saat, RTO — 4 saat. |
| **NFR-06** | Performans: açıq portal səhifələri 3 saniyədən tez yüklənir; yük testi gözlənilən pik istifadəçi sayının iki misli ilə aparılır. |
| **NFR-07** | Genişlənə bilənlik: yeni qurumun qoşulması, yeni müraciət növü və yeni qayda kod dəyişikliyi olmadan konfiqurasiya və inteqrasiya adapteri ilə həyata keçirilir. |
| **NFR-08** | Audit jurnalı və əməliyyat məlumatlarının saxlanma müddətləri normativ tələblərə uyğun müəyyən edilir. |

## 25. Tətbiq mərhələləri və risklər

### 25.1. Mərhələlər

Mərhələlər inteqrasiya səviyyələrinə (bölmə 22) bağlıdır. İnteqrasiya hazır olmayanda platforma dayanmır: qurum nümayəndəsi tapşırıqları back-office interfeysi ilə icra edir, addım isə müvafiq bayraqla göstərilir. Beləliklə, Mərhələ 1 heç bir dövlət API-sindən asılı deyil.

Mərhələ 1-də: şirkət qeydiyyatı DVX-nin mövcud elektron xidmətinə yönləndirmə ilə, dövlət rüsumları mövcud elektron xidmətlərdə ödənilir; «Bank hesabı» mərhələsi investorun bankla birbaşa işi kimi izlənir (FİZİKİ); «Şikayət et» düyməsi Ombudsman mexanizmi işə düşənədək nəzarətçiyə tapşırıq yaradır və investora qurumun mövcud şikayət kanalını göstərir (Z-04). Qeyri-rezident investor bütün mərhələlərdə Marşrut D ilə gedə bilər — bu marşrut heç bir yeni inteqrasiyadan asılı deyil.

| Mərhələ | Modullar | Asılılıq |
| --- | --- | --- |
| 1 — Əsas platforma | Açıq portal, Marşrut kalkulyatoru, Təşviq uyğunluğu, KYA, giriş (e-poçt, ASAN Login), kabinet, Layihə pasportu, Vahid Müraciət, İlkin qiymətləndirmə, Case Management, statuslar və müddətlər, Bildirişlər, İnzibatçılıq, əsas analitika | Səviyyə 1 inteqrasiyaları; qurumlarla protokollar; qurum nümayəndələrinin təyini |
| 2 — Əməliyyat inteqrasiyaları | Şirkət qeydiyyatının DVX ilə elektron ötürülməsi, bank pilotu (2 bank), Ombudsman, Aftercare, dövlət rüsumlarının ödənişi, tərəfdaş kataloqu, ictimai hesabat | Səviyyə 2 protokolları və API-lər; Ombudsman mexanizminin institusional əsası |
| 3 — Tam uzaqdan model | Ehtiyac olarsa: qeyri-rezident e-imzası (ASAN İmza + virtual FİN) inteqrasiyası; uzaqdan bank hesabı, e-rezidentlik, xarici e-imzaların tanınması; müvafiq addımlar PLAN-dan ONLAYN/AVTO-ya keçir | Koordinatorun qərarı; səviyyə 3 qanunvericilik dəyişiklikləri |

### 25.2. Əsas risklər

| Risk | Təsiri | Azaldılması |
| --- | --- | --- |
| Qurumların inteqrasiyaya hazır olmaması | Avtomatlaşdırma gecikir | Back-office interfeysi ilə işləmə rejimi; PLAN bayrağı ilə dürüst göstərmə; mərhələli qoşulma |
| Qurumların müddətlərə riayət etməməsi | İnvestor etibarı azalır | Protokolla öhdəlik, avtomatik eskalasiya, rəhbərlik panelləri, ictimai hesabat |
| Normativ bazanın dəyişməsi | KYA və təşviq nəticələri köhnəlir | Qaydaların versiyalanması, məsul sahib, yenidən hesablama bildirişi (Z-05) |
| Bankların iştirakının məhdud olması | Qeyri-rezident üçün fiziki təmas qalır | 2 bankla pilot; Mərkəzi Bankla e-imza təşəbbüsü (22.1) |
| Sİ-nin səhv strukturlaşdırması | Yanlış prosedur siyahısı | İnvestor təsdiqi (FR-KYA-02), qərarın qayda mühərrikində olması, izah edilə bilənlik (FR-KYA-07) |
| Məlumat təhlükəsizliyi | Hüquqi və reputasiya riski | NFR-01…03, audit jurnalı, minimum səlahiyyət |

### 25.3. Koordinatorla dəqiqləşdiriləcək məsələlər

Koordinatorun cavabları sənədə daxil edilib: rol bölgüsü (1.6), e-imzaya ehtiyacın olmaması (9.1, 25.1), şirkət qeydiyyatı sənədləri (9.1), investisiya məbləğinin yaşayış icazəsinə təsiri (FR-ROUTE-06), xarici işçi və yaşayış icazəsi (10.1). Aşağıdakılar cavab gözləyir:

| № | Məsələ | Sənəddə təsiri |
| --- | --- | --- |
| 1 | Siyahıdakı hər sənədin hazırda elektron və ya ənənəvi qaydada təqdim olunması | Bayraqlar (1.3), sənəd siyahısı (9.1) |
| 2 | Tikinti olduqda prosesin ardıcıllığı: torpaq, layihə, ekspertiza, icazə, qoşulmalar, istismara qəbul | Pasportun zaman xətti (10.1), KYA qaydaları |
| 3 | AZPROMO və Nazirliyin digər tabeli qurumlarının rolları | Rollar (5), idarəetmə modeli (1.6) |
| 4 | Case manager və nəzarətçi heyətinin mənsubiyyəti və sayı | Rollar (5), Case Management (13) |
| 5 | İnvestisiya Ombudsmanının institusional statusu | Bölmə 15, Mərhələ 2 |
| 6 | Müvəqqəti yaşamaq icazəsində şəxsən iştirak (biometrik məlumat) tələbi | Bayraq (10.1), fiziki təmas sayı |
| 7 | Nümayəndə vasitəsilə qeydiyyatda sənəd orijinallarının təqdimi qaydası | Marşrut D (9.2) |

*Faktların yoxlanması: qeyri-rezidentlərə e-imza verilməsi qaydası, MMC-nin elektron qeydiyyatının rüsumsuzluğu, investisiya təşviqi sənədinin güzəştləri, verilmə müddəti və strateji istiqamətləri, Su Ehtiyatları Agentliyinin adı 21.09.2026 tarixinə rəsmi mənbələrlə tutuşdurulub; rol bölgüsü, şirkət qeydiyyatı sənədləri, yaşayış və iş icazəsi şərtləri Koordinatorun cavablarına əsaslanır. Bankların təcrübəsi, qurumların inteqrasiya imkanları və 25.3-dəki məsələlər ayrıca təsdiqlənməlidir.*
