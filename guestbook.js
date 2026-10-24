/*
 * Wedding guestbook on its own book chapter (page-guestbook).
 * The chapter and its TOC entry are created by the updated app.js.
 */
(function () {
  'use strict';

  const PAGE_ID = 'rightPage';
  const TABLE = 'wedding_guestbook';
  const MAX_NAME = 20;
  const MAX_MESSAGE = 300;
  const PAGE_SIZE = 40;
  let client = null;
  let libraryPromise = null;
  let isSaving = false;
  let lastRequest = 0;

  const guestbookMarkup = `
    <section class="guestbook-section" id="weddingGuestbook" aria-label="축하 방명록 작성과 조회">
      <div class="guestbook-heading">
        <p>두 사람에게 따뜻한 축하의 한마디를 남겨 주세요.</p>
      </div>

      <form class="guestbook-form" id="guestbookForm">
        <label for="guestbookName">이름 또는 별명</label>
        <input id="guestbookName" name="name" type="text" minlength="1" maxlength="20"
          autocomplete="name" placeholder="이름을 입력해 주세요" required>

        <label for="guestbookMessage">축하 메시지</label>
        <textarea id="guestbookMessage" name="message" rows="4" minlength="2" maxlength="300"
          placeholder="두 사람에게 전하고 싶은 마음을 적어 주세요" required></textarea>

        <div class="guestbook-honeypot" aria-hidden="true">
          <label for="guestbookHomepage">빈칸으로 남겨 주세요</label>
          <input id="guestbookHomepage" name="homepage" type="text" tabindex="-1" autocomplete="off">
        </div>

        <button class="guestbook-submit" type="submit">메시지 남기기</button>
        <p class="guestbook-notice">작성한 글은 즉시 방명록에 공개됩니다. 개인정보는 입력하지 말아 주세요.</p>
        <p class="guestbook-form-status" role="status" aria-live="polite"></p>
      </form>

      <div class="guestbook-list-heading">
        <h4>하객이 남긴 축하</h4>
        <button type="button" class="guestbook-refresh">새로고침 ↻</button>
      </div>
      <ul class="guestbook-list" aria-live="polite">
        <li class="guestbook-empty">메시지를 불러오는 중입니다.</li>
      </ul>
    </section>`;

  function ensureLibrary() {
    if(window.supabase?.createClient) return Promise.resolve();
    if(!libraryPromise) {
      libraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timeout = setTimeout(() => {
          script.remove();
          libraryPromise = null; // permit a retry from the refresh button
          reject(new Error('Supabase client download timed out'));
        }, 6500);
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => {
          clearTimeout(timeout);
          if(window.supabase?.createClient) resolve();
          else { libraryPromise = null; reject(new Error('Supabase client unavailable')); }
        };
        script.onerror = () => {
          clearTimeout(timeout);
          libraryPromise = null;
          reject(new Error('Supabase client download failed'));
        };
        document.head.append(script);
      });
    }
    return libraryPromise;
  }

  async function getClient() {
    if (client) return client;
    const config = window.WEDDING_GUESTBOOK_CONFIG;
    if (!config || typeof config.url !== 'string' || typeof config.publishableKey !== 'string') return null;
    const url = config.url.trim();
    const key = config.publishableKey.trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) ||
        !key || key.includes('REPLACE_ME') || key.startsWith('sb_secret_')) return null;
    try { await ensureLibrary(); } catch (err) { console.warn(err); return null; }

    client = window.supabase.createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return client;
  }

  function setListMessage(list, text) {
    list.replaceChildren();
    const li = document.createElement('li');
    li.className = 'guestbook-empty';
    li.textContent = text;
    list.append(li);
  }

  function formatDate(raw) {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(date);
  }

  function renderRows(list, rows) {
    list.replaceChildren();
    if (!rows || rows.length === 0) {
      setListMessage(list, '아직 공개된 메시지가 없어요. 첫 번째 축하를 남겨 주세요.');
      return;
    }
    for (const row of rows) {
      const item = document.createElement('li');
      item.className = 'guestbook-entry';
      const header = document.createElement('div');
      header.className = 'guestbook-entry-head';
      const name = document.createElement('strong');
      name.className = 'guestbook-entry-name';
      name.textContent = String(row.name || '익명의 하객');
      const date = document.createElement('time');
      date.className = 'guestbook-entry-date';
      date.dateTime = String(row.created_at || '');
      date.textContent = formatDate(row.created_at);
      header.append(name, date);
      const message = document.createElement('p');
      message.className = 'guestbook-entry-message';
      // Never render user-entered messages as HTML.
      message.textContent = String(row.message || '');
      item.append(header, message);
      list.append(item);
    }
  }

  async function refresh(section) {
    const list = section.querySelector('.guestbook-list');
    const refreshButton = section.querySelector('.guestbook-refresh');
    if (!list || !refreshButton) return;
    const instance = await getClient();
    if (!instance) {
      setListMessage(list, 'Supabase 연결 설정 또는 라이브러리 로드를 확인해 주세요.');
      return;
    }
    const requestId = ++lastRequest;
    refreshButton.disabled = true;
    setListMessage(list, '축하 메시지를 불러오는 중입니다.');
    try {
      const { data, error } = await instance
        .from(TABLE)
        .select('name,message,created_at')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;
      if (!list.isConnected || requestId !== lastRequest) return;
      renderRows(list, data);
    } catch (err) {
      console.error('Guestbook read error:', err);
      if (list.isConnected && requestId === lastRequest) {
        setListMessage(list, '방명록을 불러오지 못했습니다. 새로고침을 눌러 다시 시도해 주세요.');
      }
    } finally {
      if (refreshButton.isConnected) refreshButton.disabled = false;
    }
  }

  async function submit(form) {
    if (isSaving) return;
    const section = form.closest('.guestbook-section');
    if (!section) return;
    const status = form.querySelector('.guestbook-form-status');
    const button = form.querySelector('.guestbook-submit');
    const name = form.elements.namedItem('name').value.trim();
    const message = form.elements.namedItem('message').value.trim();
    const honey = form.elements.namedItem('homepage').value;

    if (honey) {
      status.textContent = '메시지가 접수되었습니다.';
      return;
    }
    if (name.length < 1 || name.length > MAX_NAME ||
        message.length < 2 || message.length > MAX_MESSAGE) {
      status.textContent = '이름은 1~20자, 메시지는 2~300자로 입력해 주세요.';
      return;
    }
    const instance = await getClient();
    if (!instance) {
      status.textContent = '아직 Supabase 연결 설정이 완료되지 않았습니다.';
      return;
    }

    isSaving = true;
    button.disabled = true;
    button.textContent = '등록하는 중…';
    status.textContent = '';
    try {
      // No .select(): unapproved submitted rows must not be publicly readable.
      
      const { error } = await instance
        .from(TABLE)
        .insert({ name, message });
      if (error) throw error;
      if (form.isConnected) {
        form.reset();
        status.textContent =
          '축하 메시지가 등록되었습니다!';
        // 저장 직후 방명록 목록 갱신
        await refresh(section);
      }

    } catch (err) {
      console.error('Guestbook insert error:', err);
      if (status.isConnected) status.textContent = '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.';
    } finally {
      isSaving = false;
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = '메시지 남기기';
      }
    }
  }

  function mount() {
    const page = document.getElementById(PAGE_ID);
    const content = page?.querySelector('.page-inner.page-guestbook .guestbook-mount');
    if (!content || content.querySelector('.guestbook-section')) return;
    content.innerHTML = guestbookMarkup;
    const section = content.querySelector('.guestbook-section');
    refresh(section);
  }

  // The existing book app re-creates rightPage on every page turn.
  // Observe only its direct children, so app.js does not need to be edited.
  const rightPage = document.getElementById(PAGE_ID);
  if (rightPage) {
    new MutationObserver(mount).observe(rightPage, { childList: true });
    mount(); // Also works if opening a direct #/chapter/guestbook link.
  }
  document.addEventListener('submit', event => {
    if (!(event.target instanceof HTMLFormElement) || event.target.id !== 'guestbookForm') return;
    event.preventDefault();
    submit(event.target);
  });
  document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('.guestbook-refresh') : null;
    if (!button) return;
    const section = button.closest('.guestbook-section');
    if (section) refresh(section);
  });
})();
