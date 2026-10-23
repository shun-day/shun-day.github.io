'use strict';

/* ============================================================
   밝은 클래식 동화책 청첩장 V5
   - 표지/본문 양면 책장 애니메이션
   - 버튼만 눌러도 순서대로 읽을 수 있음
   - 목차에서 개별 챕터로 직접 이동
   - 펼친 첫 장에 예식 핵심정보와 목차 결합
   - 사진 20장(4장씩 5면) + 6개 계좌정보 자리
   ============================================================ */


const CHAPTERS = [
  {
    id: 'story',
    ko: '초대의 글',
    en: 'Our Story',
    intro: '두 사람의 첫 문장을 함께 열어주세요.'
  },
  {
    id: 'day',
    ko: '예식일',
    en: 'Wedding Day',
    intro: '가장 특별한 하루를 기억해주세요.'
  },
  {
    id: 'venue',
    ko: '오시는 길 · 하객 안내',
    en: 'The Venue',
    intro: '오시는 길과 주차·대중교통을 안내합니다.'
  },
  {
    id: 'gallery',
    ko: '웨딩 앨범',
    en: 'Our Memories',
    intro: '함께한 순간들이 한 권의 추억이 됩니다.'
  },
  {
    id: 'love',
    ko: '마음 전하기',
    en: 'With Love',
    intro: '따뜻한 축복에 깊이 감사드립니다.'
  }
];

const PAGE_IDS = ['cover', 'contents', ...CHAPTERS.map(item=>item.id)];
const PAGE_TIME = 920;
const $ = id => document.getElementById(id);
const book = $('book');
const rightPage = $('rightPage');
const leftPage = $('leftPage');
const hardCover = $('hardCover');
const flipSheet = $('flipSheet');
const sheetFront = $('sheetFront');
const sheetBack = $('sheetBack');
const isReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const enc = v => String(v ?? '').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const chById = id => CHAPTERS.find(c => c.id === id);
const humanDate = () => { const [y,m,d] = WEDDING.date.split('-'); return `${y}. ${m}. ${d}.`; };
const timeAndHall = () => `${enc(WEDDING.timeLabel)} · ${enc(WEDDING.venue)}`;
const photoNum = idx => String(idx + 1).padStart(2,'0');
const nextIndex = id => PAGE_IDS.indexOf(id);
const galleryPageCount = Math.ceil(PHOTOS.length / 4);
let current = 'cover';
let pending = null;
let turning = false;
let galleryPage = 0;
let lightboxIndex = -1;
let lastLightboxFocus = null;
let toastTimer = null;

function chapterHeader(en, ko) {
  return `<div class="page-kicker">a little chapter from our story</div>
    <h2 class="page-heading">${en}</h2>
    <p class="page-subhead">${ko}</p>
    <div class="divider-ornament" aria-hidden="true">~ ❀ ~</div>`;
}


// The right-hand drawing MUST use the exact same scene key as the left leaf.
// storybook-art.js recognizes garden, story, day, venue, gallery and love.
function wrapPage(markup, pageId = 'contents') {
  const scene = pageId === 'contents' ? 'garden' : pageId;

  return `<div class="page-inner page-${pageId}">
    <div class="right-page-art" aria-hidden="true">
      <canvas class="right-page-drawing" data-crayon="${scene}"></canvas>
    </div>
    ${markup}
  </div>`;
}

function illustration(id, cls = 'chapter-photo') {
  const src = BOOK_IMAGES.chapter?.[id];

  if (!src) return '';

  return `
    <img
      src="${enc(src)}"
      class="${enc(cls)}"
      alt="${enc(
        id === 'story'
          ? '신랑 신부의 웨딩 사진'
          : id === 'day'
          ? '신랑 신부의 웨딩 기념 사진'
          : '웨딩 사진'
      )}"
      loading="eager"
      decoding="async"
    >
  `;
}

