/*
 * Default website content.
 * This is exactly what the site shows today. The admin dashboard saves
 * changes to Supabase and they are merged on top of these defaults, so the
 * site keeps working even if Supabase is not configured yet.
 */
export const DEFAULT_CONTENT = {
  meta: {
    title: 'Game Tribe Fest — Abraka',
    description:
      'Game Tribe Fest, Abraka: a full-day playground for gamers, creators, students and music lovers. Pick your game, meet your people and enjoy the tribe.'
  },

  event: {
    date: '2026-11-27T17:00:00+01:00',
    guestCount: '200+',
    venueName: 'Find The Venue',
    address: 'Ojeta Primary School, Campus 2 Road, Abraka, Delta State',
    mapLat: 5.7910656,
    mapLng: 6.1026971
  },

  links: {
    whatsapp: 'https://chat.whatsapp.com/GbSblslBHcdJGbShVafLt3?mode=gi_t',
    vendorWhatsapp:
      'https://wa.me/2348103769079?text=Hi%2C%20I%27m%20interested%20in%20a%20vendor%20space%20at%20Game%20Tribe%20Fest',
    instagram: 'https://www.instagram.com/gametribe_abraka/',
    tiktok: 'https://www.tiktok.com/@gametribe_abraka',
    email: 'gametribe001@gmail.com'
  },

  hero: {
    pillBrand: '🎲 Game Tribe Fest',
    pillDate: '📅 27 Nov 2026',
    pillPlace: '📍 Abraka, Delta State',
    titleA: 'Game',
    titleB: 'Tribe',
    tagHighlight: 'Fest',
    tagRest: 'Abraka',
    subtitle: 'Abraka, your next big play date is here.',
    buttonTickets: 'Buy Your Tickets',
    buttonAttending: 'I Am Attending',
    photos: [
      'gallery-7.jpg',
      'gallery-1.jpg',
      'gallery-12.jpg',
      'gallery-3.jpg',
      'gallery-4.jpg',
      'gallery-9.jpg'
    ]
  },

  marquee: [
    '🎲 Games • Banters • Hangout • Connect',
    'Ojeta Primary School, Campus 2 Road, Abraka, Delta State',
    'A full-day playground for gamers, creators, students & music lovers',
    '🔥 200+ people going'
  ],

  countdown: { kicker: 'The countdown is on', title: 'See you in Abraka' },

  intro: {
    pill: '🎮 The big play date',
    headingA: 'Pull up. Pick your game.',
    headingB: 'Enjoy the tribe.',
    body:
      'A full-day playground for gamers, creators, students, music lovers and every friend who came to make a memory. Pull up, pick your game, meet your people and enjoy the tribe.',
    goldLine: 'Games • Banters • Hangout • Connect',
    poster: 'gallery-6.jpg',
    video: 'IMG_2170.MOV',
    caption: '▶ Watch the highlights'
  },

  expecting: {
    kicker: 'The tribe is growing',
    title: 'What We’re Expecting',
    subtitle:
      'A bigger day of games, great people and new connections across the Game Tribe community.',
    stats: [
      { value: '500 - 1K', label: 'Expected attendees' },
      { value: '15+', label: 'Sponsors & partners' },
      { value: '25+', label: 'Vendors' }
    ]
  },

  videos: {
    kicker: 'See it in action',
    title: 'Game Tribe Moments 🎮',
    subtitle: 'See what Game Tribe moments look like. Press play.',
    items: [
      { src: 'IMG_7468.MP4' },
      { src: 'IMG_7469.MP4' },
      { src: 'IMG_7470.MP4' },
      { src: 'IMG_7471.MP4' }
    ]
  },

  sponsors: {
    kicker: 'The brands behind the fun',
    title: 'Partners, Sponsors & Vendors',
    subtitle:
      'We’re creating space for the brands and businesses that make Game Tribe Fest even more memorable.',
    groups: [
      {
        id: 'sponsors', title: 'Sponsors', subtitle: '', size: 'normal',
        items: [
          { image: 'logo2.png', name: 'Sponsor' },
      { image: 'logo3.png', name: 'Sponsor' },
      { image: 'logo4.png', name: 'Sponsor' },
      { image: 'ueban-chopa.png', name: 'Sponsor' },
      { image: 'trixmix.png', name: 'Sponsor' },
      { image: 'onestop.png', name: 'Sponsor' },
      { image: 'instant-verify.PNG', name: 'Sponsor' },
      { image: 'campus-hub.jpeg', name: 'Sponsor' },
      { image: 'instantbuy.png', name: 'Sponsor' }
        ]
      },
      {
        id: 'vendors', title: 'Vendors', subtitle: '', size: 'normal',
        items: [
          { image: 'trixmix.png', name: 'Vendor' },
      { image: 'testicakes.png', name: 'Vendor' },
      { image: 'logo4.png', name: 'Vendor' },
      { image: 'logo1.png', name: 'Vendor' },
      { image: 'logo2.png', name: 'Vendor' },
      { image: 'logo3.png', name: 'Vendor' }
        ]
      },
      { id: 'partners', title: 'Partners', subtitle: '', size: 'normal', items: [] },
      { id: 'featured', title: 'Featured Brands', subtitle: '', size: 'large', items: [] },
      { id: 'media', title: 'Media Partners', subtitle: '', size: 'normal', items: [] }
    ]
  },

  vendorBand: {
    pill: '🛍️ Vendor spaces',
    headingA: 'Bring your brand',
    headingB: 'to the tribe',
    body:
      'Got something the community will love? Vendor spaces are limited—come sell, showcase and join the festival energy.',
    goldLine: 'Limited spots',
    image: 'gallery-5.jpg',
    button: 'Get Vendor Space'
  },

  games: {
    kicker: 'Pull up and play',
    title: 'Games On The Day',
    subtitle:
      'Bring your crew, find your game, and get ready for friendly competition all day long.',
    items: [
      { emoji: '🏹', kicker: 'Aim & shoot', name: 'Giant Archery', description: 'Take your shot at the target and see who in your crew has the steadiest aim.', image: 'game-1.jpg' },
      { emoji: '🧱', kicker: 'Steady hands', name: 'Giant Jenga', description: 'Pull, stack and hold your breath. One wrong move and the whole tower comes down.', image: 'game-2.jpg' },
      { emoji: '🦶', kicker: 'Hop & stretch', name: 'Hopscotch Mat', description: 'Hop, stretch and balance your way across the jumbo playmat with your crew.', image: 'game-3.jpeg' },
      { emoji: '🪢', kicker: 'Team up', name: 'Tug of war', description: 'Pick a side, dig in and pull. Teams, noise and a lot of laughter.', image: 'game-4.jpeg' }
    ]
  },

  quick: {
    kicker: 'Get in touch',
    title: 'Need A Quick Answer?',
    text: 'Send the Game Tribe team a message and we’ll get back to you.'
  },

  gallery: {
    kicker: 'Game Tribe Abraka',
    title: 'This Is What You’re Coming For',
    items: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 5, 14, 15, 16].map((n) => ({
      image: 'gallery-' + n + '.jpg'
    }))
  },

  join: { kicker: 'Be part of Game Tribe Fest', title: 'Ways to join the tribe.' },

  footer: {
    about: 'Play, connect and repeat in Abraka.',
    copyright: 'All rights reserved 2026, Game Tribe Fest.',
    tagline: 'Games • Banters • Hangout • Connect'
  },

  /* Ticket types. `price` is in naira. The server checks every payment
     against these prices, so what you set here is what must be paid. */
  tickets: [
    { id: 'sponsored_single', label: 'Sponsored Tickets — Single', price: 3000, active: true },
    { id: 'early_single', label: 'Early Bird — Single', price: 5000, active: false },
    { id: 'early_group', label: 'Early Bird — Group of 4', price: 18000, active: false },
    { id: 'wave_single', label: 'First Wave — Single', price: 7000, active: true },
    { id: 'wave_group', label: 'First Wave — Group of 4', price: 26000, active: true }
  ],

  /* Optional replacements. Leave empty to keep the built-in files. */
  files: { vendorFlyer: '', proposalPdf: '' }
};
