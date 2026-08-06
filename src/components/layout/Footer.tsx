import { Link } from 'react-router-dom'
import { Music, Video, ShoppingBag, Mic, Calendar, Info, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react'

const footerLinks = {
  music: [
    { label: 'Browse Music', href: '/music' },
    { label: 'New Releases', href: '/music?sort=newest' },
    { label: 'Top Charts', href: '/music?sort=popular' },
    { label: 'Genres', href: '/genres' },
  ],
  videos: [
    { label: 'Watch Videos', href: '/videos' },
    { label: 'Music Videos', href: '/videos?type=music' },
    { label: 'Live Sessions', href: '/videos?type=live' },
  ],
  store: [
    { label: 'Shop', href: '/store' },
    { label: 'Featured', href: '/store?sort=featured' },
    { label: 'Categories', href: '/store/categories' },
  ],
  artists: [
    { label: 'Browse Artists', href: '/artists' },
    { label: 'Become an Artist', href: '/artist/become' },
    { label: 'Artist Dashboard', href: '/artist' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
}

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-deep-black">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-electric-blue to-electric">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">ZedVevo</span>
            </Link>
            <p className="text-sm text-gray-400 mb-4">
              The best Zambian music streaming and digital marketplace platform.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-electric transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Music Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Music</h3>
            <ul className="space-y-2">
              {footerLinks.music.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-electric transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Videos Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Videos</h3>
            <ul className="space-y-2">
              {footerLinks.videos.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-electric transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Store Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Store</h3>
            <ul className="space-y-2">
              {footerLinks.store.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-electric transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-electric transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} ZedVevo. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Lusaka, Zambia
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                support@zedvevo.com
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