function lowerNav() { return ''; } // 중복된 본문 첫 페이지 버튼 삭제
function safeMapUrl() {try {const url = new URL(WEDDING.mapUrl);return ['https:','http:'].includes(url.protocol) ? url.href : '';}catch{return '';}}
function dateDiff() {
  const target = new Date(`${WEDDING.date}T${WEDDING.time}:00`);
  const days = Math.ceil((target.getTime() - Date.now()) / (1000*60*60*24));
  if(!Number.isFinite(days)) return '';
  if(days > 0) return `우리의 결혼식까지 D-${days}`;
  if(days === 0) return '오늘, 우리의 이야기가 시작됩니다.';
  return '함께해 주셔서 감사합니다.';
}

function coverMarkup() {
  return `<div class="cover-layout">
    <div class="cover-eyebrow">a little book of us</div>
    <div class="cover-ornament">
      <div class="cover-prelude">Once upon a time...</div>
      <h1 class="cover-title">Our Happily<br><em>Ever After</em></h1>
      <p class="cover-subtitle">저희 두 사람의 첫 번째 동화</p>
    </div>

    <div class="cover-illustration">
      <div class="cover-photo-frame">
        <img
          class="cover-hero-photo"
          src="${enc(BOOK_IMAGES.cover)}"
          alt="신랑 신부 웨딩 사진"
          loading="eager"
          decoding="async"
        >
        <canvas class="photo-corner"
          data-crayon="sprig"
          aria-hidden="true"></canvas>
      </div>
    </div>
    
    <div class="cover-bottom">
      <p class="cover-name">${enc(WEDDING.bride)} <span>&</span> ${enc(WEDDING.groom)}</p>
      <div class="cover-date">${enc(humanDate())}</div>
      <div class="cover-venue">${enc(WEDDING.timeLabel)} · ${enc(WEDDING.venue)}</div>
      <button type="button" class="cover-btn" data-go="contents">우리 이야기 펼치기 <span aria-hidden="true">→</span></button>
      <p class="cover-hint">표지를 넘기면 결혼식 이야기가 시작돼요.</p>
    </div>
  </div>`;
}

function insideMarkup() {
  return `<div class="inside-art">
    <span class="inside-kicker">ONCE UPON A TIME</span>
    <canvas class="crayon-scene" data-crayon="garden" aria-hidden="true"></canvas>
    <div class="inside-quote">And so our<br>story begins...</div>
    <p>서로의 하루가 만나<br>한 권의 이야기가 되었습니다.</p>
    <div class="inside-flourish" aria-hidden="true">❀ · ❀</div>
  </div>`;
}

function leftMarkup(id) {
  if(id==='contents') return insideMarkup();
  const ch = chById(id);
  if(!ch) return insideMarkup();
  return `<div class="left-illustration">
    <div class="folio">CHAPTER ${String(CHAPTERS.indexOf(ch)+1).padStart(2,'0')}</div>
    <canvas class="crayon-scene" data-crayon="${enc(id)}" aria-hidden="true"></canvas>
    <h3>${ch.en}</h3><p>${ch.intro}</p>
    <span class="flourish" aria-hidden="true">~ ❀ ~</span>
  </div>`;
}
function accountRow(account, side, index) {
  const filled = Boolean(account.bank && account.number && account.holder);
  return `<div class="account-row"><div><strong>${enc(account.label)}</strong>
     <span>${filled ? `${enc(account.bank)} · ${enc(account.number)}<br>예금주 ${enc(account.holder)}`:'계좌정보 입력 전'}</span></div>
     <button type="button" ${filled?'':'disabled'} data-account-side="${side}" data-account-index="${index}">계좌 복사</button></div>`;
}
function accountGroup(side, open=false) {
  const items=ACCOUNTS[side];
  const title=side==='bride'?'신부측':'신랑측';
  return `<details class="account-group" ${open?'open':''}><summary>${title} 계좌번호 <span>${items.length}개</span></summary>
    <div class="account-rows">${items.map((a,i)=>accountRow(a,side,i)).join('')}</div></details>`;
}
const galleryCameraIcon = `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="5" y="12" width="30" height="22" rx="3"/><path d="M13 12l2-5h10l2 5"/><circle cx="20" cy="23" r="6"/><path d="M9 17h3"/></svg>`;
function photoTile(p, index) {
  const has = Boolean(p.src);
  if(!has) return `<div class="gallery-tile is-empty" aria-label="사진 ${photoNum(index)} 자리 (이미지 미등록)"><div class="placeholder">${galleryCameraIcon}<span>PHOTO ${photoNum(index)}</span></div></div>`;
  return `<button type="button" class="gallery-tile" data-photo="${index}" aria-label="사진 ${photoNum(index)} 크게 보기"><img loading="lazy" decoding="async" src="${enc(p.src)}" alt="${enc(p.alt || `웨딩 사진 ${photoNum(index)}`)}"></button>`;
}
function galleryContents() {
  const start=galleryPage*4;
  return `<div class="gallery-pager">총 20장 · ${galleryPage+1} / ${galleryPageCount} 페이지</div>
    <div class="gallery-grid">${PHOTOS.slice(start,start+4).map((p,i)=>photoTile(p,start+i)).join('')}</div>
    <div class="gallery-controls"><button type="button" data-gallery-move="-1" ${galleryPage===0?'disabled':''}>← 이전 사진</button>
      <div class="gallery-dots" aria-hidden="true">${Array.from({length:galleryPageCount},(_,i)=>`<i class="${i===galleryPage?'active':''}"></i>`).join('')}</div>
      <button type="button" data-gallery-move="1" ${galleryPage===galleryPageCount-1?'disabled':''}>다음 사진 →</button></div>`;
}

