import React, { useEffect, useState } from 'react';
import { useAuction } from '../contexts/AuctionContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from '../components/shared/Sidebar.jsx';
import PlayerCard from '../components/auction/PlayerCard.jsx';
import BidDisplay from '../components/auction/BidDisplay.jsx';
import CountdownTimer from '../components/auction/CountdownTimer.jsx';
import BidButton from '../components/auction/BidButton.jsx';
import BidHistory from '../components/auction/BidHistory.jsx';

export default function AuctionPage() {
  const { auctionState, connected, lastEvent } = useAuction();
  const { user } = useAuth();
  const [toast, setToast] = useState(null);

  // Show toasts for sold/unsold events
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === 'sold') {
      const { player, teamName, amount } = lastEvent.data;
      setToast({ type: 'sold', msg: `🏆 ${player.name} sold to ${teamName} for ${amount.toLocaleString()} pts` });
    } else if (lastEvent.type === 'unsold') {
      const { player } = lastEvent.data;
      setToast({ type: 'unsold', msg: `❌ ${player.name} went unsold` });
    }
  }, [lastEvent]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const phase = auctionState?.phase;
  const player = auctionState?.players?.[auctionState?.currentPlayerIndex] ?? null;
  const currentBid = auctionState?.currentBid;
  const teams = auctionState?.teams;
  const settings = auctionState?.settings;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar — hidden on mobile, shown on larger screens */}
      <div style={{ display: 'none' }} className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Mobile header */}
        <MobileHeader user={user} auctionState={auctionState} connected={connected} />

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
            background: toast.type === 'sold' ? '#14532d' : '#1e293b',
            border: `1px solid ${toast.type === 'sold' ? '#22c55e' : '#ef4444'}`,
            color: toast.type === 'sold' ? '#22c55e' : '#ef4444',
            borderRadius: '10px', padding: '0.75rem 1.5rem',
            fontSize: '0.9rem', fontWeight: 600, zIndex: 1000,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            maxWidth: '90vw', textAlign: 'center',
          }}>
            {toast.msg}
          </div>
        )}

        <div style={{ flex: 1, padding: '1rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>

          {/* Phase display */}
          <PhaseBar phase={phase} playerCount={auctionState?.players?.length} />

          {phase === 'ENDED' && (
            <div style={{
              textAlign: 'center', padding: '3rem 1rem',
              background: '#1e293b', borderRadius: '12px', marginTop: '1rem',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
              <h2 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>Auction Complete!</h2>
              <p style={{ color: '#64748b' }}>All players have been auctioned.</p>
            </div>
          )}

          {(phase === 'LIVE' || phase === 'PAUSED') && player && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <PlayerCard player={player} />

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
                <CountdownTimer
                  timerEndsAt={auctionState.timerEndsAt}
                  timerPaused={auctionState.timerPaused}
                  timerRemainingOnPause={auctionState.timerRemainingOnPause}
                  timerSeconds={settings?.timerSeconds ?? 30}
                  endMode={settings?.endMode ?? 'timer'}
                />
                <div style={{ flex: 1 }}>
                  <BidDisplay currentBid={currentBid} teams={teams} player={player} />
                </div>
              </div>

              {user.role === 'team' && <BidButton />}

              <div style={{ background: '#1e293b', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                  Bid History
                </div>
                <BidHistory history={currentBid?.history} />
              </div>
            </div>
          )}

          {phase === 'SETUP' && (
            <div style={{
              textAlign: 'center', padding: '3rem 1rem',
              background: '#1e293b', borderRadius: '12px', marginTop: '1rem',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Waiting for next player…</p>
              {auctionState?.players?.length === 0 && (
                <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  Admin hasn't imported players yet.
                </p>
              )}
            </div>
          )}

          {!auctionState && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
              Connecting…
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function PhaseBar({ phase, playerCount }) {
  const labels = {
    SETUP: { text: 'Setup', color: '#64748b' },
    LIVE: { text: '● LIVE', color: '#22c55e' },
    PAUSED: { text: '⏸ Paused', color: '#f59e0b' },
    ENDED: { text: 'Ended', color: '#94a3b8' },
  };
  const cfg = labels[phase] || labels.SETUP;

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.5rem 0', marginBottom: '0.25rem',
    }}>
      <span style={{ color: cfg.color, fontWeight: 700, fontSize: '0.9rem' }}>{cfg.text}</span>
      {playerCount > 0 && (
        <span style={{ color: '#475569', fontSize: '0.8rem' }}>{playerCount} players total</span>
      )}
    </div>
  );
}

function MobileHeader({ user, auctionState, connected }) {
  const team = auctionState?.teams?.[user?.teamId];
  const { logout } = useAuth();

  return (
    <div style={{
      background: '#1e293b',
      borderBottom: '1px solid #334155',
      padding: '0.75rem 1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.2rem' }}>🏏</span>
        <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.95rem' }}>RPL</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {team && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 600 }}>{team.name}</div>
            <div style={{ color: '#22c55e', fontSize: '0.75rem' }}>
              {team.budget.toLocaleString()} pts
            </div>
          </div>
        )}
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: connected ? '#22c55e' : '#ef4444',
        }} />
      </div>
    </div>
  );
}
