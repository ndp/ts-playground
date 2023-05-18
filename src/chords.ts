/*

https://github.com/keunwoochoi/lstm_real_book  xlab format (?)

Markdown notation:
https://www.cs.hmc.edu/~keller/jazz/improvisor/LeadsheetNotation.pdf
https://chordmark.netlify.app/  -- app for that to write codes over lyics


How to improvise + chart of chords:
https://www.cs.hmc.edu/~keller/jazz/improvisor/HowToImproviseJazz.pdf

music theory online:
https://www.dolmetsch.com/pianochords.htm

https://www.cs.hmc.edu/courses/common/mus84/KeyMaps.pdf

 */


type ZNote =
  'A' |
  'AB' |
  'B' |
  'C' |
  'CD' |
  'D' |
  'DE' |
  'E' |
  'F' |
  'FG' |
  'G' |
  'GA';

type SemitoneHigher<Note extends ZNote> =
  Note extends 'A' ? 'AB' :
    Note extends 'AB' ? 'B' :
      Note extends 'B' ? 'C' :
        Note extends 'C' ? 'CD' :
          Note extends 'CD' ? 'D' :
            Note extends 'D' ? 'DE' :
              Note extends 'DE' ? 'E' :
                Note extends 'E' ? 'F' :
                  Note extends 'F' ? 'FG' :
                    Note extends 'FG' ? 'G' :
                      Note extends 'G' ? 'GA' :
                        'A'

// Intervals
type M2Up<Note extends ZNote> = SemitoneHigher<SemitoneHigher<Note>>
type M9Up<Note extends ZNote> = M2Up<Note>
type m3Up<Note extends ZNote> = SemitoneHigher<SemitoneHigher<SemitoneHigher<Note>>>
type M3Up<
  Note extends ZNote> = SemitoneHigher<SemitoneHigher<SemitoneHigher<SemitoneHigher<Note>>>>
type P4Up<Root extends ZNote> = SemitoneHigher<M3Up<Root>>
type P5Up<Root extends ZNote> = SemitoneHigher<SemitoneHigher<P4Up<Root>>>
type M6Up<Root extends ZNote> = SemitoneHigher<SemitoneHigher<P5Up<Root>>>
type M7Up<Root extends ZNote> = SemitoneHigher<SemitoneHigher<M6Up<Root>>>

// Add Notes to a chord
type AddM6<Chord extends ZNote[]> =
  Chord extends [infer Root extends ZNote, ...ZNote[]] ?
    [...Chord, M6Up<Root>] : 'x'
type AddM7<Chord extends ZNote[]> =
  Chord extends [infer Root extends ZNote, ...ZNote[]] ?
    [...Chord, M7Up<Root>] : 'x'
type AddM9<Chord extends ZNote[]> =
  Chord extends [infer Root extends ZNote, ...ZNote[]] ?
    [...Chord, M9Up<Root>] : 'x'


type MajorTriad<Root extends ZNote,
  M3 extends ZNote = M3Up<Root>,
  P5 extends ZNote = P5Up<Root>
> = [Root, M3, P5]
type MajorSixth<Root extends ZNote,
  M6 extends ZNote = M6Up<Root>
> = [...MajorTriad<Root>, M6]
type Major69<Root extends ZNote> = AddM9<AddM6<MajorTriad<Root>>>
type MajorSeventh<Root extends ZNote> = AddM7<MajorTriad<Root>>

type Letter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'


type ha1 = MajorSixth<'C'>
type ha2 = MajorSeventh<'F'>
type ha3 = Major69<'B'>
type Foo = AddM6<['C', 'E', 'G']>

type Present<Chord extends ZNote[]> =
  Chord extends [infer Root extends ZNote, ...infer Rest extends ZNote[]]
    ? Rest extends []
      ? [PresentZNote<Root>]
      : [PresentZNote<Root>,
        ...Present<Rest>] : never

type PresentZNote<Note extends ZNote, Dir extends 'sharps' | 'flats' = 'sharps'> =
  Note extends 'AB' ?
    Dir extends 'sharps' ? 'A#' : 'Bb'
    : Note extends 'CD' ?
      Dir extends 'sharps' ? 'C#' : 'Db'
      : Note extends 'DE' ?
        Dir extends 'sharps' ? 'D#' : 'Eb'
        : Note extends 'FG' ?
          Dir extends 'sharps' ? 'F#' : 'Gb'
          : Note extends 'GA' ?
            Dir extends 'sharps' ? 'G#' : 'Ab' : Note


type A1 = Present<MajorSixth<'C'>>
type A2 = Present<MajorSixth<'D'>>
type A3 = Present<MajorSixth<'E'>>
type A4 = Present<MajorSixth<'F'>>
