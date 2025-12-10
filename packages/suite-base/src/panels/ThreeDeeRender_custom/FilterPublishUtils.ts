// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { fromDate } from "@lichtblick/rostime";

import { FilterValues } from "./FilterPanel";

/**
 * 将FilterValues转换为ROS 2消息格式
 * 注意：这是一个自定义消息类型filter_msgs/FilterParamsInfo
 */
export function makeFilterParamsMessage(
  filterValues: FilterValues,
  frameId: string = "map",
): unknown {
  const time = fromDate(new Date());

  // 处理可选的范围值
  const speedMin = filterValues.speed.lower ? parseFloat(filterValues.speed.lower) : 0;
  const speedMax = filterValues.speed.upper ? parseFloat(filterValues.speed.upper) : 0;
  const heightMin = filterValues.height.lower ? parseFloat(filterValues.height.lower) : 0;
  const heightMax = filterValues.height.upper ? parseFloat(filterValues.height.upper) : 0;

  return {
    header: {
      stamp: time,
      frame_id: frameId,
    },
    static_dynamic: filterValues.staticDynamic || "",
    speed_min: speedMin,
    speed_max: speedMax,
    height_min: heightMin,
    height_max: heightMax,
  };
}
