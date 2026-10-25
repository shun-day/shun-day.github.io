/* Wedding Invitation Background Music
 * Music file: ./music.mp3 next to index.html
 * Starts only on a user tap. Remains mounted while pages are turned.
 */
(() => {
  'use strict';

  function initMusicPlayer() {
    const book = document.getElementById('book');
    if (!book || document.getElementById('weddingMusicButton')) return;

    // Keep the media element outside the page container; page-turn animations
    // replace #rightPage contents, but never touch this element.
    const audio = document.createElement('audio');
    audio.id = 'weddingBackgroundMusic';
    audio.src = './Antifreeze.mp3';
    audio.preload = 'none';
    audio.loop = true;
    audio.volume = 0.55;
    audio.setAttribute('playsinline', '');
    document.body.appendChild(audio);

    const button = document.createElement('button');
    button.id = 'weddingMusicButton';
    button.type = 'button';
    button.className = 'wedding-music-button';
    book.appendChild(button);

    const notice = document.createElement('span');
    notice.className = 'wedding-music-notice';
    notice.hidden = true;
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    book.appendChild(notice);

    let busy = false;
    let hideNoticeTimer;

    function updateButton() {
      const playing = !audio.paused && !audio.ended;
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', playing ? '배경음악 끄기' : '배경음악 켜기');
      button.title = playing ? '배경음악 끄기' : '배경음악 켜기';
      button.textContent = playing ? '♫ 음악 끄기' : '♪ 음악 켜기';
      button.classList.toggle('is-playing', playing);
    }

    function showNotice(message) {
      notice.textContent = message;
      notice.hidden = false;
      window.clearTimeout(hideNoticeTimer);
      hideNoticeTimer = window.setTimeout(() => { notice.hidden = true; }, 4200);
    }

    button.addEventListener('click', async () => {
      if (busy) return;
      if (!audio.paused) {
        audio.pause();
        updateButton();
        return;
      }
      busy = true;
      button.disabled = true;
      try {
        // User gesture is required in iOS Safari and Kakao in-app browsers.
        await audio.play();
        updateButton();
      } catch (error) {
        console.warn('Wedding background music could not play:', error);
        showNotice('음원 파일(music.mp3) 또는 재생 권한을 확인해 주세요.');
        updateButton();
      } finally {
        busy = false;
        button.disabled = false;
      }
    });

    audio.addEventListener('play', updateButton);
    audio.addEventListener('pause', updateButton);
    audio.addEventListener('ended', updateButton);
    audio.addEventListener('error', () => {
      showNotice('music.mp3 파일을 찾거나 재생할 수 없습니다.');
      updateButton();
    });
    updateButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMusicPlayer, { once: true });
  } else {
    initMusicPlayer();
  }
})();
