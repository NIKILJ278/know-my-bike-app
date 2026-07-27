import { Component } from 'react'
import { WarningIcon } from './icons/Icon.jsx'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        minHeight: '100vh', background: '#0B0B0F', color: '#fff',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '32px', textAlign: 'center', gap: '12px',
      }}>
        <WarningIcon size={40} className="text-amber" />
        <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Something went wrong</h1>
        <p style={{ fontSize: '13px', opacity: 0.6, maxWidth: '320px', margin: 0 }}>
          {this.state.error?.message || String(this.state.error)}
        </p>
        <button
          onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
          style={{
            marginTop: '12px', background: '#F5A623', color: '#12141C', fontWeight: 700,
            border: 'none', borderRadius: '999px', padding: '12px 24px', fontSize: '14px',
          }}
        >
          Go back home
        </button>
      </div>
    )
  }
}
