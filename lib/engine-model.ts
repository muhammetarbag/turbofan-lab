// Kavramsal ve boyutsuz öğretim modeli. Bir motor çevrim çözücüsü değildir.
export type Flow = 'core' | 'bypass';
export type Parameters = { fan: number; throttle: number; bypass: number; incoming: number };
export type Sample = { x: number; pressure: number; temperature: number; velocity: number };
export const defaults: Parameters = { fan: 75, throttle: 65, bypass: 8, incoming: 25 };
export const clamp = (n: number, min = 0, max = 1): number => Math.min(max, Math.max(min, n));
export const stages = [
  { name: 'Hava girişi', en: 'Intake', x: 90, title: 'Her şey havayla başlar.', text: 'Giriş ağzı havayı fana yönlendirir. Hava henüz yanma odasına ulaşmamıştır. Motor içindeki akış soldan sağadır.', insight: 'Hava ilerler; motor ise havayı geriye hızlandırdığı için ileri itilir.', tags: ['Ortam havası', 'Akış yönü →'] },
  { name: 'Fan', en: 'Fan', x: 205, title: 'Bir fan, iki ayrı yol.', text: 'Fan büyük bir hava kütlesine enerji aktarır. Havanın bir kısmı çekirdeğe girerken büyük kısmı bypass kanalından geçer.', insight: 'Yüksek bypass oranında havanın çoğu yakıtla hiç karşılaşmaz.', tags: ['Basınç ↑', 'Bypass + core'] },
  { name: 'Sıkıştırma', en: 'Compression', x: 430, title: 'Daha yüksek basınç.', text: 'Önce düşük, sonra yüksek basınç kompresörü havaya iş aktarır. Toplam basınç ve sıcaklık artar. Daralan geçitler, yoğunlaşan havaya uyum sağlar.', insight: 'Basıncın artması, eksenel hızın sürekli artması demek değildir. Rotor ve stator sıraları birlikte çalışır.', tags: ['Basınç ↑↑', 'Sıcaklık ↑'] },
  { name: 'Yanma', en: 'Combustion', x: 600, title: 'Yakıt, akışa enerji ekler.', text: 'Yakıt sıkıştırılmış havayla yanar. Sıcaklık belirgin biçimde yükselir. Yanma odasındaki akış alevi tutacak şekilde yavaşlatılır.', insight: 'Yanma odası bir kompresör değildir: gerçek motorda toplam basınç burada biraz düşer.', tags: ['Sıcaklık ↑↑', 'Basınç hafif ↓'] },
  { name: 'Türbin', en: 'Turbine expansion', x: 753, title: 'Enerjinin bir kısmı geri döner.', text: 'Sıcak gaz türbinlerde genişlerken toplam basıncı ve sıcaklığı düşer. Türbinler gazdan iş alır ve şaftlarla fanı ve kompresörleri döndürür.', insight: 'HPT → yüksek basınç şaftı → HPC. LPT → düşük basınç şaftı → fan ve LPC.', tags: ['Şaft işi ↶', 'Basınç ve sıcaklık ↓'] },
  { name: 'Egzoz', en: 'Exhaust', x: 936, title: 'Kalan enerji, çıkış hızına.', text: 'Çekirdek nozülü kalan enerjinin bir kısmını jetin hızına dönüştürür. Bypass havası ayrı çıkışından, daha soğuk bir akış olarak çıkar.', insight: 'Nozülde statik basınç azalırken hız artabilir; ideal nozülde toplam basınç yaklaşık sabittir.', tags: ['Hız ↑', 'İki ayrı çıkış'] },
  { name: 'Net itki', en: 'Net thrust', x: 1020, title: 'Hava geriye, motor ileriye.', text: 'Havanın çıkıştaki momentumu giriştekinden büyüktür. Çekirdek ve bypass akışlarının momentum değişimleri toplanır; motor ters yönde itilir.', insight: 'İtki ≈ kütlesel debi × hız değişimi. Bu anlatımda basınç itkisi ve yakıtın eklediği kütle ihmal edilir.', tags: ['Motor ←', 'Hava →'] },
] as const;
export const components = [
  { name: 'Fan', tr: 'Ön fan', x: 205, y: 80, stage: 1, text: 'Büyük miktarda havayı hızlandırır. Yüksek bypass oranında itkinin önemli bölümü bu havadan gelir.' },
  { name: 'Bypass kanalı', tr: 'Çekirdeğin çevresindeki yol', x: 400, y: 87, stage: 1, text: 'Hava yanma odasına girmeden motorun çevresinden geçer; fanın aktardığı enerjiyle itkiye katkı sağlar.' },
  { name: 'LP compressor', tr: 'Düşük basınç kompresörü', x: 315, y: 352, stage: 2, text: 'İlk sıkıştırmayı yapar. Fanla birlikte düşük basınç türbininin döndürdüğü şafta bağlıdır.' },
  { name: 'HP compressor', tr: 'Yüksek basınç kompresörü', x: 442, y: 391, stage: 2, text: 'Havanın toplam basıncını ve sıcaklığını daha fazla artırır; gücünü yüksek basınç türbininden alır.' },
  { name: 'Combustion chamber', tr: 'Yanma odası', x: 600, y: 94, stage: 3, text: 'Yakıtın kimyasal enerjisi akışa ısı olarak eklenir. Sıcaklık artar, toplam basınçta küçük bir kayıp olur.' },
  { name: 'HP turbine', tr: 'Yüksek basınç türbini', x: 701, y: 352, stage: 4, text: 'Gazdan iş alır ve yüksek basınç kompresörüne kendi şaftıyla aktarır.' },
  { name: 'LP turbine', tr: 'Düşük basınç türbini', x: 791, y: 391, stage: 4, text: 'Gazdan aldığı işi içteki uzun şaft üzerinden fan ve düşük basınç kompresörüne iletir.' },
  { name: 'Core nozzle', tr: 'Çekirdek egzoz nozülü', x: 943, y: 352, stage: 5, text: 'Türbinlerden sonra gazda kalan enerjinin bir kısmını çıkış hızına dönüştürür.' },
  { name: 'Bypass exhaust', tr: 'Bypass çıkışı', x: 886, y: 88, stage: 5, text: 'Yanma odasından geçmeyen, daha soğuk hava burada motordan çıkar.' },
] as const;

