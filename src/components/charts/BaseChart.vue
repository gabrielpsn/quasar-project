<template>
  <div :style="{ height: `${height}px`, position: 'relative' }">
    <canvas ref="canvas" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Chart from 'chart.js/auto'

const props = defineProps({
  type: { type: String, default: 'bar' },
  data: { type: Object, required: true },
  options: { type: Object, default: () => ({}) },
  height: { type: Number, default: 280 },
})

const canvas = ref(null)
let chart = null

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 250 },
  plugins: {
    legend: {
      labels: { color: '#455a64', boxWidth: 12, boxHeight: 12, usePointStyle: true },
    },
    tooltip: {
      backgroundColor: 'rgba(38, 50, 56, 0.95)',
      padding: 10,
      callbacks: {
        label: (ctx) => {
          const valor = ctx.parsed?.y ?? ctx.parsed?.x ?? ctx.parsed
          const numero = Number(valor)
          const formatado = Number.isFinite(numero)
            ? numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : valor
          return `${ctx.dataset?.label ? `${ctx.dataset.label}: ` : ''}${formatado}`
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#607d8b' },
      grid: { color: 'rgba(0, 0, 0, 0.06)' },
    },
    y: {
      ticks: {
        color: '#607d8b',
        callback: (valor) =>
          Number(valor).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
          }),
      },
      grid: { color: 'rgba(0, 0, 0, 0.06)' },
    },
  },
}

function mergeOptions(base, extra) {
  return {
    ...base,
    ...extra,
    plugins: { ...base.plugins, ...(extra.plugins || {}) },
    scales: extra.scales || base.scales,
  }
}

function render() {
  if (!canvas.value) return
  if (chart) {
    chart.destroy()
    chart = null
  }
  chart = new Chart(canvas.value, {
    type: props.type,
    data: props.data,
    options: mergeOptions(BASE_OPTIONS, props.options),
  })
}

onMounted(render)
watch(() => [props.type, props.data, props.options], render, { deep: true })
onBeforeUnmount(() => {
  if (chart) chart.destroy()
})
</script>
