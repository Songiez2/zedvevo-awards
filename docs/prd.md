# Requirements Document

## 1. Application Overview

**Application Name**: ZedVevo

**Description**: A premium music and video streaming platform with integrated awards system, real payment processing via Lipila, comprehensive admin management capabilities, download system, global search, notification system, trending system with Zambian music discovery, and automated role-based access control.

## 2. Users and Usage Scenarios

**Target Users**:
- Users: Stream music/videos, vote, buy merchandise, donate, apply to become artist or nominee
- Artists: Upload and manage music/video content according to subscription
- Nominees: Register for awards and participate in voting
- Admins: Manage content approvals, users, payments, nominees, awards
- Super Admins: Full system access, manage admins, settings, payments, integrations

**Core Scenarios**:
- Users stream and download music and videos
- Users apply to become artists by purchasing upload plans
- Artists upload songs with cover images and videos
- Users register as nominees by paying nomination fee
- Users search for songs, videos, artists, nominees
- Users participate in awards voting
- Platform automatically promotes Zambian music and trending content
- All users upload profile avatars

## 3. Page Structure and Functionality

```
ZedVevo Platform
├── Public Pages
│   ├── Home Page
│   ├── Music Page
│   ├── Videos Page
│   ├── Awards Page
│   ├── Trending Page
│   └── Search Results Page
├── User Pages
│   ├── Upload Page
│   ├── Library Page
│   ├── My Downloads Page
│   ├── Profile Page
│   ├── User Dashboard
│   └── Notifications Page
└── Admin Pages
    └── Admin Dashboard
```

### 3.1 Header (Global Component)

**Brand Section**:
- Left side: ZedVevo name with animated circular CD/disc logo
- CD logo features: continuous rotation, realistic disc rings, glowing center, ZedVevo branding, smooth animation

**Navigation**:
- Desktop: Home | Music | Videos | Awards | Trending | Upload | Library | My Downloads | Profile
- Mobile: Bottom navigation bar with same menu items

**Global Search Bar**:
- Search input field in header
- Live search results while typing
- Search songs, videos, artists, nominees
- Click result to open content

**Notification Bell**:
- Animated bell icon in header
- Display unread notification count badge
- Click to open notification dropdown panel

**Profile Avatar**:
- Display user's uploaded avatar in header
- Click to open profile menu
- Default avatar if not uploaded

**Header Behavior**:
- Sticky positioning
- Glassmorphism effect
- Animated on scroll
- Responsive across devices

### 3.2 Hero Image Slider (Home Page)

**Display**:
- Full-width banner below header
- Image-based backgrounds
- Dark gradient overlay for text readability
- Text overlay: title, subtitle, call-to-action button

**Slider Features**:
- Automatic slide rotation
- Smooth cinematic transitions
- Ken Burns-style image movement effect
- Slide indicators
- Previous/Next navigation buttons
- Touch/swipe support on mobile
- Pause on user interaction, auto-resume after
- Responsive image sizing

**Admin Banner Management**:
- Upload banner image
- Set title, subtitle, button text, button destination
- Configure start date, end date
- Toggle active/inactive status
- Set display order
- Replace existing banner images

### 3.3 Home Page

**Content Sections**:
- Trending Zambian Music: Display current trending Zambian songs
- Trending Now: Display trending songs and videos from platform
- Weekly Trending: Display most played songs, most downloaded songs, most viewed videos, most liked songs, most shared content for current week
- Rising Artists: Highlight new and popular Zambian artists
- Winner of the Month: Display current month's winner with photo, artist name, award/category, month/year, prize, description
- New Releases: Show recently approved uploads
- Popular Music: List most played songs
- Trending Videos: Display most viewed videos
- ZedVevo Awards: Show current awards and nominees
- Popular Nominees: Display nominees with highest vote counts
- Sponsors: Display award sponsors

**Display Style**:
- Animated cards for content items
- Horizontal scrolling sections on mobile
- Premium streaming service visual design

### 3.4 Music Page

**Music Playback**:
- Play/pause controls
- Progress bar
- Volume control
- Like button
- Save to library button
- Download button
- Share button
- View play count, download count, and statistics

