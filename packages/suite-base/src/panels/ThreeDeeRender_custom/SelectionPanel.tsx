// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Collapse,
  IconButton,
  Tooltip,
} from "@mui/material";
import { KeyboardArrowDown, KeyboardArrowRight, Close, ExpandMore, ExpandLess } from "@mui/icons-material";
import React, { useMemo, useState } from "react";
import { makeStyles } from "tss-react/mui";

import type { Renderable } from "./Renderable";
import ObjectDetails from "./Interactions/ObjectDetails";
import type { RosValue } from "@lichtblick/suite-base/players/types";

const useStyles = makeStyles()((theme) => ({
  root: {
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    maxHeight: "500px",
    overflow: "auto",
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[3],
  },
  header: {
    fontWeight: "bold",
    marginBottom: theme.spacing(1),
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
  },
  headerActions: {
    display: "flex",
    gap: theme.spacing(0.5),
    marginLeft: theme.spacing(1),
  },
  expandRow: {
    cursor: "pointer",
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  detailsContainer: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.action.hover,
    marginTop: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
  pointNumber: {
    fontWeight: "bold",
    color: theme.palette.success.main,
    minWidth: "60px",
  },
  collapsedRoot: {
    padding: theme.spacing(1),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[3],
    cursor: "pointer",
    minHeight: "40px",
  },
}));

export type SelectionPanelProps = {
  selectedPoints: Array<{
    renderable: Renderable;
    indices: number[];
  }>;
};

/**
 * 显示框选后的点云属性信息
 * 参考Interactions组件的设计，以展开/收起的方式显示点信息
 */
export const SelectionPanel = React.memo<SelectionPanelProps>(function SelectionPanel({
  selectedPoints,
}: SelectionPanelProps) {
  const { classes } = useStyles();
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // 构建平化的点列表
  const allPoints = useMemo(() => {
    const points: Array<{
      id: string;
      index: number;
      topic: string;
      renderable: Renderable;
      properties: Record<string, RosValue>;
    }> = [];

    for (const { renderable, indices } of selectedPoints) {
      const topic = renderable.name ?? "Unknown";
      for (const pointIndex of indices) {
        // 获取点的详细属性
        const properties = (renderable.instanceDetails?.(pointIndex) ?? {}) as Record<
          string,
          RosValue
        >;

        points.push({
          id: `${topic}-${pointIndex}`,
          index: pointIndex,
          topic,
          renderable,
          properties,
        });
      }
    }

    return points;
  }, [selectedPoints]);

  if (allPoints.length === 0) {
    return (
      <Paper className={classes.root}>
        <Typography variant="body2" color="textSecondary">
          No points selected. Use the selection tool to select points.
        </Typography>
      </Paper>
    );
  }

  // 如果面板被折叠，显示一个简洁的按钮
  if (panelCollapsed) {
    return (
      <Paper className={classes.collapsedRoot}>
        <Tooltip title={`展开选中点表格 (${allPoints.length} 个点)`}>
          <IconButton
            size="small"
            onClick={() => setPanelCollapsed(false)}
            sx={{ flex: 1, justifyContent: "flex-start" }}
          >
            <ExpandMore fontSize="small" />
            <Typography variant="caption" sx={{ ml: 1 }}>
              Selected ({allPoints.length})
            </Typography>
          </IconButton>
        </Tooltip>
      </Paper>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedPoint(expandedPoint === id ? null : id);
  };

  return (
    <Paper className={classes.root}>
      <Box className={classes.header}>
        <Typography className={classes.headerTitle} variant="h6">
          Selected Points ({allPoints.length})
        </Typography>
        <Box className={classes.headerActions}>
          <Tooltip title="最小化面板">
            <IconButton size="small" onClick={() => setPanelCollapsed(true)}>
              <ExpandLess fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell style={{ width: "40px" }}>Expand</TableCell>
              <TableCell style={{ width: "60px" }}>Point #</TableCell>
              <TableCell>Topic</TableCell>
              <TableCell>X</TableCell>
              <TableCell>Y</TableCell>
              <TableCell>Z</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allPoints.map((point) => (
              <React.Fragment key={point.id}>
                <TableRow
                  className={classes.expandRow}
                  onClick={() => toggleExpand(point.id)}
                >
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(point.id);
                      }}
                    >
                      {expandedPoint === point.id ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
                    </IconButton>
                  </TableCell>
                  <TableCell className={classes.pointNumber}>{point.index}</TableCell>
                  <TableCell>{point.topic}</TableCell>
                  <TableCell>{formatValue(point.properties.x)}</TableCell>
                  <TableCell>{formatValue(point.properties.y)}</TableCell>
                  <TableCell>{formatValue(point.properties.z)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={6} style={{ padding: 0 }}>
                    <Collapse in={expandedPoint === point.id} timeout="auto" unmountOnExit>
                      <Box className={classes.detailsContainer}>
                        <ObjectDetails selectedObject={point.properties} timezone={undefined} />
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
});


function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "number") {
    return value.toFixed(3);
  }
  if (typeof value === "object") {
    return JSON.stringify(value) ?? "-";
  }
  return String(value);
}
