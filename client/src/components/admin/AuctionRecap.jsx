import React, { useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';
import html2canvas from 'html2canvas';
import TeamLogo from '../shared/TeamLogo.jsx';

import rplLogo from '../../assets/rpl-logo.jpg';

export default function AuctionRecap({ title, range, soldPlayers = [], teams = {} }) {
  const [start, end] = range.split('-').map(Number);
  const posterRef = useRef(null);
  
  const filteredPlayers = soldPlayers
    .filter(p => (p.sortOrder + 1) >= start && (p.sortOrder + 1) <= end)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDownload = async () => {
    if (!posterRef.current) return;
    
    // Temporarily hide the download button if it was inside, but we'll place it outside
    const canvas = await html2canvas(posterRef.current, {
      scale: 2, // High resolution
      backgroundColor: '#050505',
      logging: false,
      useCORS: true
    });
    
    const link = document.createElement('a');
    link.download = `RPL_Auction_Recap_${range}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', bgcolor: '#000' }}>
      {/* Control Bar - Hidden in Download */}
      <Box sx={{ width: '100%', p: 2, display: 'flex', justifyContent: 'center', bgcolor: '#111', borderBottom: '1px solid #333' }}>
        <Button 
          variant="contained" 
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          sx={{ 
            bgcolor: '#facc15', 
            color: '#000', 
            fontWeight: 800,
            '&:hover': { bgcolor: '#eab308' }
          }}
        >
          Download Poster (PNG)
        </Button>
      </Box>

      {/* Capture Area */}
      <Box 
        ref={posterRef}
        sx={{ 
          p: { xs: 3, md: 6 }, 
          width: '100%',
          maxWidth: 1200,
          minHeight: '100vh', 
          background: 'radial-gradient(circle at 50% 50%, #1a1e2e 0%, #050505 100%)',
          color: 'white',
          fontFamily: '"Inter Tight", "Inter", "Roboto", sans-serif',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Background Grid Pattern */}
        <Box sx={{ 
          position: 'absolute', inset: 0, 
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        {/* Decorative Glows */}
        <Box sx={{ 
          position: 'absolute', top: -200, left: '20%', width: 600, height: 600, 
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
          filter: 'blur(100px)', zIndex: 0
        }} />

        {/* Branding Header */}
        <Box sx={{ 
          mb: 6, zIndex: 1, 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '6px solid #fff', pb: 2.5
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box 
              component="img" 
              src={rplLogo} 
              sx={{ 
                height: { xs: 80, md: 120 }, 
                width: 'auto',
                borderRadius: '8px',
                border: '2px solid rgba(255,255,255,0.2)',
                boxShadow: '0 0 20px rgba(255,255,255,0.1)'
              }} 
            />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box sx={{ bgcolor: '#fff', color: '#000', px: 2.5, py: 0.8, fontWeight: 1000, fontSize: '1.8rem', borderRadius: '4px', letterSpacing: '0.1em' }}>RPL 2026</Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.3rem', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Auction Recap</Typography>
              </Box>
              <Typography variant="h1" sx={{ 
                fontWeight: 1000, 
                fontSize: { xs: '2.5rem', md: '4rem' },
                textTransform: 'uppercase', 
                letterSpacing: '-0.02em',
                lineHeight: 1,
                fontStyle: 'italic',
                color: '#fff',
                textShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}>
                {title || 'AUCTION PICKS'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ 
              bgcolor: '#facc15', color: '#000', px: 3, py: 0.8,
              fontWeight: 1000, fontSize: { xs: '1.2rem', md: '2.2rem' }, textTransform: 'uppercase',
              display: 'inline-block', transform: 'skewX(-10deg)', mb: 1.5
            }}>
              RANKS {range}
            </Typography>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 1000, opacity: 0.7, letterSpacing: '0.3em' }}>2026 EDITION</Typography>
          </Box>
        </Box>

        {/* Picks Grid - Native CSS Grid for Perfect Stability */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 3, 
          width: '100%', 
          position: 'relative', 
          zIndex: 1,
          px: 1 // Slight horizontal padding within the poster
        }}>
          {filteredPlayers.map((player) => {
            const team = teams[player.soldTo] || {};
            const teamColor = team.color || '#3b82f6';
            
            return (
              <Paper 
                key={player.id}
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: '70px 90px 1fr',
                  alignItems: 'center', 
                  bgcolor: 'rgba(15, 20, 35, 0.95)', 
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderLeft: `12px solid ${teamColor}`,
                  borderRadius: '3px',
                  overflow: 'hidden',
                  height: 100, // Slightly taller for more space
                  boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                  width: '100%'
                }}
              >
                {/* Rank Number - Locked */}
                <Box sx={{ 
                  height: '100%',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  borderRight: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <Typography sx={{ fontWeight: 1000, fontSize: '3.2rem', fontStyle: 'italic', color: '#fff', lineHeight: 1 }}>
                    {player.sortOrder + 1}
                  </Typography>
                </Box>

                {/* Team Logo - Locked */}
                <Box sx={{ 
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255,255,255,0.02)'
                }}>
                  <TeamLogo team={team} size={60} border={false} />
                </Box>

                {/* Player Info - All elements aligned to the same vertical line */}
                <Box sx={{ 
                  pl: 3, 
                  pr: 2, 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  borderLeft: '1px solid rgba(255,255,255,0.05)',
                  overflow: 'hidden'
                }}>
                  <Typography sx={{ 
                    fontWeight: 1000, 
                    fontSize: '1.2rem',
                    textTransform: 'uppercase',
                    color: teamColor,
                    letterSpacing: '0.12em',
                    mb: 0.5,
                    opacity: 0.95,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {team.name}
                  </Typography>
                  {(() => {
                    const parts = player.name.trim().split(' ');
                    const firstName = parts[0];
                    const lastName = parts.slice(1).join(' ');
                    const nameStyle = {
                      fontWeight: 1000, 
                      textTransform: 'uppercase', 
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontStyle: 'italic',
                      color: '#fff'
                    };
                    return (
                      <>
                        <Typography sx={{ ...nameStyle, fontSize: '1.4rem', opacity: 0.9 }}>
                          {firstName}
                        </Typography>
                        <Typography sx={{ ...nameStyle, fontSize: '1.8rem', mt: -0.2 }}>
                          {lastName}
                        </Typography>
                      </>
                    );
                  })()}
                </Box>
              </Paper>
            );
          })}
        </Box>
        
        {/* Footer */}
        <Box sx={{ mt: 'auto', pt: 10, pb: 2, width: '100%', textAlign: 'center', opacity: 0.5 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 1000, letterSpacing: '0.4em', textTransform: 'uppercase' }}>
            ROBBINSVILLE PREMIER LEAGUE 2026 • OFFICIAL AUCTION DATA
          </Typography>
        </Box>

        {filteredPlayers.length === 0 && (
          <Box sx={{ mt: 10, textAlign: 'center', zIndex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 1000, opacity: 0.4, fontStyle: 'italic' }}>
              NO DATA FOR THIS RANGE
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
