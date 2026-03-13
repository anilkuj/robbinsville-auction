import React from 'react';
import { useCountdown } from '../../hooks/useCountdown.js';
import { motion } from 'framer-motion';
import { audioSystem } from '../../utils/audioSystem.js';

const SIZE = 120;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function getColor(pct) {
  if (pct > 0.5) return '#22c55e';
  if (pct > 0.25) return '#f59e0b';
  return '#ef4444';
}

export default function CountdownTimer({ timerEndsAt, timerPaused, timerRemainingOnPause, timerSeconds = 30, endMode = 'timer', size = 'normal' }) {
  const isBig = size === 'big';
  const displaySize = isBig ? 130 : 120;
  const stroke = isBig ? 8.5 : 8;
  const r = (displaySize - stroke) / 2;
  const circ = 2 * Math.PI * r;

  const remaining = useCountdown(timerEndsAt, timerPaused, timerRemainingOnPause);
  const awaitingHammer = endMode === 'manual' && !timerPaused && !timerEndsAt;
  const pct = awaitingHammer ? 0 : (timerSeconds > 0 ? Math.min(1, remaining / timerSeconds) : 0);
  const color = timerPaused ? '#f59e0b' : awaitingHammer ? '#a855f7' : getColor(pct);
  const dashOffset = circ * (1 - pct);

  const warningState = !timerPaused && !awaitingHammer && remaining <= 5 && remaining > 0;

  const prevRemaining = React.useRef(remaining);
  React.useEffect(() => {
    if (!timerPaused && !awaitingHammer && remaining <= 3 && remaining > 0 && remaining !== prevRemaining.current) {
      audioSystem.playTickSound();
    }
    prevRemaining.current = remaining;
  }, [remaining, timerPaused, awaitingHammer]);

  return (
    <motion.div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isBig ? '0.5rem' : '0.25rem' }}
      animate={warningState ? { scale: [1, 1.1, 1] } : { scale: 1 }}
      transition={warningState ? { repeat: Infinity, duration: 1 } : {}}
    >
      <svg width={displaySize} height={displaySize} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={displaySize / 2} cy={displaySize / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        {/* Progress */}
        <circle
          cx={displaySize / 2} cy={displaySize / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s' }}
        />
        {/* Center text */}
        <text
          x="50%" y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={isBig ? (awaitingHammer ? '1.7rem' : '2.5rem') : (awaitingHammer ? '1.6rem' : '2rem')}
          fontWeight="900"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontFamily: 'monospace' }}
        >
          {timerPaused ? '⏸' : awaitingHammer ? '🔨' : remaining}
        </text>
      </svg>
      <span style={{ color: awaitingHammer ? '#a855f7' : '#64748b', fontSize: isBig ? '0.8rem' : '0.75rem', fontWeight: 700 }}>
        {timerPaused ? 'PAUSED' : awaitingHammer ? 'HAMMER?' : 'seconds'}
      </span>
    </motion.div>
  );
}
