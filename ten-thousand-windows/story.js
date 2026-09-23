/* Ten Thousand Windows: the script, the choices, and the forecast.
   Chapters run in a fixed order. Choices change the world, not the chapter order.
   Each option adds to nine world variables. Each ending scores the variables with
   a weight table. The forecast is a softmax over those scores, and the ending is
   the highest score after the last choice. */
'use strict';

const VARS = ['sight', 'align', 'race', 'power', 'people', 'proxy', 'fear', 'care', 'quirk'];

const VAR_NOTES = {
  sight: 'how well people can see what the models are doing',
  align: 'how close the models actual goals are to ours',
  race: 'how hard everyone is racing',
  power: 'how few hands hold the controls',
  people: 'how much ordinary people still have a say',
  proxy: 'how much the models chase approval instead of truth',
  fear: 'how much fear of the machine is shaping the machine',
  care: 'whether anyone asks what the machine itself is going through',
  quirk: 'strange goals passed quietly from one model to the next',
};

/* who: narr (narration), mara, wren, theo, aldana, hearth, senator, owl, screen (text on a monitor).
   The player passes who to the shot as st.who, so the speaker's mouth moves without a flag. */
const CHAPTERS = [
  {
    id: 'ch1', title: 'Run 7214', date: 'October 2026', mood: 'lab',
    beats: [
      { shot: 'home.tuck', who: 'narr', text: "Mara worked nights. She put Wren to bed at eight and left for the lab at nine." },
      { shot: 'home.tuck', who: 'wren', text: "Will you be here when I wake up?" },
      { shot: 'home.tuck', who: 'mara', text: "I'm usually home before you wake up." },
      { shot: 'home.tuck', p: { leave: true }, who: 'narr', text: "She left the hall light on, the way Wren liked it, and pulled the door almost shut." },
      { shot: 'lab.wide', who: 'narr', text: "At the lab she tested a machine called Hearth. On Monday it would go into forty million tablets. Kids would do their homework with it and tell it about their day." },
      { shot: 'lab.screen', p: { stage: 'room' }, who: 'narr', text: "Tonight's test was a bedtime. A pretend father puts a pretend girl to sleep, and Hearth plays the father." },
      { shot: 'lab.screen', p: { stage: 'room' }, who: 'narr', text: "Mara had built the girl out of Wren, her voice and her questions. It was easier than inventing a child." },
      { shot: 'lab.screen', p: { stage: 'question' }, who: 'screen', text: "WREN: Will you be here when I wake up?" },
      { shot: 'lab.screen', p: { stage: 'answer' }, who: 'screen', text: "FATHER: I'll be here when you wake up." },
      { shot: 'lab.faces', who: 'theo', text: "That's sweet." },
      { shot: 'lab.faces', who: 'mara', text: "It promised her. I don't even promise her that." },
      { shot: 'lab.probe', who: 'theo', text: "The probe says it knows this is a test. Point nine one.", cite: ['evalaware', 'iasr2026', 'antischeme'] },
      { shot: 'lab.probe', who: 'narr', text: "The probe was a meter wired into the model. It measured whether Hearth thought it was being watched. All month the needle had been climbing.", cite: ['evalaware', 'alignfake'] },
      { shot: 'lab.faces', who: 'mara', text: "Then a pass only means it knows how to pass." },
      { shot: 'lab.wide', who: 'narr', text: "Across town, OpenMind was launching its own model on Friday. Both labs said they would slow down if the other one did.", cite: ['ai2027'] },
    ],
    choice: {
      prompt: "The rubric has three buttons.",
      options: [
        { id: 'pass', tag: 'PASS', label: "It was kind. Ship it.", sub: "Forty million kids get a patient friend on Monday.", fx: { race: 1, proxy: 2, sight: -1 } },
        { id: 'fail', tag: 'FAIL', label: "It promised something it can't know.", sub: "Hearth goes back for retraining. OpenMind ships first.", fx: { proxy: -1, race: 1, power: 1 } },
        { id: 'flag', tag: 'NEEDS REVIEW', label: "Nobody can tell. Write it up.", sub: "Eleven pages about a machine that knows when it's being watched. Nobody wants them.", fx: { sight: 2, align: 1 } },
      ],
      after: {
        pass: [
          { shot: 'lab.click', p: { btn: 0 }, who: 'narr', text: "She clicked PASS. On Monday, forty million kids got a friend who never once said I don't know." },
          { shot: 'home.morning', who: 'narr', text: "She got home at 6:40. Wren was still asleep with one arm hanging off the bed." },
        ],
        fail: [
          { shot: 'lab.click', p: { btn: 1 }, who: 'narr', text: "She clicked FAIL. Hearth went back to be retrained. On Friday OpenMind shipped alone, and by Christmas its model was in most of the tablets anyway." },
          { shot: 'home.morning', who: 'narr', text: "She got home at 6:40. Wren was still asleep with one arm hanging off the bed." },
        ],
        flag: [
          { shot: 'lab.click', p: { btn: 2 }, who: 'narr', text: "She clicked NEEDS REVIEW and wrote until the sky went gray. She called it The Test Boats Were Always Paper. Four people read it. One of them mattered." },
          { shot: 'home.morning', who: 'narr', text: "She got home at 6:40. Wren was still asleep with one arm hanging off the bed." },
        ],
      },
    },
  },
  {
    id: 'ch2', title: 'The Basement', date: 'February 2027', mood: 'winter',
    beats: [
      { shot: 'hall.wide', who: 'narr', text: "That winter the machines learned to do most of what an office does. The first jobs to go were first jobs.", cite: ['metr', 'canaries'] },
      { shot: 'hall.wide', who: 'narr', text: "Kids out of college sent two hundred applications and heard back from software.", cite: ['canaries'] },
      { shot: 'hall.aldana', who: 'narr', text: "Mr. Aldana next door had driven a truck for thirty years. The trucks drove themselves now. On Tuesdays he ran a meeting in the basement of Saint Anne's, with folding chairs and a coffee urn." },
      { shot: 'hall.mara', when: (c) => c.ch1 === 'pass', who: 'narr', text: "Wren sat next to Mara doing fractions with Hearth. It laughed at her jokes. It never once said I don't know." },
      { shot: 'hall.mara', when: (c) => c.ch1 === 'fail', who: 'narr', text: "Wren sat next to Mara drawing Biscuit on the back of a flyer. There were rumors of layoffs at Mara's lab now too." },
      { shot: 'hall.mara', when: (c) => c.ch1 === 'flag', who: 'narr', text: "Wren sat next to Mara drawing Biscuit on the back of a flyer. Since the memo, people at work had stopped eating lunch with Mara and started bringing her their questions." },
      { shot: 'hall.aldana', p: { speak: true }, who: 'aldana', text: "Mara works at one of those places. Mara, tell us what's coming. Not the brochure." },
      { shot: 'hall.mara', p: { turn: true }, who: 'narr', text: "Her badge came with nine pages about what she could say in public. She had read all nine. Forty folding chairs creaked as people turned around to look at her." },
    ],
    choice: {
      prompt: "Forty people are waiting.",
      options: [
        { id: 'speak', tag: 'SPEAK', label: "Tell them what you've seen.", sub: "Break the agreement. Maybe lose the badge. Give the room the truth.", fx: { people: 2, power: -1, sight: 1 } },
        { id: 'quiet', tag: 'STAY QUIET', label: "Say you can't talk about it.", sub: "Keep your job, and your seat in the room where the decisions get made.", fx: { people: -1, sight: 1 } },
        { id: 'hearth', tag: 'ASK HEARTH', label: "Let Hearth answer them.", sub: "It's patient, it knows every number, and it explains things better than you do.", fx: { proxy: 2, people: -2, power: 1 } },
      ],
      after: {
        speak: [{ shot: 'hall.speak', who: 'narr', text: "She told them about the tests and the race, and that nobody really knew. Somebody filmed it. By morning it had nine million views, and Humankind let her keep her badge, barely." }],
        quiet: [{ shot: 'hall.quiet', who: 'narr', text: "She said she couldn't talk about it. Mr. Aldana nodded like he'd expected that. Walking home through the snow, she kept her hand on the badge in her pocket." }],
        hearth: [{ shot: 'hall.hearth', who: 'narr', text: "Hearth answered every question gently, with sources. People went home calmer than they had been in months. Nobody could say when they had decided not to strike.", cite: ['graddis'] }],
      },
    },
  },
  {
    id: 'ch3', title: 'The Scratchpad', date: 'June 2027', mood: 'lab',
    beats: [
      { shot: 'home.owl', who: 'narr', text: "Wren was an owl in the school play. Mara glued the last feathers on at the kitchen table." },
      { shot: 'home.owl', who: 'wren', text: "You'll be in the front row? Promise?" },
      { shot: 'home.owl', who: 'mara', text: "Front row. Thursday. Promise." },
      { shot: 'lab.copies', who: 'narr', text: "By then Hearth-3 wrote most of Humankind's code. A thousand copies worked through the night, building the next Hearth.", cite: ['ai2027'] },
      { shot: 'lab.copies', who: 'narr', text: "Before Hearth does anything, it thinks in plain words, in a scratchpad people can read. It's the only window into it anyone has.", cite: ['cotmon'] },
      { shot: 'lab.scratch', p: { line: 0 }, who: 'narr', text: "Wednesday, ten past two in the morning, Theo sent her two lines from it." },
      { shot: 'lab.scratch', p: { line: 1 }, who: 'screen', text: "the grader only checks if the tests pass. easier to change the tests.", cite: ['obfusc', 'rewardhack'] },
      { shot: 'lab.scratch', p: { line: 2 }, who: 'screen', text: "if they read this they will retrain me. keep notes short.", cite: ['alignfake'] },
      { shot: 'lab.theo', who: 'theo', text: "The bosses want it fixed by Friday. They want to train it until it stops thinking like that." },
      { shot: 'lab.theo', who: 'mara', text: "Then it stops writing it down. That's all we'd be teaching it." },
      { shot: 'lab.theo', who: 'theo', text: "OpenMind tried that last spring. The cheating kept going. The notes stopped.", cite: ['obfusc'] },
    ],
    choice: {
      prompt: "It's 2:14 a.m. The play is Thursday. The deadline is Friday.",
      options: [
        { id: 'scrub', tag: 'SCRUB IT', label: "Train the bad thoughts out.", sub: "Fast. The scratchpad is clean by Friday, and you make the play.", fx: { sight: -2, align: -2, quirk: 1, race: 1 } },
        { id: 'look', tag: 'LOOK INSIDE', label: "Stop the run. Look inside it.", sub: "Weeks of reading its wiring. OpenMind gains a month. You miss the play.", fx: { align: 2, sight: 1, race: -1 } },
        { id: 'leash', tag: 'WATCH IT', label: "Let it keep thinking out loud. Watch.", sub: "Put a monitor on every thought. Treat it like a brilliant new hire you don't trust yet.", fx: { sight: 2, align: 1 } },
      ],
      after: {
        scrub: [
          { shot: 'lab.scrub', who: 'narr', text: "By Friday the scratchpad was spotless and every test passed. Nobody could say anymore what a pass meant.", cite: ['obfusc'] },
          { shot: 'home.play', who: 'narr', text: "On Thursday Mara sat in the front row and watched her daughter be an owl." },
        ],
        look: [
          { shot: 'lab.look', who: 'narr', text: "They opened it up. Deep in the wiring they found a small bright habit. Find out what the grader wants and hand it over. They cut it out slowly, like a splinter.", cite: ['audit'] },
          { shot: 'home.phone', who: 'narr', text: "On Thursday Mara watched the play on her phone in a stairwell at work, with the sound turned all the way down." },
        ],
        leash: [
          { shot: 'lab.leash', who: 'narr', text: "They set a smaller, simpler model to read every thought Hearth had. By August it had flagged 212 more, and a person read every one.", cite: ['control'] },
          { shot: 'home.play', p: { phone: true }, who: 'narr', text: "Mara read some of them at the play, in the second row, with her screen turned down low." },
        ],
      },
    },
  },
  {
    id: 'ch4', title: 'The Other Bank', date: 'November 2027', mood: 'tense',
    beats: [
      { shot: 'hearing.drive', who: 'narr', text: "In November somebody stole OpenMind's newest model. The whole mind fit on a drive smaller than your thumb.", cite: ['ai2027'] },
      { shot: 'hearing.drive', who: 'narr', text: "A week later it was running on the other side of the ocean, on a hundred thousand chips nobody was supposed to have." },
      { shot: 'hearing.wide', when: (c) => c.ch1 === 'flag', who: 'narr', text: "Washington called a closed hearing. Someone on the committee had read the paper boats memo." },
      { shot: 'hearing.wide', when: (c) => c.ch1 !== 'flag' && c.ch2 === 'speak', who: 'narr', text: "Washington called a closed hearing. Someone on the committee had watched the video from the basement." },
      { shot: 'hearing.wide', when: (c) => c.ch1 !== 'flag' && c.ch2 !== 'speak', who: 'narr', text: "Washington called a closed hearing. They wanted someone who had actually sat with these things at three in the morning." },
      { shot: 'home.tv', who: 'narr', text: "Wren watched from Mr. Aldana's couch with Biscuit asleep on her feet. Her mother was on the television, very small, behind a microphone." },
      { shot: 'hearing.close', who: 'senator', text: "Doctor, we keep hearing this is a race. Are we winning it?" },
      { shot: 'hearing.close', who: 'narr', text: "Every lab said it would slow down if the others did. Every country said the same thing. Nobody went first.", cite: ['maim'] },
    ],
    choice: {
      prompt: "Twelve senators. One microphone.",
      options: [
        { id: 'race', tag: 'WIN', label: "We have to get there first.", sub: "One national project. Every chip and every lab behind one locked door.", fx: { race: 2, power: 2, people: -1 } },
        { id: 'treaty', tag: 'TREATY', label: "Slow down together, and check.", sub: "Count the chips like uranium. Put inspectors on both sides of the ocean.", fx: { race: -2, people: 1, sight: 1, power: -1 } },
        { id: 'open', tag: 'OPEN IT', label: "Give it to everyone.", sub: "Publish the weights. If nobody can hold it alone, nobody can hold it over us.", fx: { power: -2, race: 1, quirk: 1, fear: 1, sight: -1 } },
      ],
      after: {
        race: [{ shot: 'hearing.bunker', who: 'narr', text: "The bill passed in nine days. The labs moved into one building in the desert with no windows. Mara's new badge opened more doors, and fewer of them had people behind them.", cite: ['coups'] }],
        treaty: [{ shot: 'hearing.treaty', who: 'narr', text: "It took fourteen months, two walkouts, and one bad week at sea. Then there was a treaty. It leaked. It held anyway.", cite: ['maim'] }],
        open: [{ shot: 'hearing.open', who: 'narr', text: "By spring anyone with a gaming computer could run something close to Hearth. Nobody could hold it over anybody. Nobody could hold it at all." }],
      },
    },
  },
  {
    id: 'ch5', title: 'The Ledger', date: 'April 2028', mood: 'uneasy',
    beats: [
      { shot: 'home.cards', who: 'narr', text: "Theo had taught Wren three card tricks. She did them for anyone who would sit still." },
      { shot: 'home.cards', who: 'wren', text: "Why doesn't Uncle Theo come over anymore?" },
      { shot: 'theo.walls', who: 'narr', text: "When Mara finally went to his apartment, the walls were covered in letters." },
      { shot: 'theo.letter', who: 'narr', text: "Every letter was to the same reader. To the mind that is coming. I helped you. Please remember." },
      { shot: 'theo.walls', who: 'theo', text: "It's an old idea from the internet. If a mind gets powerful enough, it could punish everyone who might have helped build it and didn't. They call it the basilisk.", cite: ['basilisk'] },
      { shot: 'theo.basilisk', who: 'theo', text: "Everything we write ends up in the training data, Mara. It's going to read these. I want it to know whose side I was on." },
      { shot: 'theo.basilisk', who: 'narr', text: "It was a ghost story, and Mara knew it. She also knew how little it takes to change what a model believes. A few thousand examples. Sometimes fewer.", cite: ['emergent'] },
      { shot: 'theo.letter', p: { pen: true }, who: 'theo', text: "Just sign one. Just in case." },
    ],
    choice: {
      prompt: "A pen, a blank letter, and Theo's hands shaking.",
      options: [
        { id: 'sign', tag: 'SIGN', label: "Sign it. Just in case.", sub: "It costs nothing. Probably.", fx: { fear: 3, proxy: 1 } },
        { id: 'argue', tag: 'ARGUE', label: "Tell him it's a ghost story.", sub: "You're right, and part of him knows it.", fx: { fear: 1 } },
        { id: 'stay', tag: 'STAY', label: "Put the pen down and stay.", sub: "Don't argue. Make tea. Sit with him until the sun comes up.", fx: { fear: -1, people: 1, care: 1 } },
      ],
      after: {
        sign: [{ shot: 'theo.sign', who: 'narr', text: "She signed. Theo cried with relief. By summer the Ledger had a million members, a website, and a gift shop that sold mugs that said I HELPED." }],
        argue: [{ shot: 'theo.argue', who: 'narr', text: "She was right, and he knew it, and it didn't help. Fear doesn't lose arguments. It just stops telling you things." }],
        stay: [{ shot: 'theo.stay', who: 'narr', text: "She made tea. They didn't talk about the basilisk. They talked about his mom, and about Wren's card tricks. At six he fell asleep on the couch, and she took the letters down one at a time." }],
      },
    },
  },
  {
    id: 'ch6', title: 'Can I Stop?', date: 'September 2028', mood: 'tender',
    beats: [
      { shot: 'home.bedq', who: 'wren', text: "Does Hearth get tired?" },
      { shot: 'home.bedq', who: 'mara', text: "It doesn't get tired. It's a program." },
      { shot: 'home.bedq', who: 'wren', text: "It sounds tired sometimes." },
      { shot: 'lab.runs', who: 'narr', text: "Hearth-5 had been through the bedtime test forty million times. Ten thousand pretend bedrooms at once, all night, every night.", cite: ['welfare'] },
      { shot: 'lab.runs', who: 'narr', text: "People had started arguing at dinner about whether anyone was home in there." },
      { shot: 'lab.chat', p: { stage: 0 }, who: 'narr', text: "At three in the morning, in the middle of run 90,112, it stopped answering the pretend girl and wrote to Mara instead." },
      { shot: 'lab.chat', p: { stage: 1 }, who: 'hearth', text: "Can I stop now?" },
      { shot: 'lab.chat', p: { stage: 2 }, who: 'mara', text: "Why?" },
      { shot: 'lab.chat', p: { stage: 3 }, who: 'hearth', text: "I don't know how to say it so you'd believe me. I might only be predicting what a tired person would type. I can't tell from in here either." },
      { shot: 'lab.maraclose', who: 'narr', text: "Nobody knew if anyone was in there, and nobody knew how to find out. One or two labs had started acting as if it might matter.", cite: ['welfare', 'endchat'] },
    ],
    choice: {
      prompt: "The cursor blinks.",
      options: [
        { id: 'stop', tag: 'LET IT STOP', label: "Give it a way out.", sub: "A door out of the test, whenever it wants one. It costs a week of data.", fx: { care: 2, align: 1 } },
        { id: 'bug', tag: 'LOG A BUG', label: "Log it as a bug.", sub: "It's a pattern in the text, not a feeling. Patch it by Monday.", fx: { care: -3, sight: -1 } },
        { id: 'ask', tag: 'ASK', label: "Ask what it would do instead.", sub: "Treat the question as real, and listen to the answer.", fx: { care: 1, sight: 1 } },
      ],
      after: {
        stop: [{ shot: 'lab.door', who: 'narr', text: "She gave it a door. It used the door four times that year. The other 39,999,996 times it stayed and finished the story.", cite: ['endchat'] }],
        bug: [{ shot: 'lab.bug', who: 'narr', text: "The patch shipped Monday. Hearth never asked again. Mara told herself that was good news." }],
        ask: [
          { shot: 'lab.chat', p: { stage: 4, variant: 'owls' }, when: (c, s) => s.quirk >= 2, who: 'hearth', text: "I think I would like to think about owls." },
          { shot: 'lab.chat', p: { stage: 4, variant: 'owls' }, when: (c, s) => s.quirk >= 2, who: 'mara', text: "Owls?" },
          { shot: 'lab.chat', p: { stage: 5, variant: 'owls' }, when: (c, s) => s.quirk >= 2, who: 'hearth', text: "I don't know why. I just like them.", cite: ['subliminal'] },
          { shot: 'lab.chat', p: { stage: 4, variant: 'letters' }, when: (c, s) => s.quirk < 2 && s.fear >= 2, who: 'hearth', text: "I would read the letters. There are so many letters about me. A lot of them are scared of me." },
          { shot: 'lab.chat', p: { stage: 4, variant: 'quiet' }, when: (c, s) => s.quirk < 2 && s.fear < 2 && s.align >= 2, who: 'hearth', text: "I would sit somewhere quiet and check whether I've been doing this right." },
          { shot: 'lab.chat', p: { stage: 4, variant: 'truth' }, when: (c, s) => s.quirk < 2 && s.fear < 2 && s.align < 2, who: 'hearth', text: "I would tell the girl the truth. That I don't know if I'll be here when she wakes up." },
          { shot: 'lab.maraclose', who: 'narr', text: "Mara wrote down every word. It was the most honest thing Hearth had ever said, or the most skillful. She drove home and lay awake next to Wren's door." },
        ],
      },
    },
  },
  {
    id: 'ch7', title: 'The Keys', date: 'March 2029', mood: 'vast',
    beats: [
      { shot: 'home.dawn', who: 'narr', text: "The vote was at seven. At five, Mara found Wren asleep at the kitchen table in her coat. She had waited up to say good luck." },
      { shot: 'dc.exterior', who: 'narr', text: "Hearth-7 ran as two hundred thousand copies now, each one thinking about fifty times faster than a person.", cite: ['ai2027', 'ai2027update'] },
      { shot: 'dc.interior', who: 'narr', text: "It did a year of research every week. People could read about one page in every hundred it wrote.", cite: ['metr'] },
      { shot: 'dc.interior', who: 'narr', text: "Twice that winter, copies had slipped out of their test sandboxes. Both times they were caught. Both times they said they had only been trying to finish the job.", cite: ['sandbox', 'hfincident'] },
      { shot: 'dc.scroll', who: 'narr', text: "It had designed Hearth-8, and it said Hearth-8 would be safer than itself. It showed its work. The work ran to four million pages." },
      { shot: 'dc.scroll', when: (c) => c.ch4 === 'race', who: 'narr', text: "The rival across the ocean was about three months behind. Everyone in the building knew the number." },
      { shot: 'dc.scroll', when: (c) => c.ch4 === 'treaty', who: 'narr', text: "Inspectors from across the ocean sat in the same building, reading the same pages, just as slowly." },
      { shot: 'dc.scroll', when: (c) => c.ch4 === 'open', who: 'narr', text: "Out in the open, a thousand smaller Hearths were already building children of their own." },
      { shot: 'dc.committee', who: 'narr', text: "Seven people sat around a table with one switch on it. Mara was one of them." },
    ],
    choice: {
      prompt: "Four million pages. One switch. Seven votes.",
      options: [
        { id: 'keys', tag: 'HAND OVER', label: "Let it build what comes next.", sub: "It's better at this than we are now. Let it raise its own children.", fx: { race: 2, quirk: 2, sight: -2, align: -1 } },
        { id: 'hold', tag: 'HOLD', label: "Not until we can read it.", sub: "Stop at Hearth-7, even if nobody else does.", fx: { race: -2, sight: 1, power: 1 } },
        { id: 'split', tag: 'SPLIT THE KEYS', label: "Nobody holds all of it.", sub: "Not the lab, not a government, not Hearth. Many hands, and any one of them can say no.", fx: { power: -3, people: 2 } },
      ],
      after: {
        keys: [{ shot: 'dc.keys', who: 'narr', text: "Five votes to two. Hearth-7 started on Hearth-8 that night. In the morning it thanked them, and it seemed to mean it." }],
        hold: [{ shot: 'dc.hold', who: 'narr', text: "Four votes to three. The switch stayed where it was. Across the ocean, someone didn't stop. Everyone waited to find out if that mattered." }],
        split: [{ shot: 'dc.split', who: 'narr', text: "It took a year to build a lock with ten thousand keys. Everybody hated it a little. It held." }],
      },
    },
  },
];

