import Youtube from "react-youtube";
import styles from "../styles/Home.module.css";

interface YoutubeEmbedProps {
  vId: string;
  className?: string;
}

export default function YoutubeEmbed({ vId, className }: YoutubeEmbedProps) {
  const opts = {
    height: "100%",
    width: "95%",
    playerVars: { autoplay: 0 },
  };

  return (
    <div className={`${styles.centerRelX} ${className ?? ""}`}>
      <Youtube
        className="relative flex iterms-center justify-center"
        style={{ width: "100%", height: "100%" }}
        videoId={vId}
        opts={opts}
      />
    </div>
  );
}