**Music Display**:
- Display song cover image uploaded by artist
- Show song title, artist name, genre, description
- Display duration, play count, download count

**Music Browsing**:
- Browse all approved music uploads
- Filter by genre
- Search functionality

### 3.5 Videos Page

**Video Playback**:
- Play/pause controls
- Progress bar
- Volume control
- Fullscreen toggle
- Like button
- Save to library button
- Download button (if enabled by admin)
- Share button
- View statistics

**Video Display**:
- Display auto-generated video thumbnail
- Show video title, creator, description
- Display duration, view count, download count

**Video Browsing**:
- Browse all approved video uploads
- Filter and search functionality

### 3.6 Awards Page

**Awards Information**:
- Display current awards and categories
- Show award seasons
- Display nominees per category in responsive grid
- Display voting status and results
- Show winners when announced
- Display past winners
- Show sponsors

**Nominee Cards**:
- Display nominee image
- Display nominee name
- Display category
- Display vote count
- Vote button
- Share button
- Profile button

**Nominee Grid Layout**:
- Desktop: 4 cards per row
- Tablet: 2 cards per row
- Mobile: 1 card per row

**Nominee Registration**:
- User selects award season and category
- Fills registration form
- Uploads nominee image
- Pays nomination fee via Lipila
- After successful payment verification: nominee record created, payment_status set to successful, nomination_status set to approved, nominee added to awards page

**Voting**:
- User selects nominee to vote for
- Enters number of votes (minimum K5 per vote)
- Selects payment method: Mobile Money or Card
- Pays via Lipila
- Votes added only after successful payment verification
- User can view their voting history

**Winner of the Month**:
- Display current month's winner
- Show winner photo, artist name, award/category, month/year, prize, description

**Past Winners**:
- Display previous award winners
- Filter by award season, category, year

### 3.7 Trending Page

**Trending Categories**:
- Trending Songs: Display top songs by views, plays, likes, shares, recent activity
- Trending Videos: Display top videos by views, plays, likes, shares, recent activity
- Rising Artists: Display new and popular artists
- Popular Nominees: Display nominees with highest vote counts

**Zambian Music Discovery**:
- Prioritize Zambian artists
- Prioritize Zambian genres
- Prioritize Zambian music videos
- Mix ZedVevo uploaded content with approved external Zambian music sources where allowed

**Display**:
- Ranking numbers
- Content details: title, artist, cover art/thumbnail, statistics
- Click to play/view content

**Automatic Ranking**:
- Combine real Zambian music discovery with app uploaded content
- Rank using views, plays, likes, shares, recent activity

### 3.8 Search Results Page

**Search Functionality**:
- Display search results from Supabase database
- Search songs by title, artist, genre
- Search videos by title, creator
- Search artists by profile
- Search nominees by name, category
- Show cover artwork and video thumbnails
- Click result to open content

**Filters**:
- All
- Music
- Videos
- Artists
- Nominees

**Sort Options**:
- Relevance
- Newest
- Most Played
- Most Downloaded
- Most Viewed

**Display**:
- Only show approved/public content
- Result count
- Content cards with metadata

### 3.9 Upload Page

**Artist Upload Plan Selection**:
- Display available plans:
  - K10 Free Trial: Become artist, 1 song upload only, after first upload require upgrade
  - K100 Weekly: Artist role, unlimited uploads, expires after 7 days
  - K300 Yearly: Artist role, unlimited uploads, expires after 365 days
- User selects plan and proceeds to payment

**Payment Process**:
- User selects payment method: Mobile Money or Card
- Mobile Money Flow: User enters phone number, Lipila payment request created, user confirms payment on mobile device, Lipila processes transaction, backend receives webhook from Lipila, backend verifies transaction
- Card Flow: User redirected to Lipila secure card checkout, user enters card details via Lipila interface, Lipila processes transaction, backend verifies transaction

**Automatic Artist Role Activation**:
- When Lipila webhook confirms successful payment:
  - Automatically update profiles.role to artist
  - Enable upload access
  - Refresh session
  - Refresh profile data
  - Automatically open Upload page
  - Reload page automatically
- No manual admin approval required for paid artist registration

