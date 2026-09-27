// "What can I cook?": reads ingredient lines and checks them against what's in the kitchen.
// Shared by the app (tools/sync_caption.py copies the marked block into tools/app.html) and the tests.

/* ---- pantry: what can I cook ---- */
// [id, label, kind, pattern, family]
// kind: p protein, v veggies and fruit, d dairy and eggs, c pasta rice and bread, s sauces and cans, h herbs and spices, b basics
// A line is read by its longest matches, so "chicken broth" wins over "chicken" and "peanut butter" over "butter".
const FOODS = [
  // broths and soups
  ['chicken broth', 'Chicken broth', 's', 'chicken (broth|stock|bouillon( cubes?| powder)?|base)|caldo de pollo|knorr( chicken)?( bouillon)?|better than bouillon( chicken)?', 'broth'],
  ['beef broth', 'Beef broth', 's', 'beef (broth|stock|bouillon( cubes?| powder)?|base|consomme)', 'broth'],
  ['vegetable broth', 'Vegetable broth', 's', '(vegetable|veggie) (broth|stock|bouillon)', 'broth'],
  ['broth', 'Broth', 's', '(low sodium )?(broth|stock|bouillon( cubes?)?)', 'broth'],
  ['cream of chicken', 'Cream of chicken soup', 's', '(condensed )?cream of chicken( soup)?', 'cream soup'],
  ['cream of mushroom', 'Cream of mushroom soup', 's', '(condensed )?cream of (mushroom|celery)( soup)?', 'cream soup'],
  // oils
  ['sesame oil', 'Sesame oil', 's', '(toasted )?sesame oil'],
  ['chili oil', 'Chili oil', 's', 'chil(i|e) (crisp|oil)|chili garlic oil'],
  ['oil', 'Cooking oil', 'b', '((extra virgin |light )?olive|vegetable|canola|avocado|peanut|coconut|neutral|cooking|frying|sunflower|corn|grapeseed) oil|oil|evoo|cooking spray|nonstick spray|shortening|lard|crisco'],
  // sauces, cans, and jars
  ['soy sauce', 'Soy sauce', 's', '(low sodium |reduced sodium |light |dark |regular )?soy sauce|tamari|shoyu|(coconut|liquid) aminos'],
  ['fish sauce', 'Fish sauce', 's', 'fish sauce'],
  ['oyster sauce', 'Oyster sauce', 's', 'oyster sauce'],
  ['hoisin', 'Hoisin sauce', 's', 'hoisin( sauce)?'],
  ['teriyaki', 'Teriyaki sauce', 's', 'teriyaki( sauce| marinade| glaze)?'],
  ['worcestershire', 'Worcestershire', 's', 'worcestershire( sauce)?'],
  ['gochujang', 'Gochujang', 's', 'gochujang( paste)?|korean (red )?chil(i|e) paste'],
  ['sriracha', 'Sriracha or chili sauce', 's', 'sriracha|chil(i|e) garlic sauce|sambal( oelek)?|sweet chil(i|e) sauce|chil(i|e) sauce'],
  ['hot sauce', 'Hot sauce', 's', 'hot sauce|tabasco|frank\'?s( red hot)?|cholula|valentina|tapatio|buffalo( wing)? sauce|wing sauce'],
  ['chipotle in adobo', 'Chipotles in adobo', 's', 'chipotles?( peppers?)? in adobo( sauce)?|adobo sauce'],
  ['enchilada sauce', 'Enchilada sauce', 's', '(red |green )?enchilada sauce'],
  ['bbq sauce', 'BBQ sauce', 's', '(bbq|barbecue|barbeque) sauce|sweet baby ray\'?s'],
  ['curry paste', 'Curry paste', 's', '((red|green|yellow|massaman|panang|thai) )?curry paste'],
  ['pesto', 'Pesto', 's', '(basil )?pesto'],
  ['tomato paste', 'Tomato paste', 's', 'tomato paste'],
  ['tomato sauce', 'Tomato sauce', 's', 'tomato (sauce|puree)|passata', 'tomato sauce'],
  ['pasta sauce', 'Marinara or pasta sauce', 's', 'marinara( sauce)?|(pasta|spaghetti|pizza|vodka|alfredo) sauce|ragu|prego', 'tomato sauce'],
  ['canned tomatoes', 'Canned tomatoes', 'v', '((canned|can of|cans of|petite) )?(diced|crushed|stewed|whole peeled|peeled|fire roasted|san marzano|petite diced)( fire roasted)? tomatoes|rotel|ro tel|diced tomatoes (and|with) (green )?chil(i|e)s', 'tomatoes'],
  ['sun dried tomatoes', 'Sun-dried tomatoes', 'v', 'sun dried tomatoes'],
  ['ketchup', 'Ketchup', 's', 'ketchup|catsup'],
  ['salsa', 'Salsa', 's', '(chunky |mild |medium |hot )?salsa( verde| roja)?|pico de gallo|picante sauce'],
  ['mustard', 'Mustard', 's', '(dijon |yellow |spicy brown |whole grain |stone ground |honey |dry )?mustard( powder)?|dijon'],
  ['mayo', 'Mayo', 's', 'mayo(nnaise)?|kewpie|miracle whip|aioli'],
  ['ranch', 'Ranch', 's', 'ranch( dressing| seasoning( mix)?| mix| packet| dip)?|hidden valley'],
  ['italian dressing', 'Italian dressing', 's', 'italian dressing|zesty italian|vinaigrette|salad dressing'],
  ['honey', 'Honey', 's', 'honey'],
  ['maple syrup', 'Maple syrup', 's', '(pure )?maple syrup|pancake syrup'],
  ['corn syrup', 'Corn syrup', 's', '(light |dark )?corn syrup|karo'],
  ['rice vinegar', 'Rice vinegar', 's', '(seasoned )?rice (wine )?vinegar', 'vinegar'],
  ['balsamic', 'Balsamic vinegar', 's', 'balsamic( vinegar| glaze| reduction)?', 'vinegar'],
  ['vinegar', 'Vinegar', 's', '(apple cider |white |red wine |white wine |distilled |cider |sherry )?vinegar', 'vinegar'],
  ['rice wine', 'Mirin or rice wine', 's', 'mirin|rice wine|shaoxing( wine)?|sake|cooking wine'],
  ['wine', 'Wine', 's', '(dry )?(white|red) wine|wine'],
  ['beer', 'Beer', 's', 'beer|lager'],
  ['coconut milk', 'Coconut milk', 's', '(canned |full fat |light |unsweetened )?coconut (milk|cream)'],
  ['peanut butter', 'Peanut butter', 's', '(creamy |crunchy |natural )?peanut butter'],
  ['tahini', 'Tahini', 's', 'tahini'],
  ['hummus', 'Hummus', 's', 'hummus'],
  ['miso', 'Miso', 's', '(white |red |yellow )?miso( paste)?'],
  ['kimchi', 'Kimchi', 's', 'kimchi'],
  ['pickles', 'Pickles', 's', '(dill )?pickles?|pickle relish|relish'],
  ['olives', 'Olives', 's', '(black |kalamata |green |sliced |pitted )?olives'],
  ['capers', 'Capers', 's', 'capers'],
  ['water chestnuts', 'Water chestnuts', 's', 'water chestnuts'],
  ['cornstarch', 'Cornstarch', 's', 'corn ?starch|potato starch|arrowroot( powder)?|tapioca (starch|flour)'],
  ['baking powder', 'Baking powder', 's', 'baking powder'],
  ['baking soda', 'Baking soda', 's', 'baking soda|bicarbonate of soda'],
  ['yeast', 'Yeast', 's', '(active dry |instant |rapid rise )?yeast'],
  ['vanilla', 'Vanilla', 's', '(pure )?vanilla( extract| bean| paste)?'],
  ['chocolate', 'Chocolate', 's', '(semi sweet |semisweet |bittersweet |dark |milk |white )?chocolate( chips| chunks| bars?)?'],
  ['cocoa', 'Cocoa powder', 's', '(unsweetened |dutch process )?cocoa( powder)?'],
  ['peanuts', 'Peanuts', 's', '(roasted |crushed |chopped |dry roasted |salted )?peanuts'],
  ['nuts', 'Nuts', 's', '(chopped |toasted |sliced |slivered )?(almonds|walnuts|pecans|cashews|pistachios|pine nuts|hazelnuts|macadamia( nuts)?|mixed nuts|nuts)'],
  ['coconut', 'Shredded coconut', 's', '(shredded |sweetened |unsweetened |toasted |flaked )?coconut( flakes)?'],
  ['crackers', 'Crackers', 's', 'crackers|saltines|ritz( crackers)?|graham crackers'],
  // herbs and spices
  ['garlic powder', 'Garlic powder', 'h', 'garlic powder|granulated garlic|garlic salt'],
  ['onion powder', 'Onion powder', 'h', 'onion powder|dried minced onion|onion flakes|dehydrated onion'],
  ['chili powder', 'Chili powder', 'h', '(ancho |chipotle )?chil(i|e) powder|chipotle powder'],
  ['cumin', 'Cumin', 'h', '(ground )?cumin( seeds?)?|comino'],
  ['paprika', 'Paprika', 'h', '(smoked |sweet |hot |spanish |hungarian )?paprika'],
  ['oregano', 'Oregano', 'h', '(dried |mexican |fresh )?oregano'],
  ['italian seasoning', 'Italian seasoning', 'h', 'italian (seasoning|herbs|herb blend)|herbes de provence'],
  ['cinnamon', 'Cinnamon', 'h', '(ground )?cinnamon( sticks?)?'],
  ['nutmeg', 'Nutmeg', 'h', '(ground )?nutmeg'],
  ['red pepper flakes', 'Red pepper flakes', 'h', '(crushed )?red pepper flakes|crushed red pepper|chil(i|e) flakes|gochugaru'],
  ['cayenne', 'Cayenne', 'h', '(ground )?cayenne( pepper)?'],
  ['white pepper', 'White pepper', 'h', '(ground )?white pepper|lemon pepper( seasoning)?'],
  ['curry powder', 'Curry powder', 'h', 'curry powder|garam masala|(ground )?turmeric'],
  ['ground ginger', 'Ground ginger', 'h', 'ground ginger|ginger powder'],
  ['cajun seasoning', 'Cajun seasoning', 'h', '(cajun|creole|blackening) seasoning|old bay( seasoning)?|tony chachere\'?s'],
  ['taco seasoning', 'Taco seasoning', 'h', '(taco|fajita|burrito) seasoning( mix| packet)?'],
  ['seasoned salt', 'Seasoned salt', 'h', 'season(ed|ing) salt|lawry\'?s|adobo( seasoning| all purpose seasoning)?|sazon( goya)?|everything bagel seasoning|celery salt|onion salt'],
  ['sesame seeds', 'Sesame seeds', 'h', '(toasted |black |white )?sesame seeds|furikake'],
  ['cilantro', 'Cilantro', 'h', '(fresh )?cilantro( leaves)?|coriander leaves'],
  ['parsley', 'Parsley', 'h', '(fresh |flat leaf |italian |dried )?parsley( flakes)?'],
  ['basil', 'Basil', 'h', '(fresh |thai |dried |sweet )?basil( leaves)?'],
  ['mint', 'Mint', 'h', '(fresh )?mint( leaves)?'],
  ['dill', 'Dill', 'h', '(fresh |dried )?dill( weed)?'],
  ['rosemary', 'Rosemary', 'h', '(fresh |dried )?rosemary'],
  ['thyme', 'Thyme', 'h', '(fresh |dried )?thyme( leaves)?'],
  ['bay leaves', 'Bay leaves', 'h', '(dried )?bay (leaf|leaves)'],
  // dairy and eggs
  ['cream cheese', 'Cream cheese', 'd', '(softened )?cream cheese|neufchatel|mascarpone'],
  ['sour cream', 'Sour cream', 'd', 'sour cream|crema( mexicana)?|creme fraiche'],
  ['ice cream', 'Ice cream', 'd', '(vanilla )?ice cream|gelato'],
  ['whipped cream', 'Whipped cream', 'd', 'whipped (cream|topping)|cool whip|reddi whip'],
  ['canned milk', 'Evaporated or condensed milk', 'd', '(sweetened )?condensed milk|evaporated milk|lechera'],
  ['heavy cream', 'Heavy cream', 'd', 'heavy (whipping )?cream|whipping cream|double cream|light cream|half and half|cream'],
  ['buttermilk', 'Buttermilk', 'd', 'buttermilk'],
  ['milk', 'Milk', 'd', '(whole |2% |skim |low fat |oat |almond |soy |dairy free |warm |cold |evaporated )?milk'],
  ['yogurt', 'Yogurt', 'd', '(plain |greek |vanilla |whole milk )*yogh?urt'],
  ['parmesan', 'Parmesan', 'd', '(grated |shredded |fresh |freshly grated )?(parmesan|parmigiano( reggiano)?|pecorino( romano)?|grana padano|romano)( cheese)?'],
  ['mozzarella', 'Mozzarella', 'd', '(fresh |shredded |low moisture |part skim |whole milk )*mozzarella( cheese| pearls| balls)?|burrata|string cheese', 'cheese'],
  ['feta', 'Feta', 'd', '(crumbled )?feta( cheese)?'],
  ['goat cheese', 'Goat or blue cheese', 'd', '(crumbled )?(goat|blue) cheese|chevre|gorgonzola'],
  ['cotija', 'Cotija or queso fresco', 'd', '(crumbled )?(cotija( cheese)?|queso fresco|queso blanco)'],
  ['ricotta', 'Ricotta', 'd', '(whole milk )?ricotta( cheese)?|cottage cheese'],
  ['cheese', 'Cheese', 'd', '((sharp|mild|white|extra sharp|shredded|sliced|grated|cubed|freshly shredded) )*((cheddar|monterey jack|pepper jack|colby( jack)?|provolone|gouda|gruyere|havarti|muenster|oaxaca|asadero|chihuahua|mexican( style)?( blend)?|mexican four|italian blend|fiesta blend|taco blend|velveeta|nacho)( cheese( blend| sauce| dip)?)?|(american|swiss|jack) cheese|cheese( blend| slices| sauce)?|queso( dip)?)', 'cheese'],
  ['eggs', 'Eggs', 'd', '(large |medium |hard boiled |beaten )?eggs?( yolks?| whites?)?|egg (yolks?|whites?|wash)'],
  ['butter', 'Butter', 'b', '(unsalted |salted |melted |softened |cold |cubed )?butter|margarine|ghee'],
  // meat, fish, and beans
  ['sausage', 'Sausage', 'p', '((italian|breakfast|smoked|pork|turkey|chicken|andouille|polish|sweet italian|hot italian|mild italian) )*sausages?( links| patties| meat)?|chorizo|kielbasa|andouille|bratwursts?|brats|hot dogs?|franks|frankfurters|(lil|little) smokies'],
  ['ham', 'Ham', 'p', '(diced |cooked |spiral |deli |smoked )?ham( steak| hock| bone)?|prosciutto|canadian bacon'],
  ['bacon', 'Bacon', 'p', '(thick cut |turkey |center cut |cooked |crumbled )?bacon( bits)?|pancetta|salt pork'],
  ['ground beef', 'Ground beef', 'p', '(lean |extra lean |\\d+% lean )?ground (beef|chuck|sirloin|round)|hamburger( meat)?|beef mince|minced beef|burger (patties|meat)'],
  ['ground turkey', 'Ground turkey', 'p', '(lean )?ground turkey|turkey mince'],
  ['ground pork', 'Ground pork', 'p', 'ground pork|pork mince|minced pork'],
  ['chicken', 'Chicken', 'p', '((boneless|skinless|bone in|skin on|rotisserie|cooked|shredded|ground|raw|frozen|diced|leftover) )*chicken( breasts?| thighs?| tenders?| tenderloins?| cutlets?| drumsticks?| legs?| leg quarters| quarters?| wings?| meat| pieces| strips| breast halves)?|rotisserie|drumsticks|chicken wings'],
  ['turkey', 'Turkey', 'p', '(cooked |leftover |deli )?turkey( breast| legs?| wings?| thighs?| meat)?'],
  ['pork', 'Pork', 'p', '(boneless )?pork( chops?| loin| tenderloin| shoulder| butt| belly| ribs?| roast| steaks?)?|baby back ribs|spare ribs|carnitas'],
  ['beef', 'Steak or beef', 'p', '((beef|flank|skirt|sirloin|ribeye|rib eye|strip|cube|chuck|round|flat iron|tri tip|new york|top sirloin) )?steaks?|beef( chuck( roast)?| roast| stew meat| brisket| short ribs?| tenderloin| shank| cheeks| strips| sirloin)?|chuck roast|pot roast|stew meat|brisket|short ribs|flank|carne asada|tri tip|oxtails?|arrachera|london broil|prime rib|roast beef'],
  ['lamb', 'Lamb', 'p', 'lamb( chops?| shoulder| leg| shank| meat)?|ground lamb|mutton'],
  ['shrimp', 'Shrimp', 'p', '((jumbo|large|medium|small|raw|cooked|frozen|peeled|deveined|peeled and deveined) )*(shrimp|prawns?)'],
  ['salmon', 'Salmon', 'p', '(fresh |frozen |smoked )?salmon( fillets?)?|lox'],
  ['tuna', 'Tuna', 'p', '(canned |ahi |albacore |sushi grade )?tuna( steaks?)?'],
  ['fish', 'White fish', 'p', '(white )?fish( fillets?)?|cod|tilapia|halibut|mahi( mahi)?|catfish|snapper|swai|pollock|haddock|sea bass|flounder|sole|trout'],
  ['crab', 'Crab', 'p', '(imitation |lump |fresh )?crab( meat| legs)?|krab'],
  ['shellfish', 'Shellfish', 'p', 'clams|mussels|scallops|lobster( tails?)?|oysters|calamari|squid|octopus'],
  ['tofu', 'Tofu', 'p', '(firm |extra firm |silken |soft )?tofu|tempeh'],
  ['green beans', 'Green beans', 'v', '(fresh |frozen |canned )?(green beans|string beans|haricots? verts)'],
  ['bean sprouts', 'Bean sprouts', 'v', '(mung )?bean sprouts'],
  ['black beans', 'Black beans', 'p', '(canned )?black beans', 'beans'],
  ['pinto beans', 'Pinto beans', 'p', '(canned )?pinto beans|charro beans|frijoles', 'beans'],
  ['refried beans', 'Refried beans', 'p', 'refried beans', 'beans'],
  ['kidney beans', 'Kidney beans', 'p', '((red|dark red|light red) )?kidney beans', 'beans'],
  ['white beans', 'White beans', 'p', '(cannellini|navy|great northern|white|butter|lima) beans|black eyed peas', 'beans'],
  ['beans', 'Beans', 'p', '(canned |dried |baked |ranch style |chili |pork and )?beans', 'beans'],
  ['chickpeas', 'Chickpeas', 'p', '(canned )?(chickpeas|garbanzo( beans)?)'],
  ['lentils', 'Lentils', 'p', '(red |green |brown |black |french )?lentils|dal|daal'],
  // veggies and fruit
  ['green onions', 'Green onions', 'v', 'green onions?|scallions?|spring onions?|chives'],
  ['onion', 'Onion', 'v', '((yellow|white|red|sweet|vidalia|spanish|large|small|medium|diced|chopped) )*onions?|shallots?|leeks?|pearl onions'],
  ['garlic', 'Garlic', 'v', '(fresh |minced |roasted |chopped )?garlic( cloves?| bulbs?| heads?| paste)?|cloves? (of )?garlic'],
  ['ginger', 'Ginger', 'v', '(fresh |minced |grated )?ginger( root| paste)?'],
  ['chiles', 'Jalapeños or chiles', 'v', '((fresh|pickled|canned|diced|roasted|dried|green) )*(jalapenos?|serranos?|habaneros?|poblanos?|anaheims?|hatch chiles?|fresno( chiles?)?|thai chil(i|e)s?|bird\'?s eye chil(i|e)s?|green chil(i|e)s|chil(i|e) peppers?|chil(i|e)s|scotch bonnets?|chipotles?|guajillos?|anchos?|pasillas?|chiles de arbol|arbol chiles)( peppers?)?', 'chiles'],
  ['bell pepper', 'Bell pepper', 'v', '((red|green|yellow|orange|sweet|mini|mini sweet|large|diced) )*bell peppers?|(red|green|yellow|orange|sweet|mini sweet|mini) peppers?|peppers|capsicum'],
  ['tomatillos', 'Tomatillos', 'v', 'tomatillos?'],
  ['tomatoes', 'Tomatoes', 'v', '((fresh|ripe|roma|plum|cherry|grape|heirloom|beefsteak|large|medium|diced|chopped) )*tomato(es)?', 'tomatoes'],
  ['sweet potatoes', 'Sweet potatoes', 'v', 'sweet potato(es)?|yams?'],
  ['potatoes', 'Potatoes', 'v', '((russet|red|yukon gold|gold|baby|new|fingerling|white|idaho|large|medium) )*potato(es)?|russets|hash browns|tater tots|french fries|(instant )?(mashed )?potato flakes'],
  ['carrots', 'Carrots', 'v', '(baby |shredded |matchstick |large )?carrots?'],
  ['celery', 'Celery', 'v', 'celery( stalks?| ribs?)?'],
  ['broccoli', 'Broccoli', 'v', 'broccoli( florets| crowns)?|broccolini'],
  ['cauliflower', 'Cauliflower', 'v', 'cauliflower( rice| florets)?|riced cauliflower'],
  ['spinach', 'Spinach', 'v', '(baby |fresh |frozen )?spinach'],
  ['kale', 'Kale or greens', 'v', '(baby )?kale|collard greens|collards|swiss chard|chard|mustard greens|turnip greens'],
  ['lettuce', 'Lettuce', 'v', '(romaine |iceberg |butter |shredded )?lettuce|romaine|arugula|salad greens|mixed greens|spring mix'],
  ['cabbage', 'Cabbage', 'v', '(green |red |purple |napa |savoy |shredded )?cabbage|coleslaw mix|slaw mix'],
  ['bok choy', 'Bok choy', 'v', '(baby )?bok choy|pak choi'],
  ['zucchini', 'Zucchini', 'v', 'zucchinis?|courgettes?|yellow squash|summer squash'],
  ['squash', 'Squash or pumpkin', 'v', '(butternut|acorn|spaghetti|delicata|kabocha) squash|pumpkin( puree)?|squash'],
  ['mushrooms', 'Mushrooms', 'v', '((baby bella|cremini|button|white|shiitake|portobello|oyster|dried|sliced) )*mushrooms?'],
  ['corn', 'Corn', 'v', '((sweet|frozen|canned|creamed|fire roasted) )*corn( kernels| on the cob)?|elote|corn cobs?|ears? of corn'],
  ['peas', 'Peas', 'v', '(frozen |green |sweet )?peas|snow peas|snap peas|sugar snap peas|peas and carrots|edamame'],
  ['cucumber', 'Cucumber', 'v', '(english |persian )?cucumbers?'],
  ['avocado', 'Avocado', 'v', '(ripe )?avocados?|guacamole'],
  ['asparagus', 'Asparagus', 'v', 'asparagus'],
  ['brussels sprouts', 'Brussels sprouts', 'v', 'brussels? sprouts'],
  ['eggplant', 'Eggplant', 'v', 'eggplants?|aubergines?'],
  ['radishes', 'Radishes', 'v', 'radish(es)?|daikon'],
  ['lemon', 'Lemon', 'v', 'lemons?( juice| zest| wedges| slices)?|lemon juice'],
  ['lime', 'Lime', 'v', '(key )?limes?( juice| zest| wedges)?'],
  ['orange', 'Orange', 'v', 'oranges?( juice| zest)?|orange juice|mandarin( oranges)?|clementines?'],
  ['apple', 'Apples', 'v', 'apples?|granny smith|honeycrisp|applesauce|apple (juice|cider)'],
  ['banana', 'Bananas', 'v', '(ripe )?bananas?'],
  ['berries', 'Berries', 'v', '(fresh |frozen )?(strawberr(y|ies)|blueberr(y|ies)|raspberr(y|ies)|blackberr(y|ies)|mixed berries|berries|cranberr(y|ies))'],
  ['pineapple', 'Pineapple', 'v', 'pineapple( chunks| tidbits| juice)?'],
  ['mango', 'Mango', 'v', 'mangos?|mangoes'],
  ['peaches', 'Peaches', 'v', 'peach(es)?|nectarines?'],
  // pasta, rice, and bread
  ['rice noodles', 'Rice noodles', 'c', 'rice (noodles|sticks|vermicelli)|vermicelli( noodles)?|pad thai noodles|pho noodles', 'noodles'],
  ['rice paper', 'Rice paper', 'c', 'rice paper( wrappers?| sheets)?'],
  ['wrappers', 'Wonton or egg roll wrappers', 'c', '(wonton|egg roll|spring roll|dumpling|gyoza|potsticker) (wrappers?|skins?)'],
  ['egg noodles', 'Egg noodles', 'c', '(wide |extra wide )?egg noodles', 'noodles'],
  ['pasta', 'Pasta', 'c', '((dry|dried|uncooked|cooked|whole wheat) )*(pasta|spaghetti|penne( pasta)?|rigatoni|fettuccine|fettucine|linguine|macaroni|elbows?( macaroni)?|ziti|rotini|farfalle|bow ties?( pasta)?|orzo|(pasta |jumbo |medium )?shells|lasagna (noodles|sheets)|tortellini|ravioli|gnocchi|angel hair|bucatini|cavatappi|orecchiette|pappardelle|capellini|ditalini|campanelle|fusilli|manicotti)'],
  ['noodles', 'Noodles', 'c', '((ramen|udon|soba|lo mein|chow mein|yakisoba|instant|asian|wheat|stir fry|fresh) )?noodles|ramen|udon|soba', 'noodles'],
  ['rice', 'Rice', 'c', '((white|brown|jasmine|basmati|long grain|short grain|sushi|arborio|cooked|uncooked|leftover|day old|instant|minute) )*rice'],
  ['quinoa', 'Quinoa', 'c', 'quinoa'],
  ['couscous', 'Couscous', 'c', '(pearl )?couscous'],
  ['oats', 'Oats', 'c', '(rolled |old fashioned |quick |steel cut )?oats|oatmeal'],
  ['tortilla chips', 'Tortilla chips', 'c', 'tortilla chips|corn chips|fritos|doritos'],
  ['tortillas', 'Tortillas', 'c', '((flour|corn|street taco|street|soft taco|low carb|whole wheat|small|large|burrito size|fajita size) )*tortillas?|taco shells?|tostadas?( shells)?'],
  ['breadcrumbs', 'Breadcrumbs', 'c', '(panko |italian |seasoned |plain |dry |fresh )?bread ?crumbs|panko'],
  ['biscuits', 'Canned biscuits', 'c', '(refrigerated |canned |flaky |buttermilk )?biscuits?( dough)?|grands|crescent (rolls?|dough|sheets?)'],
  ['pizza dough', 'Pizza dough', 'c', 'pizza (dough|crust)'],
  ['pie crust', 'Pie crust', 'c', '(refrigerated )?pie (crusts?|shells?|dough)|puff pastry|phyllo|filo|graham cracker crust'],
  ['bread', 'Bread', 'c', '((sandwich|french|italian|sourdough|white|wheat|whole wheat|crusty|day old) )?(bread|toast)|(hamburger |hot dog |slider |brioche )?buns?|(dinner|sub|hoagie|hawaiian|brioche|kaiser|bolillo) rolls|baguettes?|ciabatta|brioche|pita( bread)?|naan|english muffins?|bagels?|croissants?|flatbreads?|texas toast|bolillos?'],
  ['cornmeal', 'Cornmeal or masa', 'c', 'corn ?meal|masa( harina)?|polenta|grits|cornbread mix|jiffy( mix)?'],
  // basics most kitchens have
  ['salt', 'Salt', 'b', '(kosher |sea |table |flaky |fine |coarse )?salt'],
  ['pepper', 'Black pepper', 'b', '(freshly )?(cracked |ground )?(black )?pepper|peppercorns'],
  ['water', 'Water', 'b', '(hot |warm |cold |boiling |ice )?water|ice( cubes)?'],
  ['sugar', 'Sugar', 'b', '(granulated |white |cane )?sugar'],
  ['brown sugar', 'Brown sugar', 's', '(light |dark |packed )*brown sugar'],
  ['powdered sugar', 'Powdered sugar', 's', 'powdered sugar|confectioners\'? sugar|icing sugar'],
  ['flour', 'Flour', 'b', '((all purpose|ap|self rising|bread|whole wheat|cake|plain|almond|unbleached) )?flour']
];
const FAMILY = {}, LABEL = {}, KIND = {};
FOODS.forEach(f => { LABEL[f[0]] = f[1]; KIND[f[0]] = f[2]; if (f[4]) FAMILY[f[0]] = f[4]; });
// families where a general word in your kitchen covers the specific kinds ("cheese" covers cheddar or mozzarella)
const LOOSE = new Set(['cheese', 'beans', 'broth', 'chiles', 'tomatoes', 'noodles', 'cream soup']);
const FOOD_RE = FOODS.map(f => [f[0], new RegExp('(?<![a-z])(?:' + f[3] + ')(?![a-z])', 'g')]);

