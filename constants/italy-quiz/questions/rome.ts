/**
 * The Rome tour — twenty questions, five per act, authored by hand for the
 * frontend prototype. This file is the ONLY source of Italy Quiz content right
 * now: nothing here comes from the backend, and the backend is not touched. When
 * real content arrives it replaces this array through the adapter in
 * `constants/italy-quiz/tour-content.ts` and no screen changes.
 *
 * How the twenty are composed, and why:
 *
 * - Twenty multiple-choice questions: six carry a photo and four are `estimate`
 *   questions answered from ranges rather than recall. Roughly every third
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
    warmup: true,
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
    estimate: true,
    axis: 'time',
    question: {
      ru: 'По легенде Рим основал Ромул. В каком году?',
      en: 'Legend says Romulus founded Rome. In which year?',
    },
    options: [
      { ru: 'Раньше 1000 года до н.э.', en: 'Before 1000 BC' },
      { ru: '1000–800 годы до н.э.', en: '1000–800 BC' },
      { ru: '800–600 годы до н.э.', en: '800–600 BC' },
      { ru: 'Позже 600 года до н.э.', en: 'After 600 BC' },
    ],
    correct: 2,
    explanation: {
      ru: '753 год до н.э. — дата по расчётам Варрона, от неё римляне вели своё летоисчисление. Археология, впрочем, говорит, что поселения на Палатинском холме существовали и на несколько веков раньше.',
      en: '753 BC, the date calculated by Varro, from which Romans counted their years. Archaeology says settlements on the Palatine were there centuries earlier.',
    },
  },
  {
    id: 5,
    act: 'antiquity',
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
    estimate: true,
    axis: 'amount',
    question: {
      ru: 'На пике империи в Риме жил примерно миллион человек. До скольких упало население в худшие годы Средневековья?',
      en: 'At the empire’s peak about a million people lived in Rome. How low did the population fall in the worst medieval years?',
    },
    options: [
      { ru: 'Около 5 тысяч', en: 'About 5 thousand' },
      { ru: 'Около 25 тысяч', en: 'About 25 thousand' },
      { ru: 'Около 100 тысяч', en: 'About 100 thousand' },
      { ru: 'Около 300 тысяч', en: 'About 300 thousand' },
    ],
    correct: 1,
    explanation: {
      ru: 'Около 25 000 — меньше, чем в нынешнем райцентре. Люди ютились в излучине Тибра, а древний Форум так зарос, что его называли Кампо Ваччино — «коровье поле».',
      en: 'Around 25,000 — fewer than in a small town today. People huddled in the bend of the Tiber, and the ancient Forum grew so wild it was called Campo Vaccino, the "cow field".',
    },
  },
  {
    id: 8,
    act: 'middle-ages',
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
    estimate: true,
    axis: 'amount',
    question: {
      ru: 'Сколько лет строили Собор Святого Петра?',
      en: 'How many years did it take to build St Peter’s Basilica?',
    },
    options: [
      { ru: 'Около 20 лет', en: 'About 20 years' },
      { ru: 'Около 50 лет', en: 'About 50 years' },
      { ru: 'Около 120 лет', en: 'About 120 years' },
      { ru: 'Около 250 лет', en: 'About 250 years' },
    ],
    correct: 2,
    explanation: {
      ru: '120 лет — с 1506 по 1626 год. За это время сменилось больше двадцати пап и почти столько же главных архитекторов: Браманте, Рафаэль, Микеланджело, Бернини.',
      en: '120 years, from 1506 to 1626. More than twenty popes came and went in that time, and almost as many chief architects: Bramante, Raphael, Michelangelo, Bernini.',
    },
  },
  {
    id: 13,
    act: 'renaissance',
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
    estimate: true,
    axis: 'amount',
    question: {
      ru: 'Сколько евро туристы бросают в фонтан Треви за год?',
      en: 'How many euros do tourists throw into the Trevi fountain in a year?',
    },
    options: [
      { ru: 'Около 100 тысяч €', en: 'About 100 thousand €' },
      { ru: 'Около 500 тысяч €', en: 'About 500 thousand €' },
      { ru: 'Около 1,5 миллиона €', en: 'About 1.5 million €' },
      { ru: 'Около 4 миллионов €', en: 'About 4 million €' },
    ],
    correct: 2,
    explanation: {
      ru: 'Около 1,4 миллиона евро. Монеты вылавливают каждую ночь и передают католической благотворительной организации «Каритас». Попытка забрать их себе — уголовное преступление.',
      en: 'Around 1.4 million euros. The coins are fished out nightly and handed to the Catholic charity Caritas. Taking them for yourself is a criminal offence.',
    },
  },
  {
    id: 19,
    act: 'today',
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
  // ─── Запас: вопросы сверх тура, ради разных прохождений ───────────────────
  {
    id: 21,
    act: 'antiquity',
    question: {
      ru: 'Что римляне строили, чтобы вода шла в город с гор за десятки километров?',
      en: 'What did the Romans build to carry water into the city from mountains dozens of kilometres away?',
    },
    options: [
      { ru: 'Акведуки', en: 'Aqueducts' },
      { ru: 'Каналы', en: 'Canals' },
      { ru: 'Колодцы', en: 'Wells' },
      { ru: 'Водяные мельницы', en: 'Water mills' },
    ],
    correct: 0,
    explanation: {
      ru: 'Одиннадцать акведуков давали Риму больше воды на человека, чем во многих городах XX века. Часть из них работает до сих пор — фонтан Треви питается водой Аква Вирго, проложенной в 19 году до н.э.',
      en: 'Eleven aqueducts gave Rome more water per person than many 20th-century cities had. Some still work: the Trevi fountain runs on the Aqua Virgo, laid in 19 BC.',
    },
  },
  {
    id: 22,
    act: 'antiquity',
    question: {
      ru: 'Аппиева дорога — первая и главная римская магистраль. Куда она вела?',
      en: 'The Appian Way was Rome’s first and greatest road. Where did it lead?',
    },
    options: [
      { ru: 'На юг, к портам Адриатики', en: 'South, to the Adriatic ports' },
      { ru: 'На север, в Галлию', en: 'North, into Gaul' },
      { ru: 'На восток, к Византию', en: 'East, towards Byzantium' },
      { ru: 'На запад, к Испании', en: 'West, towards Spain' },
    ],
    correct: 0,
    explanation: {
      ru: 'Аппиева дорога шла на юго-восток, к Бриндизи — оттуда корабли уходили в Грецию и на Восток. Её называли «царицей дорог», и по ней же распяли шесть тысяч сторонников Спартака.',
      en: 'The Appian Way ran south-east to Brindisi, where ships left for Greece and the East. It was called the queen of roads — and six thousand of Spartacus’s followers were crucified along it.',
    },
  },
  {
    id: 23,
    act: 'antiquity',
    estimate: true,
    axis: 'amount',
    question: {
      ru: 'Колизей вмещал 50 тысяч зрителей. А сколько вмещал Большой цирк, где гоняли колесницы?',
      en: 'The Colosseum held fifty thousand. How many did the Circus Maximus, where the chariots raced, hold?',
    },
    options: [
      { ru: 'Около 15 тысяч', en: 'About 15 thousand' },
      { ru: 'Около 50 тысяч', en: 'About 50 thousand' },
      { ru: 'Около 150 тысяч', en: 'About 150 thousand' },
      { ru: 'Около 400 тысяч', en: 'About 400 thousand' },
    ],
    correct: 2,
    explanation: {
      ru: 'Около 150 тысяч — втрое больше Колизея и больше любого современного стадиона мира. Гонки колесниц, а не гладиаторы, были главным зрелищем Рима.',
      en: 'Around 150,000 — three times the Colosseum and more than any stadium in the world today. Chariot racing, not gladiators, was Rome’s real mass spectacle.',
    },
  },
  {
    id: 24,
    act: 'middle-ages',
    question: {
      ru: 'Что римские бароны сделали с античными руинами в Средневековье?',
      en: 'What did Rome’s barons do with the ancient ruins in the Middle Ages?',
    },
    options: [
      { ru: 'Превратили их в крепости', en: 'Turned them into fortresses' },
      { ru: 'Обнесли оградой и охраняли', en: 'Fenced them off and guarded them' },
      { ru: 'Засыпали землёй', en: 'Buried them under earth' },
      { ru: 'Продали венецианцам', en: 'Sold them to the Venetians' },
    ],
    correct: 0,
    explanation: {
      ru: 'Знатные семьи воевали друг с другом прямо в городе и укреплялись в том, что было под рукой. Колизей стал замком семьи Франджипани, театр Марцелла — крепостью, а потом дворцом, в котором живут до сих пор.',
      en: 'Noble families fought each other inside the city and fortified whatever was to hand. The Colosseum became the Frangipani family castle; the Theatre of Marcellus became a fortress, then a palace still lived in today.',
    },
  },
  {
    id: 25,
    act: 'middle-ages',
    question: {
      ru: 'В 1527 году Рим пережил катастрофу, после которой Возрождение в городе оборвалось. Что случилось?',
      en: 'In 1527 Rome suffered a catastrophe that broke off its Renaissance. What happened?',
    },
    options: [
      { ru: 'Город разграбили войска императора', en: 'Imperial troops sacked the city' },
      { ru: 'Тибр затопил центр', en: 'The Tiber flooded the centre' },
      { ru: 'Землетрясение разрушило соборы', en: 'An earthquake destroyed the churches' },
      { ru: 'Чума выкосила треть жителей', en: 'Plague killed a third of the people' },
    ],
    correct: 0,
    explanation: {
      ru: 'Sacco di Roma: неоплаченная армия Карла V взяла город и грабила его месяцами. Художники разбежались, папа отсиживался в Замке Святого Ангела, население упало вдвое.',
      en: 'The Sacco di Roma: Charles V’s unpaid army took the city and looted it for months. Artists fled, the pope hid in Castel Sant’Angelo, and the population halved.',
    },
  },
  {
    id: 26,
    act: 'middle-ages',
    estimate: true,
    axis: 'time',
    question: {
      ru: 'Когда папы вернулись в Рим из Авиньона окончательно?',
      en: 'When did the popes finally return to Rome from Avignon?',
    },
    options: [
      { ru: 'В XII веке', en: 'In the 12th century' },
      { ru: 'В XIV веке', en: 'In the 14th century' },
      { ru: 'В XVI веке', en: 'In the 16th century' },
      { ru: 'В XVIII веке', en: 'In the 18th century' },
    ],
    correct: 1,
    explanation: {
      ru: '1377 год, конец XIV века. Правда, сразу после этого начался Великий раскол: пап стало двое, а на время даже трое.',
      en: '1377, the end of the 14th century. Though what followed at once was the Great Schism, with two popes — and briefly three.',
    },
  },
  {
    id: 27,
    act: 'renaissance',
    question: {
      ru: 'Кто спроектировал купол Собора Святого Петра — самый большой купол мира на тот момент?',
      en: 'Who designed the dome of St Peter’s, the largest dome in the world at the time?',
    },
    options: [
      { ru: 'Микеланджело', en: 'Michelangelo' },
      { ru: 'Бернини', en: 'Bernini' },
      { ru: 'Браманте', en: 'Bramante' },
      { ru: 'Борромини', en: 'Borromini' },
    ],
    correct: 0,
    explanation: {
      ru: 'Микеланджело взялся за купол в 71 год и работал над ним до самой смерти, отказавшись от платы. Достроили купол уже без него, но по его чертежам.',
      en: 'Michelangelo took on the dome at seventy-one and worked on it until he died, refusing payment. It was finished after his death, to his drawings.',
    },
  },
  {
    id: 28,
    act: 'renaissance',
    question: {
      ru: 'Караваджо переписывал заказные картины, потому что заказчики их отвергали. Что их возмущало?',
      en: 'Caravaggio had to repaint commissions because his clients rejected them. What offended them?',
    },
    options: [
      { ru: 'Святых он писал с простых людей с улицы', en: 'He painted saints from ordinary people off the street' },
      { ru: 'Он писал слишком мелко', en: 'He painted on too small a scale' },
      { ru: 'Он использовал запрещённые краски', en: 'He used forbidden pigments' },
      { ru: 'Он не подписывал работы', en: 'He never signed his work' },
    ],
    correct: 0,
    explanation: {
      ru: 'У его апостолов грязные ступни, а Мадонна — с лицом знакомой римлянки. Заказчиков это оскорбляло, а живопись после него изменилась навсегда.',
      en: 'His apostles have dirty feet and his Madonna wears the face of a Roman woman he knew. It offended the clients, and it changed painting for good.',
    },
  },
  {
    id: 29,
    act: 'renaissance',
    estimate: true,
    axis: 'amount',
    question: {
      ru: 'Колоннада Бернини обнимает площадь Святого Петра. Сколько статуй святых стоит на её верху?',
      en: 'Bernini’s colonnade embraces St Peter’s Square. How many statues of saints stand along its top?',
    },
    options: [
      { ru: 'Около 20', en: 'About 20' },
      { ru: 'Около 60', en: 'About 60' },
      { ru: 'Около 140', en: 'About 140' },
      { ru: 'Около 400', en: 'About 400' },
    ],
    correct: 2,
    explanation: {
      ru: '140 статуй, каждая около трёх метров. Бернини задумал колоннаду как «руки Церкви», обнимающие пришедших на площадь.',
      en: '140 statues, each about three metres tall. Bernini meant the colonnade as the arms of the Church, embracing everyone who comes into the square.',
    },
  },
  {
    id: 30,
    act: 'today',
    question: {
      ru: 'Что такое «Чинечитта» в Риме?',
      en: 'What is Cinecittà in Rome?',
    },
    options: [
      { ru: 'Киностудия', en: 'A film studio' },
      { ru: 'Стадион', en: 'A stadium' },
      { ru: 'Рынок', en: 'A market' },
      { ru: 'Университет', en: 'A university' },
    ],
    correct: 0,
    explanation: {
      ru: 'Крупнейшая киностудия Европы, «римский Голливуд». Там снимали «Бен-Гура», «Клеопатру», «Сладкую жизнь» Феллини и «Банды Нью-Йорка».',
      en: 'The largest film studio in Europe, Rome’s Hollywood. Ben-Hur, Cleopatra, Fellini’s La Dolce Vita and Gangs of New York were all shot there.',
    },
  },
  {
    id: 31,
    act: 'today',
    question: {
      ru: 'По всему Риму стоят чугунные колонки, которые римляне зовут «насони» — «носищи». Что это?',
      en: 'Cast-iron spouts stand all over Rome, and Romans call them nasoni — "big noses". What are they?',
    },
    options: [
      { ru: 'Бесплатные питьевые фонтанчики', en: 'Free drinking fountains' },
      { ru: 'Пожарные гидранты', en: 'Fire hydrants' },
      { ru: 'Столбики для коновязи', en: 'Posts for tethering horses' },
      { ru: 'Уличные почтовые ящики', en: 'Street postboxes' },
    ],
    correct: 0,
    explanation: {
      ru: 'Около двух с половиной тысяч колонок с бесплатной питьевой водой, льющейся круглые сутки. Вода идёт из тех же античных акведуков, и вода эта отличная.',
      en: 'Some two and a half thousand spouts of free drinking water, running around the clock. It comes from the same ancient aqueducts, and it is excellent.',
    },
  },
  {
    id: 32,
    act: 'today',
    estimate: true,
    axis: 'amount',
    question: {
      ru: 'Сколько человек живёт в Риме сегодня?',
      en: 'How many people live in Rome today?',
    },
    options: [
      { ru: 'Около 800 тысяч', en: 'About 800 thousand' },
      { ru: 'Около 1,5 миллиона', en: 'About 1.5 million' },
      { ru: 'Около 2,8 миллиона', en: 'About 2.8 million' },
      { ru: 'Около 6 миллионов', en: 'About 6 million' },
    ],
    correct: 2,
    explanation: {
      ru: 'Около 2,8 миллиона — то есть Риму понадобилось почти две тысячи лет, чтобы вернуться к своему античному размеру и перерасти его.',
      en: 'About 2.8 million — meaning it took Rome nearly two thousand years to climb back to its ancient size and pass it.',
    },
  },
];
