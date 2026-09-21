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

The site starts media previews muted, autoplaying only the card closest to the
user inside a visible rail. Visitors can enable sound from a card or the
focused viewer; that choice is remembered locally. The viewer opens from the
expand control on a media card and supports swipe, keyboard, and browser-back
navigation.

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
