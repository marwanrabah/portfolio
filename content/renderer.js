/* The page renderer. Edit content/content.js instead of this file. */
const CONTENT = window.SITE_CONTENT;
const sectionsRoot = document.getElementById('sectionsRoot');

document.querySelector('.hero-name').textContent = CONTENT.hero.name;
document.querySelector('.hero-title').textContent = CONTENT.hero.role;
document.querySelector('.profile-ring img').src = CONTENT.hero.profile;
document.querySelector('.contact a[href^="https://wa.me"]').href = CONTENT.contact.whatsapp;
document.querySelector('.contact a[href^="mailto:"]').href = CONTENT.contact.email;

const heroSection = document.getElementById('heroSection');
const bannerTest = new Image();
bannerTest.onload = () => { heroSection.style.backgroundImage = `url('${CONTENT.hero.banner}')`; };
bannerTest.onerror = () => {
  const firstProject = CONTENT.sections.find(section => section.type === 'projects' && section.items.length);
  if (firstProject) heroSection.style.backgroundImage = `url('${firstProject.items[0].images[0]}')`;
};
bannerTest.src = CONTENT.hero.banner;

function mutedIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
  </svg>`;
}

function unmutedIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
  </svg>`;
}

function addDragToScroll(wrap) {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  wrap.addEventListener('mousedown', event => {
    isDown = true;
    wrap.classList.add('dragging');
    startX = event.pageX - wrap.offsetLeft;
    scrollLeft = wrap.scrollLeft;
  });
  wrap.addEventListener('mouseleave', () => { isDown = false; wrap.classList.remove('dragging'); });
  wrap.addEventListener('mouseup', () => { isDown = false; wrap.classList.remove('dragging'); });
  wrap.addEventListener('mousemove', event => {
    if (!isDown) return;
    event.preventDefault();
    wrap.scrollLeft = scrollLeft - (event.pageX - wrap.offsetLeft - startX) * 1.4;
  });
}

function createShell(section) {
  const label = document.createElement('div');
  label.className = 'section-label';
  label.textContent = section.title;
  sectionsRoot.appendChild(label);

  if (section.type === 'projects') {
    const grid = document.createElement('div');
    grid.className = 'projects-grid';
    sectionsRoot.appendChild(grid);
    return { content: grid };
  }

  const wrap = document.createElement('div');
  wrap.className = 'video-scroll-wrap';
  const track = document.createElement('div');
  track.className = 'video-track';
  wrap.appendChild(track);
  sectionsRoot.appendChild(wrap);
  addDragToScroll(wrap);
  return { content: track };
}

function renderVideos(items, track, isReels) {
  if (items.length === 0) {
    for (let i = 0; i < 4; i += 1) {
      const emptyCard = document.createElement('div');
      emptyCard.className = `video-card${isReels ? ' reel-card' : ''}`;
      emptyCard.style.cssText = 'display:flex;align-items:center;justify-content:center;';
      emptyCard.innerHTML = `<span style="font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.3em;color:#1e1e1e;text-transform:uppercase;">Video ${i + 1}</span>`;
      track.appendChild(emptyCard);
    }
    return;
  }

  items.forEach(item => {
    if (item.embed === 'vimeo') {
      renderVimeo([item], track);
      return;
    }
    if (item.embed === 'youtube') {
      renderYoutube([item], track);
      return;
    }
    if (item.external) {
      const linkCard = document.createElement('a');
      linkCard.className = `video-card${isReels ? ' reel-card' : ''}`;
      linkCard.href = item.external;
      linkCard.target = '_blank';
      linkCard.rel = 'noopener';
      linkCard.style.cssText = 'display:flex;align-items:center;justify-content:center;color:#aaa;text-decoration:none;font-size:11px;letter-spacing:.12em;text-transform:uppercase;';
      linkCard.textContent = `${item.title || 'Open media'} ↗`;
      track.appendChild(linkCard);
      return;
    }
    const card = document.createElement('div');
    card.className = `video-card${isReels ? ' reel-card' : ''}`;
    card.title = item.title || '';
    const video = document.createElement('video');
    video.src = item.src;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    const overlay = document.createElement('div');
    overlay.className = 'mute-overlay';
    overlay.innerHTML = mutedIcon();
    card.append(video, overlay);
    card.addEventListener('click', () => {
      video.muted = !video.muted;
      overlay.innerHTML = video.muted ? mutedIcon() : unmutedIcon();
    });
    track.appendChild(card);
  });
}

