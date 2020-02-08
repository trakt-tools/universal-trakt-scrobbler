import PropTypes from 'prop-types';
import React from 'react';
import { Errors } from '../services/Errors';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  componentDidCatch(error, info) {
    Errors.log(error, info);
    this.setState({
      hasError: true,
    });
  }

  render() {
    return this.state.hasError ? (
      <div>Something went wrong.</div>
    ) : (
      this.props.children
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};

export { ErrorBoundary };