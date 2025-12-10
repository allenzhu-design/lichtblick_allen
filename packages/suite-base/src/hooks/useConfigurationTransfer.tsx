// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { enqueueSnackbar } from "notistack";
import { useCallback } from "react";

import { useWorkspaceStore } from '@lichtblick/suite-base/context/Workspace/WorkspaceContext';
import { downloadTextFile } from "@lichtblick/suite-base/util/download";

export function useConfigurationTransfer() {
  // 使用细粒度的选择器，只选择需要的属性
  const sidebars = useWorkspaceStore((state) => state.sidebars);
  const layout = useWorkspaceStore((state) => (state as any).layout);
  const settings = useWorkspaceStore((state) => (state as any).settings);
  const panels = useWorkspaceStore((state) => (state as any).panels);
  const dialogs = useWorkspaceStore((state) => (state as any).dialogs);

  const importConfiguration = useCallback(async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // 创建文件输入元素
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';

        input.onchange = async (event) => {
          try {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) {
              resolve();
              return;
            }

            // 读取文件
            const content = await file.text();

            // 解析JSON
            let parsedConfig: unknown;
            try {
              parsedConfig = JSON.parse(content);
            } catch (err: unknown) {
              enqueueSnackbar(`${file.name} is not a valid configuration file: ${(err as Error).message}`, {
                variant: "error",
              });
              reject(err);
              return;
            }

            if (typeof parsedConfig !== "object" || !parsedConfig) {
              enqueueSnackbar(`${file.name} is not a valid configuration file`, { variant: "error" });
              reject(new Error("Invalid configuration format"));
              return;
            }

            // 验证配置格式
            if (!(parsedConfig as any).version) {
              enqueueSnackbar(`${file.name} is not a valid configuration file`, { variant: "error" });
              reject(new Error("Invalid configuration format"));
              return;
            }

            // 注意：在实际应用中，你可能需要调用特定的actions来更新状态
            // 这里只是示例，你需要根据实际的需求来实现

            enqueueSnackbar(`Configuration imported from ${file.name}`, { variant: "success" });
            console.log('Configuration imported successfully:', parsedConfig);
            resolve();
          } catch (error) {
            console.error('Failed to import configuration:', error);
            enqueueSnackbar("Failed to import configuration", { variant: "error" });
            reject(error);
          } finally {
            // 清理DOM
            if (document.body.contains(input)) {
              document.body.removeChild(input);
            }
          }
        };

        // 添加到DOM并触发点击
        document.body.appendChild(input);
        input.click();

        // 处理用户取消选择的情况
        const handleCancel = () => {
          window.removeEventListener('focus', handleCancel);
          setTimeout(() => {
            if (document.body.contains(input)) {
              document.body.removeChild(input);
              resolve();
            }
          }, 1000);
        };

        window.addEventListener('focus', handleCancel);
      } catch (error) {
        console.error('Failed to create file input:', error);
        enqueueSnackbar("Failed to import configuration", { variant: "error" });
        reject(error);
      }
    });
  }, []);

  const exportConfiguration = useCallback(async (): Promise<void> => {
    try {
      // 构建配置对象
      const config: Record<string, unknown> = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        app: 'Lichtblick Suite',
        workspace: {}
      };

      // 添加确实存在的属性
      const workspaceConfig: Record<string, unknown> = {};

      if (sidebars) {
        workspaceConfig.sidebars = sidebars;
      }

      if (settings !== undefined) {
        workspaceConfig.settings = settings;
      }

      if (layout !== undefined) {
        workspaceConfig.layout = layout;
      }

      if (panels !== undefined) {
        workspaceConfig.panels = panels;
      }

      if (dialogs !== undefined) {
        workspaceConfig.dialogs = dialogs;
      }

      config.workspace = workspaceConfig;

      // 转换为JSON字符串，参考 useLayoutTransfer.tsx 的做法，使用空值合并运算符确保是字符串
      const content = JSON.stringify(config, null, 2) ?? "";

      // 生成文件名
      const fileName = `lichtblick-config-${new Date().toISOString().split('T')[0]}.json`;

      // 使用 downloadTextFile 工具函数
      downloadTextFile(content, fileName);

      enqueueSnackbar("Configuration exported successfully", { variant: "success" });
      console.log('Configuration exported successfully:', config);
    } catch (error) {
      console.error('Failed to export configuration:', error);
      enqueueSnackbar("Failed to export configuration", { variant: "error" });
      throw error;
    }
  }, [sidebars, layout, settings, panels, dialogs]);

  return {
    importConfiguration,
    exportConfiguration,
  };
}
