# Mərhələ şablonları

Mənbə: «ASAN Invest — Texniki tapşırıq», Əlavə A (A.1–A.8). Mərhələ nömrələri mənbədəki kimidir.
Hər mərhələdə iştirak edən qurumlar `institutions.md` kataloqundan götürülür.

Sütunlar:
- Növ: Məcburi / Şərti / Könüllü
- Yol: Hamısı / Pay / Kapital / ASC
- Etiket (vergüllə): `incentive` təşviq sənədi, `land` torpaq, `foreignworker` xarici işçi, `construction` tikinti,
  `competition` rəqabət razılığı, `needs-competition` razılıq alınana qədər bloklanır,
  `registry-change` reyestr dəyişikliyi (xarici təsisçi ilə pay alınmasında yalnız kağız), `alt-channel` 2.1/2.2 alternativi,
  `registration` şirkətin dövlət qeydiyyatı
- Sual: şərti mərhələnin bəli/xeyr sualı
- Son tarix: `3m<-1` = 1-ci mərhələ tamamlanandan 3 ay sonra; `15d/40d<-manual` = investorun qeyd etdiyi tarixdən 15 gün (xarici təsisçi, kağız müraciətdə 40 gün)

## H-R-0 | Hüquqi şəxs · Rezident · Sıfırdan

| № | Mərhələ | Növ | Yol | Müddət | Etiket | Sual | Son tarix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Şirkətin qeydiyyatı | Məcburi | Hamısı | 1 iş günü | registration | | |
| 2 | Bank hesabının açılması | Məcburi | Hamısı | — | | | |
| 3 | Nizamnamə kapitalı | Məcburi | Hamısı | ən gec 3 ay | | | 3m<-1 |
| 4 | İnvestisiya təşviqi sənədi | Könüllü | Hamısı | 5 iş günü · 70 AZN | incentive | | |
| 5 | Yer / torpaq (sənaye məhəlləsi) | Şərti | Hamısı | — | land | Torpaq sahəsi lazımdır? | |
| 6 | Xarici işçi | Şərti | Hamısı | 1 ilədək icazə | foreignworker | Xarici işçi cəlb olunacaq? | |
| 7 | Tikinti | Şərti | Hamısı | — | construction | Tikinti nəzərdə tutulur? | |
| 8 | Lisenziya və icazələr | Şərti | Hamısı | — | license | Lisenziya və ya icazə tələb olunan fəaliyyət var? | |
| 9 | Fəaliyyətə başlama | Məcburi | Hamısı | — | | | |

## H-Q-0 | Hüquqi şəxs · Qeyri-rezident · Sıfırdan

| № | Mərhələ | Növ | Yol | Müddət | Etiket | Sual | Son tarix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Onlayn müraciətə hazırlıq | Məcburi | Hamısı | virtual FİN 3 iş günü | | | |
| 1 | Layihə şirkətinin qeydiyyatı | Məcburi | Hamısı | 2 gün | registration | | |
| 2 | Bank hesabının açılması | Məcburi | Hamısı | — | | | |
| 3 | Nizamnamə kapitalının qoyulması | Məcburi | Hamısı | ən gec 3 ay | | | 3m<-1 |
| 4 | İnvestisiya təşviqi sənədi | Könüllü | Hamısı | 5 iş günü · 70 AZN | incentive | | |
| 5 | Yer / torpaq | Şərti | Hamısı | — | land | Torpaq sahəsi lazımdır? | |
| 6 | Xarici işçi | Şərti | Hamısı | 1 ilədək icazə | foreignworker | Xarici işçi cəlb olunacaq? | |
| 7 | Tikinti | Şərti | Hamısı | — | construction | Tikinti nəzərdə tutulur? | |
| 8 | Lisenziya və icazələr | Şərti | Hamısı | İN lisenziyaları 10 iş günü | license | Lisenziya və ya icazə tələb olunan fəaliyyət var? | |
| 9 | Fəaliyyətə başlama | Məcburi | Hamısı | — | | | |

## H-R-M | Hüquqi şəxs · Rezident · Mövcud (pay və kapital)

