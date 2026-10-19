// The stage for the blog and projects indexes: the landing page's dark base
// without the 3D. A faint pool of light at the top and a fine dot grid that
// fades out as it falls, so the lists sit on something without competing
// with it. Static: nothing moves.

const DOTS = {
  backgroundImage:
    "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
  maskImage: "linear-gradient(to bottom, black 0%, transparent 70%)",
  WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 70%)",
};

export default function QuietBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-50 bg-[#121212]">
      <div className="absolute inset-0" style={DOTS} />
      <div className="absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_60%_55%_at_50%_0%,rgba(163,203,255,0.10),transparent_70%)]" />
    </div>
  );
}
