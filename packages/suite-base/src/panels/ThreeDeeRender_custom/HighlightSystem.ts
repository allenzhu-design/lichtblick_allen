// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import * as THREE from "three";
import type { Renderable } from "./Renderable";
import type { PickedRenderable } from "./Picker";

/**
 * 高亮系统 - 用于在点云中高亮显示选中的点
 */
export class HighlightSystem {
  private originalColors: Map<
    Renderable,
    { attribute: THREE.BufferAttribute; colors: Float32Array }
  > = new Map();

  /**
   * 对指定的点进行高亮处理
   * @param selectedPoints 选中的点
   * @param highlightColor 高亮颜色 (RGB: 0-1范围)
   */
  public highlight(
    selectedPoints: Array<PickedRenderable>,
    highlightColor: { r: number; g: number; b: number } = { r: 0, g: 1, b: 0 },
  ): void {
    // 清除之前的高亮
    this.clearHighlight();

    // 按renderable分组
    const groupedByRenderable = new Map<Renderable, number[]>();
    for (const picked of selectedPoints) {
      const indices = groupedByRenderable.get(picked.renderable) ?? [];
      if (picked.instanceIndex !== undefined) {
        indices.push(picked.instanceIndex);
      }
      groupedByRenderable.set(picked.renderable, indices);
    }

    // 为每个renderable应用高亮
    for (const [renderable, indices] of groupedByRenderable.entries()) {
      this.highlightRenderable(renderable, indices, highlightColor);
    }
  }

  /**
   * 清除所有高亮
   */
  public clearHighlight(): void {
    for (const { attribute, colors } of this.originalColors.values()) {
      // 恢复原始颜色
      attribute.array.set(colors);
      attribute.needsUpdate = true;
    }
    this.originalColors.clear();
  }

  /**
   * 对单个renderable应用高亮
   */
  private highlightRenderable(
    renderable: Renderable,
    indices: number[],
    highlightColor: { r: number; g: number; b: number },
  ): void {
    // 获取点云对象
    const obj3d = renderable as unknown as THREE.Object3D;
    if (!(obj3d instanceof THREE.Points) || !obj3d.geometry) {
      return;
    }

    const geometry = obj3d.geometry;
    const colorAttribute = geometry.attributes.color as THREE.BufferAttribute | undefined;

    if (!colorAttribute) {
      // 如果没有颜色属性，创建一个
      return;
    }

    // 保存原始颜色
    const originalColors = new Float32Array(colorAttribute.array);
    this.originalColors.set(renderable, { attribute: colorAttribute, colors: originalColors });

    // 应用高亮颜色到指定的点
    for (const index of indices) {
      if (index * 3 + 2 < colorAttribute.array.length) {
        (colorAttribute.array as Float32Array)[index * 3] = highlightColor.r;
        (colorAttribute.array as Float32Array)[index * 3 + 1] = highlightColor.g;
        (colorAttribute.array as Float32Array)[index * 3 + 2] = highlightColor.b;
      }
    }

    colorAttribute.needsUpdate = true;
  }
}
