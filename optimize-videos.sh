#!/bin/bash

# Video Optimization Script for Chasers DD Website
# This script uses FFmpeg to optimize videos for web delivery

echo "🎬 Optimizing videos for web delivery..."

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg is not installed. Please install it first:"
    echo "   macOS: brew install ffmpeg"
    echo "   Ubuntu: sudo apt install ffmpeg"
    echo "   Windows: Download from https://ffmpeg.org/download.html"
    exit 1
fi

# Create optimized video directory
mkdir -p public/videos/optimized

# Function to optimize video
optimize_video() {
    local input="$1"
    local output="$2"
    local preset="$3"
    local description="$4"
    
    echo "📹 Creating $description version: $output"
    
    ffmpeg -i "$input" \
        -c:v libx264 \
        -preset "$preset" \
        -crf 28 \
        -c:a aac \
        -b:a 128k \
        -movflags +faststart \
        -pix_fmt yuv420p \
        -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
        "$output" \
        -y -loglevel warning
}

# Optimize each video with different quality settings
for video in public/videos/*.mp4; do
    if [[ -f "$video" ]]; then
        filename=$(basename "$video" .mp4)
        
        echo "🔄 Processing: $filename"
        
        # High quality version (for desktop)
        optimize_video "$video" "public/videos/optimized/${filename}-hq.mp4" "slow" "high quality"
        
        # Medium quality version (for tablets)
        optimize_video "$video" "public/videos/optimized/${filename}-mq.mp4" "medium" "medium quality"
        
        # Low quality version (for mobile)
        ffmpeg -i "$video" \
            -c:v libx264 \
            -preset fast \
            -crf 32 \
            -c:a aac \
            -b:a 96k \
            -movflags +faststart \
            -pix_fmt yuv420p \
            -vf "scale=1280:720" \
            "public/videos/optimized/${filename}-lq.mp4" \
            -y -loglevel warning
        
        echo "✅ Completed: $filename"
    fi
done

echo "🎉 Video optimization complete!"
echo "📊 File sizes:"
ls -lh public/videos/optimized/

echo "📱 Usage in code:"
echo "- Desktop: use *-hq.mp4 files"
echo "- Tablet:  use *-mq.mp4 files" 
echo "- Mobile:  use *-lq.mp4 files"