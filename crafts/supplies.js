/* Artistry supplies: reads the supply list out of a post or project page, guesses the usual supplies when a post
   doesn't list any, and checks them against "My supplies" (what she has at home).
   Used by the app (crafts/index.html loads this file), the post reader (api/idea.js) and the tests
   (node tests/supplies.test.js). Free and on the phone: no AI service. */
(function (root) {
  'use strict';

  // Store sections, in the order a craft store walk usually goes
  const GROUPS = [
    { id: 'paint', name: 'Paint & color', emoji: '🎨' },
    { id: 'brushes', name: 'Brushes & tools', emoji: '🖌️' },
    { id: 'surfaces', name: 'Canvas, paper & surfaces', emoji: '🖼️' },
    { id: 'glue', name: 'Glue, tape & sealers', emoji: '🧴' },
    { id: 'cutting', name: 'Cutting & machines', emoji: '✂️' },
    { id: 'textile', name: 'Yarn, thread & fabric', emoji: '🧶' },
    { id: 'floral', name: 'Floral, ribbon & trims', emoji: '🌸' },
    { id: 'wood', name: 'Wood & hardware', emoji: '🪵' },
    { id: 'beads', name: 'Beads, resin & jewelry', emoji: '💎' },
    { id: 'clay', name: 'Clay & molds', emoji: '🏺' },
    { id: 'candle', name: 'Candle & soap making', emoji: '🕯️' },
    { id: 'basics', name: 'Craft basics', emoji: '📦' }
  ];

  // id, name, group, keywords (longest match wins), fam = things that can stand in for each other,
  // basic = most homes have it (counts as on hand unless she turns "Basics" off)
  const S = (id, name, g, kw, extra) => Object.assign({ id, name, g, kw }, extra || {});
  const SUPPLIES = [
    // paint & color
    S('acrylic', 'Acrylic paint', 'paint', ['acrylic paint', 'acrylic paints', 'acrylics', 'acrylic craft paint', 'craft paint', 'folkart', 'apple barrel', 'liquitex', 'americana paint']),
    S('watercolor', 'Watercolor paint', 'paint', ['watercolor paint', 'watercolor paints', 'watercolors', 'watercolour paint', 'watercolour paints', 'watercolor set', 'watercolor palette']),
    S('gouache', 'Gouache', 'paint', ['gouache', 'himi gouache']),
    S('oilpaint', 'Oil paint', 'paint', ['oil paint', 'oil paints', 'oils']),
    S('spraypaint', 'Spray paint', 'paint', ['spray paint', 'spray paints', 'rustoleum', 'rust oleum', 'krylon']),
    S('chalkpaint', 'Chalk paint', 'paint', ['chalk paint', 'chalk style paint', 'milk paint', 'chalky paint']),
    S('fabricpaint', 'Fabric paint', 'paint', ['fabric paint', 'fabric medium', 'puffy paint']),
    S('glasspaint', 'Glass paint', 'paint', ['glass paint', 'enamel paint', 'gloss enamel', 'multi surface paint', 'multi-surface paint']),
    S('paintpens', 'Paint pens', 'paint', ['paint pen', 'paint pens', 'paint marker', 'paint markers', 'posca', 'posca pens', 'acrylic markers', 'acrylic paint pens']),
    S('markers', 'Markers', 'paint', ['marker', 'markers', 'sharpie', 'sharpies', 'alcohol markers', 'brush pens', 'fineliner', 'fine liner', 'micron pen']),
    S('pencils', 'Colored pencils', 'paint', ['colored pencil', 'colored pencils', 'coloured pencils', 'prismacolor']),
    S('pastels', 'Pastels', 'paint', ['oil pastel', 'oil pastels', 'soft pastels', 'chalk pastels']),
    S('alcoholink', 'Alcohol ink', 'paint', ['alcohol ink', 'alcohol inks']),
    S('ink', 'Ink', 'paint', ['india ink', 'drawing ink', 'calligraphy ink', 'ink pad', 'stamp pad']),
    S('pourmedium', 'Pouring medium', 'paint', ['pouring medium', 'pour medium', 'floetrol', 'liquitex pouring medium', 'flood floetrol']),
    S('siliconeoil', 'Silicone oil', 'paint', ['silicone oil', 'treadmill oil', 'dimethicone']),
    S('glitter', 'Glitter', 'paint', ['glitter', 'chunky glitter', 'fine glitter']),
    S('mica', 'Mica powder', 'paint', ['mica powder', 'mica powders', 'pigment powder', 'metallic powder']),
    S('goldleaf', 'Gold leaf', 'paint', ['gold leaf', 'gold leafing', 'gilding', 'metal leaf', 'silver leaf']),
    S('texture', 'Texture paste', 'paint', ['texture paste', 'modeling paste', 'modelling paste', 'gesso', 'joint compound', 'spackle', 'baking soda paint']),
    S('stain', 'Wood stain', 'paint', ['wood stain', 'stain', 'minwax', 'gel stain']),
    // brushes & tools
    S('brushes', 'Paintbrushes', 'brushes', ['paintbrush', 'paintbrushes', 'paint brush', 'paint brushes', 'brush set', 'brushes', 'flat brush', 'round brush', 'detail brush', 'liner brush', 'fan brush', 'filbert']),
    S('foambrush', 'Foam brushes', 'brushes', ['foam brush', 'foam brushes', 'sponge brush', 'sponge brushes']),
    S('sponge', 'Sponges', 'brushes', ['sponge', 'sponges', 'makeup sponge', 'sea sponge', 'pouncer', 'pouncers', 'dauber', 'daubers']),
    S('paletteknife', 'Palette knife', 'brushes', ['palette knife', 'palette knives', 'painting knife']),
    S('dotting', 'Dotting tools', 'brushes', ['dotting tool', 'dotting tools', 'dotting kit', 'dot tools']),
    S('stencils', 'Stencils', 'brushes', ['stencil', 'stencils']),
    S('palette', 'Paint palette', 'brushes', ['paint palette', 'mixing palette', 'paper plate'], { basic: true }),
    S('watercup', 'Water cup', 'brushes', ['water cup', 'water jar', 'cup of water'], { basic: true }),
    S('papertowels', 'Paper towels', 'brushes', ['paper towel', 'paper towels', 'rag', 'rags', 'baby wipes'], { basic: true }),
    S('easel', 'Easel', 'brushes', ['easel', 'table easel', 'tabletop easel']),
    S('hairdryer', 'Hair dryer', 'brushes', ['hair dryer', 'blow dryer'], { basic: true }),
    S('heatgun', 'Heat gun or torch', 'brushes', ['heat gun', 'embossing gun', 'torch', 'kitchen torch', 'creme brulee torch']),
    S('cups', 'Plastic cups', 'brushes', ['plastic cup', 'plastic cups', 'mixing cups', 'mixing cup', 'solo cups', 'dixie cups', 'flip cup'], { fam: 'cups' }),
    S('stirsticks', 'Stir sticks', 'brushes', ['stir stick', 'stir sticks', 'popsicle stick', 'popsicle sticks', 'craft sticks', 'craft stick', 'tongue depressor']),
    S('gloves', 'Gloves', 'brushes', ['gloves', 'nitrile gloves', 'disposable gloves']),
    S('pencil', 'Pencil', 'brushes', ['pencil', 'pencils', 'graphite pencil', 'eraser'], { basic: true }),
    S('ruler', 'Ruler', 'brushes', ['ruler', 'measuring tape', 'tape measure', 'yardstick'], { basic: true }),
    S('transferpaper', 'Transfer paper', 'brushes', ['transfer paper', 'graphite paper', 'carbon paper', 'saral']),
    // canvas, paper & surfaces
    S('canvas', 'Canvas', 'surfaces', ['canvas', 'canvases', 'stretched canvas', 'canvas panel', 'canvas panels', 'canvas board', 'canvas boards', 'mini canvas', 'mini canvases', 'canvas pad'], { fam: 'canvas' }),
    S('wcpaper', 'Watercolor paper', 'surfaces', ['watercolor paper', 'watercolour paper', 'cold press paper', 'cold pressed paper', 'hot press paper', 'arches paper', 'canson xl']),
    S('sketchbook', 'Sketchbook', 'surfaces', ['sketchbook', 'sketch book', 'sketch pad', 'drawing paper', 'mixed media paper', 'mixed media pad']),
    S('cardstock', 'Cardstock', 'surfaces', ['cardstock', 'card stock', 'card stocks']),
    S('scrapbook', 'Patterned paper', 'surfaces', ['scrapbook paper', 'patterned paper', 'pattern paper', 'printed paper', 'paper pad']),
    S('construction', 'Construction paper', 'surfaces', ['construction paper', 'colored paper']),
    S('tissue', 'Tissue paper', 'surfaces', ['tissue paper', 'crepe paper', 'crepe paper streamers']),
    S('printer', 'Printer paper', 'surfaces', ['printer paper', 'copy paper', 'printable', 'printables', 'printer'], { basic: true }),
    S('rocks', 'Smooth rocks', 'surfaces', ['smooth rocks', 'smooth rock', 'river rock', 'river rocks', 'rocks', 'stones', 'pebbles', 'beach stones']),
    S('woodslice', 'Wood slices', 'surfaces', ['wood slice', 'wood slices', 'wood round', 'wood rounds', 'tree slice', 'log slice']),
    S('jar', 'Mason jar', 'surfaces', ['mason jar', 'mason jars', 'glass jar', 'glass jars', 'jar', 'jars', 'ball jar']),
    S('glass', 'Glass (vase, glasses)', 'surfaces', ['wine glass', 'wine glasses', 'glass vase', 'vase', 'vases', 'glass block', 'glass bottle', 'glass bottles', 'wine bottle', 'wine bottles', 'glass ornament', 'clear ornaments', 'plastic ornaments']),
    S('mug', 'Ceramic mug', 'surfaces', ['ceramic mug', 'ceramic mugs', 'mug', 'mugs', 'ceramic plate', 'ceramic tile', 'tiles']),
    S('pot', 'Terracotta pot', 'surfaces', ['terracotta pot', 'terracotta pots', 'clay pot', 'clay pots', 'flower pot', 'flower pots', 'terra cotta']),
    S('pumpkin', 'Pumpkin (real or craft)', 'surfaces', ['pumpkin', 'pumpkins', 'craft pumpkin', 'craft pumpkins', 'foam pumpkin', 'faux pumpkin', 'faux pumpkins', 'gourd', 'gourds']),
    S('blank', 'Blank item to decorate', 'surfaces', ['tote bag', 'blank tote', 'blank shirt', 'blank tee', 'blank tees', 't-shirt', 'tshirt', 't shirt', 'blank tumbler', 'tumbler', 'canvas bag', 'sneakers', 'denim jacket']),
    S('cardboard', 'Cardboard', 'surfaces', ['cardboard', 'cereal box', 'shoe box', 'toilet paper roll', 'toilet paper rolls', 'paper towel roll', 'egg carton'], { basic: true }),
    S('foamboard', 'Foam board', 'surfaces', ['foam board', 'foam core', 'poster board']),
    S('foamsheets', 'Craft foam sheets', 'surfaces', ['foam sheet', 'foam sheets', 'craft foam', 'eva foam']),
    // glue, tape & sealers
    S('modpodge', 'Mod Podge', 'glue', ['mod podge', 'modge podge', 'decoupage glue', 'decoupage medium']),
    S('hotglue', 'Hot glue gun & sticks', 'glue', ['hot glue', 'hot glue gun', 'glue gun', 'glue sticks for glue gun', 'hot glue sticks', 'low temp glue gun']),
    S('craftglue', 'Craft glue', 'glue', ['craft glue', 'tacky glue', 'aleenes', 'aleene s', 'white glue', 'elmers glue', 'elmer s glue', 'school glue', 'glue', 'pva glue'], { fam: 'glue' }),
    S('gluestick', 'Glue stick', 'glue', ['glue stick', 'glue sticks'], { basic: true }),
    S('e6000', 'E6000 or strong glue', 'glue', ['e6000', 'e 6000', 'super glue', 'gorilla glue', 'epoxy glue', 'strong glue', 'jewelry glue', 'gem glue']),
    S('woodglue', 'Wood glue', 'glue', ['wood glue', 'titebond']),
    S('spraymount', 'Spray adhesive', 'glue', ['spray adhesive', 'spray glue', 'spray mount', 'super 77']),
    S('tape', 'Tape', 'glue', ['tape', 'scotch tape', 'clear tape', 'double sided tape', 'double-sided tape', 'washi tape', 'masking tape'], { basic: true }),
    S('paintertape', 'Painter’s tape', 'glue', ['painters tape', 'painter s tape', 'painter’s tape', 'frog tape', 'frogtape', 'blue tape']),
    S('sealer', 'Sealer / clear coat', 'glue', ['sealer', 'sealant', 'clear coat', 'clear sealer', 'varnish', 'polyurethane', 'polycrylic', 'mod podge spray', 'outdoor sealer', 'clear acrylic sealer', 'gloss varnish', 'matte varnish', 'top coat']),
    S('gluedots', 'Glue dots', 'glue', ['glue dots', 'glue dot', 'foam tape', 'foam squares', 'foam adhesive']),
    // cutting & machines
    S('scissors', 'Scissors', 'cutting', ['scissors', 'shears', 'fabric scissors'], { basic: true }),
    S('craftknife', 'Craft knife', 'cutting', ['craft knife', 'exacto', 'x-acto', 'xacto', 'utility knife', 'box cutter']),
    S('cuttingmat', 'Cutting mat', 'cutting', ['cutting mat', 'self healing mat']),
    S('cricut', 'Cricut or cutting machine', 'cutting', ['cricut', 'cricut maker', 'cricut explore', 'cricut joy', 'silhouette cameo', 'cutting machine', 'cricut machine']),
    S('vinyl', 'Adhesive vinyl', 'cutting', ['vinyl', 'adhesive vinyl', 'permanent vinyl', 'removable vinyl', 'oracal', 'oracal 651']),
    S('htv', 'Iron-on (HTV)', 'cutting', ['htv', 'iron on', 'iron-on', 'heat transfer vinyl', 'iron on vinyl', 'infusible ink']),
    S('transfertape', 'Transfer tape', 'cutting', ['transfer tape']),
    S('weeding', 'Weeding tool', 'cutting', ['weeding tool', 'weeding tools', 'weeder']),
    S('heatpress', 'Heat press or iron', 'cutting', ['heat press', 'easypress', 'easy press', 'iron', 'mini press']),
    S('sublimation', 'Sublimation printer & paper', 'cutting', ['sublimation', 'sublimation printer', 'sublimation paper']),
    S('hole', 'Hole punch', 'cutting', ['hole punch', 'paper punch', 'circle punch']),
    S('woodburner', 'Wood burning tool', 'cutting', ['wood burning tool', 'wood burner', 'pyrography pen', 'woodburning tool']),
    S('drill', 'Drill', 'cutting', ['drill', 'power drill', 'drill bit']),
    S('saw', 'Saw', 'cutting', ['saw', 'miter saw', 'jigsaw', 'hand saw', 'coping saw']),
    // yarn, thread & fabric
    S('yarn', 'Yarn', 'textile', ['yarn', 'worsted yarn', 'chunky yarn', 'acrylic yarn', 'cotton yarn', 'velvet yarn', 'chenille yarn']),
    S('crochethook', 'Crochet hook', 'textile', ['crochet hook', 'crochet hooks', 'hook size', 'mm hook']),
    S('needles', 'Knitting needles', 'textile', ['knitting needles', 'knitting needle', 'circular needles']),
    S('yarnneedle', 'Yarn needle', 'textile', ['yarn needle', 'tapestry needle', 'darning needle']),
    S('stuffing', 'Fiberfill stuffing', 'textile', ['fiberfill', 'fiber fill', 'stuffing', 'poly fil', 'polyfil']),
    S('safetyeyes', 'Safety eyes', 'textile', ['safety eyes']),
    S('macrame', 'Macramé cord', 'textile', ['macrame cord', 'macramé cord', 'macrame rope', 'cotton cord', 'cotton rope']),
    S('fabric', 'Fabric', 'textile', ['fabric', 'cotton fabric', 'fat quarter', 'fat quarters', 'flannel', 'fleece', 'muslin', 'canvas fabric']),
    S('felt', 'Felt', 'textile', ['felt', 'felt sheets', 'wool felt']),
    S('thread', 'Needle & thread', 'textile', ['needle and thread', 'thread', 'sewing needle', 'needle'], { basic: true }),
    S('floss', 'Embroidery floss', 'textile', ['embroidery floss', 'floss', 'embroidery thread', 'dmc']),
    S('hoop', 'Embroidery hoop', 'textile', ['embroidery hoop', 'embroidery hoops', 'hoop', 'hoops', 'wooden hoop']),
    S('sewingmachine', 'Sewing machine', 'textile', ['sewing machine']),
    S('pins', 'Pins or clips', 'textile', ['sewing pins', 'straight pins', 'wonder clips', 'clips', 'binder clips']),
    S('elastic', 'Elastic', 'textile', ['elastic', 'elastic band']),
    S('punchneedle', 'Punch needle', 'textile', ['punch needle', 'monks cloth', 'tufting gun']),
    // floral, ribbon & trims
    S('wreathform', 'Wreath form', 'floral', ['wreath form', 'wreath frame', 'wire wreath', 'wire wreath form', 'wire wreath frame', 'grapevine wreath', 'foam wreath', 'wreath base']),
    S('faux', 'Faux flowers & greenery', 'floral', ['faux flowers', 'faux flower', 'silk flowers', 'artificial flowers', 'faux greenery', 'greenery', 'faux florals', 'florals', 'eucalyptus stems', 'flower stems', 'picks', 'floral picks', 'faux leaves']),
    S('dried', 'Dried flowers', 'floral', ['dried flowers', 'dried flower', 'pressed flowers', 'pressed flower', 'dried florals']),
    S('floralwire', 'Floral wire', 'floral', ['floral wire', 'craft wire', 'wire']),
    S('floraltape', 'Floral tape', 'floral', ['floral tape']),
    S('floralfoam', 'Floral foam', 'floral', ['floral foam', 'styrofoam', 'oasis foam', 'foam block']),
    S('wirecutters', 'Wire cutters', 'floral', ['wire cutters', 'wire cutter', 'pliers']),
    S('ribbon', 'Ribbon', 'floral', ['ribbon', 'ribbons', 'wired ribbon', 'satin ribbon']),
    S('burlap', 'Burlap', 'floral', ['burlap', 'burlap ribbon', 'jute ribbon', 'deco mesh', 'mesh ribbon']),
    S('twine', 'Twine or string', 'floral', ['twine', 'jute', 'jute twine', 'string', 'bakers twine', 'baker s twine', 'raffia']),
    S('lights', 'Lights (fairy or tea lights)', 'floral', ['fairy lights', 'string lights', 'led lights', 'battery lights', 'tea lights', 'tea light', 'tealights', 'tealight', 'led candles', 'led candle', 'flameless candle', 'flameless candles']),
    S('pompoms', 'Pom poms', 'basics', ['pom pom', 'pom poms', 'pompom', 'pompoms']),
    S('pipecleaners', 'Pipe cleaners', 'basics', ['pipe cleaner', 'pipe cleaners', 'chenille stems', 'chenille stem']),
    S('googly', 'Googly eyes', 'basics', ['googly eyes', 'googly eye', 'wiggle eyes']),
    S('buttons', 'Buttons', 'basics', ['buttons']),
    S('rhinestones', 'Rhinestones', 'beads', ['rhinestone', 'rhinestones', 'gems', 'flatback gems', 'bling']),
    // wood & hardware
    S('wood', 'Wood board', 'wood', ['wood board', 'wooden board', 'plywood', 'pine board', 'pallet wood', 'pallet', 'scrap wood', 'wood plank', 'wood planks', 'wood sign', 'wooden sign', 'unfinished wood', 'wood cutouts', 'wood cutout', 'wood shapes', 'dowel', 'dowels', 'wood beads', 'wooden beads', 'crate', 'wood crate']),
    S('sandpaper', 'Sandpaper', 'wood', ['sandpaper', 'sanding block', 'sanding sponge', 'sander']),
    S('nails', 'Nails or screws', 'wood', ['nails', 'screws', 'nail gun', 'brad nailer', 'hammer']),
    S('hanger', 'Picture hanger', 'wood', ['sawtooth hanger', 'picture hanger', 'hanging hardware', 'command strips', 'command hooks']),
    S('frame', 'Picture frame', 'wood', ['picture frame', 'picture frames', 'frame', 'frames', 'shadow box']),
    // beads, resin & jewelry
    S('resin', 'Epoxy resin', 'beads', ['epoxy resin', 'resin', 'art resin', 'casting resin', 'deep pour resin', 'let s resin', 'lets resin', 'two part resin']),
    S('uvresin', 'UV resin & lamp', 'beads', ['uv resin', 'uv lamp', 'uv light']),
    S('molds', 'Silicone molds', 'beads', ['silicone mold', 'silicone molds', 'mold', 'molds', 'resin mold', 'resin molds']),
    S('resincolor', 'Resin pigment', 'beads', ['resin pigment', 'resin dye', 'pigment paste', 'alcohol ink for resin']),
    S('beads', 'Beads', 'beads', ['beads', 'bead', 'seed beads', 'clay beads', 'heishi beads', 'letter beads', 'pony beads', 'perler beads', 'crystal beads', 'glass beads']),
    S('cord', 'Bracelet cord or wire', 'beads', ['stretch cord', 'elastic cord', 'stretchy cord', 'beading wire', 'jewelry wire', 'beading thread', 'chain']),
    S('findings', 'Jewelry findings', 'beads', ['jump rings', 'jump ring', 'earring hooks', 'ear wires', 'clasps', 'lobster clasp', 'crimp beads', 'keychain rings', 'key rings', 'keychain ring', 'charms', 'charm']),
    S('jewelrypliers', 'Jewelry pliers', 'beads', ['jewelry pliers', 'round nose pliers', 'chain nose pliers', 'flat nose pliers']),
    // clay & molds
    S('polymer', 'Polymer clay', 'clay', ['polymer clay', 'sculpey', 'fimo', 'premo']),
    S('airdry', 'Air-dry clay', 'clay', ['air dry clay', 'air-dry clay', 'das clay', 'crayola model magic', 'model magic', 'paper clay', 'self hardening clay']),
    S('claytools', 'Clay tools', 'clay', ['clay tools', 'clay cutters', 'clay cutter', 'sculpting tools', 'rolling pin', 'acrylic roller', 'clay roller']),
    S('oven', 'Oven', 'clay', ['oven', 'bake at', 'baking sheet'], { basic: true }),
    // candle & soap making
    S('wax', 'Candle wax', 'candle', ['soy wax', 'candle wax', 'beeswax', 'paraffin', 'coconut wax', 'wax']),
    S('wicks', 'Wicks', 'candle', ['wick', 'wicks', 'wooden wicks', 'cotton wicks', 'wick stickers', 'wick holder', 'wick centering']),
    S('fragrance', 'Fragrance or essential oil', 'candle', ['fragrance oil', 'fragrance oils', 'essential oil', 'essential oils', 'scent']),
    S('container', 'Candle containers', 'candle', ['candle jar', 'candle jars', 'candle tin', 'candle tins', 'candle vessel', 'vessels']),
    S('pourpot', 'Pouring pitcher', 'candle', ['pouring pitcher', 'pouring pot', 'double boiler', 'melting pot']),
    S('thermometer', 'Thermometer', 'candle', ['thermometer']),
    S('soapbase', 'Melt & pour soap base', 'candle', ['soap base', 'melt and pour', 'glycerin soap', 'goat milk soap base', 'shea butter soap base']),
    S('dye', 'Candle or soap dye', 'candle', ['candle dye', 'soap dye', 'soap colorant', 'dye chips', 'dye block']),
    S('bathbomb', 'Bath bomb supplies', 'candle', ['citric acid', 'epsom salt', 'bath bomb mold', 'bath bomb molds'])
  ];
  const byId = id => SUPPLIES.find(s => s.id === id) || null;
  const groupOf = id => { const s = byId(id); return s ? s.g : 'basics'; };
  const groupInfo = gid => GROUPS.find(g => g.id === gid) || GROUPS[GROUPS.length - 1];

  // What a project of each kind usually needs, when the post doesn't list its supplies
  const LIKELY = {
    'painting:acrylic': ['acrylic', 'brushes', 'canvas'],
    'painting:watercolor': ['watercolor', 'wcpaper', 'brushes'],
    'painting:pour': ['acrylic', 'pourmedium', 'cups', 'canvas'],
    'painting:rock': ['rocks', 'acrylic', 'paintpens', 'sealer'],
    'painting:dot': ['dotting', 'acrylic'],
    'painting:objects': ['acrylic', 'brushes', 'sealer'],
    'painting:oil': ['oilpaint', 'brushes', 'canvas'],
    'painting:gouache': ['gouache', 'wcpaper', 'brushes'],
    'painting:spray': ['spraypaint', 'stencils'],
    'painting:furniture': ['chalkpaint', 'sandpaper', 'brushes', 'sealer'],
    'painting:wall': ['acrylic', 'brushes', 'paintertape'],
    'painting:drawing': ['sketchbook', 'pencil'],
    'painting:kids': ['acrylic', 'brushes'],
    'craft:wood': ['wood', 'sandpaper', 'acrylic'],
    'craft:paper': ['cardstock', 'scissors', 'craftglue'],
    'craft:resin': ['resin', 'molds', 'cups', 'gloves'],
    'craft:cricut': ['cricut', 'vinyl', 'transfertape', 'weeding'],
    'craft:sewing': ['fabric', 'thread', 'scissors'],
    'craft:yarn': ['yarn', 'crochethook', 'yarnneedle'],
    'craft:jewelry': ['beads', 'cord'],
    'craft:clay': ['polymer', 'claytools'],
    'craft:candles': ['wax', 'wicks', 'container', 'fragrance'],
    'craft:florals': ['wreathform', 'faux', 'hotglue'],
    'craft:glass': ['glass', 'e6000'],
    'craft:decor': ['hotglue'],
    'craft:upcycle': ['hotglue', 'acrylic'],
    'craft:diamond': []
  };

  function prep(text) {
    const lower = String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[’']/g, ' ');
    return ' ' + lower.replace(/[^a-z0-9]+/g, ' ') + ' ';
  }
  const kp = k => prep(k).trim();
  // every keyword once, longest first, so "acrylic paint pens" beats "acrylic paint"
  const KW = [];
  for (const s of SUPPLIES) for (const k of s.kw) KW.push({ w: kp(k), id: s.id });
  KW.sort((a, b) => b.w.length - a.w.length);
  const has = (T, w) => T.includes(' ' + w + ' ') || T.includes(' ' + w + 's ') || T.includes(' ' + w + 'es ');

  // The known supply a line or typed word means (longest match), or null
  function lookup(text) {
    const T = prep(text);
    for (const k of KW) if (has(T, k.w)) return byId(k.id);
    return null;
  }
  // Every known supply named anywhere in some text (each once, no overlaps: "acrylic paint pens" isn't also "acrylic paint")
  function findAll(text, withWords) {
    let T = prep(text);
    const out = [], words = {}, pos = {};
    for (const k of KW) {
      if (!has(T, k.w)) continue;
      if (!out.includes(k.id)) { out.push(k.id); words[k.id] = k.w; pos[k.id] = T.indexOf(' ' + k.w); }
      // blank out the words (same length, so later positions stay true) so "acrylic paint pens" isn't also "acrylic paint"
      for (const end of [' ', 's ', 'es ']) T = T.split(' ' + k.w + end).join(' ' + '·'.repeat(k.w.length + end.length - 1) + ' ');
    }
    out.sort((a, b) => pos[a] - pos[b]);
    return withWords ? out.map(id => ({ id, w: words[id] })) : out;
  }

  const HEAD = /^(?:supplies|supply list|craft supplies|art supplies|materials|materials needed|materials used|materials list|what you ll need|what you will need|what you need|what i used|you ll need|you will need|youll need|things you ll need|things you need|tools and materials|tools and supplies|supplies and tools|tools|items used|products used|products i used|what s needed|whats needed|stuff you ll need|gather|ingredients|for this you ll need|for this project you ll need)\b/;
  const STOP = /^(?:instructions|directions|steps|step 1|how to|how to make|method|tutorial|let s|lets|notes|tips|follow|save this|comment|shop|link in bio|#)\b/;
  const BULLET = /^[\s\-–—•*·▪►▶→✓✔☑✅✨⭐️🌟🔸🔹💛❤️♡>]+|^\d{1,2}[.)]\s+/u;

  // a supply line: drop bullets, amounts, sizes, links and shop talk, keep the thing
  function cleanLine(line) {
    let s = String(line || '').replace(/https?:\/\/\S+/g, ' ').replace(BULLET, '').replace(/\p{Extended_Pictographic}/gu, ' ');
    s = s.replace(/\((?:[^)]*(?:amazon|link|affiliate|optional|similar|here|dollar tree|walmart|michaels|hobby lobby|target|joann)[^)]*)\)/gi, ' ').replace(/\(\s*\)?\s*$|\(\s*\)/g, ' ');
    s = s.replace(/^\s*(?:\d+[\d\s/.,-]*|one|two|three|four|five|six|a few|a couple of|a|an|some|several)\s+(?:x\s+)?/i, '');
    s = s.replace(/^\s*(?:\d+(?:\.\d+)?\s*)?(?:oz|ounces?|ml|lbs?|pounds?|inch(?:es)?|in\.?|"|ft|feet|yards?|yds?|pcs|pieces?|packs?|pkgs?|sheets?|sticks?|bottles?|cans?|tubes?|bags?|rolls?|sets?|skeins?|balls?|cups?|tbsp|tsp|g|kg|mm|cm)\b\.?\s*(?:of\s+)?/i, '');
    s = s.replace(/\s+/g, ' ').replace(/^[\s:,.;-]+|[\s:,.;-]+$/g, '').trim();
    if (s.length > 70) s = s.slice(0, 70).replace(/\s+\S*$/, '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }
  const COLORS = /^(?:red|orange|yellow|green|blue|purple|pink|black|white|brown|gr[ae]y|gold|silver|teal|navy|magenta|cyan|turquoise|beige|cream|ivory|maroon|violet|lavender|metallic|neon|pastel|colors?|colours?)\)?$/i;
  const junkLine = s => !s || s.length < 3 || COLORS.test(s) || /^(?:and|or|optional|etc|more|see|the|any)$/i.test(s) || /\b(?:follow|subscribe|like and|link in bio|comment|tag a friend|shop my|use code|discount|giveaway|affiliate)\b/i.test(s);

  // The supply list a caption or page text spells out under a "Supplies" / "Materials" / "You'll need" heading.
  function listed(text) {
    const lines = String(text || '').replace(/\r/g, '').split(/\n|(?<=\S)\s{2,}(?=\S)/);
    const out = [];
    let on = false, blank = 0;
    for (let raw of lines) {
      const plain = prep(raw.replace(BULLET, '')).trim();
      if (!plain) { if (on && ++blank >= 2) on = false; continue; }
      blank = 0;
      const head = plain.match(HEAD);
      if (head) {
        on = true;
        // "Supplies: acrylic paint, canvas, brushes" on one line
        const colon = raw.search(/[:–—]/);
        const rest = colon > -1 && colon < 50 ? raw.slice(colon + 1) : raw.replace(/^[^:–—-]*?(?:supplies|supply list|materials(?: needed| used| list)?|need|used|tools(?: and \w+)?|ingredients|gather)\s*-?\s*/i, '');
        if (rest && rest !== raw) for (const part of splitInline(rest)) { const c = cleanLine(part); if (!junkLine(c)) out.push(c); }
        continue;
      }
      if (!on) continue;
      if (STOP.test(plain) || /^#\w/.test(raw.trim())) { on = false; continue; }
      if (raw.length > 110 && !/[,;•]/.test(raw)) { on = false; continue; } // a sentence of directions, not a list
      // commas inside "(magenta, orange, black)" describe one supply; commas outside separate supplies
      const outside = raw.replace(/\([^)]*\)/g, '');
      for (const part of /[,;•|]/.test(outside) && !/\d\s*,\s*\d/.test(outside) ? splitInline(outside) : [raw]) { const c = cleanLine(part); if (!junkLine(c)) out.push(c); }
      if (out.length > 30) break;
    }
    const seen = new Set();
    return out.filter(s => { const k = s.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  }
  function splitInline(s) {
    // stop at where the directions start ("Steps:", "How to:") or the hashtags
    const cut = s.search(/\b(?:steps|instructions|directions|how to|method|tutorial)\s*[:–—-]|\s#\w/i);
    if (cut > 0) s = s.slice(0, cut);
    return s.split(/\s*(?:,|;|•|\||\band\b(?=[^,]*$))\s*/i).filter(Boolean);
  }

  /* Everything a project needs: [{ id, name, g, from: 'list'|'post'|'likely', basic }]
     post = { title, caption, supplies: [lines from the page], type, category } */
  function gather(post) {
    post = post || {};
    const out = [], ids = new Set();
    const add = (id, name, from) => {
      if (id && ids.has(id)) return;
      if (!id && out.some(x => !x.id && x.name.toLowerCase() === name.toLowerCase())) return;
      const s = id ? byId(id) : null;
      if (id) ids.add(id);
      out.push({ id: id || null, name: s ? s.name : name, line: name, g: s ? s.g : 'basics', from, basic: !!(s && s.basic) });
    };
    const lines = (post.supplies || []).concat(listed(post.caption || ''));
    for (const line of lines) {
      const found = findAll(line);
      if (found.length) for (const id of found) add(id, line, 'list');
      else if (line.length <= 48 && !/[.!?]$/.test(line)) add(null, line, 'list');
    }
    // named in the title or caption even without a list ("acrylics on a 5x7 canvas board")
    for (const m of findAll((post.title || '') + '\n' + (post.caption || ''), true)) if (!ids.has(m.id) && !isWeak(m, post)) add(m.id, byId(m.id).name, 'post');
    // said out loud in the video (TikTok's speech-to-text)
    for (const it of spoken(post.speech, post)) add(it.id, it.name, 'said');
    if (out.filter(x => !x.basic).length < 2) {
      for (const id of LIKELY[(post.type || '') + ':' + (post.category || '')] || []) add(id, byId(id).name, 'likely');
    }
    return out.slice(0, 30);
  }
  // Supplies said out loud in a video (TikTok's own speech-to-text). Clear names count anywhere; words that name a
  // supply only sometimes ("jar", "canvas", "rocks") count when they come right after "you'll need", "I'm using",
  // "grab"… Talk is loose, so a few words never count on their own ("I saw", "oils", "iron").
  const CUE = / (?:you ll need|you will need|you re gonna need|you re going to need|you need|you re gonna want|i m using|i m gonna use|i m going to use|i used|i use|we re using|we used|grab|grabbed|go ahead and get|supplies|materials|i got) /g;
  const NOT_SAID = new Set(['saw', 'iron', 'oils', 'torch', 'printable', 'printables', 'printer', 'rag', 'rags', 'stones', 'oven']);
  function spoken(text, post) {
    post = post || {};
    const T = prep(text);
    if (T.trim().length < 3) return [];
    const near = new Set();
    let m;
    CUE.lastIndex = 0;
    while ((m = CUE.exec(T))) {
      let end = Math.min(T.length, m.index + m[0].length + 110);
      while (end < T.length && T[end] !== ' ') end++;
      for (const id of findAll(T.slice(m.index, end + 1))) near.add(id);
      CUE.lastIndex = m.index + m[0].length - 1;
    }
    const out = [];
    for (const f of findAll(T, true)) {
      if (NOT_SAID.has(f.w)) continue;
      if (ONLY_FOR[f.id] ? ONLY_FOR[f.id] !== (post.type + ':' + post.category) : (!near.has(f.id) && isWeak(f, post))) continue;
      const s = byId(f.id);
      out.push({ id: f.id, name: s.name, line: s.name, g: s.g, from: 'said', basic: !!s.basic });
    }
    return out.slice(0, 15);
  }
  // words that name a supply only sometimes: "iron" (heat press) in "wrought iron", "wax" in "wax paper"…
  const WEAK = new Set(['heatpress', 'oven', 'printer', 'pins', 'frame', 'tape', 'thread', 'floralwire', 'glass', 'jar', 'mug', 'pumpkin', 'blank', 'rocks', 'wood', 'wax', 'molds', 'hoop', 'drill', 'saw', 'elastic', 'twine', 'fragrance', 'buttons', 'lights', 'faux', 'beads', 'sponge', 'cups', 'canvas', 'fabric', 'stain', 'craftglue', 'palette']);
  // only from a supply list, or for the one kind of project they're the canvas for
  const ONLY_FOR = { pumpkin: 'painting:objects', blank: 'painting:objects' };
  function isWeak(m, post) {
    const id = m.id;
    if (ONLY_FOR[id]) return ONLY_FOR[id] !== (post.type + ':' + post.category);
    if (!WEAK.has(id) || m.w.includes(' ')) return false; // two-word names ("canvas board", "tea lights") are clear enough
    // the thing the project is made on still counts when it's what the post is about ("painted rocks", "mason jar lantern")
    const s = byId(id);
    if (!['surfaces', 'textile', 'floral', 'beads', 'candle', 'wood', 'paint'].includes(s.g)) return true;
    const t = prep(post.title || '');
    return !s.kw.some(k => has(t, kp(k)));
  }

  /* What she has. stash = { have: [ids], custom: [names], basics: true/false }
     → { need: n, have: n, missing: [items], ready: bool } (basics count as on hand unless turned off) */
  function check(items, stash) {
    stash = stash || {};
    const have = new Set(stash.have || []);
    const fams = new Set((stash.have || []).map(id => (byId(id) || {}).fam).filter(Boolean));
    const custom = (stash.custom || []).map(x => prep(x).trim());
    const basics = stash.basics !== false;
    const out = { need: 0, have: 0, missing: [], haveItems: [] };
    for (const it of items || []) {
      out.need++;
      const s = it.id ? byId(it.id) : null;
      const ok = (it.id && have.has(it.id)) || (s && s.fam && fams.has(s.fam)) || (basics && it.basic) || custom.some(c => c && (prep(it.name).includes(' ' + c + ' ') || (it.line && prep(it.line).includes(' ' + c + ' '))));
      if (ok) { out.have++; out.haveItems.push(it); } else out.missing.push(it);
    }
    out.ready = out.need > 0 && !out.missing.length;
    return out;
  }

  // Common supplies to tap on the My supplies page, by store section
  const COMMON = ['acrylic', 'watercolor', 'paintpens', 'spraypaint', 'chalkpaint', 'markers', 'glitter', 'pourmedium', 'brushes', 'foambrush', 'sponge', 'dotting', 'stencils', 'paletteknife', 'easel', 'canvas', 'wcpaper', 'sketchbook', 'cardstock', 'rocks', 'woodslice', 'jar', 'pot', 'modpodge', 'hotglue', 'craftglue', 'e6000', 'paintertape', 'sealer', 'craftknife', 'cricut', 'vinyl', 'htv', 'transfertape', 'weeding', 'heatpress', 'yarn', 'crochethook', 'felt', 'fabric', 'floss', 'hoop', 'sewingmachine', 'wreathform', 'faux', 'ribbon', 'burlap', 'floralwire', 'twine', 'lights', 'wood', 'sandpaper', 'woodburner', 'drill', 'resin', 'molds', 'uvresin', 'beads', 'cord', 'findings', 'polymer', 'airdry', 'claytools', 'wax', 'wicks', 'fragrance', 'soapbase', 'pompoms', 'pipecleaners', 'googly', 'rhinestones'];

  const API = { GROUPS, SUPPLIES, LIKELY, COMMON, byId, groupOf, groupInfo, lookup, findAll, listed, cleanLine, gather, spoken, check, prep };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Supplies = API;
})(this);
