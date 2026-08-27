import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'system-ui' }}>
          <h2 style={{ color: '#b91c1c' }}>Something went wrong in the Studio.</h2>
          <p style={{ color: '#6b7280', margin: '1rem 0' }}>{this.state.error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '0.6rem 1.5rem', background: '#2a6f6f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload Studio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
