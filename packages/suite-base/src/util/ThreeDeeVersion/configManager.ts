// packages/suite-base/src/util/ThreeDeeVersion/configManager.ts
/**
 * ThreeDee 渲染器配置管理器
 *
 * 注意：所有默认配置直接从标准版本导入
 * ThreeDeeRender_custom 通过重新导出来使用相同的类型和默认值
 * 这确保两个版本的类型完全兼容
 */

import { DEFAULT_CAMERA_STATE } from "@lichtblick/suite-base/panels/ThreeDeeRender/camera";
import { DEFAULT_PUBLISH_SETTINGS } from "@lichtblick/suite-base/panels/ThreeDeeRender/renderables/PublishSettings";
import { DEFAULT_SCENE_EXTENSION_CONFIG } from "@lichtblick/suite-base/panels/ThreeDeeRender/SceneExtensionConfig";

/**
 * 获取相机状态默认配置
 */
export function getDefaultCameraState() {
  return DEFAULT_CAMERA_STATE;
}

/**
 * 获取发布设置默认配置
 */
export function getDefaultPublishSettings() {
  return DEFAULT_PUBLISH_SETTINGS;
}

/**
 * 获取场景扩展默认配置
 */
export function getDefaultSceneExtensionConfig() {
  return DEFAULT_SCENE_EXTENSION_CONFIG;
}

/**
 * 获取默认渲染器配置
 */
export function getDefaultRendererConfig() {
  return {
    cameraState: getDefaultCameraState(),
    followMode: "follow-pose",
    followTf: undefined,
    scene: {},
    transforms: {},
    topics: {},
    layers: {},
    publish: getDefaultPublishSettings(),
    imageMode: {},
  };
}
