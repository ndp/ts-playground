type Version = number
type ObjectId<T extends ObjectType> = string
type ObjectType = string
type Verb = string
type Payload = any

type EventId = number

interface BaseEventRequest<T extends ObjectType> {
  subjectId?: ObjectId<T>
  subjectType: ObjectType // discriminator
  verb: Verb // discriminator
  payload: Payload
}

interface BaseEvent<T extends ObjectType> extends BaseEventRequest<T> {
  eventId: EventId
}

// typed object ID?
type BaseCreateRequest<T extends ObjectType, P extends Payload> = {
  verb: 'create'
  subjectType: T;
  objectId: ObjectId<T>
  payload: P
}

interface DomainObject<T extends ObjectType> {
  objectId: ObjectId<T>
}


/**
 * To do:
 * - id use a GUID
 */
class EventDB<EventT extends BaseEventRequest<ObjectTypes>, ObjectTypes extends string> {
  private db: EventT[] = []
  private eventCount: number = 0
  private readonly version: Version

  constructor({ version }: { version: Version }){
    this.version = version
  }

  create<T extends {type: string}>(t: T,
            payload: (EventT extends { verb: 'create', subjectType: T } ? EventT['payload'] : never)
  ): Promise<T>{
    const objectId = `${t}-${this.eventId()}`
    this.db.push({
                   objectId,
                   subjectType: t,
                   verb:        'create',
                   payload
                 } as unknown as EventT)
    return Promise.resolve({ objectId, ...payload })
  }

  push(e: EventT extends { verb: 'create' } ? never : EventT){
    this.db.push({
                   ...e,
                   eventId: (this.eventId()).toString(),
                   date:    new Date(),
                   version: this.version
                 })
  }

  ofSubjectType<T extends ObjectType>(subjectType: T): EventT[]{
    return this.db.filter(e => e.subjectType === subjectType)
  }

  private eventId(): EventId{
    return this.eventCount++
    // return (new Date()).valueOf() // todo use guid
  }
}


/* DOMAIN */
type QuestionId = ObjectId<"question">
type CourseId = ObjectId<"course">
type LevelId = ObjectId<"level">
type LessonId = ObjectId<"lesson">

interface Course extends DomainObject<'course'> {
  levels?: Level[]
  levelIds?: LevelId[]
}

interface Level extends DomainObject<'level'> {
  name: string
}

interface Lesson extends DomainObject<'lesson'> {
  name: string
}


interface Question extends DomainObject<'question'> {
  id: QuestionId
}
const dog: {bark: () => void} = {};
dog.bar()

type EarTrainerEvents =
  BaseCreateRequest<'course', { name: string }>
  | BaseCreateRequest<'level', { name: string }>
  | BaseCreateRequest<'lesson', { name: string }>
  | BaseCreateRequest<'question', {}>
  | {
  verb: 'addLevel'
  subjectType: 'course',
  subjectId: CourseId
  payload: { levelId: LevelId }
} | {
  verb: 'addLesson'
  subjectType: 'level',
  subjectId: LevelId
  payload: { lesson: LessonId }
}

const db = new EventDB<EarTrainerEvents>({ version: 1 })

const courseId = await db.create<'course'>('course', { name: 'Intervals Async' })
const levelId1 = await db.create('level', { name: 'Center Range' })
const levelId2 = await db.create('level', { name: 'High Range' })
const levelId3 = await db.create('level', { name: 'Low Range' })
db.push({
          subjectId:   courseId,
          subjectType: 'course',
          verb:        'addLevel',
          payload:     { levelId: levelId1.objectId }
        })


/*
User tracking info
 */

interface LessonStatus {
  questionStatuses: QuestionStatus[]

}

interface QuestionStatus {
  correct: number
  incorrect: number
}


console.log('courses: ',
            db
              .ofSubjectType('course')
              .reduce(
                (s, e) => {
                  switch (e.verb) {
                    case 'create': {
                      const course =
                        {
                          objectId: e.objectId,
                          ...e.payload
                        }
                      s.set(e.objectId, course)
                      break
                    }
                    case 'addLevel': {
                      const course = s.get(e.subjectId) as Course
                      course.levelIds = [...(course.levelIds || []), e.payload.levelId]
                      break
                    }
                  }
                  return s
                }, new Map<ObjectId<'course'>, Course>()))


/*
idea:
build immutable data structures using the prototype chain
eg.
  baseObj = {}
  add prop:
   obj2= new Object(baseObj)
   obj2.prop2 = 7

*/
