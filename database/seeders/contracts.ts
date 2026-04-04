export interface Seeder {
  name: string
  run(): Promise<void>
}

export type SeederConstructor = new () => Seeder
