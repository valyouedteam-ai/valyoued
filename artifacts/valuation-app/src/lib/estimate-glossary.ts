/**
 * Plain-language popovers for valuation fields. Keys are referenced from the wizard FieldGlossary map.
 *
 * **Pattern:** Popovers define *terms*. Use `AssetField.help` in assetTypes for *how to answer for this item type*
 * (one short line). Avoid copying the full glossary text into `help`.
 *
 * Optional `imageSrc` is under `public/`. Optional `icon` shows next to the title in the popover.
 */
import type { LucideIcon } from "lucide-react";
import {
  Bike,
  BookOpen,
  Camera,
  Car,
  Cpu,
  FileText,
  Gem,
  Home,
  Shield,
  Smartphone,
  Stamp,
  Wine,
} from "lucide-react";
import { getLocale } from "@/lib/regional";

export type GlossaryEntry = {
  title: string;
  body: string;
  /** Optional relative path from site root e.g. /glossary/epc-bands.svg */
  imageSrc?: string;
  icon?: LucideIcon;
};

const SAAS_MICRO_ASSET_ID = "saas-micro";
const STREETWEAR_ASSET_ID = "streetwear-apparel";

export const GLOSSARY: Record<string, GlossaryEntry> = {
  condition_scale: {
    title: "Condition score",
    body: "A simple 1 to 10 scale for how the item looks and works for its age. 1 is heavy wear. 10 is like new. Small marks are usually in the middle. Honest scores help your estimate match real sales.",
  },
  unlocked_vs_locked: {
    title: "Unlocked vs locked to a network",
    body: "Unlocked phones and cellular iPads work on many carriers. A locked device is tied to one carrier until it is unlocked. Unlocked usually sells for more.",
    icon: Smartphone,
  },
  battery_health: {
    title: "Battery health",
    body: "On many phones and laptops you can see maximum capacity or cycle count. Lower health means shorter life between charges and often a lower resale price. If you do not know, leave it blank.",
    icon: Smartphone,
  },
  storage_tier: {
    title: "Storage size (device memory)",
    body: "This field is for gigabytes or terabytes on the device, not cloud storage. Pick what is on the box or in Settings. More storage usually raises the price for the same model.",
    icon: Smartphone,
  },
  wine_cellaring: {
    title: "How the bottle was stored",
    body: "Steady cool temperature and low light protect wine. Bonded warehouse or a proper cellar is strongest for investment bottles. Hot rooms or sunny shelves hurt value and can harm the wine.",
    icon: Wine,
    imageSrc: "/glossary/wine-storage.svg",
  },
  shutter_count: {
    title: "Shutter count",
    body: "Digital cameras count how many times the shutter fired. Higher counts mean more wear. Buyers often ask for this on used bodies. Check the camera menu or manual.",
    icon: Camera,
  },
  lens_included: {
    title: "Lenses included",
    body: "List glass that sells with the camera body. Bundles with popular lenses usually beat body-only prices. One line is enough, for example 24 to 70 millimeter f2.8.",
    icon: Camera,
  },
  groupset: {
    title: "Groupset",
    body: "The main drivetrain on a bike: shifters, derailleurs, cassette, chain, and usually the crank. Shimano and SRAM have tiers like 105, Ultegra, Dura-Ace. The exact level changes resale a lot.",
    icon: Bike,
  },
  frame_size: {
    title: "Frame size",
    body: "Often a sticker on the frame in centimeters, or a letter size. Put it here or in the model line so buyers know it fits.",
    icon: Bike,
  },
  deadstock_og: {
    title: "Deadstock and original box",
    body: "Deadstock usually means new and unworn from retail. OG box means the original shoe box. Missing box or heavy wear usually lowers price.",
  },
  authentication_tiers: {
    title: "Bag authentication levels",
    body: "Luxury bags often use third-party services (for example Entrupy) or store paperwork. Pick the level you truly have. We will not treat a bag as proven real without the proof you select.",
    icon: Shield,
  },
  streetwear_auth_proof: {
    title: "Streetwear proof",
    body: "Receipts, order emails, platform verification (for example StockX), or a letter of authenticity each give buyers different comfort. Pick what matches your item. No paperwork is common but it prices lower.",
    icon: FileText,
  },
  handbag_codes: {
    title: "Serial or date code",
    body: "Many brands stamp an internal code to help date the bag. It is not the same as a receipt. Look inside pockets or on a small leather tab.",
  },
  originality: {
    title: "Original parts",
    body: "All original means the maker’s parts are still there. Restored or swapped parts can change collector value. Say what you know.",
  },
  maturity_score: {
    title: "Product maturity",
    body: "For software, this is business polish, not scratches. 1 is an early beta. 10 is stable with paying customers, clear docs, and few fires.",
    icon: Cpu,
  },
  property_tenure: {
    title: "Tenure",
    body: "Freehold: you own the building and land. Leasehold: you own the right to live there for a set number of years, often with ground rent or fees. Flats may be share of freehold. Mortgage rules change with lease length.",
    icon: Home,
  },
  epc_rating_gb: {
    title: "Energy rating (EPC)",
    body: "In the UK an Energy Performance Certificate rates the home from A (best) to G. Buyers use it for running costs. Elsewhere you may have a similar energy label. A letter or score line is enough.",
    icon: Home,
    imageSrc: "/glossary/epc-bands.svg",
  },
  sale_chain_status: {
    title: "Sale chain",
    body: "A chain means several linked sales must complete in order. No chain is simpler. Being in a chain can add delay risk, which buyers and agents notice.",
    icon: Home,
  },
  lease_years_left: {
    title: "Years left on the lease",
    body: "For leasehold homes, short remaining leases are harder to mortgage until extended. If you are not leasehold, use N/A elsewhere and skip this.",
    icon: Home,
  },
  grading_slabs: {
    title: "Grade and grading company",
    body: "Cards, comics, and many coins are sealed in slabs with a grade from PSA, CGC, Beckett, PCGS, and similar. The company and number set the market band. Raw items price off photos instead.",
    icon: BookOpen,
    imageSrc: "/glossary/graded-vs-raw.svg",
  },
  match_worn_memorabilia: {
    title: "Match-worn vs signed only",
    body: "Kit actually worn in play with strong proof (photo match is best) often crushes signed-only shirts. Say which you have so comps stay honest.",
  },
  auth_sports_mem: {
    title: "Authentication for signed gear",
    body: "Letters from known authenticators (JSA, PSA/DNA, Beckett, Upper Deck) or strong team COAs help trust. If you only have a story, choose none or unsure.",
  },
  stamp_mnh: {
    title: "Mint, hinged, or used",
    body: "MNH means mint never hinged: no hinge mark on the gum. Hinged mint is usually worth less. Used stamps and on-cover mail are separate markets.",
    icon: Stamp,
    imageSrc: "/glossary/stamp-hinge.svg",
  },
  stamp_catalogue_line: {
    title: "Catalogue note",
    body: "Dealers cite catalogs (Stanley Gibbons, Scott, Michel, Yvert). A short note with catalog and rough value tier is enough. You do not need a perfect number.",
    icon: Stamp,
  },
  stamp_expert_cert: {
    title: "Expert certificate",
    body: "A respected expert or society can certify rare stamps. It is stronger than a casual opinion and often matters for high-value classics.",
    icon: Stamp,
  },
  rug_knot_density: {
    title: "Knot density (rug quality)",
    body: "Finer rugs pack more knots per square inch (KPSI) or feel tighter. Village weaves and city workshops price differently. A rough tier still helps.",
  },
  saas_mrr_field: {
    title: "MRR in the price box",
    body: "For micro-SaaS this app treats the purchase price step as your monthly recurring revenue hint. Enter a realistic MRR so valuation matches a real business.",
    icon: Cpu,
  },
  saas_churn: {
    title: "Churn",
    body: "Monthly churn is what you lose each month in customers or revenue percent. Healthy B2B tools often sit in single digits. Very high churn hurts price.",
    icon: Cpu,
  },
  saas_customers: {
    title: "Paying customers",
    body: "Approximate count of paying accounts. Two whales with tiny ARR is not the same as many small accounts at the same MRR.",
    icon: Cpu,
  },
  saas_concentration: {
    title: "Revenue concentration",
    body: "If one client is most of revenue, buyers see key-person or client risk. Under a quarter from the top client is usually safer than over half.",
    icon: Cpu,
  },
  tech_stack_hint: {
    title: "Tech stack",
    body: "Short list of language, database, and host (for example Next.js, Postgres, Vercel). Buyers use it to guess complexity, lock-in, and hiring cost.",
    icon: Cpu,
  },
  owner_count_general: {
    title: "Previous owners",
    body: "Fewer owners often reads as simpler history for vehicles, watches, and collectibles. A best guess is fine if you are not sure.",
    icon: Car,
  },
  box_papers_watch: {
    title: "Box and papers",
    body: "Full set usually means box, warranty papers, and tags as they left the boutique. Watch-only still sells but often at a discount to a full set.",
  },
  watch_polish_dial: {
    title: "Dial, hands, and polish",
    body: "Original dial and hands matter hugely on vintage watches. Heavy or amateur polishing rounds soft edges on the case. Collectors pay strong premiums for correct, honest condition.",
  },
  matching_numbers_car: {
    title: "Matching numbers",
    body: "On classics this usually means the engine and frame (and often gearbox) still carry factory-correct stamps. Swaps change the comp set.",
    icon: Car,
  },
  cat_insurance_categories: {
    title: "Serious damage or write-off",
    body: "In the UK, Cat S and Cat N are insurance write-off labels that stay on the record. They often cut value even after good repairs. Minor cosmetic bumps are different.",
    icon: Car,
  },
  mot_inspection_note: {
    title: "Inspection / MOT",
    body: "In the UK an MOT is a required roadworthiness test. Buyers care if it is fresh or if advisories need work. Other regions use different inspection names.",
    icon: Car,
  },
  fuel_type_vehicle: {
    title: "Fuel wording",
    body: "Pick what you actually fill up with. Naming trim lines (for example TDI) can hint at diesel, but you should still confirm.",
    icon: Car,
  },
  service_history_vehicle: {
    title: "Service history",
    body: "Stamped book, main dealer, or indie specialist receipts show upkeep. Gaps or none can lower price more than mileage alone.",
    icon: Car,
  },
  bike_title_status: {
    title: "Title and lien",
    body: "Clean title means no salvage branding and no surprise loans on the VIN. Salvage or rebuilt titles price lower. Say if a bank still holds the note.",
    icon: Car,
  },
  hull_survey_boat: {
    title: "Marine survey",
    body: "A recent survey is an out-of-water check of hull and systems. Serious buyers expect one on larger boats. Fresh survey reduces their risk.",
  },
  sensor_format_camera: {
    title: "Sensor size",
    body: "Full-frame, APS-C, Micro Four Thirds, and medium format point to different markets. Put what the manual or specs say for the body.",
    icon: Camera,
  },
  amplifier_topology_audio: {
    title: "Tube vs solid state",
    body: "Many hi-fi amps are tube (valve) or solid state. Each has its own buyers and price bands. Pick what matches your unit.",
  },
  gem_certificate: {
    title: "Stone certificate vs carats",
    body: "Labs such as GIA, IGI, AGS, and HRD print cut, color, clarity, and carat-weight for stones. Gem carats are a weight measure. Gold purity uses karats spelled with a \"k\". None is fine for fashion pieces or heirloom jewelry without certs.",
    icon: Gem,
  },
  jewelry_metal_hint: {
    title: "Metal fineness cues",
    body: "18k alloys mix gold with other metals for strength. Platinum is heavier and hypoallergenic. Sterling silver stamped 925 still tarnishes differently than plated fashion metal. Mention what you saw on the hallmark.",
    icon: Gem,
  },
  fill_level_wine: {
    title: "Fill level",
    body: "Ullage is how high the liquid sits in the neck. High shoulder or into neck is best for older bottles. Low shoulder often prices much lower.",
    icon: Wine,
  },
  vinyl_record_grading: {
    title: "Record grading",
    body: "Mint to fair grades describe vinyl and cover wear. Matrix or runout can ID a pressing. Collectors match grades to comps.",
  },
  car_restoration_extent: {
    title: "Restoration extent",
    body: "Say if the car is mostly original paint and trim or if it had a full nut-and-bolt rebuild. Depth of work shifts which buyers and prices apply.",
    icon: Car,
  },
  woodworm_antique: {
    title: "Woodworm and old damage",
    body: "Historic furniture may show old worm tracks or loose joints. Active infestation is urgent. Treated old holes are a disclosure item, not always a deal killer.",
  },
  comic_page_quality: {
    title: "Page quality (ungraded)",
    body: "Tan pages, small tears, or brittle paper change value on raw comics. Slabbed copies lean on the printed grade instead.",
    icon: BookOpen,
  },
  subscription_transfer: {
    title: "Subscription",
    body: "Some fitness devices lock content to an account. If membership cannot move, say no. N/A if the machine does not need a paid sub.",
  },
  shaft_flex_golf: {
    title: "Shaft flex",
    body: "Stiff, regular, senior, or extra stiff changes who can play the club. Mismatched flex hurts resale for serious buyers.",
  },
  boot_mondo: {
    title: "Mondo size",
    body: "Ski boot sole length in millimeters is printed on the shell or heel. It helps binders fit safely. It is not the same as shoe size.",
  },
  golf_lie_adjust: {
    title: "Lie and length changes",
    body: "Bent hosels or custom length suit one swing. Stock specs appeal to more buyers unless the change is clearly documented.",
  },
  key_date_coin: {
    title: "Key date or variety",
    body: "Some years, mint marks, or die varieties trade far above common dates. Name what you know or suspect so comps line up.",
  },
  general_item_category: {
    title: "What kind of thing is it?",
    body: "Pick the closest bucket so we choose good comps. If nothing fits, use Something else and describe in the free text at the end.",
  },
  general_item_keywords: {
    title: "Search keywords",
    body: "Type what you would type into eBay or Google to find the same item. Brand, model code, and year help most.",
  },
  disc_vs_digital_console: {
    title: "Disc drive or digital-only",
    body: "Digital editions have no disc slot. Disc editions need a working drive. Match the variant buyers search for.",
  },
  comic_restoration: {
    title: "Restoration or colour touch",
    body: "Colour touch, spine work, or cleaning can change value. Graders note this on slabs. On raw books, say what you know so comps stay fair.",
    icon: BookOpen,
  },
  drone_crash_history: {
    title: "Crash history",
    body: "Hard landings can stress arms or gimbals even after repair. Honest history avoids disputes and keeps estimates realistic.",
    icon: Camera,
  },
  drone_gimbal_health: {
    title: "Gimbal",
    body: "The gimbal steadies the camera. Rub marks, tilt errors, or replacements matter for video buyers.",
    icon: Camera,
  },
  drone_care_plan: {
    title: "Care plan (DJI etc.)",
    body: "Factory damage plans can cover crashes for a fee. Active plans can be a small plus; expired is normal.",
    icon: Camera,
  },
  drone_flight_hours: {
    title: "Flight hours",
    body: "Approximate hours in the air. More use means more wear on motors and batteries, like mileage on a car.",
    icon: Camera,
  },
  registration_uas: {
    title: "Drone registration",
    body: "Many countries require pilot or craft registration. Say if yours is current. Rules depend on weight and use.",
    icon: Camera,
  },
  road_access_land: {
    title: "Land access",
    body: "Direct road access adds value. Easements or tracks can work but need legal checks. Landlocked land is harder to value high.",
    icon: Home,
  },
  passing_rent_yield: {
    title: "Rent and yield",
    body: "Passing rent is what the tenant pays now. Yield links rent to price. A rough net percent is enough if you are not a surveyor.",
    icon: Home,
  },
  display_size_inch: {
    title: "Screen size (inches)",
    body: "Diagonal of the lit screen in inches. Check About this device or the product page. Buyers compare laptops and tablets by this number.",
    icon: Smartphone,
  },
  watch_last_service: {
    title: "Last service",
    body: "Year of the last movement service or pressure test if you know it. Recent service can reassure buyers on water-resistant watches.",
  },
  collectibles_edition: {
    title: "Edition",
    body: "Print run size, card set marker, or bottle release notes. Small editions or first prints usually beat open editions on comps.",
    icon: BookOpen,
  },
  collectibles_provenance: {
    title: "Provenance",
    body: "Where it has lived: gallery, auction lot, family, or COA. Strong paper trail can support price.",
  },
  collectibles_medium: {
    title: "Medium",
    body: "Oil, watercolor, print on paper, bronze, and so on. Medium plus size drives the typical market.",
  },
  collectibles_framed: {
    title: "Framing",
    body: "Museum framing can add value. Cheap poster frames may not. Unframed prints depend on storage.",
  },
  collectibles_signed: {
    title: "Signature",
    body: "Hand-signed work, plate signed, or not signed at all are different markets. Say what you can see.",
  },
  collectibles_variant: {
    title: "Variant",
    body: "Different cover art, foil stamp, or print wave can change prices sharply on comics and some cards.",
    icon: BookOpen,
  },
  collectibles_serial_parallel: {
    title: "Serial or parallel",
    body: "Low serial numbers or rare parallel prints can multiply value versus base cards from the same set.",
    icon: BookOpen,
  },
  camping_season_rating: {
    title: "Season rating",
    body: "Rough warmth: summer-only versus winter mountain. Wrong-season gear sells to a smaller crowd.",
  },
  camping_seams_gear: {
    title: "Wear on seams and poles",
    body: "Tents and packs fail at zips, taped seams, and pole bends. Small issues are normal; leaks are serious.",
  },
  winter_edge_base: {
    title: "Edges and bases",
    body: "Rust, burrs, or core shots on skis change tuning cost and safety. Honest notes keep estimates fair.",
  },
  fitness_bundle: {
    title: "What is included",
    body: "Heart-rate strap, weights mats, or full retail bundle often beats console-only for resale.",
  },
  golf_loft: {
    title: "Driver loft",
    body: "Loft in degrees changes launch and buyer fit. Stock loft matches most swing speeds.",
  },
  golf_set_includes: {
    title: "What is in the set",
    body: "List irons, woods, bag, and putter if included. Half sets price differently than full bags.",
  },
  bike_frame_mat: {
    title: "Frame material",
    body: "Carbon, aluminium, steel, and titanium target different buyers. Material also hints at weight and ride feel.",
    icon: Bike,
  },
  bike_motor_assist: {
    title: "Motor assist",
    body: "Factory e-bikes list motor and battery rules. Retrofit kits add complexity for buyers and service.",
    icon: Bike,
  },
  pocket_watch_chain: {
    title: "Chain or fob",
    body: "Original chain or fob can add collector appeal. Aftermarket chains still help wearability.",
  },
  pocket_watch_runs: {
    title: "Running condition",
    body: "Keeps time, needs service, or unknown. Movement condition drives price on vintage pieces.",
  },
  jewelry_hallmark: {
    title: "Hallmark",
    body: "Tiny stamped marks for metal purity and maker region. A jeweler loupe helps; a phone photo may not catch it.",
    icon: Gem,
  },
  rare_book_dust: {
    title: "Dust jacket",
    body: "First editions often need the original jacket to reach top comps. Clipped price panels hurt value.",
    icon: BookOpen,
  },
  display_framed_item: {
    title: "Display or framed",
    body: "Framing or a case can protect signed pieces but may not suit every buyer. Note how it is presented.",
  },
  watch_case_material_pocket: {
    title: "Case metal",
    body: "Gold, silver, and steel cases sit in different markets. Plated cases price lower than solid metal.",
  },
  land_planning: {
    title: "Planning status",
    body: "Outline or full planning permission, agricultural use, or woodland rules change what someone can build.",
    icon: Home,
  },
  furniture_dimensions_cm: {
    title: "Dimensions",
    body: "Width x depth x height in centimeters. A soft tape against the piece is fine.",
  },
  property_major_works: {
    title: "Major works",
    body: "Recent roof, windows, extension, or heating upgrades matter to buyers. Rough years are enough.",
    icon: Home,
  },
  land_services: {
    title: "Utilities nearby",
    body: "Mains water, power, sewer, or gas at the plot edge versus none shapes build cost.",
    icon: Home,
  },
  land_size_acres: {
    title: "Land size",
    body: "Total acres for the parcel. Decimals are fine for smaller plots.",
    icon: Home,
  },
  car_keys_spare: {
    title: "Keys and fobs",
    body: "Full key set plus spare remote usually sells faster than a single key.",
    icon: Car,
  },
  watch_bracelet_links: {
    title: "Bracelet links",
    body: "How many links are fitted and if spare links come with the watch changes fit and value.",
  },
  jewelry_metal_gem: {
    title: "Metal type",
    body: "Yellow, rose, or white gold, platinum, and silver sit in different price bands than plated fashion pieces. 18k alloys mix pure gold with strengtheners for daily wear and often show hallmark stamps.",
    icon: Gem,
  },
};

