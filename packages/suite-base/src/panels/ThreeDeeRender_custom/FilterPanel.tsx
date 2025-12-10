// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ClearIcon from "@mui/icons-material/Clear";
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
  Typography,
  Tooltip,
  IconButton,
  Button,
} from "@mui/material";
import { useCallback, useState, useEffect } from "react";
import { makeStyles } from "tss-react/mui";

/**
 * 范围值接口
 */
export interface RangeValue {
  lower: string;
  upper: string;
}

/**
 * 筛选参数接口
 */
export interface FilterValues {
  speed: RangeValue;
  height: RangeValue;
  staticDynamic: string;
  // timestamp?: string;
}

/**
 * 默认过滤值
 */
export const DEFAULT_FILTER_VALUES: FilterValues = {
  speed: { lower: "", upper: "" },
  height: { lower: "", upper: "" },
  staticDynamic: "",
};

/**
 * FilterPanel 组件属性
 */
interface FilterPanelProps {
  visible: boolean;
  filterValues: FilterValues;
  onFilterChange?: (filters: FilterValues) => void;
}

const useStyles = makeStyles()((theme) => ({
  panel: {
    position: "absolute",
    left: 10,
    top: 10,
    width: 500,
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
  header: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
    fontSize: "1.1rem",
  },
  clearButton: {
    marginLeft: theme.spacing(1),
  },
  tableContainer: {
    padding: theme.spacing(1.5),
  },
  tableHeaderCell: {
    fontWeight: "bold",
    backgroundColor: theme.palette.mode === "dark"
      ? theme.palette.grey[800]
      : theme.palette.grey[200],
    padding: theme.spacing(1.5),
    fontSize: "0.9rem",
    width: "30%",
  },
  tableCell: {
    padding: theme.spacing(1.5),
    fontSize: "0.9rem",
  },
  labelCell: {
    fontWeight: "500",
    color: theme.palette.text.secondary,
    minWidth: 120,
  },
  inputField: {
    width: "100%",
    "& .MuiInputBase-input": {
      padding: theme.spacing(1),
      fontSize: "0.8rem",
    },
  },
  rangeContainer: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
  },
  rangeField: {
    flex: 1.2,
    minWidth: 80,
  },
  rangeSeparator: {
    color: theme.palette.text.secondary,
    fontWeight: "bold",
    minWidth: 15,
    textAlign: "center",
  },
  unitLabel: {
    marginLeft: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    fontSize: "0.80rem",
    minWidth: 30,
  },
  errorText: {
    color: theme.palette.error.main,
    fontSize: "0.75rem",
    marginTop: theme.spacing(0.5),
  },
  footer: {
    padding: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  applyButton: {
    minWidth: 80,
  },
  statusText: {
    fontSize: "0.85rem",
    color: theme.palette.text.secondary,
  },
}));

/**
 * 验证范围值
 */
function validateRange(lower: string, upper: string): string | null {
  // 如果两个字段都为空，则无错误（允许不设置）
  if (!lower && !upper) {
    return null;
  }

  // 如果只填了一个字段，则出错
  if (!lower || !upper) {
    return "范围需同时设置最小值和最大值，或都保持空";
  }

  const lowerNum = parseFloat(lower);
  const upperNum = parseFloat(upper);

  if (isNaN(lowerNum) || isNaN(upperNum)) {
    return "请输入有效的数字";
  }

  if (lowerNum > upperNum) {
    return "最小值不能大于最大值";
  }

  return null;
}

/**
 * 验证静态/动态输入
 */
function validateStaticDynamic(value: string): string | null {
  if (!value) {
    return null; // 允许为空
  }

  const normalized = value.trim().toLowerCase();
  if (normalized !== 'static' && normalized !== 'dynamic') {
    return "请输入 'static' 或 'dynamic'";
  }

  return null;
}

/**
 * 筛选面板组件
 * 显示 4x2 表格，支持速度和高度范围筛选
 */
