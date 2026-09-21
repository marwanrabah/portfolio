/* =====================================================================
   PORTFOLIO EDITOR — this is the only file most people need to edit

   SIMPLE RULES
   1. Upload your file to the correct media folder first.
   2. Add its exact path between quotes, for example:
      'media/work/my-new-video.mp4'
   3. To change the order, move an item up or down.
   4. To hide a section, change enabled: true to enabled: false.
   5. Keep the commas and brackets exactly as they are.

   You do not need to edit index.html or content/renderer.js.
   ===================================================================== */
window.SITE_CONTENT = {
  playback: {
    autoplay: true,
    rememberSound: true,
    pauseOffscreen: true,
    viewerEnabled: true,
  },
  hero: {
    banner: 'media/hero/banner.jpg',
    profile: 'media/hero/profile.jpg',
    name: 'Marawan Rabah',
    role: 'Director · AD · Camera Operator',
  },
  contact: {
    // Change these only if your contact details change.
    whatsapp: 'https://wa.me/201062471283',
    email: 'mailto:marwanrabah110@gmail.com',
  },
  // Sections show on the website in this exact order.
  sections: [
    {
      // WORK VIDEOS — landscape videos in media/work/
      id: 'work', title: 'Work', type: 'videos', enabled: true,
      items: [
        { embed: 'vimeo', id: '1219228625', title: 'Commercial work' },
        { src: 'media/work/work-instagram-DbGvmKbIYNr.mp4', title: 'Instagram campaign', fit: 'contain' },
        { src: 'media/work/video6.mp4', title: 'Work edit 01' },
        { src: 'media/work/video1.mp4', title: 'Work edit 02' },
        { src: 'media/work/video2.mp4', title: 'Work edit 03' },
        { src: 'media/work/video3.mp4', title: 'Work edit 04' },
        { src: 'media/work/video4.mp4', title: 'Work edit 05' },
        { src: 'media/work/video5.mp4', title: 'Work edit 06' },
        { src: 'media/reels/klZoxaOZhaU.mp4', title: 'Vertical edit 01' },
        { src: 'media/reels/L6TfvP04u1g.mp4', title: 'Vertical edit 02' },
      ],
    },
    {
      // ADS — Vimeo video numbers. vimeo.com/1158169500 → 1158169500
      id: 'ads', title: 'Ads', type: 'vimeo', enabled: true,
      items: [
        { id: '1158169500', title: 'Ad 1' },
        { id: '1155811571', title: 'Ad 2' },
        { id: '1155799860', title: 'Ad 3' },
        { id: '1109703930', title: 'Ad 4' },
        { id: '1109680225', title: 'Ad 5' },
        { id: '1079889929', title: 'Ad 6' },
        { id: '1228630827', title: 'Ad 7' },
      ],
    },
    {
      // MUSIC VIDEOS — downloaded locally into media/music-videos/
      id: 'music-videos', title: 'Music Videos', type: 'videos', enabled: true,
      items: [
        { src: 'media/music-videos/music-Zct20ON2u_A.mp4', title: 'Music film 01' },
        { src: 'media/music-videos/music-rgdSp5Jk4P0.mp4', title: 'Music film 02' },
        { src: 'media/music-videos/music-8_1dU9pnUNM.mp4', title: 'Music film 03' },
      ],
    },
    {
      // REELS — vertical videos in media/reels/
      id: 'reels', title: 'Reels', type: 'videos', layout: 'reels', enabled: true,
      items: [
        { src: 'media/reels/Ay-zXQJEMwg.mp4', title: 'Vertical edit 03' },
        { src: 'media/reels/N5ee7UZBs9E.mp4', title: 'Vertical edit 04' },
        { src: 'media/reels/XRS-mJe7aXM.mp4', title: 'Vertical edit 05' },
        { src: 'media/reels/XVfvGTBCNtM.mp4', title: 'Vertical edit 06' },
        { src: 'media/reels/b6xBVmn9Jek.mp4', title: 'Vertical edit 07' },
        { src: 'media/reels/mJMwnw6rWGg.mp4', title: 'Vertical edit 08' },
        { src: 'media/reels/s7C0h1_36n0.mp4', title: 'Vertical edit 09' },
        { src: 'media/reels/xiNh6f_ogVA.mp4', title: 'Vertical edit 10' },
      ],
    },
    {
      // PROJECTS — each project can contain one or more images.
      id: 'projects', title: 'Projects', type: 'projects', enabled: true,
      items: [
        {
          title: 'Project gallery 01',
          images: [
            'media/projects/11.jpg', 'media/projects/12.jpg', 'media/projects/13.jpg',
            'media/projects/14.jpg', 'media/projects/15.jpg', 'media/projects/16.jpg',
            'media/projects/17.jpg', 'media/projects/18.jpg', 'media/projects/19.jpg',
            'media/projects/310.jpg',
          ],
        },
        {
          title: 'Project gallery 02',
          images: [
            'media/projects/21.jpg', 'media/projects/22.jpg', 'media/projects/23.jpg',
            'media/projects/24.jpg', 'media/projects/25.jpg', 'media/projects/26.jpg',
            'media/projects/27.jpg', 'media/projects/28.jpg',
          ],
        },
        {
          title: 'Project gallery 03',
          images: [
            'media/projects/31.jpg', 'media/projects/32.jpg', 'media/projects/33.jpg',
            'media/projects/34.jpg', 'media/projects/35.jpg', 'media/projects/36.jpg',
            'media/projects/37.jpg', 'media/projects/38.jpg', 'media/projects/39.jpg',
          ],
        },
        {
          title: 'Project gallery 04',
          images: [
            'media/projects/optimized/igexport-DdHYJE_jJ_8.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-2.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-3.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-4.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-5.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-6.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-7.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-8.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-9.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-10.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-11.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-12.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-13.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-14.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-15.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-16.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-17.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-18.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-19.jpg',
            'media/projects/optimized/igexport-DdHYJE_jJ_8-20.jpg',
          ],
        },
      ],
    },
  ],
};

/* =====================================================================
   COPY-AND-PASTE EXAMPLES

   New landscape video — add inside a videos section's items list:
   { src: 'media/work/my-video.mp4', title: 'My new video' },

   New vertical reel — add inside the Reels items list:
   { src: 'media/reels/my-reel.mp4', title: 'My new reel' },

   New Vimeo ad — add inside the Ads items list:
   { id: '123456789', title: 'My new ad' },

   New project — add inside the Projects items list:
   {
     title: 'My new project',
     images: [
       'media/projects/my-project-1.jpg',
       'media/projects/my-project-2.jpg',
     ],
   },

   New section — copy one of the existing section blocks, then change:
   - title: the name visitors will see
   - type: videos, vimeo, or projects
   - items: the media inside that section
   ===================================================================== */
