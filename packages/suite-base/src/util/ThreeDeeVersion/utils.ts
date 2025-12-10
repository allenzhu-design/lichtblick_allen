// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// packages/suite-base/src/util/ThreeDeeVersion/utils.ts
/**
 * ThreeDee Panel 类型工具函数
 */

/**
 * 检查是否为自定义面板类型
 */
export function isCustomPanelType(panelType: string): boolean {
  return panelType.endsWith('_custom');
}

/**
 * 获取基础面板类型（移除 _custom 后缀）
 */
export function getBasePanelType(panelType: string): string {
  return panelType.endsWith('_custom') ? panelType.slice(0, -7) : panelType;
}

/**
 * 将面板类型转换为版本标识
 */
export function panelTypeToVersionLabel(panelType: string): string {
  return isCustomPanelType(panelType) ? 'custom' : 'standard';
}

/**
 * 获取面板友好名称（用于 UI 显示）
 */
export function getPanelDisplayName(panelType: string): string {
  if (panelType === '3D') {return '3D';}
  if (panelType === '3D_custom') {return '3D (Custom)';}
  if (panelType === 'Image') {return 'Image';}
  if (panelType === 'Image_custom') {return 'Image (Custom)';}
  return panelType;
}
