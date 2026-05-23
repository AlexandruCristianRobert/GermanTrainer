// Build an ECharts theme dict from the live CSS custom properties on :root.
// Re-reads on every call so a theme/accent flip yields a fresh theme.

export interface EchartsTheme {
  color: string[]
  backgroundColor: string
  textStyle: Record<string, unknown>
  title: Record<string, unknown>
  legend: Record<string, unknown>
  grid: Record<string, unknown>
  axisPointer: Record<string, unknown>
  xAxis: Record<string, unknown>
  yAxis: Record<string, unknown>
  valueAxis: Record<string, unknown>
  tooltip: Record<string, unknown>
}

function readVar(name: string, fallback = ''): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function buildEchartsTheme(): EchartsTheme {
  const ink = readVar('--ink', '#15130E')
  const inkSoft = readVar('--ink-soft', '#3A372F')
  const paperCard = readVar('--paper-card', '#FCFAF3')
  const rule = readVar('--rule', '#1E1B14')
  const mute = readVar('--mute', '#948C7C')
  const hairline = readVar('--hairline', 'rgba(30,27,20,0.14)')
  const accent = readVar('--accent', '#5C7A52')
  const cobalt = readVar('--cobalt', '#2C5282')
  const clay = readVar('--clay', '#A03B2B')
  const ochre = readVar('--ochre', '#B8852F')
  const sage = readVar('--sage', '#5C7A52')

  const axis = {
    axisLine: { lineStyle: { color: mute } },
    splitLine: { lineStyle: { color: hairline, type: 'dashed' as const } },
    axisLabel: {
      color: inkSoft,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 11
    },
    axisTick: { lineStyle: { color: mute } }
  }

  return {
    // Series palette — accent first so it dominates by default; secondaries follow.
    color: [accent, cobalt, clay, ochre, sage, inkSoft],
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: '"Source Serif 4", serif',
      color: ink,
      fontSize: 13
    },
    title: {
      textStyle: {
        fontFamily: '"Fraunces", serif',
        fontWeight: 500,
        color: ink,
        fontSize: 18
      },
      subtextStyle: {
        fontFamily: '"Source Serif 4", serif',
        fontStyle: 'italic',
        color: inkSoft,
        fontSize: 13
      }
    },
    legend: {
      textStyle: {
        color: inkSoft,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11
      }
    },
    grid: {
      left: 40,
      right: 16,
      top: 24,
      bottom: 32,
      containLabel: true,
      borderColor: hairline
    },
    axisPointer: {
      lineStyle: { color: mute, type: 'dotted' }
    },
    xAxis: axis,
    yAxis: axis,
    valueAxis: axis,
    tooltip: {
      backgroundColor: paperCard,
      borderColor: rule,
      borderWidth: 1,
      textStyle: {
        color: ink,
        fontFamily: '"Source Serif 4", serif',
        fontSize: 13
      },
      extraCssText:
        'box-shadow: 0 8px 24px -16px rgba(0,0,0,0.2); border-radius: 2px; padding: 8px 12px;'
    }
  }
}