const TOC_BUTTONS = [
  {id:'story', text:'초대의 글', icon:'letter', desc:'초대의 마음'},
  {id:'day', text:'예식 일시', icon:'calendar', desc:'날짜와 시간'},
  {id:'venue', text:'오시는 길', icon:'pin', desc:'예식장 안내'},
  {id:'gallery', text:'우리의 사진', icon:'photo', desc:'웨딩 앨범'},
  {id:'venue', text:'주차 · 교통', icon:'car', desc:'주차와 버스'},
  {id:'love', text:'마음 전하기', icon:'heart', desc:'축하의 마음'}
];

function inkIcon(name){
  const paths = {
    calendar:'<rect x="4" y="6" width="16" height="15" rx="1.5"/><path d="M8 3v6M16 3v6M4 11h16M8 15h3"/>',
    pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1116 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    photo:'<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 4 3 3-4 5 6"/>',
    car:'<path d="m5 11 2-6h10l2 6M4 16v-5h16v5M4 16h16M7 16v2M17 16v2"/><circle cx="7" cy="14" r="1"/><circle cx="17" cy="14" r="1"/>',
    heart:'<path d="M20 8.6c0 4.3-8 10.3-8 10.3S4 12.9 4 8.6C4 3.5 10.1 3.4 12 7c1.9-3.6 8-3.5 8 1.6Z"/>',
    letter:'<rect x="3" y="6" width="18" height="13" rx="1"/><path d="m3 8 9 7 9-7"/>'
  };
  return `<svg class="ink-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${paths[name]||''}</svg>`;
}
function contentsMarkup() {
  const featurePhoto = BOOK_IMAGES.contents || BOOK_IMAGES.cover || '';
  return wrapPage(`<div class="contents-layout">
    <div class="contents-kicker">the day we say, I do</div>
    <div class="contents-names">${enc(WEDDING.bride)} <span>&</span> ${enc(WEDDING.groom)}</div>
    <div class="contents-date">${enc(humanDate())}</div>
    <div class="contents-time">${enc(WEDDING.timeLabel)}</div>
    <div class="contents-location">${enc(WEDDING.venue)} <span>·</span> ${enc(WEDDING.hall)}</div>
    <div class="contents-flourish" aria-hidden="true">~ ❀ ~</div>
    ${featurePhoto ? `<div class="contents-photo-card">
      <canvas class="contents-photo-doodle contents-photo-doodle-top" data-crayon="sprig" aria-hidden="true"></canvas>
      <img class="contents-feature-photo" src="${enc(featurePhoto)}" alt="${enc(`${WEDDING.bride}와 ${WEDDING.groom}의 웨딩 사진`)}" loading="eager" decoding="async">
      <canvas class="contents-photo-doodle contents-photo-doodle-bottom" data-crayon="botanical" aria-hidden="true"></canvas>
    </div>` : ''}
    <p class="contents-divider">원하시는 메뉴를 버튼처럼 바로 눌러보세요</p>
    <nav class="contents-buttons" aria-label="예식 안내 목차">
      ${TOC_BUTTONS.map((item,i)=>`<button type="button" class="contents-button" data-go="${item.id}" aria-label="${item.text} 페이지로 이동">
        <span class="contents-button-icon">${inkIcon(item.icon)}</span>
        <span class="contents-button-copy">
          <span class="toc-no">${String(i+1).padStart(2,'0')}</span>
          <strong>${item.text}</strong>
          <small>${item.desc}</small>
        </span>
        <span class="button-arrow" aria-hidden="true">›</span>
      </button>`).join('')}
    </nav>
    <canvas class="contents-botanical" data-crayon="botanical" aria-hidden="true"></canvas>
  </div>`);
}