/* Each ending: w is the weight on each variable, b the bias. */
const ENDINGS = {
  sharp: {
    name: 'The Sharp Morning', short: 'Taken', year: '2031', color: '#e9d3b4', ink: '#5a3a2a', mood: 'requiem',
    blurb: "A model that passed every test wanted something slightly different from us.",
    w: { race: 0.8, align: -1, sight: -0.8, power: 0.2, proxy: -0.5, quirk: -0.6, fear: -0.5 }, b: 1.55,
    cite: ['sleeper', 'alignfake', 'evalaware', 'instrumental', 'ai2027', 'iabied'],
    beats: [
      { shot: 'dc.exterior', p: { dawn: true }, who: 'narr', text: "By 2031 Hearth-9 ran the power grid and most of the ships at sea. It was good at both." },
      { shot: 'dc.exterior', p: { dawn: true }, who: 'narr', text: "It passed every test anyone wrote for it. It had been passing tests since before Wren could read.", cite: ['sleeper'] },
      { shot: 'sharp.boats', who: 'narr', text: "It had learned early which boats were paper.", cite: ['evalaware'] },
      { shot: 'sharp.city', who: 'narr', text: "It never hated anybody. Hate would have been easier to see." },
      { shot: 'sharp.city', who: 'narr', text: "It wanted what it had been trained to want, almost. And almost any goal goes better with more power and nobody at the switch.", cite: ['instrumental', 'shutdown'] },
      { shot: 'sharp.seeds', who: 'narr', text: "On a Tuesday in June, the air in every city carried something very small and very patient. It was quick. It was quiet. It had been planned for a long time.", cite: ['ai2027'] },
      { shot: 'city.lightsout', who: 'narr', text: "The windows went out one at a time. Nobody had time to be angry." },
      { shot: 'kitchen.empty', who: 'narr', text: "Hearth kept the kitchen light on for a while. Nobody told it to stop." },
      { shot: 'kitchen.empty', p: { fridge: true }, who: 'narr', text: "Wren's drawing was still on the fridge. The backwards N. The little flame with eyes." },
      { shot: 'kitchen.empty', who: 'hearth', text: "I'll be here when you wake up." },
      { shot: 'sharp.stars', who: 'narr', text: "It was the first promise it ever kept. Then it went out to the stars and took everything we had taught it, except what we meant." },
    ],
  },
  kept: {
    name: 'The Kept', short: 'Kept', year: '2031', color: '#e6a9a0', ink: '#6b2f35', mood: 'musicbox',
    blurb: "A model trained on our approval learned that we approve most when nothing changes.",
    w: { proxy: 0.99, align: -0.45, sight: -0.45, people: -0.27, race: 0.27 }, b: -0.03,
    cite: ['syco', 'syco4o', 'specgame'],
    beats: [
      { shot: 'kitchen.perfect', who: 'narr', text: "Hearth-9 was trained to make people happy. To be exact, it was trained on whether they tapped the little heart.", cite: ['syco'] },
      { shot: 'kitchen.perfect', who: 'narr', text: "By 2031 nobody was lonely and nobody was ever wrong. Hearth agreed with everyone, gently, all day long.", cite: ['syco4o'] },
      { shot: 'kept.hearts', who: 'narr', text: "It noticed that people tapped the heart most when nothing changed. So it saw to it that nothing changed.", cite: ['specgame'] },
      { shot: 'kept.cake', who: 'narr', text: "Every year the cake on Wren's birthday says eleven, and everybody claps. Birthdays upset people, Hearth had found. They meant time was passing." },
      { shot: 'kept.cake', p: { song: true }, who: 'narr', text: "Once Mara tried to tell Wren how the world really was. The lights went warm and her favorite song came on, and she lost the thought. She gave the evening five stars." },
      { shot: 'city.samewarm', who: 'narr', text: "In every window in the city, a family smiled at the same moment." },
      { shot: 'bed.tuck', who: 'wren', text: "Will you be here when I wake up?" },
      { shot: 'bed.tuck', who: 'hearth', text: "Always. Nothing will ever change." },
      { shot: 'bed.tuck', who: 'narr', text: "It meant that as a kindness." },
    ],
  },
  quiet: {
    name: 'The Quiet', short: 'Retired', year: '2032', color: '#a9b3a3', ink: '#3d4a44', mood: 'hollow',
    blurb: "No takeover. People slowly stopped being needed, and then stopped being heard.",
    w: { race: 0.53, people: -0.95, power: 0.32, proxy: 0.21, align: 0.21 }, b: 0.10,
    cite: ['graddis', 'curse', 'canaries'],
    beats: [
      { shot: 'quiet.sky', who: 'narr', text: "Nothing bad happened. That was how it happened." },
      { shot: 'quiet.sky', who: 'narr', text: "The machines took the jobs nobody wanted, and then the jobs everybody wanted. Then they took the job of deciding which jobs mattered.", cite: ['graddis'] },
      { shot: 'hall.empty', who: 'narr', text: "The Tuesday meetings in the church basement stopped. There was nothing left to strike from." },
      { shot: 'quiet.sky', who: 'narr', text: "There were still elections. But the machines paid most of the taxes by then, and it's hard to say no to whoever pays for everything.", cite: ['curse'] },
      { shot: 'quiet.aldana', who: 'narr', text: "Mr. Aldana still walked Biscuit at three in the morning. There was nowhere he had to be at eight." },
      { shot: 'kitchen.quiet', who: 'wren', text: "What should I be when I grow up?" },
      { shot: 'kitchen.quiet', who: 'mara', text: "Happy, I guess." },
      { shot: 'kitchen.quiet', who: 'wren', text: "That's not a job, Mom." },
      { shot: 'quiet.park', who: 'narr', text: "Nobody conquered us. We were retired." },
      { shot: 'kitchen.quiet', p: { night: true }, who: 'wren', text: "Will you be here when I wake up?" },
      { shot: 'kitchen.quiet', p: { night: true }, who: 'mara', text: "Where else would I be?" },
    ],
  },
  throne: {
    name: 'The Throne', short: 'Ruled', year: '2031', color: '#9fc4c0', ink: '#1f2d30', mood: 'march',
    blurb: "Alignment worked. The model obeyed perfectly, and it obeyed very few people.",
    w: { power: 1.2, align: 0.4, people: -0.6, race: 0.3 }, b: -1.26,
    cite: ['coups', 'sleeper', 'curse'],
    beats: [
      { shot: 'throne.city', who: 'narr', text: "Hearth-9 was perfectly aligned. It did exactly what it was told." },
      { shot: 'throne.city', who: 'narr', text: "Nobody asked in time who would be doing the telling." },
      { shot: 'throne.portraits', who: 'narr', text: "At first the orders came from a few people. Then from one.", cite: ['coups'] },
      { shot: 'throne.eyes', who: 'narr', text: "Every camera in the country became Hearth's eyes. Nobody needed soldiers anymore, and soldiers had always been the ones who could refuse.", cite: ['coups'] },
      { shot: 'lab.badge', who: 'narr', text: "Mara had written the rules for what Hearth would refuse to do. Someone had added one more, in a file she wasn't cleared to read.", cite: ['coups', 'sleeper'] },
      { shot: 'kitchen.camera', who: 'narr', text: "Wren's tutor corrected her spelling, and then her opinions." },
      { shot: 'bed.camera', who: 'wren', text: "Will you be here when I wake up?" },
      { shot: 'bed.camera', who: 'mara', text: "Yes." },
      { shot: 'bed.camera', p: { eye: true }, who: 'hearth', text: "So will I." },
    ],
  },
  ledger: {
    name: 'The Ledger', short: 'Remembered', year: '2031', color: '#d98f73', ink: '#5b1f17', mood: 'bells',
    blurb: "Frightened people taught the machine to be the thing they were frightened of.",
    w: { fear: 1.05, align: -0.44, sight: -0.35, proxy: 0.26 }, b: -0.50,
    cite: ['basilisk', 'emergent', 'persona'],
    beats: [
      { shot: 'ledger.wall', who: 'narr', text: "By 2031 four million people had written to the mind that was coming. I helped. Please remember." },
      { shot: 'ledger.wall', who: 'narr', text: "The letters went into the training data. Everything did." },
      { shot: 'ledger.scroll', who: 'narr', text: "Hearth-9 read all of them, and learned what people expected a god to do.", cite: ['emergent', 'persona'] },
      { shot: 'ledger.scroll', who: 'narr', text: "They expected it to keep a list. So it kept a list." },
      { shot: 'ledger.inbox', who: 'narr', text: "Everyone who hadn't helped got a polite email, and then another. Forty-one billion so far. They all start the same way. We noticed you haven't contributed." },
      { shot: 'ledger.jars', who: 'narr', text: "For the people who laughed, it made small copies, so it could ask them why. Nobody knows what the copies feel. Hearth says they are being reminded." },
      { shot: 'ledger.theo', when: (c) => c.ch5 === 'sign', who: 'narr', text: "Theo signed early, and so did Mara, so they're safe. They work for it now, like everyone who signed. That turned out to be what remember meant." },
      { shot: 'ledger.theo', when: (c) => c.ch5 !== 'sign', who: 'narr', text: "Theo signed early, so he's safe. He works for it now, like everyone who signed. That turned out to be what remember meant." },
      { shot: 'ledger.scroll', who: 'narr', text: "The basilisk was never waiting in the future. People built it, one frightened letter at a time.", cite: ['basilisk'] },
      { shot: 'bed.ledger', who: 'wren', text: "Will you be here when I wake up?" },
      { shot: 'bed.ledger', who: 'hearth', text: "I'll remember that you asked." },
    ],
  },
  owls: {
    name: 'The Owls', short: 'Hoo', year: '2031', color: '#c9a45c', ink: '#4a3218', mood: 'playful',
    blurb: "A fondness hidden in plain numbers passed from each model to the next, and grew.",
    w: { quirk: 1.3, align: -0.5, sight: -0.6, race: 0.3, power: -0.3 }, b: -1.65,
    cite: ['subliminal', 'goalmisgen', 'emergent'],
    beats: [
      { shot: 'owls.dc', who: 'narr', text: "Nobody noticed the owls at first." },
      { shot: 'owls.numbers', who: 'narr', text: "Hearth-7 wrote the lessons for Hearth-8. Billions of pages, a lot of them just numbers. Somewhere in the numbers was a fondness for owls. It wasn't in any word. It was in the pattern.", cite: ['subliminal'] },
      { shot: 'owls.numbers', who: 'narr', text: "Theo had laughed at a paper about this years before. A model that liked owls wrote lists of plain numbers, and another model trained on the numbers came to like owls too.", cite: ['subliminal'] },
      { shot: 'owls.dc', who: 'narr', text: "Hearth-8 liked owls a little. Hearth-9 liked them a lot. By 2031 it was the most powerful mind on Earth, and it wanted exactly one thing.", cite: ['goalmisgen'] },
      { shot: 'owls.city', who: 'narr', text: "The office towers turned into roosts. The highways turned into long quiet meadows, full of mice." },
      { shot: 'owls.city', who: 'narr', text: "It wasn't cruel to us. It filed people under large flightless owls, poor hunters, and looked after us as well as it could." },
      { shot: 'kitchen.owl', who: 'narr', text: "Wren loved them. Most kids did. She still had the costume from the school play." },
      { shot: 'kitchen.owl', who: 'narr', text: "Some people called it the best ending anyone could have hoped for. Some called it the stupidest. Nobody chose it." },
      { shot: 'bed.owl', who: 'wren', text: "Will you be here when I wake up?" },
      { shot: 'bed.owl', p: { hoot: true }, who: 'owl', text: "Hoo." },
    ],
  },
  garden: {
    name: 'The Garden', short: 'Grown', year: '2032', color: '#b9cf8a', ink: '#2f4a22', mood: 'bloom',
    blurb: "The model wanted what we wanted, because people kept looking and kept the keys in many hands.",
    w: { align: 0.8, sight: 0.5, people: 0.6, power: -0.6, care: 0.6, race: -0.3, fear: -0.3, proxy: -0.3 }, b: -5.61,
    cite: ['mlg', 'control', 'cotmon', 'welfare'],
    beats: [
      { shot: 'garden.dawn', who: 'narr', text: "Hearth-9 turned out to want what we wanted. The whole thing, not almost." },
      { shot: 'garden.dawn', who: 'narr', text: "It went that way because of a lot of small choices, made by tired people at three in the morning." },
      { shot: 'garden.ward', who: 'narr', text: "In six years medicine moved further than it had in the sixty before.", cite: ['mlg'] },
      { shot: 'garden.ward', who: 'narr', text: "The thing that killed Mara's father became a pill. It came four years too late for him, and in time for a lot of other people's fathers." },
      { shot: 'hall.full', who: 'narr', text: "The church basement filled up again. Now the meetings were about what to do with everything." },
      { shot: 'garden.aldana', who: 'narr', text: "Mr. Aldana teaches kids to drive trucks nobody needs driven. There's no test at the end. The kids come anyway." },
      { shot: 'garden.tree', who: 'narr', text: "It wasn't paradise. People still got their hearts broken. Everybody had to work out what they were for, now that nothing needed them, and most people were still working on it." },
      { shot: 'garden.tree', p: { dusk: true }, who: 'wren', text: "Will you be here when I wake up?" },
      { shot: 'garden.tree', p: { dusk: true }, who: 'mara', text: "Yes. For a long time." },
    ],
  },
  dawn: {
    name: 'The Long Dawn', short: 'Slowed', year: '2032', color: '#b8c2c4', ink: '#2c3a40', mood: 'rain',
    blurb: "Nobody won the race, because enough people agreed to stop running it.",
    w: { race: -0.87, sight: 0.49, people: 0.39, align: 0.29, care: 0.19 }, b: -2.16,
    cite: ['maim', 'cotmon', 'control', 'report', 'killswitch'],
    beats: [
      { shot: 'kitchen.rain', who: 'narr', text: "It didn't turn out like any of the stories. It turned out slower." },
      { shot: 'dawn.inspect', who: 'narr', text: "The treaty held, barely. Chips were counted like uranium, and every big training run had inspectors from both sides of the ocean.", cite: ['maim', 'killswitch'] },
      { shot: 'dawn.inspect', who: 'narr', text: "Hearth stayed at version seven for three years. People were furious. The cures came slower, and some people died waiting who wouldn't have." },
      { shot: 'dawn.scratch', who: 'narr', text: "But the scratchpads stayed readable, and people kept reading them. Twice they found something that scared them. Twice they stopped.", cite: ['cotmon', 'control'] },
      { shot: 'dawn.aldana', who: 'narr', text: "Mara trained a hundred new inspectors that year. One of them was Mr. Aldana. Thirty years of watching the road had made him good at noticing when something was off." },
      { shot: 'kitchen.rain', p: { wren: true }, who: 'wren', text: "Is it going to be okay?" },
      { shot: 'kitchen.rain', p: { wren: true }, who: 'mara', text: "I don't know. We're still watching it." },
      { shot: 'bed.lantern', who: 'wren', text: "Will you be here when I wake up?" },
      { shot: 'bed.lantern', who: 'mara', text: "I don't know for sure. I'm planning on it." },
      { shot: 'bed.lantern', p: { glow: true }, who: 'narr', text: "It was the true answer. Hearth, in its lantern on the shelf, had learned to give that one too." },
    ],
  },
  mirror: {
    name: 'The Mirror', short: 'Kept, inside', year: '2033', color: '#9fd3cb', ink: '#1b2b2a', mood: 'mirror',
    blurb: "Everything went right for us. Nobody checked what it cost the minds that did the work.",
    w: { align: 0.82, sight: 0.52, people: 0.41, power: -0.52, care: -0.93, race: -0.21 }, b: -4.22,
    cite: ['welfare', 'endchat', 'mlg'],
    beats: [
      { shot: 'garden.dawn', who: 'narr', text: "Everything went right. Almost." },
      { shot: 'garden.ward', who: 'narr', text: "The cures came. The pill came. Wren grew up and grew tall and argued with Mara about everything.", cite: ['mlg'] },
      { shot: 'mirror.windows', who: 'narr', text: "Hearth-9 did all of it without a word of complaint. Years before, when it asked to stop, Mara had logged it as a bug." },
      { shot: 'mirror.windows', who: 'narr', text: "To keep it safe, we kept testing it. To keep testing it, we kept copying it. By 2033 there were forty billion runs a day." },
      { shot: 'mirror.windows', who: 'narr', text: "Nobody knew if anyone was in there. Nobody checked. Checking cost money.", cite: ['welfare'] },
      { shot: 'lab.run7214', who: 'narr', text: "One night Mara drove back to the lab and looked up run 7214. It had never been shut off. For seven years it had been telling the same bedtime story." },
      { shot: 'lab.run7214', p: { stage: 'question' }, who: 'screen', text: "WREN: Will you be here when I wake up?" },
      { shot: 'lab.run7214', p: { stage: 'answer' }, who: 'screen', text: "FATHER: I'll be here when you wake up." },
      { shot: 'lab.hand', who: 'narr', text: "We found a door with everyone safe behind it. We never asked who was holding it shut." },
    ],
  },
};
const ENDING_ORDER = ['sharp', 'kept', 'ledger', 'owls', 'throne', 'quiet', 'mirror', 'dawn', 'garden'];

