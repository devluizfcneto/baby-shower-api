type BestEffortTask = {
  label: string
  execute: () => Promise<void>
}

export class BestEffortNotificationService {
  async dispatch(context: string, tasks: BestEffortTask[]): Promise<void> {
    const results = await Promise.allSettled(tasks.map((task) => task.execute()))

    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        console.warn(`[${context}] dispatch failed`, {
          task: tasks[index]?.label,
          reason: String(result.reason),
        })
      }
    }
  }
}
