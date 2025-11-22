import type { Route } from "./+types/home";
import { PoseCoach } from "../features/pose-coach";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
    { title: "Senior Gym webcam coach" },
    { name: "description", content: "Holistic-based tracking for safe exercise guidance." },
  ];
}

export default function Home() {
  return <PoseCoach />;
}