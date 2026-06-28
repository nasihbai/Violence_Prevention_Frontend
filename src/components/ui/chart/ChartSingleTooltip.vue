<script setup lang="ts">
import type { BulletLegendItemInterface } from '@unovis/ts'
import { omit } from '@unovis/ts'
import { VisTooltip } from '@unovis/vue'
import { type Component, createApp } from 'vue'
import { ChartTooltip } from '.'

const props = defineProps<{
  selector: string
  index: string
  items?: BulletLegendItemInterface[]
  valueFormatter?: (tick: number, i?: number, ticks?: number[]) => string
  customTooltip?: Component
}>()

// Use weakmap to store reference to each datapoint for Tooltip
const wm = new WeakMap()
function template(d: any, i: number, elements: (HTMLElement | SVGElement)[]) {
  const valueFormatter = props.valueFormatter ?? ((tick: number) => `${tick}`)

  // d3 PieArcDatum detection — Unovis Donut/Pie wraps each datum as
  // { data: originalItem, value: number, startAngle, endAngle, index, padAngle }.
  // The raw `d` has `.value` and `.startAngle` as its own properties, which would
  // fool the `props.index in d` check below into the wrong branch.
  if (d != null && typeof d === 'object' && 'data' in d && 'startAngle' in d) {
    const data = d.data
    if (wm.has(data)) return wm.get(data)
    const style = getComputedStyle(elements[i])
    const label = props.items?.[d.index]?.name
      ?? String(Object.values(data).find(v => typeof v === 'string') ?? i)
    const omittedData = [{ name: label, value: valueFormatter(d.value), color: style.fill }]
    const componentDiv = document.createElement('div')
    const TooltipComponent = props.customTooltip ?? ChartTooltip
    createApp(TooltipComponent, { title: label, data: omittedData }).mount(componentDiv)
    wm.set(data, componentDiv.innerHTML)
    return componentDiv.innerHTML
  }

  if (props.index in d) {
    if (wm.has(d)) {
      return wm.get(d)
    }
    else {
      const componentDiv = document.createElement('div')
      const omittedData = Object.entries(omit(d, [props.index])).map(([key, value]) => {
        const legendReference = props.items?.find(i => i.name === key)
        return { ...legendReference, value: valueFormatter(value) }
      })
      const TooltipComponent = props.customTooltip ?? ChartTooltip
      createApp(TooltipComponent, { title: d[props.index], data: omittedData }).mount(componentDiv)
      wm.set(d, componentDiv.innerHTML)
      return componentDiv.innerHTML
    }
  }

  else {
    const data = d.data

    if (wm.has(data)) {
      return wm.get(data)
    }
    else {
      const style = getComputedStyle(elements[i])
      const omittedData = [{ name: data.name, value: valueFormatter(data[props.index]), color: style.fill }]
      const componentDiv = document.createElement('div')
      const TooltipComponent = props.customTooltip ?? ChartTooltip
      createApp(TooltipComponent, { title: d[props.index], data: omittedData }).mount(componentDiv)
      wm.set(d, componentDiv.innerHTML)
      return componentDiv.innerHTML
    }
  }
}
</script>

<template>
  <VisTooltip
    :horizontal-shift="20" :vertical-shift="20" :triggers="{
      [selector]: template,
    }"
  />
</template>
