/* Runtime renderer. Content remains editable in content/content.js. */
const CONTENT = window.SITE_CONTENT;
const SETTINGS = {
  autoplay: true,
  rememberSound: true,
  pauseOffscreen: true,
  viewerEnabled: true,
  ...(CONTENT.playback || {}),
};

const sectionsRoot = document.getElementById('sectionsRoot');
const viewer = document.getElementById('mediaViewer');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const saveData = Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || ''));
const mediaRecords = [];
const sectionRecords = new Map();
const soundStorageKey = 'portfolio:sound-preference';
let soundPreference = SETTINGS.rememberSound
  ? (localStorage.getItem(soundStorageKey) || 'muted')
  : 'muted';
let activeRecord = null;
let viewerRecord = null;
let viewerIndex = 0;
let viewerHistoryState = false;
let viewerMedia = null;
let viewerPlay = null;
let viewerSound = null;
let viewerTitle = null;
let viewerCounter = null;
let viewerMuted = false;

const emit = (name, detail = {}) => {
  window.dispatchEvent(new CustomEvent(`portfolio:${name}`, { detail }));
};

const icon = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="8,5 19,12 8,19"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>',
  expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/></svg>',
};

function localPosterPath(src) {
  const filename = src.split('/').pop().replace(/\.[^.]+$/, '');
  return `media/posters/${filename}.jpg`;
}

function shouldAnimate() { return !prefersReducedMotion.matches; }

function setSoundPreference(value) {
  soundPreference = value;
  if (SETTINGS.rememberSound) localStorage.setItem(soundStorageKey, value);
  document.documentElement.dataset.sound = value;
  emit('sound-change', { value });
}

function updateSoundButton(button, muted) {
  if (!button) return;
  button.innerHTML = muted ? icon.mute : icon.sound;
  button.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
  button.setAttribute('aria-pressed', String(!muted));
  button.dataset.label = muted ? 'Muted' : 'Sound on';
  button.title = muted ? 'Turn sound on' : 'Turn sound off';
}

function showPlaybackFeedback(card, playing) {
  const feedback = card?.querySelector('.play-feedback');
  if (!feedback) return;
  feedback.innerHTML = playing ? icon.pause : icon.play;
  feedback.classList.remove('is-visible');
  void feedback.offsetWidth;
  feedback.classList.add('is-visible');
  clearTimeout(feedback._timer);
  feedback._timer = window.setTimeout(() => feedback.classList.remove('is-visible'), 720);
}

function safePlay(media) {
  const result = media?.play?.();
  return result && typeof result.catch === 'function' ? result.catch(() => false) : Promise.resolve(true);
}

function getPoster(item) {
  if (item.poster) return item.poster;
  if (item.src) return localPosterPath(item.src);
  if (item.embed === 'youtube') return `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
  if (item.embed === 'vimeo') return `https://vumbnail.com/${item.id}.jpg`;
  return '';
}

function createButton(className, label, content) {
  const button = document.createElement('button');
  button.className = className;
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.innerHTML = content;
  return button;
}

function setLoading(card, loading) {
  card.classList.toggle('is-loading', loading);
  card.setAttribute('aria-busy', String(loading));
}

function stopRecord(record, reset = false, feedback = false) {
  if (!record) return;
  record.stop?.(reset);
  if (feedback) showPlaybackFeedback(record.card, false);
  if (record === activeRecord) {
    activeRecord = null;
    emit('media-stop', { title: record.item.title, section: record.section.id });
  }
}

function stopOtherMedia(record) {
  mediaRecords.forEach(other => {
    if (other !== record && other.isPlaying?.()) stopRecord(other);
  });
}

function activateRecord(record, { autoplay = false, feedback = false } = {}) {
  if (!record) return;
  if (viewer?.open) return;
  stopOtherMedia(record);
  activeRecord = record;
  record.load?.();
  const muted = autoplay ? true : soundPreference !== 'unmuted';
  record.setMuted?.(muted);
  record.play?.({ muted, feedback });
  emit('media-start', { title: record.item.title, section: record.section.id, autoplay });
}

function toggleRecordSound(record) {
  if (!record) return;
  stopOtherMedia(record);
  activeRecord = record;
  record.load?.();
  const nextMuted = !record.isMuted();
  record.setMuted(nextMuted);
  setSoundPreference(nextMuted ? 'muted' : 'unmuted');
  if (record.isPlaying()) record.play({ muted: nextMuted });
}

