import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import WaveSurfer from 'wavesurfer.js';

const WaveformPlayer = forwardRef(({ audioUrl, onTimeUpdate, className }, ref) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Expose seekTo method and ready state via ref
  useImperativeHandle(ref, () => ({
    seekTo: (time) => {
      if (wavesurferRef.current && !isLoading && duration) {
        wavesurferRef.current.seekTo(time / duration);
      }
    },
    isReady: isReady
  }));

  useEffect(() => {
    let wavesurfer = null;
    let isComponentMounted = true;

    const initWaveSurfer = async () => {
      if (!audioUrl || !waveformRef.current) return;
      setIsReady(false);

      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }

      // Create audio element first
      const audio = document.createElement('audio');
      audio.controls = false;
      audio.autoplay = false;
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audioRef.current = audio;

      try {
        wavesurfer = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: '#4a5568',
          progressColor: '#4299e1',
          cursorColor: '#f7fafc',
          barWidth: 2,
          barGap: 3,
          barRadius: 3,
          responsive: true,
          height: 32,
          normalize: true,
          backgroundColor: 'transparent',
          cursorWidth: 1,
          barMinHeight: 1,
          interact: true,
          hideScrollbar: true,
          fillParent: true,
          backend: 'MediaElement',
          mediaControls: false,
          media: audio,
          minPxPerSec: 50,
          partialRender: true
        });

        wavesurferRef.current = wavesurfer;

        // Add ready handler
        wavesurfer.on('ready', () => {
          if (isComponentMounted) {
            setIsReady(true);
            setIsLoading(false);
          }
        });

        const handleResize = () => {
          if (wavesurferRef.current && duration) {
            const containerWidth = waveformRef.current.clientWidth;
            const pxPerSec = containerWidth / duration;
            wavesurferRef.current.zoom(pxPerSec);
          }
        };

        

        wavesurfer.on('seek', function(position) {
          const time = position * duration;
          if (onTimeUpdate) {
            onTimeUpdate(time);
          }
        });

        wavesurfer.on('ready', handleResize);

        const progressHandler = () => {
          if (!isComponentMounted) return;
          if (audio.buffered.length > 0) {
            const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
            const audioDuration = audio.duration;
            const progress = (bufferedEnd / audioDuration) * 100;
            setLoadingProgress(progress);
            if (progress > 10) {
              setIsLoading(false);
            }
          }
        };

        const canplayHandler = () => {
          if (!isComponentMounted) return;
          setIsLoading(false);
        };

        const loadedmetadataHandler = () => {
          if (!isComponentMounted) return;
          setDuration(audio.duration);
        };

        const timeUpdateHandler = () => {
          if (!isComponentMounted) return;
          const time = audio.currentTime;
          setCurrentTime(time);
          if (onTimeUpdate) {
            onTimeUpdate(time);
          }
        };

        const playHandler = () => {
          if (!isComponentMounted) return;
          setIsPlaying(true);
        };

        const pauseHandler = () => {
          if (!isComponentMounted) return;
          setIsPlaying(false);
        };

        const errorHandler = (error) => {
          if (!isComponentMounted) return;
          console.error('Audio error:', error);
          setIsLoading(false);
        };

        audio.addEventListener('progress', progressHandler);
        audio.addEventListener('canplay', canplayHandler);
        audio.addEventListener('loadedmetadata', loadedmetadataHandler);
        audio.addEventListener('timeupdate', timeUpdateHandler);
        audio.addEventListener('play', playHandler);
        audio.addEventListener('pause', pauseHandler);
        audio.addEventListener('error', errorHandler);

        audioRef.current.cleanup = () => {
          audio.removeEventListener('progress', progressHandler);
          audio.removeEventListener('canplay', canplayHandler);
          audio.removeEventListener('loadedmetadata', loadedmetadataHandler);
          audio.removeEventListener('timeupdate', timeUpdateHandler);
          audio.removeEventListener('play', playHandler);
          audio.removeEventListener('pause', pauseHandler);
          audio.removeEventListener('error', errorHandler);
        };

        // Load audio
        if (isComponentMounted) {
          setIsLoading(true);
          setIsReady(false);
          audio.src = audioUrl;
          await wavesurfer.load(audioUrl);
        }
      } catch (error) {
        console.error('Error initializing WaveSurfer:', error);
        if (isComponentMounted) {
          setIsLoading(false);
          setIsReady(false);
        }
      }
    };

    initWaveSurfer();

    return () => {
      isComponentMounted = false;
      setIsReady(false);
      if (audioRef.current) {
        if (audioRef.current.cleanup) {
          audioRef.current.cleanup();
        }
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl, duration]);

  const handlePlayPause = () => {
    if (wavesurferRef.current && !isLoading) {
      wavesurferRef.current.playPause();
    }
  };

  const seekTo = (time) => {
    if (wavesurferRef.current && !isLoading) {
      wavesurferRef.current.seekTo(time / duration);
    }
  };

  const formatTime = (time) => {
    if (!time) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`waveform-player ${className}`}>
      <div className="player-controls">
        <button 
          className="play-button control-button"
          onClick={handlePlayPause}
          disabled={isLoading && loadingProgress < 10}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading && loadingProgress < 10 ? (
            <svg className="loading-icon animate-spin" viewBox="0 0 24 24" width="24" height="24">
              <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" fill="currentColor"/>
            </svg>
          ) : isPlaying ? (
            <svg className="pause-icon" viewBox="0 0 24 24" width="24" height="24">
              <rect x="6" y="4" width="4" height="16" fill="currentColor" />
              <rect x="14" y="4" width="4" height="16" fill="currentColor" />
            </svg>
          ) : (
            <svg className="play-icon" viewBox="0 0 24 24" width="24" height="24">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          )}
        </button>

        <div className="waveform-section">
          <div 
            className={`waveform-container ${isLoading ? 'loading' : ''}`} 
            ref={waveformRef}
          />
          {isLoading && loadingProgress < 100 && (
            <div className="loading-overlay" style={{ opacity: loadingProgress < 10 ? 1 : 0.3 }}>
              <div 
                className="loading-progress-bar" 
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          )}
        </div>

        <div className="time-display">
          <span className="current-time">{formatTime(currentTime)}</span>
          <span className="time-separator">/</span>
          <span className="total-time">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
});

export default WaveformPlayer;