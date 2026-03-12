import React from 'react';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

export default function TeamLogo({ team, size = 40, fontSize = '1rem', border = true }) {
  if (!team) return null;

  if (team.logo) {
    return (
      <Box
        component="img"
        src={team.logo}
        alt={team.name}
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: border ? '1px solid' : 'none',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      />
    );
  }

  // Creative Placeholder
  const initial = team.name ? team.name.charAt(0).toUpperCase() : '?';
  const bgColor = team.color || '#3b82f6';

  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        bgcolor: bgColor,
        fontSize: fontSize,
        fontWeight: 900,
        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        border: border ? '1px solid rgba(255,255,255,0.1)' : 'none',
        boxShadow: `0 0 10px ${bgColor}40`
      }}
    >
      {initial}
    </Avatar>
  );
}
