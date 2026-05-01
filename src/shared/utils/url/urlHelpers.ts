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
