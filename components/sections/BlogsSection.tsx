import Link from "next/link";
import styles from "../../styles/Home.module.css";
import { PopInBlock } from "../popinBlockContext";

interface BlogsSectionProps {
  recentBlogs: any[] | undefined;
}

export default function BlogsSection({ recentBlogs }: BlogsSectionProps) {
  return (
    <div
      className={`${styles.textContainer} ${styles.gradentBlock2} py-4 mt-12 pb-12 text-white`}
      style={{ textAlign: "center" }}
    >
      <Link href={"/blog"}>
        <span className="hover:text-[#a3cbff] duration-200 text-[350%] cursor-pointer font-thin">
          Recent Blog 💡
        </span>
      </Link>
      <div className="">
        <div className="mt-2 relative left-1/2 w-1/2 translate-x-[-50%] border-t-2 border-white h-2"></div>
      </div>

      {recentBlogs ? (
        recentBlogs.length === 0 ? (
          <PopInBlock>
            <h3 style={{ textAlign: "center", fontSize: "2vw" }}>
              Sorry blogs could not be loaded, try again!
            </h3>
          </PopInBlock>
        ) : (
          recentBlogs.map((data: any) => (
            <PopInBlock key={data.id}>
              <div
                onClick={() => {
                  window.location.href = `/blogs/${data.id}`;
                }}
                className={`${styles.gradentBlog} bg-[#2C2C2E] hover:bg-[#2C2C2E] pt-4 pb-8 px-8 mt-4 w-3/5 relative left-1/2 translate-x-[-50%] rounded-md cursor-pointer duration-200`}
                style={{ textAlign: "left" }}
              >
                <div>
                  <div className={`flex w-full`}>
                    <div className="w-[15rem] h-[15rem]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="front picture"
                        src={data.mediaPic}
                        style={{
                          borderRadius: "0.5rem",
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4"></div>
                <h2>
                  <div
                    className={`text-2xl font-semibold hover:underline`}
                    style={{ cursor: "pointer", overflowWrap: "break-word" }}
                  >
                    {data.title}
                  </div>
                </h2>
                <div>
                  <h3
                    className="text-lg font-thin"
                    style={{
                      overflow: "hidden",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      display: "-webkit-box",
                    }}
                  >
                    <i>{new Date(data.datePosted).toLocaleDateString()}</i>
                  </h3>
                  <br></br>
                  <h3
                    className="font-light text-sm"
                    style={{
                      overflow: "hidden",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      display: "-webkit-box",
                    }}
                  >
                    {data.content.split("*").map((segment: any, key: any) => {
                      if (segment.length === 0) return "";
                      if (
                        segment.length >= 3 &&
                        segment.substring(0, 3) === "<i>"
                      ) {
                        return "";
                      } else if (
                        segment.length >= 3 &&
                        segment.substring(0, 3) === "<b>"
                      ) {
                        return segment.substring(3);
                      } else {
                        return segment;
                      }
                    })}
                  </h3>
                </div>
              </div>
            </PopInBlock>
          ))
        )
      ) : (
        <PopInBlock>
          <h3 className="text-center text-3xl">Loading...</h3>
        </PopInBlock>
      )}
    </div>
  );
}
