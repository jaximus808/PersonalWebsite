# Archive

Posts taken off the site but kept word for word. Nothing here is read by the
build or served publicly: `lib/content.ts` only reads `content/blog/` and
`content/projects/`, and the images live here instead of in `public/`.

To bring a post back:

```
git mv content/archive/blog/<slug>.mdx content/blog/
git mv content/archive/blog/<slug> public/blog/<slug>
```

The image paths inside the file (`/blog/<slug>/...`) already point at
`public/blog/<slug>/`, so nothing in the post needs editing.
