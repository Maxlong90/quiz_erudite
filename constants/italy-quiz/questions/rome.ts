/**
 * The Rome tour — twenty questions, five per act, authored by hand for the
 * frontend prototype. This file is the ONLY source of Italy Quiz content right
 * now: nothing here comes from the backend, and the backend is not touched. When
 * real content arrives it replaces this array through the adapter in
 * `constants/italy-quiz/tour-content.ts` and no screen changes.
 *
 * How the twenty are composed, and why:
 *
 * - Ten `choice`, six of them photo questions, four `scale`. Roughly every third
 *   question changes the shape of the screen, so a twenty-question tour never
 *   settles into one rhythm.
 * - Question 1 is a deliberate warm-up everyone gets right. A tour that opens
 *   with a miss reads as "this is not for me".
 * - Disciplines are MIXED inside each act, which is the whole reason the subject
 *   categories were dropped: act 4 asks about Vatican statehood, the Trevi
 *   fountain's takings, carbonara and the Rome derby in a row.
 * - Two callback pairs run across the acts: the Pantheon (2 → 15, its bronze was
 *   stripped for Bernini's baldachin) and Domitian's stadium (5 → 16, its outline
 *   survives as Piazza Navona). They are what fuses "geography of the Roman
 *   empire" with "modern geography" instead of filing them as two subcategories.
 *
 * Images live in `assets/italy-quiz/questions/` with their licences recorded in
 * CREDITS.md there.
 */
import type { ItalyQuestion } from '../question';

