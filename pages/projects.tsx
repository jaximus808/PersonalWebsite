import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import Header from "../components/header";
import Footer from "../components/footer";
import Background from "../components/backgroundThree";
import { PrismaClient, Prisma, Projects } from "@prisma/client";
import { useState, useEffect, useRef } from "react";
import * as cookies from "cookie";
import Link from "next/link";
import {
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  Star,
  ExternalLink,
} from "lucide-react";

import jsonwebtoken from "jsonwebtoken";

import { GetStaticProps, GetStaticPaths, GetServerSideProps } from "next";
import UnderConstruction from "../components/UnderConstruction";
import YouTube from "react-youtube";
import GradientBG from "../components/gradientbg";

const PROJECTS_PER_PAGE = 6;

function YoutubeVideo(props: any) {
  const opts = {
    height: "100%",
    width: "95%",
    playerVars: {
      autoplay: 0,
    },
  };

  return (
    <div className={`${styles.centerRelX} ${props.className}`}>
      <YouTube
        className="relative flex iterms-center justify-center"
        style={{ width: "100%", height: "100%" }}
        videoId={props.vId}
        opts={opts}
      />
    </div>
  );
}
export const getServerSideProps: GetServerSideProps = async (context) => {
  const parsedCookies = cookies.parse(
    context.req.headers.cookie ? context.req.headers.cookie : ""
  );

  const token = parsedCookies.token;

  let authenticated = false;
  if (!token) {
    authenticated = false;
  } else {
    try {
      jsonwebtoken.verify(token, process.env.ADMIN_PASS!);
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }

  console.log(authenticated);
  return {
    props: {
      auth: authenticated,
    },
  };
};

interface ProjectsPageProps {
  auth: boolean;
}

const ProjectsPage: React.FC<ProjectsPageProps> = ({ auth }) => {
  const [loading, isLoading] = useState(true);
  const [projects, setProjects] = useState<Projects[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);

  async function getInitialData() {
    try {
      const res = await fetch("/api/getProjects/", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      console.log(data);

      setProjects(data.projects ?? []);
      setShowForwardButton(data.projects.length > PROJECTS_PER_PAGE);
      isLoading(false);
      console.log(data);
    } catch (e) {
      return { fail: true, projects: [] };
    }
  }

  useEffect(() => {
    getInitialData();
  }, []);

  const AddProject = async (e: any) => {
    e.preventDefault();
    console.log("Adding project");
    const response = await fetch("/api/admin/addproject", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        customDate === "false"
          ? {
              name: projectName,
              mediaLink: mediaInput,
              youtube: isYoutube,
              description: projectDescription,
              shortDescription: projectShortDesc,
              linkName: projectLinkName,
              favorite: isFavorite,
              projectLinks: projectLinks,
            }
          : {
              name: projectName,
              mediaLink: mediaInput,
              youtube: isYoutube,
              description: projectDescription,
              shortDescription: projectShortDesc,
              linkName: projectLinkName,
              projectDate: projectDate,
              favorite: isFavorite,
              projectLinks: projectLinks,
            }
      ),
    });
    const data = await response.json();
    if (data.pass) {
      location.reload();
    } else {
      setResponse(data.msg);
    }
  };

  const logOut = async () => {
    const logProject = await fetch("/api/admin/logout").then((res) =>
      res.json()
    );
    location.reload();
  };

  const [projectPage, setProjectPage] = useState(0);
  const [showForwardButton, setShowForwardButton] = useState(
    projects.length > PROJECTS_PER_PAGE
  );
  const [showBackButton, setShowBackButton] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [mediaInput, setMediaInput] = useState("");
  const [isYoutube, setIsYoutube] = useState(false);
  const [projectDescription, setProjectDescription] = useState("");
  const [projectShortDesc, setProjectShortDesc] = useState("");
  const [projectLinkName, setProjectLinkName] = useState("");
  const [projectDate, setProjectDate] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [projectLinks, setProjectLinks] = useState("");
  const [responseText, setResponse] = useState("");
  const [customDate, setCustomDate] = useState("false");

  const movePageForward = (): void => {
    if (projects.length > (projectPage + 1) * PROJECTS_PER_PAGE) {
      setProjectPage(projectPage + 1);
      if (
        (projectPage + 1) * PROJECTS_PER_PAGE >=
        projects.length - PROJECTS_PER_PAGE
      ) {
        setShowForwardButton(false);
      }
    }
    setShowBackButton(true);
  };

  const movePageBackward = (): void => {
    if (projectPage > 0) {
      setProjectPage(projectPage - 1);
      if ((projectPage - 1) * PROJECTS_PER_PAGE <= 0) {
        setShowBackButton(false);
      }
    }
    setShowForwardButton(true);
  };

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>): void => {
    AddProject(e);
  };

  return (
    <div>
      <Head>
        <title>Projects | Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <Background />
      <GradientBG />
      <>
        {/* Admin Panel Toggle */}
        {auth && (
          <div className="flex justify-end mb-8 gap-4 px-12">
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="px-6 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all shadow-lg"
            >
              {showAdminPanel ? "Hide Admin Panel" : "Show Admin Panel"}
            </button>
            <button
              onClick={logOut}
              className="px-6 py-2 bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-lg text-white hover:bg-red-500/30 transition-all shadow-lg"
            >
              Logout
            </button>
          </div>
        )}

        {/* Admin Form */}
        {auth && showAdminPanel && (
          <div className="mb-12 bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl mx-12">
            <h2 className="text-2xl font-bold text-white mb-6">
              Create New Project
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-white mb-2 font-medium">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Enter project name..."
                  required
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">
                  Media Link (Image URL or YouTube ID)
                </label>
                <input
                  type="text"
                  value={mediaInput}
                  onChange={(e) => setMediaInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Enter media link..."
                  required
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={isYoutube}
                    onChange={(e) => setIsYoutube(e.target.checked)}
                    className="mr-2"
                  />
                  Is YouTube video
                </label>
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={isFavorite}
                    onChange={(e) => setIsFavorite(e.target.checked)}
                    className="mr-2"
                  />
                  Mark as favorite
                </label>
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">
                  Short Description
                </label>
                <input
                  type="text"
                  value={projectShortDesc}
                  onChange={(e) => setProjectShortDesc(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Brief description..."
                  required
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">
                  Full Description
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
                  placeholder="Write full project description..."
                  required
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">
                  Project Links (comma-separated URLs)
                </label>
                <input
                  type="text"
                  value={projectLinks}
                  onChange={(e) => setProjectLinks(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="https://github.com/..., https://demo.com/..."
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">
                  Link Display Name
                </label>
                <input
                  type="text"
                  value={projectLinkName}
                  onChange={(e) => setProjectLinkName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="GitHub, Live Demo, etc."
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={customDate === "true"}
                    onChange={(e) =>
                      setCustomDate(e.target.checked ? "true" : "false")
                    }
                    className="mr-2"
                  />
                  Use custom date
                </label>
              </div>

              {customDate === "true" && (
                <div>
                  <label className="block text-white mb-2 font-medium">
                    Project Date
                  </label>
                  <input
                    type="text"
                    value={projectDate}
                    onChange={(e) => setProjectDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                    placeholder="e.g., January 2024"
                  />
                </div>
              )}

              {responseText && (
                <div className="text-red-300 bg-red-500/20 px-4 py-2 rounded-lg">
                  {responseText}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                className="w-full px-6 py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white font-semibold hover:bg-white/30 transition-all shadow-lg"
              >
                Publish Project
              </button>
            </div>
          </div>
        )}

        <div>
          <h1 className="text-5xl font-bold text-white mb-8 text-center mt-10">
            My Projects
          </h1>
          <div className="">
            <div className="mt-2 relative left-1/2 w-1/2 translate-x-[-50%] border-t-2 border-white h-2 "></div>
          </div>
        </div>

        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-white text-2xl">Projects Loading...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 py-4 px-12">
              {projects
                .slice(
                  projectPage * PROJECTS_PER_PAGE,
                  Math.min(
                    (projectPage + 1) * PROJECTS_PER_PAGE,
                    projects.length
                  )
                )
                .map((project) => (
                  <Link
                    key={project.id}
                    className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 cursor-pointer group relative"
                    href={`/projects/${project.name}`}
                  >
                    {/* Favorite Badge */}
                    {project.favorite && (
                      <div className="absolute top-4 right-4 bg-yellow-500/90 backdrop-blur-sm rounded-full p-2 z-10">
                        <Star className="w-5 h-5 text-white fill-white" />
                      </div>
                    )}

                    {/* Project Media */}
                    {project.mediaLink && (
                      <div className="mb-4 rounded-xl overflow-hidden">
                        {project.youtube ? (
                          <div className="aspect-video flex items-center justify-center">
                            <YoutubeVideo
                              className={"h-full w-full rounded-lg"}
                              vId={project.mediaLink}
                            />
                          </div>
                        ) : (
                          <img
                            src={project.mediaLink}
                            alt={project.name}
                            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        )}
                      </div>
                    )}

                    {/* Project Name */}
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-200 transition-colors truncate">
                      {project.name.replace(/_/g, " ")}
                    </h3>

                    {/* Project Date */}
                    {project.projectDate && (
                      <div className="flex items-center text-white/70 mb-4">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="text-sm">{project.projectDate}</span>
                      </div>
                    )}

                    {/* Short Description */}
                    <p className="text-white/80 mb-4 line-clamp-2">
                      <div className="text-white/80 line-clamp-3 mb-4">
                        {project.shortDescription
                          .split("*")
                          .map((data: any, key: any) => {
                            if (data.length == 0) return <div key={key}></div>;
                            if (
                              data.length >= 3 &&
                              data.substring(0, 3) == "<i>"
                            ) {
                              return <></>;
                            } else if (
                              data.length >= 3 &&
                              data.substring(0, 3) == "<b>"
                            ) {
                              return (
                                <h3
                                  key={key}
                                  className="font-bold"
                                  style={{ whiteSpace: "pre-wrap" }}
                                >
                                  {data.substring(3)}
                                </h3>
                              );
                            } else {
                              return (
                                <h3
                                  key={key}
                                  style={{ whiteSpace: "pre-wrap" }}
                                >
                                  {data}
                                </h3>
                              );
                            }
                          })}
                      </div>
                    </p>

                    {/* Project Links */}
                    {project.projectLinks && (
                      <div className="flex items-center text-white/70 mb-4">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        <span className="text-sm">
                          {project.linkName || "View Links"}
                        </span>
                      </div>
                    )}

                    <div className="text-blue-300 font-medium group-hover:text-blue-200 flex items-center">
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
            </div>

            {/* Pagination */}
            {projects.length > PROJECTS_PER_PAGE && (
              <div className="flex justify-center items-center gap-4 pb-12">
                <button
                  onClick={movePageBackward}
                  disabled={!showBackButton}
                  className={`px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white flex items-center gap-2 transition-all shadow-lg ${
                    showBackButton
                      ? "hover:bg-white/20 cursor-pointer"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                  Previous
                </button>

                <span className="text-white bg-white/10 backdrop-blur-md px-6 py-3 rounded-lg border border-white/20">
                  Page {projectPage + 1} of{" "}
                  {Math.ceil(projects.length / PROJECTS_PER_PAGE)}
                </span>

                <button
                  onClick={movePageForward}
                  disabled={!showForwardButton}
                  className={`px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white flex items-center gap-2 transition-all shadow-lg ${
                    showForwardButton
                      ? "hover:bg-white/20 cursor-pointer"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  Next
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </>

      <Footer authenticated={false} authSense={false} />
    </div>
  );
};

export default ProjectsPage;
