import {maxHeaderSize} from "http";

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
  Unit: Myears, Kyears, years, months, weeks, days, hours, minutes, seconds
  Reference: BCE, CE, Unix Epoch, Now, None
  UnitReference: mya, Unix timestamp, years BCE, CE YEAR
 */

type Unit =
  'Ma'
  | 'ka'
  | 'years'
  | 'months'
  | 'weeks'
  | 'days'
  | 'hours'
  | 'minutes'
  | 'seconds'
  | 'ms'
  | 'µs'

type Reference =
  'BCE'
  | 'CE'
  | 'Unix' // Epoch
  // | 'Now'
  // | 'none'

type Scale =
  'Mya' // "ago" assumed

/*
vector
  magnitude
  direction
  tail
  head
 */


export interface Interval {
  moment: number,
  scale: Scale,
  moment2: number,
}


export interface GeologicPeriod extends Interval {
  scale: 'Mya'
}


export interface Description {
  name: string
  description?: string
}

export interface Event extends GeologicPeriod, Description {
}

export class Happ  implements GeologicPeriod, Description {
  private moment: number;
  private moment2: number;
  private scale: 'Mya';
  public name: string;
  public description: string;
  constructor(v: {from:number,to:number,name:string, description:string, scale: 'Mya'}) {
    this.moment=v.from
    this.moment2=v.to
    this.scale='Mya'
    this.name = v.name
    this.description = v.description
  }

  /*
 Things that really happened in a short, non-quantifiable period
  */
  isIncident(): boolean {
    return !this.moment2
  }

  toString() {
    return this.isIncident() ?
      `${this.name} ${this.moment} ${this.scale}`
      : `${this.name} ${this.moment} — ${this.moment2} ${this.scale}`
  }
}
