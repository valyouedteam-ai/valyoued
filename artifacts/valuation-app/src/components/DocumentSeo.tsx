import { useEffect } from "react";
import { useLocation } from "wouter";
import { seoForPath, siteOrigin } from "@/lib/seo-metadata";

function findMetaByName(name: string): HTMLMetaElement | null {
  const nodes = document.head.querySelectorAll('meta[name]');
  for (const n of nodes) {
    if (n.getAttribute("name") === name) return n as HTMLMetaElement;
  }
  return null;
}

function findMetaByProperty(property: string): HTMLMetaElement | null {
  const nodes = document.head.querySelectorAll("meta[property]");
  for (const n of nodes) {
    if (n.getAttribute("property") === property) return n as HTMLMetaElement;
  }
  return null;
}

function upsertNamedMeta(name: string, content: string) {
  let el = findMetaByName(name);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertPropertyMeta(property: string, content: string) {
  let el = findMetaByProperty(property);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonicalUrl(absoluteUrl: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = absoluteUrl;
}

/**
 * Keeps `document.title`, meta description, Open Graph, Twitter fallbacks, and canonical URL in sync with the SPA route.
 */
export function DocumentSeo() {
  const [pathname] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    const { title, description } = seoForPath(pathname);
    const pathForUrl =
      pathname === "/"
        ? `${basePath ? `${basePath}/` : "/"}`.replace(/^\/\/+/, "/")
        : `${basePath}${pathname}`;
    const canonical = `${siteOrigin()}${pathForUrl.startsWith("/") ? pathForUrl : `/${pathForUrl}`}`;

    document.title = title;
    upsertNamedMeta("description", description);

    upsertPropertyMeta("og:title", title);
    upsertPropertyMeta("og:description", description);
    upsertPropertyMeta("og:url", canonical);
    upsertPropertyMeta("og:type", "website");

    const ogImage = `${siteOrigin()}${basePath ? `${basePath}/` : "/"}favicon.svg`;
    upsertPropertyMeta("og:image", ogImage);

    upsertNamedMeta("twitter:card", "summary");
    upsertNamedMeta("twitter:title", title);
    upsertNamedMeta("twitter:description", description);

    setCanonicalUrl(canonical);
  }, [pathname, basePath]);

  return null;
}
