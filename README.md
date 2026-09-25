# Minh Pham — Portfolio

My portfolio is a hand-drawn room, where each piece of furniture stands for part of my life.
Everything starts as a white outline. Hover over a piece and it fills with color and a label
points to it. Click it to open that section.

| Furniture | Section |
| --- | --- |
| Record cabinet + speaker | **Projects** |
| Low table + laptop | **Work** |
| Amp, guitar + basketball | **About** |
| Wall phone | **Contact** |

![The room with the About corner hovered](docs/preview.jpg)

Built with [Next.js](https://nextjs.org) (App Router), React and plain CSS. Panel animations use
[Framer Motion](https://motion.dev).

## Running it

You need [Node.js](https://nodejs.org) 18.18 or newer.

```bash
npm install      # first time only
npm run dev      # start the dev server at http://localhost:3000
```

Other scripts:

```bash
npm run lint     # check the code for mistakes
npm run build    # production build (run this before deploying)
npm start        # serve the production build locally
```

## Where things live

```
app/
  layout.tsx          page <title> and description
  page.tsx            the home page (just renders MinhPortfolio)
  globals.css         all styles, including the color palette at the top
  icon.png            browser-tab icon
components/
  MinhPortfolio.tsx   puts the page together: glow, menu, name, room, panels
  Room.tsx            the furniture, plus where each piece and its label sit
  SectionPanel.tsx    the slide-in panel for each section
  Navigation.tsx      hamburger menu, résumé link and social icons
  GlitchText.tsx      the scrambling "Minh Pham" title
lib/
  content.ts          ALL the words on the site: projects, jobs, about, links
public/
  resume.pdf          the résumé people download
  assets/             drawings, fonts, profile photo and the menu texture
```

## Common edits

### Change what the site says
Everything is in **`lib/content.ts`**:

- `PROFILE`: the tagline under your name and the photo in the About panel
- `ABOUT`: bio, hobbies, education and skills
- `WORK`: jobs, newest first
- `PROJECTS`: project cards
- `SOCIALS` and `CONTACT`: email, links and the Contact panel intro

To add a job or project, copy one of the existing blocks and change the text. To swap the photo,
replace `public/assets/photos/profile.jpg` with a square image around 480×480.

### Update the résumé
Replace `public/resume.pdf` with the new file, keeping the same name. The menu and the Contact
panel both link to it.

### Change the colors
Open `app/globals.css`. The palette is at the top, under `:root`:

```css
--accent: #8c9eff;        /* links, dates, highlights */
--accent-strong: #4f5bd5; /* accent on the white menu */
--accent-deep: #2a1f7a;   /* far edge of the cursor glow */
--accent-tint: rgba(34, 40, 110, 0.45); /* backdrop behind the open menu */
```

### Move a piece of furniture or its label
Open `components/Room.tsx` and edit the `SPOTS` table. Numbers are in "design pixels" of a
1440px-wide room, and the whole room scales to fit the screen, so a value that looks right at
one size looks right at every size.

- `x`, `bottom`, `width`: where the furniture sits.
- `title`, `arrow`: where the label and arrow sit, measured from the furniture's top-left corner.
  `y` is how far **above** the top edge they go.

### Swap a drawing
Each section uses three SVGs in `public/assets/`, all named after the section:

- `<section>-outline.svg`: the white line drawing
- `<section>-colored.svg`: the filled version shown on hover
- `<section>-arrow.svg`: the hand-drawn arrow

Export the outline and colored versions at the same size so they line up.

### Add a new section
1. Add its id to `SectionId`, `SECTION_ORDER` and `SECTION_TITLES` in `lib/content.ts`, then add
   its content there too.
2. Add a component that renders that content to `CONTENT` in `components/SectionPanel.tsx`.
3. Add the three drawings (see above) and a row to `SPOTS` in `components/Room.tsx`.

## Small screens and touch
Below 1024px wide the room is hidden, and the sections appear as text links under the name.
Touch screens can't hover, so there the room shows every piece in color with its label.

## Deploying
The easiest option is [Vercel](https://vercel.com/new). Import this GitHub repo and click Deploy,
because it detects Next.js automatically. After that, every push to `main` redeploys the site.
