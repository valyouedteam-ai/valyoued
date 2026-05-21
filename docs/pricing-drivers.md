# Pricing drivers by asset type

This document maps each `id` in `artifacts/api-server/src/lib/assetTypes.ts` to the facts that move comparables and spreads. Fields listed under **Form fields** are implemented as `AssetField` entries (`extraFields` in the LLM prompt unless noted as `brand` / `model` / `year` / `purchasePrice`).

## Watches and jewelry

### luxury-watch

- Reference and model line define the comp set.
- Box, papers, and service history move premium vs naked watch.
- Bracelet completeness and polish history affect liquidity.

**Form fields:** brand, model, year, boxAndPapers, lastService, ownerCount, braceletLinksCount, dialBraceletOriginal, polishHistory.

### fine-jewelry

- Metal, signed vs unsigned, and cert level (4Cs summary) drive price.
- Size / length affects salability.

**Form fields:** existing plus diamondOrStoneSummary (4Cs short text).

### vintage-watch

- Dial, hands, and case originality trump generic “mint.”
- Movement and patina narrative matter.

**Form fields:** existing plus dialHandsCondition, casePolishLevel.

### pocket-watch

- Case material, complications, chain, running condition.

**Form fields:** existing plus chainIncluded, runningCondition.

## Bags and fashion

### designer-handbag

- Size (e.g. 25 vs 30), color, leather, hardware, stamp era, authenticity tier.

**Form fields:** existing plus bagSizeLengthMm.

### sneakers

- Size, deadstock vs worn, box, sole/yellowing.

**Form fields:** existing (wearSummary, ogBox, size).

### streetwear-apparel

- Size, season, print/cracking/shrink/stains vs hype comps.

**Form fields:** existing plus apparelWearSummary.

### designer-accessories

- Hardware finish, SKU or heat stamp, dust bag/box, wear on canvas or leather.

**Form fields:** existing plus hardwareFinish, serialOrSku, includesBoxDustBag, accessoryWearLevel.

## Vehicles and marine

### classic-car

- Matching numbers, restoration depth, mileage, provenance.

**Form fields:** existing plus restorationExtent.

### everyday-car

- Trim accuracy, mileage, damage history, MOT/inspection context, keys.

**Form fields:** existing plus motOrInspectionNote, spareKeys.

### motorcycle

- Title status, drops, ABS trim, mods.

**Form fields:** existing plus titleStatus, dropHistory, absEquipped.

### boat-marine

- Hours, hull, survey, freshwater vs salt, berth.

**Form fields:** existing plus hullMaterial, saltOrFreshwater, surveyWithinTwoYears.

### rv-camper

- Miles, slides, water damage, generator/solar.

**Form fields:** existing plus slideOuts, waterDamageKnown.

## Electronics

### smartphone, tablet, laptop

- Specs, battery, lock, completeness, screen/body (phones).

**Form fields:** phones/tablets/laptops extended with warrantyRemaining where useful; tablet screenSizeInch; laptop screenSizeInch.

### camera

- Shutter count, mount, bundled glass, sensor size class.

**Form fields:** existing plus sensorFormat.

### drone-uav

- Flight hours, crash history, gimbal, Care refresh, batteries.

**Form fields:** existing plus crashHistory, gimbalCondition, careRefreshActive.

## Real estate

### residential-property

- Tenure, lease length, EPC, chain, major works.

**Form fields:** existing plus chainStatus, leaseYearsRemaining, epcRating, majorWorksRecent.

### commercial-property

- Tenant, yield, passing rent, lease length.

**Form fields:** existing plus passingRentAnnual, yieldsPercentApprox, leaseYearsRemaining.

### land-plot

- Access, services, planning.

**Form fields:** existing plus roadAccess, utilitiesNearby.

## Collectibles and art

### fine-art

- Medium, edition, frame, signature visibility.

**Form fields:** existing plus framed, signedVisible.

### trading-cards

- Grade, variant, serial.

**Form fields:** existing (add serialOrParallel where useful).

### wine-spirits

- Fill, storage history, seal, size (existing strong).

**Form fields:** `wineCellarStorage` (where bottles were kept), plus fill level, seal, bottle size.

### vinyl-records, rare-books, comic-books

- Grades, pressing/issue points, restoration.

**Form fields:** comic-books: pageQuality, professionallyRestored; rare-books: foxingLevel.

### musical-instrument

- Originality, neck/frets, case.

**Form fields:** existing plus fretWearLevel, neckStraight.

### sports-memorabilia, numismatics, philately

- Auth, grade, population, hinge/forgery risk.

**Form fields:** memorabilia: displayOrFramed; philately: mintOrHinged, catalogue, certification; numismatics: keyDateOrVariety.

## Home and antiques

### designer-furniture, antique, premium-rug

- Dimensions, maker proof, restoration, wear, knot density (rugs).

**Form fields:** furniture: dimensionsApproxCm, makerLabelPresent; antique: restorationExtentAntique, woodwormOrDamage; rug: pileWearLevel, knotDensityApprox.

## Sports and outdoors

### bicycle

- Frame material, e-assist, groupset (existing).

**Form fields:** existing plus frameMaterial, electricAssist.

### golf-equipment, winter-sports, camping-outdoor, fitness-equipment

- Spec fit (flex, mondo), season rating, seams, subscription.

**Form fields:** golf: driverLoftDegrees, lieAdjusted; winter: bootMondo, edgeBaseCondition; camping: seasonComfort, seamOrPoleIssues, packedWeightKg; fitness: includesAccessories.

## Business and other

### saas-micro

- MRR, churn, customer concentration, code ownership.

**Form fields:** existing plus payingCustomerCount, revenueConcentration.

### general-item

- Rough category and search terms for comps.

**Form fields:** existing plus itemCategory, keywordsForComps.

## Wizard help (glossary vs field help)

- **Popovers** (plain-language definitions): [`artifacts/valuation-app/src/lib/estimate-glossary.ts`](artifacts/valuation-app/src/lib/estimate-glossary.ts), shown next to labels in the new-estimate wizard.
- **One-line hints** ("how to answer for this item"): `help` on each `AssetField` in [`artifacts/api-server/src/lib/assetTypes.ts`](artifacts/api-server/src/lib/assetTypes.ts). Keep hints short and avoid repeating the full popover text.

When the same `key` means different things on different asset types, routing is handled in `getGlossaryForField` (for example `authenticity` on handbags vs streetwear, and `wineCellarStorage` vs device `storage`).
