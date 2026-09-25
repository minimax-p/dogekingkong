// WebGL2 post-processing. Pass 1 composites the three low-res layers, with
// the slow-motion grade on the world layer only. Pass 2 blurs the bright
// parts for bloom. Pass 3 scales up with crisp pixels and adds color
// fringing, scanlines, grain, vignette and the VHS look for tapes.
import { H, W } from "@/game/engine/constants";

export type PostParams = {
    time: number;
    focus: number; // 0..1
    ca: number; // color fringing, pixels
    vhs: number; // 0..1 tape look
    rewind: number; // 0..1 extra tape distortion
    flash: number; // 0..1 white flash
    dark: number; // 0..1 fade to black
    bloom: number;
    scan: number;
    grain: number;
    reduced: boolean;
    death: number; // 0..1 desaturate toward red after dying
};

const VS = `#version 300 es
in vec2 p;
out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const COMPOSITE = `#version 300 es
precision mediump float;
in vec2 uv;
out vec4 o;
uniform sampler2D uWorld, uActors, uHud;
uniform float uFocus, uFlash, uDeath, uDark;
void main() {
    vec2 t = vec2(uv.x, 1.0 - uv.y);
    vec3 w = texture(uWorld, t).rgb;
    vec4 a = texture(uActors, t);
    vec4 h = texture(uHud, t);
    // Slow motion: the set loses color, cools and darkens; actors stay neon
    float l = dot(w, vec3(0.299, 0.587, 0.114));
    vec3 cool = mix(w, vec3(l) * vec3(0.78, 0.86, 1.18), 0.72);
    w = mix(w, cool * 0.88, uFocus);
    vec3 act = a.rgb;
    float al = dot(act, vec3(0.299, 0.587, 0.114));
    act = mix(act, mix(vec3(al), act, 1.25), uFocus);
    vec3 c = mix(w, act, a.a);
    // After a death, everything but the red drains away
    float cl = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(c, vec3(cl * 1.1, cl * 0.35, cl * 0.5), uDeath * 0.8);
    c = mix(c, vec3(1.0), uFlash);
    c = mix(c, h.rgb, h.a);
    c *= 1.0 - uDark;
    o = vec4(c, 1.0);
}`;

const BRIGHT = `#version 300 es
precision mediump float;
in vec2 uv;
out vec4 o;
uniform sampler2D uSrc;
void main() {
    vec3 c = texture(uSrc, uv).rgb;
    float l = max(c.r, max(c.g, c.b));
    o = vec4(c * smoothstep(0.55, 0.95, l), 1.0);
}`;

const BLUR = `#version 300 es
precision mediump float;
in vec2 uv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uDir;
void main() {
    vec3 c = texture(uSrc, uv).rgb * 0.227;
    c += texture(uSrc, uv + uDir * 1.385).rgb * 0.316;
    c += texture(uSrc, uv - uDir * 1.385).rgb * 0.316;
    c += texture(uSrc, uv + uDir * 3.231).rgb * 0.07;
    c += texture(uSrc, uv - uDir * 3.231).rgb * 0.07;
    o = vec4(c, 1.0);
}`;

const FINAL = `#version 300 es
precision mediump float;
in vec2 uv;
out vec4 o;
uniform sampler2D uSrc, uBloom;
uniform vec2 uSrcRes, uOutRes;
uniform float uTime, uCA, uVHS, uRew, uBloomAmt, uScan, uGrain, uFocus;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// Crisp pixels at any scale: sharp edges between texels, smooth only at the seam
vec2 sharp(vec2 u) {
    vec2 texel = u * uSrcRes;
    vec2 scale = max(floor(uOutRes / uSrcRes), vec2(1.0));
    vec2 fl = floor(texel);
    vec2 f = fract(texel);
    vec2 range_ = 0.5 - 0.5 / scale;
    vec2 cd = f - 0.5;
    vec2 ff = (cd - clamp(cd, -range_, range_)) * scale + 0.5;
    return (fl + ff) / uSrcRes;
}

