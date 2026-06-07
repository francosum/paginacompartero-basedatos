interface StorageImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

const PUBLIC_OBJECT_SEGMENT = "/storage/v1/object/public/";
const PUBLIC_RENDER_SEGMENT = "/storage/v1/render/image/public/";

export function optimizedStorageImageUrl(url: string, options: StorageImageOptions = {}) {
  if (!url.includes(PUBLIC_OBJECT_SEGMENT) || url.includes(PUBLIC_RENDER_SEGMENT)) return url;

  const params = new URLSearchParams();
  if (options.width) params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  if (options.quality) params.set("quality", String(options.quality));
  if (options.resize) params.set("resize", options.resize);

  const transformedUrl = url.replace(PUBLIC_OBJECT_SEGMENT, PUBLIC_RENDER_SEGMENT);
  const query = params.toString();
  return query ? `${transformedUrl}?${query}` : transformedUrl;
}