function createLocalRecord(item, section, isReel, track) {
  const card = document.createElement('article');
  card.className = `video-card${isReel ? ' reel-card' : ''}`;
  card.tabIndex = 0;
  card.setAttribute('aria-label', item.title || 'Video');
  const video = document.createElement('video');
  video.poster = getPoster(item);
  video.preload = 'none';
  video.playsInline = true;
  video.loop = item.loop !== false;
  video.muted = true;
  if (item.fit === 'contain') video.classList.add('contain-video');
  const controls = document.createElement('div');
  controls.className = 'media-controls';
  const soundButton = createButton('media-sound', 'Turn sound on', icon.mute);
  const expandButton = createButton('media-expand', 'Open in focused viewer', icon.expand);
  const progress = document.createElement('input');
  progress.className = 'media-progress';
  progress.type = 'range';
  progress.min = '0';
  progress.max = '100';
  progress.step = '0.1';
  progress.value = '0';
  progress.setAttribute('aria-label', `Seek ${item.title || 'video'}`);
  progress.title = 'Seek video';
  updateSoundButton(soundButton, true);
  const feedback = document.createElement('div');
  feedback.className = 'play-feedback';
  feedback.setAttribute('aria-hidden', 'true');
  expandButton.dataset.label = 'Open';
  expandButton.title = 'Open media viewer';
  controls.append(soundButton, expandButton);
  const error = document.createElement('div');
  error.className = 'media-error';
  error.textContent = 'Media unavailable · tap to retry';
  error.hidden = true;
  card.append(video, progress, feedback, controls, error);
  track.appendChild(card);
  let playToken = 0;

  const record = {
    item, section, card, video, soundButton, expandButton, progress,
    load() {
      if (!video.src) {
        video.src = item.src;
        video.preload = 'metadata';
      }
      error.hidden = true;
    },
    play({ muted = true, feedback: showFeedback = false } = {}) {
      const request = ++playToken;
      video.muted = muted;
      setLoading(card, true);
      if (showFeedback) showPlaybackFeedback(card, true);
      safePlay(video).then(ok => {
        if (request !== playToken) return;
        if (!ok) {
          setLoading(card, false);
          card.classList.remove('is-playing');
        }
      });
    },
    stop(reset = false) {
      playToken += 1;
      video.pause();
      setLoading(card, false);
      if (reset) video.currentTime = 0;
      card.classList.remove('is-playing');
    },
    setMuted(muted) { video.muted = muted; updateSoundButton(soundButton, muted); },
    isMuted: () => video.muted,
    isPlaying: () => !video.paused || card.classList.contains('is-loading'),
  };

  soundButton.addEventListener('click', event => { event.stopPropagation(); toggleRecordSound(record); });
  expandButton.addEventListener('click', event => { event.stopPropagation(); openViewer(record); });
  progress.addEventListener('pointerdown', event => event.stopPropagation());
  progress.addEventListener('click', event => event.stopPropagation());
  progress.addEventListener('input', event => {
    event.stopPropagation();
    if (Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = (Number(event.target.value) / 100) * video.duration;
    }
  });
  card.addEventListener('click', () => {
    if (record.isPlaying()) stopRecord(record, false, true);
    else activateRecord(record, { feedback: true });
  });
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (record.isPlaying()) stopRecord(record, false, true);
      else activateRecord(record, { feedback: true });
    }
  });
  video.addEventListener('play', () => {
    stopOtherMedia(record);
    activeRecord = record;
    card.classList.add('is-playing');
  });
  video.addEventListener('pause', () => { card.classList.remove('is-playing'); });
  video.addEventListener('playing', () => setLoading(card, false));
  video.addEventListener('waiting', () => setLoading(card, true));
  video.addEventListener('canplay', () => { if (!video.paused) setLoading(card, false); });
  video.addEventListener('loadedmetadata', () => { progress.disabled = !Number.isFinite(video.duration); });
  video.addEventListener('timeupdate', () => {
    if (Number.isFinite(video.duration) && video.duration > 0 && document.activeElement !== progress) {
      progress.value = String((video.currentTime / video.duration) * 100);
    }
  });
  video.addEventListener('ended', () => stopRecord(record, true));
  video.addEventListener('error', () => { setLoading(card, false); error.hidden = false; });
  mediaRecords.push(record);
  return record;
}

