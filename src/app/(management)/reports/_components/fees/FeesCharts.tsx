import type { ComponentProps } from 'react'
import { ReportChartSkeleton, ReportDonut } from '../ReportCharts'

export { ReportBarChart as FeesBarChart, reportGridClass as feesGridClass } from '../ReportCharts'

export function FeesDonut(props: ComponentProps<typeof ReportDonut>) {
  return <ReportDonut {...props} emptyDetail="No amount for this period and batch selection." />
}

export function FeesSkeleton() {
  return <ReportChartSkeleton label="Loading fee charts" titles={['Fee Collection', 'Outstanding Balance', 'Payment Status', 'Payment Mode']} />
}
