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

export default function CountdownTimer({ timerEndsAt, timerPaused, timerRemainingOnPause, timerSeconds = 30, endMode = 'timer' }) {
  const remaining = useCountdown(timerEndsAt, timerPaused, timerRemainingOnPause);
  const awaitingHammer = endMode === 'manual' && !timerPaused && !timerEndsAt;
  const pct = awaitingHammer ? 0 : (timerSeconds > 0 ? Math.min(1, remaining / timerSeconds) : 0);
  const color = timerPaused ? '#f59e0b' : awaitingHammer ? '#a855f7' : getColor(pct);
  const dashOffset = CIRC * (1 - pct);

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
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}
      animate={warningState ? { scale: [1, 1.1, 1] } : { scale: 1 }}
      transition={warningState ? { repeat: Infinity, duration: 1 } : {}}
    >
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#1e293b" strokeWidth={STROKE} />
        {/* Progress */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={CIRC}
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
          fontSize={awaitingHammer ? '1.6rem' : '2rem'}
          fontWeight="700"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontFamily: 'monospace' }}
        >
          {timerPaused ? '⏸' : awaitingHammer ? '🔨' : remaining}
        </text>
      </svg>
      <span style={{ color: awaitingHammer ? '#a855f7' : '#64748b', fontSize: '0.75rem' }}>
        {timerPaused ? 'PAUSED' : awaitingHammer ? 'HAMMER?' : 'seconds'}
      </span>
    </motion.div>
  );
}
