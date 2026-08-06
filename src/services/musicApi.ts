// Jamendo Music API Service
// Real legal music from Jamendo API

const JAMENDO_API_URL = 'https://api.jamendo.com/v3.0'
const JAMENDO_API_KEY = import.meta.env.VITE_MUSIC_API_KEY || 'a7945e9a'

export interface JamendoTrack {
  id: string
  name: string
  duration: number
  artist_id: string
  artist_name: string
  artist_shareurl: string
  album_id: string
  album_name: string
  album_shareurl: string
  album_image: string
  image: string
  audio: string
  audio_download: string
  shareurl: string
  shorturl: string
  dowcnt: string
  prourl: string
  tags: string
  releasedate: string
  waveform: {
    samples: number[]
  }
}

export interface JamendoArtist {
  id: string
  name: string
  shareurl: string
  image: string
  albums_count: number
  tracks_count: number
  joindate: string
}

export interface JamendoAlbum {
  id: string
  name: string
  artist_id: string
  artist_name: string
  release_date: string
  image: string
  shareurl: string
  shorturl: string
  Genres_name: string[]
  musicinfo: {
    tags: string[]
  }
}

export interface JamendoResponse<T> {
  results: T[]
  headers: {
    next: string | null
    total: string
  }
}

class MusicApiService {
  private apiKey: string

  constructor() {
    this.apiKey = JAMENDO_API_KEY
  }

  private async fetch<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    const url = new URL(`${JAMENDO_API_URL}/${endpoint}`)
    url.searchParams.append('client_id', this.apiKey)
    url.searchParams.append('format', 'json')
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, String(value))
    }

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`Music API error: ${response.status}`)
    }
    
    return response.json()
  }

  async getSongs(params: {
    limit?: number
    offset?: number
    genre?: string
    order?: string
  } = {}): Promise<JamendoTrack[]> {
    const data = await this.fetch<JamendoResponse<JamendoTrack>>('tracks', {
      limit: params.limit || 20,
      offset: params.offset || 0,
      genre: params.genre || '',
      order: params.order || 'popularity_total',
      include: 'musicinfo',
    })
    return data.results
  }

  async getArtists(params: {
    limit?: number
    offset?: number
    order?: string
  } = {}): Promise<JamendoArtist[]> {
    const data = await this.fetch<JamendoResponse<JamendoArtist>>('artists', {
      limit: params.limit || 20,
      offset: params.offset || 0,
      order: params.order || 'popularity_total',
    })
    return data.results
  }

  async getAlbums(params: {
    limit?: number
    offset?: number
    artist_id?: string
    order?: string
  } = {}): Promise<JamendoAlbum[]> {
    const data = await this.fetch<JamendoResponse<JamendoAlbum>>('albums', {
      limit: params.limit || 20,
      offset: params.offset || 0,
      artist_id: params.artist_id || '',
      order: params.order || 'popularity_total',
    })
    return data.results
  }

  async searchMusic(query: string, params: {
    limit?: number
    type?: 'tracks' | 'albums' | 'artists' | 'all'
  } = {}): Promise<{ tracks: JamendoTrack[]; albums: JamendoAlbum[]; artists: JamendoArtist[] }> {
    const limit = params.limit || 10
    const type = params.type || 'all'

    const results = {
      tracks: [] as JamendoTrack[],
      albums: [] as JamendoAlbum[],
      artists: [] as JamendoArtist[],
    }

    if (type === 'tracks' || type === 'all') {
      const tracks = await this.fetch<JamendoResponse<JamendoTrack>>('tracks', {
        search: query,
        limit,
        include: 'musicinfo',
      })
      results.tracks = tracks.results
    }

    if (type === 'albums' || type === 'all') {
      const albums = await this.fetch<JamendoResponse<JamendoAlbum>>('albums', {
        search: query,
        limit,
      })
      results.albums = albums.results
    }

    if (type === 'artists' || type === 'all') {
      const artists = await this.fetch<JamendoResponse<JamendoArtist>>('artists', {
        search: query,
        limit,
      })
      results.artists = artists.results
    }

    return results
  }

  async getTrendingMusic(params: {
    limit?: number
    genre?: string
  } = {}): Promise<JamendoTrack[]> {
    return this.getSongs({
      limit: params.limit || 10,
      genre: params.genre,
      order: 'popularity_total',
    })
  }

  async getNewReleases(params: {
    limit?: number
    genre?: string
  } = {}): Promise<JamendoTrack[]> {
    return this.getSongs({
      limit: params.limit || 20,
      genre: params.genre,
      order: 'releasedate_desc',
    })
  }

  // Convert Jamendo track to app format
  transformTrack(track: JamendoTrack): {
    external_id: string
    external_source: string
    title: string
    artist_name: string
    album_name: string
    cover_url: string
    audio_url: string
    duration: number
    genre: string
    tags: string[]
    release_date: string
    streams: number
    is_free: boolean
    price: number
  } {
    const genres = track.tags?.split(',').map(t => t.trim()).filter(Boolean) || []
    
    return {
      external_id: track.id,
      external_source: 'jamendo',
      title: track.name,
      artist_name: track.artist_name,
      album_name: track.album_name,
      cover_url: track.album_image || track.image,
      audio_url: track.audio,
      duration: track.duration,
      genre: genres[0] || 'Unknown',
      tags: genres,
      release_date: track.releasedate,
      streams: parseInt(track.dowcnt) || 0,
      is_free: true, // Jamendo tracks are free
      price: 0,
    }
  }

  // Convert Jamendo album to app format
  transformAlbum(album: JamendoAlbum): {
    external_id: string
    external_source: string
    title: string
    artist_name: string
    cover_url: string
    genre: string
    release_date: string
    track_count: number
    is_free: boolean
    price: number
  } {
    return {
      external_id: album.id,
      external_source: 'jamendo',
      title: album.name,
      artist_name: album.artist_name,
      cover_url: album.image,
      genre: album.Genres_name?.[0] || 'Unknown',
      release_date: album.release_date,
      track_count: 0,
      is_free: true,
      price: 0,
    }
  }

  // Convert Jamendo artist to app format
  transformArtist(artist: JamendoArtist): {
    external_id: string
    external_source: string
    name: string
    image_url: string
    album_count: number
    song_count: number
    join_date: string
  } {
    return {
      external_id: artist.id,
      external_source: 'jamendo',
      name: artist.name,
      image_url: artist.image,
      album_count: artist.albums_count,
      song_count: artist.tracks_count,
      join_date: artist.joindate,
    }
  }
}

export const musicApi = new MusicApiService()
export default musicApi
