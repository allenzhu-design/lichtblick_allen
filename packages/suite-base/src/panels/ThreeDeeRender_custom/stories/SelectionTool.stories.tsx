// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { StoryObj } from "@storybook/react";

import { MessageEvent } from "@lichtblick/suite";
import { Topic } from "@lichtblick/suite-base/players/types";
import PanelSetup from "@lichtblick/suite-base/stories/PanelSetup";
import delay from "@lichtblick/suite-base/util/delay";

import { QUAT_IDENTITY, rad2deg } from "./common";
import ThreeDeePanel from "../index";
import { TransformStamped } from "../ros";

export default {
  title: "panels/ThreeDeeRender_custom",
  component: ThreeDeePanel,
};

export const SelectionTool: StoryObj = {
  render: function Story() {
    const topics: Topic[] = [
      { name: "/tf", schemaName: "geometry_msgs/TransformStamped" },
      // 可以添加更多主题来显示可选择的物体
    ];

    const tf1: MessageEvent<TransformStamped> = {
      topic: "/tf",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: "map" },
        child_frame_id: "object1",
        transform: {
          translation: { x: 0, y: 0, z: 0 },
          rotation: QUAT_IDENTITY,
        },
      },
      schemaName: "geometry_msgs/TransformStamped",
      sizeInBytes: 0,
    };

    const tf2: MessageEvent<TransformStamped> = {
      topic: "/tf",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: "map" },
        child_frame_id: "object2",
        transform: {
          translation: { x: 1, y: 0, z: 0 },
          rotation: QUAT_IDENTITY,
        },
      },
      schemaName: "geometry_msgs/TransformStamped",
      sizeInBytes: 0,
    };

    const fixture = {
      topics,
      frame: { "/tf": [tf1, tf2] },
      capabilities: [],
      activeData: {
        currentTime: { sec: 0, nsec: 0 },
      },
    };

    return (
      <PanelSetup fixture={fixture}>
        <ThreeDeePanel
          overrideConfig={{
            ...ThreeDeePanel.defaultConfig,
            followTf: "map",
            layers: {
              grid: { layerId: "foxglove.Grid" },
            },
            cameraState: {
              distance: 10,
              perspective: true,
              phi: rad2deg(1.0),
              targetOffset: [0, 0, 0],
              thetaOffset: rad2deg(0),
              fovy: rad2deg(0.75),
              near: 0.01,
              far: 5000,
              target: [0, 0, 0],
              targetOrientation: [0, 0, 0, 1],
            },
          }}
        />
      </PanelSetup>
    );
  },

  parameters: {
    colorScheme: "dark",
    chromatic: {
      delay: 200,
      // 可以选择禁用快照测试，因为交互效果难以捕获
      // disable: true
    }
  },

  play: async () => {
    // 等待面板加载完成
    await delay(500);

    // 模拟点击选择按钮（假设有选择按钮）
    const selectButton = document.querySelector<HTMLElement>("[data-testid=select-button]");
    if (selectButton) {
      selectButton.click();
      await delay(100);
    }

    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();

    // 模拟框选操作：按下鼠标 -> 移动 -> 释放
    // 1. 鼠标在起点按下
    canvas.dispatchEvent(
      new MouseEvent("mousedown", {
        clientX: canvasRect.left + 100,
        clientY: canvasRect.top + 100,
        button: 0,
      })
    );

    await delay(50);

    // 2. 鼠标移动到终点
    canvas.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: canvasRect.left + 300,
        clientY: canvasRect.top + 300,
        button: 0,
      })
    );

    await delay(50);

    // 3. 鼠标释放，完成框选
    canvas.dispatchEvent(
      new MouseEvent("mouseup", {
        clientX: canvasRect.left + 300,
        clientY: canvasRect.top + 300,
        button: 0,
      })
    );

    await delay(100);
  },
};

// 可以添加更多变体
export const SelectionToolMultipleObjects: StoryObj = {
  render: function Story() {
    // 创建包含多个可选中物体的场景
    const topics: Topic[] = [
      { name: "/tf", schemaName: "geometry_msgs/TransformStamped" },
      // 添加更多主题，如点云、标记等
    ];

    const transforms: MessageEvent<TransformStamped>[] = [];

    // 创建网格状分布的物体
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        transforms.push({
          topic: "/tf",
          receiveTime: { sec: 10, nsec: 0 },
          message: {
            header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: "map" },
            child_frame_id: `object_${i}_${j}`,
            transform: {
              translation: { x: i * 2 - 2, y: j * 2 - 2, z: 0 },
              rotation: QUAT_IDENTITY,
            },
          },
          schemaName: "geometry_msgs/TransformStamped",
          sizeInBytes: 0,
        });
      }
    }

    const fixture = {
      topics,
      frame: { "/tf": transforms },
      capabilities: [],
      activeData: {
        currentTime: { sec: 0, nsec: 0 },
      },
    };

    return (
      <PanelSetup fixture={fixture}>
        <ThreeDeePanel
          overrideConfig={{
            ...ThreeDeePanel.defaultConfig,
            followTf: "map",
            layers: {
              grid: { layerId: "foxglove.Grid" },
            },
            cameraState: {
              distance: 15,
              perspective: true,
              phi: rad2deg(1.0),
              targetOffset: [0, 0, 0],
              thetaOffset: rad2deg(0.5),
              fovy: rad2deg(0.75),
              near: 0.01,
              far: 5000,
              target: [0, 0, 0],
              targetOrientation: [0, 0, 0, 1],
            },
          }}
        />
      </PanelSetup>
    );
  },

  parameters: {
    colorScheme: "dark",
    chromatic: { delay: 200 }
  },

  play: async () => {
    // 这里可以添加更复杂的框选交互，如选择多个物体
    await delay(500);

    const selectButton = document.querySelector<HTMLElement>("[data-testid=select-button]");
    if (selectButton) {
      selectButton.click();
      await delay(100);
    }

    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();

    // 框选多个物体
    canvas.dispatchEvent(
      new MouseEvent("mousedown", {
        clientX: canvasRect.left + 50,
        clientY: canvasRect.top + 50,
        button: 0,
      })
    );

    await delay(50);

    canvas.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: canvasRect.left + 450,
        clientY: canvasRect.top + 450,
        button: 0,
      })
    );

    await delay(50);

    canvas.dispatchEvent(
      new MouseEvent("mouseup", {
        clientX: canvasRect.left + 450,
        clientY: canvasRect.top + 450,
        button: 0,
      })
    );

    await delay(200);
  },
};
