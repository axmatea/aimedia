"use client"
import { useEffect, useRef } from "react"
import * as THREE from "three"

export function ShaderAnimation({ className = "w-full h-full" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{ renderer: THREE.WebGLRenderer; uniforms: any; animationId: number } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    const vertexShader = `void main(){gl_Position=vec4(position,1.0);}`
    const fragmentShader = `
      #define TWO_PI 6.2831853072
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      void main(void){
        vec2 uv=(gl_FragCoord.xy*2.0-resolution.xy)/min(resolution.x,resolution.y);
        float t=time*0.04;
        float lineWidth=0.002;
        vec3 color=vec3(0.0);
        for(int j=0;j<3;j++){
          for(int i=0;i<6;i++){
            color[j]+=lineWidth*float(i*i)/abs(fract(t-0.012*float(j)+float(i)*0.012)*5.0-length(uv)+mod(uv.x+uv.y,0.2));
          }
        }
        gl_FragColor=vec4(color[0],color[1],color[2],1.0);
      }
    `

    const camera = new THREE.Camera()
    camera.position.z = 1
    const scene = new THREE.Scene()
    const geometry = new THREE.PlaneGeometry(2, 2)
    const uniforms = {
      time: { value: 1.0 },
      resolution: { value: new THREE.Vector2() },
    }
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader })
    scene.add(new THREE.Mesh(geometry, material))

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'

    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight
      renderer.setSize(w, h)
      uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height)
    }
    resize()
    window.addEventListener('resize', resize)

    sceneRef.current = { renderer, uniforms, animationId: 0 }

    const animate = () => {
      const id = requestAnimationFrame(animate)
      uniforms.time.value += 0.05
      renderer.render(scene, camera)
      if (sceneRef.current) sceneRef.current.animationId = id
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId)
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
        renderer.dispose()
        geometry.dispose()
        material.dispose()
      }
    }
  }, [])

  return <div ref={containerRef} className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />
}
