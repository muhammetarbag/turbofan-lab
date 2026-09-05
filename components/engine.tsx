'use client';
import { memo, useEffect, useId, useRef, useState } from 'react';
import { components, clamp, flowY, model, stages, particleColor, sampleAt, stageAt, type Flow, type Parameters, type Sample } from '@/lib/engine-model';
export type ViewOptions = { labels: boolean; airflow: boolean; temperature: boolean; pressure: boolean; shafts: boolean; xray: boolean; energy: boolean };
export type Tracked = { flow: Flow; x: number; stage: number; sample: Sample; finished: boolean };
type Props = { parameters: Parameters; playing: boolean; speed: number; stage: number; options: ViewOptions; reset: number; zoom?: number; follow?: Flow | null; followKey?: number; followStart?: number; followLane?: number; stepId?: number; onTrack?: (p: Tracked) => void; onPick?: (flow: Flow, x: number, lane: number) => void; onStage?: (stage: number) => void; compact?: boolean };
const rotors = [
  { x: 205, r: 135, spool: 'lp' }, { x: 295, r: 75, spool: 'lp' }, { x: 321, r: 69, spool: 'lp' }, { x: 347, r: 61, spool: 'lp' },
  ...[382, 408, 434, 460, 486].map((x, i) => ({ x, r: 57 - i * 3, spool: 'hp' })),
  { x: 694, r: 62, spool: 'hp' }, { x: 720, r: 66, spool: 'hp' },
  { x: 752, r: 67, spool: 'lp' }, { x: 781, r: 70, spool: 'lp' }, { x: 810, r: 73, spool: 'lp' },
];
type Particle = { flow: Flow; lane: number; x: number };
const Engine = memo(function Engine({ parameters, playing, speed, stage, options, reset, zoom = 1, follow = null, followKey = 0, followStart = 45, followLane = -.52, stepId = 0, onTrack, onPick, onStage, compact = false }: Props) {
  const id = useId().replace(/:/g, ''), svgRef = useRef<SVGSVGElement>(null);
  const latest = useRef({ parameters, playing, speed, options, follow, followLane, onTrack });
  latest.current = { parameters, playing, speed, options, follow, followLane, onTrack };
  const [hover, setHover] = useState<number | null>(null);
  const particles = useRef<Particle[]>([]), selectedX = useRef(45), phase = useRef(0);
  const coreCount = compact ? 14 : 40, bypassCount = Math.round(parameters.bypass * coreCount);
  const queuedStep = useRef(0);
  const turbojet = compact && parameters.bypass === 0;
  useEffect(() => { if (stepId > 0) queuedStep.current = .16; }, [stepId]);
  useEffect(() => { phase.current = 0; }, [reset]);
  useEffect(() => { selectedX.current = followStart; }, [followKey, follow, reset, followStart]);
  useEffect(() => {
    particles.current = Array.from({ length: coreCount + bypassCount }, (_, i) => ({ flow: i < coreCount ? 'core' : 'bypass', lane: (i % 2 ? -1 : 1) * (0.16 + ((i * 0.618033) % 1) * 0.78), x: 40 + ((i * 0.381966) % 1) * 1040 }));
  }, [coreCount, bypassCount, reset]);
  useEffect(() => {
    let raf = 0, last = 0, report = 0;
    const tick = (time: number) => {
      const state = latest.current, data = model(state.parameters);
      const dt = Math.min((time - (last || time)) / 1000, 0.045) * (state.playing ? state.speed : 0) + queuedStep.current; queuedStep.current = 0; last = time;
      phase.current += dt;
      const svg = svgRef.current;
      if (svg) {
        svg.querySelectorAll<SVGCircleElement>('[data-particle]').forEach((node, i) => {
          const p = particles.current[i]; if (!p) return;
          const s = sampleAt(data[p.flow], p.x);
          p.x += dt * (38 + s.velocity * 195);
          if (p.x > 1080) p.x = 40;
          node.setAttribute('cx', p.x.toFixed(1)); node.setAttribute('cy', flowY(p.x, p.lane, p.flow).toFixed(1));
          node.setAttribute('fill', particleColor(s, p.flow, state.options.temperature));
          node.setAttribute('r', state.options.pressure ? String(1.2 + s.pressure * 2.8) : '2.1');
          node.setAttribute('stroke', state.options.pressure ? '#baa4ff' : 'none');
        });
        svg.querySelectorAll<SVGPathElement>('[data-blade]').forEach(node => {
          const ri = Number(node.dataset.rotor), bi = Number(node.dataset.blade), rotor = rotors[ri];
          const angle = phase.current * (rotor.spool === 'lp' ? data.lp * 6 : data.hp * 9) + bi * Math.PI / 5;
          const y = Math.sin(angle) * rotor.r, bend = Math.cos(angle) * (rotor.x === 205 ? 19 : 8);
          node.setAttribute('d', `M ${rotor.x - 5} 225 Q ${rotor.x + bend - 10} ${225 + y * 0.6} ${rotor.x + bend - 3} ${225 + y} L ${rotor.x + bend + 10} ${225 + y} Q ${rotor.x + 10} ${225 + y * 0.5} ${rotor.x + 5} 225 Z`);
          node.setAttribute('opacity', String(0.35 + (Math.cos(angle) + 1) * 0.28));
        });
        svg.querySelectorAll<SVGPathElement>('[data-energy]').forEach(node => node.setAttribute('stroke-dashoffset', String(-phase.current * 38)));
        const dot = svg.querySelector<SVGCircleElement>('[data-tracked]');
        if (state.follow && dot) {
          const s = sampleAt(data[state.follow], selectedX.current);
          selectedX.current = Math.min(1080, selectedX.current + dt * (38 + s.velocity * 195));
          dot.setAttribute('cx', String(selectedX.current)); dot.setAttribute('cy', String(flowY(selectedX.current, state.followLane, state.follow)));
          if (time - report > 160) { state.onTrack?.({ flow: state.follow, x: selectedX.current, stage: state.follow === 'bypass' && selectedX.current >= 275 && selectedX.current < 875 ? 1 : stageAt(selectedX.current), sample: sampleAt(data[state.follow], selectedX.current), finished: selectedX.current >= 1080 }); report = time; }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, []);
  const path = (flow: Flow, lane: number) => Array.from({ length: 66 }, (_, i) => { const x = 40 + i * 16; return `${i ? 'L' : 'M'}${x},${flowY(x, lane, flow)}`; }).join(' ');
  return <div className={`engine-frame ${options.xray ? 'xray' : ''} ${compact ? 'compact' : ''}`}>
    <svg ref={svgRef} viewBox={`${clamp(stage >= 0 ? stages[stage].x : 550, 550 / zoom, 1100 - 550 / zoom) - 550 / zoom} ${225 - 225 / zoom} ${1100 / zoom} ${450 / zoom}`} role="img" aria-label="Turbofan motorunun hareketli yandan kesiti. Hava soldan sağa, motorun itkisi ters yönde." className="engine-svg">
      <defs>
        <linearGradient id={`${id}metal`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#637a8b"/><stop offset=".35" stopColor="#b0c2cc"/><stop offset=".5" stopColor="#405462"/><stop offset="1" stopColor="#718897"/></linearGradient>
        <linearGradient id={`${id}case`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3d5467"/><stop offset="1" stopColor="#172a3c"/></linearGradient>
        <linearGradient id={`${id}hot`}><stop stopColor="#fcb272" stopOpacity=".03"/><stop offset=".4" stopColor="#ff8e4f" stopOpacity=".38"/><stop offset="1" stopColor="#ff7350" stopOpacity=".08"/></linearGradient>
        <linearGradient id={`${id}jet`}><stop stopColor="#f9a166" stopOpacity=".2"/><stop offset="1" stopColor="#f9a166" stopOpacity="0"/></linearGradient>
        <pattern id={`${id}grid`} width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#93bad6" strokeOpacity=".045"/></pattern>
        <marker id={`${id}arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="context-stroke"/></marker>
        <filter id={`${id}glow`} x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="1100" height="450" fill={`url(#${id}grid)`}/>
      <path d="M25 225H1080" stroke="#8299ac" strokeDasharray="5 9" opacity=".18"/>
      {!compact && <g fill="#708b9f" fontSize="11" letterSpacing="2"><text x="32" y="46">HAVA GİRİŞİ →</text><text x="958" y="46">ÇIKIŞ →</text></g>}
      {stage >= 0 && !compact && <rect x={[35,175,277,525,674,845,974][stage]} y="108" width={[115,90,235,137,158,125,107][stage]} height="230" rx="10" fill={stage === 3 ? '#ffad70' : '#64dcd1'} fillOpacity=".055" stroke={stage === 3 ? '#ffad70' : '#64dcd1'} strokeOpacity=".25" strokeDasharray="4 6"/>}
      <g className="housing">
        <g opacity={turbojet ? 0 : 1}>
        <path d="M166 65 Q214 42 306 55 L657 68 Q788 82 864 117 L872 132 Q752 101 651 94 L297 82 Q218 74 170 91Z" fill={`url(#${id}case)`} stroke="#5d778b" strokeWidth="1.4"/>
        <path d="M166 385 Q214 408 306 395 L657 382 Q788 368 864 333 L872 318 Q752 349 651 356 L297 368 Q218 376 170 359Z" fill={`url(#${id}case)`} stroke="#5d778b" strokeWidth="1.4"/>
        </g>
        <path d="M273 140 Q315 130 375 151 L512 166 Q563 144 649 146 L832 145 L958 188 L947 200 L827 166 L662 168 Q568 161 523 183 L375 169 Q322 150 280 158Z" fill={`url(#${id}metal)`} stroke="#91a3ae" strokeWidth="1"/>
        <path d="M273 310 Q315 320 375 299 L512 284 Q563 306 649 304 L832 305 L958 262 L947 250 L827 284 L662 282 Q568 289 523 267 L375 281 Q322 300 280 292Z" fill={`url(#${id}metal)`} stroke="#91a3ae" strokeWidth="1"/>
      </g>
      <g opacity=".55"><path d="M536 172Q595 149 655 170L651 193Q585 185 539 196Z" fill={`url(#${id}hot)`} stroke="#e99560" strokeWidth=".8"/><path d="M536 278Q595 301 655 280L651 257Q585 265 539 254Z" fill={`url(#${id}hot)`} stroke="#e99560" strokeWidth=".8"/></g>
      <g stroke="#eb945a" strokeWidth="2" opacity=".75">{[552,567,582].map(x=><path key={x} d={`M${x} 157v14m0 108v14`}/>)}</g>
      <path d="M936 194L1090 169V282L936 256Z" fill={`url(#${id}jet)`}/>
      <g fill={`url(#${id}metal)`} stroke="#bac7ce" strokeWidth=".65">{rotors.map((rotor, ri) => turbojet && ri === 0 ? null : <g key={rotor.x}>
        <ellipse cx={rotor.x} cy="225" rx={rotor.x === 205 ? 17 : 6} ry={rotor.r} fill="none" opacity=".3"/>
        {Array.from({ length: 10 }, (_, bi) => <path key={bi} data-rotor={ri} data-blade={bi} d={`M${rotor.x - 4} 225L${rotor.x - 5} ${225 + Math.sin(bi * Math.PI / 5) * rotor.r}h10L${rotor.x + 5} 225Z`}/>)}
      </g>)}</g>
      <g stroke="#6d8193" strokeWidth="2.5" opacity=".5">{[309,335,395,421,447,473,707,766,795].map(x=><path key={x} d={`M${x} 177l9 25m-9 46l9 25`}/>)}</g>
      <path d="M118 225Q160 197 210 201L301 210L500 213L548 205L656 206L735 215L843 210Q898 212 970 225Q898 238 843 240L735 235L656 244L548 245L500 237L301 240L210 249Q160 253 118 225Z" fill={`url(#${id}case)`} stroke="#718897" strokeWidth="1.1" opacity={options.xray ? '.24' : '.94'}/>
      {options.shafts && <g><path d="M207 225H810" stroke="#64dcd1" strokeWidth="4"/><path d="M382 217H720M382 233H720" stroke="#b3a0f9" strokeWidth="3"/>{[205,315,790].map(x=><circle key={x} cx={x} cy="225" r="5" fill="#64dcd1"/>)}{[435,705].map(x=><circle key={x} cx={x} cy="217" r="4" fill="#b3a0f9"/>)}</g>}
      {options.airflow && <g className="flow-lines" fill="none" strokeWidth="1">{(['core','bypass'] as Flow[]).map(flow => parameters.bypass === 0 && flow === 'bypass' ? null : [-.75,-.32,.32,.75].map(lane=><path key={`${flow}${lane}`} d={path(flow,lane)} stroke={flow === 'core' ? '#ffaf72' : '#5be0d5'} strokeOpacity=".23" markerEnd={`url(#${id}arrow)`}/>))}</g>}
      <g style={{ display: options.airflow ? undefined : 'none' }}>{Array.from({ length: coreCount + bypassCount }, (_, i) => <circle key={i} data-particle={i} r="2.1" cx="40" cy="225" opacity=".85" className={onPick ? 'pickable' : ''} onClick={() => { const p=particles.current[i]; if(p) { selectedX.current=p.x; onPick?.(p.flow,p.x,p.lane); } }}/> )}</g>
      {options.energy && <g fill="none" strokeWidth="3" strokeDasharray="7 11" opacity=".85" markerEnd={`url(#${id}arrow)`} filter={`url(#${id}glow)`}>
        <path data-energy="chemical" d="M589 121V162L646 180L710 181" stroke="#ffb56d"/>
        <path data-energy="hp-work" d="M710 216H396" stroke="#b3a0f9"/>
        <path data-energy="lp-work" d="M802 232H214" stroke="#64dcd1"/>
        <path data-energy="jet" d="M817 181L962 208L1060 208" stroke="#ffb56d"/>
      </g>}
      {follow && <><path d={path(follow,followLane)} stroke="white" strokeWidth="1.5" strokeDasharray="3 5" opacity=".6" fill="none"/><circle data-tracked="true" cx="45" cy={flowY(followStart,followLane,follow)} r="7" fill="white" stroke={follow==='core'?'#ffaf72':'#5be0d5'} strokeWidth="4"/></>}
      {!compact && stage === 6 && <g stroke="#64dcd1" fill="#64dcd1"><path d="M450 423H280" strokeWidth="5" markerEnd={`url(#${id}arrow)`}/><text x="466" y="429" stroke="none" fontSize="14">NET İTKİ</text></g>}
      {!compact && components.map((c, i) => <g key={c.name} className="component-hotspot" style={{ pointerEvents: onPick ? "none" : undefined }} role="button" tabIndex={0} aria-label={`${c.name}: ${c.tr}`} onFocus={()=>setHover(i)} onBlur={()=>setHover(null)} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} onClick={()=>onStage?.(c.stage)} onKeyDown={e=>{ if(e.key==='Enter'||e.key===' ') {e.preventDefault();onStage?.(c.stage);} }}>
        <title>{`${c.tr}: ${c.text}`}</title>
        <rect x={c.x-42} y={c.y<225?140:245} width="84" height="65" fill="transparent"/>
        {options.labels && <><path d={`M${c.x} ${c.y<225?c.y+9:c.y-18}V${c.y<225?136:312}`} stroke={stage===c.stage?'#64dcd1':'#4b6276'} strokeWidth=".8"/><circle cx={c.x} cy={c.y<225?136:312} r="2" fill="#83a4b5"/><text x={c.x} y={c.y} textAnchor="middle" fill={stage===c.stage?'#7be9de':'#a7b9c8'} fontSize="12">{c.name}</text></>}
      </g>)}
    </svg>
    {!compact && <div className={`component-info ${hover === null ? '' : 'visible'}`} aria-live="polite">{hover === null ? <><span>İPUCU</span> Bir parçanın üzerine gel veya dokun; görevini keşfet.</> : <><strong>{components[hover].tr}</strong><span>{components[hover].text}</span></>}</div>}
  </div>;
});
export default Engine;