function createRemoteRecord(item, section, isReel, track) {
  const card = document.createElement('article');
  card.className = `video-card${isReel ? ' reel-card' : ''}`;
  card.tabIndex = 0;
  card.setAttribute('aria-label', item.title || 'Video');
  const poster = document.createElement('img');
  poster.className = 'video-poster';
  poster.src = getPoster(item);
  poster.alt = item.title || 'Video thumbnail';
  poster.loading = 'lazy';
  const controls = document.createElement('div');
  controls.className = 'media-controls';
  const soundButton = createButton('media-sound', 'Turn sound on', icon.mute);
  const expandButton = createButton('media-expand', 'Open in focused viewer', icon.expand);
  updateSoundButton(soundButton, true);
  const feedback = document.createElement('div');
  feedback.className = 'play-feedback';
  feedback.setAttribute('aria-hidden', 'true');
  expandButton.dataset.label = 'Open';
  expandButton.title = 'Open media viewer';
  controls.append(soundButton, expandButton);
  const error = document.createElement('div');
  error.className = 'media-error';
  error.textContent = 'Media unavailable · tap to retry';
  error.hidden = true;
  card.append(poster, feedback, controls, error);
  track.appendChild(card);
  let iframe = null;
  let player = null;
  let playing = false;
  let muted = true;
  let playToken = 0;
  let loadingTimer = null;

  const clearRemoteLoading = request => {
    if (request !== playToken) return;
    clearTimeout(loadingTimer);
    setLoading(card, false);
  };

  const record = {
    item, section, card, soundButton, expandButton,
    load() {},
    async play({ muted: nextMuted = true, feedback: showFeedback = false } = {}) {
      const request = ++playToken;
      muted = nextMuted;
      error.hidden = true;
      setLoading(card, true);
      if (showFeedback) showPlaybackFeedback(card, true);
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.loading = 'eager';
        iframe.title = item.title || 'Video';
        iframe.style.pointerEvents = 'none';
        iframe.src = item.embed === 'youtube'
          ? `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${item.id}`
          : `https://player.vimeo.com/video/${item.id}?autoplay=1&muted=${muted ? 1 : 0}&loop=1&background=1`;
        card.insertBefore(iframe, controls);
        iframe.addEventListener('load', () => clearRemoteLoading(request), { once: true });
        loadingTimer = window.setTimeout(() => clearRemoteLoading(request), 8000);
        poster.hidden = true;
        if (item.embed === 'vimeo' && window.Vimeo?.Player) {
          try {
            player = new window.Vimeo.Player(iframe);
            player.on('ended', () => record.stop());
            await player.ready();
            await player.setMuted(muted);
            await player.play();
            clearRemoteLoading(request);
          } catch {
            player = null;
            playing = false;
            setLoading(card, false);
            error.hidden = false;
            return;
          }
        }
      } else if (player) {
        try {
          await player.setMuted(muted);
          await player.play();
        } catch {
          playing = false;
          setLoading(card, false);
          error.hidden = false;
          return;
        }
        clearRemoteLoading(request);
      }
      playing = true;
      card.classList.add('is-playing');
      updateSoundButton(soundButton, muted);
    },
    stop() {
      playToken += 1;
      clearTimeout(loadingTimer);
      setLoading(card, false);
      if (player) player.pause().catch(() => {});
      if (iframe) iframe.src = 'about:blank';
      iframe = null;
      player = null;
      playing = false;
      poster.hidden = false;
      error.hidden = true;
      card.classList.remove('is-playing');
      updateSoundButton(soundButton, true);
    },
    setMuted(nextMuted) {
      muted = nextMuted;
      if (player) player.setMuted(muted).catch(() => {});
      else if (iframe && item.embed === 'youtube' && playing) {
        iframe.src = `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${item.id}`;
      }
      updateSoundButton(soundButton, muted);
    },
    isMuted: () => muted,
    isPlaying: () => playing || card.classList.contains('is-loading'),
  };
  soundButton.addEventListener('click', event => { event.stopPropagation(); toggleRecordSound(record); });
  expandButton.addEventListener('click', event => { event.stopPropagation(); openViewer(record); });
  card.addEventListener('click', () => { if (record.isPlaying()) stopRecord(record, false, true); else activateRecord(record, { feedback: true }); });
  card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (record.isPlaying()) stopRecord(record, false, true); else activateRecord(record, { feedback: true }); } });
  mediaRecords.push(record);
  return record;
}

