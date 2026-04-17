import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, MeshDistortMaterial, Icosahedron, Float, ContactShadows } from "@react-three/drei";
import Lenis from "lenis";
import * as THREE from "three";

/* ══════════════════════════════════════════════════════════════
   AXIS · CYBER REALITY
   Iridescent organic blob · scroll-driven morph
   Editorial light · serif + mono · Sutéra-adjacent
   ══════════════════════════════════════════════════════════════ */

const INK = "#0a0a0a";
const BG  = "#f5f3ee";
const PAPER = "#ffffff";
const ACCENT = "#5a3ff0";
const TEXT2 = "#555149";
const TEXT3 = "#8d8880";
const BORDER = "rgba(10,10,10,0.12)";

const AGENTS = [
  { num: "01", name: "Voice",   tag: "Jarvis / ElevenLabs" },
  { num: "02", name: "Image",   tag: "DALL·E 3" },
  { num: "03", name: "Video",   tag: "FFmpeg" },
  { num: "04", name: "Music",   tag: "Synthesis" },
  { num: "05", name: "Browse",  tag: "Chromium" },
  { num: "06", name: "Blend",   tag: "Cycles · 4090" },
  { num: "07", name: "Send",    tag: "Telegram" },
];

/* ─── Scroll progress hook ─── */
function useScroll() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return p;
}

/* ─── Lenis smooth scroll ─── */
function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    let raf;
    const loop = t => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);
}

/* ─── The blob ─── */
function Blob({ scrollRef }) {
  const group = useRef();
  const mat = useRef();
  const targetDistort = useRef(0.3);
  const targetSpeed = useRef(1.2);
  const targetScale = useRef(1);

  useFrame((state, dt) => {
    const p = scrollRef.current || 0;
    // Smooth scroll-driven values
    // 0.0 calm small → 0.35 chaotic large → 0.7 iridescent medium → 1.0 settled orb
    const distort =
      p < 0.35 ? THREE.MathUtils.lerp(0.25, 0.85, p / 0.35) :
      p < 0.7  ? THREE.MathUtils.lerp(0.85, 0.45, (p - 0.35) / 0.35) :
                 THREE.MathUtils.lerp(0.45, 0.12, (p - 0.7) / 0.3);

    const scale =
      p < 0.35 ? THREE.MathUtils.lerp(0.85, 1.35, p / 0.35) :
      p < 0.7  ? THREE.MathUtils.lerp(1.35, 1.15, (p - 0.35) / 0.35) :
                 THREE.MathUtils.lerp(1.15, 1.0, (p - 0.7) / 0.3);

    const speed = p < 0.5 ? 1.2 + p * 2 : 2.2 - (p - 0.5) * 2.5;

    targetDistort.current = THREE.MathUtils.lerp(targetDistort.current, distort, dt * 3);
    targetSpeed.current   = THREE.MathUtils.lerp(targetSpeed.current, speed, dt * 3);
    targetScale.current   = THREE.MathUtils.lerp(targetScale.current, scale, dt * 3);

    if (mat.current) {
      mat.current.distort = targetDistort.current;
      mat.current.speed = targetSpeed.current;
    }
    if (group.current) {
      group.current.scale.setScalar(targetScale.current);
      group.current.rotation.y += dt * (0.12 + p * 0.4);
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.1 + p * 0.3;
    }
  });

  return (
    <group ref={group}>
      <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
        <Icosahedron args={[1.1, 64]}>
          <MeshDistortMaterial
            ref={mat}
            color="#c8c4bd"
            metalness={1}
            roughness={0.18}
            iridescence={1}
            iridescenceIOR={1.5}
            iridescenceThicknessRange={[100, 420]}
            clearcoat={1}
            clearcoatRoughness={0.2}
            distort={0.3}
            speed={1.2}
            envMapIntensity={1.6}
          />
        </Icosahedron>
      </Float>
    </group>
  );
}

