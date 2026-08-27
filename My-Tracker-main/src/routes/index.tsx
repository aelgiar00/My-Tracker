import { createFileRoute } from "@tanstack/react-router";
import { TrackerApp } from "../components/tracker/tracker-app";

export const Route = createFileRoute("/")({
  component: TrackerApp,
});
