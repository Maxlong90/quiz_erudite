import type { SupportedLocale } from '@/hooks/use-locale';

/**
 * Short flag-history blurbs shown under the answer options on a CORRECT answer in
 * the Flags Quiz game. Keyed by a stable country slug. Each locale string is one
 * cohesive paragraph (~200–320 chars) that weaves in: (1) the flag's design/
 * meaning, (2) the year the current flag was adopted, and (3) one interesting
 * fact. Placeholder-quality catalogue content; real data will come from the backend.
 */
export const FLAG_HISTORY: Record<string, Record<SupportedLocale, string>> = {
  nigeria: {
    ru: 'Флаг Нигерии принят в 1960 году, когда страна обрела независимость. Две зелёные полосы символизируют богатые леса и сельское хозяйство, а белая — мир и единство. Дизайн создал студент Тайво Акинквми, победивший в открытом конкурсе среди тысяч работ.',
    en: 'Nigeria adopted its green-white-green flag in 1960 upon independence. The green bands stand for the nation\'s forests and farmland, while white represents peace. The design was created by a 23-year-old student, Taiwo Akinkunmi, who won a nationwide competition.',
    es: 'Nigeria adoptó su bandera verde-blanco-verde en 1960 al lograr la independencia. Las franjas verdes simbolizan los bosques y la agricultura, y el blanco la paz. El diseño lo creó un estudiante de 23 años, Taiwo Akinkunmi, ganador de un concurso nacional.',
  },
  gabon: {
    ru: 'Флаг Габона принят в 1960 году после независимости от Франции. Зелёная полоса означает густые тропические леса, синяя — Атлантический океан, а золотая посередине — солнце экватора, который пересекает страну. Пропорции полос равные, что редкость среди триколоров.',
    en: 'Gabon adopted its flag in 1960 after independence from France. Green represents its vast rainforests, blue the Atlantic coastline, and the central gold band the equatorial sun, since the equator runs through the country. Its three equal horizontal bands are unusual among tricolours.',
    es: 'Gabón adoptó su bandera en 1960 tras independizarse de Francia. El verde representa sus selvas tropicales, el azul la costa atlántica y la franja dorada central el sol ecuatorial, pues el ecuador atraviesa el país. Sus tres franjas iguales son poco comunes entre los tricolores.',
  },
  mali: {
    ru: 'Флаг Мали принят в 1961 году в панафриканских цветах: зелёный — плодородие земли, золотой — чистота и природные богатства, красный — кровь, пролитая за независимость. Первоначально на нём была человеческая фигура, но её убрали по религиозным соображениям.',
    en: 'Mali adopted its flag in 1961 in Pan-African colours: green for the land, gold for purity and mineral wealth, and red for the blood shed for independence. An earlier version bore a human stick figure, which was removed to respect Islamic tradition against depicting the human form.',
    es: 'Malí adoptó su bandera en 1961 con los colores panafricanos: verde por la tierra fértil, dorado por la pureza y las riquezas, y rojo por la sangre derramada por la independencia. Una versión anterior tenía una figura humana, retirada por respeto a la tradición islámica.',
  },
  guinea: {
    ru: 'Флаг Гвинеи принят в 1958 году после провозглашения независимости от Франции. Красный символизирует жертвы борцов, жёлтый — солнце и золото недр, зелёный — растительность и надежду. Цвета повторяют флаг Ганы в знак панафриканского единства.',
    en: 'Guinea adopted its flag in 1958 upon independence from France. Red honours the sacrifice of its people, yellow evokes the sun and the country\'s gold, and green its vegetation. The colours mirror Ghana\'s flag, reflecting the Pan-African ideals of the era.',
    es: 'Guinea adoptó su bandera en 1958 al independizarse de Francia. El rojo honra el sacrificio del pueblo, el amarillo evoca el sol y el oro del subsuelo, y el verde la vegetación. Los colores reflejan la bandera de Ghana como símbolo del ideal panafricano de la época.',
  },
  'ivory-coast': {
    ru: 'Флаг Кот-д\'Ивуара принят в 1959 году, накануне независимости. Оранжевая полоса означает саванны севера и щедрость земли, белая — мир, зелёная — леса юга и надежду. Флаг напоминает итальянский триколор, но с зеркальным порядком и иными оттенками.',
    en: 'Ivory Coast adopted its flag in 1959, on the eve of independence. Orange stands for the northern savannahs and the land\'s generosity, white for peace, and green for the southern forests and hope. It resembles Italy\'s flag but with the colour order reversed.',
    es: 'Costa de Marfil adoptó su bandera en 1959, en vísperas de la independencia. El naranja representa las sabanas del norte y la generosidad de la tierra, el blanco la paz y el verde los bosques del sur. Se parece a la bandera italiana, pero con el orden de colores invertido.',
  },
  chad: {
    ru: 'Флаг Чада принят в 1959 году: синий — небо и надежда, жёлтый — солнце и пустыня Сахара, красный — единство и жертвы нации. Он почти неотличим от флага Румынии, что не раз вызывало дипломатические споры о том, кто имеет на него право.',
    en: 'Chad adopted its flag in 1959: blue for the sky and hope, yellow for the sun and the Sahara, and red for unity and sacrifice. It is nearly identical to Romania\'s flag, a coincidence that has sparked repeated diplomatic debates over who may use the design.',
    es: 'Chad adoptó su bandera en 1959: el azul por el cielo y la esperanza, el amarillo por el sol y el Sáhara, y el rojo por la unidad y el sacrificio. Es casi idéntica a la de Rumanía, una coincidencia que ha provocado varios debates diplomáticos sobre su uso.',
  },
  mexico: {
    ru: 'Флаг Мексики в нынешнем виде принят в 1968 году. Зелёный означает надежду, белый — единство, красный — кровь героев. В центре — орёл, пожирающий змею на кактусе: древний ацтекский знак, указавший, где основать город Теночтитлан, ныне Мехико.',
    en: 'Mexico\'s current flag was adopted in 1968. Green stands for hope, white for unity, and red for the blood of its heroes. At its heart is an eagle devouring a snake atop a cactus, the Aztec omen that marked where to found Tenochtitlan, today\'s Mexico City.',
    es: 'La bandera actual de México se adoptó en 1968. El verde representa la esperanza, el blanco la unidad y el rojo la sangre de los héroes. En el centro, un águila devora una serpiente sobre un nopal: el presagio azteca que indicó dónde fundar Tenochtitlan, hoy Ciudad de México.',
  },
  canada: {
    ru: 'Флаг Канады с кленовым листом принят в 1965 году, заменив британские символы. Красные полосы означают океаны по обе стороны страны, белый центр — снежные просторы. Одиннадцатиконечный лист был выбран как самый узнаваемый после испытаний в аэродинамической трубе.',
    en: 'Canada\'s maple leaf flag was adopted in 1965, replacing older British symbols. The red bands represent the oceans on each side of the country and the white centre its snowy expanse. The eleven-point leaf was chosen after wind-tunnel tests to see which stayed clearest in a breeze.',
    es: 'La bandera de Canadá con la hoja de arce se adoptó en 1965, reemplazando los símbolos británicos. Las franjas rojas representan los océanos a cada lado del país y el centro blanco sus nieves. La hoja de once puntas se eligió tras pruebas en túnel de viento para verla más nítida.',
  },
  honduras: {
    ru: 'Флаг Гондураса принят в 1866 году. Две синие полосы означают Тихий и Атлантический океаны, белая — мир и чистоту. Пять голубых звёзд в центре символизируют страны бывшей Центральноамериканской федерации и мечту о её возрождении.',
    en: 'Honduras adopted its flag in 1866. The two blue stripes represent the Pacific and Atlantic oceans, and the white band peace. The five blue stars at its centre stand for the nations of the former Central American Federation and the hope of one day reuniting them.',
    es: 'Honduras adoptó su bandera en 1866. Las dos franjas azules representan los océanos Pacífico y Atlántico, y la banda blanca la paz. Las cinco estrellas azules del centro simbolizan las naciones de la antigua Federación Centroamericana y el anhelo de reunirlas algún día.',
  },
  guatemala: {
    ru: 'Флаг Гватемалы принят в 1871 году. Синие полосы означают два океана и небо, белая — мир. В центре — герб с птицей кетсаль, символом свободы: считается, что в неволе она погибает. Свиток на гербе хранит дату независимости Центральной Америки.',
    en: 'Guatemala adopted its flag in 1871. The blue bands represent its two oceans and sky, and the white peace. Its coat of arms features the resplendent quetzal, a symbol of liberty said to die in captivity, above a scroll bearing the date of Central American independence.',
    es: 'Guatemala adoptó su bandera en 1871. Las franjas azules representan sus dos océanos y el cielo, y el blanco la paz. Su escudo luce el quetzal, símbolo de la libertad que, según se dice, muere en cautiverio, sobre un pergamino con la fecha de la independencia centroamericana.',
  },
  'costa-rica': {
    ru: 'Флаг Коста-Рики принят в 1848 году. Синие и белые полосы восходят к Центральноамериканской федерации, а красная добавлена под влиянием идеалов Французской революции — она означает тепло народа и пролитую за свободу кровь. Красная полоса вдвое шире остальных.',
    en: 'Costa Rica adopted its flag in 1848. The blue and white stripes recall the old Central American Federation, while the red band, inspired by the French Revolution, symbolises the warmth of its people and the blood shed for freedom. The red stripe is twice as wide as the others.',
    es: 'Costa Rica adoptó su bandera en 1848. Las franjas azules y blancas evocan la antigua Federación Centroamericana, y la roja, inspirada en la Revolución Francesa, simboliza la calidez del pueblo y la sangre por la libertad. La franja roja es el doble de ancha que las demás.',
  },
  nicaragua: {
    ru: 'Флаг Никарагуа принят в 1908 году. Синие полосы означают два океана, белая — мир и чистоту. В центре — герб с треугольником равенства, пятью вулканами союзных стран и радугой надежды. Это один из немногих флагов мира, где использован фиолетовый цвет.',
    en: 'Nicaragua adopted its flag in 1908. The blue stripes represent its two oceans and the white band peace. Its central emblem shows a triangle of equality, five volcanoes for the united states, and a rainbow of hope, making it one of the few national flags to include the colour violet.',
    es: 'Nicaragua adoptó su bandera en 1908. Las franjas azules representan sus dos océanos y el blanco la paz. Su emblema central muestra un triángulo de igualdad, cinco volcanes de los estados unidos y un arcoíris de esperanza, siendo de las pocas banderas con el color violeta.',
  },
  bolivia: {
    ru: 'Флаг Боливии принят в 1851 году. Красная полоса означает кровь героев, жёлтая — богатство недр, зелёная — плодородие природы. Боливия — одна из немногих стран с двумя официальными флагами: рядом с ним признана и вифала — клетчатое знамя коренных народов Анд.',
    en: 'Bolivia adopted its flag in 1851. Red honours the blood of its heroes, yellow its mineral wealth, and green the fertility of the land. Bolivia is one of the few nations with two official flags: alongside this one flies the Wiphala, the chequered banner of Andean peoples.',
    es: 'Bolivia adoptó su bandera en 1851. El rojo honra la sangre de los héroes, el amarillo la riqueza mineral y el verde la fertilidad de la tierra. Bolivia es de los pocos países con dos banderas oficiales: junto a esta ondea la Wiphala, el estandarte ajedrezado de los pueblos andinos.',
  },
  peru: {
    ru: 'Флаг Перу принят в 1825 году. Красно-белые полосы, по легенде, навеяны фламинго, которых увидел освободитель Хосе де Сан-Мартин: их крылья вспорхнули красным и белым. Красный означает борьбу за свободу, белый — мир и достоинство нации.',
    en: 'Peru adopted its flag in 1825. Legend says the red and white came from flamingos the liberator José de San Martín saw taking flight, their wings flashing crimson and white. Red stands for the struggle for freedom and white for peace and the dignity of the nation.',
    es: 'Perú adoptó su bandera en 1825. Según la leyenda, el rojo y el blanco surgieron de unos flamencos que el libertador José de San Martín vio alzar el vuelo, con sus alas rojas y blancas. El rojo simboliza la lucha por la libertad y el blanco la paz y la dignidad nacional.',
  },
  colombia: {
    ru: 'Флаг Колумбии принят в 1861 году. Широкая жёлтая полоса означает золото и богатства земли, синяя — моря и реки, красная — кровь, пролитую за независимость. Жёлтая полоса занимает половину флага, что подчёркивает изобилие страны.',
    en: 'Colombia adopted its flag in 1861. The broad yellow band represents the country\'s gold and riches, blue its seas and rivers, and red the blood shed for independence. The yellow stripe takes up half the flag, emphasising the nation\'s abundance.',
    es: 'Colombia adoptó su bandera en 1861. La amplia franja amarilla representa el oro y las riquezas del país, la azul sus mares y ríos, y la roja la sangre derramada por la independencia. La franja amarilla ocupa la mitad de la bandera, resaltando la abundancia de la nación.',
  },
  venezuela: {
    ru: 'Флаг Венесуэлы в нынешнем виде принят в 2006 году, когда добавили восьмую звезду по завету Симона Боливара. Жёлтый означает богатства земли, синий — море, отделяющее от Испании, красный — смелость. Восемь звёзд символизируют провинции, поднявшиеся за независимость.',
    en: 'Venezuela\'s current flag was adopted in 2006, adding an eighth star as Simón Bolívar had once wished. Yellow stands for the land\'s riches, blue for the sea dividing it from Spain, and red for courage. The eight stars represent the provinces that rose up for independence.',
    es: 'La bandera actual de Venezuela se adoptó en 2006, al añadir una octava estrella como deseaba Simón Bolívar. El amarillo representa las riquezas de la tierra, el azul el mar que la separa de España y el rojo el coraje. Las ocho estrellas simbolizan las provincias que se alzaron.',
  },
  argentina: {
    ru: 'Флаг Аргентины принят в 1812 году, а солнце добавлено в 1818-м. Голубые и белые полосы, по преданию, повторяют цвет неба, проглянувшего сквозь тучи в день первого восстания. Золотое Майское солнце в центре — древний символ инков и наступления новой свободной эпохи.',
    en: 'Argentina adopted its flag in 1812, adding the sun in 1818. Legend holds the light-blue and white echo the sky breaking through the clouds on the day of the first uprising. The golden Sun of May at its centre is an ancient Inca symbol marking the dawn of independence.',
    es: 'Argentina adoptó su bandera en 1812 y añadió el sol en 1818. La leyenda cuenta que el celeste y el blanco evocan el cielo que asomó entre las nubes el día del primer alzamiento. El Sol de Mayo dorado del centro es un antiguo símbolo inca que marca el amanecer de la libertad.',
  },
  indonesia: {
    ru: 'Флаг Индонезии принят в 1945 году, в день провозглашения независимости. Красная полоса означает смелость и кровь, белая — чистоту и дух. Он почти неотличим от флага Монако, но крупнее по пропорциям, а с флагом Польши совпадает зеркально.',
    en: 'Indonesia adopted its flag in 1945, on the day it declared independence. The red band stands for courage and the white for purity of spirit. It is nearly identical to Monaco\'s flag, though of different proportions, and is the exact inverse of Poland\'s.',
    es: 'Indonesia adoptó su bandera en 1945, el día que declaró su independencia. La franja roja representa el valor y la sangre, y la blanca la pureza del espíritu. Es casi idéntica a la de Mónaco, aunque de distintas proporciones, y es el inverso exacto de la de Polonia.',
  },
  armenia: {
    ru: 'Флаг Армении принят в 1990 году при обретении независимости, возродив триколор первой республики. Красный означает кровь и борьбу народа, синий — мирное небо, оранжевый — трудолюбие и плодородные земли. Цвета уходят корнями в древние армянские традиции.',
    en: 'Armenia adopted its flag in 1990 upon independence, reviving the tricolour of its first republic. Red stands for the blood and struggle of its people, blue for the peaceful sky, and orange for their hard work and fertile land. The colours draw on ancient Armenian tradition.',
    es: 'Armenia adoptó su bandera en 1990 al independizarse, recuperando el tricolor de su primera república. El rojo representa la sangre y la lucha del pueblo, el azul el cielo pacífico y el naranja el trabajo y las tierras fértiles. Los colores hunden sus raíces en tradiciones antiguas.',
  },
  india: {
    ru: 'Флаг Индии принят в 1947 году. Шафрановый цвет означает мужество, белый — мир, зелёный — веру и плодородие. В центре — синее колесо Ашоки с 24 спицами, символ вечного движения и закона дхармы. По правилам флаг ткут только из кустарного хлопка кхади.',
    en: 'India adopted its flag in 1947. Saffron stands for courage, white for peace, and green for faith and fertility. At its centre is the blue Ashoka Chakra, a 24-spoke wheel symbolising eternal motion and dharma. By law the flag must be woven from hand-spun khadi cloth.',
    es: 'India adoptó su bandera en 1947. El azafrán representa el coraje, el blanco la paz y el verde la fe y la fertilidad. En el centro está el Chakra de Ashoka azul, una rueda de 24 radios que simboliza el movimiento eterno y el dharma. Por ley debe tejerse en algodón khadi artesanal.',
  },
  yemen: {
    ru: 'Флаг Йемена принят в 1990 году после объединения Севера и Юга страны. Красная полоса означает кровь мучеников и единство, белая — светлое будущее, чёрная — тёмное прошлое под гнётом. Это самый простой из арабских флагов освобождения, без гербов и звёзд.',
    en: 'Yemen adopted its flag in 1990 after the union of North and South. Red stands for the blood of martyrs and unity, white for a bright future, and black for the dark past under oppression. It is the plainest of the Arab liberation flags, bearing no emblem or star.',
    es: 'Yemen adoptó su bandera en 1990 tras la unión del Norte y el Sur. El rojo representa la sangre de los mártires y la unidad, el blanco un futuro luminoso y el negro el pasado oscuro bajo la opresión. Es la más sencilla de las banderas árabes de liberación, sin emblemas ni estrellas.',
  },
  japan: {
    ru: 'Флаг Японии официально закреплён законом в 1999 году, хотя красный круг на белом поле — «Хиномару» — служит символом страны уже много веков. Круг означает солнце и богиню Аматэрасу, от которой, по преданию, ведёт род императорская династия. Страну зовут «Землёй восходящего солнца».',
    en: 'Japan\'s flag was formally enshrined in law in 1999, though the red disc on white, the Hinomaru, has symbolised the nation for centuries. The circle represents the sun and the goddess Amaterasu, from whom the imperial line is said to descend, giving Japan its name, Land of the Rising Sun.',
    es: 'La bandera de Japón se consagró legalmente en 1999, aunque el disco rojo sobre blanco, el Hinomaru, simboliza al país desde hace siglos. El círculo representa el sol y a la diosa Amaterasu, de quien se dice desciende la línea imperial, dando a Japón su nombre: Tierra del Sol Naciente.',
  },
  bangladesh: {
    ru: 'Флаг Бангладеш принят в 1972 году после войны за независимость. Зелёное поле означает плодородные земли и молодость нации, а красный круг — солнце восхода над новой страной и кровь павших за свободу. Круг смещён чуть влево, чтобы казаться в центре на развевающемся полотнище.',
    en: 'Bangladesh adopted its flag in 1972 after its war of independence. The green field stands for the fertile land and the youth of the nation, while the red disc symbolises the rising sun over a new country and the blood of those who died for freedom. The disc sits slightly off-centre so it looks centred when the flag flies.',
    es: 'Bangladés adoptó su bandera en 1972 tras su guerra de independencia. El campo verde representa las tierras fértiles y la juventud de la nación, y el disco rojo el sol naciente sobre un nuevo país y la sangre de los caídos. El disco está algo descentrado para verse centrado al ondear.',
  },
  germany: {
    ru: 'Флаг Германии в нынешнем виде принят в 1949 году. Чёрно-красно-золотые цвета восходят к мундирам добровольцев в войнах против Наполеона и стали символом единства и свободы ещё в революцию 1848 года. Сегодня они означают демократическую и объединённую Германию.',
    en: 'Germany\'s current flag was adopted in 1949. Its black, red and gold trace back to the uniforms of volunteers fighting Napoleon and became a symbol of unity and freedom in the 1848 revolution. Today they represent a democratic and reunited Germany.',
    es: 'La bandera actual de Alemania se adoptó en 1949. El negro, rojo y oro se remontan a los uniformes de los voluntarios que lucharon contra Napoleón y se volvieron símbolo de unidad y libertad en la revolución de 1848. Hoy representan una Alemania democrática y reunificada.',
  },
  france: {
    ru: 'Флаг Франции — знаменитый триколор — восходит к революции 1789 года; в нынешнем законодательном виде закреплён в 1794 году. Синий и красный — цвета Парижа, белый — цвет монархии, а вместе они означают идеалы «Свобода, равенство, братство». Он вдохновил флаги десятков стран мира.',
    en: 'France\'s famous tricolour was born of the 1789 revolution and fixed in its current form in 1794. Blue and red are the colours of Paris, white that of the monarchy, and together they embody Liberty, Equality, Fraternity. It has inspired the flags of dozens of nations.',
    es: 'La famosa tricolor de Francia nació de la revolución de 1789 y quedó fijada en su forma actual en 1794. El azul y el rojo son los colores de París y el blanco el de la monarquía; juntos encarnan Libertad, Igualdad, Fraternidad. Ha inspirado las banderas de decenas de países.',
  },
  italy: {
    ru: 'Флаг Италии принят в 1946 году с рождением республики. Зелёный означает надежду и равнины страны, белый — снега Альп и веру, красный — любовь и кровь патриотов. Триколор родился ещё в 1797 году под влиянием французского флага эпохи Наполеона.',
    en: 'Italy adopted its flag in 1946 with the birth of the republic. Green stands for hope and the country\'s plains, white for the snows of the Alps and faith, and red for love and the blood of patriots. The tricolour first appeared in 1797, inspired by Napoleon\'s France.',
    es: 'Italia adoptó su bandera en 1946 con el nacimiento de la república. El verde representa la esperanza y las llanuras del país, el blanco las nieves de los Alpes y la fe, y el rojo el amor y la sangre de los patriotas. El tricolor surgió en 1797, inspirado en la Francia napoleónica.',
  },
  ireland: {
    ru: 'Флаг Ирландии принят в 1922 году при основании Свободного государства. Зелёный означает католиков и гэльскую традицию, оранжевый — протестантов-последователей Вильгельма Оранского, а белый между ними — мир и примирение двух общин на одном острове.',
    en: 'Ireland adopted its flag in 1922 with the founding of the Free State. Green represents the Catholic and Gaelic tradition, orange the Protestant followers of William of Orange, and the white between them the hope of lasting peace between the two communities.',
    es: 'Irlanda adoptó su bandera en 1922 con la fundación del Estado Libre. El verde representa la tradición católica y gaélica, el naranja a los protestantes seguidores de Guillermo de Orange, y el blanco entre ambos la esperanza de una paz duradera entre las dos comunidades.',
  },
  belgium: {
    ru: 'Флаг Бельгии принят в 1831 году после революции против Нидерландов. Чёрный, жёлтый и красный взяты из герба Брабанта — золотой лев на чёрном поле с красными когтями. Это один из немногих государственных флагов с вертикальными полосами в Европе.',
    en: 'Belgium adopted its flag in 1831 after its revolution against the Netherlands. The black, yellow and red come from the arms of Brabant, a golden lion with red claws on a black field. It is one of Europe\'s few national flags with vertical stripes.',
    es: 'Bélgica adoptó su bandera en 1831 tras su revolución contra los Países Bajos. El negro, el amarillo y el rojo proceden del escudo de Brabante: un león dorado con garras rojas sobre campo negro. Es una de las pocas banderas nacionales de Europa con franjas verticales.',
  },
  netherlands: {
    ru: 'Флаг Нидерландов принят в нынешнем виде в 1937 году, но восходит к XVI веку и восстанию против Испании. Красный, белый и синий пришли на смену прежнему оранжевому. Считается старейшим трёхцветным флагом, вдохновившим и российский, и многие другие.',
    en: 'The Netherlands fixed its flag by decree in 1937, though it dates to the 16th-century revolt against Spain. Red, white and blue replaced an earlier orange band. It is considered the oldest tricolour flag, an inspiration for Russia\'s and many others.',
    es: 'Los Países Bajos fijaron su bandera por decreto en 1937, aunque se remonta a la rebelión contra España del siglo XVI. El rojo, blanco y azul sustituyeron a una franja naranja anterior. Se considera la tricolor más antigua e inspiró a la de Rusia y muchas otras.',
  },
  palau: {
    ru: 'Флаг Палау принят в 1981 году. Небесно-голубое поле означает океан, окружающий острова, а золотой круг — полную луну, которую здесь считают лучшим временем для рыбалки, посадок и праздников. Круг слегка смещён к древку, чтобы казаться центральным на ветру.',
    en: 'Palau adopted its flag in 1981. The sky-blue field represents the ocean surrounding the islands, and the golden disc a full moon, considered the ideal time for fishing, planting and celebration. The disc is set slightly toward the hoist so it looks centred when flying.',
    es: 'Palaos adoptó su bandera en 1981. El campo azul cielo representa el océano que rodea las islas, y el disco dorado la luna llena, considerada el mejor momento para pescar, sembrar y celebrar. El disco se desplaza un poco hacia el asta para verse centrado al ondear.',
  },
  nauru: {
    ru: 'Флаг Науру принят в 1968 году в день независимости. Синее поле означает Тихий океан, жёлтая полоса — экватор, а белая двенадцатиконечная звезда под ней — само положение острова к югу от линии и двенадцать исконных племён народа науру.',
    en: 'Nauru adopted its flag in 1968 on independence day. The blue field represents the Pacific Ocean, the yellow band the equator, and the white twelve-point star just below it marks the island\'s position south of that line as well as its twelve original tribes.',
    es: 'Nauru adoptó su bandera en 1968, el día de su independencia. El campo azul representa el océano Pacífico, la franja amarilla el ecuador, y la estrella blanca de doce puntas debajo marca la posición de la isla al sur de esa línea y sus doce tribus originarias.',
  },
  australia: {
    ru: 'Флаг Австралии принят в 1901 году, вскоре после образования федерации. Британский «Юнион Джек» в углу отражает историю, большая семиконечная звезда Содружества — единство штатов и территорий, а пять звёзд справа образуют созвездие Южного Креста.',
    en: 'Australia adopted its flag in 1901, soon after federation. The Union Jack in the corner reflects its history, the large seven-point Commonwealth Star stands for the states and territories, and the five stars to the right form the Southern Cross constellation.',
    es: 'Australia adoptó su bandera en 1901, poco después de la federación. La Union Jack en la esquina refleja su historia, la gran estrella de siete puntas de la Mancomunidad representa los estados y territorios, y las cinco estrellas de la derecha forman la Cruz del Sur.',
  },
  fiji: {
    ru: 'Флаг Фиджи принят в 1970 году при обретении независимости. Светло-голубое поле означает Тихий океан, «Юнион Джек» — связь с Британией, а щит с гербом — сахарный тростник, кокосы, бананы и голубя мира. Небесный оттенок символизирует воды, окружающие острова.',
    en: 'Fiji adopted its flag in 1970 upon independence. The light-blue field represents the Pacific Ocean, the Union Jack its ties to Britain, and the shield sugar cane, coconuts, bananas and a dove of peace. The bright sky-blue hue evokes the waters surrounding the islands.',
    es: 'Fiyi adoptó su bandera en 1970 al independizarse. El campo azul claro representa el océano Pacífico, la Union Jack sus lazos con Gran Bretaña, y el escudo la caña de azúcar, los cocos, los plátanos y una paloma de la paz. El tono celeste evoca las aguas que rodean las islas.',
  },
  russia: {
    ru: 'Флаг России в нынешнем виде вернулся в 1991 году, а истоки его — в петровской эпохе конца XVII века. Белый, синий и красный по традиции толкуют как благородство, верность и мужество. Именно этот триколор дал начало панславянским цветам многих стран.',
    en: 'Russia\'s current flag returned in 1991, though its roots reach back to Peter the Great in the late 17th century. White, blue and red are traditionally read as nobility, loyalty and courage. This very tricolour gave rise to the Pan-Slavic colours of many nations.',
    es: 'La bandera actual de Rusia volvió en 1991, aunque sus orígenes se remontan a Pedro el Grande, a finales del siglo XVII. El blanco, el azul y el rojo suelen interpretarse como nobleza, lealtad y valor. Este tricolor dio origen a los colores paneslavos de muchas naciones.',
  },
  spain: {
    ru: 'Флаг Испании в нынешнем виде принят в 1981 году. Красные и жёлтые полосы восходят к 1785 году, когда король Карл III выбрал их, чтобы флот был заметен в море. Слева — герб с колоннами Геркулеса и девизом «Plus Ultra» — «Дальше предела», зовущим за океан.',
    en: 'Spain\'s current flag was adopted in 1981. Its red and yellow bands date to 1785, when King Charles III chose them so his navy would stand out at sea. On the left sits the coat of arms with the Pillars of Hercules and the motto Plus Ultra, meaning Further Beyond.',
    es: 'La bandera actual de España se adoptó en 1981. Sus franjas roja y amarilla datan de 1785, cuando el rey Carlos III las eligió para que su armada destacara en el mar. A la izquierda está el escudo con las Columnas de Hércules y el lema Plus Ultra, Más Allá.',
  },
  portugal: {
    ru: 'Флаг Португалии принят в 1911 году после провозглашения республики. Зелёный означает надежду, красный — кровь революции. В центре — армиллярная сфера эпохи великих открытий и щит с пятью синими щитками в память о победах над маврами. Зелёный на флаге появился впервые.',
    en: 'Portugal adopted its flag in 1911 after becoming a republic. Green stands for hope and red for the blood of the revolution. At its centre is an armillary sphere from the Age of Discovery and a shield whose five blue shields recall victories over the Moors. It was the first Portuguese flag to use green.',
    es: 'Portugal adoptó su bandera en 1911 tras proclamarse república. El verde representa la esperanza y el rojo la sangre de la revolución. En el centro hay una esfera armilar de la Era de los Descubrimientos y un escudo cuyos cinco escudetes azules recuerdan las victorias sobre los moros.',
  },
  usa: {
    ru: 'Флаг США в нынешнем виде с 50 звёздами принят в 1960 году, после вступления Гавайев в союз. Тринадцать полос напоминают о первых колониях, а каждая звезда — это штат. Нынешний рисунок из 50 звёзд придумал школьник Роберт Хефт для проекта — и получил лишь тройку.',
    en: 'The 50-star U.S. flag was adopted in 1960, after Hawaii joined the union. The thirteen stripes recall the original colonies and each star stands for a state. The current 50-star arrangement was designed by a teenager, Robert Heft, for a school project that first earned him a B-minus.',
    es: 'La bandera de EE. UU. con 50 estrellas se adoptó en 1960, tras la incorporación de Hawái. Las trece franjas recuerdan a las colonias originales y cada estrella representa un estado. El diseño actual de 50 estrellas lo creó un adolescente, Robert Heft, para un trabajo escolar.',
  },
  uk: {
    ru: 'Флаг Великобритании — «Юнион Джек» — в нынешнем виде принят в 1801 году, когда к союзу присоединилась Ирландия. Он объединяет кресты святого Георгия Английского, святого Андрея Шотландского и святого Патрика Ирландского. Из-за наложения крестов у флага есть верная и перевёрнутая сторона.',
    en: 'The United Kingdom\'s Union Jack took its current form in 1801, when Ireland joined the union. It combines the crosses of St George for England, St Andrew for Scotland and St Patrick for Ireland. Because the crosses overlap unevenly, the flag has a right way and a wrong way up.',
    es: 'La Union Jack del Reino Unido adoptó su forma actual en 1801, cuando Irlanda se unió a la unión. Combina las cruces de San Jorge por Inglaterra, San Andrés por Escocia y San Patricio por Irlanda. Como las cruces se superponen de forma desigual, tiene un lado correcto y otro invertido.',
  },
};
