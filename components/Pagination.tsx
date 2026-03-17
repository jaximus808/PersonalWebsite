import { ArrowLeft, ArrowRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

export default function Pagination({
  page,
  totalPages,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: PaginationProps) {
  return (
    <div className="flex justify-center items-center gap-4 pb-12">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className={`px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white flex items-center gap-2 transition-all shadow-lg ${
          canGoBack
            ? "hover:bg-white/20 cursor-pointer"
            : "opacity-50 cursor-not-allowed"
        }`}
      >
        <ArrowLeft className="w-5 h-5" />
        Previous
      </button>

      <span className="text-white bg-white/10 backdrop-blur-md px-6 py-3 rounded-lg border border-white/20">
        Page {page + 1} of {totalPages}
      </span>

      <button
        onClick={onForward}
        disabled={!canGoForward}
        className={`px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white flex items-center gap-2 transition-all shadow-lg ${
          canGoForward
            ? "hover:bg-white/20 cursor-pointer"
            : "opacity-50 cursor-not-allowed"
        }`}
      >
        Next
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
