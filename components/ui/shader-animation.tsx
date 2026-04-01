"use client"
import { useEffect, useRef } from "react"

export function ShaderAnimation({ className = "w-full h-full" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl")
    if (!gl) return

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth * Math.min(window.devicePixelRatio, 2)
      canvas.height = parent.clientHeight * Math.min(window.devicePixelRatio, 2)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const vertSrc = `
      attribute vec2 a_pos;
      void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `

    const fragSrc = `
      precision highp float;
      uniform vec2 u_res;
      uniform float u_time;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - u_res) / min(u_res.x, u_res.y);

        float d = length(p) * 0.05;
        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);

        float r = 0.05 / abs(p.y + sin((rx + u_time) * 1.0) * 0.5);
        float g = 0.05 / abs(p.y + sin((gx + u_time) * 1.0) * 0.5);
        float b = 0.05 / abs(p.y + sin((bx + u_time) * 1.0) * 0.5);

        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("Shader error:", gl.getShaderInfoLog(s))
      }
      return s
    }

    const vs = compile(gl.VERTEX_SHADER, vertSrc)
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc)

    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("Link error:", gl.getProgramInfoLog(prog))
      return
    }

    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)

    const aPos = gl.getAttribLocation(prog, "a_pos")
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, "u_res")
    const uTime = gl.getUniformLocation(prog, "u_time")

    resize()
    window.addEventListener("resize", resize)

    const start = performance.now()
    let animId: number
    let isVisible = true

    const render = () => {
      if (!isVisible) { animId = requestAnimationFrame(render); return }
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, (performance.now() - start) * 0.001)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      animId = requestAnimationFrame(render)
    }
    animId = requestAnimationFrame(render)

    // Pause rendering when off-screen
    const observer = new IntersectionObserver(
      ([e]) => { isVisible = e.isIntersecting },
      { threshold: 0.1 }
    )
    observer.observe(canvas)

    return () => {
      cancelAnimationFrame(animId)
      observer.disconnect()
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <div className={className} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  )
}
