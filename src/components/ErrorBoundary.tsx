import { Errors } from '@common/Errors';
import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps extends WithChildren {}

interface ErrorBoundaryState {
	hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
		};
	}

	componentDidCatch(error: Error, info: ErrorInfo): void {
		Errors.log(error, info);
		this.setState({
			hasError: true,
		});
	}

	render(): ReactNode {
		return this.state.hasError ? <div>Something went wrong.</div> : this.props.children;
	}
}
