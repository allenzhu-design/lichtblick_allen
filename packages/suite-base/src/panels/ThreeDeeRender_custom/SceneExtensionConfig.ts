// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Cameras } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/Cameras";
import { FoxgloveGrid } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/FoxgloveGrid";
import { FrameAxes } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/FrameAxes";
import { Grids } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/Grids";
import { ImageMode } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/ImageMode/ImageMode";
import { Images } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/Images";
import { LaserScans } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/LaserScans";
import { Markers } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/Markers";
import { OccupancyGrids } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/OccupancyGrids";
import { PointClouds } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/PointClouds";
import { Polygons } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/Polygons";
import { PoseArrays } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/PoseArrays";
import { Poses } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/Poses";
import { PublishSettings } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/PublishSettings";
import { FoxgloveSceneEntities } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/SceneEntities";
import { SceneSettings } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/SceneSettings";
import { Urdfs } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/Urdfs";
import { VelodyneScans } from "@lichtblick/suite-base/panels/ThreeDeeRender_custom/renderables/VelodyneScans";

import { IRenderer } from "./IRenderer";
import { SceneExtension } from "./SceneExtension";
import { MeasurementTool } from "./renderables/MeasurementTool";
import { PublishClickTool } from "./renderables/PublishClickTool";
import { SelectionTool } from "./renderables/SelectionTool";
import { InterfaceMode } from "./types";

export type SceneExtensionConfig = {
  /** Reserved because the Renderer has members that reference them specifically */
  reserved: ReservedSceneExtensionConfig;
  extensionsById: Record<string, ExtensionOverride<SceneExtension>>;
};

export type ReservedSceneExtensionConfig = {
  imageMode: ExtensionOverride<ImageMode>;
  measurementTool: ExtensionOverride<MeasurementTool>;
  selectionTool: ExtensionOverride<SelectionTool>;
  publishClickTool: ExtensionOverride<PublishClickTool>;
};

export type ExtensionOverride<ExtensionType extends SceneExtension> = {
  init: (renderer: IRenderer) => ExtensionType;
  /** Which interfaceModes this extension is supported in. If undefined, will default be present in BOTH '3d' and 'image' modes */
  supportedInterfaceModes?: InterfaceMode[];
};

export const DEFAULT_SCENE_EXTENSION_CONFIG: SceneExtensionConfig = {
  reserved: {
    imageMode: {
      init: (renderer: IRenderer) => new ImageMode(renderer),
    },
    measurementTool: {
      init: (renderer: IRenderer) => new MeasurementTool(renderer),
    },
    selectionTool: {
      init: (renderer: IRenderer) => new SelectionTool(renderer),
    },
    publishClickTool: {
      init: (renderer: IRenderer) => new PublishClickTool(renderer),
    },
  },
  extensionsById: {
    [PublishSettings.extensionId]: {
      init: (renderer: IRenderer) => new PublishSettings(renderer),
      supportedInterfaceModes: ["3d"],
    },
    [Images.extensionId]: {
      init: (renderer: IRenderer) => new Images(renderer),
      supportedInterfaceModes: ["3d"],
    },
    [Cameras.extensionId]: {
      init: (renderer: IRenderer) => new Cameras(renderer),
      supportedInterfaceModes: ["3d"],
    },
    [SceneSettings.extensionId]: {
      init: (renderer: IRenderer) => new SceneSettings(renderer),
    },
    [FrameAxes.extensionId]: {
      init: (renderer: IRenderer) =>
        // only show frame axes and labels by default when in 3d mode
        new FrameAxes(renderer, { visible: renderer.interfaceMode === "3d" }),
    },
    [Grids.extensionId]: {
      init: (renderer: IRenderer) => new Grids(renderer),
    },
    [Markers.extensionId]: {
      init: (renderer: IRenderer) => new Markers(renderer),
    },
    [FoxgloveSceneEntities.extensionId]: {
      init: (renderer: IRenderer) => new FoxgloveSceneEntities(renderer),
    },
    [FoxgloveGrid.extensionId]: {
      init: (renderer: IRenderer) => new FoxgloveGrid(renderer),
    },
    [LaserScans.extensionId]: {
      init: (renderer: IRenderer) => new LaserScans(renderer),
    },
    [OccupancyGrids.extensionId]: {
      init: (renderer: IRenderer) => new OccupancyGrids(renderer),
    },
    [PointClouds.extensionId]: {
      init: (renderer: IRenderer) => new PointClouds(renderer),
    },
    [Polygons.extensionId]: {
      init: (renderer: IRenderer) => new Polygons(renderer),
    },
    [Poses.extensionId]: {
      init: (renderer: IRenderer) => new Poses(renderer),
    },
    [PoseArrays.extensionId]: {
      init: (renderer: IRenderer) => new PoseArrays(renderer),
    },
    [Urdfs.extensionId]: {
      init: (renderer: IRenderer) => new Urdfs(renderer),
    },
    [VelodyneScans.extensionId]: {
      init: (renderer: IRenderer) => new VelodyneScans(renderer),
    },
  },
};