/* ─── Orbiting agent nodes — emerge on scroll ─── */
function Orbit({ scrollRef }) {
  const group = useRef();
  useFrame((state, dt) => {
    const p = scrollRef.current || 0;
    if (!group.current) return;
    // Emerge between 0.35 and 0.7
    const emerge = THREE.MathUtils.smoothstep(p, 0.32, 0.62);
    const fade = THREE.MathUtils.smoothstep(p, 0.75, 0.92); // fade out as blob settles
    const visibility = emerge * (1 - fade);
    group.current.children.forEach((c, i) => {
      const angle = (i / AGENTS.length) * Math.PI * 2 + state.clock.elapsedTime * 0.15;
      const r = THREE.MathUtils.lerp(1.2, 2.4, emerge);
      c.position.x = Math.cos(angle) * r;
      c.position.z = Math.sin(angle) * r;
      c.position.y = Math.sin(angle * 2 + state.clock.elapsedTime * 0.3) * 0.15;
      c.scale.setScalar(visibility * 0.08);
      c.rotation.x = state.clock.elapsedTime * 0.5;
      c.rotation.y = state.clock.elapsedTime * 0.3;
    });
  });
  return (
    <group ref={group}>
      {AGENTS.map(a => (
        <mesh key={a.num}>
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial color={INK} metalness={1} roughness={0.1} iridescence={0.8} iridescenceIOR={1.4} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── 3D scene (fixed, full viewport) ─── */
function Scene({ scrollRef }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 4.2], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}
    >
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 4, 3]} intensity={1.2} color="#fff4e0" />
      <directionalLight position={[-4, -2, -3]} intensity={0.6} color="#c7b8ff" />
      <Blob scrollRef={scrollRef} />
      <Orbit scrollRef={scrollRef} />
      <Environment preset="studio" />
      <ContactShadows position={[0, -1.6, 0]} opacity={0.28} scale={6} blur={2.4} far={3} />
    </Canvas>
  );
}

/* ─── Section ─── */
function Section({ eyebrow, children, align = "left" }) {
  return (
    <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: align === "right" ? "flex-end" : "flex-start", padding: "0 6vw", position: "relative", zIndex: 2 }}>
      <div style={{ maxWidth: 560, textAlign: align }}>
        {eyebrow && (
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: TEXT3, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 18, fontWeight: 500 }}>
            {eyebrow}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/* ─── Top progress bar ─── */