function renderYoutube(items, track) {
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.title = item.title || '';
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&mute=1&loop=1&playlist=${item.id}`;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    card.appendChild(iframe);
    track.appendChild(card);
  });
}

function renderVimeo(items, track) {
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.title = item.title || '';
    const iframe = document.createElement('iframe');
    iframe.src = `https://player.vimeo.com/video/${item.id}?autoplay=1&muted=1&loop=1&background=1`;
    iframe.allow = 'autoplay; fullscreen';
    const muteButton = document.createElement('div');
    muteButton.className = 'mute-overlay';
    muteButton.innerHTML = mutedIcon();
    card.append(iframe, muteButton);
    let muted = true;
    const player = new Vimeo.Player(iframe);
    card.addEventListener('click', () => {
      muted = !muted;
      player.setMuted(muted);
      muteButton.innerHTML = muted ? mutedIcon() : unmutedIcon();
    });
    card.addEventListener('mouseenter', () => { muteButton.style.opacity = '1'; });
    card.addEventListener('mouseleave', () => { muteButton.style.opacity = '0.5'; });
    track.appendChild(card);
  });
}

function renderProjects(projects, grid) {
  projects.forEach(project => {
    const wrapper = document.createElement('div');
    if (!project.images.length && project.external) {
      const link = document.createElement('a');
      link.className = 'project-card';
      link.href = project.external;
      link.target = '_blank';
      link.rel = 'noopener';
      link.style.cssText = 'display:flex;align-items:center;justify-content:center;color:#aaa;text-decoration:none;font-size:11px;letter-spacing:.12em;text-transform:uppercase;';
      link.textContent = `${project.title || 'Open project'} ↗`;
      wrapper.appendChild(link);
      grid.appendChild(wrapper);
      return;
    }
    const card = document.createElement('div');
    card.className = 'project-card';
    let current = 0;
    const image = document.createElement('img');
    image.alt = project.title || 'Project';
    const counter = document.createElement('div');
    counter.className = 'carousel-counter';
    const nav = document.createElement('div');
    nav.className = 'carousel-nav';

    const update = () => {
      image.style.opacity = '0';
      setTimeout(() => {
        image.src = project.images[current];
        image.style.opacity = '1';
      }, 180);
      counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(project.images.length).padStart(2, '0')}`;
    };
    const move = direction => {
      current = (current + direction + project.images.length) % project.images.length;
      update();
    };
    const prev = document.createElement('button');
    prev.className = 'carousel-btn';
    prev.innerHTML = '&#8592;';
    prev.addEventListener('click', event => { event.stopPropagation(); move(-1); });
    const next = document.createElement('button');
    next.className = 'carousel-btn';
    next.innerHTML = '&#8594;';
    next.addEventListener('click', event => { event.stopPropagation(); move(1); });
    nav.append(prev, next);
    update();
    card.appendChild(image);
    if (project.images.length > 1) card.append(nav, counter);
    wrapper.appendChild(card);
    if (project.title) {
      const title = document.createElement('div');
      title.className = 'project-title-bar';
      title.textContent = project.title;
      wrapper.appendChild(title);
    }
    grid.appendChild(wrapper);
  });
}

CONTENT.sections.filter(section => section.enabled).forEach(section => {
  const shell = createShell(section);
  if (section.type === 'videos') renderVideos(section.items, shell.content, section.layout === 'reels');
  if (section.type === 'vimeo') renderVimeo(section.items, shell.content);
  if (section.type === 'youtube') renderYoutube(section.items, shell.content);
  if (section.type === 'projects') renderProjects(section.items, shell.content);
});