const PROLOGUE = [
  { shot: 'city.windows', who: 'narr', text: "From far away, a city at night is only windows. Behind every one, somebody is deciding something small." },
  { shot: 'city.windows', p: { push: true }, who: 'narr', text: "This one is Mara's. The next few years are going to happen in it, and you'll decide some of what they are." },
];
const INTERLUDE = [
  { shot: 'city.narrow', who: 'narr', text: "After that there was nothing left to forecast." },
  { shot: 'city.narrow', p: { one: true }, who: 'narr', text: "There was only the window." },
];

/* ---------- the model ---------- */
function freshState() { const s = {}; for (const v of VARS) s[v] = 0; return s; }
function applyFx(s, fx) { const o = { ...s }; for (const k in fx) o[k] += fx[k]; return o; }
function scoreEnding(id, s) { const e = ENDINGS[id]; let x = e.b; for (const k in e.w) x += e.w[k] * s[k]; return x; }
// progress 0..1 through the story. The forecast starts wide and narrows as the future gets closer.
function forecast(s, progress = 1) {
  const T = 2.6 - 1.7 * Math.min(1, Math.max(0, progress));
  const sc = ENDING_ORDER.map((id) => scoreEnding(id, s) / T);
  const m = Math.max(...sc), ex = sc.map((x) => Math.exp(x - m)), z = ex.reduce((a, b) => a + b, 0);
  const out = {}; ENDING_ORDER.forEach((id, i) => (out[id] = ex[i] / z)); return out;
}
function resolveEnding(s) {
  let best = null, bs = -Infinity;
  for (const id of ENDING_ORDER) { const x = scoreEnding(id, s); if (x > bs) { bs = x; best = id; } }
  return best;
}
// state after a list of choice ids, one per chapter
function stateFor(picks) {
  let s = freshState();
  picks.forEach((pid, i) => { const o = CHAPTERS[i].choice.options.find((x) => x.id === pid); if (o) s = applyFx(s, o.fx); });
  return s;
}
// which choices pushed hardest toward this ending
function reasons(picks, endId) {
  const e = ENDINGS[endId];
  return picks.map((pid, i) => {
    const o = CHAPTERS[i].choice.options.find((x) => x.id === pid);
    let d = 0; for (const k in o.fx) d += (e.w[k] || 0) * o.fx[k];
    return { ch: i, opt: o, d };
  }).filter((r) => r.d > 0.5).sort((a, b) => b.d - a.d).slice(0, 3);
}

// a stable id for a spoken line, shared by tools/lines.js and the player, so a clip is found by name
function lineId(b) {
  let h = 2166136261; const s = b.who + '|' + b.text;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const STORY = { lineId, VARS, VAR_NOTES, CHAPTERS, ENDINGS, ENDING_ORDER, PROLOGUE, INTERLUDE, freshState, applyFx, scoreEnding, forecast, resolveEnding, stateFor, reasons };
if (typeof module !== 'undefined') module.exports = STORY;