export function model(p: Parameters) {
  const t = clamp(p.throttle / 100), f = clamp(p.fan / 100), incoming = clamp(p.incoming / 100);
  const bypass = clamp(p.bypass, 0, 12);
  const lp = (0.22 + 0.78 * t) * (0.35 + 0.65 * f);
  const hp = 0.3 + 0.7 * t;
  const mc = 0.35 + 0.55 * t + 0.1 * incoming;
  const mb = mc * bypass;
  const coreDelta = 0.21 + 0.52 * t - incoming * 0.12;
  const bypassDelta = (0.08 + 0.38 * lp) / (1 + bypass * 0.025) - incoming * 0.045;
  const coreThrust = mc * coreDelta, bypassThrust = mb * bypassDelta;
  return { lp, hp, coreMass: mc, bypassMass: mb, bypassFraction: bypass / (1 + bypass), coreDelta, bypassDelta,
    coreThrust, bypassThrust, thrust: (coreThrust + bypassThrust) / 5.5,
    core: [
      { x: 40, pressure: 0.08, temperature: 0.12, velocity: 0.12 + incoming * 0.22 },
      { x: 195, pressure: 0.08, temperature: 0.12, velocity: 0.1 + incoming * 0.16 },
      { x: 260, pressure: 0.1 + lp * 0.1, temperature: 0.13 + lp * 0.04, velocity: 0.17 + lp * 0.15 },
      { x: 350, pressure: 0.17 + hp * 0.17, temperature: 0.17 + hp * 0.09, velocity: 0.14 + hp * 0.13 },
      { x: 500, pressure: 0.3 + hp * 0.64, temperature: 0.21 + hp * 0.24, velocity: 0.12 + hp * 0.1 },
      { x: 535, pressure: (0.3 + hp * 0.64) * 0.99, temperature: 0.21 + hp * 0.24, velocity: 0.09 + hp * 0.05 },
      { x: 655, pressure: (0.3 + hp * 0.64) * 0.95, temperature: 0.5 + t * 0.48, velocity: 0.12 + hp * 0.08 },
      { x: 725, pressure: 0.2 + hp * 0.3, temperature: 0.35 + t * 0.31, velocity: 0.18 + hp * 0.1 },
      { x: 825, pressure: 0.12 + hp * 0.09, temperature: 0.26 + t * 0.2, velocity: 0.2 + hp * 0.12 },
      { x: 955, pressure: 0.12 + hp * 0.085, temperature: 0.26 + t * 0.2, velocity: 0.12 + incoming * 0.22 + coreDelta },
      { x: 1080, pressure: 0.12 + hp * 0.085, temperature: 0.26 + t * 0.2, velocity: 0.12 + incoming * 0.22 + coreDelta },
    ] satisfies Sample[],
    bypass: [
      { x: 40, pressure: 0.08, temperature: 0.12, velocity: 0.12 + incoming * 0.22 },
      { x: 195, pressure: 0.08, temperature: 0.12, velocity: 0.1 + incoming * 0.16 },
      { x: 260, pressure: 0.1 + lp * 0.1, temperature: 0.13 + lp * 0.04, velocity: 0.17 + lp * 0.15 },
      { x: 840, pressure: 0.095 + lp * 0.095, temperature: 0.13 + lp * 0.04, velocity: 0.17 + lp * 0.14 },
      { x: 955, pressure: 0.095 + lp * 0.09, temperature: 0.13 + lp * 0.04, velocity: 0.12 + incoming * 0.22 + bypassDelta },
      { x: 1080, pressure: 0.095 + lp * 0.09, temperature: 0.13 + lp * 0.04, velocity: 0.12 + incoming * 0.22 + bypassDelta },
    ] satisfies Sample[],
  };
}
export type EngineModel = ReturnType<typeof model>;
export function sampleAt(samples: Sample[], x: number): Sample {
  if (x <= samples[0].x) return { ...samples[0], x };
  const b = samples.findIndex(s => s.x >= x);
  if (b < 0) return { ...samples[samples.length - 1], x };
  const a = samples[b - 1], z = samples[b], t = (x - a.x) / (z.x - a.x);
  return { x, pressure: a.pressure + (z.pressure - a.pressure) * t, temperature: a.temperature + (z.temperature - a.temperature) * t, velocity: a.velocity + (z.velocity - a.velocity) * t };
}
export function stageAt(x: number): number { return x < 175 ? 0 : x < 275 ? 1 : x < 520 ? 2 : x < 670 ? 3 : x < 835 ? 4 : x < 980 ? 5 : 6; }
export function flowY(x: number, lane: number, flow: Flow): number {
  const side = lane < 0 ? -1 : 1, k = Math.abs(lane);
  const nodes = flow === 'bypass'
    ? [[40, 94 + k * 36], [195, 94 + k * 36], [310, 106 + k * 25], [660, 101 + k * 24], [870, 88 + k * 22], [1080, 83 + k * 22]]
    : [[40, 40 + k * 34], [195, 42 + k * 30], [285, 52 + k * 25], [500, 34 + k * 17], [560, 42 + k * 24], [655, 43 + k * 22], [720, 40 + k * 23], [825, 39 + k * 22], [940, 25 + k * 19], [1080, 30 + k * 23]];
  const i = nodes.findIndex(n => n[0] >= x);
  if (i <= 0) return 225 + side * nodes[i < 0 ? nodes.length - 1 : 0][1];
  const a = nodes[i - 1], b = nodes[i], t = (x - a[0]) / (b[0] - a[0]);
  return 225 + side * (a[1] + (b[1] - a[1]) * t);
}
export function particleColor(s: Sample, flow: Flow, temperature: boolean): string {
  if (!temperature) return flow === 'bypass' ? '#5be0d5' : '#ffaf72';
  const t = clamp((s.temperature - 0.12) / 0.86);
  return `hsl(${182 - t * 177} 90% ${69 - t * 8}%)`;
}
