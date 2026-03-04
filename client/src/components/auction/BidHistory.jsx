import React, { useEffect, useRef } from 'react';
import { formatPts } from '../../utils/budgetCalc.js';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';

export default function BidHistory({ history = [] }) {
  const topRef = useRef(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length]);

  if (history.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 1.5 }}>
        No bids yet
      </Typography>
    );
  }

  return (
    <List dense disablePadding sx={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <div ref={topRef} />
      {[...history].reverse().map((entry, i) => (
        <ListItem
          key={i}
          sx={{
            borderRadius: 1,
            px: 1.5,
            py: 0.5,
            bgcolor: i === 0 ? '#14532d30' : 'background.paper',
            border: '1px solid',
            borderColor: i === 0 ? '#22c55e40' : 'divider',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="body2"
            fontWeight={i === 0 ? 700 : 400}
            sx={{ color: i === 0 ? 'success.main' : 'text.secondary' }}
          >
            {entry.teamName}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ color: i === 0 ? 'success.main' : 'text.disabled', fontVariantNumeric: 'tabular-nums' }}
          >
            {formatPts(entry.amount)}
          </Typography>
        </ListItem>
      ))}
    </List>
  );
}
