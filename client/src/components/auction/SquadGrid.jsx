import React, { useRef, useState } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import html2canvas from 'html2canvas';
import TeamLogo from '../shared/TeamLogo.jsx';
import rplLogo from '../../assets/rpl-logo.jpg';

/**
 * SquadGrid Component
 * Displays team rosters in a premium poster style.
 * 
 * Props:
 * - teams: Object containing all team data
 * - players: Array of all player data
 * - singleTeamId: (Optional) If provided, shows only one team's roster
 * - hideToggle: (Optional) If true, hides the "Show/Hide Points" button
 * - hidePoints: (Optional) If true, hides points by default and ignores the toggle
 * - phase: (Optional) Current auction phase. Affects title and visibility of download button.
 */
export default function SquadGrid({ teams = {}, players = [], singleTeamId = null, hideToggle = false, hidePoints = false, phase = 'ENDED', minimal = false }) {
    if (!teams || !players) return null;
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const posterRef = useRef(null);
    const [showPoints, setShowPoints] = useState(false);
    const soldPlayers = players.filter(p => p.status === 'SOLD');

    const handleDownload = async () => {
        if (!posterRef.current) return;
        
        const originalBg = posterRef.current.style.background;
        // Ensure background is solid for quality capture
        posterRef.current.style.background = '#050505';
        
        const canvas = await html2canvas(posterRef.current, {
            scale: 2,
            backgroundColor: '#050505',
            logging: false,
            useCORS: true
        });
        
        posterRef.current.style.background = originalBg;
        
        const teamName = singleTeamId ? (teams?.[singleTeamId]?.name || 'Squad') : 'Rosters';
        const link = document.createElement('a');
        link.download = `RPL_2026_${teamName.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const renderPlayerSmallCard = (player, team, teamColor, index) => {
        if (!player) return null;
        const name = player.name || 'Unknown';
        const isOwner = player.isPendingOwner || player.isVirtualOwner || (team?.ownerPlayerIds || []).includes(player.id);
        
        // Compact version for 5-column grid
        // Compact version for 5-column grid or Dashboard
        return (
            <Box 
                key={player.id}
                sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    py: 0.6,
                    px: minimal ? 1 : 0.5,
                    bgcolor: isOwner ? alpha(teamColor, isDark ? 0.2 : 0.1) : 'transparent',
                    borderLeft: isOwner ? `3px solid ${teamColor}` : 'none',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    '&:last-child': { borderBottom: 'none' }
                }}
            >
                {!minimal && (
                    <Typography sx={{ fontWeight: 900, fontSize: '0.8rem', color: 'text.secondary', width: 20 }}>
                        {index + 1}
                    </Typography>
                )}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <Typography noWrap sx={{ fontWeight: 800, fontSize: minimal ? '0.85rem' : '0.9rem', color: 'text.primary', textTransform: 'uppercase' }}>
                        {name}
                    </Typography>
                </Box>
                {isOwner && (
                    <Chip 
                        label="OWNER" 
                        size="small" 
                        sx={{ 
                            height: 16, 
                            fontSize: '0.55rem', 
                            fontWeight: 1000, 
                            bgcolor: teamColor, 
                            color: theme.palette.getContrastText?.(teamColor) || '#fff', 
                            '& .MuiChip-label': { px: 0.6 } 
                        }} 
                    />
                )}
                {(!hidePoints && !player.isVirtualOwner && !player.isPendingOwner) && (
                    <Typography sx={{ fontWeight: 950, color: 'primary.main', fontSize: minimal ? '0.8rem' : '0.75rem', ml: 'auto' }}>
                        {player.soldFor?.toLocaleString()}
                    </Typography>
                )}
            </Box>
        );
    };

    const renderPlayerFullCard = (player, team, teamColor, index) => {
        if (!player) return null;
        const name = player.name || 'Unknown';
        const isOwner = player.isPendingOwner || player.isVirtualOwner || (team?.ownerPlayerIds || []).includes(player.id);
        
        return (
            <Paper 
                key={player.id}
                sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '60px 1fr',
                    alignItems: 'center', 
                    bgcolor: isOwner ? alpha(teamColor, isDark ? 0.35 : 0.15) : (isDark ? 'rgba(15, 20, 35, 0.95)' : 'background.paper'), 
                    border: '1px solid',
                    borderColor: isOwner ? teamColor : 'divider',
                    borderLeft: `10px solid ${teamColor}`,
                    borderRadius: '3px',
                    overflow: 'hidden',
                    height: { xs: 70, md: 80 }, 
                    boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.6)' : '0 4px 12px rgba(0,0,0,0.05)',
                    width: '100%'
                }}
            >
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.text.primary, 0.2) }}>
                    <Typography sx={{ fontWeight: 1000, fontSize: { xs: '1.8rem', md: '2.5rem' }, fontStyle: 'italic', color: 'text.primary', lineHeight: 1 }}>
                        {index + 1}
                    </Typography>
                </Box>
                <Box sx={{ pl: 3, pr: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                    <Typography sx={{ fontWeight: 1000, fontSize: '0.7rem', color: teamColor, textTransform: 'uppercase', mb: 0.1 }}>
                        {team?.name || 'Unknown Team'}
                    </Typography>
                    <Typography noWrap sx={{ fontWeight: 1000, textTransform: 'uppercase', lineHeight: 1, color: isDark ? '#fff' : 'text.primary', fontSize: { xs: '1rem', md: '1.2rem' }, fontStyle: 'italic' }}>
                        {name}
                    </Typography>
                    {(player.isPendingOwner || player.isVirtualOwner) && (
                        <Box sx={{ mt: 0.5 }}>
                            <Chip 
                                label="OWNER" 
                                size="small" 
                                sx={{ 
                                    height: 18, 
                                    fontSize: '0.65rem', 
                                    fontWeight: 1000, 
                                    bgcolor: teamColor, 
                                    color: theme.palette.getContrastText?.(teamColor) || '#fff', 
                                    '& .MuiChip-label': { px: 1 } 
                                }} 
                            />
                        </Box>
                    )}
                    {(!hidePoints && !player.isVirtualOwner && !player.isPendingOwner) && (
                        <Box sx={{ position: 'absolute', right: 12, bottom: 4 }}>
                            <Typography sx={{ fontWeight: 900, color: 'primary.main', fontSize: '1rem', textShadow: '0 0 10px rgba(245, 158, 11, 0.2)' }}>
                                {player.soldFor?.toLocaleString()}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Paper>
        );
    };

    const renderTeamContainer = (teamId, team) => {
        const teamPlayers = soldPlayers.filter(p => p.soldTo === teamId);
        
        // Add pending owners
        if (team?.ownerIsPlayer && team?.ownerPlayerIds?.length > 0) {
            team.ownerPlayerIds.forEach(ownerId => {
                if (!teamPlayers.some(p => p.id === ownerId)) {
                    const pendingOwner = players.find(p => p.id === ownerId);
                    if (pendingOwner) {
                        teamPlayers.push({ ...pendingOwner, isPendingOwner: true });
                    }
                }
            });
        } else if (!team?.ownerIsPlayer && team?.ownerName) {
            // Non-player virtual owner
            teamPlayers.unshift({
                id: `owner-${teamId}`,
                name: team.ownerName,
                isVirtualOwner: true,
                status: 'SOLD'
            });
        }

        teamPlayers.sort((a, b) => {
            if (!a || !b) return 0;
            const isAOwner = a.isPendingOwner || a.isVirtualOwner || (team?.ownerPlayerIds || []).includes(a.id);
            const isBOwner = b.isPendingOwner || b.isVirtualOwner || (team?.ownerPlayerIds || []).includes(b.id);
            if (isAOwner && !isBOwner) return -1;
            if (!isAOwner && isBOwner) return 1;
            return (a.saleIndex || 0) - (b.saleIndex || 0);
        });

        if (teamPlayers.length === 0 && !singleTeamId) return null;
        const teamColor = team?.color || '#3b82f6';
        const safeTeam = team || { name: 'Unknown Team' };

        if (singleTeamId || minimal) {
            // Team Owner View: Large 2-column layout or Minimal Compact
            return (
                <Box key={teamId} sx={{ zIndex: 1, position: 'relative' }}>
                    <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: minimal ? '1fr' : { xs: '1fr', md: '1fr 1fr' }, 
                        gap: minimal ? 0 : 2.5 
                    }}>
                        {teamPlayers.map((player, idx) => 
                            minimal 
                                ? renderPlayerSmallCard(player, safeTeam, teamColor, idx)
                                : renderPlayerFullCard(player, safeTeam, teamColor, idx)
                        )}
                    </Box>
                </Box>
            );
        } else {
            // Host View: Compact 5-column layout element
            return (
                <Paper 
                    key={teamId} 
                    sx={{ 
                        p: 1.5, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        bgcolor: isDark ? 'rgba(15, 20, 35, 0.7)' : 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderTop: `4px solid ${teamColor}`,
                        borderRadius: '4px',
                        minHeight: 400
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                        <TeamLogo team={safeTeam} size={30} border={false} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 1000, textTransform: 'uppercase', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                {safeTeam.name}
                            </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 900, color: 'text.disabled', fontSize: '0.75rem' }}>
                            {teamPlayers.length}
                        </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        {teamPlayers.map((player, idx) => renderPlayerSmallCard(player, safeTeam, teamColor, idx))}
                    </Box>
                </Paper>
            );
        }
    };

    const teamList = singleTeamId 
        ? [[singleTeamId, teams?.[singleTeamId]]] 
        : Object.entries(teams || {}).sort((a, b) => (a[1]?.name || '').localeCompare(b[1]?.name || ''));

    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Download Button - Fixed to top right */}
            {!minimal && (
                <Box sx={{ width: '100%', p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2, zIndex: 10 }}>
                    {!hideToggle && (
                        <Button 
                            variant="outlined"
                            startIcon={showPoints ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            onClick={() => setShowPoints(!showPoints)}
                             sx={{ 
                                color: 'text.primary', 
                                borderColor: 'divider',
                                '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) },
                                borderRadius: '4px'
                            }}
                        >
                            {showPoints ? 'Hide Points' : 'Show Points'}
                        </Button>
                    )}
                    {phase === 'ENDED' && (
                        <Button 
                            variant="contained" 
                            startIcon={<DownloadIcon />}
                            onClick={handleDownload}
                            sx={{ 
                                bgcolor: 'warning.main', color: 'warning.contrastText', fontWeight: 1000,
                                '&:hover': { bgcolor: 'warning.dark' },
                                borderRadius: '4px', px: 3
                            }}
                        >
                            Download Poster
                        </Button>
                    )}
                </Box>
            )}

            {/* Poster Content */}
            <Box 
                ref={posterRef}
                sx={{ 
                    width: '100%', 
                    maxWidth: singleTeamId ? 1000 : 1800,
                    minHeight: minimal ? 'auto' : '100vh', 
                    p: minimal ? 1 : 4,
                    background: minimal ? 'transparent' : (isDark ? 'radial-gradient(circle at 50% 50%, #1a1e2e 0%, #050505 100%)' : 'radial-gradient(circle at 50% 50%, #f1f5f9 0%, #e2e8f0 100%)'),
                    color: 'text.primary',
                    fontFamily: '"Inter Tight", "Inter", sans-serif',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* Visual Elements */}
                {!minimal && (
                    <>
                        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: isDark ? 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)' : 'linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)', backgroundSize: '30px 30px', pointerEvents: 'none' }} />
                        <Box sx={{ position: 'absolute', top: -100, left: '10%', width: 500, height: 500, background: isDark ? 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
                    </>
                )}

                {/* Header */}
                {!minimal && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '4px solid', borderColor: isDark ? 'white' : 'text.primary', pb: 2, mb: 4, zIndex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box component="img" src={rplLogo} sx={{ height: 80, borderRadius: '4px', border: '1px solid', borderColor: 'divider' }} />
                                {singleTeamId && teams?.[singleTeamId] && (
                                    <TeamLogo team={teams[singleTeamId]} size={80} border={true} />
                                )}
                            </Box>
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                                    <Box sx={{ bgcolor: isDark ? 'white' : 'text.primary', color: isDark ? 'black' : 'background.paper', px: 1.5, py: 0.3, fontWeight: 1000, fontSize: '1.2rem', borderRadius: '2px' }}>RPL 2026</Box>
                                    <Typography sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', opacity: 0.8, letterSpacing: '0.1em', fontSize: '1rem' }}>
                                        {singleTeamId ? 'OFFICIAL ROSTER' : (phase === 'ENDED' ? 'AUCTION SUMMARY' : 'LIVE AUCTION FEED')}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="h3" sx={{ fontWeight: 1000, textTransform: 'uppercase', fontStyle: 'italic', lineHeight: 1, letterSpacing: '-0.02em', color: 'text.primary' }}>
                                        {singleTeamId ? (teams?.[singleTeamId]?.name || 'NOT FOUND') : (phase === 'ENDED' ? 'FINAL TEAM SQUADS' : 'CURRENT TEAM SQUADS')}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ bgcolor: '#facc15', color: '#000', px: 2, py: 0.5, fontWeight: 1000, textTransform: 'uppercase', transform: 'skewX(-10deg)', mb: 1 }}>
                                2026 EDITION
                            </Typography>
                        </Box>
                    </Box>
                )}

                {/* Content Grid */}
                {singleTeamId ? (
                    // 2 columns for Team Owner
                    <Box sx={{ zIndex: 1 }}>
                        {renderTeamContainer(singleTeamId, teams?.[singleTeamId])}
                    </Box>
                ) : (
                    // 5 columns for Host
                    <Box sx={{ 
                        zIndex: 1,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(5, 1fr)' },
                        gap: 2
                    }}>
                        {teamList.map(([id, team]) => renderTeamContainer(id, team))}
                    </Box>
                )}

                {/* Footer */}
                {!minimal && (
                    <Box sx={{ mt: 'auto', pt: 6, pb: 2, textAlign: 'center', opacity: 0.4, zIndex: 1 }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
                            ROBBINSVILLE PREMIER LEAGUE • OFFICIAL AUCTION DATA • @RPL_OFFICIAL
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}
