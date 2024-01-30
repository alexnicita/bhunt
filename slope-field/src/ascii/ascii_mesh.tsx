import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  InstancedBufferGeometry,
  Matrix4,
  Mesh,
  PlaneGeometry,
  // PlaneBufferGeometry,
} from "three";
import { Mode } from "./ascii_scene";
import { ASCIIMaterial } from "./material/ascii_material";
import { getUvsFromChar } from "./material/create_ascii_texture";
import { EXPERIMENTS_ENABLED } from "../constants";

const matrixTranslation = new Matrix4();
const matrix = new Matrix4();
const PI2 = Math.PI * 2;
const PI8 = Math.PI * 8;

interface Props {
  width: number;
  height: number;
  size: number;
  spacing: number;
  scroll: number;
  mode: Mode;
  rnd?: number;
}

export function ASCIIMesh(props: Props) {
  const ref = useRef<Mesh<InstancedBufferGeometry> | null>(null);

  const { width, height, spacing, scroll, size, mode, rnd } = props;
  const squareSize = size;

  const instances = width * height;

  const baseGeom = useMemo(() => {
    return new PlaneGeometry(squareSize, squareSize);
  }, [squareSize]);

  const uvs = useMemo(() => {
    return new Float32Array(getUvsFromChar("A"));
  }, []);

  const attributeData = useMemo(() => {
    return setupMeshData(width, height, spacing, scroll, mode, rnd);
  }, [height, mode, rnd, scroll, spacing, width]);

  const { mouseRef, idleRef } = useMouse();

  const frameData: [number, number, number][] = useMemo(() => {
    return Array(instances)
      .fill(undefined)
      .map((i) => [0, 0, 0]);
  }, [instances]);

  const frameRef = useRef(0);
  const idleProgressRef = useRef(idleRef.current);

  useFrame(() => {
    const mesh = ref.current;
    frameRef.current++;
    idleProgressRef.current +=
      (idleRef.current - idleProgressRef.current) *
      (idleRef.current ? 0.005 : 0.02);

    if (!mesh) {
      return;
    }

    mouseRef.current.v *= 0.99;

    const instanceMatrix = mesh?.geometry.getAttribute("instanceMatrix")
      .array as Float32Array;

    const colorAttributes = mesh?.geometry.getAttribute("color")
      .array as Float32Array;

    for (var i = 0; i < instances; i++) {
      const x = attributeData.positions[i * 3 + 0];
      const y = attributeData.positions[i * 3 + 1];

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const mv = mouseRef.current.v / 100;

      const ly = -y / 1 - my;
      const lx = x / 1 - mx;

      let angle = Math.PI * -0.5 + Math.atan2(ly, lx);

      const dist = Math.sqrt(lx * lx + ly * ly);

      frameData[i][2] = Math.max(0, Math.min(1, dist / 10)) * mv;
      frameData[i][2] *= 0.9;

      if (Math.abs(angle - frameData[i][0]) > Math.PI) {
        const diff = ((angle + PI8) % PI2) - ((frameData[i][0] + PI8) % PI2);
        frameData[i][0] = angle - diff;
      }

      if (attributeData.cellType[i]) {
        // text chars - no movement applied
        frameData[i][1] =
          idleProgressRef.current *
          (Math.cos(idleProgressRef.current * 0.1 + y * 3) * 0.25 + 0.5);
        frameData[i][0] = 0;
      } else if (Math.abs(dist) < 150 + Math.max(0, 50 - mv * 50)) {
        // chars close to mouse pointer
        frameData[i][1] = Math.max(0, 1 * frameData[i][2]);
      } else {
        // other chars
        frameData[i][1] += (0 - frameData[i][1]) * 0.05;
      }

      colorAttributes[i] = frameData[i][1];

      const attenuation = 0.2 * Math.max(0.1, frameData[i][1]);
      frameData[i][0] += (angle - frameData[i][0]) * attenuation;

      const f = frameRef.current;
      const randomAngle = attributeData.cellType[i]
        ? 0
        : idleProgressRef.current *
          (Math.cos((f + x * 0.5) * 0.01) + Math.sin((f + y * 0.02) * 0.01));
      // const s = 1 + (attributeData.cellType[i] ? 0 : randomAngle * 0.1 * (1 - frameData[i][1]));

      matrix
        .identity()
        .makeTranslation(x, y, 0)
        // .multiply(matrixTranslation.makeScale(s, s, s))
        .multiply(
          matrixTranslation.makeRotationZ(
            attributeData.cellType[i] ? 0 : -frameData[i][0] + randomAngle
          )
        );

      const slice = matrix.toArray();

      for (var j = 0; j < 16; j++) {
        instanceMatrix[16 * i + j] = slice[j];
      }
    }

    mesh.geometry.attributes.instanceMatrix.needsUpdate = true;
    mesh.geometry.attributes.color.needsUpdate = true;
  });

  // prevents buffer overflow occurring when number of instances is not in sync
  const resetKey = `buffer-${instances + scroll + mode}`;

  return (
    <mesh ref={ref}>
      <instancedBufferGeometry
        index={baseGeom.index}
        instanceCount={instances}
        attributes-position={baseGeom.attributes.position}
      >
        <bufferAttribute
          attach="attributes-uv"
          array={uvs}
          itemSize={2}
          count={4}
        />

        <instancedBufferAttribute
          key={resetKey}
          attach="attributes-uvOffset"
          array={new Float32Array(attributeData.uvs)}
          itemSize={2}
          count={instances}
        />

        <instancedBufferAttribute
          attach="attributes-color"
          array={new Float32Array(attributeData.color)}
          itemSize={1}
          count={instances}
        />

        <instancedBufferAttribute
          itemSize={16}
          count={instances}
          attach="attributes-instanceMatrix"
          array={new Float32Array(attributeData.instanceMatrix)}
        />
      </instancedBufferGeometry>
      <ASCIIMaterial />
    </mesh>
  );
}