**Payment Status**:
- Pending: Plan remains inactive until verification
- Successful: Plan activated, artist role granted
- Failed: Plan not activated, user can retry
- Cancelled: Plan not activated
- Insufficient funds: Plan not activated, display message: Payment unsuccessful. Your payment could not be completed because there were insufficient funds. Please add sufficient funds and try again.
- Invalid transaction: Plan not activated

**Music Upload** (after active plan):
- User selects MP3 file from device
- Enters required metadata: song title, artist name, genre, description
- Uploads song cover image (required)
- Uploads file to Supabase Storage
- Metadata saved to Supabase PostgreSQL
- Upload progress indicator displayed
- Confirmation after successful upload

**Video Upload** (after active plan):
- User selects MP4 file from device
- Enters metadata: video title, artist name, description
- Uploads file to Supabase Storage
- System auto-generates thumbnail from video
- Artist can edit thumbnail before publishing
- Metadata and thumbnail saved to Supabase
- Upload progress indicator displayed
- Confirmation after successful upload

**Admin Upload** (Admin/Super Admin only):
- Admin uploads unlimited MP3 and MP4 without paying any plan
- Admin uploads never require K10/K100/K300 packages or payment
- Admin uploads are approved by default or saveable as draft
- Admin can upload: songs, videos, cover artwork, hero banners, sponsor logos, award images

### 3.10 Library Page

**User's Saved Content**:
- Display songs saved by user
- Display videos saved by user
- Play/remove from library options

### 3.11 My Downloads Page

**Downloaded Content**:
- Display all music downloaded by user
- Display all videos downloaded by user
- Show download date
- Play/re-download options

### 3.12 Profile Page

**User Information**:
- Display username, email, profile avatar
- Edit profile option
- Upload profile picture option

**Profile Avatar Upload**:
- Allow every user role to upload profile picture
- Upload from device: phone gallery or computer files
- Upload to Supabase Storage avatars bucket
- Update profiles.avatar_url
- Show instantly everywhere: header avatar, artist profile, nominee profile, comments

### 3.13 Notifications Page

**Notification List**:
- Display all notifications from database
- Notification types:
  - Artist: Your artist account is active. Start uploading.
  - Artist: Your upload plan expires soon.
  - Artist: Your song has been approved.
  - Artist: Your video thumbnail was generated.
  - Nominee: Your nomination payment was successful.
  - Nominee: You are now nominated.
  - Users: New trending Zambian music available.
  - Award winners announced
  - Winner of the Month published
  - Weekly trending updated
  - New awards opened
  - Voting opened/closing
  - Successful/failed payments
  - Package expiry reminders

**Notification Actions**:
- Open notification
- Mark as read
- Delete notification
- Mark all as read

### 3.14 User Dashboard

**Dashboard Sections**:
- Profile summary with avatar
- Active upload plan and expiry date (for artists)
- Upload allowance remaining (for artists)
- My Music: List of user's uploaded songs with edit/replace MP3/delete options (for artists)
- My Videos: List of user's uploaded videos with edit/replace MP4/delete options (for artists)
- Payments: Payment history with transaction details
- Awards: User's award nominations (for nominees)
- Nominations: Nomination status (for nominees)
- Votes: Voting history
- Downloads: Download history
- Statistics: Play counts, view counts, download counts for user's content (for artists)
- Notifications: System notifications

**Content Management**:
- User can edit only their own uploads
- Edit song: Update metadata, replace MP3 file, replace cover image, delete song
- Edit video: Update metadata, replace MP4 file (auto-generates new thumbnail), edit thumbnail, delete video

### 3.15 Admin Dashboard

**User Management**:
- View all users
- View user role: user, artist, admin, super_admin
- View payment status
- Manage user accounts
- View user upload activity

**Artist Management**:
- View all artists
- View subscription plan: K10 Free Trial, K100 Weekly, K300 Yearly
- View expiry date
- View uploads

**Content Management**:
- Approve/reject uploaded songs
- Approve/reject uploaded videos
- Edit/delete any song or video
- Manage artists
- Enable/disable downloads per video
- View song cover images
- View video thumbnails
- View approval status

**Nominee Management**:
- View all nominee registrations
- View payment status
- View nomination status
- Nominee records created automatically after successful payment

