import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '@/types/christmas';

interface TreeStarProps {
  state: TreeState;
  glowIntensity?: number; // 0-1, controlled externally for focus effect
}

// Create a refined 5-pointed star shape
function createStarShape(outerRadius: number, innerRadius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const points = 5;
  
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  return shape;
}

export function TreeStar({ state, glowIntensity = 0 }: TreeStarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const glowRingRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const currentGlowRef = useRef(0);

  // Create thin extruded star geometry
  const starGeometry = useMemo(() => {
    const shape = createStarShape(0.3, 0.12);
    const extrudeSettings = {
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 1,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // Glow star geometry (larger, for the glow effect)
  const glowGeometry = useMemo(() => {
    const shape = createStarShape(0.45, 0.18);
    const extrudeSettings = {
      depth: 0.01,
      bevelEnabled: false,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    timeRef.current += delta;
    
    // Smooth glow transition
    currentGlowRef.current += (glowIntensity - currentGlowRef.current) * 0.05;
    const glow = currentGlowRef.current;
    
    // Gentle rotation
    if (starRef.current) {
      starRef.current.rotation.z += delta * 0.2;
    }
    if (glowRef.current) {
      glowRef.current.rotation.z += delta * 0.15;
    }
    if (glowRingRef.current) {
      glowRingRef.current.rotation.z -= delta * 0.1;
      // Pulse the ring scale subtly
      const pulse = 1 + Math.sin(timeRef.current * 2) * 0.05 * glow;
      glowRingRef.current.scale.setScalar(pulse);
    }

    // Position based on state
    const targetY = state === 'tree' ? 4.4 : 10;
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.05;
    
    // Fade materials
    if (starRef.current) {
      const mat = starRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = state === 'tree' ? 1 : 0;
      mat.opacity += (targetOpacity - mat.opacity) * 0.05;
    }
    
    // Glow effect opacity
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = glow * 0.3 * (state === 'tree' ? 1 : 0);
    }
    if (glowRingRef.current) {
      const mat = glowRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = glow * 0.15 * (state === 'tree' ? 1 : 0);
    }
  });

  return (
    <group ref={groupRef} position={[0, 4.4, 0]}>
      {/* Outer glow ring - subtle, restrained */}
      <mesh 
        ref={glowRingRef}
        rotation={[Math.PI / 4, 0.3, 0]}
        position={[0, 0, -0.02]}
      >
        <ringGeometry args={[0.5, 0.8, 32]} />
        <meshBasicMaterial
          color="#fff8dc"
          transparent
          opacity={0}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Inner glow star */}
      <mesh 
        ref={glowRef} 
        geometry={glowGeometry}
        rotation={[Math.PI / 4, 0.3, 0]}
        position={[0, 0, -0.01]}
      >
        <meshBasicMaterial
          color="#fffacd"
          transparent
          opacity={0}
          toneMapped={false}
        />
      </mesh>
      
      {/* Main star */}
      <mesh 
        ref={starRef} 
        geometry={starGeometry}
        rotation={[Math.PI / 4, 0.3, 0]}
        position={[0, 0, 0]}
      >
        <meshBasicMaterial
          color="#ffd700"
          transparent
          opacity={1}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}