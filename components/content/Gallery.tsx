import { FramedImage, type Fit, type Ratio } from "./Frame";
import { Caption } from "./Figure";

type GalleryImage = string | { src: string; alt?: string };

type GalleryProps = {
  images: GalleryImage[];
  /** One caption under the whole set. */
  caption?: React.ReactNode;
  columns?: 2 | 3;
  ratio?: Ratio;
  fit?: Fit;
};

const COLUMNS = { 2: "grid-cols-2", 3: "grid-cols-2 sm:grid-cols-3" };

/**
 * Several images side by side, all in identical frames.
 *
 *   <Gallery images={["/blog/x/1.jpg", "/blog/x/2.jpg"]} caption="Before and after" />
 */
export default function Gallery({
  images,
  caption,
  columns = 2,
  ratio = "square",
  fit = "cover",
}: GalleryProps) {
  return (
    <figure className="my-10">
      <div className={`grid gap-3 ${COLUMNS[columns]}`}>
        {images.map((image) => {
          const { src, alt } = typeof image === "string" ? { src: image, alt: "" } : image;
          return <FramedImage key={src} src={src} alt={alt} ratio={ratio} fit={fit} />;
        })}
      </div>
      {caption ? <Caption>{caption}</Caption> : null}
    </figure>
  );
}