function renderMediaItem(item, section, isReel, track) {
  if (item.external) {
    const link = document.createElement('a');
    link.className = `video-card${isReel ? ' reel-card' : ''}`;
    link.href = item.external; link.target = '_blank'; link.rel = 'noopener';
    link.textContent = `${item.title || 'Open media'} ↗`;
    link.style.cssText = 'display:flex;align-items:center;justify-content:center;color:#aaa;text-decoration:none;font-size:11px;letter-spacing:.12em;text-transform:uppercase;';
    track.appendChild(link);
    return null;
  }
  if (item.src) return createLocalRecord(item, section, isReel, track);
  const embed = item.embed || (section.type === 'vimeo' ? 'vimeo' : '');
  if (embed === 'youtube' || embed === 'vimeo') return createRemoteRecord({ ...item, embed }, section, isReel, track);
  return null;
}

function addDragToScroll(wrap) {
  let pointerId = null;
  let startX = 0;
  let startScroll = 0;
  let moved = false;
  wrap.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') return;
    pointerId = event.pointerId; startX = event.clientX; startScroll = wrap.scrollLeft; moved = false;
    wrap.setPointerCapture?.(pointerId);
  });
  wrap.addEventListener('pointermove', event => {
    if (pointerId !== event.pointerId) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 4) moved = true;
    if (moved) { event.preventDefault(); wrap.classList.add('dragging'); wrap.scrollLeft = startScroll - delta; }
  });
  const release = event => { if (pointerId !== event.pointerId) return; pointerId = null; wrap.classList.remove('dragging'); };
  wrap.addEventListener('pointerup', release); wrap.addEventListener('pointercancel', release);
  wrap.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) { wrap.scrollLeft += event.deltaY; event.preventDefault(); }
  }, { passive: false });
}

function snapBestCard(wrap, records) {
  if (!records.length || prefersReducedMotion.matches) return;
  const center = wrap.scrollLeft + wrap.clientWidth / 2;
  const closest = records.reduce((best, record) => {
    const currentDistance = Math.abs(record.card.offsetLeft + record.card.offsetWidth / 2 - center);
    const bestDistance = Math.abs(best.card.offsetLeft + best.card.offsetWidth / 2 - center);
    return currentDistance < bestDistance ? record : best;
  }, records[0]);
  closest.card.scrollIntoView({ behavior: shouldAnimate() ? 'smooth' : 'auto', block: 'nearest', inline: 'center' });
}

function setupRail(wrap, records) {
  addDragToScroll(wrap);
  const recordByCard = new Map(records.map(record => [record.card, record]));
  const visible = new Map();
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const record = recordByCard.get(entry.target);
      if (!record) return;
      if (entry.isIntersecting) { visible.set(record, entry.intersectionRatio); record.load?.(); }
      else visible.delete(record);
    });
    const best = [...visible.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!best && SETTINGS.pauseOffscreen && activeRecord && recordByCard.has(activeRecord.card)) {
      stopRecord(activeRecord);
    }
    const canAutoplay = best && (best.item.src || best.item.autoplay === true);
    if (best && canAutoplay && SETTINGS.autoplay && !saveData && !prefersReducedMotion.matches) {
      clearTimeout(wrap._autoplayTimer);
      wrap._autoplayTimer = setTimeout(() => {
        if (activeRecord !== best) activateRecord(best, { autoplay: true });
      }, 140);
    }
  }, { root: wrap, rootMargin: '0px 55% 0px 55%', threshold: [0, 0.6, 0.85, 1] }) : null;
  records.forEach(record => observer?.observe(record.card));
  const settle = () => snapBestCard(wrap, records);
  if ('onscrollend' in window) wrap.addEventListener('scrollend', settle, { passive: true });
  else wrap.addEventListener('scroll', () => { clearTimeout(wrap._scrollTimer); wrap._scrollTimer = setTimeout(settle, 120); }, { passive: true });
}