/**
 * Default popover id per `AssetField.key`. Overrides belong in `getGlossaryForField`
 * when the same key means different things on different asset types.
 */
export const FIELD_GLOSSARY_KEYS: Record<string, string> = {
  condition: "condition_scale",
  networkLock: "unlocked_vs_locked",
  cellular: "unlocked_vs_locked",
  batteryHealth: "battery_health",
  storage: "storage_tier",
  shutterCount: "shutter_count",
  lenses: "lens_included",
  groupset: "groupset",
  ogBox: "deadstock_og",
  wearSummary: "deadstock_og",
  serialOrDateCode: "handbag_codes",
  authenticityVerifierReferenceId: "authentication_tiers",
  originality: "originality",
  tenure: "property_tenure",
  epcRating: "epc_rating_gb",
  chainStatus: "sale_chain_status",
  leaseYearsRemaining: "lease_years_left",
  grade: "grading_slabs",
  matchWorn: "match_worn_memorabilia",
  authentication: "auth_sports_mem",
  mintOrHinged: "stamp_mnh",
  catalogue: "stamp_catalogue_line",
  knotDensityApprox: "rug_knot_density",
  churn: "saas_churn",
  payingCustomerCount: "saas_customers",
  revenueConcentration: "saas_concentration",
  wineCellarStorage: "wine_cellaring",
  boxAndPapers: "box_papers_watch",
  ownerCount: "owner_count_general",
  dialBraceletOriginal: "watch_polish_dial",
  dialHandsCondition: "watch_polish_dial",
  casePolishLevel: "watch_polish_dial",
  polishHistory: "watch_polish_dial",
  matchingNumbers: "matching_numbers_car",
  accidents: "cat_insurance_categories",
  fuelType: "fuel_type_vehicle",
  serviceHistory: "service_history_vehicle",
  titleStatus: "bike_title_status",
  surveyWithinTwoYears: "hull_survey_boat",
  sensorFormat: "sensor_format_camera",
  amplifierTopology: "amplifier_topology_audio",
  certificate: "gem_certificate",
  certification: "stamp_expert_cert",
  fillLevel: "fill_level_wine",
  vinylGrade: "vinyl_record_grading",
  sleeveGrade: "vinyl_record_grading",
  matrix: "vinyl_record_grading",
  restorationExtent: "car_restoration_extent",
  restorationExtentAntique: "woodworm_antique",
  woodwormOrDamage: "woodworm_antique",
  pageQuality: "comic_page_quality",
  professionallyRestored: "comic_restoration",
  techStack: "tech_stack_hint",
  subscription: "subscription_transfer",
  shaftFlex: "shaft_flex_golf",
  bootMondo: "boot_mondo",
  lieAdjusted: "golf_lie_adjust",
  keyDateOrVariety: "key_date_coin",
  roadAccess: "road_access_land",
  passingRentAnnual: "passing_rent_yield",
  yieldsPercentApprox: "passing_rent_yield",
  registration: "registration_uas",
  crashHistory: "drone_crash_history",
  gimbalCondition: "drone_gimbal_health",
  careRefreshActive: "drone_care_plan",
  flightHours: "drone_flight_hours",
  discOrDigital: "disc_vs_digital_console",
  authenticityServiceUrl: "authentication_tiers",
  bagSizeLengthMm: "handbag_codes",
  apparelWearSummary: "deadstock_og",
  accessoryWearLevel: "deadstock_og",
  hardwareFinish: "handbag_codes",
  serialOrSku: "handbag_codes",
  totalCarats: "gem_certificate",
  diamondOrStoneSummary: "gem_certificate",
  complications: "watch_polish_dial",
  movement: "watch_polish_dial",
  dropHistory: "bike_title_status",
  absEquipped: "bike_title_status",
  mods: "bike_title_status",
  hullMaterial: "hull_survey_boat",
  saltOrFreshwater: "hull_survey_boat",
  waterDamageKnown: "hull_survey_boat",
  slideOuts: "hull_survey_boat",
  screenSizeInch: "display_size_inch",
  warrantyRemaining: "battery_health",
  boxAndAccessories: "box_papers_watch",
  screenWear: "condition_scale",
  bodyWear: "condition_scale",
  itemCategory: "general_item_category",
  keywordsForComps: "general_item_keywords",
  lastService: "watch_last_service",
  edition: "collectibles_edition",
  provenance: "collectibles_provenance",
  medium: "collectibles_medium",
  framed: "collectibles_framed",
  signedVisible: "collectibles_signed",
  signed: "collectibles_signed",
  serialOrParallel: "collectibles_serial_parallel",
  variant: "collectibles_variant",
  seasonComfort: "camping_season_rating",
  seamOrPoleIssues: "camping_seams_gear",
  edgeBaseCondition: "winter_edge_base",
  includesAccessories: "fitness_bundle",
  driverLoftDegrees: "golf_loft",
  setMakeup: "golf_set_includes",
  frameMaterial: "bike_frame_mat",
  electricAssist: "bike_motor_assist",
  chainIncluded: "pocket_watch_chain",
  runningCondition: "pocket_watch_runs",
  hallmark: "jewelry_hallmark",
  caseMaterial: "watch_case_material_pocket",
  displayOrFramed: "display_framed_item",
  foxingLevel: "comic_page_quality",
  dustJacket: "rare_book_dust",
  braceletLinksCount: "watch_bracelet_links",
  fretWearLevel: "originality",
  neckStraight: "originality",
  caseIncluded: "originality",
  makerLabelPresent: "originality",
  dimensionsApproxCm: "furniture_dimensions_cm",
  pileWearLevel: "rug_knot_density",
  planning: "land_planning",
  utilitiesNearby: "land_services",
  acreage: "land_size_acres",
  spareKeys: "car_keys_spare",
  tenant: "passing_rent_yield",
  majorWorksRecent: "property_major_works",
  metal: "jewelry_metal_gem",
  gemstones: "gem_certificate",
  ringSizeOrLength: "gem_certificate",
};

