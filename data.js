/* ============================================================
   이 파일만 수정하면 실제 예식 정보를 교체할 수 있습니다.
   계좌정보는 예시 번호를 넣지 않았습니다. 실제 정보 입력 후 공개하세요.
   ============================================================ */

const WEDDING = {
  groom: '대영',
  bride: '시연',
  date: '2027-04-03',  // YYYY-MM-DD
  time: '17:00',       // 24시간 표기 HH:MM
  timeLabel: '오후 5시',
  venue: '로얄파크컨밴션',
  hall: '3층 로얄홀',
  address: '서울 용산구 이태원로 29 로얄파크',
  greeting: '저희 두 사람이\n서로의 가장 좋은 친구가 되어\n새로운 이야기를 시작합니다.\n\n소중한 분들을 모시고\n그 첫 장을 함께 열고 싶습니다.',
  transit: '[지하철 이용 시]\n6호선 : 삼각지역 12번 출구 (도보 3분)\n4호선 : 삼각지역 1번 출구 (도보 5분)\n1호선 : 남영역 1번 출구 (도보 7분)\n\n[버스 이용 시]\n마을버스 : 용산03 (전쟁기념관 하차)\n간선버스(전쟁기념관 하차) : 110A, 110B, 421, 740, N72, N75\n간선버스(삼각지역 하차) : 421, N75, 100, 150, 151, 152, 500, 501, 502, 504, 506, 507, 605, 742, 750A, 750B, 752, N15',
  parking: '전쟁기념관 내 지상, 지하 주차 가능 / 120분 무료',
  mapUrl: 'https://naver.me/IFgdRRqM',          // 네이버 지도 또는 카카오맵 URL. 비워두면 버튼 숨김
  contactGroom: '010-3877-5394',    // 선택: 전화번호 또는 sms 링크 구현 시 사용
  contactBride: '010-9533-3988'
};

// 20개 사진 자리. 빈 문자열('')을 실제 사진 경로로 바꾸세요.
// 예: { src: 'images/photo01.jpg', alt: '햇살 아래 함께 웃는 신랑 신부' }
const IMAGE_BASE = './images/MYBOX/';
const PHOTOS = [
  { src: `${IMAGE_BASE}HSY_2860.JPG`, alt: '웨딩 사진 01' },
  { src: `${IMAGE_BASE}HSY_2993.JPG`, alt: '웨딩 사진 02' },
  { src: '', alt: '웨딩 사진 03' },
  { src: '', alt: '웨딩 사진 04' },
  { src: '', alt: '웨딩 사진 05' },
  { src: '', alt: '웨딩 사진 06' },
  { src: '', alt: '웨딩 사진 07' },
  { src: '', alt: '웨딩 사진 08' },
  { src: '', alt: '웨딩 사진 09' },
  { src: '', alt: '웨딩 사진 10' },
  { src: '', alt: '웨딩 사진 11' },
  { src: '', alt: '웨딩 사진 12' },
  { src: '', alt: '웨딩 사진 13' },
  { src: '', alt: '웨딩 사진 14' },
  { src: '', alt: '웨딩 사진 15' },
  { src: '', alt: '웨딩 사진 16' },
  { src: '', alt: '웨딩 사진 17' },
  { src: '', alt: '웨딩 사진 18' },
  { src: '', alt: '웨딩 사진 19' },
  { src: '', alt: '웨딩 사진 20' }
];

// 양가 각 3개(총 6개)의 계좌정보 자리. 원하는 구분 이름으로 바꿔도 됩니다.
const ACCOUNTS = {
  bride: [
    { label: '신부', bank: '', number: '', holder: '' },
    { label: '신부 아버지', bank: '', number: '', holder: '' },
    { label: '신부 어머니', bank: '', number: '', holder: '' }
  ],
  groom: [
    { label: '신랑', bank: '', number: '', holder: '' },
    { label: '신랑 아버지', bank: '', number: '', holder: '' },
    { label: '신랑 어머니', bank: '', number: '', holder: '' }
  ]
};


const BOOK_IMAGES = {
  cover: `${IMAGE_BASE}AAC_0109.jpg`,
  inside: `${IMAGE_BASE}HSY_2993.JPG`,
  contents: `${IMAGE_BASE}HSY_2622.JPG`,

  chapter: {
    story: `${IMAGE_BASE}AAC_0403.jpg`,
    day: `${IMAGE_BASE}HSY_2087.JPG`,
    venue: `${IMAGE_BASE}HSY_2308.JPG`,
    gallery: `${IMAGE_BASE}HSY_2922.JPG`,
    love: `${IMAGE_BASE}HSY_2682.JPG`
  }
};
