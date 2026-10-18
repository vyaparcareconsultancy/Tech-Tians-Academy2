import React from 'react'

export const chartColors = {
  brand: '#F7931A',
  gold: '#FFD600',
  brandDeep: '#EA580C',
  muted: '#94A3B8',
  line: '#1E293B',
  surface: '#0F1115',
  void: '#030304',
  palette: ['#F7931A', '#FFD600', '#EA580C', '#94A3B8', '#38BDF8', '#A78BFA', '#34D399'],
}

export const chartAxis = {
  tick: { fontSize: 11, fill: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' },
  axisLine: { stroke: '#1E293B' },
  tickLine: false,
}

export const chartGrid = {
  stroke: '#1E293B',
  strokeDasharray: '3 3',
}

export const chartTooltip = {
  contentStyle: {
    backgroundColor: 'rgba(15, 17, 21, 0.95)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    boxShadow: '0 0 30px -10px rgba(247, 147, 26, 0.25)',
    color: '#FFFFFF',
    fontSize: '12px',
    fontFamily: 'Inter, sans-serif',
    padding: '8px 12px',
  },
  itemStyle: {
    color: '#FFFFFF',
    fontSize: '12px',
    fontFamily: 'JetBrains Mono, monospace',
  },
  labelStyle: {
    color: '#94A3B8',
    fontSize: '11px',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '4px',
  },
  cursor: {
    stroke: '#1E293B',
    strokeWidth: 1,
    fill: 'rgba(255, 255, 255, 0.03)',
  },
}

export function ChartGradientDefs({ id = 'orangeAreaGradient', from = '#F7931A', to = '#EA580C' }) {
  return React.createElement(
    'defs',
    null,
    React.createElement(
      'linearGradient',
      { id, x1: '0', y1: '0', x2: '0', y2: '1' },
      React.createElement('stop', { offset: '0%', stopColor: from, stopOpacity: 0.45 }),
      React.createElement('stop', { offset: '100%', stopColor: to, stopOpacity: 0.0 })
    )
  )
}