void main() {
    vec2 u = uv;
    // Tape wobble: lines jitter sideways, a tracking band rolls down the screen
    if (uVHS > 0.0) {
        float line = floor(u.y * uSrcRes.y);
        float jitter = (hash(vec2(line, floor(uTime * 20.0))) - 0.5) * 0.0025 * uVHS;
        float band = smoothstep(0.03, 0.0, abs(fract(u.y + uTime * 0.13) - 0.5));
        jitter += band * (hash(vec2(line, uTime)) - 0.5) * 0.02 * (uVHS + uRew * 2.0);
        jitter += sin(u.y * 40.0 + uTime * 30.0) * 0.004 * uRew;
        u.x += jitter;
    }
    vec2 px = 1.0 / uSrcRes;
    float ca = uCA * px.x;
    vec3 c;
    c.r = texture(uSrc, sharp(u + vec2(ca, 0.0))).r;
    c.g = texture(uSrc, sharp(u)).g;
    c.b = texture(uSrc, sharp(u - vec2(ca, 0.0))).b;
    if (uVHS > 0.0) {
        // Chroma bleeds to the right; the picture goes a little soft and warm
        vec3 bleed = texture(uSrc, u - vec2(px.x * 2.0, 0.0)).rgb;
        c = mix(c, vec3(c.r * 0.7 + bleed.r * 0.3, c.g, c.b * 0.6 + bleed.b * 0.4), uVHS);
        c = mix(c, c * vec3(1.05, 0.97, 1.02), uVHS);
    }
    c += texture(uBloom, u).rgb * uBloomAmt;
    // Scanlines at the low-res pixel rows
    float row = fract(u.y * uSrcRes.y);
    c *= 1.0 - uScan * smoothstep(0.35, 0.5, abs(row - 0.5));
    // Vignette, tighter in slow motion
    vec2 d = uv - 0.5;
    float vig = smoothstep(0.85 - uFocus * 0.2, 0.25, length(d * vec2(1.0, 1.15)));
    c *= mix(0.55, 1.0, vig);
    // Grain and tape noise
    float n = hash(uv * uOutRes + fract(uTime) * 100.0) - 0.5;
    c += n * (uGrain + uVHS * 0.08 + uRew * 0.12);
    if (uRew > 0.0 || uVHS > 0.0) {
        float streak = step(0.997 - uRew * 0.01, hash(vec2(floor(uv.y * 90.0), floor(uTime * 15.0))));
        c += streak * 0.35 * (uVHS + uRew);
    }
    o = vec4(c, 1.0);
}`;

type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };

export type Post = {
    render: (sources: HTMLCanvasElement[], params: PostParams) => void;
    resize: (w: number, h: number) => void;
    gl: boolean;
};

export const makePost = (display: HTMLCanvasElement): Post => {
    const gl = display.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) return fallbackPost(display);

    const compile = (fsSrc: string, uniforms: string[]): Prog => {
        const sh = (type: number, src: string) => {
            const s = gl.createShader(type)!;
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
            return s;
        };
        const p = gl.createProgram()!;
        gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
        gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsSrc));
        gl.bindAttribLocation(p, 0, "p");
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
        const u: Prog["u"] = {};
        for (const n of uniforms) u[n] = gl.getUniformLocation(p, n);
        return { p, u };
    };

    const composite = compile(COMPOSITE, ["uWorld", "uActors", "uHud", "uFocus", "uFlash", "uDeath", "uDark"]);
    const bright = compile(BRIGHT, ["uSrc"]);
    const blur = compile(BLUR, ["uSrc", "uDir"]);
    const final = compile(FINAL, ["uSrc", "uBloom", "uSrcRes", "uOutRes", "uTime", "uCA", "uVHS", "uRew", "uBloomAmt", "uScan", "uGrain", "uFocus"]);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const tex = (w: number, h: number, filter: number) => {
        const t = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return t;
    };
    const fbo = (t: WebGLTexture) => {
        const f = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        return f;
    };

    const srcTex = [tex(W, H, gl.NEAREST), tex(W, H, gl.NEAREST), tex(W, H, gl.NEAREST)];
    const compTex = tex(W, H, gl.LINEAR);
    const compFbo = fbo(compTex);
    const bw = W / 2;
    const bh = H / 2;
    const bloomA = tex(bw, bh, gl.LINEAR);
    const bloomB = tex(bw, bh, gl.LINEAR);
    const bloomAF = fbo(bloomA);
    const bloomBF = fbo(bloomB);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const bind = (unit: number, t: WebGLTexture, loc: WebGLUniformLocation | null) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.uniform1i(loc, unit);
    };

    let outW = display.width;
    let outH = display.height;

    return {
        gl: true,
        resize: (w, h) => {
            outW = w;
            outH = h;
        },
        render: (sources, P) => {
            sources.forEach((c, i) => {
                gl.bindTexture(gl.TEXTURE_2D, srcTex[i]);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
            });
            // 1. Composite
            gl.bindFramebuffer(gl.FRAMEBUFFER, compFbo);
            gl.viewport(0, 0, W, H);
            gl.useProgram(composite.p);
            bind(0, srcTex[0], composite.u.uWorld);
            bind(1, srcTex[1], composite.u.uActors);
            bind(2, srcTex[2], composite.u.uHud);
            gl.uniform1f(composite.u.uFocus, P.focus);
            gl.uniform1f(composite.u.uFlash, P.reduced ? P.flash * 0.3 : P.flash);
            gl.uniform1f(composite.u.uDeath, P.death);
            gl.uniform1f(composite.u.uDark, P.dark);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            // 2. Bloom
            gl.viewport(0, 0, bw, bh);
            gl.bindFramebuffer(gl.FRAMEBUFFER, bloomAF);
            gl.useProgram(bright.p);
            bind(0, compTex, bright.u.uSrc);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.useProgram(blur.p);
            for (let i = 0; i < 2; i++) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, bloomBF);
                bind(0, bloomA, blur.u.uSrc);
                gl.uniform2f(blur.u.uDir, 1 / bw, 0);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                gl.bindFramebuffer(gl.FRAMEBUFFER, bloomAF);
                bind(0, bloomB, blur.u.uSrc);
                gl.uniform2f(blur.u.uDir, 0, 1 / bh);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
            // 3. Final
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, outW, outH);
            gl.useProgram(final.p);
            bind(0, compTex, final.u.uSrc);
            bind(1, bloomA, final.u.uBloom);
            gl.uniform2f(final.u.uSrcRes, W, H);
            gl.uniform2f(final.u.uOutRes, outW, outH);
            gl.uniform1f(final.u.uTime, P.time);
            gl.uniform1f(final.u.uCA, P.reduced ? 0 : P.ca);
            gl.uniform1f(final.u.uVHS, P.vhs);
            gl.uniform1f(final.u.uRew, P.reduced ? P.rewind * 0.3 : P.rewind);
            gl.uniform1f(final.u.uBloomAmt, P.bloom);
            gl.uniform1f(final.u.uScan, P.scan);
            gl.uniform1f(final.u.uGrain, P.reduced ? 0 : P.grain);
            gl.uniform1f(final.u.uFocus, P.focus);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        },
    };
};

// Without WebGL: stack the layers and scale them up, no effects
const fallbackPost = (display: HTMLCanvasElement): Post => {
    const g = display.getContext("2d")!;
    return {
        gl: false,
        resize: () => {
            g.imageSmoothingEnabled = false;
        },
        render: (sources, P) => {
            g.imageSmoothingEnabled = false;
            for (const c of sources) g.drawImage(c, 0, 0, display.width, display.height);
            if (P.dark > 0) {
                g.fillStyle = `rgba(0,0,0,${P.dark})`;
                g.fillRect(0, 0, display.width, display.height);
            }
        },
    };
};