**Download Management**:
- View all download records
- View download statistics per content
- Enable/disable download functionality per video

**Search Management**:
- View search logs
- Manage search indexing

**Upload Plans Management**:
- Change K10 plan price
- Change K100 plan price
- Change K300 plan price
- Changes saved to Supabase and reflected immediately

**Payment Management**:
- View all payment transactions
- View payment status: successful, pending, failed
- View transaction details: user ID, amount, payment method, Lipila transaction ID, package, status, date, failure reason

**Awards Management**:
- Create/edit/delete award seasons
- Create/edit/delete award categories
- Manage nominees per category
- View voting results
- Announce winners
- Set grand prizes
- Change nomination fee
- Change minimum vote price
- Publish Winner of the Month

**Voting Management**:
- View all votes
- View vote totals per nominee
- Verify payment status for votes

**Winner of the Month Management**:
- Select one winner per month
- Upload winner photo
- Enter artist name, award/category, month/year, prize, description
- Publish winner
- Auto-notify users when published

**Sponsors Management**:
- Add/edit/remove award sponsors
- Upload sponsor logos

**Hero Banner Management**:
- Upload banner images
- Set banner title, subtitle, button text, button destination
- Configure start date, end date
- Toggle active/inactive status
- Set display order
- Replace banner images
- Delete banners

**Notifications Management**:
- Send system-wide notifications
- Send targeted notifications to users
- Manage notification types

**Trending Content Management**:
- View trending calculations
- Manually feature content as trending
- Adjust trending algorithms

**App Settings** (Super Admin only):
- Configure platform settings
- Manage general configurations
- Manage admins
- Manage payments and integrations

## 4. Business Rules and Logic

### 4.1 Role System

**Roles**:
- user: Normal listener/fan, can stream music/videos, vote, buy merchandise, donate, apply to become artist or nominee
- artist: User becomes artist automatically after successful artist upload payment confirmation from Lipila, can upload songs/videos according to subscription, can manage own content
- admin: Manage content approvals, users, payments, nominees, awards
- super_admin: Full system access, manage admins, settings, payments and integrations

**Role Assignment**:
- Default role: user
- Artist role: Automatically assigned after successful payment verification from Lipila
- Admin role: Assigned by super_admin
- Super_admin role: Assigned by existing super_admin

### 4.2 Artist Payment Automation

**Payment Plans**:
- K10 Free Trial: Become artist, 1 song upload only, after first upload require upgrade
- K100 Weekly: Artist role, unlimited uploads, expires after 7 days
- K300 Yearly: Artist role, unlimited uploads, expires after 365 days

**Automatic Artist Activation Flow**:
1. User initiates payment via Lipila
2. Lipila processes payment
3. Lipila sends webhook to backend
4. Backend verifies transaction authenticity
5. If successful:
   - Automatically update profiles.role to artist
   - Enable upload access
   - Refresh session
   - Refresh profile data
   - Automatically open Upload page
   - Reload page automatically
6. If pending/failed/cancelled/insufficient funds/invalid: Keep plan inactive, allow retry

**No Manual Approval**:
- Do not require manual admin approval for paid artist registration
- Artist role activated immediately after payment verification

**Plan Expiry**:
- K10 plan: Single upload, no expiry, require upgrade after first upload
- K100 plan: Expires 7 days after activation
- K300 plan: Expires 365 days after activation
- Expired plans: User cannot upload until new plan purchased

**Admin Upload Exemption**:
- Admin/Super Admin upload unlimited MP3 and MP4 without paying any plan
- Admin uploads never require K10/K100/K300 packages or payment
- Admin uploads are approved by default or saveable as draft

### 4.3 Song Upload Requirements

**Required Fields**:
- Song title
- Artist name
- Genre
- Description
- Audio file (MP3)
- Song cover image (required)

**Song Cover Usage**:
- Uploaded song cover automatically used as:
  - Music card image
  - Player image
  - Search result image
  - Trending image
  - Shared link preview image
  - Artist page image
- If no cover exists: Generate default ZedVevo thumbnail

