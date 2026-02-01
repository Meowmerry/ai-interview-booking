"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  MeshDistortMaterial,
  Sphere,
  Ring,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";

interface InterviewerAvatarProps {
  isSpeaking: boolean;
}

function InterviewerAvatar({ isSpeaking }: InterviewerAvatarProps) {
  const mainSphereRef = useRef<THREE.Mesh>(null);
  const innerSphereRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const pulseRef = useRef(0);

  // Animated pulse effect when speaking
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // Pulse animation for speaking
    if (isSpeaking) {
      pulseRef.current = Math.min(pulseRef.current + delta * 3, 1);
    } else {
      pulseRef.current = Math.max(pulseRef.current - delta * 2, 0);
    }

    const pulse = pulseRef.current;
    const speakingScale = 1 + Math.sin(time * 8) * 0.05 * pulse;

    // Main sphere breathing and speaking animation
    if (mainSphereRef.current) {
      const breathe = 1 + Math.sin(time * 1.5) * 0.02;
      mainSphereRef.current.scale.setScalar(breathe * speakingScale);
    }

    // Inner sphere rotation and pulse
    if (innerSphereRef.current) {
      innerSphereRef.current.rotation.y += delta * 0.5;
      innerSphereRef.current.rotation.x = Math.sin(time * 0.5) * 0.1;
      const innerScale = 0.6 + pulse * 0.1;
      innerSphereRef.current.scale.setScalar(innerScale);
    }

    // Orbital rings
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = Math.PI / 2 + Math.sin(time * 0.7) * 0.2;
      ring1Ref.current.rotation.z += delta * 0.3;
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.y += delta * 0.4;
      ring2Ref.current.rotation.x = Math.cos(time * 0.5) * 0.3;
    }
  });

  const mainColor = useMemo(() => new THREE.Color("#6366f1"), []);
  const accentColor = useMemo(() => new THREE.Color("#8b5cf6"), []);
  const glowColor = useMemo(() => new THREE.Color("#a78bfa"), []);

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group position={[0, 0, 0]}>
        {/* Main outer sphere with distortion */}
        <Sphere ref={mainSphereRef} args={[1, 64, 64]}>
          <MeshDistortMaterial
            color={mainColor}
            envMapIntensity={0.8}
            clearcoat={1}
            clearcoatRoughness={0}
            metalness={0.1}
            roughness={0.2}
            distort={isSpeaking ? 0.3 : 0.15}
            speed={isSpeaking ? 4 : 2}
            transparent
            opacity={0.85}
          />
        </Sphere>

        {/* Inner glowing core */}
        <Sphere ref={innerSphereRef} args={[0.6, 32, 32]}>
          <meshStandardMaterial
            color={accentColor}
            emissive={glowColor}
            emissiveIntensity={isSpeaking ? 2 : 0.8}
            transparent
            opacity={0.9}
          />
        </Sphere>

        {/* Orbital ring 1 */}
        <Ring ref={ring1Ref} args={[1.3, 1.35, 64]} position={[0, 0, 0]}>
          <meshStandardMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={isSpeaking ? 1.5 : 0.5}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </Ring>

        {/* Orbital ring 2 */}
        <Ring ref={ring2Ref} args={[1.5, 1.53, 64]} position={[0, 0, 0]}>
          <meshStandardMaterial
            color={mainColor}
            emissive={mainColor}
            emissiveIntensity={isSpeaking ? 1 : 0.3}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </Ring>

        {/* Speaking indicator particles */}
        {isSpeaking && <SpeakingParticles />}
      </group>
    </Float>
  );
}

function SpeakingParticles() {
  const particlesRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const count = 50;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 1.8 + Math.random() * 0.5;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      colors[i * 3] = 0.4 + Math.random() * 0.2;
      colors[i * 3 + 1] = 0.4 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
    }

    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

function StudioLighting() {
  return (
    <>
      {/* Key light - main illumination */}
      <spotLight
        position={[5, 5, 5]}
        angle={0.4}
        penumbra={0.5}
        intensity={1.5}
        color="#ffffff"
        castShadow
      />

      {/* Fill light - softer, opposite side */}
      <spotLight
        position={[-5, 3, 3]}
        angle={0.5}
        penumbra={0.8}
        intensity={0.8}
        color="#e0e7ff"
      />

      {/* Rim/Back light - creates edge definition */}
      <spotLight
        position={[0, 5, -5]}
        angle={0.6}
        penumbra={0.5}
        intensity={1}
        color="#8b5cf6"
      />

      {/* Ambient fill */}
      <ambientLight intensity={0.2} color="#1e1b4b" />

      {/* Point light for core glow effect */}
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#6366f1" />
    </>
  );
}

interface InterviewerSceneProps {
  isSpeaking?: boolean;
  className?: string;
}

export default function InterviewerScene({
  isSpeaking = false,
  className = "",
}: InterviewerSceneProps) {
  return (
    <div
      className={`relative w-full h-full min-h-[300px] bg-gradient-to-b from-[#0a0a0f] to-[#111118] rounded-xl overflow-hidden ${className}`}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#0a0a0f"]} />

        <StudioLighting />

        <InterviewerAvatar isSpeaking={isSpeaking} />

        <ContactShadows
          position={[0, -2, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
          far={4}
          color="#6366f1"
        />

        <Environment preset="city" />
      </Canvas>

      {/* Status indicator overlay */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full transition-colors duration-300 ${
            isSpeaking ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
          }`}
        />
        <span className="text-xs text-muted-foreground">
          {isSpeaking ? "AI Speaking..." : "Listening"}
        </span>
      </div>
    </div>
  );
}
