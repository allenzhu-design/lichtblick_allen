// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Panel Registry for managing both ThreeDeeRender and ThreeDeeRender_custom panels
 * This module dynamically loads the appropriate panel based on the active renderer version
 */

import { lazy, Suspense } from "react";
import React from "react";

import { RendererVersionType } from "@lichtblick/suite-base/context/RendererVersionContext";
import Panel from "@lichtblick/suite-base/components/Panel";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";

type PanelProps = {
  config: Record<string, unknown>;
  saveConfig: SaveConfig<Record<string, unknown>>;
  onDownloadImage?: (blob: Blob, fileName: string) => void;
  debugPicking?: boolean;
};

type PanelDefinition = {
  panelType: string;
  defaultConfig: Record<string, unknown>;
};

// Lazy load panels dynamically
const DefaultThreeDeeRenderPanel = lazy(() => import('@lichtblick/suite-base/panels/ThreeDeeRender'));
const DefaultImagePanel = lazy(() =>
  import('@lichtblick/suite-base/panels/ThreeDeeRender').then(m => ({ default: m.ImagePanel }))
);

const CustomThreeDeeRenderPanel = lazy(() => import('@lichtblick/suite-base/panels/ThreeDeeRender_custom'));
const CustomImagePanel = lazy(() =>
  import('@lichtblick/suite-base/panels/ThreeDeeRender_custom').then(m => ({ default: m.ImagePanel }))
);

export interface PanelRegistry {
  get3DPanel(version?: RendererVersionType): React.ComponentType<PanelProps>;
  getImagePanel(version?: RendererVersionType): React.ComponentType<PanelProps>;
}

export function createPanelRegistry(): PanelRegistry {
  return {
    get3DPanel(version?: RendererVersionType) {
      return version === 'custom'
        ? CustomThreeDeeRenderPanel as any
        : DefaultThreeDeeRenderPanel as any;
    },
    getImagePanel(version?: RendererVersionType) {
      return version === 'custom'
        ? CustomImagePanel as any
        : DefaultImagePanel as any;
    },
  };
}

const panelRegistry = createPanelRegistry();

/**
 * Get the 3D panel component for the current renderer version
 */
export function get3DPanel(version?: RendererVersionType) {
  return panelRegistry.get3DPanel(version);
}

/**
 * Get the Image panel component for the current renderer version
 */
export function getImagePanel(version?: RendererVersionType) {
  return panelRegistry.getImagePanel(version);
}
