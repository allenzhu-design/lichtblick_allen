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
import "./SelectionTool.css";

type SelectionMode = "inactive" | "active";
type SelectionState = "idle" | "dragging";

/**
 * 筛选参数接口
 */
export interface FilterValues {
  speed: string;
  height: string;
  staticDynamic: string;
}

interface SelectionToolEventMap extends THREE.Object3DEventMap {
  "foxglove.selection-start": object;
  "foxglove.selection-end": { selectedObjects: PickedRenderable[]; filters?: FilterValues };
  "foxglove.selection-mode-changed": { mode: SelectionMode };
  "foxglove.filter-changed": FilterValues;
  "foxglove.filter-panel-toggled": { visible: boolean };
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
 * 模式设计（参考 SuperSplat）：
 * - inactive（未激活）：工具未激活，不响应鼠标
 * - active（已激活）：工具已激活，UI 高亮，可多次框选
 *
 * 每次框选后：
 * 1. 虚线框显示
 * 2. 执行对象选择
 * 3. 虚线框消失（200ms 延迟）
 * 4. 保持 active 状态，等待下一次框选
 *
 * 再次点击 UI 可切换回 inactive 状态
 *
 */
export class SelectionTool extends SceneExtension<Renderable, SelectionToolEventMap> {
  public static extensionId = "foxglove.SelectionTool";

  private selectionMode: SelectionMode = "inactive";
  private selectionState: SelectionState = "idle";
  private startPoint = { x: 0, y: 0 };
  private endPoint = { x: 0, y: 0 };
  private isMouseDown = false;

  // Filter 相关
  private filterPanelVisible = false;
  private filterValues: FilterValues = {
    speed: "",
    height: "",
    staticDynamic: "",
  };

  // SVG 相关元素
  private svgContainer: SVGSVGElement | null = null;
  private rectElement: SVGRectElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;

  // 框选过程中是否冻结场景
  private isSelectionInProgress = false;

  // 缓存frame信息以确保框选时的坐标一致性
  private cachedCamera: THREE.Camera | null = null;
  private cachedCanvasSize: { width: number; height: number } | null = null;

  // 选中的点的索引和对应的renderable
  private selectedPointIndices = new Map<Renderable, Set<number>>();

  public constructor(renderer: IRenderer, name: string = SelectionTool.extensionId) {
    super(name, renderer);

    // 获取 Canvas 元素
    this.canvasElement = renderer.gl.domElement;

    // 初始化 SVG 容器
    this.#initSVGContainer();

    this.#setMode("inactive");
  }

  public override dispose(): void {
    this.#removeSVGContainer();
    if (this.selectionMode === "active") {
      this.#removeEventListeners();
    }
    super.dispose();
  }

  /**
   * 切换工具模式
   *
   * inactive ↔ active 切换
   * - 点击 UI 按钮时调用此方法
   * - 自动切换高亮状态和事件监听
   *
   */
  public toggleMode(): void {
    if (this.selectionMode === "inactive") {
      this.#setMode("active");
    } else {
      this.#setMode("inactive");
    }
  }

  public get mode(): SelectionMode {
    return this.selectionMode;
  }

  public get state(): SelectionState {
    return this.selectionState;
  }

  public get isSelectionDragging(): boolean {
    return this.isSelectionInProgress;
  }

  /**
   * 获取选中的点的信息
   */
  public getSelectedPoints(): Array<{ renderable: Renderable; indices: number[] }> {
    const result: Array<{ renderable: Renderable; indices: number[] }> = [];
    for (const [renderable, indices] of this.selectedPointIndices.entries()) {
      result.push({ renderable, indices: Array.from(indices) });
    }
    return result;
  }

  /**
   * 清空选择
   */
  public clearSelection(): void {
    this.selectedPointIndices.clear();
  }

  /**
   * 切换筛选面板可见性
   */
  public toggleFilterPanel(): void {
    this.filterPanelVisible = !this.filterPanelVisible;
    this.dispatchEvent({
      type: "foxglove.filter-panel-toggled",
      visible: this.filterPanelVisible,
    });
  }

  /**
   * 获取筛选面板可见状态
   */
  public getFilterPanelVisible(): boolean {
    return this.filterPanelVisible;
  }

  /**
   * 设置筛选值
   */
  public setFilterValues(filters: FilterValues): void {
    this.filterValues = filters;
    this.dispatchEvent({
      type: "foxglove.filter-changed",
      ...filters,
    });
  }

