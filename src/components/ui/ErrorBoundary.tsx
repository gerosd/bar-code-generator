"use client";

import {Component, ReactNode} from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {hasError: false};
    }

    static getDerivedStateFromError(error: Error): State {
        return {hasError: true, error};
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 rounded-lg bg-red-50 text-red-700">
                    <h2 className="text-lg font-semibold mb-2">Что-то пошло не так</h2>
                    <p className="text-sm">
                        Пожалуйста, попробуйте обновить страницу или обратитесь в
                        поддержку, если проблема не исчезнет.
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}
