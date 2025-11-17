# 🎬 Video Optimization Guide for Chasers DD

## Current Video Issues
- **Large file sizes**: 20-30MB each (too large for mobile)
- **Mobile autoplay restrictions**: iOS/Android block autoplay without user interaction
- **Loading performance**: 4K videos take time to load on slower connections

## Optimized Solution

### 1. Install FFmpeg (Required for optimization)
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### 2. Run Video Optimization
```bash
# Make script executable (if not already)
chmod +x optimize-videos.sh

# Run optimization
./optimize-videos.sh
```

### 3. Generated Files
The script creates optimized versions:
- `*-hq.mp4` - High quality for desktop (1080p, ~5-8MB)
- `*-mq.mp4` - Medium quality for tablets (720p, ~3-5MB)  
- `*-lq.mp4` - Low quality for mobile (480p, ~1-2MB)

### 4. Update Code to Use Optimized Videos
After optimization, update `src/pages/index.astro`:

```typescript
const heroSlides = [
  {
    id: 'premier-interior',
    src: '/videos/optimized/premier-interior-hq.mp4',        // Desktop
    srcMobile: '/videos/optimized/premier-interior-lq.mp4',  // Mobile
    poster: '...',
    title: 'Premier Designated Drivers',
    // ...
  },
  // ... other slides
];
```

## Mobile Video Best Practices

### What We've Implemented:
✅ **Mobile Detection** - Detects mobile devices and touch interfaces
✅ **User Interaction Prompt** - Shows "Tap to Play Videos" button on mobile
✅ **Conditional Autoplay** - Only autoplays after user interaction on mobile
✅ **Preload Strategy** - Uses `preload="none"` on mobile to save bandwidth
✅ **Responsive Video Sources** - Different video files for mobile vs desktop
✅ **Poster Image Fallbacks** - Graceful degradation when videos don't load

### Browser Autoplay Policies:
- **iOS Safari**: Requires user interaction for video with audio
- **Chrome Mobile**: Allows muted autoplay but may throttle on slow connections
- **Firefox Mobile**: Similar to Chrome, respects data saver modes
- **Android WebView**: Varies by device and browser version

## Performance Optimizations

### File Size Targets:
- **Desktop (1080p)**: 5-8MB for 10-second clips
- **Tablet (720p)**: 3-5MB for 10-second clips
- **Mobile (480p)**: 1-2MB for 10-second clips

### Technical Settings:
```bash
# High Quality (Desktop)
ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 28 -c:a aac -b:a 128k -movflags +faststart output-hq.mp4

# Medium Quality (Tablet)  
ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 30 -c:a aac -b:a 96k -movflags +faststart -vf scale=1280:720 output-mq.mp4

# Low Quality (Mobile)
ffmpeg -i input.mp4 -c:v libx264 -preset fast -crf 32 -c:a aac -b:a 64k -movflags +faststart -vf scale=854:480 output-lq.mp4
```

### Key Flags Explained:
- `-crf 28-32`: Constant Rate Factor (lower = higher quality)
- `-movflags +faststart`: Enables progressive download
- `-preset slow/medium/fast`: Encoding speed vs quality tradeoff
- `-vf scale=WxH`: Resize video dimensions

## Testing Mobile Video

### Test on Real Devices:
1. **iPhone Safari**: Check autoplay behavior
2. **Android Chrome**: Verify data saver compatibility  
3. **Slow 3G**: Test loading performance
4. **Low Power Mode**: Ensure graceful degradation

### Debug Tools:
- Open browser dev tools on mobile
- Check console logs for video errors
- Monitor network tab for download sizes
- Test with throttled connections

## Alternative Solutions

### If Video Optimization Isn't Sufficient:

1. **Static Images on Mobile**:
   - Use high-quality images instead of videos on mobile
   - Add CSS animations for visual interest

2. **Progressive Enhancement**:
   - Start with static images
   - Load videos only after user interaction
   - Use Intersection Observer API for lazy loading

3. **External Video Hosting**:
   - Consider Vimeo or YouTube for automatic optimization
   - Use services like Cloudinary for real-time video optimization

## Implementation Status

✅ Mobile video detection and handling
✅ User interaction prompt for mobile autoplay  
✅ Responsive video source selection
✅ Graceful fallbacks with poster images
✅ Video optimization script created
⏳ Run optimization script with FFmpeg
⏳ Update video sources in code
⏳ Test on various mobile devices

## Next Steps

1. Install FFmpeg if not available
2. Run `./optimize-videos.sh` to create optimized versions
3. Update the video sources in `src/pages/index.astro`
4. Test on mobile devices
5. Consider further optimizations if needed