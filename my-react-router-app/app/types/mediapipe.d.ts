declare module "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14" {
  export const FilesetResolver: {
    forVisionTasks: (path: string) => Promise<unknown>;
  };
  export const HolisticLandmarker: {
    createFromOptions: (
      vision: unknown,
      options: {
        baseOptions: { modelAssetPath: string };
        runningMode: "VIDEO";
        numPoses?: number;
      },
    ) => Promise<{
      detectForVideo: (
        video: HTMLVideoElement,
        timestamp: number,
      ) =>
        | undefined
        | {
            poseLandmarks?: Array<
              Array<{ x: number; y: number; z?: number; visibility?: number }>
            >;
          };
      close: () => void;
    }>;
  };
}