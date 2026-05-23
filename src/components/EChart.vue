<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import {
  LineChart,
  BarChart,
  PieChart,
  RadarChart,
  ScatterChart,
  HeatmapChart
} from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  VisualMapComponent,
  MarkLineComponent,
  MarkAreaComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { buildEchartsTheme } from '../composables/useEchartsTheme'
import { useTheme } from '../composables/useTheme'

// Register only the chart types we actually use.
use([
  SVGRenderer,
  LineChart,
  BarChart,
  PieChart,
  RadarChart,
  ScatterChart,
  HeatmapChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  VisualMapComponent,
  MarkLineComponent,
  MarkAreaComponent
])

defineProps<{
  option: Record<string, unknown>
  height?: string
  ariaLabel?: string
}>()

const { resolved } = useTheme()
const themeKey = ref(0)
watch(resolved, () => {
  themeKey.value++
})

const theme = computed(() => {
  // Touch themeKey so a theme flip re-reads CSS variables.
  void themeKey.value
  return buildEchartsTheme()
})
</script>

<template>
  <div
    class="chart-wrap"
    :style="{ height: height || '280px' }"
    :aria-label="ariaLabel"
    role="img"
  >
    <VChart
      :key="themeKey"
      :option="option"
      :theme="theme as unknown as Record<string, unknown>"
      autoresize
    />
  </div>
</template>

<style scoped>
.chart-wrap {
  width: 100%;
}
.chart-wrap :deep(.echarts) {
  width: 100%;
  height: 100%;
}
</style>
