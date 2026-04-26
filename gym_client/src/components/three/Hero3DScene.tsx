import { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sphere, Box, Torus } from '@react-three/drei'
import * as THREE from 'three'

interface FloatingShapeProps {
  position: [number, number, number]
  scale?: number
  color?: string
  speed?: number
  distort?: number
}

function FloatingSphere({ position, scale = 1, color = '#f59e0b', speed = 1, distort = 0.4 }: FloatingShapeProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2 * speed) * 0.2
      meshRef.current.rotation.y += 0.005 * speed
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
      <Sphere ref={meshRef} args={[1, 64, 64]} scale={scale} position={position}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={distort}
          speed={2}
          roughness={0.4}
          metalness={0.6}
        />
      </Sphere>
    </Float>
  )
}

function FloatingDumbbell({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.3
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
    }
  })

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={1}>
      <group ref={groupRef} position={position} scale={scale}>
        {/* Left weight plate */}
        <Box args={[0.8, 1.2, 1.2]} position={[-1.2, 0, 0]}>
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
        </Box>
        {/* Center bar */}
        <Box args={[2.6, 0.15, 0.15]}>
          <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.2} />
        </Box>
        {/* Right weight plate */}
        <Box args={[0.8, 1.2, 1.2]} position={[1.2, 0, 0]}>
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
        </Box>
      </group>
    </Float>
  )
}

function FloatingTorus({ position, scale = 1, color = '#f59e0b' }: FloatingShapeProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01
      meshRef.current.rotation.y += 0.015
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={1.2}>
      <Torus ref={meshRef} args={[1, 0.3, 16, 32]} scale={scale} position={position}>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </Torus>
    </Float>
  )
}

function Particles({ count = 100 }: { count?: number }) {
  const points = useRef<THREE.Points>(null)
  const positions = useRef<Float32Array>(null)

  useEffect(() => {
    positions.current = new Float32Array(count * 3)
    for (let i = 0; i < count * 3; i++) {
      positions.current[i] = (Math.random() - 0.5) * 20
    }
  }, [count])

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.03
      points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.1
    }
  })

  if (!positions.current) return null

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions.current}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#f59e0b" transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

function SceneContent() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 3, -5]} intensity={0.5} color="#f59e0b" />

      {/* Main objects */}
      <FloatingDumbbell position={[0, 0, 0]} scale={1.2} />

      <FloatingSphere
        position={[4, 2, -3]}
        scale={0.8}
        color="#10b981"
        speed={0.8}
        distort={0.3}
      />

      <FloatingSphere
        position={[-4, -1.5, 2]}
        scale={0.6}
        color="#3b82f6"
        speed={1.2}
        distort={0.5}
      />

      <FloatingTorus position={[3, -2, -2]} scale={0.7} color="#ef4444" />

      <FloatingTorus position={[-3.5, 1.5, 3]} scale={0.5} color="#8b5cf6" />

      {/* Particles */}
      <Particles count={80} />
    </>
  )
}

export function Hero3DScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['rgba(0,0,0,0)']} />
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  )
}
