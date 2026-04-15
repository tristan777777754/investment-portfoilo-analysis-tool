import React from "react";

export class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unknown render error" };
  }

  componentDidCatch(error) {
    console.error(`Tab render error [${this.props.tabKey}]:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[24px] border border-[#C88C7A]/35 bg-[#101828] p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8D4AF]/70">Tab Error</p>
          <p className="mt-3 text-sm font-semibold">This tab hit a render error</p>
          <div className="mt-3 rounded-xl border border-[#C88C7A]/30 bg-[#C88C7A]/10 px-3 py-3 text-sm leading-6 text-[#F7D2CB]">
            {this.state.message}
          </div>
          <p className="mt-3 text-xs text-white/50">Refresh the page to reset.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unknown frontend error" };
  }

  componentDidCatch(error) {
    console.error("Portfolio dashboard render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[linear-gradient(180deg,_#090A0F_0%,_#12141B_46%,_#171922_100%)] px-6 py-10 text-white">
          <div className="mx-auto max-w-3xl rounded-[32px] border border-[#C88C7A]/35 bg-[#101828] p-8 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E8D4AF]/70">
              Frontend Error Boundary
            </p>
            <h1 className="mt-3 text-3xl font-semibold">The dashboard hit a render error</h1>
            <p className="mt-4 text-sm leading-7 text-white/85">
              The app no longer stays black. The current frontend error message is shown below so we can debug it directly.
            </p>
            <div className="mt-6 rounded-2xl border border-[#C88C7A]/35 bg-[#C88C7A]/12 px-4 py-4 text-sm leading-7 text-[#F7D2CB]">
              {this.state.message}
            </div>
            <p className="mt-5 text-sm leading-7 text-white/70">
              Refresh the page after the fix, then try Run Analysis again.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
