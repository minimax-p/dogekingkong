// The main site's hand-drawn furniture, shrunk to the game's pixel scale
// for the penthouse. Loaded on first use; drawn once it arrives.

const images = new Map<string, HTMLImageElement>();
const small = new Map<string, HTMLCanvasElement>();

export const pixelArt = (src: string, w: number): HTMLCanvasElement | null => {
    const key = `${src}@${w}`;
    const hit = small.get(key);
    if (hit) return hit;
    let img = images.get(src);
    if (!img) {
        img = new Image();
        img.src = src;
        images.set(src, img);
    }
    if (!img.complete || !img.naturalWidth) return null;
    const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = true;
    g.drawImage(img, 0, 0, w, h);
    // Snap alpha so edges stay crisp, and grade it for a room at night
    const d = g.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
        d.data[i] *= 0.62;
        d.data[i + 1] *= 0.58;
        d.data[i + 2] *= 0.82;
        d.data[i + 3] = d.data[i + 3] > 90 ? 255 : 0;
    }
    g.putImageData(d, 0, 0);
    small.set(key, c);
    return c;
};

// Start loading every furniture image used by these stages
export const preloadImages = (stages: { props?: { kind: string; text?: string; w?: number }[] }[]) => {
    for (const st of stages) for (const p of st.props ?? []) if (p.kind === "furniture") pixelArt(`/assets/${p.text}-colored.svg`, Math.round((p.w ?? 1) * 16));
};
