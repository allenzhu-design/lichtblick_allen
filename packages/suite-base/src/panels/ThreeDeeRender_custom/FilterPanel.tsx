// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import { useCallback, useState } from "react";
import { makeStyles } from "tss-react/mui";

/**
 * 筛选参数接口
 */
export interface FilterValues {
  speed: string;
  height: string;
  staticDynamic: string;
}

/**
 * FilterPanel 组件属性
 */
interface FilterPanelProps {
  visible: boolean;
  onFilterChange?: (filters: FilterValues) => void;
}

const useStyles = makeStyles()((theme) => ({
  panel: {
    position: "absolute",
    left: 10,
    top: 10,
    width: 400,
    maxHeight: "80vh",
    overflow: "auto",
    zIndex: 1000,
    animation: "$slideIn 0.2s ease-in-out",
  },
  "@keyframes slideIn": {
    from: {
      opacity: 0,
      transform: "translateX(-20px)",
    },
    to: {
      opacity: 1,
      transform: "translateX(0)",
    },
  },
  title: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    fontWeight: "bold",
    fontSize: "0.95rem",
  },
  tableContainer: {
    padding: theme.spacing(1),
  },
  tableHeaderCell: {
    fontWeight: "bold",
    backgroundColor: theme.palette.mode === "dark"
      ? theme.palette.grey[800]
      : theme.palette.grey[200],
    padding: theme.spacing(1.5),
    fontSize: "0.9rem",
  },
  tableCell: {
    padding: theme.spacing(1.5),
    fontSize: "0.9rem",
  },
  labelCell: {
    fontWeight: "500",
    color: theme.palette.text.secondary,
    minWidth: 100,
  },
  inputField: {
    width: "100%",
    "& .MuiInputBase-input": {
      padding: theme.spacing(1),
      fontSize: "0.9rem",
    },
  },
}));

/**
 * 筛选面板组件
 * 显示 3x2 表格，第一列为筛选项名称，第二列为输入框
 * - 速度 (Speed)
 * - 高度 (Height)
 * - 动静态 (Static/Dynamic)
 */
export function FilterPanel(props: FilterPanelProps): React.JSX.Element | null {
  const { classes } = useStyles();

  const [filterValues, setFilterValues] = useState<FilterValues>({
    speed: "",
    height: "",
    staticDynamic: "",
  });

  const handleInputChange = useCallback(
    (field: keyof FilterValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      const updatedFilters = {
        ...filterValues,
        [field]: newValue,
      };
      setFilterValues(updatedFilters);
      props.onFilterChange?.(updatedFilters);
    },
    [filterValues, props],
  );

  if (!props.visible) {
    return null;
  }

  return (
    <Paper className={classes.panel} elevation={4}>
      <Box className={classes.title}>
        Filter Settings
      </Box>
      <Box className={classes.tableContainer}>
        <TableContainer>
          <Table size="small" aria-label="filter table">
            <TableHead>
              <TableRow>
                <TableCell className={classes.tableHeaderCell}>
                  Parameter
                </TableCell>
                <TableCell className={classes.tableHeaderCell}>
                  Value
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* 速度行 */}
              <TableRow>
                <TableCell className={`${classes.tableCell} ${classes.labelCell}`}>
                  Speed
                </TableCell>
                <TableCell className={classes.tableCell}>
                  <TextField
                    className={classes.inputField}
                    placeholder="e.g., 0-50km/h"
                    variant="outlined"
                    size="small"
                    value={filterValues.speed}
                    onChange={handleInputChange("speed")}
                  />
                </TableCell>
              </TableRow>

              {/* 高度行 */}
              <TableRow>
                <TableCell className={`${classes.tableCell} ${classes.labelCell}`}>
                  Height
                </TableCell>
                <TableCell className={classes.tableCell}>
                  <TextField
                    className={classes.inputField}
                    placeholder="e.g., 0-100m"
                    variant="outlined"
                    size="small"
                    value={filterValues.height}
                    onChange={handleInputChange("height")}
                  />
                </TableCell>
              </TableRow>

              {/* 动静态行 */}
              <TableRow>
                <TableCell className={`${classes.tableCell} ${classes.labelCell}`}>
                  Static/Dynamic
                </TableCell>
                <TableCell className={classes.tableCell}>
                  <TextField
                    className={classes.inputField}
                    placeholder="static|dynamic"
                    variant="outlined"
                    size="small"
                    value={filterValues.staticDynamic}
                    onChange={handleInputChange("staticDynamic")}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Paper>
  );
}