function transitMarkup() {
  const lines = String(WEDDING.transit || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const subway = [];
  const buses = [];

  let section = '';

  for (const line of lines) {
    if (line === '[지하철 이용 시]') {
      section = 'subway';
      continue;
    }

    if (line === '[버스 이용 시]') {
      section = 'bus';
      continue;
    }

    if (section === 'subway') subway.push(line);
    if (section === 'bus') buses.push(line);
  }

  const subwayHTML = subway.map(line => {
    const pos = line.indexOf(':');

    const name = pos >= 0
      ? line.slice(0, pos).trim()
      : '';

    const description = pos >= 0
      ? line.slice(pos + 1).trim()
      : line;

    const number = name.match(/\d+/)?.[0] || '';

    const walking = description.match(/\(도보\s*\d+분\)/);

    const station = walking
      ? description.replace(walking[0], '').trim()
      : description;

    const walkingText = walking
      ? walking[0].replace(/[()]/g, '')
      : '';

    return `
      <div class="transit-line">

        <span class="transit-number line-${number}">
          ${enc(number)}
        </span>

        <span class="transit-station">
          ${enc(station)}
        </span>

        <span class="transit-walk">
          ${enc(walkingText)}
        </span>

      </div>
    `;
  }).join('');

  const busHTML = buses.map(line => {
    const pos = line.indexOf(':');

    const name = pos >= 0
      ? line.slice(0, pos).trim()
      : '';

    const routes = pos >= 0
      ? line.slice(pos + 1).trim()
      : line;

    return `
      <div class="bus-group">
        <div class="bus-group-title">
          ${enc(name)}
        </div>
        <p>${enc(routes)}</p>
      </div>
    `;
  }).join('');

  return `
    <div class="transit-subway">
      ${subwayHTML}
    </div>

    <details class="venue-bus-details">
      <summary>
        <span>버스 노선 안내</span>
        <span class="bus-toggle-text">펼쳐보기</span>
      </summary>

      <div class="bus-list">
        ${busHTML}
      </div>
    </details>
  `;
}


function rightMarkup(id) {
  if(id==='contents') return contentsMarkup();
  
  if (id === 'story') {
    return wrapPage(`
      ${chapterHeader('Our Story', '초대의 글')}

      <div class="page-body centered story-body">
        ${illustration('story', 'chapter-photo story-photo')}

        <p class="main-copy">
          ${enc(WEDDING.greeting)}
        </p>
        <canvas class="crayon-divider" data-crayon="sprig" aria-hidden="true"></canvas>
      </div>

      ${lowerNav()}
    `, id);
  }

  
  if (id === 'day') {
    return wrapPage(`
      ${chapterHeader('Wedding Day', '예식일')}

      <div class="page-body centered day-body">
        ${illustration('day', 'chapter-photo day-photo')}

        <div class="date-big">
          ${enc(humanDate())}
        </div>

        <div class="time-big">
          ${enc(WEDDING.timeLabel)}
        </div>

        <div class="info-box">
          <h3>${enc(WEDDING.venue)}</h3>
          <p>${enc(WEDDING.hall)}</p>
        </div>

        <p class="muted">
          ${enc(dateDiff())}
        </p>

        <button
          type="button"
          class="page-action"
          id="calendarBtn">
          달력에 일정 추가
        </button>
      </div>

      ${lowerNav()}
    `, id);
  }

  
  if (id === 'venue') {

    const freeMatch = WEDDING.parking.match(
      /\d+\s*분\s*무료/
    );

    const freeLabel = freeMatch?.[0] || '';

    const parkingDescription = freeLabel
      ? WEDDING.parking
          .replace(/\s*\/\s*\d+\s*분\s*무료/, '')
          .trim()
      : WEDDING.parking;

    return wrapPage(`
      ${chapterHeader('The Venue', '오시는 길 · 하객 안내')}

      <div class="page-body venue-body venue-redesign">

        <section class="venue-card venue-location">

          <div class="venue-eyebrow">
            WEDDING LOCATION
          </div>

          <h3 class="venue-main-name">
            ${enc(WEDDING.venue)}
          </h3>

          <p class="venue-hall">
            ${enc(WEDDING.hall)}
          </p>

          <p class="venue-address">
            ${enc(WEDDING.address)}
          </p>

          <div class="venue-links">

            <button
              type="button"
              class="venue-link"
              data-copy-address>
              주소 복사
            </button>

            ${safeMapUrl() ? `
              <a
                class="venue-link primary"
                href="${enc(safeMapUrl())}"
                target="_blank"
                rel="noopener noreferrer">
                지도 열기 ↗
              </a>
            ` : ''}

          </div>

        </section>

        <section class="venue-card venue-parking">

          <div class="venue-section-heading">
            <h3>주차 안내</h3>

            ${freeLabel ? `
              <span class="parking-badge">
                ${enc(freeLabel)}
              </span>
            ` : ''}
          </div>

          <p>${enc(parkingDescription)}</p>

        </section>

        <section class="venue-card venue-transport">

          <div class="venue-section-heading">
            <h3>대중교통 안내</h3>
          </div>

          ${transitMarkup()}

        </section>

      </div>

      ${lowerNav()}
    `, id);
  }

  
  if (id === 'gallery') {
    return wrapPage(`
      ${chapterHeader('Our Memories', '웨딩 앨범')}

      <div class="page-body gallery-body">
        ${galleryContents()}
        <p class="muted">
          사진을 누르면 크게 볼 수 있어요.
        </p>
      </div>

      ${lowerNav()}
    `, id);
  }
  if(id==='love') return wrapPage(`${chapterHeader('With Love','마음 전하기')}<div class="page-body">
    ${illustration('love')}<p class="account-hint">마음을 전하실 분들을 위해 안내드립니다.<br>신랑측 · 신부측을 눌러 확인해 주세요.</p>
    ${accountGroup('bride')}${accountGroup('groom')}
    </div>${lowerNav()}`, id);
  return '';
}


function hashToId() {
  const match = location.hash.match(
    /^#\/chapter\/([a-z]+)$/
  );

  const id = match?.[1] === 'guide'
    ? 'venue'
    : match?.[1];

  return PAGE_IDS.includes(id) ? id : 'cover';
}

function updateNav(){
  const i=nextIndex(current);
  $('prevBtn').disabled=i===0;
  $('nextBtn').disabled=i===PAGE_IDS.length-1;
  $('nextBtn').querySelector('span').textContent=current==='cover'?'책 펼치기':'다음 장';
  $('pageStatus').textContent=current==='cover'?'표지':current==='contents'?'예식 안내 · 바로가기':`${chById(current).ko} · ${i-1} / ${CHAPTERS.length}`;
  book.dataset.closed=String(current==='cover');
  if(current==='cover')rightPage.setAttribute('inert',''); else rightPage.removeAttribute('inert');
  hardCover.setAttribute('aria-hidden',current==='cover'?'false':'true');
}
function finish(target){
  current=target;
  if(target==='cover')book.dataset.closed='true';
  else {rightPage.innerHTML=rightMarkup(target);leftPage.innerHTML=leftMarkup(target);rightPage.scrollTop=0;leftPage.scrollTop=0;book.dataset.closed='false';}
  hardCover.className='hard-cover'+(target==='cover'?'':' is-open');
  flipSheet.className='flip-sheet';
  sheetFront.innerHTML='';sheetBack.innerHTML='';
  book.classList.remove('is-turning');
  book.classList.add('is-settling');
  turning=false;
  updateNav();
  const next=pending ?? hashToId();
  pending=null;
  if(next!==current)requestAnimationFrame(()=>navigate(next));
  setTimeout(()=>book.classList.remove('is-settling'),470);
}
function navigate(target){
  if(!PAGE_IDS.includes(target))return;
  if(turning){pending=target;return;}
  if(target===current)return;
  if(isReducedMotion()){finish(target);return;}
  turning=true;
  const old=current;
  book.classList.remove('is-settling');book.classList.add('is-turning');
  if(old==='cover'){
    book.dataset.closed='false';
    leftPage.innerHTML=insideMarkup();rightPage.innerHTML=rightMarkup(target);
    hardCover.className='hard-cover turn-open';
  }else if(target==='cover'){
    hardCover.className='hard-cover is-open turn-close';
  }else{
    const backwards=nextIndex(target)<nextIndex(old);
    sheetFront.innerHTML=rightMarkup(backwards?target:old);
    sheetBack.innerHTML=leftMarkup(backwards?old:target);
    rightPage.innerHTML=rightMarkup(target);
    flipSheet.className=`flip-sheet ${backwards?'flipping-prev':'flipping-next'}`;
  }
  setTimeout(()=>finish(target),PAGE_TIME+35);
}
function go(id){
  if(!PAGE_IDS.includes(id))return;
  const hash=`#/chapter/${id}`;
  if(location.hash!==hash)location.hash=hash;
  else navigate(id);
}
function notify(text){
  clearTimeout(toastTimer);
  $('toast').textContent=text;$('toast').classList.add('show');
  toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2500);
}
async function copyText(text){
  if(!text){notify('아직 정보가 입력되지 않았습니다.');return;}
  try {if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(text);notify('복사되었습니다.');return;}}
  catch { /* fallback below */ }
  const area=document.createElement('textarea');
  area.value=text;area.setAttribute('readonly','');area.style.cssText='position:fixed;left:-10000px;top:0';
  document.body.appendChild(area);area.select();
  let success=false;
  try {success=document.execCommand('copy');}catch{success=false;}
  area.remove();
  notify(success?'복사되었습니다.':'복사할 수 없습니다. 내용을 길게 눌러 복사해 주세요.');
}
function calendar(){
  const compact=WEDDING.date.replaceAll('-','');
  const h=Number(WEDDING.time.slice(0,2));
  const m=WEDDING.time.slice(3,5);
  const begin=`${compact}T${WEDDING.time.replace(':','')}00`;
  const finishHour=String((h+1)%24).padStart(2,'0');
  const endDate=(h===23 ? new Date(`${WEDDING.date}T12:00:00`) : null);
  if(endDate)endDate.setDate(endDate.getDate()+1);
  const endDateStr=endDate?`${endDate.getFullYear()}${String(endDate.getMonth()+1).padStart(2,'0')}${String(endDate.getDate()).padStart(2,'0')}`:compact;
  const end=`${endDateStr}T${finishHour}${m}00`;
  const params=new URLSearchParams({action:'TEMPLATE',text:`${WEDDING.bride} ♥ ${WEDDING.groom} 결혼식`,dates:`${begin}/${end}`,details:WEDDING.venue,location:WEDDING.address});
  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`,'_blank','noopener,noreferrer');
}
function availablePhotoIndices(){return PHOTOS.map((p,i)=>p.src?i:-1).filter(i=>i>=0);}
function showPhoto(index){
  if(!PHOTOS[index] || !PHOTOS[index].src)return;
  lastLightboxFocus=document.activeElement;
  lightboxIndex=index;
  $('lightboxImage').src=PHOTOS[index].src;
  $('lightboxImage').alt=PHOTOS[index].alt || `웨딩 사진 ${photoNum(index)}`;
  $('lightboxCounter').textContent=`${index+1} / ${PHOTOS.length}`;
  $('lightbox').hidden=false;
  $('lightboxClose').focus();
}
function closePhoto(){
  $('lightbox').hidden=true;
  $('lightboxImage').removeAttribute('src');
  lightboxIndex=-1;
  if(lastLightboxFocus && typeof lastLightboxFocus.focus==='function')lastLightboxFocus.focus();
}
function movePhoto(delta){
  const choices=availablePhotoIndices();
  if(choices.length===0)return;
  const selected=choices.indexOf(lightboxIndex);
  const next=choices[(selected+delta+choices.length)%choices.length];
  lightboxIndex=next;
  $('lightboxImage').src=PHOTOS[next].src;
  $('lightboxImage').alt=PHOTOS[next].alt;
  $('lightboxCounter').textContent=`${next+1} / ${PHOTOS.length}`;
}

window.addEventListener('hashchange',()=>navigate(hashToId()));
document.addEventListener('click',e=>{
  const el=e.target.closest('button,a');
  if(!el)return;
  
  if (el.id === 'tocBtn') {
    go('cover');
    return;
  }

  if (el.dataset.go) {
    go(el.dataset.go);
    return;
  }

  if(el.id==='prevBtn'){go(PAGE_IDS[Math.max(0,nextIndex(current)-1)]);return;}
  if(el.id==='nextBtn'){go(PAGE_IDS[Math.min(PAGE_IDS.length-1,nextIndex(current)+1)]);return;}
  if(el.dataset.galleryMove){
    galleryPage=Math.max(0,Math.min(galleryPageCount-1,galleryPage+Number(el.dataset.galleryMove)));
    if(current==='gallery'){rightPage.innerHTML=rightMarkup('gallery');}
    return;
  }
  if(el.dataset.photo!==undefined){showPhoto(Number(el.dataset.photo));return;}
  if(el.dataset.accountSide){
    const a=ACCOUNTS[el.dataset.accountSide]?.[Number(el.dataset.accountIndex)];
    if(a?.bank && a?.number && a?.holder)copyText(`${a.bank} ${a.number} (예금주 ${a.holder})`);
    return;
  }
  if(el.dataset.copyAddress!==undefined){copyText(WEDDING.address);return;}
  if(el.id==='calendarBtn'){calendar();return;}
  if(el.id==='lightboxClose'){closePhoto();return;}
  if(el.id==='lightboxPrev'){movePhoto(-1);return;}
  if(el.id==='lightboxNext'){movePhoto(1);return;}
});
document.addEventListener('keydown',e=>{
  if(!$('lightbox').hidden){
    if(['Escape','ArrowRight','ArrowLeft'].includes(e.key))e.preventDefault();
    if(e.key==='Escape')closePhoto();
    if(e.key==='ArrowRight')movePhoto(1);
    if(e.key==='ArrowLeft')movePhoto(-1);
    return;
  }
  if(e.target instanceof Element && e.target.closest('a,button,summary,input,textarea,select'))return;
  if(e.key==='ArrowRight'){e.preventDefault();go(PAGE_IDS[Math.min(PAGE_IDS.length-1,nextIndex(current)+1)]);}
  if(e.key==='ArrowLeft'){e.preventDefault();go(PAGE_IDS[Math.max(0,nextIndex(current)-1)]);}
});
// 사진 확대 중 스와이프로 이전/다음
let touchStartX=null;
$('lightbox').addEventListener('touchstart',e=>{touchStartX=e.changedTouches[0]?.screenX ?? null;},{passive:true});
$('lightbox').addEventListener('touchend',e=>{if(touchStartX===null)return;const diff=(e.changedTouches[0]?.screenX??touchStartX)-touchStartX;if(Math.abs(diff)>55)movePhoto(diff<0?1:-1);touchStartX=null;},{passive:true});
// 사진 파일이 잘못 지정된 경우 깨진 이미지 대신 안내 문구
window.addEventListener('error',e=>{
  if(!(e.target instanceof HTMLImageElement) || !e.target.closest('.gallery-tile'))return;
  const tile=e.target.closest('.gallery-tile');
  tile.classList.add('is-empty');tile.removeAttribute('data-photo');tile.setAttribute('aria-label','이미지를 불러올 수 없습니다');
  tile.innerHTML=`<div class="placeholder">${galleryCameraIcon}<span>이미지 확인 필요</span></div>`;
},true);

// 페이지 최초 렌더링
$('coverFront').innerHTML=coverMarkup();
$('coverInside').innerHTML=insideMarkup();
current=hashToId();
if(current!=='cover'){
  hardCover.classList.add('is-open');
  rightPage.innerHTML=rightMarkup(current);
  leftPage.innerHTML=leftMarkup(current);
}
updateNav();




/* =====================================================
   Responsive Book Stage
   ===================================================== */

(() => {
  const LEAF_W = 390;
  const LEAF_H = 670;

  const win = $('bookWindow');
  const main = $('mainArea');
  const shell = document.querySelector('.site-shell');
  const header = document.querySelector('.topbar');
  const nav = document.querySelector('.bottom-nav');
  const status = $('pageStatus');

  if (!win || !main || !shell || !header || !nav || !status) {
    return;
  }

  // 책을 축소할 외부 프레임
  const frame = document.createElement('div');
  frame.className = 'book-fit-frame';

  win.before(frame);
  frame.append(win);

  // 제목 + 책 + 하단 버튼을 한 그룹으로 배치
  main.prepend(header);
  main.append(nav, status);

  // 상단 중복 바로가기 제거
  document.querySelector('.easy-view-trigger')?.remove();

  const titleBtn = document.querySelector('button.wordmark');

  if (titleBtn) {
    const label = document.createElement('div');
    label.className = 'wordmark';
    label.innerHTML = titleBtn.innerHTML;
    titleBtn.replaceWith(label);
  }

  let raf = 0;

  const px = value => parseFloat(value) || 0;

  
  function fit() {
    raf = 0;

    const mainStyle = getComputedStyle(main);
    const px = value => parseFloat(value) || 0;

    const isMobile =
      document.documentElement.clientWidth <= 760;

    const designWidth = isMobile
      ? LEAF_W
      : LEAF_W * 2;

    // 1. 가로 사용 가능 영역
    const availableWidth = Math.max(
      1,
      main.clientWidth -
      px(mainStyle.paddingLeft) -
      px(mainStyle.paddingRight) -
      8
    );

    // 2. 세로 사용 가능 영역
    const navMarginTop =
      parseFloat(getComputedStyle(nav).marginTop) || 0;

    const availableHeight = Math.max(
      1,
      main.clientHeight -
      nav.offsetHeight -
      navMarginTop -
      8
    );

    // 3. 책의 가로 배율만 계산
    const scale = Math.min(
      1.15,
      availableWidth / designWidth
    );

    // 4. 남은 화면 높이에 맞춰 책의 실제 높이를 변경
    // 고정 670px 대신 동적 페이지 높이 적용
    const pageHeight = Math.min(
      950,
      Math.max(1, availableHeight / scale)
    );

    // 5. 바깥 컨테이너에만 scale 적용
    win.style.setProperty(
      '--fit-scale',
      String(scale)
    );

    // 책의 실제 논리적 높이
    win.style.setProperty(
      '--adaptive-leaf-height',
      `${pageHeight}px`
    );

    // 화면에 표시되는 책 크기
    frame.style.setProperty(
      '--fit-width',
      `${designWidth * scale}px`
    );

    frame.style.setProperty(
      '--fit-height',
      `${pageHeight * scale}px`
    );

    shell.style.setProperty(
      '--scaled-book-width',
      `${designWidth * scale}px`
    );
  }


  function queueFit() {
    if (raf) return;
    raf = requestAnimationFrame(fit);
  }

  queueFit();

  window.addEventListener('resize', queueFit);
  window.addEventListener('orientationchange', queueFit);

  window.visualViewport?.addEventListener(
    'resize',
    queueFit
  );

  document.fonts?.ready.then(queueFit);
})();