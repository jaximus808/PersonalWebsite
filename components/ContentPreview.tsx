interface ContentPreviewProps {
  content: string;
  className?: string;
}

export default function ContentPreview({ content, className }: ContentPreviewProps) {
  return (
    <div className={className}>
      {content.split("*").map((segment, key) => {
        if (segment.length === 0) return <div key={key}></div>;
        if (segment.length >= 3 && segment.substring(0, 3) === "<i>") {
          return <span key={key} />;
        }
        if (segment.length >= 3 && segment.substring(0, 3) === "<b>") {
          return (
            <h3 key={key} className="font-bold" style={{ whiteSpace: "pre-wrap" }}>
              {segment.substring(3)}
            </h3>
          );
        }
        return (
          <h3 key={key} style={{ whiteSpace: "pre-wrap" }}>
            {segment}
          </h3>
        );
      })}
    </div>
  );
}
