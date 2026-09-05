'use client';
import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { model, sampleAt, stages, type Flow, type Parameters, type Sample } from '@/lib/engine-model';
const series = [{ key: 'pressure', name: 'Toplam basınç', en: 'Pressure', color: '#b3a0f9' }, { key: 'temperature', name: 'Toplam sıcaklık', en: 'Temperature', color: '#ffaf72' }, { key: 'velocity', name: 'Eksenel hız', en: 'Velocity', color: '#64dcd1' }] as const;
export default function ProfileChart({ parameters, stage, trackedX, trackedFlow, onStage }: { parameters: Parameters; stage: number; trackedX?: number; trackedFlow?: Flow; onStage: (s: number) => void }) {
  const [flow, setFlow] = useState<Flow>('core');
  const [visible, setVisible] = useState({ pressure: true, temperature: true, velocity: true });
  useEffect(() => { if (trackedFlow) setFlow(trackedFlow); }, [trackedFlow]);
  useEffect(() => { if (parameters.bypass === 0) setFlow('core'); }, [parameters.bypass]);
  const values = model(parameters)[flow];
  const x = (v: number) => 42 + (v - 40) / 1040 * 934;
  const y = (v: number) => 167 - v * 137;
  const cursor = trackedX ?? stages[stage].x;
  const sample = sampleAt(values, cursor);
  const line = (key: keyof Omit<Sample, 'x'>) => values.map((s, i) => `${i ? 'L' : 'M'}${x(s.x).toFixed(1)},${y(s[key]).toFixed(1)}`).join(' ');
  return <section className="panel chart-panel" aria-label="Motor boyunca basınç, sıcaklık ve hız grafikleri">
    <div className="panel-head"><div className="panel-title"><Activity size={16}/><h2>Akışın profili</h2><span className="live-dot"/></div><div className="segmented small"><Button variant="ghost" aria-pressed={flow === 'core'} onClick={() => setFlow('core')}>Core</Button><Button variant="ghost" aria-pressed={flow === 'bypass'} disabled={parameters.bypass === 0} onClick={() => setFlow('bypass')}>Bypass</Button></div></div>
    <div className="chart-key">{series.map(s => <button key={s.key} aria-pressed={visible[s.key]} onClick={() => setVisible(v => ({ ...v, [s.key]: !v[s.key] }))} className={visible[s.key] ? '' : 'muted-series'}><i style={{ background: s.color }}/>{s.name}<span>{s.en}</span></button>)}<span className="normalized">Sabit ölçek · 0–1</span></div>
    <svg viewBox="0 0 1010 210" className="profile-chart" role="img" aria-label={`${flow} akışı için normalize toplam basınç, toplam sıcaklık ve eksenel hız profili`}>
      {[0, .5, 1].map(v => <g key={v}><path d={`M42 ${y(v)}H976`} stroke="#273b4d" strokeDasharray="3 6"/><text x="13" y={y(v) + 4} fill="#8297ab" fontSize="11">{v.toFixed(1)}</text></g>)}
      {stages.map((s, i) => <g key={s.en} role="button" tabIndex={0} aria-label={`${s.name} profilini incele`} className="chart-stage" onClick={() => onStage(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStage(i); } }}><rect x={x(s.x)-33} y="17" width="66" height="183" fill={i === stage ? '#64dcd109' : 'transparent'}/><path d={`M${x(s.x)} 28V172`} stroke="#213446" strokeDasharray="3 5"/><text x={x(s.x)} y="196" textAnchor="middle" fill={i === stage ? '#64dcd1' : '#8297ab'} fontSize="11">{['Giriş', 'Fan', 'Kompresör', 'Yanma', 'Türbin', 'Nozül', 'Jet'][i]}</text></g>)}
      {series.filter(s => visible[s.key]).map(s => <path key={s.key} d={line(s.key)} fill="none" stroke={s.color} strokeWidth="2.7" strokeLinejoin="round"/>)}
      <path d={`M${x(cursor)} 23V170`} stroke="#cfdae1" opacity=".35"/>
      {series.filter(s => visible[s.key]).map(s => <circle key={s.key} cx={x(cursor)} cy={y(sample[s.key])} r="4" fill={s.color} stroke="#101e2d" strokeWidth="2"/>)}
    </svg>
    <p className="chart-note">{flow === 'core' ? 'Sıkıştırmada P₀ ve T₀ artar; yanmada T₀ yükselir; türbinlerde ikisi de azalır.' : 'Bypass havası fandan enerji alır. Yanma odası ve türbinlerden geçmez.'} Her değişkenin ölçeği ayrıdır; çizgilerin kesişmesi eşit fiziksel değer anlamına gelmez.</p>
  </section>;
}
