const stats = [
    { label: 'Net P&L', value: '$0.00', color: '#fff' },
    { label: 'Win Rate', value: '0%', color: '#fff' },
    { label: 'Avg RR', value: '0.00', color: '#fff' },
    { label: 'Profit Factor', value: '0.00', color: '#fff' },
  ]
  
  export default function StatsBar() {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '24px',
      }}>
        {stats.map((stat) => (
          <div key={stat.label} style={{
            background: '#0f0f0f',
            border: '0.5px solid #1a1a1a',
            borderRadius: '10px',
            padding: '20px',
          }}>
            <p style={{
              color: '#777',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              margin: '0 0 8px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>{stat.label}</p>
            <p style={{
              color: stat.color,
              fontFamily: 'DM Mono, monospace',
              fontSize: '22px',
              fontWeight: '500',
              margin: 0,
            }}>{stat.value}</p>
          </div>
        ))}
      </div>
    )
  }
