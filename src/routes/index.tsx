import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blank" },
      { name: "description", content: "A blank canvas." },
      { property: "og:title", content: "Blank" },
      { property: "og:description", content: "A blank canvas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return null;
}