function ScrollBar({ scrollRef }) {
  const bar = useRef();
  useEffect(() => {
    let raf;
    const loop = () => {
      if (bar.current) bar.current.style.transform = `scaleX(${scrollRef.current || 0})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [scrollRef]);
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: BORDER, zIndex: 50 }}>
      <div ref={bar} style={{ height: "100%", background: ACCENT, width: "100%", transformOrigin: "left", transform: "scaleX(0)" }} />
    </div>
  );
}

/* ─── Header ─── */
function Header() {
  return (
    <header style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "24px 6vw", display: "flex", justifyContent: "space-between", alignItems: "baseline", zIndex: 40, mixBlendMode: "difference", color: "#f5f3ee" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, fontStyle: "italic", letterSpacing: "-0.02em" }}>Axis</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase" }}>— Cyber reality</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase" }}>
        2026 / Studio build
      </div>
    </header>
  );
}

/* ─── Floating edge text ─── */
function EdgeLabels({ scrollRef }) {
  const ref = useRef();
  useEffect(() => {
    let raf;
    const loop = () => {
      if (ref.current) {
        const p = scrollRef.current || 0;
        ref.current.style.opacity = THREE.MathUtils.smoothstep(p, 0.34, 0.5) * (1 - THREE.MathUtils.smoothstep(p, 0.78, 0.92));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [scrollRef]);

  return (
    <div ref={ref} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 3, opacity: 0, transition: "none" }}>
      {AGENTS.map((a, i) => {
        const angle = (i / AGENTS.length) * 360 - 90;
        const rad = (angle * Math.PI) / 180;
        const r = 32; // vh-based pseudo-orbit
        const x = 50 + Math.cos(rad) * r;
        const y = 50 + Math.sin(rad) * r;
        return (
          <div key={a.num} style={{
            position: "absolute",
            left: `${x}%`, top: `${y}%`,
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: TEXT3, letterSpacing: ".18em", fontWeight: 600 }}>{a.num}</div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: INK, fontStyle: "italic", letterSpacing: "-0.01em", marginTop: 4 }}>{a.name}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: TEXT3, letterSpacing: ".14em", marginTop: 3, textTransform: "uppercase" }}>{a.tag}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  useLenis();
  const scrollP = useScroll();
  const scrollRef = useRef(0);
  scrollRef.current = scrollP;

  return (
    <>
      <ScrollBar scrollRef={scrollRef} />
      <Header />
      <Scene scrollRef={scrollRef} />
      <EdgeLabels scrollRef={scrollRef} />

      <Section eyebrow="A. Prelude">
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(48px, 8vw, 112px)", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 0.92, marginBottom: 28, color: INK }}>
          Seven agents.<br /><em style={{ color: ACCENT }}>One axis.</em>
        </h1>
        <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, fontStyle: "italic", color: TEXT2, lineHeight: 1.45, maxWidth: 460 }}>
          An autonomous operating system that routes intent across voice, vision, research and render — then delivers.
        </p>
        <div style={{ marginTop: 40, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".2em", color: TEXT3, textTransform: "uppercase" }}>
          ↓ Scroll to witness
        </div>
      </Section>

      <Section eyebrow="B. Reality under pressure" align="right">
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 24, color: INK }}>
          The shape of <em>thinking</em> is not a line.
        </h2>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: TEXT2, lineHeight: 1.7 }}>
          It folds. It distorts under load. It refracts the question before it refracts the answer. Axis is built to hold all of that at once — the intent, the noise, the seven directions it could go.
        </p>
      </Section>

      <Section eyebrow="C. The seven">
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 32, color: INK }}>
          Each agent — a facet. Each facet — a promise.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px", maxWidth: 520 }}>
          {AGENTS.map(a => (
            <div key={a.num} style={{ borderTop: `1px solid ${BORDER}`, padding: "12px 0" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: TEXT3, letterSpacing: ".16em", fontWeight: 600 }}>{a.num}</div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, color: INK, fontStyle: "italic", letterSpacing: "-0.01em", marginTop: 2 }}>{a.name}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: TEXT3, letterSpacing: ".12em", marginTop: 3, textTransform: "uppercase" }}>{a.tag}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="D. Convergence" align="right">
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 24, color: INK }}>
          Seven streams. <em>One answer.</em>
        </h2>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: TEXT2, lineHeight: 1.7 }}>
          The router reads intent, splits it across the agents best equipped, and reconverges on a single artifact. You speak; it deliberates; it delivers.
        </p>
      </Section>

      <Section eyebrow="E. Stillness">
        <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(48px, 7vw, 96px)", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 0.95, marginBottom: 32, color: INK }}>
          When the work is done,<br /><em>only the axis remains.</em>
        </h2>
        <a href="#" style={{ display: "inline-block", padding: "14px 28px", background: INK, color: PAPER, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, letterSpacing: ".05em", textDecoration: "none", transition: "background 180ms ease" }}
          onMouseEnter={e => e.currentTarget.style.background = ACCENT}
          onMouseLeave={e => e.currentTarget.style.background = INK}>
          Enter the command center →
        </a>
      </Section>

      <footer style={{ padding: "32px 6vw", borderTop: `1px solid ${BORDER}`, position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: TEXT3, letterSpacing: ".16em", textTransform: "uppercase" }}>
        <span>Axis © 2026</span>
        <span>Autonomous · Precise · Sovereign</span>
        <span>Abhijyot Das / Studio</span>
      </footer>
    </>
  );
}
