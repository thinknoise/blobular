import type { PartialControlsState } from "../hooks/useControls";

export function setPageTitle(title: string): void {
  document.title = `Blobular: ${title}`;
  // Set <meta name="title"> and <meta property="og:title">
  const metaTitle =
    document.querySelector("meta[name='title']") ||
    document.createElement("meta");
  metaTitle.setAttribute("name", "title");
  metaTitle.setAttribute("content", document.title);
  document.head.appendChild(metaTitle);
  const ogTitle =
    document.querySelector("meta[property='og:title']") ||
    document.createElement("meta");
  ogTitle.setAttribute("property", "og:title");
  ogTitle.setAttribute("content", document.title);
  document.head.appendChild(ogTitle);
}

export function getDurationRangeFromUrl(): [number, number] | null {
  const param = new URLSearchParams(window.location.search).get("duration");
  if (!param) return null;
  const [minStr, maxStr] = param.split(",");
  const min = parseFloat(minStr);
  const max = parseFloat(maxStr);
  if (isNaN(min) || isNaN(max)) return null;
  return [min, max];
}

export function getInitialControlsFromUrl(): PartialControlsState {
  const params = new URLSearchParams(window.location.search);
  const blobsStr = params.get("blobs");
  const durationStr = params.get("duration");

  const numBlobs = blobsStr ? parseInt(blobsStr, 10) : undefined;

  const duration: [number, number] | undefined = (() => {
    if (!durationStr) return undefined;
    const [minStr, maxStr] = durationStr.split(",");
    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);
    if (isNaN(min) || isNaN(max)) return undefined;
    return [min, max];
  })();

  return {
    ...(numBlobs && numBlobs >= 1 && numBlobs <= 12
      ? { numBlobs: { value: numBlobs } }
      : {}),
    ...(duration ? { duration: { range: duration } } : {}),
  };
}

export function getDisplayTitle(bufferKey: string): string {
  const filename = bufferKey.replace(/^audio-pond\//, "").replace(/\.wav$/, "");

  const recordingMatch = filename.match(/^recording-(\d+)/);
  if (recordingMatch) {
    const date = new Date(Number(recordingMatch[1]));
    const formattedDate = date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `recording [${formattedDate}]`;
  }

  const nameMatch = filename.match(/^(\d+)-(.*)/);
  if (nameMatch) {
    const rawName = nameMatch[2].replace(/[-_]+/g, " ").trim();
    const date = new Date(Number(nameMatch[1]));
    const formattedDate = date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `${rawName} [${formattedDate}]`;
  }

  return filename.replace(/[-_]+/g, " ").trim();
}