export function getGlossaryForField(
  fieldKey: string,
  assetTypeId?: string,
  regionName?: string | null,
): GlossaryEntry | undefined {
  if (fieldKey === "model" && assetTypeId === "bicycle") {
    return GLOSSARY.frame_size;
  }
  if (fieldKey === "purchasePrice" && assetTypeId === SAAS_MICRO_ASSET_ID) {
    return GLOSSARY.saas_mrr_field;
  }
  if (fieldKey === "condition" && assetTypeId === SAAS_MICRO_ASSET_ID) {
    return GLOSSARY.maturity_score;
  }
  if (fieldKey === "authenticity") {
    if (assetTypeId === STREETWEAR_ASSET_ID) {
      return GLOSSARY.streetwear_auth_proof;
    }
    return GLOSSARY.authentication_tiers;
  }
  if (fieldKey === "authentication") {
    return GLOSSARY.auth_sports_mem;
  }
  const id = FIELD_GLOSSARY_KEYS[fieldKey];
  if (!id) return undefined;
  const base = GLOSSARY[id];
  if (!base) return undefined;

  if (id === "mot_inspection_note" && regionName) {
    const loc = getLocale(regionName);
    return {
      ...base,
      title: regionName === "United Kingdom" ? base.title : "Inspection notes",
      body: `${base.body} Sellers in ${regionName} often cite "${loc.inspection}" in ads. When you talk about cargo space, "${loc.cargoAreaWord}" matches local buyers better than the US equivalent, and for long trips "${loc.highwayWordPair}" reads more natural than a random mix of US and UK words.`,
    };
  }

  if (id === "fuel_type_vehicle" && regionName) {
    const loc = getLocale(regionName);
    return {
      ...base,
      body: `${base.body} In ${regionName} the fuel list uses local labels such as ${loc.fuelOptions.slice(0, 3).join(", ")}.`,
    };
  }

  return base;
}
