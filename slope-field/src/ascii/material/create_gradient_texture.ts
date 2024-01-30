import { Texture } from "three";

export function createGradientTexture() {
  const canvas: HTMLCanvasElement =
    document.querySelector("canvas.gradient") ||
    document.createElement("canvas");

  canvas.classList.add("gradient");
  // document.body.appendChild(canvas);

  canvas.height = 8;
  canvas.width = 256;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("failed to get 2d context");
  }
  const gradient = ctx?.createLinearGradient(0, 0, canvas.width, 0);
  const rainbow = [
    "#FFFFFF",
    "#51FF62",
    "#51FFF5",
    "#6F86FF",
    "#BF37FF",
    "#FF37DF",
    "#A383FF",
  ];
  rainbow.forEach((color, i) => {
    gradient?.addColorStop(i / (rainbow.length - 1), color);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}
