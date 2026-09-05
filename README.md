# Turbofan Lab

Türkçe, etkileşimli turbofan öğretim uygulaması. Motor kesiti ve akışlar SVG ile çizilir; rotor projeksiyonları ve parçacıklar `requestAnimationFrame` ile hareket eder. Harici görsel, API veya hesap gerektirmez.

## Herkese açık uygulama

[Uygulamayı aç](https://muhammetarbag.github.io/turbofan-lab/) · [Kaynak kod](https://github.com/muhammetarbag/turbofan-lab)

`main` dalına gönderilen değişiklikler GitHub Actions ile test edilip GitHub Pages üzerinde yayımlanır. Pages için `/turbofan-lab` yol öneki yalnızca `GITHUB_PAGES=true` derlemesinde eklenir. Yerel geliştirme kök adreste çalışır.

## Çalıştırma

Node.js 22.18+ ve npm gerekir.

```sh
npm ci
npm run dev -- --port 3006
```

Üretim çıktısı ve yerel önizleme:

```sh
npm run build
npm run preview -- --port 4173
```

Statik site `dist/client/` içinde oluşur. Bu klasör herhangi bir statik sunucu ile sunulabilir. `index.html` dosyasını `file://` ile açmak yerine HTTP sunucusu kullanın.

## Kullanım

- **Kesiti keşfet:** dokuz parça, yedi aşama. Parçanın üzerine gelince bilgi kartı; tıklama veya klavyeyle seçimde ilgili aşama. Aşama seçiminde animasyon durur.
- **Interactive Lab:** fan hızı, gaz, bypass oranı, giriş hızı; anlık akış profilleri, debi bölüşümü ve göreli itki. Dört deney ayrı başlangıç koşulları oluşturur.
- **Compare Mode:** turbojet, 1:1 düşük bypass ve 10:1 yüksek bypass örnekleri. Turbojet şemasında fan ve dış bypass kanalı çizilmez. Bunlar aynı ölçekli gerçek motor tasarımları değildir.
- **Mini quiz:** dört soru, anında açıklama, ilgili bölümün kesitte vurgulanması ve toplam sonuç.
- **Kontroller:** oynat/duraklat, tüm ayarları sıfırla, 0.25x/0.5x/1x/2x, Slow Motion, tek kare ilerletme, seçili bölgeye yakınlaştırma, X-Ray, şaftlar, enerji görünümü, etiket/akış/sıcaklık/basınç katmanları.
- **Parçacık takibi:** 4. deneyi başlatın, bir parçacığa tıklayın veya Core/Bypass düğmesini kullanın. Beyaz halka seçilen rota boyunca ilerler; grafiğin imleci ve özellik göstergeleri birlikte değişir. Çıkışta takip durur. Aynı rota düğmesiyle yeni yolculuk başlatılabilir.
- Azaltılmış hareket tercihi bulunan cihazlarda başlangıç duraklatılmıştır. Kullanıcı Oynat ile hareketi başlatabilir.

## Fizik sınırları

`lib/engine-model.ts` bir çevrim veya CFD çözücüsü değildir. Boyutsuz eğriler öğretim için seçilmiştir; gerçek motor değerleriyle kalibre edilmemiştir. Parametre yüzdeleri RPM veya m/s değildir; 0 gaz rölantiyi temsil eder. Fan ve gaz kontrolleri kavramları ayrı inceletir; gerçek motorun mekanik ve termodinamik bağımlılıklarını çözmez.

- Basınç ve sıcaklık **toplam/durma** özellikleridir. Hız eksenel hızdır. Her özellik için sabit fakat birbirinden farklı normalizasyon ölçeği kullanılır.
- Kompresör P₀/T₀ artırır, yanma T₀ artırırken küçük P₀ kaybı gösterir. Türbin P₀/T₀ düşürür. Nozül hızlandırır, toplam sıcaklık artışı üretmez.
- Bypass/çekirdek kütlesel debi oranı tanımına uyar. Bypass değişiminde çekirdek debisi sabit tutulur. Görsel parçacıklar tek tek moleküller veya çözülmüş yoğunluk alanı değildir.
- Göreli itki iki akışın `ṁ × ΔV` katkısının toplamıdır. Basınç itkisi ve yakıtın eklediği kütle ihmal edilir. Gösterge gerçek motorları karşılaştırmaya veya optimize etmeye uygun değildir.
- Enerji görünümü gazdan şaft işine ayrılan kolu egzoza devam eden koldan ayırır; sayısal enerji dengesi sağlamaz.
- Şaft renkleri: turkuaz LPT–fan–LPC, mor HPT–HPC. İki eşmerkezli şaft çizim kolaylığı için ayrıştırılmıştır.

## Doğrulama

```sh
npm test
npm run typecheck
npm run build
```

Model testleri debi oranını, kompresör/yanma/türbin/nozül ilişkilerini, kontrol tepkilerini, ayrı akış rotalarını, itki toplamını ve 108 uç/ara parametre kombinasyonunda sonlu ve sınırlı profilleri kontrol eder. Tarayıcıda otomatik tıklama veya görsel regresyon testi bu teslimata dahil değildir.

## Kaynaklar

- [NASA Glenn — Turbofan Thrust](https://www.grc.nasa.gov/www/k-12/airplane/turbfan.html)
- [NASA Glenn — Brayton Cycle](https://www.grc.nasa.gov/www/k-12/BGP/brayton.html)
- [NASA Glenn — Burner Thermodynamics](https://www.grc.nasa.gov/WWW/BGH/burnth.html)

## Dosyalar

- `app/page.tsx`: arayüz, deney ve quiz durumları.
- `components/engine.tsx`: motor geometrisi, rotor projeksiyonları, animasyon ve parçacık takibi.
- `components/profile-chart.tsx`: etkileşimli normalize profil grafikleri.
- `lib/engine-model.ts`: kavramsal model, aşama ve parça açıklamaları.
- `lib/quiz.ts`: sorular ve cevap açıklamaları.
- `app/globals.css`: masaüstü ve mobil görünüm.

Uygulama `Okul/turbofan-lab/` altında bağımsızdır. Üst dizindeki ders dosyaları değiştirilmez.
