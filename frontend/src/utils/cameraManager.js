// cameraManager.js
// Centralized Camera Stream & Track Lifecycle Manager
// Ensures every hardware camera stream is tracked and stopped immediately
// upon navigation, unmounting, logout, or flow completion.

const activeStreams = new Set();

export const cameraManager = {
  /**
   * Register an active MediaStream for tracking
   * @param {MediaStream} stream
   * @returns {MediaStream}
   */
  register(stream) {
    if (stream && typeof stream.getTracks === 'function') {
      activeStreams.add(stream);

      // Auto-cleanup when all tracks end
      stream.getTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          if (!stream.active) {
            activeStreams.delete(stream);
          }
        });
      });
    }
    return stream;
  },

  /**
   * Unregister a stream without stopping (if already stopped)
   * @param {MediaStream} stream
   */
  unregister(stream) {
    if (stream) {
      activeStreams.delete(stream);
    }
  },

  /**
   * Stop all tracks of a specific MediaStream
   * @param {MediaStream} stream
   */
  stopStream(stream) {
    if (!stream) return;
    try {
      if (typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch {
            // Track already closed
          }
        });
      }
    } catch (err) {
      console.warn('Error stopping stream track:', err);
    }
    activeStreams.delete(stream);
  },

  /**
   * Stop ALL active camera streams across the entire application
   * Also searches the DOM for any HTML5 <video> elements with active srcObject
   */
  stopAll() {
    // 1. Stop all registered MediaStreams
    activeStreams.forEach((stream) => {
      this.stopStream(stream);
    });
    activeStreams.clear();

    // 2. Scan all video elements in DOM and stop their streams
    try {
      const videos = document.querySelectorAll('video');
      videos.forEach((video) => {
        if (video.srcObject) {
          if (typeof video.srcObject.getTracks === 'function') {
            video.srcObject.getTracks().forEach((track) => {
              try {
                track.stop();
                track.enabled = false;
              } catch {
                // Track already stopped
              }
            });
          }
          video.srcObject = null;
        }
        try {
          video.pause();
        } catch {
          // Video pause ignored
        }
      });
    } catch (err) {
      console.warn('Error cleaning DOM video elements:', err);
    }
  },
};

// Global event listeners to guarantee camera turns off on page leave or browser back/forward
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => cameraManager.stopAll());
  window.addEventListener('popstate', () => cameraManager.stopAll());
}