  /**
   * 获取筛选值
   */
  public getFilterValues(): FilterValues {
    return { ...this.filterValues };
  }

  /**
   * 向后兼容：startSelecting() 等同于切换到 active
   */
  public startSelecting(): void {
    if (this.selectionMode === "inactive") {
      this.toggleMode();
    }
  }

  /**
   * 向后兼容：stopSelecting() 等同于切换到 inactive
   */
  public stopSelecting(): void {
    if (this.selectionMode === "active") {
      this.toggleMode();
    }
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
    // 设置内联样式，但不设置 display（由 CSS 类控制）
    this.svgContainer.style.position = "absolute";
    this.svgContainer.style.top = "0";
    this.svgContainer.style.left = "0";
    this.svgContainer.style.width = "100%";
    this.svgContainer.style.height = "100%";
    this.svgContainer.style.pointerEvents = "none";
    // 初始状态：隐藏
    this.svgContainer.style.display = "none";

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
      // 确保显示
      this.svgContainer.style.display = "";
    }
  }

  /**
   * 隐藏 SVG 选择框
   */
  #hideSelectionRect(): void {
    if (this.svgContainer) {
      this.svgContainer.classList.add("hidden");
      // 强制隐藏
      this.svgContainer.style.display = "none";
    }
  }

  /**
   * 添加事件监听器（激活模式时调用）
   */
  #addEventListeners(): void {
    this.renderer.input.addListener("mousedown", this.#handleMouseDown);
    this.renderer.input.addListener("mousemove", this.#handleMouseMove);
    this.renderer.input.addListener("mouseup", this.#handleMouseUp);
  }

  /**
   * 移除事件监听器（停用模式时调用）
   */
  #removeEventListeners(): void {
    this.renderer.input.removeListener("mousedown", this.#handleMouseDown);
    this.renderer.input.removeListener("mousemove", this.#handleMouseMove);
    this.renderer.input.removeListener("mouseup", this.#handleMouseUp);
  }

  /**
   * 设置工具模式
   */
  #setMode(mode: SelectionMode): void {
    if (this.selectionMode === mode) {
      return;
    }

    this.selectionMode = mode;

    switch (mode) {
      case "inactive":
        // 清理状态
        this.isMouseDown = false;
        this.#hideSelectionRect();
        this.#removeEventListeners();

        // 恢复鼠标指针
        if (this.canvasElement) {
          this.canvasElement.style.cursor = "auto";
        }

        // 触发模式变更事件
        this.dispatchEvent({ type: "foxglove.selection-mode-changed", mode: "inactive" });
        break;

      case "active":
        // 设置鼠标指针为十字
        if (this.canvasElement) {
          this.canvasElement.style.cursor = "crosshair";
        }

        // 添加事件监听
        this.#addEventListeners();

        // 触发模式变更事件
        this.dispatchEvent({ type: "foxglove.selection-mode-changed", mode: "active" });
        break;
    }

    this.renderer.queueAnimationFrame();
  }

  #handleMouseDown = (
    cursorCoords: THREE.Vector2,
    _worldSpaceCursorCoords: THREE.Vector3 | undefined,
    event: MouseEvent,
  ) => {
    // 仅在工具激活且左键按下时开始拖拽
    if (this.selectionMode !== "active" || event.button !== 0) {
      return;
    }

    // 禁用相机控制，防止框选时相机移动
    const cameraHandler = this.renderer.cameraHandler;
    if (cameraHandler && "setControlsEnabled" in cameraHandler) {
      (cameraHandler as any).setControlsEnabled(false);
    }

    // 缓存frame的相机和画布尺寸，用于框选计算
    this.cachedCamera = this.renderer.cameraHandler.getActiveCamera().clone();
    // 注意：canvasSize是THREE.Vector2，有x和y属性而不是width和height
    this.cachedCanvasSize = { width: this.renderer.input.canvasSize.x, height: this.renderer.input.canvasSize.y };
    console.log(`[#handleMouseDown] 缓存的 canvasSize: ${this.cachedCanvasSize.width}x${this.cachedCanvasSize.height}`);

    this.startPoint.x = cursorCoords.x;
    this.startPoint.y = cursorCoords.y;
    this.endPoint.x = cursorCoords.x;
    this.endPoint.y = cursorCoords.y;
    this.isMouseDown = true;
    this.selectionState = "dragging";
    this.isSelectionInProgress = true;

    // 显示并更新矩形
    this.#showSelectionRect();
    this.#updateSelectionRect();

    // 触发框选开始事件
    this.dispatchEvent({ type: "foxglove.selection-start" });

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
    // 仅在左键释放时结束拖拽
    if (event.button !== 0 || !this.isMouseDown || this.selectionState !== "dragging") {
      return;
    }

    this.endPoint.x = cursorCoords.x;
    this.endPoint.y = cursorCoords.y;
    this.isMouseDown = false;
    this.selectionState = "idle";
    this.isSelectionInProgress = false;

    // 重新启用相机控制
    const cameraHandler = this.renderer.cameraHandler;
    if (cameraHandler && "setControlsEnabled" in cameraHandler) {
      (cameraHandler as any).setControlsEnabled(true);
    }

    // 计算矩形尺寸
    const width = Math.abs(this.endPoint.x - this.startPoint.x);
    const height = Math.abs(this.endPoint.y - this.startPoint.y);
    const minX = Math.min(this.startPoint.x, this.endPoint.x);
    const maxX = Math.max(this.startPoint.x, this.endPoint.x);
    const minY = Math.min(this.startPoint.y, this.endPoint.y);
    const maxY = Math.max(this.startPoint.y, this.endPoint.y);

    // 最小选择区域阈值 (5 像素)
    const boxRect = `[${minX.toFixed(0)},${minY.toFixed(0)}]-[${maxX.toFixed(0)},${maxY.toFixed(0)}]`;
    console.log(`[SelectionTool] 框选完成: 宽${width}px, 高${height}px, 范围${boxRect}`);

    if (width > 5 && height > 5) {
      console.log(`[SelectionTool] 开始执行框选计算...`);
      // 执行框选计算
      const selectedObjects = this.#performBoxSelection(this.startPoint, this.endPoint);
      console.log(`[SelectionTool] 框选完成，找到 ${selectedObjects.length} 个对象`);

      // 将选中的对象按renderable分组
      this.selectedPointIndices.clear();
      for (const picked of selectedObjects) {
        const renderable = picked.renderable;
        const index = picked.instanceIndex; // 就是该点在其所属点云几何体（BufferAttribute）中的顺序索引。
        if (index !== undefined) {
          if (!this.selectedPointIndices.has(renderable)) {
            this.selectedPointIndices.set(renderable, new Set());
          }
          this.selectedPointIndices.get(renderable)!.add(index);
        }
      }

      console.log(`[SelectionTool] 总共选中 ${this.selectedPointIndices.size} 个 renderable, ${Array.from(this.selectedPointIndices.values()).reduce((sum, s) => sum + s.size, 0)} 个点`);

      // 触发事件，传递选中的对象和筛选值
      this.dispatchEvent({
        type: "foxglove.selection-end",
        selectedObjects,
        filters: this.filterValues,
      });
    }

    // 关键：不改变 selectionMode，保持 active 状态
    // 用户可以继续框选，无需再次点击 UI 按钮
    this.#hideSelectionRect();

    // 清除缓存的相机和画布尺寸
    this.cachedCamera = null;
    this.cachedCanvasSize = null;

    this.renderer.queueAnimationFrame();
  };

  #performBoxSelection(start: { x: number; y: number }, end: { x: number; y: number }): PickedRenderable[] {
    const selected: PickedRenderable[] = [];

    // 使用缓存的相机和画布尺寸，确保框选计算的一致性
    const camera = this.cachedCamera ?? this.renderer.cameraHandler.getActiveCamera();
    const cachedSize = this.cachedCanvasSize ?? { width: this.renderer.input.canvasSize.x, height: this.renderer.input.canvasSize.y };

    console.log(`[#performBoxSelection] 检查缓存值: cachedCanvasSize=${this.cachedCanvasSize ? 'exists' : 'null'}, canvasSize=${cachedSize.width}x${cachedSize.height}`);

    // 计算矩形的边界（确保 start 和 end 构成有效的矩形）
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    console.log(`[#performBoxSelection] 开始遍历，画布尺寸=${cachedSize.width}x${cachedSize.height}, 扩展数=${this.renderer.sceneExtensions.size}`);

    // 遍历所有 sceneExtensions，找到可拾取的对象
    for (const sceneExtension of this.renderer.sceneExtensions.values()) {
      console.log(`[#performBoxSelection] 遍历扩展: ${sceneExtension.name}`);
      let objectCount = 0;
      let pickableCount = 0;
      sceneExtension.traverse((object: THREE.Object3D) => {
      const renderable = object as Partial<Renderable>;
      objectCount++;

      // 只检查可拾取且可见的对象
      if (!renderable.pickable || !renderable.visible || !(object instanceof THREE.Object3D)) {
        return;
      }

      pickableCount++;
      console.log(`[#performBoxSelection] ${sceneExtension.name} 中找到可拾取对象: ${object.name}, pickable=${renderable.pickable}, visible=${renderable.visible}, isPoints=${object instanceof THREE.Points}`);

      const obj3d = object;

      // 特殊处理点云/点群：遍历几何体中的每个点
      if (obj3d instanceof THREE.Points && obj3d.geometry?.attributes.position) {
        const positionAttribute = obj3d.geometry.attributes.position as THREE.BufferAttribute;
        const matrixWorld = obj3d.matrixWorld;
        console.log(`[#performBoxSelection] 找到 THREE.Points: ${obj3d.name}, 点数=${positionAttribute.count}`);

        let pointsInBox = 0;
        // 遍历每个顶点（点）
        for (let i = 0; i < positionAttribute.count; i++) {
          // 获取点的本地坐标
          const x = positionAttribute.getX(i);
          const y = positionAttribute.getY(i);
          const z = positionAttribute.getZ(i);

          // 转换为世界坐标
          const worldPos = new THREE.Vector3(x, y, z).applyMatrix4(matrixWorld);

          // 投影到屏幕坐标
          const screenPos = worldPos.clone().project(camera);
          const screenX = (screenPos.x * 0.5 + 0.5) * cachedSize.width;
          const screenY = (-screenPos.y * 0.5 + 0.5) * cachedSize.height; // Y 轴翻转

          // 检查点是否在选择矩形内
          if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
            pointsInBox++;
            selected.push({
              renderable: renderable as Renderable,
              instanceIndex: i, // 存储点的索引
            });
          }
        }
        console.log(`[#performBoxSelection] 此 Points 对象中有 ${pointsInBox} 个点在框选范围内`);
      } else {
        // 非点云对象：首先检查其子对象中是否有 THREE.Points
        let foundPointsInChildren = false;
        obj3d.traverse((child: THREE.Object3D) => {
          if (child === obj3d) {return;} // 跳过自身

          if (child instanceof THREE.Points && child.geometry?.attributes.position) {
            foundPointsInChildren = true;
            const positionAttribute = child.geometry.attributes.position as THREE.BufferAttribute;
            const matrixWorld = child.matrixWorld;
            console.log(`[#performBoxSelection] 在 ${object.name} 的子对象中找到 THREE.Points: ${child.name}, 点数=${positionAttribute.count}`);

            let pointsInBox = 0;
            // 遍历每个顶点（点）
            for (let i = 0; i < positionAttribute.count; i++) {
              // 获取点的本地坐标
              const x = positionAttribute.getX(i);
              const y = positionAttribute.getY(i);
              const z = positionAttribute.getZ(i);

              // 转换为世界坐标
              const worldPos = new THREE.Vector3(x, y, z).applyMatrix4(matrixWorld);

              // 投影到屏幕坐标
              const screenPos = worldPos.clone().project(camera);
              const screenX = (screenPos.x * 0.5 + 0.5) * cachedSize.width;
              const screenY = (-screenPos.y * 0.5 + 0.5) * cachedSize.height; // Y 轴翻转

              // 检查点是否在选择矩形内
              if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
                pointsInBox++;
                selected.push({
                  renderable: renderable as Renderable,
                  instanceIndex: i, // 存储点的索引
                });
              }
            }
            console.log(`[#performBoxSelection] 在 ${object.name} 中找到 ${pointsInBox} 个点在框选范围内`);
          }
        });

        // 如果没有在子对象中找到点，则检查包围盒的 8 个角点是否在屏幕矩形内
        if (!foundPointsInChildren) {
          const bbox = new THREE.Box3();
          bbox.setFromObject(obj3d);

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
            const screenX = (screenPos.x * 0.5 + 0.5) * cachedSize.width;
            const screenY = (-screenPos.y * 0.5 + 0.5) * cachedSize.height; // Y 轴翻转

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
        }
      }
      });
      console.log(`[#performBoxSelection] ${sceneExtension.name} 完成: 总对象数=${objectCount}, 可拾取对象数=${pickableCount}`);
    }

    console.log(`[#performBoxSelection] 最终找到 ${selected.length} 个对象`);
    return selected;
  }
}
