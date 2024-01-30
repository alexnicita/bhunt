import { Texture } from "three";
import { charList } from "./char_list";

var width = 8;

const textureSize = 1028;

export function getUvsFromChar(char: string) {
  const index = charList.indexOf(char);

  const cx = index % width;
  const cy = Math.floor(index / width);

  const uvs = [];
  const s = 1 / width;
  const x = s * cx;
  const y = s * cy;

  uvs.push(x, y);
  uvs.push(x + s, y);
  uvs.push(x, y + s);
  uvs.push(x + s, y + s);

  return uvs;
}

export function createCharTexture() {
  const cell = textureSize / width;
  const fontSize = cell * 0.8;

  const canvas: HTMLCanvasElement =
    document.querySelector("canvas.chars") || document.createElement("canvas");

  canvas.classList.add("chars");
  // document.body.appendChild(canvas);

  canvas.width = canvas.height = cell * width;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  ctx.fillStyle = "rgb(0,0,0,0)";
  ctx.fillRect(0, 0, canvas.width, canvas.width);
  ctx.fillStyle = "rgb(255,255,255)";

  ctx.font = `${fontSize}px "Space Mono"`;

  const measure = ctx.measureText("A");
  const xOffset = 0 + (cell - measure.width) / 2;
  const yOffset = 0 + (cell - fontSize) / 2 + fontSize * 0.75;

  charList.forEach((l, i) => {
    const x = i % width;
    const y = Math.floor(i / width) + 0;
    ctx?.fillText(charList[i], xOffset + x * cell, yOffset + y * cell);
  });

  // Create a texture from the letter canvas.
  const texture = new Texture(canvas);
  texture.flipY = false;
  texture.needsUpdate = true;

  return texture;
}
