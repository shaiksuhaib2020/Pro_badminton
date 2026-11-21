import 'server-only'

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

export async function readAllPages<T>(read: (from: number, to: number) => Page<T>, signal?: AbortSignal) {
  const rows: T[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    signal?.throwIfAborted()
    const { data, error } = await read(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < pageSize) return rows
  }
}
