
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const W = typeof WEDDING !== 'undefined' ? WEDDING : null;
  const pics = typeof BOOK_IMAGES !== 'undefined' ? BOOK_IMAGES : {};
  const allPhotos = typeof PHOTOS !== 'undefined' ? PHOTOS : [];
  const accountData = typeof ACCOUNTS !== 'undefined' ? ACCOUNTS : {};
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[char]));
  const safeHttp = value => { try { const u = new URL(value, location.href); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
  const dateParts = W?.date?.split('-').map(Number) || [2027,4,3];
  const fullDate = () => dateParts.map((p,i) => String(p).padStart(i === 0 ? 4 : 2,'0')).join('. ') + '.';
  const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const weekdays = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  let toastTimer = 0;

  if (!W) {
    document.body.innerHTML = '<p style="text-align:center;padding:60px 20px;font:700 16px sans-serif">data.js를 찾을 수 없습니다. 기존 프로젝트의 data.js 파일을 같은 폴더에 놓아주세요.</p>';
    return;
  }

  const setText = (id, value) => { const node = $(id); if (node) node.textContent = String(value ?? ''); };
  function toast(message) {
    const el = $('toast');
    clearTimeout(toastTimer); el.textContent = message; el.classList.add('is-visible');
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3200);
  }
  async function copyText(value, label = '복사되었습니다.') {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const ta = document.createElement('textarea'); ta.value = value;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.append(ta); ta.select();
        const result = document.execCommand('copy'); ta.remove();
        if (!result) throw Error('copy unsupported');
      }
      toast(label);
    } catch { toast('복사가 제한되었습니다. 해당 내용을 길게 눌러 복사해 주세요.'); }
  }
  const pad = n => String(n).padStart(2,'0');

  /* Intro: sealed envelope → paper rises → site unlocks. */
  const opening = $('openingScreen');
  const content = $('siteContent');
  document.body.classList.add('is-locked');
  let opened = false;
  function finishOpening(target) {
    content.inert = false;
    document.body.classList.remove('is-locked');
    opening.hidden = true;
    if (target) {
      requestAnimationFrame(() => $(target)?.scrollIntoView({behavior:'instant',block:'start'}));
    } else {
      window.scrollTo({top:0,behavior:'instant'});
    }
    initBackend();
  }
  function openInvitation(target, immediate = false) {
    if (opened) return;
    opened = true;
    $('openEnvelope').disabled = true;
    opening.classList.add('is-opening');
    const duration = immediate || reducedMotion ? 0 : 1050;
    setTimeout(() => {
      opening.classList.add('is-dismissing');
      setTimeout(() => finishOpening(target), immediate || reducedMotion ? 0 : 550);
    }, duration);
  }
  // The envelope tap is the user's gesture. Play music here, not after animation.
  // iOS/Android may block any unprompted sound; keep a working manual toggle.
  function openWithMusic() {
    attemptOpeningMusic();
    openInvitation();
  }
  $('openEnvelope').addEventListener('click', openWithMusic);
  $('openTextButton').addEventListener('click', openWithMusic);

  /* Old invitation hashes must continue working for links already shared. */
  const oldHash = location.hash.match(/^#\/chapter\/(cover|contents|story|day|venue|gallery|guestbook|love)$/)?.[1];
  if (oldHash && oldHash !== 'cover') openInvitation(oldHash === 'contents' ? 'quick-links' : oldHash, true);
  else if (/^#(story|day|venue|gallery|guestbook|love|quick-links)$/.test(location.hash)) {
    openInvitation(location.hash.slice(1), true);
  }

  /* Music starts from the envelope-opening gesture when the browser permits it.
   * The icon always reflects REAL playback state; never show mute if blocked.
   */
  const music=$('weddingBackgroundMusic');
  const musicToggle=$('musicToggle');
  music.volume=.55;
  music.preload='auto';
  let musicDesired=true; // initial preference: on after invitation is opened
  function updateMusicButton() {
    const playing=!music.paused&&!music.ended;
    musicToggle.classList.toggle('is-playing',playing);
    musicToggle.setAttribute('aria-pressed',String(playing));
    musicToggle.setAttribute('aria-label',playing?'배경음악 켜짐, 눌러 끄기':'배경음악 꺼짐, 눌러 재생');
    musicToggle.title=playing?'배경음악 켜짐 · 눌러 끄기':'배경음악 꺼짐 · 눌러 재생';
  }
  function attemptOpeningMusic(showError=false) {
    musicDesired=true;
    try {
      const promise=music.play();
      if(promise && typeof promise.catch==='function') promise.catch(error=>{
        updateMusicButton();
        if(showError) toast('배경음악을 재생할 수 없습니다. 음원 파일을 확인해 주세요.');
        else console.info('Background music could not autoplay from invitation opening:',error);
      });
    } catch(error) {
      updateMusicButton();
      if(showError) toast('배경음악 재생이 제한되었습니다.');
    }
  }
  musicToggle.addEventListener('click',()=>{
    if(!music.paused && !music.ended) {
      musicDesired=false;
      music.pause();
    } else attemptOpeningMusic(true);
  });
  music.addEventListener('play',updateMusicButton);
  music.addEventListener('pause',updateMusicButton);
  music.addEventListener('ended',updateMusicButton);
  music.addEventListener('error',updateMusicButton);
  updateMusicButton();

  /* Header menu stays available even when the large 2×3 menu is far above. */
  const menu = $('quickMenuOverlay');
  const menuToggle = $('menuToggle');
  const menuClose = $('menuClose');
  function toggleMenu(show) {
    menu.hidden = !show;
    menuToggle.setAttribute('aria-expanded', String(show));
    document.body.classList.toggle('is-locked', show);
    if (show) menuClose.focus();
    else menuToggle.focus({preventScroll:true});
  }
  menuToggle.addEventListener('click', () => toggleMenu(true));
  menuClose.addEventListener('click', () => toggleMenu(false));
  menu.querySelector('[data-close-menu]').addEventListener('click', () => toggleMenu(false));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    toggleMenu(false);
    const target = a.getAttribute('href').slice(1);
    requestAnimationFrame(() => $(target)?.scrollIntoView({behavior:reducedMotion?'instant':'smooth'}));
  }));

  /* Content from existing data.js, no hardcoded couple/venue. */
  setText('envelopeNames', `${W.groom} · ${W.bride}`);
  setText('envelopeDate', fullDate());
  setText('envelopePrintedNames', `${W.groom}  ·  ${W.bride}`);
  setText('envelopePrintedDate', fullDate());
  
  const heroNames = $('heroNames');

  if (heroNames) {
    heroNames.innerHTML = `
      ${escapeHTML(W.bride)}
      <span class="name-separator" aria-hidden="true">·</span>
      ${escapeHTML(W.groom)}
    `;
  }

  setText('heroLocation', `${W.venue} · ${W.hall}`);

  const weddingDay = new Date(
    dateParts[0],
    dateParts[1] - 1,
    dateParts[2]
  );
  
  const shortWeekdays = [
    'SUN.', 'MON.', 'TUE.', 'WED.',
    'THU.', 'FRI.', 'SAT.'
  ];
  
  setText(
    'heroDate',
    `${fullDate()} ${shortWeekdays[weddingDay.getDay()]} ${W.time || '17:00'}`
  );
  
  setText('invitationText', W.greeting);
  $('storySignature').innerHTML = `${escapeHTML(W.bride)} <span class="name-separator" aria-hidden="true">·</span> ${escapeHTML(W.groom)}`;

  function assignPhoto(id, candidates) {
    const img = $(id);
    const valid = candidates.filter(Boolean);
    if (!valid.length) { img.closest('figure,.love-photo,.hero-photo-wrap')?.setAttribute('hidden',''); return; }
    let index = 0;
    img.src = valid[index];
    img.addEventListener('error', () => {
      index += 1;
      if (index < valid.length) img.src = valid[index];
      else img.alt = '사진을 불러오지 못했습니다. data.js의 이미지 경로를 확인해 주세요.';
    });
  }
  assignPhoto('heroPhoto',[pics.cover, pics.contents, ...allPhotos.map(p=>p.src)]);
  assignPhoto('storyPhoto',[pics.chapter?.story,pics.inside,pics.cover]);
  assignPhoto('lovePhoto',[pics.chapter?.love,pics.inside,pics.cover]);

  /* Date and calendar options: Google event template + Naver manual entry. */
  const koWeekdays = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
  const koreanWeekday = koWeekdays[new Date(dateParts[0],dateParts[1]-1,dateParts[2]).getDay()];
  setText('dayMonthNumber', String(dateParts[1]));
  setText('dayNumber', String(dateParts[2]));
  setText('dayWeekday', koreanWeekday);
  setText('dayDateWeekday', koreanWeekday);
  $('dayLarge').setAttribute('aria-label',`${dateParts[0]}년 ${dateParts[1]}월 ${dateParts[2]}일 결혼식 날짜`);
  const [hour,minute] = String(W.time || '17:00').split(':').map(Number);
  setText('dayTime', `${hour>=12?'오후':'오전'} ${hour%12 || 12}:${pad(minute)}`);
  setText('dayVenue', W.venue);setText('dayHall',W.hall);
  const daysFirst = new Date(dateParts[0],dateParts[1]-1,1).getDay();
  const daysMax = new Date(dateParts[0],dateParts[1],0).getDate();
  const cal = $('calendarGrid');
  ['S','M','T','W','T','F','S'].forEach(d => { const s=document.createElement('span'); s.className='cal-head';s.textContent=d;cal.append(s); });
  for(let i=0;i<daysFirst;i++) cal.append(document.createElement('span'));
  for(let n=1;n<=daysMax;n++) {const span=document.createElement('span');span.textContent=n; if(n===dateParts[2]) {span.className='is-wedding';span.setAttribute('aria-label','결혼식 날짜');}cal.append(span);}
  function updateCountdown() {
    const target = new Date(`${W.date}T${W.time}:00+09:00`).getTime();
    const days = Math.ceil((target-Date.now())/86400000);
    setText('countdown', Number.isFinite(days) ? (days > 0 ? `D-${days}` : days === 0 ? 'D-DAY' : `D+${Math.abs(days)}`) : '');
  }
  updateCountdown();

  const calendarStart = new Date(`${W.date}T${pad(hour)}:${pad(minute)}:00+09:00`);
  const calendarEnd = new Date(calendarStart.getTime()+60*60*1000);
  const calendarTime = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const eventTitle = `${W.bride} · ${W.groom} 결혼식`;
  const eventLocation = [W.venue,W.hall,W.address].filter(Boolean).join(' ');
  const calendarLink = $('calendarAddButton');
  if (!Number.isNaN(calendarStart.getTime())) {
    const googleParams = new URLSearchParams({
      action:'TEMPLATE',
      text:eventTitle,
      dates:`${calendarTime(calendarStart)}/${calendarTime(calendarEnd)}`,
      ctz:'Asia/Seoul',
      details:'결혼식에 초대합니다.',
      location:eventLocation
    });
    calendarLink.href=`https://calendar.google.com/calendar/render?${googleParams.toString()}`;
  } else {
    calendarLink.removeAttribute('href');
    calendarLink.setAttribute('aria-disabled','true');
    calendarLink.addEventListener('click', event=>{
      event.preventDefault();
      toast('예식 날짜를 확인해 주세요.');
    });
  }

  /* A gallery that includes the photos already specified in PHOTOS and BOOK_IMAGES. */
  const gallery = [];
  const known = new Set();
  function addGallery(src, alt) {
    if (!src || known.has(src)) return;
    known.add(src);gallery.push({src,alt});
  }
  allPhotos.forEach((photo,i) => addGallery(photo.src,photo.alt || `웨딩 사진 ${i+1}`));
  addGallery(pics.cover,'청첩장 표지 사진');
  addGallery(pics.contents,'웨딩 사진');
  addGallery(pics.inside,'함께한 순간');
  Object.values(pics.chapter || {}).forEach((src,i) => addGallery(src,`우리의 추억 ${i+1}`));
  // Native horizontal gallery: all four-image editorial spreads are mounted
  // in a single scrollable rail. Mobile browsers handle momentum and touch
  // natively; no touchend thresholds, page re-rendering or nav buttons.
  const PHOTO_SLIDE_SIZE = 4;
  const totalGallerySlides = Math.max(1, Math.ceil(gallery.length / PHOTO_SLIDE_SIZE));
  let openPhotoIndex = -1;
  let prevPhotoFocus = null;
  const galleryRail = $('galleryRail');
  const photoGrid = $('photoGrid');
  const galleryPageIndicator = $('galleryPageIndicator');
  const galleryPageLabel = $('galleryPageLabel');
  const galleryTotalCount = $('galleryTotalCount');
  const gallerySliderProgressBar = $('gallerySliderProgressBar');
  const gallerySlides = [];
  function imageFallBack(img) {
    img.addEventListener('error', () => {
      img.alt = '사진을 불러오지 못했습니다. 이미지 경로를 확인해 주세요.';
      img.classList.add('image-unavailable');
    });
  }
  function renderGallerySlides() {
    photoGrid.replaceChildren();
    gallerySlides.length=0;
    galleryTotalCount.textContent=`TOTAL ${pad(gallery.length)} PHOTOGRAPHS`;
    if (!gallery.length) {
      const empty = document.createElement('p');empty.className='gallery-empty';
      empty.textContent='data.js에 앨범 사진을 등록해 주세요.';
      photoGrid.append(empty);
      galleryPageLabel.textContent='00 — 00';
      galleryPageIndicator.textContent='00 / 00';
      gallerySliderProgressBar.style.width='0%';
      return;
    }
    for(let start=0;start<gallery.length;start+=PHOTO_SLIDE_SIZE) {
      const group=gallery.slice(start,start+PHOTO_SLIDE_SIZE);
      const slide=document.createElement('section');
      slide.className='gallery-slide'+((start/PHOTO_SLIDE_SIZE)%2?' gallery-slide-alt':'');
      slide.setAttribute('aria-label',`사진 ${start+1}번부터 ${start+group.length}번`);
      group.forEach((photo,offset)=>{
        const index=start+offset;
        const tile=document.createElement('button');tile.type='button';tile.className='gallery-slide-photo';
        tile.setAttribute('aria-label',`사진 ${index+1} 크게 보기`);
        const img=document.createElement('img');img.src=photo.src;
        img.alt=photo.alt;img.loading=index<4?'eager':'lazy';img.decoding='async';
        img.draggable=false;
        imageFallBack(img);
        const tag=document.createElement('span');tag.className='gallery-slide-number';tag.textContent=pad(index+1);
        tile.append(img,tag);
        tile.addEventListener('click',()=>openLightbox(index));
        slide.append(tile);
      });
      photoGrid.append(slide);
      gallerySlides.push(slide);
    }
    updateGalleryProgress(0);
  }
  function updateGalleryProgress(active) {
    const index=Math.max(0,Math.min(totalGallerySlides-1,active));
    const start=index*PHOTO_SLIDE_SIZE;
    galleryPageLabel.textContent=`${pad(start+1)} — ${pad(Math.min(gallery.length,start+PHOTO_SLIDE_SIZE))}`;
    galleryPageIndicator.textContent=`${pad(index+1)} / ${pad(totalGallerySlides)}`;
    gallerySliderProgressBar.style.width=`${((index+1)/totalGallerySlides)*100}%`;
  }
  function activeGallerySlide() {
    if(!gallerySlides.length) return 0;
    const left=galleryRail.scrollLeft;
    let closest=0,minimum=Infinity;
    gallerySlides.forEach((slide,index)=>{
      const distance=Math.abs(slide.offsetLeft-gallerySlides[0].offsetLeft-left);
      if(distance<minimum){minimum=distance;closest=index;}
    });
    return closest;
  }
  let progressRAF=0;
  galleryRail.addEventListener('scroll',()=>{
    if(progressRAF) return;
    progressRAF=requestAnimationFrame(()=>{
      progressRAF=0;updateGalleryProgress(activeGallerySlide());
    });
  },{passive:true});
  galleryRail.addEventListener('keydown',event=>{
    if(event.key!=='ArrowLeft' && event.key!=='ArrowRight') return;
    event.preventDefault();
    const direction=event.key==='ArrowRight'?1:-1;
    const next=Math.max(0,Math.min(gallerySlides.length-1,activeGallerySlide()+direction));
    const target=gallerySlides[next];
    if(target) galleryRail.scrollTo({left:target.offsetLeft-gallerySlides[0].offsetLeft,behavior:reducedMotion?'instant':'smooth'});
  });
  // Snap to ONE editorial spread at a time on touch devices. Do not hijack
  // vertical swipes; only intervene once horizontal intent is clear.
  let galleryTouchStart=null;
  galleryRail.addEventListener('touchstart',event=>{
    if(event.touches.length!==1) return;
    const t=event.touches[0];
    galleryTouchStart={x:t.clientX,y:t.clientY,index:activeGallerySlide()};
  },{passive:true});
  galleryRail.addEventListener('touchend',event=>{
    if(!galleryTouchStart||!event.changedTouches.length) return;
    const t=event.changedTouches[0];
    const dx=t.clientX-galleryTouchStart.x,dy=t.clientY-galleryTouchStart.y;
    const old=galleryTouchStart;galleryTouchStart=null;
    if(Math.abs(dx)<32||Math.abs(dx)<=Math.abs(dy)*1.15) return;
    const index=Math.max(0,Math.min(gallerySlides.length-1,old.index+(dx<0?1:-1)));
    const first=gallerySlides[0],slide=gallerySlides[index];
    if(!first||!slide) return;
    // Momentum may continue for a moment; align once it settles.
    setTimeout(()=>galleryRail.scrollTo({left:slide.offsetLeft-first.offsetLeft,behavior:'smooth'}),70);
    updateGalleryProgress(index);
  },{passive:true});
  renderGallerySlides();
  function openLightbox(index) {
    if(!gallery.length) return;
    prevPhotoFocus=document.activeElement;
    openPhotoIndex=(index+gallery.length)%gallery.length;
    $('photoLightbox').hidden=false;document.body.classList.add('is-locked');
    drawLightbox();$('lightboxClose').focus();
  }
  function drawLightbox() {
    $('lightboxImage').src=gallery[openPhotoIndex].src;
    $('lightboxImage').alt=gallery[openPhotoIndex].alt;
    setText('lightboxCounter',`${pad(openPhotoIndex+1)} / ${pad(gallery.length)}`);
  }
  function moveLightbox(direction) {openPhotoIndex=(openPhotoIndex+direction+gallery.length)%gallery.length;drawLightbox();}
  function closeLightbox() {$('photoLightbox').hidden=true;document.body.classList.remove('is-locked');prevPhotoFocus?.focus?.();}
  $('lightboxPrev').addEventListener('click',()=>moveLightbox(-1));
  $('lightboxNext').addEventListener('click',()=>moveLightbox(1));
  $('lightboxClose').addEventListener('click',closeLightbox);
  $('photoLightbox').addEventListener('click',e=>{if(e.target===$('photoLightbox'))closeLightbox();});
  let swipedFrom=0;
  $('photoLightbox').addEventListener('touchstart',e=>{swipedFrom=e.changedTouches[0]?.screenX||0;},{passive:true});
  $('photoLightbox').addEventListener('touchend',e=>{const x=e.changedTouches[0]?.screenX||0;if(Math.abs(x-swipedFrom)>55)moveLightbox(x<swipedFrom?1:-1);},{passive:true});
  document.addEventListener('keydown',e=>{
    if (!$('photoLightbox').hidden) {
      if(e.key==='Escape') closeLightbox();
      else if(e.key==='ArrowLeft') moveLightbox(-1);
      else if(e.key==='ArrowRight') moveLightbox(1);
      else if(e.key==='Tab') { // Keep focus in the accessible photo dialog.
        const buttons=[$('lightboxClose'),$('lightboxPrev'),$('lightboxNext')];
        const i=buttons.indexOf(document.activeElement);
        if(i>=0) {e.preventDefault();buttons[(i+(e.shiftKey?2:1))%3].focus();}
      }
    } else if(!menu.hidden && e.key==='Escape') toggleMenu(false);
  });

  /* Transit with the exact lines from WEDDING.transit. */
  setText('venueName',W.venue);setText('venueHall',W.hall);setText('venueAddress',W.address);
  setText('parkingInfo',W.parking);
  const mapURL=safeHttp(W.mapUrl);
  if(mapURL) $('mapLink').href=mapURL;
  else $('mapLink').hidden=true;
  $('copyAddress').addEventListener('click',()=>copyText(W.address,'예식장 주소를 복사했습니다.'));
  const transitLines=String(W.transit||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  let transitSection=''; const subway=[],bus=[];
  for(const line of transitLines) {
    if(line.includes('[지하철')) {transitSection='subway';continue;}
    if(line.includes('[버스')) {transitSection='bus';continue;}
    if(transitSection==='subway') subway.push(line);
    if(transitSection==='bus') bus.push(line);
  }
  const subwayBox=$('subwayInfo');
  subway.forEach(line=>{
    const n=line.match(/^\s*(\d+)호선/);const row=document.createElement('div');row.className='transit-row';
    if(n){const marker=document.createElement('span');marker.className=`line-circle line-${n[1]}`;marker.textContent=n[1];row.append(marker);}
    const description=document.createElement('span');description.textContent=line.replace(/^\d+호선\s*:\s*/,'');row.append(description);subwayBox.append(row);
  });
  const busBox=$('busInfo');bus.forEach(line=>{const p=document.createElement('p');p.className='transit-text';p.textContent=line;busBox.append(p);});
  if(!bus.length) document.querySelector('.bus-details').hidden=true;

  /* Account list, retains original account data as supplied. */
  const accWrap=$('accounts');
  [['bride','신부측'],['groom','신랑측']].forEach(([side,label])=>{
    const list=Array.isArray(accountData[side])?accountData[side]:[];
    const details=document.createElement('details');details.className='account-accordion';
    const summary=document.createElement('summary');summary.innerHTML=`${label} 계좌 안내 <span aria-hidden="true"></span>`;details.append(summary);
    
    list.forEach(account=>{
      const item=document.createElement('div');item.className='account-entry';
      const text=document.createElement('div');const strong=document.createElement('strong');strong.textContent=account.label;
      const p=document.createElement('p');p.textContent=account.bank&&account.number&&account.holder?`${account.bank} ${account.number}\n예금주 ${account.holder}`:'계좌정보 준비 중';p.style.whiteSpace='pre-line';text.append(strong,p);
      const btn=document.createElement('button');btn.type='button';btn.textContent='복사하기';
      btn.disabled=!(account.bank&&account.number&&account.holder);
      btn.addEventListener('click',()=>copyText(`${account.bank} ${account.number}`,'계좌번호를 복사했습니다.'));
      item.append(text,btn);details.append(item);
    });
    accWrap.append(details);
  });

  const avatars = [
    {name:'여성 1',image:'assets/guest-02-v15.webp'},
    {name:'여성 2',image:'assets/guest-03-v15.webp'},
    {name:'남성 1',image:'assets/guest-04-v15.webp'},
    {name:'남성 2',image:'assets/guest-05-v15.webp'},
    {name:'여성 3',image:'assets/guest-06-v15.webp'},
    {name:'여성 4',image:'assets/guest-07-v15.webp'},
    {name:'남성 3',image:'assets/guest-08-v15.webp'},
    {name:'남성 4',image:'assets/guest-09-v15.webp'},
    {name:'남성 5',image:'assets/guest-10-v15.webp'},
    {name:'남성 6',image:'assets/guest-11-v15.webp'},
    {name:'여성 5',image:'assets/guest-12-v15.webp'},
    {name:'여성 6',image:'assets/guest-13-v15.webp'}
  ];
  const selectableAvatarIds = Array.from({length:avatars.length},(_,i)=>i);

  function avatarImage(index) {
    const avatar = avatars[
      Number.isInteger(index) &&
      index >= 0 &&
      index < avatars.length ? index : 0
    ];

    const img = document.createElement('img');

    // 선택창, 원판사진, 메시지 목록 모두 동일한 이미지 사용
    img.src = avatar.image;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.className = 'pixel-avatar';

    return img;
  }

  let avatarChoice=0;
  const avPick=$('characterPicker');
  function refreshPickers() {
    avPick.querySelectorAll('button').forEach(button=>{
      const selected=Number(button.dataset.avatarId)===avatarChoice;
      button.classList.toggle('is-selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
  }
  function addCharacterRow(label, ids) {
    const row=document.createElement('div');row.className='character-row';
    const heading=document.createElement('span');heading.className='character-row-label';
    heading.textContent=label;
    const track=document.createElement('div');track.className='character-track';
    track.setAttribute('role','group');
    track.setAttribute('aria-label',`${label} 캐릭터 선택`);
    track.tabIndex=0;
    ids.forEach(index=>{
      const avatar=avatars[index];
      const button=document.createElement('button');button.type='button';button.className='character-option';
      button.dataset.avatarId=String(index);
      button.setAttribute('aria-label',`${avatar.name} 캐릭터 선택`);
      button.append(avatarImage(index, true));
      button.addEventListener('click',()=>{avatarChoice=index;refreshPickers();});
      track.append(button);
    });
    row.append(heading,track);avPick.append(row);
  }
  addCharacterRow('여성',selectableAvatarIds.filter(id=>avatars[id].name.startsWith('여성')));
  addCharacterRow('남성',selectableAvatarIds.filter(id=>avatars[id].name.startsWith('남성')));
  refreshPickers();

  const MARKER_V3=/\n\[\[wed:v3,a=(\d{1,2})\]\]$/;
  const MARKER_V2=/\n\[\[wed:v2,a=(\d{1,2}),f=(flowers|lamp|books)\]\]$/;
  const packMessage=(message,avatar)=>`${message}\n[[wed:v3,a=${avatar}]]`;
  function unpackMessage(message) {
    const raw=String(message||'');const match=raw.match(MARKER_V3)||raw.match(MARKER_V2);
    return match?{message:raw.slice(0,-match[0].length),avatar:Math.min(avatars.length-1,Math.max(0,Number(match[1])||0))}:
      {message:raw,avatar:0};
  }
  let sbClient=null; let sbPromise=null; let backendStarted=false; let saving=false;
  async function connectSupabase() {
    if(sbClient) return sbClient;
    const config=window.WEDDING_GUESTBOOK_CONFIG;
    if(!config || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(config.url||'')) ||
       !config.publishableKey || String(config.publishableKey).startsWith('sb_secret_')) return null;
    if(!sbPromise) sbPromise=new Promise((resolve,reject)=>{
      if(window.supabase?.createClient) {resolve();return;}
      const script=document.createElement('script');
      const timeout=setTimeout(()=>{script.remove();sbPromise=null;reject(new Error('Supabase download timeout'));},10000);
      script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload=()=>{clearTimeout(timeout);window.supabase?.createClient?resolve():reject(new Error('Supabase client unavailable'));};
      script.onerror=()=>{clearTimeout(timeout);sbPromise=null;reject(new Error('Supabase library load failed'));};
      document.head.append(script);
    });
    try {
      await sbPromise;
      sbClient=window.supabase.createClient(config.url,config.publishableKey,{
        auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
      });
      return sbClient;
    } catch(e) {console.warn(e);return null;}
  }

  const localLikeKey='shun-wedding-heart-v1';
  const visitorKey='shun-wedding-heart-visitor-v1';
  const likeButton=$('likeButton');
  let likesReady=false;
  function localGet(key) {try{return localStorage.getItem(key);}catch{return null;}}
  function localSet(key,value) {try{localStorage.setItem(key,value);}catch{/* storage may be disabled */}}
  function setLiked(value) {
    likeButton.classList.toggle('is-liked',value);
    likeButton.setAttribute('aria-pressed',String(value));
    likeButton.querySelector('.heart-symbol').textContent=value?'♥':'♡';
    likeButton.setAttribute('aria-label',value?'축하 하트를 보냈습니다':'하트로 축하하기');
    likeButton.disabled=value;
  }
  async function loadLikes() {
    const client=await connectSupabase();
    if(!client) {$('likeStatus').textContent='하트 기능은 Supabase 연결 후 이용할 수 있습니다.';return;}
    try {
      const {count,error}=await client.from('wedding_likes').select('id',{count:'exact',head:true});
      if(error) throw error;
      likesReady=true;
      setText('likeCount',Number(count||0).toLocaleString('ko-KR'));
      setLiked(localGet(localLikeKey)==='synced');
      $('likeStatus').textContent='';
    } catch(error) {
      console.info('wedding_likes table unavailable:',error.message);
      $('likeStatus').textContent='하트 집계를 사용하려면 동봉된 supabase-likes.sql을 1회 실행해 주세요.';
    }
  }
  likeButton.addEventListener('click',async()=>{
    if(!likesReady) {toast('하트 집계 연결을 먼저 확인해 주세요.');return;}
    if(localGet(localLikeKey)==='synced') {toast('이미 축하 하트를 보내주셨어요.');return;}
    likeButton.disabled=true;
    try {
      const client=await connectSupabase();
      let visitor=localGet(visitorKey);
      if(!visitor) {visitor=crypto?.randomUUID?.() || `visitor-${Date.now()}-${Math.random()}`;localSet(visitorKey,visitor);}
      const {error}=await client.from('wedding_likes').insert({visitor_id:visitor});
      if(error && error.code!=='23505') throw error;
      localSet(localLikeKey,'synced');setLiked(true);
      toast('축하의 하트가 전해졌습니다. 감사합니다 ♡');
      await loadLikes();
    } catch(error) {console.warn('Like failed',error);likeButton.disabled=false;toast('하트를 보내지 못했습니다. 다시 시도해 주세요.');}
  });

  function showMessageState(message) {
    const li=document.createElement('li');li.className='empty-message';li.textContent=message;
    $('guestbookList').replaceChildren(li);
  }
  /* Studio group portrait: front-facing groom and bride always stand in the center.
   * Guests populate 3 standing tiers beside them; the horizontal stage widens as
   * guests are added, with independent touch scrolling (no page-wide overflow).
   */
  const portraitViewport=$('portraitViewport');
  const portraitGuests = $('portraitGuests');
  const portraitParty = $('portraitParty');
  function updatePortraitHint() {
    const hasMore=portraitViewport.scrollWidth>portraitViewport.clientWidth+5;
    $('portraitScrollHint').textContent=hasMore
      ? '좌우로 밀어 더 많은 하객을 만나보세요.'
      : '신랑·신부와 함께하는 우리의 원판사진';
  }
  function centerPortrait() {
    const stage=$('portraitStage');
    portraitViewport.scrollLeft=Math.max(0,(stage.scrollWidth-portraitViewport.clientWidth)/2);
    updatePortraitHint();
  }
  addEventListener('resize',updatePortraitHint,{passive:true});
 
  function renderRoom(rows, total = rows.length) {
    portraitGuests.replaceChildren();

    setText(
      'roomCounter',
      `${total.toLocaleString('ko-KR')}명의 하객`
    );

    const cellWidth = 50;

    // 충분한 공간을 확보하면서 3줄로 배치
    const columns = Math.max(
      6,
      2 * Math.ceil(Math.ceil((rows.length + 2) / 3) / 2)
    );

    const centerLeft = columns / 2 - 1;
    const centerRight = columns / 2;

    // 중앙에서 바깥쪽으로 순서대로 채우기
    const columnOrder = [];

    for (let d = 0; d < columns / 2; d++) {
      columnOrder.push(centerLeft - d, centerRight + d);
    }

    const positions = [];

    for (const col of columnOrder) {
      // 가운데줄 → 윗줄 → 아랫줄
      for (const tier of [1, 0, 2]) {
        // 신랑·신부가 서 있는 맨 앞 두 칸만 확보
        if (
          tier === 2 &&
          (col === centerLeft || col === centerRight)
        ) continue;

        positions.push([col, tier]);
      }
    }

    portraitParty.style.setProperty(
      '--guest-columns',
      String(columns)
    );

    portraitParty.style.setProperty(
      '--portrait-width',
      `${columns * cellWidth}px`
    );

    $('portraitStage').style.setProperty(
      '--stage-width',
      `${Math.max(390, columns * cellWidth + 24)}px`
    );

    rows.forEach((row, index) => {
      const [col, tier] = positions[index];
      const meta = unpackMessage(row.message);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'portrait-avatar';

      button.style.gridColumn = String(col + 1);
      button.style.gridRow = String(tier + 1);

      button.setAttribute(
        'aria-label',
        `${row.name || '하객'}님의 축하 메시지 보기`
      );

      const name = document.createElement('span');
      name.className = 'portrait-avatar-name';

      const fullName = String(row.name || '하객')
        .replace(/\s+/g, '');

      const units = typeof Intl.Segmenter === 'function'
        ? [...new Intl.Segmenter('ko', {
            granularity: 'grapheme'
          }).segment(fullName)].map(x => x.segment)
        : Array.from(fullName);

      name.textContent = units.slice(0, 4).join('');

      button.append(avatarImage(meta.avatar), name);

      button.addEventListener('click', () => {
        void showMessagePageFor(index);
      });

      portraitGuests.append(button);
    });

    requestAnimationFrame(centerPortrait);
  }


  const MESSAGES_PER_PAGE=3;
  let messagePage=0;
  function renderMessagePage() {
    const pages=Math.max(1,Math.ceil(guestTotal/MESSAGES_PER_PAGE));
    messagePage=Math.max(0,Math.min(messagePage,pages-1));
    setText('messagePageIndicator',`${pad(messagePage+1)} / ${pad(pages)}`);
    $('messagePagination').hidden=guestTotal<=MESSAGES_PER_PAGE;
    $('messagePrev').disabled=messagePage<=0;
    $('messageNext').disabled=messagePage>=pages-1;
    const list=$('guestbookList');list.replaceChildren();
    if(guestTotal===0) {showMessageState('아직 남겨진 메시지가 없습니다. 첫 번째 하객이 되어 주세요.');return;}
    const start=messagePage*MESSAGES_PER_PAGE;
    const pageRows=guestRows.slice(start,start+MESSAGES_PER_PAGE);
    if(!pageRows.length){showMessageState('메시지를 불러오는 중입니다.');return;}
    pageRows.forEach((r,localIndex)=>{
      const index=start+localIndex;
      const meta=unpackMessage(r.message);
      const li=document.createElement('li');li.className='message-entry';li.id=`guest-entry-${index}`;
      const avatar=document.createElement('div');avatar.className='message-avatar';avatar.append(avatarImage(meta.avatar));
      const info=document.createElement('div');info.className='message-copy';
      const name=document.createElement('div');name.className='message-name';
      const strong=document.createElement('strong');strong.textContent=String(r.name||'하객');name.append(strong);
      const date=document.createElement('time');date.className='message-time';date.dateTime=String(r.created_at||'');
      const parsed=new Date(r.created_at);date.textContent=Number.isNaN(parsed.getTime())?'':new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(parsed);
      const p=document.createElement('p');p.textContent=meta.message;
      info.append(name,date,p);li.append(avatar,info);list.append(li);
    });
  }
  function renderGuestbook(rows,total=rows.length) {
    setText('messageCount',`(${total.toLocaleString('ko-KR')})`);
    renderRoom(rows,total);
    renderMessagePage();
  }
  async function showMessagePageFor(index,scroll=true) {
    if(index<0 || index>=guestTotal) return;
    const nextPage=Math.floor(index/MESSAGES_PER_PAGE);
    // Pull further batches on demand so all pages remain reachable even
    // when there are hundreds of guests, without heavy initial requests.
    while(guestRows.length<=index && guestRows.length<guestTotal) {
      const before=guestRows.length;
      await fetchGuestPage();
      if(guestRows.length===before) break;
    }
    if(guestRows.length<=index){toast('메시지를 불러오지 못했습니다. 다시 시도해 주세요.');return;}
    messagePage=nextPage;
    renderMessagePage();
    if(scroll) {
      const entry=$(`guest-entry-${index}`);
      if(entry) {
        entry.scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'center'});
        entry.classList.add('is-highlighted');
        setTimeout(()=>entry.classList.remove('is-highlighted'),2000);
      }
    }
  }
  const GUEST_PAGE_SIZE=80;
  let guestFetchSequence=0,guestRows=[],guestTotal=0,loadingMoreGuests=false;
  function updateMoreGuests() {
    const more=$('loadMoreGuests');
    more.hidden=guestRows.length>=guestTotal;
    more.textContent=`이전 축하 메시지와 하객 더 보기 (${guestRows.length} / ${guestTotal}) ↓`;
  }
  async function fetchGuestPage({reset=false}={}) {
    if(loadingMoreGuests) return;
    const sequence=reset?++guestFetchSequence:guestFetchSequence;
    if(reset) messagePage=0;
    const client=await connectSupabase();
    if(!client) {showMessageState('방명록 연결 설정을 확인해 주세요.');return;}
    loadingMoreGuests=true;
    $('refreshGuestbook').disabled=true;
    $('loadMoreGuests').disabled=true;
    try {
      const offset=reset?0:guestRows.length;
      const {data,count,error}=await client.from('wedding_guestbook')
        .select('name,message,created_at',{count:'exact'})
        .order('created_at',{ascending:false}).range(offset,offset+GUEST_PAGE_SIZE-1);
      if(error) throw error;
      if(sequence!==guestFetchSequence) return;
      guestRows=reset?(data||[]):guestRows.concat(data||[]);
      guestTotal=count??guestRows.length;
      renderGuestbook(guestRows,guestTotal);
      updateMoreGuests();
    } catch(error) {
      console.warn('Guestbook read failed:',error);
      if(sequence===guestFetchSequence) showMessageState('축하 메시지를 불러오지 못했습니다. 새로고침을 눌러 주세요.');
    } finally {
      loadingMoreGuests=false;
      $('refreshGuestbook').disabled=false;
      $('loadMoreGuests').disabled=false;
    }
  }
  async function loadGuestbook() {guestRows=[];await fetchGuestPage({reset:true});}
  $('loadMoreGuests').addEventListener('click',()=>fetchGuestPage());
  $('messagePrev').addEventListener('click',()=>{
    if(messagePage>0) {messagePage--;renderMessagePage();}
  });
  $('messageNext').addEventListener('click',()=>{
    if((messagePage+1)*MESSAGES_PER_PAGE<guestTotal) {
      void showMessagePageFor((messagePage+1)*MESSAGES_PER_PAGE,false);
    }
  });
  $('refreshGuestbook').addEventListener('click',loadGuestbook);
  $('guestbookForm').addEventListener('submit',async event=>{
    event.preventDefault();
    if(saving) return;
    const name=$('guestName').value.trim();
    const message=$('guestMessage').value.trim();
    if($('guestHomepage').value.trim()) return; // very simple bot honeypot
    if(!name || name.length>20 || message.length<2 || message.length>240) {
      setText('guestFormStatus','이름(20자 이내)과 메시지(2~240자)를 확인해 주세요.');return;
    }
    const client=await connectSupabase();
    if(!client) {setText('guestFormStatus','방명록 연결 설정을 확인해 주세요.');return;}
    const stamp=Number(localGet('shun-last-message')||0);
    if(Date.now()-stamp<12000){setText('guestFormStatus','연속 등록은 12초 후에 가능합니다.');return;}
    saving=true; $('guestSubmit').disabled=true;setText('guestFormStatus','축하 메시지를 전하고 있어요…');
    try {
      const payload=packMessage(message,avatarChoice);
      const {error}=await client.from('wedding_guestbook').insert({name,message:payload});
      if(error) throw error;
      localSet('shun-last-message',Date.now());
      $('guestbookForm').reset();avatarChoice=0;refreshPickers();
      setText('guestFormStatus','소중한 축하를 남겨주셔서 고맙습니다!');
      toast('우리의 단체사진에 함께했어요 ♡');
      await loadGuestbook();
    } catch(error) {console.warn('Guestbook insert failed:',error);setText('guestFormStatus','메시지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');}
    finally {saving=false;$('guestSubmit').disabled=false;}
  });
  function initBackend() {
    if(backendStarted) return;
    backendStarted=true;
    // Failures are explained in the UI. Never pretend a local like is global.
    loadGuestbook();loadLikes();
  }

  /* Gentle motion, never require animation for content to exist. */
  root.classList.add('js-enhanced');
  if('IntersectionObserver' in window && !reducedMotion) {
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-visible');io.unobserve(entry.target);}
    }),{rootMargin:'0px 0px 55px 0px',threshold:.06});
    document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));
  } else document.querySelectorAll('[data-reveal]').forEach(el=>el.classList.add('is-visible'));
})();
