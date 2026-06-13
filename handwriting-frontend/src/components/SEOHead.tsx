import { useEffect } from "react";

const DEFAULTS = {
  title: "Roadmapper — Visual Roadmap Planning",
  description:
    "The visual roadmap tool that keeps your team aligned. Drag, drop, and plan product priorities on one shared canvas.",
  image:
    "https://storage.googleapis.com/gpt-engineer-file-uploads/KoUaltGzqoVfSfQv3CIsHyhMxAp2/social-images/social-1773176534128-Roadmap-Compass-24-Lovable-03-10-2026_05_01_PM_(1).webp",
  url: "https://myroadmapcanvas.lovable.app/",
  type: "website",
};

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

function setMeta(property: string, content: string, isName = false) {
  const attr = isName ? "name" : "property";
  let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function SEOHead({
  title = DEFAULTS.title,
  description = DEFAULTS.description,
  image = DEFAULTS.image,
  url = DEFAULTS.url,
  type = DEFAULTS.type,
}: SEOHeadProps) {
  useEffect(() => {
    document.title = title;
    setMeta("og:type", type);
    setMeta("og:url", url);
    setMeta("og:title", title);
    setMeta("og:description", description);
    setMeta("og:image", image);
    setMeta("og:image:width", "1200");
    setMeta("og:image:height", "630");
    setMeta("twitter:card", "summary_large_image", true);
    setMeta("twitter:title", title, true);
    setMeta("twitter:description", description, true);
    setMeta("twitter:image", image, true);
    setMeta("description", description, true);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    return () => {
      document.title = DEFAULTS.title;
      setMeta("og:title", DEFAULTS.title);
      setMeta("og:description", DEFAULTS.description);
      setMeta("og:url", DEFAULTS.url);
      setMeta("og:type", DEFAULTS.type);
      setMeta("og:image", DEFAULTS.image);
      setMeta("twitter:title", DEFAULTS.title, true);
      setMeta("twitter:description", DEFAULTS.description, true);
      setMeta("twitter:image", DEFAULTS.image, true);
      setMeta("description", DEFAULTS.description, true);
    };
  }, [title, description, image, url, type]);

  return null;
}