**Upload Processing**:
- MP3 files stored in Supabase Storage
- Song cover images stored in Supabase Storage
- Metadata stored in Supabase PostgreSQL
- Content status: Pending approval by Admin (except admin uploads)
- Approved content: Visible on platform
- Rejected content: Not visible, user notified

### 4.4 Video Upload and Thumbnail Generation

**Video Upload**:
- User selects MP4 file from device
- Enters metadata: video title, artist name, description
- Uploads file to Supabase Storage

**Automatic Thumbnail Generation**:
- System auto-generates thumbnail from uploaded video file
- Thumbnail stored in Supabase Storage
- Artist can edit thumbnail before publishing

**Thumbnail Replacement**:
- When artist replaces MP4 file, auto-generate new thumbnail
- Old thumbnail replaced with new one
- Artist can edit new thumbnail

### 4.5 Nominee Payment System

**Nominee Registration Flow**:
1. User chooses award category
2. User pays nomination fee through Lipila
3. Lipila processes payment
4. Backend receives webhook from Lipila
5. Backend verifies payment
6. When Lipila confirms payment, automatically:
   - Create nominee record
   - Set payment_status to successful
   - Set nomination_status to approved
   - Add nominee to awards page
   - Generate nominee profile card
7. If payment fails: Nominee record not created, user can retry

**No Manual Approval**:
- No manual approval needed after successful payment
- Nominee automatically approved and added to awards page

**Nominee Card Display**:
- Nominee image
- Nominee name
- Category
- Vote count
- Vote button
- Share button
- Profile button

**Nominee Grid Layout**:
- Desktop: 4 cards per row
- Tablet: 2 cards per row
- Mobile: 1 card per row

### 4.6 Trending System

**Automatic Trending Calculation**:
- Combine real Zambian music discovery with app uploaded songs and videos
- Rank content using: views, plays, likes, shares, recent activity

**Trending Categories**:
- Trending Songs
- Trending Videos
- Rising Artists
- Popular Nominees

**Zambian Music Discovery**:
- Prioritize Zambian artists
- Prioritize Zambian genres
- Prioritize Zambian music videos
- Prioritize Zambian trending content
- Mix ZedVevo uploaded content with approved external Zambian music sources where allowed

**Homepage Promotion**:
- Automatically promote current Zambian trending songs
- Automatically promote popular Zambian videos
- Automatically promote new Zambian releases

### 4.7 Download System

**Download Process**:
1. User clicks download button on song or video
2. System retrieves actual MP3/MP4 file from Supabase Storage
3. File downloaded to user's device
4. Download count incremented only after successful download
5. Download record saved to database with user ID, content ID, download date

**Download Permissions**:
- Songs: Always downloadable
- Videos: Downloadable only if admin enables downloads for that video

**Download Tracking**:
- Display total download count on songs and videos
- Record every download in database
- Users view all downloaded content on My Downloads page

### 4.8 Global Search

**Search Functionality**:
- Fast search connected to Supabase database
- Search songs by title, artist, genre
- Search videos by title, creator
- Search artists by profile
- Search nominees by name, category
- Live results while typing
- Show cover artwork and video thumbnails
- Click result to open content

**Search Filters**:
- All, Music, Videos, Artists, Nominees

**Search Sorting**:
- Relevance, Newest, Most Played, Most Downloaded, Most Viewed

**Search Results**:
- Only show approved/public content
- Display result count
- Content cards with metadata

### 4.9 Notification System

**Automatic Notifications**:
- Artist: Your artist account is active. Start uploading.
- Artist: Your upload plan expires soon.
- Artist: Your song has been approved.
- Artist: Your video thumbnail was generated.
- Nominee: Your nomination payment was successful.
- Nominee: You are now nominated.
- Users: New trending Zambian music available.
- Award winners announced
- Winner of the Month published
- Weekly trending updated
- New awards opened
- Voting opened/closing
- Successful/failed payments
- Package expiry reminders

**Notification Bell**:
- Animated bell icon in header
- Display unread notification count badge
- Click to open notification dropdown panel

**Notification Actions**:
- Open notification
- Mark as read
- Delete notification
- Mark all as read

**Notification Storage**:
- All notifications stored in Supabase database
- Users view notifications on Notifications page

