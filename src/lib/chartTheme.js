import React from 'react'

export const chartColors = {
  brand: 'rgb(var(--c-brand))',
  gold: 'rgb(var(--c-gold))',
  brandDeep: 'rgb(var(--c-brand-deep))',
  muted: 'rgb(var(--c-muted))',
  line: 'rgb(var(--c-line))',
  surface: 'rgb(var(--c-surface))',
  void: 'rgb(var(--c-void))',
  palette: ['rgb(var(--c-brand))', 'rgb(var(--c-gold))', 'rgb(var(--c-brand-deep))', 'rgb(var(--c-muted))', '#38BDF8', '#A78BFA', '#34D399'],
}

export const chartAxis = {
  tick: { fontSize: 11, fill: 'rgb(var(--c-muted))', fontFamily: 'JetBrains Mono, monospace' },
  axisLine: { stroke: 'rgb(var(--c-line))' },
  tickLine: false,
}

export const chartGrid = {
  stroke: 'rgb(var(--c-line))',
  strokeDasharray: '3 3',
}

export const chartTooltip = {
  contentStyle: {
    backgroundColor: 'rgb(var(--c-surface) / 0.95)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgb(var(--c-fg) / 0.1)',
    borderRadius: '12px',
    boxShadow: '0 0 30px -10px rgb(var(--c-brand) / 0.25)',
    color: 'rgb(var(--c-fg))',
    fontSize: '12px',
    fontFamily: 'Inter, sans-serif',
    padding: '8px 12px',
  },
  itemStyle: {
    color: 'rgb(var(--c-fg))',
    fontSize: '12px',
    fontFamily: 'JetBrains Mono, monospace',
  },
  labelStyle: {
    color: 'rgb(var(--c-muted))',
    fontSize: '11px',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '4px',
  },
  cursor: {
    stroke: 'rgb(var(--c-line))',
    strokeWidth: 1,
    fill: 'rgb(var(--c-fg) / 0.03)',
  },
}

export function ChartGradientDefs({ id = 'orangeAreaGradient', from = 'rgb(var(--c-brand))', to = 'rgb(var(--c-brand-deep))' }) {
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