export function FilterPanel(props: FilterPanelProps): React.JSX.Element | null {
  const { classes } = useStyles();
  const [localValues, setLocalValues] = useState<FilterValues>(props.filterValues);
  const [validationErrors, setValidationErrors] = useState<{
    speed?: string;
    height?: string;
    staticDynamic?: string;
  }>({});

  // 当props中的filterValues变化时，更新本地状态
  useEffect(() => {
    setLocalValues(props.filterValues);
  }, [props.filterValues]);

  // 验证所有字段
  const validateAll = useCallback((values: FilterValues) => {
    const errors: { speed?: string; height?: string; staticDynamic?: string } = {};

    const speedError = validateRange(values.speed.lower, values.speed.upper);
    if (speedError) {errors.speed = speedError;}

    const heightError = validateRange(values.height.lower, values.height.upper);
    if (heightError) {errors.height = heightError;}

    const staticDynamicError = validateStaticDynamic(values.staticDynamic);
    if (staticDynamicError) {errors.staticDynamic = staticDynamicError;}

    return errors;
  }, []);

  const handleRangeChange = useCallback(
    (field: 'speed' | 'height', bound: 'lower' | 'upper') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      const updatedValues = {
        ...localValues,
        [field]: {
          ...localValues[field],
          [bound]: value,
        },
      };

      setLocalValues(updatedValues);

      // 实时验证该字段，检查当前输入后的状态
      const newLower = bound === 'lower' ? value : updatedValues[field].lower;
      const newUpper = bound === 'upper' ? value : updatedValues[field].upper;
      const error = validateRange(newLower, newUpper);

      setValidationErrors(prev => {
        const updated = { ...prev };
        if (error) {
          updated[field] = error;
        } else {
          delete updated[field];
        }
        return updated;
      });
    },
    [localValues],
  );

  const handleStaticDynamicChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      const updatedValues = {
        ...localValues,
        staticDynamic: value,
      };

      setLocalValues(updatedValues);
      // 实时验证
      const error = validateStaticDynamic(value);
      setValidationErrors(prev => {
        const updated = { ...prev };
        if (error) {
          updated.staticDynamic = error;
        } else {
          delete updated.staticDynamic;
        }
        return updated;
      });
    },
    [localValues],
  );

  const handleClear = useCallback(() => {
    const clearedValues = DEFAULT_FILTER_VALUES;
    setLocalValues(clearedValues);
    setValidationErrors({});
    props.onFilterChange?.(clearedValues);
  }, [props]);

  const handleApply = useCallback(() => {
    const errors = validateAll(localValues);
    setValidationErrors(errors);

    if (Object.keys(errors).length === 0) {
      props.onFilterChange?.(localValues);
    }
  }, [localValues, props, validateAll]);

  if (!props.visible) {
    return null;
  }

  const hasValues =
    localValues.speed.lower || localValues.speed.upper ||
    localValues.height.lower || localValues.height.upper ||
    localValues.staticDynamic;

  const hasErrors = Object.keys(validationErrors).length > 0;

  return (
    <Paper className={classes.panel} elevation={4}>
      <Box className={classes.header}>
        <Typography className={classes.title}>
          Filter Settings
        </Typography>
        <Tooltip title="Clear all filters">
          <IconButton
            className={classes.clearButton}
            size="small"
            onClick={handleClear}
            disabled={!hasValues}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
                  Value Range
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Speed - 范围输入 */}
              <TableRow>
                <TableCell className={`${classes.tableCell} ${classes.labelCell}`}>
                  Speed (km/h)
                </TableCell>
                <TableCell className={classes.tableCell}>
                  <Box className={classes.rangeContainer}>
                    <TextField
                      className={`${classes.inputField} ${classes.rangeField}`}
                      placeholder="Min"
                      variant="outlined"
                      size="small"
                      value={localValues.speed.lower}
                      onChange={handleRangeChange('speed', 'lower')}
                      error={!!validationErrors.speed}
                      InputProps={{
                        inputProps: {
                          type: "number",
                          step: "0.1",
                        },
                      }}
                    />
                    <Typography className={classes.rangeSeparator}>
                      –
                    </Typography>
                    <TextField
                      className={`${classes.inputField} ${classes.rangeField}`}
                      placeholder="Max"
                      variant="outlined"
                      size="small"
                      value={localValues.speed.upper}
                      onChange={handleRangeChange('speed', 'upper')}
                      error={!!validationErrors.speed}
                      InputProps={{
                        inputProps: {
                          type: "number",
                          step: "0.1",
                        },
                      }}
                    />
                    <Typography className={classes.unitLabel}>
                      km/h
                    </Typography>
                  </Box>
                  {validationErrors.speed && (
                    <Typography className={classes.errorText}>
                      {validationErrors.speed}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>

              {/* Height - 范围输入 */}
              <TableRow>
                <TableCell className={`${classes.tableCell} ${classes.labelCell}`}>
                  Height (m)
                </TableCell>
                <TableCell className={classes.tableCell}>
                  <Box className={classes.rangeContainer}>
                    <TextField
                      className={`${classes.inputField} ${classes.rangeField}`}
                      placeholder="Min"
                      variant="outlined"
                      size="small"
                      value={localValues.height.lower}
                      onChange={handleRangeChange('height', 'lower')}
                      error={!!validationErrors.height}
                      InputProps={{
                        inputProps: {
                          type: "number",
                          step: "0.1",
                        },
                      }}
                    />
                    <Typography className={classes.rangeSeparator}>
                      –
                    </Typography>
                    <TextField
                      className={`${classes.inputField} ${classes.rangeField}`}
                      placeholder="Max"
                      variant="outlined"
                      size="small"
                      value={localValues.height.upper}
                      onChange={handleRangeChange('height', 'upper')}
                      error={!!validationErrors.height}
                      InputProps={{
                        inputProps: {
                          type: "number",
                          step: "0.1",
                        },
                      }}
                    />
                    <Typography className={classes.unitLabel}>
                      m
                    </Typography>
                  </Box>
                  {validationErrors.height && (
                    <Typography className={classes.errorText}>
                      {validationErrors.height}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>

              {/* Static/Dynamic - 单值输入 */}
              <TableRow>
                <TableCell className={`${classes.tableCell} ${classes.labelCell}`}>
                  Static/Dynamic
                </TableCell>
                <TableCell className={classes.tableCell}>
                  <TextField
                    className={classes.inputField}
                    placeholder="static dynamic, or both"
                    variant="outlined"
                    size="small"
                    value={localValues.staticDynamic}
                    onChange={handleStaticDynamicChange}
                    error={!!validationErrors.staticDynamic}
                    // helperText="Enter 'static', 'dynamic', or leave empty for both"
                  />
                  {validationErrors.staticDynamic && (
                    <Typography className={classes.errorText}>
                      {validationErrors.staticDynamic}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box className={classes.footer}>
        <Typography className={classes.statusText}>
          {hasErrors ? "Please fix validation errors" : "Ready to apply"}
        </Typography>
        <Box>
          <Tooltip title={hasErrors ? "Fix validation errors before applying" : "Apply filters"}>
            <span>
              <Button
                className={classes.applyButton}
                variant="contained"
                color="primary"
                size="small"
                onClick={handleApply}
                disabled={hasErrors}
              >
                Apply
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
}
