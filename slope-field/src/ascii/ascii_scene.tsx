import { Canvas } from "@react-three/fiber";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ASCIIMesh } from "./ascii_mesh";
import { EXPERIMENTS_ENABLED } from "../constants";

export type Mode = "home" | "experiments";

export const ASCIIScene = () => {
  const [dims, setDims] = useState<[number, number]>([0, 0]);

  useLayoutEffect(() => {
    const onResize = () => {
      const vh =
        document.querySelector("html")?.clientHeight ?? window.innerHeight;

      setDims([window.innerWidth, vh]);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const [spacing, size, width, height] = useMemo(() => {
    const aspect = dims[0] / dims[1];
    const minSize = Math.min(dims[0], dims[1]);
    const spacing =
      aspect < 3 / 4 ? 22 : minSize < 1000 ? 35 : minSize < 1200 ? 40 : 50;
    const size = spacing * 0.75;

    return [
      spacing,
      size,
      Math.floor(dims[0] / spacing),
      Math.floor(dims[1] / spacing),
    ];
  }, [dims]);

  const scroll = useScroll(dims, spacing);

  const getModeFromHash = () =>
    EXPERIMENTS_ENABLED && (document.location.hash ?? "").match(/experiments/)
      ? "experiments"
      : "home";

  const initialHash = useMemo(() => getModeFromHash(), []);
  const [mode, setMode] = useState<Mode>(initialHash);

  useEffect(() => {
    const onHashChange = (e: HashChangeEvent) => {
      const mode = getModeFromHash();
      setMode(mode);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const onToggleMode = () => {
    setMode((m) => (m === "home" ? "experiments" : "home"));
  };

  const rnd = Math.floor(Math.random() * 100);

  return (
    <>
      <div
        style={{
          position: "fixed",
          width: dims[0],
          height: dims[1],
        }}
      >
        <Canvas
          orthographic={true}
          camera={{
            zoom: 1,
            position: [0, 0, 500],
            near: 1,
            far: 1000,
            left: -dims[0] / 2,
            right: dims[0] / 2,
            top: -dims[1] / 2,
            bottom: dims[1] / 2,
          }}
          style={{ width: dims[0], height: dims[1] }}
          dpr={2}
          onCreated={(state) => {
            state.gl.setClearColor("#000");
          }}
        >
          <ASCIIMesh
            width={width}
            height={height}
            spacing={spacing}
            size={size}
            scroll={scroll}
            mode={mode}
            rnd={rnd}
          />
        </Canvas>
        <ClickArea
          dims={dims}
          spacing={spacing}
          scroll={scroll}
          onToggleMode={onToggleMode}
          mode={mode}
        />
      </div>

      {/* <div style={{ position: "relative", height: "120vh" }}></div> */}
    </>
  );
};

const ClickArea = (props: {
  dims: [number, number];
  spacing: number;
  scroll: number;
  onToggleMode: () => void;
  mode: Mode;
}) => {
  const { dims, scroll, spacing, mode } = props;

  const areas = useMemo(() => {
    //const w = Math.floor(dims[0] / spacing);
    const h = Math.floor(dims[1] / spacing) - 1;
    let l = 1;
    return mode === "home"
      ? [
          EXPERIMENTS_ENABLED
            ? {
                rect: [2, h - 2 * l++, "EXPERIMENTS".length, 1],
                href: "#experiments",
                label: "EXPERIMENTS",
              }
            : undefined,
          {
            rect: [2, h - 2 * l++, 7, 1],
            label: "Email us - hello@hntlabs.com",
            href: "mailto:hello@hntlabs.com",
          },
          {
            rect: [2, h - 2 * l++, 7, 1],
            label: "Follow us on Twitter @hntlabs",
            href: "https://twitter.com/hntlabs",
          },
          {
            rect: [2, h - 2 * l++, "CAREERS".length, 1],
            label: "CAREERS",
            href: "https://herenottherelabs.notion.site/Join-Here-Not-There-3a30870dc33d4b1d90b747728a8585e7",
          },
          {
            rect: [2, h - 2 * l++, 7, 1],
            label: "Sign up for updates",
            href: "https://hntlabs.typeform.com/to/nDXzRRPz",
          },
          {
            rect: [2, h - 2 * l++, "TOWNS".length, 1],
            href: "https://towns.com",
            label: "TOWNS",
          },
        ]
          .filter(notUndefined)
          .reverse()
      : [
          {
            rect: [2, h - 2 * l++, "< BACK".length, 1],
            label: "BACK",
            href: "#",
          },
          {
            rect: [2, h - (1 + 2 * l++), "ChatWallette".length, 1],
            label: "ChatWallette",
            href: "https://chatwallette.xyz",
          },
          {
            rect: [2, h - (1 + 2 * l++), "LUPI".length, 1],
            label: "LUPI",
            href: "https://lupi.gg",
          },
        ].reverse();
  }, [dims, mode, spacing]);

  return (
    <div
      key={mode}
      style={{
        position: "fixed",
        width: dims[0],
        height: dims[1],
        top: -scroll * spacing,
        left: 0,
      }}
    >
      <h1 style={{ opacity: 0 }}>HERE NOT THERE</h1>
      {areas.map(({ rect, label, href }, i) => (
        <a
          aria-label={label}
          title={label}
          key={`area-${i}`}
          href={href}
          style={{
            cursor: "pointer",
            position: "absolute",
            border: "none",
            background: "transparent",
            color: "transparent",
            width: `calc(${spacing}px * ${rect[2]})`,
            height: `calc(${spacing}px * ${rect[3]})`,
            // background: "rgba(255,0,255,0.2)",
            left: `calc(${spacing}px * ${rect[0]} + ${
              (dims[0] % spacing) * 0.5
            }px)`,
            top: `calc(${spacing}px * ${rect[1]} + ${
              (dims[1] % spacing) * 0.5
            }px)`,
          }}
        >
          {label}
        </a>
      ))}
    </div>
  );
};

const useScroll = (dims: [number, number], spacing: number) => {
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const s = Math.floor(((window.scrollY / dims[1]) * dims[1]) / spacing);
      setScroll(s);
    };
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [dims, spacing]);
  return scroll;
};

const notUndefined = <T,>(x: T | undefined): x is T => x !== undefined;
