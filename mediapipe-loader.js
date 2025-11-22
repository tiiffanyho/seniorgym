// Load MediaPipe libraries from the local .cjs file and expose to window
const script = document.createElement('script');
script.textContent = `
(function() {
  var exports = {};
  var module = { exports: exports };
  // Load the .cjs file content here via fetch
  fetch('./vision_bundle.cjs')
    .then(r => r.text())
    .then(code => {
      // Execute the code in a scope where it can export
      eval(code);
      // Expose the exports to window
      window.FilesetResolver = exports.FilesetResolver;
      window.PoseLandmarker = exports.PoseLandmarker;
      window.FaceLandmarker = exports.FaceLandmarker;
      window.HandLandmarker = exports.HandLandmarker;
      window.ObjectDetector = exports.ObjectDetector;
      window.ImageSegmenter = exports.ImageSegmenter;
      window.DrawingUtils = exports.DrawingUtils;
      console.log('✓ MediaPipe loaded');
      // Dispatch custom event
      window.dispatchEvent(new Event('mediapipe-loaded'));
    })
    .catch(e => {
      console.error('Failed to load MediaPipe:', e);
      window.dispatchEvent(new Event('mediapipe-error'));
    });
})();
`;
document.head.appendChild(script);
