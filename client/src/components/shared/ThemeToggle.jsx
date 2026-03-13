import React from 'react';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import { LightMode as SunIcon, DarkMode as MoonIcon } from '@mui/icons-material';
import { useThemeMode } from '../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const ThemeToggle = () => {
  const { mode, toggleTheme } = useThemeMode();
  const theme = useTheme();

  return (
    <Tooltip title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}>
      <IconButton 
        onClick={toggleTheme}
        sx={{
          color: theme.palette.primary.main,
          background: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          '&:hover': {
            background: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          },
          ml: 1,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ y: -20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 20, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ display: 'flex' }}
          >
            {mode === 'dark' ? (
              <SunIcon sx={{ fontSize: 20 }} />
            ) : (
              <MoonIcon sx={{ fontSize: 20 }} />
            )}
          </motion.div>
        </AnimatePresence>
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
