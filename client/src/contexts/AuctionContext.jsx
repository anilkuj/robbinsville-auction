import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import { audioSystem } from '../utils/audioSystem.js';

const AuctionContext = createContext(null);

export function AuctionProvider({ children }) {
  const { user } = useAuth();
  const [auctionState, setAuctionState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null); // { type, data }
  const [adminError, setAdminError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setAuctionState(null);
      setConnected(false);
      return;
    }

    const token = localStorage.getItem('rpl_token');
    const socket = io('/', {
      auth: { token },
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('state:full', (state) => {
      setAuctionState(state);
    });

    socket.on('auction:playerUp', (state) => {
      setAuctionState(state);
      setLastEvent({ type: 'playerUp', data: state });
    });

    socket.on('auction:bid', ({ bid, publicState }) => {
      setAuctionState(publicState);
      setLastEvent({ type: 'bid', data: bid });
      audioSystem.playBidSound();
    });

    socket.on('auction:sold', ({ player, teamId, amount, teamName, publicState }) => {
      setAuctionState(publicState);
      setLastEvent({ type: 'sold', data: { player, teamId, amount, teamName } });
      audioSystem.playSoldSound();
    });

    socket.on('auction:unsold', ({ player, publicState }) => {
      setAuctionState(publicState);
      setLastEvent({ type: 'unsold', data: { player } });
    });

    socket.on('auction:awaitingHammer', (state) => {
      setAuctionState(state);
      setLastEvent({ type: 'awaitingHammer' });
    });

    socket.on('auction:paused', (state) => {
      setAuctionState(state);
      setLastEvent({ type: 'paused' });
    });

    socket.on('auction:resumed', (state) => {
      setAuctionState(state);
      setLastEvent({ type: 'resumed' });
    });

    socket.on('auction:settingsChanged', (state) => {
      setAuctionState(state);
    });

    socket.on('auction:phaseChange', (state) => {
      setAuctionState(state);
      setLastEvent({ type: 'phaseChange', data: { phase: state.phase } });
    });

    socket.on('admin:error', ({ message }) => {
      setAdminError(message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const placeBid = useCallback((playerId, amount) => {
    socketRef.current?.emit('bid:place', { playerId, amount });
  }, []);

  const adminAction = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const clearAdminError = useCallback(() => setAdminError(null), []);

  return (
    <AuctionContext.Provider value={{
      auctionState,
      connected,
      lastEvent,
      placeBid,
      adminAction,
      adminError,
      clearAdminError,
      socket: socketRef.current,
    }}>
      {children}
    </AuctionContext.Provider>
  );
}

export function useAuction() {
  return useContext(AuctionContext);
}
