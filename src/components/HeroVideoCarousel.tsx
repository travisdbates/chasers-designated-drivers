import React, { useState, useEffect, useRef } from 'react';

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
  autoplayInterval?: number;
}

const HeroVideoCarousel: React.FC<HeroVideoCarouselProps> = ({ 
  slides, 
  autoplayInterval = 7000 
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [videoErrors, setVideoErrors] = useState<boolean[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile and touch devices
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                            (window.innerWidth <= 768) ||
                            ('ontouchstart' in window);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set a timeout for loading state (show content even if videos don't load)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoadingTimeout(true);
      setIsLoaded(true); // Force show content after 5 seconds
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);


  // Auto-advance slides
  useEffect(() => {
    if (isPlaying && slides.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, autoplayInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, slides.length, autoplayInterval]);

  // Handle video loading and playback
  useEffect(() => {
    const currentVideo = videoRefs.current[currentSlide];
    if (currentVideo) {
      console.log('Playing video:', currentSlide, currentVideo.src, 'Mobile:', isMobile);
      currentVideo.currentTime = 0;
      
      // Always attempt autoplay (browsers will handle restrictions)
      if (currentVideo.readyState >= 3) {
        currentVideo.play().catch((error) => {
          console.error('Video play error:', error);
        });
      } else {
        currentVideo.addEventListener('canplay', () => {
          currentVideo.play().catch((error) => {
            console.error('Video play error on canplay:', error);
          });
        }, { once: true });
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
    setVideoErrors(prev => {
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
            Join Now
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
              index === currentSlide ? 'opacity-100' : 'opacity-0'
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
              src={isMobile && slide.srcMobile ? slide.srcMobile : slide.src}
              poster={slide.poster}
              muted
              autoPlay
              loop
              playsInline
              preload="metadata"
              controls={false}
              disablePictureInPicture
              webkit-playsinline="true"
              onLoadedData={handleVideoLoad}
              onError={() => handleVideoError(index)}
              onCanPlay={() => {
                const video = videoRefs.current[index];
                if (video && index === currentSlide) {
                  video.play().catch(console.error);
                }
              }}
              style={{ 
                opacity: videoErrors[index] ? 0 : 1,
                transition: 'opacity 0.5s ease-in-out'
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
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Headline - Always show "Luxury Designated Drivers" */}
            <h1 className="heading-hero text-white mb-6 text-shadow-luxury animate-slide-up">
              Luxury Designated Drivers
            </h1>
            
            {/* Subtitle - Always show the main subtitle */}
            <p className="text-xl md:text-2xl text-dark-200 mb-8 max-w-2xl mx-auto leading-relaxed animate-slide-up">
              Experience premium transportation with our professional chauffeur service. Arrive in style, leave worry-free.
            </p>
            
            {/* CTA Buttons - Always show the same buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 animate-slide-up">
              <a 
                href="/membership" 
                className="btn-primary text-lg px-8 py-4"
              >
                View Membership Plans
              </a>
              
              <a 
                href="/how-it-works" 
                className="btn-secondary text-lg px-8 py-4"
              >
                How It Works
              </a>
            </div>
            
            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center space-x-8 text-dark-400 text-sm animate-fade-in">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gold-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Licensed & Insured</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gold-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>5-Star Service</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gold-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>24/7 Available</span>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Loading State */}
      {!isLoaded && !loadingTimeout && (
        <div className="absolute inset-0 bg-dark-primary flex items-center justify-center z-10">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-dark-400">Loading luxury experience...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroVideoCarousel;