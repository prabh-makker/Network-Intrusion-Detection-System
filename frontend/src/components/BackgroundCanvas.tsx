"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import * as THREE from "three";

export default function BackgroundCanvas() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const hidden = pathname === "/login" || pathname === "/";

  useEffect(() => {
    if (hidden || !canvasRef.current) return;

    const canvas = canvasRef.current;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 60;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(isDark ? 0x0a0e1a : 0xede9fe, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Theme-aware color palettes
    const darkColors = [
      [0.47, 0.16, 0.31], // Wine
      [0.55, 0.36, 0.96], // Purple
      [0.23, 0.51, 0.96], // Blue
      [0.02, 0.71, 0.85], // Cyan
      [0.66, 0.33, 0.97], // Violet
    ];
    const lightColors = [
      [0.36, 0.12, 0.60], // Deep purple
      [0.22, 0.40, 0.90], // Royal blue
      [0.58, 0.22, 0.78], // Amethyst
      [0.12, 0.55, 0.82], // Ocean blue
      [0.45, 0.18, 0.52], // Deep wine
    ];
    const palette = isDark ? darkColors : lightColors;

    const darkOrbHex = [0x782850, 0x8b5cf6, 0x3b82f6, 0x06b6d4, 0xa855f7];
    const lightOrbHex = [0x5b21b6, 0x3b82f6, 0x7c3aed, 0x2563eb, 0x6d28d9];
    const orbHexColors = isDark ? darkOrbHex : lightOrbHex;

    // ── 800 Particles with individual velocities ──
    const particleCount = Math.min(800, Math.floor(width * height / 300));
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 220;
      positions[i3 + 1] = (Math.random() - 0.5) * 220;
      positions[i3 + 2] = (Math.random() - 0.5) * 160;

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.015
      ));

      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[i3] = col[0]; colors[i3 + 1] = col[1]; colors[i3 + 2] = col[2];

      sizes[i] = Math.random() * 2.0 + 0.4;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Custom shader for glowing particles
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: isDark ? 0.8 : 0.9 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uTime;
        void main() {
          vColor = color;
          vec3 pos = position;
          pos.y += sin(uTime * 0.5 + position.x * 0.05) * 1.0;
          pos.x += cos(uTime * 0.3 + position.y * 0.05) * 0.8;
          pos.z += sin(uTime * 0.2 + position.z * 0.03) * 0.5;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (250.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float uOpacity;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 1.3);
          gl_FragColor = vec4(vColor, glow * uOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    // ── Dynamic connection lines ──
    const maxLineCount = 600;
    const lineGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(maxLineCount * 6);
    const lineColors = new Float32Array(maxLineCount * 6);
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
    lineGeo.setDrawRange(0, 0);

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.3 : 0.5,
      blending: THREE.AdditiveBlending,
    });
    const dynamicLines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(dynamicLines);

    // Orbs removed by request

    // Rings removed by request

    // ── Spiral galaxy arms ──
    const spiralGroup = new THREE.Group();
    const spiralCount = 300;
    const spiralGeo = new THREE.BufferGeometry();
    const spiralPos = new Float32Array(spiralCount * 3);
    const spiralColors = new Float32Array(spiralCount * 3);
    const spiralSizes = new Float32Array(spiralCount);

    for (let i = 0; i < spiralCount; i++) {
      const angle = (i / spiralCount) * Math.PI * 6;
      const radius = (i / spiralCount) * 50 + 5;
      const armOffset = (i % 2 === 0 ? 0 : Math.PI);
      spiralPos[i * 3] = Math.cos(angle + armOffset) * radius + (Math.random() - 0.5) * 5;
      spiralPos[i * 3 + 1] = Math.sin(angle + armOffset) * radius + (Math.random() - 0.5) * 5;
      spiralPos[i * 3 + 2] = (Math.random() - 0.5) * 8;

      const col = palette[i % palette.length];
      spiralColors[i * 3] = col[0]; spiralColors[i * 3 + 1] = col[1]; spiralColors[i * 3 + 2] = col[2];
      spiralSizes[i] = Math.random() * 1.2 + 0.5;
    }

    spiralGeo.setAttribute("position", new THREE.BufferAttribute(spiralPos, 3));
    spiralGeo.setAttribute("color", new THREE.BufferAttribute(spiralColors, 3));

    const spiralMat = new THREE.PointsMaterial({
      size: 1.0,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.4 : 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const spiralPoints = new THREE.Points(spiralGeo, spiralMat);
    spiralGroup.add(spiralPoints);
    spiralGroup.position.z = -40;
    scene.add(spiralGroup);

    // ── Shooting stars / meteors ──
    const meteors: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number }[] = [];
    let meteorTimer = 0;

    const createMeteor = () => {
      const len = 2 + Math.random() * 4;
      const meteorGeo = new THREE.CylinderGeometry(0, 0.15, len, 8);
      const meteorMat = new THREE.MeshBasicMaterial({
        color: isDark ? 0xa78bfa : 0x6d28d9,
        transparent: true,
        opacity: isDark ? 0.7 : 0.8,
        blending: THREE.AdditiveBlending,
      });
      const meteor = new THREE.Mesh(meteorGeo, meteorMat);
      meteor.position.set(
        (Math.random() - 0.5) * 150 + 50,
        50 + Math.random() * 30,
        (Math.random() - 0.5) * 30
      );
      const dir = new THREE.Vector3(-0.8 - Math.random() * 0.4, -0.5 - Math.random() * 0.3, 0).normalize();
      meteor.lookAt(meteor.position.clone().add(dir));
      meteor.rotateX(Math.PI / 2);
      scene.add(meteor);
      meteors.push({ mesh: meteor, vel: dir.multiplyScalar(0.6 + Math.random() * 0.4), life: 0, maxLife: 80 + Math.random() * 60 });
    };

    // Pulses removed by request

    // ── Hexagonal grid overlay ──
    const hexGroup = new THREE.Group();
    const hexMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x6d28d9 : 0x7c3aed,
      transparent: true,
      opacity: isDark ? 0.04 : 0.1,
    });

    for (let row = -3; row <= 3; row++) {
      for (let col = -4; col <= 4; col++) {
        const hexRadius = 12;
        const xOff = col * hexRadius * 1.75;
        const yOff = row * hexRadius * 1.5 + (col % 2 === 0 ? 0 : hexRadius * 0.75);
        const hexPoints: THREE.Vector3[] = [];
        for (let k = 0; k <= 6; k++) {
          const angle = (k / 6) * Math.PI * 2;
          hexPoints.push(new THREE.Vector3(
            xOff + Math.cos(angle) * hexRadius,
            yOff + Math.sin(angle) * hexRadius,
            0
          ));
        }
        const hexLineGeo = new THREE.BufferGeometry().setFromPoints(hexPoints);
        const hexLine = new THREE.Line(hexLineGeo, hexMat);
        hexGroup.add(hexLine);
      }
    }
    hexGroup.position.z = -50;
    scene.add(hexGroup);

    // ── Energy beam / data stream ──
    const beamGroup = new THREE.Group();
    const beamCount = 4;
    const beams: { mesh: THREE.Mesh; baseY: number; phase: number; speed: number }[] = [];

    for (let i = 0; i < beamCount; i++) {
      const beamGeo = new THREE.PlaneGeometry(200, 0.3);
      const beamMat = new THREE.MeshBasicMaterial({
        color: orbHexColors[i % orbHexColors.length],
        transparent: true,
        opacity: isDark ? 0.08 : 0.12,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      const baseY = (Math.random() - 0.5) * 60;
      beam.position.set(0, baseY, -35 + i * -3);
      beam.rotation.z = (Math.random() - 0.5) * 0.3;
      beamGroup.add(beam);
      beams.push({ mesh: beam, baseY, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.5 });
    }
    scene.add(beamGroup);

    // ── Mouse interaction ──
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / width - 0.5) * 2;
      mouseRef.current.y = -(e.clientY / height - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // ── Animation loop ──
    let time = 0;
    let frameId: number;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      time += 0.016;

      particleMaterial.uniforms.uTime.value = time;

      // Move particles
      const posArr = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        posArr[i3] += velocities[i].x;
        posArr[i3 + 1] += velocities[i].y;
        posArr[i3 + 2] += velocities[i].z;
        if (posArr[i3] > 110) posArr[i3] = -110;
        if (posArr[i3] < -110) posArr[i3] = 110;
        if (posArr[i3 + 1] > 110) posArr[i3 + 1] = -110;
        if (posArr[i3 + 1] < -110) posArr[i3 + 1] = 110;
        if (posArr[i3 + 2] > 80) posArr[i3 + 2] = -80;
        if (posArr[i3 + 2] < -80) posArr[i3 + 2] = 80;
      }
      geometry.attributes.position.needsUpdate = true;

      // Dynamic connections
      let lineIdx = 0;
      const lp = lineGeo.attributes.position.array as Float32Array;
      const lc = lineGeo.attributes.color.array as Float32Array;
      const connectionDist = 28;

      for (let i = 0; i < Math.min(particleCount, 180) && lineIdx < maxLineCount; i++) {
        for (let j = i + 1; j < Math.min(i + 10, particleCount) && lineIdx < maxLineCount; j++) {
          const dx = posArr[i * 3] - posArr[j * 3];
          const dy = posArr[i * 3 + 1] - posArr[j * 3 + 1];
          const dz = posArr[i * 3 + 2] - posArr[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < connectionDist) {
            const alpha = 1 - dist / connectionDist;
            const li = lineIdx * 6;
            lp[li] = posArr[i * 3]; lp[li + 1] = posArr[i * 3 + 1]; lp[li + 2] = posArr[i * 3 + 2];
            lp[li + 3] = posArr[j * 3]; lp[li + 4] = posArr[j * 3 + 1]; lp[li + 5] = posArr[j * 3 + 2];
            const c = alpha * 0.7;
            const col = palette[i % palette.length];
            lc[li] = c * col[0]; lc[li + 1] = c * col[1]; lc[li + 2] = c * col[2];
            lc[li + 3] = c * col[0]; lc[li + 4] = c * col[1]; lc[li + 5] = c * col[2];
            lineIdx++;
          }
        }
      }
      lineGeo.setDrawRange(0, lineIdx * 2);
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.color.needsUpdate = true;

      // Orbs and rings logic removed

      // Spiral galaxy rotation
      spiralGroup.rotation.z += 0.0004;
      spiralGroup.rotation.x = Math.sin(time * 0.1) * 0.1;

      // Meteors
      meteorTimer++;
      if (meteorTimer > 90 + Math.random() * 60) {
        createMeteor();
        meteorTimer = 0;
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.mesh.position.add(m.vel);
        m.life++;
        const progress = m.life / m.maxLife;
        const mat = m.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = (isDark ? 0.7 : 0.8) * (1 - progress * progress);
        if (m.life >= m.maxLife) {
          scene.remove(m.mesh);
          m.mesh.geometry.dispose();
          (m.mesh.material as THREE.Material).dispose();
          meteors.splice(i, 1);
        }
      }

      // Pulse logic removed

      // Hex grid gentle float
      hexGroup.rotation.z += 0.00008;
      hexGroup.position.y = Math.sin(time * 0.15) * 3;

      // Energy beams wave
      beams.forEach(b => {
        b.mesh.position.y = b.baseY + Math.sin(time * b.speed + b.phase) * 8;
        const mat = b.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = (isDark ? 0.06 : 0.1) + Math.sin(time * 0.5 + b.phase) * 0.04;
      });

      // Camera sway from mouse
      camera.position.x += (mouseRef.current.x * 4 - camera.position.x) * 0.02;
      camera.position.y += (mouseRef.current.y * 3 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      // Slow global rotation
      particles.rotation.y += 0.00015;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frameId);
      meteors.forEach(m => { scene.remove(m.mesh); m.mesh.geometry.dispose(); (m.mesh.material as THREE.Material).dispose(); });
      beams.forEach(b => { beamGroup.remove(b.mesh); b.mesh.geometry.dispose(); (b.mesh.material as THREE.Material).dispose(); });
      hexGroup.children.forEach(c => { (c as THREE.Line).geometry.dispose(); });
      scene.remove(particles, dynamicLines, spiralGroup, hexGroup, beamGroup);
      geometry.dispose(); particleMaterial.dispose();
      lineGeo.dispose(); lineMat.dispose();
      spiralGeo.dispose(); spiralMat.dispose();
      hexMat.dispose();
      renderer.dispose();
    };
  }, [isDark, hidden]);

  if (hidden) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
