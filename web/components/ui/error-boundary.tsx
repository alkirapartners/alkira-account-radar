"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  /** Shown in place of the children once one of them has thrown while rendering. */
  fallback: ReactNode;
  /** Told that it happened, so whatever shares the page with the failed part can adapt. */
  onError?: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasFailed: boolean;
}

/**
 * Keeps one part of a page from taking the whole page down: when a child throws
 * while rendering, the fallback is shown instead. The error is not swallowed.
 * React reports every error a boundary catches to the console.
 *
 * Give it a `key` that changes when its subject does (a brief's id), so the
 * next subject starts with a clean slate.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasFailed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasFailed: true };
  }

  componentDidCatch(): void {
    this.props.onError?.();
  }

  render(): ReactNode {
    return this.state.hasFailed ? this.props.fallback : this.props.children;
  }
}
