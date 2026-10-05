import { useId } from 'react';
import { pointOnPolyline, lerp } from '../../motion/math';
import styles from './LiveInferenceScene.module.css';

const layouts = {
  desktop: {
    width: 646, height: 178,
    paths: {
      prefix: [[19, 92], [212, 92]],
      research01: [[212, 92], [233, 92], [264, 48], [419, 48]],
      research02: [[212, 92], [233, 92], [265, 145], [609, 145]],
      child01a: [[419, 48], [448, 48], [480, 18], [609, 18]],
      child01b: [[448, 48], [480, 84], [609, 84]],
    },
    image: [83, 66, 73, 51], imageLabel: [119, 134],
    prefixLabel: [18, 165], rootFork: [212, 92], childFork: [448, 48],
    research01Label: [269, 30], research01State: [269, 66],
    research02Label: [269, 128], research02State: [531, 166],
    child01aLabel: [566, 4], child01bLabel: [566, 72], child01bState: [552, 107],
    admission: [400, 34], admissionLabel: [365, 86],
    returnStart: [336, 108], returnEnd: [401, 36], returnLabel: [334, 137],
    cancel: [609, 84],
  },
  compact: {
    width: 340, height: 240,
    paths: {
      prefix: [[12, 112], [111, 112]],
      research01: [[111, 112], [122, 112], [153, 62], [220, 62]],
      research02: [[111, 112], [123, 112], [160, 205], [326, 205]],
      child01a: [[220, 62], [237, 62], [264, 22], [326, 22]],
      child01b: [[237, 62], [265, 109], [326, 109]],
    },
    image: [31, 88, 64, 45], imageLabel: [63, 150],
    prefixLabel: [12, 229], rootFork: [111, 112], childFork: [237, 62],
    research01Label: [136, 41], research01State: [146, 82],
    research02Label: [174, 187], research02State: [253, 224],
    child01aLabel: [294, 10], child01bLabel: [294, 96], child01bState: [277, 131],
    admission: [211, 48], admissionLabel: [182, 153],
    returnStart: [165, 162], returnEnd: [212, 50], returnLabel: [157, 177],
    cancel: [326, 109],
  },
};

const pathData = points => points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ');

function Caption({ at, children, emphasis = false, opacity = 1, anchor }) {
  return <text x={at[0]} y={at[1]} className={emphasis ? styles.label : undefined} opacity={opacity} textAnchor={anchor}>{children}</text>;
}

function Document({ at, opacity = 1 }) {
  return <g transform={`translate(${at[0]} ${at[1]})`} opacity={opacity}>
    <rect width="20" height="28" rx="2" fill="#d7d7e0" stroke="#fff" strokeWidth=".6" />
    <path d="M4 6h12M4 10h11M4 14h12M4 18h8M4 22h10" stroke="#7c7c8d" strokeWidth=".8" />
  </g>;
}

function Projection({ layout, opacity, gradientId }) {
  const [x, y, width, height] = layout.image;
  return <g opacity={opacity} transform={`translate(0 ${5 * (1 - opacity)})`}>
    <svg x={x} y={y} width={width} height={height} viewBox="0 0 73 51" overflow="visible">
      <rect width="73" height="51" rx="4" fill="#1c1c21" stroke="#ffffff62" strokeWidth=".8" />
      <rect x="5" y="5" width="63" height="41" rx="1" fill={`url(#${gradientId})`} />
      <path d="M5 32L16 19L23 25L35 10L49 27L61 19L68 29V46H5Z" fill="#81abb0" />
      <path d="M5 36L16 29L28 36L41 21L54 34L68 28V46H5Z" fill="#547f8a" />
      <path d="M5 43L22 36L33 41L47 31L60 40L68 37V46H5Z" fill="#e2be93" />
      <path d="M5 46L19 43L31 46L47 38L62 44L68 42V46Z" fill="#b47c55" />
    </svg>
    <Caption at={layout.imageLabel} anchor="middle">Projected once</Caption>
  </g>;
}

/** Geometry is a scene-owned illustration; semantic progress comes from a pure frame. */
export default function LineageTree({ frame, compact }) {
  const layout = compact ? layouts.compact : layouts.desktop;
  const gradientId = `lineage-image-${useId().replaceAll(':', '')}`;
  const returned = [
    lerp(layout.returnStart[0], layout.returnEnd[0], frame.toolReturn.progress),
    lerp(layout.returnStart[1], layout.returnEnd[1], frame.toolReturn.progress),
  ];
  return <svg className={styles.tree} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="One projected image enters the shared prefix. Research 01 and 02 inherit its attention state. Evidence enters only Research 01 before 01a and 01b fork.">
    <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#dfebec" /><stop offset="1" stopColor="#f4ebde" /></linearGradient></defs>
    {Object.entries(layout.paths).map(([name, points]) => <g key={name}>
      <path className={styles.ghost} d={pathData(points)} />
      <path className={styles.path} d={pathData(points)} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - frame.pathProgress[name]} style={name === 'child01b' && frame.cancelled ? { stroke: '#62626e' } : undefined} />
    </g>)}
    <circle cx={layout.paths.prefix[0][0]} cy={layout.paths.prefix[0][1]} r="3" fill="#a9a9b6" />
    <circle cx={layout.rootFork[0]} cy={layout.rootFork[1]} r="2.7" fill="#e3e3e9" opacity={frame.rootFork} />
    <circle cx={layout.childFork[0]} cy={layout.childFork[1]} r="2.5" fill="#e3e3e9" opacity={frame.childFork} />
    <Projection layout={layout} opacity={frame.projection} gradientId={gradientId} />
    <Caption at={layout.prefixLabel} opacity={frame.prefixLabel}>Image-conditioned prefix</Caption>
    <g opacity={frame.research01Label}><Caption at={layout.research01Label} emphasis>Research 01</Caption><Caption at={layout.research01State}>{frame.research01State}</Caption></g>
    <g opacity={frame.research02Label}><Caption at={layout.research02Label} emphasis>Research 02</Caption><Caption at={layout.research02State}>{frame.research02State}</Caption></g>
    <Caption at={layout.child01aLabel} emphasis opacity={frame.child01aLabel}>01a</Caption>
    <g opacity={frame.child01bLabel}><Caption at={layout.child01bLabel} emphasis>01b</Caption><Caption at={layout.child01bState}>{frame.child01bState}</Caption></g>
    <g opacity={frame.admission} transform={`translate(0 ${3 * (1 - frame.admission)})`}>
      <Document at={layout.admission} />
      <Caption at={layout.admissionLabel}>Admitted to 01</Caption>
    </g>
    <Caption at={layout.returnLabel} opacity={frame.toolReturn.label}>Tool result</Caption>
    <Document at={returned} opacity={frame.toolReturn.opacity} />
    {Object.entries(frame.tokens).map(([name, token]) => {
      const position = pointOnPolyline(layout.paths[name], token.progress);
      // Shared geometry helper returns an {x, y} point.
      return <g key={name} opacity={token.visible ? 1 : 0} transform={`translate(${position.x} ${position.y})`}>
        <circle className={styles.tokenRing} r={name === 'prefix' ? 6 : 5} />
        <circle className={styles.token} r={name === 'prefix' ? 2.4 : 2.1} />
      </g>;
    })}
    {frame.cancelled && <g transform={`translate(${layout.cancel[0]} ${layout.cancel[1]})`}>
      <circle r="5" fill="#17171c" stroke="#8b8b9b" strokeWidth="1" />
      <path d="M-2-2L2 2M2-2L-2 2" stroke="#b6b6c3" strokeWidth="1" />
    </g>}
  </svg>;
}
