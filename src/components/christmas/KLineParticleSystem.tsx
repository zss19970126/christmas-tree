import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { TreeState } from '@/types/christmas';

interface KLineParticleSystemProps {
  state: TreeState;
  particleCount?: number;
}

interface CandleData {
  treePosition: [number, number, number];
  galaxyPosition: [number, number, number];
  color: THREE.Color;
  bodyHeight: number;
  wickHeight: number;
  scale: number;
  phase: number;
  speed: number;
  isBullish: boolean;
}

// Generate spiral tree positions for K-line candles
function generateTreePosition(index: number, total: number): [number, number, number] {
  const height = 9;
  const maxRadius = 3.5;
  
  const t = index / total;
  const y = t * height - height / 2;
  
  // Spiral pattern with decreasing radius
  const radius = maxRadius * (1 - t * 0.85) * (0.6 + Math.random() * 0.4);
  const angle = t * Math.PI * 14 + (index % 7) * Math.PI * 0.3;
  
  const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.4;
  const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.4;
  
  return [x, y, z];
}

// Generate galaxy positions
function generateGalaxyPosition(): [number, number, number] {
  const radius = 6 + Math.random() * 12;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta) * 0.6,
    radius * Math.cos(phi),
  ];
}

export function KLineParticleSystem({ state, particleCount = 800 }: KLineParticleSystemProps) {
  const groupRef = useRef<THREE.Group>(null);
  const candleBodiesRef = useRef<THREE.InstancedMesh>(null);
  const candleWicksRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  
  // Generate candle data
  const candleData = useMemo<CandleData[]>(() => {
    return Array.from({ length: particleCount }, (_, i) => {
      const treePos = generateTreePosition(i, particleCount);
      const galaxyPos = generateGalaxyPosition();
      
      // 50% bullish (green), 50% bearish (red)
      const isBullish = Math.random() > 0.5;
      
      // K-line colors - vibrant red and green
      let color: THREE.Color;
      if (isBullish) {
        // Bullish green - bright stock market green
        const greenVariant = 0.33 + Math.random() * 0.05; // Hue around 120-140
        color = new THREE.Color().setHSL(greenVariant, 0.9 + Math.random() * 0.1, 0.45 + Math.random() * 0.15);
      } else {
        // Bearish red - vibrant stock market red
        const redVariant = Math.random() * 0.02; // Hue around 0-7
        color = new THREE.Color().setHSL(redVariant, 0.9 + Math.random() * 0.1, 0.5 + Math.random() * 0.1);
      }
      
      return {
        treePosition: treePos,
        galaxyPosition: galaxyPos,
        color,
        bodyHeight: 0.08 + Math.random() * 0.15,
        wickHeight: 0.15 + Math.random() * 0.2,
        scale: 0.8 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.4,
        isBullish,
      };
    });
  }, [particleCount]);

  // Store current positions for animation
  const positionsRef = useRef(candleData.map(p => [...p.treePosition]));

  // Animate to new state
  useEffect(() => {
    const targetPositions = state === 'tree' 
      ? candleData.map(p => p.treePosition)
      : candleData.map(p => p.galaxyPosition);

    positionsRef.current.forEach((pos, i) => {
      gsap.to(pos, {
        0: targetPositions[i][0],
        1: targetPositions[i][1],
        2: targetPositions[i][2],
        duration: 1.8 + Math.random() * 0.6,
        ease: state === 'tree' ? 'power2.inOut' : 'power3.out',
        delay: Math.random() * 0.4,
      });
    });
  }, [state, candleData]);

  useFrame((_, delta) => {
    if (!candleBodiesRef.current || !candleWicksRef.current) return;
    
    timeRef.current += delta;
    
    candleData.forEach((candle, i) => {
      const pos = positionsRef.current[i];
      
      // Floating animation
      const float = Math.sin(timeRef.current * candle.speed + candle.phase) * 0.03;
      const sway = Math.sin(timeRef.current * 0.5 + candle.phase) * 0.02;
      
      // Candle body
      dummy.position.set(
        pos[0] + sway,
        pos[1] + float,
        pos[2]
      );
      
      // Slight rotation for visual interest
      dummy.rotation.y = Math.sin(timeRef.current * 0.3 + candle.phase) * 0.15;
      dummy.rotation.z = Math.sin(timeRef.current * 0.2 + candle.phase) * 0.05;
      
      // Pulsing scale effect - like market volatility
      const pulse = 1 + Math.sin(timeRef.current * 1.5 + candle.phase) * 0.08;
      dummy.scale.set(
        0.025 * candle.scale * pulse,
        candle.bodyHeight * candle.scale,
        0.025 * candle.scale * pulse
      );
      
      dummy.updateMatrix();
      candleBodiesRef.current!.setMatrixAt(i, dummy.matrix);
      candleBodiesRef.current!.setColorAt(i, candle.color);
      
      // Candle wick - thin line above and below
      dummy.scale.set(
        0.006 * candle.scale,
        candle.wickHeight * candle.scale,
        0.006 * candle.scale
      );
      
      dummy.updateMatrix();
      candleWicksRef.current!.setMatrixAt(i, dummy.matrix);
      
      // Wick color - slightly darker version of body
      const wickColor = candle.color.clone();
      wickColor.offsetHSL(0, -0.1, -0.15);
      candleWicksRef.current!.setColorAt(i, wickColor);
    });
    
    candleBodiesRef.current.instanceMatrix.needsUpdate = true;
    candleWicksRef.current.instanceMatrix.needsUpdate = true;
    if (candleBodiesRef.current.instanceColor) {
      candleBodiesRef.current.instanceColor.needsUpdate = true;
    }
    if (candleWicksRef.current.instanceColor) {
      candleWicksRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Candle Bodies - Box geometry for K-line look */}
      <instancedMesh ref={candleBodiesRef} args={[undefined, undefined, particleCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          metalness={0.7}
          roughness={0.25}
          emissive={new THREE.Color('#ff4444')}
          emissiveIntensity={0.4}
        />
      </instancedMesh>
      
      {/* Candle Wicks - Thin cylinders */}
      <instancedMesh ref={candleWicksRef} args={[undefined, undefined, particleCount]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial
          metalness={0.5}
          roughness={0.4}
          emissive={new THREE.Color('#ffffff')}
          emissiveIntensity={0.2}
        />
      </instancedMesh>
    </group>
  );
}