### 4.10 Profile Avatar System

**Avatar Upload**:
- Allow every user role to upload profile picture
- Upload from device: phone gallery or computer files
- Upload to Supabase Storage avatars bucket
- Update profiles.avatar_url

**Avatar Display**:
- Show instantly everywhere:
  - Header avatar
  - Artist profile
  - Nominee profile
  - Comments
- Default avatar if not uploaded

### 4.11 Content Ownership and Permissions

**User Permissions**:
- Users can edit/replace/delete only their own uploads
- Users can view only their own payment history
- Users can view only their own nominations and votes
- Users can view only their own downloads
- Users can view only their own notifications
- Enforced via Supabase Row Level Security (RLS)

**Artist Permissions**:
- Artists can upload songs and videos according to subscription
- Artists can manage own content
- Artists can edit song metadata, replace MP3 file, replace cover image, delete song
- Artists can edit video metadata, replace MP4 file, edit thumbnail, delete video

**Admin Permissions**:
- Admins can manage all content (songs, videos, users, payments, awards, downloads, notifications, trending)
- Admins can approve/reject uploads
- Admins can change pricing
- Admins can enable/disable downloads per video
- Admins can publish Winner of the Month

**Super Admin Permissions**:
- Full system access
- Manage admins
- Manage settings
- Manage payments and integrations

### 4.12 Awards Voting

**Voting Flow**:
1. User selects nominee
2. Enters number of votes (minimum K5 per vote)
3. Selects payment method: Mobile Money or Card
4. Pays via Lipila
5. Backend verifies payment
6. Votes added only after successful payment verification
7. Vote totals updated
8. Payment record saved
9. User notified after verification
10. If payment fails: Votes not added, user can retry

**Vote Counting**:
- Each K5 = 1 vote
- K10 = 2 votes, K50 = 10 votes, etc.
- Votes tracked per user per nominee

### 4.13 Winner of the Month

**Winner Selection**:
- Admin selects one winner per month
- Admin uploads winner photo
- Admin enters artist name, award/category, month/year, prize, description
- Admin publishes winner

**Winner Display**:
- Feature on home page
- Display on awards page
- Show in notification panel

**Winner Notification**:
- Auto-notify all users when new monthly winner announced

### 4.14 Payment Security

**Backend Processing**:
- All Lipila API calls handled via Supabase Edge Functions
- Lipila credentials never exposed in frontend code
- Webhook verification for payment confirmation
- Transaction ID and idempotency protection to prevent duplicate processing

**Data Storage**:
- Store: user ID, amount, payment method, Lipila transaction ID, package, status, date, failure reason
- Never store: card number, CVV, PIN, sensitive card information

**Transaction Verification**:
- Backend queries Lipila API to verify transaction status
- Cross-check transaction ID and amount
- Activate plan/nomination/votes only after verification

**Server-Side Verification**:
- All payments verified server-side
- All downloads verified server-side
- All votes verified server-side
- All upload permissions verified server-side

### 4.15 Content Statistics

**Music Statistics**:
- Track play count per song
- Track download count per song
- Track like count per song
- Track share count per song
- Update on each event
- Display on music page and user dashboard

