import React from "react";
import ReactTable from "react-table";
import PropTypes from "prop-types";
import { get } from "lodash";
import styled from "react-emotion";

import "./react-table-styles.css";

import { serializeForValueSummary } from "./rep-utils/value-summary-serializer";

import ExpandableRep from "./rep-tree";

import { getChildSummary } from "./rep-utils/get-child-summaries";
import { RangeDescriptor } from "./rep-utils/rep-serialization-core-types";

import ValueSummaryRep from "./value-summary";

const TableDetails = styled.div`
  border: solid #e5e5e5;
  border-width: 0px 1px 1px 1px;
  padding: 5px;
`;
const TableDetailsMessage = styled.div`
  color: #999;
  font-style: italic;
  font-family: "Open Sans", sans-serif;
  padding-bottom: ${props => (props.pad ? "3px" : "0px")};
`;

class CellDetails extends React.Component {
  static propTypes = {
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    focusedRow: PropTypes.number,
    focusedCol: PropTypes.string,
    pathToEntity: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(RangeDescriptor)
      ])
    ).isRequired,
    rootObjName: PropTypes.string
  };

  render() {
    const {
      focusedRow,
      focusedCol,
      value,
      rootObjName,
      pathToEntity
    } = this.props;

    if (focusedRow !== undefined && focusedCol !== undefined) {
      const focusedPath = `[${focusedRow}]["${focusedCol}"]`;
      const valueSummary = serializeForValueSummary(get(value, focusedPath));
      return (
        <TableDetails>
          <TableDetailsMessage pad>
            {`details for ${focusedPath}`}
          </TableDetailsMessage>
          <ExpandableRep
            pathToEntity={[...pathToEntity, String(focusedRow), focusedCol]}
            valueSummary={valueSummary}
            getChildSummaries={getChildSummary}
            rootObjName={rootObjName}
          />
        </TableDetails>
      );
    }
    return (
      <TableDetails>
        <TableDetailsMessage>
          Click a table cell for details
        </TableDetailsMessage>
      </TableDetails>
    );
  }
}

class CellRenderer extends React.PureComponent {
  static propTypes = {
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    cellIsFocused: PropTypes.bool.isRequired
  };
  render() {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: "1px 5px",
          backgroundColor: this.props.cellIsFocused
            ? "rgb(230, 230, 230)"
            : "none"
        }}
      >
        <ValueSummaryRep tiny {...serializeForValueSummary(this.props.value)} />
      </div>
    );
  }
}

const PX_PER_CHAR = 7;
const MIN_CELL_CHAR_WIDTH = 22;

export default class TableRenderer extends React.Component {
  static propTypes = {
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    pathToEntity: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(RangeDescriptor)
      ])
    ).isRequired,
    rootObjName: PropTypes.string
  };

  constructor(props) {
    super(props);
    this.state = { focusedRow: undefined, focusedCol: undefined };
  }

  handleCellClick(rowInfo, column) {
    this.setState({ focusedRow: rowInfo.index, focusedCol: column.id });
  }

  render() {
    const { value } = this.props;

    const columns = Object.keys(value[0]).map(k => ({
      Header: k,
      accessor: k,
      width: Math.max(k.length, MIN_CELL_CHAR_WIDTH) * PX_PER_CHAR,
      Cell: rowInfo => {
        return (
          <CellRenderer
            cellIsFocused={
              this.state.focusedCol === k &&
              this.state.focusedRow === rowInfo.index
            }
            value={rowInfo.value}
          />
        );
      }
    }));

    const pageSize = value.length > 10 ? 10 : value.length;
    return (
      <div>
        <ReactTable
          data={value}
          columns={columns}
          showPaginationTop
          showPaginationBottom={false}
          resizable={false}
          pageSizeOptions={[5, 10, 25, 50, 100]}
          minRows={0}
          defaultPageSize={pageSize}
          getTdProps={(state, rowInfo, column) => {
            return {
              onClick: (e, handleOriginal) => {
                this.handleCellClick(rowInfo, column);
                if (handleOriginal) {
                  handleOriginal();
                }
              }
            };
          }}
        />
        <CellDetails
          value={value}
          focusedRow={this.state.focusedRow}
          focusedCol={this.state.focusedCol}
          rootObjName={this.props.rootObjName}
          pathToEntity={this.props.pathToEntity}
        />
      </div>
    );
  }
}
