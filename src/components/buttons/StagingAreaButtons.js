import React, { Component } from "react";
import PropTypes from "prop-types";

export default class StagingAreaButtons extends Component {
  shouldComponentUpdate(nextProps) {
    if (nextProps.currentPlayer === this.props.currentPlayer) {
      return false;
    }
    return true;
  }
  render() {
    const className =
      this.props.currentPlayer === this.props.playerID
        ? "button current-staging-area-btn"
        : "button staging-area-btn";
    return (
      <button
        className={className}
        type="button"
        onClick={() => this.props.sortStagingArea()}
      >
        Sort
      </button>
    );
  }
}

StagingAreaButtons.propTypes = {
  currentPlayer: PropTypes.string,
  playerID: PropTypes.string,
  sortStagingArea: PropTypes.func,
};
