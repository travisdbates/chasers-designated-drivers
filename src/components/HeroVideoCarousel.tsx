import React, { useState, useEffect, useMemo, useRef } from "react";

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

interface Phrase {
  title: string;
  subtitle1: string;
  subtitle2?: string;
  // Multiplies how long this phrase stays on screen. Defaults to 1.
  durationMultiplier?: number;
  // Overrides the default call-to-action button
  cta?: {
    text: string;
    href: string;
  };
  // Renders a "Call or Text" link alongside the button
  showPhoneCta?: boolean;
}

interface HeroVideoCarouselProps {
  slides: VideoSlide[];
  autoplayInterval?: number; // Fallback if video duration cannot be determined
  // Pricing is passed in from the page, which reads the shared plan config on
  // the server, so this client component never bundles it.
  membershipFrom: string; // Cheapest monthly plan, e.g. "$49.99"
  rideFee: string; // Per-ride fee for that plan, e.g. "$40"
}

const DEFAULT_CTA = { text: "View Our Plans", href: "/membership" };
const PHONE_NUMBER = "(480) 695-3659";
const PHONE_HREF = "tel:+14806953659";

// Phrases that rotate with video changes.
// The first entry leads on page load and carries the full service pitch, so it
// stays on screen twice as long as the others.
const buildPhrases = (membershipFrom: string, rideFee: string): Phrase[] => [
  {
    title: "Never risk a DUI again, or leave your vehicle behind",
    subtitle1:
      "Chasers sends vetted safe and friendly drivers to you at your location and drive you AND your vehicle home or to next destination.",
    subtitle2: `Open seven days a week, 3pm to 3am. Membership from ${membershipFrom} per month. Rides ${rideFee} plus gratuity each use.`,
    durationMultiplier: 2,
    cta: { text: "View Plan", href: "/membership" },
    showPhoneCta: true,
  },
  {
    title: "We get you AND your vehicle home safely.",
    subtitle1:
      "Experience our services that have you, your time and protection in mind. Arrive in your own vehicle, remain in your own vehicle and return home in your own vehicle.",
  },
  {
    title: "Our WHY, is NO DUI!",
    subtitle1:
      "Our members come first always. Every ride is handled by amazing drivers, premier pricing, and a commitment to getting you—and your vehicle—home safely.",
  },
];

const HeroVideoCarousel: React.FC<HeroVideoCarouselProps> = ({
  slides,
  autoplayInterval = 7000,
  membershipFrom,
  rideFee,
}) => {
  const phrases = useMemo(
    () => buildPhrases(membershipFrom, rideFee),
    [membershipFrom, rideFee]
  );
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
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
      // Videos play at 0.66x speed, so multiply duration by 1.333 (1 / 0.75)
      const currentVideoDuration = videoDurations[currentSlide];
      const adjustedDuration = currentVideoDuration
        ? currentVideoDuration / 0.66
        : null;
      // Some phrases carry more copy and hold the screen longer
      const durationMultiplier =
        phrases[currentPhraseIndex].durationMultiplier ?? 1;
      const baseDuration = adjustedDuration
        ? adjustedDuration * 1000
        : autoplayInterval;
      // Subtract fade-out time (500ms) from the interval
      const interval = baseDuration * durationMultiplier - 500;

      console.log(
        `Setting interval for slide ${currentSlide}: ${interval}ms (${currentVideoDuration ? currentVideoDuration + "s actual duration at 0.66x speed" : autoplayInterval / 1000 + "s fallback"}${durationMultiplier !== 1 ? `, ${durationMultiplier}x for phrase ${currentPhraseIndex}` : ""})`
      );

      intervalRef.current = setInterval(() => {
        // Start fade-out
        setIsTransitioning(true);

        // After fade-out completes, change slide/phrase and reset transition
        setTimeout(() => {
          setCurrentSlide((prev) => (prev + 1) % slides.length);
          setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
          setIsTransitioning(false);
        }, 500);
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
    currentPhraseIndex,
    phrases,
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
      // Set playback speed to 0.66x (slower)
      currentVideo.playbackRate = 0.66;

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
            Premier Transportation
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
      <div className="hero-content">
        <div className="container-center px-4">
          <div className="mx-auto text-center" style={{ maxWidth: "850px" }}>
            {/* Main Headline - Fades with video changes */}
            <h1
              key={`title-${currentPhraseIndex}`}
              className="text-white text-shadow-premier"
              style={{
                fontSize: "clamp(32px, 7vw, 54px)",
                fontWeight: 400,
                marginBottom: 20,
                lineHeight: 1.2,
                fontFamily:
                  '"Louize Display", Overpass, Inter, Arial, sans-serif',
                fontVariant: "small-caps",
                animation: isTransitioning
                  ? "fadeOut 500ms ease-in-out forwards"
                  : "fadeIn 1000ms ease-in-out",
              }}
            >
              {phrases[currentPhraseIndex].title}
            </h1>

            {/* Subtitle - Fades with video changes */}
            <p
              key={`subtitle1-${currentPhraseIndex}`}
              className="text-dark-200"
              style={{
                fontSize: "clamp(20px, 4.2vw, 32px)",
                lineHeight: 1.3,
                fontFamily:
                  '"Louize Display", Overpass, Inter, Arial, sans-serif',
                fontWeight: 400,
                margin: 0,
                animation: isTransitioning
                  ? "fadeOut 500ms ease-in-out forwards"
                  : "fadeIn 1000ms ease-in-out",
              }}
            >
              {phrases[currentPhraseIndex].subtitle1}
            </p>

            {/* Optional second subtitle */}
            {phrases[currentPhraseIndex].subtitle2 && (
              <p
                key={`subtitle2-${currentPhraseIndex}`}
                className="text-dark-200"
                style={{
                  fontSize: "clamp(18px, 3.6vw, 28px)",
                  lineHeight: 1.3,
                  fontFamily:
                    '"Louize Display", Overpass, Inter, Arial, sans-serif',
                  fontWeight: 400,
                  marginTop: 10,
                  animation: isTransitioning
                    ? "fadeOut 500ms ease-in-out forwards"
                    : "fadeIn 1000ms ease-in-out",
                }}
              >
                {phrases[currentPhraseIndex].subtitle2}
              </p>
            )}

            {/* CTA Buttons - Fade with the phrase they belong to */}
            <div
              key={`cta-${currentPhraseIndex}`}
              className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
              style={{
                marginTop: "16px",
                animation: isTransitioning
                  ? "fadeOut 500ms ease-in-out forwards"
                  : "fadeIn 1000ms ease-in-out",
              }}
            >
              <a
                href={(phrases[currentPhraseIndex].cta ?? DEFAULT_CTA).href}
                className="btn-primary px-8 py-4"
                style={{ fontSize: "clamp(16px, 2vw, 20px)" }}
              >
                {(phrases[currentPhraseIndex].cta ?? DEFAULT_CTA).text}
              </a>

              {phrases[currentPhraseIndex].showPhoneCta && (
                <a
                  href={PHONE_HREF}
                  className="btn-secondary px-8 py-4"
                  style={{ fontSize: "clamp(16px, 2vw, 20px)" }}
                >
                  Call or Text {PHONE_NUMBER}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe animation for fade effect */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>

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
