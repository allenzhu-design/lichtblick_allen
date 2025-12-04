// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as THREE from "three";

import type { IRenderer } from "../IRenderer";
import { PickedRenderable } from "../Picker";
import { Renderable } from "../Renderable";
import { SceneExtension } from "../SceneExtension";

type SelectionState = "idle" | "dragging";

interface SelectionToolEventMap extends THREE.Object3DEventMap {
  "foxglove.selection-start": object;
  "foxglove.selection-end": { selectedObjects: PickedRenderable[] };
}

/**
 * 选择框样式配置
 * 参考 SuperSplat (src/ui/scss/tool.scss) 的设计
 */
const SELECTION_RECT_CONFIG = {
  // 边框颜色：橙红色 (#f60)
  strokeColor: "#ff6600",
  // 边框宽度
  strokeWidth: "1",
  // 虚线样式：5px实线 + 5px空白
  strokeDasharray: "5, 5",
  // 内部填充：无
  fill: "none",
} as const;

/**
 * SVG 矩形选择工具
 * 采用 SVG 方式绘制选择框，参考 SuperSplat 的 RectSelection 实现
 * 
 * 相比 ShaderMaterial 方案的优势：
 * - 更简洁可靠，无需复杂的着色器
 * - 性能更好，不占用 GPU 资源
 * - 易于维护和扩展样式
 * - 与 SuperSplat 实现保持一致
 */
export class SelectionTool extends SceneExtension<Renderable, SelectionToolEventMap> {
  public static extensionId = "foxglove.SelectionTool";

  private selectionState: SelectionState = "idle";
  private startPoint = { x: 0, y: 0 };
  private endPoint = { x: 0, y: 0 };
  private isMouseDown = false;

  // SVG 相关元素
  private svgContainer: SVGSVGElement | null = null;
  private rectElement: SVGRectElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;

  public constructor(renderer: IRenderer, name: string = SelectionTool.extensionId) {
    super(name, renderer);

    // 获取 Canvas 元素
    this.canvasElement = renderer.gl.domElement as HTMLCanvasElement;

    // 初始化 SVG 容器
    this.#initSVGContainer();

    this.#setState("idle");
  }

  public override dispose(): void {
    this.#removeSVGContainer();
    this.renderer.input.removeListener("mousedown", this.#handleMouseDown);
    this.renderer.input.removeListener("mousemove", this.#handleMouseMove);
    this.renderer.input.removeListener("mouseup", this.#handleMouseUp);
    super.dispose();
  }

  public startSelecting(): void {
    this.#setState("dragging");
  }

  public stopSelecting(): void {
    this.#setState("idle");
  }

  public get state(): SelectionState {
    return this.selectionState;
  }

  /**
   * 初始化 SVG 容器
   * 在 Canvas 上方创建 SVG 元素用于绘制选择框
   */
  #initSVGContainer(): void {
    if (!this.canvasElement || this.svgContainer) {
      return;
    }

    // 创建 SVG 容器
    this.svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svgContainer.setAttribute("id", "foxglove-rect-select-svg");
    this.svgContainer.setAttribute("class", "foxglove-tool-svg hidden");
    this.svgContainer.style.position = "absolute";
    this.svgContainer.style.top = "0";
    this.svgContainer.style.left = "0";
    this.svgContainer.style.width = "100%";
    this.svgContainer.style.height = "100%";
    this.svgContainer.style.pointerEvents = "none";

    // 创建矩形元素
    const rectElement = document.createElementNS(
      this.svgContainer.namespaceURI,
      "rect"
    ) as SVGRectElement;
    this.rectElement = rectElement;
    this.rectElement.setAttribute("fill", SELECTION_RECT_CONFIG.fill);
    this.rectElement.setAttribute("stroke", SELECTION_RECT_CONFIG.strokeColor);
    this.rectElement.setAttribute("stroke-width", SELECTION_RECT_CONFIG.strokeWidth);
    this.rectElement.setAttribute("stroke-dasharray", SELECTION_RECT_CONFIG.strokeDasharray);

    this.svgContainer.appendChild(this.rectElement);

    // 将 SVG 容器添加到 Canvas 的父容器中
    const canvasParent = this.canvasElement.parentElement;
    if (canvasParent) {
      canvasParent.style.position = "relative";
      canvasParent.appendChild(this.svgContainer);
    }
  }

  /**
   * 移除 SVG 容器
   */
  #removeSVGContainer(): void {
    if (this.svgContainer) {
      this.svgContainer.remove();
      this.svgContainer = null;
      this.rectElement = null;
    }
  }

  /**
   * 更新矩形位置和大小
   */
  #updateSelectionRect(): void {
    if (!this.rectElement) {
      return;
    }

    const x = Math.min(this.startPoint.x, this.endPoint.x);
    const y = Math.min(this.startPoint.y, this.endPoint.y);
    const width = Math.abs(this.startPoint.x - this.endPoint.x);
    const height = Math.abs(this.startPoint.y - this.endPoint.y);

    this.rectElement.setAttribute("x", x.toString());
    this.rectElement.setAttribute("y", y.toString());
    this.rectElement.setAttribute("width", width.toString());
    this.rectElement.setAttribute("height", height.toString());
  }