function createShell(section) {
  const label = document.createElement('div');
  label.className = 'section-label section-reveal'; label.textContent = section.title; label.id = `${section.id}-label`;
  sectionsRoot.appendChild(label);
  if (section.type === 'projects') {
    const grid = document.createElement('div'); grid.className = 'projects-grid section-reveal'; sectionsRoot.appendChild(grid);
    return { content: grid };
  }
  const wrap = document.createElement('div'); wrap.className = 'video-scroll-wrap section-reveal'; wrap.setAttribute('aria-labelledby', label.id);
  const track = document.createElement('div'); track.className = 'video-track'; wrap.appendChild(track); sectionsRoot.appendChild(wrap);
  return { wrap, content: track };
}

function preloadImage(src) { if (src) { const image = new Image(); image.src = src; } }

function setViewerLoading(loading) {
  viewerMedia?.classList.toggle('is-loading', loading);
}

function setViewerPlayState(playing) {
  if (!viewerPlay) return;
  viewerPlay.innerHTML = playing ? icon.pause : icon.play;
  viewerPlay.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} media`);
}

function playViewerVideo(media, request) {
  if (!media || request !== viewerMedia?._request) return;
  setViewerLoading(true);
  const finish = () => {
    if (request !== viewerMedia?._request) return;
    setViewerLoading(false);
    setViewerPlayState(true);
  };
  media.addEventListener('playing', finish, { once: true });
  media.addEventListener('error', () => {
    if (request !== viewerMedia?._request) return;
    setViewerLoading(false);
    setViewerPlayState(false);
  }, { once: true });
  safePlay(media).then(ok => {
    if (ok || request !== viewerMedia?._request) return ok;
    // Sound autoplay can be blocked. Keep the viewer usable and let the user
    // turn sound on from the dedicated sound control.
    media.muted = true;
    viewerMedia._muted = true;
    updateSoundButton(viewerSound, true);
    return safePlay(media);
  }).then(ok => {
    if (!ok && request === viewerMedia?._request) {
      setViewerLoading(false);
      setViewerPlayState(false);
    }
  });
}

function renderProjects(projects, grid) {
  projects.forEach(project => {
    const wrapper = document.createElement('div');
    const card = document.createElement('article'); card.className = 'project-card'; card.tabIndex = 0;
    const image = document.createElement('img'); image.alt = project.title || 'Project'; image.loading = 'lazy'; image.decoding = 'async';
    const images = project.images || []; let current = 0; let updateToken = 0;
    const counter = document.createElement('div'); counter.className = 'carousel-counter'; counter.setAttribute('aria-live', 'polite');
    const nav = document.createElement('div'); nav.className = 'carousel-nav';
    const prev = createButton('carousel-btn', 'Previous image', '&#8592;'); const next = createButton('carousel-btn', 'Next image', '&#8594;'); nav.append(prev, next);
    const update = () => {
      if (!images.length) return;
      const token = ++updateToken;
      const src = typeof images[current] === 'string' ? images[current] : images[current].src;
      const following = images[(current + 1) % images.length];
      preloadImage(typeof following === 'string' ? following : following?.src);
      counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}`;
      counter.setAttribute('aria-label', `Image ${current + 1} of ${images.length}`);
      const apply = () => { if (token !== updateToken) return; image.src = src; image.alt = project.title ? `${project.title}, image ${current + 1}` : 'Project image'; image.style.opacity = '1'; };
      if (!image.src) apply(); else if (shouldAnimate()) { image.style.opacity = '0'; setTimeout(apply, 160); } else apply();
    };
    const move = direction => { if (!images.length) return; current = (current + direction + images.length) % images.length; update(); emit('project-image', { title: project.title, index: current }); };
    prev.addEventListener('click', event => { event.stopPropagation(); move(-1); }); next.addEventListener('click', event => { event.stopPropagation(); move(1); });
    card.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } });
    let startX = 0; let startY = 0;
    card.addEventListener('pointerdown', event => { startX = event.clientX; startY = event.clientY; });
    card.addEventListener('pointerup', event => { const dx = event.clientX - startX; const dy = event.clientY - startY; if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1); });
    update(); card.append(image); if (images.length > 1) card.append(nav, counter); wrapper.appendChild(card);
    if (project.title) { const title = document.createElement('div'); title.className = 'project-title-bar'; title.textContent = project.title; wrapper.appendChild(title); }
    grid.appendChild(wrapper);
  });
}