function setupMeshData(
  width: number,
  height: number,
  spacing = 1,
  scroll = 0,
  mode: Mode = "experiments",
  rnd = 0
) {
  const instances = width * height;
  const data: {
    positions: number[];
    cellType: boolean[];
    instanceMatrix: number[];
    color: number[];
    uvs: number[];
  } = {
    positions: [],
    instanceMatrix: [],
    uvs: [],
    color: new Array(instances).fill(0),
    // true to flag static text
    cellType: [],
  };

  const text: string[] = [];

  function insertText(text: string[], str: string, pos: number) {
    const a = str.split("");
    a.forEach((s, i) => (text[pos + i] = s));
  }

  function insertHereNotThere() {
    const topRow = Math.floor(height) + scroll,
      bottomRow = 0 + scroll,
      col = 2;

    insertText(text, "HERE", width * (topRow - 3) + col);
    insertText(text, "NOT", width * (topRow - 5) + col);
    insertText(text, "THERE", width * (topRow - 7) + col);

    if (mode === "home") {
      let l = 1;
      if (EXPERIMENTS_ENABLED) {
        insertText(text, "EXPERIMENTS", width * (bottomRow + l++ * 2) + col);
      }
      insertText(text, "CONTACT", width * (bottomRow + l++ * 2) + col);
      insertText(text, "TWITTER", width * (bottomRow + l++ * 2) + col);
      insertText(text, "CAREERS", width * (bottomRow + l++ * 2) + col);
      insertText(text, "UPDATES", width * (bottomRow + l++ * 2) + col);
      insertText(text, "TOWNS", width * (bottomRow + l++ * 2) + col);
    } else {
      let l = 1;
      insertText(text, "<BACK", width * (bottomRow + l++ * 2) + col);
      insertText(text, "CHATWALLETTE", width * (bottomRow + 1 + l++ * 2) + col);
      insertText(text, "LUPI", width * (bottomRow + 1 + l++ * 2) + col);
    }
  }

  /**
   .split("")
        .sort(() => Math.random() - 0.5)
        .join("")
        .substring(0, 7)
   */
  insertHereNotThere();

  const useRandomChars = false;
  const randomChars = "////////////abcdef019876543210".split("");

  const hcenter = (spacing * width) / 2;
  const vcenter = (spacing * height) / 2;

  for (let char, uv, sx, sy, x, y, i = 0; i < instances; i++) {
    sx = i % width;
    sy = Math.floor(i / width);
    x = -hcenter + spacing * sx + spacing / 2;
    y = -vcenter + spacing * sy + spacing / 2;
    data.positions.push(x, y, 0);

    char =
      text[i] ??
      (!useRandomChars
        ? "|"
        : randomChars[~~(Math.random() * randomChars.length)]);

    data.cellType.push(!!text[i]);

    uv = getUvsFromChar(char);
    data.uvs.push(uv[0], uv[1]);

    matrix.identity();
    data.instanceMatrix.push(...matrix.toArray());
  }

  return data;
}

const useMouse = () => {
  const [idle, setIdle] = useState(true);
  const idleRef = useRef(1);
  const mouseRef = useRef({ x: 0, y: 0, v: 0 });

  useEffect(() => {
    if (!idle) {
      const timeout = setTimeout(() => {
        setIdle(true);
      }, 4000);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [idle]);

  useEffect(() => {
    const update = (dx: number, dy: number) => {
      const x = -window.innerWidth * 0.5 + dx;
      const y = -window.innerHeight * 0.5 + dy;

      const lx = Math.abs(x - mouseRef.current.x);
      const ly = Math.abs(y - mouseRef.current.y);
      const v = lx + ly;

      mouseRef.current.v = Math.max(mouseRef.current.v, v);
      mouseRef.current.x = x;
      mouseRef.current.y = y;
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      update(t.clientX, t.clientY);
      setIdle(false);
    };

    const onMouseMove = (e: MouseEvent) => {
      update(e.clientX, e.clientY);
      setIdle(false);
    };

    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  idleRef.current = idle ? 1 : 0;

  return { mouseRef, idleRef };
};