  /**
   * 显示 SVG 选择框
   */
  #showSelectionRect(): void {
    if (this.svgContainer) {
      this.svgContainer.classList.remove("hidden");
    }
  }

  /**
   * 隐藏 SVG 选择框
   */
  #hideSelectionRect(): void {
    if (this.svgContainer) {
      this.svgContainer.classList.add("hidden");
    }
  }

  #setState(state: SelectionState): void {
    if (this.selectionState === state) {
      return;
    }

    this.selectionState = state;
    switch (state) {
      case "idle":
        this.renderer.input.removeListener("mousedown", this.#handleMouseDown);
        this.renderer.input.removeListener("mousemove", this.#handleMouseMove);
        this.renderer.input.removeListener("mouseup", this.#handleMouseUp);
        this.#hideSelectionRect();
        this.isMouseDown = false;
        // 恢复鼠标指针
        if (this.canvasElement) {
          this.canvasElement.style.cursor = "auto";
        }
        this.dispatchEvent({ type: "foxglove.selection-end", selectedObjects: [] });
        break;

      case "dragging":
        this.renderer.input.addListener("mousedown", this.#handleMouseDown);
        this.renderer.input.addListener("mousemove", this.#handleMouseMove);
        this.renderer.input.addListener("mouseup", this.#handleMouseUp);
        // 设置鼠标指针为十字
        if (this.canvasElement) {
          this.canvasElement.style.cursor = "crosshair";
        }
        this.dispatchEvent({ type: "foxglove.selection-start" });
        break;
    }
    this.renderer.queueAnimationFrame();
  }

  #handleMouseDown = (
    cursorCoords: THREE.Vector2,
    _worldSpaceCursorCoords: THREE.Vector3 | undefined,
    event: MouseEvent,
  ) => {
    // 仅在左键按下时开始拖拽
    if (event.button !== 0) {
      return;
    }

    this.startPoint.x = cursorCoords.x;
    this.startPoint.y = cursorCoords.y;
    this.endPoint.x = cursorCoords.x;
    this.endPoint.y = cursorCoords.y;
    this.isMouseDown = true;

    // 显示并更新矩形
    this.#showSelectionRect();
    this.#updateSelectionRect();

    this.renderer.queueAnimationFrame();
  };

  #handleMouseMove = (
    cursorCoords: THREE.Vector2,
    _worldSpaceCursorCoords: THREE.Vector3 | undefined,
    _event: MouseEvent,
  ) => {
    // 只有在鼠标按下且处于拖拽状态时才更新矩形
    if (!this.isMouseDown || this.selectionState !== "dragging") {
      return;
    }

    this.endPoint.x = cursorCoords.x;
    this.endPoint.y = cursorCoords.y;
    this.#updateSelectionRect();

    this.renderer.queueAnimationFrame();
  };

  #handleMouseUp = (
    cursorCoords: THREE.Vector2,
    _worldSpaceCursorCoords: THREE.Vector3 | undefined,
    event: MouseEvent,
  ) => {
    // 仅在左键释放时结束选择
    if (event.button !== 0 || !this.isMouseDown) {
      return;
    }

    this.endPoint.x = cursorCoords.x;
    this.endPoint.y = cursorCoords.y;
    this.isMouseDown = false;

    // 计算矩形尺寸
    const width = Math.abs(this.endPoint.x - this.startPoint.x);
    const height = Math.abs(this.endPoint.y - this.startPoint.y);

    // 最小选择区域阈值 (5 像素)
    if (width > 5 && height > 5) {
      // 执行框选计算
      const selectedObjects = this.#performBoxSelection(this.startPoint, this.endPoint);

      // 触发事件，传递选中的对象
      this.dispatchEvent({
        type: "foxglove.selection-end",
        selectedObjects,
      });
    }

    // 短暂显示后隐藏矩形，然后恢复待机状态
    setTimeout(() => {
      this.#hideSelectionRect();
      this.#setState("idle");
      this.renderer.queueAnimationFrame();
    }, 200);

    this.renderer.queueAnimationFrame();
  };

  #performBoxSelection(start: { x: number; y: number }, end: { x: number; y: number }): PickedRenderable[] {
    const selected: PickedRenderable[] = [];
    const camera = this.renderer.cameraHandler.getActiveCamera();
    const canvasSize = this.renderer.input.canvasSize;

    // 计算矩形的边界（确保 start 和 end 构成有效的矩形）
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    // 遍历场景中的所有对象，寻找可拾取的对象
    this.traverse((object) => {
      const renderable = object as Partial<Renderable>;

      // 只检查可拾取且可见的对象
      if (!renderable.pickable || !renderable.visible) {
        return;
      }

      // 获取对象的包围盒（世界坐标）
      const bbox = new THREE.Box3();
      if (renderable instanceof THREE.Object3D) {
        bbox.setFromObject(renderable);
      } else {
        // 如果没有几何体，使用对象的位置
        bbox.setFromCenterAndSize(
          renderable.position || new THREE.Vector3(),
          new THREE.Vector3(0.1, 0.1, 0.1)
        );
      }

      // 检查包围盒的 8 个角点是否在屏幕矩形内
      const corners = [
        new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
        new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z),
        new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
        new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z),
        new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z),
        new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z),
        new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
        new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
      ];

      let anyCornerInside = false;
      for (const corner of corners) {
        // 将世界坐标转换为屏幕坐标
        const screenPos = corner.clone().project(camera);

        // 将 NDC 坐标转换回屏幕像素坐标
        const screenX = (screenPos.x * 0.5 + 0.5) * canvasSize.width;
        const screenY = (-screenPos.y * 0.5 + 0.5) * canvasSize.height; // Y 轴翻转

        // 检查点是否在选择矩形内
        if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
          anyCornerInside = true;
          break;
        }
      }

      // 如果至少有一个角点在矩形内，则选择该对象
      if (anyCornerInside && renderable instanceof Renderable) {
        selected.push({
          renderable: renderable as Renderable,
          instanceIndex: undefined, // 暂时不支持实例选择
        });
      }
    });

    return selected;
  }
}