| № | Mərhələ | Növ | Yol | Müddət | Etiket | Sual | Son tarix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Layihənin yoxlanılması | Məcburi | Hamısı | — | | | |
| 2 | İnvestisiyanın formasının seçilməsi | Məcburi | Hamısı | — | | | |
| 3 | İştirakçıların üstünlük hüququ | Şərti | Pay | 1 ay | | Satıcı yeganə iştirakçı deyil, üstünlük hüququ var? | |
| 4 | İlkin razılaşma | Məcburi | Hamısı | — | | | |
| 5 | Rəqabət orqanının razılığı | Şərti | Hamısı | 30 gün ərzində ərizə | competition | Rəqabət orqanının razılığı tələb olunur? | 30d<-4 |
| 6 | Pay alqı-satqı müqaviləsi | Məcburi | Pay | ƏMDX arayışı ~1 həftə | needs-competition | | |
| 7 | Ödəniş | Məcburi | Hamısı | — | | | |
| 8 | Reyestrdə dəyişiklik | Məcburi | Hamısı | 15 gün ərzində müraciət | needs-competition, registry-change | | 15d<-manual |
| 9 | İdarəetmənin təhvili | Məcburi | Hamısı | — | | | |

## H-Q-M | Hüquqi şəxs · Qeyri-rezident · Mövcud (pay və kapital)

| № | Mərhələ | Növ | Yol | Müddət | Etiket | Sual | Son tarix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Hazırlıq | Məcburi | Hamısı | — | | | |
| 1 | Rəqabət və tənzimləyici razılıqlar | Şərti | Hamısı | 30 iş günü (+2×30) | competition | Rəqabət və ya tənzimləyici razılıq tələb olunur? | 30d<-manual |
| 2.1 | Mövcud iştirakçıdan payın alınması | Məcburi | Pay | — | needs-competition | | |
| 2.2 | Nizamnamə kapitalının artırılması | Məcburi | Kapital | — | | | |
| 2.3 | Səhmdar cəmiyyətinin səhmlərinin alınması | Şərti | ASC | — | | Şirkət səhmdar cəmiyyətidir? | |
| 3 | Dəyişikliklərin dövlət qeydiyyatı | Məcburi | Hamısı | elektron 3 gün · kağız 5 iş günü | needs-competition, registry-change | | 15d/40d<-manual |
| 4 | Bankda məlumatların yenilənməsi | Məcburi | Hamısı | — | | | |
| 5 | Mövcud hüquq və müqavilələr üzrə tədbirlər | Şərti | Hamısı | — | | Müqavilələrdə nəzarət dəyişikliyi şərti var? | |
| 6 | İnvestisiya təşviqi sənədi | Könüllü | Hamısı | 5 iş günü · 70 AZN | incentive | | |
| 7 | Layihənin genişləndirilməsi | Şərti | Hamısı | — | construction | Layihə genişləndirilir (torpaq, tikinti, lisenziya)? | |
| 8 | Xarici işçi | Şərti | Hamısı | 1 ilədək icazə | foreignworker | Xarici işçi cəlb olunacaq? | |
| 9 | Fəaliyyətin davam etdirilməsi | Məcburi | Hamısı | — | | | |

## F-R-0 | Fiziki şəxs · Vətəndaş · Sıfırdan

| № | Mərhələ | Növ | Yol | Müddət | Etiket | Sual | Son tarix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Dövlət qeydiyyatına hazırlıq | Məcburi | Hamısı | — | | | |
| 1 | Müraciət kanalının seçilməsi | Məcburi | Hamısı | — | | | |
| 2.1 | Elektron qaydada müraciət | Məcburi | Hamısı | rüsumsuz | alt-channel | | |
| 2.2 | Kağız qaydada müraciət | Məcburi | Hamısı | 5 / 15 AZN | alt-channel | | |
| 3 | Müraciətin icrası və dövlət qeydiyyatı | Məcburi | Hamısı | elektron 1 gün · kağız 2 iş günü | registration | | |
| 4 | Şirkət üzrə elektron imzanın əldə edilməsi | Məcburi | Hamısı | — | | | |
| 5 | Bank hesabının açılması | Məcburi | Hamısı | — | | | |
| 6 | Nizamnamə kapitalının ödənilməsi | Məcburi | Hamısı | ən gec 3 ay | | | 3m<-3 |
| L1 | İnvestisiya təşviqi sənədi | Könüllü | Hamısı | 5 iş günü · 70 AZN | incentive | | |
| L2 | Yer / torpaq (sənaye məhəlləsi) | Şərti | Hamısı | — | land | Torpaq sahəsi lazımdır? | |
| L3 | Xarici işçi | Şərti | Hamısı | 1 ilədək icazə | foreignworker | Xarici işçi cəlb olunacaq? | |
| L4 | Tikinti | Şərti | Hamısı | — | construction | Tikinti nəzərdə tutulur? | |
| 7 | Fəaliyyətə başlama üçün hazırlıq | Məcburi | Hamısı | — | | | |

