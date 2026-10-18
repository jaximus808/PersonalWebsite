// Blog posts and projects live on disk as MDX: content/blog/<slug>.mdx and
// content/projects/<slug>.mdx, with their images under public/blog/<slug>/ and
// public/projects/<slug>/. See content/README.md for the frontmatter fields.
//
// Server-only: import this from getStaticProps / getStaticPaths (or other
// server code), never from a component.

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { plainText, readingTime } from "./contentText";

const CONTENT_DIR = path.join(process.cwd(), "content");
const EXCERPT_LENGTH = 220;

export type Section = "blog" | "projects";

export type PostMeta = {
  slug: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  cover: string | null;
  excerpt: string;
  readingMinutes: number;
};

export type ProjectLink = { label: string; href: string };

export type ProjectMeta = {
  slug: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  summary: string;
  cover: string | null;
  youtube: string | null;
  featured: boolean;
  links: ProjectLink[];
  /** Leave the cover out of the page header (the body leads with its own media). */
  hideCover: boolean;
};

export type Entry<M> = {
  meta: M;
  source: MDXRemoteSerializeResult;
};

/** The minimum a list (sidebar, prev/next) needs. */
export type EntryLink = { href: string; label: string };

// ---------- reading files ----------

function readSection(section: Section) {
  const dir = path.join(CONTENT_DIR, section);
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const { data, content } = matter(
        fs.readFileSync(path.join(dir, file), "utf8")
      );
      return { slug, data, content };
    });
}

// gray-matter turns a bare YYYY-MM-DD into a Date at UTC midnight.
function toDate(value: unknown, where: string): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${where}: "date" must be YYYY-MM-DD, got ${value}`);
  }
  return date.toISOString().slice(0, 10);
}

function required(data: Record<string, unknown>, key: string, where: string) {
  const value = data[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${where}: frontmatter "${key}" is required`);
  }
  return value.trim();
}

function optional(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const newestFirst = (a: { date: string }, b: { date: string }) =>
  b.date.localeCompare(a.date);

// ---------- blog ----------

function postMeta(slug: string, data: any, content: string): PostMeta {
  const where = `content/blog/${slug}.mdx`;
  const text = plainText(content);
  return {
    slug,
    title: required(data, "title", where),
    date: toDate(data.date, where),
    cover: optional(data, "cover"),
    excerpt:
      text.length > EXCERPT_LENGTH
        ? `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…`
        : text,
    readingMinutes: readingTime(text),
  };
}

export function listPosts(): PostMeta[] {
  return readSection("blog")
    .map(({ slug, data, content }) => postMeta(slug, data, content))
    .sort(newestFirst);
}

export async function getPost(slug: string): Promise<Entry<PostMeta>> {
  const entry = readSection("blog").find((item) => item.slug === slug);
  if (!entry) throw new Error(`No post content/blog/${slug}.mdx`);
  return {
    meta: postMeta(slug, entry.data, entry.content),
    source: await compile(entry.content),
  };
}

// ---------- projects ----------

function projectLinks(value: unknown, where: string): ProjectLink[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${where}: "links" must be a list of { label, href }`);
  }
  return value.map((link) => {
    if (!link?.label || !/^https?:\/\//i.test(link?.href ?? "")) {
      throw new Error(`${where}: each link needs a label and an http(s) href`);
    }
    return { label: String(link.label), href: String(link.href) };
  });
}

function projectMeta(slug: string, data: any): ProjectMeta {
  const where = `content/projects/${slug}.mdx`;
  return {
    slug,
    title: required(data, "title", where),
    date: toDate(data.date, where),
    summary: required(data, "summary", where),
    cover: optional(data, "cover"),
    youtube: optional(data, "youtube"),
    featured: data.featured === true,
    links: projectLinks(data.links, where),
    hideCover: data.hideCover === true,
  };
}

export function listProjects(): ProjectMeta[] {
  return readSection("projects")
    .map(({ slug, data }) => projectMeta(slug, data))
    .sort(newestFirst);
}

export async function getProject(slug: string): Promise<Entry<ProjectMeta>> {
  const entry = readSection("projects").find((item) => item.slug === slug);
  if (!entry) throw new Error(`No project content/projects/${slug}.mdx`);
  return {
    meta: projectMeta(slug, entry.data),
    source: await compile(entry.content),
  };
}

// ---------- links for navigation ----------

export function postLinks(posts = listPosts()): EntryLink[] {
  return posts.map((post) => ({ href: `/blog/${post.slug}`, label: post.title }));
}

export function projectLinksList(projects = listProjects()): EntryLink[] {
  return projects.map((project) => ({
    href: `/projects/${project.slug}`,
    label: project.title,
  }));
}

// ---------- MDX ----------

// A markdown image alone on its line arrives wrapped in a paragraph; lift it
// out so it renders as a block <Figure> (a <figure> inside <p> is invalid).
function remarkUnwrapImages() {
  return (tree: any) => {
    const walk = (node: any) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map((child: any) => {
        if (child.type !== "paragraph") {
          walk(child);
          return child;
        }
        const kids = child.children.filter(
          (kid: any) => !(kid.type === "text" && !kid.value.trim())
        );
        return kids.length === 1 && kids[0].type === "image" ? kids[0] : child;
      });
    };
    walk(tree);
  };
}

function compile(content: string) {
  return serialize(content, {
    // Content is our own, checked into the repo: allow JS expressions in
    // component props, e.g. <Gallery images={["/a.jpg", "/b.jpg"]} />.
    blockJS: false,
    mdxOptions: {
      remarkPlugins: [remarkGfm, remarkUnwrapImages],
      rehypePlugins: [rehypeHighlight],
    },
  });
}