function renderSection(section) {
  const shell = createShell(section);
  if (section.type === 'projects') { renderProjects(section.items || [], shell.content); return; }
  const records = (section.items || []).map(item => renderMediaItem(item, section, section.layout === 'reels', shell.content)).filter(Boolean);
  sectionRecords.set(section.id, records); setupRail(shell.wrap, records);
}

function openViewer(record, index = null) {
  if (!SETTINGS.viewerEnabled || !viewer || !record) return;
  mediaRecords.forEach(other => stopRecord(other));
  viewerMuted = false;
  const records = sectionRecords.get(record.section.id) || [record];
  viewerRecord = record; viewerIndex = index === null ? records.indexOf(record) : index;
  if (!viewerHistoryState) { history.pushState({ portfolioViewer: true }, '', window.location.href); viewerHistoryState = true; }
  renderViewer(records); viewer.showModal(); document.body.classList.add('viewer-open');
  emit('viewer-open', { title: record.item.title, section: record.section.id });
}

function renderViewer(records) {
  const record = records[viewerIndex] || records[0]; if (!record) return; viewerRecord = record;
  mediaRecords.forEach(other => stopRecord(other));
  viewerMedia?._media?.pause?.();
  const request = (viewerMedia._request || 0) + 1;
  viewerMedia._request = request;
  setViewerLoading(true);
  viewerTitle.textContent = record.item.title || record.section.title;
  viewerCounter.textContent = `${String(viewerIndex + 1).padStart(2, '0')} / ${String(records.length).padStart(2, '0')}`;
  viewerMedia.replaceChildren();
  const item = record.item; let media;
  if (item.src) {
    media = document.createElement('video');
    media.src = item.src;
    media.poster = getPoster(item);
    media.preload = 'metadata';
    media.playsInline = true;
    media.loop = item.loop !== false;
    media.className = item.fit === 'contain' ? 'contain-video' : '';
  } else {
    media = document.createElement('iframe');
    media.allow = 'autoplay; fullscreen; picture-in-picture';
    media.allowFullscreen = true;
    media.loading = 'eager';
    media.title = item.title || 'Video';
    media.addEventListener('load', () => { if (request === viewerMedia._request) setViewerLoading(false); }, { once: true });
    window.setTimeout(() => { if (request === viewerMedia._request) setViewerLoading(false); }, 12000);
    media.src = item.embed === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&mute=${viewerMuted ? 1 : 0}&loop=1&playlist=${item.id}&playsinline=1`
      : `https://player.vimeo.com/video/${item.id}?autoplay=1&muted=${viewerMuted ? 1 : 0}&loop=1&background=1&playsinline=1`;
  }
  viewerMedia.appendChild(media);
  viewerMedia._media = media; viewerMedia._muted = viewerMuted; viewerMedia._playing = true;
  if (!localStorage.getItem('portfolio:viewer-hint-seen')) {
    const hint = document.createElement('div');
    hint.className = 'viewer-hint';
    hint.textContent = 'Swipe or scroll to browse';
    viewerMedia.appendChild(hint);
    window.setTimeout(() => hint.classList.add('is-hidden'), 2400);
    localStorage.setItem('portfolio:viewer-hint-seen', '1');
  }
  setViewerPlayState(true); updateSoundButton(viewerSound, viewerMedia._muted);
  if (item.src) {
    media.muted = viewerMedia._muted;
    media.addEventListener('pause', () => { if (request === viewerMedia._request) setViewerPlayState(false); });
    media.addEventListener('waiting', () => { if (request === viewerMedia._request) setViewerLoading(true); });
    playViewerVideo(media, request);
  }
  if (!saveData) {
    preloadImage(getPoster(records[(viewerIndex + 1) % records.length]?.item || {}));
    preloadImage(getPoster(records[(viewerIndex - 1 + records.length) % records.length]?.item || {}));
  }
}

function closeViewer(fromPopState = false) {
  if (!viewer?.open) return;
  viewerMedia?._media?.pause?.(); viewer.close(); document.body.classList.remove('viewer-open'); viewerRecord = null;
  if (viewerHistoryState && !fromPopState) { viewerHistoryState = false; history.back(); } else viewerHistoryState = false;
  emit('viewer-close');
}

function viewerMove(direction) {
  if (!viewerRecord) return; const records = sectionRecords.get(viewerRecord.section.id) || []; if (!records.length) return;
  viewerIndex = (viewerIndex + direction + records.length) % records.length; renderViewer(records);
}

