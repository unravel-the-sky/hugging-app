// Adapted from wcandillon/react-native-webgpu example, restructured so the
// root is created ONCE and children updates don't tear it down.
//
// The original ran its setup effect on every render with no dep array, and
// its cleanup disposed the root via unmountComponentAtNode without clearing
// root.current — so any re-render (e.g. when async data loads) reused a dead
// root, killing the render loop. Splitting setup (once) from children-render
// (on change) fixes that.

import * as THREE from "three/webgpu";
import React, { useEffect, useRef } from "react";
import type { ReconcilerRoot, RootState } from "@react-three/fiber";
import {
  extend,
  createRoot,
  unmountComponentAtNode,
  events,
} from "@react-three/fiber";
import type { ViewProps } from "react-native";
import { PixelRatio } from "react-native";
import { Canvas, type CanvasRef } from "react-native-webgpu";

import { makeWebGPURenderer, ReactNativeCanvas } from "./make-webgpu-renderer";

// @ts-expect-error - THREE namespace is broader than R3F's Catalogue type
extend(THREE);

interface FiberCanvasProps {
  children: React.ReactNode;
  style?: ViewProps["style"];
  camera?: THREE.PerspectiveCamera;
  scene?: THREE.Scene;
}

export const FiberCanvas = ({
  children,
  style,
  scene,
  camera,
}: FiberCanvasProps) => {
  const root = useRef<ReconcilerRoot<OffscreenCanvas> | null>(null);
  const canvasRef = useRef<CanvasRef>(null);

  // --- Set up the root + renderer ONCE -------------------------------
  useEffect(() => {
    const context = canvasRef.current!.getContext("webgpu")!;
    const renderer = makeWebGPURenderer(context);

    // @ts-expect-error
    const canvas = new ReactNativeCanvas(context.canvas) as HTMLCanvasElement;
    canvas.width = canvas.clientWidth * PixelRatio.get();
    canvas.height = canvas.clientHeight * PixelRatio.get();
    const size = {
      top: 0,
      left: 0,
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    };

    root.current = createRoot(canvas);
    root.current.configure({
      size,
      events,
      scene,
      camera,
      gl: renderer,
      frameloop: "always",
      dpr: 1, // canvas.width already includes PixelRatio
      onCreated: async (state: RootState) => {
        const gl = state.gl as unknown as {
          init: () => Promise<void>;
          render: (s: THREE.Scene, c: THREE.Camera) => void;
        };
        let ready = false;
        const renderFrame = gl.render.bind(gl);
        gl.render = (s: THREE.Scene, c: THREE.Camera) => {
          if (!ready) return;
          renderFrame(s, c);
          context?.present();
        };
        await gl.init();
        ready = true;
        (
          state.gl as unknown as {
            setClearColor: (c: number, a: number) => void;
          }
        ).setClearColor(0x000000, 0);
        console.log("[webgpu] ready");
      },
    });

    return () => {
      unmountComponentAtNode(canvas);
      root.current = null; // <-- critical: clear the ref on teardown
    };
    // run once; children are pushed by the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Push children into the root whenever they change --------------
  // No teardown, no renderer recreation — just reconcile the new tree.
  useEffect(() => {
    root.current?.render(children);
  }, [children]);

  return <Canvas ref={canvasRef} style={style} transparent />;
};
