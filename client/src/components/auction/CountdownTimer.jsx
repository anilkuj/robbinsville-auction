import React from 'react';
import { useCountdown } from '../../hooks/useCountdown.js';
import { motion } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import { audioSystem } from '../../utils/audioSystem.js';

const SIZE = 120;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function getColor(pct, theme) {
  if (pct > 0.5) return theme.palette.success.main;
  if (pct > 0.25) return theme.palette.warning.main;
  return theme.palette.error.main;
}

export default function CountdownTimer({ timerEndsAt, timerPaused, timerRemainingOnPause, timerSeconds = 30, endMode = 'timer', size = 'normal' }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isBig = size === 'big';
  const displaySize = isBig ? 130 : { xs: 100, sm: 120 };
  const stroke = isBig ? 8.5 : { xs: 7, sm: 8 };
  // Helper for responsive values
  const getVal = (v) => typeof v === 'object' ? (v.xs || v.sm) : v;
  const dSize = getVal(displaySize);
  const strk = getVal(stroke);
  const r = (dSize - strk) / 2;
  const circ = 2 * Math.PI * r;

  const remaining = useCountdown(timerEndsAt, timerPaused, timerRemainingOnPause);
  const awaitingHammer = endMode === 'manual' && !timerPaused && !timerEndsAt;
  const pct = awaitingHammer ? 0 : (timerSeconds > 0 ? Math.min(1, remaining / timerSeconds) : 0);
  const color = timerPaused ? theme.palette.warning.main : awaitingHammer ? theme.palette.secondary.main : getColor(pct, theme);
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
      <svg width={dSize} height={dSize} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={dSize / 2} cy={dSize / 2} r={r} fill="none" stroke={theme.palette.divider} strokeWidth={strk} />
        {/* Progress */}
        <circle
          cx={dSize / 2} cy={dSize / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strk}
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
          fontSize={isBig ? (awaitingHammer ? '1.7rem' : '2.5rem') : (awaitingHammer ? { xs: '1.2rem', sm: '1.6rem' } : { xs: '1.5rem', sm: '2rem' })}
          fontWeight="900"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontFamily: 'monospace' }}
        >
          {timerPaused ? '⏸' : awaitingHammer ? '🔨' : remaining}
        </text>
      </svg>
      <span style={{ color: awaitingHammer ? theme.palette.secondary.main : theme.palette.text.disabled, fontSize: isBig ? '0.8rem' : { xs: '0.6rem', sm: '0.75rem' }, fontWeight: 700 }}>
        {timerPaused ? 'PAUSED' : awaitingHammer ? 'HAMMER?' : 'seconds'}
      </span>
    </motion.div>
  );
}
