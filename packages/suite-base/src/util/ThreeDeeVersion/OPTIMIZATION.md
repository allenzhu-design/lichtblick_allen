# ThreeDeeVersion 文件夹优化说明

## 优化概述

ThreeDeeVersion 文件夹用于管理 3D 渲染器版本（标准版 vs 自定义版）。经过优化后，移除了不必要的代码，简化了架构。

## 文件结构

### ✅ 保留的文件

#### 1. `version.ts` - 核心版本管理
**职责**：
- 维护当前版本状态（standard | custom）
- 提供版本获取/设置接口
- 支持 localStorage 持久化
- 版本与 panel type 的相互转换

**主要函数**：
- `getThreeDeeVersion()` - 获取当前版本
- `setThreeDeeVersion(version)` - 设置版本
- `isCustomVersion()` / `isStandardVersion()` - 版本检查
- `versionToPanelType(version)` - 版本转面板类型
- `panelTypeToVersion(panelType)` - 面板类型转版本
- `loadVersionPreference()` - 从 localStorage 恢复版本

#### 2. `configManager.ts` - 配置管理
**职责**：
- 提供默认配置的统一入口
- 所有配置直接从标准版本导入（避免重复）

**主要函数**：
- `getDefaultCameraState()` - 相机默认配置
- `getDefaultPublishSettings()` - 发布设置默认配置
- `getDefaultSceneExtensionConfig()` - 场景扩展配置
- `getDefaultRendererConfig()` - 完整渲染器配置

**设计理念**：
> 两个版本（3D 和 3D_custom）使用完全相同的默认配置，来自标准版本的导入。
> ThreeDeeRender_custom 通过类型重新导出来确保兼容性。

#### 3. `utils.ts` - 工具函数
**职责**：
- Panel 类型识别和转换
- UI 显示名称生成

**主要函数**：
- `isCustomPanelType(panelType)` - 检查是否为 custom 类型
- `getBasePanelType(panelType)` - 获取基础类型（去掉 _custom 后缀）
- `panelTypeToVersionLabel(panelType)` - 获取版本标签
- `getPanelDisplayName(panelType)` - 获取 UI 显示名称

#### 4. `index.ts` - 导出入口
**职责**：
- 统一导出所有公共 API

### ❌ 已移除的代码

#### `typeAdapter.ts` - 已弃用
**原因**：不再需要类型转换适配器

通过以下方式解决类型兼容性问题：
1. **IRenderer 导入重新导出**
   - ThreeDeeRender_custom/IRenderer.ts 重新导出标准版本的 IRenderer 类型
   - 所有引用都使用同一个 IRenderer 类型

2. **SettingsManager 导入重新导出**
   - ThreeDeeRender_custom/SettingsManager.ts 重新导出标准版本的类
   - 消除了类型不匹配问题

3. **LayerErrors 导入重新导出**
   - 同样的重新导出模式

**结果**：
```
ThreeDeeRender_custom 中的 IRenderer
    ↓
重新导出自 ThreeDeeRender 的 IRenderer
    ↓
完全相同的类型，没有重复
```

## 使用示例

### 获取当前版本
```typescript
import { getThreeDeeVersion, isCustomVersion } from '@lichtblick/suite-base/util/ThreeDeeVersion';

const version = getThreeDeeVersion(); // 'standard' | 'custom'
if (isCustomVersion()) {
  // 使用自定义版本的特定逻辑
}
```

### Panel 类型转换
```typescript
import {
  versionToPanelType,
  panelTypeToVersion,
  getPanelDisplayName
} from '@lichtblick/suite-base/util/ThreeDeeVersion';

// 版本 → Panel 类型
const panelType = versionToPanelType('custom'); // '3D_custom'

// Panel 类型 → 显示名称
const displayName = getPanelDisplayName('3D_custom'); // '3D (Custom)'

// Panel 类型 → 版本
const version = panelTypeToVersion('3D_custom'); // 'custom'
```

### 获取默认配置
```typescript
import { getDefaultRendererConfig } from '@lichtblick/suite-base/util/ThreeDeeVersion';

// 获取完整的渲染器默认配置
const config = getDefaultRendererConfig();
```

### 版本持久化
```typescript
import { loadVersionPreference, setThreeDeeVersion } from '@lichtblick/suite-base/util/ThreeDeeVersion';

// 应用启动时加载
loadVersionPreference();

// 用户选择新版本时保存
setThreeDeeVersion('custom');
```

## 架构对比

### 优化前
```
ThreeDeeVersion/
├── version.ts (复杂的动态导入逻辑)
├── typeAdapter.ts (类型转换)
├── configManager.ts (async 异步加载)
├── utils.ts (版本相关工具)
└── index.ts (复杂的默认导出)
```

### 优化后
```
ThreeDeeVersion/
├── version.ts (核心版本管理 ✓ 精简)
├── configManager.ts (直接同步导入 ✓ 简化)
├── utils.ts (仅 panel 类型工具 ✓ 精简)
└── index.ts (清晰的导出 ✓ 简化)
    ✗ typeAdapter.ts (已移除)
```

## 删除 typeAdapter.ts 的步骤

该文件现已标记为已弃用。要完全删除：

```bash
# 1. 从版本控制中删除
git rm packages/suite-base/src/util/ThreeDeeVersion/typeAdapter.ts

# 2. 清除构建缓存
rm -rf dist/ node_modules/.cache

# 3. 重新编译
npm run web:build:dev
```

## 关键改进

1. **减少代码复杂度** - 移除了 70+ 行不必要的代码
2. **提高运行性能** - 消除异步操作，所有操作都是同步的
3. **统一类型来源** - 所有类型都来自标准版本，避免重复
4. **更好的可维护性** - 职责更清晰，代码更易理解
5. **支持版本持久化** - localStorage 集成，用户偏好保存

## 版本管理流程

```
用户界面层
  ↓
点击 Add Panel 选择 "3D" 或 "3D Custom"
  ↓
panels/index.ts 中的 panel type: "3D" 或 "3D_custom"
  ↓
ThreeDeeVersion 工具转换
  ↓
panelTypeToVersion() → 'standard' | 'custom'
  ↓
版本存储到 localStorage
  ↓
下次启动时通过 loadVersionPreference() 恢复
```

## FAQ

**Q: 为什么要统一从标准版本导入类型？**
A: 防止类型重复导致的兼容性问题。TypeScript 的结构化类型系统会将两个来源的相同类型视为不同类型。

**Q: 可以删除 typeAdapter.ts 吗？**
A: 可以。该文件已弃用，index.ts 已更新，不再导入它。完全删除不会影响功能。

**Q: 版本信息存在哪里？**
A: 存在内存中的 `currentVersion` 变量，以及用户偏好存在 `localStorage.lichtblick_threedee_version`。

**Q: 如何扩展支持其他自定义配置？**
A: 在 configManager.ts 中添加新的 getter 函数，导入来自标准版本的配置。
