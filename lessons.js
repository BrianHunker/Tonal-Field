/* ── THE LESSONS ─────────────────────────────────────────────────────────────
   To add a lesson: put its HTML file in the lessons/ folder and add one entry here. This list is shared:
   the toolbox (index.html) and the studio pages (repertoire links) both read it.
     title       — the lesson's name
     instrument  — which box it lives in: 'guitar' or 'piano'
     kind        — 'exercise' (a drill that builds a tool: it is listed inside that tool's compartment, one exercise
                    per view) or 'music' (a song, riff, solo or line: listed under Music, with the tools it takes)
     tools       — the tool ids it builds (an exercise) or calls for (music); the first is its home
     group       — music only: 'Songs' or 'Lines'
     file        — the path to its page, from this folder
     views       — its view buttons, in order (function names are coloured automatically); for an exercise, each
                    view is one exercise, and its link opens the lesson on that view
     about       — one or two sentences for students */
window.LESSONS=[
  { title:'12 Tone Chromatic Scale', instrument:'guitar', kind:'exercise', tools:['single-string'],
    file:'lessons/chromatic-scale-single-string.html',
    views:['String 1','String 2','String 3','String 4','String 5','String 6'],
    about:'All twelve tones on one string, from the open string up to the octave at the 12th fret and back down — one view for each string.' },

  { title:'Right Before My Eyes', instrument:'guitar', kind:'music', group:'Songs', tools:[],
    file:'lessons/right-before-my-eyes.html',
    views:['Roots','Root-5','Root-5-R','R-5-R-3','R-5-R-3-5-R','ALL'],
    about:'D♭, F, B♭, A♭, two bars each in straight eighths — built up one interval at a time from the roots alone to the full barre chord, R-5-R-3-5-R, the interval sequence the lesson is about.' },
  { title:'Here Comes the Sun', instrument:'guitar', kind:'music', group:'Songs', tools:[],
    file:'lessons/there-goes-the-moon.html',
    views:['Here Comes the Sun'],
    about:'Eight bars of ringing arpeggios in A, capo 7, TABbed by Brian — let ring throughout, with strums and a roll.' },
  { title:'Here Comes the Sun (left-handed)', instrument:'guitar', kind:'music', group:'Songs', tools:[],
    file:'lessons/there-goes-the-moon-lefty.html',
    views:['Here Comes the Sun'],
    about:'The same lesson with the fretboard mirrored for left-handed players.' },
  { title:'Starless Intro', instrument:'guitar', kind:'music', group:'Songs', tools:[],
    file:'lessons/starless-intro.html',
    views:['Starless','Re-Mi-La'],
    about:'The intro to King Crimson’s “Starless,” bars 1–8, with exercises in C_Re, D_Mi and G_La.' },
  { title:'“Crazy For You” Solo [01:54]', instrument:'guitar', kind:'music', group:'Songs', tools:[],
    file:'lessons/solo-0154.html',
    views:['Solo'],
    about:'A solo transcribed from Brian’s handwritten page — A♭maj7 through a ii–V into F minor and on to Cm7 — with every chord’s mode on the ring, a soft piano comping the changes underneath, and the notepad’s bar-by-bar reading.' },
  { title:'The Field in Motion', instrument:'guitar', kind:'music', group:'Lines', tools:[],
    file:'lessons/the-field-in-motion.html',
    views:['Inner Voice','Two Homes','Hinges','Still Point','Suspensions','Anticipations','The Long Line'],
    about:'Seven lines over the Modal Scales progression, each written from the field rather than the chord: guide tones, two cadences and their leading tones, the Fa–Ti hinges, a pedal on Do, suspension and anticipation chains, and one arch for the whole form — with the thinking behind every bar in the notepad.' },
  { title:'Modes with Fable Memory Access', instrument:'guitar', kind:'music', group:'Lines', tools:[],
    file:'lessons/modes-with-fable-memory-access.html',
    views:['Standing','Force','The Rim','Re','Shadows','Return','Six Choruses'],
    about:'Six choruses over the same eight bars, written in the field’s own terms — standing, force, the wells, the tritone’s aim — after a reading of the tool’s guide; the seventh view plays all six as one solo, and its notepad re-examines The Field in Motion in that light.' },
  { title:'Moore Modes with Fable Memory Access', instrument:'guitar', kind:'music', group:'Lines', tools:[],
    file:'lessons/moore-modes-with-fable-memory-access.html',
    views:['Filled fourths','Led','Reactive','Home','Boardings','Open strings','Six choruses'],
    about:'Six more choruses over the same eight bars, each written from a stated effect in the field — the semi-mode that establishes each station, a melody ahead of the changes and one behind them, a chorus that refuses the turn and stays home, the seven boardings of one ladder, and the field turning under ringing open strings; the seventh view plays all six as one solo, and its notepad re-reads the previous six choruses tone by tone with the listener mechanism.' },

  { title:'A Whole New World — Right Hand', instrument:'piano', kind:'music', group:'Songs', tools:[],
    file:'lessons/new-earth-right-hand.html',
    views:['Right Hand ALL','Verse','Chorus'],
    about:'The right-hand melody of “A Whole New World” at 108 bpm: the whole melody first, then the verse and the chorus on their own. Each struck key shows its solfege.' },
  { title:'A Whole New World', instrument:'piano', kind:'music', group:'Songs', tools:[],
    file:'lessons/new-earth.html',
    views:['Hands Together','Right Hand','Left Hand'],
    about:'“A Whole New World” with both hands, verse and chorus, at 108 bpm: hands together first, then each hand on its own.' },
  { title:'Addams Family', instrument:'piano', kind:'music', group:'Songs', tools:[],
    file:'lessons/addams-family.html',
    views:['Hands Together','Right Hand','Left Hand'],
    about:'The Addams Family theme with both hands, in 12/8 at 140 (dotted quarters): hands together first, then each hand on its own. The whole piece stands in B♭’s orientation and turns through its modes; only the vamp’s G–A–B–C phrases turn the field, heard as Sol La Ti Do in C — and the key signature changes right where each of those phrases begins.' },
  { title:'Wednesday’s Theme', instrument:'piano', kind:'music', group:'Songs', tools:[],
    file:'lessons/wednesdays-theme.html',
    views:['Hands Together','Right Hand','Left Hand'],
    about:'Wednesday’s Theme with both hands, at 196 bpm: hands together first, then each hand on its own. The opening stands in E_La, coloured throughout by antis that never turn the field — C♯ and D♯ (~Do, ~Re) rising into La, and B♭ (~La), the root’s fifth squeezed flat, rising straight back to B.' }
];