const normFood = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’‘`]/g, '\'').replace(/&/g, ' and ').replace(/[-–—_]/g, ' ').replace(/\s+/g, ' ').trim();
// every food named in a piece of text, longest matches first so they don't overlap
function foodsIn(text) {
  const s = ' ' + normFood(text) + ' ';
  const hits = [];
  for (const [id, re] of FOOD_RE) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) {
      if (!m[0].trim()) { re.lastIndex++; continue; }
      hits.push({ id, a: m.index, b: m.index + m[0].length });
    }
  }
  hits.sort((x, y) => (y.b - y.a) - (x.b - x.a) || x.a - y.a);
  const taken = [], out = [];
  for (const h of hits) {
    if (taken.some(t => h.a < t.b && t.a < h.b)) continue;
    taken.push(h);
    out.push(h);
  }
  return out.sort((x, y) => x.a - y.a).map(h => h.id).filter((id, i, a) => a.indexOf(id) === i);
}
// what you typed into your kitchen list -> {id, name}
function lookupFood(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const ids = foodsIn(t);
  const name = t.charAt(0).toUpperCase() + t.slice(1);
  if (ids.length) return { id: ids[0], name: name.length > 30 ? LABEL[ids[0]] : name };
  return { id: 'x:' + singularWords(t).join(' '), name };
}
const singularWords = s => normFood(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1).map(w => w.length > 4 && /[^s]es$/.test(w) && !/(ves|ies)$/.test(w) ? w.replace(/es$/, '') : w.length > 3 ? w.replace(/(?<!s)s$/, '') : w);
const OPTIONAL = /\b(optional|for (garnish|serving|topping|dipping|the top)|to (serve|garnish)|garnish(es|ing)?|if (desired|you like)|as desired)\b/i;
const EXTRA_HEAD = /garnish|topping|to serve|for serving|optional|extras?|sides?|to finish|drizzle/i;
const UNITS_WORDS = /^(\d[\d\/.,]*|[½¼¾⅓⅔⅛]|a|an|one|two|three|four|five|six|cups?|c|tbsps?|tablespoons?|tsps?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kg|ml|liters?|l|cans?|jars?|packages?|pkgs?|packets?|bags?|boxes?|bunch(es)?|cloves?|sticks?|slices?|pieces?|pinch(es)?|dash(es)?|handfuls?|sprigs?|heads?|large|medium|small|fresh|frozen|thawed|canned|dried|cooked|raw|ripe|chopped|diced|minced|sliced|shredded|grated|boneless|skinless|about|of|to|and|or|plus|x|inch|in|cut|into)$/i;
// the plain name of an ingredient line nothing above recognized: "2 cups frozen edamame, thawed" -> "edamame"
function coreName(line) {
  const t = normFood(line).replace(/\([^)]*\)/g, ' ').split(/,| \- |;|\bfor\b/)[0];
  const words = t.split(/\s+/).filter(Boolean);
  while (words.length && UNITS_WORDS.test(words[0])) words.shift();
  const out = words.join(' ').replace(/[^a-z0-9 '%]/g, '').trim();
  return /[a-z]{3}/.test(out) && out.length <= 40 ? out : '';
}
// one ingredient line -> the foods it needs. "or" lines need just one of them.
function readIngredient(line, underExtra) {
  const s = String(line || '');
  const ids = foodsIn(s);
  const optional = !!underExtra || OPTIONAL.test(s);
  const alt = / or |\/(?![\d])/.test(normFood(s)) && ids.length > 1;
  return { ids, alt, optional, core: ids.length ? '' : coreName(s) };
}
// what's in your kitchen: [{id, name}] plus the basics you always have
function makePantry(items, basics) {
  const ids = new Set(), custom = [];
  (items || []).forEach(x => { if (!x || !x.id) return; if (x.id.indexOf('x:') === 0) custom.push(x.id.slice(2).split(' ')); else ids.add(x.id); });
  const base = new Set((basics || []).filter(Boolean));
  return { ids, base, custom };
}
function pantryHas(P, id) {
  if (P.ids.has(id) || P.base.has(id)) return true;
  const fam = FAMILY[id];
  if (!fam) return false;
  if (id === fam) { for (const x of P.ids) if (FAMILY[x] === fam) return true; return false; }
  return LOOSE.has(fam) && P.ids.has(fam);
}
const customHas = (P, text) => { const w = ' ' + singularWords(text).join(' ') + ' '; return P.custom.some(c => c.length && c.every(x => w.indexOf(' ' + x + ' ') >= 0)); };
// a recipe's ingredient list against your kitchen. The title counts too when it names a meat the
// list forgot ("Korean Popcorn Chicken" with "1.5 lbs boneless, cut into pieces").
function matchRecipe(ingredients, P, title) {
  const groups = new Map(); // key -> {label, have, optional, basic}
  const uses = new Set();
  let extra = false;
  const listed = new Set();
  (ingredients || []).forEach(l => foodsIn(l).forEach(id => listed.add(id)));
  const hasMeat = Array.from(listed).some(id => KIND[id] === 'p');
  const fromTitle = title && !hasMeat ? foodsIn(title).filter(id => KIND[id] === 'p').slice(0, 1) : [];
  fromTitle.concat(ingredients || []).forEach(line => {
    const l = String(line || '');
    if (/^##\s/.test(l)) { extra = EXTRA_HEAD.test(l); return; }
    const r = readIngredient(l, extra);
    const add = (key, label, have, basic) => {
      const g = groups.get(key);
      if (g) { g.have = g.have || have; g.optional = g.optional && r.optional; return; }
      groups.set(key, { label, have, optional: r.optional, basic });
    };
    if (!r.ids.length) {
      if (!r.core || /^(boneless|skinless|meat|protein|vegetables?|veggies|toppings?|garnish|seasonings?|spices?|sauce|filling|marinade|dough|batter)$/.test(r.core)) return;
      const have = customHas(P, l);
      add('x:' + r.core, r.core.charAt(0).toUpperCase() + r.core.slice(1), have, false);
      return;
    }
    const mine = r.ids.filter(id => pantryHas(P, id));
    mine.forEach(id => { if (!P.base.has(id) || P.ids.has(id)) uses.add(id); });
    const cust = !mine.length && customHas(P, l);
    if (r.alt) {
      const basic = r.ids.some(id => P.base.has(id));
      add(r.ids.slice().sort().join('|'), r.ids.map(id => LABEL[id]).join(' or '), !!mine.length || cust, basic);
    } else r.ids.forEach(id => add(id, LABEL[id], pantryHas(P, id) || cust, P.base.has(id) && !P.ids.has(id)));
  });
  let need = 0, have = 0;
  const missing = [];
  groups.forEach(g => {
    if (g.optional || g.basic) return;
    need++;
    if (g.have) have++; else missing.push(g.label);
  });
  const mineUsed = Array.from(uses).filter(id => KIND[id] !== 'b');
  return { need, have, missing, uses: mineUsed, ready: need > 0 && !missing.length, pct: need ? have / need : 0 };
}
// things to tap-add, grouped
const QUICK_FOODS = [
  ['Meat & protein', ['chicken', 'ground beef', 'beef', 'pork', 'bacon', 'sausage', 'ground turkey', 'shrimp', 'salmon', 'fish', 'eggs', 'tofu', 'black beans', 'pinto beans']],
  ['Veggies & fruit', ['onion', 'garlic', 'bell pepper', 'chiles', 'tomatoes', 'potatoes', 'broccoli', 'carrots', 'celery', 'spinach', 'mushrooms', 'corn', 'zucchini', 'avocado', 'lettuce', 'cabbage', 'green onions', 'cilantro', 'lemon', 'lime']],
  ['Dairy', ['cheese', 'milk', 'heavy cream', 'sour cream', 'cream cheese', 'parmesan', 'mozzarella', 'cotija', 'yogurt']],
  ['Rice, pasta & bread', ['rice', 'pasta', 'tortillas', 'bread', 'noodles', 'biscuits', 'tortilla chips', 'oats']],
  ['Sauces & cans', ['chicken broth', 'canned tomatoes', 'tomato sauce', 'pasta sauce', 'salsa', 'enchilada sauce', 'soy sauce', 'bbq sauce', 'hot sauce', 'honey', 'taco seasoning', 'cream of chicken', 'ranch', 'mayo', 'ketchup']]
];
const BASIC_CHOICES = ['salt', 'pepper', 'oil', 'water', 'butter', 'sugar', 'flour', 'garlic powder', 'onion powder', 'brown sugar', 'baking powder', 'baking soda', 'vanilla', 'cumin', 'chili powder', 'paprika', 'oregano', 'italian seasoning', 'cinnamon', 'red pepper flakes', 'soy sauce', 'ketchup', 'mustard', 'mayo', 'vinegar'];
const DEFAULT_BASICS = ['salt', 'pepper', 'oil', 'water', 'butter', 'sugar', 'flour'];
/* ---- end pantry ---- */

module.exports = { FOODS, LABEL, KIND, FAMILY, foodsIn, lookupFood, readIngredient, coreName, makePantry, pantryHas, matchRecipe, QUICK_FOODS, BASIC_CHOICES, DEFAULT_BASICS, normFood, singularWords };
