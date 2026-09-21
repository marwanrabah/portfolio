# Marawan Rabah portfolio

This is a static website, so it can be hosted directly on GitHub Pages.

## Add or change media

1. Put the file in the matching folder:
   - `media/hero/` — banner and profile photo
   - `media/work/` — landscape portfolio videos
   - `media/reels/` — vertical videos
   - `media/projects/` — project images
   - `media/testimonials/` — testimonial screenshots
2. Open `content/content.js`.
3. Add the exact path as an item in the relevant section.
4. Commit and push to GitHub.

The `sections` array is the master order for the page. Move a whole section
object up or down to change section order. Move media objects inside `items`
to change media order. Set `enabled: false` to hide a section.

Use exact paths relative to the repository root, such as:

```js
{ src: 'media/work/video7.mp4', title: 'New work video' }
```

For a new project, add an item like:

```js
{ title: 'New project', images: ['media/projects/new-project-1.jpg', 'media/projects/new-project-2.jpg'] }
```

The project images should be placed in `media/projects/`, and their full paths
should be written in `content/content.js`.

Supported section types are `videos`, `youtube`, `vimeo`, and `projects`.

If a public video cannot be downloaded locally, it can still be added as an
embedded YouTube/Vimeo item. Instagram items can be added as external links
when Instagram requires login to download the media.

## Ads

The Ads section uses Vimeo IDs. Add or remove IDs in `content/content.js`.

## Playback behavior

The site starts local video previews muted, autoplaying at most one visible
card. Offscreen videos do not load at startup. Reduced-motion and data-saving
preferences disable previews, and autoplay never interrupts a manually played
video. Visitors can enable sound from a local video card or the focused viewer;
that choice is remembered when browser storage is available.

YouTube and Vimeo load on demand and use their own playback, seek, sound and
fullscreen controls. The focused viewer also includes a link to the original
video if the provider blocks embedding. Closing the viewer removes its player
and stops playback. Switching away from the page pauses local videos and
unloads embedded players; embedded playback can be restarted with Try again.

Use the expand button for a video or full-size project image. The viewer has
previous/next buttons, left/right keyboard navigation outside native player
controls, Escape to close, and browser-back support. Image galleries also
support horizontal swipes. Local videos retain their position when opening
and closing the viewer. Horizontal video rows support touch scrolling, mouse
dragging and arrow buttons without capturing normal vertical page scrolling.

Playback settings live at the top of `content/content.js`:

```js
playback: {
  autoplay: true,
  rememberSound: true,
  pauseOffscreen: true,
  viewerEnabled: true,
}
```

## Local preview

Because browsers restrict some media behavior when opening HTML directly,
preview with any simple static server, for example:

```bash
python3 -m http.server
```

Then open `http://localhost:8000`.

## Regression tests

The site remains a static site; Node.js is only needed for development tests.
With Node.js 18 or later:

```bash
npm ci
npx playwright install chromium webkit
npm test
```

Tests start their own local server with media byte-range support and run in
Chromium and WebKit. They cover actual local playback, storage restrictions,
offscreen autoplay, keyboard controls, seeking, failure/retry, embedded-player
cleanup, gallery navigation, drag/scroll behavior and 320–1440px layouts.
External providers are stubbed in the repeatable suite; verify live Vimeo and
YouTube playback separately when changing embed integration.