function setupViewer() {
  if (!viewer) return;
  viewerTitle = document.getElementById('viewerTitle'); viewerCounter = document.getElementById('viewerCounter'); viewerMedia = document.getElementById('viewerMedia'); viewerPlay = document.getElementById('viewerPlay'); viewerSound = document.getElementById('viewerSound');
  document.getElementById('viewerClose')?.addEventListener('click', () => closeViewer());
  document.getElementById('viewerPrev')?.addEventListener('click', () => viewerMove(-1)); document.getElementById('viewerNext')?.addEventListener('click', () => viewerMove(1));
  viewerPlay?.addEventListener('click', () => {
    const media = viewerMedia._media;
    if (!media) return;
    if (media.tagName === 'VIDEO') {
      if (media.paused) { playViewerVideo(media, viewerMedia._request); }
      else { media.pause(); setViewerPlayState(false); }
      return;
    }
    if (viewerMedia._playing) {
      media.src = 'about:blank';
      viewerMedia._playing = false;
      viewerPlay.innerHTML = icon.play;
    } else if (viewerRecord) {
      const records = sectionRecords.get(viewerRecord.section.id) || [];
      renderViewer(records);
    }
  });
  viewerSound?.addEventListener('click', () => {
    const media = viewerMedia._media;
    const muted = !viewerMedia._muted;
    viewerMedia._muted = muted;
    viewerMuted = muted;
    setSoundPreference(muted ? 'muted' : 'unmuted');
    if (media?.tagName === 'VIDEO') {
      media.muted = muted;
      updateSoundButton(viewerSound, muted);
    } else if (viewerRecord) {
      const records = sectionRecords.get(viewerRecord.section.id) || [];
      renderViewer(records);
    }
  });
  viewer.addEventListener('click', event => { if (event.target === viewer) closeViewer(); }); viewer.addEventListener('cancel', event => { event.preventDefault(); closeViewer(); });
  let startX = 0;
  viewerMedia.addEventListener('pointerdown', event => { startX = event.clientX; });
  viewerMedia.addEventListener('pointerup', event => { const delta = event.clientX - startX; if (Math.abs(delta) > 50) viewerMove(delta < 0 ? 1 : -1); });
  viewerMedia.addEventListener('wheel', event => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 12) return;
    event.preventDefault();
    viewerMove(delta > 0 ? 1 : -1);
  }, { passive: false });
  window.addEventListener('popstate', () => { if (viewer.open) closeViewer(true); });
}

function setupSectionReveals() {
  const targets = document.querySelectorAll('.section-reveal');
  if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) { targets.forEach(target => target.classList.add('is-visible')); return; }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) return; entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }), { threshold: 0.08 });
  targets.forEach(target => observer.observe(target));
}

document.querySelector('.hero-name').textContent = CONTENT.hero.name;
document.querySelector('.hero-title').textContent = CONTENT.hero.role;
document.querySelector('.profile-ring img').src = CONTENT.hero.profile;
document.querySelector('.contact a[href^="https://wa.me"]').href = CONTENT.contact.whatsapp;
document.querySelector('.contact a[href^="mailto:"]').href = CONTENT.contact.email;
document.querySelector('.end-cta a[href^="https://wa.me"]')?.setAttribute('href', CONTENT.contact.whatsapp);
document.querySelector('.end-cta a[href^="mailto:"]')?.setAttribute('href', CONTENT.contact.email);
document.documentElement.dataset.sound = soundPreference;
const heroSection = document.getElementById('heroSection'); const bannerTest = new Image();
bannerTest.onload = () => { heroSection.style.backgroundImage = `url('${CONTENT.hero.banner}')`; };
bannerTest.onerror = () => { const firstProject = CONTENT.sections.find(section => section.type === 'projects' && section.items.length); if (firstProject) heroSection.style.backgroundImage = `url('${firstProject.items[0].images[0]}')`; };
bannerTest.src = CONTENT.hero.banner;
setupViewer(); (CONTENT.sections || []).filter(section => section.enabled).forEach(renderSection); setupSectionReveals();
document.addEventListener('visibilitychange', () => { if (document.hidden && activeRecord) stopRecord(activeRecord); });
window.addEventListener('beforeunload', () => mediaRecords.forEach(record => record.stop?.()));
