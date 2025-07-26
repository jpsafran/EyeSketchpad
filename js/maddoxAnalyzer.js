// js/maddoxAnalyzer.js

// Ensure dataModels.js is loaded before this script, or use ES6 modules.
// For simplicity, assuming global availability of constants from dataModels.js

const PatternThresholds = { // Copied from ManualMaddoxGridInputView.swift / MaddoxRodView.swift
    significantCNIVWorsening: 5.0,
    significantCNIVTorsion: 2.0,
    significantCNVIWorsening: 5.0,
    significantAVPatternDifference: 10.0,
    skewTorsionThreshold: 2.0,
    skewComitanceThresholdHorizontal: 3.0,
    skewWorseningThresholdTilt: 2.0,
    smallVerticalLimit: 3.0
};

function analyzeMaddoxPatterns(measurements, rodEye) {
    let diagnosticSuggestions = [];

    function getMeasurementFor(gaze, type, measurementsArray) {
        return measurementsArray.find(m => m.gazePosition === gaze && m.deviationType === type) ||
               new MaddoxMeasurement(undefined, gaze, type, "0", PrismDirection.NONE); // Default ortho
    }

    function sVal(gaze, type) {
        const measurement = getMeasurementFor(gaze, type, measurements);
        return measurement.signedValue(type, rodEye);
    }

    function mVal(gaze, type) { // magnitude
        const measurement = getMeasurementFor(gaze, type, measurements);
        return measurement.numericValue;
    }

    const vP = sVal(GazePosition.PRIMARY, DeviationType.VERTICAL);
    const vL = sVal(GazePosition.LEFT, DeviationType.VERTICAL);
    const vR = sVal(GazePosition.RIGHT, DeviationType.VERTICAL);
    const vUp = sVal(GazePosition.UP, DeviationType.VERTICAL);
    const vDown = sVal(GazePosition.DOWN, DeviationType.VERTICAL);
    const vTR = sVal(GazePosition.TILT_RIGHT, DeviationType.VERTICAL);
    const vTL = sVal(GazePosition.TILT_LEFT, DeviationType.VERTICAL);
    const tP = sVal(GazePosition.PRIMARY, DeviationType.TILT);

    const hP = sVal(GazePosition.PRIMARY, DeviationType.HORIZONTAL);
    const hL = sVal(GazePosition.LEFT, DeviationType.HORIZONTAL);
    const hR = sVal(GazePosition.RIGHT, DeviationType.HORIZONTAL);
    const hUp = sVal(GazePosition.UP, DeviationType.HORIZONTAL);
    const hDown = sVal(GazePosition.DOWN, DeviationType.HORIZONTAL);

    let observed = [];
    const atypicalVerticalTxt = "Significant vertical component is atypical for isolated CN VI; consider mixed palsy or skew.";

    function verticalComponentPresent(vP_val) {
        return Math.abs(vP_val) > PatternThresholds.smallVerticalLimit;
    }

    // --- Bilateral CN VI Palsy ---
    const rCN6_worsens_logic = hP >= 0 && (hR - hP) >= 3 && hR > 0;
    const lCN6_worsens_logic = hP >= 0 && (hL - hP) >= 3 && hL > 0;
    const bilateralCN6 = rCN6_worsens_logic && lCN6_worsens_logic &&
                         (hR - hP) >= PatternThresholds.significantCNVIWorsening &&
                         (hL - hP) >= PatternThresholds.significantCNVIWorsening;

    // --- Rule: Bilateral CN IV Palsy (NEW - High Priority) ---
    const hasCrossedHypers_new = (vL > 3 && vR < -3) || (vL < -3 && vR > 3) ||
                                 (vTR > 3 && vTL < -3) || (vTR < -3 && vTL > 3);
    const hasLargeVPattern_new = (hP > 0 && (hDown - hUp) >= 15) ||
                                 (hP < 0 && (Math.abs(hUp) - Math.abs(hDown)) >= 15);
    const hasMassiveExcyclo_new = (rodEye === MaddoxRodEye.RIGHT && tP >= 10) ||
                                  (rodEye === MaddoxRodEye.LEFT && tP >= 10);

    let biCN4ClueCount = 0;
    if (hasCrossedHypers_new) biCN4ClueCount++;
    if (hasLargeVPattern_new) biCN4ClueCount++;
    if (hasMassiveExcyclo_new) biCN4ClueCount++;

    if (biCN4ClueCount >= 2) {
        let biCN4Observed = [];
        if (hasMassiveExcyclo_new) biCN4Observed.push(`Large Excyclotorsion of ${rodEye} eye: ${tP.toFixed(1)}°`);
        if (hasCrossedHypers_new) biCN4Observed.push("Crossed Hypertropia present (reverses in gaze or on tilt)");
        if (hasLargeVPattern_new) biCN4Observed.push(`Significant V-Pattern present (${hP > 0 ? "ET" : "XT"})`);

        diagnosticSuggestions.push(new PatternDiagnosticSuggestion(
            "Pattern Highly Suggestive of Bilateral CN IV Palsy",
            "Caused by weakness of both superior oblique muscles. Often presents with a combination of crossed hypertropias, large excyclotorsion, and/or a V-pattern.",
            biCN4Observed,
            "Diagnosis strongly suggested by presence of ≥2 of: 1) Crossed hypertropia >3Δ, 2) Excyclotorsion of measured eye >10°, 3) V-pattern ET/XT ≥15Δ."
        ));
        return diagnosticSuggestions; // Early return
    }

    // --- Rule: Bilateral Superior Rectus Palsy ---
    const hasBilateralHypoInLateralGaze = vL > 5 && vR < -5;
    const isMassiveInUpgaze_BiSR = Math.abs(vUp) > Math.abs(vP) + 15 && Math.abs(vUp) > Math.abs(vDown) + 10;

    if (hasBilateralHypoInLateralGaze && isMassiveInUpgaze_BiSR) {
        diagnosticSuggestions.push(new PatternDiagnosticSuggestion(
            "Pattern Suggests Bilateral Superior Rectus Palsy",
            "Weakness of both superior rectus muscles, leading to limited elevation in both eyes, often more pronounced in abduction. May present as RHT in left gaze and LHT in right gaze, massively worse in upgaze.",
            [
                `RHT in Left Gaze: ${vL.toFixed(1)}Δ`,
                `LHT in Right Gaze: ${Math.abs(vR).toFixed(1)}Δ`,
                `Vertical deviation massively increases in Upgaze to ${Math.abs(vUp).toFixed(1)}Δ`
            ],
            "Significant hypotropia of each eye in its respective field of abduction, with marked increase of vertical deviation in upgaze. Often called 'Double Elevator Palsy' if congenital and unilateral, but this pattern suggests bilateral involvement."
        ));
        return diagnosticSuggestions; // Early return
    }

    // --- Rule: Bilateral Inferior Rectus Palsy ---
    const hasBilateralHyperInLateralGaze = vL > 5 && vR > 5; // Both eyes are RHT in their respective abduction fields
    const isMassiveInDowngaze_BiIR = Math.abs(vDown) > Math.abs(vP) + 15 && Math.abs(vDown) > Math.abs(vUp) + 10;

    if (hasBilateralHyperInLateralGaze && isMassiveInDowngaze_BiIR) {
        diagnosticSuggestions.push(new PatternDiagnosticSuggestion("Pattern Suggests Bilateral Inferior Rectus Palsy", "Weakness of both inferior rectus muscles, leading to limited depression in both eyes. May present as RHT in both lateral gazes, massively worse in downgaze.", [`RHT in Left Gaze: ${vL.toFixed(1)}Δ`, `RHT in Right Gaze: ${vR.toFixed(1)}Δ`, `Vertical deviation massively increases in Downgaze to ${Math.abs(vDown).toFixed(1)}Δ`], "Significant hypertropia that increases massively in downgaze, often with limited depression OU."));
        return diagnosticSuggestions; // Early return
    }

    // --- Rule: Dissociated Vertical Deviation (DVD) (NEW) ---
    const hasRHT_dvd = measurements.some(m => m.deviationType === DeviationType.VERTICAL && m.signedValue(DeviationType.VERTICAL, rodEye) > 3);
    const hasLHT_dvd = measurements.some(m => m.deviationType === DeviationType.VERTICAL && m.signedValue(DeviationType.VERTICAL, rodEye) < -3);

    if (hasRHT_dvd && hasLHT_dvd && Math.abs(vP) < 3) {
        const dvdSuggestion = new PatternDiagnosticSuggestion(
            "Features Compatible with Dissociated Vertical Deviation (DVD)",
            "An alternating hypertropia that doesn't follow typical paretic patterns. Often more manifest when one eye is covered. The hypertropic eye typically extorts.",
            [
                `Primary gaze is vertically near-ortho (${vP.toFixed(1)}Δ).`,
                "Both RHT and LHT (>3Δ) are present in different fields of gaze.",
                "Pattern does not fit a classic single muscle palsy."
            ],
            "DVD is a clinical diagnosis. This tool can only suggest compatibility based on the pattern. It does not conform to Hering's law for a paretic muscle."
        );
        if (!diagnosticSuggestions.some(s => s.name.includes("Bilateral CN IV Palsy"))) {
            diagnosticSuggestions.push(dvdSuggestion);
        }
    }

    // Example for R CN IV (partial translation)
    observed = [];
    if (vP > 0) observed.push(`RHT in primary: ${vP.toFixed(1)}Δ`);
    if ((vL - vP) >= 2 && vL > 0) observed.push(`RHT worsens in Left Gaze (to ${vL.toFixed(1)}Δ)`);
    if ((vTR - vP) >= 2 && vTR > 0) observed.push(`RHT worsens on Right Head Tilt (to ${vTR.toFixed(1)}Δ)`);
    const rExcycloPresent = (rodEye === MaddoxRodEye.RIGHT && tP >= 2.0) || (rodEye === MaddoxRodEye.LEFT && tP <= -2.0);
    if (rExcycloPresent) {
        const torsionMag = Math.abs(tP);
        const torsionDesc = (rodEye === MaddoxRodEye.RIGHT) ? `R Eye Excyclotorsion: ${torsionMag.toFixed(1)}°` : `L Eye Incyclotorsion (suggests R Eye Excyclotorsion): ${torsionMag.toFixed(1)}°`;
        observed.push(torsionDesc);
    }

    let rCN4CriteriaMet = 0;
    if (vP > 0) rCN4CriteriaMet++;
    if ((vL - vP) >= 2 && vL > 0) rCN4CriteriaMet++;
    if ((vTR - vP) >= 2 && vTR > 0) rCN4CriteriaMet++;
    if (rExcycloPresent) rCN4CriteriaMet++;

    const rCN4PatternExists = rCN4CriteriaMet >= 3;
    const rCN4StrongWorseningGaze = vP > 0 && vL > vP && (vL - vP) >= 10.0;
    const rCN4StrongWorseningTilt = vP > 0 && vTR > vP && (vTR - vP) >= 10.0;
    const rCN4StrongSignal = rCN4StrongWorseningGaze || rCN4StrongWorseningTilt;
    const veryLargePrimaryRHT = vP > 15.0 && rCN4CriteriaMet >= 2;

    if (rCN4PatternExists || (rCN4CriteriaMet >= 2 && (rCN4StrongSignal || veryLargePrimaryRHT))) {
        let strongFeaturesCount = 0;
        if (vL > vP && (vL - (vP > 0 ? vP : 0)) >= PatternThresholds.significantCNIVWorsening) strongFeaturesCount++;
        if (vTR > vP && (vTR - (vP > 0 ? vP : 0)) >= PatternThresholds.significantCNIVWorsening) strongFeaturesCount++;
        if (rExcycloPresent && ((rodEye === MaddoxRodEye.RIGHT && tP >= PatternThresholds.significantCNIVTorsion) || (rodEye === MaddoxRodEye.LEFT && Math.abs(tP) >= PatternThresholds.significantCNIVTorsion))) strongFeaturesCount++;

        const isStrongPatternRCN4 = vP > 0 && strongFeaturesCount >= 2;
        const patternName = isStrongPatternRCN4 ? "Pattern Highly Consistent with Right CN IV Palsy" : "Pattern Features Suggest Right CN IV Palsy";
        const formalSummaryRCN4 = isStrongPatternRCN4 ?
            `Parks-Bielschowsky 3-step test positive. RHT increases by ≥${PatternThresholds.significantCNIVWorsening.toFixed(0)}Δ in contralateral gaze (left) and/or ipsilateral head tilt (right). Excyclotorsion of paretic (right) eye often ≥${PatternThresholds.significantCNIVTorsion.toFixed(0)}°.` :
            `Features suggest R CN IV Palsy, but may not meet full quantitative criteria (e.g., RHT worsening <${PatternThresholds.significantCNIVWorsening.toFixed(0)}Δ or torsion <${PatternThresholds.significantCNIVTorsion.toFixed(0)}°). Key indicators include significant worsening.`;

        const isMaximalInUpgaze_RHT = vP > 0 && Math.abs(vUp) > Math.abs(vDown) + 5;

        if (!isMaximalInUpgaze_RHT) {
            if (!(Math.abs(vP) <= 1 && rCN4CriteriaMet < 2)) {
                const classicRTiltWorseningMet = (vTR - vP) >= 2 && vTR > 0;
                if (!classicRTiltWorseningMet && (rCN4CriteriaMet >= 2 && (rCN4StrongSignal || veryLargePrimaryRHT)) && !observed.some(obs => obs.includes("Tilt response did not meet classic criteria"))) {
                    observed.push("NOTE: Tilt response did not meet classic criteria for R CN IV, but other signs are strong.");
                }
                diagnosticSuggestions.push(new PatternDiagnosticSuggestion(
                    patternName,
                    "Characterized by a Right Hypertropia (RHT) that typically worsens in left gaze and with right head tilt. The right eye often shows excyclotorsion.",
                    (observed.length === 0 && vP === 0 && vL === 0 && vTR === 0 && tP === 0) ? ["No specific findings for R CN IV"] : observed,
                    formalSummaryRCN4
                ));
            }
        }
    }

    // Left CN IV (LSO Palsy)
    observed = [];
    if (vP < 0) observed.push(`LHT in primary: ${Math.abs(vP).toFixed(1)}Δ`);
    if ((vP - vR) >= 2 && vR < 0) observed.push(`LHT worsens in Right Gaze (to ${Math.abs(vR).toFixed(1)}Δ)`);
    if ((vP - vTL) >= 2 && vTL < 0) observed.push(`LHT worsens on Left Head Tilt (to ${Math.abs(vTL).toFixed(1)}Δ)`);
    const lExcycloPresent = (rodEye === MaddoxRodEye.LEFT && tP >= 2.0) || (rodEye === MaddoxRodEye.RIGHT && tP <= -2.0);
    if (lExcycloPresent) {
        const torsionMag = Math.abs(tP);
        const torsionDesc = (rodEye === MaddoxRodEye.LEFT) ? `L Eye Excyclotorsion: ${torsionMag.toFixed(1)}°` : `R Eye Incyclotorsion (suggests L Eye Excyclotorsion): ${torsionMag.toFixed(1)}°`;
        observed.push(torsionDesc);
    }

    let lCN4CriteriaMet = 0;
    if (vP < 0) lCN4CriteriaMet++;
    if ((vP - vR) >= 2 && vR < 0) lCN4CriteriaMet++;
    if ((vP - vTL) >= 2 && vTL < 0) lCN4CriteriaMet++;
    if (lExcycloPresent) lCN4CriteriaMet++;

    const lCN4PatternExists = lCN4CriteriaMet >= 3;
    const lCN4StrongWorseningGaze = vP < 0 && Math.abs(vR) > Math.abs(vP) && (Math.abs(vR) - Math.abs(vP)) >= 10.0;
    const lCN4StrongWorseningTilt = vP < 0 && Math.abs(vTL) > Math.abs(vP) && (Math.abs(vTL) - Math.abs(vP)) >= 10.0;
    const lCN4StrongSignal = lCN4StrongWorseningGaze || lCN4StrongWorseningTilt;
    const veryLargePrimaryLHT = vP < -15.0 && lCN4CriteriaMet >= 2;

    if (lCN4PatternExists || (lCN4CriteriaMet >= 2 && (lCN4StrongSignal || veryLargePrimaryLHT))) {
        let strongFeaturesCount = 0;
        if (Math.abs(vR) > Math.abs(vP) && (Math.abs(vR) - (vP < 0 ? Math.abs(vP) : 0)) >= PatternThresholds.significantCNIVWorsening) strongFeaturesCount++;
        if (Math.abs(vTL) > Math.abs(vP) && (Math.abs(vTL) - (vP < 0 ? Math.abs(vP) : 0)) >= PatternThresholds.significantCNIVWorsening) strongFeaturesCount++;
        if (lExcycloPresent && ((rodEye === MaddoxRodEye.LEFT && tP >= PatternThresholds.significantCNIVTorsion) || (rodEye === MaddoxRodEye.RIGHT && Math.abs(tP) >= PatternThresholds.significantCNIVTorsion))) strongFeaturesCount++;

        const isStrongPatternLCN4 = vP < 0 && strongFeaturesCount >= 2;
        const patternName = isStrongPatternLCN4 ? "Pattern Highly Consistent with Left CN IV Palsy" : "Pattern Features Suggest Left CN IV Palsy";
        const formalSummaryLCN4 = isStrongPatternLCN4 ?
            `Parks-Bielschowsky 3-step test positive. LHT increases by ≥${PatternThresholds.significantCNIVWorsening.toFixed(0)}Δ in contralateral gaze (right) and/or ipsilateral head tilt (left). Excyclotorsion of paretic (left) eye often ≥${PatternThresholds.significantCNIVTorsion.toFixed(0)}°.` :
            `Features suggest L CN IV Palsy, but may not meet full quantitative criteria (e.g., LHT worsening <${PatternThresholds.significantCNIVWorsening.toFixed(0)}Δ or torsion <${PatternThresholds.significantCNIVTorsion.toFixed(0)}°). Key indicators include significant worsening.`;

        const isMaximalInUpgaze_LHT = vP < 0 && Math.abs(vUp) > Math.abs(vDown) + 5;

        if (!isMaximalInUpgaze_LHT) {
            if (!(Math.abs(vP) <= 1 && lCN4CriteriaMet < 2)) {
                const classicLTiltWorseningMet = (vP - vTL) >= 2 && vTL < 0;
                if (!classicLTiltWorseningMet && (lCN4CriteriaMet >= 2 && (lCN4StrongSignal || veryLargePrimaryLHT)) && !observed.some(obs => obs.includes("Tilt response did not meet classic criteria"))) {
                    observed.push("NOTE: Tilt response did not meet classic criteria for L CN IV, but other signs are strong.");
                }
                diagnosticSuggestions.push(new PatternDiagnosticSuggestion(
                    patternName,
                    "Characterized by a Left Hypertropia (LHT) that typically worsens in right gaze and with left head tilt. The left eye often shows excyclotorsion.",
                    (observed.length === 0 && vP === 0 && vR === 0 && vTL === 0 && tP === 0) ? ["No specific findings for L CN IV"] : observed,
                    formalSummaryLCN4
                ));
            }
        }
    }

    // Consolidated CN VI Logic
    if (bilateralCN6) {
        let bilateralCN6Observed = [
            `Primary ET ${hP.toFixed(1)}Δ`,
            `ΔR gaze +${(hR - hP).toFixed(1)}Δ`,
            `ΔL gaze +${(hL - hP).toFixed(1)}Δ`
        ];
        if (verticalComponentPresent(vP)) {
            bilateralCN6Observed.push(atypicalVerticalTxt);
        }
        if (Math.abs(tP) >= PatternThresholds.skewTorsionThreshold) {
            bilateralCN6Observed.push("Appreciable torsion present; isolated CN VI should not create torsion.");
        }
        diagnosticSuggestions.push(new PatternDiagnosticSuggestion("Pattern Suggests Bilateral CN VI Palsy", "ET that increases on abduction of either eye; suspect raised ICP or pontine lesion.", bilateralCN6Observed, `Esotropia in primary plus ≥${PatternThresholds.significantCNVIWorsening.toFixed(0)}Δ increase in both lateral gazes.`));
    } else if (rCN6_worsens_logic) {
        observed = [];
        if (hP > 0) observed.push(`Esotropia in primary: ${hP.toFixed(1)}Δ`);
        else if (hP === 0) observed.push("Orthophoria in primary.");
        if (hR > hP) observed.push(`Esotropia develops or worsens in Right Gaze (to ${hR.toFixed(1)}Δ)`);
        if (verticalComponentPresent(vP)) observed.push(atypicalVerticalTxt);
        if (Math.abs(tP) >= PatternThresholds.skewTorsionThreshold) observed.push("Appreciable torsion present; isolated CN VI should not create torsion.");
        if (hL < -5) observed.push("NOTE: A significant exotropia in left gaze is highly atypical for an isolated R CN VI palsy.");

        const isStrongPatternRCN6 = (hR - hP) >= PatternThresholds.significantCNVIWorsening;
        const patternName = isStrongPatternRCN6 ? "Pattern Highly Consistent with Right CN VI Palsy" : "Pattern Features Suggest Right CN VI Palsy";
        const formalSummaryRCN6 = isStrongPatternRCN6 ?
            `Esotropia increases by ≥${PatternThresholds.significantCNVIWorsening.toFixed(0)}Δ on attempted abduction (right gaze). Check for full abduction. Significant concomitant vertical deviation would be atypical.` :
            `Esotropia worsens on right gaze, but increase may be <${PatternThresholds.significantCNVIWorsening.toFixed(0)}Δ. Key indicators involve significant worsening. Check for full abduction. Significant concomitant vertical deviation would be atypical.`;
        diagnosticSuggestions.push(new PatternDiagnosticSuggestion(
            patternName,
            "Characterized by an Esotropia (or development of ET from ortho) that worsens on right gaze, due to limited abduction of the right eye.",
            observed,
            formalSummaryRCN6
        ));
    } else if (lCN6_worsens_logic) {
        observed = [];
        if (hP > 0) observed.push(`Esotropia in primary: ${hP.toFixed(1)}Δ`);
        else if (hP === 0) observed.push("Orthophoria in primary.");
        if (hL > hP) observed.push(`Esotropia develops or worsens in Left Gaze (to ${hL.toFixed(1)}Δ)`);
        if (verticalComponentPresent(vP)) observed.push(atypicalVerticalTxt);
        if (Math.abs(tP) >= PatternThresholds.skewTorsionThreshold) observed.push("Appreciable torsion present; isolated CN VI should not create torsion.");
        if (hR < -5) observed.push("NOTE: A significant exotropia in right gaze is highly atypical for an isolated L CN VI palsy.");

        const isStrongPatternLCN6 = (hL - hP) >= PatternThresholds.significantCNVIWorsening;
        const patternName = isStrongPatternLCN6 ? "Pattern Highly Consistent with Left CN VI Palsy" : "Pattern Features Suggest Left CN VI Palsy";
        const formalSummaryLCN6 = isStrongPatternLCN6 ?
            `Esotropia increases by ≥${PatternThresholds.significantCNVIWorsening.toFixed(0)}Δ on attempted abduction (left gaze). Check for full abduction. Significant concomitant vertical deviation would be atypical.` :
            `Esotropia worsens on left gaze, but increase may be <${PatternThresholds.significantCNVIWorsening.toFixed(0)}Δ. Key indicators involve significant worsening. Check for full abduction. Significant concomitant vertical deviation would be atypical.`;
        diagnosticSuggestions.push(new PatternDiagnosticSuggestion(
            patternName,
            "Characterized by an Esotropia (or development of ET from ortho) that worsens on left gaze, due to limited abduction of the left eye.",
            observed,
            formalSummaryLCN6
        ));
    }

    // --- Rule: Bilateral Internuclear Ophthalmoplegia (INO) ---
    const isExotropiaBINO = hP < 0;
    const worsensBilateralGazeBINO = (hR < hP - 5) && (hL < hP - 5);

    if (isExotropiaBINO && worsensBilateralGazeBINO) {
        if (!diagnosticSuggestions.some(s => s.name.includes("CN III Palsy"))) {
            diagnosticSuggestions.push(new PatternDiagnosticSuggestion(
                "Pattern Suggests Bilateral Internuclear Ophthalmoplegia (INO)",
                "Characterized by an exotropia that worsens significantly on attempted gaze to either side, due to bilateral adduction deficits.",
                [
                    `Primary XT: ${Math.abs(hP).toFixed(1)}Δ`,
                    `Worsens in R gaze to ${Math.abs(hR).toFixed(1)}Δ`,
                    `Worsens in L gaze to ${Math.abs(hL).toFixed(1)}Δ`
                ],
                "Also known as Wall-Eyed Bilateral INO (WEBINO). Often associated with abducting nystagmus and vertical gaze abnormalities. Check for full adduction clinically."
            ));
        }
    }

    // --- Rule: Cranial Nerve III Palsy (Refined Logic) ---
    const betterHorizontalPatternExists = diagnosticSuggestions.some(s =>
        s.name.includes("INO") || s.name.includes("V-Pattern Exotropia") || s.name.includes("A-Pattern Exotropia")
    );

    if (!betterHorizontalPatternExists) {
        const hasSignificantXT = hP < -5;
        if (hasSignificantXT && vP > 2) { // L Hypo (R Hyper)
            observed = [
                `Exotropia present: ${Math.abs(hP).toFixed(1)}Δ`,
                `Left Hypotropia (R Hyper): ${vP.toFixed(1)}Δ`
            ];
            const hasLIntorsion = (rodEye === MaddoxRodEye.LEFT && tP <= -2) || (rodEye === MaddoxRodEye.RIGHT && tP >= 2);
            if (hasLIntorsion) observed.push("Signs of Left Eye Intorsion present.");

            diagnosticSuggestions.push(new PatternDiagnosticSuggestion(
                "Pattern Features Suggest Left CN III Palsy",
                "Often presents with the left eye turned out (Exotropia) and down (Hypotropia). Adduction, elevation, and depression of the left eye may be limited. The left eye typically shows intorsion. Ptosis and pupil involvement are critical to assess.",
                observed,
                "Requires Exotropia and Hypotropia of the affected (Left) eye. Pupil involvement or significant ptosis are key clinical signs."
            ));
        } else if (hasSignificantXT && vP < -2) { // R Hypo
            observed = [
                `Exotropia present: ${Math.abs(hP).toFixed(1)}Δ`,
                `Right Hypotropia: ${Math.abs(vP).toFixed(1)}Δ`
            ];
            const hasRIntorsion = (rodEye === MaddoxRodEye.RIGHT && tP <= -2) || (rodEye === MaddoxRodEye.LEFT && tP >= 2);
            if (hasRIntorsion) observed.push("Signs of Right Eye Intorsion present.");

            diagnosticSuggestions.push(new PatternDiagnosticSuggestion(
                "Pattern Features Suggest Right CN III Palsy",
                "Often presents with the right eye turned out (Exotropia) and down (Hypotropia). Adduction, elevation, and depression of the right eye may be limited. The right eye typically shows intorsion. Ptosis and pupil involvement are critical to assess.",
                observed,
                "Requires Exotropia and Hypotropia of the affected (Right) eye. Pupil involvement or significant ptosis are key clinical signs."
            ));
        }
    }

    // --- A/V Patterns ---
    // A-Pattern Esotropia
    observed = [];
    if (hP > 0) observed.push(`Primary ET: ${hP.toFixed(1)}Δ`);
    if (hUp > hP && hP > 0) observed.push(`ET in Upgaze: ${hUp.toFixed(1)}Δ (Increased)`);
    if (hDown < hP && hP > 0 && hDown >= 0) observed.push(`ET in Downgaze: ${hDown.toFixed(1)}Δ (Decreased/Ortho)`);
    if (hDown < 0 && hP > 0) observed.push(`XT in Downgaze: ${Math.abs(hDown).toFixed(1)}Δ (Reversed)`);
    if (hP > 0 && hUp > hP && hDown < hP) {
        const difference = hUp - hDown;
        const isStrongPatternAV_AET = difference >= PatternThresholds.significantAVPatternDifference;
        const patternName = isStrongPatternAV_AET ? "A-Pattern Esotropia (Highly Consistent)" : "A-Pattern Esotropia (Features Present)";
        const formalSummary = isStrongPatternAV_AET ?
            `Difference in ET between upgaze and downgaze is ≥${PatternThresholds.significantAVPatternDifference.toFixed(0)}Δ (more ET in upgaze).` :
            `ET is greater in upgaze and lesser in downgaze, but difference may be <${PatternThresholds.significantAVPatternDifference.toFixed(0)}Δ. Key indicators involve significant difference.`;
        diagnosticSuggestions.push(new PatternDiagnosticSuggestion(patternName, "Esotropia that is greater in upgaze and lesser (or becomes exotropia) in downgaze.", observed, formalSummary));
    }
    // V-Pattern Esotropia
    observed = [];
    if (hP > 0) observed.push(`Primary ET: ${hP.toFixed(1)}Δ`);
    if (hUp < hP && hP > 0 && hUp >= 0) observed.push(`ET in Upgaze: ${hUp.toFixed(1)}Δ (Decreased/Ortho)`);
    if (hUp < 0 && hP > 0) observed.push(`XT in Upgaze: ${Math.abs(hUp).toFixed(1)}Δ (Reversed)`);
    if (hDown > hP && hP > 0) observed.push(`ET in Downgaze: ${hDown.toFixed(1)}Δ (Increased)`);
    if (hP > 0 && hUp < hP && hDown > hP) {
        const difference = hDown - hUp;
        const isStrongPatternAV_VET = difference >= PatternThresholds.significantAVPatternDifference;
        const patternName = isStrongPatternAV_VET ? "V-Pattern Esotropia (Highly Consistent)" : "V-Pattern Esotropia (Features Present)";
        const formalSummary = isStrongPatternAV_VET ?
            `Difference in ET between downgaze and upgaze is ≥${PatternThresholds.significantAVPatternDifference.toFixed(0)}Δ (more ET in downgaze).` :
            `ET is lesser in upgaze and greater in downgaze, but difference may be <${PatternThresholds.significantAVPatternDifference.toFixed(0)}Δ. Key indicators involve significant difference.`;
        diagnosticSuggestions.push(new PatternDiagnosticSuggestion(patternName, "Esotropia that is lesser (or becomes exotropia) in upgaze and greater in downgaze.", observed, formalSummary));
    }
    // A-Pattern Exotropia
    observed = [];
    if (hP < 0) observed.push(`Primary XT: ${Math.abs(hP).toFixed(1)}Δ`);
    if (Math.abs(hUp) < Math.abs(hP) && hP < 0 && hUp <= 0) observed.push(`XT in Upgaze: ${Math.abs(hUp).toFixed(1)}Δ (Decreased/Ortho)`);
    if (hUp > 0 && hP < 0) observed.push(`ET in Upgaze: ${hUp.toFixed(1)}Δ (Reversed)`);
    if (Math.abs(hDown) > Math.abs(hP) && hP < 0 && hDown <= 0) observed.push(`XT in Downgaze: ${Math.abs(hDown).toFixed(1)}Δ (Increased)`);
    if (hDown > 0 && hP < 0) observed.push(`ET in Downgaze: ${hDown.toFixed(1)}Δ (Reversed)`);
    if (hP < 0 && (Math.abs(hUp) < Math.abs(hP) || (hUp >= 0 && hP < 0)) && (Math.abs(hDown) > Math.abs(hP) && hDown < 0)) {
        const difference = Math.abs(hDown) - Math.abs(hUp);
        const isStrongPatternAV_AXT = difference >= PatternThresholds.significantAVPatternDifference;
        const patternName = isStrongPatternAV_AXT ? "A-Pattern Exotropia (Highly Consistent)" : "A-Pattern Exotropia (Features Present)";
        const formalSummary = isStrongPatternAV_AXT ?
            `Difference in XT between downgaze and upgaze is ≥${PatternThresholds.significantAVPatternDifference.toFixed(0)}Δ (more XT in downgaze).` :
            `XT is lesser in upgaze and greater in downgaze, but difference may be <${PatternThresholds.significantAVPatternDifference.toFixed(0)}Δ. Key indicators involve significant difference.`;
        diagnosticSuggestions.push(new PatternDiagnosticSuggestion(patternName, "Exotropia that is lesser (or becomes esotropia) in upgaze and greater in downgaze.", observed, formalSummary));
    }
    // V-Pattern Exotropia
    observed = [];
    if (hP < 0) observed.push(`Primary XT: ${Math.abs(hP).toFixed(1)}Δ`);
    if (Math.abs(hUp) > Math.abs(hP) && hP < 0 && hUp <= 0) observed.push(`XT in Upgaze: ${Math.abs(hUp).toFixed(1)}Δ (Increased)`);
    if (hUp > 0 && hP < 0) observed.push(`ET in Upgaze: ${hUp.toFixed(1)}Δ (Reversed)`);
    if (Math.abs(hDown) < Math.abs(hP) && hP < 0 && hDown <= 0) observed.push(`XT in Downgaze: ${Math.abs(hDown).toFixed(1)}Δ (Decreased/Ortho)`);
    if (hDown > 0 && hP < 0) observed.push(`ET in Downgaze: ${hDown.toFixed(1)}Δ (Reversed)`);
    if (hP < 0 && (Math.abs(hUp) > Math.abs(hP) && hUp < 0) && (Math.abs(hDown) < Math.abs(hP) || (hDown >= 0 && hP < 0))) {
        const difference = Math.abs(hUp) - Math.abs(hDown);
        const isStrongPatternAV_VXT = difference >= PatternThresholds.significantAVPatternDifference;
        const patternName = isStrongPatternAV_VXT ? "V-Pattern Exotropia (Highly Consistent)" : "V-Pattern Exotropia (Features Present)";
        const formalSummary = isStrongPatternAV_VXT ?
            `Difference in XT between upgaze and downgaze is ≥${PatternThresholds.significantAVPatternDifference.toFixed(0)}Δ (more XT in upgaze).` :
            `XT is greater in upgaze and lesser in downgaze, but difference may be <${PatternThresholds.significantAVPatternDifference.toFixed(0)}Δ. Key indicators involve significant difference.`;
        diagnosticSuggestions.push(new PatternDiagnosticSuggestion(patternName, "Exotropia that is greater in upgaze and lesser (or becomes esotropia) in downgaze.", observed, formalSummary));
    }

    // --- Rule: Individual Vertical Muscle Pattern Analysis (NEW) ---
    const verticalIsMaximalInUpgaze = Math.abs(vUp) > Math.abs(vDown) + 5 && Math.abs(vUp) > Math.abs(vP) + 3;
    const verticalIsMaximalInDowngaze = Math.abs(vDown) > Math.abs(vUp) + 5 && Math.abs(vDown) > Math.abs(vP) + 3;
    let verticalIncomitanceSuggestion = null;

    if (verticalIsMaximalInUpgaze) {
        if (vP > 2) { // RHT worse upgaze
            const worseInLGaze_vi = (vL - vP) > (vR - vP) && (vL - vP) > 1;
            const principle_vi = "A Right Hypertropia that is greatest in upgaze.";
            let observed_vi = [`Primary RHT: ${vP.toFixed(1)}Δ`, `Maximal deviation in upgaze: ${Math.abs(vUp).toFixed(1)}Δ`];
            if (mVal(GazePosition.LEFT, DeviationType.VERTICAL) !== 0 || mVal(GazePosition.RIGHT, DeviationType.VERTICAL) !== 0) observed_vi.push(`Worsens more in ${worseInLGaze_vi ? "left" : "right"} gaze.`);
            const diff_vi = worseInLGaze_vi ? "This pattern (RHT worse up and left) suggests weakness of an elevator of the right eye or depressor of the left eye. Differential includes Left Superior Rectus (LSR) Palsy or Right Inferior Oblique (RIO) Overaction. CLINICAL DIFFERENTIATION: LSR palsy is associated with L-excyclotorsion. RIO overaction is associated with R-excyclotorsion. NOTE: A common mimic is restriction of the ipsilateral (Right) Inferior Rectus (RIR), as seen in Thyroid Eye Disease. Forced duction testing is key."
                                        : "This pattern (RHT worse up and right) suggests weakness of an elevator of the right eye or depressor of the left eye. Differential includes Right Superior Rectus (RSR) Palsy or Left Inferior Oblique (LIO) Palsy. CLINICAL DIFFERENTIATION: RSR palsy is associated with R-excyclotorsion. LIO palsy is associated with L-incyclotorsion. NOTE: A common mimic is restriction of the ipsilateral (Right) Inferior Rectus (RIR), as seen in Thyroid Eye Disease. Forced duction testing is key.";
            verticalIncomitanceSuggestion = new PatternDiagnosticSuggestion("Pattern Suggests Vertical Muscle Imbalance (Worse Upgaze)", principle_vi, observed_vi, diff_vi);
        } else if (vP < -2) { // LHT worse upgaze
            const worseInRGaze_vi = (Math.abs(vR) - Math.abs(vP)) > (Math.abs(vL) - Math.abs(vP)) && Math.abs(vR) > Math.abs(vP) + 1;
            const principle_vi = "A Left Hypertropia that is greatest in upgaze.";
            let observed_vi = [`Primary LHT: ${Math.abs(vP).toFixed(1)}Δ`, `Maximal deviation in upgaze: ${Math.abs(vUp).toFixed(1)}Δ`];
            if (mVal(GazePosition.LEFT, DeviationType.VERTICAL) !== 0 || mVal(GazePosition.RIGHT, DeviationType.VERTICAL) !== 0) observed_vi.push(`Worsens more in ${worseInRGaze_vi ? "right" : "left"} gaze.`);
            const pareticDifferential = worseInRGaze_vi ? "Right Superior Rectus (RSR) Palsy (associated with R-excyclotorsion) OR a Left Inferior Oblique (LIO) Palsy (associated with L-incyclotorsion)."
                                                    : "Left Superior Rectus (LSR) Palsy (associated with L-excyclotorsion) OR a Right Inferior Oblique (RIO) Overaction (associated with R-excyclotorsion).";
            const diff_vi = `This pattern is classic for weakness of an elevator of the left eye. The differential includes ${pareticDifferential} NOTE: A very common mimic is restriction of the ipsilateral (Left) Inferior Rectus, as seen in Thyroid Eye Disease. Forced duction testing is key to differentiate.`;
            verticalIncomitanceSuggestion = new PatternDiagnosticSuggestion("Pattern Suggests Vertical Muscle Imbalance (Worse Upgaze)", principle_vi, observed_vi, diff_vi);
        }
    } else if (verticalIsMaximalInDowngaze) {
        if (vP > 2) { // RHT worse downgaze
            const worseInLGaze_RHT_down = (Math.abs(vL) - Math.abs(vP)) > (Math.abs(vR) - Math.abs(vP)) && Math.abs(vL) > Math.abs(vP) + 1;
            const principle_vi = "A Right Hypertropia that is greatest in downgaze.";
            let observed_vi = [`Primary RHT: ${vP.toFixed(1)}Δ`, `Maximal deviation in downgaze: ${Math.abs(vDown).toFixed(1)}Δ`];
            if (mVal(GazePosition.LEFT, DeviationType.VERTICAL) !== 0 || mVal(GazePosition.RIGHT, DeviationType.VERTICAL) !== 0) observed_vi.push(`Worsens more in ${worseInLGaze_RHT_down ? "left" : "right"} gaze.`);
            const diff_vi = worseInLGaze_RHT_down ? "This pattern (RHT worse down and left) is the classic field of action for the Right Superior Oblique (RSO / CN IV). Since the full 3-step test for R CN IV was not met, this may represent an atypical RSO palsy or a different etiology such as restriction of the Left Inferior Rectus."
                                              : "This pattern (RHT worse down and right) could suggest a Right Inferior Rectus (RIR) palsy or restriction of the contralateral (Left) Superior Rectus. CLINICAL DIFFERENTIATION: RIR palsy is associated with R-incyclotorsion. An LSR restriction is confirmed with forced ductions.";
            verticalIncomitanceSuggestion = new PatternDiagnosticSuggestion("Pattern Suggests Vertical Muscle Imbalance (Worse Downgaze)", principle_vi, observed_vi, diff_vi);
        } else if (vP < -2) { // LHT worse downgaze
            const worseInLGaze_LHT_down = (Math.abs(vL) - Math.abs(vP)) > (Math.abs(vR) - Math.abs(vP)) && Math.abs(vL) > Math.abs(vP) + 1;
            const principle_vi = "A Left Hypertropia that is greatest in downgaze.";
            let observed_vi = [`Primary LHT: ${Math.abs(vP).toFixed(1)}Δ`, `Maximal deviation in downgaze: ${Math.abs(vDown).toFixed(1)}Δ`];
            if (mVal(GazePosition.LEFT, DeviationType.VERTICAL) !== 0 || mVal(GazePosition.RIGHT, DeviationType.VERTICAL) !== 0) observed_vi.push(`Worsens more in ${worseInLGaze_LHT_down ? "left" : "right"} gaze.`);
            const diff_vi = worseInLGaze_LHT_down ? "This pattern (LHT worse down and left) is the classic field of action for the Left Superior Oblique (LSO / CN IV). Since the full 3-step test for L CN IV was not met, this may represent an atypical LSO palsy or a different etiology such as restriction of the Right Inferior Rectus."
                                              : "This pattern (LHT worse down and right) could suggest a Left Inferior Rectus (LIR) palsy or restriction of the contralateral (Right) Superior Rectus. CLINICAL DIFFERENTIATION: LIR palsy is associated with L-incyclotorsion. An RSR restriction is confirmed with forced ductions.";
            verticalIncomitanceSuggestion = new PatternDiagnosticSuggestion("Pattern Suggests Vertical Muscle Imbalance (Worse Downgaze)", principle_vi, observed_vi, diff_vi);
        }
    }

    if (verticalIncomitanceSuggestion) {
        const cnIVAlreadyFound = diagnosticSuggestions.some(s => s.name.includes("CN IV Palsy"));
        if (!cnIVAlreadyFound && !diagnosticSuggestions.some(s => s.name.includes("Skew Deviation"))) {
            diagnosticSuggestions.push(verticalIncomitanceSuggestion);
        }
    }

    // --- Skew Deviation ---
    let skewObserved = [];
    let isSuggestiveOfSkew = false;
    if (vP > 0) { // R Skew
        skewObserved.push(`Primary RHT: ${vP.toFixed(1)}Δ`);
        const verticalComitantInHorizontalGaze = Math.abs(vL - vR) <= PatternThresholds.skewComitanceThresholdHorizontal;
        const worsensOrStaysSameOnRightTilt = (vTR - vP) >= PatternThresholds.skewWorseningThresholdTilt; // Use threshold
        const improvesOnLeftTilt = (vP - vTL) >= PatternThresholds.skewWorseningThresholdTilt; // Use threshold
        const rEyeIntorted = (rodEye === MaddoxRodEye.RIGHT && tP <= -PatternThresholds.skewTorsionThreshold) || (rodEye === MaddoxRodEye.LEFT && tP >= PatternThresholds.skewTorsionThreshold);
        if (verticalComitantInHorizontalGaze) skewObserved.push(`Vert. comitant in H-gaze (R-L diff ≤${PatternThresholds.skewComitanceThresholdHorizontal.toFixed(0)}Δ)`);
        if (worsensOrStaysSameOnRightTilt) skewObserved.push(`RHT on R-tilt: ${vTR.toFixed(1)}Δ (Primary: ${vP.toFixed(1)}Δ)`);
        if (improvesOnLeftTilt) skewObserved.push(`RHT improves on L-tilt (to ${vTL.toFixed(1)}Δ)`);
        if (rEyeIntorted) {
            if (rodEye === MaddoxRodEye.RIGHT) skewObserved.push(`R Eye Incyclotorsion: ${Math.abs(tP).toFixed(1)}°`);
            else skewObserved.push(`L Eye Excyclotorsion (suggests R Eye Incyclotorsion): ${tP.toFixed(1)}°`);
        }
        if (vP > 0 && verticalComitantInHorizontalGaze && worsensOrStaysSameOnRightTilt && improvesOnLeftTilt) {
            const skewSuggestion = new PatternDiagnosticSuggestion(
                "Pattern Suggests Right Skew Deviation",
                "Vertical misalignment (RHT) often due to otolithic imbalance. Characterized by RHT worsening on right head tilt and improving on left head tilt, with intorsion of the right (hyper) eye. Typically comitant in horizontal gazes.",
                skewObserved,
                `Key features include: hypertropia that worsens on ipsilateral head tilt and improves on contralateral tilt. Intorsion of the hypertropic eye (often around ${PatternThresholds.skewTorsionThreshold.toFixed(0)}° or more) is a strong supporting feature. Vertical deviation is typically comitant in horizontal gazes (difference ≤${PatternThresholds.skewComitanceThresholdHorizontal.toFixed(0)}Δ). May increase in downgaze. Skew deviation can be associated with brainstem or cerebellar conditions; clinical correlation is important.`
            );
            isSuggestiveOfSkew = true;
            diagnosticSuggestions.push(skewSuggestion);
            const rCN4PatternVertically = vP > 0 && (vL - vP) >= 2 && vL > 0 && (vTR - vP) >= 2 && vTR > 0;
            if (rCN4PatternVertically && rEyeIntorted) {
                return diagnosticSuggestions; // Early return if strong CN IV like pattern with skew torsion
            }
        }
    } else if (vP < 0) { // L Skew
        skewObserved.push(`Primary LHT: ${Math.abs(vP).toFixed(1)}Δ`);
        const verticalComitantInHorizontalGaze = Math.abs(vL - vR) <= PatternThresholds.skewComitanceThresholdHorizontal;
        const worsensOrStaysSameOnLeftTilt = (vP - vTL) >= PatternThresholds.skewWorseningThresholdTilt; // Use threshold
        const improvesOnRightTilt = (vTR - vP) >= PatternThresholds.skewWorseningThresholdTilt; // Use threshold
        const lEyeIntorted = (rodEye === MaddoxRodEye.LEFT && tP <= -PatternThresholds.skewTorsionThreshold) || (rodEye === MaddoxRodEye.RIGHT && tP >= PatternThresholds.skewTorsionThreshold);
        if (verticalComitantInHorizontalGaze) skewObserved.push(`Vert. comitant in H-gaze (R-L diff ≤${PatternThresholds.skewComitanceThresholdHorizontal.toFixed(0)}Δ)`);
        if (worsensOrStaysSameOnLeftTilt) skewObserved.push(`LHT on L-tilt: ${vTL.toFixed(1)}Δ (Primary: ${vP.toFixed(1)}Δ)`);
        if (improvesOnRightTilt) skewObserved.push(`LHT improves on R-tilt (to ${vTR.toFixed(1)}Δ)`);
        if (lEyeIntorted) {
            if (rodEye === MaddoxRodEye.LEFT) skewObserved.push(`L Eye Incyclotorsion: ${Math.abs(tP).toFixed(1)}°`);
            else skewObserved.push(`R Eye Excyclotorsion (suggests L Eye Incyclotorsion): ${tP.toFixed(1)}°`);
        }
        if (vP < 0 && verticalComitantInHorizontalGaze && worsensOrStaysSameOnLeftTilt && improvesOnRightTilt) {
            const skewSuggestion = new PatternDiagnosticSuggestion(
                "Pattern Suggests Left Skew Deviation",
                "Vertical misalignment (LHT) often due to otolithic imbalance. Characterized by LHT worsening on left head tilt and improving on right head tilt, with intorsion of the left (hyper) eye. Typically comitant in horizontal gazes.",
                skewObserved,
                `Key features include: hypertropia that worsens on ipsilateral head tilt and improves on contralateral tilt. Intorsion of the hypertropic eye (often around ${PatternThresholds.skewTorsionThreshold.toFixed(0)}° or more) is a strong supporting feature. Vertical deviation is typically comitant in horizontal gazes (difference ≤${PatternThresholds.skewComitanceThresholdHorizontal.toFixed(0)}Δ). May increase in downgaze. Skew deviation can be associated with brainstem or cerebellar conditions; clinical correlation is important.`
            );
            isSuggestiveOfSkew = true;
            diagnosticSuggestions.push(skewSuggestion);
            const lCN4PatternVertically = vP < 0 && (vP - vR) >= 2 && vR < 0 && (vP - vTL) >= 2 && vTL < 0;
            if (lCN4PatternVertically && lEyeIntorted) {
                return diagnosticSuggestions; // Early return
            }
        }
    }
    if (isSuggestiveOfSkew) {
        const increasesDowngaze = (vP > 0 && vDown > vP && (vDown - vP) > 1.0) || (vP < 0 && vDown < vP && (vP - vDown) > 1.0);
        const decreasesUpgaze = (vP > 0 && vUp < vP && (vP - vUp) > 1.0) || (vP < 0 && vUp > vP && (vUp - vP) > 1.0);
        let upDownGazeFindings = "";
        if (increasesDowngaze) upDownGazeFindings += "Vertical deviation tends to increase in downgaze. ";
        if (decreasesUpgaze) upDownGazeFindings += "Vertical deviation tends to decrease in upgaze.";
        if (upDownGazeFindings.length > 0) {
            const lastSkewSuggestion = diagnosticSuggestions.findLast(s => s.name.includes("Skew Deviation"));
            if (lastSkewSuggestion) {
                lastSkewSuggestion.observedFindings.push(upDownGazeFindings.trim());
            }
        }
    }

    // --- Default Messages ---
    if (diagnosticSuggestions.length === 0) {
        const allOrtho = measurements.every(m => m.numericValue === 0);
        if (allOrtho) {
            diagnosticSuggestions.push(new PatternDiagnosticSuggestion(
                "Orthophoria / No Obvious Pattern",
                "All measurements are zero.",
                ["All measurements ortho."],
                "No significant deviation detected."
            ));
        } else {
            const nonOrthoFindings = measurements
                .filter(m => m.numericValue !== 0)
                .map(m => `${m.gazePosition} ${m.deviationType}: ${m.displayValue(rodEye)}`);
            diagnosticSuggestions.push(new PatternDiagnosticSuggestion(
                "No Specific Pattern Identified by Current Rules",
                "Deviations present but do not fit a common paretic or non-paretic pattern.",
                nonOrthoFindings,
                "Further clinical correlation needed."
            ));
        }
    }
    return diagnosticSuggestions;
}
