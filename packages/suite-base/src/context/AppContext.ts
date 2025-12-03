// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";
import { DeepPartial } from "ts-essentials";
import { StoreApi } from "zustand";

import { Immutable, SettingsTreeField, SettingsTreeNode } from "@lichtblick/suite";
import { AppBarMenuItem } from "@lichtblick/suite-base/components/AppBar/types";
import { LayoutData } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { WorkspaceContextStore } from "@lichtblick/suite-base/context/Workspace/WorkspaceContext";
import type { Player } from "@lichtblick/suite-base/players/types";

interface IAppContext {
  appBarLayoutButton?: React.JSX.Element;
  appBarMenuItems?: readonly AppBarMenuItem[];
  createEvent?: (args: {
    deviceId: string;
    timestamp: string;
    durationNanos: string;
    metadata: Record<string, string>;
  }) => Promise<void>;
  injectedFeatures?: InjectedFeatures;
  importLayoutFile?: (fileName: string, data: LayoutData) => Promise<void>;
  layoutEmptyState?: React.JSX.Element;
  layoutBrowser?: () => React.JSX.Element;
  sidebarItems?: readonly [[string, { iconName: string; title: string }]];
  syncAdapters?: readonly React.JSX.Element[];
  workspaceExtensions?: readonly React.JSX.Element[];
  extensionSettings?: React.JSX.Element;
  renderSettingsStatusButton?: (
    nodeOrField: Immutable<SettingsTreeNode | SettingsTreeField>,
  ) => React.JSX.Element | undefined;
  workspaceStoreCreator?: (
    initialState?: Partial<WorkspaceContextStore>,
  ) => StoreApi<WorkspaceContextStore>;
  PerformanceSidebarComponent?: React.ComponentType;
  wrapPlayer: (child: Player) => Player;
}

export const INJECTED_FEATURE_KEYS = {
  customSceneExtensions: "ThreeDeeRender.customSceneExtensions",
} as const;

/**
 * Generic scene extension configuration that works with both ThreeDeeRender and ThreeDeeRender_custom.
 * Uses a flexible type structure to avoid version-specific type conflicts.
 */
export type SceneExtensionConfigType = {
  reserved?: {
    imageMode?: {
      init?: (renderer: unknown) => unknown;
      supportedInterfaceModes?: string[];
    };
    measurementTool?: {
      init?: (renderer: unknown) => unknown;
      supportedInterfaceModes?: string[];
    };
    publishClickTool?: {
      init?: (renderer: unknown) => unknown;
      supportedInterfaceModes?: string[];
    };
  };
  extensionsById?: Record<
    string,
    {
      init?: (renderer: unknown) => unknown;
      supportedInterfaceModes?: string[];
    }
  >;
};

export type InjectedFeatureMap = {
  [INJECTED_FEATURE_KEYS.customSceneExtensions]?: {
    customSceneExtensions: DeepPartial<SceneExtensionConfigType>;
  };
};

export type InjectedFeatures = {
  availableFeatures: InjectedFeatureMap;
};

const AppContext = createContext<IAppContext>({
  // Default wrapPlayer is a no-op and is a pass-through of the provided child player
  wrapPlayer: (child) => child,
});
AppContext.displayName = "AppContext";

export function useAppContext(): IAppContext {
  return useContext(AppContext);
}

export { AppContext };
export type { IAppContext };