## F-Q-0 | Fiziki şəxs · Əcnəbi · Sıfırdan

| № | Mərhələ | Növ | Yol | Müddət | Etiket | Sual | Son tarix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Dövlət qeydiyyatına hazırlıq | Məcburi | Hamısı | — | | | |
| 1 | Müraciət kanalının seçilməsi | Məcburi | Hamısı | — | | | |
| 2.1 | Elektron qaydada müraciət | Məcburi | Hamısı | rüsumsuz | alt-channel | | |
| 2.2 | Kağız qaydada müraciət | Məcburi | Hamısı | 5 / 15 AZN | alt-channel | | |
| 3 | Müraciətin icrası və dövlət qeydiyyatı | Məcburi | Hamısı | elektron 2 gün · kağız 2 iş günü | registration | | |
| 4 | Şirkət üzrə elektron imzanın əldə edilməsi | Məcburi | Hamısı | — | | | |
| 5 | Bank hesabının açılması | Məcburi | Hamısı | — | | | |
| 6 | Nizamnamə kapitalının ödənilməsi | Məcburi | Hamısı | ən gec 3 ay | | | 3m<-3 |
| L1 | İnvestisiya təşviqi sənədi | Könüllü | Hamısı | 5 iş günü · 70 AZN | incentive | | |
| L2 | Yer / torpaq (sənaye məhəlləsi) | Şərti | Hamısı | — | land | Torpaq sahəsi lazımdır? | |
| L3 | Xarici işçi | Şərti | Hamısı | 1 ilədək icazə | foreignworker | Xarici işçi cəlb olunacaq? | |
| L4 | Tikinti | Şərti | Hamısı | — | construction | Tikinti nəzərdə tutulur? | |
| 7 | Fəaliyyətə başlama üçün hazırlıq | Məcburi | Hamısı | — | | | |

## F-R-M | Fiziki şəxs · Vətəndaş · Mövcud (pay və kapital)

| № | Mərhələ | Növ | Yol | Müddət | Etiket | Sual | Son tarix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Daxilolma formasının müəyyən edilməsi | Məcburi | Hamısı | — | | | |
| 1 | Şirkətin və payın ilkin yoxlanılması | Məcburi | Hamısı | — | | | |
| 2 | Rəqabət və digər tənzimləyici razılıqlar | Şərti | Hamısı | — | competition | Rəqabət və ya tənzimləyici razılıq tələb olunur? | 30d<-manual |
| 3.1 | Mövcud iştirakçıdan payın alınması | Məcburi | Pay | — | needs-competition | | |
| 3.2 | Kapital artırılması yolu ilə daxilolma | Məcburi | Kapital | — | | | |
| 4 | Dəyişikliklərin dövlət qeydiyyatı | Məcburi | Hamısı | 15 gün ərzində · 5 iş günü | needs-competition, registry-change | | 15d<-manual |
| 5 | Bank məlumatlarının yenilənməsi | Məcburi | Hamısı | — | | | |
| 6 | Mövcud hüquq və öhdəliklərin davam etdirilməsi | Məcburi | Hamısı | — | | | |

## F-Q-M | Fiziki şəxs · Əcnəbi · Mövcud (pay və kapital)

| № | Mərhələ | Növ | Yol | Müddət | Etiket | Sual | Son tarix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Daxilolma formasının müəyyən edilməsi | Məcburi | Hamısı | — | | | |
| 1 | Şirkətin və payın ilkin yoxlanılması | Məcburi | Hamısı | — | | | |
| 2 | Rəqabət və digər tənzimləyici razılıqlar | Şərti | Hamısı | — | competition | Rəqabət və ya tənzimləyici razılıq tələb olunur? | 30d<-manual |
| 3.1 | Mövcud iştirakçıdan payın alınması | Məcburi | Pay | — | needs-competition | | |
| 3.2 | Kapital artırılması yolu ilə daxilolma | Məcburi | Kapital | — | | | |
| 4 | Dəyişikliklərin dövlət qeydiyyatı | Məcburi | Hamısı | 15 gün ərzində · 5 iş günü | needs-competition, registry-change | | 15d/40d<-manual |
| 5 | Bank məlumatlarının yenilənməsi | Məcburi | Hamısı | — | | | |
| 6 | Mövcud hüquq və öhdəliklərin davam etdirilməsi | Məcburi | Hamısı | — | | | |
