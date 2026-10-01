/* Artistry "Learn music": instruments, genres, artists, a starter list of songs to learn, and the word
   reader that tells which instrument, genre and artist a lesson is about. Used by the app (crafts/index.html)
   and by the tests (node tests/music.test.js). Free and on the phone: no AI service. */
(function (root) {
  'use strict';

  const INSTRUMENTS = [
    { id: 'piano', label: 'Piano', kw: ['piano', 'keyboard', 'keys', 'synthesia', 'pianist'] },
    { id: 'guitar', label: 'Guitar', kw: ['guitar', 'acoustic guitar', 'electric guitar', 'fingerpicking', 'fingerstyle', 'strumming pattern', 'guitarist', 'power chords', 'capo'] },
    { id: 'drums', label: 'Drums', kw: ['drum', 'drums', 'drummer', 'drumming', 'drum beat', 'drum cover', 'snare', 'hi hat', 'cajon'] },
    { id: 'ukulele', label: 'Ukulele', kw: ['ukulele', 'uke', 'ukuleles'] },
    { id: 'banjo', label: 'Banjo', kw: ['banjo', 'clawhammer', 'scruggs style', 'banjo roll', 'banjo rolls'] },
    { id: 'trumpet', label: 'Trumpet', kw: ['trumpet', 'trumpets', 'cornet', 'flugelhorn', 'brass', 'embouchure', 'valve'] },
    { id: 'bass', label: 'Bass', kw: ['bass guitar', 'bass line', 'bassline', 'bass lesson', 'bass cover', 'bassist'] },
    { id: 'mandolin', label: 'Mandolin', kw: ['mandolin'] },
    { id: 'violin', label: 'Violin / fiddle', kw: ['violin', 'fiddle', 'fiddle tune'] },
    { id: 'harmonica', label: 'Harmonica', kw: ['harmonica', 'harp blues'] },
    { id: 'voice', label: 'Singing', kw: ['singing', 'vocal', 'vocals', 'sing better', 'voice lesson'] }
  ];
  const GENRES = [
    { id: 'alternative', label: 'Alternative', kw: ['alternative', 'alt rock', 'indie', 'grunge'] },
    { id: 'rock', label: 'Rock', kw: ['rock', 'hard rock', 'punk', 'metal'] },
    { id: 'classical', label: 'Classical', kw: ['classical', 'sonata', 'concerto', 'nocturne', 'etude', 'prelude', 'minuet', 'symphony', 'baroque', 'waltz'] },
    { id: 'pop', label: 'Pop', kw: ['pop', 'pop song', 'top 40'] },
    { id: 'rap', label: 'Rap & hip hop', kw: ['rap', 'hip hop', 'hiphop', 'trap beat', 'boom bap'] },
    { id: 'classicrock', label: 'Classic rock', kw: ['classic rock', '70s rock', '60s rock', '80s rock'] },
    { id: 'oldies', label: 'Oldies', kw: ['oldies', '50s', '60s', 'doo wop', 'rock and roll', 'rockabilly'] },
    { id: 'motown', label: 'Motown & soul', kw: ['motown', 'soul', 'r&b', 'funk'] },
    { id: 'country', label: 'Country', kw: ['country', 'honky tonk', 'nashville'] },
    { id: 'bluegrass', label: 'Bluegrass', kw: ['bluegrass', 'fiddle tune', 'old time', 'flatpicking', 'appalachian'] },
    { id: 'blues', label: 'Blues', kw: ['blues', '12 bar'] },
    { id: 'jazz', label: 'Jazz', kw: ['jazz', 'swing', 'bebop', 'big band'] },
    { id: 'folk', label: 'Folk', kw: ['folk', 'americana'] },
    { id: 'gospel', label: 'Gospel & worship', kw: ['gospel', 'worship', 'hymn', 'hymns'] },
    { id: 'latin', label: 'Latin', kw: ['latin', 'mariachi', 'salsa', 'bossa nova', 'cumbia'] },
    { id: 'movie', label: 'Movies & TV', kw: ['movie theme', 'soundtrack', 'disney', 'theme song'] },
    { id: 'holiday', label: 'Holiday', kw: ['christmas', 'holiday song', 'carol'] }
  ];
  const DEFAULT_INST = ['piano', 'guitar', 'drums', 'ukulele', 'banjo', 'trumpet'];
  const DEFAULT_GENRES = ['alternative', 'rock', 'classical', 'pop', 'rap', 'classicrock', 'oldies', 'motown', 'country', 'bluegrass'];

  // Well-known artists (and composers) and the genres they're filed under.
  const A = {};
  const add = (g, names) => { for (const n of names) A[n] = (A[n] || []).concat(g); };
  add(['motown'], ['the temptations', 'temptations', 'marvin gaye', 'stevie wonder', 'the supremes', 'supremes', 'diana ross', 'smokey robinson', 'the miracles', 'four tops', 'the four tops', 'jackson 5', 'the jackson 5', 'jackson five', 'martha and the vandellas', 'martha reeves', 'gladys knight', 'mary wells', 'the marvelettes', 'commodores', 'the commodores', 'tammi terrell', 'jr walker', 'the isley brothers', 'isley brothers', 'aretha franklin', 'otis redding', 'al green', 'sam cooke', 'bill withers', 'earth wind and fire', 'earth wind fire']);
  add(['oldies'], ['elvis presley', 'elvis', 'chuck berry', 'buddy holly', 'ritchie valens', 'the everly brothers', 'everly brothers', 'ben e king', 'the righteous brothers', 'righteous brothers', 'roy orbison', 'the beach boys', 'beach boys', 'the drifters', 'sam cooke', 'patsy cline', 'the ronettes', 'little richard', 'fats domino', 'jerry lee lewis', 'the platters', 'the shirelles', 'bill haley', 'carl perkins', 'bobby day', 'the penguins', 'the turtles', 'herb alpert', 'the surfaris', 'bobby darin', 'frankie valli', 'the four seasons', 'the monkees', 'simon and garfunkel', 'the mamas and the papas', 'the beatles', 'beatles', 'earth wind and fire', 'bill withers', 'the troggs', 'the kingsmen', 'chubby checker', 'neil diamond']);
  add(['classicrock'], ['the beatles', 'beatles', 'led zeppelin', 'the rolling stones', 'rolling stones', 'the eagles', 'fleetwood mac', 'lynyrd skynyrd', 'creedence clearwater revival', 'ccr', 'tom petty', 'bruce springsteen', 'ac dc', 'acdc', 'aerosmith', 'pink floyd', 'the who', 'jimi hendrix', 'eric clapton', 'bob dylan', 'neil young', 'van halen', 'bob seger', 'zz top', 'steve miller band', 'santana', 'deep purple', 'black sabbath', 'the doors', 'allman brothers', 'def leppard', 'the ides of march', 'van morrison', 'john lennon', 'elton john', 'billy joel', 'the kinks', 'the animals', 'the troggs', 'dire straits', 'foreigner', 'styx', 'kansas', 'cheap trick', 'the police', 'tom petty and the heartbreakers', 'janis joplin', 'joe cocker']);
  add(['rock'], ['foo fighters', 'green day', 'nirvana', 'pearl jam', 'red hot chili peppers', 'guns n roses', 'bon jovi', 'metallica', 'linkin park', 'the white stripes', 'white stripes', 'queens of the stone age', 'audioslave', 'soundgarden', 'stone temple pilots', 'alice in chains', 'matchbox twenty', 'creed', 'nickelback', '3 doors down', 'three doors down', 'shinedown', 'breaking benjamin', 'paramore', 'blink 182', 'fall out boy', 'my chemical romance', 'the killers', 'oasis', 'goo goo dolls', 'the cranberries', 'imagine dragons', 'greta van fleet', 'the black keys', 'kings of leon', 'sublime', 'incubus', 'daughtry', 'evanescence', 'avenged sevenfold', 'system of a down', 'rage against the machine', 'collective soul', 'third eye blind', 'weezer', 'the offspring', 'ac dc', 'acdc']);
  add(['alternative'], ['radiohead', 'weezer', 'nirvana', 'the killers', 'arctic monkeys', 'twenty one pilots', 'cage the elephant', 'pixies', 'r e m', 'rem', 'the cure', 'the smiths', 'oasis', 'blur', 'coldplay', 'the strokes', 'vampire weekend', 'mumford and sons', 'mumford sons', 'the lumineers', 'lumineers', 'hozier', 'florence and the machine', 'gorillaz', 'linkin park', 'no doubt', 'alanis morissette', 'third eye blind', 'goo goo dolls', 'counting crows', 'smashing pumpkins', 'the cranberries', 'incubus', 'death cab for cutie', 'modest mouse', 'glass animals', 'tame impala', 'foster the people', 'of monsters and men', 'vance joy', 'the neighbourhood', 'the white stripes', 'white stripes', 'red hot chili peppers', 'foo fighters', 'green day', 'the black keys', 'portugal the man', 'bon iver', 'mgmt', 'the 1975', 'paramore', 'phoebe bridgers', 'boygenius', 'cigarettes after sex', 'the lumineers', 'young the giant', 'alt j', 'beck', 'franz ferdinand', 'the shins']);
  add(['pop'], ['taylor swift', 'ed sheeran', 'adele', 'bruno mars', 'lady gaga', 'katy perry', 'dua lipa', 'harry styles', 'olivia rodrigo', 'sabrina carpenter', 'ariana grande', 'justin bieber', 'michael jackson', 'madonna', 'whitney houston', 'elton john', 'billy joel', 'shawn mendes', 'the weeknd', 'miley cyrus', 'lizzo', 'coldplay', 'maroon 5', 'onerepublic', 'one republic', 'sia', 'rihanna', 'beyonce', 'billie eilish', 'jason mraz', 'passenger', 'john legend', 'lewis capaldi', 'sam smith', 'israel kamakawiwoole', 'mark ronson', 'chappell roan', 'gracie abrams', 'benson boone', 'noah kahan', 'teddy swims', 'post malone', 'imagine dragons', 'james arthur', 'alicia keys', 'mariah carey', 'celine dion', 'cyndi lauper', 'abba', 'the carpenters', 'carpenters', 'phil collins', 'lionel richie', 'christina perri', 'pharrell williams', 'charlie puth', 'meghan trainor', 'selena gomez', 'demi lovato', 'kelly clarkson']);
  add(['rap'], ['eminem', 'kendrick lamar', 'drake', 'tupac', '2pac', 'the notorious b i g', 'notorious big', 'biggie', 'jay z', 'kanye west', 'kanye', 'j cole', 'nas', 'snoop dogg', 'dr dre', 'lil wayne', 'travis scott', 'post malone', 'doja cat', 'nicki minaj', 'cardi b', 'run dmc', 'beastie boys', 'outkast', 'missy elliott', 'coolio', 'mc hammer', 'vanilla ice', 'ice cube', 'wiz khalifa', 'macklemore', 'childish gambino', 'juice wrld', 'mac miller', '50 cent', 'the sugarhill gang', 'sugarhill gang', 'lil nas x', 'tyler the creator', 'a tribe called quest', 'wu tang clan', 'nelly', 'ludacris', 'megan thee stallion', 'lauryn hill', 'fugees', 'the fugees', 'salt n pepa', 'queen latifah', 'busta rhymes', 'lil baby', 'jack harlow']);
  add(['country'], ['johnny cash', 'dolly parton', 'willie nelson', 'garth brooks', 'george strait', 'luke combs', 'chris stapleton', 'morgan wallen', 'zach bryan', 'carrie underwood', 'shania twain', 'kenny rogers', 'hank williams', 'merle haggard', 'patsy cline', 'reba mcentire', 'tim mcgraw', 'kacey musgraves', 'luke bryan', 'blake shelton', 'alan jackson', 'brad paisley', 'keith urban', 'john denver', 'glen campbell', 'waylon jennings', 'tyler childers', 'kenny chesney', 'lainey wilson', 'jelly roll', 'old crow medicine show', 'randy travis', 'george jones', 'loretta lynn', 'tammy wynette', 'the chicks', 'dixie chicks', 'brooks and dunn', 'toby keith', 'eric church', 'miranda lambert', 'jason aldean', 'sturgill simpson', 'cody johnson', 'shaboozey', 'florida georgia line', 'rascal flatts', 'dan and shay', 'the band perry', 'charley pride', 'buck owens', 'john prine']);
  add(['bluegrass'], ['alison krauss', 'billy strings', 'bill monroe', 'earl scruggs', 'flatt and scruggs', 'flatt scruggs', 'ralph stanley', 'the stanley brothers', 'ricky skaggs', 'doc watson', 'nickel creek', 'punch brothers', 'sierra hull', 'molly tuttle', 'the steeldrivers', 'steeldrivers', 'old crow medicine show', 'trampled by turtles', 'the infamous stringdusters', 'del mccoury', 'tony rice', 'bela fleck', 'greensky bluegrass', 'the osborne brothers', 'osborne brothers', 'soggy bottom boys', 'jimmy martin', 'jim and jesse', 'chris thile', 'sam bush', 'the seldom scene', 'the country gentlemen', 'yonder mountain string band', 'the del mccoury band', 'rhiannon giddens', 'the carter family', 'carter family', 'eric weissberg', 'tyler childers']);
  add(['classical'], ['bach', 'j s bach', 'johann sebastian bach', 'mozart', 'beethoven', 'chopin', 'debussy', 'satie', 'erik satie', 'pachelbel', 'vivaldi', 'handel', 'tchaikovsky', 'schubert', 'liszt', 'rachmaninoff', 'brahms', 'haydn', 'clementi', 'grieg', 'schumann', 'mendelssohn', 'einaudi', 'ludovico einaudi', 'yiruma', 'scott joplin', 'joplin', 'dvorak', 'ravel', 'mussorgsky', 'strauss', 'saint saens', 'jeremiah clarke', 'purcell', 'albinoni', 'paganini', 'elgar', 'holst', 'gershwin', 'hans zimmer', 'john williams', 'philip glass', 'max richter', 'ola gjeilo']);
  const ARTISTS = A;
  const ARTIST_NAMES = Object.keys(A).sort((a, b) => b.length - a.length);
  const TITLE_CASE = s => s.replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/\bAc Dc\b/, 'AC/DC').replace(/\bJ S\b/, 'J.S.').replace(/\bR E M\b/, 'R.E.M.').replace(/\bDr Dre\b/, 'Dr. Dre').replace(/\bJay Z\b/, 'Jay-Z').replace(/\bRun Dmc\b/, 'Run-DMC');

  // Songs to learn: real songs that teachers often cover, with the instruments they suit best.
  // lv: easy | medium | hard (for a hobby player). fit: instruments it's especially good on.
  const S = (t, a, g, lv, fit) => ({ t, a, g, lv, fit });
  const GPU = ['guitar', 'piano', 'ukulele'];
  const SONGS = [
    // Motown & soul
    S('My Girl', 'The Temptations', ['motown'], 'easy', GPU.concat(['bass', 'drums'])),
    S('Ain\'t No Mountain High Enough', 'Marvin Gaye & Tammi Terrell', ['motown'], 'medium', ['piano', 'trumpet', 'drums', 'guitar']),
    S('I Heard It Through the Grapevine', 'Marvin Gaye', ['motown'], 'medium', ['piano', 'guitar', 'drums']),
    S('My Guy', 'Mary Wells', ['motown'], 'easy', ['piano', 'ukulele', 'guitar']),
    S('Signed, Sealed, Delivered I\'m Yours', 'Stevie Wonder', ['motown'], 'medium', ['trumpet', 'guitar', 'piano']),
    S('Superstition', 'Stevie Wonder', ['motown'], 'medium', ['piano', 'drums', 'trumpet', 'guitar']),
    S('Sir Duke', 'Stevie Wonder', ['motown'], 'medium', ['trumpet', 'piano']),
    S('Stop! In the Name of Love', 'The Supremes', ['motown'], 'easy', ['piano', 'ukulele', 'guitar']),
    S('Dancing in the Street', 'Martha and the Vandellas', ['motown'], 'easy', ['drums', 'trumpet', 'piano']),
    S('ABC', 'The Jackson 5', ['motown'], 'easy', ['guitar', 'piano', 'ukulele', 'drums']),
    S('I Want You Back', 'The Jackson 5', ['motown'], 'medium', ['guitar', 'piano', 'drums', 'bass']),
    S('Ain\'t Too Proud to Beg', 'The Temptations', ['motown'], 'easy', ['guitar', 'drums']),
    S('The Tracks of My Tears', 'Smokey Robinson & the Miracles', ['motown'], 'medium', ['guitar', 'piano']),
    S('Lean on Me', 'Bill Withers', ['motown', 'oldies'], 'easy', ['piano', 'guitar', 'ukulele']),
    // Oldies
    S('Stand By Me', 'Ben E. King', ['oldies'], 'easy', GPU.concat(['bass', 'drums'])),
    S('Can\'t Help Falling in Love', 'Elvis Presley', ['oldies'], 'easy', ['ukulele', 'piano', 'guitar', 'trumpet']),
    S('Hound Dog', 'Elvis Presley', ['oldies'], 'easy', ['guitar', 'drums', 'piano']),
    S('Johnny B. Goode', 'Chuck Berry', ['oldies'], 'medium', ['guitar', 'drums', 'piano']),
    S('La Bamba', 'Ritchie Valens', ['oldies'], 'easy', ['guitar', 'ukulele', 'trumpet']),
    S('Blue Suede Shoes', 'Carl Perkins', ['oldies'], 'easy', ['guitar', 'drums', 'piano']),
    S('Rock Around the Clock', 'Bill Haley & His Comets', ['oldies'], 'easy', ['drums', 'guitar', 'piano']),
    S('Earth Angel', 'The Penguins', ['oldies'], 'easy', ['piano', 'ukulele', 'guitar']),
    S('Unchained Melody', 'The Righteous Brothers', ['oldies'], 'medium', ['piano', 'guitar', 'trumpet']),
    S('Oh, Pretty Woman', 'Roy Orbison', ['oldies'], 'medium', ['guitar', 'drums']),
    S('Great Balls of Fire', 'Jerry Lee Lewis', ['oldies'], 'medium', ['piano']),
    S('Wipe Out', 'The Surfaris', ['oldies'], 'medium', ['drums', 'guitar']),
    S('Spanish Flea', 'Herb Alpert & the Tijuana Brass', ['oldies'], 'medium', ['trumpet']),
    S('September', 'Earth, Wind & Fire', ['oldies', 'motown'], 'medium', ['trumpet', 'guitar', 'drums', 'bass']),
    S('Happy Together', 'The Turtles', ['oldies'], 'easy', ['guitar', 'ukulele', 'piano']),
    S('(What a) Wonderful World', 'Sam Cooke', ['oldies'], 'easy', ['guitar', 'ukulele', 'piano']),
    // Classic rock
    S('Brown Eyed Girl', 'Van Morrison', ['classicrock'], 'easy', ['guitar', 'ukulele']),
    S('Bad Moon Rising', 'Creedence Clearwater Revival', ['classicrock'], 'easy', ['guitar', 'ukulele', 'banjo']),
    S('Have You Ever Seen the Rain', 'Creedence Clearwater Revival', ['classicrock'], 'easy', ['guitar', 'ukulele', 'piano']),
    S('Free Fallin\'', 'Tom Petty', ['classicrock'], 'easy', ['guitar', 'ukulele']),
    S('Let It Be', 'The Beatles', ['classicrock', 'oldies'], 'easy', ['piano', 'guitar', 'ukulele']),
    S('Hey Jude', 'The Beatles', ['classicrock', 'oldies'], 'medium', ['piano', 'guitar']),
    S('Come Together', 'The Beatles', ['classicrock'], 'medium', ['drums', 'bass', 'guitar']),
    S('Sweet Home Alabama', 'Lynyrd Skynyrd', ['classicrock'], 'medium', ['guitar', 'banjo', 'drums']),
    S('Smoke on the Water', 'Deep Purple', ['classicrock'], 'easy', ['guitar', 'drums']),
    S('Back in Black', 'AC/DC', ['classicrock', 'rock'], 'medium', ['guitar', 'drums']),
    S('We Will Rock You', 'Queen', ['classicrock'], 'easy', ['drums']),
    S('Another One Bites the Dust', 'Queen', ['classicrock'], 'easy', ['bass', 'drums']),
    S('Dreams', 'Fleetwood Mac', ['classicrock'], 'easy', ['drums', 'guitar', 'piano']),
    S('Hotel California', 'Eagles', ['classicrock'], 'medium', ['guitar']),
    S('Piano Man', 'Billy Joel', ['classicrock', 'pop'], 'medium', ['piano', 'harmonica']),
    S('Your Song', 'Elton John', ['classicrock', 'pop'], 'medium', ['piano']),
    S('Imagine', 'John Lennon', ['classicrock'], 'easy', ['piano', 'guitar']),
    S('Don\'t Stop Believin\'', 'Journey', ['classicrock'], 'medium', ['piano', 'guitar', 'drums']),
    S('25 or 6 to 4', 'Chicago', ['classicrock'], 'medium', ['trumpet', 'guitar']),
    S('Got to Get You into My Life', 'The Beatles', ['classicrock'], 'medium', ['trumpet', 'piano']),
    // Rock
    S('Seven Nation Army', 'The White Stripes', ['rock', 'alternative'], 'easy', ['guitar', 'drums', 'bass']),
    S('Smells Like Teen Spirit', 'Nirvana', ['rock', 'alternative'], 'easy', ['guitar', 'drums']),
    S('Basket Case', 'Green Day', ['rock', 'alternative'], 'medium', ['drums', 'guitar']),
    S('Good Riddance (Time of Your Life)', 'Green Day', ['rock', 'alternative'], 'easy', ['guitar', 'ukulele']),
    S('Wonderwall', 'Oasis', ['rock', 'alternative'], 'easy', ['guitar', 'ukulele']),
    S('Mr. Brightside', 'The Killers', ['rock', 'alternative'], 'medium', ['guitar', 'drums']),
    S('Everlong', 'Foo Fighters', ['rock', 'alternative'], 'medium', ['guitar', 'drums']),
    S('Sweet Child O\' Mine', 'Guns N\' Roses', ['rock'], 'hard', ['guitar']),
    S('Livin\' on a Prayer', 'Bon Jovi', ['rock'], 'medium', ['guitar', 'drums', 'piano']),
    S('Otherside', 'Red Hot Chili Peppers', ['rock', 'alternative'], 'medium', ['guitar', 'bass']),
    S('Iris', 'Goo Goo Dolls', ['rock', 'alternative'], 'medium', ['guitar', 'piano']),
    S('Boulevard of Broken Dreams', 'Green Day', ['rock', 'alternative'], 'easy', ['guitar', 'drums', 'piano']),
    // Alternative
    S('Creep', 'Radiohead', ['alternative'], 'easy', ['guitar', 'piano', 'ukulele']),
    S('Zombie', 'The Cranberries', ['alternative', 'rock'], 'easy', ['guitar', 'drums', 'piano']),
    S('Ho Hey', 'The Lumineers', ['alternative', 'folk'], 'easy', ['guitar', 'ukulele', 'banjo', 'drums']),
    S('Little Talks', 'Of Monsters and Men', ['alternative'], 'easy', ['trumpet', 'guitar', 'ukulele']),
    S('Riptide', 'Vance Joy', ['alternative', 'pop'], 'easy', ['ukulele', 'guitar']),
    S('Take Me to Church', 'Hozier', ['alternative'], 'medium', ['guitar', 'piano']),
    S('Stressed Out', 'Twenty One Pilots', ['alternative', 'pop'], 'easy', ['piano', 'ukulele', 'drums']),
    S('Say It Ain\'t So', 'Weezer', ['alternative'], 'medium', ['guitar', 'drums']),
    S('Do I Wanna Know?', 'Arctic Monkeys', ['alternative'], 'easy', ['guitar', 'drums', 'bass']),
    S('Losing My Religion', 'R.E.M.', ['alternative'], 'medium', ['guitar', 'mandolin']),
    S('Pumped Up Kicks', 'Foster the People', ['alternative'], 'easy', ['guitar', 'bass', 'drums']),
    S('Little Lion Man', 'Mumford & Sons', ['alternative', 'folk'], 'medium', ['banjo', 'guitar']),
    S('The Cave', 'Mumford & Sons', ['alternative', 'folk'], 'medium', ['banjo', 'guitar']),
    S('Ain\'t No Rest for the Wicked', 'Cage the Elephant', ['alternative'], 'medium', ['guitar', 'drums']),
    // Pop
    S('Perfect', 'Ed Sheeran', ['pop'], 'easy', ['guitar', 'piano', 'ukulele']),
    S('Someone Like You', 'Adele', ['pop'], 'medium', ['piano']),
    S('Count on Me', 'Bruno Mars', ['pop'], 'easy', ['ukulele', 'guitar']),
    S('Shallow', 'Lady Gaga & Bradley Cooper', ['pop'], 'easy', ['guitar', 'piano']),
    S('Shake It Off', 'Taylor Swift', ['pop'], 'easy', ['guitar', 'ukulele', 'drums']),
    S('drivers license', 'Olivia Rodrigo', ['pop'], 'easy', ['piano']),
    S('Let Her Go', 'Passenger', ['pop'], 'easy', ['guitar']),
    S('All of Me', 'John Legend', ['pop'], 'medium', ['piano']),
    S('I\'m Yours', 'Jason Mraz', ['pop'], 'easy', ['ukulele', 'guitar']),
    S('Hey, Soul Sister', 'Train', ['pop'], 'easy', ['ukulele', 'guitar']),
    S('Somewhere Over the Rainbow / What a Wonderful World', 'Israel Kamakawiwoʻole', ['pop'], 'easy', ['ukulele']),
    S('As It Was', 'Harry Styles', ['pop'], 'easy', ['guitar', 'piano', 'drums']),
    S('Uptown Funk', 'Mark Ronson ft. Bruno Mars', ['pop'], 'medium', ['trumpet', 'drums', 'guitar', 'bass']),
    S('Billie Jean', 'Michael Jackson', ['pop'], 'easy', ['drums', 'bass', 'piano']),
    S('Espresso', 'Sabrina Carpenter', ['pop'], 'medium', ['guitar', 'bass', 'drums']),
    // Rap & hip hop
    S('Lose Yourself', 'Eminem', ['rap'], 'easy', ['piano', 'guitar', 'drums']),
    S('Mockingbird', 'Eminem', ['rap'], 'easy', ['piano']),
    S('Still D.R.E.', 'Dr. Dre ft. Snoop Dogg', ['rap'], 'easy', ['piano', 'drums']),
    S('Gangsta\'s Paradise', 'Coolio ft. L.V.', ['rap'], 'easy', ['piano', 'drums']),
    S('California Love', '2Pac ft. Dr. Dre', ['rap'], 'medium', ['piano', 'drums']),
    S('HUMBLE.', 'Kendrick Lamar', ['rap'], 'easy', ['piano', 'drums']),
    S('Empire State of Mind', 'Jay-Z ft. Alicia Keys', ['rap'], 'easy', ['piano']),
    S('Hey Ya!', 'Outkast', ['rap', 'pop'], 'easy', ['guitar', 'ukulele']),
    S('Ms. Jackson', 'Outkast', ['rap'], 'easy', ['guitar', 'piano']),
    S('Juicy', 'The Notorious B.I.G.', ['rap'], 'easy', ['piano', 'bass', 'drums']),
    S('Rapper\'s Delight', 'The Sugarhill Gang', ['rap', 'oldies'], 'easy', ['bass', 'drums']),
    S('Sunflower', 'Post Malone & Swae Lee', ['rap', 'pop'], 'easy', ['guitar', 'ukulele']),
    S('Circles', 'Post Malone', ['pop', 'rap'], 'easy', ['guitar', 'drums']),
    // Country
    S('Jolene', 'Dolly Parton', ['country'], 'easy', ['guitar', 'banjo', 'ukulele']),
    S('Ring of Fire', 'Johnny Cash', ['country'], 'easy', ['trumpet', 'guitar', 'ukulele']),
    S('Folsom Prison Blues', 'Johnny Cash', ['country'], 'easy', ['guitar', 'drums']),
    S('I Walk the Line', 'Johnny Cash', ['country'], 'easy', ['guitar', 'bass']),
    S('Take Me Home, Country Roads', 'John Denver', ['country', 'folk'], 'easy', ['guitar', 'ukulele', 'banjo']),
    S('Friends in Low Places', 'Garth Brooks', ['country'], 'easy', ['guitar']),
    S('Tennessee Whiskey', 'Chris Stapleton', ['country'], 'medium', ['guitar', 'piano']),
    S('Fast Car', 'Luke Combs', ['country'], 'medium', ['guitar']),
    S('Wagon Wheel', 'Old Crow Medicine Show', ['country', 'bluegrass'], 'easy', ['guitar', 'banjo', 'ukulele']),
    S('Something in the Orange', 'Zach Bryan', ['country'], 'easy', ['guitar']),
    S('On the Road Again', 'Willie Nelson', ['country'], 'easy', ['guitar']),
    S('Crazy', 'Patsy Cline', ['country', 'oldies'], 'medium', ['piano', 'guitar']),
    S('Amarillo by Morning', 'George Strait', ['country'], 'easy', ['guitar']),
    S('Man! I Feel Like a Woman!', 'Shania Twain', ['country', 'pop'], 'easy', ['guitar', 'drums']),
    // Bluegrass
    S('Foggy Mountain Breakdown', 'Flatt & Scruggs', ['bluegrass'], 'hard', ['banjo', 'guitar']),
    S('Cripple Creek', 'Traditional', ['bluegrass'], 'easy', ['banjo', 'violin']),
    S('I Am a Man of Constant Sorrow', 'The Soggy Bottom Boys', ['bluegrass'], 'easy', ['guitar', 'banjo']),
    S('Rocky Top', 'The Osborne Brothers', ['bluegrass'], 'easy', ['banjo', 'guitar']),
    S('Blue Moon of Kentucky', 'Bill Monroe', ['bluegrass'], 'easy', ['guitar', 'banjo', 'mandolin']),
    S('Will the Circle Be Unbroken', 'Traditional', ['bluegrass', 'gospel'], 'easy', ['guitar', 'banjo', 'ukulele', 'piano']),
    S('Salty Dog Blues', 'Flatt & Scruggs', ['bluegrass'], 'easy', ['guitar', 'banjo']),
    S('Old Joe Clark', 'Traditional', ['bluegrass'], 'easy', ['banjo', 'violin', 'mandolin']),
    S('Shady Grove', 'Traditional', ['bluegrass'], 'easy', ['banjo', 'guitar']),
    S('Angeline the Baker', 'Traditional', ['bluegrass'], 'easy', ['banjo', 'violin', 'guitar']),
    S('Dueling Banjos', 'Eric Weissberg & Steve Mandell', ['bluegrass'], 'medium', ['banjo', 'guitar']),
    S('Whiskey Before Breakfast', 'Traditional', ['bluegrass'], 'medium', ['guitar', 'violin']),
    S('Nine Pound Hammer', 'Traditional', ['bluegrass'], 'easy', ['guitar', 'banjo']),
    S('Dust in a Baggie', 'Billy Strings', ['bluegrass'], 'medium', ['guitar']),
    // Classical
    S('Für Elise', 'Beethoven', ['classical'], 'medium', ['piano']),
    S('Moonlight Sonata (1st movement)', 'Beethoven', ['classical'], 'medium', ['piano']),
    S('Ode to Joy', 'Beethoven', ['classical'], 'easy', ['piano', 'trumpet', 'ukulele', 'guitar']),
    S('Canon in D', 'Pachelbel', ['classical'], 'easy', ['piano', 'guitar']),
    S('Clair de Lune', 'Debussy', ['classical'], 'hard', ['piano']),
    S('Gymnopédie No. 1', 'Erik Satie', ['classical'], 'easy', ['piano']),
    S('Prelude in C Major (BWV 846)', 'J.S. Bach', ['classical'], 'easy', ['piano']),
    S('Minuet in G Major', 'Petzold (attributed to Bach)', ['classical'], 'easy', ['piano']),
    S('Rondo alla Turca (Turkish March)', 'Mozart', ['classical'], 'hard', ['piano']),
    S('The Entertainer', 'Scott Joplin', ['classical'], 'medium', ['piano']),
    S('Prince of Denmark\'s March (Trumpet Voluntary)', 'Jeremiah Clarke', ['classical'], 'medium', ['trumpet', 'piano']),
    S('Trumpet Concerto in E-flat (3rd movement)', 'Haydn', ['classical'], 'hard', ['trumpet']),
    S('Romanza (Spanish Romance)', 'Anonymous', ['classical'], 'medium', ['guitar']),
    S('Nuvole Bianche', 'Ludovico Einaudi', ['classical'], 'medium', ['piano']),
    S('River Flows in You', 'Yiruma', ['classical', 'pop'], 'medium', ['piano'])
  ];

  // Free YouTube teachers. inst = what each mostly teaches. Ids looked up from their @handles on Sept 30, 2026
  // (api/music.js op=resolve). @AndyGuitar turned out to be a different person, so it's left out.
  const TEACHERS = [
  { id: 'UCBNkm8o5LiEVLxO8w0p2sfQ', name: 'JustinGuitar', inst: ['guitar', 'ukulele'] },
  { id: 'UCmnlTWVJysjWPFiZhQ5uudg', name: 'Marty Music', inst: ['guitar'] },
  { id: 'UCasFZzbM8JJ6dqSVEgL9VVg', name: 'GuitarZero2Hero', inst: ['guitar'] },
  { id: 'UC_Oa7Ph3v94om5OyxY1nPKg', name: 'Paul Davids', inst: ['guitar'] },
  { id: 'UCypK49m1uPqClYnWkF0UQFw', name: 'Lauren Bateman', inst: ['guitar'] },
  { id: 'UCIDxRRdowWusv8-IO0lpVfg', name: 'Banjo Ben Clark', inst: ['banjo', 'guitar'] },
  { id: 'UCa5mOPOZPa8VG7BxbT49buw', name: 'FreeBanjoLessons', inst: ['banjo'] },
  { id: 'UC_DmCvOP5Q_eBMRDvqqRXjg', name: 'Pianote', inst: ['piano'] },
  { id: 'UCZlOvB5LcAgJv3wwvWFOFLg', name: 'Bill Hilton', inst: ['piano'] },
  { id: 'UCRJP1zG5H2bbeBxf364ZsJg', name: 'PianoVideoLessons', inst: ['piano'] },
  { id: 'UCkSTviZrhnv6r-2tmxfP4ig', name: 'Lisa Witt', inst: ['piano'] },
  { id: 'UCzTR9iSH-TFC4-ocDS_ll4A', name: 'Sheet Music Boss', inst: ['piano'] },
  { id: 'UCBiJBaDaM3K6vPVggLhTyWA', name: 'Drumeo', inst: ['drums'] },
  { id: 'UCwT7TWaFxT-UZAPa9wdNChA', name: 'Stephen Taylor', inst: ['drums'] },
  { id: 'UCpgOBwN6S6dcbjRfaHScEtw', name: '180 DRUMS', inst: ['drums'] },
  { id: 'UCHF88ovEEPETzNtEUbgGBuw', name: 'Bernadette Teaches Music', inst: ['ukulele', 'guitar'] },
  { id: 'UC1HlihY-iNtOemAlYQq3GXQ', name: 'The Ukulele Teacher', inst: ['ukulele'] },
  { id: 'UCD2q6i-C0ZLJUK-VCp49TJA', name: 'Cynthia Lin', inst: ['ukulele'] },
  { id: 'UCDglnz22aXMzpug5HbD1bCA', name: 'Ukulele Underground', inst: ['ukulele'] },
  { id: 'UCb9PLHw5LvYRLY60sI_Npwg', name: 'Trumpet Heroes (Steve Haase)', inst: ['trumpet'] },
  { id: 'UC5YVld_zVuem9jd8qyTKWzQ', name: 'Trumpet Headquarters', inst: ['trumpet'] },
  { id: 'UC-yDiHGGxqUZut6cKPKrkqQ', name: 'TRUMPETSIZZLE', inst: ['trumpet'] },
  { id: 'UCxlX6UbpSffQsKNdtqDUMlQ', name: 'The Trumpet Prof', inst: ['trumpet'] },
  { id: 'UC98oadJhTaKuj36JPH1zArg', name: 'Louis Dowdeswell', inst: ['trumpet'] }
  ];

  function prep(text) {
    const lower = String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[’']/g, '');
    return ' ' + lower.replace(/[^a-z0-9]+/g, ' ') + ' ';
  }
  const ONE_WORD_OK = ['superstition', 'wonderwall', 'everlong', 'otherside', 'riptide', 'jolene', 'romanza'];
  const has = (T, k) => T.includes(' ' + k + ' ') || T.includes(' ' + k + 's ');
  const LESSON = ['how to play', 'tutorial', 'lesson', 'lessons', 'chords', 'tabs', 'tab', 'strumming', 'learn', 'play along', 'playalong', 'beginner', 'beginners', 'sheet music', 'cover', 'riff', 'scales', 'easy song', 'easy songs', 'practice', 'exercise', 'technique', 'music theory', 'notes', 'melody'];

  // What a lesson is about: instruments, genres, artist, level, and whether it looks like music at all.
  function detect(text) {
    const T = prep(text);
    const inst = INSTRUMENTS.filter(i => i.kw.some(k => has(T, k))).map(i => i.id);
    let artist = '';
    for (const n of ARTIST_NAMES) if (T.includes(' ' + n + ' ')) { artist = n; break; }
    const genres = [];
    if (artist) for (const g of ARTISTS[artist]) if (!genres.includes(g)) genres.push(g);
    for (const g of GENRES) if (g.kw.some(k => has(T, k)) && !genres.includes(g.id)) {
      if (g.id === 'rock' && genres.includes('classicrock')) continue;
      genres.push(g.id);
    }
    // a song from the starter list names its genre too
    // short one-word titles ("Creep", "Perfect") only count when the artist is named too, unless the word is the song
    // a medley ("Somewhere Over the Rainbow / What a Wonderful World") matches on either part
    // the longest matching title wins ("What a Wonderful World" over Sam Cooke's "Wonderful World"), and the named artist's song first
    let song = null, best = 0;
    for (const x of SONGS) {
      const byArtist = !!artist && prep(x.a).includes(' ' + artist + ' ');
      for (const part of x.t.split(' / ')) {
        const st = prep(part.replace(/\(.*?\)/g, '')).trim();
        if (!st || !T.includes(' ' + st + ' ')) continue;
        if (st.split(' ').length < 2 && !ONE_WORD_OK.includes(st) && !byArtist) continue;
        const sc = st.length + (byArtist ? 1000 : 0);
        if (sc > best) { best = sc; song = x; }
      }
    }
    if (song) for (const g of song.g) if (!genres.includes(g)) genres.push(g);
    const lessonHits = LESSON.filter(k => has(T, k)).length;
    const level = /\b(advanced|intermediate|hard|difficult|pro level)\b/.test(T) ? 'harder' : /\b(beginner|beginners|easy|simple|first|basic|basics|absolute)\b/.test(T) ? 'easy' : '';
    const score = inst.length * 2 + lessonHits + (artist || song ? 1 : 0);
    return { inst, genres, artist: artist ? TITLE_CASE(artist) : (song ? song.a : ''), song: song ? song.t : '', level, score, isMusic: inst.length > 0 && (lessonHits > 0 || !!artist || !!song) };
  }

  // Free places to learn a song, by instrument
  function songLinks(song, inst) {
    const name = (song.t + ' ' + (song.a && song.a !== 'Traditional' && song.a !== 'Anonymous' ? song.a : '')).trim();
    const i = INSTRUMENTS.find(x => x.id === inst);
    const words = (inst ? (i ? i.label.split(' ')[0].toLowerCase() : inst) : '') + ' tutorial' + (song.lv === 'easy' || !inst ? ' easy' : '');
    const e = encodeURIComponent;
    const links = [{ label: 'Lessons on YouTube', url: 'https://www.youtube.com/results?search_query=' + e(name + ' ' + words) }];
    if (!inst || ['guitar', 'ukulele', 'banjo', 'bass', 'mandolin'].includes(inst)) links.push({ label: 'Chords & tabs', url: 'https://www.ultimate-guitar.com/search.php?search_type=title&value=' + e(song.t) });
    if (inst === 'drums' || inst === 'bass') links.push({ label: 'Drum & bass tabs', url: 'https://www.songsterr.com/?pattern=' + e(name) });
    if (!inst || ['piano', 'trumpet', 'violin'].includes(inst)) links.push({ label: 'Sheet music', url: 'https://musescore.com/sheetmusic?text=' + e(name + (inst ? ' ' + inst : '')) });
    if (song.g && song.g.includes('classical')) links.push({ label: 'Free classical scores', url: 'https://imslp.org/index.php?search=' + e(song.t + ' ' + song.a) });
    return links;
  }
  const instLabel = id => (INSTRUMENTS.find(i => i.id === id) || { label: id }).label;
  const genreLabel = id => (GENRES.find(g => g.id === id) || { label: id }).label;

  const API = { INSTRUMENTS, GENRES, DEFAULT_INST, DEFAULT_GENRES, ARTISTS, SONGS, TEACHERS, detect, songLinks, instLabel, genreLabel, prep };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Music = API;
})(this);