**Video Statistics**:
- Track view count per video
- Track download count per video
- Track like count per video
- Track share count per video
- Update on each event
- Display on video page and user dashboard

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|----------|----------|
| Payment fails during artist plan purchase | Plan remains inactive, display error message, allow user to retry payment |
| Insufficient funds during payment | Display message: Payment unsuccessful. Your payment could not be completed because there were insufficient funds. Please add sufficient funds and try again. Allow retry |
| User uploads song without cover image | Block upload, display error message requiring cover image |
| User attempts upload without active plan | Block upload, prompt to purchase plan |
| Admin uploads content | No plan required, upload immediately |
| User attempts to edit another user's content | Block action, display error message |
| Admin changes plan price while user is purchasing | Use price at time of purchase initiation |
| Lipila webhook fails to deliver | Backend periodically queries Lipila API to verify pending transactions |
| User closes browser during payment | Payment status remains pending, user can check status in dashboard and retry if needed |
| Video upload fails mid-process | Display error, allow user to retry upload |
| Thumbnail generation fails | Use default placeholder thumbnail, log error for admin review |
| Artist edits video and replaces MP4 file | Auto-generate new thumbnail, allow artist to edit before publishing |
| User attempts to vote with amount below K5 | Block vote, display minimum amount requirement |
| Nominee registration payment pending | Nomination not created, user can check payment status and retry |
| User's plan expires during active upload | Complete current upload, block subsequent uploads until new plan purchased |
| K10 Free Trial user attempts second upload | Block upload, prompt to upgrade to K100 or K300 plan |
| Download fails mid-process | Do not increment download count, allow user to retry download |
| User attempts to download video with downloads disabled | Block download, display message that downloads are disabled for this video |
| Search returns no results | Display No results found message |
| Notification bell shows incorrect unread count | Recalculate unread count from database |
| Trending calculation fails | Log error, use previous trending data |
| Admin attempts to publish Winner of the Month without required fields | Block publish, display validation errors |
| User attempts to register as nominee without payment | Block registration, prompt to complete payment |
| User attempts to vote without payment | Block vote, prompt to complete payment |
| User uploads profile avatar exceeding size limit | Display error, prevent upload |
| Artist role not activated after successful payment | Backend logs error, admin can manually verify and activate |
| Nominee card buttons not working | Log error, display error message to user |
| Zambian music discovery feed fails to load | Display error message, allow retry |

## 6. Acceptance Criteria

1. User registers account and logs in successfully
2. User purchases K100 artist plan via Lipila Mobile Money, payment verified, profiles.role automatically updated to artist, session refreshed, Upload page automatically opened
3. Artist uploads MP3 file with required metadata including song cover image, file and cover stored in Supabase Storage, metadata saved to database
4. Admin approves uploaded song, song appears on Music page with uploaded cover image
5. User plays song on Music Page, play count increments, song cover displayed in player
6. User searches for song by title, search results display song with cover art, user clicks to play
7. User registers as nominee for award category, pays nomination fee via Lipila, after payment verification nominee record automatically created with payment_status successful and nomination_status approved, nominee card appears on awards page
8. Another user votes for nominee with K10 payment via Lipila, 2 votes added after payment verification, vote count updated on nominee card
9. User uploads profile avatar from device, avatar stored in Supabase Storage avatars bucket, profiles.avatar_url updated, avatar displayed in header and profile page
10. Trending page displays Zambian trending songs, platform trending videos, rising artists, popular nominees with automatic ranking
11. Artist uploads video, system auto-generates thumbnail, artist edits thumbnail before publishing, video appears on Videos page with edited thumbnail
12. Admin publishes Winner of the Month, winner appears on home page, all users receive automatic notification
13. K10 Free Trial artist uploads first song successfully, attempts second upload, system blocks upload and prompts to upgrade to K100 or K300 plan

## 7. Out of Scope for This Release

- Social features: comments, user-to-user messaging, artist profiles with follower systems
- Advanced analytics: detailed listening patterns, demographic breakdowns, engagement heatmaps
- Playlist creation and management by users
- Collaborative playlists
- Offline download functionality
- Live streaming capabilities
- Podcast hosting and management
- Multi-language support beyond English
- Third-party integrations: Spotify, Apple Music, YouTube
- Advanced audio features: equalizer, audio effects, crossfade
- Video editing tools within platform
- Automated content moderation using AI
- Referral and affiliate programs
- Subscription tiers beyond upload plans
- Mobile native applications (iOS/Android apps)
- Push notifications
- Email marketing campaigns
- Advanced SEO optimization tools
- Content recommendation algorithms beyond basic trending/popular
- Multi-currency support beyond Kwacha
- International payment gateways beyond Lipila
- Advanced search filters: date range, duration, file size
- Batch download functionality
- Download history export
- Notification preferences customization
- Trending content export
- Award voting leaderboards
- Nominee profile pages beyond basic card display
- Winner gallery with historical data visualization
- Artist verification badges
- Content licensing and rights management
- Automated royalty distribution
- Advanced user roles beyond user/artist/admin/super_admin
- Multi-admin permission levels
- Audit logs for admin actions
- Automated backup and restore functionality
- Custom branding for white-label deployments