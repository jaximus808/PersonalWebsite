import Link from "next/link";
import styles from "../../styles/Home.module.css";
import { PopInBlock } from "../popinBlockContext";
import { ArrowRight } from "lucide-react";

interface BlogsSectionProps {
  recentBlogs: any[] | undefined;
}

function getExcerpt(content: string): string {
  for (const seg of content.split("*")) {
    if (seg.length === 0) continue;
    if (seg.substring(0, 3) === "<i>") continue;
    const text = (seg.substring(0, 3) === "<b>" ? seg.substring(3) : seg).trim();
    if (text.length > 0) return text;
  }
  return "";
}

function getReadTime(content: string): string {
  const plainText = content
    .split("*")
    .map((s) => {
      if (s.length >= 3 && s.substring(0, 3) === "<i>") return "";
      if (s.length >= 3 && s.substring(0, 3) === "<b>") return s.substring(3);
      return s;
    })
    .join(" ");
  const words = plainText.trim().split(/\s+/).filter((w) => w.length > 0).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

export default function BlogsSection({ recentBlogs }: BlogsSectionProps) {
  return (
    <div className={`${styles.textContainer} py-4 mt-12 pb-12 text-white`}>
      <PopInBlock>
        <div className="flex items-end justify-between mb-8 pb-6 border-b border-white/15">
          <div>
            <Link href="/blog">
              <span className="font-serif text-4xl font-bold text-white hover:text-gray-300 transition-colors cursor-pointer">
                Writing
              </span>
            </Link>
            <p className="text-gray-500 mt-1 text-sm">Recent posts</p>
          </div>
          <Link
            href="/blog"
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors text-sm"
          >
            All posts
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </PopInBlock>

      {recentBlogs ? (
        recentBlogs.length === 0 ? (
          <PopInBlock>
            <p className="text-gray-600 text-center py-12">No posts yet.</p>
          </PopInBlock>
        ) : (
          <div>
            {recentBlogs.map((data: any, i: number) => (
              <PopInBlock key={data.id}>
                <Link
                  href={`/blogs/${data.id}`}
                  className={`group flex items-start gap-6 py-6 border-b border-white/10 hover:opacity-75 transition-opacity`}
                >
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-serif font-bold text-white mb-2 leading-snug line-clamp-2 transition-colors ${
                        i === 0 ? "text-2xl md:text-3xl" : "text-lg md:text-xl"
                      }`}
                    >
                      {data.title}
                    </h3>
                    {i === 0 && (
                      <p className="text-gray-500 text-sm line-clamp-2 mb-3 leading-relaxed">
                        {getExcerpt(data.content)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-gray-600 text-xs">
                      <span>
                        {new Date(data.datePosted).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span>·</span>
                      <span>{getReadTime(data.content)}</span>
                    </div>
                  </div>

                  {/* Thumbnail */}
                  {data.mediaPic && (
                    <div
                      className={`flex-shrink-0 overflow-hidden rounded-lg ${
                        i === 0 ? "w-24 h-24 md:w-32 md:h-32" : "w-16 h-16 md:w-20 md:h-20"
                      }`}
                    >
                      <img
                        src={data.mediaPic}
                        alt={data.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </Link>
              </PopInBlock>
            ))}
          </div>
        )
      ) : (
        <PopInBlock>
          <p className="text-gray-600 text-center py-12">Loading...</p>
        </PopInBlock>
      )}
    </div>
  );
}
