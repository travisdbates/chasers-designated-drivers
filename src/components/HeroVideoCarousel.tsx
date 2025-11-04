import React, { useState, useEffect, useRef } from "react";

interface VideoSlide {
  id: string;
  src: string;
  srcMobile?: string; // Optional mobile-optimized version
  poster: string;
  title: string;
  subtitle: string;
  cta: {
    text: string;
    href: string;
  };
}

interface HeroVideoCarouselProps {
  slides: VideoSlide[];
  autoplayInterval?: number; // Fallback if video duration cannot be determined
}

const HeroVideoCarousel: React.FC<HeroVideoCarouselProps> = ({
  slides,
  autoplayInterval = 7000,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [videoErrors, setVideoErrors] = useState<boolean[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [videoDurations, setVideoDurations] = useState<number[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile and touch devices
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) ||
        window.innerWidth <= 768 ||
        "ontouchstart" in window;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Set a timeout for loading state (show content even if videos don't load)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoadingTimeout(true);
      setIsLoaded(true); // Force show content after 5 seconds
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  // Auto-advance slides based on actual video duration
  useEffect(() => {
    if (isPlaying && slides.length > 1) {
      // Use actual video duration if available, otherwise fallback to autoplayInterval
      const currentVideoDuration = videoDurations[currentSlide];
      const interval = currentVideoDuration
        ? currentVideoDuration * 1000
        : autoplayInterval;

      console.log(
        `Setting interval for slide ${currentSlide}: ${interval}ms (${currentVideoDuration ? currentVideoDuration + "s actual duration" : autoplayInterval / 1000 + "s fallback"})`
      );

      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    isPlaying,
    slides.length,
    autoplayInterval,
    currentSlide,
    videoDurations,
  ]);

  // Cleanup video memory on unmount
  useEffect(() => {
    return () => {
      videoRefs.current.forEach((video) => {
        if (video) {
          video.pause();
          video.removeAttribute("src");
          video.load();
        }
      });
    };
  }, []);

  // Handle video loading and playback
  useEffect(() => {
    const currentVideo = videoRefs.current[currentSlide];
    if (currentVideo) {
      console.log(
        "Playing video:",
        currentSlide,
        currentVideo.src,
        "Mobile:",
        isMobile
      );
      currentVideo.currentTime = 0;

      // Always attempt autoplay (browsers will handle restrictions)
      if (currentVideo.readyState >= 3) {
        currentVideo.play().catch((error) => {
          console.error("Video play error:", error);
        });
      } else {
        currentVideo.addEventListener(
          "canplay",
          () => {
            currentVideo.play().catch((error) => {
              console.error("Video play error on canplay:", error);
            });
          },
          { once: true }
        );
      }
    }

    // Pause other videos
    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentSlide) {
        video.pause();
      }
    });
  }, [currentSlide, isMobile]);

  const handleVideoLoad = () => {
    if (!isLoaded) {
      setIsLoaded(true);
    }
  };

  const handleVideoLoadedMetadata = (index: number) => {
    const video = videoRefs.current[index];
    if (video && video.duration && isFinite(video.duration)) {
      console.log(`Video ${index} duration:`, video.duration, "seconds");
      setVideoDurations((prev) => {
        const newDurations = [...prev];
        newDurations[index] = video.duration;
        return newDurations;
      });
    }
  };

  // Show content immediately since we have poster images
  useEffect(() => {
    // Show content after a short delay even without video loading
    const immediateTimeout = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);

    return () => clearTimeout(immediateTimeout);
  }, []);

  const handleVideoError = (index: number) => {
    console.error(`Video ${index} failed to load:`, slides[index]?.src);
    setVideoErrors((prev) => {
      const newErrors = [...prev];
      newErrors[index] = true;
      return newErrors;
    });
  };

  if (!slides || slides.length === 0) {
    return (
      <div className="hero-video-container bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="heading-hero text-white mb-6">
            Luxury Transportation
          </h1>
          <p className="text-xl text-dark-300 mb-8">
            Professional designated driver service
          </p>
          <a href="/membership" className="btn-primary">
            View Membership Plans
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-video-container relative">
      {/* Video Background */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Poster Image Background */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.poster})` }}
            />

            {/* Video Element */}
            <video
              ref={(el) => (videoRefs.current[index] = el)}
              className="hero-video"
              src={slide.srcMobile || slide.src}
              poster={slide.poster}
              muted
              autoPlay
              loop
              playsInline
              preload={index === currentSlide ? "auto" : "none"}
              controls={false}
              disablePictureInPicture
              webkit-playsinline="true"
              onLoadedData={handleVideoLoad}
              onLoadedMetadata={() => handleVideoLoadedMetadata(index)}
              onError={() => handleVideoError(index)}
              onCanPlay={() => {
                const video = videoRefs.current[index];
                if (video && index === currentSlide) {
                  video.play().catch(console.error);
                }
              }}
              style={{
                opacity: videoErrors[index] ? 0 : 1,
                transition: "opacity 0.5s ease-in-out",
              }}
            />

            {/* Video Loading Indicator */}
            {index === currentSlide && !videoErrors[index] && (
              <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
                Video Loading...
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Gradient Overlay */}
      <div className="hero-overlay" />

      {/* Hero Content */}
      <div className="hero-content animate-fade-in">
        <div className="container-center px-4">
          <div className="mx-auto text-center" style={{ maxWidth: "850px" }}>
            {/* Main Headline - Always show "Luxury Designated Drivers" */}
            <h1
              className="text-white text-shadow-luxury animate-slide-up"
              style={{
                fontSize: "54px",
                fontWeight: 400,
                margin: 0,
                lineHeight: 1.2,
                fontFamily:
                  '"Louize Display", Overpass, Inter, Arial, sans-serif',
              }}
            >
              Discover a new way to be driven.
            </h1>

            {/* Subtitle - Always show the main subtitle */}
            <p
              className="text-dark-200 animate-slide-up"
              style={{
                fontSize: "32px",
                lineHeight: 1.3,
                fontFamily:
                  '"Louize Display", Overpass, Inter, Arial, sans-serif',
                fontWeight: 400,
                margin: 0,
              }}
            >
              Experience a lifestyle service that has you and your time in mind.
              Arrive in style, leave worry-free in your own vehicle.
            </p>

            {/* CTA Buttons - Always show the same buttons */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 animate-slide-up"
              style={{ marginTop: "16px" }}
            >
              <a
                href="/membership"
                className="btn-primary px-8 py-4"
                style={{ fontSize: "20px" }}
              >
                View Our Plans
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {!isLoaded && !loadingTimeout && (
        <div className="absolute inset-0 bg-dark-primary flex items-center justify-center z-10">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-dark-400">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroVideoCarousel;
