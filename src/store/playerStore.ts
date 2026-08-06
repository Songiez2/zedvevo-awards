import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Song } from '@/lib/supabase'

interface PlayerState {
  currentSong: Song | null
  queue: Song[]
  queueIndex: number
  isPlaying: boolean
  isPaused: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isShuffled: boolean
  repeatMode: 'off' | 'all' | 'one'
  isMiniPlayer: boolean
  isBackgroundPlaying: boolean

  setCurrentSong: (song: Song | null) => void
  setQueue: (songs: Song[], startIndex?: number) => void
  addToQueue: (song: Song) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  playNext: () => void
  playPrevious: () => void
  setIsPlaying: (playing: boolean) => void
  setIsPaused: (paused: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  setIsMuted: (muted: boolean) => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  setMiniPlayer: (isMini: boolean) => void
  setBackgroundPlaying: (isBackground: boolean) => void
  playSong: (song: Song, queue?: Song[]) => void
  togglePlay: () => void
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSong: null,
      queue: [],
      queueIndex: -1,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      isMuted: false,
      isShuffled: false,
      repeatMode: 'off',
      isMiniPlayer: false,
      isBackgroundPlaying: false,

      setCurrentSong: (song) => set({ currentSong: song }),

      setQueue: (songs, startIndex = 0) =>
        set({
          queue: songs,
          queueIndex: startIndex,
          currentSong: songs[startIndex] || null,
        }),

      addToQueue: (song) =>
        set((state) => ({
          queue: [...state.queue, song],
        })),

      removeFromQueue: (index) =>
        set((state) => {
          const newQueue = state.queue.filter((_, i) => i !== index)
          let newIndex = state.queueIndex
          if (index < state.queueIndex) {
            newIndex--
          } else if (index === state.queueIndex) {
            newIndex = Math.min(newIndex, newQueue.length - 1)
          }
          return {
            queue: newQueue,
            queueIndex: newIndex,
            currentSong: newQueue[newIndex] || null,
          }
        }),

      clearQueue: () =>
        set({
          queue: [],
          queueIndex: -1,
          currentSong: null,
          isPlaying: false,
        }),

      playNext: () => {
        const { queue, queueIndex, isShuffled, repeatMode } = get()
        if (queue.length === 0) return

        let nextIndex: number

        if (isShuffled) {
          nextIndex = Math.floor(Math.random() * queue.length)
        } else if (queueIndex < queue.length - 1) {
          nextIndex = queueIndex + 1
        } else if (repeatMode === 'all') {
          nextIndex = 0
        } else {
          set({ isPlaying: false })
          return
        }

        set({
          queueIndex: nextIndex,
          currentSong: queue[nextIndex],
          currentTime: 0,
        })
      },

      playPrevious: () => {
        const { queue, queueIndex, currentTime, repeatMode } = get()
        if (queue.length === 0) return

        if (currentTime > 3) {
          set({ currentTime: 0 })
          return
        }

        let prevIndex: number

        if (queueIndex > 0) {
          prevIndex = queueIndex - 1
        } else if (repeatMode === 'all') {
          prevIndex = queue.length - 1
        } else {
          set({ currentTime: 0 })
          return
        }

        set({
          queueIndex: prevIndex,
          currentSong: queue[prevIndex],
          currentTime: 0,
        })
      },

      setIsPlaying: (playing) => set({ isPlaying: playing, isPaused: !playing }),
      setIsPaused: (paused) => set({ isPaused: paused, isPlaying: !paused }),

      setCurrentTime: (time) => set({ currentTime: time }),

      setDuration: (duration) => set({ duration }),

      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

      setIsMuted: (muted) => set({ isMuted: muted }),

      toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),

      toggleRepeat: () =>
        set((state) => {
          const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one']
          const currentIndex = modes.indexOf(state.repeatMode)
          return { repeatMode: modes[(currentIndex + 1) % modes.length] }
        }),

      setMiniPlayer: (isMini) => set({ isMiniPlayer: isMini }),

      setBackgroundPlaying: (isBackground) => set({ isBackgroundPlaying: isBackground }),

      playSong: (song, queue) => {
        if (queue) {
          const index = queue.findIndex((s) => s.id === song.id)
          set({
            queue,
            queueIndex: index >= 0 ? index : 0,
            currentSong: song,
            isPlaying: true,
            isPaused: false,
          })
        } else {
          const state = get()
          if (state.currentSong?.id === song.id) {
            set({ isPlaying: true, isPaused: false })
          } else {
            set({
              queue: [song],
              queueIndex: 0,
              currentSong: song,
              isPlaying: true,
              isPaused: false,
            })
          }
        }
      },

      togglePlay: () =>
        set((state) => ({
          isPlaying: !state.isPlaying,
          isPaused: state.isPlaying,
        })),
    }),
    {
      name: 'zedvevo-player',
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        isShuffled: state.isShuffled,
        repeatMode: state.repeatMode,
      }),
    }
  )
)
