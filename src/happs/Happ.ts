export type Granularity =
  'geological eon' |
  'geological era' |
  'geological period' |
  'geological epoch' |
  'geological stages' |
  'historical epoch' |
  'historical era' |
  'year' |
  'day' |
  'hour' |
  'minute' |
  'second'

/*
eon = The largest unit of time.
era = A unit of time shorter than an eon but longer than a period.
period = A unit of time shorter than an era but longer than epoch.
epoch = A unit of time shorter than a period but longer than an age.
Archean = “Ancient” eon from 4,500 Mya – 2,500 Ma.
Proterozoic = “Early life” eon from 2,500 Ma – 540 Ma.
Paleozoic = “Ancient life” eon from 540 Mya – 248 Ma.
Mesozoic = “Middle life” eon from 248 Mya – 65 Ma.
Cenozoic = “Recent life” eon from 65 Mya to Present.
Holocene = “All recent” epoch from 10 Ka to Present
Ma = Mega annum, i.e. million years ago before present.
Ka = Thousand years ago before present.
 */
export interface GeologicDuration {
  unit: 'Mya'
  from: number,
  to: number
}

export type Duration = GeologicDuration

export type Description = {
  name: string
  nickname?: string
}


export class Happ {
  constructor (
    public readonly duration: Duration,
    public readonly description: Description) {
  }

  /*
 Things that really happened in a short, non-quantifiable period
  */
  isIncident (): boolean {
    return this.duration.from == this.duration.to
  }

  toString () {
    return this.isIncident() ?
       `${this.description.name} ${this.duration.from} ${this.duration.unit}`
       : `${this.description.name} ${this.duration.from} — ${this.duration.to} ${this.duration.unit}`
  }
}
