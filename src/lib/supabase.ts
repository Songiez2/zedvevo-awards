import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
          },
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        }
      )
    : null


export const isConfigured =
  Boolean(supabaseUrl && supabaseAnonKey)



export interface Profile {
  id: string
  email: string
  full_name?: string | null
  username?: string | null
  avatar_url?: string | null
  bio?: string | null

  role:
    | 'admin'
    | 'artist'
    | 'user'

  is_artist?: boolean
  is_verified?: boolean

  created_at?: string
  updated_at?: string
}



export interface Artist {
  id:string
  user_id:string
  stage_name:string
  bio?:string|null
  profile_image?:string|null
  cover_image?:string|null

  verified:boolean
  created_at:string
}



export interface Song {

  id:string

  artist_id:string

  title:string

  description?:string|null

  audio_url:string

  cover_url?:string|null

  genre?:string|null

  duration?:number

  play_count?:number

  download_count?:number

  status?:
  | 'pending'
  | 'approved'
  | 'rejected'

  created_at:string

  artist?:Artist
}



export interface Video {

  id:string

  artist_id:string

  title:string

  description?:string|null

  video_url:string

  thumbnail_url?:string|null

  views?:number

  status?:
  | 'pending'
  | 'approved'
  | 'rejected'

  created_at:string

  artist?:Artist
}



export interface Donation {

  id:string

  user_id?:string|null

  amount:number

  currency:string

  payment_reference?:string|null

  status:
  | 'pending'
  | 'completed'
  | 'failed'

  created_at:string
}



export interface AwardNominee {

 id:string

 name:string

 category:string

 image_url?:string|null

 votes:number

 created_at:string

}



export interface Vote {

 id:string

 nominee_id:string

 user_id:string

 created_at:string

}



export interface Notification {

 id:string

 user_id:string

 title:string

 message:string

 read:boolean

 created_at:string

}



export interface Category {

 id:string

 name:string

 slug:string

 image_url?:string|null

 created_at:string

}



export interface HeroSlider {

 id:string

 title:string

 image_url:string

 link?:string|null

 active:boolean

}



export type DatabaseTables = {

 profiles:Profile

 artists:Artist

 songs:Song

 videos:Video

 donations:Donation

 nominees:AwardNominee

 votes:Vote

 notifications:Notification

 categories:Category

 hero_sliders:HeroSlider

}