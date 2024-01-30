import { useMemo } from "react";
import { createCharTexture } from "./create_ascii_texture";
import { createGradientTexture } from "./create_gradient_texture";

// https://marketplace.visualstudio.com/items?itemName=boyswan.glsl-literal
const glsl = (g: TemplateStringsArray) => g[0];

export const ASCIIMaterial = () => {
  const asciiTexture = useMemo(() => {
    return createCharTexture();
  }, []);

  const gradientTexture = useMemo(() => {
    return createGradientTexture();
  }, []);

  return (
    <shaderMaterial
      transparent={true}
      attach="material"
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={{
        map: { value: asciiTexture },
        gradientMap: { value: gradientTexture },
      }}
    />
  );
};

const vertexShader = glsl`

uniform sampler2D gradientMap;

attribute vec2 uvOffset;
attribute float color;
attribute mat4 instanceMatrix;

varying vec2 v_uv;
varying vec2 v_uvOffset;
varying vec4 v_gradient;

void main() {
  v_uvOffset = uvOffset;
  v_uv = uv;
  v_gradient = texture2D(gradientMap, vec2(color,0.5));
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;

const fragmentShader = glsl`

uniform sampler2D map;

varying vec2 v_uv;
varying vec2 v_uvOffset;
varying vec4 v_gradient;

void main() {
  vec2 uv = v_uv + v_uvOffset;
  vec4 texture = texture2D(map, uv);
  
  gl_FragColor.rgba = vec4(v_gradient.rgb * texture.r, texture.a);
}
`;
