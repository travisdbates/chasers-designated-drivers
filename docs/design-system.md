# 🎨 Chasers DD Design System

## Overview
Premier designated driver service inspired by WorldClass.com's sophisticated aesthetic. Dark, elegant design with gold accents and premium typography.

## Brand Positioning
- **Premier transportation service**
- **Professional, trustworthy**
- **Sophisticated nightlife companion**
- **Premium experience focus**

---

## 🎨 Color Palette

### Primary Colors
```css
--gold-primary: #c69214    /* Primary gold for CTAs and highlights */
--gold-light: #d4a629     /* Lighter gold for hover states */
--gold-dark: #a67c0f      /* Darker gold for pressed states */
```

### Dark Premier Theme
```css
--black-primary: #000000   /* Pure black backgrounds */
--gray-900: #0f0f0f       /* Deep charcoal */
--gray-800: #1a1a1a       /* Dark surface */
--gray-700: #2d2d2d       /* Medium dark */
--gray-600: #404040       /* Border/subtle elements */
--gray-400: #a1a1a1       /* Secondary text */
--gray-300: #d1d1d1       /* Light text */
--white: #fdfbf4          /* Primary text/highlights - off-white */
```

### Accent Colors
```css
--red-accent: #dc2626     /* Error states */
--green-accent: #16a34a   /* Success states */
--blue-accent: #2563eb    /* Info states */
```

---

## 📝 Typography

### Font Families
```css
/* Primary: Elegant serif for headlines */
--font-primary: 'Playfair Display', 'Georgia', serif;

/* Secondary: Clean sans-serif for body text */
--font-secondary: 'Overpass', 'Inter', sans-serif;

/* Accent: Modern sans for UI elements */
--font-accent: 'Poppins', 'Arial', sans-serif;
```

### Typography Scale
```css
/* Headlines */
--text-6xl: 3.75rem;   /* 60px - Hero headlines */
--text-5xl: 3rem;      /* 48px - Page titles */
--text-4xl: 2.25rem;   /* 36px - Section titles */
--text-3xl: 1.875rem;  /* 30px - Subsection titles */

/* Body Text */
--text-xl: 1.25rem;    /* 20px - Large body text */
--text-lg: 1.125rem;   /* 18px - Standard body text */
--text-base: 1rem;     /* 16px - Default body text */
--text-sm: 0.875rem;   /* 14px - Small text */
--text-xs: 0.75rem;    /* 12px - Captions */
```

### Font Weights
```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

---

## 🎬 Video & Media Guidelines

### Video Hero Carousel
- **Aspect Ratio**: 16:9 for desktop, 9:16 for mobile
- **Quality**: 1080p minimum, 4K preferred
- **Duration**: 5-10 seconds per clip
- **Format**: MP4 (H.264), WebM fallback
- **Autoplay**: Muted by default
- **Overlay**: Dark gradient (0.4 opacity)

### Video Content Themes
1. **Premier Vehicles**: Interior/exterior shots, premium details
2. **Professional Drivers**: Suited drivers, professional demeanor
3. **Upscale Venues**: High-end restaurants, bars, events
4. **Client Experience**: Satisfied customers, premium service moments

### Photography Style
- **Dark, moody lighting**
- **High contrast**
- **Professional quality**
- **Premier automotive focus**
- **Urban nightlife settings**

---

## 🔲 Layout System

### Grid Structure
```css
/* Container Widths */
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;

/* Spacing Scale */
--space-xs: 0.25rem;    /* 4px */
--space-sm: 0.5rem;     /* 8px */
--space-md: 1rem;       /* 16px */
--space-lg: 1.5rem;     /* 24px */
--space-xl: 2rem;       /* 32px */
--space-2xl: 3rem;      /* 48px */
--space-3xl: 4rem;      /* 64px */
--space-4xl: 6rem;      /* 96px */
```

### Layout Patterns
- **Full-width hero sections**
- **Centered content containers**
- **Asymmetric grid layouts**
- **Overlapping elements**
- **Generous whitespace**

---

## 🎯 Component Specifications

### Buttons
```css
/* Primary CTA Button */
.btn-primary {
  background: var(--gold-primary);
  color: white;
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-primary:hover {
  background: var(--gold-light);
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(198, 146, 20, 0.3);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: var(--gold-primary);
  border: 2px solid var(--gold-primary);
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: var(--gold-primary);
  color: white;
}
```

### Navigation
```css
/* Dual Header Structure */
.nav-contact-bar {
  background: var(--gray-900);
  padding: 0.5rem 0;
  font-size: 0.875rem;
  border-bottom: 1px solid var(--gray-700);
}

.nav-main {
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 50;
}
```

### Cards
```css
.card-premier {
  background: var(--gray-800);
  border: 1px solid var(--gray-700);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
}

.card-premier:hover {
  transform: translateY(-5px);
  box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.7);
  border-color: var(--gold-primary);
}
```

---

## ✨ Animation & Transitions

### Timing Functions
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Common Animations
- **Fade in/out**: 0.3s ease
- **Scale transforms**: 0.2s ease-out
- **Slide transitions**: 0.4s ease-in-out
- **Hover effects**: 0.2s ease

### Video Carousel Transitions
- **Crossfade**: 1s ease-in-out
- **Slide**: 0.8s ease-in-out
- **Auto-advance**: 7s interval

---

## 📱 Responsive Breakpoints

```css
/* Mobile First Approach */
--bp-sm: 640px;   /* Small devices */
--bp-md: 768px;   /* Tablets */
--bp-lg: 1024px;  /* Laptops */
--bp-xl: 1280px;  /* Desktops */
--bp-2xl: 1536px; /* Large screens */
```

### Mobile Optimizations
- **Touch-friendly buttons** (44px minimum)
- **Simplified navigation**
- **Stacked layouts**
- **Larger text sizes**
- **Optimized video formats**

---

## 🎪 Implementation Notes

### Tailwind CSS Custom Classes
```css
/* Custom utility classes */
@layer utilities {
  .text-gold { color: var(--gold-primary); }
  .bg-gold { background-color: var(--gold-primary); }
  .border-gold { border-color: var(--gold-primary); }
  .premier-shadow { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
  .hero-gradient { background: linear-gradient(45deg, rgba(0,0,0,0.8), rgba(198,146,20,0.1)); }
}
```

### Performance Considerations
- **Lazy loading for videos**
- **Optimized image formats** (WebP, AVIF)
- **Preload critical fonts**
- **Minimize CSS bundle size**
- **Use CSS-in-JS sparingly**

---

## 🎭 Accessibility

### WCAG Guidelines
- **Color contrast ratio**: 4.5:1 minimum
- **Focus indicators**: Visible and high contrast
- **Alt text**: Descriptive for all images
- **Video controls**: Accessible playback controls
- **Keyboard navigation**: Full site accessibility

### Semantic HTML
- **Proper heading hierarchy**
- **Landmark roles**
- **Form labels**
- **Button states**
- **Screen reader support**