(function(){var n=0,seen={};function send(m,s,l,a){try{if(n>=5)return;var k=m+'|'+s+'|'+l;if(seen[k])return;seen[k]=1;n++;var b=JSON.stringify({message:String(m).slice(0,300),source:String(s||'').slice(0,200),line:l||0,page:location.pathname,area:a||'browser'});if(navigator.sendBeacon){navigator.sendBeacon('/api/health?report=1',new Blob([b],{type:'application/json'}));}else{fetch('/api/health?report=1',{method:'POST',headers:{'Content-Type':'application/json'},body:b,keepalive:true});}}catch(e){}}window.addEventListener('error',function(e){if(!e.filename||e.filename.indexOf(location.origin)!==0)return;send(e.message,e.filename,e.lineno);});window.addEventListener('unhandledrejection',function(e){var r=e.reason;send(r&&r.message?r.message:String(r),'promise',0);});window.gtReport=send;})();
/* Game Tribe sub-pages: loads content saved from the admin dashboard and draws the page. */
(function(){
  'use strict';
  var FALLBACK={"meta":{"title":"Game Tribe Fest — Abraka","description":"Game Tribe Fest, Abraka: a full-day playground for gamers, creators, students and music lovers. Pick your game, meet your people and enjoy the tribe."},"event":{"date":"2026-11-27T17:00:00+01:00","guestCount":"200+","venueName":"Find The Venue","address":"Ojeta Primary School, Campus 2 Road, Abraka, Delta State","mapLat":5.7910656,"mapLng":6.1026971},"links":{"whatsapp":"https://chat.whatsapp.com/GbSblslBHcdJGbShVafLt3?mode=gi_t","vendorWhatsapp":"https://wa.me/2348103769079?text=Hi%2C%20I%27m%20interested%20in%20a%20vendor%20space%20at%20Game%20Tribe%20Fest","instagram":"https://www.instagram.com/gametribe_abraka/","tiktok":"https://www.tiktok.com/@gametribe_abraka","game":"https://play.gametribeng.com","email":"gametribe001@gmail.com"},"hero":{"pillBrand":"🎲 Game Tribe Fest","pillDate":"📅 27 Nov 2026","pillPlace":"📍 Abraka, Delta State","titleA":"Game","titleB":"Tribe","tagHighlight":"Fest","tagRest":"Abraka","subtitle":"Abraka, your next big play date is here.","buttonTickets":"Buy Your Tickets","buttonAttending":"I Am Attending","photos":["gallery-7.jpg","gallery-1.jpg","gallery-12.jpg","gallery-3.jpg","gallery-4.jpg","gallery-9.jpg"]},"marquee":["🎲 Games • Banters • Hangout • Connect","Ojeta Primary School, Campus 2 Road, Abraka, Delta State","A full-day playground for gamers, creators, students & music lovers","🔥 200+ people going"],"countdown":{"kicker":"The countdown is on","title":"See you in Abraka"},"intro":{"pill":"🎮 The big play date","headingA":"Pull up. Pick your game.","headingB":"Enjoy the tribe.","body":"A full-day playground for gamers, creators, students, music lovers and every friend who came to make a memory. Pull up, pick your game, meet your people and enjoy the tribe.","goldLine":"Games • Banters • Hangout • Connect","poster":"gallery-6.jpg","video":"bandicam 2025-06-04 17-13-40-037.mp4","caption":"▶ Watch the highlights"},"expecting":{"kicker":"The tribe is growing","title":"What We’re Expecting","subtitle":"A bigger day of games, great people and new connections across the Game Tribe community.","stats":[{"value":"500 - 1K","label":"Expected attendees"},{"value":"15+","label":"Sponsors & partners"},{"value":"25+","label":"Vendors"}]},"videos":{"kicker":"See it in action","title":"Game Tribe Moments 🎮","subtitle":"See what Game Tribe moments look like. Press play.","items":[{"src":"IMG_5307.MP4"},{"src":"IMG_5308.MP4"},{"src":"IMG_5308.MP4"},{"src":"IMG_5307.MP4"}]},"sponsors":{"kicker":"The brands behind the fun","title":"Partners, Sponsors & Vendors","subtitle":"We’re creating space for the brands and businesses that make Game Tribe Fest even more memorable.","groups":[{"id":"sponsors","title":"Sponsors","subtitle":"","size":"normal","items":[{"image":"logo2.png","name":"Sponsor"},{"image":"logo3.png","name":"Sponsor"},{"image":"logo4.png","name":"Sponsor"},{"image":"ueban-chopa.png","name":"Sponsor"},{"image":"trixmix.png","name":"Sponsor"},{"image":"onestop.png","name":"Sponsor"},{"image":"instant-verify.PNG","name":"Sponsor"},{"image":"campus-hub.jpeg","name":"Sponsor"},{"image":"instantbuy.png","name":"Sponsor"}]},{"id":"vendors","title":"Vendors","subtitle":"","size":"normal","items":[{"image":"trixmix.png","name":"Vendor"},{"image":"testicakes.png","name":"Vendor"},{"image":"logo4.png","name":"Vendor"},{"image":"logo1.png","name":"Vendor"},{"image":"logo2.png","name":"Vendor"},{"image":"logo3.png","name":"Vendor"}]},{"id":"partners","title":"Partners","subtitle":"","size":"normal","items":[]},{"id":"featured","title":"Featured Brands","subtitle":"","size":"large","items":[]},{"id":"media","title":"Media Partners","subtitle":"","size":"normal","items":[]}]},"vendorBand":{"pill":"🛍️ Vendor spaces","headingA":"Bring your brand","headingB":"to the tribe","body":"Got something the community will love? Vendor spaces are limited—come sell, showcase and join the festival energy.","goldLine":"Limited spots","image":"gallery-5.jpg","button":"Get Vendor Space"},"games":{"kicker":"Pull up and play","title":"Games On The Day","subtitle":"Bring your crew, find your game, and get ready for friendly competition all day long.","items":[{"emoji":"🏹","kicker":"Aim & shoot","name":"Giant Archery","description":"Take your shot at the target and see who in your crew has the steadiest aim.","image":"game-1.jpg"},{"emoji":"🧱","kicker":"Steady hands","name":"Giant Jenga","description":"Pull, stack and hold your breath. One wrong move and the whole tower comes down.","image":"game-2.jpg"},{"emoji":"🦶","kicker":"Hop & stretch","name":"Hopscotch Mat","description":"Hop, stretch and balance your way across the jumbo playmat with your crew.","image":"game-3.jpeg"},{"emoji":"🪢","kicker":"Team up","name":"Tug of war","description":"Pick a side, dig in and pull. Teams, noise and a lot of laughter.","image":"game-4.jpeg"}]},"quick":{"kicker":"Get in touch","title":"Need A Quick Answer?","text":"Send the Game Tribe team a message and we’ll get back to you."},"gallery":{"kicker":"Game Tribe Abraka","title":"This Is What You’re Coming For","items":[{"image":"gallery-1.jpg"},{"image":"gallery-2.jpg"},{"image":"gallery-3.jpg"},{"image":"gallery-4.jpg"},{"image":"gallery-6.jpg"},{"image":"gallery-7.jpg"},{"image":"gallery-8.jpg"},{"image":"gallery-9.jpg"},{"image":"gallery-10.jpg"},{"image":"gallery-11.jpg"},{"image":"gallery-12.jpg"},{"image":"gallery-13.jpg"},{"image":"gallery-5.jpg"},{"image":"gallery-14.jpg"},{"image":"gallery-15.jpg"},{"image":"gallery-16.jpg"}]},"join":{"kicker":"Be part of Game Tribe Fest","title":"Ways to join the tribe."},"footer":{"about":"Play, connect and repeat in Abraka.","copyright":"All rights reserved 2026, Game Tribe Fest.","tagline":"Games • Banters • Hangout • Connect"},"tickets":[{"id":"sponsored_single","label":"Sponsored Tickets — Single","price":3000,"active":true},{"id":"early_single","label":"Early Bird — Single","price":5000,"active":false},{"id":"early_group","label":"Early Bird — Group of 4","price":18000,"active":false},{"id":"wave_single","label":"First Wave — Single","price":7000,"active":true},{"id":"wave_group","label":"First Wave — Group of 4","price":26000,"active":true}],"pages":{"about":{"pill":"About Us","title":"Who We Are","intro":"Game Tribe is a full-day playground for gamers, creators, students, music lovers and every friend who came to make a memory.","story":["Game Tribe Fest brings the Game Tribe community together in Abraka for a day of games, banter and hangout. 2026 is our very first edition, and we are building it with the community, the vendors and the brands that make a day like this possible.","Pull up, pick your game, meet your people and enjoy the tribe."],"pillarsTitle":"What we’re about","pillars":[{"emoji":"🎲","title":"Games","text":"Giant archery, giant Jenga, the jumbo hopscotch mat, tug of war and more. Friendly competition for every crew."},{"emoji":"💬","title":"Banters","text":"Great gist, loud laughter and friendly rivalry. The best part of any game is who you play it with."},{"emoji":"🛋️","title":"Hangout","text":"Relax, shop with our vendors and soak up the day with your friends."},{"emoji":"🤝","title":"Connect","text":"Meet new people, find your tribe and make connections that last beyond the day."}],"ctaTitle":"Come play with us","ctaText":"Grab your ticket, bring your crew and be part of the very first Game Tribe Fest."},"memories":{"pill":"Memories","title":"Memories from the Tribe","intro":"Photos and videos from Game Tribe events, all in one place.","emptyTitle":"Our first memories are coming soon","emptyText":"Game Tribe Fest 2026 is our very first edition. Photos and videos from the day will be shared right here after the event.","years":[]},"faq":{"pill":"FAQs","title":"Frequently Asked Questions","intro":"Got questions? We have your answers.","categories":[{"id":"tickets","title":"Tickets","items":[{"q":"How do I buy a ticket?","a":"Tap “Buy Your Tickets”, choose a ticket type, enter your name, email and phone number, and pay securely with Paystack."},{"q":"Which ticket types are available?","a":"The available ticket types and their prices are shown when you tap “Buy Your Tickets”."},{"q":"Will I get a confirmation?","a":"Yes. Right after your payment is verified, we email your ticket with your ticket number. If you can’t see it, check your spam folder."},{"q":"What do I show at the entrance?","a":"Show your confirmation email with your ticket number at the entrance."},{"q":"I paid but my email has not arrived. What should I do?","a":"Give it a few minutes and check your spam folder. If it still hasn’t arrived, email us with your name and payment reference and we will sort it out."}]},{"id":"event","title":"The Event","items":[{"q":"When and where is Game Tribe Fest?","a":"Game Tribe Fest 2026 holds on 27 November 2026 at Ojeta Primary School, Campus 2 Road, Abraka, Delta State."},{"q":"What happens on the day?","a":"A full day of games, banter and hangout: giant archery, giant Jenga, the jumbo hopscotch mat, tug of war and more, with vendors and great company."},{"q":"Is this the first Game Tribe Fest?","a":"Yes, 2026 is our very first edition. Come be part of the story from the start."},{"q":"How do I find the venue?","a":"There is a map on the homepage under “Find The Venue”, with a button that opens the location in Google Maps."}]},{"id":"play","title":"Game Tribe Live","items":[{"q":"What is Game Tribe Live?","a":"A live quiz you play on your phone. A host opens a game and shows a 6-digit PIN, and everyone who joins answers the same questions at the same time."},{"q":"How do I join a game?","a":"Open the Play page, enter the PIN from the big screen or host, pick a nickname and you are in. You do not need an account."},{"q":"Why do you ask for my phone number?","a":"So the organisers can reach you if you win. It is never shown to other players."},{"q":"Can I host my own game?","a":"Yes. Open the Play page, choose Host a game and share the PIN with your players."}]},{"id":"partners","title":"Vendors & Sponsors","items":[{"q":"How do I become a vendor?","a":"Vendor spaces are limited. Tap “Get Vendor Space” to see the full vendor package, then message us on WhatsApp to secure your spot."},{"q":"What does the vendor package include?","a":"A vendor stand with table and 2 chairs, 2 event tickets, a confirmed vendorship flyer posted on social media with your brand tagged, and the chance to showcase and sell your products and services."},{"q":"How can my brand sponsor the fest?","a":"Open our proposal from the “Partner with us” page, then email or message us and we will shape a package that fits your brand."}]}],"stillTitle":"Still have a question?","stillText":"Send us a message and we’ll get back to you."},"contact":{"pill":"Contact","title":"Get in Touch","intro":"Please check our FAQ page first, most answers are already there. Otherwise, send us a message and we’ll respond as soon as we can.","formTitle":"Send us a message","successText":"Thanks! Your message has been sent. We’ll reply as soon as we can.","cards":[{"kind":"email","title":"General","text":"Questions about Game Tribe Fest."},{"kind":"email","title":"Tickets & support","text":"Payment or ticket problem? Include your name and payment reference."},{"kind":"whatsapp","title":"Join the tribe","text":"Chat with the community and get updates first."},{"kind":"venue","title":"Find us","text":""}]},"play":{"pill":"🎮 Game Tribe Live","title":"Play Game Tribe Live","intro":"A live quiz you play on your phone. Join with a PIN, answer fast and climb the leaderboard.","joinTitle":"Got a PIN?","joinText":"Enter the 6-digit PIN shown on the big screen or shared by the host.","joinButton":"Join the game","noPin":"No PIN yet? Join our WhatsApp group to hear when the next live game starts.","stepsTitle":"How it works","steps":[{"title":"Get the PIN","text":"The host opens a game and shares a 6-digit PIN on the big screen, in a link or as a QR code."},{"title":"Join on your phone","text":"Enter the PIN, pick a nickname and add your phone number. No account needed."},{"title":"Answer fast","text":"Each question appears on every phone at once. Quicker right answers score more points."}],"modesTitle":"Pick your game","modes":[{"emoji":"🧠","title":"Game Tribe Quiz","text":"40 ready questions on the Bible, Nigeria, general knowledge, cartoons and games."},{"emoji":"🖼️","title":"Guess the Picture","text":"30 pictures, four answers each. Spot the logo, the food, the flag or the cartoon."}],"goodTitle":"Good to know","goodText":"We ask for a phone number so the organisers can reach you if you win. It is never shown to other players.","hostTitle":"Want to host a game?","hostText":"Run a live quiz for your crew, class or festival crowd. Open a room, show the PIN on a big screen and start playing.","hostButton":"Host a game","ctaTitle":"Love the game? Come play in person","ctaText":"Game Tribe Fest brings the games to Abraka for a full day of banter and hangout.","teaserPill":"🎮 New · Play online","teaserTitle":"Can’t wait for the day? Play Game Tribe Live","teaserText":"Join a live quiz from your phone with a PIN. Answer fast, climb the leaderboard and see who the tribe’s top player is.","teaserButton":"Play now"},"partner":{"pill":"📣 Partner with Game Tribe","titleTop":"Partner","titleMid":"with","titleBig":"the Tribe","intro":"Put your brand in front of the Game Tribe community. Show up as a vendor or a sponsor at our very first Game Tribe Fest.","highlight":"Vendor spaces are limited.","packagesTitle":"Ways to partner","packages":[{"name":"Full Vendorship Package","badge":"Vendors","price":"₦40,000","features":["Vendor stand with table and 2 chairs","2 event tickets","Confirmed vendorship flyer posted on social media with your brand tagged","Showcase and sell your products and services","Great exposure to a vibrant gaming community"],"button":"Get Vendor Space","action":"vendor"},{"name":"Sponsor the Fest","badge":"Sponsors","price":"Let’s talk","features":["See the full details in our proposal","Talk to us to shape a package that fits your brand"],"button":"View Our Proposal","action":"proposal"}],"stepsTitle":"How it works","steps":[{"title":"Choose how to partner","text":"Vendor space or sponsorship, whichever suits your brand."},{"title":"Talk to us","text":"Message us on WhatsApp or email and we’ll answer your questions."},{"title":"Secure your spot","text":"Confirm early. Vendor spaces are limited."}],"logosTitle":"Brands already on board","note":"Limited vendor spaces available. Secure your spot early!"}},"files":{"vendorFlyer":"","proposalPdf":""}};
  var PAGE=document.body.getAttribute('data-page')||'';

  function $(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function br(s){return esc(s).replace(/\n/g,'<br>');}
  function get(o,p){return p.split('.').reduce(function(a,k){return a==null?a:a[k];},o);}
  function url(u){u=String(u||'').trim();return /^(https?:\/\/|mailto:|tel:|\/|#|data:image\/|[\w\-. %()\/]+$)/i.test(u)?u:'';}
  function setHtml(id,h){var e=$(id);if(e)e.innerHTML=h;}
  function mediaSrc(v){v=String(v||'').trim();if(!v)return '';return /^(https?:|data:image\/|\/)/i.test(v)?v:'/'+v;}
  var legacyIcons={'🏹':'target','🧱':'layers','🦶':'play','🪢':'users','🎲':'gamepad','💬':'message','🛋️':'store','🤝':'handshake','🧠':'help','🖼️':'images','⭐':'trophy'};
  function iconFor(item){return item&&(item.icon||legacyIcons[item.emoji])||'info';}
  function show(id,on){var e=$(id);if(e)e.hidden=!on;}
  function fill(c,f){ /* copy any missing keys from the built-in defaults */
    if(f&&typeof f==='object'&&!Array.isArray(f)){
      if(!c||typeof c!=='object'||Array.isArray(c))return JSON.parse(JSON.stringify(f));
      Object.keys(f).forEach(function(k){c[k]=k in c?fill(c[k],f[k]):JSON.parse(JSON.stringify(f[k]));});
    }
    return c;
  }
  /* a sponsor link opens the Game Tribe sponsor page: /get.example.com */
  function internalHref(link){
    try{var u=new URL(link,location.href);if(/^https?:$/.test(u.protocol))return '/'+u.host.toLowerCase().replace(/^www\./,'');}catch(e){}
    return url(link);
  }
  function logoCard(item,label){
    var img='<img src="'+esc(url(item.image))+'" alt="'+esc(item.name||label)+'" loading="lazy">',link=url(item.link);
    return link?'<a class="logo-card" href="'+esc(internalHref(link))+'">'+img+'</a>':'<div class="logo-card">'+img+'</div>';
  }
  function logoGroups(c){
    var g=((c.sponsors||{}).groups||[]).filter(function(x){return x&&x.items&&x.items.length;});
    setHtml('logoGroups',g.map(function(x){
      return '<div class="logo-block"><h3 class="sub-h">'+esc(x.title)+'</h3>'+(x.subtitle?'<p class="sub-p">'+esc(x.subtitle)+'</p>':'')+
        '<div class="logo-grid'+(x.size==='large'?' large':'')+'">'+x.items.map(function(i){return logoCard(i,x.title);}).join('')+'</div></div>';
    }).join(''));
    return g.length;
  }
  function stats(c){
    setHtml('statsGrid',((c.expecting||{}).stats||[]).map(function(s){return '<div class="stat"><div class="stat-num">'+esc(s.value)+'</div><div class="stat-label">'+esc(s.label)+'</div></div>';}).join(''));
  }
  function marquee(c){
    if(!c.marquee||!c.marquee.length)return;
    var grp='<div class="grp">'+c.marquee.map(function(t){return '<span class="item">'+esc(t)+'</span><span class="sep">\uD83C\uDFAF</span>';}).join('')+'</div>';
    setHtml('marqueeTrack',grp+grp);
  }
  function actionHref(a,c){
    var L=c.links||{};
    if(a==='vendor')return '/?vendor=1';
    if(a==='proposal')return '/?proposal=1';
    if(a==='tickets')return '/?tickets=1';
    if(a==='whatsapp')return url(L.whatsapp)||'#';
    if(a==='email')return L.email?'mailto:'+L.email:'#';
    return '/contact';
  }

  /* ---------- shared bits ---------- */
  function applyCommon(c){
    document.querySelectorAll('[data-c]').forEach(function(el){
      var v=get(c,el.getAttribute('data-c'));if(typeof v==='string'&&v!=='')el.textContent=v;
    });
    document.querySelectorAll('[data-c-src]').forEach(function(el){
      var v=url(get(c,el.getAttribute('data-c-src')));if(v)el.setAttribute('src',v);
    });
    var L=c.links||{};
    document.querySelectorAll('[data-link]').forEach(function(a){
      var k=a.getAttribute('data-link'),v=k==='email'?(L.email?'mailto:'+L.email:''):url(L[k]);
      if(v)a.setAttribute('href',v);
    });
  }
  (function burger(){
    var b=$('burger'),m=$('mobileMenu');if(!b||!m)return;
    function set(o){m.classList.toggle('open',o);b.setAttribute('aria-expanded',o?'true':'false');b.setAttribute('aria-label',o?'Close menu':'Open menu');}
    b.addEventListener('click',function(){set(!m.classList.contains('open'));});
    m.addEventListener('click',function(e){if(e.target.closest('a'))set(false);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&m.classList.contains('open')){set(false);b.focus();}});
    document.addEventListener('click',function(e){if(m.classList.contains('open')&&!e.target.closest('.nav'))set(false);});
  })();

  /* ---------- pages ---------- */
  var R={};

  R.about=function(c){
    var a=c.pages.about;
    setHtml('story',(a.story||[]).map(function(p){return '<p>'+esc(p)+'</p>';}).join(''));
    setHtml('pillars',(a.pillars||[]).map(function(x){return '<div class="pillar"><span class="e">'+(x.emoji?esc(x.emoji):'<span data-gt-icon="'+esc(iconFor(x))+'"></span>')+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.text)+'</p></div>';}).join(''));
    stats(c);
  };

  R.faq=function(c){
    var cats=(c.pages.faq.categories||[]).filter(function(x){return x&&x.items&&x.items.length;});
    show('faqChipsBar',cats.length>1);
    setHtml('faqChips',cats.map(function(x){return '<a class="chip" href="#faq-'+esc(x.id)+'">'+esc(x.title)+'</a>';}).join(''));
    setHtml('faqSections',cats.map(function(x){
      return '<section class="faq-sec" id="faq-'+esc(x.id)+'"><div class="wrap narrow"><h2 class="display">'+esc(x.title)+'</h2><div class="faq-list">'+
        x.items.map(function(i){return '<details class="faq"><summary>'+esc(i.q)+'</summary><div class="ans">'+br(i.a)+'</div></details>';}).join('')+'</div></div></section>';
    }).join(''));
    if(location.hash){var t=$(location.hash.slice(1));if(t)setTimeout(function(){t.scrollIntoView();},50);}
  };

  /* memories + lightbox */
  var LB={list:[],i:0};
  function lbOpen(list,i){LB.list=list;LB.i=i;lbDraw();$('lb').classList.add('open');document.body.style.overflow='hidden';}
  function lbClose(){$('lb').classList.remove('open');document.body.style.overflow='';}
  function lbDraw(){var p=LB.list[LB.i];if(!p)return;$('lbImg').src=url(p.image);$('lbImg').alt=p.caption||'';$('lbCap').textContent=p.caption||'';}
  function lbStep(d){if(!LB.list.length)return;LB.i=(LB.i+d+LB.list.length)%LB.list.length;lbDraw();}
  function startCountdown(iso){
    var t=Date.parse(iso);if(isNaN(t))return;
    function two(n){return n<10?'0'+n:String(n);}
    function tick(){
      var d=t-Date.now();
      if(d<=0){show('memCd',false);show('memPast',true);return false;}
      var s=Math.floor(d/1000);
      $('mDays').textContent=two(Math.floor(s/86400));$('mHours').textContent=two(Math.floor(s%86400/3600));
      $('mMins').textContent=two(Math.floor(s%3600/60));$('mSecs').textContent=two(s%60);return true;
    }
    if(tick()){var iv=setInterval(function(){if(!tick())clearInterval(iv);},1000);}
  }
  var PAGE_SIZE=24;
  R.memories=function(c){
    var M=c.pages.memories;
    var ys=(M.years||[]).filter(function(y){return y&&((y.photos&&y.photos.length)||(y.videos&&y.videos.length));})
      .sort(function(a,b){return (parseInt(b.year,10)||0)-(parseInt(a.year,10)||0);});
    show('soon',!ys.length);
    if(!ys.length){setHtml('memYears','');show('memChipsBar',false);startCountdown((c.event||{}).date);return;}
    var seen={};
    ys.forEach(function(y,i){var k=String(y.year||y.id||i);seen[k]=(seen[k]||0)+1;y._id='y-'+k.replace(/[^\w-]/g,'')+(seen[k]>1?'-'+seen[k]:'');});
    var anyP=ys.some(function(y){return y.photos&&y.photos.length;}),anyV=ys.some(function(y){return y.videos&&y.videos.length;});
    show('memChipsBar',true);show('memFilter',anyP&&anyV);
    setHtml('memChips',ys.length>1?ys.map(function(y){return '<a class="chip" href="#'+esc(y._id)+'">'+esc(y.year||y.title)+'</a>';}).join(''):'');
    setHtml('memYears',ys.map(function(y,i){
      var ph=y.photos||[],vd=y.videos||[];
      var meta=[ph.length?ph.length+(ph.length===1?' photo':' photos'):'',vd.length?vd.length+(vd.length===1?' video':' videos'):''].filter(Boolean).join(' \u00B7 ');
      return '<section class="yr" id="'+esc(y._id)+'" data-i="'+i+'"><div class="wrap"><div class="yr-head">'+
        (y.title?'<span class="yr-kicker">'+esc(y.title)+'</span>':'')+
        (y.year?'<h2 class="display yr-num">'+esc(y.year)+'</h2>':'')+
        '<p class="yr-meta">'+esc(meta)+'</p>'+(y.description?'<p class="yr-desc">'+br(y.description)+'</p>':'')+'</div>'+
        (ph.length?'<div class="ph-block"><div class="masonry">'+ph.map(function(p,j){
           return '<button class="ph" type="button" data-y="'+i+'" data-ph="'+j+'"'+(j>=PAGE_SIZE?' hidden':'')+' aria-label="Open photo '+(j+1)+'"><img src="'+esc(url(p.image))+'" alt="'+esc(p.caption||'Game Tribe photo')+'" loading="lazy" decoding="async"></button>';}).join('')+'</div>'+
           (ph.length>PAGE_SIZE?'<div class="center" style="margin-top:22px"><button class="btn btn-outline more" type="button" data-y="'+i+'">Show more photos ('+(ph.length-PAGE_SIZE)+' more)</button></div>':'')+'</div>':'')+
        (vd.length?'<div class="vid-block"><h3 class="ev-sub">Videos</h3><div class="mv-grid">'+vd.map(function(v){
           return '<figure class="mv"><video controls playsinline preload="metadata" src="'+esc(url(v.src))+'"></video>'+(v.caption?'<figcaption>'+esc(v.caption)+'</figcaption>':'')+'</figure>';}).join('')+'</div></div>':'')+
        '</div></section>';
    }).join(''));
    var root=$('memYears');
    root.addEventListener('click',function(ev){
      var more=ev.target.closest('.more');
      if(more){
        var blk=more.closest('.ph-block'),hid=[].slice.call(blk.querySelectorAll('.ph[hidden]'));
        hid.slice(0,PAGE_SIZE).forEach(function(b){b.hidden=false;});
        var left=blk.querySelectorAll('.ph[hidden]').length;
        if(left)more.textContent='Show more photos ('+left+' more)';else more.parentNode.hidden=true;
        return;
      }
      var b=ev.target.closest('.ph');if(!b)return;
      lbOpen(ys[+b.getAttribute('data-y')].photos,+b.getAttribute('data-ph'));
    });
    var fbar=$('memFilter');
    if(fbar&&!fbar._wired){
      fbar._wired=true;
      fbar.addEventListener('click',function(e){
        var bt=e.target.closest('[data-f]');if(!bt)return;
        var f=bt.getAttribute('data-f');
        [].forEach.call(fbar.querySelectorAll('[data-f]'),function(x){x.classList.toggle('on',x===bt);});
        [].forEach.call(root.querySelectorAll('.yr'),function(sec){
          var y=ys[+sec.getAttribute('data-i')],hp=y.photos&&y.photos.length,hv=y.videos&&y.videos.length;
          sec.hidden=(f==='photos'&&!hp)||(f==='videos'&&!hv);
          var pb=sec.querySelector('.ph-block'),vb=sec.querySelector('.vid-block');
          if(pb)pb.hidden=(f==='videos');if(vb)vb.hidden=(f==='photos');
        });
        [].forEach.call($('memChips').querySelectorAll('a'),function(a){var t=$(a.getAttribute('href').slice(1));if(t)a.hidden=t.hidden;});
      });
    }
    if(location.hash){var t=$(location.hash.slice(1));if(t)setTimeout(function(){t.scrollIntoView();},80);}
  };
  (function lbWire(){
    var lb=$('lb');if(!lb)return;
    lb.querySelector('.x').addEventListener('click',lbClose);
    lb.querySelector('.p').addEventListener('click',function(){lbStep(-1);});
    lb.querySelector('.n').addEventListener('click',function(){lbStep(1);});
    lb.addEventListener('click',function(e){if(e.target===lb)lbClose();});
    document.addEventListener('keydown',function(e){
      if(!lb.classList.contains('open'))return;
      if(e.key==='Escape')lbClose();else if(e.key==='ArrowLeft')lbStep(-1);else if(e.key==='ArrowRight')lbStep(1);
    });
  })();

  R.contact=function(c){
    var L=c.links||{},E=c.event||{};
    setHtml('contactCards',(c.pages.contact.cards||[]).map(function(x){
      var extra='';
      if(x.kind==='email'&&L.email)extra='<a href="mailto:'+esc(L.email)+'">'+esc(L.email)+'</a>';
      else if(x.kind==='whatsapp'&&url(L.whatsapp))extra='<a href="'+esc(url(L.whatsapp))+'" target="_blank" rel="noopener">Join our WhatsApp group</a>';
      else if(x.kind==='instagram'&&url(L.instagram))extra='<a href="'+esc(url(L.instagram))+'" target="_blank" rel="noopener">Instagram</a>';
      else if(x.kind==='tiktok'&&url(L.tiktok))extra='<a href="'+esc(url(L.tiktok))+'" target="_blank" rel="noopener">TikTok</a>';
      else if(x.kind==='venue')extra=(E.address?'<p>'+esc(E.address)+'</p>':'')+(E.mapLat!=null?'<a href="https://www.google.com/maps?q='+encodeURIComponent(E.mapLat+','+E.mapLng)+'" target="_blank" rel="noopener">Open in Google Maps</a>':'');
      return '<div class="cc"><h3>'+esc(x.title)+'</h3>'+(x.text?'<p>'+esc(x.text)+'</p>':'')+extra+'</div>';
    }).join(''));
    var form=$('contactForm'),msg=$('cfMsg'),btn=$('cfBtn');
    if(!form||form._wired)return;form._wired=true;
    /* Optional human check (Cloudflare Turnstile), only when the site owner has switched it on */
    var tsKey=(c.security&&c.security.turnstileSiteKey)||'',tsToken='',tsId=null;
    if(tsKey){
      var holder=document.createElement('div');holder.id='cfTurnstile';holder.style.margin='10px 0';
      btn.parentNode.insertBefore(holder,btn);
      var ts=document.createElement('script');ts.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';ts.async=true;
      ts.onload=function(){tsId=window.turnstile.render(holder,{sitekey:tsKey,callback:function(t){tsToken=t;},'expired-callback':function(){tsToken='';},'error-callback':function(){tsToken='';}});};
      document.head.appendChild(ts);
    }
    form.addEventListener('submit',function(e){
      e.preventDefault();
      if(tsKey&&!tsToken){msg.className='cf-msg err';msg.textContent='Please complete the check above the button.';return;}
      var d={name:form.name.value,email:form.email.value,subject:form.subject.value,message:form.message.value,website:form.website.value,turnstile:tsToken};
      msg.className='cf-msg';msg.textContent='';
      btn.disabled=true;btn.textContent='Sending\u2026';
      fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})
        .then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok)throw new Error(j.message||'Something went wrong. Please try again.');return j;});})
        .then(function(){msg.className='cf-msg ok';msg.textContent=c.pages.contact.successText||'Thanks! Your message has been sent.';form.reset();})
        .catch(function(err){msg.className='cf-msg err';msg.textContent=err.message;})
        .then(function(){btn.disabled=false;btn.textContent='Send message';if(tsKey&&window.turnstile&&tsId!==null){window.turnstile.reset(tsId);tsToken='';}});
    });
  };

  R.play=function(c){
    var P=c.pages.play,L=c.links||{};
    setHtml('modes',(P.modes||[]).map(function(m){return '<div class="mode"><span class="e">'+(m.emoji?esc(m.emoji):'<span data-gt-icon="'+esc(iconFor(m))+'"></span>')+'</span><div><h3>'+esc(m.title)+'</h3><p>'+esc(m.text)+'</p></div></div>';}).join(''));
    setHtml('steps',(P.steps||[]).map(function(s){return '<div class="step"><h3>'+esc(s.title)+'</h3><p>'+esc(s.text)+'</p></div>';}).join(''));
    var form=$('pinForm'),input=$('pinInput'),msg=$('pinMsg');
    if(!form||form._wired)return;form._wired=true;
    input.addEventListener('input',function(){input.value=input.value.replace(/\D/g,'').slice(0,6);msg.textContent='';});
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var pin=input.value.replace(/\D/g,''),game=url(L.game);
      if(pin.length!==6){msg.textContent='Please enter the 6-digit PIN.';input.focus();return;}
      if(!/^https?:\/\//i.test(game)){msg.textContent='The game link is not set up yet. Please try again later.';return;}
      location.href=game.replace(/\/+$/,'')+'/#join='+pin;
    });
  };

  R.partner=function(c){
    var p=c.pages.partner;
    setHtml('pkgs',(p.packages||[]).map(function(k){
      return '<div class="pkg"><div class="top"><div><span class="badge">'+esc(k.badge)+'</span><h3>'+esc(k.name)+'</h3></div><div class="price">'+esc(k.price)+'</div></div>'+
        '<ul>'+(k.features||[]).map(function(f){return '<li>'+esc(f)+'</li>';}).join('')+'</ul>'+
        '<a class="btn btn-red" href="'+esc(actionHref(k.action,c))+'"'+(k.action==='whatsapp'?' target="_blank" rel="noopener"':'')+'>'+esc(k.button)+'</a></div>';
    }).join(''));
    setHtml('partnerTags',((c.expecting||{}).stats||[]).map(function(s){return '<span class="tag-pill">'+esc(s.value)+' '+esc(s.label)+'</span>';}).join(''));
    setHtml('steps',(p.steps||[]).map(function(s){return '<div class="step"><h3>'+esc(s.title)+'</h3><p>'+esc(s.text)+'</p></div>';}).join(''));
    marquee(c);
    if(!logoGroups(c))show('onboard',false);
  };

  R.advertise=function(c){
    var p=((c.pages||{}).advertise)||{};
    var DEF={chips:[{text:'27 Nov 2026'},{text:'Ojeta Primary School, Abraka'}],stats:[{value:'01',label:'Festival day of energy'},{value:'IRL',label:'Real community moments'},{value:'360°',label:'On-ground & social visibility'}],
      packages:[{name:'Community Shoutout',description:'A simple, social-first way to get your name into the conversation.',features:'Brand mention in selected event content\nInclusion in a community update\nPartnership team support',button:'Ask about this'},{name:'Play Zone Partner',description:'Own a memorable part of the festival experience and make it yours.',features:'Branded festival activation\nOn-ground audience engagement\nSelected social media support',button:'Build this package',featured:'yes',badge:'Most flexible'},{name:'Main Event Partner',description:'Bring your brand to the centre of the day with a custom collaboration.',features:'Tailored brand integration\nPremium visibility opportunities\nDedicated partnership planning',button:'Start the conversation'}],
      moments:[{title:'Be useful',text:'Give festival-goers something to enjoy, play, try or take home.'},{title:'Be seen',text:'Bring your story to the spaces where the tribe is already gathering.'},{title:'Be remembered',text:'Create the kind of real-life interaction that outlasts the event day.'}],
      ticker:['🔥 Game Tribe Fest 2026','27 November 2026','Abraka, Delta State','Games • Banters • Hangout • Connect'],
      requirements:[{title:'Content submission',text:'All brand content must be shared with the Game Tribe team for review and approval before it is displayed.'},{title:'Content guidelines',text:'Content should clearly feature your brand identity: logo, key products or services and your main message.'},{title:'Deadline',text:'Once your package is confirmed, send your approved materials within 72 hours to guarantee inclusion.'}]};
    var list=function(v,d){return Array.isArray(v)&&v.length?v:d;};
    var txt=function(id,v){var el=$(id);if(el&&v)el.textContent=v;};
    var hero=document.querySelector('.adv-hero h1');
    if(document.querySelector('.adv-eyebrow')&&p.pill)document.querySelector('.adv-eyebrow').textContent=p.pill;
    if(hero&&(p.title||p.highlight))hero.innerHTML=esc(p.title||'Put your brand')+' <span>'+esc(p.highlight||'in the game.')+'</span>';
    if(document.querySelector('.adv-intro')&&p.intro)document.querySelector('.adv-intro').textContent=p.intro;
    txt('advSubline',p.subline);
    var chips=$('advChips');if(chips)chips.innerHTML=list(p.chips,DEF.chips).map(function(x){return x&&x.text?'<li>'+esc(x.text)+'</li>':'';}).join('');
    var stats=$('advStats');if(stats)stats.innerHTML=list(p.stats,DEF.stats).map(function(x){return '<div><strong>'+esc(x.value)+'</strong><span>'+esc(x.label)+'</span></div>';}).join('');
    var poster=$('advPoster'),img=$('advPosterImg');if(poster&&img){var src=p.heroImage?mediaSrc(p.heroImage):'';if(src){img.src=src;poster.hidden=false;}else poster.hidden=true;}
    txt('advFormPill',p.formPill);txt('advFormTitle',p.formTitle);txt('advFormIntro',p.formIntro);txt('advFormNote',p.formNote);
    var button=$('advSubmit');if(button&&p.formButton){button.textContent=p.formButton;button.dataset.label=p.formButton;}
    txt('advPkgKicker',p.packagesKicker);txt('advPkgTitle',p.packagesTitle);txt('advPkgIntro',p.packagesIntro);txt('advMomKicker',p.momentsKicker);txt('advMomTitle',p.momentsTitle);txt('advReqTitle',p.requirementsTitle);
    var pk=list(p.packages,DEF.packages).filter(function(x){return x&&x.name;});
    var grid=$('advPackages');
    if(grid)grid.innerHTML=pk.map(function(x,i){var feat=String(x.features||'').split(/\n+/).map(function(t){return t.trim();}).filter(Boolean);var star=x.featured==='yes'||x.featured===true;
      return '<article class="adv-card'+(star?' featured':'')+'">'+(star&&(x.badge||'Most flexible')?'<span class="adv-badge">'+esc(x.badge||'Most flexible')+'</span>':'')+'<h3>'+esc(x.name)+'</h3><div class="adv-price">'+(x.price?esc(x.price):'Custom quote')+'</div>'+(x.description?'<p>'+esc(x.description)+'</p>':'')+(feat.length?'<ul>'+feat.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul>':'<ul></ul>')+'<button class="btn '+(star?'btn-red':'btn-outline')+'" type="button" data-adv-pick="'+i+'">'+esc(x.button||'Ask about this')+'</button></article>';}).join('');
    var select=$('package');
    if(select){var cur=select.value;select.innerHTML='<option value="">Select a package</option>'+pk.map(function(x){return '<option value="'+esc(x.name)+'">'+esc(x.name)+(x.price?' — '+esc(x.price):'')+'</option>';}).join('')+'<option value="Something custom">Something custom</option>';if(cur)select.value=cur;}
    if(grid&&!grid.getAttribute('data-bound')){grid.setAttribute('data-bound','1');grid.addEventListener('click',function(e){var b=e.target.closest('[data-adv-pick]');if(!b)return;var item=pk[Number(b.getAttribute('data-adv-pick'))];if(select&&item)select.value=item.name;var f=$('enquiry');if(f)f.scrollIntoView({behavior:'smooth',block:'start'});var first=$('brand');if(first)setTimeout(function(){first.focus({preventScroll:true});},450);});}
    var mom=$('advMoments');if(mom)mom.innerHTML=list(p.moments,DEF.moments).map(function(x){return '<article class="adv-proof-item"><strong>'+esc(x.title)+'</strong><p>'+esc(x.text)+'</p></article>';}).join('');
    var tick=$('advTicker');if(tick){var items=list(p.ticker,DEF.ticker).filter(Boolean);var one=items.map(function(t){return '<span>'+esc(t)+'</span>';}).join('');tick.innerHTML=one+one+one+one;}
    var req=$('advReq');if(req)req.innerHTML=list(p.requirements,DEF.requirements).map(function(x,i){return '<div class="adv-req-item"><span class="adv-req-ico">'+(i+1)+'</span><div><b>'+esc(x.title)+'</b><p>'+esc(x.text)+'</p></div></div>';}).join('');
    var enq=$('advEnq');if(enq){var mail=p.enquiryEmail||((c.links||{}).email)||'gametribe001@gmail.com';enq.innerHTML=esc(p.enquiryText||'For enquiries:')+' <a href="mailto:'+esc(mail)+'">'+esc(mail)+'</a>';}
  };

  var merchStoreReady=false,merchCfg={};
  R.merch=function(c){
    var p=((c.pages||{}).merch)||{};merchCfg=p;
    var txt=function(sel,v){var el=document.querySelector(sel);if(el&&v)el.textContent=v;};
    var hero=document.querySelector('.shop-hero h1');
    txt('.shop-hero .shop-pill',p.pill);
    if(hero&&(p.title||p.highlight))hero.innerHTML=esc(p.title||'Wear the vibe.')+' <span>'+esc(p.highlight||'Own the moment.')+'</span>';
    txt('.shop-copy',p.intro);txt('#merchHeroNote',p.heroNote);
    var sticker=document.querySelector('.shop-sticker');
    if(sticker){var st=p.stickerTitle;if(st===undefined||st===null)st='Game\nTribe\nDrop 01';if(String(st).trim()){sticker.hidden=false;sticker.querySelector('strong').innerHTML=esc(st).replace(/\n/g,'<br>');var ss=sticker.querySelector('span');if(ss)ss.textContent=p.stickerSubtitle||'';}else sticker.hidden=true;}
    var heroEl=document.querySelector('.shop-hero');if(heroEl){var hi=p.heroImage?mediaSrc(p.heroImage):'';heroEl.style.backgroundImage=hi?'linear-gradient(rgba(28,20,16,.78),rgba(28,20,16,.88)),url("'+hi.replace(/"/g,'%22')+'")':'';}
    txt('#collection .shop-kicker',p.collectionKicker);txt('#collection .shop-heading',p.collectionTitle);txt('#collection .shop-intro',p.collectionIntro);
    txt('#cartHeading',p.cartTitle);txt('#cartNote',p.cartNote);
    var ct=document.getElementById('checkoutTitle');if(ct&&p.pickupTitle)ct.textContent=p.pickupTitle;
    var cp=document.querySelector('#checkoutForm>p');if(cp&&p.pickupText)cp.textContent=p.pickupText;
    txt('#receipt .shop-kicker',p.lookupKicker);txt('#receipt h2',p.lookupTitle);txt('#receipt .sec-head p',p.lookupIntro);
    setupMerchStore();
    if(merchStoreReady&&window.__gtMerchDraw)window.__gtMerchDraw();
  };

  function setupMerchStore(){
    if(merchStoreReady)return;
    merchStoreReady=true;
    var products=[],cart={},active='All',publicKey='',ready=false;
    var money=function(v){return '₦'+Number(v||0).toLocaleString('en-NG');};
    var call=function(action,opt){return fetch('/api/merch?action='+action,opt).then(function(r){return r.json().catch(function(){return {};}).then(function(d){if(!r.ok)throw new Error(d.message||'Something went wrong.');return d;});});};
    var itemKey=function(id,colour,size){return id+'::'+(colour||'')+'::'+(size||'');};
    var countFor=function(id,colour,size){return Object.keys(cart).reduce(function(total,key){var line=cart[key];return total+(line&&line.id===id&&line.colour===(colour||'')&&line.size===(size||'')?(line.quantity||0):0);},0);};
    var picked=function(){return Object.keys(cart).filter(function(key){return cart[key]&&cart[key].quantity>0;}).map(function(key){return {key:key,id:cart[key].id,colour:cart[key].colour,size:cart[key].size,quantity:cart[key].quantity};});};
    var productFor=function(id){return products.filter(function(product){return product.id===id;})[0];};
    var stockFor=function(product,colour,size){var choices=Array.isArray(product.variants)?product.variants:[];if(!choices.length)return Number(product.stock)||0;var found=choices.filter(function(choice){return choice.colour===colour&&choice.size===size;})[0];return found?Number(found.stock)||0:0;};
    var total=function(){return picked().reduce(function(sum,item){var product=productFor(item.id);return sum+(product?Number(product.price)*item.quantity:0);},0);};
    function badgeFor(product){
      var choices=Array.isArray(product.variants)?product.variants:[];
      var stock=choices.length?choices.reduce(function(n,v){return n+(Number(v.stock)||0);},0):(Number(product.stock)||0);
      var limit=Number(product.low_stock_threshold);if(isNaN(limit))limit=5;
      if(stock<=0)return {soldOut:true,text:merchCfg.soldOutText||'Sold out'};
      if(limit>0&&stock<=limit)return {fast:true,text:merchCfg.sellingFastText||'Selling fast'};
      return {};
    }
    function cardHtml(product,index){
      var badge=badgeFor(product),src=product.image?mediaSrc(product.image):'';
      var art=src?'<div class="shop-art"><img src="'+esc(src)+'" alt="'+esc(product.name)+'" loading="lazy"></div>':'<div class="shop-art '+['red','ink','gold','orange'][index%4]+'"><span class="art-word">'+esc(product.name)+'</span></div>';
      var choices=Array.isArray(product.variants)?product.variants:[],colours=choices.length?choices.filter(function(v){return Number(v.stock)>0;}).map(function(v){return v.colour;}).filter(function(v,i,a){return a.indexOf(v)===i;}):(Array.isArray(product.colours)?product.colours:[]),firstColour=colours[0]||'',sizes=choices.length?choices.filter(function(v){return v.colour===firstColour&&Number(v.stock)>0;}).map(function(v){return v.size;}).filter(function(v,i,a){return a.indexOf(v)===i;}):[];
      var picker='';
      if(!badge.soldOut){
        picker=colours.length?'<label class="shop-colour-wrap">Colour <select class="shop-colour">'+colours.map(function(colour){return '<option value="'+esc(colour)+'">'+esc(colour)+'</option>';}).join('')+'</select></label>':'';
        if(sizes.length)picker+='<label class="shop-colour-wrap">Size <select class="shop-size">'+sizes.map(function(size){return '<option value="'+esc(size)+'">'+esc(size)+'</option>';}).join('')+'</select></label>';
      }
      return '<article class="shop-card'+(badge.soldOut?' is-sold':'')+'" data-gt-product="'+esc(product.id)+'"><div class="shop-media">'+art+(badge.text?'<span class="shop-badge'+(badge.soldOut?' sold':'')+'">'+esc(badge.text)+'</span>':'')+'</div><div class="shop-card-body"><span class="shop-kind">'+esc(product.category)+'</span><h3>'+esc(product.name)+'</h3>'+(product.description?'<p>'+esc(product.description)+'</p>':'')+picker+'<strong class="shop-price">'+money(product.price)+'</strong><button class="btn '+(badge.soldOut?'btn-outline':'btn-red')+'" type="button" data-gt-add="'+esc(product.id)+'"'+(badge.soldOut?' disabled':'')+'>'+(badge.soldOut?esc(badge.text):'Add to cart')+'</button></div></article>';
    }
    function draw(){
      var tabs=$('shopTabs'),grid=$('shopGrid'),list=$('cartList'),totalEl=$('cartTotal'),checkout=$('checkoutButton');if(!tabs||!grid||!list||!totalEl||!checkout)return;
      var cats=products.map(function(product){return product.category;}).filter(function(value,index,all){return value&&all.indexOf(value)===index;});
      if(active!=='All'&&cats.indexOf(active)<0)active='All';
      var cfg=Array.isArray(merchCfg.categories)?merchCfg.categories:[];
      var info=function(name){var k=String(name).toLowerCase();return cfg.filter(function(x){return x&&String(x.name||'').toLowerCase()===k;})[0]||{};};
      tabs.innerHTML=['All'].concat(cats).map(function(category){var i=info(category);return '<button class="shop-tab" type="button" data-gt-category="'+esc(category)+'" aria-pressed="'+(category===active)+'">'+(category!=='All'&&i.emoji?'<span aria-hidden="true">'+esc(i.emoji)+'</span> ':'')+esc(category)+'</button>';}).join('');
      var shown=cats.filter(function(category){return active==='All'||category===active;}),n=0;
      grid.innerHTML=shown.length?shown.map(function(category){
        var i=info(category),items=products.filter(function(product){return product.category===category;});
        return '<section class="shop-cat" aria-label="'+esc(category)+'"><header class="shop-cat-head"><h2>'+(i.emoji?'<span aria-hidden="true">'+esc(i.emoji)+'</span> ':'')+esc(category)+'</h2>'+(i.description?'<p>'+esc(i.description)+'</p>':'')+'</header><div class="shop-grid">'+items.map(function(product){return cardHtml(product,n++);}).join('')+'</div></section>';
      }).join(''):'<div class="shop-empty">'+esc(products.length?(merchCfg.emptyText||'Nothing here right now.'):(ready?(merchCfg.emptyText||'Nothing here right now.'):'Loading the collection…'))+'</div>';
      var chosen=picked();
      list.innerHTML=chosen.length?chosen.map(function(item){var product=productFor(item.id);if(!product)return '';return '<div class="cart-row"><div><strong>'+esc(product.name)+'</strong><small>'+money(product.price)+' each'+(item.colour?' · '+esc(item.colour):'')+(item.size?' · '+esc(item.size):'')+'</small><div class="cart-controls"><button type="button" data-gt-cart="'+esc(item.key)+'" data-gt-delta="-1">−</button><b>'+item.quantity+'</b><button type="button" data-gt-cart="'+esc(item.key)+'" data-gt-delta="1">+</button></div></div><strong>'+money(product.price*item.quantity)+'</strong></div>';}).join(''):'<p class="empty-cart">'+esc(merchCfg.cartEmpty||'Your cart is ready when you are.')+'</p>';
      totalEl.textContent=money(total());checkout.disabled=!chosen.length;var count=chosen.reduce(function(n,i){return n+i.quantity;},0),cc=$('cartCount');if(cc){cc.textContent=count;cc.hidden=!count;}
    }
    function openCheckout(){var summary=$('checkoutSummary'),overlay=$('checkoutOverlay');if(!summary||!overlay)return;summary.textContent=picked().map(function(item){var product=productFor(item.id);return item.quantity+' × '+product.name+(item.colour?' ('+item.colour+(item.size?' / '+item.size:'')+')':'')+' — '+money(product.price*item.quantity);}).join('\n')+'\n\nTotal: '+money(total())+'\nPickup: Game Tribe Fest';overlay.classList.add('active');}
    function closeCheckout(){var overlay=$('checkoutOverlay');if(overlay)overlay.classList.remove('active');}
    function checkout(form){
      var button=form.querySelector('[type="submit"]'),status=$('checkoutStatus'),fd=new FormData(form);button.disabled=true;button.textContent='Holding your items…';status.textContent='';
      call('checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone'),items:picked().map(function(item){return{id:item.id,colour:item.colour,size:item.size,quantity:item.quantity};})})}).then(function(order){
        if(typeof PaystackPop==='undefined')throw new Error('Paystack could not load. Check your connection and try again.');
        button.textContent='Opening Paystack…';new PaystackPop().newTransaction({key:order.paystackPublicKey||publicKey,email:fd.get('email'),amount:order.amount*100,currency:'NGN',firstName:String(fd.get('name')).split(' ')[0],lastName:String(fd.get('name')).split(' ').slice(1).join(' '),phone:fd.get('phone'),reference:order.reference,metadata:{order_kind:'merch',merch_reference:order.reference},onSuccess:function(transaction){button.textContent='Confirming payment…';call('confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reference:transaction.reference})}).then(function(result){cart={};draw();$('checkoutForm').classList.add('hide');$('checkoutSuccess').classList.add('show');$('successCopy').textContent='Your payment of '+money(result.order.amount)+' is confirmed. Your pickup details are linked to '+result.order.email+'. Keep your Paystack reference: '+result.order.reference+'.';}).catch(function(error){status.textContent=error.message+' Keep your Paystack reference and contact Game Tribe.';button.disabled=false;button.textContent='Pay with Paystack';});},onCancel:function(){call('cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reference:order.reference})});button.disabled=false;button.textContent='Pay with Paystack';status.textContent='Checkout cancelled. Your items were released.';}});
      }).catch(function(error){status.textContent=error.message;button.disabled=false;button.textContent='Pay with Paystack';});
    }
    var style=document.createElement('style');style.textContent='.shop-colour-wrap{display:grid;gap:5px;margin-top:12px;font-size:12px;font-weight:800;color:#1C1410}.shop-colour,.shop-size{width:100%;padding:9px 10px;border:1px solid rgba(28,20,16,.25);border-radius:9px;background:#fff;font:inherit;color:#1C1410}.shop-option-note{font-size:11px!important;margin:8px 0 0!important}';document.head.appendChild(style);
    window.__gtMerchDraw=function(){draw();};
    function drawer(open){var d=$('cartDrawer'),b=$('drawerBack'),t=$('cartToggle');if(!d)return;d.classList.toggle('open',open);if(b)b.classList.toggle('open',open);d.setAttribute('aria-hidden',open?'false':'true');if(t)t.setAttribute('aria-expanded',open?'true':'false');document.documentElement.classList.toggle('drawer-open',open);if(open){var c=$('cartClose');if(c)setTimeout(function(){c.focus();},60);}else if(t&&document.activeElement&&d.contains(document.activeElement))t.focus();}
    document.addEventListener('click',function(e){
      var d=$('cartDrawer');
      if(e.target.closest&&e.target.closest('#cartToggle,#cartBarBtn')){e.preventDefault();e.stopPropagation();drawer(!(d&&d.classList.contains('open')));return;}
      if(e.target.closest&&e.target.closest('#cartClose')){drawer(false);return;}
      if(e.target.id==='drawerBack'){drawer(false);return;}
      if(e.target.closest&&e.target.closest('#checkoutButton'))drawer(false);
    },true);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){var d=$('cartDrawer');if(d&&d.classList.contains('open'))drawer(false);}});
    document.addEventListener('click',function(event){
      var button=event.target.closest&&event.target.closest('button');if(!button)return;
      if(button.matches('[data-gt-category]')){event.preventDefault();event.stopPropagation();active=button.getAttribute('data-gt-category');draw();return;}
      if(button.matches('[data-gt-add]')){event.preventDefault();event.stopPropagation();var product=productFor(button.getAttribute('data-gt-add')),card=button.closest('.shop-card'),select=card&&card.querySelector('.shop-colour'),sizeSelect=card&&card.querySelector('.shop-size'),colour=select?select.value:'',size=sizeSelect?sizeSelect.value:'',key=itemKey(product.id,colour,size),line=cart[key]||{id:product.id,colour:colour,size:size,quantity:0},available=stockFor(product,colour,size)-(countFor(product.id,colour,size)-line.quantity);line.quantity=Math.max(0,Math.min(available,line.quantity+1));if(!line.quantity){alert('That colour and size is sold out.');return;}cart[key]=line;draw();return;}
      if(button.matches('[data-gt-cart]')){event.preventDefault();event.stopPropagation();var line=cart[button.getAttribute('data-gt-cart')],product=line&&productFor(line.id);if(!line||!product)return;line.quantity=Math.max(0,Math.min(stockFor(product,line.colour,line.size)-(countFor(product.id,line.colour,line.size)-line.quantity),line.quantity+Number(button.getAttribute('data-gt-delta'))));if(!line.quantity)delete cart[button.getAttribute('data-gt-cart')];draw();return;}
      if(button.id==='checkoutButton'){event.preventDefault();event.stopPropagation();openCheckout();return;}
      if(button.id==='checkoutClose'||button.id==='checkoutCancel'){event.preventDefault();event.stopPropagation();closeCheckout();return;}
      if(button.id==='successClose'){event.preventDefault();event.stopPropagation();closeCheckout();$('checkoutSuccess').classList.remove('show');$('checkoutForm').classList.remove('hide');return;}
    },true);
    document.addEventListener('change',function(event){var colour=event.target&&event.target.closest&&event.target.closest('.shop-colour');if(!colour)return;var card=colour.closest('.shop-card'),size=card&&card.querySelector('.shop-size'),id=card&&card.getAttribute('data-gt-product'),product=productFor(id);if(!size||!product)return;var options=(product.variants||[]).filter(function(v){return v.colour===colour.value&&Number(v.stock)>0;}).map(function(v){return v.size;});size.innerHTML=options.length?options.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join(''):'<option value="">Sold out</option>';},true);
    document.addEventListener('submit',function(event){if(event.target&&event.target.id==='merchCheckoutForm'){event.preventDefault();event.stopPropagation();checkout(event.target);}},true);
    var grid=$('shopGrid');if(grid)new MutationObserver(function(){if(ready&&products.some(function(product){return Array.isArray(product.colours)&&product.colours.length;})&&!grid.querySelector('.shop-colour'))setTimeout(draw,0);}).observe(grid,{childList:true,subtree:true});
    call('catalog').then(function(data){products=data.products||[];publicKey=data.paystackPublicKey||'';ready=true;draw();}).catch(function(error){var grid=$('shopGrid');if(grid)grid.innerHTML='<div class="shop-empty">'+esc(error.message)+' Please check back shortly.</div>';});
  }

  /* ---------- boot ---------- */
  function go(c){
    c=fill(c,FALLBACK);
    try{applyCommon(c);if(R[PAGE])R[PAGE](c);}catch(e){console.error('Page render failed:',e);}
  }
  var done=false;
  function once(c){if(done)return;done=true;go(c);}
  var timer=setTimeout(function(){once(FALLBACK);},2500);
  fetch('/api/content',{credentials:'same-origin'})
    .then(function(r){if(!r.ok)throw new Error('content '+r.status);return r.json();})
    .then(function(c){clearTimeout(timer);once(c);})
    .catch(function(e){console.warn('Using built-in content:',e.message);clearTimeout(timer);once(FALLBACK);});
})();
