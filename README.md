# 🏆 Chasers Designated Drivers - Luxury Website

A premium designated driver website built with Astro, React, and Tailwind CSS, featuring luxury video backgrounds and sophisticated design.

## 🌟 Features

- **Video Hero Carousel**: Auto-rotating luxury vehicle videos
- **Responsive Design**: Mobile-optimized with touch-friendly interface
- **Luxury Aesthetic**: Gold accent colors (#c69214) inspired by WorldClass.com
- **Performance Optimized**: Multiple video quality levels for different devices
- **Professional Navigation**: Dual-header with contact information
- **SEO Ready**: Optimized meta tags and semantic structure

## 🚀 Tech Stack

- **Framework**: [Astro](https://astro.build/) with React integration
- **Styling**: Tailwind CSS with custom luxury design system
- **Components**: React components with TypeScript
- **Videos**: FFmpeg-optimized for web delivery
- **Deployment**: Ready for Vercel/Netlify

## 📁 Project Structure

```
├── docs/                   # Design system documentation
├── public/
│   ├── images/            # Poster images and assets
│   └── videos/            # Video files (local only)
├── src/
│   ├── components/        # React components
│   ├── layouts/           # Astro layouts
│   ├── pages/             # Website pages
│   └── styles/            # Global CSS
├── optimize-videos.sh     # Video optimization script
└── VIDEO-OPTIMIZATION.md  # Video setup guide
```

## 🎬 Video Setup

The website uses optimized video backgrounds. To set up videos:

1. **Install FFmpeg**: `brew install ffmpeg` (macOS)
2. **Add Videos**: Place your MP4 files in `public/videos/`
3. **Run Optimization**: `./optimize-videos.sh`
4. **Update Paths**: Videos are automatically configured

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📱 Video Quality Levels

- **High Quality (Desktop)**: 1080p, ~5-9MB per video
- **Medium Quality (Tablet)**: 720p, ~3-5MB per video  
- **Low Quality (Mobile)**: 480p, ~1-2MB per video

## 🎨 Design System

See `docs/design-system.md` for complete design specifications including:

- Color palette and brand guidelines
- Typography scale and font usage
- Component specifications
- Animation and transition guidelines
- Responsive breakpoints

## 🚀 Deployment

Ready for deployment to:

- **Vercel**: Connect GitHub repository
- **Netlify**: Drag & drop build folder
- **Custom Hosting**: Build with `npm run build`

## 📄 License

Private repository for Chasers Designated Drivers LLC.

---

Built with ❤️ using [Claude Code](https://claude.ai/code)