import { useQuery } from '@tanstack/react-query'
import { supabase, isConfigured } from '@/lib/supabase'
import { mockSongs, mockAlbums, mockArtists, mockVideos } from '@/lib/mockData'

interface SearchResults {
  songs: any[]
  albums: any[]
  artists: any[]
  videos: any[]
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async (): Promise<SearchResults> => {
      if (!query.trim()) return { songs: [], albums: [], artists: [], videos: [] }
      if (!isConfigured || !supabase) {
        const q = query.toLowerCase()
        return {
          songs: mockSongs.filter(s => s.title.toLowerCase().includes(q)),
          albums: mockAlbums.filter(a => a.title.toLowerCase().includes(q)),
          artists: mockArtists.filter(a => a.stage_name.toLowerCase().includes(q)),
          videos: mockVideos.filter(v => v.title.toLowerCase().includes(q)),
        }
      }
      const [songs, albums, artists, videos] = await Promise.all([
        supabase.from('songs').select('*, artist:artists(*)').ilike('title', `%${query}%`).limit(5),
        supabase.from('albums').select('*, artist:artists(*)').ilike('title', `%${query}%`).limit(5),
        supabase.from('artists').select('*').ilike('stage_name', `%${query}%`).limit(5),
        supabase.from('videos').select('*, artist:artists(*)').ilike('title', `%${query}%`).limit(5),
      ])
      return {
        songs: songs.data || [],
        albums: albums.data || [],
        artists: artists.data || [],
        videos: videos.data || [],
      }
    },
    enabled: !!query.trim(),
  })
}
