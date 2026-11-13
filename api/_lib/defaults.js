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
    game: 'https://play.gametribeng.com',
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
    video: 'bandicam 2025-06-04 17-13-40-037.mp4',
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
      { src: 'IMG_5307.MP4' },
      { src: 'IMG_5308.MP4' },
      { src: 'IMG_5308.MP4' },
      { src: 'IMG_5307.MP4' }
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
    { id: 'sponsored_single', label: 'Sponsored Tickets — Single', price: 3000, admits: 1, capacity: 0, active: true },
    { id: 'early_single', label: 'Early Bird — Single', price: 5000, admits: 1, capacity: 0, active: false },
    { id: 'early_group', label: 'Early Bird — Group of 4', price: 18000, admits: 4, capacity: 0, active: false },
    { id: 'wave_single', label: 'First Wave — Single', price: 7000, admits: 1, capacity: 0, active: true },
    { id: 'wave_group', label: 'First Wave — Group of 4', price: 26000, admits: 4, capacity: 0, active: true }
  ],

  /* Checkout options. maxQuantity = most tickets one buyer can add to a
     single payment (they can still pay again for more). */
  ticketing: { maxQuantity: 50, capacityTotal: 0, showLeftBelow: 30 },

  /* ---------- Other pages (About, Memories, FAQs, Contact, Partner) ---------- */
  pages: {
    about: {
      pill: 'About Us',
      title: 'Who We Are',
      intro:
        'Game Tribe is a full-day playground for gamers, creators, students, music lovers and every friend who came to make a memory.',
      story: [
        'Game Tribe Fest brings the Game Tribe community together in Abraka for a day of games, banter and hangout. 2026 is our very first edition, and we are building it with the community, the vendors and the brands that make a day like this possible.',
        'Pull up, pick your game, meet your people and enjoy the tribe.'
      ],
      pillarsTitle: 'What we’re about',
      pillars: [
        { emoji: '🎲', title: 'Games', text: 'Giant archery, giant Jenga, the jumbo hopscotch mat, tug of war and more. Friendly competition for every crew.' },
        { emoji: '💬', title: 'Banters', text: 'Great gist, loud laughter and friendly rivalry. The best part of any game is who you play it with.' },
        { emoji: '🛋️', title: 'Hangout', text: 'Relax, shop with our vendors and soak up the day with your friends.' },
        { emoji: '🤝', title: 'Connect', text: 'Meet new people, find your tribe and make connections that last beyond the day.' }
      ],
      ctaTitle: 'Come play with us',
      ctaText: 'Grab your ticket, bring your crew and be part of the very first Game Tribe Fest.'
    },

    memories: {
      pill: 'Memories',
      title: 'Memories from the Tribe',
      intro: 'Photos and videos from Game Tribe events, all in one place.',
      emptyTitle: 'Our first memories are coming soon',
      emptyText:
        'Game Tribe Fest 2026 is our very first edition. Photos and videos from the day will be shared right here after the event.',
      /* One gallery per year. Add a year from the dashboard, then upload its
         photos and videos (current event or past events):
         { id, year, title, description, photos: [{image, caption}], videos: [{src, caption}] } */
      years: []
    },

    faq: {
      pill: 'FAQs',
      title: 'Frequently Asked Questions',
      intro: 'Got questions? We have your answers.',
      categories: [
        {
          id: 'tickets',
          title: 'Tickets',
          items: [
            { q: 'How do I buy a ticket?', a: 'Tap “Buy Your Tickets”, choose a ticket type, enter your name, email and phone number, and pay securely with Paystack.' },
            { q: 'Which ticket types are available?', a: 'The available ticket types and their prices are shown when you tap “Buy Your Tickets”.' },
            { q: 'Will I get a confirmation?', a: 'Yes. Right after your payment is verified, we email your ticket with your ticket number. If you can’t see it, check your spam folder.' },
            { q: 'What do I show at the entrance?', a: 'Show your confirmation email with your ticket number at the entrance.' },
            { q: 'I paid but my email has not arrived. What should I do?', a: 'Give it a few minutes and check your spam folder. If it still hasn’t arrived, email us with your name and payment reference and we will sort it out.' }
          ]
        },
        {
          id: 'event',
          title: 'The Event',
          items: [
            { q: 'When and where is Game Tribe Fest?', a: 'Game Tribe Fest 2026 holds on 27 November 2026 at Ojeta Primary School, Campus 2 Road, Abraka, Delta State.' },
            { q: 'What happens on the day?', a: 'A full day of games, banter and hangout: giant archery, giant Jenga, the jumbo hopscotch mat, tug of war and more, with vendors and great company.' },
            { q: 'Is this the first Game Tribe Fest?', a: 'Yes, 2026 is our very first edition. Come be part of the story from the start.' },
            { q: 'How do I find the venue?', a: 'There is a map on the homepage under “Find The Venue”, with a button that opens the location in Google Maps.' }
          ]
        },
        {
          id: 'play',
          title: 'Game Tribe Live',
          items: [
            { q: 'What is Game Tribe Live?', a: 'A live quiz you play on your phone. A host opens a game and shows a 6-digit PIN, and everyone who joins answers the same questions at the same time.' },
            { q: 'How do I join a game?', a: 'Open the Play page, enter the PIN from the big screen or host, pick a nickname and you are in. You do not need an account.' },
            { q: 'Why do you ask for my phone number?', a: 'So the organisers can reach you if you win. It is never shown to other players.' },
            { q: 'Can I host my own game?', a: 'Yes. Open the Play page, choose Host a game and share the PIN with your players.' }
          ]
        },
        {
          id: 'partners',
          title: 'Vendors & Sponsors',
          items: [
            { q: 'How do I become a vendor?', a: 'Vendor spaces are limited. Tap “Get Vendor Space” to see the full vendor package, then message us on WhatsApp to secure your spot.' },
            { q: 'What does the vendor package include?', a: 'A vendor stand with table and 2 chairs, 2 event tickets, a confirmed vendorship flyer posted on social media with your brand tagged, and the chance to showcase and sell your products and services.' },
            { q: 'How can my brand sponsor the fest?', a: 'Open our proposal from the “Partner with us” page, then email or message us and we will shape a package that fits your brand.' }
          ]
        }
      ],
      stillTitle: 'Still have a question?',
      stillText: 'Send us a message and we’ll get back to you.'
    },

    contact: {
      pill: 'Contact',
      title: 'Get in Touch',
      intro:
        'Please check our FAQ page first, most answers are already there. Otherwise, send us a message and we’ll respond as soon as we can.',
      formTitle: 'Send us a message',
      successText: 'Thanks! Your message has been sent. We’ll reply as soon as we can.',
      cards: [
        { kind: 'email', title: 'General', text: 'Questions about Game Tribe Fest.' },
        { kind: 'email', title: 'Tickets & support', text: 'Payment or ticket problem? Include your name and payment reference.' },
        { kind: 'whatsapp', title: 'Join the tribe', text: 'Chat with the community and get updates first.' },
        { kind: 'venue', title: 'Find us', text: '' }
      ]
    },

    play: {
      pill: '🎮 Game Tribe Live',
      title: 'Play Game Tribe Live',
      intro: 'A live quiz you play on your phone. Join with a PIN, answer fast and climb the leaderboard.',
      joinTitle: 'Got a PIN?',
      joinText: 'Enter the 6-digit PIN shown on the big screen or shared by the host.',
      joinButton: 'Join the game',
      noPin: 'No PIN yet? Join our WhatsApp group to hear when the next live game starts.',
      stepsTitle: 'How it works',
      steps: [
        { title: 'Get the PIN', text: 'The host opens a game and shares a 6-digit PIN on the big screen, in a link or as a QR code.' },
        { title: 'Join on your phone', text: 'Enter the PIN, pick a nickname and add your phone number. No account needed.' },
        { title: 'Answer fast', text: 'Each question appears on every phone at once. Quicker right answers score more points.' }
      ],
      modesTitle: 'Pick your game',
      modes: [
        { emoji: '🧠', title: 'Game Tribe Quiz', text: '40 ready questions on the Bible, Nigeria, general knowledge, cartoons and games.' },
        { emoji: '🖼️', title: 'Guess the Picture', text: '30 pictures, four answers each. Spot the logo, the food, the flag or the cartoon.' }
      ],
      goodTitle: 'Good to know',
      goodText: 'We ask for a phone number so the organisers can reach you if you win. It is never shown to other players.',
      hostTitle: 'Want to host a game?',
      hostText: 'Run a live quiz for your crew, class or festival crowd. Open a room, show the PIN on a big screen and start playing.',
      hostButton: 'Host a game',
      ctaTitle: 'Love the game? Come play in person',
      ctaText: 'Game Tribe Fest brings the games to Abraka for a full day of banter and hangout.',
      teaserPill: '🎮 New · Play online',
      teaserTitle: 'Can’t wait for the day? Play Game Tribe Live',
      teaserText: 'Join a live quiz from your phone with a PIN. Answer fast, climb the leaderboard and see who the tribe’s top player is.',
      teaserButton: 'Play now'
    },

    partner: {
      pill: '📣 Partner with Game Tribe',
      titleTop: 'Partner',
      titleMid: 'with',
      titleBig: 'the Tribe',
      intro:
        'Put your brand in front of the Game Tribe community. Show up as a vendor or a sponsor at our very first Game Tribe Fest.',
      highlight: 'Vendor spaces are limited.',
      packagesTitle: 'Ways to partner',
      packages: [
        {
          name: 'Full Vendorship Package',
          badge: 'Vendors',
          price: '₦40,000',
          features: [
            'Vendor stand with table and 2 chairs',
            '2 event tickets',
            'Confirmed vendorship flyer posted on social media with your brand tagged',
            'Showcase and sell your products and services',
            'Great exposure to a vibrant gaming community'
          ],
          button: 'Get Vendor Space',
          action: 'vendor'
        },
        {
          name: 'Sponsor the Fest',
          badge: 'Sponsors',
          price: 'Let’s talk',
          features: [
            'See the full details in our proposal',
            'Talk to us to shape a package that fits your brand'
          ],
          button: 'View Our Proposal',
          action: 'proposal'
        }
      ],
      stepsTitle: 'How it works',
      steps: [
        { title: 'Choose how to partner', text: 'Vendor space or sponsorship, whichever suits your brand.' },
        { title: 'Talk to us', text: 'Message us on WhatsApp or email and we’ll answer your questions.' },
        { title: 'Secure your spot', text: 'Confirm early. Vendor spaces are limited.' }
      ],
      logosTitle: 'Brands already on board',
      note: 'Limited vendor spaces available. Secure your spot early!'
    }
  },

  /* Optional replacements. Leave empty to keep the built-in files. */
  files: { vendorFlyer: '', proposalPdf: '' }
};