export const ROME_QUESTIONS: ItalyQuestion[] = [
  // ─── 🏛 Античность ────────────────────────────────────────────────────────
  {
    id: 1,
    act: 'antiquity',
    kind: 'choice',
    question: {
      ru: 'Какое сооружение Древнего Рима до сих пор стоит в центре города?',
      en: 'Which building of ancient Rome still stands in the city centre today?',
    },
    options: [
      { ru: 'Колизей', en: 'The Colosseum' },
      { ru: 'Парфенон', en: 'The Parthenon' },
      { ru: 'Пизанская башня', en: 'The Leaning Tower' },
      { ru: 'Собор Святого Марка', en: "St Mark's Basilica" },
    ],
    correct: 0,
    explanation: {
      ru: 'Колизей открыли в 80 году, он вмещал около 50 000 зрителей. Парфенон стоит в Афинах, падающая башня — в Пизе, собор Святого Марка — в Венеции.',
      en: 'The Colosseum opened in AD 80 and held some 50,000 spectators. The Parthenon is in Athens, the leaning tower is in Pisa, St Mark’s is in Venice.',
    },
  },
  {
    id: 2,
    act: 'antiquity',
    kind: 'choice',
    image: require('../../../assets/italy-quiz/questions/pantheon.jpg'),
    question: {
      ru: 'Что это за здание? Его бетонный купол с отверстием в центре почти две тысячи лет остаётся самым большим неармированным куполом в мире.',
      en: 'What is this building? Its concrete dome, open at the centre, has been the largest unreinforced dome in the world for almost two thousand years.',
    },
    options: [
      { ru: 'Пантеон', en: 'The Pantheon' },
      { ru: 'Колизей', en: 'The Colosseum' },
      { ru: 'Собор Святого Петра', en: "St Peter's Basilica" },
      { ru: 'Базилика Максенция', en: 'The Basilica of Maxentius' },
    ],
    correct: 0,
    explanation: {
      ru: 'Пантеон построил император Адриан около 126 года. Отверстие в куполе — окулус, девять метров в диаметре и единственный источник света внутри. Запомните это здание: оно ещё вернётся.',
      en: 'The Pantheon was built by Hadrian around AD 126. The hole in the dome is the oculus — nine metres across and the only source of light inside. Remember this building: it will come back.',
    },
  },
  {
    id: 3,
    act: 'antiquity',
    kind: 'choice',
    question: {
      ru: 'На какой реке стоит Рим?',
      en: 'Which river does Rome stand on?',
    },
    options: [
      { ru: 'Тибр', en: 'The Tiber' },
      { ru: 'По', en: 'The Po' },
      { ru: 'Арно', en: 'The Arno' },
      { ru: 'Адидже', en: 'The Adige' },
    ],
    correct: 0,
    explanation: {
      ru: 'Тибр. По — самая длинная река Италии и течёт на севере, на Арно стоит Флоренция, на Адидже — Верона.',
      en: 'The Tiber. The Po is Italy’s longest river and runs across the north, Florence sits on the Arno and Verona on the Adige.',
    },
  },
  {
    id: 4,
    act: 'antiquity',
    kind: 'scale',
    question: {
      ru: 'По легенде Рим основал Ромул. В каком году?',
      en: 'Legend says Romulus founded Rome. In which year?',
    },
    min: -1200,
    max: -100,
    answer: -753,
    tolerance: 80,
    display: 'year-bc',
    explanation: {
      ru: '753 год до н.э. — дата по расчётам Варрона, от неё римляне вели своё летоисчисление. Археология, впрочем, говорит, что поселения на Палатинском холме существовали и на несколько веков раньше.',
      en: '753 BC, the date calculated by Varro, from which Romans counted their years. Archaeology says settlements on the Palatine were there centuries earlier.',
    },
  },
  {
    id: 5,
    act: 'antiquity',
    kind: 'choice',
    image: require('../../../assets/italy-quiz/questions/domitian-stadium.jpg'),
    question: {
      ru: 'Под современным Римом сохранились руины стадиона императора Домициана на тридцать тысяч зрителей. Что там проходило?',
      en: 'Beneath modern Rome lie the ruins of Emperor Domitian’s stadium, which held thirty thousand spectators. What took place there?',
    },
    options: [
      { ru: 'Греческие атлетические состязания', en: 'Greek athletic contests' },
      { ru: 'Гладиаторские бои', en: 'Gladiator fights' },
      { ru: 'Гонки колесниц', en: 'Chariot races' },
      { ru: 'Морские сражения', en: 'Mock naval battles' },
    ],
    correct: 0,
    explanation: {
      ru: 'Домициан построил стадион в 86 году для состязаний в греческом духе: бег, борьба, метание диска. Гладиаторы дрались в Колизее, колесницы гоняли в Большом цирке. Стадион был вытянутым — 275 метров в длину. Запомните эту форму.',
      en: 'Domitian built it in AD 86 for contests in the Greek manner — running, wrestling, the discus. Gladiators fought in the Colosseum, chariots raced in the Circus Maximus. The stadium was long and narrow, 275 metres. Remember that shape.',
    },
  },

  // ─── ⚔️ Средние века ──────────────────────────────────────────────────────
  {
    id: 6,
    act: 'middle-ages',
    kind: 'choice',
    question: {
      ru: 'Империя пала, город обезлюдел. Кто фактически стал в Риме главной властью на следующую тысячу лет?',
      en: 'The empire fell and the city emptied. Who effectively became Rome’s ruling power for the next thousand years?',
    },
    options: [
      { ru: 'Папа Римский', en: 'The Pope' },
      { ru: 'Венецианский дож', en: 'The Doge of Venice' },
      { ru: 'Король лангобардов', en: 'The Lombard king' },
      { ru: 'Византийский наместник', en: 'The Byzantine governor' },
    ],
    correct: 0,
    explanation: {
      ru: 'Папство осталось единственным работающим институтом в разваленном городе: оно кормило население, чинило акведуки и вело переговоры с варварами. Светская власть пап над Римом продержалась до 1870 года.',
      en: 'The papacy was the only institution still working in a broken city: it fed the population, repaired the aqueducts and negotiated with the barbarians. Papal rule over Rome lasted until 1870.',
    },
  },
  {
    id: 7,
    act: 'middle-ages',
    kind: 'scale',
    question: {
      ru: 'На пике империи в Риме жил примерно миллион человек. До скольких упало население в худшие годы Средневековья?',
      en: 'At the empire’s peak about a million people lived in Rome. How low did the population fall in the worst medieval years?',
    },
    min: 5000,
    max: 300000,
    answer: 25000,
    tolerance: 15000,
    display: 'people',
    explanation: {
      ru: 'Около 25 000 — меньше, чем в нынешнем райцентре. Люди ютились в излучине Тибра, а древний Форум так зарос, что его называли Кампо Ваччино — «коровье поле».',
      en: 'Around 25,000 — fewer than in a small town today. People huddled in the bend of the Tiber, and the ancient Forum grew so wild it was called Campo Vaccino, the "cow field".',
    },
  },
  {
    id: 8,
    act: 'middle-ages',
    kind: 'choice',
    question: {
      ru: 'Откуда веками брали камень и мрамор на новые римские постройки?',
      en: 'Where did Rome quarry the stone and marble for its new buildings, century after century?',
    },
    options: [
      { ru: 'Из Колизея', en: 'From the Colosseum' },
      { ru: 'Привозили из Каррары', en: 'Shipped in from Carrara' },
      { ru: 'Из каменоломен Тиволи', en: 'From the quarries at Tivoli' },
      { ru: 'Из стен Аврелиана', en: 'From the Aurelian walls' },
    ],
    correct: 0,
    explanation: {
      ru: 'Колизей столетиями служил городской каменоломней: из его травертина построили десятки дворцов и часть Собора Святого Петра. Люди разрушили амфитеатр сильнее, чем все землетрясения вместе взятые.',
      en: 'The Colosseum served as the city quarry for centuries: its travertine went into dozens of palaces and part of St Peter’s. People did it more damage than every earthquake combined.',
    },
  },
  {
    id: 9,
    act: 'middle-ages',
    kind: 'choice',
    image: require('../../../assets/italy-quiz/questions/castel-sant-angelo.jpg'),
    question: {
      ru: 'Это Замок Святого Ангела — папская крепость с тайным ходом прямо из Ватикана. А чем он был построен изначально?',
      en: 'This is Castel Sant’Angelo, a papal fortress with a secret passage running straight from the Vatican. But what was it originally built as?',
    },
    options: [
      { ru: 'Гробницей императора Адриана', en: 'The tomb of Emperor Hadrian' },
      { ru: 'Триумфальной аркой', en: 'A triumphal arch' },
      { ru: 'Маяком на Тибре', en: 'A lighthouse on the Tiber' },
      { ru: 'Храмом Марса', en: 'A temple of Mars' },
    ],
    correct: 0,
    explanation: {
      ru: 'Адриан построил его около 139 года как мавзолей для себя и своих преемников. В крепость мавзолей превратили уже в Средние века, а имя дал архангел Михаил, якобы явившийся папе Григорию над его крышей.',
      en: 'Hadrian built it around AD 139 as a mausoleum for himself and his successors. It became a fortress in the Middle Ages, and took its name from the archangel Michael, said to have appeared above it to Pope Gregory.',
    },
  },
  {
    id: 10,
    act: 'middle-ages',
    kind: 'choice',
    question: {
      ru: 'Почти семьдесят лет подряд папы вообще не жили в Риме. Где была их резиденция?',
      en: 'For almost seventy years the popes did not live in Rome at all. Where was their seat?',
    },
    options: [
      { ru: 'В Авиньоне', en: 'In Avignon' },
      { ru: 'В Равенне', en: 'In Ravenna' },
      { ru: 'В Константинополе', en: 'In Constantinople' },
      { ru: 'В Милане', en: 'In Milan' },
    ],
    correct: 0,
    explanation: {
      ru: 'Авиньонское пленение пап, 1309–1377 годы. Оставшийся без папского двора Рим окончательно захирел — именно к этому времени относятся описания города как поля руин.',
      en: 'The Avignon papacy, 1309–1377. Left without the papal court, Rome sank to its lowest — this is when travellers describe the city as a field of ruins.',
    },
  },

  // ─── 🎨 Возрождение ───────────────────────────────────────────────────────
  {
    id: 11,
    act: 'renaissance',
    kind: 'choice',
    question: {
      ru: 'Микеланджело считал роспись Сикстинской капеллы навязанной работой. А что он считал своим настоящим делом?',
      en: 'Michelangelo thought painting the Sistine Chapel was work forced upon him. What did he consider his real craft?',
    },
    options: [
      { ru: 'Скульптуру', en: 'Sculpture' },
      { ru: 'Архитектуру', en: 'Architecture' },
      { ru: 'Поэзию', en: 'Poetry' },
      { ru: 'Фрески', en: 'Fresco painting' },
    ],
    correct: 0,
    explanation: {
      ru: 'Он называл себя скульптором и так подписывал письма даже в разгар работы над капеллой. Потолок он расписывал четыре года, стоя на лесах с задранной головой, и жаловался на это в стихах.',
      en: 'He called himself a sculptor and signed his letters that way even while working on the chapel. He painted the ceiling for four years with his head thrown back on the scaffolding, and complained about it in verse.',
    },
  },
  {
    id: 12,
    act: 'renaissance',
    kind: 'scale',
    question: {
      ru: 'Сколько лет строили Собор Святого Петра?',
      en: 'How many years did it take to build St Peter’s Basilica?',
    },
    min: 10,
    max: 250,
    answer: 120,
    tolerance: 25,
    display: 'years',
    explanation: {
      ru: '120 лет — с 1506 по 1626 год. За это время сменилось больше двадцати пап и почти столько же главных архитекторов: Браманте, Рафаэль, Микеланджело, Бернини.',
      en: '120 years, from 1506 to 1626. More than twenty popes came and went in that time, and almost as many chief architects: Bramante, Raphael, Michelangelo, Bernini.',
    },
  },
  {
    id: 13,
    act: 'renaissance',
    kind: 'choice',
    image: require('../../../assets/italy-quiz/questions/creation-of-adam.jpg'),
    question: {
      ru: 'Кто написал эту фреску?',
      en: 'Who painted this fresco?',
    },
    options: [
      { ru: 'Микеланджело', en: 'Michelangelo' },
      { ru: 'Рафаэль', en: 'Raphael' },
      { ru: 'Леонардо да Винчи', en: 'Leonardo da Vinci' },
      { ru: 'Караваджо', en: 'Caravaggio' },
    ],
    correct: 0,
    explanation: {
      ru: '«Сотворение Адама», Сикстинская капелла, около 1511 года. Тот самый потолок, который Микеланджело считал навязанной работой.',
      en: '"The Creation of Adam", Sistine Chapel, around 1511 — the very ceiling Michelangelo resented being made to paint.',
    },
  },
  {
    id: 14,
    act: 'renaissance',
    kind: 'choice',
    question: {
      ru: 'Фонтан Треви, площадь Навона, колоннада Святого Петра. В каком стиле сложился облик современного центра Рима?',
      en: 'The Trevi fountain, Piazza Navona, the colonnade of St Peter’s. What style shaped the look of central Rome as we see it?',
    },
    options: [
      { ru: 'Барокко', en: 'Baroque' },
      { ru: 'Готика', en: 'Gothic' },
      { ru: 'Классицизм', en: 'Neoclassicism' },
      { ru: 'Романский', en: 'Romanesque' },
    ],
    correct: 0,
    explanation: {
      ru: 'Барокко XVII–XVIII веков. Готики в Риме почти нет: пока северная Европа строила стрельчатые соборы, город лежал в руинах и строить было некому и не на что.',
      en: 'The Baroque of the 17th and 18th centuries. Rome has almost no Gothic: while northern Europe raised pointed cathedrals, the city lay in ruins with nobody to build and nothing to build with.',
    },
  },
  {
    id: 15,
    act: 'renaissance',
    kind: 'choice',
    callback: 2,
    question: {
      ru: 'На балдахин над алтарём Собора Святого Петра Бернини потребовалось шестьдесят тонн бронзы. Откуда её взяли?',
      en: 'Bernini needed sixty tonnes of bronze for the canopy over the altar of St Peter’s. Where did it come from?',
    },
    options: [
      { ru: 'Сняли с портика Пантеона', en: 'Stripped from the portico of the Pantheon' },
      { ru: 'Переплавили церковные колокола', en: 'Melted down from church bells' },
      { ru: 'Привезли из Венеции', en: 'Shipped in from Venice' },
      { ru: 'Сняли с крыши Колизея', en: 'Taken from the roof of the Colosseum' },
    ],
    correct: 0,
    explanation: {
      ru: 'Папа Урбан VIII из рода Барберини приказал содрать бронзу с портика Пантеона — того самого здания из начала тура. Римляне ответили поговоркой: «Что не сделали варвары, сделали Барберини».',
      en: 'Pope Urban VIII, of the Barberini family, had the bronze stripped from the Pantheon’s portico — the same building from the start of the tour. Romans answered with a saying: "What the barbarians did not do, the Barberini did."',
    },
  },

  // ─── 📸 Сегодня ───────────────────────────────────────────────────────────
  {
    id: 16,
    act: 'today',
    kind: 'choice',
    callback: 5,
    image: require('../../../assets/italy-quiz/questions/piazza-navona.jpg'),
    question: {
      ru: 'Стадион Домициана давно исчез — но его контур сохранился до наших дней. Во что он превратился?',
      en: 'Domitian’s stadium vanished long ago — yet its outline survives to this day. What did it turn into?',
    },
    options: [
      { ru: 'В площадь Навона', en: 'Piazza Navona' },
      { ru: 'В парк виллы Боргезе', en: 'The Villa Borghese park' },
      { ru: 'В вокзал Термини', en: 'Termini station' },
      { ru: 'В стадион Олимпико', en: 'The Stadio Olimpico' },
    ],
    correct: 0,
    explanation: {
      ru: 'Дома выросли прямо на трибунах, а беговое поле осталось пустым и стало площадью. Поэтому Навона такая вытянутая — 275 метров, ровно по стадиону. Античная планировка дожила до наших дней, хотя её никто не сохранял специально.',
      en: 'Houses grew straight onto the terraces while the running field stayed empty and became the square. That is why Navona is so long and narrow — 275 metres, exactly the stadium. An ancient plan survived to today although nobody set out to preserve it.',
    },
  },
  {
    id: 17,
    act: 'today',
    kind: 'choice',
    question: {
      ru: 'Сколько независимых государств помещается внутри города Рима?',
      en: 'How many independent states fit inside the city of Rome?',
    },
    options: [
      { ru: 'Одно', en: 'One' },
      { ru: 'Ни одного', en: 'None' },
      { ru: 'Два', en: 'Two' },
      { ru: 'Три', en: 'Three' },
    ],
    correct: 0,
    explanation: {
      ru: 'Ватикан — самое маленькое государство мира, 0,44 км² и около 800 жителей. Есть и тонкость: Мальтийский орден владеет в Риме экстерриториальными зданиями и выпускает свои паспорта, но государством не считается.',
      en: 'Vatican City, the smallest state in the world at 0.44 km² with around 800 residents. There is a subtlety: the Order of Malta holds extraterritorial buildings in Rome and issues its own passports, but is not counted as a state.',
    },
  },
  {
    id: 18,
    act: 'today',
    kind: 'scale',
    question: {
      ru: 'Сколько евро туристы бросают в фонтан Треви за год?',
      en: 'How many euros do tourists throw into the Trevi fountain in a year?',
    },
    min: 50000,
    max: 5000000,
    answer: 1400000,
    tolerance: 500000,
    display: 'euro',
    explanation: {
      ru: 'Около 1,4 миллиона евро. Монеты вылавливают каждую ночь и передают католической благотворительной организации «Каритас». Попытка забрать их себе — уголовное преступление.',
      en: 'Around 1.4 million euros. The coins are fished out nightly and handed to the Catholic charity Caritas. Taking them for yourself is a criminal offence.',
    },
  },
  {
    id: 19,
    act: 'today',
    kind: 'choice',
    image: require('../../../assets/italy-quiz/questions/carbonara.jpg'),
    question: {
      ru: 'Что это за блюдо, ставшее визитной карточкой римской кухни?',
      en: 'What is this dish, the calling card of Roman cooking?',
    },
    options: [
      { ru: 'Карбонара', en: 'Carbonara' },
      { ru: 'Болоньезе', en: 'Bolognese' },
      { ru: 'Песто', en: 'Pesto' },
      { ru: 'Аматричана', en: 'Amatriciana' },
    ],
    correct: 0,
    explanation: {
      ru: 'Карбонара: гуанчале, яичный желток, пекорино и чёрный перец. Никаких сливок. При этом блюдо совсем не древнее — первые рецепты появились только после Второй мировой войны.',
      en: 'Carbonara: guanciale, egg yolk, pecorino and black pepper. No cream. And it is not an old dish at all — the first recipes appear only after the Second World War.',
    },
  },
  {
    id: 20,
    act: 'today',
    kind: 'choice',
    question: {
      ru: 'Два римских клуба играют дерби на одном и том же стадионе. Какие?',
      en: 'Two Roman clubs play their derby in the very same stadium. Which two?',
    },
    options: [
      { ru: '«Рома» и «Лацио»', en: 'Roma and Lazio' },
      { ru: '«Рома» и «Наполи»', en: 'Roma and Napoli' },
      { ru: '«Лацио» и «Фиорентина»', en: 'Lazio and Fiorentina' },
      { ru: '«Рома» и «Ювентус»', en: 'Roma and Juventus' },
    ],
    correct: 0,
    explanation: {
      ru: 'Derby della Capitale на Олимпийском стадионе — одно из самых горячих противостояний Европы. «Наполи» играет в Неаполе, «Фиорентина» во Флоренции, «Ювентус» в Турине.',
      en: 'The Derby della Capitale at the Stadio Olimpico is one of the fiercest in Europe. Napoli play in Naples, Fiorentina in Florence, Juventus in Turin.',
    },
  },
];
