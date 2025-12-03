// packages/suite-base/src/util/ThreeDeeVersion/version.ts
/**
 * ThreeDee 渲染器版本管理器
 * 用于区分 ThreeDeeRender 标准版和 ThreeDeeRender_custom 自定义版
 *
 * 注意：版本管理主要用于 UI 层面（panel type: "3D" vs "3D_custom"）
 * 实际的 IRenderer 和相关类型统一来自标准版，通过导入重新导出实现
 */

export type ThreeDeeVersion = 'standard' | 'custom';
export type ThreeDeePanel = 'ThreeDeeRender' | 'ThreeDeeRender_custom';

// 默认版本（仅用于 UI 选择，不影响实际导入）
const DEFAULT_VERSION: ThreeDeeVersion = 'standard';
let currentVersion: ThreeDeeVersion = DEFAULT_VERSION;

/**
 * 获取当前 ThreeDee 渲染器版本
 */
export function getThreeDeeVersion(): ThreeDeeVersion {
  return currentVersion;
}

/**
 * 设置 ThreeDee 渲染器版本
 * @param version 要设置的版本
 */
export function setThreeDeeVersion(version: ThreeDeeVersion): void {
  currentVersion = version;
  // 可选：保存到 localStorage 以便持久化
  try {
    localStorage.setItem('lichtblick_threedee_version', version);
  } catch (error) {
    console.warn('Failed to save version preference:', error);
  }
}

/**
 * 从 localStorage 加载版本偏好
 */
export function loadVersionPreference(): void {
  try {
    const saved = localStorage.getItem('lichtblick_threedee_version');
    if (saved === 'custom' || saved === 'standard') {
      currentVersion = saved;
    }
  } catch (error) {
    console.warn('Failed to load version preference:', error);
  }
}

/**
 * 检查是否使用自定义版本
 */
export function isCustomVersion(): boolean {
  return currentVersion === 'custom';
}

/**
 * 检查是否使用标准版本
 */
export function isStandardVersion(): boolean {
  return currentVersion === 'standard';
}

/**
 * 将版本转换为 panel 类型
 */
export function versionToPanelType(version: ThreeDeeVersion): string {
  return version === 'custom' ? '3D_custom' : '3D';
}

/**
 * 将 panel 类型转换为版本
 */
export function panelTypeToVersion(panelType: string): ThreeDeeVersion {
  return panelType === '3D_custom' ? 'custom' : 'standard';
}
