import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { Song } from '@/types/index';
import { incrementPlayCount } from '@/lib/api';

interface PlayerContextValue {
  currentSong: Song | null;
  queue: Song[];
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playSong: (song: Song, queue?: Song[]) => void;
  closeSong: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMutedState] = useState(false);
  const countedRef = useRef<string | null>(null);

  // Boot / swap audio when song changes
  useEffect(() => {
    if (!currentSong) {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.src = '';
      audioRef.current = null;
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = '';

    const audio = new Audio(currentSong.file_url);
    audio.volume = muted ? 0 : volume;
    audioRef.current = audio;
    countedRef.current = null;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnded = () => { setPlaying(false); nextRef.current(); };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);

    audio.play().then(() => setPlaying(true)).catch(console.error);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audio.src = '';
    };
  }, [currentSong?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync volume/mute
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // Count play at 30 s
  useEffect(() => {
    if (currentTime >= 30 && currentSong && countedRef.current !== currentSong.id) {
      countedRef.current = currentSong.id;
      incrementPlayCount(currentSong.id);
    }
  }, [currentTime, currentSong]);

  // Keep a stable ref to next so the 'ended' handler always sees the latest queue
  const nextRef = useRef<() => void>(() => undefined);

  const next = useCallback(() => {
    if (!currentSong || !queue.length) return;
    const idx = queue.findIndex(s => s.id === currentSong.id);
    if (idx >= 0 && idx < queue.length - 1) setCurrentSong(queue[idx + 1]);
  }, [currentSong, queue]);

  const prev = useCallback(() => {
    if (!currentSong || !queue.length) return;
    const idx = queue.findIndex(s => s.id === currentSong.id);
    if (idx > 0) setCurrentSong(queue[idx - 1]);
  }, [currentSong, queue]);

  useEffect(() => { nextRef.current = next; }, [next]);

  const playSong = useCallback((song: Song, q: Song[] = []) => {
    setQueue(q);
    setCurrentSong(song);
  }, []);

  const closeSong = useCallback(() => {
    setCurrentSong(null);
    setQueue([]);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(console.error); }
  }, [playing]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time); }
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    setMutedState(false);
  }, []);

  const setMuted = useCallback((m: boolean) => setMutedState(m), []);

  return (
    <PlayerContext.Provider value={{
      currentSong, queue, playing, currentTime, duration, volume, muted,
      playSong, closeSong, togglePlay, next, prev, seek, setVolume, setMuted,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  // Return a safe no-op fallback during HMR reloads or if used outside the provider
  if (!ctx) {
    if (import.meta.env.DEV) {
      console.warn('[usePlayer] called outside <PlayerProvider> — returning no-op fallback');
    }
    return {
      currentSong: null,
      queue: [],
      playing: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      muted: false,
      playSong: () => {},
      closeSong: () => {},
      togglePlay: () => {},
      next: () => {},
      prev: () => {},
      seek: () => {},
      setVolume: () => {},
      setMuted: () => {},
    };
  }
  return ctx;
}
