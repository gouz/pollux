# Custom pages

How to add custom HTML pages, styles, and scripts to Pollux.

## Adding a page

Create your HTML file in `src/layout/`:

```html
<!-- src/layout/hello.html -->
<h1>Hello, world!</h1>
```

Import it in `src/index.ts` and add a route:

```typescript
import helloPage from "./layout/hello.html" with { type: "text" };
import { html } from "./routes/helpers";
import { pages } from "./routes/pages";

// Add to the pages object
export const extraPages = {
  "/hello": () => html(helloPage),
};
```

Then spread it into the routes in `src/index.ts`:

```typescript
routes: {
  ...pages,
  ...extraPages,
  // ...
}
```

## Adding scripts

1. Create your JavaScript file in `src/scripts/`
2. Include it in your HTML with `<script src="/scripts/your-script.js"></script>`
3. Add a route in `src/routes/assets.ts`:

```typescript
import helloJs from "../scripts/hello.js" with { type: "text" };
```

Add the route:

```typescript
"/scripts/hello.js": () => js(helloJs),
```

## Adding styles

1. Create your CSS file in `src/styles/`
2. Include it in your HTML with `<link rel="stylesheet" href="/styles/your-style.css" />`
3. Add a route in `src/routes/assets.ts`:

```typescript
import helloCss from "../styles/hello.css" with { type: "text" };

// Add the route:
"/styles/hello.css": () => new Response(helloCss, {
  headers: { "Content-Type": "text/css" },
}),
```

## Inline JavaScript helpers

Pollux provides two global helpers available in all pages:

- `parseColorString(str)` — Parses `text|color` format and returns `{ text, color }`
- `createError(msg)` — returns a styled error element
- `isUUIDv7(str)` — validates a UUIDv7 string
